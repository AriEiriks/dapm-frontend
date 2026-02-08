import exp from "constants";
import axiosInstance from "./axiosInstance";
import { User } from "./userapi";

export interface createProject {
  name: string;
  roles: string[];
}

export interface Project {
  id: string;
  name: string;
  organizationName: string;
  roles: string[];
  // users: Set<User>;
}
export interface Role {
  id: string;
  name: string;
}

export interface ProjectPermAction {
  projectName: string;
  roleName: string;
  action: string;
}

export interface ProjectMember {
  username: string;
  role: string;
  project: string;
}
export interface CustomizedRole {
  projectName: string;
  roleName: string;
  permissions: string[];
}

// export interface PermAction{
//   id: string;
//     action: string;
// }

export const createProject = (orgDomainName: string, data: createProject) =>
  axiosInstance.post<Project>(`/api/projects/create`, data,
    { baseURL: `http://${orgDomainName}` });

export const getAllProjects = (orgDomainName: string) =>
  axiosInstance.get<Project[]>(`/api/projects/all`,
    { baseURL: `http://${orgDomainName}` });

export const getMyProjects = (orgDomainName: string) =>
  axiosInstance.get<Project[]>(`/api/projects/my-projects`,
    { baseURL: `http://${orgDomainName}` });

export const getProject = (orgPort: string, name: string) =>
  axiosInstance.get<Project>(`/api/projects/${name}`, {
    baseURL: `http://${orgPort}`
  });
export const getProjectsRoles = (orgDomainName: string) =>
  axiosInstance.get<Role[]>(`/api/projects/roles`,
    { baseURL: `http://${orgDomainName}` });

export const createRole = (orgDomainName: string, data: string) =>
  axiosInstance.post<Role>(`/api/projects/roles/add`, { name: data },
    { baseURL: `http://${orgDomainName}` });

export const getProjectRolePermActions = (orgDomainName: string, projectName: string) =>
  axiosInstance.get<ProjectPermAction[]>(
    `/api/project-role-permissions?projectName=${projectName}`,
    { baseURL: `http://${orgDomainName}` }
  );


export const getProjectRolePermActionsByRole = (
  orgDomainName: string,
  projectName: string,
  roleName: string
) =>
  axiosInstance.get<ProjectPermAction[]>(
    `/api/project-role-permissions/role/${roleName}?projectName=${projectName}`,
    { baseURL: `http://${orgDomainName}` }
  );

export const getProjectMembers = (
  orgDomainName: string,
  projectName: string
) =>
  axiosInstance.get<ProjectMember[]>(
    `/api/user-role-assignments?projectName=${projectName}`,
    { baseURL: `http://${orgDomainName}` }
  );

export const assignUserRole = (
  orgDomainName: string,
  data: ProjectMember
) =>
  axiosInstance.post<ProjectMember>(
    `/api/user-role-assignments/assign`,
    data,
    { baseURL: `http://${orgDomainName}` }
  );

export const assignCustomRole = (
  orgDomainName: string,
  data: CustomizedRole
) =>
  axiosInstance.post<Project>(
    `/api/projects/assign-roles-and-permissions`,
    data,
    { baseURL: `http://${orgDomainName}` }
  );

export const getPermissions = (orgDomainName: string) =>
  axiosInstance.get<string[]>(`/api/project-role-permissions/permission-actions`,
    { baseURL: `http://${orgDomainName}` });