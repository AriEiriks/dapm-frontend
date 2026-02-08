
import { use, useEffect, useState } from "react";
import AddPeButton from "../components/pePage/addPeButton";
import { usePE } from "../context/processingElementsProvider";
import orgprofile1 from "../imgs/org-profiles/organization-1.png"
import orgprofile3 from "../imgs/org-profiles/organization-3.png"
import orgprofile4 from "../imgs/org-profiles/organization-4.png"
import orgprofile5 from "../imgs/org-profiles/organization-5.png"
import pe1 from "../imgs/pe-profiles/pe-1.png"
import pe2 from "../imgs/pe-profiles/pe-2.png"
import pe3 from "../imgs/pe-profiles/pe-3.png"
import pe4 from "../imgs/pe-profiles/pe-4.png"
import pe5 from "../imgs/pe-profiles/pe-5.png"
import { useAuth } from "../auth/authProvider";
import { Project } from "../api/project";
import { useProject } from "../context/projectProvider";
import CreateProjBtn from "../components/projects/createProjBtn";
import { Link } from "react-router-dom";

export default function Projects() {
    // const [projects, setProjects] = useState<any[]>([]);
    const auth = useAuth();
    const proj = useProject();


    useEffect(() => {
        if (auth.userData?.orgRole === "ADMIN") {
            proj.getProjects();
            console.log("admin projects");
        } else {
            proj.getMyProjectss();
        }
    }, [proj.loadingCreateProject, auth.userData]);

    useEffect(() => {
        console.log("projects updated:", proj.projects);
    }, [proj.projects]);

    


    function randomeProfile() {
        const profiles = [pe1, pe2, pe3, pe4, pe5];
        const randomIndex = Math.floor(Math.random() * profiles.length);
        return profiles[randomIndex];
    }

    return (
        // lg:mt-[5%] sm:mt-[10%] mt-[12%]
        <div className="w-full h-screen overflow-y-auto pb-10 ">
            <div className="w-full bg-white md:p-7 p-5 shadow-md  flex justify-between">
                <h1 className="text-2xl font-semibold">Projects</h1>
                {auth.userData?.orgRole === "ADMIN" &&
                    <div className=""><CreateProjBtn /></div>
                }
            </div>
            {auth.userData?.orgRole == "ADMIN" && proj.projects && proj.projects.length > 0 && (
                <div className="px-3 mt-5">
                    {/* <div className="w-full md:p-7 p-5 text-2xl text-[#ff5722] font-semibold">
                        Subscribers <span className="text-sm text-black ml-2">(wish to use our processing elements)</span>
                    </div> */}

                    <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1   gap-6">
                        {proj.projects.map((project) => (
                            <Link key={project.name} to={`/dashboard/projects/${project.name}`}>
                                <div
                                    key={project.name}
                                    className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md"
                                >
                                    <img
                                        className="2xl:w-22 2xl:h-22 md:w-14 md:h-14 "
                                        src={randomeProfile()}
                                    />
                                    <div className="2xl:text- xl:text-lg 2xl:ml-2 ml-1">
                                        <p className="font-medium">
                                            {project.name[0].toUpperCase()}{project.name.slice(1)}
                                        </p>
                                        {/* <p className="text-sm text-[#757575]">{processingElement.tier}</p>
                                    <p className="text-sm text-[#757575]">{processingElement.ownerOrganization}</p> */}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>


            ) }
            {auth.userData?.orgRole == "MEMBER" && proj.myProjects && proj.myProjects.length > 0 && (
                <div className="px-3 mt-5">
                    {/* <div className="w-full md:p-7 p-5 text-2xl text-[#ff5722] font-semibold">
                        Subscribers <span className="text-sm text-black ml-2">(wish to use our processing elements)</span>
                    </div> */}

                    <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1   gap-6">
                        {proj.myProjects.map((project) => (
                            <Link key={project.name} to={`/dashboard/projects/${project.name}`}>
                                <div
                                    key={project.name}
                                    className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md"
                                >
                                    <img
                                        className="2xl:w-22 2xl:h-22 md:w-14 md:h-14 "
                                        src={randomeProfile()}
                                    />
                                    <div className="2xl:text- xl:text-lg 2xl:ml-2 ml-1">
                                        <p className="font-medium">
                                            {project.name[0].toUpperCase()}{project.name.slice(1)}
                                        </p>
                                        {/* <p className="text-sm text-[#757575]">{processingElement.tier}</p>
                                    <p className="text-sm text-[#757575]">{processingElement.ownerOrganization}</p> */}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            {((auth.userData?.orgRole == "ADMIN" && (!proj.projects || proj.projects.length === 0)) ||
                (auth.userData?.orgRole == "MEMBER" && (!proj.myProjects || proj.myProjects.length === 0))) && (
                <div className="w-full h-[70vh] flex flex-col justify-center items-center">
                    <p className="text-lg text-gray-500">No projects found</p>
                </div>
            )}
        </div>
    )
}
