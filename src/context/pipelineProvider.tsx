import React, { useContext, createContext, useMemo, useState, ReactNode } from "react";
// If you already have an API, import it here and use inside fetchRemotePipelines()
// import { getProjectPipelines } from "../api/pipeline"; // <-- example
import { Node, Edge } from "@xyflow/react";
import { dbPipelineToGraph } from "../utils/dbPipelineToGraph";
import { buildPipelineApi, checkConfigurationStatusPipeline, designPipeline, executePipelineApi, getPipelines, getValidatedPipeline, terminatePipelineApi } from "../api/pipeline";
import { graphToDesignPipeline } from "../utils/graphToDesignPipeline";
import axios from "axios";
import { normalizeConfig, unflattenConfig } from "../utils/unflattenConfig";

// Basic types
export type PipelineStatus = "draft" | "validated" | "built" | "executing" | "configured" | "terminated";
export type PipelineSource = "local" | "remote";


export interface PipelineGraph {
  nodes: Node[];
  edges: Edge[];
}

export interface Pipeline {
  id: string;
  name: string;
  projectName: string;
  status: PipelineStatus;
  source: PipelineSource;
  updatedAt: string;
  graph?: PipelineGraph;
}


interface PipelineContextType {
  pipelines: Pipeline[];                                 // merged list (remote + local)
  loading: boolean;
  actionLoading: {
    validate?: boolean;
    build?: boolean;
    execute?: boolean;
    terminate?: boolean;
  };
  refreshPipelines: (projectName: string) => Promise<void>;

