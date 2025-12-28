import express from "express";
import {
  createComment,
  deleteComment,
  getCommentsByPost,
} from "../controllers/commentController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/", verifyToken, createComment);
router.delete("/:commentId", verifyToken, deleteComment);
router.get("/post/:postId", getCommentsByPost);

export default router;
