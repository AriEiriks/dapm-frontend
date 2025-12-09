import axiosInstance from "./axiosInstance";

export interface ExternalSource {
  name: string;
  connectorClass: string;
  topics: string;
}

export interface CreateExternalSourceRequest {
  name: string;
  topics: string;
  bucket: string;
  pollIntervalMs: string;
  serviceAccountKeyFile?: File;
}

export const getAllExternalSources = (orgDomainName: string) =>
  axiosInstance.get<ExternalSource[]>(
    "/api/external-sources",
    { baseURL: `http://localhost:${orgDomainName}` }
  );

function buildExternalSourceFormData(
  data: CreateExternalSourceRequest
): FormData {
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("topics", data.topics);
  formData.append("bucket", data.bucket);
  formData.append("pollIntervalMs", data.pollIntervalMs);

  if (data.serviceAccountKeyFile) {
    formData.append("serviceAccountKey", data.serviceAccountKeyFile);
  }

  return formData;
}

export const createExternalSource = (
  orgDomainName: string,
  payload: CreateExternalSourceRequest
) => {
  const formData = buildExternalSourceFormData(payload);

  return axiosInstance.post<{ message: string }>(
    "/api/external-sources", // or a dedicated /api/external-sources/create, depending on your backend
    formData,
    {
      baseURL: `http://localhost:${orgDomainName}`,
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
};