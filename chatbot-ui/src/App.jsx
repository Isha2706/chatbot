import React, { useState, useRef, useCallback } from "react";
import { MoreHorizontal, X } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import ChatHistoryPanel from "./components/ChatHistoryPanel";
import UserProfilePanel from "./components/UserProfilePanel";
import PortfolioPreview from "./components/PortfolioPreview";
import PortfolioCode from "./components/PortfolioCode";
import "./App.css";

const PANELS = {
  history: { component: ChatHistoryPanel, label: "View JSON History", color: "indigo" },
  profile: { component: UserProfilePanel, label: "View Profile", color: "green" },
  preview: { component: PortfolioPreview, label: "Preview", color: "purple" },
  code: { component: PortfolioCode, label: "Code", color: "blue" },
};

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const togglePanel = useCallback((panelName) => {
    setActivePanel(current => current === panelName ? null : panelName);
    setMenuOpen(false);
  }, []);

  const isPanelActive = Boolean(activePanel);

  return (
    <div className="flex max-h-screen bg-gray-50">
      <div 
        className={`flex-grow transition-all duration-300 ${
          isPanelActive ? 'w-1/3' : 'mx-auto max-w-5xl w-full'
        }`}
      >
        <ChatWindow />
      </div>

      {activePanel && (
        <div className="w-2/3 bg-white border-l shadow-lg overflow-y-auto transition-transform duration-300 ease-in-out transform translate-x-0">
          <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
            {/* <h2 className="text-xl font-semibold text-gray-800">
              {PANELS[activePanel].label}
            </h2> */}
            <button
              onClick={() => setActivePanel(null)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="p-4">
            {React.createElement(PANELS[activePanel].component)}
          </div>
        </div>
      )}

      <div className="fixed top-4 right-4 z-50">
        <button
          ref={buttonRef}
          className="p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200"
          onClick={() => setMenuOpen(prev => !prev)}
        >
          <MoreHorizontal className="w-6 h-6 text-gray-700" />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute top-0 right-12 bg-white rounded-lg shadow-xl flex flex-col gap-1 p-1 min-w-[200px] transform transition-all duration-200 ease-in-out"
          >
            {Object.entries(PANELS).map(([key, { label, color }]) => (
              <button
                key={key}
                onClick={() => togglePanel(key)}
                className={`
                  px-4 py-2 rounded-lg text-left transition-all duration-200
                  hover:bg-${color}-50 hover:text-${color}-700
                  flex items-center justify-between
                  ${activePanel === key ? `bg-${color}-100 text-${color}-700` : 'text-gray-700'}
                `}
              >
                <span>{activePanel === key ? "Back to Chat" : label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;