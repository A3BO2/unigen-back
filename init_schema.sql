-- 1. 데이터베이스 생성 (없다면 실행)
CREATE DATABASE IF NOT EXISTS senior_app 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE senior_app;

-- 2. 사용자 테이블 (가장 기본)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) COMMENT '전화번호 로그인용, 시니어 간편 가입',
    email VARCHAR(255) COMMENT '일반 가입용, nullable',
    password_hash VARCHAR(255),
    name VARCHAR(50) COMMENT '표시 이름(자동 생성 가능)',
    nickname VARCHAR(50) COMMENT '프로필용 닉네임, 선택',
    profile_image_url VARCHAR(500),
    bio TEXT,
    is_senior BOOLEAN DEFAULT FALSE COMMENT '시니어 모드 사용자 여부',
    signup_mode VARCHAR(20) COMMENT 'normal / senior',
    status VARCHAR(20) DEFAULT 'active' COMMENT 'active / locked / deleted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME
) COMMENT '사용자 정보';

-- 3. AI 말투 프리셋 (Post에서 참조하므로 먼저 생성)
CREATE TABLE ai_tone_presets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) COMMENT 'basic / warm / to_grandchild / to_friend 등',
    name VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
) COMMENT 'AI 말투 설정';

-- 4. 사용자 설정
CREATE TABLE user_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    font_scale VARCHAR(20) COMMENT 'small / medium / large 등',
    notifications_on BOOLEAN DEFAULT TRUE,
    senior_simple_mode BOOLEAN DEFAULT FALSE COMMENT '시니어용 간단 모드 사용 여부',
    language VARCHAR(10) COMMENT 'ko / en 등',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '사용자 환경설정';

-- 5. 게시글
CREATE TABLE posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_id BIGINT NOT NULL,
    post_type VARCHAR(20) COMMENT 'feed / story / reel',
    content TEXT COMMENT '최종 업로드 텍스트',
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    is_senior_mode BOOLEAN DEFAULT FALSE COMMENT '시니어 모드에서 작성된 글인지 여부',
    input_type VARCHAR(20) COMMENT 'text / voice',
    ai_tone_id BIGINT COMMENT '선택된 말투 테마',
    visibility VARCHAR(20) DEFAULT 'public' COMMENT 'public / followers',
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ai_tone_id) REFERENCES ai_tone_presets(id) ON DELETE SET NULL
) COMMENT '게시글';

-- 6. 댓글
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '댓글';

-- 7. 좋아요 (중복 방지 인덱스 포함)
CREATE TABLE likes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (post_id, user_id)
) COMMENT '게시글 좋아요';

-- 8. 팔로우 (중복 방지 인덱스 포함)
CREATE TABLE user_follows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    follower_id BIGINT NOT NULL,
    followee_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (follower_id, followee_id)
) COMMENT '팔로우 관계';

-- 9. 사용자 태그
CREATE TABLE user_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '게시글 내 사용자 태그';

-- 10. 가족 연결 (시니어-보호자)
CREATE TABLE family_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    senior_user_id BIGINT NOT NULL,
    family_user_id BIGINT NOT NULL,
    status VARCHAR(20) COMMENT 'pending / active / revoked',
    role VARCHAR(20) COMMENT 'family / caregiver',
    can_manage_settings BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME,
    FOREIGN KEY (senior_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '시니어와 가족 연결';

-- 11. 도움 요청
CREATE TABLE help_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    senior_user_id BIGINT NOT NULL,
    family_user_id BIGINT, -- 매칭 전엔 NULL 가능
    type VARCHAR(20) COMMENT 'connect / support',
    status VARCHAR(20) COMMENT 'pending / handled / cancelled',
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    handled_at DATETIME,
    FOREIGN KEY (senior_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE SET NULL
) COMMENT '시니어 도움 요청';

-- 12. AI 제안 (글 작성 보조)
CREATE TABLE ai_suggestions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    post_id BIGINT, -- 임시 글 단계면 NULL 가능
    tone_id BIGINT,
    original_text TEXT,
    suggested_text TEXT,
    is_applied BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    FOREIGN KEY (tone_id) REFERENCES ai_tone_presets(id) ON DELETE SET NULL
) COMMENT 'AI 글 다듬기 제안 로그';

-- 13. 음성 입력 로그
CREATE TABLE voice_inputs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    source_type VARCHAR(20) COMMENT 'post / command 등',
    recognized_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '음성 입력 로그';