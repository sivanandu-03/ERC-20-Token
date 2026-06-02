import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist directory
app.use(express.static(join(__dirname, "../dist")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// API endpoint for contract addresses (optional)
app.get("/api/config", (req, res) => {
  res.json({
    rpcUrl: process.env.VITE_RPC_URL || "",
    tokenAddress: process.env.VITE_TOKEN_ADDRESS || "",
    faucetAddress: process.env.VITE_FAUCET_ADDRESS || "",
  });
});

// Serve index.html for all other routes (SPA routing)
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Frontend server running on http://localhost:${PORT}`);
  console.log(`📋 Health endpoint: http://localhost:${PORT}/health`);
});
