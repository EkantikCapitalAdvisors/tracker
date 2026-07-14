function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const env = {
  get FRED_API_KEY() {
    return required('FRED_API_KEY');
  },
  get SLACK_BOT_TOKEN() {
    return required('SLACK_BOT_TOKEN');
  },
  get SUPABASE_URL() {
    return required('SUPABASE_URL');
  },
  get SUPABASE_SERVICE_ROLE() {
    return required('SUPABASE_SERVICE_ROLE');
  },
  get REDIS_URL() {
    return required('REDIS_URL');
  },
  get ANTHROPIC_API_KEY() {
    return process.env.ANTHROPIC_API_KEY ?? null;
  },
  get CFTC_APP_TOKEN() {
    return process.env.CFTC_APP_TOKEN ?? null;
  },
  SLACK_CHANNEL: process.env.SLACK_CHANNEL_ID ?? 'C0AH7FWP2JU',
};
