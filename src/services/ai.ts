/**
 * AI service — translation and discussion summaries.
 *
 * Currently supports OpenAI (gpt-4o-mini) via the user's stored API key.
 * Designed for easy migration to Claude API when ready — swap the fetch
 * target and message format in the two helpers below.
 */

// ── Translation ─────────────────────────────────────────────────────────────

const TRANSLATE_SYSTEM = `You are a translator for a global democracy platform. Translate the given text accurately into the requested language. Preserve formatting, names, and technical terms. Return ONLY the translated text, no commentary.`;

export async function translateText(
  apiKey: string,
  text: string,
  targetLanguage: string,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: TRANSLATE_SYSTEM },
        { role: 'user', content: `Translate to ${targetLanguage}:\n\n${text}` },
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty translation response');
  return content;
}

// ── Discussion summary ──────────────────────────────────────────────────────

const SUMMARY_SYSTEM = `You summarize community discussions on a global democracy platform. Given comments and proposals, produce a concise summary that:
1. Highlights common themes and areas of agreement
2. Notes tensions or differing perspectives
3. Identifies potential paths forward

Be accurate about plurality — if there's one comment, say "one member", not "members". Keep the summary to 2-3 short paragraphs. Write in clear, neutral language.`;

export interface DiscussionContent {
  title?: string;
  description?: string;
  comments: Array<{ author?: string; content: string }>;
  proposals?: Array<{ title: string; description: string }>;
}

export async function summarizeDiscussion(
  apiKey: string,
  input: DiscussionContent,
): Promise<string> {
  const parts: string[] = [];
  if (input.title) parts.push(`## Topic: ${input.title}`);
  if (input.description) parts.push(`## Description\n${input.description}`);

  if (input.comments.length > 0) {
    parts.push('## Comments');
    input.comments.forEach((c) => {
      parts.push(`- ${c.content}${c.author ? ` (${c.author})` : ''}`);
    });
  }

  if (input.proposals && input.proposals.length > 0) {
    parts.push('## Proposals');
    input.proposals.forEach((p) => {
      parts.push(`- **${p.title}**: ${p.description}`);
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM },
        { role: 'user', content: parts.join('\n\n') || 'No content yet.' },
      ],
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty summary response');
  return content;
}

// ── Supported languages ─────────────────────────────────────────────────────

export const AI_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
] as const;
