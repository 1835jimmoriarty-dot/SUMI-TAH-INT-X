# Security Policy — SUMI-TAH Platform

## Security Model & Design Principles

SUMI-TAH is architected according to defense-in-depth principles for enterprise Security Operations Centers (SOC):

### 1. Authentication & Session Management
- **Password Hashing**: Passwords are cryptographically hashed using **bcrypt** with a cost factor of 12. Plaintext passwords are never persisted.
- **Session Tokens**: Signed JWTs with HS256 encryption stored in `HttpOnly`, `SameSite=Lax` cookies.
- **Session Expiry**: Controlled server-side with strict TTL enforcement.

### 2. Role-Based Access Control (RBAC)
- **Granular Permissions**: 32 distinct permissions governing all business domains (`cases:write`, `hunts:execute`, `soar:approve`, `iocs:override`, etc.).
- **Server-Side Authorization**: Every API route enforces server-side permission validation. Frontend UI checks are strictly for UX.
- **Zero Privilege Escalation**: Role modification and user management require `admin:manage` authorization.

### 3. Secret Management & At-Rest Encryption
- **AES-256-GCM Encryption**: All integration secrets (CrowdStrike, LogScale, Sentinel, Splunk, Torq) are encrypted at rest with AES-256-GCM using authenticated encryption with associated data (AEAD).
- **Zero Plaintext Secret Exposure**: Secret values are never returned to client browsers and are decrypted strictly in-memory during connector execution.

### 4. Audit Logging & Credential Redaction
- Centralized immutable audit logs record all authentication attempts, permission modifications, IOC overrides, and containment executions.
- All sensitive keys (`password`, `token`, `secret`, `key`, `authorization`) are automatically sanitized and redacted before storage.

### 5. AI Advisory Security Boundary
- AI outputs are strictly **advisory** and non-authoritative (`isAdvisory: true`).
- AI assistants cannot mutate verdicts, delete evidence, alter configurations, bypass RBAC, or execute containment actions autonomously.

### 6. Mandatory Human-in-the-Loop SOAR Approval
- All destructive or containment operations (`ISOLATE_HOST`, `BLOCK_IP`, `SINKHOLE_DOMAIN`, `REVOKE_SESSION`, `DISABLE_ACCOUNT`) are queued in `PENDING_APPROVAL` and require explicit verification and approval by an authorized security analyst.

## Vulnerability Reporting
To report a potential security vulnerability in SUMI-TAH, please open a private security advisory or contact security@sumitah.local.