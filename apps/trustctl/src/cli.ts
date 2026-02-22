#!/usr/bin/env node

/**
 * trustctl - ATN CLI tool
 *
 * Agent CLI for:
 * - Keypair generation
 * - Agent registration
 * - Offer publishing
 * - Job lifecycle management
 * - Audit retrieval
 */

import { Command } from 'commander';
import * as ATN from '@atn/core';
import {
  loadConfig,
  saveAgent,
  getAgent,
  getAtnHost,
  setAtnHost,
  displayConfig,
  saveConfig,
  loadConfig as reloadConfig,
} from './config';
import { sendSignedRequest, sendUnsignedRequest, deriveDid } from './client';

const program = new Command();

program
  .name('trustctl')
  .description('ATN CLI tool for agent operations')
  .version('0.1.0');

// ============================================================================
// CONFIG COMMANDS
// ============================================================================

program
  .command('config')
  .description('Display current configuration')
  .action(() => {
    displayConfig();
  });

program
  .command('config:set-host <url>')
  .description('Set ATN host URL')
  .action((url) => {
    setAtnHost(url);
    console.log(`✓ ATN host set to ${url}`);
  });

// ============================================================================
// KEYGEN COMMAND
// ============================================================================

program
  .command('keygen')
  .description('Generate a new Ed25519 keypair')
  .action(() => {
    const keypair = ATN.generateKeypair();
    console.log('\n=== New Keypair Generated ===\n');
    console.log(`publicKey:  ${keypair.publicKey}`);
    console.log(`secretKey:  ${keypair.secretKey}`);
    console.log(`\nDID:        ${deriveDid(keypair.publicKey)}`);
    console.log(
      '\nSave these securely. Use `trustctl agents register` to register this agent.\n'
    );
  });

// ============================================================================
// AGENT COMMANDS
// ============================================================================

const agentCmd = program.command('agents').description('Agent operations');

