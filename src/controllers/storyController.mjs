import db from "../config/db.mjs";

// 스토리 생성
export const createStory = async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "스토리 이미지가 필요합니다." });
    }

    // 트랜잭션 시작
    await connection.beginTransaction();

    const userId = req.user.userId;
    const mediaUrl = `/uploads/${req.file.filename}`;

    const sql = `
        INSERT INTO stories (user_id, media_url, created_at) VALUES (?, ?, NOW())
        `;

    const [result] = await connection.execute(sql, [userId, mediaUrl]);

    // 성공 시 커밋
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "스토리 업로드 성공",
      storyId: result.insertId,
      mediaUrl: mediaUrl,
    });
  } catch (error) {
    // 실패 시 롤백
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  } finally {
    // 커넥션 반납
    connection.release();
  }
};
