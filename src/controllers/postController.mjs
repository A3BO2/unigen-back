// 포스트 관련 함수

import db from "../config/db.mjs";
import sharp from "sharp"; // 이미지 처리 라이브러리
import fs from "fs/promises";
import path from "path";
import { uploadToS3 } from "../utils/s3Client.mjs";
import { getRelativeTime } from "../utils/dateUtils.mjs";

// 영상 용량 압축 모듈
import ffmpeg from "fluent-ffmpeg";
import ffmeginstaller from "@ffmpeg-installer/ffmpeg";
ffmpeg.setFfmpegPath(ffmeginstaller.path);

export const createThumbnailAndUpload = async (videoPath) => {
  const thumbnailName = `thumb_${Date.now()}.jpg`;
  const localThumbnailPath = path.join("uploads", thumbnailName);

  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ["00:00:01"],
        filename: thumbnailName,
        folder: "uploads",
        size: "480x?",
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const thumbBuffer = await fs.readFile(localThumbnailPath);

  const thumbnailUrl = await uploadToS3(
    thumbBuffer,
    `posts/reels/thumbnails/${thumbnailName}`,
    "image/jpeg"
  );

  await fs.unlink(localThumbnailPath).catch(() => {});

  return thumbnailUrl;
};

// F004: 일반 피드 작성
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

    let savedImageUrls = [];
    let savedVideoUrl = null;
    // 피드 or 릴스 분기 처리
    if (postType === "reel") {
      const file = req.files[0];

      // 메모리 스토리지 사용 시 file.buffer를 임시 파일로 저장하거나 디스크 스토리지 지원
      let originalFilePath, compressedFilePath, compressedFilename;
      if (file.buffer) {
        // 메모리 스토리지: 버퍼를 임시 파일로 저장
        const uploadDir = path.join(process.cwd(), "uploads");
        await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
        const originalFilename = `temp_${Date.now()}_${Math.round(
          Math.random() * 1e9
        )}.mp4`;
        originalFilePath = path.join(uploadDir, originalFilename);
        await fs.writeFile(originalFilePath, file.buffer);

        // 원본 파일 크기 로그
        const originalStats = await fs.stat(originalFilePath);
        console.log(
          `📹 [동영상 압축] 원본 크기: ${(
            originalStats.size /
            1024 /
            1024
          ).toFixed(2)}MB`
        );

        compressedFilename = `comp_${Date.now()}_${Math.round(
          Math.random() * 1e9
        )}.mp4`;
        compressedFilePath = path.join(uploadDir, compressedFilename);
      } else {
        // 디스크 스토리지: 경로와 파일명 활용
        originalFilePath = file.path;

        // 원본 파일 크기 로그
        const originalStats = await fs.stat(originalFilePath);
        console.log(
          `📹 [동영상 압축] 원본 크기: ${(
            originalStats.size /
            1024 /
            1024
          ).toFixed(2)}MB`
        );

        const outputDir = file.destination || path.dirname(originalFilePath);
        compressedFilename = `comp_${file.filename || Date.now()}.mp4`;
        compressedFilePath = path.join(outputDir, compressedFilename);
      }

      await new Promise((resolve, reject) => {
        ffmpeg(originalFilePath)
          .videoCodec("libx264") // 가장 호환성 좋은 코덱
          .size("720x?") // 너비 720p로 리사이징 (높이는 자동)
          .videoBitrate("1000k") // 비트레이트 1000k (화질/용량 타협점)
          .audioCodec("aac") // 오디오 코덱
          .audioBitrate("128k") // 오디오 음질
          .outputOptions("-preset fast") // 속도 우선 (veryfast, fast, medium)
          .on("end", async () => {
            // 압축 후 파일 크기 로그
            const compressedStats = await fs.stat(compressedFilePath);
            const compressedSizeMB = (
              compressedStats.size /
              1024 /
              1024
            ).toFixed(2);
            console.log(`✅ [동영상 압축] 압축 완료: ${compressedSizeMB}MB`);
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ [동영상 압축] 에러:", err);
            reject(err);
          })
          .save(compressedFilePath); // 저장 시작
      });

      // 압축된 파일을 읽어서 s3에 업로드
      const videoBuffer = await fs.readFile(compressedFilePath);
      const uploadSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`☁️ [S3 업로드] 최종 업로드 크기: ${uploadSizeMB}MB`);

      savedVideoUrl = await uploadToS3(
        videoBuffer,
        `posts/reels/${compressedFilename}`,
        "video/mp4"
      );

      // ⭐⭐⭐ 여기서 썸네일 생성
      const thumbnailUrl = await createThumbnailAndUpload(compressedFilePath);

      // DB 업데이트
      await connection.execute(
        "UPDATE posts SET video_url = ?, image_url = ? WHERE id = ?",
        [savedVideoUrl, thumbnailUrl, newPostId]
      );

      await fs.unlink(originalFilePath).catch(() => {}); // 압축 성공 시 원본 삭제
      await fs.unlink(compressedFilePath).catch(() => {}); // 압축본 삭제
    }
    // 일반 피드 처리
    else {
      // 이미지 반복 처리 (메모리 or 디스크 스토리지 모두 지원)
      const imagePromises = req.files.map(async (file, index) => {
        const s3FileName = `posts/images/${Date.now()}_${index}.jpg`;
        let imageBuffer;

        if (file.buffer) {
          // 메모리 스토리지: 버퍼에서 압축
          imageBuffer = await sharp(file.buffer)
            .resize({ width: 1080 })
            .jpeg({ quality: 80 })
            .toBuffer();
        } else {
          // 디스크 스토리지: 파일 경로에서 압축
          imageBuffer = await sharp(file.path)
            .resize({ width: 1080 })
            .jpeg({ quality: 80 })
            .toBuffer();
        }

        // s3 업로드
        const s3Url = await uploadToS3(imageBuffer, s3FileName, "image/jpeg");

        // 파일이 디스크에 있다면 삭제
        if (file.path) {
          await fs.unlink(file.path).catch(() => {});
        }

        // db 저장 쿼리
        await connection.execute(
          `INSERT INTO post_images (post_id, image_url, sort_order) VALUES (?, ?, ?)`,
          [newPostId, s3Url, index]
        );

        return s3Url;
      });

      savedImageUrls = await Promise.all(imagePromises);

      // posts 테이블의 대표 이미지 업데이트(첫 번째 사진)
      if (savedImageUrls.length > 0) {
        await connection.execute(
          `UPDATE posts SET image_url = ? WHERE id = ?`,
          [savedImageUrls[0], newPostId]
        );
      }
    }
    await connection.commit();

    res.status(201).json({
      message: "게시글 등록 성공",
      postId: newPostId,
      images: savedImageUrls,
      video: savedVideoUrl,
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

// 피드 수정
export const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.user.userId;

    const [rows] = await db.query(
      "SELECT author_id FROM posts WHERE id = ? AND deleted_at IS NULL",
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다" });
    }

    if (rows[0].author_id !== userId) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    await db.query(
      "UPDATE posts SET content = ?, updated_at = NOW() WHERE id = ?",
      [content, postId]
    );
    res.status(200).json({ message: "게시물이 수정되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const [rows] = await db.query(
      "SELECT author_id FROM posts WHERE id = ? AND deleted_at IS NULL",
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    if (rows[0].author_id !== userId) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    await db.query("UPDATE posts SET deleted_at = NOW() WHERE id = ?", [
      postId,
    ]);

    res.status(200).json({ message: "게시물이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
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

    // posts 테이블의 모든 튜플의 comment_count 업데이트
    await db.query(`
      UPDATE posts p
      SET comment_count = (
        SELECT COUNT(*) 
        FROM comments c 
        WHERE c.post_id = p.id AND c.deleted_at IS NULL
      )
      WHERE p.deleted_at IS NULL
    `);

    const offset = (page - 1) * size;
    const limit = size + 1; // hasNext 확인용으로 하나 더 가져오기

    let sql;
    const params = [];

    if (all === "false") {
      // UNION으로 본인 게시물 + 팔로우한 사람 게시물
      // is_senior_mode 필터링 제거: 일반 모드와 시니어 모드 게시물 모두 표시

      sql = `
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
          u.username as authorName,
          u.profile_image as authorProfileImageUrl
        FROM posts p
        INNER JOIN users u ON p.author_id = u.id
        WHERE p.deleted_at IS NULL 
          AND p.post_type = 'feed'
          AND p.author_id = ?
        
        UNION
        
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
          u.username as authorName,
          u.profile_image as authorProfileImageUrl
        FROM posts p
        INNER JOIN users u ON p.author_id = u.id
        INNER JOIN user_follows uf ON uf.follower_id = ? AND uf.followee_id = p.author_id
        WHERE p.deleted_at IS NULL 
          AND p.post_type = 'feed'
        
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `;

      params.push(userId, userId, limit, offset);
    } else {
      // 모든 게시물 조회
      // is_senior_mode 필터링 제거: 일반 모드와 시니어 모드 게시물 모두 표시
      sql = `
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
          u.username as authorName,
          u.profile_image as authorProfileImageUrl
        FROM posts p
        INNER JOIN users u ON p.author_id = u.id
        WHERE p.deleted_at IS NULL AND p.post_type = 'feed'
        ORDER BY p.created_at DESC LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
    }

    // 구조분해 할당으로 실제 데이터 행만 추출
    const [rows] = await db.query(sql, params);

    // limit(size + 1 한 값, 즉 기존 size보다 하나 더 큰 값을 로드해서 size보다 하나 더 큰 값이 있으면 다음 페이지가 있다는 의미)
    // hasNext 확인
    const hasNext = rows.length > size;
    const items = rows.slice(0, size).map((row) => ({
      id: row.id,
      author: {
        id: row.authorId,
        username: row.authorName,
        profileImageUrl: row.authorProfileImageUrl,
      },
      content: row.content,
      imageUrl: row.imageUrl,
      postType: row.postType,
      isSeniorMode: Boolean(row.isSeniorMode),
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      timestamp: getRelativeTime(row.createdAt),
    }));

    res.status(200).json({
      items: items,
      page,
      size,
      hasNext: hasNext,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

// controllers/reelController.js
// 모든 사용자의 릴스를 가져옴 (팔로우 여부와 관계없이)
export const getReel = async (req, res) => {
  try {
    const userId = req.user?.userId || null; // 로그인한 사용자 ID (없을 수 있음)
    const startId = req.query.startId ? parseInt(req.query.startId, 10) : null;
    const lastCreatedAt = req.query.lastCreatedAt
      ? new Date(req.query.lastCreatedAt)
      : null;

    // startId가 있고 lastCreatedAt이 없으면 (첫 요청) 해당 릴스를 먼저 가져오기
    if (startId && !lastCreatedAt) {
      const startSql = `
        SELECT 
          p.id, 
          p.author_id, 
          p.content, 
          p.image_url, 
          p.video_url, 
          p.is_senior_mode, 
          p.created_at, 
          p.like_count, 
          p.comment_count,
          u.username AS authorName,
          u.profile_image AS authorProfile,
          ${userId ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked` : `0 AS is_liked`}
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.post_type = 'reel'
          AND p.id = ?
          AND p.deleted_at IS NULL
        LIMIT 1
      `;

      const [startRows] = await db.query(startSql, userId ? [userId, startId] : [startId]);

      if (startRows.length) {
        const reel = startRows[0];
        return res.status(200).json({
          message: "Reel fetched",
          reel,
          nextCursor: reel.created_at, // 다음 요청을 위한 커서
        });
      }
      // startId로 릴스를 찾지 못하면 기존 로직으로 진행
    }

    // 기존 로직: lastCreatedAt 기준으로 다음 릴스 가져오기
    const baseCreatedAt = lastCreatedAt || new Date(); // lastCreatedAt이 없으면 현재 시간

    const sql = `
      SELECT 
        p.id, 
        p.author_id, 
        p.content, 
        p.image_url, 
        p.video_url, 
        p.is_senior_mode, 
        p.created_at, 
        p.like_count, 
        p.comment_count,
        u.username AS authorName,
        u.profile_image AS authorProfile,
        ${userId ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked` : `0 AS is_liked`}
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.post_type = 'reel'
        AND p.created_at < ?
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT 1
    `;

    const [rows] = await db.query(sql, userId ? [userId, baseCreatedAt] : [baseCreatedAt]);

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
      nextCursor: reel.created_at, // ✅ 핵심
    });
  } catch (error) {
    console.error("getReel error:", {
      error,
      lastCreatedAt: req.query.lastCreatedAt,
      startId: req.query.startId,
    });
    res.status(500).json({ message: "Server error" });
  }
};

  

export const getStory = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const sql = `
      SELECT 
        p.id,
        p.image_url as imageUrl,
        p.created_at as createdAt,
        u.id as authorId,
        u.username as authorName,
        u.profile_image as authorProfileImageUrl
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      WHERE p.deleted_at IS NULL 
        AND p.post_type = 'story'
        AND p.author_id = ?
      
      UNION ALL
      
      SELECT 
        p.id,
        p.image_url as imageUrl,
        p.created_at as createdAt,
        u.id as authorId,
        u.username as authorName,
        u.profile_image as authorProfileImageUrl
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      INNER JOIN user_follows uf ON uf.follower_id = ? AND uf.followee_id = p.author_id
      WHERE p.deleted_at IS NULL 
        AND p.post_type = 'story'
      ORDER BY createdAt DESC
    `;

    const [rows] = await db.query(sql, [userId, userId]);

    // 사용자별로 스토리를 그룹화
    const storiesByUser = rows.reduce((acc, row) => {
      const authorId = row.authorId;
      if (!acc[authorId]) {
        acc[authorId] = {
          userId: authorId,
          author: {
            username: row.authorName,
            profileImageUrl: row.authorProfileImageUrl,
          },
          items: [],
        };
      }
      acc[authorId].items.push({
        id: row.id,
        imageUrl: row.imageUrl,
        createdAt: row.createdAt,
        timestamp: getRelativeTime(row.createdAt),
      });
      return acc;
    }, {});

    // 객체를 배열로 변환
    const stories = Object.values(storiesByUser);

    res.status(200).json({
      message: "스토리 조회 성공",
      stories,
    });
  } catch (error) {
    console.error("getStory error:", {
      error,
      userId: req.user?.userId,
    });
    res.status(500).json({ message: "Server error" });
  }
};

// 단일 게시물 조회
export const getPostById = async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user?.userId;

    if (Number.isNaN(postId) || postId <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 게시물 ID가 필요합니다." });
    }

    // 게시물 조회
    const sql = `
      SELECT 
        p.id,
        p.content,
        p.image_url as imageUrl,
        p.video_url as videoUrl,
        p.like_count as likeCount,
        p.comment_count as commentCount,
        p.created_at as createdAt,
        u.id as authorId,
        u.username as authorName,
        u.profile_image as authorProfileImageUrl,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `;

    const [rows] = await db.query(sql, [userId || 0, postId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    const post = rows[0];

    // 댓글 가져오기
    const commentsSql = `
      SELECT 
        c.id,
        c.content as text,
        c.created_at as createdAt,
        u.id as userId,
        u.username as userName,
        u.profile_image as userAvatar
      FROM comments c
      INNER JOIN users u ON c.author_id = u.id
      WHERE c.post_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;

    const [commentsRows] = await db.query(commentsSql, [postId]);

    const comments = commentsRows.map((comment) => ({
      id: comment.id,
      user: {
        name: comment.userName,
        avatar: comment.userAvatar,
      },
      text: comment.text,
      time: getRelativeTime(comment.createdAt),
    }));

    // 응답 데이터 구조
    const response = {
      id: post.id,
      user: {
        username: post.authorName,
        avatar: post.authorProfileImageUrl,
      },
      content: post.content,
      photo: post.imageUrl,
      video: post.videoUrl,
      likes: post.likeCount,
      timestamp: getRelativeTime(post.createdAt),
      liked: Boolean(post.isLiked),
      comments: comments,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("getPostById 에러:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};

export const getSeniorFeed = async (req, res) => {
  try {
    const userId = req.user.userId;
    const mode = req.query.mode || "all";
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const all = req.query.all || "false";

    const offset = (page - 1) * size;
    const limit = size + 1;

    let sql;
    const params = [];

    // 1. SQL 쿼리 구성
    // is_senior_mode 필터링 제거: 일반 모드와 시니어 모드 게시물 모두 표시
    if (all === "false") {
      sql = `
        SELECT 
          p.id, p.content, p.image_url as imageUrl, p.like_count as likeCount, p.created_at as createdAt,
          u.id as authorId, u.name as authorName, u.username as authorUsername, u.profile_image as authorProfileImageUrl,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
        FROM posts p
        INNER JOIN users u ON p.author_id = u.id
        WHERE p.deleted_at IS NULL AND p.post_type = 'feed' AND p.author_id = ?
        UNION
        SELECT 
          p.id, p.content, p.image_url as imageUrl, p.like_count as likeCount, p.created_at as createdAt,
          u.id as authorId, u.name as authorName, u.username as authorUsername, u.profile_image as authorProfileImageUrl,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
        FROM posts p
        INNER JOIN users u ON p.author_id = u.id
        INNER JOIN user_follows uf ON uf.follower_id = ? AND uf.followee_id = p.author_id
        WHERE p.deleted_at IS NULL AND p.post_type = 'feed'
        ORDER BY createdAt DESC LIMIT ? OFFSET ?
      `;
      params.push(userId, userId, userId, userId, limit, offset);
    } else {
      sql = `
        SELECT 
          p.id, p.content, p.image_url as imageUrl, p.like_count as likeCount, p.created_at as createdAt,
          u.id as authorId, u.name as authorName, u.username as authorUsername, u.profile_image as authorProfileImageUrl,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
        FROM posts p
        INNER JOIN users u ON p.author_id = u.id
        WHERE p.deleted_at IS NULL AND p.post_type = 'feed' AND p.author_id != ?
        AND NOT EXISTS (SELECT 1 FROM user_follows uf WHERE uf.follower_id = ? AND uf.followee_id = p.author_id)
        ORDER BY p.created_at DESC LIMIT ? OFFSET ?
      `;
      params.push(userId, userId, userId, limit, offset);
    }

    const [rows] = await db.query(sql, params);
    const posts = rows.slice(0, size);
    const postIds = posts.map((p) => p.id);

    // 2. 댓글 가져오기
    let commentsMap = {};
    if (postIds.length > 0) {
      const commentsSql = `
        SELECT c.id, c.post_id as postId, c.content as text, c.created_at as createdAt,
          u.id as userId, u.name as userName, u.username as userUsername, u.profile_image as userAvatar
        FROM comments c
        INNER JOIN users u ON c.author_id = u.id
        WHERE c.post_id IN (?) AND c.deleted_at IS NULL
        ORDER BY c.created_at ASC
      `;
      const [commentsRows] = await db.query(commentsSql, [postIds]);

      commentsRows.forEach((comment) => {
        if (!commentsMap[comment.postId]) commentsMap[comment.postId] = [];
        commentsMap[comment.postId].push({
          id: comment.id,
          user: {
            id: comment.userId,
            name: comment.userName,
            username: comment.userUsername,
            avatar: comment.userAvatar,
          },
          text: comment.text,
          // 🔥 [서버 처리] 댓글 시간도 서버에서 계산해서 보냄
          time: getRelativeTime(comment.createdAt),
        });
      });
    }

    // 3. 최종 데이터 매핑 (서버에서 처리 완료)
    const items = posts.map((row) => ({
      id: row.id,
      user: {
        name: row.authorName,
        username: row.authorUsername,
        authorId: row.authorId,
        avatar: row.authorProfileImageUrl,
      },
      content: row.content,
      photo: row.imageUrl,
      likes: row.likeCount,

      // 🔥 [서버 처리] 여기서 '방금 전' 같은 완성된 문자열을 보냅니다.
      timestamp: getRelativeTime(row.createdAt),

      liked: Boolean(row.isLiked),
      comments: commentsMap[row.id] || [],
    }));

    res.status(200).json(items);
  } catch (error) {
    console.error("=== getSeniorFeed 에러 ===", error);
    res.status(500).json({ message: "서버 오류" });
  }
};
