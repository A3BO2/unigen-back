# Unigen - 세대 간 소셜 네트워크 플랫폼

Unigen은 일반 사용자와 시니어 사용자를 위한 통합 소셜 네트워크 플랫폼입니다. 현대적인 SNS 경험과 시니어 친화적인 인터페이스를 모두 제공합니다.

## 🌟 주요 기능

### 일반 사용자 모드
- 📱 Instagram 스타일의 피드 및 프로필
- 📸 이미지 업로드 및 공유
- 💬 댓글 및 좋아요 기능
- 📖 스토리 기능
- 🎥 릴스(Reels) 비디오 콘텐츠
- 👥 팔로우/팔로잉 시스템
- 🔍 탐색 페이지

### 시니어 사용자 모드
- 📱 큰 글씨와 간소화된 UI
- 👴👵 시니어 친화적인 디자인
- 📝 간편한 게시물 작성
- 👪 가족 연동 기능
- 🔊 음성 안내 지원
- 🌓 다크/라이트 모드

### 공통 기능
- 🔐 카카오 소셜 로그인
- 📧 이메일 인증
- 🔒 비밀번호 재설정
- 🤖 AI 기반 콘텐츠 생성
- ☁️ AWS S3 이미지 저장
- 📱 반응형 디자인

## 🏗️ 프로젝트 구조

```
unigen/
├── unigen-back/          # 백엔드 서버 (Node.js + Express)
│   ├── app.mjs           # 메인 애플리케이션 파일
│   ├── package.json
│   └── src/
│       ├── config/       # 설정 파일
│       │   ├── db.mjs           # 데이터베이스 설정
│       │   └── swagger.mjs      # Swagger API 문서
│       ├── controllers/  # 비즈니스 로직
│       │   ├── aiController.mjs
│       │   ├── authController.mjs
│       │   ├── commentController.mjs
│       │   ├── postController.mjs
│       │   ├── seniorController.mjs
│       │   ├── storyController.mjs
│       │   └── userController.mjs
│       ├── middleware/   # 미들웨어
│       │   ├── authMiddleware.mjs
│       │   └── uploadMiddleware.mjs
│       ├── router/       # API 라우트
│       │   ├── aiRouter.mjs
│       │   ├── authRouter.mjs
│       │   ├── commentRouter.mjs
│       │   ├── postRouter.mjs
│       │   ├── seniorRouter.mjs
│       │   ├── storyRouter.mjs
│       │   └── userRouter.mjs
│       └── utils/        # 유틸리티 함수
│           ├── dateUtils.mjs
│           ├── kakaoClient.mjs
│           ├── openaiClient.mjs
│           ├── s3Client.mjs
│           └── usernameValidator.mjs
│
└── unigen-front/         # 프론트엔드 (React + Vite)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── assets/       # 정적 리소스
        ├── components/   # 재사용 가능한 컴포넌트
        │   ├── normal/          # 일반 모드 컴포넌트
        │   │   ├── BottomNav.jsx
        │   │   ├── CameraModal.jsx
        │   │   ├── LeftSidebar.jsx
        │   │   ├── PostDetailModal.jsx
        │   │   └── RightSidebar.jsx
        │   └── senior/          # 시니어 모드 컴포넌트
        │       └── BottomNav.jsx
        ├── context/      # React Context
        │   └── AppContext.jsx
        ├── pages/        # 페이지 컴포넌트
        │   ├── normal/          # 일반 사용자 페이지
        │   │   ├── Home.jsx
        │   │   ├── Explore.jsx
        │   │   ├── Reels.jsx
        │   │   ├── Profile.jsx
        │   │   ├── Upload.jsx
        │   │   └── ...
        │   ├── senior/          # 시니어 사용자 페이지
        │   │   ├── SeniorHome.jsx
        │   │   ├── Write.jsx
        │   │   ├── Profile.jsx
        │   │   └── ...
        │   └── onboarding/      # 인증 관련 페이지
        │       ├── Welcome.jsx
        │       ├── NormalLogin.jsx
        │       ├── SeniorLogin.jsx
        │       └── ...
        ├── services/     # API 통신 레이어
        │   ├── comment.js
        │   ├── post.js
        │   ├── senior.js
        │   ├── sms.js
        │   ├── story.js
        │   └── user.js
        ├── styles/       # 스타일 관련
        │   └── GlobalStyles.js
        └── utils/        # 유틸리티 함수
            ├── kakaoAuth.js
            ├── timeFormat.js
            └── usernameValidator.js
```

## 🛠️ 기술 스택

### 백엔드
- **런타임**: Node.js
- **프레임워크**: Express.js
- **데이터베이스**: MySQL
- **인증**: JWT, Kakao OAuth
- **파일 저장소**: AWS S3
- **AI**: OpenAI API
- **문서화**: Swagger

