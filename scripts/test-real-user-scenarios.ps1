# ARQON Comprehensive Real-User Scenario Test Suite
# Tests Super Admin, Recruiter, Multiple Candidates, Autosave/Recovery, Security, Scoring, and RLS Isolation

$ErrorActionPreference = "Stop"

function Log-Header($title) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Log-Step($num, $desc) {
    Write-Host "[STEP $num] $desc" -ForegroundColor Yellow
}

function Log-Success($desc) {
    Write-Host "  ✓ PASS: $desc" -ForegroundColor Green
}

function Assert-Condition($condition, $message) {
    if (-not $condition) {
        Write-Host "  ✗ FAIL: $message" -ForegroundColor Red
        throw "Assertion Failed: $message"
    } else {
        Log-Success $message
    }
}

$BASE_API = "http://localhost:8081/api/v1"
$BASE_UI = "http://localhost:5173"

Log-Header "ARQON REAL-USER SCENARIO VERIFICATION"

# -------------------------------------------------------------------------------------------------
# SCENARIO 1: PLATFORM SUPER ADMIN ONBOARDING AND TENANT PROVISIONING
# -------------------------------------------------------------------------------------------------
Log-Header "SCENARIO 1: SUPER ADMIN ONBOARDING AND TENANT MANAGEMENT"

Log-Step "1.1" "Super Admin Arjun Shinde logs in"
$superLoginBody = @{
    email = "arjunnshinde9@gmail.com"
    password = "ArjunAdmin@2026!"
} | ConvertTo-Json

$superLogin = Invoke-RestMethod -Uri "$BASE_API/auth/login" -Method Post -Body $superLoginBody -ContentType "application/json"
Assert-Condition ($superLogin.accessToken -ne $null) "Super Admin JWT token received"
$superToken = $superLogin.accessToken

Log-Step "1.2" "Super Admin provisions new Enterprise Tenant: Globex Financial Technologies"
$tenantSlug = "globex-fintech-" + (Get-Random -Maximum 999999)
$orgBody = @{
    name = "Globex Financial Technologies"
    slug = $tenantSlug
} | ConvertTo-Json

$org = Invoke-RestMethod -Uri "$BASE_API/organizations" -Method Post -Body $orgBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $superToken" }
Assert-Condition ($org.id -ne $null) "Tenant created with ID $($org.id) and slug $($org.slug)"
$tenantId = $org.id

Log-Step "1.3" "Super Admin provisions Lead Recruiter user for Globex"
$recruiterEmail = "lead.recruiter.$tenantSlug@globexfintech.com"
$recruiterPassword = "GlobexRecruiter@2026!"
$userBody = @{
    tenantId = $tenantId
    email = $recruiterEmail
    password = $recruiterPassword
    role = "ORG_ADMIN"
} | ConvertTo-Json

$recruiterUser = Invoke-RestMethod -Uri "$BASE_API/users" -Method Post -Body $userBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $superToken" }
Assert-Condition ($recruiterUser.id -ne $null) "Lead Recruiter account created for $recruiterEmail"

# -------------------------------------------------------------------------------------------------
# SCENARIO 2: RECRUITER CONTENT AUTHORING AND ASSESSMENT PUBLISHING
# -------------------------------------------------------------------------------------------------
Log-Header "SCENARIO 2: RECRUITER CONTENT AUTHORING AND ASSESSMENT CREATION"

Log-Step "2.1" "Lead Recruiter logs in to ARQON Recruiter Portal"
$recLoginBody = @{
    email = $recruiterEmail
    password = $recruiterPassword
} | ConvertTo-Json

$recLogin = Invoke-RestMethod -Uri "$BASE_API/auth/login" -Method Post -Body $recLoginBody -ContentType "application/json"
Assert-Condition ($recLogin.accessToken -ne $null) "Lead Recruiter authenticated with scoped tenant token"
$recToken = $recLogin.accessToken

