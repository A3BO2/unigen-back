// 로그인 여부 체크 (JWT 기반)
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export const verifyToken = (req, res, next) => {
  try {
    // 토큰 위치: Authorization: Bearer <token> 또는 x-access-token 헤더
    const authHeader =
      req.headers.authorization || req.headers["x-access-token"];
    if (!authHeader) {
      return res.status(401).json({ message: "인증 토큰이 필요합니다." });
    }

    let token = authHeader;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    const payload = jwt.verify(token, JWT_SECRET);

    // payload에 id/userId/sub 중 하나가 있다고 가정
    const userId = payload.id || payload.userId || payload.sub;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "토큰에 사용자 정보가 없습니다." });
    }

    // req.user에 최소한의 정보 주입
    req.user = { id: Number(userId), ...payload };
    next();
  } catch (err) {
    console.error("verifyToken error:", err?.message || err);
    return res
      .status(401)
      .json({ message: "유효하지 않거나 만료된 토큰입니다." });
  }
};
