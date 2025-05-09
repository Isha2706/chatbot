const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const multer = require("multer");

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());

require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Paths
const dbDir = path.join(__dirname, "db");
const websiteDir = path.join(__dirname, "webSite");
const uploadsDir = path.join(__dirname, "uploads");
const historyFile = path.join(dbDir, "chat-history.json");
const profileFile = path.join(dbDir, "user-profile.json");
const dummyFile = path.join(dbDir, "dummy-data.json");

// Ensure required directories/files exist
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(websiteDir)) fs.mkdirSync(websiteDir);
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, "[]");
if (!fs.existsSync(profileFile)) fs.writeFileSync(profileFile, "{}");
if (!fs.existsSync(dummyFile)) fs.writeFileSync(dummyFile, "{}");

// Static folder for uploaded images
app.use("/uploads", express.static(uploadsDir));

// Static folder to serve webSite
app.use("/webSite", express.static(websiteDir));

// File upload config (image upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage: storage });

// GET: Serve chat history
app.get("/history", (req, res) => {
  const chatHistory = JSON.parse(fs.readFileSync(historyFile));
  res.json(chatHistory);
});

// GET: Serve user profile
app.get("/profile", (req, res) => {
  const userProfile = JSON.parse(fs.readFileSync(profileFile));
  res.json(userProfile);
});

// GET: Serve current webSite code
app.get("/get-webSite-code", async (req, res) => {
  const files = ["index.html", "style.css", "script.js"];
  const code = {};

  try {
    files.forEach((file) => {
      const filePath = path.join(websiteDir, file);
      if (fs.existsSync(filePath)) {
        code[file] = fs.readFileSync(filePath, "utf-8");
      } else {
        code[file] = "// File not found";
      }
    });

    res.json(code);
  } catch (err) {
    console.error("Error reading webSite code:", err);
    res.status(500).json({ error: "Failed to load webSite code" });
  }
});

