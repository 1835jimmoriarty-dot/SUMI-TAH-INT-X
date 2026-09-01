const { write } = require('./writer');

// 1. Windows batch scripts
write('scripts/install.bat', `@echo off
echo =====================================================================
echo  SUMI-TAH - Automated Threat Hunting Platform Installer
echo =====================================================================
npm install
call npx prisma generate
call npx prisma db push
call npx tsx prisma/seed.ts
echo [SUCCESS] SUMI-TAH installation and database setup complete!
pause
`);

write('scripts/start.bat', `@echo off
echo Starting SUMI-TAH SOC Platform on http://localhost:3000 ...
npm run dev
`);

write('scripts/stop.bat', `@echo off
echo Stopping local Node/Next.js servers...
taskkill /F /IM node.exe >nul 2>&1
echo [STOPPED]
`);

// 2. Linux shell scripts
write('scripts/install.sh', `#!/usr/bin/env bash
set -e
echo "====================================================================="
echo " SUMI-TAH - Automated Threat Hunting Platform Installer"
echo "====================================================================="
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
echo "[SUCCESS] SUMI-TAH installation and database setup complete!"
`);

write('scripts/start.sh', `#!/usr/bin/env bash
echo "Starting SUMI-TAH SOC Platform on http://localhost:3000 ..."
npm run dev
`);

// 3. GitHub Actions CI
write('.github/workflows/ci.yml', `name: SUMI-TAH CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  validate:
    name: Lint, Test & Build Validation
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Generate Prisma Client & Database
        run: |
          npx prisma generate
          npx prisma db push
        env:
          DATABASE_URL: "file:./ci.db"
          JWT_SECRET: "ci-secret-token-32-chars-long-sumitah-test"
          ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

      - name: Run ESLint
        run: npm run lint

      - name: TypeScript Static Analysis
        run: npx tsc --noEmit

      - name: Run Automated Test Suite
        run: npm test

      - name: Production Next.js Build
        run: npm run build
        env:
          DATABASE_URL: "file:./ci.db"
          JWT_SECRET: "ci-secret-token-32-chars-long-sumitah-test"
          ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
`);

// 4. LICENSE
write('LICENSE', `MIT License

Copyright (c) 2026 SUMI-TAH Core Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`);

// 5. SECURITY.md
write('SECURITY.md', `# Security Policy — SUMI-TAH Platform

## Security Model & Design Principles

SUMI-TAH is architected according to defense-in-depth principles for enterprise Security Operations Centers (SOC):

### 1. Authentication & Session Management
- **Password Hashing**: Passwords are cryptographically hashed using **bcrypt** with a cost factor of 12. Plaintext passwords are never persisted.
- **Session Tokens**: Signed JWTs with HS256 encryption stored in \`HttpOnly\`, \`SameSite=Lax\` cookies.
- **Session Expiry**: Controlled server-side with strict TTL enforcement.

### 2. Role-Based Access Control (RBAC)
- **Granular Permissions**: 32 distinct permissions governing all business domains (\`cases:write\`, \`hunts:execute\`, \`soar:approve\`, \`iocs:override\`, etc.).
- **Server-Side Authorization**: Every API route enforces server-side permission validation. Frontend UI checks are strictly for UX.
- **Zero Privilege Escalation**: Role modification and user management require \`admin:manage\` authorization.

### 3. Secret Management & At-Rest Encryption
- **AES-256-GCM Encryption**: All integration secrets (CrowdStrike, LogScale, Sentinel, Splunk, Torq) are encrypted at rest with AES-256-GCM using authenticated encryption with associated data (AEAD).
- **Zero Plaintext Secret Exposure**: Secret values are never returned to client browsers and are decrypted strictly in-memory during connector execution.

### 4. Audit Logging & Credential Redaction
- Centralized immutable audit logs record all authentication attempts, permission modifications, IOC overrides, and containment executions.
- All sensitive keys (\`password\`, \`token\`, \`secret\`, \`key\`, \`authorization\`) are automatically sanitized and redacted before storage.

### 5. AI Advisory Security Boundary
- AI outputs are strictly **advisory** and non-authoritative (\`isAdvisory: true\`).
- AI assistants cannot mutate verdicts, delete evidence, alter configurations, bypass RBAC, or execute containment actions autonomously.

### 6. Mandatory Human-in-the-Loop SOAR Approval
- All destructive or containment operations (\`ISOLATE_HOST\`, \`BLOCK_IP\`, \`SINKHOLE_DOMAIN\`, \`REVOKE_SESSION\`, \`DISABLE_ACCOUNT\`) are queued in \`PENDING_APPROVAL\` and require explicit verification and approval by an authorized security analyst.

## Vulnerability Reporting
To report a potential security vulnerability in SUMI-TAH, please open a private security advisory or contact security@sumitah.local.
`);

