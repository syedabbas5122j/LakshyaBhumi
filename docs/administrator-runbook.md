# Administrator Runbook

## Bootstrap

Provision the first **System Administrator** through `BHUSHA_AUTH_USERS`; the administrator console intentionally cannot create its own initial privileged account. Generate a PBKDF2 password hash from the backend directory with:

```powershell
..\.venv\Scripts\python.exe -m app.core.authentication
```

Store the resulting hash and the account's exact role in the secret-managed `BHUSHA_AUTH_USERS` JSON. Environment-provisioned identities take precedence over administrator-managed identities and are read-only in the console. Managed identities are stored under `backend/admin-data/managed-accounts.json`; officer passwords are PBKDF2 hashes, never returned by the API. Deactivation, role changes, and password reset revoke that account's active sessions.

## Operational Configuration

The System Administrator console controls four API-enforced switches: uploads, harmonization, citizen sign-in, and support-ticket intake. These switches are persisted in `backend/admin-data/runtime-config.json`. They are coarse service controls, not replacements for role and jurisdiction checks.

## Audit

Account changes, password resets, configuration changes, support-ticket operations, and backup actions append to `backend/admin-data/audit.jsonl`. Each event includes its actor, timestamp, target, previous-event hash, and event hash. The console verifies the hash chain. It detects changed or reordered retained events, but local operators can still truncate or rewrite the log. It is not immutable/WORM storage; production deployments should forward events to an independently administered audit service.

## Encrypted Backups

Set `BHUSHA_BACKUP_KEY` to a randomly generated secret of at least 32 characters in the deployment secret store before creating backups. Do not commit the key, place it in the backup directory, or store it beside downloaded backups. Losing the key makes backups unrecoverable.

Backups use AES-GCM authenticated encryption, an internal SHA-256 file manifest, a 256 MB expanded-size limit, and an allowlist of platform data stores. They include managed accounts, support tickets, audit records, field submissions, uploads, integration queues, and harmonization outputs. Environment variables, `.env` files, provisioned credentials, and the backup key are deliberately excluded and must be backed up through the deployment's secret-management process.

Restore validates authentication, archive paths, file checksums, and size before replacing the included stores. The restore operation revokes all in-memory sessions; sign in again afterward. Test backup and restore in a separate environment before relying on these local controls for recovery.

## Support Roles

- **Help Desk Operator** can view and triage short support summaries; the role has no dashboard, conflict, parcel, or upload view.
- **IT Support Staff** can view only upload/sync and service-availability tickets plus aggregate health counts; no upload payloads, dataset names, parcel geometry, conflict details, or legal records are returned.
- **System Administrator** can view and route support tickets and access aggregate diagnostics.

Ticket summaries must not contain passwords, OTPs, contact details, parcel identifiers, or legal case information. Tickets have no attachment or parcel-record lookup feature.

## Deployment Boundary

These controls use local JSON files, atomic replacement, and in-process locks. This fits the current single-process scaffold only. Before multi-worker or production deployment, move accounts, configuration, tickets, and audit events to a transactional database; use shared session revocation; add an immutable audit sink; and schedule off-host, independently tested backups.