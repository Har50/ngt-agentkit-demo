// Load .env when present (Node 20.12+). Imported first by every entry point.
try {
  process.loadEnvFile();
} catch {
  // no .env: use the shell environment
}
