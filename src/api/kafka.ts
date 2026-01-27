import axiosInstance from "./axiosInstance";

export const getKafkaTopics = (orgDomainName: string, includeInternal = false) =>
  axiosInstance.get<string[]>(
    "/api/kafka/topics",
    {
      params: { includeInternal },
      baseURL: `http://localhost:${orgDomainName}`,
    }
  );
