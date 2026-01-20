import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import CloseIcon from "@mui/icons-material/Close";

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

  useEffect(() => {
    externalSourcesCtx.getSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const externalSources = externalSourcesCtx.externalSources ?? [];

  const closeEditPopup = () => {
    setOpenEditPopup(false);
    setEditingName(null);
    setEditingConfig(null);
  };

  function getShortConnectorClass(connectorClass?: string) {
  if (!connectorClass) return "-";

  // Only the name after the part after the last dot
  return connectorClass.split(".").pop() ?? connectorClass;
}

  return (
    <div className="w-full h-screen overflow-y-auto pb-10">
      <div className="w-full bg-white md:p-7 p-5 shadow-md flex justify-between">
        <h1 className="text-2xl font-semibold">External Sources</h1>
        <div>
          <AddExternalSourceButton />
        </div>
      </div>

      {externalSourcesCtx.loadingExternalSources && (
        <div className="px-3 mt-5 text-sm text-[#757575]">Loading external sources...</div>
      )}

      {!externalSourcesCtx.loadingExternalSources && externalSources.length > 0 && (
        <div className="px-3 mt-5">
          <div className="w-full text-sm text-[#757575] mb-2">
            These external sources represent Kafka Connect source connectors currently configured for this
            organization instance.
          </div>

          <div className="w-full py-3 text-2xl text-[#ff5722] font-semibold">
            Available External Sources
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
                    {source.name}
                  </p>
                  <p className="text-sm text-[#757575] truncate" title={source.connectorClass}>
                    <span className="font-medium text-[#757575]">Connector: </span>
                    {getShortConnectorClass(source.connectorClass)}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="ml-auto flex flex-col gap-2 items-end">
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
        <div className="px-3 mt-5 text-sm text-[#757575]">No external sources found.</div>
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
