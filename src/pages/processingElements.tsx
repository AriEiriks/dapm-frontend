
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
import { ProcessingElement } from "../api/processingElements";
import { useAuth } from "../auth/authProvider";
import { useOrg } from "../context/orgsProvider";

export default function ProcessingElements() {
    const [externalPEs, setExternalPEs] = useState<ProcessingElement[]>([]);
    const pe = usePE();
    const auth = useAuth();
    const org = useOrg();


    useEffect(() => {
        pe.getPes();
        org.getPublishers();

    }, [pe.loadingProcessingElement, auth.userData]);

    useEffect(() => {
        const elements = pe.processingElements ?? [];
        if (elements.length === 0) {
            setExternalPEs([]);
            return;
        }
        console.log("👉 Processing elements to find externals:", elements, "for user org:", auth.userData?.organizationName);
        const externals = elements.filter(el => el.ownerOrganization != auth.userData?.organizationName);
        setExternalPEs(externals);
    }, [pe.processingElements, auth.userData]);

    function randomeProfile() {
        const profiles = [pe1, pe2, pe3, pe4, pe5];
        const randomIndex = Math.floor(Math.random() * profiles.length);
        return profiles[randomIndex];
    }

    // check tier if exceeds or equals to required tier
    function checkTier(orgName: string | undefined, requiredTier: string): boolean {
        if (org.publishers === null) return false;
        const orgTier = org?.publishers.find(o => o.name === orgName)?.tier;
        if (!orgTier) return false;
        // Define tier hierarchy
        const tiers = ["free", "basic", "premium"];
        const orgTierIndex = orgTier ? tiers.indexOf(orgTier.toLowerCase()) : -1;
        const requiredTierIndex = tiers.indexOf(requiredTier.toLowerCase());
        return orgTierIndex >= requiredTierIndex;
    }

    return (
        // lg:mt-[5%] sm:mt-[10%] mt-[12%]
        <div className="w-full h-screen overflow-y-auto pb-10 ">
            <div className="w-full bg-white md:p-7 p-5 shadow-md  flex justify-between">
                <h1 className="text-2xl font-semibold">Processing Elements</h1>
                {
                    <div className=""><AddPeButton /></div>
                }
            </div>
            {pe.processingElements && pe.processingElements.length > 0 && (
                <div className="px-3 mt-5">
                    <div className="w-full text-sm text-[#757575] mb-2">
                        Access to Processing Elements depends on your subscription tier.
                        You can only use external elements if your tier in the provider organization meets or exceeds the required level.
                    </div>

                    

                    <div className="w-full py-3 text-2xl text-[#ff5722] font-semibold">
                        Your Organization's Processing Elements
                    </div>

                    <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1   gap-6">
                        {pe.processingElements.filter((processingElement) => processingElement.ownerOrganization === auth.userData?.organizationName).map((processingElement) => (
                            <div
                                key={processingElement.templateId}
                                className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md"
                            >
                                <img
                                    className="2xl:w-22 2xl:h-22 lg:w-20 lg:h-20 md:w-14 md:h-14 "
                                    src={randomeProfile()}
                                />
                                <div className="2xl:text-lg xl:text-base 2xl:ml-2 ml-1 overflow-hidden">
                                    <p 
                                    // show tooltip on hover with full name
                                    title={processingElement.templateId}
                                    className="font-medium truncate">
                                        {processingElement.templateId[0].toUpperCase()}{processingElement.templateId.slice(1)}
                                    </p>
                                    <p className="text-sm text-[#757575]">{processingElement.tier}</p>
                                    <p className="text-sm text-[#757575]">{processingElement.ownerOrganization}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {externalPEs.length > 0 && (
                        <>
                            <div className="w-full py-3 text-2xl text-[#ff5722] font-semibold mt-2">
                                External Processing Elements <span className="text-sm text-black ml-2">(from other organizations)</span>
                            </div>

                            <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1   gap-6">
                                {pe.processingElements.filter((processingElement) => processingElement.ownerOrganization !== auth.userData?.organizationName).map((processingElement) => (
                                    <div
                                        key={processingElement.templateId}
                                        className="bg-white 2xl:p-5 p-3 h-40 flex items-center shadow-md rounded-md relative"
                                    >
                                        {!checkTier(processingElement.ownerOrganization, processingElement.tier) && (
                                            <div
                                                // on hover show tooltip
                                                title={`Your subscription tier does not allow access to this element. Upgrade your tier in ${processingElement.ownerOrganization}.`}
                                                className="absolute top-[5%] right-[5%] text-red-600 text-2xl font-extrabold cursor-pointer">!</div>
                                        )}
                                        <img
                                            className="2xl:w-22 2xl:h-22 md:w-14 md:h-14 "
                                            src={randomeProfile()}
                                        />
                                        <div className="2xl:text- xl:text-lg 2xl:ml-2 ml-1">
                                            <p className="font-medium">
                                                {processingElement.templateId[0].toUpperCase()}{processingElement.templateId.slice(1)}
                                            </p>
                                            <p className="text-sm text-[#757575]">{processingElement.tier}</p>
                                            <p className="text-sm text-[#757575]">{processingElement.ownerOrganization}</p>
                                        </div>
                                        
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>


            )}
        </div>
    )
}
