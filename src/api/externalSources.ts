import axiosInstance from "./axiosInstance";

export interface ExternalSource {
  name: string;
  type: string;
  connectorClass: string;
  topics: string;
}

export interface CreateExternalSourceRequest {
  name: string;
  config: Record<string, string>;
}

export const getAllExternalSources = (orgDomainName: string) =>
  axiosInstance.get<ExternalSource[]>(
    "/api/external-sources",
    { baseURL: `http://localhost:${orgDomainName}` }
  );

export const createExternalSource = (
  orgDomainName: string,
  payload: CreateExternalSourceRequest
) =>
  axiosInstance.post<{ message: string }>(
    "/api/external-sources",
    payload,
    {
      baseURL: `http://localhost:${orgDomainName}`,
    }
  );

export const deleteExternalSource = (orgDomainName: string, connectorName: string) =>
  axiosInstance.delete<{ message?: string }>(
    `/api/external-sources/connectors/${encodeURIComponent(connectorName)}`,
    { baseURL: `http://localhost:${orgDomainName}` }
  );