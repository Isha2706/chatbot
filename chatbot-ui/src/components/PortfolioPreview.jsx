import React, { useState, useEffect } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PortfolioPreview = () => {
  const [portfolioUrl, setPortfolioUrl] = useState("");

  useEffect(() => {
    // Set portfolio preview path
    setPortfolioUrl(`${BASE_URL}/portfolio/index.html`);
  }, []);

  return (
    <div className="h-[530px] w-[900px]">
      <h2 className="text-xl font-bold mb-4">Portfolio Preview</h2>
      {portfolioUrl ? (
        <iframe
          src={portfolioUrl}
          title="Portfolio Preview"
          className="w-full h-[85vh] border rounded"
        />
      ) : (
        <p>Loading portfolio preview...</p>
      )}
    </div>
  );
};

export default PortfolioPreview;
