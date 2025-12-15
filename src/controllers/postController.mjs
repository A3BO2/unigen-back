// 포스트 관련 함수

import db from "../config/db.mjs";
import sharp from "sharp"; // 이미지 처리 라이브러리
import fs from "fs/promises";
import path from "path";

// F004: 일반 게시물 작성
export const createPost = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "이미지 파일이 필요합니다." });
    }

    const { content, postType, isSeniorMode } = req.body;
    const authorId = 2; // 임시

    // 이미지 압축
    const originalFilePath = req.file.path;

    const optimizedFilename = `opt_${req.file.filename}`;
    const optimizedFilePath = path.join(
      req.file.destination,
      optimizedFilename
    );

    // sharp 실행(1080px로 리사이징, 품질 80%로 압축)
    await sharp(originalFilePath)
      .resize({ width: 1080 }) // sns 표준너비
      .withMetadata() // 사진의 방향 정보 유지
      .jpeg({ quality: 80 }) // 화질 80%로 압축
      .toFile(optimizedFilePath); // 저장

    await fs.unlink(originalFilePath); // 원본 파일 삭제

    const imageUrl = `/uploads/${optimizedFilename}`;

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
