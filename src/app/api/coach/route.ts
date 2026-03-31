// src/app/api/coach/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting: simple in-memory counter per IP
// Resets every hour. Max 20 free requests per IP per hour.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const FREE_RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= FREE_RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old entries periodically (runs on module load)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }, 5 * 60 * 1000);
}

interface SlideSummary {
  title: string;
  score: number;
  missedWords: string[];
  wpm?: number;
  fillerCount?: number;
}

interface CoachRequest {
  // Session data
  mode: 'prompt' | 'test';
  slideSummaries: SlideSummary[];
  averageScore: number;
  totalFillers: number;
  averageWPM: number;
  sessionDurationSeconds: number;
  totalSlides: number;
  targetDurationMinutes?: number;

  // Provider config
  provider: 'free' | 'anthropic' | 'openai' | 'google';
  apiKey?: string;       // BYOK key
  model?: string;        // Custom model override
}

const SYSTEM_PROMPT = `You are a concise, encouraging speech coach. The user just finished rehearsing a presentation. Based on the session data below, give brief spoken feedback.

Rules:
- Keep it under 80 words (this will be read aloud via TTS while driving)
- Start with what they did well
- Then 1-2 specific, actionable improvements
- Reference specific slide titles and missed words when relevant
- End with encouragement
- Use natural conversational language (no bullet points, no headers, no markdown)
- Do NOT say "great job" generically — be specific about what was good
- Sound like a supportive coach, not a report`;

function buildUserPrompt(data: CoachRequest): string {
  const parts = [
    `Mode: ${data.mode}`,
    `Slides: ${data.totalSlides}, Average score: ${data.averageScore}%`,
    `Speaking pace: ${data.averageWPM} WPM`,
    `Filler words: ${data.totalFillers}`,
    `Duration: ${Math.round(data.sessionDurationSeconds / 60)} minutes`,
  ];

  if (data.targetDurationMinutes) {
    const diff = Math.round(data.sessionDurationSeconds / 60) - data.targetDurationMinutes;
    if (Math.abs(diff) > 1) {
      parts.push(`Target: ${data.targetDurationMinutes} min (${diff > 0 ? `${diff} min over` : `${Math.abs(diff)} min under`})`);
    }
  }

  // Add per-slide details for weak slides only (keeps prompt short)
  const weakSlides = data.slideSummaries
    .filter(s => s.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  if (weakSlides.length > 0) {
    parts.push('\nWeakest slides:');
    weakSlides.forEach(s => {
      const missed = s.missedWords.slice(0, 3).join(', ');
      parts.push(`- "${s.title}": ${s.score}%${missed ? `, missed: ${missed}` : ''}`);
    });
  }

  const strongSlides = data.slideSummaries
    .filter(s => s.score >= 85)
    .slice(0, 2);

  if (strongSlides.length > 0) {
    parts.push('\nStrongest slides:');
    strongSlides.forEach(s => {
      parts.push(`- "${s.title}": ${s.score}%`);
    });
  }

  return parts.join('\n');
}

async function callGeminiFree(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured on server');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No feedback generated.';
}

async function callGeminiByok(userPrompt: string, apiKey: string, model?: string): Promise<string> {
  const modelName = model || 'gemini-2.0-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No feedback generated.';
}

async function callAnthropic(userPrompt: string, apiKey: string, model?: string): Promise<string> {
  const modelName = model || 'claude-sonnet-4-20250514';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? 'No feedback generated.';
}

async function callOpenAI(userPrompt: string, apiKey: string, model?: string): Promise<string> {
  const modelName = model || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'No feedback generated.';
}

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();

    // Validate required fields
    if (!body.mode || !body.slideSummaries || body.averageScore == null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userPrompt = buildUserPrompt(body);
    let feedback: string;

    if (body.provider === 'free' || !body.apiKey) {
      // Free tier — rate limit by IP
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';

      if (!checkRateLimit(ip)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Try again in an hour, or add your own API key in Settings.' },
          { status: 429 }
        );
      }

      feedback = await callGeminiFree(userPrompt);

    } else if (body.provider === 'anthropic' && body.apiKey) {
      feedback = await callAnthropic(userPrompt, body.apiKey, body.model ?? undefined);

    } else if (body.provider === 'openai' && body.apiKey) {
      feedback = await callOpenAI(userPrompt, body.apiKey, body.model ?? undefined);

    } else if (body.provider === 'google' && body.apiKey) {
      feedback = await callGeminiByok(userPrompt, body.apiKey, body.model ?? undefined);

    } else {
      return NextResponse.json(
        { error: 'Invalid provider or missing API key' },
        { status: 400 }
      );
    }

    return NextResponse.json({ feedback });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Coach API error:', message);

    // Don't leak API error details to client
    const isApiError = message.includes('API error');
    return NextResponse.json(
      {
        error: isApiError
          ? 'The AI provider returned an error. Check your API key and try again.'
          : 'Failed to generate coaching feedback. Try again later.',
      },
      { status: 502 }
    );
  }
}
