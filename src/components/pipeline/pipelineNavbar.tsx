import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/authProvider';
import { useProject } from '../../context/projectProvider';
import { usePipeline } from '../../context/pipelineProvider';
import { getValidatedPipeline } from '../../api/pipeline';
import BtnPopup from '../shared/btnPopup';
import Popup from '../shared/popup';
import CheckPipelineConfig from './checkPipelineConfig';
export default function PipelineNavbar() {
    const nav = useNavigate();
    const location = useLocation();
    const [pathname, setPathname] = useState(location.pathname);
    const pipelineName = pathname.split("/")[5];
    const auth = useAuth();
    const { pipelines, validatePipeline, loading, buildPipeline, actionLoading, executePipeline, terminatePipeline, checkConfigStatus } = usePipeline();
    const [errorPopupOpen, setErrorPopupOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [popupOpen, setPopupOpen] = useState(false);
    const [title, setTitle] = useState("");
    const proj = useProject();

    // control graph state here so the right sidebar can update nodes
    const draft = useMemo(() => pipelines.find((p) => p.name === pipelineName), [pipelines, pipelineName]);

    useEffect(() => {
        setPathname(location.pathname);
        console.log(location.pathname);
        console.log(auth.token)
    }, [location.pathname]);
    return (
        <div className="w-full h-[8%] bg-[#214162] flex items-center   justify-between px-4 border-b-2 border-[#ff5722]">
            <div onClick={() => { nav(-1) }} className=" text-white flex cursor-pointer hover:text-white rounded-2xl  items-center w-1/3">
                <ArrowBackIcon className="text-[#ff5722]"></ArrowBackIcon>
            </div>
            <div className='w-1/3 flex justify-center '>
                <h1 className="text-white text-2xl font-semibold">{pipelineName.charAt(0).toUpperCase()}{pipelineName.slice(1)} <span className="text-green-400 font-normal">({draft?.status})</span></h1>
            </div>
            <div className='w-1/3 flex justify-end '>
                {
                    draft && draft.status === "draft" && !actionLoading.validate ? (

                        <button
                            className="bg-green-600 text-white px-4 py-2 rounded"
                            disabled={
                                proj.projectRolePermActions?.some(
                                    (perm) => perm.action === "VALIDATE_PIPELINE"
                                ) ? false : true
                            }
                            onClick={async () => {
                                if (!draft) return;

                                const orgDomainName = localStorage.getItem("domain") || "";
                                const result = await validatePipeline(orgDomainName, draft);
                                console.log("✅ Validation result:", result);
                                if (result.success) {
                                    // setOpenAssignUserPopup(false);
                                    // resetForm();
                                } else {
                                    setTitle("Validation Error");
                                    setErrorMessage(result.message || "Unknown error");
                                    setErrorPopupOpen(true);
                                }
                            }}
                        >
                            Validate
                        </button>
                    ) : draft && draft.status === "draft" && actionLoading.validate ? (
                        <button
                            className="bg-gray-500 text-white px-4 py-2 rounded cursor-not-allowed"
                            disabled
                        >
                            Validating...
                        </button>
                    )



                        : draft ? draft.status === "validated" ? (
                            <button
                                className="bg-green-600 text-white px-4 py-2 rounded"
                                onClick={async () => {
                                    if (!draft) return;
                                    const orgDomainName = localStorage.getItem("domain") || "8081";

                                    const result = await checkConfigStatus(orgDomainName, draft.name);

                                    if (result?.missingPermissions?.length > 0) {
                                        setPopupOpen(true); // show the popup with missing perms
                                    } else {
                                        // no popup needed; pipelineProvider already promoted it to "configured"
                                        setPopupOpen(false);
                                    }
                                }}
                            >
                                Check Missing Permissions
                            </button>
                        ) : draft.status === "configured" && !actionLoading.build ? (
                            <button
                                hidden={
                                    proj.projectRolePermActions?.some(
                                        (perm) => perm.action === "BUILD_PIPELINE"
                                    ) ? false : true
                                }
                                className="bg-green-600 text-white px-4 py-2 rounded"
                                onClick={async () => {
                                    if (!draft) return;

                                    const orgDomainName = localStorage.getItem("domain") || "";
                                    const result = await buildPipeline(orgDomainName, draft);
                                    console.log("✅ Build result:", result);
                                    if (result.success) {
                                        // setOpenAssignUserPopup(false);
                                        // resetForm();
                                    } else {
                                        setTitle("Build Error");
                                        setErrorMessage(result.message || "Unknown error");
                                        setErrorPopupOpen(true);
                                    }
                                }}
                            >
                                Build
                            </button>
                        ) : draft.status === "configured" && actionLoading.build ? (
                            <button
                                className="bg-gray-500 text-white px-4 py-2 rounded cursor-not-allowed"
                                disabled
                            >
                                Building...
                            </button>
                        ) : draft.status === "built" && !actionLoading.execute ? (
                            <button
                                hidden={
                                    proj.projectRolePermActions?.some(
                                        (perm) => perm.action === "EXECUTE_PIPELINE"
                                    ) ? false : true
                                }
                                className="bg-green-600 text-white px-4 py-2 rounded"
                                onClick={async () => {
                                    if (!draft) return;

                                    const orgDomainName = localStorage.getItem("domain") || "";
                                    const result = await executePipeline(orgDomainName, draft);
                                    if (result.success) {
                                        // setOpenAssignUserPopup(false);
                                        // resetForm();
                                    } else {
                                        setTitle("Execution Error");
                                        setErrorMessage(result.message || "Unknown error");
                                        setErrorPopupOpen(true);
                                    }
                                }}
                            >
                                Execute
                            </button>
                        ) : draft.status === "built" && actionLoading.execute ? (
                            <button
                                className="bg-gray-500 text-white px-4 py-2 rounded cursor-not-allowed"
                                disabled
                            >
                                Executing...
                            </button>
                        ) : draft.status === "executing" && !actionLoading.terminate ? (
                            <button
                                hidden={
                                    proj.projectRolePermActions?.some(
                                        (perm) => perm.action === "TERMINATE_PIPELINE"
                                    ) ? false : true
                                }
                                className="bg-red-600 text-white px-4 py-2 rounded"
                                onClick={async () => {
                                    if (!draft) return;
                                    const orgDomainName = localStorage.getItem("domain") || "";
                                    const result = await terminatePipeline(orgDomainName, draft);
                                    if (result.success) {
                                        // setOpenAssignUserPopup(false);
                                        // resetForm();
                                    } else {
                                        setTitle("Termination Error");
                                        setErrorMessage(result.message || "Unknown error");
                                        setErrorPopupOpen(true);
                                    }
                                }}
                            >
                                Terminate
                            </button>
                        ) : draft.status === "executing" && actionLoading.terminate ? (
                            <button
                                className="bg-gray-500 text-white px-4 py-2 rounded cursor-not-allowed"
                                disabled
                            >
                                Terminating...
                            </button>
                        )

                            : draft.status === "terminated" ? (
                                <span className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Status: {draft?.status}</span>
                            ) : null
                            : null
                }
            </div>
            <Popup
                title={title}
                openPopup={errorPopupOpen}
                setOpenPopup={setErrorPopupOpen}
                dialogClassName="2xl:w-fit sm:w-fit w-fit"
            >
                <div className="text-red-600">{errorMessage}</div>
            </Popup>
            <Popup
                title={"Missing Permissions"}
                openPopup={popupOpen}
                setOpenPopup={setPopupOpen}
                dialogClassName="2xl:w-fit sm:w-fit w-fit"
            >
                <CheckPipelineConfig pipelineName={draft?.name}></CheckPipelineConfig>
            </Popup>
        </div>
    )
}