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
} from "../api/externalSources";

interface ExternalSourcesContextType {
  externalSources: ExternalSource[] | null;
  getSources: (domainName?: string) => Promise<string | void>;
  loadingExternalSources: boolean;
  setLoadingExternalSources: (loading: boolean) => void;
  addExternalSource: (
    req: CreateExternalSourceRequest
  ) => Promise<{ success: boolean; message: string }>;
}

const ExternalSourcesContext =
  createContext<ExternalSourcesContextType | undefined>(undefined);

interface ExternalSourcesProviderProps {
  children: ReactNode;
}

const ExternalSourcesProvider: React.FC<ExternalSourcesProviderProps> = ({ children }) => {
  const [externalSources, setExternalSources] = useState<ExternalSource[] | null>(null);
  const [loadingExternalSources, setLoadingExternalSources] = useState(false);

  async function getSources(domainName?: string) {
    try {
      setLoadingExternalSources(true);

      // trying same as PeProvider: read domain from localStorage
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
    // optionally refresh list
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

  return (
    <ExternalSourcesContext.Provider
      value={{
        externalSources,
        getSources,
        loadingExternalSources,
        setLoadingExternalSources,
        addExternalSource,
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