import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeEvalInterface } from "./utils/eval";

// Initialize the evaluation interface for testing
initializeEvalInterface();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Health endpoint simulation (for Docker health checks)
export async function checkHealth() {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
  };
}
