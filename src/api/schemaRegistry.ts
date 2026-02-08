import axiosInstance from "./axiosInstance"; // adjust path to your existing axios instance

export interface SchemaRegistryRegisterResponse {
  id: number;
}

function getOrgBaseUrl(orgDomainName: string): string {
  return `http://${orgDomainName}`;
}

export async function listSchemaSubjects(orgDomainName: string): Promise<string[]> {
  const res = await axiosInstance.get<string[]>("/api/schema-registry/subjects", {
    baseURL: getOrgBaseUrl(orgDomainName),
  });
  return res.data ?? [];
}

export async function registerJsonSchema(
  orgDomainName: string,
  subject: string,
  schemaJson: unknown
): Promise<SchemaRegistryRegisterResponse> {
  const encodedSubject = encodeURIComponent(subject);

  const res = await axiosInstance.post<SchemaRegistryRegisterResponse>(
    `/api/schema-registry/subjects/${encodedSubject}/versions`,
    schemaJson,
    { baseURL: getOrgBaseUrl(orgDomainName) }
  );

  return res.data;
}

export async function schemaRegistryHealth(orgDomainName: string): Promise<{ status: string }> {
  const res = await axiosInstance.get<{ status: string }>("/api/schema-registry/health", {
    baseURL: getOrgBaseUrl(orgDomainName),
  });
  return res.data;
}
