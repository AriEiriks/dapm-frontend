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
} from "../api/externalSources";

interface ExternalSourcesContextType {
  externalSources: ExternalSource[] | null;
  getSources: (domainName?: string) => Promise<string | void>;
  loadingExternalSources: boolean;
  setLoadingExternalSources: (loading: boolean) => void;
  addExternalSource: (
    req: CreateExternalSourceRequest
  ) => Promise<{ success: boolean; message: string }>;
  deleteExternalSourceByName: (name: string) => Promise<{ success: boolean; message: string }>;
  deletingExternalSource: boolean;
  getConnectorPlugins: () => Promise<ConnectorPlugin[]>;
  getConnectorPluginConfigDefs: (connectorClass: string) => Promise<ConnectorConfigDef[]>;
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

  async function getSources(domainName?: string) {
    try {
      setLoadingExternalSources(true);

      const safeOrgDomainName = localStorage.getItem("domain") || "";
      const response = await getAllExternalSources(safeOrgDomainName);

      if (response.data) {
        setExternalSources(response.data);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        return (
          (err.response?.data as string) ||
          err.message ||
          "Get External Sources failed"
        );
      }
      return "Get External Sources failed";
    } finally {
      setLoadingExternalSources(false);
    }
  }

  async function addExternalSource(
    req: CreateExternalSourceRequest
  ): Promise<{ success: boolean; message: string }> {
  try {
    const safeOrgDomainName = localStorage.getItem("domain") || "";
    const response = await createExternalSource(safeOrgDomainName, req);
    await getSources();
    return { success: true, message: response.data.message };
  } catch (err) {
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

async function deleteExternalSourceByName(
    name: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      setDeletingExternalSource(true);

      const safeOrgDomainName = localStorage.getItem("domain") || "";
      await deleteExternalSource(safeOrgDomainName, name);

      // refresh list after delete
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
      const safeOrgDomainName = localStorage.getItem("domain") || "";
      const response = await getConnectorPlugins(safeOrgDomainName);

      return (response.data || []).filter(
        (p) => !p?.clazz?.startsWith("org.apache.kafka.connect.mirror.")
      );
    } catch (err) {
      return [];
    }
  }

  
  async function fetchConnectorPluginConfigDefs(connectorClass: string): Promise<ConnectorConfigDef[]> {
    try {
      const safeOrgDomainName = localStorage.getItem("domain") || "";
      const response = await getConnectorPluginConfigDefs(safeOrgDomainName, connectorClass);
      return response.data || [];
    } catch (err) {
      return [];
    }
  }

  return (
    <ExternalSourcesContext.Provider
      value={{
        externalSources,
        getSources,
        loadingExternalSources,
        setLoadingExternalSources,
        addExternalSource,
        deleteExternalSourceByName,
        deletingExternalSource,
        getConnectorPlugins: fetchConnectorPlugins,
        getConnectorPluginConfigDefs: fetchConnectorPluginConfigDefs,
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