import express from "express";
import {
  createComment,
  deleteComment,
  getCommentsByPost,
} from "../controllers/commentController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/v1/comments:
 *   post:
 *     summary: 댓글 작성
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       201:
 *         description: 댓글 작성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 comment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 댓글 ID
 *                     postId:
 *                       type: integer
 *                       description: 게시물 ID
 *                     userId:
 *                       type: integer
 *                       description: 작성자 ID
 *                     text:
 *                       type: string
 *                       description: 댓글 내용
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 작성 시간
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 게시물 없음
 */
router.post("/", verifyToken, createComment);

/**
 * @swagger
 * /api/v1/comments/{commentId}:
 *   delete:
 *     summary: 댓글 삭제
 *     description: 본인이 작성한 댓글만 삭제할 수 있습니다. (Soft Delete)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 댓글 ID
 *     responses:
 *       200:
 *         description: 댓글 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음 (본인 댓글 아님)
 *       404:
 *         description: 댓글 없음
 */
router.delete("/:commentId", verifyToken, deleteComment);

/**
 * @swagger
 * /api/v1/comments/post/{postId}:
 *   get:
 *     summary: 게시물의 댓글 목록 조회
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 댓글 수
 *     responses:
 *       200:
 *         description: 댓글 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentListResponse'
 *       404:
 *         description: 게시물 없음
 */
router.get("/post/:postId", getCommentsByPost);

export default router;
