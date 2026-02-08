import exp from "constants";
import axiosInstance from "./axiosInstance";
import { sendHandshakeRequest } from "./external-orgs";
export interface ProcessingElement {
  templateId: string;
  ownerOrganization: string;
  inputs: string[];
  output: string;
  hostURL: string;
  tier:  "FREE" | "BASIC" | "PREMIUM" | "PRIVATE";
  processingElementType: "SOURCE" | "SINK" | "OPERATOR";
  configSchema: string;
}



export interface UploadProcessingElementRequest {
  template: File;              
  configSchema: File;          
  tier: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE"; 
  processingElementType: "SOURCE" | "SINK" | "OPERATOR";
  output?: string ;           
  inputs?: string[];           
}


    // create a get all users function
export const getAllProcessingElements = (orgDomainName: string) => 
    axiosInstance.get<ProcessingElement[]>(`/api/processingElements`,
    { baseURL: `http://${orgDomainName}` } );

// export const getAllSubscribers = (orgDomainName: string) => 
//     axiosInstance.get<Org[]>(`/api/partner-organizations/subscribers`,
//     { baseURL: `http://${orgDomainName}` } );

function buildPEFormData(data: UploadProcessingElementRequest): FormData {
  const formData = new FormData();
  formData.append("template", data.template);
  formData.append("configSchema", data.configSchema);
  formData.append("tier", data.tier);
  formData.append("processingElementType", data.processingElementType);

  if (data.output) {
    formData.append("output", data.output);
  }
  else {
    formData.append("output", "");
  }

  if (data.inputs) {
    data.inputs.forEach((input) => formData.append("inputs", input));
  }

  return formData;
}

export const createProcessingElement = (
  orgDomainName: string,
  pe: UploadProcessingElementRequest
) => {
  console.log("Creating PE with data:", pe);
  const formData = buildPEFormData(pe);
  console.log("FormData entries:");
  Array.from(formData.entries()).forEach((pair) => {
    console.log(`${pair[0]}: ${pair[1]}`);
  });

  return axiosInstance.post<{ message: string }>(
    `/api/templates/uploadNewProcessingElement`,
    formData,
    {
      baseURL: `http://${orgDomainName}`,
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
};

export const getPeFromPublisher = (orgDomainName: string, handshakeData: sendHandshakeRequest) =>
    axiosInstance.post<{ message: string }>(`/api/external-peer-configs/sync-peer-configs`, handshakeData,
    { baseURL: `http://${orgDomainName}` } );