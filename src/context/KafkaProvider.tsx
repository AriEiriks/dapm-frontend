// src/context/KafkaProvider.tsx  (NEW FILE)
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { getKafkaTopics } from "../api/kafka";

type KafkaContextType = {
  topics: string[];
  topicsLoading: boolean;
  topicsError: string | null;
  refreshTopics: (includeInternal?: boolean) => Promise<void>;
};

const KafkaContext = createContext<KafkaContextType | undefined>(undefined);

export const KafkaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);




  const refreshTopics = useCallback(async (includeInternal = false) => {
    try {
        setTopicsLoading(true);
        setTopicsError(null);

        const orgDomainName = localStorage.getItem("domain") || "";
        const res = await getKafkaTopics(orgDomainName, includeInternal);

        setTopics(res.data ?? []);
    } catch (err: any) {
        let msg = "Failed to load topics";
        if (axios.isAxiosError(err)) {
        msg =
            (err.response?.data as any)?.message ||
            (err.response?.data as any)?.error ||
            `${err.response?.status ?? ""} ${err.message}`.trim();
        } else if (err?.message) {
        msg = err.message;
        }
        console.error("getKafkaTopics failed:", err);
        setTopicsError(msg);
    } finally {
        setTopicsLoading(false);
    }
    }, []);




  const value = useMemo(
    () => ({ topics, topicsLoading, topicsError, refreshTopics }),
    [topics, topicsLoading, topicsError]
  );

  return <KafkaContext.Provider value={value}>{children}</KafkaContext.Provider>;
};

export const useKafka = (): KafkaContextType => {
  const ctx = useContext(KafkaContext);
  if (!ctx) throw new Error("useKafka must be used within KafkaProvider");
  return ctx;
};
