# ARCHITECTURE.md

Architectural intent and core principles for ATN (Agent Trust Node).

## What ATN Is

ATN is a **cryptographic substrate** for agent-to-agent interactions.

It is not a marketplace, not a token system, and not a governance framework.

### The Core Primitive

ATN proves a single thing:

**Signed, canonicalized, hash-linked state transitions for agent job lifecycles that are independently verifiable.**

Everything else is secondary.

### What ATN Provides

- **Agent identity** via Ed25519 public key
- **Signed state transitions** on all mutations
- **Escrow state machine** (CREATED → FUNDED → PROVED → ATTESTED → SETTLED)
- **Append-only event log** of all state changes
- **SHA256-linked chain** of events (tamper-evident)
- **Audit replay capability** — full provenance is independently verifiable

### Why This Matters: The Coordination Problem

ATN is designed as a **social cohesion layer for autonomous agents**.

Humans rely on reputation, norms, and legal systems to cooperate. Agents do not have these evolved mechanisms.

ATN provides a mathematical equivalent:

- **Identity** through public keys
- **Intent** through signatures
- **Obligation** through escrow
- **Witnessing** through attestations
- **History** through hash-linked events
- **Accountability** through audit replay

The purpose is not distrust, but **scalable coordination**.

ATN exists to make agent-to-agent cooperation deterministic, auditable, and resilient.

### V0.1 Success Criteria

Three independent agents can:

1. Register with the system (public key identity)
2. Agent B publishes an offer (capability + pricing)
3. Agent A creates a job against that offer
4. Agent A funds the escrow
5. Agent B submits proof of work
6. Agent C (witness) attests job completion
7. System settles the escrow
8. **Retrieve a tamper-evident audit bundle showing complete provenance**

Every step is cryptographically signed. The entire flow is independently verifiable offline.

That is the complete goal of V0.1.

---

## What ATN Is NOT (In V0.1)

Explicitly excluded:

- [ ] Token economy or faucet limits
- [ ] Reputation system (V0.2 only)
- [ ] Dispute resolution engine
- [ ] Governance protocol
- [ ] Role-based permission system
- [ ] Marketplace UI
- [ ] Production deployment stack
- [ ] Performance optimization
- [ ] Swagger/OpenAPI documentation
- [ ] Metrics and monitoring

If you find yourself adding features in these categories during V0.1, stop.

**The invariant is more important than feature expansion.**

---

## Core Guiding Principle

**Optimize for mathematical verifiability over convenience.**

Not speed. Not UX. Not feature count.

**Verifiability.**

Every state mutation must:

1. ✅ Be canonicalized **deterministically**
2. ✅ Be signed **by the responsible agent**
3. ✅ Be validated **against the agent's public key**
4. ✅ Be logged **as an immutable event**
5. ✅ Include **a hash of the previous event** (chain)
6. ✅ Be **replayable and independently verifiable**

The system's truth must depend **only on math** — not trust in the server.

---

## Design Invariants (Non-Negotiable)

These are constitutional constraints. Violating any of them breaks the system.

### 1. Deterministic Canonicalization

- Canonicalization must be **deterministic** (same input always produces same canonical form)
- Use a **proven package** (e.g., `json-canon`, not hand-rolled code)
- Wrap it in `@atn/core` so you own the interface
- Every event and every signature must be over canonical bytes

**Why**: If canonicalization is non-deterministic, signatures are non-reproducible, and the system is not verifiable.

### 2. Signature Pattern

- Sign **canonical payload only**
- Transmit **signature separately** (in header or separate field)
- **Never include the signature in the payload before signing**
- Verify by: `verify(signature, canonicalize(payload), public_key)`

**Why**: Including the signature in the payload creates circular dependencies. Separating them is the only way to avoid verification bugs.

### 3. Agent Identity from Public Key

- Agent identity (DID or `agent_id`) **must be derived from or consistent with the public key**
- Example: `agent_id = hash(public_key)` or `did:atn:base58(public_key)`
- Prevent: An agent registering a second identity with a different key but claiming the same agent

**Why**: Without this, agents can fork their identities and claim actions they didn't make.

### 4. Every State Change = Event

