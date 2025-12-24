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
// 사용자 설정 조회 (user_settings 테이블 기반)
export const getUserSettings = async (req, res) => {
  try {
    // 인증 미들웨어가 req.user에 id를 주입해야 함
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const userId = Number(req.user.id);
    if (Number.isNaN(userId) || userId <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 사용자 ID가 필요합니다." });
    }

    // 기본값
    const defaultSettings = {
      fontScale: "large",
      notificationsOn: true,
      seniorSimpleMode: true, // 현재는 별도 컬럼 없이 기본값 유지
      language: "ko",
      isDarkMode: false,
    };

    // user_settings 테이블에서 설정 조회
    const [rows] = await db.query(
      `SELECT id, user_id, font_scale, notifications_on, dark_mode, language
       FROM user_settings
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      // 아직 설정 레코드가 없으면 기본값 반환
      return res.status(200).json(defaultSettings);
    }

    const row = rows[0];

    const settings = {
      fontScale: row.font_scale || "large",
      notificationsOn:
        row.notifications_on !== null && row.notifications_on !== undefined
          ? Boolean(row.notifications_on)
          : true,
      seniorSimpleMode: true, // 별도 관리가 필요하면 이후 확장
      language: row.language || "ko",
      isDarkMode:
        row.dark_mode !== null && row.dark_mode !== undefined
          ? Boolean(row.dark_mode)
          : false,
    };

    return res.status(200).json(settings);
  } catch (error) {
    console.error("getUserSettings 오류:", error);

    // 데이터베이스 컬럼이 없는 경우를 대비해 기본값 반환
    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(200).json({
        fontScale: "large",
        notificationsOn: true,
        seniorSimpleMode: true,
        language: "ko",
        isDarkMode: false,
      });
    }

    return res.status(500).json({ message: "서버 오류" });
  }
};

// 사용자 설정 업데이트 (user_settings 테이블 기반)
export const updateUserSettings = async (req, res) => {
  try {
    // 인증 미들웨어가 req.user에 id를 주입해야 함
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const userId = Number(req.user.id);
    if (Number.isNaN(userId) || userId <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 사용자 ID가 필요합니다." });
    }

    const {
      fontScale,
      notificationsOn,
      seniorSimpleMode,
      language,
      isDarkMode,
    } = req.body;

    if (
      fontScale !== undefined &&
      !["small", "medium", "large"].includes(fontScale)
    ) {
      return res.status(400).json({
        message: "fontScale은 'small', 'medium', 'large' 중 하나여야 합니다.",
      });
    }

    // 현재 저장된 값 조회 (없으면 기본값에서 시작)
    const [rows] = await db.query(
      `SELECT font_scale, notifications_on, dark_mode, language
       FROM user_settings
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    const current = {
      fontScale: rows[0]?.font_scale || "large",
      notificationsOn:
        rows[0]?.notifications_on !== undefined &&
        rows[0]?.notifications_on !== null
          ? Boolean(rows[0].notifications_on)
          : true,
      language: rows[0]?.language || "ko",
      isDarkMode:
        rows[0]?.dark_mode !== undefined && rows[0]?.dark_mode !== null
          ? Boolean(rows[0].dark_mode)
          : false,
      seniorSimpleMode: true,
    };

    // 요청 값으로 덮어쓰기 (undefined인 값은 기존 값 유지)
    const updated = {
      fontScale: fontScale !== undefined ? fontScale : current.fontScale,
      notificationsOn:
        notificationsOn !== undefined
          ? Boolean(notificationsOn)
          : current.notificationsOn,
      language: language !== undefined ? language : current.language,
      isDarkMode:
        isDarkMode !== undefined ? Boolean(isDarkMode) : current.isDarkMode,
      seniorSimpleMode:
        seniorSimpleMode !== undefined
          ? Boolean(seniorSimpleMode)
          : current.seniorSimpleMode,
    };

    // user_settings에 upsert (user_id 기준으로 존재하면 UPDATE, 없으면 INSERT)
    await db.query(
      `INSERT INTO user_settings
         (user_id, font_scale, notifications_on, dark_mode, language, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         font_scale = VALUES(font_scale),
         notifications_on = VALUES(notifications_on),
         dark_mode = VALUES(dark_mode),
         language = VALUES(language),
         updated_at = NOW()`,
      [
        userId,
        updated.fontScale,
        updated.notificationsOn ? 1 : 0,
        updated.isDarkMode ? 1 : 0,
        updated.language,
      ]
    );

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateUserSettings 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
};

export const followUser = async (req, res) => {
  try {
    // 인증 미들웨어가 req.user에 id를 주입해야 함
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const followerId = Number(req.user.id);
    const followeeId = req.query.followeeId;

    if (Number.isNaN(followerId) || followerId <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 팔로워 ID가 필요합니다." });
    }

    const followeeIdNum = Number(followeeId);
    if (Number.isNaN(followeeIdNum) || followeeIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 팔로잉 대상 ID가 필요합니다." });
    }

    if (followerId === followeeIdNum) {
      return res
        .status(400)
        .json({ message: "자기 자신을 팔로우할 수 없습니다." });
    }

    // 이미 팔로우 중인지 확인
    const [existingRows] = await db.query(
      `SELECT id FROM user_follows WHERE follower_id = ? AND followee_id = ?`,
      [followerId, followeeIdNum]
    );
    if (existingRows && existingRows.length > 0) {
      return res.status(400).json({ message: "이미 팔로우 중입니다." });
    }

    // 팔로우 관계 추가
    await db.query(
      `INSERT INTO user_follows (follower_id, followee_id) VALUES (?, ?)`,
      [followerId, followeeIdNum]
    );
    return res.status(200).json({ message: "팔로우 성공" });
  } catch (error) {
    console.error("followUser 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    // 인증 미들웨어가 req.user에 id를 주입해야 함
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const followerId = Number(req.user.id);
    const followeeId = req.query.followeeId;

    if (Number.isNaN(followerId) || followerId <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 팔로워 ID가 필요합니다." });
    }

    const followeeIdNum = Number(followeeId);
    if (Number.isNaN(followeeIdNum) || followeeIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 팔로잉 대상 ID가 필요합니다." });
    }

    // 팔로우 관계 삭제
    const [result] = await db.query(
      `DELETE FROM user_follows WHERE follower_id = ? AND followee_id = ?`,
      [followerId, followeeIdNum]
    );

    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ message: "팔로우 관계가 존재하지 않습니다." });
    }

    return res.status(200).json({ message: "언팔로우 성공" });
  } catch (error) {
    console.error("unfollowUser 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
};

export const isFollowing = async (req, res) => {
  try {
    // 인증 미들웨어가 req.user에 id를 주입해야 함
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const followerId = Number(req.user.id);
    const followeeId = req.query.followeeId;
    console.log("followeeId:", followeeId);

    if (Number.isNaN(followerId) || followerId <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 팔로워 ID가 필요합니다." });
    }

    const followeeIdNum = Number(followeeId);
    if (Number.isNaN(followeeIdNum) || followeeIdNum <= 0) {
      return res
        .status(400)
        .json({ message: "유효한 팔로잉 대상 ID가 필요합니다." });
    }

    // 자기 자신인지 확인
    const isMine = followerId === followeeIdNum;

    // 팔로우 관계 확인
    const [existingRows] = await db.query(
      `SELECT id FROM user_follows WHERE follower_id = ? AND followee_id = ?`,
      [followerId, followeeIdNum]
    );

    const isFollowing = existingRows && existingRows.length > 0;

    return res.status(200).json({ isFollowing, isMine });
  } catch (error) {
    console.error("isFollowing 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
};
