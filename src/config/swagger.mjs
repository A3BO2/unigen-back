import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Senior SNS API",
      version: "1.0.0",
      description: "시니어 SNS 프로젝트 백엔드 API 명세서",
      contact: {
        name: "A3BO2 Team",
      },
    },
    servers: [
      {
        url: "https://unigensns.duckdns.org/api",
        description: "개발 서버",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT 토큰을 입력하세요 (Bearer 접두사 없이)",
        },
      },
      schemas: {
        // ========== 공통 응답 ==========
        Error: {
          type: "object",
          properties: {
            message: { type: "string", description: "에러 메시지" },
            success: { type: "boolean", default: false },
          },
        },
        Success: {
          type: "object",
          properties: {
            message: { type: "string", description: "성공 메시지" },
            success: { type: "boolean", default: true },
          },
        },

        // ========== 인증 관련 ==========
        SignupRequest: {
          type: "object",
          required: ["signup_mode", "username", "password", "phone"],
          properties: {
            signup_mode: {
              type: "string",
              enum: ["phone", "kakao"],
              description: "가입 방식",
            },
            username: { type: "string", description: "사용자 아이디" },
            password: { type: "string", description: "비밀번호" },
            name: { type: "string", description: "이름" },
            phone: { type: "string", description: "전화번호" },
            profile_image: { type: "string", description: "프로필 이미지 URL" },
            preferred_mode: {
              type: "string",
              enum: ["normal", "senior"],
              description: "선호 모드",
              default: "normal",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["phone", "password"],
          properties: {
            phone: { type: "string", description: "전화번호" },
            password: { type: "string", description: "비밀번호" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            token: { type: "string", description: "JWT 토큰" },
            data: {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
        SignupResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/User" },
                tokens: { type: "string", description: "JWT 토큰" },
              },
            },
          },
        },
        KakaoLoginRequest: {
          type: "object",
          required: ["access_token"],
          properties: {
            access_token: { type: "string", description: "카카오 액세스 토큰" },
          },
        },
        KakaoSignupRequest: {
          type: "object",
          required: ["access_token", "username", "phone"],
          properties: {
            access_token: { type: "string", description: "카카오 액세스 토큰" },
            username: { type: "string", description: "사용자 아이디" },
            phone: { type: "string", description: "전화번호" },
            name: { type: "string", description: "이름" },
          },
        },
        SendCodeRequest: {
          type: "object",
          required: ["phone"],
          properties: {
            phone: { type: "string", description: "전화번호" },
            type: {
              type: "string",
              enum: ["signup", "find_pw", "senior"],
              description: "인증 목적",
            },
          },
        },
        VerifyCodeRequest: {
          type: "object",
          required: ["phone", "code"],
          properties: {
            phone: { type: "string", description: "전화번호" },
            code: { type: "string", description: "인증번호 6자리" },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          properties: {
            phone: {
              type: "string",
              description: "전화번호 (비밀번호 찾기 시)",
            },
            code: {
              type: "string",
              description: "인증번호 (비밀번호 찾기 시)",
            },
            currentPassword: {
              type: "string",
              description: "현재 비밀번호 (로그인 상태에서 변경 시)",
            },
            newPassword: { type: "string", description: "새 비밀번호" },
          },
        },

        // ========== 사용자 관련 ==========
        User: {
          type: "object",
          properties: {
            id: { type: "integer", description: "사용자 ID" },
            username: { type: "string", description: "사용자 아이디" },
            name: { type: "string", description: "이름" },
            phone: { type: "string", description: "전화번호" },
            profile_image: { type: "string", description: "프로필 이미지 URL" },
            preferred_mode: {
              type: "string",
              enum: ["normal", "senior"],
              description: "선호 모드",
            },
            status: { type: "string", description: "계정 상태" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "integer" },
            username: { type: "string" },
            name: { type: "string" },
            profile_image: { type: "string" },
            bio: { type: "string", description: "자기소개" },
            preferred_mode: { type: "string" },
            post_count: { type: "integer" },
            follower_count: { type: "integer" },
            following_count: { type: "integer" },
          },
        },
        UserProfileResponse: {
          type: "object",
          properties: {
            profile: { $ref: "#/components/schemas/UserProfile" },
            posts: {
              type: "array",
              items: { $ref: "#/components/schemas/Post" },
            },
            pagination: { $ref: "#/components/schemas/Pagination" },
          },
        },
        UserSettings: {
          type: "object",
          properties: {
            fontScale: {
              type: "string",
              enum: ["small", "medium", "large"],
              description: "폰트 크기",
            },
            notificationsOn: {
              type: "boolean",
              description: "알림 활성화 여부",
            },
            seniorSimpleMode: {
              type: "boolean",
              description: "시니어 간편 모드",
            },
            language: { type: "string", description: "언어 설정" },
            isDarkMode: { type: "boolean", description: "다크 모드 여부" },
          },
        },
        FollowRequest: {
          type: "object",
          required: ["followeeId"],
          properties: {
            followeeId: {
              type: "integer",
              description: "팔로우할 사용자 ID",
            },
          },
        },
        FollowerList: {
          type: "object",
          properties: {
            followers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", description: "사용자 ID" },
                  username: { type: "string", description: "사용자 아이디" },
                  name: { type: "string", description: "이름" },
                  profile_image: {
                    type: "string",
                    description: "프로필 이미지 URL",
                  },
                  followed_at: {
                    type: "string",
                    format: "date-time",
                    description: "팔로우한 시간",
                  },
                },
              },
            },
          },
        },
        FollowingList: {
          type: "object",
          properties: {
            following: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", description: "사용자 ID" },
                  username: { type: "string", description: "사용자 아이디" },
                  name: { type: "string", description: "이름" },
                  profile_image: {
                    type: "string",
                    description: "프로필 이미지 URL",
                  },
                  followed_at: {
                    type: "string",
                    format: "date-time",
                    description: "팔로우한 시간",
                  },
                },
              },
            },
          },
        },

        // ========== 게시물 관련 ==========
        Post: {
          type: "object",
          properties: {
            id: { type: "integer", description: "게시물 ID" },
            author_id: { type: "integer", description: "작성자 ID" },
            content: { type: "string", description: "게시물 내용" },
            post_type: {
              type: "string",
              enum: ["feed", "reel"],
              description: "게시물 타입",
            },
            image_url: {
              type: "string",
              description: "이미지 URL (JSON 배열)",
            },
            video_url: {
              type: "string",
              description: "비디오 URL (reel인 경우)",
            },
            like_count: { type: "integer", description: "좋아요 수" },
            comment_count: { type: "integer", description: "댓글 수" },
            is_senior_mode: {
              type: "boolean",
              description: "시니어 모드 여부",
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        CreatePostRequest: {
          type: "object",
          properties: {
            content: { type: "string", description: "게시물 내용" },
            postType: {
              type: "string",
              enum: ["feed", "reel"],
              description: "게시물 타입",
            },
            isSeniorMode: {
              type: "string",
              description: "시니어 모드 여부 ('true' or 'false')",
            },
          },
        },
        UpdatePostRequest: {
          type: "object",
          properties: {
            content: { type: "string", description: "수정할 게시물 내용" },
          },
        },
        FeedResponse: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", description: "게시물 ID" },
                  author: {
                    type: "object",
                    properties: {
                      id: { type: "integer", description: "작성자 ID" },
                      username: { type: "string", description: "작성자 이름" },
                      profileImageUrl: {
                        type: "string",
                        description: "작성자 프로필 이미지",
                      },
                    },
                  },
                  content: { type: "string", description: "게시물 내용" },
                  imageUrl: {
                    type: "string",
                    description: "이미지 URL (JSON 배열)",
                  },
                  postType: {
                    type: "string",
                    enum: ["feed", "reel"],
                    description: "게시물 타입",
                  },
                  isSeniorMode: {
                    type: "boolean",
                    description: "시니어 모드 여부",
                  },
                  likeCount: { type: "integer", description: "좋아요 수" },
                  commentCount: { type: "integer", description: "댓글 수" },
                  createdAt: {
                    type: "string",
                    format: "date-time",
                    description: "작성 시간",
                  },
                  timestamp: {
                    type: "string",
                    description: "상대적 시간 (예: 2시간 전)",
                  },
                },
              },
            },
            page: { type: "integer", description: "현재 페이지" },
            size: { type: "integer", description: "페이지 크기" },
            hasNext: { type: "boolean", description: "다음 페이지 존재 여부" },
          },
        },

        // ========== 댓글 관련 ==========
        Comment: {
          type: "object",
          properties: {
            id: { type: "integer", description: "댓글 ID" },
            postId: { type: "integer", description: "게시물 ID" },
            text: { type: "string", description: "댓글 내용" },
            createdAt: { type: "string", format: "date-time" },
            time: { type: "string", description: "상대적 시간 (예: 2시간 전)" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer", description: "작성자 ID" },
                username: { type: "string", description: "작성자 이름" },
                avatar: { type: "string", description: "작성자 프로필 이미지" },
              },
            },
          },
        },
        CreateCommentRequest: {
          type: "object",
          required: ["postId", "content"],
          properties: {
            postId: { type: "integer", description: "게시물 ID" },
            content: { type: "string", description: "댓글 내용" },
          },
        },
        CommentListResponse: {
          type: "object",
          properties: {
            postId: { type: "integer", description: "게시물 ID" },
            comments: {
              type: "array",
              items: { $ref: "#/components/schemas/Comment" },
            },
          },
        },

        // ========== 스토리 관련 ==========
        Story: {
          type: "object",
          properties: {
            userId: { type: "integer" },
            author: {
              type: "object",
              properties: {
                username: { type: "string" },
                profileImageUrl: { type: "string" },
              },
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  imageUrl: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  timestamp: { type: "string" },
                },
              },
            },
          },
        },
        StoryListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            stories: {
              type: "array",
              items: { $ref: "#/components/schemas/Story" },
            },
          },
        },
        StoryViewerResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            viewers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  userId: { type: "integer" },
                  userName: { type: "string" },
                  profileImageUrl: { type: "string" },
                  viewedAt: { type: "string", format: "date-time" },
                  viewedAtTime: { type: "string" },
                },
              },
            },
          },
        },

        // ========== 시니어 관련 ==========
        SeniorPhoneAuthRequest: {
          type: "object",
          required: ["phone", "code"],
          properties: {
            phone: { type: "string", description: "전화번호" },
            code: { type: "string", description: "인증번호" },
            name: { type: "string", description: "이름 (선택사항)" },
          },
        },
        SeniorHomeResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
          },
        },

        // ========== AI 관련 ==========
        RefineTextRequest: {
          type: "object",
          properties: {
            text: { type: "string", description: "다듬을 텍스트" },
            theme: {
              type: "string",
              enum: [
                "daily",
                "greeting",
                "family",
                "thanks",
                "memory",
                "cheer",
                "light",
                "intro",
              ],
              description: "테마",
            },
            image: { type: "string", description: "Base64 이미지 (선택사항)" },
          },
        },
        RefineTextResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            result: {
              type: "string",
              description: "AI가 생성한 게시글 내용 (해시태그 포함)",
            },
          },
        },

        // ========== 공통 ==========
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
            total_count: { type: "integer" },
            total_pages: { type: "integer" },
            has_next: { type: "boolean" },
            has_prev: { type: "boolean" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "인증 관련 API" },
      { name: "Users", description: "사용자 관련 API" },
      { name: "Posts", description: "게시물 관련 API" },
      { name: "Comments", description: "댓글 관련 API" },
      { name: "Stories", description: "스토리 관련 API" },
      { name: "Senior", description: "시니어 전용 API" },
      { name: "AI", description: "AI 기능 API" },
    ],
  },
  apis: ["./src/router/*.mjs"], // JSDoc 주석이 있는 라우터 파일 경로
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  // Swagger UI 서빙
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Senior SNS API 문서",
    })
  );

  // JSON 스펙 엔드포인트
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log("📚 Swagger UI: http://localhost:3000/api-docs");
};

export default swaggerSpec;
