const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const path = require("path");

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*",
  })
);
app.use(bodyParser.json());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const historyFile = "chat-history.json";
const profileFile = "user-profile.json";

// Ensure both files exist
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, "[]");
if (!fs.existsSync(profileFile)) fs.writeFileSync(profileFile, "{}");

// ✅ POST /chat
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  // console.log("Received message:", message);  

  try {
    const chatHistory = JSON.parse(fs.readFileSync(historyFile));
    const userProfile = JSON.parse(fs.readFileSync(profileFile));

    // Include new user message in chat history
    const updatedHistory = [...chatHistory, { user: message, bot: "" }];

    // Create a full conversation format for prompt
    const formattedConversation = updatedHistory
      .map((entry) =>
        entry.user && entry.bot
          ? `User: ${entry.user}\nBot: ${entry.bot}`
          : `User: ${entry.user}`
      )
      .join("\n");

    const systemPrompt = `
You are a friendly assistant helping build a user profile.

Here is the existing chat history:
${formattedConversation}

Here is the current user profile (in JSON):
${JSON.stringify(userProfile, null, 2)}

Your task:
- Generate a helpful and relevant next question for the user to build their profile further.
- Update the chat history by adding your reply to the latest user message.
- Update the user profile if you infer any new details.
- Respond ONLY in this strict JSON format:

{
  "nextQuestion": "string",
  "updatedUserProfile": { ... }
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
    });

    const content = response.choices[0].message.content;

    // Parse OpenAI's response (must be valid JSON)
    const parsed = JSON.parse(content);

    // Update last entry in chat history with bot reply
    updatedHistory[updatedHistory.length - 1].bot = parsed.nextQuestion;

    // Save updated files
    fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2));
    fs.writeFileSync(
      profileFile,
      JSON.stringify(parsed.updatedUserProfile, null, 2)
    );

    // Respond to frontend
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

// ✅ GET /history - return chat history
app.get("/history", (req, res) => {
  const chatHistory = JSON.parse(fs.readFileSync("chat-history.json"));
  res.json(chatHistory);
});

// ✅ GET /profile - return user profile
app.get("/profile", (req, res) => {
  const userProfile = JSON.parse(fs.readFileSync("user-profile.json"));
  res.json(userProfile);
});

// ✅ GET /reset - clear chat history (called on page refresh)
app.get("/reset", (req, res) => {
  try {
    // Reset chat-history.json
    fs.writeFileSync(
      path.join(__dirname, "chat-history.json"),
      JSON.stringify([])
    );
    // Reset user-profile.json
    fs.writeFileSync(
      path.join(__dirname, "user-profile.json"),
      JSON.stringify({
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
      })
    );

    res.status(200).json({ message: "Files reset successfully" });
  } catch (error) {
    console.error("Error resetting files:", error);
    res.status(500).json({ error: "Failed to reset files" });
  }
});

const port = process.env.PORT || 3001
// ✅ Start server
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
