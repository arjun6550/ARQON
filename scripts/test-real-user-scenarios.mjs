// ARQON Comprehensive Real-User Scenario Test Suite
// Verified with Node.js 24 against the running Spring Boot Backend (port 8081) and PostgreSQL 18

const BASE_API = 'http://localhost:8081/api/v1';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function logHeader(title) {
  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  console.log(colors.cyan + '='.repeat(70) + colors.reset);
}

function logStep(num, desc) {
  console.log(`${colors.yellow}[STEP ${num}]${colors.reset} ${desc}`);
}

function logPass(desc) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${desc}`);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  logPass(message);
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_API}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = text;
  }
  return { status: res.status, ok: res.ok, headers: res.headers, data: json };
}

async function main() {
  logHeader('ARQON REAL-USER SCENARIO VERIFICATION');

  // =========================================================================
  // SCENARIO 1: SUPER ADMIN ONBOARDING & TENANT PROVISIONING
  // =========================================================================
  logHeader('SCENARIO 1: SUPER ADMIN ONBOARDING & TENANT MANAGEMENT');

  logStep('1.1', 'Super Admin Arjun Shinde logs in with protected credentials');
  const superLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'arjunnshinde9@gmail.com',
      password: 'ArjunAdmin@2026!'
    }
  });
  assert(superLogin.ok && superLogin.data?.accessToken, 'Super Admin authenticated and received JWT');
  const superToken = superLogin.data.accessToken;

  logStep('1.2', 'Super Admin provisions new Enterprise Tenant: Globex Financial Technologies');
  const tenantSlug = `globex-fintech-${Math.floor(Math.random() * 900000 + 100000)}`;
  const orgResp = await request('/organizations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      name: 'Globex Financial Technologies',
      slug: tenantSlug
    }
  });
  assert(orgResp.ok && orgResp.data?.id, `Tenant created: ${orgResp.data?.name} (ID: ${orgResp.data?.id})`);
  const tenantId = orgResp.data.id;

  logStep('1.3', 'Super Admin provisions Lead Recruiter user for Globex');
  const recruiterEmail = `lead.recruiter.${tenantSlug}@globexfintech.com`;
  const recruiterPassword = 'GlobexRecruiter@2026!';
  const userResp = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      tenantId,
      email: recruiterEmail,
      password: recruiterPassword,
      role: 'ORG_ADMIN'
    }
  });
  assert(userResp.ok && userResp.data?.id, `Lead Recruiter created: ${recruiterEmail}`);

  // =========================================================================
  // SCENARIO 2: RECRUITER CONTENT AUTHORING & PRODUCTION ASSESSMENT CREATION
  // =========================================================================
  logHeader('SCENARIO 2: RECRUITER CONTENT AUTHORING & ASSESSMENT CREATION');

  logStep('2.1', 'Lead Recruiter logs in to ARQON Recruiter Portal');
  const recLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: recruiterEmail,
      password: recruiterPassword
    }
  });
  assert(recLogin.ok && recLogin.data?.accessToken, 'Lead Recruiter authenticated with scoped tenant token');
  const recToken = recLogin.data.accessToken;

  logStep('2.2', 'Lead Recruiter creates Q1: PostgreSQL MVCC & Isolation Levels (MCQ - Single)');
  const q1Resp = await request('/questions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: {
      type: 'MCQ',
      title: 'PostgreSQL MVCC & Isolation Levels',
      body: 'Which SQL transaction isolation level completely prevents non-repeatable reads and phantom reads by serializing concurrent transactions?',
      difficulty: 'HARD',
      tags: ['postgresql', 'database', 'transactions'],
      mcq: {
        options: [
          { text: 'Read Committed', correct: false },
          { text: 'Repeatable Read', correct: false },
          { text: 'Serializable', correct: true },
          { text: 'Read Uncommitted', correct: false }
        ],
        multipleCorrect: false
      }
    }
  });
  assert(q1Resp.ok && q1Resp.data?.id, `Created Q1 (Single MCQ): ${q1Resp.data?.title} [ID: ${q1Resp.data?.id}]`);
  const q1 = q1Resp.data;

  logStep('2.3', 'Lead Recruiter creates Q2: Microservices Resiliency Patterns (MCQ - Multi)');
  const q2Resp = await request('/questions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: {
      type: 'MCQ',
      title: 'Microservices Resiliency Patterns',
      body: 'Which design patterns actively prevent cascading service failures and isolate failing dependencies in distributed systems?',
      difficulty: 'MEDIUM',
      tags: ['distributed-systems', 'architecture', 'resilience'],
      mcq: {
        options: [
          { text: 'Circuit Breaker Pattern', correct: true },
          { text: 'Bulkhead Compartmentalization', correct: true },
          { text: 'Spinlock Busy Waiting', correct: false },
          { text: 'Two-Phase Commit (2PC) Blocking Locks', correct: false }
        ],
        multipleCorrect: true
      }
    }
  });
  assert(q2Resp.ok && q2Resp.data?.id, `Created Q2 (Multi MCQ): ${q2Resp.data?.title} [ID: ${q2Resp.data?.id}]`);
  const q2 = q2Resp.data;

  logStep('2.4', 'Lead Recruiter creates Q3: LRU Cache Implementation (CODING)');
  const pyStarter = 'class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        return -1\n    def put(self, key: int, value: int) -> None:\n        pass';
  const javaStarter = 'class LRUCache {\n    public LRUCache(int capacity) {}\n    public int get(int key) { return -1; }\n    public void put(int key, int value) {}\n}';

  const q3Resp = await request('/questions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: {
      type: 'CODING',
      title: 'Least Recently Used (LRU) Cache',
      body: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) get and put operations.',
      difficulty: 'HARD',
      tags: ['algorithms', 'data-structures', 'caching'],
      coding: {
        languages: ['JAVA', 'PYTHON'],
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        starterCode: {
          PYTHON: pyStarter,
          JAVA: javaStarter
        },
        testCases: [
          {
            input: 'put(1,1), put(2,2), get(1), put(3,3), get(2)',
            expectedOutput: '1, -1',
            hidden: false,
            weight: 10
          },
          {
            input: 'put(1,10), get(1)',
            expectedOutput: '10',
            hidden: false,
            weight: 10
          },
          {
            input: 'put(1,1), put(2,2), put(3,3), put(4,4), get(1)',
            expectedOutput: '-1',
            hidden: true,
            weight: 15
          }
        ]
      }
    }
  });
  assert(q3Resp.ok && q3Resp.data?.id, `Created Q3 (Coding): ${q3Resp.data?.title} [ID: ${q3Resp.data?.id}]`);
  const q3 = q3Resp.data;

  logStep('2.5', 'Lead Recruiter drafts Production Mixed Assessment');
  const assessmentResp = await request('/assessments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: {
      title: 'Principal Systems Engineer Benchmark 2026',
      description: 'Comprehensive engineering evaluation covering Database Concurrency, Distributed Resiliency, and Data Structures.',
      config: {
        schedule: {
          type: 'FLEXIBLE_WINDOW',
          windowStart: '2026-01-01T00:00:00Z',
          windowEnd: '2030-01-01T00:00:00Z',
          durationMinutes: 60
        },
        allowedLanguages: ['JAVA', 'PYTHON'],
        integrity: {
          fullscreenRequired: true,
          cameraRequired: false,
          microphoneRequired: false,
          blockCopyPaste: true,
          tabSwitchAction: 'FLAG_FOR_REVIEW',
          maxWarnings: 3
        },
        scoring: {
          weights: { MCQ: 50, CODING: 50 },
          passPercentage: 70
        },
        visibility: {
          mcqImmediate: false,
          codingAfterSubmit: false,
          showHiddenTestDetails: false,
          showCorrectAnswers: false
        },
        recovery: {
          allowRecovery: true,
          graceSeconds: 300,
          maxRecoveries: 3
        },
        identity: {
          emailVerification: false,
          otp: false,
          idUpload: false,
          selfie: false
        },
        singleSession: true
      },
      sections: [
        {
          title: 'System Architecture & Concurrency',
          type: 'MCQ',
          items: [
            { questionId: q1.id, version: 1, points: 10 },
            { questionId: q2.id, version: 1, points: 15 }
          ]
        },
        {
          title: 'Low-Latency Data Structures',
          type: 'CODING',
          items: [
            { questionId: q3.id, version: 1, points: 25 }
          ]
        }
      ]
    }
  });
  assert(assessmentResp.ok && assessmentResp.data?.id, `Assessment created in DRAFT state [ID: ${assessmentResp.data?.id}]`);
  const assessmentId = assessmentResp.data.id;

  logStep('2.6', 'Lead Recruiter publishes Assessment');
  const pubResp = await request(`/assessments/${assessmentId}/publish?expectedRevision=0`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert(pubResp.ok && pubResp.data?.status === 'PUBLISHED', `Assessment published successfully (Revision: ${pubResp.data?.revision})`);

  // =========================================================================
  // SCENARIO 3: REAL-TIME CANDIDATE BATCH INVITATION & EMAIL DISPATCH
  // =========================================================================
  logHeader('SCENARIO 3: REAL-TIME CANDIDATE INVITATION & EMAIL DELIVERY');

  const candAceEmail = `candidate.ace.${tenantSlug}@globexfintech.com`;
  const candAvgEmail = `candidate.avg.${tenantSlug}@globexfintech.com`;

  logStep('3.1', 'Dispatches batch invitations to Candidate Ace and Candidate Average');
  const inviteResp = await request(`/assessments/${assessmentId}/invitations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: { emails: [candAceEmail, candAvgEmail] }
  });
  assert(inviteResp.ok && inviteResp.data?.created === 2, `Batch invitations created: ${inviteResp.data?.created}`);

  logStep('3.2', 'Recruiter queries Real-Time Outbox stream for candidate links');
  const outboxResp = await request('/invitations/outbox', {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert(outboxResp.ok && Array.isArray(outboxResp.data), 'Real-Time Outbox stream accessible');

  const mailAce = outboxResp.data.find(m => m.recipientEmail === candAceEmail);
  const mailAvg = outboxResp.data.find(m => m.recipientEmail === candAvgEmail);

  assert(mailAce && mailAce.status === 'DELIVERED', `Real-Time Email delivered to Candidate Ace (${mailAce?.deliveryMethod})`);
  assert(mailAvg && mailAvg.status === 'DELIVERED', `Real-Time Email delivered to Candidate Average (${mailAvg?.deliveryMethod})`);

  const tokenAce = mailAce.candidateLink.split('#')[1];
  const tokenAvg = mailAvg.candidateLink.split('#')[1];
  console.log(`  ${colors.gray}Candidate Ace Link: ${mailAce.candidateLink}${colors.reset}`);
  console.log(`  ${colors.gray}Candidate Avg Link: ${mailAvg.candidateLink}${colors.reset}`);

  // =========================================================================
  // SCENARIO 4: CANDIDATE ACE REAL-USER JOURNEY (HIGH SCORER)
  // =========================================================================
  logHeader('SCENARIO 4: CANDIDATE ACE JOURNEY (100% MCQ + PYTHON + RECOVERY)');

  logStep('4.1', 'Candidate Ace opens link and resolves assessment details');
  const resolveAce = await request('/public/invitations/resolve', {
    method: 'POST',
    body: { token: tokenAce }
  });
  assert(resolveAce.ok && resolveAce.data?.windowState === 'OPEN', 'Candidate Ace resolved invitation: Window is OPEN');
  assert(resolveAce.data?.assessment?.durationMinutes === 60, 'Candidate Ace verified 60-minute duration');

  logStep('4.2', 'Candidate Ace starts timed exam session');
  const startAce = await request('/public/exam/start', {
    method: 'POST',
    body: { token: tokenAce }
  });
  assert(startAce.ok && startAce.data?.status === 'IN_PROGRESS', 'Exam started: Status IN_PROGRESS');
  assert(startAce.data?.sessionToken, 'Server issued authoritative session token');
  assert(startAce.data?.sections?.length === 2, 'Assessment delivered 2 sections');

  // Verify candidate view integrity (NO leaks of hidden tests)
  const codingItem = startAce.data.sections[1].items[0];
  assert(codingItem.hiddenTestCount === 1, 'Candidate sees count of hidden tests, not the cases themselves');
  assert(codingItem.samples?.length === 2, 'Candidate received 2 public sample cases');

  const sessionAceToken = startAce.data.sessionToken;

  logStep('4.3', 'Candidate Ace answers Q1 (MCQ): Selects option 2 (Serializable)');
  const saveQ1 = await request(`/public/exam/answers/${q1.id}`, {
    method: 'PUT',
    headers: { 'X-Exam-Session': sessionAceToken },
    body: { answer: { selected: [2], language: null, code: null } }
  });
  assert(saveQ1.ok && saveQ1.data?.deadlineAt, 'Q1 answer autosaved with server deadline confirmation');

  logStep('4.4', 'Candidate Ace answers Q2 (Multi MCQ): Selects options 0 & 1 (Circuit Breaker & Bulkhead)');
  const saveQ2 = await request(`/public/exam/answers/${q2.id}`, {
    method: 'PUT',
    headers: { 'X-Exam-Session': sessionAceToken },
    body: { answer: { selected: [0, 1], language: null, code: null } }
  });
  assert(saveQ2.ok && saveQ2.data?.deadlineAt, 'Q2 answer autosaved');

  logStep('4.5', 'Candidate Ace implements full Python LRU Cache for Q3');
  const pythonCode = `class Node:
    def __init__(self, key=0, val=0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        p, n = node.prev, node.next
        p.next, n.prev = n, p

    def _add(self, node):
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add(node)
            return node.val
        return -1

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])
        node = Node(key, value)
        self._add(node)
        self.cache[key] = node
        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]`;

  const saveQ3 = await request(`/public/exam/answers/${q3.id}`, {
    method: 'PUT',
    headers: { 'X-Exam-Session': sessionAceToken },
    body: { answer: { selected: null, language: 'PYTHON', code: pythonCode } }
  });
  assert(saveQ3.ok && saveQ3.data?.deadlineAt, 'Q3 Python code autosaved');

  logStep('4.6', 'Simulate Network Glitch / Page Refresh: Candidate re-fetches session state');
  const resumeAce = await request('/public/exam/session', {
    headers: { 'X-Exam-Session': sessionAceToken }
  });
  assert(resumeAce.ok && resumeAce.data?.status === 'IN_PROGRESS', 'Session resumed in IN_PROGRESS state');
  assert(Object.keys(resumeAce.data?.answers || {}).length === 3, 'All 3 answers safely recovered from storage');
  assert(resumeAce.data?.answers[q1.id]?.selected[0] === 2, 'Q1 answer verified exact value match');

  logStep('4.7', 'Candidate Ace submits completed examination');
  const submitAce = await request('/public/exam/submit', {
    method: 'POST',
    headers: { 'X-Exam-Session': sessionAceToken }
  });
  assert(submitAce.ok && submitAce.data?.status === 'SUBMITTED', 'Candidate Ace status transitioned to SUBMITTED');

  // =========================================================================
  // SCENARIO 5: CANDIDATE AVERAGE REAL-USER JOURNEY (PARTIAL SCORER)
  // =========================================================================
  logHeader('SCENARIO 5: CANDIDATE AVERAGE JOURNEY (PARTIAL SCORER)');

  logStep('5.1', 'Candidate Average starts timed exam');
  const startAvg = await request('/public/exam/start', {
    method: 'POST',
    body: { token: tokenAvg }
  });
  assert(startAvg.ok && startAvg.data?.sessionToken, 'Candidate Average acquired session token');
  const sessionAvgToken = startAvg.data.sessionToken;

  logStep('5.2', 'Candidate Average answers Q1 INCORRECTLY: Selects option 0 (Read Committed)');
  const saveAvgQ1 = await request(`/public/exam/answers/${q1.id}`, {
    method: 'PUT',
    headers: { 'X-Exam-Session': sessionAvgToken },
    body: { answer: { selected: [0], language: null, code: null } }
  });
  assert(saveAvgQ1.ok, 'Candidate Average saved answer for Q1');

  logStep('5.3', 'Candidate Average answers Q2 CORRECTLY: Selects options 0 & 1');
  const saveAvgQ2 = await request(`/public/exam/answers/${q2.id}`, {
    method: 'PUT',
    headers: { 'X-Exam-Session': sessionAvgToken },
    body: { answer: { selected: [0, 1], language: null, code: null } }
  });
  assert(saveAvgQ2.ok, 'Candidate Average saved correct answer for Q2');

  logStep('5.4', 'Candidate Average submits Java starter code for Q3');
  const javaCode = `import java.util.*;

class LRUCache {
    private final int capacity;
    private final Map<Integer, Integer> map;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(capacity, 0.75f, true);
    }

    public int get(int key) {
        return map.getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        if (map.size() >= capacity && !map.containsKey(key)) {
            var it = map.keySet().iterator();
            it.next();
            it.remove();
        }
        map.put(key, value);
    }
}`;

  const saveAvgQ3 = await request(`/public/exam/answers/${q3.id}`, {
    method: 'PUT',
    headers: { 'X-Exam-Session': sessionAvgToken },
    body: { answer: { selected: null, language: 'JAVA', code: javaCode } }
  });
  assert(saveAvgQ3.ok, 'Candidate Average saved Java code for Q3');

  logStep('5.5', 'Candidate Average submits examination');
  const submitAvg = await request('/public/exam/submit', {
    method: 'POST',
    headers: { 'X-Exam-Session': sessionAvgToken }
  });
  assert(submitAvg.ok && submitAvg.data?.status === 'SUBMITTED', 'Candidate Average status transitioned to SUBMITTED');

  // =========================================================================
  // SCENARIO 6: SECURITY, INTEGRITY & BOUNDARY VALIDATION
  // =========================================================================
  logHeader('SCENARIO 6: SECURITY, INTEGRITY & BOUNDARY CHECKS');

  logStep('6.1', 'Tamper Attempt: Candidate Ace tries to alter answers AFTER exam submission');
  const tamperResp = await request(`/public/exam/answers/${q1.id}`, {
    method: 'PUT',
    headers: { 'X-Exam-Session': sessionAceToken },
    body: { answer: { selected: [1], language: null, code: null } }
  });
  assert(tamperResp.status === 409, `Server strictly rejected post-submit alteration: HTTP ${tamperResp.status} Conflict`);

  logStep('6.2', 'Forgery Attempt: Attacker calls resolve with fraudulent token');
  const forgeResp = await request('/public/invitations/resolve', {
    method: 'POST',
    body: { token: 'fraudulent_token_hash_abc_123' }
  });
  assert(forgeResp.status >= 400, `Server safely rejected fraudulent invitation token: HTTP ${forgeResp.status}`);

  logStep('6.3', 'Multi-Tenant Data Isolation (RLS): Foreign Recruiter tries to access Globex results');
  const hooliSlug = `hooli-tech-${Math.floor(Math.random() * 900000 + 100000)}`;
  const hooliOrg = await request('/organizations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: { name: 'Hooli Tech', slug: hooliSlug }
  });
  const hooliUser = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: { tenantId: hooliOrg.data.id, email: `admin@${hooliSlug}.com`, password: 'HooliPassword@123!', role: 'ORG_ADMIN' }
  });
  const hooliLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: `admin@${hooliSlug}.com`, password: 'HooliPassword@123!' }
  });
  const hooliToken = hooliLogin.data.accessToken;

  const rlsLeakResp = await request(`/assessments/${assessmentId}/results`, {
    headers: { Authorization: `Bearer ${hooliToken}` }
  });
  assert(rlsLeakResp.status === 404, `Row-Level Security boundary preserved: Foreign tenant receives HTTP ${rlsLeakResp.status} Not Found`);

  // =========================================================================
  // SCENARIO 7: RECRUITER RESULTS AUDIT & AUTOMATED SCORING VERIFICATION
  // =========================================================================
  logHeader('SCENARIO 7: RECRUITER RESULTS AUDIT & AUTOMATED SCORING');

  logStep('7.1', 'Lead Recruiter fetches assessment scorecards');
  const resultsPage = await request(`/assessments/${assessmentId}/results`, {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert(resultsPage.ok && resultsPage.data?.totalElements === 2, 'Recruiter retrieved exactly 2 completed candidate records');

  const rowAce = resultsPage.data.items.find(r => r.candidateEmail === candAceEmail);
  const rowAvg = resultsPage.data.items.find(r => r.candidateEmail === candAvgEmail);

  console.log(`\n${colors.magenta}Candidate Ace Evaluation:${colors.reset}`);
  console.log(`  Email:             ${rowAce.candidateEmail}`);
  console.log(`  Status:            ${rowAce.status}`);
  console.log(`  MCQ Score:         ${rowAce.result.mcqScore} / ${rowAce.result.mcqMax} (${rowAce.result.mcqPercent}%)`);
  console.log(`  Coding Submitted:  ${rowAce.result.codingSubmitted} / ${rowAce.result.codingQuestions}`);
  console.log(`  Provisional Score: ${rowAce.result.provisionalPercent}%`);

  assert(rowAce.result.mcqScore === 25 && rowAce.result.mcqMax === 25, 'Candidate Ace achieved perfect 25/25 on MCQ');
  assert(rowAce.result.mcqPercent === 100, 'Candidate Ace MCQ percentage is 100%');
  assert(rowAce.result.codingSubmitted === 1, 'Candidate Ace coding solution stored');
  assert(rowAce.result.provisionalPercent === 50, 'Candidate Ace provisional weighted score is 50.0% (50% MCQ weight)');

  console.log(`\n${colors.magenta}Candidate Average Evaluation:${colors.reset}`);
  console.log(`  Email:             ${rowAvg.candidateEmail}`);
  console.log(`  Status:            ${rowAvg.status}`);
  console.log(`  MCQ Score:         ${rowAvg.result.mcqScore} / ${rowAvg.result.mcqMax} (${rowAvg.result.mcqPercent}%)`);
  console.log(`  Coding Submitted:  ${rowAvg.result.codingSubmitted} / ${rowAvg.result.codingQuestions}`);
  console.log(`  Provisional Score: ${rowAvg.result.provisionalPercent}%`);

  assert(rowAvg.result.mcqScore === 15 && rowAvg.result.mcqMax === 25, 'Candidate Average achieved 15/25 on MCQ (Q2 only)');
  assert(rowAvg.result.mcqPercent === 60, 'Candidate Average MCQ percentage is 60%');
  assert(rowAvg.result.codingSubmitted === 1, 'Candidate Average coding solution stored');
  assert(rowAvg.result.provisionalPercent === 30, 'Candidate Average provisional weighted score is 30.0% (60% * 50 weight)');

  logStep('7.2', "Lead Recruiter inspects Candidate Ace's granular submission breakdown");
  const detailAce = await request(`/results/${rowAce.sessionId}`, {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert(detailAce.ok && detailAce.data?.questions?.length === 3, 'Recruiter viewed breakdown for all 3 questions');

  const q1Ace = detailAce.data.questions.find(q => q.questionId === q1.id);
  const q2Ace = detailAce.data.questions.find(q => q.questionId === q2.id);
  const q3Ace = detailAce.data.questions.find(q => q.questionId === q3.id);

  assert(q1Ace.correct === true, 'Q1 marked correct (10/10 points)');
  assert(q2Ace.correct === true, 'Q2 marked correct (15/15 points)');
  assert(q3Ace.coding === true && q3Ace.language === 'PYTHON' && q3Ace.code.includes('class LRUCache'), 'Q3 Python code verified');

  logStep('7.3', "Lead Recruiter inspects Candidate Average's granular submission breakdown");
  const detailAvg = await request(`/results/${rowAvg.sessionId}`, {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  const q1Avg = detailAvg.data.questions.find(q => q.questionId === q1.id);
  const q2Avg = detailAvg.data.questions.find(q => q.questionId === q2.id);
  const q3Avg = detailAvg.data.questions.find(q => q.questionId === q3.id);

  assert(q1Avg.correct === false, 'Q1 marked incorrect for Candidate Average');
  assert(q2Avg.correct === true, 'Q2 marked correct for Candidate Average');
  assert(q3Avg.coding === true && q3Avg.language === 'JAVA' && q3Avg.code.includes('LinkedHashMap'), 'Q3 Java code verified');

  logHeader('ALL 7 REAL-USER SCENARIOS VERIFIED WITH 100% SUCCESS!');
  console.log(`${colors.green}${colors.bold}Super Admin, Recruiter, Multiple Candidates, Autosave/Recovery, Security & Scoring All Functioning Flawlessly.${colors.reset}\n`);
}

main().catch(err => {
  console.error('\n' + colors.red + 'FATAL TEST RUN ERROR:' + colors.reset, err);
  process.exit(1);
});
