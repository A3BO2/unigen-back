-- 1. 데이터베이스 생성 (없으면 만들고, 있으면 넘어감)
CREATE DATABASE IF NOT EXISTS senior_app 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 2. 해당 데이터베이스 선택 (이제부터 여기다 짓겠다)
USE senior_app;

-- ==========================================
-- 3. 테이블 생성 (Auth & Account)
-- ==========================================

-- 사용자 정보 (users)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '사용자 고유 ID',
    signup_mode VARCHAR(20) NOT NULL DEFAULT 'phone' COMMENT '가입 방식 (phone / kakao)',
    kakao_user_id VARCHAR(50) UNIQUE COMMENT '카카오 고유 사용자 ID (카카오 가입 시 필수)',
    phone VARCHAR(20) UNIQUE COMMENT '전화번호 (OTP 로그인용)',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '서비스 내 고유 사용자명',
    name VARCHAR(50) COMMENT '사용자 실명 또는 표시 이름',
    profile_image VARCHAR(500) COMMENT '프로필 이미지 URL',
    preferred_mode VARCHAR(20) DEFAULT 'normal' COMMENT '선호 UI 모드 (normal / senior)',
    status VARCHAR(20) DEFAULT 'active' COMMENT '계정 상태 (active / inactive / banned)',
    last_login_at DATETIME COMMENT '마지막 로그인 시각',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '계정 생성 시각',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '계정 정보 수정 시각'
) COMMENT '사용자 기본 계정 정보';

-- 사용자 설정 (user_settings)
CREATE TABLE user_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '설정 ID',
    user_id BIGINT NOT NULL UNIQUE COMMENT '사용자 ID (1:1)',
    font_scale VARCHAR(20) DEFAULT 'medium' COMMENT '글자 크기 (small / medium / large)',
    notifications_on BOOLEAN DEFAULT TRUE COMMENT '알림 수신 여부',
    dark_mode BOOLEAN DEFAULT FALSE COMMENT '다크 모드 여부',
    language VARCHAR(10) DEFAULT 'ko' COMMENT '언어 코드',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '설정 생성 시각',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '설정 수정 시각',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '사용자 개인 환경 설정';

-- 사용자 세션 (user_sessions)
CREATE TABLE user_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '세션 ID',
    user_id BIGINT NOT NULL COMMENT '사용자 ID',
    auth_method VARCHAR(20) NOT NULL COMMENT '인증 방식 (phone / kakao)',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '세션 시작 시각',
    ended_at DATETIME COMMENT '세션 종료 시각',
    device_info VARCHAR(255) COMMENT '접속 디바이스 정보',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '사용자 로그인 세션 기록';

-- 전화번호 인증 (phone_verifications)
CREATE TABLE phone_verifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '전화 인증 ID',
    phone VARCHAR(20) NOT NULL COMMENT '인증 대상 전화번호',
    code VARCHAR(6) NOT NULL COMMENT '인증 코드',
    purpose VARCHAR(20) NOT NULL COMMENT '인증 목적 (signup / login)',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '인증 상태 (pending / verified / expired)',
    expires_at DATETIME NOT NULL COMMENT '인증 코드 만료 시각',
    verified_at DATETIME COMMENT '인증 완료 시각',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '인증 요청 시각'
) COMMENT '전화번호 OTP 인증 기록';

-- ==========================================
-- 4. 테이블 생성 (Social Graph)
-- ==========================================

