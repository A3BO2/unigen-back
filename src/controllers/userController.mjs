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
      return res
        .status(400)
        .json({ message: "유효한 사용자 ID가 필요합니다." });
    }

    // 사용자 설정 조회 (users 테이블에서 설정 컬럼 조회)
    // 컬럼이 없을 수 있으므로 안전하게 처리
    let settingsSql = `SELECT id FROM users WHERE id = ?`;

    try {
      // 먼저 기본 쿼리로 사용자 존재 확인
      const [userRows] = await db.query(settingsSql, [userId]);

      if (!userRows || userRows.length === 0) {
        return res.status(200).json({
          fontScale: "large",
          notificationsOn: true,
          seniorSimpleMode: true,
          language: "ko",
          isDarkMode: false,
        });
      }

      // 컬럼 존재 여부 확인을 위해 각 컬럼을 개별적으로 조회 시도
      const settings = {
        fontScale: "large",
        notificationsOn: true,
        seniorSimpleMode: true,
        language: "ko",
        isDarkMode: false,
      };

      // font_scale 컬럼 확인
      try {
        const [fontRows] = await db.query(
          `SELECT COALESCE(font_scale, 'large') AS fontScale FROM users WHERE id = ?`,
          [userId]
        );
        if (fontRows && fontRows[0]) {
          settings.fontScale = fontRows[0].fontScale || "large";
        }
      } catch (e) {
        // 컬럼이 없으면 기본값 유지
      }

      // notifications_on 컬럼 확인
      try {
        const [notifRows] = await db.query(
          `SELECT COALESCE(notifications_on, 1) AS notificationsOn FROM users WHERE id = ?`,
          [userId]
        );
        if (notifRows && notifRows[0]) {
          settings.notificationsOn = Boolean(notifRows[0].notificationsOn);
        }
      } catch (e) {
        // 컬럼이 없으면 기본값 유지
      }

      // senior_simple_mode 컬럼 확인
      try {
        const [seniorRows] = await db.query(
          `SELECT COALESCE(senior_simple_mode, 1) AS seniorSimpleMode FROM users WHERE id = ?`,
          [userId]
        );
        if (seniorRows && seniorRows[0]) {
          settings.seniorSimpleMode = Boolean(seniorRows[0].seniorSimpleMode);
        }
      } catch (e) {
        // 컬럼이 없으면 기본값 유지
      }

      // language 컬럼 확인
      try {
        const [langRows] = await db.query(
          `SELECT COALESCE(language, 'ko') AS language FROM users WHERE id = ?`,
          [userId]
        );
        if (langRows && langRows[0]) {
          settings.language = langRows[0].language || "ko";
        }
      } catch (e) {
        // 컬럼이 없으면 기본값 유지
      }

      // is_dark_mode 컬럼 확인
      try {
        const [darkRows] = await db.query(
          `SELECT COALESCE(is_dark_mode, 0) AS isDarkMode FROM users WHERE id = ?`,
          [userId]
        );
        if (darkRows && darkRows[0]) {
          settings.isDarkMode = Boolean(darkRows[0].isDarkMode);
        }
      } catch (e) {
        // 컬럼이 없으면 기본값 유지
      }

      return res.status(200).json(settings);
    } catch (queryError) {
      // 쿼리 오류 시 기본값 반환
      console.error("getUserSettings 쿼리 오류:", queryError);
      return res.status(200).json({
        fontScale: "large",
        notificationsOn: true,
        seniorSimpleMode: true,
        language: "ko",
        isDarkMode: false,
      });
    }
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

// 사용자 설정 업데이트
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

    // 업데이트할 필드만 동적으로 구성
    const updateFields = [];
    const updateValues = [];

    // 각 필드를 개별적으로 업데이트 시도 (컬럼이 없으면 건너뛰기)
    const updatedSettings = {
      fontScale: fontScale !== undefined ? fontScale : "large",
      notificationsOn: notificationsOn !== undefined ? notificationsOn : true,
      seniorSimpleMode:
        seniorSimpleMode !== undefined ? seniorSimpleMode : true,
      language: language !== undefined ? language : "ko",
      isDarkMode: isDarkMode !== undefined ? isDarkMode : false,
    };

    // font_scale 업데이트 시도
    if (fontScale !== undefined) {
      if (!["small", "medium", "large"].includes(fontScale)) {
        return res.status(400).json({
          message: "fontScale은 'small', 'medium', 'large' 중 하나여야 합니다.",
        });
      }
      try {
        await db.query(`UPDATE users SET font_scale = ? WHERE id = ?`, [
          fontScale,
          userId,
        ]);
      } catch (e) {
        if (e.code !== "ER_BAD_FIELD_ERROR") {
          console.error("font_scale 업데이트 오류:", e);
        }
        // 컬럼이 없으면 기본값만 반환
      }
    }

    // notifications_on 업데이트 시도
    if (notificationsOn !== undefined) {
      try {
        await db.query(`UPDATE users SET notifications_on = ? WHERE id = ?`, [
          notificationsOn ? 1 : 0,
          userId,
        ]);
      } catch (e) {
        if (e.code !== "ER_BAD_FIELD_ERROR") {
          console.error("notifications_on 업데이트 오류:", e);
        }
      }
    }

    // senior_simple_mode 업데이트 시도
    if (seniorSimpleMode !== undefined) {
      try {
        await db.query(`UPDATE users SET senior_simple_mode = ? WHERE id = ?`, [
          seniorSimpleMode ? 1 : 0,
          userId,
        ]);
      } catch (e) {
        if (e.code !== "ER_BAD_FIELD_ERROR") {
          console.error("senior_simple_mode 업데이트 오류:", e);
        }
      }
    }

    // is_dark_mode 업데이트 시도
    if (isDarkMode !== undefined) {
      try {
        await db.query(`UPDATE users SET is_dark_mode = ? WHERE id = ?`, [
          isDarkMode ? 1 : 0,
          userId,
        ]);
      } catch (e) {
        if (e.code !== "ER_BAD_FIELD_ERROR") {
          console.error("is_dark_mode 업데이트 오류:", e);
        }
      }
    }

    // language 업데이트 시도
    if (language !== undefined) {
      try {
        await db.query(`UPDATE users SET language = ? WHERE id = ?`, [
          language,
          userId,
        ]);
      } catch (e) {
        if (e.code !== "ER_BAD_FIELD_ERROR") {
          console.error("language 업데이트 오류:", e);
        }
      }
    }

    // updated_at 업데이트 (이 컬럼은 일반적으로 존재함)
    try {
      await db.query(`UPDATE users SET updated_at = NOW() WHERE id = ?`, [
        userId,
      ]);
    } catch (e) {
      // updated_at이 없어도 무시
    }

    return res.status(200).json(updatedSettings);
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
