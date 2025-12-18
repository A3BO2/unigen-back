// 사용자 관련 함수

import db from "../config/db.mjs";

export const getUserProfile = async (req, res) => {
  try {
    // 사용자 ID: 인증 토큰(req.user.id)에서 우선 가져오고, 없으면 URL 파라미터(req.params.id)를 사용
    // (인증 미들웨어가 `req.user`에 id를 주입해야 함)
    let userId = null;
    if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (req.params && req.params.id) {
      userId = req.params.id;
    } else {
      return res
        .status(400)
        .json({ message: "사용자 ID가 제공되지 않았습니다." });
    }
    // 숫자형으로 변환해 안전하게 사용
    userId = Number(userId);
    if (Number.isNaN(userId) || userId <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 사용자 ID가 필요합니다." });
    }

    // 페이징 파라미터 (쿼리스트링): ?page=1&limit=9 (기본 3x3 그리드)
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = 9; // 기본 9개 (3x3)
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    let offset = (page - 1) * limit;

    // 사용자 프로필 (게시물수, 팔로워/팔로잉 수 포함)
    const profileSql = `
      SELECT
        u.id,
        u.username,
        u.name,
        u.profile_image,
        u.preferred_mode,
        u.status,
        u.created_at,
        (SELECT COUNT(1) FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL) AS post_count,
        (SELECT COUNT(1) FROM user_follows uf_er WHERE uf_er.followee_id = u.id) AS follower_count,
        (SELECT COUNT(1) FROM user_follows uf_ing WHERE uf_ing.follower_id = u.id) AS following_count
      FROM users u
      WHERE u.id = ?
    `;

    const [profileRows] = await db.query(profileSql, [userId]);

    if (!profileRows || profileRows.length === 0) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 해당 사용자의 게시물(삭제되지 않은 것만), 페이징 적용
    const postsSql = `
      SELECT
        id,
        post_type,
        image_url,
        video_url,
        like_count,
        comment_count,
        created_at
      FROM posts
      WHERE author_id = ?
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    // total count (profile에 포함된 post_count 사용)
    const totalCount = profileRows[0].post_count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    // 페이지가 총 페이지수를 초과하면 마지막 페이지로 보정
    if (page > totalPages) {
      page = totalPages;
      offset = (page - 1) * limit;
    }

    const [postsRows] = await db.query(postsSql, [userId, limit, offset]);

    // 응답: 프로필, 게시물 목록, 페이징 메타
    return res.status(200).json({
      profile: profileRows[0],
      posts: postsRows,
      pagination: {
        page,
        limit,
        offset,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "서버 오류" });
  }
};
