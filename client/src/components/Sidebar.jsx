import React from "react";
import { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  } = useContext(ChatContext);

  const { logout, onlineUsers } = useContext(AuthContext);

  const [input, setInput] = useState("");

  const navigate = useNavigate();

  const filteredUsers = input
    ? users.filter((user) =>
      user.fullName.toLowerCase().includes(input.toLowerCase())
    )
    : users;

  useEffect(() => {
    getUsers();
  }, [onlineUsers]);

  const selectAiBot = () => {
    setSelectedUser({
      _id: "ai-assistant-bot",
      fullName: "Connectly AI",
      profilePic: null,
      isAiBot: true,
      bio: "Your intelligent personal assistant powered by Google Gemini.",
    });
  };

  return (
    <div
      className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-auto text-white ${selectedUser ? "max-md:hidden" : ""
        }`}
    >
      {/* Top Logo and Menu */}
      <div className="pb-4">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-40" />
          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="menu"
              className="w-5 cursor-pointer"
            />
            <div className="absolute top-full right-0 z-20 w-32 p-4 rounded-xl bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block shadow-xl">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm hover:text-purple-300 transition"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p
                onClick={logout}
                className="cursor-pointer text-sm text-red-400 hover:text-red-300 transition"
              >
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#282142] rounded-full flex items-center gap-2 py-2.5 px-4 mt-4 border border-stone-700/50">
          <img src={assets.search_icon} alt="search" className="w-3 opacity-70" />
          <input
            onChange={(e) => setInput(e.target.value)}
            type="text"
            className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
            placeholder="Search User..."
          />
        </div>
      </div>

      {/* Pinned AI Bot Contact */}
      <div
        onClick={selectAiBot}
        className={`relative flex items-center gap-3 p-2.5 pl-3 rounded-xl cursor-pointer transition mb-3 border ${selectedUser?._id === "ai-assistant-bot"
          ? "bg-gradient-to-r from-purple-900/70 to-indigo-900/70 shadow-lg border-purple-400/70"
          : "bg-purple-950/30 hover:bg-purple-900/40 border-purple-500/30"
          }`}
      >
        <div className="relative flex-shrink-0">
          <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md text-base">
            🤖
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1e1b2e]"></span>
        </div>
        <div className="flex flex-col leading-tight flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm text-purple-200">Connectly AI</p>
            <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full font-semibold border border-purple-500/30">
              BOT
            </span>
          </div>
          <span className="text-emerald-400 text-xs">Always Active • Gemini</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 py-1 mb-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
        <span>Chats</span>
        <div className="h-px bg-stone-700/50 flex-1"></div>
      </div>

      {/* User List */}
      <div className="flex flex-col gap-1">
        {filteredUsers.map((user, index) => (
          <div
            key={index}
            onClick={() => {
              setSelectedUser(user);
              setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));
            }}
            className={`relative flex items-center gap-3 p-2 pl-3 rounded-xl cursor-pointer max-sm:text-sm transition ${selectedUser?._id === user._id
              ? "bg-[#282142]/80 border border-purple-500/30"
              : "hover:bg-[#282142]/40"
              }`}
          >
            <div className="relative">
              <img
                src={user?.profilePic || assets.avatar_icon}
                alt="avatar"
                className="w-[38px] aspect-square rounded-full object-cover"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1e1b2e]"></span>
              )}
            </div>
            <div className="flex flex-col leading-tight">
              <p className="font-medium text-sm">{user.fullName}</p>
              {onlineUsers.includes(user._id) ? (
                <span className="text-emerald-400 text-xs">Online</span>
              ) : (
                <span className="text-neutral-400 text-xs">Offline</span>
              )}
            </div>
            {unseenMessages[user._id] > 0 && (
              <p className="absolute top-3.5 right-3 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500 text-white font-semibold">
                {unseenMessages[user._id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
