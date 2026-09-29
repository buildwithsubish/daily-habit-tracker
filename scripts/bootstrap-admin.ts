#!/usr/bin/env npx tsx
/**
 * One-time admin bootstrap — credentials stored in MongoDB only.
 *
 *   npm run bootstrap-admin
 *   npm run bootstrap-admin -- --email admin@example.com --password 'YourSecurePass1'
 */
import readline from 'readline';
import { adminAccountExists, createAdminAccount } from '../lib/admin-bootstrap';

function parseArgs(argv: string[]) {
  const out: { email?: string; password?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email' && argv[i + 1]) out.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) out.password = argv[++i];
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
  if (await adminAccountExists()) {
    console.error('❌ Admin account already exists. Use /admin/login.');
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const email = args.email || (await prompt('Admin email: '));
  const password = args.password || (await prompt('Admin password: '));
  const confirm = args.password ? password : await prompt('Confirm password: ');

  if (password !== confirm) {
    console.error('❌ Passwords do not match.');
    process.exit(1);
  }

  const admin = await createAdminAccount(email, password);
  console.log('✅ Admin account created in MongoDB');
  console.log(`📧 Email: ${admin.email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Bootstrap failed:', err.message || err);
  process.exit(1);
});