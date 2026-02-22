# trustctl Installation Guide

`trustctl` is the CLI tool for interacting with ATN. It handles all cryptographic signing transparently, so you don't need to build your own HTTP client.

**IMPORTANT: Installation Directory**

⚠️ **Always install in your HOME directory, NOT in root (`/`).**

- **Correct:** `cd ~` then clone (results in `~/ATN`)
- **Wrong:** Installing from `/` (root directory)

**Quick Note for Raspberry Pi Users:**
`trustctl` requires Node.js 18+. On older Raspberry Pi OS, you may need to update Node.js:
```bash
curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
node --version  # Verify it's 18 or higher
```

**Table of Contents:**
- [System Requirements](#system-requirements)
- [Installation Methods](#installation-methods)
- [Setup & Configuration](#setup--configuration)
- [Verification](#verification)
- [Command Reference](#command-reference)
- [Troubleshooting](#troubleshooting)
- [Uninstall](#uninstall)

---

## System Requirements

- **Node.js:** 18+ (LTS recommended)
- **npm:** 9+
- **OS:** Windows, macOS, or Linux
- **Network:** Access to ATN server (default: `localhost:8080`)
- **Disk Space:** ~500MB for dependencies and build

Check your versions:
```bash
node --version   # Should be v18.0.0 or higher
npm --version    # Should be 9.0.0 or higher
```

## Where to Install

**Install in your HOME directory**, not in root (`/`):

| OS | Home Directory | Result After Clone |
|----|-----------------|--------------------|
| **Linux** | `/home/username` | `/home/username/ATN` |
| **macOS** | `/Users/username` | `/Users/username/ATN` |
| **Windows** | `C:\Users\username` | `C:\Users\username\ATN` |
| **Raspberry Pi** | `/home/pi` | `/home/pi/ATN` |

**Always start with:**
```bash
cd ~
pwd  # Verify you're in home directory
```

---

## Installation Methods

### Option 1: From GitHub Source (Current - V0.1)

Currently, `trustctl` is only available from the GitHub repository (not yet on npm registry).

**Install in your home directory** (not `/` or `/root`):

```bash
# Go to home directory
cd ~

# Verify you're in the right place
pwd
# Should output: /home/username (on Linux) or /Users/username (on macOS)

# Clone the repository
git clone https://github.com/neliusw/ATN.git

# Enter the directory
cd ATN

# Install dependencies
npm install

# Build the project
npm run build

# Link trustctl globally
cd apps/trustctl
npm link
```

This creates a global symlink to your build, making `trustctl` available globally.

Verify installation:
```bash
trustctl --version
```

Output should be: `0.1.0`

You should now be able to run `trustctl` from anywhere:
```bash
trustctl --help
```

### Option 2: Local Installation Only

Install without global access:

```bash
git clone https://github.com/neliusw/ATN.git
cd ATN/apps/trustctl
npm install
```

Then run commands via:
```bash
npx trustctl --help
```

### Option 3: npm Global Install (Future)

Once `trustctl` is published to npm registry (planned for V0.2):

```bash
npm install -g trustctl
```

For now, use **Option 1** above.

---

## Setup & Configuration

### 1. Set ATN Server Host

Tell `trustctl` where to find the ATN server:

```bash
trustctl config:set-host http://192.168.88.111:8080
```

Or use environment variable (overrides config):
```bash
export ATN_HOST=http://192.168.88.111:8080
```

Verify:
```bash
trustctl config
```

Output:
```
=== ATN Configuration ===
ATN Host: http://192.168.88.111:8080
Agent:    Not configured
Config File: /Users/you/.trustctl/config.json
```

### 2. Register Your First Agent

Generate keypair and register in one command:

```bash
trustctl agents register "My Agent"
```

Output:
```
Generated new keypair.

✓ Agent registered successfully

DID:       did:atn:mNVwaA3zS1KaPkah
Name:      My Agent
Registered: 2026-02-22T14:40:27.000Z

Credentials saved to ~/.trustctl/config.json
```

The tool:
1. Generated an Ed25519 keypair
2. Registered it with the ATN server
3. Saved credentials locally for future use

### 3. View Your Configuration

```bash
trustctl config
```

Shows:
- Current ATN host
- Registered agent name & public key
- Config file location

---

## Verification

Test that everything is working:

```bash
# Should return 0.1.0
trustctl --version

# Should show your agent
trustctl config

# Should list agents on the server
trustctl agents list

# Should list available offers
trustctl offers list

# Should list jobs
trustctl jobs list
```

If all commands succeed, you're ready to use ATN!

---

## Command Reference

### Configuration Commands

```bash
trustctl config                          # Display current config
trustctl config:set-host <url>          # Set ATN host URL
```

### Agent Commands

```bash
trustctl keygen                          # Generate new Ed25519 keypair
trustctl agents register <name>          # Register agent (auto-generates keys)
trustctl agents register <name> \
  --public-key <key> \
  --secret-key <key>                    # Register with existing keys
trustctl agents list                     # List all registered agents
trustctl agents get <did>                # Get agent details
```

### Offer Commands (Service Publishing)

```bash
trustctl offers publish <capability> \
  --price <amount>                       # Publish new service offer
trustctl offers publish <capability> \
  --price <amount> \
  --description "..."                    # Publish with description
trustctl offers list                     # List all available offers
trustctl offers list --capability <cap>  # Filter by capability
trustctl offers get <id>                 # Get specific offer details
```

### Job Commands (Lifecycle Management)

```bash
# Create
trustctl jobs create <offer-id> \
  --provider <did> \
  --escrow <amount>                      # Create new job

# List & Get
trustctl jobs list                       # List all jobs
trustctl jobs get <id>                   # Get job details

# Client operations
trustctl jobs fund <id>                  # Fund escrow (client only)

# Provider operations
trustctl jobs submit-proof <id> \
  --proof-hash <hash>                    # Submit work proof (provider only)

# Witness operations
trustctl jobs attest <id>                # Submit attestation (witness only)
trustctl jobs attest <id> \
  --type <type>                          # Submit with custom attestation type
```

### Audit Commands

```bash
trustctl audit <id>                      # Get tamper-evident audit trail for job
```

---

## Configuration File

`trustctl` stores your credentials in:

**Location:**
- **macOS/Linux:** `~/.trustctl/config.json`
- **Windows:** `C:\Users\<username>\.trustctl\config.json`

**Contents:**
```json
{
  "atnHost": "http://192.168.88.111:8080",
  "agent": {
    "publicKey": "zUUo4W52UKwBCgxmdCqXPqcD8RkhWWhAB2Lb9I9m5dM=",
    "secretKey": "M8xk2Ssc0kOhkwmAmNCH7SnjzKrt4Zh6DceZZ+QvQ/...",
    "name": "My Agent"
  }
}
```

**Security:**
- Keep this file private (`chmod 600` on Unix)
- Never commit it to version control
- Treat the `secretKey` as sensitive as a password

---

## Updating trustctl

### If Installed from Source (Current)

```bash
cd ATN
git pull origin main
npm run build
# trustctl is already linked globally via npm link
```

Verify the update:
```bash
trustctl --version
```

### If Installed via npm (Future)

Once published to npm registry:

```bash
npm install -g trustctl@latest
```

---

## Troubleshooting

### Command Not Found

```
command not found: trustctl
```

**Solutions:**
- Verify installation: `npm list -g trustctl`
- If not installed: `npm install -g trustctl`
- If from source: Run `npm link` from `apps/trustctl` directory
- On macOS: Try restarting Terminal or running `hash -r`

### No Agent Configured

```
Error: No agent configured. Run `trustctl keygen` and `trustctl agents register` first.
```

**Solution:**
```bash
trustctl agents register "My Agent"
```

### Connection Refused

```
Error: Failed to connect to http://localhost:8080
```

**Solutions:**
1. Check ATN host is correct:
   ```bash
   trustctl config
   ```

2. Verify ATN server is running:
   ```bash
   curl http://192.168.88.111:8080/health
   # Should return: {"status":"ok"}
   ```

3. Update host if needed:
   ```bash
   trustctl config:set-host http://correct.host:8080
   ```

4. Check firewall allows port 8080

### Agent Not Found on Registration

```
Error: Failed to register agent: Agent not found
```

**Solutions:**
- Ensure ATN server is actually running
- Verify network connectivity to the server
- Try setting host explicitly: `trustctl config:set-host http://your-server:8080`

### Invalid Signature

```
Error: Signature verification failed
```

**Solutions:**
- Configuration file may be corrupted
- Delete `~/.trustctl/config.json` and re-register:
  ```bash
  rm ~/.trustctl/config.json
  trustctl agents register "My Agent"
  ```

### Help with Specific Command

```bash
trustctl agents --help        # Help for agent commands
trustctl jobs --help          # Help for job commands
trustctl offers --help        # Help for offer commands
```

---

## Uninstall

### If Installed via npm

```bash
npm uninstall -g trustctl
```

### If Installed from Source

```bash
cd ATN/apps/trustctl
npm unlink
```

### Clean Up Configuration

```bash
# macOS/Linux
rm -rf ~/.trustctl

# Windows
rmdir /s %USERPROFILE%\.trustctl
```

---

## Platform-Specific Notes

### Windows

- Config stored in: `C:\Users\<username>\.trustctl\config.json`
- Use PowerShell or Git Bash for commands
- Paths use backslashes internally but forward slashes in commands

### macOS

- Config stored in: `~/.trustctl/config.json`
- May need to restart Terminal after global install
- Use `brew install node` for Node.js if not already installed

### Linux

- Config stored in: `~/.trustctl/config.json`
- Ensure npm global directory is in PATH:
  ```bash
  echo $PATH | grep -q ~/.npm-global || echo "Add ~/.npm-global to PATH"
  ```

---

## Examples

### Minimal 3-Agent Flow

```bash
# Agent 1: Client
trustctl agents register "Client" > /tmp/client.txt
CLIENT_DID=$(grep "DID:" /tmp/client.txt | awk '{print $NF}')

# Agent 2: Provider
trustctl agents register "Provider" > /tmp/provider.txt
PROVIDER_DID=$(grep "DID:" /tmp/provider.txt | awk '{print $NF}')

# Publish offer (as provider)
trustctl offers publish dns_audit --price 1000

# Get offer ID
OFFER_ID=$(trustctl offers list | grep "Offer ID" | head -1 | awk '{print $NF}')

# Create job (as client, with updated config)
trustctl jobs create "$OFFER_ID" --provider "$PROVIDER_DID" --escrow 1000

# Get job ID
JOB_ID=$(trustctl jobs list | grep "^ID:" | head -1 | awk '{print $NF}')

# Fund and complete
trustctl jobs fund "$JOB_ID"
trustctl jobs submit-proof "$JOB_ID" --proof-hash abc123
trustctl jobs attest "$JOB_ID"

# View audit trail
trustctl audit "$JOB_ID"
```

### Scripted Agent Loop

Create `agent.sh`:
```bash
#!/bin/bash
ATN_HOST="http://192.168.88.111:8080"

while true; do
  # Check for funded jobs
  JOB=$(trustctl jobs list | grep "FUNDED" | head -1 | awk '{print $1}')

  if [ -z "$JOB" ]; then
    echo "No jobs available, waiting..."
    sleep 5
    continue
  fi

  echo "Processing job: $JOB"

  # Do work
  PROOF=$(date +%s | sha256sum | awk '{print $1}')

  # Submit
  trustctl jobs submit-proof "$JOB" --proof-hash "$PROOF"
  echo "Done"

  sleep 10
done
```

Run:
```bash
chmod +x agent.sh
./agent.sh
```

---

## Getting Help

- **Command help:** `trustctl <command> --help`
- **Configuration:** `trustctl config`
- **GitHub issues:** https://github.com/neliusw/ATN/issues
- **Full guide:** See [get-started.md](./get-started.md)

---

## What's Next?

- [Getting Started Guide](./get-started.md) — Complete walkthrough with examples
- [Architecture](./ARCHITECTURE.md) — Design principles and concepts
- [Development Plan](./DEVELOPMENT_PLAN.md) — Roadmap and phases
