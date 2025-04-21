import React, { useState } from "react";
import ChatWindow from "./components/ChatWindow";
import ChatHistoryPanel from "./components/ChatHistoryPanel";
import UserProfilePanel from "./components/UserProfilePanel";
import PortfolioPreview from "./components/PortfolioPreview";
import PortfolioCode from "./components/PortfolioCode";
import "./App.css";

function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const togglePanel = (panel) => {
    setShowHistory(panel === "history" ? !showHistory : false);
    setShowProfile(panel === "profile" ? !showProfile : false);
    setShowPreview(panel === "preview" ? !showPreview : false);
    setShowCode(panel === "code" ? !showCode : false);
  };

  return (
    <div className="flex h-screen">
      <div className="p-4 flex-grow">
        <ChatWindow />
      </div>

      {showHistory && (
        <div className=" p-4 bg-white border-l overflow-y-auto">
          <ChatHistoryPanel />
        </div>
      )}

      {showProfile && (
        <div className=" p-4 bg-white border-l overflow-y-auto">
          <UserProfilePanel />
        </div>
      )}

      {showPreview && (
        <div className=" p-4 bg-white border-l overflow-y-auto">
          <PortfolioPreview />
        </div>
      )}

      {showCode && (
        <div className=" p-4 bg-white border-l overflow-y-auto">
          <PortfolioCode />
        </div>
      )}

      <div className="absolute top-0 right-0 flex gap-2 p-4">
        <button
          className="bg-indigo-200  px-4 py-2 rounded"
          onClick={() => togglePanel("history")}
        >
          {showHistory ? "Back to Chat" : "View JSON History"}
        </button>
        <button
          className="bg-green-200  px-4 py-2 rounded"
          onClick={() => togglePanel("profile")}
        >
          {showProfile ? "Back to Chat" : "View Profile"}
        </button>
        <button
          className="bg-purple-200  px-4 py-2 rounded"
          onClick={() => togglePanel("preview")}
        >
          {showPreview ? "Back to Chat" : "Preview"}
        </button>
        <button
          className="bg-blue-200  px-4 py-2 rounded"
          onClick={() => togglePanel("code")}
        >
          {showCode ? "Back to Chat" : "Code"}
        </button>
      </div>
    </div>
  );
}

export default App;
