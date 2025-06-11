import React, { useState, useRef, useEffect } from 'react';
import { Upload, ImageIcon, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast'; // Add this package for better error notifications

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ImageUpload({ onUploadComplete }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Clean up object URLs when component unmounts or when previews change
  useEffect(() => {
    return () => {
      // Revoke all object URLs to avoid memory leaks
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [userText]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Limit to 5 images maximum
      const totalImages = [...selectedImages, ...files].slice(0, 5);
      setSelectedImages(totalImages);
      
      // Create new previews and add to existing ones (up to 5)
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
      
      // Clear the input to allow selecting the same file again
      e.target.value = null;
    }
  };

  const removeImage = (index) => {
    // Remove the image and its preview
    URL.revokeObjectURL(previews[index]); // Clean up the URL
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleTextChange = (e) => {
    setUserText(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUpload();
    }
  };

  const handleUpload = async () => {
    // Allow upload with just text, no images required
    if (selectedImages.length === 0 && !userText.trim()) {
      setError("Please add an image or type a message");
      toast.error("Please add an image or type a message");
      return;
    }

    setError(""); // Clear any previous errors
    const formData = new FormData();
    
    selectedImages.forEach((img) => formData.append("images", img));
    formData.append("text", userText);

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();
      console.log("Upload success:", data);

      if (onUploadComplete) onUploadComplete(data);

      // Reset form
      setSelectedImages([]);
      setPreviews([]);
      setUserText("");
      toast.success("Upload successful!");
    } catch (err) {
      console.error("Upload failed:", err.message || err);
      setError("Upload failed. Please try again.");
      toast.error("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`Preview ${i}`}
                className="w-20 h-20 object-cover rounded border"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2 p-2 border-t border-gray-200 bg-white rounded-md shadow-sm">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Add images"
          disabled={loading || previews.length >= 5}
        >
          <ImageIcon className={`w-5 h-5 ${previews.length >= 5 ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          className="flex-1 resize-none border rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={1}
          placeholder="Type a message..."
          value={userText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
          title="Send message"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
        </button>
      </div>
      
      {previews.length > 0 && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {previews.length}/5 images
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
