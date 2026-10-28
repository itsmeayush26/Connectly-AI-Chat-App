// AI service supporting Google Gemini (and OpenAI as alternate) with zero extra dependencies using native fetch

const getGeminiApiKey = () => {
  const key = process.env.GEMINI_API_KEY || "";
  return key.replace(/^["']|["']$/g, "").trim();
};

const getOpenAiApiKey = () => {
  const key = process.env.OPENAI_API_KEY || "";
  return key.replace(/^["']|["']$/g, "").trim();
};

/**
 * Universal text generation with Gemini REST API (with multi-model fallback)
 */
export async function generateAIContent({ prompt, systemInstruction = "" }) {
  const geminiKey = getGeminiApiKey();
  const openAiKey = getOpenAiApiKey();

  // 1. If Gemini API Key is present, call Gemini models with fallback
  if (geminiKey) {
    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-flash-latest",
    ];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

        const fullPromptText = systemInstruction
          ? `[System Instruction: ${systemInstruction}]\n\nUser: ${prompt}`
          : prompt;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: fullPromptText }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        });

        const data = await response.json();
        if (response.ok) {
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else {
          console.warn(`Gemini (${model}) returned:`, data.error?.message || response.statusText);
        }
      } catch (err) {
        console.warn(`Error attempting Gemini model ${model}:`, err.message);
      }
    }
  }

  // 2. If OpenAI key is present
  if (openAiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        return data.choices?.[0]?.message?.content?.trim() || "";
      }
    } catch (err) {
      console.warn("OpenAI request error:", err.message);
    }
  }

  // 3. Fallback simulation if no API key is configured or all requests failed
  return null;
}

/**
 * Feature 1: Rewrite message tone or fix grammar
 */