  // Local-only draft helpers
  createDraft: (projectName: string, name?: string) => Pipeline;
  saveDraft: (pipeline: Pipeline) => void;
  deleteDraft: (projectName: string, id: string) => void;
  validatePipeline: (orgDomainName: string, pipeline: Pipeline) => Promise<any>;
  buildPipeline: (orgDomainName: string, pipeline: Pipeline) => Promise<any>;
  checkConfigStatus: (orgDomainName: string, pipelineName: string) => Promise<any>;
  executePipeline: (orgDomainName: string, pipeline: Pipeline) => Promise<any>;
  terminatePipeline: (orgDomainName: string, pipeline: Pipeline) => Promise<any>;
  // (Later) validate via backend
  // validatePipeline: (projectName: string, id: string) => Promise<void>;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

interface PipelineProviderProps {
  children: ReactNode;
}

// ---------- Local Storage helpers ----------
const LS_PREFIX = "pipelines";
const lsKey = (projectName: string) => `${LS_PREFIX}:${projectName}`;

function readLocal(projectName: string): Pipeline[] {
  try {
    const raw = localStorage.getItem(lsKey(projectName));
    if (!raw) return [];
    const data = JSON.parse(raw) as Pipeline[];
    // Ensure minimal shape
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLocal(projectName: string, items: Pipeline[]) {
  localStorage.setItem(lsKey(projectName), JSON.stringify(items));
}

// ---------- Remote fetch (stub to replace) ----------
async function fetchRemotePipelines(projectName: string): Promise<Pipeline[]> {
  const safeOrgDomainName = localStorage.getItem("domain") || "";
  const response = await getPipelines(safeOrgDomainName, projectName);
  const list = response.data;

  // list looks like: [{ pipelineName, pipelinePhase, projectName, ... }, ...]
  // console.log("Fetched remote pipelines:", list);
  const detailedPipelines: Pipeline[] = await Promise.all(
    list.map(async (p): Promise<Pipeline> => {
      if (p.pipelinePhase === "VALIDATED" || p.pipelinePhase === "BUILT" || p.pipelinePhase === "EXECUTING" || p.pipelinePhase === "TERMINATED" || p.pipelinePhase === "CONFIGURED") {
        const detailRes = await getValidatedPipeline(safeOrgDomainName, p.pipelineName);
        const detail = detailRes.data;
        const graph = dbPipelineToGraph(detail);
        console.log("Fetched and converted pipeline:", p.pipelineName, graph);

        return {
          id: `${projectName}:${p.pipelineName}`,
          name: p.pipelineName,
          projectName: p.projectName,
          status: p.pipelinePhase.toLowerCase() as PipelineStatus,
          source: "remote",
          updatedAt: new Date().toISOString(),
          graph,
        };
      } else {
        return {
          id: crypto.randomUUID(),
          name: p.pipelineName,
          projectName: p.projectName,
          status: "draft",
          source: "local",
          updatedAt: new Date().toISOString(),
          graph: { nodes: [], edges: [] },
        };
      }
    })
  );


  return detailedPipelines;
}


// ---------- Provider ----------
const PipelineProvider: React.FC<PipelineProviderProps> = ({ children }) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Merge local + remote (remote wins on id collisions)
  function mergePipelines(remote: Pipeline[], local: Pipeline[]) {
    const byName = new Map<string, Pipeline>();

    // start with local
    for (const p of local) {
      byName.set(p.name, {
        ...p,
        status: "draft", // always reset local pipelines
        source: "local",
      });
    }

    // override with remote (remote wins if same name)
    for (const p of remote) {
      byName.set(p.name, p);
    }

    return Array.from(byName.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }


  const refreshPipelines = async (projectName: string) => {
    setLoading(true);
    try {
      const [remote, local] = await Promise.all([
        fetchRemotePipelines(projectName),
        Promise.resolve(readLocal(projectName)),
      ]);
      setPipelines(mergePipelines(remote, local));
    } finally {
      setLoading(false);
    }
  };

  // Local-only operations
  const createDraft = (projectName: string, name = "Untitled pipeline"): Pipeline => {
    const draft: Pipeline = {
      id: crypto.randomUUID(),
      name,
      projectName,
      status: "draft",
      source: "local",
      updatedAt: new Date().toISOString(),
      graph: { nodes: [], edges: [] },
    };
    const curr = readLocal(projectName);
    writeLocal(projectName, [draft, ...curr]);
    // update merged state (keep any remote already loaded)
    setPipelines((prev) => mergePipelines(prev.filter(p => p.source === "remote"), [draft, ...prev.filter(p => p.source === "local")]));
    return draft;
  };

  const saveDraft = (pipeline: Pipeline) => {
    if (pipeline.source !== "local") return;

    const curr = readLocal(pipeline.projectName);
    const updated = [pipeline, ...curr.filter((p) => p.name !== pipeline.name)];
    writeLocal(pipeline.projectName, updated);

    setPipelines((prev) => {
      const withoutThis = prev.filter((p) => p.name !== pipeline.name);
      return mergePipelines(
        withoutThis.filter((p) => p.source === "remote"),
        [pipeline, ...withoutThis.filter((p) => p.source === "local")]
      );
    });
  };


  const deleteDraft = (projectName: string, id: string) => {
    const curr = readLocal(projectName);
    const updated = curr.filter((p) => p.id !== id);
    writeLocal(projectName, updated);
    setPipelines((prev) => prev.filter((p) => !(p.source === "local" && p.id === id)));
  };

  const validatePipeline = async (orgDomainName: string, pipeline: Pipeline) => {
    setActionLoading((prev) => ({ ...prev, validate: true }));
    if (!pipeline.graph) throw new Error("Pipeline has no graph to validate");

  const normalizedNodes = pipeline.graph.nodes.map((n) => {
    const unflattened = unflattenConfig(n.data?.config || {});
    const fixed = normalizeConfig(unflattened);

    return {
      ...n,
      data: {
        ...n.data,
        config: fixed,
      },
    };
  });

    const dto = graphToDesignPipeline(
      normalizedNodes,
      pipeline.graph.edges,
      pipeline.name,
      pipeline.projectName
    );
    console.log("🚀 Validating pipeline with DTO:", dto);

    try {
      const response = await designPipeline(orgDomainName, dto);
      console.log("✅ Pipeline validated successfully:", response.data);
      setPipelines((prev) =>
        prev.map((p) =>
          p.id === pipeline.id
            ? { ...p, status: "validated", updatedAt: new Date().toISOString() }
            : p
        )
      );
      setActionLoading((prev) => ({ ...prev, validate: false }));
      return {
        success: true,
        message: response.data || "Pipeline validated successfully."
      };
    } catch (error) {
      setActionLoading((prev) => ({ ...prev, validate: false }));
      if (axios.isAxiosError(error)) {
        let backendMsg: string;

        if (typeof error.response?.data === "string") {
          try {
            const parsed = JSON.parse(error.response.data);
            backendMsg = parsed.error || JSON.stringify(parsed);
          } catch {
            backendMsg = error.response.data;
          }
        } else {
          backendMsg =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message;
        }

        return {
          success: false,
          message: backendMsg,
        };
      }
      return { success: false, message: "Pipeline validation failed due to unknown error" };
    }

    // const response = await designPipeline(orgDomainName, dto);

    // return response.data;
  };

  const buildPipeline = async (orgDomainName: string, pipeline: Pipeline) => {
    console.log("🚀 Building pipeline:", orgDomainName);
    setActionLoading((prev) => ({ ...prev, build: true }));
    try {
      const response = await buildPipelineApi(orgDomainName, pipeline.name);
      console.log("✅ Pipeline built successfully:", response.data);

      setPipelines((prev) =>
        prev.map((p) =>
          p.id === pipeline.id
            ? { ...p, status: "built", updatedAt: new Date().toISOString() }
            : p
        )
      );

      setActionLoading((prev) => ({ ...prev, build: false }));
      return {
        success: true,
        message: response.data || "Pipeline built successfully."
      };
    } catch (error) {
      setActionLoading((prev) => ({ ...prev, build: false }));
      if (axios.isAxiosError(error)) {
        // let backendMsg: string;

        const backendMsg = mapBackendErrorToMessage(error);

        return {
          success: false,
          message: backendMsg,
        };
      }
      return { success: false, message: "Pipeline build failed due to unknown error" };
    }
  };

  function mapBackendErrorToMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const raw = error.response?.data;

      // Backend gave you { error: "Failed to deserialize JSON to object: {\"error\":\"Token verification failed\"}" }
      if (raw?.error && typeof raw.error === "string") {
        const inner = raw.error;

        // Try to extract the actual inner JSON {"error":"..."}
        const match = inner.match(/{\"error\":\"([^"]+)\"}/);
        if (match) {
          return match[1]; // → "Token verification failed"
        }

        // Or keyword match
        if (inner.includes("revoked")) {
          return "Your session has been revoked. Please log in again.";
        }
        if (inner.includes("verification failed")) {
          return "Token verification failed.";
        }
        if (inner.includes("missing jti")) {
          return "Invalid authentication token.";
        }

        // fallback: just return the original string
        return inner;
      }

      return raw?.message || error.message || "Unexpected error";
    }

    return "Unknown error occurred.";
  }



  const executePipeline = async (orgDomainName: string, pipeline: Pipeline) => {
    console.log("Executing pipeline:", orgDomainName);
    setActionLoading((prev) => ({ ...prev, execute: true }));
    try {
      const response = await executePipelineApi(orgDomainName, pipeline.name);
      console.log("Pipeline executed successfully:", response.data);

      setPipelines((prev) =>
        prev.map((p) =>
          p.id === pipeline.id
            ? { ...p, status: "executing", updatedAt: new Date().toISOString() }
            : p
        )
      );

      setActionLoading((prev) => ({ ...prev, execute: false }));
      return {
        success: true,
        message: response.data || "Pipeline executed successfully."
      };
    } catch (error) {
      setActionLoading((prev) => ({ ...prev, execute: false }));
      if (axios.isAxiosError(error)) {
        // let backendMsg: string;

        const backendMsg = mapBackendErrorToMessage(error);

        return {
          success: false,
          message: backendMsg,
        };
      }
      return { success: false, message: "Pipeline execution failed due to unknown error" };
    }
  };

  const terminatePipeline = async (orgDomainName: string, pipeline: Pipeline) => {
    console.log("Terminating pipeline:", orgDomainName);
    setActionLoading((prev) => ({ ...prev, terminate: true }));
    try {
      const response = await terminatePipelineApi(orgDomainName, pipeline.name);
      console.log("Pipeline terminated successfully:", response.data);

      setPipelines((prev) =>
        prev.map((p) =>
          p.id === pipeline.id
            ? { ...p, status: "terminated", updatedAt: new Date().toISOString() }
            : p
        )
      );

      setActionLoading((prev) => ({ ...prev, terminate: false }));
      return {
        success: true,
        message: response.data || "Pipeline terminated successfully."
      };
    } catch (error) {
      setActionLoading((prev) => ({ ...prev, terminate: false }));
      if (axios.isAxiosError(error)) {
        // let backendMsg: string;

        const backendMsg = mapBackendErrorToMessage(error);

        return {
          success: false,
          message: backendMsg,
        };
      }
      return { success: false, message: "Pipeline termination failed due to unknown error" };
    }
  };



  const checkConfigStatus = async (orgDomainName: string, pipelineName: string) => {
    setLoading(true);
    try {
      const res = await checkConfigurationStatusPipeline(orgDomainName, pipelineName);
      const data = res.data;
      setLoading(false);
      
      // auto-promote locally when nothing is missing
      if (
        data?.status === "VALID" &&
        Array.isArray(data?.missingPermissions) &&
        data.missingPermissions.length === 0
      ) {
        setPipelines((prev) =>
          prev.map((p) =>
            p.name === pipelineName
              ? { ...p, status: "configured", updatedAt: new Date().toISOString() }
              : p
          )
        );
      }

      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };



  const value = useMemo<PipelineContextType>(() => ({
    pipelines,
    loading,
    refreshPipelines,
    createDraft,
    saveDraft,
    deleteDraft,
    validatePipeline,
    buildPipeline,
    checkConfigStatus,
    actionLoading,
    executePipeline,
    terminatePipeline,
    // validatePipeline: async (projectName: string, id: string) => { ... }
  }), [pipelines, loading, actionLoading]);

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
};

export default PipelineProvider;

export const usePipeline = (): PipelineContextType => {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
};
