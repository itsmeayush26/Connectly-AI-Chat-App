import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, updateProfile, axios } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [selectedImg, setSelectedImg] = useState(null); // File object or base64
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(authUser?.profilePic || "");
  const [isSaving, setIsSaving] = useState(false);

  // AI Bio Generator state
  const [bioStyle, setBioStyle] = useState("friendly");
  const [bioKeywords, setBioKeywords] = useState("");
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [generatedBios, setGeneratedBios] = useState([]);
  const [showBioAiPanel, setShowBioAiPanel] = useState(false);

  // AI Avatar Generator state
  const [showAvatarAiPanel, setShowAvatarAiPanel] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [avatarStyle, setAvatarStyle] = useState("3d");
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // Handle local file upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file");
      return;
    }
    setSelectedImg(file);
    setPreviewAvatarUrl(URL.createObjectURL(file));
  };

  // Feature: Generate AI Bios
  const handleGenerateAiBio = async () => {
    try {
      setIsGeneratingBio(true);
      const { data } = await axios.post("/api/ai/generate-bio", {
        fullName: name || authUser?.fullName || "User",
        keywords: bioKeywords,
        style: bioStyle,
      });

      if (data.success && Array.isArray(data.bios) && data.bios.length > 0) {
        setGeneratedBios(data.bios);
        toast.success("✨ 3 AI Bio suggestions ready!");
      } else {
        toast.error(data.message || "Could not generate bio suggestions");
      }
    } catch (err) {
      console.error("AI Bio Error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to generate bio");
    } finally {
      setIsGeneratingBio(false);
    }
  };

  // Feature: Generate AI Avatar
  const handleGenerateAiAvatar = async () => {
    try {
      setIsGeneratingAvatar(true);
      const promptToUse = avatarPrompt.trim() || `${name || "cool"} digital creator portrait`;

      const { data } = await axios.post("/api/ai/generate-avatar", {
        prompt: promptToUse,
        style: avatarStyle,
      });

      if (data.success && data.avatarUrl) {
        setPreviewAvatarUrl(data.avatarUrl);
        setSelectedImg(data.avatarUrl); // Will be saved directly via updateProfile
        toast.success("🎨 AI Avatar generated successfully!");
      } else {
        toast.error(data.message || "Failed to generate avatar");
      }
    } catch (err) {
      console.error("AI Avatar Error:", err);
      toast.error(err.response?.data?.message || err.message || "Avatar generation failed");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // Submit Profile Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setIsSaving(true);

      // If user uploaded a local file
      if (selectedImg instanceof File) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedImg);
        reader.onload = async () => {
          await updateProfile({
            profilePic: reader.result,
            fullName: name.trim(),
            bio: bio.trim(),
          });
          setIsSaving(false);
          navigate("/");
        };
      } else if (typeof selectedImg === "string" && selectedImg.startsWith("http")) {
        // AI generated image URL
        await updateProfile({
          profilePic: selectedImg,
          fullName: name.trim(),
          bio: bio.trim(),
        });
        setIsSaving(false);
        navigate("/");
      } else {
        // No image change
        await updateProfile({
          fullName: name.trim(),
          bio: bio.trim(),
        });
        setIsSaving(false);
        navigate("/");
      }
    } catch (err) {
      setIsSaving(false);
      console.error("Profile save error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#110e1f] text-white flex items-center justify-center p-4 md:p-8 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-4xl bg-stone-900/60 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 flex flex-col gap-6">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xs md:text-sm text-stone-400 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-full hover:bg-stone-800/60"
          >
            <span>←</span> Back to Chats
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-semibold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              Profile & AI Studio
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-medium">
              ✨ AI Powered
            </span>
          </div>
          <span className="text-xs text-stone-500 hidden sm:inline">
            {authUser?.email}
          </span>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Live Profile & Avatar Studio (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center gap-5 bg-black/30 border border-purple-500/20 p-6 rounded-2xl">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300 self-start">
              Live Preview & Avatar
            </h4>

            {/* Avatar Preview with Ring */}
            <div className="relative group">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-xl shadow-purple-950/50">
                <img
                  src={previewAvatarUrl || assets.avatar_icon}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full bg-stone-900"
                />
              </div>

              {/* Online Indicator Dot */}
              <span className="absolute bottom-1 right-2 w-4 h-4 bg-emerald-500 border-2 border-[#110e1f] rounded-full"></span>

              {/* Overlay Upload Button */}
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs gap-1"
              >
                <span>📷</span>
                <span>Change Image</span>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                hidden
              />
            </div>

            {/* Avatar Controls: Upload or AI Generate */}
            <div className="flex items-center gap-2 w-full">
              <label
                htmlFor="avatar-upload"
                className="flex-1 py-1.5 px-3 bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 rounded-xl text-xs text-center cursor-pointer transition text-stone-200"
              >
                📁 Upload Photo
              </label>
              <button
                type="button"
                onClick={() => setShowAvatarAiPanel((prev) => !prev)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1 border ${
                  showAvatarAiPanel
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-purple-950/40 hover:bg-purple-900/60 border-purple-500/40 text-purple-200"
                }`}
              >
                <span>🎨</span> AI Avatar
              </button>
            </div>

            {/* AI Avatar Generator Expandable Box */}
            {showAvatarAiPanel && (
              <div className="w-full bg-[#1e1b2e] border border-purple-500/30 rounded-xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-purple-300 font-medium">
                  <span>🎨 Generate AI Avatar</span>
                  <span className="text-[10px] text-stone-400">Flux/SDXL</span>
                </div>

                {/* Style Selector */}
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  {[
                    { id: "3d", label: "3D Cartoon" },
                    { id: "cyberpunk", label: "Cyberpunk" },
                    { id: "anime", label: "Anime" },
                    { id: "minimal", label: "Minimal" },
                    { id: "professional", label: "Headshot" },
                    { id: "fantasy", label: "Fantasy" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAvatarStyle(s.id)}
                      className={`py-1 px-1.5 rounded-lg border text-center transition cursor-pointer truncate ${
                        avatarStyle === s.id
                          ? "bg-purple-600 border-purple-400 text-white font-medium"
                          : "bg-stone-900/60 border-stone-700/60 text-stone-300 hover:bg-stone-800"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  placeholder="e.g. developer with neon glasses, cat ears..."
                  className="w-full bg-stone-900/80 border border-stone-700/70 rounded-lg p-2 text-xs text-white placeholder-stone-500 outline-none focus:border-purple-500 transition"
                />

                <button
                  type="button"
                  disabled={isGeneratingAvatar}
                  onClick={handleGenerateAiAvatar}
                  className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isGeneratingAvatar ? (
                    <>
                      <svg
                        className="animate-spin h-3.5 w-3.5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                      <span>Painting Avatar...</span>
                    </>
                  ) : (
                    <>
                      <span>✨ Generate Avatar</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Live Profile Card Preview */}
            <div className="w-full bg-stone-900/80 border border-stone-800 rounded-xl p-4 text-center flex flex-col items-center">
              <h3 className="font-semibold text-sm text-white">
                {name || "Your Name"}
              </h3>
              <p className="text-xs text-stone-400 mt-1 line-clamp-3 italic font-light">
                "{bio || "Write your bio or generate one with AI below..."}"
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Active Profile</span>
              </div>
            </div>
          </div>

          {/* Column 2: Edit Form & AI Bio Studio (7 cols) */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 flex flex-col gap-5"
          >
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Display Name <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your full name"
                className="w-full bg-stone-900/80 border border-stone-700/70 rounded-xl p-3 text-sm text-white placeholder-stone-500 outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* AI Bio Generator Section */}
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">✨</span>
                  <span className="text-xs font-semibold text-purple-200">
                    AI Bio Assistant
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBioAiPanel((prev) => !prev)}
                  className="text-xs text-purple-300 hover:text-white underline cursor-pointer"
                >
                  {showBioAiPanel ? "Hide Generator" : "Open Bio Generator"}
                </button>
              </div>

              {/* Bio Generator Controls */}
              {showBioAiPanel && (
                <div className="flex flex-col gap-3 pt-2 border-t border-purple-500/20 animate-in fade-in duration-150">
                  {/* Style Pills */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-stone-400">
                      Choose Bio Style:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "friendly", label: "😊 Friendly" },
                        { id: "professional", label: "💼 Professional" },
                        { id: "witty", label: "⚡ Witty / Clever" },
                        { id: "creative", label: "🎨 Creative" },
                        { id: "gamer", label: "🎮 Gamer" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setBioStyle(s.id)}
                          className={`py-1 px-2.5 rounded-full text-xs transition cursor-pointer border ${
                            bioStyle === s.id
                              ? "bg-purple-600 border-purple-400 text-white font-medium"
                              : "bg-stone-900 border-stone-700 text-stone-300 hover:bg-stone-800"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keywords Input */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-stone-400">
                      Interests / Keywords (optional):
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bioKeywords}
                        onChange={(e) => setBioKeywords(e.target.value)}
                        placeholder="e.g. MERN stack, photography, sci-fi"
                        className="flex-1 bg-stone-900/90 border border-stone-700/80 rounded-xl p-2.5 text-xs text-white placeholder-stone-500 outline-none focus:border-purple-500 transition"
                      />
                      <button
                        type="button"
                        disabled={isGeneratingBio}
                        onClick={handleGenerateAiBio}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                      >
                        {isGeneratingBio ? (
                          <>
                            <svg
                              className="animate-spin h-3.5 w-3.5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                              ></path>
                            </svg>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <span>✨ Generate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Generated Bio Cards */}
                  {generatedBios.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-[11px] text-purple-300 font-medium">
                        Click any suggestion to use it:
                      </span>
                      {generatedBios.map((gBio, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setBio(gBio);
                            toast.success("Applied to your bio!");
                          }}
                          className="p-2.5 bg-black/40 hover:bg-purple-900/40 border border-purple-500/20 hover:border-purple-400/50 rounded-xl text-xs text-stone-200 cursor-pointer transition flex items-center justify-between gap-2 group"
                        >
                          <span className="flex-1">{gBio}</span>
                          <span className="text-[10px] text-purple-400 group-hover:text-purple-200 font-medium whitespace-nowrap">
                            Use ↵
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bio Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-300">
                  About Me / Bio
                </label>
                <span className="text-[11px] text-stone-500">
                  {bio.length}/150 characters
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={180}
                placeholder="Tell the world about yourself or choose a generated bio above..."
                rows={4}
                className="w-full bg-stone-900/80 border border-stone-700/70 rounded-xl p-3 text-sm text-white placeholder-stone-500 outline-none focus:border-purple-500 transition resize-none leading-relaxed"
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="py-3 px-6 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-full text-xs font-medium text-stone-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full text-sm font-semibold transition cursor-pointer shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
