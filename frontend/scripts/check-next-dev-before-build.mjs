import { execSync } from 'node:child_process';
import { cwd, env, exit } from 'node:process';

if (env.ALLOW_BUILD_WITH_NEXT_DEV === '1') {
  exit(0);
}

let processList = '';
try {
  processList = execSync('ps -axo pid,command', { encoding: 'utf8' });
} catch {
  exit(0);
}

const projectNextBin = `${cwd()}/node_modules/.bin/next`;
const runningDevServer = processList
  .split('\n')
  .some((line) => line.includes(projectNextBin) && line.includes('next dev'));

if (runningDevServer) {
  console.error('\nRefusing to run `next build` while `next dev` is running for this frontend.');
  console.error('Stop the frontend dev server first, then run `npm run build` again.');
  console.error('This prevents stale .next chunks like missing layout.css/main-app.js.\n');
  exit(1);
}
