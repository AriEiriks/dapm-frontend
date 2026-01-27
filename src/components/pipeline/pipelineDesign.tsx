import { useCallback, useEffect, useMemo, useState } from "react";
import { useKafka } from "../../context/KafkaProvider";

import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  useReactFlow,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { usePipeline, Pipeline } from "../../context/pipelineProvider";
import { usePE } from "../../context/processingElementsProvider";
import { useAuth } from "../../auth/authProvider";
import { graphToDesignPipeline } from "../../utils/graphToDesignPipeline";

// -------- Custom Node with conditional ports --------
function ProcessingNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 bg-white border rounded shadow relative">
      {(data.type === "OPERATOR" || data.type === "SINK") && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 12,
            height: 12,
            background: "#fff",
            border: "2px solid #000",
            borderRadius: 0,
          }}
        />
      )}

      <div className="text-sm font-medium">{data.label}</div>

      {(data.type === "OPERATOR" || data.type === "SOURCE") && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: 12,
            height: 12,
            background: "#fff",
            border: "2px solid #000",
            borderRadius: 0,
          }}
        />
      )}
    </div>
  );
}

// -------- Canvas with React Flow logic (controlled from parent) --------
function PipelineCanvas({
  draft,
  nodes,
  setNodes,
  edges,
  setEdges,
  onSelectNode,
  status,
  editable,
}: {
  draft: Pipeline;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onSelectNode: (node: Node | null) => void;
  status: string;
  editable: boolean;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const { saveDraft } = usePipeline();
  const pe = usePE();

  // persist graph changes into local storage via context
  useEffect(() => {
    if (draft.source === "local") {
      saveDraft({
        ...draft,
        updatedAt: new Date().toISOString(),
        graph: { nodes, edges },
      });
    }
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      editable ? setNodes((nds) => applyNodeChanges(changes, nds)) : undefined,
    [setNodes, editable]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      editable ? setEdges((eds) => applyEdgeChanges(changes, eds)) : undefined,
    [setEdges, editable]
  );
  const displayedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        animated: status === "executing",
      })),
    [edges, status]
  );



  const onConnect = useCallback(
    (connection: Connection | Edge) =>
      editable
        ? setEdges((eds) => addEdge({ ...connection, type: "straight" }, eds))
        : undefined,
    [setEdges, editable]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (!editable) return;
      event.preventDefault();

      const templateId = event.dataTransfer.getData("application/reactflow");
      if (!templateId) return;

      const peData = pe.processingElements?.find(
        (elem) => elem.templateId === templateId
      );
      if (!peData) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // parse schema if present
      let schema: any = null;
      try {
        schema = peData.configSchema ? JSON.parse(peData.configSchema) : null;
      } catch {
        schema = null;
      }

      const newNode: Node = {
        id: `${+new Date()}`,
        type: "processing",
        position,
        data: {
          label: templateId,
          type: peData.processingElementType,
          config: {},        // current config values
          schema,            // parsed JSON schema (or null)
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, pe.processingElements, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = (_: any, node: Node) => onSelectNode(node);

  return (
    <ReactFlow
      nodes={nodes}
      edges={displayedEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onNodeClick={onNodeClick}
      fitView
      nodeTypes={{ processing: ProcessingNode }}
      defaultEdgeOptions={{ type: "straight" }}
      deleteKeyCode={["Backspace", "Delete"]}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

// -------- Main Builder with Sidebar + Canvas --------
export default function PipelineDesign() {
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const location = useLocation();
  const projectName = location.pathname.split("/")[3] || "default";
  const auth = useAuth();
  const pe = usePE();
  const { pipelines, refreshPipelines, loading } = usePipeline();

  // control graph state here so the right sidebar can update nodes
  const draft = useMemo(() => pipelines.find((p) => p.name === name), [pipelines, name]);
  const [nodes, setNodes] = useState<Node[]>(draft?.graph?.nodes || []);
  const [edges, setEdges] = useState<Edge[]>(draft?.graph?.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { validatePipeline } = usePipeline();
  const {
    topics: kafkaTopics,
    topicsLoading,
    topicsError,
    refreshTopics,
  } = useKafka()

  // when draft changes (e.g., after refreshPipelines), seed local graph state
  // Only run when switching to a new draft
  useEffect(() => {
    if (draft?.graph) {
      setNodes(draft.graph.nodes || []);
      setEdges(draft.graph.edges || []);
    }
  }, [draft?.name]); // or draft?.id if available

  // dependencies are fine here

  useEffect(() => {
    pe.getPes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshTopics(false);
  }, [refreshTopics]);

  useEffect(() => {
    console.log("refreshTopics effect fired");
    refreshTopics(false);
  }, [refreshTopics]);

  useEffect(() => {
    if (projectName) {
      refreshPipelines(projectName);
    }
  }, [projectName]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const handleSelectNode = (node: Node | null) => {
    // if the node has no schema (e.g., came from validated DB), try to attach one from PE catalog
    if (node) {
      const label = node.data?.label as string | undefined;
      const alreadyHasSchema = !!node.data?.schema;

      if (!alreadyHasSchema && label) {
        const match = pe.processingElements?.find((e) => e.templateId === label);
        if (match?.configSchema) {
          try {
            const parsed = JSON.parse(match.configSchema);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? { ...n, data: { ...n.data, schema: parsed } }
                  : n
              )
            );
          } catch {
            // ignore parse errors; leave schema as undefined
          }
        }
      }
      setSelectedNodeId(node.id);
    } else {
      setSelectedNodeId(null);
    }
  };

  
  // helper to update config of selected node (immutably)
  const updateSelectedNodeConfig = (key: string, value: any) => {
    if (!selectedNode) return;
    const nodeId = selectedNode.id;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const prevConfig =
          typeof n.data?.config === "object" && n.data.config !== null
            ? (n.data.config as Record<string, any>)
            : {};
        return {
          ...n,
          data: {
            ...n.data,
            config: { ...prevConfig, [key]: value },
          },
        };
      })
    );
  };

  const isKafkaTopicKey = (fullKey: string) => {
    const k = fullKey.toLowerCase();
    return (
      k === "topic" ||
      k.endsWith(".topic") ||
      k.includes("eventsource.topic") ||
      k.includes("kafka.topic")
    );
  };

  const renderSchema = useCallback(
    (schema: any, basePath: string[] = []) => {
      if (!schema || !schema.properties) return null;

      return Object.entries(schema.properties).map(([key, def]: [string, any]) => {
        const fullPath = [...basePath, key];
        const fullKey = fullPath.join(".");

        if (def.type === "object") {
          return (
            <div key={fullKey} className="ml-2 border-l border-gray-600 pl-3 mt-2">
              <label className="block text-sm font-semibold mb-1 text-blue-200">
                {key}
              </label>
              {renderSchema(def, fullPath)}
            </div>
          );
        }

        const val =
          (selectedNode?.data?.config as Record<string, any>)?.[fullKey] ?? "";

        return (
          <div key={fullKey} className="mb-3">
            <label className="block text-sm font-medium mb-1">
              {key}
              {Array.isArray(schema.required) &&
                schema.required.includes(key) && (
                  <span className="ml-1 text-red-300">*</span>
                )}
            </label>



            {isKafkaTopicKey(fullKey) ? (
              <select
                disabled={draft?.status !== "draft" || topicsLoading || !!topicsError}
                className="w-full p-2 rounded text-black"
                value={val}
                onChange={(e) => updateSelectedNodeConfig(fullKey, e.target.value)}
              >
                <option value="">
                  {topicsLoading
                    ? "Loading topics…"
                    : topicsError
                    ? "Failed to load topics"
                    : "Select a topic"}
                </option>

                {kafkaTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input
                readOnly={draft?.status !== "draft"}
                type={def.type === "number" ? "number" : "text"}
                className="w-full p-2 rounded text-black"
                value={val}
                onChange={(e) => updateSelectedNodeConfig(fullKey, e.target.value)}
              />
            )}

            {def.description && (
              <p className="text-xs text-gray-300 mt-1">{def.description}</p>
            )}
          </div>
        );
      });
    },
    [
      selectedNode,
      draft?.status,
      topicsLoading,
      topicsError,
      kafkaTopics,
      updateSelectedNodeConfig,
    ]
  );


  if (loading) return <div className="p-6">Loading pipeline…</div>;
  if (!draft) return <div className="p-6">Pipeline not found</div>;

  // Recursive renderer for JSON schema
  

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <aside className="w-60 bg-[#15283c] p-4 border-r overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-white">Processing Elements</h2>
        {pe.processingElements
          ?.filter((elem) => elem.ownerOrganization === auth.userData?.organizationName)
          .map((elem) => (
            <div
              key={elem.templateId}
              className="p-2 bg-white rounded shadow mb-2 cursor-pointer hover:bg-gray-50"
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData("application/reactflow", elem.templateId)
              }
            >
              {elem.templateId}{" "}
              <span className="text-xs text-gray-500">({elem.processingElementType})</span>
            </div>
          ))}

        <h2 className="text-lg font-semibold mb-4 mt-6 text-white">External PEs</h2>
        {pe.processingElements
          ?.filter((elem) => elem.ownerOrganization !== auth.userData?.organizationName)
          .map((elem) => (
            <div
              key={elem.templateId}
              className="p-2 bg-white rounded shadow mb-2 cursor-pointer hover:bg-gray-50"
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData("application/reactflow", elem.templateId)
              }
            >
              {elem.templateId}{" "}
              <span className="text-xs text-gray-500">({elem.processingElementType})</span>
            </div>
          ))}
      </aside>

      {/* Main Canvas Area */}
      <div className="flex-1">
        <ReactFlowProvider>
          <PipelineCanvas
            draft={draft}
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            onSelectNode={handleSelectNode}
            status={draft.status}
            editable={draft.status === "draft"}
          />
        </ReactFlowProvider>
      </div>

      {/* Right Sidebar for Node Configuration */}
      <aside className="w-72 bg-[#15283c] p-4 pb-10 border-l overflow-y-auto text-white">


        {draft.status === "executing" && (
          <>
            <h2 className="text-lg font-semibold mb-4">Results</h2>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded w-full  mb-4"
              onClick={() => navigate(`view-result`)}
            >
              View Results
            </button>
          </>
        )}

        <h2 className="text-lg font-semibold mb-4">Configuration</h2>

        {!selectedNode && (
          draft.status === "draft" ? (
            <p className="text-sm text-gray-300">Select a node to configure.</p>
          ) : (
            <p className="text-sm text-gray-300">
              Select a processing element to view configuration.
            </p>
          )
        )}

        {selectedNode && (
          <>
            <p className="text-sm text-gray-300 mb-3">
              Node: <strong>{String(selectedNode.data?.label)}</strong>
            </p>

            {/* If schema has no properties or is null, show friendly message */}
            {(() => {
              const schema: any = selectedNode.data?.schema || null;
              const properties: Record<string, any> =
                (schema?.properties as Record<string, any>) || {};
              const keys = Object.keys(properties);

              if (!schema || keys.length === 0) {
                return (
                  <div className="text-sm text-gray-300">
                    This processing element does not require configuration.
                  </div>
                );
              }

              return (
                <form onSubmit={(e) => e.preventDefault()}>
                  {renderSchema(schema)}
                </form>
              );
            })()}
          </>
        )}
      </aside>
    </div>
  );
}
