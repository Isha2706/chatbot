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
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage: storage });

// ✅ GET: Serve chat history
app.get("/history", (req, res) => {
  const chatHistory = JSON.parse(fs.readFileSync(historyFile));
  res.json(chatHistory);
});

// ✅ GET: Serve user profile
app.get("/profile", (req, res) => {
  const userProfile = JSON.parse(fs.readFileSync(profileFile));
  res.json(userProfile);
});

// ✅ GET: Dynamic API for webSite to fetch user profile
// app.get("/api/profile-data", (req, res) => {
//   try {
//     const profile = JSON.parse(fs.readFileSync(profileFile, "utf-8"));
//     res.json(profile);
//   } catch (error) {
//     console.error("Error reading profile data:", error);
//     res.status(500).json({ error: "Failed to load profile data" });
//   }
// });

// ✅ GET: Serve current webSite code
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

// ✅ POST: Upload image and save in profile
app.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const userProfile = JSON.parse(fs.readFileSync(profileFile));
  userProfile.uploadedImage = {
    filename: req.file.filename,
    originalname: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    uploadedAt: new Date().toISOString(),
  };

  fs.writeFileSync(profileFile, JSON.stringify(userProfile, null, 2));
  res.json({ success: true, image: userProfile.uploadedImage });
});

// ✅ POST: Reset user profile and history
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
      additionalNotes: ""
  };

    
    fs.writeFileSync(historyFile, `[]`);
    fs.writeFileSync(profileFile, JSON.stringify(defaultProfile, null, 2));
    res.status(200).json({ message: "Files reset successfully" });
  } catch (error) {
    console.error("Reset Error:", error);
    res.status(500).json({ error: "Failed to reset files" });
  }
});

// ✅ POST: Quick profile-building chat
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
      - If user is asking some thinking or ask for change something then answer his and then ask question related to it.
      - Keep everything in JSON format for structured updates.
      
      Respond ONLY in this JSON format:
      { "nextQuestion": "string", "updatedUserProfile": { ... } }
      `;

    const quickResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: promptQuick }],
    });

    const parsedQuick = JSON.parse(quickResponse.choices[0].message.content);
    updatedHistory[updatedHistory.length - 1].bot = parsedQuick.nextQuestion;

    fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2));
    fs.writeFileSync(
      profileFile,
      JSON.stringify(parsedQuick.updatedUserProfile, null, 2)
    );

    res.json({
      reply: parsedQuick.nextQuestion,
      chatHistory: updatedHistory,
    });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: "Failed to get reply from OpenAI" });
  }
});

// ✅ POST: Generate dynamic webSite from profile
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
- In script.js, fetch "/profile", "/history" and dynamically populate the HTML.
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
