// AI, 음성 기능

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const refineTextWithAI = async (req, res) => {
  try {
    const { text, theme, isReels } = req.body; // isReels 추가
    const file = req.file;

    let imageUrl = null;
    if (file) {
      // 버퍼(Buffer)를 Base64 문자열로 변환
      const base64Image = file.buffer.toString("base64");
      const mimeType = file.mimetype; // 예: image/jpeg
      imageUrl = `data:${mimeType};base64,${base64Image}`;
    }
    // JSON으로 base64 이미지가 넘어오는 경우 대비
    else if (req.body.image) {
      imageUrl = req.body.image;
    }

    /* =========================
     * 테마별 말투 프롬프트
     ========================= */
    let stylePrompt = "";
    switch (theme) {
      case "daily":
        stylePrompt =
          "오늘의 일상을 기록하듯, 잔잔하고 편안하며 공감을 불러일으키는 말투로";
        break;

      case "greeting":
        stylePrompt = "오랜만에 안부를 전하듯 따뜻하고 정겨운 말투로";
        break;

      case "family":
        stylePrompt = "가족을 떠올리며 정이 느껴지는 다정한 말투로";
        break;

      case "thanks":
        stylePrompt = "고마운 마음을 담아 차분하고 진심 어린 말투로";
        break;

      case "memory":
        stylePrompt = "지난 추억을 회상하듯 담담하고 따뜻한 말투로";
        break;

      case "cheer":
        stylePrompt =
          "스스로를 다독이거나 누군가를 응원하며 힘을 불어넣는 긍정적인 말투로";
        break;

      case "light":
        stylePrompt = "일상의 소소함을 담아 부드럽고 가벼운 말투로";
        break;

      case "intro":
        stylePrompt =
          "스스로 혹은 대상을 소개하며 예의바르고 차분하며 정중한 말투로";
        break;

      default:
        stylePrompt = "인스타그램의 감성이 담긴 트렌디 하고 정갈한 말투로";
        break;
    }

    /* =========================
     * OpenAI 메시지 구성
     ========================= */
    const messages = [
      {
        role: "system",
        content: `
당신은 시니어 sns 인플루언서 도우미입니다.
사용자가 입력한 텍스트(혹은 사진 설명)를 바탕으로
${stylePrompt} 게시글 내용을 작성해주세요.
${
  isReels
    ? "릴스용으로 매우 짧고 임팩트 있게 작성해주세요. 본문은 1-2문장, 해시태그 포함 총 60자 이내로 제한해주세요."
    : ""
}
해시태그도 3~5개 추천해주세요.
        `.trim(),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: text ? `내용: ${text}` : "사진에 어울리는 좋은 글귀를 써줘.",
          },
        ],
      },
    ];

    // 이미지가 있다면 Vision API 사용
    if (imageUrl) {
      messages[1].content.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
          detail: "low",
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const refinedText = completion.choices[0].message.content;

    res.status(200).json({
      success: true,
      result: refinedText,
    });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "AI 변환 중 오류가 발생했습니다.",
    });
  }
};
