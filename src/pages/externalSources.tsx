import { useEffect } from "react";
import pe1 from "../imgs/pe-profiles/pe-1.png"
import pe2 from "../imgs/pe-profiles/pe-2.png"
import pe3 from "../imgs/pe-profiles/pe-3.png"
import pe4 from "../imgs/pe-profiles/pe-4.png"
import pe5 from "../imgs/pe-profiles/pe-5.png"

import { useExternalSources } from "../context/externalSourcesProvider";
import { ExternalSource } from "../api/externalSources";
import AddExternalSourceButton from "../components/esPage/AddExternalSourceButton";


export default function ExternalSources() {
  const externalSourcesCtx = useExternalSources();

  useEffect(() => {
    externalSourcesCtx.getSources();
  }, []); 

  function randomProfile() {
    const profiles = [pe1, pe2, pe3, pe4, pe5];
    const randomIndex = Math.floor(Math.random() * profiles.length);
    return profiles[randomIndex];
  }

  const externalSources = externalSourcesCtx.externalSources ?? [];

  return (
    <div className="w-full h-screen overflow-y-auto pb-10">
      <div className="w-full bg-white md:p-7 p-5 shadow-md flex justify-between">
        <h1 className="text-2xl font-semibold">External Sources</h1>
        {
          <div className=""><AddExternalSourceButton /></div>
        }
      </div>

      {externalSourcesCtx.loadingExternalSources && (
        <div className="px-3 mt-5 text-sm text-[#757575]">
          Loading external sources...
        </div>
      )}

      {!externalSourcesCtx.loadingExternalSources && externalSources.length > 0 && (
        <div className="px-3 mt-5">
          <div className="w-full text-sm text-[#757575] mb-2">
            These external sources represent Kafka Connect source connectors
            currently configured for this organization instance.
          </div>

          <div className="w-full py-3 text-2xl text-[#ff5722] font-semibold">
            Available External Sources
          </div>

          <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6">
            {externalSources.map((source: ExternalSource) => (
              <div
                key={source.name}
                className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md"
              >
                <img
                  className="2xl:w-22 2xl:h-22 lg:w-20 lg:h-20 md:w-14 md:h-14"
                  src={randomProfile()}
                />
                <div className="2xl:text-lg xl:text-base 2xl:ml-2 ml-1 overflow-hidden">
                  <p
                    className="font-medium truncate"
                    title={source.name}
                  >
                    {source.name}
                  </p>
                  <p
                    className="text-sm text-[#757575] truncate"
                    title={source.connectorClass}
                  >
                    {source.connectorClass}
                  </p>
                  <p
                    className="text-xs text-[#757575] truncate"
                    title={source.topics}
                  >
                    Topics: {source.topics || "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!externalSourcesCtx.loadingExternalSources && externalSources.length === 0 && (
        <div className="px-3 mt-5 text-sm text-[#757575]">
          No external sources found.
        </div>
      )}
    </div>
  );
}
