import React, {
  useContext,
  createContext,
  useState,
  ReactNode,
} from "react";
import axios from "axios";
import {
  ExternalSource,
  getAllExternalSources,
  createExternalSource,
  CreateExternalSourceRequest,
  deleteExternalSource,
  getConnectorPlugins,
  ConnectorPlugin,
  getConnectorPluginConfigDefs,
  ConnectorConfigDef,
  ConnectorConfig,
  getExternalSourceConnectorConfig,
  updateExternalSourceConnectorConfig,
  ConnectorStatusResponse,
  getExternalSourceConnectorStatus,
  pauseExternalSourceConnector,
  resumeExternalSourceConnector,
  DataFileInfo,
  listFilesInDataDir,
  uploadFileToDataDir,
} from "../api/externalSources";

function getOrgDomain(): string {
  return localStorage.getItem("domain") || "";
}

function toAxiosMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as any)?.message ||
      (err.response?.data as any)?.error ||
      (err.response?.data as string) ||
      err.message ||
      fallback
    );
  }
  return fallback;
}

interface ExternalSourcesContextType {
  externalSources: ExternalSource[] | null;
  getSources: (domainName?: string) => Promise<string | void>;
  loadingExternalSources: boolean;
  setLoadingExternalSources: (loading: boolean) => void;
  lastError: string | null;
  listFiles: () => Promise<DataFileInfo[]>;
  uploadFile: (file: File) => Promise<{ success: boolean; message: string }>;
  addExternalSource: (
    req: CreateExternalSourceRequest
  ) => Promise<{ success: boolean; message: string }>;
  deleteExternalSourceByName: (name: string) => Promise<{ success: boolean; message: string }>;
  deletingExternalSource: boolean;
  getConnectorPlugins: () => Promise<ConnectorPlugin[]>;
  getConnectorPluginConfigDefs: (connectorClass: string) => Promise<ConnectorConfigDef[]>;
  getExternalSourceConfig: (connectorName: string) => Promise<ConnectorConfig>;
  updateExternalSourceConfig: (
    connectorName: string,
    config: ConnectorConfig
  ) => Promise<{ success: boolean; message: string }>;
  getExternalSourceStatus: (connectorName: string) => Promise<ConnectorStatusResponse>;
  pauseExternalSource: (connectorName: string) => Promise<void>;
  resumeExternalSource: (connectorName: string) => Promise<void>;
}

const ExternalSourcesContext =
  createContext<ExternalSourcesContextType | undefined>(undefined);

interface ExternalSourcesProviderProps {
  children: ReactNode;
}

