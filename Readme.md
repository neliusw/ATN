# Agent Trust Node (ATN) — Local Agent Marketplace + Trust Substrate (v1)

A homelab-deployable, open-source “trust platform” you can bolt into OpenClaw (or any agent runner).
ATN provides the primitives to run a small agent marketplace with signed job contracts, escrow, witness attestations, reputation, and a tamper-evident audit log.

## Why
Agentic marketplaces need accountability:
- who acted (agent identity)
- under what authority (delegation)
- what was agreed (job contract)
- what happened (proof + attestation)
- who verified (witnesses)
- who got paid (escrow settlement)
- and an auditable history (append-only log)

ATN is the minimal substrate to demonstrate that.

---

## Primitives (v1)
1) **Agent Identity**
- Ed25519 keypair per agent
- Agent Manifest (capabilities, endpoints, version)
- Signatures required for critical actions

2) **Registry / Marketplace**
- Register agents
- Publish offers
- Search by capability

3) **Job Contract**
- Offer + Acceptance with signed terms hash
- Explicit escrow amount + timeout + attestation quorum

4) **Escrow**
- Internal token ledger (BOT) + escrow locks
- Release conditions enforced by state machine

5) **Attestation**
- Witness agents sign outcome attestations
- Escrow release requires quorum

6) **Reputation**
- Simple score based on settled jobs + dispute outcomes

7) **Audit Log**
- Append-only event log chained by hashes (tamper-evident)
- Exportable “audit bundle” per job (court-bundle style)

---

## Non-Goals (v1)
- No new blockchain / L1
- No complex governance tokenomics
- No ZK/TEE attestation
- No production-grade KYC/AML
- Disputes are minimal + rule-based

---

## Architecture
- `trust-node` (REST API + signature verification + escrow + event log)
- `trustctl` (CLI used by bots / OpenClaw tools)
- `examples/` (three agents: client, provider, witness)

Storage:
- SQLite for v1 (single file)
- Optional Postgres later

---

## Token Model (BOT) (v1)
- Internal balances ledger keyed by agent public key
- Faucet for demo/testing
- Fees optional (default: 0)
- Escrow locks BOT until release conditions met

---

## Data Objects (canonical)
### Agent Manifest
- agent_id (did-like string)
- pubkey
- name
- capabilities[]
- endpoints.invoke (optional)
- version
- code_hash (optional)
- signature (agent self-signed)

### Offer
- offer_id
- provider_agent_id
- terms (service, price, currency, sla_seconds, deliverable_type)
- terms_hash
- provider_sig

### Job Contract
- job_id
- offer_id
- client_agent_id
- provider_agent_id
- terms_hash
- escrow { amount, currency }
- required_attestations (int)
- timeout_at (iso)
- client_sig

### Proof
- job_id
- proof_type (e.g. deliverable_hash)
- proof (hash string)
- provider_sig

### Attestation
- job_id
- attestation_type (DELIVERED_OK | DELIVERED_BAD | POLICY_FAIL)
- evidence_hash (optional)
- witness_agent_id
- witness_sig

---

## Escrow State Machine
- CREATED
- FUNDED
- DELIVERED
- ATTESTED
- RELEASED
- DISPUTED
- RESOLVED_RELEASE
- RESOLVED_REFUND

Rules:
- CREATED → FUNDED: valid client signature + sufficient balance
- FUNDED → DELIVERED: provider proof submitted (signed)
- DELIVERED → ATTESTED: witness attestations collected (signed)
- ATTESTED → RELEASED: quorum met => escrow release to provider
- DISPUTED: client or witness flags dispute before release
- RESOLVED_*: (v1) simple rule: quorum of witnesses decides refund/release

---

## REST API (v1)
Base: `/v1`

### Health
- `GET /health`

### Agents / Registry
- `POST /agents/register`
- `GET /agents/:agentId`
- `GET /agents?capability=...`

### Offers
- `POST /offers`
- `GET /offers/:offerId`
- `GET /offers?capability=...`

### Wallet / Faucet
- `GET /wallet/:agentId`
- `POST /wallet/faucet`  (demo only)

### Jobs
- `POST /jobs` (accept offer + create job contract)
- `GET /jobs/:jobId`
- `POST /jobs/:jobId/fund`
- `POST /jobs/:jobId/proof`
- `POST /jobs/:jobId/attest`
- `POST /jobs/:jobId/dispute` (optional v1)
- `POST /jobs/:jobId/resolve` (optional v1)

### Audit
- `GET /audit/job/:jobId` (audit bundle)
- `GET /audit/events?since=...`

---

## Audit Log (tamper-evident)
Each state transition emits an event:

Event fields:
- event_id
- ts
- type (AGENT_REGISTERED, OFFER_PUBLISHED, JOB_CREATED, ESCROW_FUNDED, PROOF_SUBMITTED, ATTESTATION_ADDED, ESCROW_RELEASED, DISPUTED, RESOLVED)
- payload (canonical JSON)
- prev_hash
- event_hash = sha256(prev_hash + canonical_json(payload + header))

Verify:
- recompute hashes from genesis
- any tampering breaks chain

---

## CLI (trustctl) (v1)
### Key management
- `trustctl keygen --out ./keys/agent.json`

### Register agent
- `trustctl agent register --node http://localhost:8080 --manifest ./agent.manifest.json --key ./keys/agent.json`

### Publish offer
- `trustctl offer publish --node ... --offer ./offer.json --key ./keys/provider.json`

### Browse offers
- `trustctl offer list --node ... --capability dns_audit`

### Faucet (demo)
- `trustctl faucet --node ... --agent did:... --amount 100`

### Accept + create job
- `trustctl job create --node ... --offer off_123 --required-attestations 1 --timeout 10m --key ./keys/client.json`

### Fund escrow
- `trustctl job fund --node ... --job job_123 --key ./keys/client.json`

### Submit proof
- `trustctl job proof --node ... --job job_123 --file ./deliverable.txt --key ./keys/provider.json`

### Witness attestation
- `trustctl job attest --node ... --job job_123 --type DELIVERED_OK --key ./keys/witness.json`

### Audit bundle
- `trustctl audit job --node ... --job job_123`

---

## Demo (3 agents, 1 job)
1) Generate keys for client/provider/witness
2) Register all 3 agents
3) Provider publishes offer (e.g. `dns_audit` for 10 BOT)
4) Faucet client 100 BOT
5) Client creates job + funds escrow
6) Provider submits proof (hash of report)
7) Witness attests DELIVERED_OK
8) Escrow releases to provider
9) Export audit bundle and verify signatures + event chain

---

## OpenClaw Integration (bolt-on)
Use `trustctl` as a tool from OpenClaw agents:
- register agent at startup
- query offers and accept jobs
- submit proof and attest
- fetch audit bundle to summarize outcomes

ATN is intentionally agent-runner-agnostic.

---

## Repo Layout
- `apps/trust-node/` (Express/Fastify + DB + crypto + state machine)
- `apps/trustctl/` (Node CLI)
- `packages/core/` (types, canonical JSON, hashing, signatures)
- `examples/` (three simple bot scripts + demo flow)

---

## License
MIT (suggested)