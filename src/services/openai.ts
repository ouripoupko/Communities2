/**
 * OpenAI API client for issue summary / AI feedback.
 * Uses the Chat Completions API with gpt-4o-mini.
 */

export interface IssueSummaryInput {
  issueName?: string;
  issueDescription?: string;
  comments: Array<{ author?: string; content: string }>;
  proposals: Array<{ title: string; description: string; author?: string }>;
  votes?: Record<string, { order?: string[] }>;
}

const SYSTEM_PROMPT = `You summarize community discussions on an issue. Given the issue description, comments, proposals, and vote rankings, produce a short summary that:
1. Highlights similarities and common themes in members' opinions.
2. Surfaces collective insights and areas of agreement or tension.
3. Suggests leading resolution opportunities that align with the discussion and proposals.

Requirements:
- Begin your response by stating exactly how many proposals you reviewed (e.g. "I reviewed 3 proposals." or "I reviewed 1 proposal."). Use the actual count from the input.
- Be accurate about plurality: each proposal is the view of one person. If there is only one proposal, say "one member" or "the single proposal" or "this proposal" — never "many members" or "members think" when there is just one. Use "members" or "several proposals" only when there are actually multiple proposals.

Keep the summary concise and actionable (a few short paragraphs). Write in clear, neutral language.`;

function buildUserMessage(input: IssueSummaryInput): string {
  const parts: string[] = [];

  if (input.issueName) parts.push(`## Issue: ${input.issueName}`);
  if (input.issueDescription) parts.push(`## Description\n${input.issueDescription}`);

  if (input.comments.length > 0) {
    parts.push('## Comments');
    input.comments.forEach((c) => {
      const author = c.author ? ` (${c.author})` : '';
      parts.push(`- ${c.content}${author}`);
    });
  }

  if (input.proposals.length > 0) {
    parts.push('## Proposals');
    input.proposals.forEach((p) => {
      parts.push(`- **${p.title}**: ${p.description}`);
    });
  }

  if (input.votes && Object.keys(input.votes).length > 0) {
    parts.push('## Vote rankings (ordered preference)');
    Object.entries(input.votes).forEach(([voter, v]) => {
      const order = v.order?.join(' > ') ?? '—';
      parts.push(`- ${voter}: ${order}`);
    });
  }

  return parts.length ? parts.join('\n\n') : 'No content yet.';
}

export async function fetchIssueSummary(
  apiKey: string,
  input: IssueSummaryInput,
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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(input) },
      ],
      max_tokens: 800,
  }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (content == null) throw new Error('Empty response from OpenAI');
  return content;
}
