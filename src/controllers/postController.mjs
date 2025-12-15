// 포스트 관련 함수

import db from "../config/db.mjs";

export const createPost = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "이미지 파일이 필요합니다." });
    }

    const { content, postType, isSeniorMode } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    const authorId = 2; // 임시

    const sql = `INSERT INTO posts (author_id, content, image_url, post_type, is_senior_mode) VALUES (?, ?, ?, ?, ?)`;
    const params = [authorId, content, imageUrl, isSeniorMode || false];

    const [result] = await db.execute(sql, [
      authorId,
      content,
      imageUrl,
      postType || "feed",
      isSeniorMode === "true" ? 1 : 0, // 'true' 문자열을 1/0으로 변환
    ]);
    res
      .status(201)
      .json({ message: "게시물 작성 성공", postId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};
