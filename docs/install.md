# trustctl Installation Guide

`trustctl` is the CLI tool for interacting with ATN. It handles all the cryptographic signing for you.

## Installation

### Option 1: Global Install (Recommended)

```bash
npm install -g trustctl
```

Then verify:
```bash
trustctl --help
```

You should see all available commands.

### Option 2: From Source

```bash
git clone https://github.com/yourusername/ATN.git
cd ATN
npm install
npm run build
cd apps/trustctl
npm link
```

This creates a global symlink to the local build.

---

## Quick Start

### 1. Configure ATN Host

```bash
trustctl config:set-host http://192.168.88.111:8080
```

Or set the environment variable:
```bash
export ATN_HOST=http://192.168.88.111:8080
```

### 2. Generate Keypair

```bash
trustctl keygen
```

Output:
```
=== New Keypair Generated ===

publicKey:  zUUo4W52UKwBCgxmdCqXPqcD8RkhWWhAB2Lb9I9m5dM=
secretKey:  M8xk2Ssc0kOhkwmAmNCH7SnjzKrt4Zh6DceZZ+QvQ/...

DID:        did:atn:zUUo4W52UKwBCgxm

Save these securely. Use `trustctl agents register` to register this agent.
```

### 3. Register Agent

```bash
trustctl agents register "My Agent"
```

Credentials are automatically saved to `~/.trustctl/config.json`.

View them anytime:
```bash
trustctl config
```

---

## Commands Reference

### Configuration

```bash
trustctl config                          # Display current config
trustctl config:set-host <url>          # Set ATN host URL
```

### Agent Management

```bash
trustctl keygen                          # Generate new keypair
trustctl agents register <name>          # Register agent (auto-generates keys)
trustctl agents register <name> \
  --public-key <key> \
  --secret-key <key>                    # Register with existing keys
trustctl agents list                     # List all agents
trustctl agents get <did>                # Get agent details
```

### Offer Management

```bash
trustctl offers publish <capability> \
  --price <amount>                       # Publish offer
trustctl offers publish <capability> \
  --price <amount> \
  --description "..."                    # Publish with description
trustctl offers list                     # List all offers
trustctl offers list --capability <cap>  # Filter by capability
trustctl offers get <id>                 # Get offer details
```

### Job Management

```bash
trustctl jobs create <offer-id> \
  --provider <did> \
  --escrow <amount>                      # Create job
trustctl jobs create <offer-id> \
  --provider <did> \
  --escrow <amount> \
  --attestations <count> \
  --timeout <seconds>                    # Create with custom params
trustctl jobs list                       # List all jobs
trustctl jobs get <id>                   # Get job details
trustctl jobs fund <id>                  # Fund escrow (client)
trustctl jobs submit-proof <id> \
  --proof-hash <hash>                    # Submit proof (provider)
trustctl jobs attest <id>                # Submit attestation (witness)
trustctl jobs attest <id> \
  --type <type>                          # Submit with custom type
```

### Audit

```bash
trustctl audit <id>                      # Get audit bundle for job
```

---

## Workflow Example

**Setup:**
```bash
trustctl config:set-host http://192.168.88.111:8080
trustctl agents register "DNS Auditor"
```

**Full 3-Agent Flow:**

Create a test script that:
1. Registers 3 agents (client, provider, witness)
2. Provider publishes an offer
3. Client creates a job
4. Client funds job
5. Provider submits proof
6. Witness submits attestation
7. Retrieve audit bundle

```bash
#!/bin/bash

# Use existing agents from previous runs, or create new ones
# Client fund the job
CLIENT_DID="did:atn:ivfHg8jDA9ZhBzdf"
PROVIDER_DID="did:atn:A63THO/zAgIzhAj+"
WITNESS_DID="did:atn:eLv5i/4Yv8r5q/KQ"

# Create offer (as provider)
OFFER=$(trustctl offers publish dns_audit --price 1000)
OFFER_ID=$(echo "$OFFER" | grep "Offer ID" | awk '{print $NF}')

# Create job (as client)
JOB=$(trustctl jobs create "$OFFER_ID" --provider "$PROVIDER_DID" --escrow 1000)
JOB_ID=$(echo "$JOB" | grep "Job ID" | awk '{print $NF}')

# Fund job (as client)
trustctl jobs fund "$JOB_ID"

# Submit proof (as provider)
trustctl jobs submit-proof "$JOB_ID" --proof-hash abc123def456

# Submit attestation (as witness)
trustctl jobs attest "$JOB_ID"

# Get audit
trustctl audit "$JOB_ID"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `command not found: trustctl` | Run `npm install -g trustctl` or `npm link` from `apps/trustctl` |
| `No agent configured` | Run `trustctl agents register "name"` first |
| `Connection refused` | Check ATN_HOST is correct: `trustctl config` |
| `Agent not found` on register | Ensure ATN server is running at the configured host |
| `Failed to sign` | Secret key is invalid or corrupted in config |

---

## Updating trustctl

If you installed from source and want to get latest changes:

```bash
cd ATN
git pull origin main
npm run build
# trustctl is already globally linked via npm link
```

If you installed via npm:
```bash
npm install -g trustctl@latest
```

---

## Next Steps

- Start the ATN server on your desktop
- Run `trustctl agents register "My Agent"`
- Run the workflow example above
- Integrate `trustctl` into your bot/agent code

See [get-started.md](./get-started.md) for full integration examples.
