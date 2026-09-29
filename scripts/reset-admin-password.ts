#!/usr/bin/env npx tsx
/**
 * Reset admin password when account already exists.
 * Requires ADMIN_SETUP_TOKEN in .env.local
 *
 *   npm run reset-admin-password -- --email admin@example.com --password 'NewSecure1'
 */
import readline from 'readline';
import { resetAdminPassword } from '../lib/admin-setup-service';

function parseArgs(argv: string[]) {
  const out: { email?: string; password?: string; token?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email' && argv[i + 1]) out.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) out.password = argv[++i];
    else if (argv[i] === '--token' && argv[i + 1]) out.token = argv[++i];
  }
  return out;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email || (await prompt('Admin email: '));
  const password = args.password || (await prompt('New password: '));
  const token = args.token || process.env.ADMIN_SETUP_TOKEN || (await prompt('Setup token: '));

  const result = await resetAdminPassword(email, password, token);
  if (!result.ok) {
    console.error('❌', result.message);
    process.exit(1);
  }

  console.log('✅ Password updated for', result.email);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});