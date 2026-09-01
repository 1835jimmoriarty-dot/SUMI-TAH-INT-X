# SUMI-TAH Platform Architecture

## Modular Monolith Architecture

SUMI-TAH is designed as an enterprise-style Modular Monolith. All functional capabilities are decoupled by domain while sharing a unified relational data layer and Next.js App Router execution environment.

```text
Database (Prisma SQLite / Postgres-Ready)
   ↓
Domain Models & Cryptographic Services (AES-256-GCM, Bcrypt, Jose)
   ↓
Business Logic Engines (IOC Engine, Coverage Engine, Attribution Engine)
   ↓
Security Connector Framework (Falcon, LogScale, Sentinel, Splunk)
   ↓
Advisory AI & SOAR Gate (Human-in-the-Loop Mandatory Approval)
   ↓
REST APIs with Server-Side RBAC & Centralized Audit Logging
   ↓
Next.js 14 App Router UI (Jade Luxury Green SOC Design System)
   ↓
Automated Vitest Test Suites
```

## Core Design Tenets

1. **Defense-in-Depth Security**: Plaintext credentials are never saved; integration secrets are encrypted with AES-256-GCM. Every protected endpoint enforces server-side RBAC validation.
2. **Deterministic & Explainable Analytics**: Reputation scores, MITRE coverage percentages, and threat attribution calculations are strictly deterministic with explainable factor breakdowns.
3. **Advisory AI Boundaries**: AI outputs are strictly marked `isAdvisory: true` and cannot modify security verdicts, alter evidence, or execute actions independently.
4. **Mandatory Human-in-the-Loop Approval**: Destructive and containment operations (host isolation, IP blocking, domain sinkholing) are strictly blocked in `PENDING_APPROVAL` until an authorized security analyst explicitly signs off.
5. **Real Connector Ground Truth**: Live SIEM data is never fabricated. Unconfigured connectors return `NOT CONFIGURED`, and simulated telemetry is visibly labeled with a demo badge.