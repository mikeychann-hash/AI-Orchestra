#!/usr/bin/env node

/**
 * Setup Script
 * Node.js-based setup for cross-platform compatibility
 */

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printBanner() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║                                        ║', 'blue');
  log('║         AI Orchestra Setup             ║', 'blue');
  log('║     Node.js Setup Script               ║', 'blue');
  log('║                                        ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkPrerequisites() {
  log('==> Checking prerequisites...\n', 'blue');

  const checks = {
    node: checkCommand('node'),
    npm: checkCommand('npm'),
    docker: checkCommand('docker'),
  };

  if (checks.node) {
    const version = execSync('node --version').toString().trim();
    log(`✓ Node.js is installed (${version})`, 'green');
  } else {
    log('✗ Node.js is not installed', 'red');
  }

  if (checks.npm) {
    const version = execSync('npm --version').toString().trim();
    log(`✓ npm is installed (${version})`, 'green');
  } else {
    log('✗ npm is not installed', 'red');
  }

  if (checks.docker) {
    log('✓ Docker is installed', 'green');
  } else {
    log('! Docker is not installed (optional)', 'yellow');
  }

  console.log('');

  if (!checks.node || !checks.npm) {
    log('Setup cannot continue without Node.js and npm', 'red');
    process.exit(1);
  }
}

function setupEnvironment() {
  log('==> Setting up environment...\n', 'blue');

  const envPath = '.env';
  const envExamplePath = join('config', '.env.example');

  if (!existsSync(envPath)) {
    log('! .env file not found, creating from template...', 'yellow');
    copyFileSync(envExamplePath, envPath);
    log('✓ Created .env file', 'green');
    log('\n! IMPORTANT: Please edit .env and add your API keys', 'yellow');
    log('  Required: At least one LLM provider API key', 'yellow');
  } else {
    log('✓ .env file already exists', 'green');
  }

  console.log('');
}

function createDirectories() {
  log('==> Creating required directories...\n', 'blue');

  const dirs = ['database', 'logs'];

  dirs.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      log(`✓ Created ${dir} directory`, 'green');
    } else {
      log(`✓ ${dir} directory already exists`, 'green');
    }
  });

  console.log('');
}

function installDependencies() {
  log('==> Installing dependencies...\n', 'blue');

  try {
    log('Installing npm packages...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
    log('✓ Dependencies installed successfully', 'green');
  } catch (error) {
    log('✗ Failed to install dependencies', 'red');
    process.exit(1);
  }

  console.log('');
}

function printNextSteps() {
  log('==> Next Steps\n', 'blue');

  console.log('1. Edit .env file and add your API keys:');
  console.log('   - OpenAI: OPENAI_API_KEY');
  console.log('   - Grok: GROK_API_KEY');
  console.log('   - Ollama: Configure OLLAMA_HOST\n');

  console.log('2. Start the application:');
  console.log('   npm start                    # Production mode');
  console.log('   npm run dev                  # Development mode');
  console.log('   docker-compose up -d         # Docker deployment\n');

  console.log('3. Run tests:');
  console.log('   npm test                     # Unit tests');
  console.log('   npm run test:integration     # Integration tests\n');

  console.log('4. Access the application:');
  console.log('   http://localhost:3000        # Main application');
  console.log('   http://localhost:3000/health # Health check\n');

  log('✓ Setup complete! AI Orchestra is ready to use.', 'green');
}

function main() {
  printBanner();

  // Check if running from correct directory
  if (!existsSync('package.json')) {
    log('Please run this script from the AI Orchestra root directory', 'red');
    process.exit(1);
  }

  checkPrerequisites();
  setupEnvironment();
  createDirectories();
  installDependencies();
  printNextSteps();
}

main();
