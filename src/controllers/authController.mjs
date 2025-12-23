// 회원가입 함수, 로그인 함수..
import jwt from "jsonwebtoken";
import db from "../config/db.mjs";
import bcrypt from "bcryptjs";
import { getKakaoUserInfo } from "../utils/kakaoClient.mjs";
import solapi from "solapi";

// 인증번호 저장소 (seniorController에서 가져옴)
export const verificationCodes = new Map();

// SMS 발송 내부 함수
const sendSMS = async (phone, code) => {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const fromNumber = process.env.SOLAPI_FROM_NUMBER || phone; // 발신번호 설정

  if (!apiKey || !apiSecret) {
    throw new Error("SMS API 키가 설정되지 않았습니다.");
  }

  const { SolapiMessageService } = solapi;
  const messageService = new SolapiMessageService(apiKey, apiSecret);

  const result = await messageService.sendOne({
    text: `[유니젠] 인증번호는 ${code}입니다.`,
    to: phone,
    from: fromNumber,
  });

  return result;
};

// [공용] 인증번호 발송 API (기존 로직 + 타입 체크 통합)
export const sendAuthCode = async (req, res) => {
  try {
    // type: 'signup'(회원가입), 'find_pw'(비번찾기), 'senior'(시니어)
    const { phone, type } = req.body;

    if (!phone)
      return res.status(400).json({ message: "전화번호가 필요합니다." });

    const cleanPhone = phone.replace(/-/g, "");

    // 유저 존재 여부 확인 (시니어 등 단순 인증일 때는 체크 생략 가능)
    if (type === "signup" || type === "find_pw") {
      const [users] = await db.query("SELECT id FROM users WHERE phone = ?", [
        cleanPhone,
      ]);
      const userExists = users.length > 0;

      if (type === "signup" && userExists) {
        return res.status(400).json({ message: "이미 가입된 전화번호입니다." });
      }
      if (type === "find_pw" && !userExists) {
        return res
          .status(404)
          .json({ message: "가입되지 않은 전화번호입니다." });
      }
    }

    // 인증번호 생성 및 저장
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5분

    verificationCodes.set(cleanPhone, { code, expiresAt });

    // SMS 발송
    await sendSMS(cleanPhone, code);
    console.log(`[TEST] ${cleanPhone} 인증번호: ${code}`); // 테스트용 로그

    return res
      .status(200)
      .json({ success: true, message: "인증번호가 발송되었습니다." });
  } catch (err) {
    console.error("인증번호 발송 실패:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

// 인증번호 검증
export const verifyAuthCode = async (req, res) => {
  try {
    const { phone, code } = req.body;
    const cleanPhone = phone.replace(/-/g, "");

    const stored = verificationCodes.get(cleanPhone);

    if (!stored) {
      return res
        .status(400)
        .json({ success: false, message: "인증번호가 없거나 만료되었습니다." });
    }
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(cleanPhone);
      return res
        .status(400)
        .json({ success: false, message: "인증번호가 만료됨" });
    }

    if (stored.code !== code) {
      return res
        .status(400)
        .json({ success: false, message: "인증번호 불일치" });
    }

    return res.status(200).json({ success: true, message: "인증 성공" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

// 비밀번호 변경(로그인 상태 or 비밀번호 찾기 후)
export const changePassword = async (req, res) => {
  try {
    const { phone, code, currentPassword, newPassword } = req.body;
    let userId = null;

    // CASE 1: 로그인 상태 (설정 -> 비밀번호 변경)
    if (req.headers.authorization && currentPassword) {
      // 1. 토큰 검증
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId || decoded.id;

      // 2. 유저 확인
      const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [
        userId,
      ]);
      const user = rows[0];

      if (!user) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      // 3. 현재 비밀번호 검증
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "현재 비밀번호가 일치하지 않습니다." });
      }

      // 검증 통과 -> userId 확보됨
    }

    // CASE 2: 비밀번호 찾기 (인증번호 -> 비밀번호 변경)
    else if (phone && code) {
      // [수정 포인트] phone이 확실히 있을 때만 replace 실행
      const cleanPhone = phone.replace(/-/g, "");

      // 1. 인증번호 검증
      const stored = verificationCodes.get(cleanPhone);
      if (!stored || stored.code !== code) {
        return res
          .status(400)
          .json({ message: "인증 정보가 유효하지 않습니다." });
      }

      // 2. 전화번호로 유저 찾기
      const [rows] = await db.query("SELECT id FROM users WHERE phone = ?", [
        cleanPhone,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
      userId = rows[0].id;

      // 검증 통과! 사용한 인증번호 삭제
      verificationCodes.delete(cleanPhone);
    } else {
      return res
        .status(400)
        .json({ message: "잘못된 요청입니다. (필수 정보 누락)" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashed, userId]
    );

    return res
      .status(200)
      .json({ success: true, message: "비밀번호가 변경되었습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류" });
  }
};

export const signup = async (req, res) => {
  try {
    const {
      signup_mode,
      username,
      password,
      name,
      phone,
      profile_image,
      preferred_mode,
    } = req.body;

    // 1. 필수값 체크
    if (!signup_mode || !username || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "필수 값 누락",
      });
    }

    // 2. phone 중복 체크
    const [phoneExists] = await db.query(
      "SELECT id FROM users WHERE phone = ?",
      [phone]
    );
    if (phoneExists.length) {
      return res.status(400).json({
        success: false,
        message: "이미 가입된 전화번호",
      });
    }

    // 3. username 중복 체크
    const [usernameExists] = await db.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (usernameExists.length) {
      return res.status(400).json({
        success: false,
        message: "이미 사용 중인 username",
      });
    }

    // 비밀번호 해싱 (env BCRYPT_SALT_ROUNDS 사용)
    const saltRounds = process.env.BCRYPT_SALT_ROUNDS
      ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10)
      : 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    // 4. DB 저장
    const [result] = await db.query(
      `
      INSERT INTO users (
        signup_mode,
        username,
        password,
        name,
        phone,
        profile_image,
        preferred_mode,
        status,
        last_login_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), NOW())
      `,
      [
        signup_mode,
        username,
        hashed,
        name,
        phone,
        profile_image,
        preferred_mode || "normal",
      ]
    );

    const userId = result.insertId;

    // 5. JWT 토큰 1개만 발급 (env JWT_EXPIRES_SEC 사용)
    const jwtExpires = process.env.JWT_EXPIRES_SEC
      ? parseInt(process.env.JWT_EXPIRES_SEC, 10)
      : "7d";
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: jwtExpires,
    });

    // 6. Response (요청한 형식 그대로)
    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      data: {
        user: {
          id: userId,
          signup_mode,
          username,
          name,
          phone,
          profile_image,
          preferred_mode: preferred_mode || "normal",
          status: "active",
          last_login_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        tokens: token,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "서버 오류",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    // 1. 사용자 찾기
    const [[user]] = await db.query(
      "SELECT * FROM users WHERE phone = ? AND status = 'active'",
      [phone]
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "존재하지 않는 전화번호",
      });
    }

    // 2. 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "비밀번호가 일치하지 않습니다.",
      });
    }

    // 3. JWT 토큰 발급 (env JWT_EXPIRES_SEC 사용)
    const jwtExpires = process.env.JWT_EXPIRES_SEC
      ? parseInt(process.env.JWT_EXPIRES_SEC, 10)
      : "7d";
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: jwtExpires,
    });

    // 4. Response
    res.status(200).json({
      success: true,
      message: "로그인 성공",
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
      },
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "서버 오류",
    });
  }
};

