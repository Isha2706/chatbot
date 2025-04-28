import React, { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PortfolioPreview = () => {
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUpdated, setHasUpdated] = useState(false);

  // Initially load existing portfolio preview
  useEffect(() => {
    setPortfolioUrl(`${BASE_URL}/portfolio/index.html`);
  }, []);

  const handleUpdatePortfolio = async () => {
    setLoading(true);
    setHasUpdated(false);

    try {
      const response = await fetch(`${BASE_URL}/promptBackground`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to update portfolio");
      }

      // Wait to ensure files are saved before loading
      setTimeout(() => {
        const newUrl = `${BASE_URL}/portfolio/index.html?${Date.now()}`;
        setPortfolioUrl(newUrl); // refresh iframe
        setHasUpdated(true);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error updating portfolio:", error);
      setLoading(false);
    }
  };

  return (
    <div className="h-[530px]">
      <h2 className="text-xl font-bold mb-4">Portfolio Preview</h2>

      <button
        className="bg-purple-200 px-4 py-2 rounded shadow mb-4"
        onClick={handleUpdatePortfolio}
        disabled={loading}
      >
        {loading ? "Updating..." : "Update & Preview Portfolio"}
      </button>

      {/* Show loader while updating */}
      {loading ? (
        <div className="text-center mt-4 text-gray-600 animate-pulse">
          Generating your portfolio preview...
        </div>
      ) : (
        <iframe
          key={portfolioUrl} // force re-render when updated
          src={portfolioUrl}
          title="Portfolio Preview"
          className="w-full h-[85vh] border rounded"
        />
      )}
    </div>
  );
};

export default PortfolioPreview;
