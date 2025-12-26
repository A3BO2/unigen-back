import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// S3 클라이언트 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
// 필요 시 커스텀 도메인(CloudFront/S3 정적 웹) 설정
const PUBLIC_BASE_URL =
  process.env.S3_PUBLIC_BASE_URL ||
  (BUCKET && REGION ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : null);

// ACL이 차단된 버킷이라면 S3_OBJECT_ACL를 비우세요.
const DEFAULT_ACL = process.env.S3_OBJECT_ACL || null;

/**
 * 파일을 S3에 업로드하는 함수
 * @param {Buffer} fileBuffer - 업로드할 파일의 버퍼
 * @param {string} fileName - S3에 저장될 파일명
 * @param {string} contentType - 파일의 MIME 타입 (예: 'image/jpeg')
 * @returns {Promise<string>} - 업로드된 파일의 공개 URL
 */
export async function uploadToS3(
  fileBuffer,
  fileName,
  contentType = "image/jpeg"
) {
  try {
    if (!BUCKET || !REGION) {
      throw new Error(
        "S3_BUCKET_NAME 또는 AWS_REGION 환경변수가 설정되지 않았습니다."
      );
    }

    const params = {
      Bucket: BUCKET,
      Key: fileName, // S3에 저장될 이름
      Body: fileBuffer,
      ContentType: contentType, // 파일 타입 설정
    };

    // 버킷이 ACL을 허용할 때만 설정
    if (DEFAULT_ACL) {
      params.ACL = DEFAULT_ACL;
    }

    await s3Client.send(new PutObjectCommand(params));

    // 공개 URL 생성
    const baseUrl =
      PUBLIC_BASE_URL || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
    const url = `${baseUrl}/${fileName}`;

    return url;
  } catch (error) {
    console.error("❌ S3 업로드 실패:", error);
    throw error;
  }
}

export default s3Client;
