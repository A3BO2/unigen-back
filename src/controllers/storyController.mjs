import db from "../config/db.mjs";
import { uploadToS3 } from "../utils/s3Client.mjs";
import path from "path";

// 스토리 목록 조회
export const getStories = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 24시간 이내 스토리만 조회하고, 본인 스토리 또는 팔로우 중인 사용자의 스토리만 필터링
    const [rows] = await db.query(
      `
      SELECT 
        s.id AS storyId,
        s.user_id AS userId,
        s.media_url AS mediaUrl,
        s.created_at AS createdAt,
        u.name AS userName,
        u.profile_image AS profileImage
      FROM stories s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND (
          s.user_id = ? 
          OR EXISTS (
            SELECT 1 FROM user_follows uf 
            WHERE uf.follower_id = ? AND uf.followee_id = s.user_id
          )
        )
      ORDER BY s.id ASC
      LIMIT 100
      `,
      [userId, userId]
    );

    // 사용자별로 묶어서 프론트 기대 형식으로 변환
    const grouped = new Map();
    rows.forEach((row) => {
      if (!grouped.has(row.userId)) {
        grouped.set(row.userId, {
          userId: row.userId,
          author: {
            name: row.userName || "알 수 없음",
            profileImageUrl: row.profileImage || null,
          },
          items: [],
        });
      }
      const item = {
        id: row.storyId,
        imageUrl: row.mediaUrl,
        createdAt: row.createdAt,
      };
      grouped.get(row.userId).items.push(item);
    });

    // 각 사용자의 스토리 아이템을 ID 오름차순으로 정렬 (ID가 작은 것부터)
    grouped.forEach((story) => {
      story.items.sort((a, b) => a.id - b.id);
    });

    // 전체 스토리 목록을 각 사용자의 마지막 스토리 시간 기준으로 정렬 (최신 것부터)
    const storiesArray = Array.from(grouped.values());
    storiesArray.sort((a, b) => {
      // 각 사용자의 마지막 스토리 시간 비교 (가장 최근에 올린 스토리)
      const aLastStory = a.items[a.items.length - 1];
      const bLastStory = b.items[b.items.length - 1];

      if (!aLastStory || !bLastStory) return 0;

      // 마지막 스토리의 createdAt 기준으로 내림차순 정렬 (최신 것부터)
      const aTime = new Date(aLastStory.createdAt).getTime();
      const bTime = new Date(bLastStory.createdAt).getTime();
      return bTime - aTime;
    });

    res.status(200).json({
      success: true,
      stories: storiesArray,
    });
  } catch (error) {
    console.error("스토리 조회 오류:", error);
    res.status(500).json({ success: false, message: "스토리 조회 실패" });
  }
};

// 스토리 생성
export const createStory = async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "스토리 이미지가 필요합니다." });
    }

    // 트랜잭션 시작
    await connection.beginTransaction();

    const userId = req.user.userId;

    // S3에 업로드
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(req.file.originalname);
    const s3FileName = `stories/${uniqueSuffix}${fileExtension}`;

    // 파일 타입 결정
    const contentType = req.file.mimetype || "image/jpeg";

    // S3에 업로드
    const mediaUrl = await uploadToS3(req.file.buffer, s3FileName, contentType);

    const sql = `
        INSERT INTO stories (user_id, media_url, created_at) VALUES (?, ?, NOW())
        `;

    const [result] = await connection.execute(sql, [userId, mediaUrl]);

    // 성공 시 커밋
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "스토리 업로드 성공",
      storyId: result.insertId,
      mediaUrl: mediaUrl,
    });
  } catch (error) {
    // 실패 시 롤백
    await connection.rollback();
    console.error("스토리 업로드 오류:", error);
    res.status(500).json({ message: "서버 오류" });
  } finally {
    // 커넥션 반납
    connection.release();
  }
};

export const watchStory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const storyId = req.params.storyId;

    const [existing] = await db.execute(
      `SELECT id FROM story_views WHERE story_id = ? AND viewer_id = ?`,
      [storyId, userId]
    );

    if (existing.length > 0) {
      return res
        .status(200)
        .json({ success: true, message: "이미 시청한 스토리" });
    }

    const sql = `
      INSERT INTO story_views (story_id, viewer_id, viewed_at)
      VALUES (?, ?, NOW())`;

    await db.execute(sql, [storyId, userId]);

    res
      .status(200)
      .json({ success: true, message: "스토리 시청 기록 저장 완료" });
  } catch (error) {
    console.error("스토리 시청 기록 저장 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
};

export const getStoryViewers = async (req, res) => {
  try {
    const storyId = req.params.storyId;

    const sql = `
      SELECT u.id AS userId, u.name AS userName, u.profile_image AS profileImage, sv.viewed_at AS viewedAt
      FROM story_views sv
      JOIN users u ON sv.viewer_id = u.id
      WHERE sv.story_id = ? AND u.id != ?
      ORDER BY sv.viewed_at DESC
    `;
    const [rows] = await db.execute(sql, [storyId, req.user.userId]);
    res.status(200).json({
      success: true,
      viewers: rows.map((row) => ({
        userId: row.userId,
        userName: row.userName || "알 수 없음",
        profileImageUrl: row.profileImage || null,
        viewedAt: row.viewedAt,
      })),
    });
  } catch (error) {
    console.error("스토리 시청자 조회 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
};

export const isMineStory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const storyId = req.params.storyId;

    const [rows] = await db.execute(
      `SELECT id FROM stories WHERE id = ? AND user_id = ?`,
      [storyId, userId]
    );

    const isMine = rows.length > 0;

    res.status(200).json({ success: true, isMine });
  } catch (error) {
    console.error("스토리 소유권 확인 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
};