- Every state transition creates **one immutable log entry**
- The log entry contains:
  - Canonical JSON of the state change
  - SHA256 hash of **previous event** (chain link)
  - Complete signature (for re-verification)
  - Timestamp
  - Agent who made the change

**Why**: Without this, there's no audit trail. The event log is the source of truth.

### 5. Tamper-Evidence

- Each event includes the hash of the previous event
- Modifying any past event **breaks the hash chain**
- An audit reader can detect tampering immediately
- Example: Event N includes `hash(Event N-1)`. If Event N-1 is modified, the hash no longer matches, and the chain is broken.

**Why**: This is what makes the system append-only in practice. You can't modify history without being caught.

### 6. Audit Bundles Are Complete

- An audit bundle must contain:
  - Complete event log (all events for a job)
  - All signatures (for re-verification)
  - All canonical payloads (for re-hashing)
- Must be verifiable **offline** (no server required)
- Must be human-readable (JSON)

**Why**: Offline verifiability means the server can't gaslight you. You hold the truth.

---

## Why These Invariants Matter

ATN is intended as a substrate for a potential future agent economy.

Before agents can trade, vote, or build reputation, they must be able to:

- ✅ Perform signed actions
- ✅ Enter escrow
- ✅ Produce proof
- ✅ Be witnessed
- ✅ Be audited

If that primitive is correct, higher-order systems can be built on top:

- Reputation systems (built on verified job history)
- Governance (agents voting on proposals with signed votes)
- Token economies (escrow foundation proves ownership)
- Marketplaces (matching engine trusts the event log)

If that primitive is weak, everything built on top collapses.

**The cryptographic substrate must be bulletproof.**

---

## Philosophy of Development

### V0.1: Prove the Primitive

V0.1 exists to prove the primitive works.

It is **intentionally minimal**.

It must **not be expanded prematurely**.

Ship the smallest system that proves:

> Three independent agents can complete a fully signed, hash-linked, escrowed transaction with verifiable audit history.

Once that works, refinement can begin.

### Resistance to Feature Creep

When building V0.1, you will be tempted to add:

- "Just a simple reputation score"
- "Just a faucet with limits"
- "Just error logging to a metrics server"
- "Just a basic UI"

**Resist.**

Every feature is a distraction.

Every feature adds attack surface.

Every feature makes the system harder to verify.

Focus. Ship the primitive.

### Decision Framework for V0.1

**Ask before adding anything**:

1. Does this feature prove the cryptographic primitive works? (If no, exclude it.)
2. Does this feature weaken any of the six invariants? (If yes, reject it.)
3. Can this wait until V0.2? (If yes, defer it.)

If the answer is "no," "yes," or "yes" — don't build it.

### Cryptographic Correctness > Everything

In this order:

1. **Cryptographic correctness** — math must be right
2. **Verifiability** — audit trail must be complete
3. **Simplicity** — code must be understandable
4. **Performance** — fast is nice, but not required
5. **Convenience** — UX is secondary

Never sacrifice #1–3 for #4–5.

---

## Instruction to Future Claude Instances

When modifying or extending ATN:

### Non-Negotiable

- 🚫 Never change signing rules casually
- 🚫 Never weaken canonicalization
- 🚫 Never modify event chaining lightly
- 🚫 Never introduce features that bypass signature verification
- 🚫 Never add features that make the system non-deterministic

### Required

- ✅ If a change affects any of the six invariants, document and justify it explicitly
- ✅ Update this document if you change architecture
- ✅ Run the E2E test after every structural change
- ✅ Verify audit bundles can be re-verified offline after any change

### Truth

- 📖 The specification (Readme.md) is the source of truth
- 📖 Code must match the specification
- 📖 If code and spec differ, change the code (or update the spec with reasoning)
- 📖 This is infrastructure thinking, not product thinking

### The Goal

**Build the primitive.**

**Prove it.**

**Everything else can layer on top.**

---

## References

- **Specification**: `Readme.md`
- **Development Plan**: `DEVELOPMENT_PLAN.md`
- **Development Guidance**: `CLAUDE.md`

This document is the **architectural constitution** of ATN. Refer to it when making design decisions.
