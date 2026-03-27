// Hostinger's Node.js launcher loads the entry file via CommonJS `require()`.
// Keep this root bootstrap file CommonJS and dynamically import the ESM app.
(async () => {
  const { initializeFileLogging } = await import('./server/src/utils/fileLogger.js');
  initializeFileLogging();
  await import('./server/src/server.js');
})().catch((error) => {
  console.error('Unable to start TriCore Events bootstrap.', error);
  process.exit(1);
});
