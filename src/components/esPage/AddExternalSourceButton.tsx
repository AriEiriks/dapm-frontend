import { useState } from "react";
import ExternalSourcePopup from "./ExternalSourcePopup";

export default function AddExternalSourceButton() {
    const [openExternalSourcePopup, setOpenExternalSourcePopup] = useState(false);

    return (
        <>
            <button onClick={()=>{setOpenExternalSourcePopup(true)}} className="bg-[#ff5722] text-white px-4 py-1 rounded hover:bg-[#e64a19] transition duration-300 ease-in-out">Add External Source</button>
            <ExternalSourcePopup openExternalSourcePopup={openExternalSourcePopup} setOpenExternalSourcePopup={setOpenExternalSourcePopup}/>
        </>
    )
}