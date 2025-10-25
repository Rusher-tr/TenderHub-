// routes/winner.routes.js
import express from "express";
import { selectWinningBidHandler, getAllWinnersHandler, getTenderWinnerHandler } from "../controllers/winner.controller.js";

const router = express.Router();

// POST /api/winners - Select a winning bid
router.post("/", selectWinningBidHandler);

// GET /api/winners - Get all winners (admin only)
router.get("/", getAllWinnersHandler);

// GET /api/winners/tender/:tenderId - Get winner for specific tender
router.get("/tender/:tenderId", getTenderWinnerHandler);

export default router;