### 프론트엔드
- **프레임워크**: React 18
- **빌드 도구**: Vite
- **스타일링**: styled-components
- **라우팅**: React Router
- **상태 관리**: React Context API
- **아이콘**: Lucide React
- **HTTP 클라이언트**: Axios

## 🚀 시작하기

### 사전 요구사항
- Node.js (v16 이상)
- npm 또는 yarn
- MySQL 데이터베이스
- AWS S3 계정 (이미지 저장용)
- Kakao Developers 계정 (소셜 로그인용)
- OpenAI API 키 (AI 기능용)

### 백엔드 설정

1. 백엔드 디렉토리로 이동:
```bash
cd unigen-back
```

2. 의존성 설치:
```bash
npm install
```

3. 환경 변수 설정 (`.env` 파일 생성):
```env
# 데이터베이스
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=unigen

# JWT
JWT_SECRET=your_jwt_secret

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_bucket_name

# Kakao OAuth
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_REDIRECT_URI=your_kakao_redirect_uri

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# 서버
PORT=3000
```

4. 서버 실행:
```bash
npm start
```

### 프론트엔드 설정

1. 프론트엔드 디렉토리로 이동:
```bash
cd unigen-front
```

2. 의존성 설치:
```bash
npm install
```

3. 환경 변수 설정 (`.env` 파일 생성):
```env
VITE_API_URL=http://localhost:3000
VITE_KAKAO_CLIENT_ID=your_kakao_client_id
VITE_KAKAO_REDIRECT_URI=your_kakao_redirect_uri
```

4. 개발 서버 실행:
```bash
npm run dev
```

5. 빌드:
```bash
npm run build
```

## 📡 API 문서

백엔드 서버 실행 후 Swagger 문서 확인:
```
http://localhost:3000/api-docs
```

### 주요 API 엔드포인트

#### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/kakao` - 카카오 로그인
- `POST /api/auth/verify-email` - 이메일 인증
- `POST /api/auth/forgot-password` - 비밀번호 재설정

#### 게시물
- `GET /api/posts` - 게시물 목록 조회
- `POST /api/posts` - 게시물 작성
- `GET /api/posts/:id` - 게시물 상세 조회
- `PUT /api/posts/:id` - 게시물 수정
- `DELETE /api/posts/:id` - 게시물 삭제
- `POST /api/posts/:id/like` - 좋아요
- `DELETE /api/posts/:id/like` - 좋아요 취소

#### 댓글
- `GET /api/comments/:postId` - 댓글 목록 조회
- `POST /api/comments` - 댓글 작성
- `DELETE /api/comments/:id` - 댓글 삭제

#### 사용자
- `GET /api/users/profile` - 프로필 조회
- `PUT /api/users/profile` - 프로필 수정
- `POST /api/users/follow/:userId` - 팔로우
- `DELETE /api/users/follow/:userId` - 언팔로우

#### 시니어
- `GET /api/senior/posts` - 시니어 피드 조회
- `POST /api/senior/posts/:id/like` - 게시물 좋아요
- `GET /api/senior/comments/:postId` - 댓글 조회

#### AI
- `POST /api/ai/generate` - AI 콘텐츠 생성

## 🎨 사용자 인터페이스

### 일반 모드
- **홈**: 팔로잉 사용자의 게시물 피드
- **탐색**: 인기 게시물 및 새로운 사용자 발견
- **릴스**: 짧은 비디오 콘텐츠
- **프로필**: 개인 프로필 및 게시물 관리
- **업로드**: 새 게시물 작성

### 시니어 모드
- **친구소식**: 큰 글씨로 보는 피드
- **글쓰기**: 간편한 게시물 작성
- **프로필**: 프로필 확인 및 수정
- **도움말**: 가족 연동 및 사용 안내

## 🔒 보안

- JWT 기반 인증
- 비밀번호 해싱
- CORS 정책 적용
- XSS 방지
- SQL Injection 방지
- 파일 업로드 검증

## 🧪 테스트

백엔드 테스트:
```bash
cd unigen-back
npm test
```

프론트엔드 테스트:
```bash
cd unigen-front
npm test
```

## 📦 배포

### 백엔드 배포
```bash
cd unigen-back
npm run build
npm run start:prod
```

### 프론트엔드 배포
```bash
cd unigen-front
npm run build
# dist 폴더를 웹 서버에 배포
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 👥 개발팀

- **Frontend Developer**: React, Vite, styled-components
- **Backend Developer**: Node.js, Express, MySQL
- **UI/UX Designer**: 시니어 친화적 인터페이스 설계

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해 주세요.

## 🙏 감사의 말

- Kakao Developers for OAuth integration
- OpenAI for AI capabilities
- AWS for cloud services
- All contributors who helped make this project better

---

**Made with ❤️ for connecting generations**