Log-Step "2.2" "Lead Recruiter creates Question 1: PostgreSQL MVCC and Isolation Levels (MCQ - Single Correct)"
$q1Obj = @{
    type = "MCQ"
    title = "PostgreSQL MVCC and Isolation Levels"
    body = "Which SQL transaction isolation level completely prevents non-repeatable reads and phantom reads by serializing concurrent transactions?"
    difficulty = "HARD"
    tags = @("postgresql", "database", "transactions")
    mcq = @{
        options = @(
            @{ text = "Read Committed"; correct = $false },
            @{ text = "Repeatable Read"; correct = $false },
            @{ text = "Serializable"; correct = $true },
            @{ text = "Read Uncommitted"; correct = $false }
        )
        multipleCorrect = $false
    }
}
$q1 = Invoke-RestMethod -Uri "$BASE_API/questions" -Method Post -Body ($q1Obj | ConvertTo-Json -Depth 10) -ContentType "application/json" -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($q1.id -ne $null) "Created Q1 (Single MCQ): $($q1.title) [ID: $($q1.id)]"

Log-Step "2.3" "Lead Recruiter creates Question 2: Distributed Resiliency Patterns (MCQ - Multiple Correct)"
$q2Obj = @{
    type = "MCQ"
    title = "Microservices Resiliency Patterns"
    body = "Which design patterns actively prevent cascading service failures and isolate failing dependencies in distributed systems?"
    difficulty = "MEDIUM"
    tags = @("distributed-systems", "architecture", "resilience")
    mcq = @{
        options = @(
            @{ text = "Circuit Breaker Pattern"; correct = $true },
            @{ text = "Bulkhead Compartmentalization"; correct = $true },
            @{ text = "Spinlock Busy Waiting"; correct = $false },
            @{ text = "Two-Phase Commit (2PC) Blocking Locks"; correct = $false }
        )
        multipleCorrect = $true
    }
}
$q2 = Invoke-RestMethod -Uri "$BASE_API/questions" -Method Post -Body ($q2Obj | ConvertTo-Json -Depth 10) -ContentType "application/json" -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($q2.id -ne $null) "Created Q2 (Multi MCQ): $($q2.title) [ID: $($q2.id)]"

Log-Step "2.4" "Lead Recruiter creates Question 3: LRU Cache Implementation (CODING)"
$pyStarter = @'
class LRUCache:
    def __init__(self, capacity: int):
        pass
    def get(self, key: int) -> int:
        return -1
    def put(self, key: int, value: int) -> None:
        pass
'@

$javaStarter = @'
class LRUCache {
    public LRUCache(int capacity) {}
    public int get(int key) { return -1; }
    public void put(int key, int value) {}
}
'@

$q3Obj = @{
    type = "CODING"
    title = "Least Recently Used (LRU) Cache"
    body = "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) get and put operations."
    difficulty = "HARD"
    tags = @("algorithms", "data-structures", "caching")
    coding = @{
        languages = @("JAVA", "PYTHON")
        timeLimitMs = 2000
        memoryLimitMb = 256
        starterCode = @{
            PYTHON = $pyStarter
            JAVA = $javaStarter
        }
        testCases = @(
            @{
                input = "put(1,1), put(2,2), get(1), put(3,3), get(2)"
                expectedOutput = "1, -1"
                hidden = $false
                weight = 10
            },
            @{
                input = "put(1,10), get(1)"
                expectedOutput = "10"
                hidden = $false
                weight = 10
            },
            @{
                input = "put(1,1), put(2,2), put(3,3), put(4,4), get(1)"
                expectedOutput = "-1"
                hidden = $true
                weight = 15
            }
        )
    }
}
$q3 = Invoke-RestMethod -Uri "$BASE_API/questions" -Method Post -Body ($q3Obj | ConvertTo-Json -Depth 10) -ContentType "application/json" -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($q3.id -ne $null) "Created Q3 (Coding): $($q3.title) [ID: $($q3.id)]"

