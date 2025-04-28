const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Paths
const dbDir = path.join(__dirname, "db");
const portfolioDir = path.join(__dirname, "portfolio");
const historyFile = path.join(dbDir, "chat-history.json");
const profileFile = path.join(dbDir, "user-profile.json");
const dummyFile = path.join(dbDir, "dummy-data.json");

// Ensure required files and directories exist
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, "[]");
if (!fs.existsSync(profileFile)) fs.writeFileSync(profileFile, "{}");
if (!fs.existsSync(dummyFile)) fs.writeFileSync(dummyFile, "{}");
if (!fs.existsSync(portfolioDir)) fs.mkdirSync(portfolioDir);

// POST /chat - Quick Response, Updates User Profile Only
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
You are a friendly assistant helping build a user profile.

Here is the existing chat history:
${formattedConversation}

Here is the current user profile:
${JSON.stringify(userProfile, null, 2)}

Your task:
- Generate the next relevant question for the user to build their profile further.
- Add encouragement message first then the next asked question for better user interaction.
- If user have any website perference then add that data in 'websitePerference' in user profile.
- Update the user profile if needed.
- Respond ONLY in this JSON format:
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

// POST /promptBackground - Generate Portfolio from Profile
app.post("/promptBackground", async (req, res) => {
  try {
    const userProfile = JSON.parse(fs.readFileSync(profileFile));
    const portfolioCode = {
      html: fs.readFileSync("./portfolio/index.html", "utf-8"),
      css: fs.readFileSync("./portfolio/style.css", "utf-8"),
      js: fs.readFileSync("./portfolio/script.js", "utf-8"),
    };

    const systemPromptBackground = `
You are a developer assistant that generates a personalized portfolio website.

Here is the user profile (JSON):
${JSON.stringify(userProfile, null, 2)}

Here is the current portfolio code:
HTML:
${portfolioCode.html}

CSS:
${portfolioCode.css}

JS:
${portfolioCode.js}

Your task:
- Update and improve the HTML, CSS, and JS based on user profile.
- Keep code neat, responsive, and personalized.
- Add things that user ask for in website.
- Respond only in this JSON format:
{
  "updatedUserProfile": { ... },
  "updatedCode": {
    "html": "string",
    "css": "string",
    "js": "string"
  }
}`;

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
    fs.writeFileSync("./portfolio/index.html", parsed.updatedCode.html);
    fs.writeFileSync("./portfolio/style.css", parsed.updatedCode.css);
    fs.writeFileSync("./portfolio/script.js", parsed.updatedCode.js);

    res.status(200).json({ message: "Portfolio updated successfully" });
  } catch (err) {
    console.error("Background update error:", err);
    res.status(500).json({ error: "Failed to update portfolio" });
  }
});

// GET endpoints
app.get("/history", (req, res) => {
  const chatHistory = JSON.parse(fs.readFileSync(historyFile));
  res.json(chatHistory);
});

app.get("/profile", (req, res) => {
  const userProfile = JSON.parse(fs.readFileSync(profileFile));
  res.json(userProfile);
});

app.get("/reset", (req, res) => {
  try {
    fs.writeFileSync(historyFile, "[]");
    fs.writeFileSync(
      profileFile,
      JSON.stringify(
        {
          name: "",
          age: "",
          gender: "",
          email: "",
          phone: "",
          address: "",
          linkedin: "",
          github: "",
          portfolio: "",
          experience: "",
          skills: [],
          languages: [],
          tools: [],
          certifications: [],
          projects: [],
          college: "",
          degree: "",
          fieldOfStudy: "",
          schooling: "",
          company: "",
          role: "",
          post: "",
          description: "",
          interests: [],
          hobbies: [],
          goals: "",
          personality: "",
          availability: "",
          preferredLocation: "",
          expectedSalary: "",
          noticePeriod: "",
          achievements: [],
          volunteering: [],
          hackathons: [],
          extracurriculars: [],
          websitePerference: [],
        },
        null,
        2
      )
    );

    res.status(200).json({ message: "Files reset successfully" });
  } catch (error) {
    console.error("Reset Error:", error);
    res.status(500).json({ error: "Failed to reset files" });
  }
});

// Serve portfolio files
app.use("/portfolio", express.static(portfolioDir));

// GET - Portfolio Code File (index.html, style.css, script.js)
app.get("/get-portfolio-code", async (req, res) => {
  const folderPath = portfolioDir;

  try {
    const files = ["index.html", "style.css", "script.js"];
    const code = {};

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      if (fs.existsSync(filePath)) {
        code[file] = fs.readFileSync(filePath, "utf-8");
      } else {
        code[file] = "// File not found";
      }
    });

    res.json(code);
  } catch (err) {
    console.error("Error reading portfolio code:", err);
    res.status(500).json({ error: "Failed to load portfolio code" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
