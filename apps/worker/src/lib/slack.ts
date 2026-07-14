import { env } from '../env.js';

interface SlackPostResult {
  ok: boolean;
  ts?: string;
  error?: string;
}

async function post(payload: Record<string, unknown>): Promise<SlackPostResult> {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json()) as SlackPostResult;
  if (!body.ok) throw new Error(`Slack postMessage failed: ${body.error}`);
  return body;
}

/** Post the three-message threaded sentinel; replies use reply_broadcast. */
export async function postThread(messages: string[]): Promise<string> {
  const [head, ...replies] = messages;
  const parent = await post({ channel: env.SLACK_CHANNEL, text: head, unfurl_links: false });
  for (const reply of replies) {
    await post({
      channel: env.SLACK_CHANNEL,
      text: reply,
      thread_ts: parent.ts,
      reply_broadcast: true,
      unfurl_links: false,
    });
  }
  return parent.ts!;
}

export async function postMessage(text: string): Promise<string> {
  const result = await post({ channel: env.SLACK_CHANNEL, text, unfurl_links: false });
  return result.ts!;
}
