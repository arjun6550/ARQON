package com.arqon.core.exam;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.arqon.core.AbstractIT;
import com.arqon.core.TestMailConfig.CapturingMailer;
import com.arqon.core.exam.service.ExamService;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ExamIT extends AbstractIT {

    @Autowired CapturingMailer mailer;
    @Autowired ExamService examService;

    private record Setup(String recruiter, UUID assessment, UUID mcq, UUID coding) {}

    private ResultActions send(MockHttpServletRequestBuilder b, String bearer, String session, String json) throws Exception {
        if (bearer != null) b.header("Authorization", "Bearer " + bearer);
        if (session != null) b.header("X-Exam-Session", session);
        if (json != null) b.contentType(MediaType.APPLICATION_JSON).content(json);
        return mvc.perform(b);
    }

    private Setup setup(UUID org, Instant start, Instant end, String scheduleType, int duration) throws Exception {
        String rec = userToken("RECRUITER", org);
        UUID mcq = createMcqQuestion(rec), coding = createCodingQuestion(rec);
        String json = """
                {"title":"Exam","description":"d","config":{
                  "schedule":{"type":"%s","windowStart":"%s","windowEnd":"%s","durationMinutes":%d},
                  "allowedLanguages":["JAVA","PYTHON"],
                  "integrity":{"fullscreenRequired":false,"cameraRequired":false,"microphoneRequired":false,"blockCopyPaste":false,"tabSwitchAction":"WARN","maxWarnings":3},
                  "scoring":{"weights":{"MCQ":40,"CODING":60},"passPercentage":50},
                  "visibility":{"mcqImmediate":false,"codingAfterSubmit":true,"showHiddenTestDetails":false,"showCorrectAnswers":false},
                  "recovery":{"allowRecovery":true,"graceSeconds":300,"maxRecoveries":3},
                  "identity":{"emailVerification":false,"otp":false,"idUpload":false,"selfie":false},
                  "singleSession":true},
                 "sections":[{"title":"MCQ","type":"MCQ","items":[{"questionId":"%s","version":1,"points":10}]},
                             {"title":"Coding","type":"CODING","items":[{"questionId":"%s","version":1,"points":50}]}]}
                """.formatted(scheduleType, start, end, duration, mcq, coding);
        String res = send(post("/api/v1/assessments"), rec, null, json).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        UUID id = UUID.fromString(JsonPath.read(res, "$.id"));
        send(post("/api/v1/assessments/" + id + "/publish?expectedRevision=0"), rec, null, null).andExpect(status().isOk());
        return new Setup(rec, id, mcq, coding);
    }

    private Setup openFlexible() throws Exception {
        Instant now = Instant.now();
        return setup(createOrg(slug()), now.minusSeconds(3600), now.plusSeconds(2 * 86400), "FLEXIBLE_WINDOW", 90);
    }

    private String inviteToken(Setup s, String email) throws Exception {
        send(post("/api/v1/assessments/" + s.assessment + "/invitations"), s.recruiter, null, "{\"emails\":[\"" + email + "\"]}").andExpect(status().isCreated());
        return mailer.latestToken(email);
    }

    private String start(String inviteToken) throws Exception {
        String res = send(post("/api/v1/public/exam/start"), null, null, "{\"token\":\"" + inviteToken + "\"}").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(res, "$.sessionToken");
    }

    @Test
    void candidateTakesTheExamAnswersAreSavedAndSubmitIsFinal() throws Exception {
        Setup s = openFlexible();
        String email = email();
        String invite = inviteToken(s, email);

        String res = send(post("/api/v1/public/exam/start"), null, null, "{\"token\":\"" + invite + "\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.sections.length()").value(2))
                .andExpect(jsonPath("$.sections[0].items[0].options.length()").value(2))
                .andExpect(jsonPath("$.sections[0].items[0].correct").doesNotExist())
                .andExpect(jsonPath("$.sections[0].items[0].options[0].correct").doesNotExist())
                .andExpect(jsonPath("$.sections[1].items[0].hiddenTestCount").value(0))
                .andReturn().getResponse().getContentAsString();
        assertThat(res).doesNotContain("expectedOutput\":\"hidden");
        String session = JsonPath.read(res, "$.sessionToken");

        send(put("/api/v1/public/exam/answers/" + s.mcq), null, session, "{\"answer\":{\"selected\":[0]}}").andExpect(status().isOk());
        send(put("/api/v1/public/exam/answers/" + s.mcq), null, session, "{\"answer\":{\"selected\":[1]}}").andExpect(status().isOk()); // overwrite
        send(put("/api/v1/public/exam/answers/" + s.mcq), null, session, "{\"answer\":{\"selected\":[0]}}").andExpect(status().isOk());
        send(put("/api/v1/public/exam/answers/" + s.coding), null, session, "{\"answer\":{\"language\":\"JAVA\",\"code\":\"class A {}\"}}").andExpect(status().isOk());
        send(put("/api/v1/public/exam/answers/" + s.coding), null, session, "{\"answer\":{\"language\":\"CPP\",\"code\":\"x\"}}").andExpect(status().isBadRequest());
        send(put("/api/v1/public/exam/answers/" + UUID.randomUUID()), null, session, "{\"answer\":{\"selected\":[0]}}").andExpect(status().isNotFound());

        send(get("/api/v1/public/exam/session"), null, session, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.answers['" + s.mcq + "'].selected[0]").value(0))
                .andExpect(jsonPath("$.answers['" + s.coding + "'].code").value("class A {}"));

        send(post("/api/v1/public/exam/submit"), null, session, null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SUBMITTED"));
        send(put("/api/v1/public/exam/answers/" + s.mcq), null, session, "{\"answer\":{\"selected\":[1]}}").andExpect(status().isConflict());
        send(post("/api/v1/public/exam/submit"), null, session, null).andExpect(status().isOk()); // idempotent
        send(post("/api/v1/public/exam/start"), null, null, "{\"token\":\"" + invite + "\"}").andExpect(status().isConflict());
        send(get("/api/v1/public/exam/session"), null, session, null).andExpect(jsonPath("$.status").value("SUBMITTED")).andExpect(jsonPath("$.sections.length()").value(0));

        // recruiter sees the result: MCQ correct (10/10) -> 40% provisional, coding not evaluated, pass unknown
        String list = send(get("/api/v1/assessments/" + s.assessment + "/results"), s.recruiter, null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].candidateEmail").value(email))
                .andExpect(jsonPath("$.items[0].result.mcqScore").value(10))
                .andExpect(jsonPath("$.items[0].result.provisionalPercent").value(40.0))
                .andExpect(jsonPath("$.items[0].result.codingStatus").value("NOT_EVALUATED"))
                .andExpect(jsonPath("$.items[0].result.passed").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String sessionId = JsonPath.read(list, "$.items[0].sessionId");
        send(get("/api/v1/results/" + sessionId), s.recruiter, null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].correct").value(true))
                .andExpect(jsonPath("$.questions[1].code").value("class A {}"));
    }

    @Test
    void resumingRotatesTheSessionTokenAndKeepsAnswers() throws Exception {
        Setup s = openFlexible();
        String invite = inviteToken(s, email());
        String first = start(invite);
        send(put("/api/v1/public/exam/answers/" + s.mcq), null, first, "{\"answer\":{\"selected\":[0]}}").andExpect(status().isOk());

        String second = start(invite);
        assertThat(second).isNotEqualTo(first);
        send(get("/api/v1/public/exam/session"), null, first, null).andExpect(status().isUnauthorized());
        send(put("/api/v1/public/exam/answers/" + s.mcq), null, first, "{\"answer\":{\"selected\":[1]}}").andExpect(status().isUnauthorized());
        send(get("/api/v1/public/exam/session"), null, second, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.answers['" + s.mcq + "'].selected[0]").value(0));
    }

    @Test
    void serverClockWinsOverdueSessionsAreAutoSubmittedAndRejectWrites() throws Exception {
        Setup s = openFlexible();
        String invite = inviteToken(s, email());
        String session = start(invite);
        send(put("/api/v1/public/exam/answers/" + s.mcq), null, session, "{\"answer\":{\"selected\":[0]}}").andExpect(status().isOk());

        String list = send(get("/api/v1/assessments/" + s.assessment + "/results"), s.recruiter, null, null).andReturn().getResponse().getContentAsString();
        String sessionId = JsonPath.read(list, "$.items[0].sessionId");
        JdbcTemplate owner = new JdbcTemplate(new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        owner.execute("alter table exam.exam_sessions disable trigger trg_exam_sessions_protect");
        owner.update("update exam.exam_sessions set deadline_at = now() - interval '1 minute' where id = ?::uuid", sessionId);
        owner.execute("alter table exam.exam_sessions enable trigger trg_exam_sessions_protect");

        send(put("/api/v1/public/exam/answers/" + s.mcq), null, session, "{\"answer\":{\"selected\":[1]}}").andExpect(status().isConflict());
        send(get("/api/v1/assessments/" + s.assessment + "/results"), s.recruiter, null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].status").value("AUTO_SUBMITTED"))
                .andExpect(jsonPath("$.items[0].result.mcqScore").value(10)); // the answer saved before the deadline counted, the late one did not
    }

    @Test
    void sweepAutoSubmitsAbandonedSessions() throws Exception {
        Setup s = openFlexible();
        String session = start(inviteToken(s, email()));
        String list = send(get("/api/v1/assessments/" + s.assessment + "/results"), s.recruiter, null, null).andReturn().getResponse().getContentAsString();
        String sessionId = JsonPath.read(list, "$.items[0].sessionId");
        JdbcTemplate owner = new JdbcTemplate(new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        owner.execute("alter table exam.exam_sessions disable trigger trg_exam_sessions_protect");
        owner.update("update exam.exam_sessions set deadline_at = now() - interval '1 minute' where id = ?::uuid", sessionId);
        owner.execute("alter table exam.exam_sessions enable trigger trg_exam_sessions_protect");

        assertThat(examService.sweepOverdue()).isGreaterThanOrEqualTo(1);
        send(get("/api/v1/public/exam/session"), null, session, null).andExpect(jsonPath("$.status").value("AUTO_SUBMITTED"));
    }

    @Test
    void cannotStartBeforeOrAfterTheWindow() throws Exception {
        Instant now = Instant.now();
        Setup future = setup(createOrg(slug()), now.plusSeconds(7200), now.plusSeconds(86400), "FLEXIBLE_WINDOW", 60);
        send(post("/api/v1/public/exam/start"), null, null, "{\"token\":\"" + inviteToken(future, email()) + "\"}").andExpect(status().isConflict());
    }

    @Test
    void fixedWindowDeadlineIsTheWindowEnd() throws Exception {
        Instant now = Instant.now();
        Instant end = now.plusSeconds(3600);
        Setup s = setup(createOrg(slug()), now.minusSeconds(60), end, "FIXED_WINDOW", 61);
        String res = send(post("/api/v1/public/exam/start"), null, null, "{\"token\":\"" + inviteToken(s, email()) + "\"}").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Instant deadline = Instant.parse(JsonPath.read(res, "$.deadlineAt"));
        assertThat(deadline).isBetween(end.minusSeconds(1), end.plusSeconds(1));
    }

    @Test
    void badTokensAndTenantIsolation() throws Exception {
        Setup a = openFlexible();
        Setup b = openFlexible();
        String sessionA = start(inviteToken(a, email()));
        send(post("/api/v1/public/exam/start"), null, null, "{\"token\":\"" + "x".repeat(43) + "\"}").andExpect(status().isNotFound());
        send(get("/api/v1/public/exam/session"), null, "x".repeat(43), null).andExpect(status().isUnauthorized());
        send(get("/api/v1/public/exam/session"), null, "short", null).andExpect(status().isUnauthorized());
        send(get("/api/v1/public/exam/session"), null, null, null).andExpect(status().isBadRequest());

        String list = send(get("/api/v1/assessments/" + a.assessment + "/results"), a.recruiter, null, null).andReturn().getResponse().getContentAsString();
        String sessionId = JsonPath.read(list, "$.items[0].sessionId");
        send(get("/api/v1/results/" + sessionId), b.recruiter, null, null).andExpect(status().isNotFound());
        send(get("/api/v1/assessments/" + a.assessment + "/results"), b.recruiter, null, null).andExpect(status().isNotFound());
        send(get("/api/v1/assessments/" + a.assessment + "/results"), rootToken(), null, null).andExpect(status().isForbidden());
        send(get("/api/v1/results/" + sessionId), null, null, null).andExpect(status().isUnauthorized());
        assertThat(sessionA).hasSize(43);
    }
}