const ExternalSourcesProvider: React.FC<ExternalSourcesProviderProps> = ({ children }) => {
  const [externalSources, setExternalSources] = useState<ExternalSource[] | null>(null);
  const [loadingExternalSources, setLoadingExternalSources] = useState(false);
  const [deletingExternalSource, setDeletingExternalSource] = useState(false);

   const [lastError, setLastError] = useState<string | null>(null);

  async function getSources(domainName?: string) {
    try {
      setLoadingExternalSources(true);

      setLastError(null);

      const safeOrgDomainName = (domainName ?? getOrgDomain()).trim();
      if (!safeOrgDomainName) {
        setExternalSources([]);
        const msg = "Missing org domain (localStorage 'domain' is empty).";
        setLastError(msg);
        return msg;
      }
      const response = await getAllExternalSources(safeOrgDomainName);

      if (response.data) {
        setExternalSources(response.data);
      }
    } catch (err) {
    
      const msg = toAxiosMessage(err, "Get External Sources failed");
      setLastError(msg);
      return msg;

    } finally {
      setLoadingExternalSources(false);
    }
  }

  async function addExternalSource(
    req: CreateExternalSourceRequest
  ): Promise<{ success: boolean; message: string }> {
  try {
    const safeOrgDomainName = getOrgDomain().trim();
    const response = await createExternalSource(safeOrgDomainName, req);
    await getSources();
    return { success: true, message: response.data.message };
  } catch (err) {
    const msg = toAxiosMessage(err, "Create external source failed");
    setLastError(msg);
    if (axios.isAxiosError(err)) {
      return {
        success: false,
        message:
          (err.response?.data as any)?.message ||
          err.message ||
          "Create external source failed",
      };
    }
    return {
      success: false,
      message: "Create external source failed due to unknown error",
    };
  }
}

async function listFiles(): Promise<DataFileInfo[]> {
  try {
    setLastError(null);
    const safeOrgDomainName = getOrgDomain().trim();

    const res = await listFilesInDataDir(safeOrgDomainName);
    return res.data || [];
  } catch (err) {
    const msg = toAxiosMessage(err, "Failed to list files");
    setLastError(msg);
    throw new Error(msg);
  }
}

async function uploadFile(
  file: File
): Promise<{ success: boolean; message: string }> {
  try {
    const safeOrgDomainName = getOrgDomain().trim();
    const res = await uploadFileToDataDir(safeOrgDomainName, file);
    return {
      success: true,
      message: (res.data as any)?.message || "File uploaded",
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return {
        success: false,
        message:
          (err.response?.data as any)?.message ||
          (err.response?.data as any)?.error ||
          err.message ||
          "Upload failed",
      };
    }
    return { success: false, message: "Upload failed due to unknown error" };
  }
}

async function deleteExternalSourceByName(
    name: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      setDeletingExternalSource(true);

      const safeOrgDomainName = getOrgDomain().trim();
      await deleteExternalSource(safeOrgDomainName, name);

      await getSources();

      return { success: true, message: "External source connector deleted successfully" };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        return {
          success: false,
          message:
            (err.response?.data as any)?.message ||
            (err.response?.data as any)?.error ||
            err.message ||
            "Delete external source failed",
        };
      }
      return {
        success: false,
        message: "Delete external source failed due to unknown error",
      };
    } finally {
      setDeletingExternalSource(false);
    }
  }

  async function fetchConnectorPlugins(): Promise<ConnectorPlugin[]> {
    try {
      setLastError(null);
      const safeOrgDomainName = getOrgDomain().trim();

      const response = await getConnectorPlugins(safeOrgDomainName);

      return (response.data || []).filter(
        (p) => !p?.clazz?.startsWith("org.apache.kafka.connect.mirror.")
      );
    } catch (err) {
      const msg = toAxiosMessage(err, "Failed to load connector plugins");
      setLastError(msg);
      throw new Error(msg);
    }
  }

  
  async function fetchConnectorPluginConfigDefs(connectorClass: string): Promise<ConnectorConfigDef[]> {
    try {
      setLastError(null);
      const safeOrgDomainName = getOrgDomain().trim();

      const response = await getConnectorPluginConfigDefs(safeOrgDomainName, connectorClass);
      return response.data || [];
    } catch (err) {
      const msg = toAxiosMessage(err, "Failed to load config definitions");
      setLastError(msg);
      throw new Error(msg);
    }
  }

  async function getExternalSourceConfig(connectorName: string): Promise<ConnectorConfig> {
    const safeOrgDomainName = getOrgDomain().trim();
    const response = await getExternalSourceConnectorConfig(safeOrgDomainName, connectorName);
    return response.data || {};
  }

  async function updateExternalSourceConfig(
    connectorName: string,
    config: ConnectorConfig
  ): Promise<{ success: boolean; message: string }> {
    try {
      const safeOrgDomainName = getOrgDomain().trim();
      await updateExternalSourceConnectorConfig(safeOrgDomainName, connectorName, config);

      await getSources();

      return { success: true, message: "Connector updated successfully" };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        return {
          success: false,
          message:
            (err.response?.data as any)?.message ||
            (err.response?.data as any)?.error ||
            err.message ||
            "Update connector failed",
        };
      }
      return { success: false, message: "Update connector failed due to unknown error" };
    }
  }

  async function getExternalSourceStatus(connectorName: string) {
    const safeOrgDomainName = getOrgDomain().trim();
    const res = await getExternalSourceConnectorStatus(safeOrgDomainName, connectorName);
    return res.data; // { name, state }
  }

  async function pauseExternalSource(connectorName: string) {
    const safeOrgDomainName = getOrgDomain().trim();
    await pauseExternalSourceConnector(safeOrgDomainName, connectorName);
  }

  async function resumeExternalSource(connectorName: string) {
    const safeOrgDomainName = getOrgDomain().trim();
    await resumeExternalSourceConnector(safeOrgDomainName, connectorName);
  }

  return (
    <ExternalSourcesContext.Provider
      value={{
        externalSources,
        getSources,
        loadingExternalSources,
        setLoadingExternalSources,
        lastError,
        addExternalSource,
        deleteExternalSourceByName,
        deletingExternalSource,
        getConnectorPlugins: fetchConnectorPlugins,
        getConnectorPluginConfigDefs: fetchConnectorPluginConfigDefs,
        getExternalSourceConfig,
        updateExternalSourceConfig,
        getExternalSourceStatus,
        pauseExternalSource,
        resumeExternalSource,
        listFiles,
        uploadFile,
      }}
    >
      {children}
    </ExternalSourcesContext.Provider>
  );
};

export default ExternalSourcesProvider;

export const useExternalSources = (): ExternalSourcesContextType => {
  const context = useContext(ExternalSourcesContext);
  if (!context) {
    throw new Error("useExternalSources must be used within ExternalSourcesProvider");
  }
  return context;
};