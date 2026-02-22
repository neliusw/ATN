# DEVELOPMENT_PLAN.md

Development roadmap for Agent Trust Node (ATN) project.

**Read `ARCHITECTURE.md` first.** This plan implements the principles defined there.

## Overview

This document outlines the aggressive v0.x roadmap for ATN. Focus: ship fast and prove the core primitives work before polishing.

The plan is shaped by the architectural invariants:
- Deterministic canonicalization (wrapped package)
- Signature pattern (canonical payload + separate signature)
- Agent identity from public key
- Every state change = immutable logged event
- Tamper-evident event chaining
- Complete offline-verifiable audit bundles

**Status**: Not started (specification phase complete)

## High-Level Roadmap

| Version | Timeline | Goal |
|---------|----------|------|
| **V0.1** | 2–3 weeks | 3 agents complete 1 job with signatures, escrow, attestation, chain, audit |
| **V0.2** | 2–3 weeks | CLI polish, config, errors, reputation, Docker, examples |
| **V0.3** | TBD | CI/CD, docs, security, benchmarks |

**Deliberately excluded from V0.1**: Faucet logic, CLI polish, CI/CD, security audit, performance benchmarks, Swagger docs, dispute resolution, role-based auth, metrics, config support, detailed error taxonomy

---

# V0.1: "Proof It's Real" Build (2–3 weeks)

**Goal**: 3 agents complete 1 job end-to-end with cryptographic proof.

**What's included**:
- Agent registration (public key only)
- Offer publishing
- Job creation → fund → prove → attest → settle
- Cryptographic signatures on all state changes
- Escrow state machine
- Append-only event chain with SHA256 linking
- Audit bundle retrieval
- Minimal CLI to test flows
- SQLite persistence

**What's NOT included**:
- Faucet with amount limits
- CLI polish or config files
- Docker/deployment
- Example bots
- CI/CD
- Performance optimization
- Error message polish
- Swagger/API docs
- Role-based auth (just signature verification)
- Dispute resolution logic
- Reputation tracking
- Metrics

---

## V0.1 Phase 1: Project Setup (1 day)

### Goals
- Get monorepo structure in place
- Setup minimal tooling to start coding

### Tasks

- [ ] **1.1** Initialize npm workspaces
  - Create `packages/core`, `apps/trust-node`, `apps/trustctl` directories
  - Create root `package.json` with workspaces
  - Deliverable: Workspace structure working

- [ ] **1.2** Setup TypeScript and build
  - Root `tsconfig.json` + one per workspace
  - `npm run build` and `npm run dev` scripts
  - Deliverable: Code compiles and runs

- [ ] **1.3** Setup basic testing
  - Install Jest or Vitest
  - `npm run test` works
  - Deliverable: Can write and run tests

- [ ] **1.4** Create .gitignore and init git
  - Create `.gitignore`
  - Deliverable: Ready for version control

**Estimated Time**: 1 day

## V0.1 Phase 2: Core Package (3–4 days)

### Goals
- Cryptographic primitives for signatures and chains
- Type definitions for domain model
- State machine for escrow

### Tasks

- [ ] **2.1** Define TypeScript types
  - Agent, DID, Offer, Job, Proof, Attestation, Escrow types
  - Event log entry type
  - Job state enum: CREATED, FUNDED, PROVED, ATTESTED, SETTLED
  - Deliverable: `types.ts`

- [ ] **2.2** Wrap proven canonicalizer package
  - Use `json-canon` or similar proven package (NOT hand-rolled)
  - Wrap in `canonical.ts` to own the interface
  - Test round-trip with various data shapes
  - Deliverable: `canonical.ts` module wrapping external package

- [ ] **2.3** Implement Ed25519 crypto
  - Key generation, sign, verify
  - Key serialization (JSON)
  - Deliverable: `crypto.ts` with tests

- [ ] **2.4** Implement SHA256 hashing
  - Hash function for event chaining
  - Deliverable: `hash.ts` with tests

- [ ] **2.5** Implement escrow state machine
  - Valid transitions: CREATED → FUNDED → PROVED → ATTESTED → SETTLED
  - Transition validation function
  - Deliverable: `statemachine.ts` with tests

- [ ] **2.6** Create index.ts exports
  - Export all public types and functions
  - Deliverable: Clean `@atn/core` API

**Estimated Time**: 3–4 days

## V0.1 Phase 3: REST API + Minimal CLI (4–5 days)

