import { useEffect, useState } from "react";
import { useAuth } from "../auth/authProvider";
import { useOrg } from "../context/orgsProvider";
import orgprofile1 from "../imgs/org-profiles/organization-1.png"
import orgprofile3 from "../imgs/org-profiles/organization-3.png"
import orgprofile4 from "../imgs/org-profiles/organization-4.png"
import orgprofile5 from "../imgs/org-profiles/organization-5.png"
import HandshakeButton from "../components/orgPage/handshakeButton";
import UpgradePopup from "../components/orgPage/upgradePopup";
export default function Partners() {
    const authUser = useAuth();
    const orgData = useOrg();

    const [openUpgradePopup, setOpenUpgradePopup] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<string>("");

    useEffect(() => {
        orgData.getSubscribers();
        orgData.getPublishers();
    }, [orgData.loadingHandshake, orgData.loadingUpgrade]);

    function randomeProfile() {
        const profiles = [orgprofile1, orgprofile3, orgprofile4, orgprofile5];
        const randomIndex = Math.floor(Math.random() * profiles.length);
        return profiles[randomIndex];
    }

    return (
        // lg:mt-[5%] sm:mt-[10%] mt-[12%]
        <div className="w-full h-screen overflow-y-auto pb-10 ">
            <div className="w-full bg-white md:p-7 p-5 shadow-md  flex justify-between">
                <h1 className="text-2xl font-semibold">Partners</h1>
                {
                    authUser.userData?.orgRole == "ADMIN" && <div className=""><HandshakeButton /></div>
                }
            </div>
            {orgData.subscribers && orgData.subscribers.length > 0 && (
                <div className="px-3 mt-5">
                    <div className="w-full py-3 text-2xl text-[#ff5722] font-semibold">
                        Subscribers <span className="text-sm text-black ml-2">(wish to use our processing elements)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {orgData.subscribers.map((org) => (
                            <div
                                key={org.name}
                                className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow"
                            >
                                <img
                                    className="2xl:w-24 2xl:h-24 md:w-16 md:h-16 rounded-full"
                                    src={randomeProfile()}
                                />
                                <div className="2xl:text- xl:text-lg 2xl:ml-2">
                                    <p className="font-medium">
                                        {org.name[0].toUpperCase()}{org.name.slice(1)}
                                    </p>
                                    <p className="text-xs text-[#757575]">Their tier with our org: {org.tier}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


            )}
            {orgData.publishers && orgData.publishers.length > 0 && (
                <div className="px-3 mt-5">
                    <div className="w-full py-3 text-2xl text-[#ff5722] font-semibold">
                        External Processing Elements Owners
                        <span className="text-sm text-black ml-2">
                            (will use their own processing elements)
                        </span>
                    </div>

                    <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1      gap-6">
                        {orgData.publishers.map((org) => (
                            <div
                                key={org.name}
                                className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md"
                            >
                                <img
                                    className="2xl:w-24 2xl:h-24 md:w-16 md:h-16 rounded-full"
                                    src={randomeProfile()}
                                />
                                <div className="2xl:text- xl:text-lg 2xl:ml-2">
                                    <p className="font-medium">
                                        {org.name[0].toUpperCase()}
                                        {org.name.slice(1)}
                                    </p>
                                    <p className="2xl:text-sm text-xs text-[#757575]">Your tier with {org.name}: {org.tier}</p>

                                    <>
                                        <button
                                            onClick={() => {
                                                setSelectedOrg(org.name);
                                                setOpenUpgradePopup(true);
                                            }}
                                            className="text-[#ff5722] text-xs border-2 p-1 mt-1 hover:bg-[#ff5722] hover:text-white border-[#ff5722] rounded"
                                        >
                                            Upgrade Your Tier
                                        </button>
                                    </>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {
                orgData.publishers ? orgData.publishers.length === 0
                    : orgData.subscribers ? orgData.subscribers.length === 0
                        && (
                            <div className="w-full grow flex  md:p-7 p-5 text-2xl text-[#] font-semibold justify-center items-center">No Partner Available</div>
                        ) : null}

            <UpgradePopup openUpgradePopup={openUpgradePopup} setOpenUpgradePopup={setOpenUpgradePopup} orgName={selectedOrg} />

        </div>
    )
}