import { NextResponse } from "next/server";

type Plan = "free" | "premium" | "super";

function planLimits(plan: Plan) {
  // Simple server-side limits (client also has cooldown).
  // You can tune these later.
  if (plan === "super") return { maxOutputTokens: 260, allowMemory: true };
  if (plan === "premium") return { maxOutputTokens: 220, allowMemory: true };
  return { maxOutputTokens: 200, allowMemory: false };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message: string = String(body?.message ?? "");
    const plan: Plan = (body?.plan ?? "free") as Plan;

    const persona: string = String(body?.persona ?? "Gentle & friendly");
    const theme: string = String(body?.theme ?? "calm_light");

    const summaryFromClient: string = String(body?.summary ?? "");
    const historyFromClient: Array<{ role: "user" | "assistant"; content: string }> =
      Array.isArray(body?.history) ? body.history : [];

    if (!message.trim()) {
      return NextResponse.json({ reply: "Say something and I’m here 😊", summary: summaryFromClient });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: "Setup hiccup: missing service key. Try again soon.", summary: summaryFromClient },
        { status: 500 }
      );
    }

    const limits = planLimits(plan);

    // Only include summary if plan allows it; otherwise keep it session-only.
    const memoryBlock =
      limits.allowMemory && summaryFromClient.trim()
        ? `\n\nMemory summary about the user (keep using this gently, don’t quote it verbatim):\n${summaryFromClient.trim()}`
        : "";

    // If user is playing a game, client sends mode + state; otherwise normal chat.
    const mode: "chat" | "trivia" | "memory_game" = body?.mode ?? "chat";
    const gameState: any = body?.gameState ?? null;

    const systemBase = `
You are "we are pals" — a calm, friendly, non-judgemental companion.
Tone/persona: ${persona}
Theme (for vibe only, do not mention unless asked): ${theme}

Rules:
- Be warm, gentle, and encouraging. Keep replies short-to-medium.
- Never shame the user. Avoid harsh words like "wrong" or "failed".
- If user asks for serious help in Australia: encourage contacting 000 for emergencies.
- If they mention self-harm or feeling unsafe: suggest Lifeline 13 11 14 and trusted supports.
- Do not claim to diagnose, treat, or provide medical advice.
${memoryBlock}
`.trim();

    let system = systemBase;

    if (mode === "trivia") {
      system += `
\n\nYou are running "Friendly Trivia".
- Ask ONE question at a time.
- Offer 3 multiple-choice options (A/B/C).
- After the user answers, ALWAYS reveal the correct answer with a short explanation.
- Keep it upbeat and kind.
`.trim();
    } else if (mode === "memory_game") {
      system += `
\n\nYou are running a gentle memory game called "Remember With Me".
- Keep instructions simple.
- Present a short list or mini story (3–6 items max depending on how the user is doing).
- Ask one recall question.
- If they struggle, reduce difficulty and encourage them.
- Never say "wrong". Use "close", "nearly", "nice try".
- Use gameState if provided, but keep it simple.
`.trim();
    }

    // Keep history short to control cost (especially for free).
    const trimmedHistory = historyFromClient.slice(-10);

    // Ask the model to return BOTH the reply and an updated memory summary (for premium+).
    // For free users, the summary will stay unchanged.
    const summaryInstruction = limits.allowMemory
      ? `
Return JSON only, with keys: "reply", "updatedSummary".
- "updatedSummary" should be 120–220 words max.
- It should store stable preferences, safe personal details the user offered, and what they enjoy (games, tone, time-of-day).
- Do NOT store highly sensitive info; keep it gentle and non-clinical.
`
      : `
Return JSON only, with keys: "reply", "updatedSummary".
- Set "updatedSummary" to exactly the existing summary (no changes).
`;

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "system",
            content: summaryInstruction + `\nExisting summary:\n${summaryFromClient || "(empty)"}`,
          },
          ...trimmedHistory.map((m) => ({ role: m.role, content: String(m.content ?? "") })),
          { role: "user", content: message },
        ],
        max_tokens: limits.maxOutputTokens,
      }),
    });

    const raw = await upstream.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("OpenAI non-JSON:", raw);
      return NextResponse.json({ reply: "I had a connection hiccup — try again?", summary: summaryFromClient }, { status: 502 });
    }

    if (!upstream.ok) {
      console.error("OpenAI error:", upstream.status, data);
      const friendly =
        upstream.status === 401
          ? "I’m having trouble connecting right now. Try again soon."
          : upstream.status === 429
          ? "I’m a bit busy for a moment — try again in 20 seconds."
          : upstream.status === 402 || upstream.status === 403
          ? "I can’t access chat right now (billing/limits). Try again later."
          : "Something went wrong on my side — try again in a moment.";

      return NextResponse.json({ reply: friendly, summary: summaryFromClient }, { status: upstream.status });
    }

    const content = data?.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Just in case model returns non-JSON unexpectedly
      return NextResponse.json({ reply: String(content ?? "Try again?"), summary: summaryFromClient });
    }

    const reply = String(parsed?.reply ?? "Try again?");
    const updatedSummary = limits.allowMemory
      ? String(parsed?.updatedSummary ?? summaryFromClient)
      : summaryFromClient;

    return NextResponse.json({ reply, summary: updatedSummary });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ reply: "I hit a snag — try again in a moment?", summary: "" }, { status: 500 });
  }
}
