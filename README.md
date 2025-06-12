# 🤖 AI ChatBot Website Generator

This is a **React + Node.js** project integrated with the **OpenAI API** that simulates a powerful chatbot for building dynamic websites. The chatbot interacts with users, builds a detailed user profile, and generates a complete website using HTML, CSS, and JS based on the conversation.

## 📖 About

This chatbot acts as a virtual assistant to gather information from users and create custom websites. It not only chats but also maintains user data, provides previews, and generates downloadable code — all in real-time.

> This project was built as a learning experience to deepen understanding of **APIs**, **backend/frontend integration**, **file generation**, and **OpenAI-powered conversational interfaces**.

## 🚀 Key Features

- 💬 **Interactive Chat Interface** built with React
- 📄 **User Profile Builder** updated dynamically from conversation
- 🧠 **OpenAI Integration** to ask intelligent follow-up questions and generate code
- 🕘 **Chat History Viewer** with toggle to review all previous messages
- 🌐 **Live Website Preview** based on generated HTML, CSS, and JS
- 💾 **Download Website Code** including individual files or full zip
- 📂 **Image Upload Support** for website assets

## 🧰 Technologies Used

### Frontend (React + Vite)
- React.js
- Tailwind CSS / Bootstrap / Material UI
- Axios (for API calls)

### Backend (Node.js + Express)
- Express.js
- OpenAI API
- `fs` for file system handling
- JSON file storage for chat and profile
- Website code storage and dynamic generation

## 📚 What I Learned

- Working with **REST APIs** and handling async data flow
- Integration of **OpenAI's language model** for dynamic content creation
- **State management** and user interaction in React
- File generation and **dynamic file download** features in Node.js
- Persisting data using JSON and handling static assets like images
- Structuring a full-stack app with **modular routing and components**

## 🛠 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Isha2706/chatbot.git
cd chatbot
```

### 2. Setup Backend

```bash
cd chatbot-server
npm install
node sever.js
```

### 3. Setup Frontend

```bash
cd chatbot-ui
npm install
npm run dev
```

## 📦 Output Example

- **user-profile.json** → Collected personal/website data
- **chat-history.json** → All user and bot interactions
- **webSite/** → Generated HTML/CSS/JS files
- **webSite/upload/** → Uploaded media files
