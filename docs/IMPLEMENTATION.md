# SUMI-TAH — Comprehensive Implementation & Code Structure Guide
**Automated Threat Hunting & Adversary Intelligence Platform**

This document serves as the master implementation specification for future AI models, security architects, and software engineers working with the SUMI-TAH codebase.

---

## 1. Executive Summary & Architecture

SUMI-TAH is an enterprise-grade Security Operations Center (SOC) Modular Monolith engineered with:
- **Frontend & Routing**: Next.js 14 App Router, React 18, Tailwind CSS (Jade Luxury Green SOC Theme)
- **Backend & Logic**: TypeScript (strict), Zod input validation, Edge Security Middleware
- **Database Layer**: Prisma ORM with SQLite (local zero-friction dev) and PostgreSQL-compatible enterprise schema
- **Security Engineering**: Bcrypt password hashing, signed JWT sessions with `HttpOnly` cookies, AES-256-GCM authenticated encryption at rest for integration secrets, centralized audit logging with automatic credential redaction, advisory-only AI guarantees, and mandatory human-in-the-loop analyst approval gates for SOAR containment playbooks
- **Testing & Quality Assurance**: Vitest automated test runner, strict TypeScript type checking (`tsc --noEmit`), ESLint (`next lint`), and production standalone builds

---

## 2. Project Directory Structure

