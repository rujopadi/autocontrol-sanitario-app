#!/usr/bin/env node

/**
 * Test Runner Script
 * Configures environment and runs tests with proper setup
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure test environment file exists
const testEnvPath = path.join(__dirname, '..', '.env.test');
if (!fs.existsSync(testEnvPath)) {
  console.error('❌ .env.test file not found. Please create it first.');
  process.exit(1);
}

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Configure test command
const testCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const testArgs = ['run', 'test:debug'];

// Add specific test file if provided
if (process.argv[2]) {
  testArgs.push('--', process.argv[2]);
}

console.log('🧪 Starting test suite...');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
console.log(`📋 Command: ${testCommand} ${testArgs.join(' ')}`);
console.log('─'.repeat(50));

// Run tests
const testProcess = spawn(testCommand, testArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

testProcess.on('close', (code) => {
  console.log('─'.repeat(50));
  if (code === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});