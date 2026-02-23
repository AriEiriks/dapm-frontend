import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import CloseIcon from "@mui/icons-material/Close";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

import { useExternalSources } from "../context/externalSourcesProvider";
import { ExternalSource } from "../api/externalSources";
import AddExternalSourceButton from "../components/esPage/AddExternalSourceButton";
import CreateExternalSourceForm from "../components/esPage/CreateExternalSourceForm";

export default function ExternalSources() {
  const externalSourcesCtx = useExternalSources();

  const [openEditPopup, setOpenEditPopup] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, string> | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [connectorStates, setConnectorStates] = useState<Record<string, string>>({});

  const [togglingConnector, setTogglingConnector] = useState<Record<string, boolean>>({});

  useEffect(() => {
    externalSourcesCtx.getSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const externalSources = externalSourcesCtx.externalSources ?? [];

  useEffect(() => {
    const run = async () => {
      if (!externalSources.length) {
        setConnectorStates({});
        return;
      }

      try {
        const entries = await Promise.all(
          externalSources.map(async (src) => {
            try {
              const status = await externalSourcesCtx.getExternalSourceStatus(src.name);
              return [src.name, status.state] as const;
            } catch {
              return [src.name, "UNKNOWN"] as const;
            }
          })
        );

        setConnectorStates((prev) => {
          const next = { ...prev };
          for (const [name, state] of entries) next[name] = state;
          return next;
        });
      } catch {
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSources.length]);

  const closeEditPopup = () => {
    setOpenEditPopup(false);
    setEditingName(null);
    setEditingConfig(null);
  };

  function getShortConnectorClass(connectorClass?: string) {
    if (!connectorClass) return "-";

    return connectorClass.split(".").pop() ?? connectorClass;
  }

  function normalizeState(state?: string) {
    return (state ?? "").trim().toUpperCase();
  }

  function statusDotClass(state?: string) {
    const s = normalizeState(state);
    if (s === "RUNNING") return "bg-green-500";
    if (s === "PAUSED") return "bg-yellow-500";
    // FAILED/UNKNOWN -> red
    return "bg-red-500";
  }

  return (
    <div className="w-full h-screen overflow-y-auto pb-10">
      <div className="w-full bg-white md:p-7 p-5 shadow-md flex justify-between">
        <h1 className="text-2xl font-semibold">Connectors</h1>
        <div>
          <AddExternalSourceButton />
        </div>
      </div>

      {externalSourcesCtx.loadingExternalSources && (
        <div className="px-3 mt-5 text-sm text-[#757575]">Loading connectors...</div>
      )}

      {!externalSourcesCtx.loadingExternalSources && externalSources.length > 0 && (
        <div className="px-3 mt-5">
          <div className="w-full text-sm text-[#757575] mb-2">
            These Connectors represent Kafka Connect source/sink connectors currently configured for this
            organization instance.
          </div>

          <div className="w-full py-3 text-2xl text-[#ff5722] font-semibold">
            Available Connectors
          </div>

          <div className="flex flex-col gap-4">
            {externalSources.map((source: ExternalSource) => (
              <div
                key={source.name}
                className="bg-white w-full 2xl:p-6 p-5 min-h-[7rem] flex items-start shadow-md rounded-md"
              >
                <div className="flex-1 2xl:text-lg xl:text-base overflow-hidden">
                  <p className="font-medium truncate" title={source.name}>
                    <span className="text-[#757575] font-normal">Name: </span>

                    <span
                      className={[
                        "inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle",
                        statusDotClass(connectorStates[source.name] ?? source.state),
                      ].join(" ")}
                      title={normalizeState(connectorStates[source.name] ?? source.state) || "UNKNOWN"}
                    />

                    {source.name}
                  </p>
                  <p className="text-sm text-[#757575] truncate" title={source.connectorClass}>
                    <span className="font-medium text-[#757575]">Connector: </span>
                    {getShortConnectorClass(source.connectorClass)}
                  </p>
                  <p className="text-sm text-[#757575] truncate" title={source.type}>
                    <span className="font-medium text-[#757575]">Type: </span>
                    {(source.type ?? "-").toString().toUpperCase()}
                  </p>

                  <p className="text-sm text-[#757575] truncate" title={source.topics || "-"}>
                    <span className="font-medium text-[#757575]">Topic: </span>
                    {source.topics?.trim() ? source.topics : "-"}
                  </p>

                  {/* Usage (in use / not in use + hover) */}
                  {(() => {
                    const usedBy = Array.isArray(source.usedByPipelines)
                      ? source.usedByPipelines
                      : [];

                    const inUse = usedBy.length > 0;

                    return (
                      <div className="text-sm text-[#757575] mt-1">
                        <span className="font-medium">Usage:</span>{" "}

                        <span className="relative inline-flex items-center group">
                          {/* Badge */}
                          <span
                            className={[
                              "text-xs px-2 py-0.5 rounded border",
                              inUse
                                ? "border-green-300 text-green-700 bg-green-50"
                                : "border-gray-300 text-gray-600 bg-gray-50",
                            ].join(" ")}
                          >
                            {inUse ? "In use" : "Not in use"}
                          </span>

                          {/* Hover tooltip */}
                          {inUse && (
                            <div
                              className="
                                pointer-events-none
                                absolute left-0 top-full mt-2
                                hidden group-hover:block
                                z-50
                                min-w-[220px]
                                rounded
                                border border-gray-200
                                bg-white
                                shadow-lg
                                p-2
                                text-xs
                                text-gray-700
                              "
                            >
                              <div className="font-medium mb-1">Used by pipelines</div>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {usedBy.map((pipeline) => (
                                  <li key={pipeline} className="break-words">
                                    {pipeline}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                </div>

                {/* Action buttons */}
                <div className="ml-auto flex flex-col gap-2 items-end">

                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                    title={
                      normalizeState(connectorStates[source.name] ?? source.state) === "PAUSED"
                        ? "Resume"
                        : "Pause"
                    }
                    disabled={!!togglingConnector[source.name]}

                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const currentState = normalizeState(connectorStates[source.name] ?? source.state);
                      const isPaused = currentState === "PAUSED";

                      setTogglingConnector((prev) => ({ ...prev, [source.name]: true }));
                      try {
                        if (isPaused) {
                          await externalSourcesCtx.resumeExternalSource(source.name);
                        } else {
                          await externalSourcesCtx.pauseExternalSource(source.name);
                        }

                        await externalSourcesCtx.getSources();

                        try {
                          const status = await externalSourcesCtx.getExternalSourceStatus(source.name);
                          setConnectorStates((prev) => ({ ...prev, [source.name]: status.state }));
                        } catch {
                          setConnectorStates((prev) => ({ ...prev, [source.name]: "UNKNOWN" }));
                        }
                      } catch {
                        alert("Failed to toggle connector (pause/resume).");
                      } finally {
                        setTogglingConnector((prev) => {
                          const next = { ...prev };
                          delete next[source.name];
                          return next;
                        });
                      }
                    }}

                  >
                    {normalizeState(connectorStates[source.name] ?? source.state) === "PAUSED" ? (
                      <PlayArrowIcon fontSize="small" />
                    ) : (
                      <PauseIcon fontSize="small" />
                    )}
                  </button>

                  <button
                    className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                    disabled={loadingEdit}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      setLoadingEdit(true);
                      try {
                        const cfg = await externalSourcesCtx.getExternalSourceConfig(source.name);
                        setEditingName(source.name);
                        setEditingConfig(cfg);
                        setOpenEditPopup(true);
                      } catch (err) {
                        alert("Failed to load connector config for edit.");
                      } finally {
                        setLoadingEdit(false);
                      }
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    disabled={externalSourcesCtx.deletingExternalSource}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const ok = window.confirm(`Delete connector "${source.name}"?`);
                      if (!ok) return;

                      const res = await externalSourcesCtx.deleteExternalSourceByName(source.name);
                      if (!res.success) {
                        alert(res.message);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!externalSourcesCtx.loadingExternalSources && externalSources.length === 0 && (
        <div className="px-3 mt-5 text-sm text-[#757575]">No connector found.</div>
      )}

      <Dialog open={openEditPopup} onClose={closeEditPopup} className="relative z-40">
        <div className="fixed inset-0 flex w-screen items-center justify-center sm:p-4 backdrop-blur-md">
          <DialogPanel
            className="
              relative
              w-full max-w-4xl
              max-h-[90vh] overflow-y-auto
              space-y-4 border bg-[#15283c]
              p-6 sm:p-12
              rounded sm:border-solid border-white border-none"
          >
            <CloseIcon
              onClick={closeEditPopup}
              className="cursor-pointer absolute text-white right-5 top-5"
            />

            <DialogTitle className="font-bold text-white sm:text-3xl text-xl text-center">
              Edit External Source Connector
            </DialogTitle>

            {editingName && editingConfig && (
              <CreateExternalSourceForm
                setOpenExternalSourcePopup={(v) => {
                  if (!v) closeEditPopup();
                  else setOpenEditPopup(true);
                }}
                mode="edit"
                editingConnectorName={editingName}
                initialConfig={editingConfig}
              />
            )}

            {externalSourcesCtx.loadingExternalSources && (
              <div className="z-50 flex justify-center items-center absolute top-0 left-0 h-full w-full backdrop-blur-sm px-12 py-8 sm:border-6 border-white sm:rounded-xl">
                <div className="loader"></div>
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
