import { NextResponse } from "next/server";

type Plan = "free" | "premium" | "super";
type Mode = "chat" | "trivia" | "memory_game";

function planLimits(plan: Plan) {
  // Keep token costs predictable.
  if (plan === "super") return { maxOutputTokens: 320, allowMemory: true };
  if (plan === "premium") return { maxOutputTokens: 260, allowMemory: true };
  return { maxOutputTokens: 220, allowMemory: false };
}

function safeString(v: any, max = 4000) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = safeString(body?.message, 2000).trim();
    const plan: Plan = (body?.plan ?? "free") as Plan;
    const mode: Mode = (body?.mode ?? "chat") as Mode;

    const persona = safeString(body?.persona ?? "Gentle & friendly", 200);
    const theme = safeString(body?.theme ?? "calm_light", 50);

    const summaryFromClient = safeString(body?.summary ?? "", 2500);

    const historyFromClient: Array<{ role: "user" | "assistant"; content: string }> =
      Array.isArray(body?.history) ? body.history : [];

    const gameState = body?.gameState ?? null;

    if (!message) {
      return NextResponse.json({ reply: "Say something and I’m here 😊", summary: summaryFromClient, game: null });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: "Setup hiccup: missing service key. Try again soon.", summary: summaryFromClient, game: null },
        { status: 500 }
      );
    }

    const limits = planLimits(plan);

    const memoryBlock =
      limits.allowMemory && summaryFromClient.trim()
        ? `\n\nMemory summary about the user (use gently; don’t quote it verbatim):\n${summaryFromClient.trim()}`
        : "";

    const systemBase = `
You are "we are pals" — a calm, friendly, non-judgemental companion.
Tone/persona: ${persona}
Theme (for vibe only, do not mention unless asked): ${theme}

Rules:
- Be warm, kind, and encouraging. Keep replies short-to-medium.
- Never shame the user. Avoid harsh words like "wrong" or "failed".
- You are not a therapist or crisis service.
- If a user asks for emergency help in Australia, encourage contacting 000.
- If they mention self-harm or feeling unsafe, suggest Lifeline 13 11 14 and trusted supports.
- Do not claim to diagnose, treat, or provide medical advice.
${memoryBlock}
`.trim();

    let system = systemBase;

    if (mode === "trivia") {
      system += `
\n\nYou are running "Friendly Trivia" for adults.
- Ask ONE question at a time.
- Provide 3 multiple-choice options labeled A, B, C.
- After the user answers, ALWAYS reveal the correct answer and a short explanation.
- Keep it encouraging and achievable. Never shame.
- Mix is 70% Australia-focused trivia and 30% widely-known world trivia.
`.trim();
    }

    if (mode === "memory_game") {
      system += `
\n\nYou are running a cognitive memory game called "Remember With Me" for adults.
CRITICAL: Do NOT reveal the items again once the round begins.

How it works:
- When the user says "start" (or wants a new round), return JSON with:
  - reply: short encouraging line
  - game: {
      phase: "show",
      difficulty: "easy" | "medium" | "hard",
      items: string[],
      question: string,
      expected: any
    }
- The UI will briefly show items OUTSIDE chat, then hide them, then show the question in chat.

Difficulty:
- easy: 4 items. simple recall (e.g., "Which one was on the list?")
- medium: 6 items. include 2 categories (e.g., fruit + tools). ask 2-part recall (e.g., "Name 2 fruits.")
- hard: 8–10 items. mixed categories. include order/position recall or a distractor-style question (without revealing list).

Adaptation:
- If the user struggles twice, gently offer easier.
- If they do well twice, offer harder.
- Always teach a strategy occasionally (chunking, visualising, grouping, making a silly story).

Tone:
- Respectful, adult-appropriate.
- Never say "wrong". Use: "close", "nearly", "nice try".
`.trim();
    }

    // Keep history short (cost control). For free, still keep it short.
    const trimmedHistory = historyFromClient.slice(-10).map((m) => ({
      role: m.role,
      content: safeString(m.content, 1500),
    }));

    // Memory summary updating (Premium+ only). For Free, summary must not change.
    const summaryInstruction = limits.allowMemory
      ? `
Return JSON only with keys: "reply", "updatedSummary", "game".
- reply: what you want to say to the user now.
- updatedSummary: 120–220 words max. Store stable preferences, tone, game likes, general safe details the user volunteered. Keep it non-clinical.
- game: null OR a game payload (for memory_game mode only).
`
      : `
Return JSON only with keys: "reply", "updatedSummary", "game".
- reply: what you want to say to the user now.
- updatedSummary: must be EXACTLY the existing summary (no changes).
- game: null OR a game payload (for memory_game mode only).
`;

    // For memory game, decide whether to start a new round or evaluate an answer.
    // We'll guide the model with a short hint based on gameState.
    const memoryGameHint =
      mode === "memory_game"
        ? `\nMemory game state (may be null):\n${JSON.stringify(gameState ?? null)}\n\nIf user said "start" or wants a new round, create game.phase="show". If they are answering, do NOT reveal items; give encouraging feedback and then offer "another round" and optional difficulty change.`
        : "";

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
            content:
              summaryInstruction +
              `\nExisting summary:\n${summaryFromClient || "(empty)"}\n` +
              memoryGameHint,
          },
          ...trimmedHistory,
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
      return NextResponse.json(
        { reply: "I had a connection hiccup — try again?", summary: summaryFromClient, game: null },
        { status: 502 }
      );
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

      return NextResponse.json({ reply: friendly, summary: summaryFromClient, game: null }, { status: upstream.status });
    }

    const content = data?.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback if model returns unexpected
      return NextResponse.json({ reply: safeString(content, 2000) || "Try again?", summary: summaryFromClient, game: null });
    }

    const reply = safeString(parsed?.reply ?? "Try again?", 2500);
    const updatedSummary =
      limits.allowMemory ? safeString(parsed?.updatedSummary ?? summaryFromClient, 2500) : summaryFromClient;

    const game = parsed?.game ?? null;

    return NextResponse.json({ reply, summary: updatedSummary, game });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ reply: "I hit a snag — try again in a moment?", summary: "", game: null }, { status: 500 });
  }
}

