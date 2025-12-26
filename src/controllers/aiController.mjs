// AI, 음성 기능

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const refineTextWithAI = async (req, res) => {
  console.log("=== [1] AI 요청 시작 ==="); // 1번 확인
  try {
    const { text, theme } = req.body;
    const file = req.file;
    let imageUrl = null;
    if (file) {
      // 버퍼(Buffer)를 Base64 문자열로 변환
      const base64Image = file.buffer.toString("base64");
      const mimeType = file.mimetype; // 예: image/jpeg
      imageUrl = `data:${mimeType};base64,${base64Image}`;
    }
    // 혹시 프론트에서 기존처럼 JSON으로 보낼 수도 있으니 예비책 (req.body.image)
    else if (req.body.image) {
      imageUrl = req.body.image;
    }

    console.log(
      `=== [2] 데이터 수신: 텍스트(${
        text?.length
      }), 테마(${theme}), 이미지있음(${!!imageUrl}) ===`
    );

    let stylePrompt = "";
    switch (theme) {
      case "kind":
        stylePrompt = "따뜻하고 온화한 존댓말 말투로, 이모티콘을 적절히 섞어서";
        break;
      case "cute":
        stylePrompt =
          "귀엽고 애교 섞인 말투로, 밝은 느낌의 이모티콘을 많이 써서";
        break;
      case "letter":
        stylePrompt =
          "사랑하는 손주에게 쓰는 편지 형식으로, 다정하고 진심 어린 말투로";
        break;
      case "friend":
        stylePrompt = "친한 친구에게 말하듯 편안하고 활기찬 반말 말투로";
        break;
      default:
        stylePrompt = "인스타그램 감성의 트렌디하고 정갈한 말투로";
        break;
    }

    const messages = [
      {
        role: "system",
        content: `당신은 시니어 sns 인플루언서 도우미입니다. 사용자가 입력한 텍스트(혹은 사진 설명)를 바탕으로 '${stylePrompt}' 게시글 내용을 작성해주세요. 해시태그도 3~5개 추천해주세요.`,
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

    // [수정 3] 변환된 imageUrl이 있다면 vision API 사용
    if (imageUrl) {
      console.log("=== [3] 이미지 처리 중 (Vision API) ===");
      messages[1].content.push({
        type: "image_url",
        image_url: {
          url: imageUrl, // Base64로 변환된 문자열
          detail: "low",
        },
      });
    }

    console.log("=== [4] OpenAI에게 질문 전송 중... (기다리세요) ===");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 혹은 gpt-4o
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    console.log("=== [5] OpenAI 응답 도착! ===");
    const refinedText = completion.choices[0].message.content;
    console.log("=== [6] 결과 반환 ===");

    // 클라이언트에 응답 보내기 (원래 코드에 res.json이 빠져있어서 추가했습니다)
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
