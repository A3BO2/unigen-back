// 서버 실행 메인 파일
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 각 기능별 라우터 불러오기 (.mjs 필수)
import authrouter from "./src/router/authRouter.mjs";
import postrouter from "./src/router/postRouter.mjs";
import seniorrouter from "./src/router/seniorRouter.mjs";
import airouter from "./src/router/aiRouter.mjs";
import userrouter from "./src/router/userRouter.mjs";
import storyRouter from "./src/router/storyRouter.mjs";
import commentRouter from "./src/router/commentRouter.mjs";
import aiRouter from "./src/router/aiRouter.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use((req, res, next) => {
  console.log(`[요청 들어옴] ${req.method} ${req.url}`);
  console.log("보낸 데이터:", req.body);
  next();
});

app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 라우터 등록
app.use("/api/v1/auth", authrouter);
app.use("/api/v1/posts", postrouter);
app.use("/api/v1/senior", seniorrouter);
app.use("/api/v1/ai", airouter);
app.use("/api/v1/users", userrouter);
app.use("/api/v1/stories", storyRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/ai", aiRouter);

app.get("/", (req, res) => {
  res.send("Senior SNS API Server (Full Version) is running... 🚀");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
