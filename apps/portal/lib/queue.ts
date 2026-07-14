import 'server-only';
import { Queue } from 'bullmq';

const QUEUE_NAME = 'correction-dashboard';

export async function enqueue(jobName: string): Promise<string> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not configured');
  const url = new URL(redisUrl);
  const queue = new Queue(QUEUE_NAME, {
    connection: {
      host: url.hostname,
      port: Number(url.port || 6379),
      password: url.password || undefined,
      username: url.username || undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
    },
  });
  try {
    const job = await queue.add(jobName, {}, { removeOnComplete: 100, removeOnFail: 100 });
    return job.id ?? 'unknown';
  } finally {
    await queue.close();
  }
}
