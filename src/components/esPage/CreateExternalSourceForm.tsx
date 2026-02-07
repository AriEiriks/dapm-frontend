import { useEffect, useMemo, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import TextFieldsIcon from "@mui/icons-material/TextFields";

import { useExternalSources } from "../../context/externalSourcesProvider";
import { useSchemaRegistry } from "../../context/schemaRegistryProvider";

import {
  CreateExternalSourceRequest,
  ConnectorPlugin,
  ConnectorConfigDef,
} from "../../api/externalSources";

interface CreateExternalSourceFormProps {
  setOpenExternalSourcePopup: (value: boolean) => void;

  mode?: "create" | "edit";
  editingConnectorName?: string;
  initialConfig?: Record<string, string>;
}

type FormValues = {
  name: string;
  connectorClass: string;
  config: Record<string, string>;
};

type DataFileInfo = {
  name: string;
  size: number;
  connectPath: string;
};

const CreateExternalSourceForm: React.FC<CreateExternalSourceFormProps> = ({
  setOpenExternalSourcePopup,
  mode = "create",
  editingConnectorName,
  initialConfig,
}) => {
  const externalSources = useExternalSources();
  const schemaRegistry = useSchemaRegistry();

  const FILE_SOURCE_CONNECTOR_CLASS =
    "org.apache.kafka.connect.file.FileStreamSourceConnector";

  const isFileSourceConnector = (clazz: string) =>
    clazz === FILE_SOURCE_CONNECTOR_CLASS;

  const [availableFiles, setAvailableFiles] = useState<DataFileInfo[]>([]);

  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [plugins, setPlugins] = useState<ConnectorPlugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);

  const [viewMode, setViewMode] = useState<"form" | "raw" | "schema">("form");

  const [configDefs, setConfigDefs] = useState<ConnectorConfigDef[]>([]);
  const [configDefsLoading, setConfigDefsLoading] = useState(false);

  const [rawBody, setRawBody] = useState<string>("");
  const [rawError, setRawError] = useState<string | null>(null);

  const [showOptional, setShowOptional] = useState(false);
  const [optionalSearch, setOptionalSearch] = useState("");

  const [rawDirty, setRawDirty] = useState(false);
  const lastRawSyncedRef = useRef<string>("");

  const [schemaSubjects, setSchemaSubjects] = useState<string[]>([]);
  const [schemaSubjectsLoading, setSchemaSubjectsLoading] = useState(false);

  const [schemaSubjectInput, setSchemaSubjectInput] = useState(""); 
  const [schemaBody, setSchemaBody] = useState("");              
  const [schemaSendLoading, setSchemaSendLoading] = useState(false);
  const [schemaSendError, setSchemaSendError] = useState<string | null>(null);

  const refreshSchemaSubjects = async () => {
    setSchemaSubjectsLoading(true);
    try {
      const subjects = await schemaRegistry.refreshSubjects();
      setSchemaSubjects(subjects || []);
    } finally {
      setSchemaSubjectsLoading(false);
    }
  };

  useEffect(() => {
    refreshSchemaSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAvailableFiles = async () => {
    setFilesLoading(true);
    setFilesError(null);
    try {
      // CHANGED: backend returns DataFileInfo[]
      const files = await externalSources.listFiles();
      setAvailableFiles(files || []);
    } catch (e: any) {
      setAvailableFiles([]);
      setFilesError(e?.message || "Failed to load files.");
    } finally {
      setFilesLoading(false);
    }
  };

const handleUploadFile = async (file: File) => {
  setUploadLoading(true);
  setUploadError(null);
  try {
    const res = await externalSources.uploadFile(file);
    if (!res.success) {
      setUploadError(res.message || "Upload failed.");
      return;
    }

    const files = await externalSources.listFiles();
    setAvailableFiles(files || []);

    const uploaded = (files || []).find((x) => x.name === file.name);

    setConfigValue("file", uploaded?.connectPath ?? `/data/${file.name}`);
  } catch (e: any) {
    setUploadError(e?.message || "Upload failed.");
  } finally {
    setUploadLoading(false);
  }
};

  const shortName = (clazz: string) => clazz.split(".").pop() || clazz;

  const RESERVED_CONFIG_KEYS = new Set(["name", "connector.class"]);

  const stripReservedConfigKeys = (cfg?: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(cfg || {})) {
      if (RESERVED_CONFIG_KEYS.has(k)) continue;
      out[k] = v;
    }
    return out;
  };

  const initialConnectorClass = useMemo(() => {
    if (mode !== "edit") return "";
    return initialConfig?.["connector.class"] || "";
  }, [mode, initialConfig]);

  const initialName = useMemo(() => {
    if (mode !== "edit") return "";
    return editingConnectorName || "";
  }, [mode, editingConnectorName]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlugins() {
      setPluginsLoading(true);
      try {
        const data = await externalSources.getConnectorPlugins();
        if (!cancelled) setPlugins(data);
      } finally {
        if (!cancelled) setPluginsLoading(false);
      }
    }

    if (mode === "create") {
      loadPlugins();
    }

    return () => {
      cancelled = true;
    };
  }, [externalSources, mode]);

  const groupedPlugins = useMemo(() => {
    const source: ConnectorPlugin[] = [];
    const sink: ConnectorPlugin[] = [];
    const other: ConnectorPlugin[] = [];

    for (const p of plugins) {
      const t = (p.type || "").toLowerCase();
      if (t === "source") source.push(p);
      else if (t === "sink") sink.push(p);
      else other.push(p);
    }

    const sortFn = (a: ConnectorPlugin, b: ConnectorPlugin) =>
      shortName(a.clazz).localeCompare(shortName(b.clazz));

    source.sort(sortFn);
    sink.sort(sortFn);
    other.sort(sortFn);

    return { source, sink, other };
  }, [plugins]);

  const formik = useFormik<FormValues>({
    initialValues: {
      name: mode === "edit" ? initialName : "",
      connectorClass: mode === "edit" ? initialConnectorClass : "",
      config: (mode === "edit"
        ? stripReservedConfigKeys(initialConfig || {})
        : {}) as Record<string, string>,
    },
    enableReinitialize: true,

    validationSchema: (values?: FormValues) => {
    const v = values ?? formik.initialValues;

    return Yup.object({
      name:
        mode === "create"
          ? Yup.string().required("Connector name is required")
          : Yup.string(),
      connectorClass:
        mode === "create"
          ? Yup.string().required("Connector type is required")
          : Yup.string(),
      config: Yup.object({
        file: isFileSourceConnector(v?.connectorClass || "")
          ? Yup.string().required("File is required")
          : Yup.string().notRequired(),
      }),
    });
  },



    onSubmit: async (values, { resetForm }) => {
      externalSources.setLoadingExternalSources(true);

      try {
        if (mode === "edit") {
          if (!editingConnectorName) {
            alert("Missing connector name for edit.");
            return;
          }

          const fullConfig: Record<string, string> = { ...(values.config || {}) };
          if (initialConnectorClass) {
            fullConfig["connector.class"] = initialConnectorClass;
          }
          delete fullConfig["name"];

          const res = await externalSources.updateExternalSourceConfig(
            editingConnectorName,
            fullConfig
          );

          if (res.success) {
            setOpenExternalSourcePopup(false);
            resetForm();
            setRawBody("");
            setRawError(null);
            setRawDirty(false);
          } else {
            alert("Update failed: " + res.message);
          }
          return;
        }

        const fullConfigToSubmit: Record<string, string> = { ...(values.config || {}) };
        if (values.connectorClass) {
          fullConfigToSubmit["connector.class"] = values.connectorClass;
        }
        delete fullConfigToSubmit["name"];


        const missing = [
          ...(isFileSourceConnector(values.connectorClass) ? ["file"] : []), 
          ...requiredDefs
            .map((d) => d.name)
            .filter((k) => k !== "name" && k !== "connector.class"),
        ].filter((k) => {
          const v = fullConfigToSubmit[k];
          return !v || String(v).trim() === "";
        });

        if (missing.length > 0) {
          alert("Please fill required fields:\n" + missing.join("\n"));
          return;
        }

        const payload: CreateExternalSourceRequest = {
          name: values.name,
          config: fullConfigToSubmit,
        };

        const result = await externalSources.addExternalSource(payload);

        if (result.success) {
          setOpenExternalSourcePopup(false);
          resetForm();
          setConfigDefs([]);
          setRawBody("");
          setRawError(null);
          setRawDirty(false);
        } else {
          alert("Create connector failed: " + result.message);
        }
      } finally {
        externalSources.setLoadingExternalSources(false);
      }
    },
  });

  const setConfigValue = (key: string, value: string) => {
    const nextConfig: Record<string, string> = { ...(formik.values.config || {}) };
    nextConfig[key] = value;
    formik.setFieldValue("config", nextConfig, false);
  };

  useEffect(() => {
    if (isFileSourceConnector(formik.values.connectorClass)) {
      refreshAvailableFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.connectorClass]);


  useEffect(() => {
    let cancelled = false;

    async function loadDefs(connectorClass: string) {
      if (!connectorClass) {
        setConfigDefs([]);
        return;
      }

      setConfigDefsLoading(true);
      try {
        const defs = await externalSources.getConnectorPluginConfigDefs(connectorClass);
        if (cancelled) return;

        setConfigDefs(defs || []);

        for (const d of (defs || []).filter((x) => x.required === true)) {
          const key = d.name;
          if (key === "name" || key === "connector.class") continue;

          const current = formik.values.config[key];
          if (current === undefined) {
            const next = (d.default_value ?? "") as string;
            setConfigValue(key, next);
          }
        }
      } finally {
        if (!cancelled) setConfigDefsLoading(false);
      }
    }

    loadDefs(formik.values.connectorClass);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.connectorClass]);

  const requiredDefs = useMemo(() => {
    return (configDefs || []).filter(
      (d) =>
        d.required === true &&
        d.name !== "name" &&
        d.name !== "connector.class"
    );
  }, [configDefs]);

   const optionalDefs = useMemo(() => {
    return (configDefs || []).filter(
      (d) =>
        d.required !== true &&
        d.name !== "connector.class" &&
        d.name !== "name" &&
        d.name !== "file"
    );
  }, [configDefs]);

  const optionalGroups = useMemo(() => {
    const q = optionalSearch.trim().toLowerCase();
    const filtered = q
      ? optionalDefs.filter((d) => d.name.toLowerCase().includes(q) || (d.group || "").toLowerCase().includes(q))
      : optionalDefs;

    const groups = new Map<string, ConnectorConfigDef[]>();
    for (const d of filtered) {
      const g = (d.group && d.group.trim()) ? d.group.trim() : "Other";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(d);
    }

    const sortedGroupNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    return sortedGroupNames.map((name) => ({
      name,
      defs: (groups.get(name) || []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [optionalDefs, optionalSearch]);

  const buildRawProjection = () => {
    if (mode === "edit") {
      return { name: formik.values.name, config: formik.values.config };
    }

    const projected = buildRequiredPlusTouchedOptionalConfig(
      formik.values.config,
      formik.values.connectorClass,
      requiredDefs
    );

    delete projected["name"];

    return { name: formik.values.name, config: projected };
  };

  useEffect(() => {
    if (viewMode !== "raw") return;

    if (rawDirty) return;

    const next = JSON.stringify(buildRawProjection(), null, 2);
    setRawBody(next);
    lastRawSyncedRef.current = next;
    setRawError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewMode,
    mode,
    rawDirty,
    formik.values.name,
    formik.values.connectorClass,
    requiredDefs,
  ]);

  const onRawChange = (text: string) => {
    setRawBody(text);
    setRawDirty(true);

    try {
      const parsed = JSON.parse(text);

      if (parsed && typeof parsed === "object") {
        if (mode !== "edit" && typeof parsed.name === "string") {
          formik.setFieldValue("name", parsed.name, false);
        }

        if (parsed.config && typeof parsed.config === "object") {
          if (mode === "edit") {
            const nextConfig: Record<string, string> = {};
            for (const [k, v] of Object.entries(parsed.config)) {
              nextConfig[k] = String(v ?? "");
            }
            if (initialConnectorClass) nextConfig["connector.class"] = initialConnectorClass;
            formik.setFieldValue("config", nextConfig, false);
          } else {
            const incoming: Record<string, string> = {};
            for (const [k, v] of Object.entries(parsed.config)) {
              incoming[k] = String(v ?? "");
            }

            if (typeof parsed.config["connector.class"] === "string") {
              formik.setFieldValue("connectorClass", parsed.config["connector.class"], false);
            }

            const merged: Record<string, string> = { ...(formik.values.config || {}) };
            for (const [k, v] of Object.entries(incoming)) {
              if (k === "connector.class") continue; 
              if (k === "name") continue; 
              merged[k] = v;
            }
            formik.setFieldValue("config", merged, false);
          }
        }
      }

      setRawError(null);

    } catch {
      setRawError("Invalid JSON (not saved to form until fixed).");
    }
  };

  const refreshRawFromForm = () => {
    const next = JSON.stringify(buildRawProjection(), null, 2);
    setRawBody(next);
    lastRawSyncedRef.current = next;
    setRawError(null);
    setRawDirty(false);
  };

  return (
    <form className="flex flex-col w-full py-1 signup" onSubmit={formik.handleSubmit}>
      {/* Mode toggle */}
      <div className="w-full flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setViewMode("form")}
          className={[
            "px-4 py-2 rounded-md border-2 border-white",
            viewMode === "form" ? "bg-[#15283c] text-white" : "bg-transparent text-[#ffffff4d]",
          ].join(" ")}
        >
          Form
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("raw");
            if (!rawDirty) {
              const next = JSON.stringify(buildRawProjection(), null, 2);
              setRawBody(next);
              lastRawSyncedRef.current = next;
              setRawError(null);
            }
          }}
          className={[
            "px-4 py-2 rounded-md border-2 border-white",
            viewMode === "raw" ? "bg-[#15283c] text-white" : "bg-transparent text-[#ffffff4d]",
          ].join(" ")}
        >
          Raw
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("schema");
            setSchemaSendError(null);
          }}
          className={[
            "px-4 py-2 rounded-md border-2 border-white",
            viewMode === "schema" ? "bg-[#15283c] text-white" : "bg-transparent text-[#ffffff4d]",
          ].join(" ")}
        >
          Schema
        </button>

      </div>

      

      {viewMode === "schema" ? (
        <div className="w-full flex flex-col mb-4">
          <h4 className="text-sm font-bold text-[#ffffff4d] mb-2">Upload JSON Schema</h4>

          <div className="w-full flex flex-col mb-3">
            <span className="text-xs text-[#ffffff4d] font-bold">Subject</span>
            <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
              <TextFieldsIcon className="text-white" />
              <input
                type="text"
                className="bg-transparent text-white w-full ml-2 outline-none"
                placeholder='e.g. "my-topic-value"'
                value={schemaSubjectInput}
                onChange={(e) => setSchemaSubjectInput(e.target.value)}
              />
            </div>
            <div className="text-[11px] text-[#ffffff4d] mt-1">
              Subject is the Schema Registry identifier (does not require the Kafka topic to exist yet).
            </div>
          </div>

          <div className="w-full flex flex-col mb-3">
            <span className="text-xs text-[#ffffff4d] font-bold">JSON Schema</span>
            <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-start rounded-md">
              <TextFieldsIcon className="text-white mt-1" />
              <textarea
                rows={12}
                className="bg-transparent text-white w-full ml-2 outline-none resize-y"
                value={schemaBody}
                onChange={(e) => setSchemaBody(e.target.value)}
                placeholder={`{
                  "$schema": "http://json-schema.org/draft-07/schema#",
                  "type": "object",
                  "properties": {
                    "timestamp": { "type": "string", "format": "date-time" },
                    "source": { "type": "string" }
                  },
                  "required": ["timestamp", "source"]
                }`}
              />
            </div>
          </div>

          {schemaSendError && (
            <div className="text-red-500 text-xs mb-2">{schemaSendError}</div>
          )}

          <div className="w-full flex gap-2">
            <button
              type="button"
              className="text-white sm:w-fit w-full sm:px-6 p-2 px-6 bg-[#15283c] hover:bg-[#ff5722] border-2 border-white rounded-md disabled:opacity-50"
              disabled={schemaSendLoading}
              onClick={async () => {
                setSchemaSendError(null);

                const subject = schemaSubjectInput.trim();
                const schemaText = schemaBody.trim();

                if (!subject) {
                  setSchemaSendError("Subject is required.");
                  return;
                }
                if (!schemaText) {
                  setSchemaSendError("Schema text is required.");
                  return;
                }

                setSchemaSendLoading(true);
                try {
                  const res = await schemaRegistry.uploadSchema(subject, schemaText);

                  if (!res.success) {
                    setSchemaSendError(res.message || "Schema upload failed.");
                    return;
                  }

                  setSchemaBody("");
                  setSchemaSubjectInput("");

                  await refreshSchemaSubjects();
                } finally {
                  setSchemaSendLoading(false);
                }
              }}
            >
              Send schema
            </button>

            <button
              type="button"
              className="text-white sm:w-fit w-full sm:px-6 p-2 px-6 bg-transparent border-2 border-white rounded-md disabled:opacity-50"
              disabled={schemaSubjectsLoading}
              onClick={refreshSchemaSubjects}
              title="Refresh subjects"
            >
              Refresh
            </button>
          </div>
        </div>
      
        ) : viewMode === "raw" ? (
        <div className="w-full flex flex-col mb-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#ffffff4d]">
              {mode === "edit"
                ? "Raw connector body (full config)"
                : "Raw connector body (required first — you can add optional keys)"}
            </h4>

            <button
              type="button"
              className="text-xs text-white underline disabled:opacity-50"
              onClick={refreshRawFromForm}
              disabled={!rawDirty && rawBody === lastRawSyncedRef.current}
              title="Reset raw editor from the current form/config state"
            >
              Refresh from form
            </button>
          </div>

          <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-start rounded-md">
            <TextFieldsIcon className="text-white mt-1" />
            <textarea
              name="rawBody"
              rows={14}
              className="bg-transparent text-white w-full ml-2 outline-none resize-y"
              value={rawBody}
              onChange={(e) => onRawChange(e.target.value)}
            />
          </div>

          {rawError && <div className="text-red-500 text-xs mt-1">{rawError}</div>}

          {mode === "edit" && (
            <div className="text-xs text-[#ffffff4d] mt-2">
              Saving will update the connector configuration and restart tasks.
            </div>
          )}

          {mode === "create" && (
            <div className="text-xs text-[#ffffff4d] mt-2">
              Tip: Optional keys you add here will be kept and submitted (they may not appear until you set them or refresh).
            </div>
          )}
        </div>
        ) : (
        <>

          <div className="w-full flex flex-col mb-4">
            <h4 className="text-sm font-bold text-[#ffffff4d]">Schema (optional)</h4>

            <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
              <TextFieldsIcon className="text-white" />
              <select
                className={[
                  "bg-transparent w-full ml-2 outline-none",
                  (formik.values.config["dapm.schema.subject"] || "").trim()
                    ? "text-white"
                    : "text-[#ffffff4d]",
                ].join(" ")}
                value={formik.values.config["dapm.schema.subject"] ?? ""}
                onChange={(e) => {
                  setConfigValue("dapm.schema.subject", e.target.value);
                }}
              >
                <option value="" className="text-black bg-white">
                  {schemaSubjectsLoading ? "Loading schemas…" : "No schema (schemaless)"}
                </option>
                {schemaSubjects.map((s) => (
                  <option key={s} value={s} className="text-black bg-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-[#ffffff4d] mt-1">
              This stores the chosen Schema Registry subject in the connector config as <b>dapm.schema.subject</b>.
            </div>
          </div>

          {/* Connector Type */}
          <div className="w-full flex flex-col mb-4">
            <h4 className="text-sm font-bold text-[#ffffff4d]">Connector Type</h4>

            <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
              <TextFieldsIcon className="text-white" />
              <select
                name="connectorClass"
                className={[
                  "bg-transparent w-full ml-2 outline-none",
                  formik.values.connectorClass ? "text-white" : "text-[#ffffff4d]",
                ].join(" ")}
                onChange={(e) => {
                  formik.setFieldValue("connectorClass", e.target.value, false);
                  setOptionalSearch("");
                  setShowOptional(false);
                }}
                onBlur={formik.handleBlur}
                value={formik.values.connectorClass}
                disabled={pluginsLoading || mode === "edit"}
              >
                <option value="" disabled className="text-grey-500">
                  {pluginsLoading ? "Loading connector types…" : "Select a connector…"}
                </option>

                {groupedPlugins.source.length > 0 && (
                  <optgroup label="Source connectors" className="text-black bg-white">
                    {groupedPlugins.source.map((p) => (
                      <option key={p.clazz} value={p.clazz} className="text-black bg-white">
                        {shortName(p.clazz)}
                        {p.version ? ` (${p.version})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}

                {groupedPlugins.sink.length > 0 && (
                  <optgroup label="Sink connectors" className="text-black bg-white">
                    {groupedPlugins.sink.map((p) => (
                      <option key={p.clazz} value={p.clazz} className="text-black bg-white">
                        {shortName(p.clazz)}
                        {p.version ? ` (${p.version})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}

                {groupedPlugins.other.length > 0 && (
                  <optgroup label="Other" className="text-black bg-white">
                    {groupedPlugins.other.map((p) => (
                      <option key={p.clazz} value={p.clazz} className="text-black bg-white">
                        {shortName(p.clazz)}
                        {p.version ? ` (${p.version})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {formik.touched.connectorClass && formik.errors.connectorClass && (
              <div className="text-red-500 text-xs mt-1">{formik.errors.connectorClass}</div>
            )}

            {mode === "edit" && (
              <div className="text-xs text-[#ffffff4d] mt-1">
                Connector type is locked during edit.
              </div>
            )}
          </div>

          {/* Connector Name */}
          <div className="w-full flex flex-col mb-4">
            <h4 className="text-sm font-bold text-[#ffffff4d]">Connector Name</h4>

            <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
              <TextFieldsIcon className="text-white" />
              <input
                type="text"
                name="name"
                className="bg-transparent text-white w-full ml-2 outline-none"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.name}
                disabled={mode === "edit"}
              />
            </div>

            {formik.touched.name && formik.errors.name && (
              <div className="text-red-500 text-xs mt-1">{formik.errors.name}</div>
            )}

            {mode === "edit" && (
              <div className="text-xs text-[#ffffff4d] mt-1">
                Connector name is locked during edit.
              </div>
            )}
          </div>

          
          {/* File (ONLY for FileSource connector type) */}
          {isFileSourceConnector(formik.values.connectorClass) && (
            <div className="w-full flex flex-col mb-4">
              <h4 className="text-sm font-bold text-[#ffffff4d]">File</h4>

              <div className="w-full flex items-center gap-2">
                <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
                  <TextFieldsIcon className="text-white" />
                  <select
                    className={[
                      "bg-transparent w-full ml-2 outline-none",
                      (formik.values.config["file"] || "").trim()
                        ? "text-white"
                        : "text-[#ffffff4d]",
                    ].join(" ")}
                    value={formik.values.config["file"] ?? ""}
                    onChange={(e) => setConfigValue("file", e.target.value)}
                    onBlur={() => formik.setFieldTouched("config.file", true, false)}
                    disabled={filesLoading}
                  >
                    <option value="" className="text-black bg-white">
                      {filesLoading ? "Loading files…" : "Select a file…"}
                    </option>
                    {availableFiles.map((f) => (
                      <option key={f.connectPath} value={f.connectPath} className="text-black bg-white">
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    await handleUploadFile(file);
                    e.currentTarget.value = "";
                  }}
                />

                <button
                  type="button"
                  className="text-white sm:w-fit w-fit px-4 py-2 bg-[#15283c] hover:bg-[#ff5722] border-2 border-white rounded-md disabled:opacity-50"
                  disabled={uploadLoading}
                  onClick={() => uploadInputRef.current?.click()}
                  title="Upload a new file to /data"
                >
                  {uploadLoading ? "Uploading…" : "Upload"}
                </button>

                <button
                  type="button"
                  className="text-white sm:w-fit w-fit px-4 py-2 bg-transparent border-2 border-white rounded-md disabled:opacity-50"
                  disabled={filesLoading}
                  onClick={refreshAvailableFiles}
                  title="Refresh files"
                >
                  Refresh
                </button>
              </div>

              {formik.touched.config?.file && (formik.errors as any)?.config?.file && (
                <div className="text-red-500 text-xs mt-1">
                  {(formik.errors as any)?.config?.file}
                </div>
              )}
              {filesError && <div className="text-red-500 text-xs mt-1">{filesError}</div>}
              {uploadError && <div className="text-red-500 text-xs mt-1">{uploadError}</div>}
            </div>
          )}

          {/* Required configuration fields */}
          <div className="w-full flex flex-col mb-4">
            <h4 className="text-sm font-bold text-[#ffffff4d]">Required configuration</h4>

            {!formik.values.connectorClass ? (
              <div className="text-xs text-[#ffffff4d]">
                Select a connector type to load required fields.
              </div>
            ) : configDefsLoading ? (
              <div className="text-xs text-[#ffffff4d]">Loading required fields…</div>
            ) : requiredDefs.length === 0 ? (
              <div className="text-xs text-[#ffffff4d]">
                No required fields reported by the connector (besides connector.class).
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {requiredDefs
                  .filter((d) => d.name !== "connector.class" && d.name !== "name") // reserved keys
                  .map((d) => (
                    <div key={d.name} className="w-full flex flex-col">
                      <span className="text-xs text-[#ffffff4d] font-bold">{d.name}</span>

                      <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
                        <TextFieldsIcon className="text-white" />
                        <input
                          type="text"
                          className="bg-transparent text-white w-full ml-2 outline-none"
                          value={formik.values.config[d.name] ?? ""}
                          onChange={(e) => setConfigValue(d.name, e.target.value)}
                          onBlur={formik.handleBlur}
                          placeholder={(d.default_value ?? "") as string}
                        />
                      </div>

                      {d.documentation && (
                        <div className="text-[11px] text-[#ffffff4d] mt-1 whitespace-normal break-words">
                          {d.documentation}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Optional configuration */}
          <div className="w-full flex flex-col mb-4">
            <button
              type="button"
              className="text-left text-sm font-bold text-[#ffffff4d] flex items-center justify-between"
              onClick={() => setShowOptional((v) => !v)}
              disabled={!formik.values.connectorClass || configDefsLoading}
              title={!formik.values.connectorClass ? "Select a connector type first" : ""}
            >
              <span>Optional configuration</span>
              <span className="text-xs text-white">
                {showOptional ? "Hide" : "Show"}
              </span>
            </button>

            {showOptional && (
              <div className="mt-2 border border-white/20 rounded-md">
                {/* header/search (stays visible) */}
                <div className="p-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="bg-transparent text-white w-full outline-none border border-white/20 rounded px-2 py-1 text-sm"
                      placeholder="Search optional configs…"
                      value={optionalSearch}
                      onChange={(e) => setOptionalSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* long list scrolls */}
                <div className="p-3 max-h-[50vh] overflow-y-auto">
                  {optionalDefs.length === 0 ? (
                    <div className="text-xs text-[#ffffff4d]">
                      No optional fields reported by the connector.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {optionalGroups.map((g) => (
                        <div key={g.name}>
                          <div className="text-xs text-white/80 font-semibold mb-2">
                            {g.name}
                          </div>

                          <div className="flex flex-col gap-3">
                            {g.defs.map((d) => (
                              <div key={d.name} className="w-full flex flex-col">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-[#ffffff4d] font-bold break-all">
                                    {d.name}
                                  </span>
                                  {formik.values.config[d.name] !== undefined &&
                                    String(formik.values.config[d.name]).trim() !== "" && (
                                      <span className="text-[10px] text-white/80">set</span>
                                    )}
                                </div>

                                <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
                                  <TextFieldsIcon className="text-white" />
                                  <input
                                    type="text"
                                    className="bg-transparent text-white w-full ml-2 outline-none"
                                    value={formik.values.config[d.name] ?? ""}
                                    onChange={(e) => setConfigValue(d.name, e.target.value)}
                                    onBlur={formik.handleBlur}
                                    placeholder={(d.default_value ?? "") as string}
                                  />
                                </div>

                                {d.documentation && (
                                  <div className="text-[11px] text-[#ffffff4d] mt-1 whitespace-normal break-words">
                                    {d.documentation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex justify-center mt-8">
            <button
              type="submit"
              className="text-white text-xl sm:w-fit w-full sm:px-10 p-2 px-6 bg-[#15283c] hover:bg-[#ff5722] border-2 border-white rounded-md"
              disabled={externalSources.loadingExternalSources}
            >
              {mode === "edit" ? "SAVE" : "CREATE"}
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default CreateExternalSourceForm;

function buildRequiredPlusTouchedOptionalConfig(
  allConfig: Record<string, string>,
  connectorClass: string,
  requiredDefs: ConnectorConfigDef[]
) {
  const requiredKeys = new Set(requiredDefs.map((d) => d.name));
  const picked: Record<string, string> = {};

  if (connectorClass) picked["connector.class"] = connectorClass;

  for (const [k, v] of Object.entries(allConfig || {})) {
    if (requiredKeys.has(k)) {
      picked[k] = v;
      continue;
    }
    if (v !== undefined && String(v).trim() !== "") {
      picked[k] = v;
    }
  }

  for (const d of requiredDefs) {
    if (picked[d.name] === undefined) {
      picked[d.name] = (d.default_value ?? "") as string;
    }
  }

  return picked;
}
