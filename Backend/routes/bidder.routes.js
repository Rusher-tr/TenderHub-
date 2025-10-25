import { Router } from "express";
import { 
  createBidHandler,
  getUserBids,
  getTenderBids
} from "../controllers/bidder.controller.js";

const router = Router();

// Authentication middleware
router.use((req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
});

// Bidder-only routes
router.post("/", (req, res, next) => {
  if (req.user.role !== "Bidder") return res.status(403).json({ error: "Bidder access required" });
  next();
}, createBidHandler);

router.get("/my-bids", getUserBids);

// Public route (view bids for a tender)
router.get("/tender/:tenderId", getTenderBids);

export default router;