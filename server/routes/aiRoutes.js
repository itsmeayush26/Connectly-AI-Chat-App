import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  rewriteMessage,
  getSmartReplies,
  chatWithAiAssistant,
  generateImage,
  generateBio,
  generateAvatar,
} from "../controllers/aiController.js";

const aiRouter = express.Router();

// Feature 1: Rewrite message tone or fix grammar
aiRouter.post("/rewrite", protectRoute, rewriteMessage);

// Feature 2: Smart Quick Replies based on recent conversation
aiRouter.post("/smart-replies", protectRoute, getSmartReplies);

// Feature 3: AI Assistant Bot
aiRouter.post("/assistant", protectRoute, chatWithAiAssistant);

// Feature 4: AI Image Generation
aiRouter.post("/generate-image", protectRoute, generateImage);

// Feature 5: AI Profile Bio Generator
aiRouter.post("/generate-bio", protectRoute, generateBio);

// Feature 6: AI Avatar Generator
aiRouter.post("/generate-avatar", protectRoute, generateAvatar);

export default aiRouter;