// 6. README.md
write('README.md', `# SUMI-TAH — Automated Threat Hunting & Adversary Intelligence Platform

SUMI-TAH is a full-stack, enterprise-grade Security Operations Center (SOC) platform engineered for threat hunting, adversary intelligence, and automated incident triage. Built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS (Jade Luxury Green SOC Theme)**, and **Prisma ORM**.

---

## Key Capabilities

- **Hypothesis-Driven Threat Hunting**: Structured hypothesis lifecycle with MITRE ATT&CK mapping, telemetry requirement tracking, and finding records.
- **Multi-SIEM Query Workbench**: Author, version, and execute queries across Falcon LogScale (LQL), Microsoft Sentinel (KQL), Splunk (SPL), and Elastic (EQL).
- **15-Type IOC Intelligence Engine**: Support for IPv4, IPv6, Domain, URL, MD5, SHA1, SHA256, Email, Filename, Registry, Mutex, Certificate, CVE, JA3, and JA4. Includes defanging normalization, universal search, explainable reputation scoring, bulk CSV/JSON import, and audited analyst overrides.
- **MITRE Enterprise ATT&CK & D3FEND**: Complete 14-tactic matrix visualizer, interactive technique heatmaps, one-click **ATT&CK Navigator v4.3 Layer JSON** export, and D3FEND defensive countermeasures.
- **Deterministic Detection Coverage**: Quantitative visibility metrics across all 14 tactics with prioritized detection engineering recommendations.
- **Adversary Intelligence & Attribution**: Threat actor dossiers (APT29, Volt Typhoon, etc.), malware family trees, campaign timelines, and an evidence-weighted attribution engine.
- **AI Advisory Assistant**: Provider-agnostic advisory intelligence (OpenAI / Azure / Offline Mock) with strict non-destructive security boundaries and immutable activity tracking.
- **Torq SOAR Response Automation**: Automated containment workflows with **Mandatory Human-in-the-Loop Analyst Approval**.
- **Forensic Evidence Vault & Reporting**: SHA-256 integrity-verified evidence preservation and dynamic PDF report generation.

---

## Quick Start (Local Development)

### 1. Installation
\`\`\`bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
\`\`\`

### 2. Run Automated Tests
\`\`\`bash
npm test
\`\`\`

### 3. Launch Platform
\`\`\`bash
npm run dev
\`\`\`
Visit \`http://localhost:3000\` in your browser.

---

## Demo Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Security Administrator** | \`admin@sumitah.local\` | \`AdminPassword123!\` | Full platform administration, RBAC, Integrations, Audit |
| **Lead Threat Hunter** | \`hunter@sumitah.local\` | \`HunterPassword123!\` | Threat hunting, queries, cases, IOCs, SOAR approvals |

---

## Environment Variables Reference

See \`.env.example\` for all configurable variables:
- \`DATABASE_URL\`: SQLite local file (\`file:./dev.db\`) or PostgreSQL connection string
- \`JWT_SECRET\`: 256-bit secret key for session signing
- \`ENCRYPTION_KEY\`: 64-hex character key (32 bytes) for AES-256-GCM secret encryption at rest
- \`AI_PROVIDER\`: \`mock\` (default offline security model), \`openai\`, or \`azure\`
`);