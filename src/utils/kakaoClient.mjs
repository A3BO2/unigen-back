// 카카오 API 클라이언트

/**
 * 카카오 액세스 토큰으로 사용자 정보 조회
 * @param {string} accessToken - 카카오 액세스 토큰
 * @returns {Promise<Object>} 카카오 사용자 정보
 */
export const getKakaoUserInfo = async (accessToken) => {
  try {
    const response = await fetch("https://kapi.kakao.com/v2/user/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const kakaoUser = await response.json();
    return {
      kakaoId: kakaoUser.id.toString(), // 카카오 고유 ID
      email: kakaoUser.kakao_account?.email || null,
      nickname: kakaoUser.kakao_account?.profile?.nickname || null,
      profileImage: kakaoUser.kakao_account?.profile?.profile_image_url || null,
      phoneNumber: kakaoUser.kakao_account?.phone_number || null,
    };
  } catch (error) {
    console.error("카카오 사용자 정보 조회 실패:", error.message);
    throw new Error("카카오 사용자 정보 조회에 실패했습니다.");
  }
};