-- 팔로우 (user_follows)
CREATE TABLE user_follows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '팔로우 ID',
    follower_id BIGINT NOT NULL COMMENT '팔로우 요청 사용자 ID',
    followee_id BIGINT NOT NULL COMMENT '팔로우 대상 사용자 ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '팔로우 생성 시각',
    UNIQUE KEY user_follows_unique (follower_id, followee_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '사용자 간 팔로우 관계';

-- 가족 연결 (family_links)
CREATE TABLE family_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '가족 연동 ID',
    senior_user_id BIGINT NOT NULL COMMENT '시니어 사용자 ID',
    family_user_id BIGINT NOT NULL COMMENT '가족 사용자 ID',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '연결 상태 (pending / accepted)',
    can_manage_settings BOOLEAN DEFAULT TRUE COMMENT '설정 관리 권한 여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '요청 생성 시각',
    accepted_at DATETIME COMMENT '연결 승인 시각',
    UNIQUE KEY family_links_unique (senior_user_id, family_user_id),
    FOREIGN KEY (senior_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '시니어-가족 계정 연결';

-- ==========================================
-- 5. 테이블 생성 (Content)
-- ==========================================

-- 게시물 (posts)
CREATE TABLE posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '게시물 ID',
    author_id BIGINT NOT NULL COMMENT '작성자 사용자 ID',
    post_type VARCHAR(20) COMMENT '게시물 유형 (feed / story / reel)',
    content TEXT COMMENT '최종 게시 텍스트',
    image_url VARCHAR(500) COMMENT '대표 이미지 URL',
    video_url VARCHAR(500) COMMENT '동영상 URL',
    is_senior_mode BOOLEAN DEFAULT FALSE COMMENT '시니어 모드 작성 여부',
    input_type VARCHAR(20) COMMENT '입력 방식 (text / voice)',
    ai_tone_id BIGINT COMMENT 'AI 말투 테마 ID',
    visibility VARCHAR(20) DEFAULT 'public' COMMENT '공개 범위 (public / followers)',
    like_count INT DEFAULT 0 COMMENT '좋아요 수',
    comment_count INT DEFAULT 0 COMMENT '댓글 수',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '게시물 생성 시각',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '게시물 수정 시각',
    deleted_at DATETIME COMMENT '삭제 시각 (소프트 삭제)',
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '사용자 게시물';

-- 게시물 이미지 (post_images)
CREATE TABLE post_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '게시물 이미지 ID',
    post_id BIGINT NOT NULL COMMENT '게시물 ID',
    image_url VARCHAR(500) NOT NULL COMMENT '이미지 URL',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '이미지 정렬 순서',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '이미지 등록 시각',
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) COMMENT '게시물 다중 이미지';

-- 스토리 (stories)
CREATE TABLE stories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '스토리 ID',
    user_id BIGINT NOT NULL COMMENT '작성자 사용자 ID',
    media_url VARCHAR(500) NOT NULL COMMENT '스토리 미디어 URL',
    caption VARCHAR(500) COMMENT '스토리 설명 텍스트',
    starts_at DATETIME COMMENT '스토리 노출 시작 시각',
    expires_at DATETIME COMMENT '스토리 만료 시각',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '스토리 생성 시각',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '스토리 콘텐츠';

-- 스토리 조회 (story_views)
CREATE TABLE story_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '스토리 조회 ID',
    story_id BIGINT NOT NULL COMMENT '스토리 ID',
    viewer_id BIGINT NOT NULL COMMENT '조회한 사용자 ID',
    viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '조회 시각',
    UNIQUE KEY story_views_unique (story_id, viewer_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '스토리 조회 기록';

-- ==========================================
-- 6. 테이블 생성 (Engagement)
-- ==========================================

-- 댓글 (comments)
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '댓글 ID',
    post_id BIGINT NOT NULL COMMENT '게시물 ID',
    author_id BIGINT NOT NULL COMMENT '댓글 작성자 ID',
    content TEXT NOT NULL COMMENT '댓글 내용',
    like_count INT DEFAULT 0 COMMENT '댓글 좋아요 수',
    status VARCHAR(20) DEFAULT 'active' COMMENT '댓글 상태',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '댓글 생성 시각',
    deleted_at DATETIME COMMENT '댓글 삭제 시각',
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '게시물 댓글';

-- 좋아요 (likes)
CREATE TABLE likes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '좋아요 ID',
    post_id BIGINT NOT NULL COMMENT '게시물 ID',
    user_id BIGINT NOT NULL COMMENT '좋아요 누른 사용자 ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 생성 시각',
    UNIQUE KEY likes_unique (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '게시물 좋아요';

-- ==========================================
-- 7. 테이블 생성 (Notifications)
-- ==========================================

-- 알림 (notifications)
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '알림 ID',
    recipient_id BIGINT NOT NULL COMMENT '알림 수신자 ID',
    actor_id BIGINT COMMENT '행위자 사용자 ID',
    type VARCHAR(30) NOT NULL COMMENT '알림 유형',
    post_id BIGINT COMMENT '관련 게시물 ID',
    comment_id BIGINT COMMENT '관련 댓글 ID',
    message TEXT COMMENT '알림 메시지',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    read_at DATETIME COMMENT '읽은 시각',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '알림 생성 시각',
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
) COMMENT '사용자 알림';

-- 8. 외래키 체크 다시 활성화
SET FOREIGN_KEY_CHECKS = 1;