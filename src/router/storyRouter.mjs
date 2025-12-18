import express from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middleware/authMiddleware.mjs";
import { upload } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();
const prisma = new PrismaClient();

// 스토리 생성
router.post(
  "/",
  verifyToken,
  upload.single("media"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).send("스토리 이미지나 영상을 업로드 해주세요.");
      }

      const newStory = await prisma.story.create({
        data: {
          mediaUrl: `/uploads/${req.file.filename}`,
          userId: req.user.id,
        },
      });
      res.status(201).json(newStory);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);
