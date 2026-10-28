import {
  rewriteMessageText,
  generateSmartReplies,
  askAiAssistant,
  generateAIImage,
  generateProfileBios,
  generateProfileAvatar,
} from "../lib/ai.js";
import cloudinary from "../lib/cloudinary.js";

// Feature 1: Rewrite message tone or fix grammar
export const rewriteMessage = async (req, res) => {
  try {
    const { text, tone } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Text cannot be empty" });
    }

    const validTones = ["professional", "friendly", "concise", "grammar", "persuasive"];
    const selectedTone = validTones.includes(tone) ? tone : "professional";

    const rewrittenText = await rewriteMessageText({ text, tone: selectedTone });
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

    res.json({
      success: true,
      rewrittenText,
      hasApiKey,
      message: hasApiKey
        ? "Text rewritten successfully"
        : "Preview mode. Add GEMINI_API_KEY in server/.env for live Gemini AI.",
    });
  } catch (error) {
    console.error("Rewrite error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to rewrite message" });
  }
};

// Feature 2: Smart Quick Replies
export const getSmartReplies = async (req, res) => {
  try {
    const { recentMessages, otherUserName } = req.body;
    const replies = await generateSmartReplies({
      recentMessages: recentMessages || [],
      otherUserName: otherUserName || "Friend",
    });
    res.json({ success: true, replies });
  } catch (error) {
    console.error("Smart replies error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to generate replies" });
  }
};

// Feature 3: AI Assistant Bot
export const chatWithAiAssistant = async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "Prompt cannot be empty" });
    }
    const reply = await askAiAssistant({ prompt, history: history || [] });
    res.json({ success: true, reply });
  } catch (error) {
    console.error("AI Assistant error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to get AI response" });
  }
};

// Feature 4: AI Image Generation
export const generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    const rawImageUrl = await generateAIImage({ prompt });
    let finalUrl = rawImageUrl;

    try {
      if (process.env.CLOUDINARY_API_KEY) {
        const uploadResponse = await cloudinary.uploader.upload(rawImageUrl, {
          folder: "chat_app_ai",
        });
        if (uploadResponse?.secure_url) {
          finalUrl = uploadResponse.secure_url;
        }
      }
    } catch (uploadError) {
      console.warn("Cloudinary upload fallback to direct URL:", uploadError.message);
    }

    res.json({ success: true, imageUrl: finalUrl });
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to generate image" });
  }
};

// Feature 5: AI Profile Bio Generator
export const generateBio = async (req, res) => {
  try {
    const { fullName, keywords, style } = req.body;
    const bios = await generateProfileBios({
      fullName: fullName || req.user?.fullName || "User",
      keywords: keywords || "",
      style: style || "friendly",
    });
    res.json({ success: true, bios });
  } catch (error) {
    console.error("Bio generation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to generate bio" });
  }
};

// Feature 6: AI Avatar Generator
export const generateAvatar = async (req, res) => {
  try {
    const { prompt, style } = req.body;
    const rawImageUrl = await generateProfileAvatar({
      prompt: prompt || req.user?.fullName || "tech explorer",
      style: style || "3d",
    });

    let finalUrl = rawImageUrl;
    try {
      if (process.env.CLOUDINARY_API_KEY) {
        const uploadResponse = await cloudinary.uploader.upload(rawImageUrl, {
          folder: "chat_app_avatars",
        });
        if (uploadResponse?.secure_url) {
          finalUrl = uploadResponse.secure_url;
        }
      }
    } catch (uploadError) {
      console.warn("Cloudinary avatar fallback to direct URL:", uploadError.message);
    }

    res.json({ success: true, avatarUrl: finalUrl });
  } catch (error) {
    console.error("Avatar generation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to generate avatar" });
  }
};
