#!/usr/bin/env node

// VeilPool Routing Engine - Daemon Runner
// This script runs the server as a proper daemon process

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = '/tmp/veilpool-routing.log';
const PID_FILE = '/tmp/veilpool-routing.pid';

// Open log file
const logFd = fs.openSync(LOG_FILE, 'a');

console.log('Starting VeilPool Routing Engine...');
console.log(`Logs will be written to: ${LOG_FILE}`);
console.log(`PID will be written to: ${PID_FILE}`);

// Start the server
const child = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  env: { ...process.env, PORT: '3001' },
  detached: true,
  stdio: ['ignore', logFd, logFd]
});

// Save PID
fs.writeFileSync(PID_FILE, child.pid.toString());
console.log(`Server started with PID: ${child.pid}`);

// Detach from parent
child.unref();

console.log('✅ Server is running in background');
console.log(`   Monitor: tail -f ${LOG_FILE}`);
console.log(`   Stop: kill $(cat ${PID_FILE})`);

// Exit this script (server keeps running)
process.exit(0);
