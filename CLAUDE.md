# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agent Trust Node (ATN)** is a **cryptographic substrate** for agent-to-agent interactions. It is not a marketplace, token system, or governance framework.

**The singular goal**: Prove that signed, canonicalized, hash-linked state transitions for agent job lifecycles are independently verifiable.

Three agents can:
1. Register with public key identity
2. Publish an offer, create a job, fund escrow
3. Submit proof, attest completion, settle
4. Retrieve a tamper-evident audit bundle proving the entire flow

Every step is cryptographically signed. The entire flow is independently verifiable offline.

That is V0.1.

See `Readme.md` for specification and `ARCHITECTURE.md` for the core principles that govern all development.

## Project Structure

This is a **monorepo** with the following planned structure:

```
ATN/
├── apps/
│   ├── trust-node/        # REST API server (Express/Fastify + SQLite + crypto)
│   └── trustctl/          # CLI tool for agents, bots, and bot scripts
├── packages/
│   └── core/              # Shared types, canonical JSON, hashing, signatures
├── examples/              # Bot scripts and demo flows
├── Readme.md              # Complete specification and architecture
└── CLAUDE.md              # This file
```

## Architecture

**Backend Layer** (`trust-node`):
- REST API with signature verification middleware
- Escrow and state machine management
- Event log with tamper-evident chaining (SHA256)
- SQLite v1 database (Postgres planned for v2+)

**CLI Layer** (`trustctl`):
- Command-line interface for agents, bots, OpenClaw runners
- Key management (Ed25519)
- Agent registration, offer publishing, job creation
- Proof submission, attestation, audit bundles

**Shared Core** (`packages/core`):
- Type definitions (Job, Offer, Agent, Witness, etc.)
- Canonical JSON serialization
- SHA256 hashing for event chaining
- Ed25519 signature generation and verification

## Key Technologies

- **Language**: TypeScript
- **Runtime**: Node.js
- **Database**: SQLite (v1)
- **Cryptography**: Ed25519 for keys/signatures, SHA256 for event chaining
- **REST Framework**: Express or Fastify (TBD)
- **Package Manager**: npm

## Core Concepts

**Primitives**:
- **Agent**: Identified by DID format, owns Ed25519 keypair
- **Capability**: Service capability offered by agents (e.g., `dns_audit`)
- **Offer**: Specification with capability, input schema, output schema, price
- **Job**: Contract linking client to provider for work on specific offer
- **Proof**: Delivery evidence (file hash) submitted by provider
- **Attestation**: Third-party verification (DELIVERED_OK, DELIVERED_INVALID, etc.)
- **Escrow**: Holds client funds through job lifecycle

**Escrow State Machine**:
```
CREATED → FUNDED → PROVED → [ATTESTED|DISPUTE] → SETTLED
```

All state transitions are cryptographically signed and logged in append-only event log.

## Development Commands (to be implemented)

### Setup
```bash
npm install                    # Install dependencies for all packages
npm run build                  # Build all packages
npm run test                   # Run tests for all packages
npm run lint                   # Lint all packages
```

### trust-node (REST API)
```bash
npm run dev -w apps/trust-node # Start dev server on http://localhost:8080
npm run test -w apps/trust-node
```

### trustctl (CLI)
```bash
npm run build -w apps/trustctl
node apps/trustctl/dist/index.js --help
# Or as installed CLI: trustctl --help
```

### Typical CLI Commands (see Readme.md for full reference)
```bash
trustctl keygen --out ./keys/agent.json
trustctl agent register --node http://localhost:8080 --manifest ./agent.manifest.json --key ./keys/agent.json
trustctl offer publish --node ... --offer ./offer.json --key ./keys/provider.json
trustctl job create --node ... --offer off_123 --required-attestations 1 --timeout 10m --key ./keys/client.json
trustctl job fund --node ... --job job_123 --key ./keys/client.json
trustctl job proof --node ... --job job_123 --file ./deliverable.txt --key ./keys/provider.json
trustctl job attest --node ... --job job_123 --type DELIVERED_OK --key ./keys/witness.json
trustctl audit job --node ... --job job_123
```

