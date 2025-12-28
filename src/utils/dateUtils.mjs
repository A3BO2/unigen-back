// 상대 시간 변환 헬퍼 함수
export const getRelativeTime = (date) => {
  if (!date) return "";

  const now = new Date();
  const targetDate = new Date(date);

  // 🔥 [핵심 수정] DB 시간(UTC)을 한국 시간(KST)으로 보정
  // DB에서 가져온 시간이 한국 시간보다 9시간 느리게 인식되는 문제를 강제로 고칩니다.
  targetDate.setHours(targetDate.getHours() + 9);

  const diff = now - targetDate;

  // 미래의 시간(오차 범위)이면 '방금 전'
  if (diff < 0) return "방금 전";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // 60초 미만
  if (seconds < 60) return "방금 전";
  // 60분 미만
  if (minutes < 60) return `${minutes}분 전`;
  // 24시간 미만
  if (hours < 24) return `${hours}시간 전`;
  // 7일 미만
  if (days < 7) return `${days}일 전`;

  // 7일 이상이면 날짜로 표시 (예: 2024. 5. 20.)
  return `${targetDate.getFullYear()}. ${
    targetDate.getMonth() + 1
  }. ${targetDate.getDate()}.`;
};
