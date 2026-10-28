import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    selectedUser,
    setSelectedUser,
    sendMessage,
    getMessages,
    isAiReplying,
  } = useContext(ChatContext);
  const { authUser, onlineUsers, axios } = useContext(AuthContext);

  const scrollEnd = useRef();
  const aiMenuRef = useRef();
  const voiceMenuRef = useRef();

  const [input, setInput] = useState("");
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [lastOriginalText, setLastOriginalText] = useState("");

  // Feature: Smart Quick Replies state
  const [smartReplies, setSmartReplies] = useState([]);

  // Feature 1: Read Aloud (TTS) state
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // Feature 2: Voice Typing (Speech-to-Text) state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Feature 3: Voice Message (Audio Recording) state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // Clean up speech synthesis & recording on unmount or user change
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedUser]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target)) {
        setShowAiMenu(false);
      }
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target)) {
        setShowVoiceMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Smart Replies whenever conversation updates
  useEffect(() => {
    const fetchSmartReplies = async () => {
      if (!selectedUser || selectedUser.isAiBot || messages.length === 0) {
        setSmartReplies([]);
        return;
      }

      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== authUser?._id && lastMsg.text) {
        try {
          const recentMsgs = messages.slice(-4).map((m) => ({
            isMe: m.senderId === authUser?._id,
            text: m.text,
          }));

          const { data } = await axios.post("/api/ai/smart-replies", {
            recentMessages: recentMsgs,
            otherUserName: selectedUser.fullName,
          });

          if (data.success && Array.isArray(data.replies)) {
            setSmartReplies(data.replies);
          }
        } catch (err) {
          console.error("Failed to load smart replies:", err);
        }
      } else {
        setSmartReplies([]);
      }
    };

    fetchSmartReplies();
  }, [messages, selectedUser, authUser]);

  // Handle sending a message or triggering slash commands
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (input.trim() === "") return;

    const trimmed = input.trim();

    // Check for AI Image Generation command (/imagine or /generate or /image)
    if (/^\/(imagine|generate|image)\s+/i.test(trimmed)) {
      const prompt = trimmed.replace(/^\/(imagine|generate|image)\s+/i, "");
      if (!prompt) {
        toast.error("Please provide a prompt! Example: /imagine futuristic city");
        return;
      }

      setInput("");
      setShowAiMenu(false);
      setShowVoiceMenu(false);
      setSmartReplies([]);
      const toastId = toast.loading("🎨 Generating AI image with Flux/Pollinations...");

      try {
        const { data } = await axios.post("/api/ai/generate-image", { prompt });
        if (data.success && data.imageUrl) {
          toast.dismiss(toastId);
          toast.success("✨ Image generated successfully!");
          await sendMessage({ image: data.imageUrl });
        } else {
          toast.dismiss(toastId);
          toast.error(data.message || "Failed to generate image");
        }
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Image generation failed");
        console.error("Image gen error:", err);
      }
      return;
    }

    // Standard message
    setInput("");
    setShowAiMenu(false);
    setShowVoiceMenu(false);
    setLastOriginalText("");
    setSmartReplies([]);
    await sendMessage({ text: trimmed });
  };

  // Quick reply chip clicked
  const handleSelectQuickReply = async (replyText) => {
    setInput("");
    setSmartReplies([]);
    await sendMessage({ text: replyText });
  };

  // Handle sending an image file
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    const reader = new FileReader();

    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Feature: AI Rewrite function
  const handleAiRewrite = async (tone) => {
    if (!input.trim()) {
      toast.error("Please type a message first to rewrite with AI!");
      setShowAiMenu(false);
      return;
    }

    try {
      setIsRewriting(true);
      setShowAiMenu(false);
      setLastOriginalText(input);

      const { data } = await axios.post("/api/ai/rewrite", {
        text: input,
        tone,
      });

      if (data.success && data.rewrittenText) {
        setInput(data.rewrittenText);
        toast.success(`✨ Rewritten in ${tone} tone!`);
      } else {
        toast.error(data.message || "Could not rewrite message");
      }
    } catch (err) {
      console.error("AI rewrite error:", err);
      toast.error(err.response?.data?.message || err.message || "AI Rewrite failed");
    } finally {
      setIsRewriting(false);
    }
  };

  const undoAiRewrite = () => {
    if (lastOriginalText) {
      setInput(lastOriginalText);
      setLastOriginalText("");
      toast("Reverted to original text", { icon: "↩️" });
    }
  };

  // ==========================================
  // FEATURE 1: Read Aloud (Text-to-Speech)
  // ==========================================
  const handleReadAloud = (msgId, text) => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, "Code block omitted.")
      .replace(/`([^`]+)`/g, "$1")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha"))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // ==========================================
  // FEATURE 2: Voice Typing (Speech-to-Text)
  // ==========================================
  const handleToggleVoiceTyping = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice typing is not supported in this browser. Try Chrome or Edge!");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast("🎙️ Listening... Speak now", { icon: "🎙️", duration: 2500 });
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
        if (err.error !== "no-speech") {
          toast.error("Microphone error: " + err.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // ==========================================
  // FEATURE 3: Voice Message (Record & Send)
  // ==========================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone access denied or not available");
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      clearInterval(recordTimerRef.current);
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        await sendMessage({ audio: base64Audio });
        toast.success("🎙️ Voice message sent!");
      };
      reader.readAsDataURL(audioBlob);

      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      clearInterval(recordTimerRef.current);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      setRecordingTime(0);
      toast("Voice message cancelled", { icon: "🗑️" });
    }
  };

  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAiReplying]);

  return selectedUser ? (
    <div className="h-full overflow-hidden relative backdrop-blur-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500/50 flex-shrink-0">
        {selectedUser.isAiBot ? (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md text-base">
            🤖
          </div>
        ) : (
          <img
            src={selectedUser.profilePic || assets.avatar_icon}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
        )}

        <div className="flex-1">
          <p className="text-base font-medium text-white flex items-center gap-2">
            {selectedUser.fullName}
            {selectedUser.isAiBot ? (
              <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/40">
                AI BOT
              </span>
            ) : onlineUsers.includes(selectedUser._id) ? (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            ) : null}
          </p>
          <p className="text-xs text-stone-400">
            {selectedUser.isAiBot
              ? "Always Active • Powered by Gemini"
              : onlineUsers.includes(selectedUser._id)
              ? "Online"
              : "Offline"}
          </p>
        </div>

        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt="Back"
          className="md:hidden max-w-7 cursor-pointer"
        />
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-6 flex flex-col gap-3">
        {messages.map((msg, index) => {
          const isBot = msg.senderId === "ai-assistant-bot";
          const isMe =
            msg.senderId === authUser?._id ||
            (selectedUser.isAiBot && !isBot);

          const msgKey = msg._id || index;
          const isThisSpeaking = speakingMsgId === msgKey;

          return (
            <div
              key={msgKey}
              className={`flex items-end gap-2 group ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              {!isMe && (
                <div className="flex-shrink-0">
                  {isBot ? (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xs">
                      🤖
                    </div>
                  ) : (
                    <img
                      src={selectedUser?.profilePic || assets.avatar_icon}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  )}
                </div>
              )}

              <div className="flex flex-col max-w-[280px] md:max-w-[420px] relative">
                {/* Voice Message Bubble */}
                {msg.audio ? (
                  <VoiceMessagePlayer src={msg.audio} isMe={isMe} />
                ) : msg.image ? (
                  <div className="relative group">
                    <img
                      src={msg.image}
                      alt="Shared media"
                      className="max-w-[240px] md:max-w-[280px] rounded-2xl overflow-hidden border border-stone-700/60 shadow-md cursor-pointer hover:opacity-95 transition"
                      onClick={() => window.open(msg.image)}
                    />
                  </div>
                ) : (
                  /* Text Message Bubble with Read Aloud Button */
                  <div
                    className={`relative p-3 md:text-sm font-light rounded-2xl break-words shadow-sm leading-relaxed whitespace-pre-wrap ${
                      isMe
                        ? "rounded-br-none bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                        : isBot
                        ? "rounded-bl-none bg-purple-950/60 border border-purple-500/30 text-purple-100 font-normal"
                        : "rounded-bl-none bg-stone-800/90 border border-stone-700/60 text-stone-100"
                    }`}
                  >
                    {msg.text}

                    {/* Feature 1: Read Aloud Button on Text Message */}
                    <button
                      type="button"
                      onClick={() => handleReadAloud(msgKey, msg.text)}
                      className={`ml-2 inline-flex items-center align-middle p-1 rounded-full transition cursor-pointer ${
                        isThisSpeaking
                          ? "bg-purple-400 text-purple-950 animate-pulse shadow-md"
                          : "text-stone-400 hover:text-white opacity-40 group-hover:opacity-100"
                      }`}
                      title={isThisSpeaking ? "Stop listening" : "Read aloud (Text-to-speech)"}
                    >
                      {isThisSpeaking ? (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 6h12v12H6z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}

                <span
                  className={`text-[10px] text-stone-400 mt-1 px-1 flex items-center gap-1 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  {formatMessageTime(msg.createdAt)}
                  {msg.audio && <span>• 🎙️ Voice Note</span>}
                </span>
              </div>

              {isMe && (
                <img
                  src={authUser?.profilePic || assets.avatar_icon}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
              )}
            </div>
          );
        })}

        {/* Connectly AI Typing Indicator */}
        {isAiReplying && (
          <div className="flex items-center gap-2 text-xs text-purple-300 animate-pulse bg-purple-950/30 p-2 rounded-xl w-fit border border-purple-500/20">
            <div className="w-5 h-5 rounded-full bg-purple-600/40 flex items-center justify-center text-xs">
              🤖
            </div>
            <span>Connectly AI is crafting a response...</span>
          </div>
        )}

        <div ref={scrollEnd}></div>
      </div>

      {/* Feature: Smart Quick Reply Chips */}
      {smartReplies.length > 0 && !isRecording && (
        <div className="px-4 py-1.5 flex items-center gap-2 overflow-x-auto bg-stone-900/80 border-t border-purple-500/20 backdrop-blur-md">
          <span className="text-[11px] text-purple-300 flex items-center gap-1 font-medium whitespace-nowrap">
            <span>✨</span> Quick Reply:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-1">
            {smartReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSelectQuickReply(reply)}
                className="text-xs bg-purple-900/40 hover:bg-purple-700/60 border border-purple-500/40 hover:border-purple-400 text-purple-100 px-3 py-1 rounded-full whitespace-nowrap transition cursor-pointer shadow-sm active:scale-95"
              >
                {reply}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSmartReplies([])}
            className="text-stone-400 hover:text-white text-xs px-1 cursor-pointer"
            title="Dismiss suggestions"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Input & Voice Recording Area */}
      <div className="p-3 bg-stone-900/70 border-t border-stone-800/80 backdrop-blur-md relative flex-shrink-0">
        {/* Undo Banner if rewritten */}
        {lastOriginalText && (
          <div className="flex items-center justify-between px-3 py-1 mb-2 text-xs bg-violet-900/40 border border-violet-700/50 rounded-lg text-violet-200">
            <span>✨ Message transformed with AI</span>
            <button
              onClick={undoAiRewrite}
              className="hover:underline text-violet-300 font-medium cursor-pointer"
            >
              Undo
            </button>
          </div>
        )}

        {/* Feature: AI Tone & Image Menu */}
        {showAiMenu && (
          <div
            ref={aiMenuRef}
            className="absolute bottom-16 right-14 z-50 bg-[#1e1b2e] border border-purple-500/40 rounded-2xl p-2 shadow-2xl w-60 flex flex-col gap-1 text-sm text-white animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-2 py-1 text-xs font-semibold text-purple-300 border-b border-purple-500/20 flex items-center justify-between">
              <span>✨ AI Smart Tools</span>
              <span className="text-[10px] text-stone-400 font-normal">Gemini & Flux</span>
            </div>
            <button
              type="button"
              onClick={() => handleAiRewrite("professional")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-600/30 flex items-center gap-2 transition cursor-pointer"
            >
              <span>👔</span> Make Professional
            </button>
            <button
              type="button"
              onClick={() => handleAiRewrite("friendly")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-600/30 flex items-center gap-2 transition cursor-pointer"
            >
              <span>😊</span> Friendly & Warm
            </button>
            <button
              type="button"
              onClick={() => handleAiRewrite("concise")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-600/30 flex items-center gap-2 transition cursor-pointer"
            >
              <span>⚡</span> Short & Concise
            </button>
            <button
              type="button"
              onClick={() => handleAiRewrite("grammar")}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-600/30 flex items-center gap-2 transition cursor-pointer"
            >
              <span>✍️</span> Fix Grammar & Typos
            </button>
            <div className="h-px bg-purple-500/20 my-1"></div>
            <button
              type="button"
              onClick={() => {
                if (!input.trim()) {
                  setInput("/imagine futuristic cyberpunk car in rain");
                  toast("Prompt template added! Press Enter to generate image.", { icon: "🎨" });
                } else {
                  setInput(`/imagine ${input.trim()}`);
                  toast("Press Send or Enter to generate!", { icon: "🎨" });
                }
                setShowAiMenu(false);
              }}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-600/30 flex items-center gap-2 transition cursor-pointer text-purple-300 font-medium"
            >
              <span>🎨</span> Generate AI Image (/imagine)
            </button>
          </div>
        )}

        {/* Feature: Unified Voice Options Popup Menu */}
        {showVoiceMenu && (
          <div
            ref={voiceMenuRef}
            className="absolute bottom-16 right-16 z-50 bg-[#1e1b2e] border border-purple-500/40 rounded-2xl p-2 shadow-2xl w-64 flex flex-col gap-1.5 text-sm text-white animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-2.5 py-1 text-xs font-semibold text-purple-300 border-b border-purple-500/20 flex items-center justify-between">
              <span>🎙️ Voice Options</span>
              <span className="text-[10px] text-stone-400 font-normal">Choose mode</span>
            </div>

            {/* Option 1: Voice Typing (Dictate to text) */}
            <button
              type="button"
              onClick={() => {
                setShowVoiceMenu(false);
                handleToggleVoiceTyping();
              }}
              className="text-left p-2 rounded-xl hover:bg-purple-600/30 flex items-start gap-2.5 transition cursor-pointer group"
            >
              <span className="text-base p-1.5 rounded-lg bg-purple-500/20 text-purple-300 group-hover:bg-purple-500/40">
                🗣️
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-xs text-white">Voice Typing</span>
                <span className="text-[11px] text-stone-400">Speak to dictate text in real time</span>
              </div>
            </button>

            {/* Option 2: Record Voice Note */}
            <button
              type="button"
              onClick={() => {
                setShowVoiceMenu(false);
                startRecording();
              }}
              className="text-left p-2 rounded-xl hover:bg-purple-600/30 flex items-start gap-2.5 transition cursor-pointer group"
            >
              <span className="text-base p-1.5 rounded-lg bg-red-500/20 text-red-300 group-hover:bg-red-500/40">
                🎙️
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-xs text-white">Record Voice Note</span>
                <span className="text-[11px] text-stone-400">Record & send an audio message</span>
              </div>
            </button>
          </div>
        )}

        {/* Feature 3: Voice Message Recording Bar */}
        {isRecording ? (
          <div className="flex items-center justify-between bg-stone-800/90 border border-red-500/40 px-4 py-2 rounded-full animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-mono font-medium text-red-400">
                Recording {formatRecordingTime(recordingTime)}
              </span>
              <div className="hidden sm:flex items-center gap-1 text-purple-400 opacity-60">
                <span className="w-1 h-3 bg-purple-400 rounded-full animate-pulse"></span>
                <span className="w-1 h-5 bg-purple-400 rounded-full animate-pulse delay-75"></span>
                <span className="w-1 h-4 bg-purple-400 rounded-full animate-pulse delay-150"></span>
                <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse"></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="py-1 px-3 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-full transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopAndSendRecording}
                className="py-1 px-3.5 text-xs font-semibold bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white rounded-full transition cursor-pointer shadow-md flex items-center gap-1"
              >
                <span>Send</span>
                <span>🚀</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Bar with Unified Mic & Tools */
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-stone-800/90 border border-stone-700/60 px-3 py-1 rounded-full focus-within:border-purple-500/70 transition">
              <input
                onChange={(e) => setInput(e.target.value)}
                value={input}
                type="text"
                placeholder={
                  isListening
                    ? "🎙️ Listening... speak now"
                    : selectedUser.isAiBot
                    ? "Ask Connectly AI anything (code, ideas, questions)..."
                    : "Send a message, dictate, or /imagine..."
                }
                disabled={isRewriting || isAiReplying}
                className="flex-1 text-sm py-2 px-1 border-none outline-none text-white placeholder-gray-400 bg-transparent disabled:opacity-50"
              />

              {/* Single Unified Voice Tools Button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    handleToggleVoiceTyping(); // If actively dictating, clicking mic immediately stops it
                  } else {
                    setShowVoiceMenu((prev) => !prev);
                    setShowAiMenu(false);
                  }
                }}
                title={
                  isListening
                    ? "Stop Voice Typing"
                    : "Voice Options (Dictate or Record Voice Note)"
                }
                className={`p-1.5 rounded-full mr-1 transition flex items-center justify-center cursor-pointer ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : showVoiceMenu
                    ? "bg-purple-600 text-white"
                    : "hover:bg-purple-600/20 text-stone-400 hover:text-purple-300"
                }`}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>

              {/* AI Assistant Menu Button */}
              <button
                type="button"
                title="AI Message & Image Tools"
                onClick={() => {
                  setShowAiMenu((prev) => !prev);
                  setShowVoiceMenu(false);
                }}
                disabled={isRewriting || isAiReplying}
                className={`p-1.5 rounded-full mr-1 transition flex items-center justify-center cursor-pointer ${
                  showAiMenu
                    ? "bg-purple-600 text-white"
                    : "hover:bg-purple-600/20 text-purple-400 hover:text-purple-300"
                }`}
              >
                {isRewriting ? (
                  <svg
                    className="animate-spin h-4 w-4 text-purple-400"
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
                ) : (
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2L13.8 7.2L19 9L13.8 10.8L12 16L10.2 10.8L5 9L10.2 7.2L12 2Z" />
                    <path d="M19 15L19.9 17.6L22.5 18.5L19.9 19.4L19 22L18.1 19.4L15.5 18.5L18.1 17.6L19 15Z" />
                    <path d="M6 16L6.6 17.8L8.4 18.4L6.6 19L6 20.8L5.4 19L3.6 18.4L5.4 17.8L6 16Z" />
                  </svg>
                )}
              </button>

              {/* Image Attachment Button */}
              {!selectedUser.isAiBot && (
                <label htmlFor="image">
                  <input
                    onChange={handleSendImage}
                    type="file"
                    id="image"
                    accept="image/png, image/jpeg"
                    hidden
                  />
                  <img
                    src={assets.gallery_icon}
                    alt="Upload"
                    className="w-5 mr-1 cursor-pointer opacity-70 hover:opacity-100 transition"
                  />
                </label>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isAiReplying}
              className="p-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex-shrink-0 shadow-md"
            >
              <img src={assets.send_button} alt="Send" className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden h-full">
      <img src={assets.logo_icon} alt="" className="max-w-16 opacity-80" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  );
};

export default ChatContainer;
