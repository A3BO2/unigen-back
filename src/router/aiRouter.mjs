// ai 라우터
import express from "express";
import { refineTextWithAI } from "../controllers/aiController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/v1/ai/refine:
 *   post:
 *     summary: AI 텍스트 다듬기
 *     description: AI가 입력된 텍스트를 선택한 테마에 맞게 다듬어 게시물용 텍스트와 해시태그를 생성합니다.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefineTextRequest'
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: 다듬을 텍스트
 *               theme:
 *                 type: string
 *                 enum: [daily, greeting, family, thanks, memory, cheer, light, intro]
 *                 description: 테마
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 이미지 파일 (선택사항)
 *     responses:
 *       200:
 *         description: AI 텍스트 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefineTextResponse'
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: AI 처리 오류
 */
router.post("/refine", verifyToken, refineTextWithAI);

export default router;
