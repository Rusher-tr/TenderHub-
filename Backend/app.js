import express from "express";
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { env } from "./fort/env.js";
import { scheduleAutoArchiving } from "./utils/archive-tenders.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import tenderRoutes from "./routes/tender.routes.js";
import bidderRoutes from "./routes/bidder.routes.js";
import evaluatorRoutes from "./routes/evaluator.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import winnerRoutes from "./routes/winner.routes.js";

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT parsing middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        role: decoded.role
      };
    } catch (err) {
      console.error('?? Token verification failed:', err);
    }
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/bids", bidderRoutes);
app.use("/api/evaluations", evaluatorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/winners", winnerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('?? Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const server = app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  
  // Set up automated archiving of expired tenders
  // Run every hour (60 minutes)
  const archiveSchedule = scheduleAutoArchiving(60);
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    clearInterval(archiveSchedule);
    server.close(() => {
      console.log('Process terminated');
    });
  });
});
