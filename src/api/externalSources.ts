import axiosInstance from "./axiosInstance";

export interface ExternalSource {
  name: string;
  type: string;
  connectorClass: string;
  topics: string;
  state?: string;
  usedByPipelines?: string[];
}

export interface CreateExternalSourceRequest {
  name: string;
  config: Record<string, string>;
}

export interface ConnectorStatusResponse {
  name: string;
  state: string;
}


export interface ConnectorPlugin {
  clazz: string;
  type?: string;
  version?: string | null;
}

export interface ConnectorConfigDef {
  name: string;
  type?: string;
  required?: boolean;
  default_value?: string | null;
  importance?: string;
  documentation?: string;
  group?: string;
  order?: number;
  [key: string]: any;
}

export type ConnectorConfig = Record<string, string>;

export type DataFileInfo = { name: string; size: number; connectPath: string };

export const listFilesInDataDir = (orgDomainName: string) =>
  axiosInstance.get<DataFileInfo[]>("/api/files", {
    baseURL: `http://${orgDomainName}`,
  });

export const uploadFileToDataDir = (orgDomainName: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return axiosInstance.post<{ message?: string }>("/api/files/upload", formData, {
    baseURL: `http://${orgDomainName}`,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getAllExternalSources = (orgDomainName: string) =>
  axiosInstance.get<ExternalSource[]>(
    "/api/external-sources",
    { baseURL: `http://${orgDomainName}` }
  );

export const createExternalSource = (
  orgDomainName: string,
  payload: CreateExternalSourceRequest
) =>
  axiosInstance.post<{ message: string }>(
    "/api/external-sources",
    payload,
    {
      baseURL: `http://${orgDomainName}`,
    }
  );

export const deleteExternalSource = (orgDomainName: string, connectorName: string) =>
  axiosInstance.delete<{ message?: string }>(
    `/api/external-sources/connectors/${encodeURIComponent(connectorName)}`,
    { baseURL: `http://${orgDomainName}` }
  );

export const getExternalSourceConnectorStatus = (
  orgDomainName: string,
  connectorName: string
) =>
  axiosInstance.get<ConnectorStatusResponse>(
    `/api/external-sources/connectors/${encodeURIComponent(connectorName)}/status`,
    { baseURL: `http://${orgDomainName}` }
  );

export const pauseExternalSourceConnector = (orgDomainName: string, connectorName: string) =>
  axiosInstance.put<void>(
    `/api/external-sources/connectors/${encodeURIComponent(connectorName)}/pause`,
    null,
    { baseURL: `http://${orgDomainName}` }
  );

export const resumeExternalSourceConnector = (orgDomainName: string, connectorName: string) =>
  axiosInstance.put<void>(
    `/api/external-sources/connectors/${encodeURIComponent(connectorName)}/resume`,
    null,
    { baseURL: `http://${orgDomainName}` }
  );

export const getConnectorPlugins = (orgDomainName: string) =>
  axiosInstance.get<ConnectorPlugin[]>(
    "/api/external-sources/plugins",
    { baseURL: `http://${orgDomainName}` }
  );

export const getConnectorPluginConfigDefs = (
  orgDomainName: string,
  connectorClass: string
) =>
  axiosInstance.get<ConnectorConfigDef[]>(
    `/api/external-sources/plugins/${encodeURIComponent(connectorClass)}/config-defs`,
    { baseURL: `http://${orgDomainName}` }
  );

export const getExternalSourceConnectorConfig = (
  orgDomainName: string,
  connectorName: string
) =>
  axiosInstance.get<ConnectorConfig>(
    `/api/external-sources/connectors/${encodeURIComponent(connectorName)}/config`,
    { baseURL: `http://${orgDomainName}` }
  );

export const updateExternalSourceConnectorConfig = (
  orgDomainName: string,
  connectorName: string,
  config: ConnectorConfig
) =>
  axiosInstance.put<ConnectorConfig>(
    `/api/external-sources/connectors/${encodeURIComponent(connectorName)}/config`,
    config,
    { baseURL: `http://${orgDomainName}` }
  );  