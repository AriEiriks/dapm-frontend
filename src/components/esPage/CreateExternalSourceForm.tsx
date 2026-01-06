import { useFormik } from "formik";
import * as Yup from "yup";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import { useExternalSources } from "../../context/externalSourcesProvider";
import { CreateExternalSourceRequest } from "../../api/externalSources";
import { useEffect, useMemo, useState } from "react";
import { ConnectorPlugin } from "../../api/externalSources";

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
  const [rawBody, setRawBody] = useState<string>("");

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

  const formik = useFormik({
    initialValues: {
      name: "",
      kcql: "",
      connectorClass: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Connector name is required"),
      kcql: Yup.string().required("KCQL is required"),
      connectorClass: Yup.string().required("Connector type is required"),
    }),
    onSubmit: async (values, { resetForm }) => {
      externalSources.setLoadingExternalSources(true);

      const payload: CreateExternalSourceRequest = {
        name: values.name,
        config: {
          // Only the KCQL comes from the user for now.
          // Backend, for now, handles connector.class, auth, project id, etc.
          "connect.gcpstorage.kcql": values.kcql,

          "connector.class": values.connectorClass,
        },
      };

      const result = await externalSources.addExternalSource(payload);

      if (result.success) {
        setOpenExternalSourcePopup(false);
        resetForm();
      } else {
        alert("Create external source failed: " + result.message);
      }

      externalSources.setLoadingExternalSources(false);
    },
  });

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
              onChange={(e) => setRawBody(e.target.value)}
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

        {/* KCQL */}
        <div className="w-full flex flex-col mb-4">
          <h4 className="text-sm font-bold text-[#ffffff4d]">
            KCQL Statement
          </h4>
          <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-start rounded-md">
            <TextFieldsIcon className="text-white mt-1" />
            <textarea
              name="kcql"
              rows={4}
              className="bg-transparent text-white w-full ml-2 outline-none resize-y"
              placeholder="INSERT INTO dsb-topic SELECT * FROM dapm-streams-data:dsb/Lokalbane_940R/2025/11/05 STOREAS `json`;"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.kcql}
            />
          </div>
          {formik.touched.kcql && formik.errors.kcql && (
            <div className="text-red-500 text-xs mt-1">
              {formik.errors.kcql}
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