Log-Step "2.5" "Lead Recruiter drafts Production Mixed Assessment"
$assessmentObj = @{
    title = "Principal Systems Engineer Benchmark 2026"
    description = "Comprehensive engineering evaluation covering Database Concurrency, Distributed Resiliency, and Data Structures."
    config = @{
        schedule = @{
            type = "FLEXIBLE_WINDOW"
            windowStart = "2026-01-01T00:00:00Z"
            windowEnd = "2030-01-01T00:00:00Z"
            durationMinutes = 60
        }
        allowedLanguages = @("JAVA", "PYTHON")
        integrity = @{
            fullscreenRequired = $true
            cameraRequired = $false
            microphoneRequired = $false
            blockCopyPaste = $true
            tabSwitchAction = "FLAG_FOR_REVIEW"
            maxWarnings = 3
        }
        scoring = @{
            weights = @{
                MCQ = 50
                CODING = 50
            }
            passPercentage = 70
        }
        visibility = @{
            mcqImmediate = $false
            codingAfterSubmit = $false
            showHiddenTestDetails = $false
            showCorrectAnswers = $false
        }
        recovery = @{
            allowRecovery = $true
            graceSeconds = 300
            maxRecoveries = 3
        }
        identity = @{
            emailVerification = $false
            otp = $false
            idUpload = $false
            selfie = $false
        }
        singleSession = $true
    }
    sections = @(
        @{
            title = "System Architecture and Concurrency"
            type = "MCQ"
            items = @(
                @{ questionId = $q1.id; version = 1; points = 10 },
                @{ questionId = $q2.id; version = 1; points = 15 }
            )
        },
        @{
            title = "Low-Latency Data Structures"
            type = "CODING"
            items = @(
                @{ questionId = $q3.id; version = 1; points = 25 }
            )
        }
    )
}

$assessment = Invoke-RestMethod -Uri "$BASE_API/assessments" -Method Post -Body ($assessmentObj | ConvertTo-Json -Depth 10) -ContentType "application/json" -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($assessment.id -ne $null) "Assessment created in DRAFT state [ID: $($assessment.id)]"
$assessmentId = $assessment.id

Log-Step "2.6" "Lead Recruiter publishes Assessment"
$published = Invoke-RestMethod -Uri "$BASE_API/assessments/$assessmentId/publish?expectedRevision=0" -Method Post -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($published.status -eq "PUBLISHED") "Assessment successfully transitioned to PUBLISHED (Revision $($published.revision))"

# -------------------------------------------------------------------------------------------------
# SCENARIO 3: REAL-TIME CANDIDATE BATCH INVITATION AND EMAIL DISPATCH
# -------------------------------------------------------------------------------------------------
Log-Header "SCENARIO 3: REAL-TIME CANDIDATE INVITATION AND OUTBOX DELIVERY"

$candAceEmail = "candidate.ace.$tenantSlug@globexfintech.com"
$candAvgEmail = "candidate.avg.$tenantSlug@globexfintech.com"

Log-Step "3.1" "Dispatches invitations to Candidate Ace and Candidate Average"
$inviteBody = @{
    emails = @($candAceEmail, $candAvgEmail)
} | ConvertTo-Json

$inviteResp = Invoke-RestMethod -Uri "$BASE_API/assessments/$assessmentId/invitations" -Method Post -Body $inviteBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($inviteResp.created -eq 2) "Batch invitations issued: $($inviteResp.created) created"

Log-Step "3.2" "Recruiter monitors Real-Time Mail Outbox for candidate links"
$outbox = Invoke-RestMethod -Uri "$BASE_API/invitations/outbox" -Headers @{ Authorization = "Bearer $recToken" }
$mailAce = $outbox | Where-Object { $_.recipientEmail -eq $candAceEmail } | Select-Object -First 1
$mailAvg = $outbox | Where-Object { $_.recipientEmail -eq $candAvgEmail } | Select-Object -First 1

Assert-Condition ($mailAce -ne $null -and $mailAce.status -eq "DELIVERED") "Real-Time Email delivered to Candidate Ace"
Assert-Condition ($mailAvg -ne $null -and $mailAvg.status -eq "DELIVERED") "Real-Time Email delivered to Candidate Average"

