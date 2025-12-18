// 회원가입 함수, 로그인 함수..
import jwt from "jsonwebtoken";
import db from "../config/db.mjs";
import bcrypt from "bcryptjs";
import { getKakaoUserInfo } from "../utils/kakaoClient.mjs";

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
  const connection = await db.getConnection();
  try {
    const { phone, password } = req.body;
    // 1. 사용자 찾기
    const [[user]] = await connection.query(
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
    await db.query(
      "UPDATE users SET last_login_at = NOW() WHERE id = ?",
      [user.id]
    );

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
    const {
      access_token,
      username,
      phone,
      name,
      preferred_mode,
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
