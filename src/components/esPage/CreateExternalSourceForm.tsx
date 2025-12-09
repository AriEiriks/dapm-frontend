import { useFormik } from "formik";
import * as Yup from "yup";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import { useExternalSources } from "../../context/externalSourcesProvider";
import { CreateExternalSourceRequest } from "../../api/externalSources";

interface CreateExternalSourceFormProps {
  setOpenExternalSourcePopup: (value: boolean) => void;
}

const CreateExternalSourceForm: React.FC<CreateExternalSourceFormProps> = ({
  setOpenExternalSourcePopup,
}) => {
  const externalSources = useExternalSources();

  const formik = useFormik({
    initialValues: {
      name: "",
      kcql: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Connector name is required"),
      kcql: Yup.string().required("KCQL is required"),
    }),
    onSubmit: async (values, { resetForm }) => {
      externalSources.setLoadingExternalSources(true);

      const payload: CreateExternalSourceRequest = {
        name: values.name,
        config: {
          // Only the KCQL comes from the user for now.
          // Backend, for now, handles connector.class, auth, project id, etc.
          "connect.gcpstorage.kcql": values.kcql,
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
    </form>
  );
};

export default CreateExternalSourceForm;