// 토큰으로 사용자 정보 가져오기
export const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 사용자 정보 조회
    const [[user]] = await db.query(
      "SELECT id, signup_mode, username, name, phone, profile_image, preferred_mode, status FROM users WHERE id = ? AND status = 'active'",
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          signup_mode: user.signup_mode,
          username: user.username,
          name: user.name,
          phone: user.phone,
          profile_image: user.profile_image,
          preferred_mode: user.preferred_mode,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "서버 오류",
    });
  }
};

// 카카오 로그인
export const kakaoLogin = async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: "카카오 액세스 토큰이 필요합니다.",
      });
    }

    // 1. 카카오 사용자 정보 조회
    const kakaoUser = await getKakaoUserInfo(access_token);

    // 2. 카카오 ID로 기존 사용자 확인
    const [users] = await db.query(
      "SELECT * FROM users WHERE kakao_user_id = ? AND status = 'active'",
      [kakaoUser.kakaoId]
    );

    const user = users.length > 0 ? users[0] : null;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "카카오로 가입된 계정이 없습니다. 회원가입이 필요합니다.",
        needsSignup: true,
        kakaoUser: {
          kakaoId: kakaoUser.kakaoId,
          email: kakaoUser.email,
          nickname: kakaoUser.nickname,
          profileImage: kakaoUser.profileImage,
        },
      });
    }

    // 3. last_login_at 업데이트
    await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
      user.id,
    ]);

    // 4. JWT 토큰 발급
    const jwtExpires = process.env.JWT_EXPIRES_SEC
      ? parseInt(process.env.JWT_EXPIRES_SEC, 10)
      : "7d";
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: jwtExpires,
    });

    // 5. Response
    res.status(200).json({
      success: true,
      message: "카카오 로그인 성공",
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          profile_image: user.profile_image,
        },
      },
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message || "서버 오류",
    });
  }
};

