import express from "express";
import {
  createStory,
  getStories,
  isMineStory,
  watchStory,
  getStoryViewers,
} from "../controllers/storyController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";
import { uploadToS3 } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/v1/stories:
 *   get:
 *     summary: 스토리 목록 조회
 *     description: 본인과 팔로우 중인 사용자의 24시간 이내 스토리를 조회합니다.
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 스토리 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoryListResponse'
 *       401:
 *         description: 인증 필요
 */
router.get("/", verifyToken, getStories);

/**
 * @swagger
 * /api/v1/stories:
 *   post:
 *     summary: 스토리 생성
 *     description: 새로운 스토리를 업로드합니다. 24시간 후 자동으로 만료됩니다.
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - media
 *             properties:
 *               media:
 *                 type: string
 *                 format: binary
 *                 description: 스토리 이미지/비디오 파일
 *     responses:
 *       201:
 *         description: 스토리 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 storyId:
 *                   type: integer
 *                 mediaUrl:
 *                   type: string
 *       400:
 *         description: 파일이 필요합니다
 *       401:
 *         description: 인증 필요
 */
router.post("/", verifyToken, uploadToS3.single("media"), createStory);

/**
 * @swagger
 * /api/v1/stories/ismine/{storyId}:
 *   get:
 *     summary: 내 스토리인지 확인
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 스토리 ID
 *     responses:
 *       200:
 *         description: 내 스토리 여부 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isMine:
 *                   type: boolean
 *       401:
 *         description: 인증 필요
 */
router.get("/ismine/:storyId", verifyToken, isMineStory);

/**
 * @swagger
 * /api/v1/stories/watch/{storyId}:
 *   post:
 *     summary: 스토리 시청 기록
 *     description: 스토리를 시청했음을 기록합니다. 중복 시청은 무시됩니다.
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 스토리 ID
 *     responses:
 *       200:
 *         description: 시청 기록 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 */
router.post("/watch/:storyId", verifyToken, watchStory);

/**
 * @swagger
 * /api/v1/stories/viewers/{storyId}:
 *   get:
 *     summary: 스토리 시청자 목록 조회
 *     description: 해당 스토리를 시청한 사용자 목록을 조회합니다.
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 스토리 ID
 *     responses:
 *       200:
 *         description: 시청자 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoryViewerResponse'
 *       401:
 *         description: 인증 필요
 */
router.get("/viewers/:storyId", verifyToken, getStoryViewers);

export default router;
