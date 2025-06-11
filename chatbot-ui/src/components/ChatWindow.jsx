import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ImageUpload from "./ImageUpload";
import { SendHorizontal, ImageIcon, X } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      await axios.get(`${BASE_URL}/reset`);
      setMessages([]);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const adjustTextareaHeight = (textarea) => {
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  };

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
    adjustTextareaHeight(textareaRef.current);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const updatedMessages = [...messages, { sender: "user", text: userInput }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      setMessages([...updatedMessages, { sender: "bot", text: data.reply }]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally show error message to user
    } finally {
      setIsLoading(false);
      setUserInput("");
      adjustTextareaHeight(textareaRef.current);
    }
  };

  const handleImageMessage = ({ images, text }) => {
    setMessages((prev) => [...prev, { sender: "user", images, text }]);
    setShowUploader(false);
  };

  const MessageBubble = ({ message }) => (
    <div className={`inline-block m-2 max-w-[80%] ${
      message.sender === "user"
        ? "bg-blue-500 text-white rounded-l-xl rounded-tr-xl"
        : "bg-gray-100 rounded-r-xl rounded-tl-xl"
    } p-3 shadow-sm transition-all hover:shadow-md`}>
      {message.images?.map((img, i) => (
        <div key={i} className="mb-3">
          <img
            src={`${BASE_URL}${img.url}`}
            alt={`uploaded-${i}`}
            className="max-w-xs rounded-lg shadow-sm hover:shadow-md transition-all"
            loading="lazy"
          />
          {img.description && (
            <p className="text-sm mt-1 opacity-90">{img.description}</p>
          )}
        </div>
      ))}
      {message.text && <p className="break-words">{message.text}</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-1 p-4 overflow-hidden">
        <div className="chat-box h-full overflow-y-auto bg-white rounded-lg shadow-sm">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-2`}
            >
              <MessageBubble message={msg} />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white border-t">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end rounded-xl border bg-white p-2 shadow-sm">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={handleInputChange}
              rows={1}
              className="flex-grow p-2 focus:outline-none resize-none"
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button
              onClick={() => setShowUploader(!showUploader)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={showUploader ? "Close Uploader" : "Upload Image"}
            >
              {showUploader ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            <button
              onClick={sendMessage}
              disabled={isLoading}
              className={`p-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Send Message"
            >
              <SendHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {showUploader && (
        <div className="absolute bottom-24 right-8 bg-white rounded-xl shadow-lg border p-3">
          <ImageUpload onUploadComplete={handleImageMessage} />
        </div>
      )}
    </div>
  );
}

export default ChatWindow;