### Goals
- SQLite-backed server with basic endpoints
- All state changes signed and logged
- 3-agent job flow works end-to-end

### Tasks

- [ ] **3.1** Setup Express server + SQLite
  - Basic Express app on port 8080
  - SQLite schema: agents, offers, jobs, events
  - Deliverable: Server starts and persists data

- [ ] **3.2** Implement signature verification
  - **Pattern**: Sign canonical payload only, transmit signature separately in header/field
  - Extract signature and canonical payload from request
  - Verify signature matches payload + agent's public key
  - Reject unsigned mutations
  - Deliverable: Middleware enforcing signatures on all mutations

- [ ] **3.3** Implement agent endpoints
  - `POST /agents` - Register (self-signed); **verify signature matches pubkey in manifest; derive agent_id from pubkey or ensure consistency**
  - `GET /agents`
  - `GET /agents/{did}`
  - Deliverable: Agents can register (and can't register agents they don't control)

- [ ] **3.4** Implement offer endpoints
  - `POST /offers` - Publish (signed by publisher)
  - `GET /offers`
  - `GET /offers/{id}`
  - Deliverable: Offers can be published

- [ ] **3.5** Implement job endpoints
  - `POST /jobs` - Create (signed by client)
  - `GET /jobs`, `GET /jobs/{id}`
  - `POST /jobs/{id}/fund` - Fund escrow (signed by client)
  - `POST /jobs/{id}/proof` - Submit proof (signed by provider)
  - `POST /jobs/{id}/attest` - Attest (signed by witness)
  - Validate state machine transitions
  - Deliverable: Full job lifecycle works

- [ ] **3.6** Implement event log with chaining
  - Every state change → event log entry
  - Each event includes SHA256 hash of previous event
  - Store full signature + canonical JSON in log
  - Deliverable: Tamper-evident log working

- [ ] **3.7** Implement audit endpoint
  - `GET /audit/{jobId}` - Return full event chain
  - Include all signatures for re-verification
  - Deliverable: Can audit any job

- [ ] **3.8** Write end-to-end test
  - Single test with clear roles:
    - **Agent A (client)**: register → create job → fund
    - **Agent B (provider)**: publish offer → submit proof
    - **Agent C (witness)**: attest
  - Verify full event chain is correct
  - Deliverable: E2E flow passing

**Estimated Time**: 4–5 days

---

## V0.1 Critical Decisions

**Canonicalization**: Use a proven package (`json-canon` or similar), don't roll your own. Wrap it in `@atn/core` to own the interface.

**Signature Pattern**: Sign the canonical payload only, transmit signature separately. Never include the signature in the payload before signing.

