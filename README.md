# 👵👴 Senior SNS Backend Project: 시니어를 위한 인스타그램 클론 & AI 도우미 서비스

## 🚀 프로젝트 개요
| 분류 | 내용 |
| :--- | :--- |
| **프로젝트명** | Senior SNS Backend Project |
| **기간** | 2025.12.11 ~ 2026.??.?? |
| **목표** | 시니어 사용자가 디지털 소외 없이 소셜 미디어를 즐길 수 있도록 돕는 Node.js 기반의 백엔드 API 서버 개발. 일반 모드(인스타그램 클론)와 시니어 모드(간편 UI, AI 글쓰기 보조) 모두 지원. |

---

## 🛠 Tech Stack (기술 스택)

| 분류 | 기술 | 비고 |
| :--- | :--- | :--- |
| **Runtime** | `Node.js` (v18+) | JavaScript 실행 환경 |
| **Framework** | `Express.js` | 빠르고 간결한 웹 서버 프레임워크 |
| **Database** | `MariaDB` | 관계형 데이터베이스 |
| **Module System** | `ES Modules` (.mjs) | `import / export` 문법 사용 (필수) |
| **AI Integration** | `OpenAI API` | `GPT-4` (글쓰기 보조), `Whisper` (음성 인식), `Vision` (사진 분석) |

---

## 📂 프로젝트 구조 (Directory Structure)

이 프로젝트는 **MVC(Model-View-Controller) 패턴**을 따르며, **ESM(.mjs)** 방식을 사용합니다.

```
my-senior-sns-backend/
├── src/
│   ├── config/          # ⚙️ DB 연결 및 환경 설정 (db.mjs)
│   ├── controllers/     # 🕹️ 비즈니스 로직 처리 (실제 기능 구현)
│   ├── routes/          # 🚦 API 주소 라우팅 (길 안내 역할)
│   ├── middlewares/     # 🛡️ 로그인 인증, 파일 업로드 처리 |
│   └── utils/           # 🧩 공통 함수 (OpenAI 연동, 날짜 변환 등)
├── uploads/             # 📷 이미지 업로드 저장소 (Git에 의해 제외됨)
├── .env                 # 🔑 환경변수 (DB 비밀번호, API Key 등 - **절대 공유 금지!**)
├── app.mjs              # 🚀 서버 실행 진입점 (메인 파일)
└── package.json         # 📦 프로젝트 라이브러리 목록 및 스크립트
```

---

## 🚀 시작 가이드 (Getting Started)

팀원분들은 아래 순서대로 개발 환경을 세팅해 주세요.

### 1. 프로젝트 복제 (Clone)

```bash
git clone <레포지토리_URL>
cd server(파일 미리 생성)
```

### 2. 라이브러리 설치 (Install)

```bash
npm install
```
> ⚠️ **참고:** `npm warn deprecated` 경고 메시지는 무시하셔도 됩니다.

### 3. 환경 변수 설정 (.env)

프로젝트 최상위 경로에 `.env` 파일을 생성하고, 아래 내용을 복사해서 **본인의 정보로 채워주세요.** (DB_PASSWORD와 OPENAI_API_KEY는 각자 설정)

```dotenv
# [Server]
PORT=3000

# [Database]
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=본인의_DB_비밀번호
DB_NAME=senior_sns

# [Security]
JWT_SECRET=team_secret_key_1234

# [AI Key]
OPENAI_API_KEY=
```

### 4. 데이터베이스 세팅 (MariaDB)

MariaDB 워크벤치(HeidiSQL)에서 `init_schema.sql`을 복사 붙여넣기 후후 실행하여 **기본 데이터베이스와 테이블**을 생성하세요.



### 5. 서버 실행 (Run)

개발 모드(`Nodemon`)로 실행합니다. 코드를 수정하면 서버가 자동 재시작됩니다.

```bash
npm run dev
```

> 터미널에 `Server is running on port 3000`이 뜨면 성공! 🎉

---

## ⚠️ 개발 규칙 (Conventions) - 중요!

### 1. 파일 확장자는 `.mjs` 필수

ES Modules(`import` 문)을 사용할 때 **반드시 파일 확장자(.mjs)를 붙여야** 합니다.

* ❌ `import db from '../config/db';` (**에러 발생**)
* ⭕ `import db from '../config/db.mjs';` (**정상 작동**)

### 2. Git 브랜치 전략

* `main` 브랜치에는 **직접 Push 하지 않습니다.**
* branch 만드는 방법
    * `git switch -c [새로운 브랜치명(ex. feature/kdy/upload-post)]`
* 본인의 기능(Feature) 브랜치를 따서 작업 후 **PR(Pull Request)**을 보냅니다.
* **브랜치 예시:** `feature/kdy/upload-post`,

### 앞에 붙이는 표준 키워드 (Type)

| 키워드 | 설명 | 예시 |
| :--- | :--- | :--- |
| **feature** | 새로운 기능 개발 (가장 많이 씀) | `feature/kim/chat-ui` |
| **fix** | 버그 수정 | `fix/lee/login-error` |
| **docs** | 문서 수정 (README 등) | `docs/park/readme-update` |
| **style** | 코드 포맷팅, 세미콜론 누락 등 (로직 변경 X) | `style/kim/indent-fix` |
| **refactor** | 코드 리팩토링 (기능 변경 없이 코드 개선) | `refactor/choi/db-query` |
| **test** | 테스트 코드 추가 | `test/lee/user-test` |
| **chore** | 빌드 설정, 패키지 매니저 설정 등 자잘한 작업 | `chore/kim/npm-update` |

---

## 👨‍💻 담당 업무 (R&R - Roles and Responsibilities)

| 담당자 | 담당 기능 | 주요 파일 위치 |
| :--- | :--- | :--- |
| 수현 | 회원가입, 로그인 (Auth) | `controllers/authController.mjs` |
| 나미 | 프로필, 시니어 마이페이지 | `controllers/seniorController.mjs` |
| **대영(Me)** | **게시물 작성, AI/음성 기능** | `controllers/postController.mjs` |
| 용완 | 댓글/좋아요, 시니어 홈 | `controllers/postController.mjs` |
| 유진 | 홈 피드, 탐색 탭 | `controllers/postController.mjs` |

---

## 📡 API 테스트 예시

Postman이나 Thunder Client로 테스트해보세요.

### 게시물 작성 (POST `/api/v1/posts`)

* **URL:** `http://localhost:3000/api/v1/posts`
* **Method:** `POST`
* **Body Type:** `JSON (application/json)`
* **Body (JSON):**

    ```json
    {
      "content": "팀 프로젝트 화이팅!",
      "imageUrl": "[http://example.com/photo.jpg](http://example.com/photo.jpg)",
      "isSeniorMode": false
    }
    ```
