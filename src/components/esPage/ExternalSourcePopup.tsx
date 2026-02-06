import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import CloseIcon from "@mui/icons-material/Close";
import CreateExternalSourceForm from "./CreateExternalSourceForm";
import { useExternalSources } from '../../context/externalSourcesProvider';

interface ExternalSourcePopupProps {
  openExternalSourcePopup: boolean;
  setOpenExternalSourcePopup: (value: boolean) => void;
}

const ExternalSourcePopup: React.FC<ExternalSourcePopupProps> = ({
  openExternalSourcePopup,
  setOpenExternalSourcePopup,
}) => {
  const externalSources = useExternalSources();

  return (
    <Dialog
      open={openExternalSourcePopup}
      onClose={() => setOpenExternalSourcePopup(false)}
      className="relative z-40"
    >
      <div className="fixed inset-0 flex w-screen items-center justify-center sm:p-4 backdrop-blur-md">
        <DialogPanel
          className="
            relative
            w-full max-w-4xl
            max-h-[90vh] overflow-y-auto
            space-y-4
            border bg-[#15283c]
            p-6 sm:p-12
            rounded
            sm:border-solid border-white border-none
          "
        >
          <CloseIcon
            onClick={() => setOpenExternalSourcePopup(false)}
            className="cursor-pointer absolute text-white right-5 top-5"
          />

          <DialogTitle className="font-bold text-white sm:text-3xl text-xl text-center">
            Create Connector
          </DialogTitle>

          <CreateExternalSourceForm setOpenExternalSourcePopup={setOpenExternalSourcePopup} />

          {externalSources.loadingExternalSources && (
            <div className="z-50 flex justify-center items-center absolute top-0 left-0 h-full w-full backdrop-blur-sm px-12 py-8 sm:border-6 border-white sm:rounded-xl">
              <div className="loader"></div>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default ExternalSourcePopup;