**Agent Registration Security**:
- Verify signature matches the public key in the agent manifest
- Derive `agent_id` from the public key (or at least ensure it's consistent)
- This prevents registering agents you don't control

**What Gets Logged**: Every state change (job created, funded, proved, attested) becomes an event in the log with:
- Canonical JSON of the event
- SHA256 hash of previous event (for chaining)
- Complete signature (for re-verification)

---

## V0.1 Summary

**Total Tasks**: 18 tasks
**Estimated Time**: 2–3 weeks (1 developer)
**Deliverable**: Working prototype where 3 agents complete a signed, escrowed job with full audit trail

```
V0.1 Phase 1 (Setup)     → 1 day
V0.1 Phase 2 (Core)      → 3–4 days
V0.1 Phase 3 (API + CLI) → 4–5 days
Testing & debugging      → 2–3 days
```

**Success Criteria**:
- [ ] Run E2E flow:
  - **Agent A (client)**: registers → creates job → funds escrow
  - **Agent B (provider)**: publishes offer → submits proof
  - **Agent C (witness)**: attests job completion
  - Full event chain is queryable and tamper-evident
- [ ] Event chain is tamper-evident (hash-linked)
- [ ] All mutations require valid signatures
- [ ] Audit bundle shows complete provenance

---

# V0.2: "Feels Real" (2–3 weeks later)

**Goals**: Make it pleasant to use and deployable.

## V0.2 Tasks

- [ ] **CLI 1** - Minimal CLI tool
  - `keygen`, `agent register`, `offer publish`, `job create/fund/proof/attest`, `audit`
  - No config files, pass --node URL every time
  - Basic error messages
  - Deliverable: Can run full flow from CLI

- [ ] **Config 1** - Configuration support
  - `~/.atn/config.json` for default node URL
  - Environment variables
  - Deliverable: `--node` becomes optional

- [ ] **Errors 1** - Better error messages
  - Clear validation error messages
  - Clear state machine rejection messages
  - Deliverable: Errors are helpful, not cryptic

- [ ] **Reputation 1** - Basic reputation tracking
  - Track successful/failed jobs per agent
  - Query: `GET /agents/{did}/reputation`
  - Deliverable: Reputation score visible

- [ ] **Docker 1** - Containerization
  - `Dockerfile` for trust-node
  - `docker-compose.yml` for development
  - Deliverable: `docker-compose up` brings up full stack

- [ ] **Examples 1** - Example bots
  - 3 example bot scripts (provider, client, witness)
  - README with demo flow
  - Deliverable: `examples/` has runnable bots

- [ ] **OpenClaw Doc 1** - Integration guide
  - How to embed trustctl in OpenClaw agents
  - Example hook/plugin
  - Deliverable: `docs/openClaw-integration.md`

**Estimated Time**: 2–3 weeks

---

# V0.3: "Public-Ready"

**Goals**: Production-grade quality and official launch.

## V0.3 Tasks

- [ ] **CI/CD 1** - Automated testing & builds
  - GitHub Actions: test on push, build on tag
  - Deliverable: Automated release pipeline

- [ ] **Coverage 1** - Test coverage targets
  - Aim for >80% unit test coverage
  - Add missing integration tests
  - Deliverable: Coverage report

- [ ] **API Docs 1** - OpenAPI/Swagger
  - Generate OpenAPI spec from code
  - Host on `/api-docs`
  - Deliverable: Auto-generated API docs

- [ ] **Security 1** - Security review
  - Audit all crypto operations
  - Audit signature verification paths
  - Audit SQL queries for injection
  - Deliverable: Security checklist passed

- [ ] **Benchmarking 1** - Performance baselines
  - Benchmark job creation → proof → attest cycle
  - Benchmark audit retrieval time
  - Deliverable: Performance targets documented

- [ ] **Governance 1** - Governance thinking
  - How are upgrades managed?
  - How are bugs reported?
  - How are breaking changes handled?
  - Deliverable: GOVERNANCE.md

**Estimated Time**: TBD (likely 2–3 weeks)

---

## Overall Timeline

```
Week 1-3:   V0.1 ✓ ("Proof It's Real")
Week 4-6:   V0.2 ✓ ("Feels Real")
Week 7-9:   V0.3 ✓ ("Public-Ready")
Total:      ~9 weeks for single developer
```

---

## Progress Tracking for V0.1

```markdown
## V0.1 Progress

**Current Phase**: [Setup / Core / API+CLI / Done]
**Overall Completion**: X/18 tasks (XX%)
**Last Updated**: YYYY-MM-DD

### Phase 1: Project Setup
- [ ] 1.1 npm workspaces
- [ ] 1.2 TypeScript + build
- [ ] 1.3 Testing setup
- [ ] 1.4 Git init

### Phase 2: Core Package
- [ ] 2.1 Types
- [ ] 2.2 Canonical JSON
- [ ] 2.3 Ed25519 crypto
- [ ] 2.4 SHA256 hash
- [ ] 2.5 State machine
- [ ] 2.6 Exports

### Phase 3: REST API + CLI
- [ ] 3.1 Express + SQLite
- [ ] 3.2 Signatures
- [ ] 3.3 Agents
- [ ] 3.4 Offers
- [ ] 3.5 Jobs (full lifecycle)
- [ ] 3.6 Event chaining
- [ ] 3.7 Audit endpoint
- [ ] 3.8 E2E test passing
```

---

## Notes for Future Claude Instances

- V0.1 is **intentionally minimal**. Don't add features not listed.
- Each task must have working tests before marking complete.
- The goal is to prove the core primitives work, not build a polished product.
- V0.2 is where UX and deployment happen.
- V0.3 is where production hardening and governance happen.
- If you discover a bug in V0.1, fix it immediately. If it's a design issue, document it for V0.2.
- Keep Readme.md as the source of truth for what the system should do.
- The specification is more important than any code—if code doesn't match Readme.md, change the code.
- **Read ARCHITECTURE.md before making design decisions.** The six invariants are non-negotiable.

---

## References

- **Architectural Constitution**: `ARCHITECTURE.md` — core principles and invariants
- **Complete Specification**: `Readme.md` — system requirements
- **Development Guidance**: `CLAUDE.md` — guidance for Claude instances
- **License**: MIT

**Status**: Specification and architecture complete. Ready to implement V0.1.
