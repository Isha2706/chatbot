import React, { useState, useEffect, useRef} from 'react';
import axios from 'axios';
import '../App.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Clear chat history on page refresh
    axios.get(`${BASE_URL}/reset`).then(() => {
      setChat([]);
    });
  }, []);

  useEffect(() => {
    // Auto scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const newMessages = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);

    // Send to backend
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    });
    
    const data = await res.json();

    // Add bot reply to chat
    setMessages([...newMessages, { sender: 'bot', text: data.reply }]);
    setInput('');
  };

  return (
    <div className="p-4 min-h-full mx-auto ">
      <div className="chat-box bg-slate-100 p-1 rounded shadow h-[470px] text-md overflow-y-auto mb-5">
        {messages.map((msg, index) => (
          <div key={index} className={msg.sender === 'user' ? 'text-right' : 'text-left'}>
                   <p className={`p-4 inline-block m-2 max-w-[80%] ${msg.sender === 'user' ? 'bg-green-200 rounded-l-xl' : 'bg-indigo-200 rounded-r-xl'}`}>{msg.text}</p>
          </div>
        ))}
          <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow border p-2 rounded-l-xl"
          placeholder="Type your message"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-200 p-2 rounded-r-xl hover:bg-blue-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;



