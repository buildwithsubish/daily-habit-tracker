const { seedThemes } = require('./lib/seed-themes');

seedThemes()
  .then((result) => {
    console.log('✅ Theme seeding complete:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Theme seeding failed:', error);
    process.exit(1);
  });
