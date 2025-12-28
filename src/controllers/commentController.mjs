import db from "../config/db.mjs";
import { getRelativeTime } from "../utils/dateUtils.mjs";

const getUserId = (req) => req.user?.userId || req.user?.id;

/* =========================
 * 댓글 생성
 ========================= */
export const createComment = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const { postId, content } = req.body;
  const targetPostId = Number(postId);

  if (!targetPostId || Number.isNaN(targetPostId)) {
    return res.status(400).json({ message: "유효한 게시글 ID가 필요합니다." });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "댓글 내용을 입력해주세요." });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 게시글 존재 여부 확인
    const [posts] = await connection.query(
      "SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [targetPostId]
    );

    if (!posts.length) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "게시글을 찾을 수 없거나 삭제되었습니다." });
    }

    // 댓글 생성
    const [result] = await connection.execute(
      `
      INSERT INTO comments 
      (post_id, author_id, content, like_count, status, created_at)
      VALUES (?, ?, ?, 0, 'active', NOW())
      `,
      [targetPostId, userId, content.trim()]
    );

    // 게시글 댓글 수 증가
    await connection.execute(
      "UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?",
      [targetPostId]
    );

    await connection.commit();

    return res.status(201).json({
      message: "댓글이 등록되었습니다.",
      comment: {
        id: result.insertId,
        
        postId: targetPostId,
        userId,
        text: content.trim(),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("createComment error:", error);
    return res.status(500).json({ message: "서버 오류" });
  } finally {
    connection.release();
  }
};

/* =========================
 * 댓글 삭제 (soft delete)
 ========================= */
export const deleteComment = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const commentId = Number(req.params.commentId);
  if (!commentId || Number.isNaN(commentId)) {
    return res.status(400).json({ message: "유효한 댓글 ID가 필요합니다." });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT 
        post_id AS postId, 
        author_id AS authorId 
      FROM comments 
      WHERE id = ? AND deleted_at IS NULL
      `,
      [commentId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    const { postId, authorId } = rows[0];

    if (authorId !== userId) {
      await connection.rollback();
      return res
        .status(403)
        .json({ message: "본인이 작성한 댓글만 삭제할 수 있습니다." });
    }

    // soft delete
    await connection.execute(
      "UPDATE comments SET deleted_at = NOW() WHERE id = ?",
      [commentId]
    );

    // 게시글 댓글 수 감소 (방어 로직 포함)
    await connection.execute(
      `
      UPDATE posts 
      SET comment_count = 
        CASE 
          WHEN comment_count > 0 THEN comment_count - 1 
          ELSE 0 
        END
      WHERE id = ?
      `,
      [postId]
    );

    await connection.commit();

    return res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    await connection.rollback();
    console.error("deleteComment error:", error);
    return res.status(500).json({ message: "서버 오류" });
  } finally {
    connection.release();
  }
};

/* =========================
 * 게시글별 댓글 조회
 ========================= */
export const getCommentsByPost = async (req, res) => {
  const postId = Number(req.params.postId || req.query.postId);

  if (!postId || Number.isNaN(postId)) {
    return res.status(400).json({ message: "유효한 게시글 ID가 필요합니다." });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        c.post_id AS postId,
        c.content AS text,
        c.created_at AS createdAt,
        u.id AS userId,
        u.username AS userName,
        u.profile_image AS userAvatar
      FROM comments c
      INNER JOIN users u ON c.author_id = u.id
      WHERE c.post_id = ?
        AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      `,
      [postId]
    );

    const comments = rows.map((row) => ({
      id: row.id,
      postId: row.postId,
      text: row.text,
      createdAt: row.createdAt,
      time: getRelativeTime(row.createdAt),
      user: {
        id: row.userId,
        name: row.userName,
        avatar: row.userAvatar,
      },
    }));

    return res.status(200).json({ postId, comments });
  } catch (error) {
    console.error("getCommentsByPost error:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
};

// /* =========================
//  * 댓글 좋아요 증가
//  ========================= */
// export const likeComment = async (req, res) => {
//   const userId = getUserId(req);
//   if (!userId) {
//     return res.status(401).json({ message: "로그인이 필요합니다." });
//   }

//   const commentId = Number(req.params.commentId);
//   if (!commentId || Number.isNaN(commentId)) {
//     return res.status(400).json({ message: "유효한 댓글 ID가 필요합니다." });
//   }

//   try {
//     const [result] = await db.execute(
//       `
//       UPDATE comments
//       SET like_count = like_count + 1
//       WHERE id = ? AND deleted_at IS NULL
//       `,
//       [commentId]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
//     }

//     return res.status(200).json({ message: "댓글에 좋아요를 눌렀습니다." });
//   } catch (error) {
//     console.error("likeComment error:", error);
//     return res.status(500).json({ message: "서버 오류" });
//   }
// };

// /* =========================
//  * 댓글 좋아요 취소
//  ========================= */
// export const unlikeComment = async (req, res) => {
//   const userId = getUserId(req);
//   if (!userId) {
//     return res.status(401).json({ message: "로그인이 필요합니다." });
//   }

//   const commentId = Number(req.params.commentId);
//   if (!commentId || Number.isNaN(commentId)) {
//     return res.status(400).json({ message: "유효한 댓글 ID가 필요합니다." });
//   }

//   try {
//     const [result] = await db.execute(
//       `
//       UPDATE comments
//       SET like_count =
//         CASE
//           WHEN like_count > 0 THEN like_count - 1
//           ELSE 0
//         END
//       WHERE id = ? AND deleted_at IS NULL
//       `,
//       [commentId]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
//     }

//     return res.status(200).json({ message: "댓글 좋아요를 취소했습니다." });
//   } catch (error) {
//     console.error("unlikeComment error:", error);
//     return res.status(500).json({ message: "서버 오류" });
//   }
// };
