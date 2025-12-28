// 상대 시간 변환 헬퍼 함수
export const getRelativeTime = (date) => {
  if (!date) return "";

  const now = new Date();
  let targetDate;

  // DB에서 가져온 시간 처리
  // MySQL에서 UTC_TIMESTAMP()로 저장된 경우 UTC 시간이지만 타임존 정보 없이 반환됨
  // mysql2 드라이버는 Date 객체로 반환할 수 있는데, 이 경우 로컬 타임존으로 해석됨
  // 따라서 Date 객체인 경우 UTC로 다시 처리해야 함

  if (date instanceof Date) {
    // Date 객체인 경우: MySQL에서 UTC로 저장했지만 Date 객체로 변환되면서 로컬 타임존으로 해석됨
    // toISOString()으로 UTC 문자열을 얻고 다시 파싱하면 UTC로 처리됨
    const isoString = date.toISOString();
    targetDate = new Date(isoString);
  } else {
    // 문자열인 경우: "2024-01-01 12:00:00" 형식 (UTC)
    let dateStr = String(date);

    // 타임존 정보가 없으면 UTC로 간주하고 Z를 붙임
    if (
      !dateStr.includes("Z") &&
      !dateStr.includes("+") &&
      !dateStr.includes("-", 10)
    ) {
      // ISO 형식 변환: "2024-01-01 12:00:00" -> "2024-01-01T12:00:00Z"
      if (dateStr.includes(" ")) {
        dateStr = dateStr.replace(" ", "T") + "Z";
      } else {
        dateStr += "Z";
      }
    }

    // UTC 문자열을 Date 객체로 변환
    // "2024-01-01T12:00:00Z"는 UTC 시간으로 해석되고, 자동으로 로컬 타임존(KST)으로 변환됨
    targetDate = new Date(dateStr);
  }

  // 유효한 날짜인지 확인
  if (isNaN(targetDate.getTime())) {
    return "";
  }

  // now는 현재 로컬 타임존 시간
  // targetDate는 UTC에서 로컬 타임존으로 변환된 시간
  // 따라서 차이 계산이 올바름 (둘 다 같은 타임존 기준)
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
