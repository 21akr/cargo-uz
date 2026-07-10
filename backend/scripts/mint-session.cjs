/**
 * Mint an MTProto StringSession for the ingest worker.
 *
 *   TG_API_ID=123 TG_API_HASH=abc node scripts/mint-session.cjs
 *
 * Log in with the DEDICATED Telegram account you want the userbot to use
 * (NOT your personal one). It prints a TG_SESSION=... line — paste that into
 * backend/.env. The string is full account access: treat it like a password.
 */
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

(async () => {
  const apiId = Number(process.env.TG_API_ID);
  const apiHash = process.env.TG_API_HASH;
  if (!apiId || !apiHash) {
    console.error('Set TG_API_ID and TG_API_HASH (from https://my.telegram.org) first.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => rl.question('Phone number (+998...): '),
    password: async () => rl.question('2FA password (blank if none): '),
    phoneCode: async () => rl.question('Login code from Telegram: '),
    onError: (e) => console.error(e),
  });

  console.log('\n✅ Logged in. Add this line to backend/.env:\n');
  console.log('TG_SESSION=' + client.session.save());
  console.log('\n(Keep it secret — it is full access to this account.)');

  await client.disconnect();
  rl.close();
  process.exit(0);
})();
