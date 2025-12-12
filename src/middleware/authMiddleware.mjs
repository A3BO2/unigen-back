// 로그인 여부 체크

export const verifyToken = (req, res, next) => {
  // TODO: JWT 인증 로직 구현 필요
  console.log("인증 미들웨어 통과 (임시)");
  req.user = { id: 1 }; // 임시 유저 주입
  next();
};