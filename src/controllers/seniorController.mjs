// 시니어 관련 함수
import jwt from "jsonwebtoken";
import db from "../config/db.mjs";
import { getKakaoUserInfo } from "../utils/kakaoClient.mjs";
import solapi from "solapi";

// 인증번호 저장소 (메모리 기반, 프로덕션에서는 Redis 사용 권장)
const verificationCodes = new Map(); // phone -> { code, expiresAt }

// 6자리 인증번호 생성
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// SMS 발송 함수
const sendSMS = async (phone, code) => {
  try {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const fromNumber = process.env.SOLAPI_FROM_NUMBER || phone; // 발신번호

    if (!apiKey || !apiSecret) {
      throw new Error("SMS API 키가 설정되지 않았습니다.");
    }

    const { SolapiMessageService } = solapi;
    const messageService = new SolapiMessageService(apiKey, apiSecret);

    const message = {
      text: `[유니젠] 인증번호는 ${code}입니다.`,
      to: phone,
      from: fromNumber,
    };

    // sendOne 메서드 사용 (단일 메시지 발송)
    const result = await messageService.sendOne(message);
    return result;
  } catch (error) {
    console.error("SMS 발송 실패:", error);
    throw error;
  }
};

// SMS 인증번호 발송
export const sendVerificationCode = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "전화번호가 필요합니다.",
      });
    }

    // 전화번호 형식 정리 (하이픈 제거)
    const cleanPhone = phone.replace(/-/g, "");

    // 6자리 인증번호 생성
    const code = generateVerificationCode();

    // 인증번호 저장 (5분 유효)
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5분
    verificationCodes.set(cleanPhone, {
      code,
      expiresAt,
    });

    // SMS 발송
    await sendSMS(cleanPhone, code);

    res.status(200).json({
      success: true,
      message: "인증번호가 발송되었습니다.",
    });
  } catch (error) {
    console.error("인증번호 발송 실패:", error);
    res.status(500).json({
      success: false,
      message: error.message || "인증번호 발송에 실패했습니다.",
    });
  }
};

// SMS 인증번호 검증
export const verifyCode = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "전화번호와 인증번호가 필요합니다.",
      });
    }

    const cleanPhone = phone.replace(/-/g, "");
    const stored = verificationCodes.get(cleanPhone);

    if (!stored) {
      return res.status(400).json({
        success: false,
        message: "인증번호가 발송되지 않았거나 만료되었습니다.",
      });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        message: "인증번호가 만료되었습니다.",
      });
    }

    if (stored.code !== code) {
      return res.status(400).json({
        success: false,
        message: "인증번호가 일치하지 않습니다.",
      });
    }

    // 인증 성공 - 인증번호 삭제
    verificationCodes.delete(cleanPhone);

    res.status(200).json({
      success: true,
      message: "인증번호가 확인되었습니다.",
    });
  } catch (error) {
    console.error("인증번호 검증 실패:", error);
    res.status(500).json({
      success: false,
      message: "인증번호 검증에 실패했습니다.",
    });
  }
};

// 시니어 번호 인증 가입/로그인
export const seniorPhoneAuth = async (req, res) => {
  try {
    const { phone, code, name } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "전화번호와 인증번호가 필요합니다.",
      });
    }

    const cleanPhone = phone.replace(/-/g, "");

    // 1. 인증번호 검증
    const stored = verificationCodes.get(cleanPhone);
    if (!stored || Date.now() > stored.expiresAt || stored.code !== code) {
      return res.status(400).json({
        success: false,
        message: "인증번호가 유효하지 않습니다.",
      });
    }

    // 인증번호 삭제
    verificationCodes.delete(cleanPhone);

    // 2. 기존 사용자 확인
    const [users] = await db.query(
      "SELECT * FROM users WHERE phone = ? AND status = 'active'",
      [cleanPhone]
    );

    let user = users.length > 0 ? users[0] : null;

    if (user) {
      // 기존 사용자 - 로그인
      // preferred_mode가 senior가 아니면 업데이트
      if (user.preferred_mode !== "senior") {
        await db.query(
          "UPDATE users SET preferred_mode = 'senior', last_login_at = NOW() WHERE id = ?",
          [user.id]
        );
        user.preferred_mode = "senior";
      } else {
        await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
          user.id,
        ]);
      }
    } else {
      // 신규 사용자 - 가입
      // name이 없으면 전화번호로 임시 이름 생성
      const userName = name || `시니어${cleanPhone.slice(-4)}`;
      const username = `senior_${cleanPhone}`;

      const [result] = await db.query(
        `
        INSERT INTO users (
          signup_mode,
          username,
          password,
          name,
          phone,
          preferred_mode,
          status,
          last_login_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'senior', 'active', NOW(), NOW(), NOW())
        `,
        ["phone", username, null, userName, cleanPhone]
      );

      const [newUsers] = await db.query(
        "SELECT * FROM users WHERE id = ?",
        [result.insertId]
      );
      user = newUsers[0];
    }

    // 3. JWT 토큰 발급
    const jwtExpires = process.env.JWT_EXPIRES_SEC
      ? parseInt(process.env.JWT_EXPIRES_SEC, 10)
      : "7d";
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: jwtExpires,
    });

    // 4. Response
    res.status(200).json({
      success: true,
      message: user.id ? "로그인 성공" : "회원가입 및 로그인 성공",
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          profile_image: user.profile_image,
          preferred_mode: user.preferred_mode,
        },
      },
      token: token,
    });
  } catch (error) {
    console.error("시니어 번호 인증 실패:", error);
    res.status(500).json({
      success: false,
      message: error.message || "서버 오류",
    });
  }
};

// 시니어 카카오 로그인
export const seniorKakaoLogin = async (req, res) => {
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

    // 3. preferred_mode를 senior로 업데이트
    if (user.preferred_mode !== "senior") {
      await db.query(
        "UPDATE users SET preferred_mode = 'senior', last_login_at = NOW() WHERE id = ?",
        [user.id]
      );
      user.preferred_mode = "senior";
    } else {
      await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
        user.id,
      ]);
    }

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
          preferred_mode: user.preferred_mode,
        },
      },
      token: token,
    });
  } catch (error) {
    console.error("시니어 카카오 로그인 실패:", error);
    res.status(500).json({
      success: false,
      message: error.message || "서버 오류",
    });
  }
};

// 시니어 카카오 회원가입
export const seniorKakaoSignup = async (req, res) => {
  try {
    const {
      access_token,
      username,
      phone,
      name,
    } = req.body;

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

    const cleanPhone = phone.replace(/-/g, "");

    // 3. phone 중복 체크
    const [phoneExists] = await db.query(
      "SELECT id FROM users WHERE phone = ?",
      [cleanPhone]
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

    // 6. DB 저장 (preferred_mode = 'senior')
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
      VALUES (?, ?, ?, ?, ?, ?, 'senior', ?, 'active', NOW(), NOW(), NOW())
    `;

    const insertParams = [
      "kakao",
      username,
      null, // 카카오 로그인은 비밀번호 없음
      nameToUse,
      cleanPhone,
      profileImageToUse,
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
          phone: cleanPhone,
          profile_image: profileImageToUse,
          preferred_mode: "senior",
          status: "active",
          last_login_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        tokens: token,
      },
    });
  } catch (error) {
    console.error("시니어 카카오 회원가입 실패:", error);
    res.status(500).json({
      success: false,
      message: error.message || "서버 오류",
    });
  }
};

export const getSeniorHome = async (req, res) => {
  res.send('시니어 홈 화면 데이터 (구현 예정)');
};