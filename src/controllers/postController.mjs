// 포스트 관련 함수

import db from "../config/db.mjs";
import sharp from "sharp"; // 이미지 처리 라이브러리
import fs from "fs/promises";
import path from "path";

// F004: 일반 게시물 작성
export const createPost = async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "최소 1장의 파일이 필요합니다." });
    }
    // 트랜잭션 시작
    await connection.beginTransaction();

    const { content, postType, isSeniorMode } = req.body;
    const authorId = 2; // 임시

    const sql = `INSERT INTO posts 
      (author_id, content, post_type, is_senior_mode) 
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await connection.execute(sql, [
      authorId,
      content,
      postType || "feed",
      isSeniorMode === "true" ? 1 : 0,
    ]);

    const newPostId = result.insertId;

    // 이미지 반복 처리
    const imagePromises = req.files.map(async (file, index) => {
      // 이미지 압축
      const originalFilePath = file.path;
      const optimizedFilename = `opt_${file.filename}`;
      const optimizedFilePath = path.join(file.destination, optimizedFilename);
      const dbImageUrl = `/uploads/${optimizedFilename}`;

      await sharp(originalFilePath)
        .resize({ width: 1080 })
        .jpeg({ quality: 80 })
        .toFile(optimizedFilePath);

      // 원본 삭제
      await fs.unlink(originalFilePath);

      // db 저장 쿼리
      await connection.execute(
        `INSERT INTO post_images (post_id, image_url, sort_order) VALUES (?, ?, ?)`,
        [newPostId, dbImageUrl, index]
      );

      return dbImageUrl;
    });

    const savedImageUrls = await Promise.all(imagePromises);

    // posts 테이블의 대표 이미지 업데이트(첫 번째 사진)
    if (savedImageUrls.length > 0) {
      await connection.execute(`UPDATE posts SET image_url = ? WHERE id = ?`, [
        savedImageUrls[0],
        newPostId,
      ]);
    }

    await connection.commit();

    res.status(201).json({
      message: "게시글 등록 성공",
      postId: newPostId,
      images: savedImageUrls,
    });
  } catch (error) {
    // 에러 시 롤백
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  } finally {
    connection.release();
  }
};