## Important Implementation Notes

1. **Canonical JSON**: Must be used consistently for hashing and signatures across all parts. See `packages/core` for implementation.

2. **Signature Verification**: All API endpoints and CLI commands involving state mutations must verify Ed25519 signatures before accepting requests.

3. **Event Chaining**: The event log must maintain SHA256 hash chain integrity. Each new event includes hash of previous event, making it append-only and tamper-evident.

4. **Escrow State Transitions**: Only allow transitions valid in the state machine. All transitions must be cryptographically signed and logged.

5. **DID Format**: Agents are identified by DIDs (Decentralized Identifiers). Choose a simple format (e.g., `did:atn:agent_{uuid}` or similar).

6. **Database Schema**: Design for efficient querying of:
   - Agent registry with DID → key lookups
   - Offer listing by capability
   - Job history and state
   - Event log with hash chain integrity

7. **OpenClaw Integration**: `trustctl` should be embeddable in OpenClaw agent runners for seamless trust substrate integration. Consider plugin/hook architecture in trustctl.

## Testing Strategy

- Unit tests for cryptography (hashing, signatures)
- Unit tests for state machine transitions
- Integration tests for REST API with signature verification
- Integration tests for CLI commands end-to-end
- Test data: Use fixed keypairs in test fixtures for deterministic signatures

## API Design Notes (from Readme.md)

### REST Endpoints (v1 spec)
- `POST /agents` - Register agent
- `GET /agents` - List agents
- `GET /agents/{did}` - Get agent details
- `POST /offers` - Publish offer
- `GET /offers` - List offers (filterable by capability)
- `POST /jobs` - Create job
- `GET /jobs/{id}` - Get job details
- `POST /jobs/{id}/fund` - Fund escrow
- `POST /jobs/{id}/proof` - Submit proof
- `POST /jobs/{id}/attest` - Submit attestation
- `GET /audit/{id}` - Get audit bundle (full event log for a job)

All requests/responses must include signatures where state mutations occur.

## Critical: Read This First

**`ARCHITECTURE.md`** contains the constitutional principles of ATN:
- Why ATN is a cryptographic substrate, not a marketplace
- The six non-negotiable invariants (canonicalization, signatures, agent identity, event chaining, tamper-evidence, audit bundles)
- Why these invariants matter
- Guidance for future development

Before writing code or making design decisions, understand what ATN is optimizing for: **mathematical verifiability, not convenience or features.**

---

## Development Tracking

**See `DEVELOPMENT_PLAN.md`** for aggressive v0.x roadmap:

| Version | Timeline | Focus |
|---------|----------|-------|
| **V0.1** | 2–3 weeks | 3 agents, 1 job, crypto + escrow + chain |
| **V0.2** | 2–3 weeks | CLI, config, Docker, examples, OpenClaw doc |
| **V0.3** | TBD | CI/CD, docs, security, benchmarks |

**V0.1 is intentionally minimal** — just prove the core primitives work. Deliberately excluded: faucet limits, CLI polish, CI/CD, security audit, perf benchmarks, Swagger docs, dispute logic, role auth, metrics, config support.

18 tasks across 3 phases, ~9 weeks total for single developer.

Refer to plan when:
- Starting any work
- Checking what's in scope for current version
- Tracking progress
- Understanding dependencies

## References

- **Architectural Constitution**: `ARCHITECTURE.md` — non-negotiable principles
- **Complete Specification**: `Readme.md` — what to build
- **Development Roadmap**: `DEVELOPMENT_PLAN.md` — how to build it (V0.1–V0.3)
- **License**: MIT

**Project Status**: Specification and architecture complete. V0.1 implementation ready to start.
