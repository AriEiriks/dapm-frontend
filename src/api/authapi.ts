import axiosInstance from "./axiosInstance";

// types for requests
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export const login = (data: LoginRequest, orgDomainName: string ) =>
  axiosInstance.post<AuthResponse>(`/api/auth/authenticate`, data,
    { baseURL: `http://${orgDomainName}` } );

export const signup = (data: SignupRequest) =>
  axiosInstance.post<AuthResponse>("/auth/register", data);

export const getMe = () => axiosInstance.get("/Member/getme");
