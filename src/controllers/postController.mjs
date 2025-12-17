// 포스트 관련 함수

import db from '../config/db.mjs';

export const createPost = async (req, res) => {
  try {
    const userId = 1; // 임시 ID
    const { content, imageUrl, isSeniorMode } = req.body;
    
    const sql = `INSERT INTO Posts (user_id, content, image_url, is_senior_mode, created_at) VALUES (?, ?, ?, ?, NOW())`;
    const params = [userId, content, imageUrl, isSeniorMode || false];
    
    const [result] = await db.query(sql, params);
    res.status(201).json({ message: "게시물 작성 성공", postId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

// controllers/reelController.js
export const getReel = async (req, res) => {
  try {
    const parsedLastId = Number.parseInt(req.query.lastId, 10);
    const lastId = Number.isFinite(parsedLastId) && parsedLastId > 0
      ? parsedLastId
      : Number.MAX_SAFE_INTEGER;

    const sql = `
      SELECT id, user_id, content, image_url, video_url, is_senior_mode, created_at
      FROM Posts
      WHERE post_type = ?
        AND id < ?
      ORDER BY id DESC
      LIMIT 1
    `;

    const [rows] = await db.query(sql, ['reel', lastId]);

    if (!rows.length) {
      return res.status(200).json({
        message: 'NO_MORE_REELS',
        reel: null,
        nextCursor: null
      });
    }

    const reel = rows[0];

    res.status(200).json({
      message: 'Reel fetched',
      reel,
      nextCursor: reel.id
    });
  } catch (error) {
    console.error('getReel error:', {
      error,
      lastId: req.query.lastId
    });
    res.status(500).json({ message: "Server error" });
  }
};
