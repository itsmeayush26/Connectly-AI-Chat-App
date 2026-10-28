import React, { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { logout, onlineUsers } = useContext(AuthContext);
  const [msgImages, setMsgImages] = useState([]);

  // Extract images from conversation
  useEffect(() => {
    setMsgImages(messages.filter((msg) => msg.image).map((msg) => msg.image));
  }, [messages, selectedUser]);

  return (
    selectedUser && (
      <div
        className={`bg-[#8185B2]/10 text-white w-full relative overflow-y-auto flex flex-col justify-between p-4 ${
          selectedUser ? "max-md:hidden" : ""
        }`}
      >
        <div className="flex flex-col">
          {/* User Profile Header */}
          <div className="pt-8 flex flex-col items-center gap-2 text-xs font-light mx-auto text-center">
            {selectedUser.isAiBot ? (
              <div className="w-20 h-20 aspect-square rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-xl text-3xl">
                🤖
              </div>
            ) : (
              <img
                src={selectedUser?.profilePic || assets.avatar_icon}
                alt=""
                className="w-20 aspect-square rounded-full object-cover border border-purple-500/30"
              />
            )}

            <h1 className="text-xl font-medium flex items-center gap-2 mt-1">
              {selectedUser.fullName}
              {selectedUser.isAiBot ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm"></span>
              ) : onlineUsers.includes(selectedUser._id) ? (
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              ) : null}
            </h1>
            <p className="px-6 text-stone-300 text-xs">
              {selectedUser.bio || "Hey there! I am using Chat App."}
            </p>
          </div>

          <hr className="border-stone-700/60 my-5" />

          {/* Media Section */}
          <div className="px-1 text-xs">
            <p className="font-medium text-stone-300 mb-3">
              Shared Media ({msgImages.length})
            </p>
            {msgImages.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto grid grid-cols-2 gap-2">
                {msgImages.map((url, index) => (
                  <div
                    key={index}
                    onClick={() => window.open(url)}
                    className="cursor-pointer rounded-lg overflow-hidden border border-stone-700/60 aspect-video hover:opacity-90 transition shadow-sm"
                  >
                    <img src={url} alt="Media" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-[11px]">No images shared yet</p>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-6 pb-2 flex justify-center">
          <button
            onClick={logout}
            className="w-full max-w-[200px] bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-medium py-2.5 px-6 rounded-full cursor-pointer transition shadow-md"
          >
            Logout
          </button>
        </div>
      </div>
    )
  );
};

export default RightSidebar;