```text
sumi-tah/
├── .github/workflows/ci.yml         # GitHub Actions CI validation pipeline
├── Dockerfile                       # Multi-stage production container build (non-root nextjs user)
├── docker-compose.yml               # Production stack (SUMI-TAH + PostgreSQL 16 + Redis)
├── .dockerignore                    # Docker ignore rules
├── docs/
│   ├── ARCHITECTURE.md              # High-level architecture & design tenets
│   └── IMPLEMENTATION.md            # Master code structure & implementation reference
├── prisma/
│   ├── dev.db                       # Local SQLite database (persisted)
│   ├── schema.prisma                # Relational schema (25+ domain models)
│   └── seed.ts                      # Rich seed data (demo users, ATT&CK, D3FEND, intel, hunts)
├── public/                          # Static assets and icons
├── scripts/                         # Install, run, build, and generator scripts
│   ├── install.bat / install.sh
│   ├── start.bat / start.sh
│   └── stop.bat
├── src/
│   ├── app/                         # Next.js 14 App Router
│   │   ├── (auth)/                  # Authentication routes
│   │   │   ├── login/page.tsx       # Analyst login with role quick-switch
│   │   │   └── setup/page.tsx       # First-run platform wizard
│   │   ├── (dashboard)/             # Protected analyst workspaces
│   │   │   ├── layout.tsx           # Global SOC Shell layout
│   │   │   ├── page.tsx             # Executive & SOC Overview Dashboard
│   │   │   ├── hypotheses/page.tsx  # Hypothesis creation & ATT&CK tagging
│   │   │   ├── hunts/page.tsx       # Hunt workspace, stage transitions & findings
│   │   │   ├── hunt-packages/page.tsx # Pre-packaged hunting playbooks
│   │   │   ├── queries/page.tsx     # Multi-SIEM Workbench (LQL, KQL, SPL, EQL)
│   │   │   ├── cases/page.tsx       # Incident cases, notes, timeline & containment
│   │   │   ├── evidence/page.tsx    # Forensic evidence vault with SHA-256 verification
│   │   │   ├── iocs/page.tsx        # 15-type IOC Explorer, Defanger, Search, Import, Override
│   │   │   ├── attack/page.tsx      # Enterprise ATT&CK matrix & Navigator v4.3 export
│   │   │   ├── defend/page.tsx      # MITRE D3FEND matrix & countermeasure mapper
│   │   │   ├── coverage/page.tsx    # Quantitative detection coverage & gap recommendations
│   │   │   ├── actors/page.tsx      # Threat actor dossiers & attribution calculator
│   │   │   ├── malware/page.tsx     # Malware families & signature profiles
│   │   │   ├── campaigns/page.tsx   # Threat campaign timelines & operations
│   │   │   ├── integrations/page.tsx# Security connectors & encrypted secrets
│   │   │   ├── soar/page.tsx        # Torq SOAR command center & mandatory approval queue
│   │   │   ├── reports/page.tsx     # Report generator with PDF export
│   │   │   ├── audit/page.tsx       # Centralized security audit log viewer
│   │   │   └── settings/page.tsx    # Organization, user & role settings
│   │   ├── api/                     # 23 REST API endpoints with server-side RBAC & audit
│   │   │   ├── auth/                # login, logout, me
│   │   │   ├── setup/               # first-run initialization
│   │   │   ├── health/ & ready/     # system health and readiness probes
│   │   │   ├── metrics/             # system memory, uptime & telemetry metrics
│   │   │   ├── notifications/       # in-app notification dispatcher
│   │   │   ├── hypotheses/          # hypothesis CRUD & search
│   │   │   ├── hunts/               # hunt lifecycle, findings, evidence
│   │   │   ├── hunt-packages/       # reusable hunt playbooks
│   │   │   ├── queries/             # multi-SIEM execution & versioning
│   │   │   ├── cases/               # comments, timeline actions, evidence
│   │   │   ├── evidence/            # SHA-256 evidence vault
│   │   │   ├── iocs/                # search, defang, reputation, import, override
│   │   │   ├── attack/              # ATT&CK data & navigator layer generator
│   │   │   ├── defend/              # D3FEND matrix
│   │   │   ├── coverage/            # deterministic coverage metrics
│   │   │   ├── integrations/        # connector testing & configuration
│   │   │   ├── actors/, malware/, campaigns/ # threat intelligence
│   │   │   ├── attribution/         # evidence attribution engine
│   │   │   ├── ai/                  # advisory AI assistant
│   │   │   ├── soar/                # actions & mandatory approval workflows
│   │   │   ├── reports/             # report persistence & export
│   │   │   └── audit/               # audit logs querying
│   │   ├── globals.css              # Jade Luxury Green styling & custom scrollbars
│   │   └── layout.tsx               # Root application shell
│   ├── middleware.ts                # Edge Rate Limiting & Security Headers
│   ├── components/
│   │   ├── ui/                      # Reusable UI primitives (Button, Badge, Card, Modal, Input, StatusIndicator)
│   │   └── shell/                   # Sidebar, TopBar, DemoBanner, GlobalSearchModal
│   ├── lib/
│   │   ├── db.ts                    # Prisma client singleton
│   │   ├── auth.ts                  # Bcrypt hashing & JWT session verification
│   │   ├── rbac.ts                  # 32 permissions catalogue & role enforcement
│   │   ├── encryption.ts            # AES-256-GCM secret encryption at rest
│   │   ├── audit.ts                 # Centralized audit logger with credential redaction
│   │   ├── validation.ts            # Zod validation schemas
│   │   ├── ioc-engine.ts            # 15-type IOC detector, defanger, scoring
│   │   ├── coverage-engine.ts       # MITRE coverage metrics calculator
│   │   ├── attribution-engine.ts    # Evidence-weighted actor attribution
│   │   ├── connectors/              # Security connector provider abstraction
│   │   ├── ai/                      # Advisory AI assistant abstraction
│   │   └── soar/                    # Torq SOAR approval gate engine
├── tests/                           # Vitest Automated Test Suites (9 test files, 20 test cases)
│   ├── auth.test.ts
│   ├── rbac.test.ts
│   ├── encryption.test.ts
│   ├── ioc-engine.test.ts
│   ├── connectors.test.ts
│   ├── mitre-coverage.test.ts
│   ├── intelligence.test.ts
│   ├── ai-security.test.ts
│   └── soar-approval.test.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js                   # Standalone output for containerization
├── vitest.config.ts
├── .env.example
└── .env.production.example
```

