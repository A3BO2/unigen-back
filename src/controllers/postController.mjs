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