// 카카오 회원가입
export const kakaoSignup = async (req, res) => {
  try {
    const { access_token, username, phone, name, preferred_mode } = req.body;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: "카카오 액세스 토큰이 필요합니다.",
      });
    }

    // 1. 카카오 사용자 정보 조회
    const kakaoUser = await getKakaoUserInfo(access_token);

    // 2. 필수값 체크
    if (!username || !phone) {
      return res.status(400).json({
        success: false,
        message: "username과 phone은 필수입니다.",
      });
    }

    // 3. phone 중복 체크
    const [phoneExists] = await db.query(
      "SELECT id FROM users WHERE phone = ?",
      [phone]
    );
    if (phoneExists.length) {
      return res.status(400).json({
        success: false,
        message: "이미 가입된 전화번호",
      });
    }

    // 4. username 중복 체크
    const [usernameExists] = await db.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (usernameExists.length) {
      return res.status(400).json({
        success: false,
        message: "이미 사용 중인 username",
      });
    }

    // 5. 카카오 ID 중복 체크
    const [kakaoIdExists] = await db.query(
      "SELECT id FROM users WHERE kakao_user_id = ?",
      [kakaoUser.kakaoId]
    );

    if (kakaoIdExists.length > 0) {
      return res.status(400).json({
        success: false,
        message: "이미 가입된 카카오 계정입니다.",
      });
    }

    // 6. DB 저장
    const nameToUse = name || kakaoUser.nickname || username;
    const profileImageToUse = kakaoUser.profileImage || null;

    const insertQuery = `
      INSERT INTO users (
        signup_mode,
        username,
        password,
        name,
        phone,
        profile_image,
        preferred_mode,
        kakao_user_id,
        status,
        last_login_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), NOW())
    `;

    const insertParams = [
      "kakao",
      username,
      null, // 카카오 로그인은 비밀번호 없음
      nameToUse,
      phone,
      profileImageToUse,
      preferred_mode || "normal",
      kakaoUser.kakaoId,
    ];

    const [result] = await db.query(insertQuery, insertParams);
    const userId = result.insertId;

    // 7. JWT 토큰 발급
    const jwtExpires = process.env.JWT_EXPIRES_SEC
      ? parseInt(process.env.JWT_EXPIRES_SEC, 10)
      : "7d";
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: jwtExpires,
    });

    // 8. Response
    res.status(201).json({
      success: true,
      message: "카카오 회원가입이 완료되었습니다.",
      data: {
        user: {
          id: userId,
          signup_mode: "kakao",
          username,
          name: nameToUse,
          phone,
          profile_image: profileImageToUse,
          preferred_mode: preferred_mode || "normal",
          status: "active",
          last_login_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        tokens: token,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message || "서버 오류",
    });
  }
};
