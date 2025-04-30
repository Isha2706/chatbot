import React, { useState } from 'react';
import { Upload, ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ImageUpload() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("image", image);

    try {
      const res = await fetch(`${BASE_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Uploaded image URL:", data.image);
      setSuccess(true);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-[100px]">
      <div className="flex items-center gap-2 mb-2">
        <label className="flex  items-center cursor-pointer  rounded-md hover:bg-gray-100 transition">
          <ImageIcon className="w-7 h-7 text-gray-600" />
          {/* <span className="text-xs text-gray-600 mt-1">Choose</span> */}
          <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
        </label>

        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-10 h-10 object-cover rounded"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleUpload}
          disabled={!image || loading}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            loading ? 'bg-gray-300' : 'bg-blue-200 hover:bg-blue-300'
          }`}
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
          Upload
        </button>

        {success && (
          <CheckCircle2 className="text-green-500 w-4 h-4" title="Upload Successful" />
        )}
      </div>
    </div>
  );
}

export default ImageUpload;