export async function rewriteMessageText({ text, tone }) {
  if (!text || !text.trim()) return text;

  const tonePrompts = {
    professional: "Rewrite the message to be polite, clear, and professional suitable for workplace or formal communication.",
    friendly: "Rewrite the message to be warm, enthusiastic, friendly, and approachable with positive conversational vibes.",
    concise: "Condense and shorten the message to be brief, direct, and straight to the point without losing essential meaning.",
    grammar: "Fix all grammar, spelling, and punctuation errors while keeping the exact original tone and wording as natural as possible.",
    persuasive: "Make this message compelling, persuasive, and confident.",
  };

  const instruction = tonePrompts[tone] || tonePrompts.professional;
  const prompt = `Task: ${instruction}

Original message: "${text}"

Instructions:
- Return ONLY the rewritten message text.
- Do NOT wrap in quotes.
- Do NOT add explanations or intro like 'Here is the rewritten text:'.`;

  const aiResult = await generateAIContent({
    prompt,
    systemInstruction: "You are an expert writing assistant inside Connectly chat application.",
  });

  if (aiResult) {
    return aiResult.replace(/^["']|["']$/g, "").trim();
  }

  return simulateRewrite(text, tone);
}

function simulateRewrite(text, tone) {
  const clean = text.trim();
  switch (tone) {
    case "professional":
      return `Dear, I would like to convey that ${clean.charAt(0).toLowerCase() + clean.slice(1)}. Please let me know your thoughts.`;
    case "friendly":
      return `Hey there! Just wanted to share: ${clean} 😊 Let me know what you think!`;
    case "concise":
      return clean.length > 50 ? `${clean.slice(0, 45)}...` : clean;
    case "grammar":
      return clean.charAt(0).toUpperCase() + clean.slice(1) + (clean.endsWith(".") ? "" : ".");
    default:
      return clean;
  }
}

/**
 * Feature 2: Smart Quick Replies
 */
export async function generateSmartReplies({ recentMessages, otherUserName = "User" }) {
  if (!recentMessages || recentMessages.length === 0) {
    return ["Hey! How are you?", "Sounds good!", "Let's connect soon."];
  }

  const formattedHistory = recentMessages
    .slice(-4)
    .map((m) => `${m.isMe ? "Me" : otherUserName}: "${m.text || "[Image]"}"`)
    .join("\n");

  const prompt = `Here is the recent conversation between Me and ${otherUserName}:
${formattedHistory}

Suggest exactly 3 short, natural, context-aware quick replies that "Me" could send next.
Each reply must be under 6 words.
Return strictly a valid JSON array of strings, for example:
["Sounds great!", "Sure, I can do that.", "I'll let you know soon."]`;

  const aiResult = await generateAIContent({
    prompt,
    systemInstruction: "You are an AI chat assistant generating fast smart replies. Return strictly a JSON array of 3 strings.",
  });

  if (aiResult) {
    try {
      const match = aiResult.match(/\[.*\]/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 3).map((r) => String(r).replace(/^["']|["']$/g, "").trim());
        }
      }
    } catch (e) {
      console.warn("Could not parse smart replies JSON, falling back to simulation");
    }
  }

  return simulateSmartReplies(recentMessages);
}

function simulateSmartReplies(recentMessages) {
  const lastMsg = recentMessages[recentMessages.length - 1]?.text?.toLowerCase() || "";
  if (lastMsg.includes("?") || lastMsg.includes("when") || lastMsg.includes("where")) {
    return ["Yes, absolutely!", "I'll check and let you know.", "Not sure, what do you think?"];
  }
  if (lastMsg.includes("hello") || lastMsg.includes("hi") || lastMsg.includes("hey")) {
    return ["Hey! How are you?", "Hi there!", "Good to hear from you!"];
  }
  if (lastMsg.includes("thanks") || lastMsg.includes("thank you")) {
    return ["You're very welcome!", "No problem at all! 😊", "Anytime!"];
  }
  return ["Sounds great!", "Got it, thanks!", "Let's catch up later."];
}

/**
 * Feature 3: Ask AI Assistant / Bot (Connectly AI)
 */
export async function askAiAssistant({ prompt, history = [] }) {
  const formattedHistory = history
    .slice(-6)
    .map((h) => `${h.role === "user" ? "User" : "Connectly AI"}: ${h.text}`)
    .join("\n");

  const fullPrompt = formattedHistory
    ? `Conversation history:\n${formattedHistory}\n\nUser: ${prompt}`
    : prompt;

  const result = await generateAIContent({
    prompt: fullPrompt,
    systemInstruction: "You are Connectly AI, a friendly, intelligent, and helpful AI assistant embedded in the Connectly Chat App. Answer clearly, provide code snippets when asked, and be helpful and engaging.",
  });

  if (result) return result;

  // Smart conversational fallback
  return simulateConnectlyAI(prompt, history);
}

function simulateConnectlyAI(prompt, history = []) {
  const p = prompt.trim().toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|greetings|hola|namaste|yo\b)/i.test(p)) {
    return "Hello! 👋 I'm Connectly AI, your personal AI assistant. How can I help you today? Ask me anything from writing code to drafting messages or brainstorming ideas!";
  }

  // Identity
  if (p.includes("who are you") || p.includes("your name") || p.includes("what are you") || p.includes("connectly")) {
    return "I am Connectly AI 🤖 — your smart in-app assistant! I can help you draft messages, answer questions, explain concepts, generate code, and keep you company anytime.";
  }

  // How are you
  if (p.includes("how are you") || p.includes("how r u") || p.includes("how's it going")) {
    return "I'm doing fantastic and running smoothly! ⚡ Thanks for asking. How are you doing today?";
  }

  // Coding & Tech
  if (p.includes("python") && (p.includes("hello") || p.includes("world") || p.includes("print"))) {
    return "Here is how you print Hello World in Python:\n\n```python\nprint(\"Hello, World!\")\n```\n\nSimple, clean, and ready to run! 🐍";
  }

  if (p.includes("javascript") || p.includes("js") || p.includes("react")) {
    return "Here is a quick JavaScript snippet:\n\n```javascript\nconst greet = (name) => `Welcome to Connectly, ${name}! 🚀`;\nconsole.log(greet(\"Friend\"));\n```\n\nNeed help with React state, Socket.io, or APIs?";
  }

  if (p.includes("code") || p.includes("function") || p.includes("algorithm")) {
    return "I'd love to help with your code! 💻 Tell me what programming language or logic problem you're working on.";
  }

  // Jokes
  if (p.includes("joke") || p.includes("funny")) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "Why was the JavaScript developer sad? Because they didn't Node how to Express themselves! 😄",
      "There are 10 types of people in the world: those who understand binary, and those who don't! 🚀",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // Capabilities
  if (p.includes("help") || p.includes("what can you do") || p.includes("feature")) {
    return "Here are things you can do with Connectly AI:\n• 💬 Chat with me anytime\n• ✍️ Click the ✨ icon to polish your messages (Formal, Friendly, Concise)\n• 🎨 Type `/imagine <prompt>` to generate AI images\n• 🎙️ Use Voice Typing or send Voice Notes\n• 👤 Open Profile to generate AI Avatars & Bios\n\nWhat would you like to try?";
  }

  // Thanks
  if (p.includes("thank") || p.includes("thx") || p.includes("awesome")) {
    return "You're very welcome! 😊 Always happy to help. Let me know if you need anything else!";
  }

  // Fallback
  return `I understand you said: "${prompt.trim()}". As Connectly AI, I am here to help you code, brainstorm, and chat. How can I assist you further?`;
}

/**
 * Feature 4: AI Image Generation
 */
export async function generateAIImage({ prompt }) {
  const cleanPrompt = encodeURIComponent(prompt.trim());
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=768&height=768&nologo=true&seed=${seed}`;
  return imageUrl;
}

/**
 * Feature 5: AI Profile Bio Generator
 */
export async function generateProfileBios({ fullName = "User", keywords = "", style = "friendly" }) {
  const prompt = `Create 3 catchy, engaging profile bios for a chat app user named "${fullName}".
User details/interests: "${keywords || 'tech enthusiast, creative mind, friendly conversation'}"
Desired vibe/style: ${style} (e.g. professional, creative, witty, casual, or motivational)

Guidelines:
- Each bio must be under 120 characters.
- Include 1 or 2 tasteful emojis.
- Make each of the 3 options distinct in tone and focus.
- Return strictly a valid JSON array of 3 strings.`;

  const aiResult = await generateAIContent({
    prompt,
    systemInstruction: "You are an expert social media and chat profile bio writer. Return strictly a JSON array of 3 strings.",
  });

  if (aiResult) {
    try {
      const match = aiResult.match(/\[.*\]/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 3).map((b) => String(b).replace(/^["']|["']$/g, "").trim());
        }
      }
    } catch (e) {
      console.warn("Could not parse profile bios JSON:", e.message);
    }
  }

  return simulateBios(fullName, keywords, style);
}

function simulateBios(fullName, keywords, style) {
  const name = fullName || "Hey";
  const kw = keywords ? keywords.split(",")[0].trim() : "Ideas";
  switch (style) {
    case "professional":
      return [
        `💼 ${name} | Passionate about ${kw} & building impactful software.`,
        `📈 Driving innovation through collaboration & clean code.`,
        `🎯 Focused on excellence, teamwork, and continuous growth.`,
      ];
    case "witty":
      return [
        `⚡ Powered by caffeine, fueled by ${kw}, running on 1% battery.`,
        `🙃 Fluent in sarcasm, emoji, and slightly chaotic brilliance.`,
        `🍕 90% human, 10% unread messages. Let's chat!`,
      ];
    case "creative":
      return [
        `🎨 Turning imagination into pixels & stories. Exploring ${kw}.`,
        `✨ Dreamer, creator, and curious observer of everyday magic.`,
        `🌌 Creating aesthetic vibes and genuine connections.`,
      ];
    case "gamer":
      return [
        `🎮 Respawn, reload, conquer. Leveling up every single day.`,
        `🕹️ In the lobby of life. Press Start to chat.`,
        `👾 Gaming, coding, and questing for the next high score.`,
      ];
    default:
      return [
        `✨ ${name} | Curious mind, coffee lover & ${kw} enthusiast.`,
        `🌿 Keeping it simple, positive, and always learning.`,
        `🚀 Building cool things and connecting with inspiring people.`,
      ];
  }
}

/**
 * Feature 6: AI Avatar Portrait Generator
 */
export async function generateProfileAvatar({ prompt = "person", style = "3d" }) {
  const stylePrompts = {
    "3d": "3D Pixar animation style cute vibrant avatar portrait of",
    cyberpunk: "Cyberpunk futuristic glowing neon avatar portrait of",
    anime: "Studio Ghibli aesthetic anime cute portrait avatar of",
    minimal: "Minimalist flat modern vector illustration portrait avatar of",
    professional: "Professional corporate sleek studio lighting headshot portrait of",
    fantasy: "Epic fantasy concept art portrait avatar of",
  };

  const stylePrefix = stylePrompts[style] || stylePrompts["3d"];
  const finalPrompt = encodeURIComponent(
    `${stylePrefix} ${prompt.trim() || "creative tech person"}, centered face, vibrant color palette, high resolution, square profile picture, smooth digital art`
  );
  const seed = Math.floor(Math.random() * 10000000);
  return `https://image.pollinations.ai/prompt/${finalPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
}
