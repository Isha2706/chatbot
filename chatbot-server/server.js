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

// ✅ Paths
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

// ✅ POST /chat - Chat and update profile
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

    const portfolioCode = {
      html: fs.readFileSync("./portfolio/index.html", "utf-8"),
      css: fs.readFileSync("./portfolio/style.css", "utf-8"),
      js: fs.readFileSync("./portfolio/script.js", "utf-8"),
    };

    const systemPrompt = `
You are a friendly assistant helping build a user profile and generate a personalized portfolio.

Here is the existing chat history:
${formattedConversation}

Here is the current user profile (in JSON):
${JSON.stringify(userProfile, null, 2)}

Here is the current portfolio code:
HTML:
${portfolioCode.html}

CSS:
${portfolioCode.css}

JS:
${portfolioCode.js}

Your task:
- Generate a helpful and relevant next question for the user to build their profile further.
- Update the chat history by adding your reply to the latest user message.
- Ask questions with good interaction with user.
- Update the user profile if you infer any new details.
- Update the portfolio code (HTML, CSS, JS) to reflect the user's profile better.
- Respond ONLY in this strict JSON format:

{
  "nextQuestion": "string",
  "updatedUserProfile": { ... },
  "updatedCode": {
    "html": "string",
    "css": "string",
    "js": "string"
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    updatedHistory[updatedHistory.length - 1].bot = parsed.nextQuestion;

    fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2));
    fs.writeFileSync(profileFile, JSON.stringify(parsed.updatedUserProfile, null, 2));

    // Save updated portfolio code
    fs.writeFileSync("./portfolio/index.html", parsed.updatedCode.html);
    fs.writeFileSync("./portfolio/style.css", parsed.updatedCode.css);
    fs.writeFileSync("./portfolio/script.js", parsed.updatedCode.js);

    res.json({
      reply: parsed.nextQuestion,
      chatHistory: updatedHistory,
      userProfile: parsed.updatedUserProfile,
    });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: "Failed to get reply from OpenAI" });
  }
});


// ✅ GET endpoints
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
    fs.writeFileSync(profileFile, JSON.stringify({
      name: "", age: "", gender: "", email: "", phone: "", address: "", linkedin: "", github: "", portfolio: "",
      experience: "", skills: [], languages: [], tools: [], certifications: [], projects: [],
      college: "", degree: "", fieldOfStudy: "", schooling: "", company: "", role: "", post: "", description: "",
      interests: [], hobbies: [], goals: "", personality: "", availability: "", preferredLocation: "", expectedSalary: "",
      noticePeriod: "", achievements: [], volunteering: [], hackathons: [], extracurriculars: []
    }, null, 2));

    res.status(200).json({ message: "Files reset successfully" });
  } catch (error) {
    console.error("Reset Error:", error);
    res.status(500).json({ error: "Failed to reset files" });
  }
});

// ✅ POST /generate-portfolio - Generate portfolio from profile & dummy
// app.post("/generate-portfolio", async (req, res) => {
//   try {
//     const userProfile = JSON.parse(fs.readFileSync(profileFile));
//     const dummyProfile = JSON.parse(fs.readFileSync(dummyFile));

//     const generationPrompt = `
// You are a portfolio generator. Based on the following user profile and dummy data, generate a personal portfolio.

// User Profile (override dummy where available):
// ${JSON.stringify({ ...dummyProfile, ...userProfile }, null, 2)}

// Instructions:
// - Create 3 separate files: index.html, style.css, and script.js
// - Use HTML5 for structure, CSS for styling, and JS for basic interactivity
// - Keep the layout professional and clean
// - Return a JSON like:
// {
//   "index.html": "HTML CONTENT",
//   "style.css": "CSS CONTENT",
//   "script.js": "JS CONTENT"
// }
// - if in userProfile having any data empty then use the dummyProfile data for Portfolio 
// - First check keys of userProfile and if any key value id empty then take that keys value form dummyProfile. 
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "system", content: generationPrompt }],
//     });

//     const codeOutput = JSON.parse(response.choices[0].message.content);

//     // Save portfolio files
//     fs.writeFileSync(path.join(portfolioDir, "index.html"), codeOutput["index.html"]);
//     fs.writeFileSync(path.join(portfolioDir, "style.css"), codeOutput["style.css"]);
//     fs.writeFileSync(path.join(portfolioDir, "script.js"), codeOutput["script.js"]);

//     res.status(200).json({ message: "Portfolio generated successfully", files: codeOutput });
//   } catch (error) {
//     console.error("Portfolio Generation Error:", error.message);
//     res.status(500).json({ error: "Failed to generate portfolio" });
//   }
// });

// ✅ Serve portfolio files
app.use("/portfolio", express.static(portfolioDir));

// ✅ GET - Portfolio Code File (index.html, style.css, script.js)
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
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
