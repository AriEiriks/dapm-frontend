import { useFormik } from "formik";
import * as Yup from "yup";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import CloudIcon from "@mui/icons-material/Cloud";
import TopicIcon from "@mui/icons-material/Topic";
import KeyIcon from "@mui/icons-material/VpnKey";
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
      bucket: "",
      topics: "",
      pollIntervalMs: "1000",
      serviceAccountKeyFile: null as File | null,
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Connector name is required"),
      bucket: Yup.string().required("Bucket name is required"),
      topics: Yup.string().required("Topic(s) are required"),
      pollIntervalMs: Yup.string().required("Poll interval is required"),
      serviceAccountKeyFile: Yup.mixed().required("Service account key (.json) is required"),
    }),
    onSubmit: async (values, { resetForm }) => {
      externalSources.setLoadingExternalSources(true);

      const payload: CreateExternalSourceRequest = {
        name: values.name,
        bucket: values.bucket,
        topics: values.topics,
        pollIntervalMs: values.pollIntervalMs,
        serviceAccountKeyFile: values.serviceAccountKeyFile!,
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
      {/* Name & topics */}
      <div className="flex justify-between flex-wrap">
        <div className="sm:w-[48%] w-full flex flex-col mb-2">
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
            />
          </div>
          {formik.touched.name && formik.errors.name && (
            <div className="text-red-500 text-xs mt-1">
              {formik.errors.name}
            </div>
          )}
        </div>

        <div className="sm:w-[48%] w-full flex flex-col mb-2">
          <h4 className="text-sm font-bold text-[#ffffff4d]">Topics (comma-separated)</h4>
          <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
            <TopicIcon className="text-white" />
            <input
              type="text"
              name="topics"
              className="bg-transparent text-white w-full ml-2 outline-none"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.topics}
            />
          </div>
          {formik.touched.topics && formik.errors.topics && (
            <div className="text-red-500 text-xs mt-1">
              {formik.errors.topics}
            </div>
          )}
        </div>
      </div>

      {/* Bucket & poll interval */}
      <div className="flex justify-between flex-wrap">
        <div className="sm:w-[48%] w-full flex flex-col mb-2">
          <h4 className="text-sm font-bold text-[#ffffff4d]">GCS Bucket</h4>
          <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
            <CloudIcon className="text-white" />
            <input
              type="text"
              name="bucket"
              className="bg-transparent text-white w-full ml-2 outline-none"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.bucket}
            />
          </div>
          {formik.touched.bucket && formik.errors.bucket && (
            <div className="text-red-500 text-xs mt-1">
              {formik.errors.bucket}
            </div>
          )}
        </div>

        <div className="sm:w-[48%] w-full flex flex-col mb-2">
          <h4 className="text-sm font-bold text-[#ffffff4d]">Poll Interval (ms)</h4>
          <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
            <TextFieldsIcon className="text-white" />
            <input
              type="number"
              name="pollIntervalMs"
              className="bg-transparent text-white w-full ml-2 outline-none"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.pollIntervalMs}
            />
          </div>
          {formik.touched.pollIntervalMs && formik.errors.pollIntervalMs && (
            <div className="text-red-500 text-xs mt-1">
              {formik.errors.pollIntervalMs}
            </div>
          )}
        </div>
      </div>

      {/* Service account JSON */}
      <div className="w-full flex flex-col mb-2">
        <h4 className="text-sm font-bold text-[#ffffff4d]">
          Service Account Key (.json)
        </h4>
        <div className="signup-input h-fit relative border-2 p-1 border-white w-full flex items-center rounded-md">
          <KeyIcon className="text-white" />
          <input
            type="file"
            name="serviceAccountKeyFile"
            accept="application/json"
            className="text-white ml-2"
            onChange={(e) =>
              formik.setFieldValue(
                "serviceAccountKeyFile",
                e.currentTarget.files?.[0] || null
              )
            }
          />
        </div>
        {formik.touched.serviceAccountKeyFile &&
          formik.errors.serviceAccountKeyFile && (
            <div className="text-red-500 text-xs mt-1">
              {formik.errors.serviceAccountKeyFile as string}
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
