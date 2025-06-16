const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const multer = require("multer");

// Load environment variables once
dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
// Remove duplicate express.json() middleware

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Paths
const dbDir = path.join(__dirname, "db");
const websiteDir = path.join(__dirname, "webSite");
const uploadsDir = path.join(websiteDir, "uploads");
const historyFile = path.join(dbDir, "chat-history.json");
const profileFile = path.join(dbDir, "user-profile.json");
const dummyFile = path.join(dbDir, "dummy-data.json");

// Ensure required directories/files exist
function ensureDirectoriesAndFiles() {
  const dirs = [dbDir, uploadsDir, websiteDir];
  const files = [
    { path: historyFile, defaultContent: "[]" },
    { path: profileFile, defaultContent: "{}" },
    { path: dummyFile, defaultContent: "{}" }
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  
  files.forEach(file => {
    if (!fs.existsSync(file.path)) fs.writeFileSync(file.path, file.defaultContent);
  });
}

ensureDirectoriesAndFiles();

// Static folder for uploaded images
app.use("/webSite/uploads", express.static(uploadsDir));

// Static folder to serve webSite
app.use("/webSite", express.static(websiteDir));

// File upload config (image upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Sanitize filename to prevent directory traversal attacks
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Helper functions for file operations
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return filePath.endsWith('history.json') ? [] : {};
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
}

// GET: Serve chat history
app.get("/history", (req, res) => {
  try {
    const chatHistory = readJsonFile(historyFile);
    res.json(chatHistory);
  } catch (error) {
    console.error("Error reading chat history:", error);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

// GET: Serve user profile
app.get("/profile", (req, res) => {
  try {
    const userProfile = readJsonFile(profileFile);
    res.json(userProfile);
  } catch (error) {
    console.error("Error reading user profile:", error);
    res.status(500).json({ error: "Failed to load user profile" });
  }
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
        code[file] = `// File ${file} not found`;
      }
    });

    res.json(code);
  } catch (err) {
    console.error("Error reading webSite code:", err);
    res.status(500).json({ error: "Failed to load webSite code" });
  }
});

// POST: Upload multiple images with a text and analyze using OpenAI
app.post("/upload-image", upload.array("images", 5), async (req, res) => {
  try {
    const files = req.files || [];
    const userText = req.body.text || "";
    
    // Allow uploads with just text, no images required
    if (files.length === 0 && !userText.trim()) {
      return res.status(400).json({ error: "Please provide either images or text" });
    }

    // Load existing profile and history
    const userProfile = readJsonFile(profileFile);
    const chatHistory = readJsonFile(historyFile);

    // Ensure images field exists
    if (!userProfile.images) userProfile.images = [];

    const newImagesData = [];

    // Process images if any were uploaded
    if (files.length > 0) {
      for (const file of files) {
        const imagePath = path.join(uploadsDir, file.filename);
        const fileExtension = path.extname(file.filename).slice(1);
        
        try {
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
                      url: `data:image/${fileExtension};base64,${fs.readFileSync(imagePath, {
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
            url: `/webSite/uploads/${file.filename}`,
            uploadedAt: new Date().toISOString(),
            description: userText,
            aiAnalysis: aiDescription,
          };

          userProfile.images.push(imageData);
          newImagesData.push(imageData);
        } catch (imageError) {
          console.error(`Error analyzing image ${file.filename}:`, imageError);
          // Continue with other images even if one fails
          const imageData = {
            filename: file.filename,
            originalname: file.originalname,
            url: `/webSite/uploads/${file.filename}`,
            uploadedAt: new Date().toISOString(),
            description: userText,
            aiAnalysis: "Image analysis failed",
          };
          
          userProfile.images.push(imageData);
          newImagesData.push(imageData);
        }
      }
    }

    // Add to chat history
    const userMessage = files.length > 0 
      ? `Uploaded ${files.length} image(s) with text: "${userText}"` 
      : `Message: "${userText}"`;
      
    const botMessage = newImagesData.length > 0
      ? newImagesData
          .map((img) => `AI Analysis for ${img.originalname}: ${img.aiAnalysis}`)
          .join("\n\n")
      : "Message received";
      
    chatHistory.push({
      user: userMessage,
      bot: botMessage,
    });

    // Save profile and history
    writeJsonFile(profileFile, userProfile);
    writeJsonFile(historyFile, chatHistory);

    res.status(200).json({
      success: true,
      images: newImagesData,
      message: files.length > 0 
        ? "Images uploaded and analyzed successfully." 
        : "Message received successfully.",
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Image upload or analysis failed." });
  }
});

// GET: Reset user profile and history
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

    writeJsonFile(historyFile, []);
    writeJsonFile(profileFile, defaultProfile);
    res.status(200).json({ message: "Files reset successfully" });
  } catch (error) {
    console.error("Reset Error:", error);
    res.status(500).json({ error: "Failed to reset files" });
  }
});

// POST: Quick profile-building chat
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Message is required and must be a string" });
  }

  try {
    const chatHistory = readJsonFile(historyFile);
    const userProfile = readJsonFile(profileFile);
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

    writeJsonFile(historyFile, updatedHistory);
    writeJsonFile(profileFile, parsedQuick.updatedUserProfile);

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
    const userProfile = readJsonFile(profileFile);
    const chatHistory = readJsonFile(historyFile);
    
    // Check if website files exist, create with defaults if not
    const websiteFiles = [
      { path: path.join(websiteDir, "index.html"), default: "<!DOCTYPE html><html><head><title>Website</title><link rel='stylesheet' href='style.css'></head><body><div id='app'></div><script src='script.js'></script></body></html>" },
      { path: path.join(websiteDir, "style.css"), default: "body { font-family: Arial, sans-serif; margin: 0; padding: 0; }" },
      { path: path.join(websiteDir, "script.js"), default: "document.addEventListener('DOMContentLoaded', function() { console.log('Website loaded'); });" }
    ];
    
    websiteFiles.forEach(file => {
      if (!fs.existsSync(file.path)) {
        fs.writeFileSync(file.path, file.default);
      }
    });
    
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
    let parsed;
    
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("❌ Failed to parse JSON from OpenAI:", content);
      return res.status(500).json({
        error: "Invalid JSON received from OpenAI",
        rawResponse: content.substring(0, 200) + "...", // Send truncated response for debugging
      });
    }

    writeJsonFile(profileFile, parsed.updatedUserProfile);
    fs.writeFileSync(path.join(websiteDir, "index.html"), parsed.updatedCode.html);
    fs.writeFileSync(path.join(websiteDir, "style.css"), parsed.updatedCode.css);
    fs.writeFileSync(path.join(websiteDir, "script.js"), parsed.updatedCode.js);

    res.status(200).json({ 
      message: "WebSite updated successfully",
      previewUrl: `http://localhost:${port}/webSite/index.html`
    });
  } catch (err) {
    console.error("Background update error:", err);
    res.status(500).json({ error: "Failed to update webSite" });
  }
});

// Start server
const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Website preview available at http://localhost:${port}/webSite/index.html`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
