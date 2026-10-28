import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [isAiReplying, setIsAiReplying] = useState(false);

  // Dedicated state to preserve Connectly AI bot chat history
  const [aiBotMessages, setAiBotMessages] = useState([
    {
      _id: "welcome-ai",
      senderId: "ai-assistant-bot",
      text: "Hello! 👋 I'm Connectly AI. You can ask me questions, ask me to draft messages, explain concepts, or brainstorm ideas. You can also talk to me with voice typing or listen with the 🔊 Read Aloud button. How can I help you today?",
      createdAt: new Date().toISOString(),
    },
  ]);

  const { socket, axios, authUser } = useContext(AuthContext);

  // function to get all users for sidebar
  const getUsers = async () => {
    try {
      const res = await axios.get("/api/messages/users");
      const usersArray =
        res.data?.users ??
        res.data?.data?.users ??
        [];
      const unseen = res.data?.unseenMessages ?? {};

      setUsers(usersArray);
      setUnseenMessages(unseen);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to get messages for selected user
  const getMessages = async (userId) => {
    if (selectedUser?.isAiBot || userId === "ai-assistant-bot") {
      setMessages(aiBotMessages);
      return;
    }

    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to send message to selected user
  const sendMessage = async (messageData) => {
    // 1. Handle Connectly AI Bot chat
    if (selectedUser?.isAiBot || selectedUser?._id === "ai-assistant-bot") {
      const userMsg = {
        _id: "user-" + Date.now(),
        senderId: authUser?._id || "me",
        text: messageData.text,
        image: messageData.image,
        audio: messageData.audio,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setAiBotMessages((prev) => [...prev, userMsg]);

      // If user sent an image
      if (messageData.image && !messageData.text) {
        const aiAck = {
          _id: "bot-" + (Date.now() + 1),
          senderId: "ai-assistant-bot",
          text: "✨ Great image! What would you like to create or discuss next?",
          createdAt: new Date().toISOString(),
        };
        setTimeout(() => {
          setMessages((prev) => [...prev, aiAck]);
          setAiBotMessages((prev) => [...prev, aiAck]);
        }, 500);
        return;
      }

      // If user sent a voice message
      if (messageData.audio && !messageData.text) {
        const aiAck = {
          _id: "bot-" + (Date.now() + 1),
          senderId: "ai-assistant-bot",
          text: "🎙️ Voice message received! You can also use the 🔊 Read Aloud button on any of my messages to listen to replies, or tap the microphone to dictate via Voice Typing.",
          createdAt: new Date().toISOString(),
        };
        setTimeout(() => {
          setMessages((prev) => [...prev, aiAck]);
          setAiBotMessages((prev) => [...prev, aiAck]);
        }, 500);
        return;
      }

      try {
        setIsAiReplying(true);

        const history = (aiBotMessages || []).slice(-6).map((m) => ({
          role: m.senderId === "ai-assistant-bot" ? "assistant" : "user",
          text: m.text || "",
        }));

        const { data } = await axios.post("/api/ai/assistant", {
          prompt: messageData.text,
          history,
        });

        if (data.success && data.reply) {
          const aiMsg = {
            _id: "bot-" + (Date.now() + 1),
            senderId: "ai-assistant-bot",
            text: data.reply,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          setAiBotMessages((prev) => [...prev, aiMsg]);
        } else {
          toast.error(data.message || "Connectly AI could not reply");
        }
      } catch (err) {
        console.error("Connectly AI response error:", err);
        toast.error("Connectly AI response error");
      } finally {
        setIsAiReplying(false);
      }
      return;
    }

    // 2. Standard human-to-human socket message
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );
      if (data.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to subscribe to messages for selected user
  const subscribeToMessages = async () => {
    if (!socket) return;
    socket.on("newMessage", (newMessage) => {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        axios.put(`/api/messages/mark/${newMessage._id}`);
      } else {
        setUnseenMessages((prevUnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]: prevUnseenMessages[newMessage.senderId]
            ? prevUnseenMessages[newMessage.senderId] + 1
            : 1,
        }));
      }
    });
  };

  // function to unsubscribe from messages
  const unsubscribeFromMessages = () => {
    if (socket) socket.off("newMessage");
  };

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, selectedUser]);

  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    isAiReplying,
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
