import { useFormik } from "formik";
import * as Yup from "yup";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import { useExternalSources } from "../../context/externalSourcesProvider";
import { CreateExternalSourceRequest, ConnectorPlugin, ConnectorConfigDef } from "../../api/externalSources";
import { useEffect, useMemo, useState } from "react";

interface CreateExternalSourceFormProps {
  setOpenExternalSourcePopup: (value: boolean) => void;
}

const CreateExternalSourceForm: React.FC<CreateExternalSourceFormProps> = ({
  setOpenExternalSourcePopup,
}) => {
  const externalSources = useExternalSources();

  const [plugins, setPlugins] = useState<ConnectorPlugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"form" | "raw">("form");

  const [configDefs, setConfigDefs] = useState<ConnectorConfigDef[]>([]);
  const [configDefsLoading, setConfigDefsLoading] = useState(false);

  const [rawBody, setRawBody] = useState<string>("");
  const [rawError, setRawError] = useState<string | null>(null);

  const shortName = (clazz: string) => clazz.split(".").pop() || clazz;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPluginsLoading(true);
      try {
        const data = await externalSources.getConnectorPlugins();
        if (!cancelled) setPlugins(data);
      } finally {
        if (!cancelled) setPluginsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [externalSources]);

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

  // REQUIRED config for now
  const requiredDefs = useMemo(() => {
    return (configDefs || []).filter((d) => d.required === true);
  }, [configDefs]);

  const buildRequiredOnlyConfig = (allConfig: Record<string, string>, connectorClass: string) => {
    const requiredKeys = new Set(requiredDefs.map((d) => d.name));
    const picked: Record<string, string> = {};

    if (connectorClass) picked["connector.class"] = connectorClass;

    for (const k of Object.keys(allConfig || {})) {
      if (requiredKeys.has(k)) picked[k] = allConfig[k];
    }

    for (const d of requiredDefs) {
      if (picked[d.name] === undefined) {
        picked[d.name] = (d.default_value ?? "") as string;
      }
    }

    return picked;
  };

  const formik = useFormik({
    initialValues: {
      name: "",
      connectorClass: "",
      config: {} as Record<string, string>,
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Connector name is required"),
      connectorClass: Yup.string().required("Connector type is required"),

    }),
    onSubmit: async (values, { resetForm }) => {
      externalSources.setLoadingExternalSources(true);

      const requiredOnlyConfig = buildRequiredOnlyConfig(values.config, values.connectorClass);

      const missing = requiredDefs
        .map((d) => d.name)
        .filter((k) => !requiredOnlyConfig[k] || requiredOnlyConfig[k].trim() === "");

      if (missing.length > 0) {
        alert("Please fill required fields:\n" + missing.join("\n"));
        externalSources.setLoadingExternalSources(false);
        return;
      }

      const payload: CreateExternalSourceRequest = {
        name: values.name,
        config: requiredOnlyConfig,
      };

      const result = await externalSources.addExternalSource(payload);

      if (result.success) {
        setOpenExternalSourcePopup(false);
        resetForm();
        setConfigDefs([]); //reset schema when closing
        setRawBody("");
        setRawError(null);
      } else {
        alert("Create external source failed: " + result.message);
      }

      externalSources.setLoadingExternalSources(false);
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDefs() {
      const clazz = formik.values.connectorClass;
      if (!clazz) {
        setConfigDefs([]);
        return;
      }

      setConfigDefsLoading(true);
      try {
        const defs = await externalSources.getConnectorPluginConfigDefs(clazz);
        if (cancelled) return;

        setConfigDefs(defs || []);

        for (const d of (defs || []).filter((x) => x.required === true)) {
          const key = d.name;
          const current = formik.values.config[key];
          if (current === undefined) {
            const next = (d.default_value ?? "") as string;
            formik.setFieldValue(`config.${key}`, next, false);
          }
        }
      } finally {
        if (!cancelled) setConfigDefsLoading(false);
      }
    }

    loadDefs();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.connectorClass]);


  useEffect(() => {
    if (viewMode !== "raw") return;

    const requiredOnly = buildRequiredOnlyConfig(formik.values.config, formik.values.connectorClass);
    const next = JSON.stringify({ name: formik.values.name, config: requiredOnly }, null, 2);

    setRawBody(next);
    setRawError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, formik.values.name, formik.values.connectorClass, requiredDefs]);

  const onRawChange = (text: string) => {
    setRawBody(text);

    try {
      const parsed = JSON.parse(text);

      if (parsed && typeof parsed === "object") {
        if (typeof parsed.name === "string") {
          formik.setFieldValue("name", parsed.name, false);
        }
        if (parsed.config && typeof parsed.config === "object") {
          const requiredKeys = new Set(requiredDefs.map((d) => d.name));
          for (const [k, v] of Object.entries(parsed.config)) {
            if (k === "connector.class") {
              if (typeof v === "string") formik.setFieldValue("connectorClass", v, false);
              continue;
            }
            if (requiredKeys.has(k)) {
              formik.setFieldValue(`config.${k}`, String(v ?? ""), false);
            }
          }
        }
      }

      setRawError(null);
    } catch (e: any) {
      setRawError("Invalid JSON (not saved to form until fixed).");
    }
  };


  return (
    <form
      className="flex flex-col w-full py-1 signup"
      onSubmit={formik.handleSubmit}
    >

      <div className="w-full flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setViewMode("form")}
          className={[
            "px-4 py-2 rounded-md border-2 border-white",
            viewMode === "form" ? "bg-[#15283c] text-white" : "bg-transparent text-[#ffffff4d]"
          ].join(" ")}
        >
          Form
        </button>

        <button
          type="button"
          onClick={() => setViewMode("raw")}
          className={[
            "px-4 py-2 rounded-md border-2 border-white",
            viewMode === "raw" ? "bg-[#15283c] text-white" : "bg-transparent text-[#ffffff4d]"
          ].join(" ")}
        >
          Raw
        </button>
      </div>

      {viewMode === "raw" ? (
        // RAW VIEW
        <div className="w-full flex flex-col mb-4">
          <h4 className="text-sm font-bold text-[#ffffff4d]">
            Raw connector body
          </h4>

          <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-start rounded-md">
            <TextFieldsIcon className="text-white mt-1" />
            <textarea
              name="rawBody"
              rows={14}
              className="bg-transparent text-white w-full ml-2 outline-none resize-y"
              placeholder="{ ... }"
              value={rawBody}
              onChange={(e) => onRawChange(e.target.value)}
            />
          </div>
        </div>

      ) : (
        // FORM VIEW
        <>
        {/* Connector Type */}
        <div className="w-full flex flex-col mb-4">
        <h4 className="text-sm font-bold text-[#ffffff4d]">Connector Type</h4>

      <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
        <TextFieldsIcon className="text-white" />
        <select
          name="connectorClass"
          className={[
            "bg-transparent w-full ml-2 outline-none",
            formik.values.connectorClass ? "text-white" : "text-[#ffffff4d]"
          ].join(" ")}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.connectorClass}
          disabled={pluginsLoading}
        >
          <option value="" disabled className="text-grey-500">
            {pluginsLoading ? "Loading connector types…" : "Select a connector…"}
          </option>

          {groupedPlugins.source.length > 0 && (
            <optgroup label="Source connectors" className="text-black bg-white">
              {groupedPlugins.source.map((p) => (
                <option key={p.clazz} value={p.clazz} className="text-black bg-white">
                  {shortName(p.clazz)}{p.version ? ` (${p.version})` : ""}
                </option>
              ))}
            </optgroup>
          )}

          {groupedPlugins.sink.length > 0 && (
            <optgroup label="Sink connectors" className="text-black bg-white">
              {groupedPlugins.sink.map((p) => (
                <option key={p.clazz} value={p.clazz} className="text-black bg-white">
                  {shortName(p.clazz)}{p.version ? ` (${p.version})` : ""}
                </option>
              ))}
            </optgroup>
          )}

          {groupedPlugins.other.length > 0 && (
            <optgroup label="Other">
              {groupedPlugins.other.map((p) => (
                <option key={p.clazz} value={p.clazz}>
                  {shortName(p.clazz)}{p.version ? ` (${p.version})` : ""}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {formik.touched.connectorClass && formik.errors.connectorClass && (
        <div className="text-red-500 text-xs mt-1">
          {formik.errors.connectorClass}
        </div>
      )}
        </div>


        {/* Connector Name */}
        <div className="w-full flex flex-col mb-4">
          <h4 className="text-sm font-bold text-[#ffffff4d]">
            Connector Name
          </h4>
          <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
            <TextFieldsIcon className="text-white" />
            <input
              type="text"
              name="name"
              className="bg-transparent text-white w-full ml-2 outline-none"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
            />
          </div>
          {formik.touched.name && formik.errors.name && (
            <div className="text-red-500 text-xs mt-1">
              {formik.errors.name}
            </div>
          )}
        </div>

        {/* ADDED: Required config fields (from configDefs filtered in frontend) */}
          <div className="w-full flex flex-col mb-4">
            <h4 className="text-sm font-bold text-[#ffffff4d]">
              Required configuration
            </h4>

            {!formik.values.connectorClass ? (
              <div className="text-xs text-[#ffffff4d]">
                Select a connector type to load required fields.
              </div>
            ) : configDefsLoading ? (
              <div className="text-xs text-[#ffffff4d]">
                Loading required fields…
              </div>
            ) : requiredDefs.length === 0 ? (
              <div className="text-xs text-[#ffffff4d]">
                No required fields reported by the connector (besides connector.class).
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {requiredDefs
                  // UPDATED: don't render connector.class here; dropdown handles it
                  .filter((d) => d.name !== "connector.class")
                  .map((d) => (
                    <div key={d.name} className="w-full flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#ffffff4d] font-bold">
                          {d.name}
                        </span>
                      </div>

                      <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
                        <TextFieldsIcon className="text-white" />
                        <input
                          type="text"
                          name={`config.${d.name}`}
                          className="bg-transparent text-white w-full ml-2 outline-none"
                          value={formik.values.config[d.name] ?? ""}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder={d.default_value ?? ""}
                        />
                      </div>

                      {d.documentation && (
                        <div className="text-[11px] text-[#ffffff4d] mt-1">
                          {d.documentation}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="w-full flex justify-center mt-8">
            <button
              type="submit"
              className="text-white text-xl sm:w-fit w-full sm:px-10 p-2 px-6 bg-[#15283c] hover:bg-[#ff5722] border-2 border-white rounded-md"
            >
              CREATE
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default CreateExternalSourceForm;
