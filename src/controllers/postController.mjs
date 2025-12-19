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

    const authorId = req.user.userId;

    if (!authorId) {
      return res
        .status(401)
        .json({ message: "로그인 정보가 유효하지 않습니다." });
    }

    const { content, postType, isSeniorMode } = req.body;

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

// https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
export const getFeed = async (req, res) => {
  try {
    const userId = req.user.userId;
    const mode = req.query.mode || "all";
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const all = req.query.all || "false";

    const offset = (page - 1) * size;
    const limit = size + 1; // hasNext 확인용으로 하나 더 가져오기

    let sql = `
      SELECT 
        p.id,
        p.content,
        p.image_url as imageUrl,
        p.post_type as postType,
        p.is_senior_mode as isSeniorMode,
        p.like_count as likeCount,
        p.comment_count as commentCount,
        p.created_at as createdAt,
        u.id as authorId,
        u.name as authorName,
        u.profile_image as authorProfileImageUrl
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      ${
        all === "false"
          ? "INNER JOIN user_follows uf ON uf.followee_id = ? AND uf.follower_id = u.id"
          : ""
      }
      WHERE p.deleted_at IS NULL AND p.post_type = 'feed'
    `;

    const params = [];

    if (all === "false") {
      params.push(userId);
    }

    if (mode === "senior") {
      // 시니어 모드일때 게시물
      sql += ` AND p.is_senior_mode = ?`;
      params.push(true);
    } else if (mode === "normal") {
      sql += ` AND p.is_senior_mode = ?`;
      params.push(false);
    }

    // page=2, size=10일 때 LIMIT 11 OFFSET 10 → 11번째부터 21번째 행까지 11개를 가져옴
    sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 구조분해 할당으로 실제 데이터 행만 추출
    const [rows] = await db.query(sql, params);

    // limit(size + 1 한 값, 즉 기존 size보다 하나 더 큰 값을 로드해서 size보다 하나 더 큰 값이 있으면 다음 페이지가 있다는 의미)
    // hasNext 확인
    const hasNext = rows.length > size;
    const items = rows.slice(0, size).map((row) => ({
      id: row.id,
      author: {
        id: row.authorId,
        name: row.authorName,
        profileImageUrl: row.authorProfileImageUrl,
      },
      content: row.content,
      imageUrl: row.imageUrl,
      postType: row.postType,
      isSeniorMode: Boolean(row.isSeniorMode),
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
    }));

    res.status(200).json({
      items,
      page,
      size,
      hasNext,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

// controllers/reelController.js
export const getReel = async (req, res) => {
  try {
    const parsedLastId = Number.parseInt(req.query.lastId, 10);
    const lastId =
      Number.isFinite(parsedLastId) && parsedLastId > 0
        ? parsedLastId
        : Number.MAX_SAFE_INTEGER;

    const sql = `
      SELECT id, author_id, content, image_url, video_url, is_senior_mode, created_at
      FROM posts
      WHERE post_type = ?
        AND id < ?
      ORDER BY id DESC
      LIMIT 1
    `;

    const [rows] = await db.query(sql, ["reel", lastId]);

    if (!rows.length) {
      return res.status(200).json({
        message: "NO_MORE_REELS",
        reel: null,
        nextCursor: null,
      });
    }

    const reel = rows[0];

    res.status(200).json({
      message: "Reel fetched",
      reel,
      nextCursor: reel.id,
    });
  } catch (error) {
    console.error("getReel error:", {
      error,
      lastId: req.query.lastId,
    });
    res.status(500).json({ message: "Server error" });
  }
};
