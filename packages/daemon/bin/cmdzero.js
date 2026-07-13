#!/usr/bin/env node
import { startServer } from '../src/server.js';

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

startServer({
  root: flag('root', process.cwd()),
  port: Number(flag('port', 4100)),
});
