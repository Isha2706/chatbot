import React, { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Download, FileCode, Folder, Code } from "lucide-react";
import JSZip from "jszip";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FileSidebar = ({ files, selectedFile, setSelectedFile, handleDownloadAll, isLoading }) => {
  // Group files by extension for better organization
  const getFileIcon = (filename) => {
    if (filename.endsWith(".html")) return <FileCode className="w-4 h-4 text-orange-500" />;
    if (filename.endsWith(".css")) return <FileCode className="w-4 h-4 text-blue-500" />;
    if (filename.endsWith(".js")) return <FileCode className="w-4 h-4 text-yellow-500" />;
    return <FileCode className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="w-1/4 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-800">Files</h3>
          </div>
          <button
            onClick={handleDownloadAll}
            disabled={isLoading || files.length === 0}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-colors ${isLoading || files.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
            title="Download all files as ZIP"
          >
            <Download className="w-4 h-4" />
            <span>Download All</span>
          </button>
        </div>
      </div>

      <div className="p-2">
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {isLoading ? "Loading files..." : "No files available"}
          </div>
        ) : (
          <ul className="space-y-1">
            {files.map((filename) => (
              <li
                key={filename}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${selectedFile === filename ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
                onClick={() => setSelectedFile(filename)}
              >
                {getFileIcon(filename)}
                <span className="text-sm truncate">{filename}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const CodeHeader = ({ filename, onDownload, isLoading }) => (
  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
    <div className="flex items-center gap-2">
      <Code className="w-5 h-5 text-gray-600" />
      <h3 className="font-medium text-gray-800">{filename || "Select a file"}</h3>
    </div>
    <button
      onClick={onDownload}
      disabled={isLoading || !filename}
      className={`p-2 rounded-md transition-colors ${isLoading || !filename ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
      title="Download this file"
    >
      <Download className="w-5 h-5" />
    </button>
  </div>
);

function PortfolioCode() {
  const [codeFiles, setCodeFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCodeFiles = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`${BASE_URL}/get-webSite-code`);
        if (!res.ok) throw new Error(`Failed to fetch code: ${res.status}`);
        
        const data = await res.json();
        setCodeFiles(data);
        
        // Set the first file as selected if available
        const fileKeys = Object.keys(data);
        if (fileKeys.length > 0) {
          setSelectedFile(fileKeys[0]);
        }
      } catch (err) {
        console.error("Error fetching website code:", err);
        setError(err.message || "Failed to load code files");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCodeFiles();
  }, []);

  const getLanguage = (filename) => {
    if (!filename) return "plaintext";
    if (filename.endsWith(".js")) return "javascript";
    if (filename.endsWith(".css")) return "css";
    if (filename.endsWith(".html")) return "html";
    if (filename.endsWith(".json")) return "json";
    return "plaintext";
  };

  const handleDownloadFile = (filename) => {
    if (!filename || !codeFiles[filename]) return;
    
    const element = document.createElement("a");
    const file = new Blob([codeFiles[filename]], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadAll = () => {
    if (Object.keys(codeFiles).length === 0) return;
    
    const zip = new JSZip();
    Object.entries(codeFiles).forEach(([filename, content]) => {
      zip.file(filename, content);
    });
    
    zip.generateAsync({ type: "blob" }).then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "website-code.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-blue-800 flex items-center gap-2">
          <Code className="w-6 h-6" />
          Website Code
        </h2>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden rounded-lg shadow-md border border-gray-200 bg-white">
        <FileSidebar
          files={Object.keys(codeFiles)}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          handleDownloadAll={handleDownloadAll}
          isLoading={isLoading}
        />

        <div className="w-3/4 flex flex-col overflow-hidden">
          <CodeHeader
            filename={selectedFile}
            onDownload={() => handleDownloadFile(selectedFile)}
            isLoading={isLoading}
          />
          
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="animate-pulse text-gray-500">Loading code...</div>
            </div>
          ) : !selectedFile ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-gray-500">Select a file to view its code</div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language={getLanguage(selectedFile)}
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{ margin: 0, borderRadius: 0, height: '100%' }}
              >
                {codeFiles[selectedFile] || ''}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortfolioCode;