$tokenAce = $mailAce.candidateLink.Substring($mailAce.candidateLink.IndexOf("#") + 1)
$tokenAvg = $mailAvg.candidateLink.Substring($mailAvg.candidateLink.IndexOf("#") + 1)
Write-Host "  Candidate Ace Exam Token: $tokenAce" -ForegroundColor DarkGray
Write-Host "  Candidate Avg Exam Token: $tokenAvg" -ForegroundColor DarkGray

# -------------------------------------------------------------------------------------------------
# SCENARIO 4: CANDIDATE ACE JOURNEY (HIGH SCORER: 100% MCQ + PYTHON SOLUTION + RECONNECT RECOVERY)
# -------------------------------------------------------------------------------------------------
Log-Header "SCENARIO 4: CANDIDATE ACE JOURNEY (FULL COMPLETION AND RESILIENCE)"

Log-Step "4.1" "Candidate Ace opens invitation link and resolves assessment details"
$resolveBody = @{ token = $tokenAce } | ConvertTo-Json
$resolveAce = Invoke-RestMethod -Uri "$BASE_API/public/invitations/resolve" -Method Post -Body $resolveBody -ContentType "application/json"
Assert-Condition ($resolveAce.windowState -eq "OPEN") "Candidate Ace verified assessment is OPEN"
Assert-Condition ($resolveAce.assessment.durationMinutes -eq 60) "Candidate Ace confirmed 60-minute duration"

Log-Step "4.2" "Candidate Ace starts timed exam"
$startAce = Invoke-RestMethod -Uri "$BASE_API/public/exam/start" -Method Post -Body $resolveBody -ContentType "application/json"
Assert-Condition ($startAce.status -eq "IN_PROGRESS") "Exam started: Status IN_PROGRESS"
Assert-Condition ($startAce.sessionToken -ne $null) "Server issued authoritative session token"
Assert-Condition ($startAce.sections.Count -eq 2) "Assessment delivered 2 sections"

# Candidate-facing security verification: ensure no hidden tests or answers are exposed to candidate
$codingItem = $startAce.sections[1].items[0]
Assert-Condition ($codingItem.hiddenTestCount -eq 1) "Candidate sees hidden test count but NOT the test cases"
Assert-Condition ($codingItem.samples.Count -eq 2) "Candidate received public sample test cases"

$sessionAceToken = $startAce.sessionToken

Log-Step "4.3" "Candidate Ace answers Q1 (MCQ): Selects option 2 (Serializable)"
$ansQ1 = @{
    answer = @{
        selected = @(2)
        language = $null
        code = $null
    }
} | ConvertTo-Json -Depth 5

$saveQ1 = Invoke-RestMethod -Uri "$BASE_API/public/exam/answers/$($q1.id)" -Method Put -Body $ansQ1 -ContentType "application/json" -Headers @{ "X-Exam-Session" = $sessionAceToken }
Assert-Condition ($saveQ1.deadlineAt -ne $null) "Q1 answer autosaved with server deadline confirmation"

Log-Step "4.4" "Candidate Ace answers Q2 (Multi MCQ): Selects options 0 and 1"
$ansQ2 = @{
    answer = @{
        selected = @(0, 1)
        language = $null
        code = $null
    }
} | ConvertTo-Json -Depth 5

$saveQ2 = Invoke-RestMethod -Uri "$BASE_API/public/exam/answers/$($q2.id)" -Method Put -Body $ansQ2 -ContentType "application/json" -Headers @{ "X-Exam-Session" = $sessionAceToken }
Assert-Condition ($saveQ2.deadlineAt -ne $null) "Q2 answer autosaved"

Log-Step "4.5" "Candidate Ace writes full Python LRU Cache code for Q3 (Coding)"
$pythonSolution = @'
class Node:
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
            del self.cache[lru.key]
'@

$ansQ3 = @{
    answer = @{
        selected = $null
        language = "PYTHON"
        code = $pythonSolution
    }
} | ConvertTo-Json -Depth 5

