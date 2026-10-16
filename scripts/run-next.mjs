import { spawn } from 'node:child_process';
const command = process.argv[2];
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Unknown command');
const hostname = process.env.BOTA_BIND_HOST || (process.env.RENDER === 'true' ? '0.0.0.0' : '127.0.0.1');
const args = [command, ...(command === 'build' ? [] : ['--hostname', hostname, '--port', process.env.PORT || '3000'])];
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...args], {
  stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
child.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
