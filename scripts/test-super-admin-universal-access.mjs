import { strict as assert } from "node:assert";

const BASE_URL = process.env.API_TARGET || "http://localhost:8081";

async function req(path, method = "GET", body = null, token = null, tenantId = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log("======================================================================");
  console.log("  VERIFYING SUPER ADMIN UNIVERSAL ACCESS EVERYWHERE");
  console.log("======================================================================");

  // 1. Super Admin Login
  const loginRes = await req("/api/v1/auth/login", "POST", {
    email: "arjunnshinde9@gmail.com",
    password: "ArjunAdmin@2026!",
  });
  assert.equal(loginRes.status, 200, "Super Admin login failed");
  const token = loginRes.data.accessToken;
  const user = loginRes.data.user;
  console.log(`[PASS] Super Admin authenticated: ${user.email} (Role: ${user.role})`);

  // 2. Access Platform Overview
  const overviewRes = await req("/api/v1/platform/overview", "GET", null, token);
  assert.equal(overviewRes.status, 200, "Platform overview failed");
  console.log(`[PASS] Platform Overview accessed: ${overviewRes.data.organizations.total} organizations total`);

  // 3. Access Organizations List
  const orgsRes = await req("/api/v1/organizations?size=10", "GET", null, token);
  assert.equal(orgsRes.status, 200, "Organizations list failed");
  assert.ok(orgsRes.data.items.length > 0, "No organizations found");
  const firstOrg = orgsRes.data.items[0];
  console.log(`[PASS] Organizations accessed. Targeting Tenant: ${firstOrg.name} (${firstOrg.id})`);

  // 4. Access Users across system
  const usersRes = await req("/api/v1/users?size=10", "GET", null, token);
  assert.equal(usersRes.status, 200, "Users list failed");
  console.log(`[PASS] User Directory accessed: ${usersRes.data.totalElements} users across platform`);

  // 5. Access Question Bank with Tenant Context
  const questionsRes = await req("/api/v1/questions?size=10", "GET", null, token, firstOrg.id);
  assert.equal(questionsRes.status, 200, "Question bank access failed");
  console.log(`[PASS] Question Bank accessed for tenant ${firstOrg.slug}: ${questionsRes.data.totalElements} questions`);

  // 6. Access Assessments with Tenant Context
  const assessmentsRes = await req("/api/v1/assessments?size=10", "GET", null, token, firstOrg.id);
  assert.equal(assessmentsRes.status, 200, "Assessments access failed");
  console.log(`[PASS] Assessments accessed for tenant ${firstOrg.slug}: ${assessmentsRes.data.totalElements} assessments`);

  // 7. Access Real-Time Outbox
  const outboxRes = await req("/api/v1/invitations/outbox", "GET", null, token);
  assert.equal(outboxRes.status, 200, "Outbox stream failed");
  console.log(`[PASS] Real-Time Outbox stream accessed: ${outboxRes.data.length} candidate emails in stream`);

  // 8. Access SMTP Status
  const smtpRes = await req("/api/v1/invitations/smtp-status", "GET", null, token);
  assert.equal(smtpRes.status, 200, "SMTP status failed");
  console.log(`[PASS] SMTP Gateway status accessed: host=${smtpRes.data.host}, active=${smtpRes.data.active}`);

  console.log("======================================================================");
  console.log("  ALL SUPER ADMIN UNIVERSAL ACCESS CHECKS PASSED!");
  console.log("======================================================================");
}

run().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
