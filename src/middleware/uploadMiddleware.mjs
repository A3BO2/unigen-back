// 사진 업로드 설정 (Multer)

import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ 프로젝트 최상위 폴더의 'uploads' 경로를 확실하게 잡기
const uploadDir = path.join(process.cwd(), "uploads");

// 만약 폴더가 없으면 자동으로 생성해주는 안전장치 (선택사항이지만 추천)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 수정된 부분: 'uploads/' 대신 절대 경로 변수(uploadDir) 사용
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({ storage: storage });
