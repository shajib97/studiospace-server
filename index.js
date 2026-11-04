require("dotenv").config();
const studioRoutes = require("./routes/studios");

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use("/api/studios", studioRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StudioSpace server is running",
  });
});

async function startServer() {
  try {
    const db = await connectDB();

    app.locals.db = db;

    app.listen(port, () => {
      console.log(`StudioSpace server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
