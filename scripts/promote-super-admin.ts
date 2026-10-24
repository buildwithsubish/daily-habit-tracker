#!/usr/bin/env npx tsx
/**
 * Promote an admin account to super_admin.
 *
 *   npm run promote-super-admin
 *   npm run promote-super-admin -- --email admin@example.com
 */
import readline from 'readline';
import connectDB from '../lib/mongodb';
import Admin from '../lib/models/Admin';

function parseArgs(argv: string[]) {
  const out: { email?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email' && argv[i + 1]) out.email = argv[++i];
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
  await connectDB();

  const args = parseArgs(process.argv.slice(2));
  let email = args.email;

  if (!email) {
    const admins = await Admin.find().select('email role isActive').lean();
    if (admins.length === 0) {
      console.error('❌ No admin accounts found in database. Create one first at /admin/setup or via npm run bootstrap-admin.');
      process.exit(1);
    }

    console.log('\nExisting Admin Accounts:');
    admins.forEach((a, i) => {
      console.log(` [${i + 1}] ${a.email} (Role: ${a.role}, Active: ${a.isActive})`);
    });
    console.log('');

    const input = await prompt('Enter admin email to promote to super_admin (or press Enter for #1): ');
    if (!input && admins[0]) {
      email = admins[0].email;
    } else {
      email = input;
    }
  }

  const normalizedEmail = (email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email: normalizedEmail });

  if (!admin) {
    console.error(`❌ Admin with email "${normalizedEmail}" not found.`);
    process.exit(1);
  }

  admin.role = 'super_admin';
  admin.isActive = true;
  await admin.save();

  console.log(`\n✅ Success: Administrator "${admin.email}" is now a super_admin!`);
  console.log('You can now log into /admin/login and access full system permissions, team management, and user controls.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Promotion failed:', err.message || err);
  process.exit(1);
});
