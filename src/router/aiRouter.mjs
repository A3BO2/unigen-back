// ai 라우터
import express from "express";
import { refineTextWithAI } from "../controllers/aiController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/refine", verifyToken, refineTextWithAI);

export default router;