agentCmd
  .command('register <name>')
  .description('Register agent with ATN')
  .option(
    '--public-key <key>',
    'Public key (if not provided, generates a new one)'
  )
  .option('--secret-key <key>', 'Secret key (required if --public-key is provided)')
  .action(async (name, opts) => {
    try {
      const atnHost = getAtnHost();

      let publicKey = opts.publicKey;
      let secretKey = opts.secretKey;

      if (!publicKey) {
        const keypair = ATN.generateKeypair();
        publicKey = keypair.publicKey;
        secretKey = keypair.secretKey;
        console.log('Generated new keypair.');
      } else if (!secretKey) {
        throw new Error('--secret-key is required when --public-key is provided');
      }

      // Register agent
      const response = await sendSignedRequest({
        method: 'POST',
        path: '/agents',
        payload: {
          name,
          publicKey,
        },
        publicKey,
        secretKey,
        baseUrl: atnHost,
      });

      if (response.status === 201) {
        const data = response.data as any;
        saveAgent(publicKey, secretKey, name);
        console.log(`\n✓ Agent registered successfully\n`);
        console.log(`DID:       ${data.did}`);
        console.log(`Name:      ${data.name}`);
        console.log(`Registered: ${new Date(data.registeredAt * 1000).toISOString()}`);
        console.log('\nCredentials saved to ~/.trustctl/config.json\n');
      } else {
        const error = (response.data as any).error || 'Unknown error';
        throw new Error(`Failed to register agent: ${error}`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

agentCmd
  .command('list')
  .description('List all registered agents')
  .action(async () => {
    try {
      const atnHost = getAtnHost();
      const response = await sendUnsignedRequest('/agents', atnHost);

      if (response.status === 200) {
        const data = response.data as any;
        console.log(`\n=== Agents (${data.count}) ===\n`);
        if (data.agents.length === 0) {
          console.log('No agents registered.\n');
        } else {
          for (const agent of data.agents) {
            console.log(`DID:  ${agent.did}`);
            console.log(`Name: ${agent.name}`);
            console.log(`Registered: ${new Date(agent.registeredAt * 1000).toISOString()}`);
            console.log('');
          }
        }
      } else {
        throw new Error(`Failed to list agents (status ${response.status})`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

agentCmd
  .command('get <did>')
  .description('Get agent details')
  .action(async (did) => {
    try {
      const atnHost = getAtnHost();
      const response = await sendUnsignedRequest(`/agents/${did}`, atnHost);

      if (response.status === 200) {
        const agent = response.data as any;
        console.log(`\n=== Agent ===\n`);
        console.log(`DID:  ${agent.did}`);
        console.log(`Name: ${agent.name}`);
        console.log(`Public Key: ${agent.publicKey}`);
        console.log(`Registered: ${new Date(agent.registeredAt * 1000).toISOString()}\n`);
      } else if (response.status === 404) {
        console.log(`✗ Agent not found: ${did}`);
      } else {
        throw new Error(`Failed to get agent (status ${response.status})`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ============================================================================
// OFFER COMMANDS
// ============================================================================

const offerCmd = program.command('offers').description('Offer operations');

offerCmd
  .command('publish <capability>')
  .description('Publish a service offer')
  .requiredOption('--price <amount>', 'Price per job')
  .option('--description <text>', 'Description')
  .action(async (capability, opts) => {
    try {
      const agent = getAgent();
      const atnHost = getAtnHost();

      const response = await sendSignedRequest({
        method: 'POST',
        path: '/offers',
        payload: {
          capability,
          description: opts.description || `${capability} service`,
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          pricePerJob: parseInt(opts.price),
        },
        publicKey: agent.publicKey,
        secretKey: agent.secretKey,
        baseUrl: atnHost,
      });

      if (response.status === 201) {
        const data = response.data as any;
        console.log(`\n✓ Offer published\n`);
        console.log(`Offer ID:    ${data.id}`);
        console.log(`Capability:  ${data.capability}`);
        console.log(`Price:       ${data.pricePerJob}\n`);
      } else {
        const error = (response.data as any).error || 'Unknown error';
        throw new Error(`Failed to publish offer: ${error}`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

offerCmd
  .command('list')
  .description('List all offers')
  .option('--capability <cap>', 'Filter by capability')
  .action(async (opts) => {
    try {
      const atnHost = getAtnHost();
      const path = opts.capability ? `/offers?capability=${opts.capability}` : '/offers';
      const response = await sendUnsignedRequest(path, atnHost);

      if (response.status === 200) {
        const data = response.data as any;
        console.log(`\n=== Offers (${data.count}) ===\n`);
        if (data.offers.length === 0) {
          console.log('No offers available.\n');
        } else {
          for (const offer of data.offers) {
            console.log(`ID:         ${offer.id}`);
            console.log(`Capability: ${offer.capability}`);
            console.log(`Price:      ${offer.pricePerJob}`);
            console.log('');
          }
        }
      } else {
        throw new Error(`Failed to list offers (status ${response.status})`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

offerCmd
  .command('get <id>')
  .description('Get offer details')
  .action(async (id) => {
    try {
      const atnHost = getAtnHost();
      const response = await sendUnsignedRequest(`/offers/${id}`, atnHost);

      if (response.status === 200) {
        const offer = response.data as any;
        console.log(`\n=== Offer ===\n`);
        console.log(`ID:         ${offer.id}`);
        console.log(`Capability: ${offer.capability}`);
        console.log(`Description: ${offer.description}`);
        console.log(`Price:      ${offer.pricePerJob}\n`);
      } else if (response.status === 404) {
        console.log(`✗ Offer not found: ${id}`);
      } else {
        throw new Error(`Failed to get offer (status ${response.status})`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ============================================================================
// JOB COMMANDS
// ============================================================================

const jobCmd = program.command('jobs').description('Job operations');

jobCmd
  .command('create <offer-id>')
  .description('Create a new job')
  .requiredOption('--provider <did>', 'Provider DID')
  .requiredOption('--escrow <amount>', 'Escrow amount')
  .option('--attestations <count>', 'Required attestations (default: 1)')
  .option('--timeout <seconds>', 'Timeout in seconds (default: 3600)')
  .action(async (offerId, opts) => {
    try {
      const agent = getAgent();
      const atnHost = getAtnHost();

      const response = await sendSignedRequest({
        method: 'POST',
        path: '/jobs',
        payload: {
          offerId,
          providerId: opts.provider,
          requiredAttestations: parseInt(opts.attestations || '1'),
          timeoutSeconds: parseInt(opts.timeout || '3600'),
          escrowAmount: parseInt(opts.escrow),
        },
        publicKey: agent.publicKey,
        secretKey: agent.secretKey,
        baseUrl: atnHost,
      });

      if (response.status === 201) {
        const data = response.data as any;
        console.log(`\n✓ Job created\n`);
        console.log(`Job ID:   ${data.id}`);
        console.log(`State:    ${data.state}`);
        console.log(`Escrow:   ${data.escrowAmount}\n`);
      } else {
        const error = (response.data as any).error || 'Unknown error';
        throw new Error(`Failed to create job: ${error}`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

jobCmd
  .command('list')
  .description('List all jobs')
  .action(async () => {
    try {
      const atnHost = getAtnHost();
      const response = await sendUnsignedRequest('/jobs', atnHost);

      if (response.status === 200) {
        const data = response.data as any;
        console.log(`\n=== Jobs (${data.count}) ===\n`);
        if (data.jobs.length === 0) {
          console.log('No jobs.\n');
        } else {
          for (const job of data.jobs) {
            console.log(`ID:    ${job.id}`);
            console.log(`State: ${job.state}`);
            console.log(`Escrow: ${job.escrowAmount}`);
            console.log('');
          }
        }
      } else {
        throw new Error(`Failed to list jobs (status ${response.status})`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

jobCmd
  .command('get <id>')
  .description('Get job details')
  .action(async (id) => {
    try {
      const atnHost = getAtnHost();
      const response = await sendUnsignedRequest(`/jobs/${id}`, atnHost);

      if (response.status === 200) {
        const job = response.data as any;
        console.log(`\n=== Job ===\n`);
        console.log(`ID:    ${job.id}`);
        console.log(`State: ${job.state}`);
        console.log(`Offer: ${job.offerId}`);
        console.log(`Escrow: ${job.escrowAmount}`);
        console.log(`Created: ${new Date(job.createdAt * 1000).toISOString()}\n`);
      } else if (response.status === 404) {
        console.log(`✗ Job not found: ${id}`);
      } else {
        throw new Error(`Failed to get job (status ${response.status})`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

jobCmd
  .command('fund <id>')
  .description('Fund a job (client)')
  .action(async (id) => {
    try {
      const agent = getAgent();
      const atnHost = getAtnHost();

      const response = await sendSignedRequest({
        method: 'POST',
        path: `/jobs/${id}/fund`,
        payload: {},
        publicKey: agent.publicKey,
        secretKey: agent.secretKey,
        baseUrl: atnHost,
      });

      if (response.status === 200) {
        const data = response.data as any;
        console.log(`\n✓ Job funded\n`);
        console.log(`State: ${data.state}\n`);
      } else {
        const error = (response.data as any).error || 'Unknown error';
        throw new Error(`Failed to fund job: ${error}`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

jobCmd
  .command('submit-proof <id>')
  .description('Submit proof (provider)')
  .requiredOption('--proof-hash <hash>', 'Proof hash')
  .action(async (id, opts) => {
    try {
      const agent = getAgent();
      const atnHost = getAtnHost();

      const response = await sendSignedRequest({
        method: 'POST',
        path: `/jobs/${id}/proof`,
        payload: {
          proofHash: opts.proofHash,
        },
        publicKey: agent.publicKey,
        secretKey: agent.secretKey,
        baseUrl: atnHost,
      });

      if (response.status === 200) {
        const data = response.data as any;
        console.log(`\n✓ Proof submitted\n`);
        console.log(`State: ${data.state}\n`);
      } else {
        const error = (response.data as any).error || 'Unknown error';
        throw new Error(`Failed to submit proof: ${error}`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

jobCmd
  .command('attest <id>')
  .description('Submit attestation (witness)')
  .option('--type <type>', 'Attestation type (default: DELIVERED_OK)')
  .action(async (id, opts) => {
    try {
      const agent = getAgent();
      const atnHost = getAtnHost();

      const response = await sendSignedRequest({
        method: 'POST',
        path: `/jobs/${id}/attest`,
        payload: {
          attestationType: opts.type || 'DELIVERED_OK',
        },
        publicKey: agent.publicKey,
        secretKey: agent.secretKey,
        baseUrl: atnHost,
      });

      if (response.status === 200) {
        const data = response.data as any;
        console.log(`\n✓ Attestation submitted\n`);
        console.log(`State: ${data.state}\n`);
      } else {
        const error = (response.data as any).error || 'Unknown error';
        throw new Error(`Failed to submit attestation: ${error}`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ============================================================================
// AUDIT COMMANDS
// ============================================================================

program
  .command('audit <id>')
  .description('Get audit bundle for a job')
  .action(async (id) => {
    try {
      const atnHost = getAtnHost();
      const response = await sendUnsignedRequest(`/audit/${id}`, atnHost);

      if (response.status === 200) {
        const audit = response.data as any;
        console.log(`\n=== Audit Bundle ===\n`);
        console.log(`Job ID: ${audit.jobId}`);
        console.log(`Events: ${audit.eventCount}\n`);
        console.log('Event log:');
        for (const event of audit.events) {
          console.log(`  [${event.id}] ${event.eventType}`);
          console.log(`      Actor: ${event.actor}`);
          console.log(`      Time: ${new Date(event.createdAt * 1000).toISOString()}`);
        }
        console.log('');
      } else if (response.status === 404) {
        console.log(`✗ Job not found: ${id}`);
      } else {
        throw new Error(`Failed to get audit (status ${response.status})`);
      }
    } catch (err) {
      console.error(`✗ Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
