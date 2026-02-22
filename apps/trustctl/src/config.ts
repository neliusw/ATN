/**
 * trustctl configuration management
 * Stores agent credentials and ATN host in ~/.trustctl/config.json
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.trustctl');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface Config {
  atnHost: string;
  agent?: {
    publicKey: string;
    secretKey: string;
    name?: string;
  };
}

/**
 * Load configuration from disk
 */
export function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    // File doesn't exist or is invalid - return defaults
  }

  return {
    atnHost: process.env.ATN_HOST || 'http://localhost:8080',
  };
}

/**
 * Save configuration to disk
 */
export function saveConfig(config: Config): void {
  // Create config directory if it doesn't exist
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Save agent keypair to config
 */
export function saveAgent(
  publicKey: string,
  secretKey: string,
  name?: string
): void {
  const config = loadConfig();
  config.agent = { publicKey, secretKey, name };
  saveConfig(config);
}

/**
 * Get current agent from config
 */
export function getAgent() {
  const config = loadConfig();
  if (!config.agent) {
    throw new Error(
      'No agent configured. Run `trustctl keygen` and `trustctl agents register` first.'
    );
  }
  return config.agent;
}

/**
 * Set ATN host
 */
export function setAtnHost(host: string): void {
  const config = loadConfig();
  config.atnHost = host;
  saveConfig(config);
}

/**
 * Get ATN host
 */
export function getAtnHost(): string {
  return loadConfig().atnHost;
}

/**
 * Display current configuration
 */
export function displayConfig(): void {
  const config = loadConfig();
  console.log('\n=== ATN Configuration ===');
  console.log(`ATN Host: ${config.atnHost}`);
  if (config.agent) {
    console.log(`Agent:    ${config.agent.name || 'unnamed'}`);
    console.log(`Public Key: ${config.agent.publicKey.substring(0, 20)}...`);
  } else {
    console.log('Agent:    Not configured');
  }
  console.log(`Config File: ${CONFIG_FILE}\n`);
}
