#!/usr/bin/env npx tsx
/**
 * Remove all admin accounts from MongoDB so you can run setup again.
 * Requires ADMIN_SETUP_TOKEN (same as /admin/setup) to prevent accidental wipes.
 *
 *   npm run clear-admin
 *   npm run clear-admin -- --token "your-setup-token"
 *   npm run clear-admin -- --yes   # skip confirmation prompt
 */
import readline from 'readline';
import connectDB from '../lib/mongodb';
import Admin from '../lib/models/Admin';
import BootstrapLock, { ADMIN_BOOTSTRAP_LOCK_ID } from '../lib/models/BootstrapLock';
import { verifySetupToken } from '../lib/admin-setup-service';

function parseArgs(argv: string[]) {
  const out: { token?: string; yes?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--token' && argv[i + 1]) out.token = argv[++i];
    else if (argv[i] === '--yes' || argv[i] === '-y') out.yes = true;
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
  const token = args.token || process.env.ADMIN_SETUP_TOKEN || '';

  if (!token || !verifySetupToken(token)) {
    console.error('❌ Invalid or missing ADMIN_SETUP_TOKEN.');
    console.error('   Set it in .env.local or pass: npm run clear-admin -- --token "..."');
    process.exit(1);
  }

  await connectDB();

  const admins = await Admin.find().select('email').lean();
  if (admins.length === 0) {
    console.log('ℹ️  No admin accounts in database.');
    await BootstrapLock.deleteOne({ _id: ADMIN_BOOTSTRAP_LOCK_ID });
    process.exit(0);
  }

  console.log('Admin accounts to remove:');
  admins.forEach((a) => console.log(`  • ${a.email}`));

  if (!args.yes) {
    const confirm = await prompt('Type DELETE to confirm: ');
    if (confirm !== 'DELETE') {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  const deleted = await Admin.deleteMany({});
  await BootstrapLock.deleteMany({});

  console.log(`✅ Removed ${deleted.deletedCount} admin account(s).`);
  console.log('   Next: visit /admin/setup  or  npm run bootstrap-admin');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});