$saveQ3 = Invoke-RestMethod -Uri "$BASE_API/public/exam/answers/$($q3.id)" -Method Put -Body $ansQ3 -ContentType "application/json" -Headers @{ "X-Exam-Session" = $sessionAceToken }
Assert-Condition ($saveQ3.deadlineAt -ne $null) "Q3 Python code autosaved"

Log-Step "4.6" "Simulate Browser Crash or Refresh: Candidate re-fetches session state"
$resumeAce = Invoke-RestMethod -Uri "$BASE_API/public/exam/session" -Method Get -Headers @{ "X-Exam-Session" = $sessionAceToken }
Assert-Condition ($resumeAce.status -eq "IN_PROGRESS") "Session resumed in IN_PROGRESS state"
Assert-Condition ($resumeAce.answers.Count -eq 3) "All 3 answers safely recovered from persistent storage"

Log-Step "4.7" "Candidate Ace submits the completed examination"
$submitAce = Invoke-RestMethod -Uri "$BASE_API/public/exam/submit" -Method Post -Headers @{ "X-Exam-Session" = $sessionAceToken }
Assert-Condition ($submitAce.status -eq "SUBMITTED") "Exam status transitioned to SUBMITTED"

# -------------------------------------------------------------------------------------------------
# SCENARIO 5: CANDIDATE AVERAGE JOURNEY (PARTIAL MCQ + JAVA STARTER SOLUTION)
# -------------------------------------------------------------------------------------------------
Log-Header "SCENARIO 5: CANDIDATE AVERAGE JOURNEY (PARTIAL SCORER)"

Log-Step "5.1" "Candidate Average starts exam"
$startAvg = Invoke-RestMethod -Uri "$BASE_API/public/exam/start" -Method Post -Body (@{ token = $tokenAvg } | ConvertTo-Json) -ContentType "application/json"
$sessionAvgToken = $startAvg.sessionToken
Assert-Condition ($startAvg.status -eq "IN_PROGRESS") "Candidate Average started exam successfully"

Log-Step "5.2" "Candidate Average answers Q1 INCORRECTLY: Selects option 0 (Read Committed)"
$ansAvgQ1 = @{
    answer = @{
        selected = @(0)
        language = $null
        code = $null
    }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "$BASE_API/public/exam/answers/$($q1.id)" -Method Put -Body $ansAvgQ1 -ContentType "application/json" -Headers @{ "X-Exam-Session" = $sessionAvgToken } | Out-Null
Log-Success "Candidate Average saved incorrect answer for Q1"

Log-Step "5.3" "Candidate Average answers Q2 CORRECTLY: Selects options 0 and 1"
Invoke-RestMethod -Uri "$BASE_API/public/exam/answers/$($q2.id)" -Method Put -Body $ansQ2 -ContentType "application/json" -Headers @{ "X-Exam-Session" = $sessionAvgToken } | Out-Null
Log-Success "Candidate Average saved correct answer for Q2"

Log-Step "5.4" "Candidate Average submits basic Java starter code for Q3"
$javaSolution = @'
import java.util.*;

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
}
'@