// POST: Upload multiple images with a text and analyze using OpenAI
app.post("/upload-image", upload.array("images", 10), async (req, res) => {
  try {
    const files = req.files;
    const userText = req.body.text || "";
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Load existing profile and history
    const userProfile = JSON.parse(fs.readFileSync(profileFile));
    const chatHistory = JSON.parse(fs.readFileSync(historyFile));

    // Ensure images field exists
    if (!userProfile.images) userProfile.images = [];

    const newImagesData = [];

    for (const file of files) {
      const imagePath = path.join(uploadsDir, file.filename);

      // Call OpenAI to analyze the image
      const analysis = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that describes images.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What kind of image is this and what is its use?",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/${path
                    .extname(file.filename)
                    .slice(1)};base64,${fs.readFileSync(imagePath, {
                    encoding: "base64",
                  })}`,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      const aiDescription = analysis.choices[0].message.content;

      const imageData = {
        filename: file.filename,
        originalname: file.originalname,
        url: `/uploads/${file.filename}`,
        uploadedAt: new Date().toISOString(),
        description: userText,
        aiAnalysis: aiDescription,
      };

      userProfile.images.push(imageData);
      newImagesData.push(imageData);
    }

    // Add to chat history
    chatHistory.push({
      user: `Uploaded ${files.length} image(s) with text: "${userText}"`,
      bot: newImagesData
        .map((img) => `AI Analysis for ${img.originalname}: ${img.aiAnalysis}`)
        .join("\n\n"),
    });

    // Save profile and history
    fs.writeFileSync(profileFile, JSON.stringify(userProfile, null, 2));
    fs.writeFileSync(historyFile, JSON.stringify(chatHistory, null, 2));

    res.status(200).json({
      success: true,
      images: newImagesData,
      message: "Images uploaded and analyzed successfully.",
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Image upload or analysis failed." });
  }
});

// POST: Reset user profile and history
app.get("/reset", (req, res) => {
  try {
    const defaultProfile = {
      websiteType: "",
      targetAudience: "",
      mainGoal: "",
      colorScheme: "",
      theme: "",
      pages: [],
      sections: [],
      features: [],
      content: {},
      designPreferences: {},
      images: [],
      fonts: "",
      contactInfo: {},
      socialLinks: {},
      customScripts: "",
      branding: {},
      updateRequests: [],
      additionalNotes: "",
    };

    fs.writeFileSync(historyFile, `[]`);
    fs.writeFileSync(profileFile, JSON.stringify(defaultProfile, null, 2));
    res.status(200).json({ message: "Files reset successfully" });
  } catch (error) {
    console.error("Reset Error:", error);
    res.status(500).json({ error: "Failed to reset files" });
  }
});

// POST: Quick profile-building chat
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const chatHistory = JSON.parse(fs.readFileSync(historyFile));
    const userProfile = JSON.parse(fs.readFileSync(profileFile));
    const updatedHistory = [...chatHistory, { user: message, bot: "" }];

    const formattedConversation = updatedHistory
      .map((entry) =>
        entry.user && entry.bot
          ? `User: ${entry.user}\nBot: ${entry.bot}`
          : `User: ${entry.user}`
      )
      .join("\n");

    const promptQuick = `
You are a helpful assistant that talks to users to understand and build their ideal website.

Here is the existing chat history:
${formattedConversation}

Here is the current user profile:
${JSON.stringify(userProfile, null, 2)}

Your goals:
- Ask relevant questions to understand the user's needs for their website.
- Update the profile accordingly.
- If the user asks to change something (e.g. color, layout), update "updateRequests".
- Be friendly and interactive, and make sure to guide the user step by step.
- If user is asking something or requests changes, respond helpfully and then ask the next relevant question.
- Respond ONLY in this JSON format:
{ "nextQuestion": "string", "updatedUserProfile": { ... } }
IMPORTANT: Do NOT include any markdown or backticks. Just return the JSON.
    `.trim();

    const quickResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: promptQuick }],
    });

    let responseText = quickResponse.choices[0].message.content;

    // Clean up markdown formatting if present
    responseText = responseText.replace(/```json|```/g, "").trim();

    let parsedQuick;
    try {
      parsedQuick = JSON.parse(responseText);
    } catch (err) {
      console.error("❌ Failed to parse JSON from OpenAI:", responseText);
      return res.status(500).json({
        error: "Invalid JSON received from OpenAI",
        rawResponse: responseText,
      });
    }

    updatedHistory[updatedHistory.length - 1].bot = parsedQuick.nextQuestion;

    fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2));
    fs.writeFileSync(profileFile, JSON.stringify(parsedQuick.updatedUserProfile, null, 2));

    res.json({
      reply: parsedQuick.nextQuestion,
      chatHistory: updatedHistory,
    });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: "Failed to get reply from OpenAI" });
  }
});


// POST: Generate dynamic webSite from profile
app.post("/promptBackground", async (req, res) => {
  try {
    const userProfile = JSON.parse(fs.readFileSync(profileFile));
    const chatHistory = JSON.parse(fs.readFileSync(historyFile));
    const websiteCode = {
      html: fs.readFileSync(path.join(websiteDir, "index.html"), "utf-8"),
      css: fs.readFileSync(path.join(websiteDir, "style.css"), "utf-8"),
      js: fs.readFileSync(path.join(websiteDir, "script.js"), "utf-8"),
    };

    const systemPromptBackground = `
You are a full-stack AI developer. Create a dynamic, multi-page website using only one HTML file, one CSS file, and one JavaScript file. The website must be fully functional and styled using CSS. JavaScript should handle all interactivity and dynamic behavior.

Here is the user's desired website information:
${JSON.stringify(userProfile, null, 2)}
${JSON.stringify(chatHistory, null, 2)}

Here is the current website code:
HTML:
${websiteCode.html}

CSS:
${websiteCode.css}

JS:
${websiteCode.js}

Your task:
- Update the HTML, CSS, and JS files to reflect the user's website preferences.
- Include all required pages and sections if listed.
- Insert placeholders like <span id="goal"> or <div id="about-section">.
- In script.js, fetch "/profile", "/history" and multiple pages website populate the HTML.
- Make the site responsive and visually appealing.
- Generate the dummy data in website according user need.
- Use clean and modern design, respecting colorScheme, theme, etc.

Respond ONLY in this JSON format:
{
  "updatedUserProfile": { ... },
  "updatedCode": {
    "html": "string",
    "css": "string",
    "js": "string"
  }
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPromptBackground }],
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    fs.writeFileSync(
      profileFile,
      JSON.stringify(parsed.updatedUserProfile, null, 2)
    );
    fs.writeFileSync(
      path.join(websiteDir, "index.html"),
      parsed.updatedCode.html
    );
    fs.writeFileSync(
      path.join(websiteDir, "style.css"),
      parsed.updatedCode.css
    );
    fs.writeFileSync(path.join(websiteDir, "script.js"), parsed.updatedCode.js);

    res.status(200).json({ message: "WebSite updated successfully" });
  } catch (err) {
    console.error("Background update error:", err);
    res.status(500).json({ error: "Failed to update webSite" });
  }
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
