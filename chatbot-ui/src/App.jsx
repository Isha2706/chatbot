import React, { useState } from "react";
import ChatWindow from "./components/ChatWindow";
import ChatHistoryPanel from "./components/ChatHistoryPanel";
import UserProfilePanel from "./components/UserProfilePanel";
import "./App.css";

function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const togglePanel = (panel) => {
    setShowHistory(panel === "history" ? !showHistory : false);
    setShowProfile(panel === "profile" ? !showProfile : false);
  };

  return (
    <div className="flex h-screen ">
      <div className="p-4">
        <ChatWindow />
      </div>

      {showHistory && (
        <div className="p-4 bg-gray-100 border-l overflow-y-auto">
          <ChatHistoryPanel />
        </div>
      )}

      {showProfile && (
        <div className="p-4 bg-gray-100 border-l overflow-y-auto">
          <UserProfilePanel />
        </div>
      )}

      <div className="absolute top-0 right-0 space-x-2">
        <button
          className="bg-green-500 px-4 py-2 rounded"
          onClick={() => togglePanel("history")}
        >
          {showHistory ? "Back to Chat" : "View JSON History"}
        </button>
        <button
          className=" bg-green-500 px-4 py-2 rounded"
          onClick={() => {
            setShowProfile(!showProfile);
            setShowHistory(false);
          }}
        >
          {showProfile ? "Back to Chat" : "View Profile"}
        </button>
      </div>
    </div>
  );
}

export default App;
