import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import '../App.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ChatHistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await axios.get(`${BASE_URL}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load chat history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-indigo-800">Chat History</h2>
        <button 
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2 rounded-full hover:bg-indigo-100 transition-colors"
          title="Refresh history"
        >
          <RefreshCw 
            className={`w-5 h-5 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isLoading && !error ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-indigo-600">Loading history...</div>
        </div>
      ) : (
        <div className="flex-grow overflow-hidden rounded-lg shadow-sm border border-indigo-100">
          <pre className="bg-white p-4 h-full overflow-auto text-gray-800 font-mono text-sm">
            {JSON.stringify(history, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ChatHistoryPanel;