import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import axios from "axios";
import { listSchemaSubjects, registerJsonSchema } from "../api/schemaRegistry"; // adjust path

type UploadResult =
  | { success: true; message: string; schemaId?: number }
  | { success: false; message: string };

export interface SchemaRegistryContextType {
  subjects: string[];
  loadingSubjects: boolean;
  lastError: string | null;

  refreshSubjects: () => Promise<string[]>;
  uploadSchema: (subject: string, schemaText: string) => Promise<UploadResult>;
}

const SchemaRegistryContext = createContext<SchemaRegistryContextType | undefined>(undefined);

function getOrgDomain(): string {
  return localStorage.getItem("domain") || "";
}

export const SchemaRegistryProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshSubjects = useCallback(async (): Promise<string[]> => {
    setLoadingSubjects(true);
    setLastError(null);

    try {
      const orgDomain = getOrgDomain();
      const list = await listSchemaSubjects(orgDomain);
      setSubjects(list);
      return list;
    } catch (err) {
      setSubjects([]);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as any)?.error ||
          (err.response?.data as any)?.message ||
          err.message ||
          "Failed to load schema subjects";
        setLastError(msg);
      } else {
        setLastError("Failed to load schema subjects");
      }
      return [];
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  const uploadSchema = useCallback(async (subject: string, schemaText: string): Promise<UploadResult> => {
    setLastError(null);

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) return { success: false, message: "Subject is required." };

    const trimmedSchema = schemaText.trim();
    if (!trimmedSchema) return { success: false, message: "Schema text is required." };

    let parsedSchema: unknown;
    try {
      parsedSchema = JSON.parse(trimmedSchema);
    } catch {
      return { success: false, message: "Schema must be valid JSON." };
    }

    try {
      const orgDomain = getOrgDomain();
      const res = await registerJsonSchema(orgDomain, trimmedSubject, parsedSchema);

      // refresh list so Form tab dropdown sees it immediately
      await refreshSubjects();

      return { success: true, message: "Schema uploaded.", schemaId: res?.id };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as any)?.error ||
          (err.response?.data as any)?.message ||
          err.message ||
          "Schema upload failed";
        setLastError(msg);
        return { success: false, message: msg };
      }
      setLastError("Schema upload failed due to unknown error");
      return { success: false, message: "Schema upload failed due to unknown error" };
    }
  }, [refreshSubjects]);

  const value = useMemo<SchemaRegistryContextType>(
    () => ({
      subjects,
      loadingSubjects,
      lastError,
      refreshSubjects,
      uploadSchema,
    }),
    [subjects, loadingSubjects, lastError, refreshSubjects, uploadSchema]
  );

  return <SchemaRegistryContext.Provider value={value}>{children}</SchemaRegistryContext.Provider>;
};

export function useSchemaRegistry(): SchemaRegistryContextType {
  const ctx = useContext(SchemaRegistryContext);
  if (!ctx) {
    throw new Error("useSchemaRegistry must be used within a SchemaRegistryProvider");
  }
  return ctx;
}