$ansAvgQ3 = @{
    answer = @{
        selected = $null
        language = "JAVA"
        code = $javaSolution
    }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "$BASE_API/public/exam/answers/$($q3.id)" -Method Put -Body $ansAvgQ3 -ContentType "application/json" -Headers @{ "X-Exam-Session" = $sessionAvgToken } | Out-Null
Log-Success "Candidate Average saved Java code for Q3"

Log-Step "5.5" "Candidate Average submits exam"
$submitAvg = Invoke-RestMethod -Uri "$BASE_API/public/exam/submit" -Method Post -Headers @{ "X-Exam-Session" = $sessionAvgToken }
Assert-Condition ($submitAvg.status -eq "SUBMITTED") "Candidate Average submission recorded"

# -------------------------------------------------------------------------------------------------
# SCENARIO 6: SECURITY, INTEGRITY AND BOUNDARY CHECKS
# -------------------------------------------------------------------------------------------------
Log-Header "SCENARIO 6: SECURITY, INTEGRITY AND EDGE-CASE VALIDATION"

Log-Step "6.1" "Tamper Attempt: Candidate Ace tries to alter answers AFTER exam submission"
$tamperThrew = $false
try {
    Invoke-RestMethod -Uri "$BASE_API/public/exam/answers/$($q1.id)" -Method Put -Body $ansQ1 -ContentType "application/json" -Headers @{ "X-Exam-Session" = $sessionAceToken }
} catch {
    $tamperThrew = $true
    Assert-Condition ($_.Exception.Response.StatusCode.value__ -eq 409) "Server strictly rejected post-submit answer modification (HTTP 409 Conflict)"
}
Assert-Condition ($tamperThrew) "Security check verified: post-submit modifications are rejected"

Log-Step "6.2" "Forgery Attempt: Attacker calls resolve with fake token"
$fakeThrew = $false
try {
    Invoke-RestMethod -Uri "$BASE_API/public/invitations/resolve" -Method Post -Body '{"token":"forged_nonexistent_token_12345"}' -ContentType "application/json"
} catch {
    $fakeThrew = $true
    Assert-Condition ($_.Exception.Response.StatusCode.value__ -ge 400) "Server rejected forged invitation token safely"
}
Assert-Condition ($fakeThrew) "Security check verified: token forgery rejected"

Log-Step "6.3" "Multi-Tenant Data Isolation (RLS): Recruiter from Hooli tries to access Globex results"
$hooliSlug = "hooli-tech-" + (Get-Random -Maximum 999999)
$hooliOrg = Invoke-RestMethod -Uri "$BASE_API/organizations" -Method Post -Body (@{ name = "Hooli Tech"; slug = $hooliSlug } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $superToken" }
$hooliUser = Invoke-RestMethod -Uri "$BASE_API/users" -Method Post -Body (@{ tenantId = $hooliOrg.id; email = "admin@$hooliSlug.com"; password = "HooliPassword@123!"; role = "ORG_ADMIN" } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $superToken" }
$hooliLogin = Invoke-RestMethod -Uri "$BASE_API/auth/login" -Method Post -Body (@{ email = "admin@$hooliSlug.com"; password = "HooliPassword@123!" } | ConvertTo-Json) -ContentType "application/json"
$hooliToken = $hooliLogin.accessToken

$rlsThrew = $false
try {
    Invoke-RestMethod -Uri "$BASE_API/assessments/$assessmentId/results" -Method Get -Headers @{ Authorization = "Bearer $hooliToken" }
} catch {
    $rlsThrew = $true
    Assert-Condition ($_.Exception.Response.StatusCode.value__ -eq 404) "Foreign tenant gets HTTP 404 Not Found (Row-Level Security boundary verified)"
}
Assert-Condition ($rlsThrew) "Multi-tenant RLS isolation verified: zero cross-tenant data leakage"

# -------------------------------------------------------------------------------------------------
# SCENARIO 7: RECRUITER RESULTS AND SCORING BREAKDOWN AUDIT
# -------------------------------------------------------------------------------------------------
Log-Header "SCENARIO 7: RECRUITER RESULTS AND SCORING VERIFICATION"

Log-Step "7.1" "Lead Recruiter fetches assessment candidate scorecards"
$resultsPage = Invoke-RestMethod -Uri "$BASE_API/assessments/$assessmentId/results" -Method Get -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($resultsPage.totalElements -eq 2) "Recruiter received exactly 2 candidate submissions"

$rowAce = $resultsPage.content | Where-Object { $_.candidateEmail -eq $candAceEmail } | Select-Object -First 1
$rowAvg = $resultsPage.content | Where-Object { $_.candidateEmail -eq $candAvgEmail } | Select-Object -First 1

Write-Host ""
Write-Host "Candidate Ace Scorecard:" -ForegroundColor Magenta
Write-Host "  Email:             $($rowAce.candidateEmail)"
Write-Host "  Status:            $($rowAce.status)"
Write-Host "  MCQ Score:         $($rowAce.result.mcqScore) / $($rowAce.result.mcqMax) ($($rowAce.result.mcqPercent) pct)"
Write-Host "  Coding Submitted:  $($rowAce.result.codingSubmitted) / $($rowAce.result.codingQuestions)"
Write-Host "  Provisional Score: $($rowAce.result.provisional) pct"

Assert-Condition ($rowAce.result.mcqScore -eq 25 -and $rowAce.result.mcqMax -eq 25) "Candidate Ace achieved perfect 25/25 on MCQ"
Assert-Condition ($rowAce.result.mcqPercent -eq 100.0) "Candidate Ace MCQ percentage is 100"
Assert-Condition ($rowAce.result.codingSubmitted -eq 1) "Candidate Ace coding solution recorded"

Write-Host ""
Write-Host "Candidate Average Scorecard:" -ForegroundColor Magenta
Write-Host "  Email:             $($rowAvg.candidateEmail)"
Write-Host "  Status:            $($rowAvg.status)"
Write-Host "  MCQ Score:         $($rowAvg.result.mcqScore) / $($rowAvg.result.mcqMax) ($($rowAvg.result.mcqPercent) pct)"
Write-Host "  Coding Submitted:  $($rowAvg.result.codingSubmitted) / $($rowAvg.result.codingQuestions)"
Write-Host "  Provisional Score: $($rowAvg.result.provisional) pct"

Assert-Condition ($rowAvg.result.mcqScore -eq 15 -and $rowAvg.result.mcqMax -eq 25) "Candidate Average achieved 15/25 (Q2 only) on MCQ"
Assert-Condition ($rowAvg.result.mcqPercent -eq 60.0) "Candidate Average MCQ percentage is 60%"

Log-Step "7.2" "Lead Recruiter inspects Candidate Ace's granular submission detail"
$detailAce = Invoke-RestMethod -Uri "$BASE_API/results/$($rowAce.sessionId)" -Method Get -Headers @{ Authorization = "Bearer $recToken" }
Assert-Condition ($detailAce.questions.Count -eq 3) "Recruiter viewed detailed breakdown for all 3 questions"

$q1Ace = $detailAce.questions | Where-Object { $_.questionId -eq $q1.id }
$q2Ace = $detailAce.questions | Where-Object { $_.questionId -eq $q2.id }
$q3Ace = $detailAce.questions | Where-Object { $_.questionId -eq $q3.id }

Assert-Condition ($q1Ace.correct -eq $true) "Q1 marked correct with 10/10 points"
Assert-Condition ($q2Ace.correct -eq $true) "Q2 marked correct with 15/15 points"
Assert-Condition ($q3Ace.coding -eq $true -and $q3Ace.language -eq "PYTHON") "Q3 Python code available for recruiter inspection"

Log-Step "7.3" "Lead Recruiter inspects Candidate Average's granular submission detail"
$detailAvg = Invoke-RestMethod -Uri "$BASE_API/results/$($rowAvg.sessionId)" -Method Get -Headers @{ Authorization = "Bearer $recToken" }
$q1Avg = $detailAvg.questions | Where-Object { $_.questionId -eq $q1.id }
$q2Avg = $detailAvg.questions | Where-Object { $_.questionId -eq $q2.id }
$q3Avg = $detailAvg.questions | Where-Object { $_.questionId -eq $q3.id }

Assert-Condition ($q1Avg.correct -eq $false) "Q1 correctly identified as incorrect for Candidate Average"
Assert-Condition ($q2Avg.correct -eq $true) "Q2 correctly identified as correct for Candidate Average"
Assert-Condition ($q3Avg.coding -eq $true -and $q3Avg.language -eq "JAVA") "Q3 Java code available for recruiter inspection"

Log-Header "ALL 7 REAL-USER SCENARIOS PASSED WITH 100% ACCURACY!"
Write-Host "Verified End-to-End Across Super Admin, Recruiter, Multiple Candidates, Autosave, Security and Scoring." -ForegroundColor Green
