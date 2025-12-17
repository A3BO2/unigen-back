// 포스트 관련 함수

import db from "../config/db.mjs";

export const createPost = async (req, res) => {
  try {
    const userId = 1; // 임시 ID
    const { content, imageUrl, isSeniorMode } = req.body;

    const sql = `INSERT INTO Posts (author_id, content, image_url, is_senior_mode, created_at) VALUES (?, ?, ?, ?, NOW())`;
    const params = [userId, content, imageUrl, isSeniorMode || false];

    const [result] = await db.query(sql, params);
    res
      .status(201)
      .json({ message: "게시물 작성 성공", postId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

// https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
export const getFeed = async (req, res) => {
  try {
    const userId = 1; // 임시 ID
    const mode = req.query.mode || "all";
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;

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
      WHERE p.deleted_at IS NULL AND p.post_type = 'feed'
    `;

    const params = [];

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
