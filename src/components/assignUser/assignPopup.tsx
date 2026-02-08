import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import CloseIcon from '@mui/icons-material/Close';
import { useFormik } from "formik";
import * as Yup from 'yup';
import PersonIcon from '@mui/icons-material/Person';
import PasswordIcon from '@mui/icons-material/Password';
import { useAuth } from "../../auth/authProvider";
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import { useUser } from "../../context/usersProvides";
import { usePE } from "../../context/processingElementsProvider";
import { useProject } from '../../context/projectProvider';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import userprofile1 from "../../imgs/user-profile1.png"
import userprofile3 from "../../imgs/user-profile3.png"
import userprofile4 from "../../imgs/user-profile4.png"
import userprofile5 from "../../imgs/user-profile5.png"
import userprofile6 from "../../imgs/user-profile6.png"
import { User } from '../../api/userapi';
interface AssignUserPopupProps {
    openAssignUserPopup: boolean;
    setOpenAssignUserPopup: (value: boolean) => void;
}

export default function AssignUserPopup({ openAssignUserPopup, setOpenAssignUserPopup }: { openAssignUserPopup: boolean, setOpenAssignUserPopup: React.Dispatch<React.SetStateAction<boolean>> }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [filteredUsers, setFilteredUsers] = useState<User[] | null>([]);
    const location = useLocation();
    const [pathname, setPathname] = useState(location.pathname);
    const projectName = pathname.split("/")[3];



    const auth = useAuth();
    const proj = useProject();
    const userData = useUser();

    useEffect(() => {
        setPathname(location.pathname);
        console.log(location.pathname);
    }, [location.pathname]);

    useEffect(() => {
        if (projectName) {
            console.log("Project Name:", projectName);
            proj.getProjectByName(projectName);
            proj.getProjectMemberss(projectName);

        }
    }, [projectName]);

    useEffect(() => {
        userData.getUsers();
    }, []);

    useEffect(() => {
        console.log("Current project:", proj.currentProject);
    }, [proj.currentProject]);

    useEffect(() => {
        if (!userData.users) return;

        // usernames that are already assigned
        const assignedUsernames = proj.projectMembers?.map((member) => member.username) || [];

        // filter out assigned users
        let availableUsers = userData.users.filter(
            (user) => !assignedUsernames.includes(user.username)
        );

        // apply search
        if (searchTerm !== "") {
            availableUsers = availableUsers.filter((user) =>
                user.username.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredUsers(availableUsers);
    }, [searchTerm, userData.users, proj.projectMembers]);


    const formik = useFormik({
        initialValues: {
            username: "",
            project: projectName,
            role: "",
        },
        validationSchema: Yup.object({
            username: Yup.string().required("Required"),
            project: Yup.string().required("Required"),
            role: Yup.string().required("Required"),
        }),
        onSubmit: async (values, { resetForm }) => {
            proj.setLoadingCreateProject(true);

            const result = await proj.assignUserRoleProj({
                username: values.username,
                project: values.project,
                role: values.role

            });

            if (result.success) {
                setOpenAssignUserPopup(false);
                resetForm();
            } else {
                alert("Upload failed: " + result.message);
            }

            proj.setLoadingCreateProject(false);
        },
    });
    function randomeProfile() {
        const profiles = [userprofile1, userprofile3, userprofile4, userprofile5, userprofile6];
        const randomIndex = Math.floor(Math.random() * profiles.length);
        return profiles[randomIndex];
    }
    return (
        <Dialog open={openAssignUserPopup} onClose={() => setOpenAssignUserPopup(false)} className="relative z-40 ">
            <div className="fixed inset-0 flex w-screen items-center justify-center sm:p-4 backdrop-blur-md 
            ">
                <DialogPanel className="relative sm:h-[60%] mx-h-[50%]   h-full space-y-4 border  bg-[#15283c] p-12 rounded sm:border-solid border-white border-none    overflow-y-auto  sm:w-[600px] w-full  search-popup">
                    <CloseIcon onClick={() => setOpenAssignUserPopup(false)} className="cursor-pointer absolute text-white right-5 top-5"></CloseIcon>

                    <DialogTitle className="font-bold text-white sm:text-3xl text-xl text-center ">Assign User Role</DialogTitle>
                    <form className="flex  flex-col w-full py-1 signup" onSubmit={formik.handleSubmit}>
                        <div className="mb-4">
                            <div className="relative gow">
                                <input
                                    id="search"
                                    type="text"
                                    placeholder="Search users..."
                                    className="border border-gray-300 rounded-md p-2 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3  xl:grid-cols-4 2xl:gap-6 gap-4">
                            {filteredUsers && filteredUsers.map((user) => (
                                <div key={user.username} onClick={() => { setSelectedUser(user); formik.setFieldValue("username", user.username); }}
                                    className={`bg-white 2xl:p-5 p-3 h-fit flex flex-col items-center shadow-md 
                                rounded-md cursor-pointer hover:scale-105 transition-transform border-2 
                                 hover:border-[#ff5722]  w-full ${selectedUser?.username === user.username ? 'border-[#ff5722]' : 'border-transparent'}`}>
                                    <img className="2xl:w-24 2xl:h-24 md:w-16 md:h-16 rounded-full" src={randomeProfile()} />
                                    <div className="2xl:text- xl:text-lg 2xl:ml-2">
                                        <p className="font-medium">{user.username[0].toUpperCase()}{user.username.slice(1)}</p>
                                    </div>
                                    {selectedUser?.username === user.username && (
                                        <select
                                            className="w-full p-0 select priority-select bg-[#15283c] border-none focus:border-none text-white"
                                            onChange={(e) => formik.setFieldValue("role", e.target.value)}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select roles</option>
                                            {proj.currentProject?.roles?.map((role) => (
                                                <option key={role} value={role}>
                                                    {role}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type='submit' className="bg-[#ff5722] hover:bg-[#e64a19] text-white font-bold py-2 px-4 rounded mt-4 w-full">
                            Assign Role
                        </button>
                    </form>
                    {proj.loadingCreateProject &&
                        <div className="z-50 flex justify-center items-center absolute top-0 left-0 h-full w-full backdrop-blur-sm  px-12 py-8 sm:border-6 border-white sm:rounded-xl">
                            <div className="loader "></div>
                        </div>
                    }
                </DialogPanel>
            </div>

        </Dialog>
    )
}