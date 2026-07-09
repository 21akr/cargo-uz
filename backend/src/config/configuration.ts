export interface IngestChannel {
  carrier: string;
  channel: string;
}

export interface MtprotoConfig {
  apiId: number;
  apiHash: string;
  session: string;
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  botToken: string;
  devTgUserId: string | null;
  mtproto: MtprotoConfig | null;
  channels: IngestChannel[];
  anthropicApiKey: string | null;
}

function list(v: string | undefined): string[] {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default (): { app: AppConfig } => {
  const channels: IngestChannel[] = list(process.env.INGEST_CHANNELS)
    .map((pair) => {
      const [carrier, channel] = pair.split('=').map((x) => x.trim());
      return { carrier, channel };
    })
    .filter((c) => c.carrier && c.channel);

  const apiId = Number(process.env.TG_API_ID || 0);
  const mtproto: MtprotoConfig | null =
    apiId && process.env.TG_API_HASH && process.env.TG_SESSION
      ? { apiId, apiHash: process.env.TG_API_HASH, session: process.env.TG_SESSION }
      : null;

  return {
    app: {
      port: Number(process.env.PORT || 3000),
      corsOrigins: list(process.env.CORS_ORIGINS),
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      devTgUserId: process.env.DEV_TG_USER_ID || null,
      mtproto,
      channels,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    },
  };
};
