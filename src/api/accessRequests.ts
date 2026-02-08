//import exp from "constants";
import axiosInstance from "./axiosInstance";
export interface AccessRequest {
  id: string;
  pipelineName: string;
  organization: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedDurationHours: number;
  approvalToken: string;
  templateId: string;
}

export interface TakeDecisionRequest {
  requestId: string;
  status: "APPROVED" | "REJECTED";
}

// export const getAllAccessRequests = (orgDomainName: string) => 
//     axiosInstance.get<AccessRequest[]>(`/api/pipeline/configuration/requests`,
//     { baseURL: `http://localhost:${orgDomainName}` } );

export const getAllExternalAccessRequests = (orgDomainName: string) => 
    axiosInstance.get<AccessRequest[]>(`/api/pipeline/configuration/external-requests`,
    { baseURL: `http://${orgDomainName}` } );

export const getAllAccessRequests = (orgDomainName: string) => 
    axiosInstance.get<AccessRequest[]>(`/api/pipeline/configuration/requests`,
    { baseURL: `http://${orgDomainName}` } );

export const takeDecisionOnAccessRequest = (orgDomainName: string, data: TakeDecisionRequest) => 
    axiosInstance.post<{ success: boolean; message?: string }>(`/api/pipeline/configuration/request/take-decision`, data,
    { baseURL: `http://${orgDomainName}` } );
    
export const revokeAccessRequest = (orgDomainName: string, requestId: string) =>
  axiosInstance.post<{ success: boolean; message?: string }>(
    `/api/pipeline/configuration/revoke-token/${requestId}`,
    null, // no request body
    { baseURL: `http://${orgDomainName}` }
  );
