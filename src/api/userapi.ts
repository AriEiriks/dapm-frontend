import exp from "constants";
import axiosInstance from "./axiosInstance";
export interface User {
  username: string;
  email: string;
  orgRoleName: string;
}

export interface CreateUserRequest {
    username: string;
    email: string;
    passwordHash: string;
    orgRole: string;
}

    // create a get all users function
export const getAllUsers = (orgDomainName: string) => 
    axiosInstance.get<User[]>(`/api/users/all`,
    { baseURL: `http://${orgDomainName}` } );

export const getAllAdmins = (orgDomainName: string) => 
    axiosInstance.get<User[]>(`/api/users/admins`,
    { baseURL: `http://${orgDomainName}` } );

export const createUser = (orgDomainName: string, userData: CreateUserRequest) => 
    axiosInstance.post<{ message: string }>(`/api/auth/register`, userData,
    { baseURL: `http://${orgDomainName}` } );