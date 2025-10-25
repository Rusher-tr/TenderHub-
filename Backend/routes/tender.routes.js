// routes/tender.routes.js
import { Router } from "express";
import { 
  createTenderHandler,
  getUserTenders,
  getTenderDetails,
  updateTenderStatusHandler,
  getAllTendersHandler,
  getAvailableTenders
} from "../controllers/tender.controller.js";
import { authMiddleware } from '../fort/auth-middleware.js';
import { db } from '../fort/db-client.js';
import { z } from 'zod';

const router = Router();

// Protect all tender routes with JWT auth
router.use(authMiddleware);

// Buyer-only route for creating tenders
router.post("/", (req, res, next) => {
  if (req.user.role !== 'Buyer') {
    return res.status(403).json({ error: 'Only buyers can create tenders' });
  }
  next();
}, createTenderHandler);
router.get("/my-tenders", getUserTenders);
router.get("/available-tenders", getAvailableTenders);
router.get("/:tenderId", getTenderDetails);

// Validate status update payload
const UpdateStatusSchema = z.object({
  status: z.enum(['Pending Approval', 'Published', 'Rejected', 'Archived'])
});

// PATCH: Update tender status (admin only)
router.patch('/:tenderId/status', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "Admin") return res.status(403).json({ error: "Only administrators can update tender status" });
    
    const { tenderId } = req.params;
    
    // Validate request body
    let { status } = req.body;
    
    // Make sure status is a valid ENUM value
    const validStatuses = ['Draft', 'Pending Approval', 'Published', 'Rejected', 'Archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status value: ${status}. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    try {
      // Update tender status in database
      const [result] = await db.execute(
        "UPDATE Tender SET status = ? WHERE tender_id = ?",
        [status, tenderId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Tender not found" });
      }
      
      console.log(`Tender ${tenderId} status updated to ${status} successfully`);
      return res.json({ success: true, message: "Tender status updated successfully", status });
      
    } catch (dbError) {
      console.error("Database error updating tender status:", dbError);
      
      if (dbError.code === 'WARN_DATA_TRUNCATED') {
        return res.status(400).json({ 
          error: "Status value cannot be stored in the database. Check your database schema."
        });
      }
      
      throw dbError; // Re-throw for general handler
    }
  } catch (err) {
    console.error("Error updating tender status:", err);
    return res.status(500).json({ error: "Failed to update tender status: " + (err.message || "Unknown error") });
  }
});

// Admin-only route for getting all tenders
router.get("/admin/all-tenders", (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, getAllTendersHandler);

export default router;