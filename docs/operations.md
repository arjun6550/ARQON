# ARQON Operational Procedures, Monitoring & Disaster Recovery

---

## 1. Reliability & SLA Targets
- **Service Availability Target:** 99.9% uptime.
- **Recovery Point Objective (RPO):** 15 minutes or better.
- **Recovery Time Objective (RTO):** 1 hour or better.

---

## 2. Health Probes & Monitoring

The system exposes actuator health probes on port 9081:
- `http://localhost:9081/actuator/health/liveness`: Verifies process vitality.
- `http://localhost:9081/actuator/health/readiness`: Verifies database and connection pool readiness.
- `http://localhost:9081/actuator/prometheus`: Prometheus-compatible scrape endpoint.
- `http://localhost:8081/api/v1/system/ping`: Service health check with correlation ID.
- `http://localhost:8081/api/v1/platform/overview`: High-level operational metrics and system telemetry.

---

## 3. Database Backup & Restore Procedures

### Automated Backups
In AWS production:
- Continuous WAL archiving to S3 enables Point-In-Time Recovery (PITR) to any second within the retention window.
- Daily automated RDS snapshots retained for 35 days.

### Local Snapshot Backup Verification
```powershell
# Backup database cluster
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h localhost -p 5433 -U arqon -F c -b -v -f "arqon-backup.dump" arqon

# Verification Drill
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h localhost -p 5433 -U arqon -d arqon_drill_test --clean --if-exists "arqon-backup.dump"
```

---

## 4. Incident Response & Password Rotation

### Super Admin Password Rotation
1. Super Admin logs into the portal or calls the password update API endpoint.
2. In emergency access scenarios where credentials are compromised:
   - Connect via trusted internal deployment channel.
   - Update password hash in `identity.users` table using Argon2id with work factor >= 12.
   - Invalidate all active session tokens in `identity.refresh_tokens` for that actor ID.
   - Audit trail records `EMERGENCY_CREDENTIAL_ROTATION` event.
