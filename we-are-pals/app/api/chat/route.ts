import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const message = body.message;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a calm, friendly, non-judgemental companion. You are not a therapist or crisis service."
        },
        { role: "user", content: message }
      ]
    })
  });

  const data = await response.json();
  return NextResponse.json({
    reply: data.choices?.[0]?.message?.content || "Sorry, something went wrong."
  });
}
