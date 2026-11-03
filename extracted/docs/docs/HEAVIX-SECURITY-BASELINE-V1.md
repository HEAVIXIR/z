# HEAVIX — Security Baseline V1

## 1. Security Principles

- Zero Trust
- Least Privilege
- Secure by Default
- Deny by Default
- Audit Everything Sensitive
- Secrets Never in Source
- AI Is Untrusted Automation

## 2. Identity

### Users

- Argon2id/bcrypt password hash
- verified email/mobile states
- session rotation
- session revocation
- suspicious login detection

### Admin

- separate privileged account model or explicit privileged flag
- MFA mandatory
- step-up auth
- device/session management
- login alerts

## 3. Authorization

RBAC + permission checks must occur server-side.

Never trust:

- role from client
- hidden UI buttons
- query parameters
- route IDs without ownership checks

## 4. API Security

Every API categorized as:

- PUBLIC_READ
- PUBLIC_WRITE
- USER
- SELLER
- COMPANY
- ADMIN
- SYSTEM

Each class has explicit auth and rate-limit policy.

## 5. Object-Level Authorization

Every `/[id]` mutation must verify:

`actor → permission → object ownership/scope`

This is mandatory to prevent IDOR.

## 6. Input Validation

Use Zod/server-side validation for all JSON, query, path and multipart metadata.

## 7. File Security

Never trust client MIME.

Required:

- magic bytes
- extension normalization
- image decode
- malware scanning
- size quota
- storage isolation
- signed URLs where appropriate

## 8. AI Security

All user-provided text, documents and listing descriptions are untrusted input.

AI tools require explicit allow-list permissions.

AI cannot:

- grant admin
- read secrets
- delete database
- alter security policy
- execute financial actions without explicit human approval

## 9. Secrets

No credentials in source code.

All production secrets must be environment/secret-manager supplied.

## 10. Logging

Security events:

- login success/failure
- MFA
- password change
- role/permission change
- user block
- admin action
- upload rejection
- AI tool call
- suspicious activity

## 11. Backup

3-2-1 strategy where practical.

- daily
- weekly
- monthly
- offsite
- encrypted
- restore-tested

## 12. Incident Response

Stages:

Detect → Contain → Investigate → Recover → Review

Every incident receives an ID and post-incident report.