---

## 3. Key Modules & Business Logic Reference

### `src/middleware.ts`
- **Rate Limiting**: Sliding window rate limiting on `/api/auth/login` (15 req/min) and general API routes (180 req/min).
- **Security Headers**: Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.

### `src/lib/auth.ts` & `src/lib/rbac.ts`
- Implements secure password authentication via **bcryptjs** (salt factor 12).
- Issues signed, tamper-evident JWT tokens using **jose** with configurable expiry.
- Enforces 32 granular permissions grouped by domain (`hunts:execute`, `iocs:override`, `soar:approve`, `cases:write`, `integrations:manage`, etc.).

### `src/lib/encryption.ts`
- Provides `encryptSecret` and `decryptSecret` utilizing **AES-256-GCM** with 96-bit random IVs and 128-bit authentication tags.
- Verifies cryptographic ciphertext integrity to detect tampering.

### `src/lib/ioc-engine.ts`
- **15 Supported IOC Types**: `IPV4`, `IPV6`, `DOMAIN`, `URL`, `MD5`, `SHA1`, `SHA256`, `EMAIL`, `FILENAME`, `REGISTRY`, `MUTEX`, `CERTIFICATE`, `CVE`, `JA3`, `JA4`.
- Defanging & refanging normalization (`hxxps://`, `[.]`, `[@]`).
- Multi-factor explainable scoring engine returning `MALICIOUS`, `HIGH_RISK`, `SUSPICIOUS`, `UNKNOWN`, `BENIGN`, `ALLOWLISTED`, or `CONFLICTING`.
- Analyst manual override workflow recording justification, timestamp, and audit trail.

### `src/lib/connectors/`
- Provider-independent connector abstraction (`IConnector` interface).
- Adapters for **CrowdStrike Falcon**, **Falcon LogScale (LQL)**, **Microsoft Sentinel (KQL)**, **Splunk (SPL)**, and **Elastic (EQL)**.
- Unconfigured connectors return explicit `NOT_CONFIGURED` status without fabricating live data.

### `src/lib/soar/`
- Enforces **Mandatory Human-in-the-Loop Analyst Approval** for all response actions (`ISOLATE_HOST`, `BLOCK_IP`, `SINKHOLE_DOMAIN`, `REVOKE_SESSION`, `DISABLE_ACCOUNT`).
- Actions are queued in `PENDING_APPROVAL` and can only execute upon explicit authorization by an analyst with `soar:approve` permission.

### `src/lib/ai/`
- Provider abstraction supporting OpenAI, Azure OpenAI, and an offline security reasoning fallback.
- Guarantees advisory-only boundary (`isAdvisory: true`). All AI activities are audited in `AIActivity`.

---

## 4. Seeded Demo Accounts

- **Security Administrator**: `admin@sumitah.local` / `AdminPassword123!` (Full admin privileges)
- **Lead Threat Hunter**: `hunter@sumitah.local` / `HunterPassword123!` (Hunting, cases, IOCs, queries, SOAR approval)

---

## 5. Deployment Options

### Option A: Local & LAN Hosting
```bash
npm run dev
# Accessible on http://localhost:3000 and across local network on http://<your-ip>:3000
```

### Option B: Docker Compose (Enterprise Stack)
```bash
docker-compose up -d
# Launches SUMI-TAH + PostgreSQL 16 + Redis with automated health checks
```

---

## 6. How to Extend

- **Add a New SIEM Connector**: Create a new class extending `BaseConnector` in `src/lib/connectors/` and register it in `src/lib/connectors/index.ts`.
- **Add a New SOAR Playbook**: Add the action type to `SOAR_ACTION_DEFINITIONS` in `src/lib/soar/actions.ts`.
- **Add a New IOC Type**: Add the type to `IOCType` union and register its regex in `src/lib/ioc-engine.ts`.