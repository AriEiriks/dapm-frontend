import { use, useEffect } from "react";
import { useUser } from "../context/usersProvides";
import Header from "../components/header";
import userprofile1 from "../imgs/user-profile1.png"
import userprofile3 from "../imgs/user-profile3.png"
import userprofile4 from "../imgs/user-profile4.png"
import userprofile5 from "../imgs/user-profile5.png"
import userprofile6 from "../imgs/user-profile6.png"
import { useAuth } from "../auth/authProvider";
import AddMemberButton from "../components/userPageComponents/addMemberButton";

export default function Users() {
    const userData = useUser();
    const authUser = useAuth();


    useEffect(() => {
        if (authUser.userData?.orgRole == "ADMIN") {
            userData.getUsers();
        }
        else if (authUser.userData?.orgRole == "MEMBER") {
            userData.getAdmins();
        }
    }, [userData.loadingRegister, authUser.userData]);

    function randomeProfile() {
        const profiles = [userprofile1, userprofile3, userprofile4, userprofile5, userprofile6];
        const randomIndex = Math.floor(Math.random() * profiles.length);
        return profiles[randomIndex];
    }

    return (
        <div className="w-full h-screen overflow-y-auto pb-10">
            <div className="w-full bg-white md:p-7 p-5 shadow-md  flex justify-between">
                <h1 className="text-2xl font-semibold">Users</h1>
                {
                    authUser.userData?.orgRole == "ADMIN" && <div className=""><AddMemberButton /></div>
                }
            </div>
            <div className=" grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3  xl:grid-cols-4 2xl:gap-6 gap-4  px-3 mt-5">
                {authUser.userData?.orgRole == "ADMIN" && userData.users && userData.users.map((user) => (
                    <div key={user.username} className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md">
                        <img className="2xl:w-24 2xl:h-24 md:w-16 md:h-16 rounded-full" src={randomeProfile()} />
                        <div className="2xl:text- xl:text-lg 2xl:ml-2 overflow-hidden">
                            <p className="font-medium">{user.username[0].toUpperCase()}{user.username.slice(1)}</p>
                            <p 
                            title={user.email}
                            className="font-medium text-gray-500 2xl:text-lg text-sm truncate">{user.email}</p>
                            <p className="font-medium text-[#ff5722]">{user.orgRoleName}</p>
                        </div>
                    </div>
                ))}
                {authUser.userData?.orgRole == "MEMBER" &&userData.admins && userData.admins.map((user) => (
                    <div key={user.username} className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md">
                        <img className="2xl:w-24 2xl:h-24 md:w-16 md:h-16  rounded-full" src={randomeProfile()}></img>
                        <div className="2xl:text- xl:text-lg 2xl:ml-2">
                            <p className="font-medium">{user.username[0].toUpperCase()}{user.username.slice(1)}</p>
                            <p className="font-medium text-gray-500 2xl:text-lg text-sm">{user.email}</p>
                            <p className="font-medium text-[#ff5722] ">{user.orgRoleName}</p>
                        </div>
                    </div>
                ))

                }
            </div>
        </div>
    )
}