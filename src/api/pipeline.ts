import exp from "constants";
import axiosInstance from "./axiosInstance";

export interface DesignProcessingElement {
    templateID: string;
    configuration: any;
}

export interface DesignChannel {
    publisher: DesignProcessingElement;
    subscribers: Subscriber[];
}

export interface Subscriber {
    ["processing element"]: DesignProcessingElement;
    portNumber: number;
}

export interface DesignPipeline {
    pipelineName: string;
    projectName: string;
    ["processing elements"]: DesignProcessingElement[];
    channels: DesignChannel[];
}


export interface PipelineListItem {
    pipelineName: string;
    pipelinePhase: "VALIDATED" | "DRAFT" | "CONFIGURED" | "BUILT" | "EXECUTING" | "TERMINATED";
    processingElementIds: string[];
    projectName: string;
}

export interface MissingPermission {
    templateName: string;
    organizationName: string;
}
export interface ConfigureValidation{
    status: string;
    missingPermissions: MissingPermission[];
}

export interface PipelineProcessingElementRequestDto {
    processingElement: string;
    pipelineName: string;
    requestedDurationHours: number;
}

export interface RequestResponse {
    requestId: string;
    requestStatus: "PENDING" | "APPROVED" | "REJECTED"; 
    token: string;
}


export const designPipeline = (orgDomainName: string, data: DesignPipeline) =>
    axiosInstance.post<any>(`/api/pipeline/validation/design-pipeline`, data,
        { baseURL: `http://${orgDomainName}` });

export const buildPipelineApi = (orgDomainName: string, pipelineName: string) =>
    axiosInstance.post<any>(
        `/api/build-pipeline/${pipelineName}`,
        {},  // no body → empty object
        { baseURL: `http://${orgDomainName}` }
    );

export const executePipelineApi = (orgDomainName: string, pipelineName: string) =>
    axiosInstance.post<any>(`/api/build-pipeline/execute/${pipelineName}`,
        {},
        { baseURL: `http://${orgDomainName}` });

export const terminatePipelineApi = (orgDomainName: string, pipelineName: string) =>
    axiosInstance.post<any>(`/api/build-pipeline/terminate/${pipelineName}`,
        {},
        { baseURL: `http://${orgDomainName}` });

export const checkConfigureStatusPipeline = (orgDomainName: string, pipelineName: string) =>
    axiosInstance.get<any>(`/api/pipeline/configuration?pipelineName=${pipelineName}/configuration-status`,
        { baseURL: `http://${orgDomainName}` });

export const getPipelines = (orgDomainName: string, projectName: string) =>
    axiosInstance.get<PipelineListItem[]>(`/api/pipelines/${projectName}`, {
        baseURL: `http://${orgDomainName}`,
    });

export const getValidatedPipeline = (orgDomainName: string, pipelineName: string) =>
    axiosInstance.get<any>(`/api/pipeline/validation/${pipelineName}`,
        { baseURL: `http://${orgDomainName}` });

export const checkConfigurationStatusPipeline = (orgDomainName: string, pipelineName: string) =>
    axiosInstance.get<ConfigureValidation>(`/api/pipeline/configuration/${pipelineName}/configuration-status`,
        { baseURL: `http://${orgDomainName}` });

export const getPipelinePetriNet = (orgDomainName: string, pipelineName: string) =>
    axiosInstance.get<string>(`/api/pipeline/instances/${pipelineName}/petri-net`, {
        baseURL: `http://${orgDomainName}`,
    });

export const initiatePeerRequest = (
    orgDomainName: string,
    request: PipelineProcessingElementRequestDto
) =>
    axiosInstance.post<RequestResponse>(
        `/api/pipeline/configuration/request`,
        request,
        { baseURL: `http://${orgDomainName}` }
    );
