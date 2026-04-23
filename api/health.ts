import express from "express";

const app = express();

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Direct health endpoint works!"
  });
});

export default app;
