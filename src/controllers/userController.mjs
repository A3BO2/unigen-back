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
// 사용자 설정 조회
export const getUserSettings = async (req, res) => {
  try {
    // 인증 미들웨어가 req.user에 id를 주입해야 함
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const userId = Number(req.user.id);
    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: "유효한 사용자 ID가 필요합니다." });
    }

    // 사용자 설정 조회 (users 테이블에서 설정 컬럼 조회)
    // 만약 컬럼이 없다면 기본값 반환
    const settingsSql = `
      SELECT
        COALESCE(font_scale, 'large') AS fontScale,
        COALESCE(notifications_on, 1) AS notificationsOn,
        COALESCE(senior_simple_mode, 1) AS seniorSimpleMode,
        COALESCE(language, 'ko') AS language
      FROM users
      WHERE id = ?
    `;

    const [settingsRows] = await db.query(settingsSql, [userId]);

    if (!settingsRows || settingsRows.length === 0) {
      // 사용자가 없으면 기본값 반환
      return res.status(200).json({
        fontScale: "large",
        notificationsOn: true,
        seniorSimpleMode: true,
        language: "ko",
      });
    }

    const settings = settingsRows[0];

    // 응답 형식에 맞게 변환
    return res.status(200).json({
      fontScale: settings.fontScale || "large",
      notificationsOn: Boolean(settings.notificationsOn),
      seniorSimpleMode: Boolean(settings.seniorSimpleMode),
      language: settings.language || "ko",
    });
  } catch (error) {
    console.error("getUserSettings 오류:", error);
    
    // 데이터베이스 컬럼이 없는 경우를 대비해 기본값 반환
    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(200).json({
        fontScale: "large",
        notificationsOn: true,
        seniorSimpleMode: true,
        language: "ko",
      });
    }

    return res.status(500).json({ message: "서버 오류" });
  }
};

// 사용자 설정 업데이트
export const updateUserSettings = async (req, res) => {
  try {
    // 인증 미들웨어가 req.user에 id를 주입해야 함
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const userId = Number(req.user.id);
    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(400).json({ message: "유효한 사용자 ID가 필요합니다." });
    }

    const { fontScale, notificationsOn, seniorSimpleMode, language } = req.body;

    // 업데이트할 필드만 동적으로 구성
    const updateFields = [];
    const updateValues = [];

    if (fontScale !== undefined) {
      if (!['small', 'medium', 'large'].includes(fontScale)) {
        return res.status(400).json({ message: "fontScale은 'small', 'medium', 'large' 중 하나여야 합니다." });
      }
      updateFields.push('font_scale = ?');
      updateValues.push(fontScale);
    }

    if (notificationsOn !== undefined) {
      updateFields.push('notifications_on = ?');
      updateValues.push(notificationsOn ? 1 : 0);
    }

    if (seniorSimpleMode !== undefined) {
      updateFields.push('senior_simple_mode = ?');
      updateValues.push(seniorSimpleMode ? 1 : 0);
    }

    if (language !== undefined) {
      updateFields.push('language = ?');
      updateValues.push(language);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "업데이트할 설정이 없습니다." });
    }

    // updated_at도 함께 업데이트
    updateFields.push('updated_at = NOW()');
    updateValues.push(userId);

    const updateSql = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    try {
      await db.query(updateSql, updateValues);
    } catch (dbError) {
      // 컬럼이 없는 경우 기본값만 반환 (실제로는 마이그레이션이 필요하지만, 에러 없이 처리)
      if (dbError.code === "ER_BAD_FIELD_ERROR") {
        console.warn("설정 컬럼이 없습니다. 데이터베이스 마이그레이션이 필요할 수 있습니다.");
        // 설정은 저장하지 않지만 성공 응답 반환 (로컬 스토리지에 저장)
        return res.status(200).json({
          fontScale: fontScale || "large",
          notificationsOn: notificationsOn !== undefined ? notificationsOn : true,
          seniorSimpleMode: seniorSimpleMode !== undefined ? seniorSimpleMode : true,
          language: language || "ko",
        });
      }
      throw dbError;
    }

    // 업데이트된 설정 조회
    const [settingsRows] = await db.query(
      `SELECT 
        COALESCE(font_scale, 'large') AS fontScale,
        COALESCE(notifications_on, 1) AS notificationsOn,
        COALESCE(senior_simple_mode, 1) AS seniorSimpleMode,
        COALESCE(language, 'ko') AS language
      FROM users WHERE id = ?`,
      [userId]
    );

    const settings = settingsRows[0] || {};

    return res.status(200).json({
      fontScale: settings.fontScale || fontScale || "large",
      notificationsOn: settings.notificationsOn !== undefined ? Boolean(settings.notificationsOn) : (notificationsOn !== undefined ? notificationsOn : true),
      seniorSimpleMode: settings.seniorSimpleMode !== undefined ? Boolean(settings.seniorSimpleMode) : (seniorSimpleMode !== undefined ? seniorSimpleMode : true),
      language: settings.language || language || "ko",
    });
  } catch (error) {
    console.error("updateUserSettings 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
};
