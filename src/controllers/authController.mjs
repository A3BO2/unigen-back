// 회원가입 함수, 로그인 함수..
import jwt from "jsonwebtoken";
import db from "../config/db.mjs";
import bcrypt from "bcryptjs";

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
