# SUMI-TAH — Automated Threat Hunting & Adversary Intelligence Platform

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
```bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 2. Run Automated Tests
```bash
npm test
```

### 3. Launch Platform
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

---

## Demo Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Security Administrator** | `admin@sumitah.local` | `AdminPassword123!` | Full platform administration, RBAC, Integrations, Audit |
| **Lead Threat Hunter** | `hunter@sumitah.local` | `HunterPassword123!` | Threat hunting, queries, cases, IOCs, SOAR approvals |

---

## Environment Variables Reference

See `.env.example` for all configurable variables:
- `DATABASE_URL`: SQLite local file (`file:./dev.db`) or PostgreSQL connection string
- `JWT_SECRET`: 256-bit secret key for session signing
- `ENCRYPTION_KEY`: 64-hex character key (32 bytes) for AES-256-GCM secret encryption at rest
- `AI_PROVIDER`: `mock` (default offline security model), `openai`, or `azure`