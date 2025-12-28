// username 유효성 검사 유틸리티
// 규칙: 영문자(a-z, A-Z), 숫자(0-9), 특수문자(_ .)만 허용

export const validateUsername = (username) => {
  if (!username || typeof username !== "string") {
    return {
      valid: false,
      message: "사용자 이름을 입력해주세요.",
    };
  }

  // 정규식: 영문자, 숫자, 밑줄(_), 마침표(.)만 허용
  const usernameRegex = /^[a-zA-Z0-9._]+$/;

  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message: "사용자 이름은 영문자, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있습니다.",
    };
  }

  // 길이 체크 (선택사항, 필요시 추가)
  if (username.length < 3) {
    return {
      valid: false,
      message: "사용자 이름은 3자 이상이어야 합니다.",
    };
  }

  if (username.length > 30) {
    return {
      valid: false,
      message: "사용자 이름은 30자 이하여야 합니다.",
    };
  }

  return {
    valid: true,
    message: "",
  };
};

