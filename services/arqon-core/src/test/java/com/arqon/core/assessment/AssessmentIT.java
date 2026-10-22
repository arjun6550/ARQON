package com.arqon.core.assessment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.arqon.core.AbstractIT;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class AssessmentIT extends AbstractIT {

    @Autowired PlatformTransactionManager tm;

    private static String body(String title, String schedule, String weights, String sections, Integer expectedRevision) {
        return """
                {"title":"%s","description":"d","config":{
                  "schedule":%s,
                  "allowedLanguages":["JAVA","PYTHON"],
                  "integrity":{"fullscreenRequired":true,"cameraRequired":false,"microphoneRequired":false,"blockCopyPaste":true,"tabSwitchAction":"WARN","maxWarnings":3},
                  "scoring":{"weights":%s,"passPercentage":50},
                  "visibility":{"mcqImmediate":false,"codingAfterSubmit":true,"showHiddenTestDetails":false,"showCorrectAnswers":false},
                  "recovery":{"allowRecovery":true,"graceSeconds":300,"maxRecoveries":3},
                  "identity":{"emailVerification":true,"otp":false,"idUpload":false,"selfie":false},
                  "singleSession":true},
                 "sections":%s%s}
                """.formatted(title, schedule, weights, sections, expectedRevision == null ? "" : ",\"expectedRevision\":" + expectedRevision);
    }

    private static final String FLEXIBLE = "{\"type\":\"FLEXIBLE_WINDOW\",\"windowStart\":\"2035-01-01T00:00:00Z\",\"windowEnd\":\"2035-01-08T00:00:00Z\",\"durationMinutes\":90}";
    private static final String WEIGHTS = "{\"MCQ\":40,\"CODING\":60}";

    private static String sections(UUID mcq, UUID coding) {
        return """
                [{"title":"MCQ","type":"MCQ","items":[{"questionId":"%s","version":1,"points":10}]},
                 {"title":"Coding","type":"CODING","items":[{"questionId":"%s","version":1,"points":50}]}]
                """.formatted(mcq, coding);
    }

    private ResultActions send(MockHttpServletRequestBuilder b, String token, String json) throws Exception {
        b.header("Authorization", "Bearer " + token);
        if (json != null) b.contentType(MediaType.APPLICATION_JSON).content(json);
        return mvc.perform(b);
    }

    /** Returns the assessment id; creates the two questions it pins. */
    private UUID createValid(String token, String title) throws Exception {
        String json = body(title, FLEXIBLE, WEIGHTS, sections(createMcqQuestion(token), createCodingQuestion(token)), null);
        String res = send(post("/api/v1/assessments"), token, json).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return UUID.fromString(JsonPath.read(res, "$.id"));
    }

    @Test
    void createsADraftWithPinnedQuestions() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        String json = body("Backend screening", FLEXIBLE, WEIGHTS, sections(createMcqQuestion(token), createCodingQuestion(token)), null);
        send(post("/api/v1/assessments"), token, json).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.revision").value(0))
                .andExpect(jsonPath("$.sections.length()").value(2))
                .andExpect(jsonPath("$.config.schedule.durationMinutes").value(90));
    }

    @Test
    void rejectsUnknownQuestionsWrongSectionTypeAndOtherTenantsQuestions() throws Exception {
        String tokenA = userToken("RECRUITER", createOrg(slug()));
        String tokenB = userToken("RECRUITER", createOrg(slug()));
        UUID mcqA = createMcqQuestion(tokenA);
        UUID codingA = createCodingQuestion(tokenA);

        send(post("/api/v1/assessments"), tokenA, body("X", FLEXIBLE, WEIGHTS, sections(UUID.randomUUID(), codingA), null))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("sections[0].items[0]"));
        // a coding question placed in an MCQ section
        send(post("/api/v1/assessments"), tokenA, body("X", FLEXIBLE, WEIGHTS, sections(codingA, mcqA), null)).andExpect(status().isBadRequest());
        // tenant B tries to pin tenant A's questions: they do not exist for B
        send(post("/api/v1/assessments"), tokenB, body("X", FLEXIBLE, WEIGHTS, sections(mcqA, codingA), null)).andExpect(status().isBadRequest());
    }

    @Test
    void fixedWindowDurationFollowsTheWindowAndLongWindowsAreRejected() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        String three = "{\"type\":\"FIXED_WINDOW\",\"windowStart\":\"2035-01-01T10:00:00Z\",\"windowEnd\":\"2035-01-01T13:00:00Z\",\"durationMinutes\":60}";
        String four = "{\"type\":\"FIXED_WINDOW\",\"windowStart\":\"2035-01-01T10:00:00Z\",\"windowEnd\":\"2035-01-01T14:00:00Z\",\"durationMinutes\":60}";
        send(post("/api/v1/assessments"), token, body("Fixed", three, "{}", "[]", null))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.config.schedule.durationMinutes").value(180));
        send(post("/api/v1/assessments"), token, body("Too long", four, "{}", "[]", null)).andExpect(status().isBadRequest());
    }

    @Test
    void updateUsesRevisionsAndStaleEditsConflict() throws Exception {
        String token = userToken("ORG_ADMIN", createOrg(slug()));
        UUID id = createValid(token, "Original");
        UUID mcq = createMcqQuestion(token);
        UUID coding = createCodingQuestion(token);

        send(put("/api/v1/assessments/" + id), token, body("Edited", FLEXIBLE, WEIGHTS, sections(mcq, coding), 0))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Edited")).andExpect(jsonPath("$.revision").value(1));
        send(put("/api/v1/assessments/" + id), token, body("Stale", FLEXIBLE, WEIGHTS, sections(mcq, coding), 0))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));
        send(put("/api/v1/assessments/" + id), token, body("No revision", FLEXIBLE, WEIGHTS, sections(mcq, coding), null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publishFreezesTheAssessment() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        UUID id = createValid(token, "To publish");
        send(post("/api/v1/assessments/" + id + "/publish?expectedRevision=0"), token, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PUBLISHED")).andExpect(jsonPath("$.publishedAt").exists());

        UUID mcq = createMcqQuestion(token);
        UUID coding = createCodingQuestion(token);
        send(put("/api/v1/assessments/" + id), token, body("Changed", FLEXIBLE, WEIGHTS, sections(mcq, coding), 1)).andExpect(status().isConflict());
        send(post("/api/v1/assessments/" + id + "/publish?expectedRevision=1"), token, null).andExpect(status().isConflict());

        // a copy is a new editable draft
        send(post("/api/v1/assessments/" + id + "/copy"), token, null)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.title").value("To publish (copy)")).andExpect(jsonPath("$.sourceAssessmentId").value(id.toString()));
    }

    @Test
    void publishRequiresCompleteAndConsistentContent() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        UUID mcq = createMcqQuestion(token);
        UUID coding = createCodingQuestion(token);

        String emptyRes = send(post("/api/v1/assessments"), token, body("Empty", FLEXIBLE, "{}", "[]", null))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String emptyId = JsonPath.read(emptyRes, "$.id");
        send(post("/api/v1/assessments/" + emptyId + "/publish?expectedRevision=0"), token, null).andExpect(status().isBadRequest());

        String badWeights = send(post("/api/v1/assessments"), token, body("Bad weights", FLEXIBLE, "{\"MCQ\":40,\"CODING\":50}", sections(mcq, coding), null))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        send(post("/api/v1/assessments/" + (String) JsonPath.read(badWeights, "$.id") + "/publish?expectedRevision=0"), token, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details[0].field").value("config.scoring.weights"));

        String past = "{\"type\":\"FLEXIBLE_WINDOW\",\"windowStart\":\"2020-01-01T00:00:00Z\",\"windowEnd\":\"2020-01-08T00:00:00Z\",\"durationMinutes\":90}";
        String pastRes = send(post("/api/v1/assessments"), token, body("Past", past, WEIGHTS, sections(mcq, coding), null))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        send(post("/api/v1/assessments/" + (String) JsonPath.read(pastRes, "$.id") + "/publish?expectedRevision=0"), token, null).andExpect(status().isBadRequest());
    }

    @Test
    void archiveHidesFromDefaultListButKeepsThePublishedRecord() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        UUID id = createValid(token, "Archive me " + UUID.randomUUID());
        send(post("/api/v1/assessments/" + id + "/publish?expectedRevision=0"), token, null).andExpect(status().isOk());
        send(get("/api/v1/assessments?status=PUBLISHED"), token, null).andExpect(jsonPath("$.totalElements").value(1));
        send(delete("/api/v1/assessments/" + id), token, null).andExpect(status().isNoContent());
        send(get("/api/v1/assessments"), token, null).andExpect(jsonPath("$.totalElements").value(0));
        send(get("/api/v1/assessments/" + id), token, null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ARCHIVED"));
    }

    @Test
    void tenantsCannotSeeOrTouchEachOthersAssessments() throws Exception {
        String tokenA = userToken("RECRUITER", createOrg(slug()));
        String tokenB = userToken("RECRUITER", createOrg(slug()));
        UUID id = createValid(tokenA, "Tenant A only");

        send(get("/api/v1/assessments/" + id), tokenB, null).andExpect(status().isNotFound());
        send(post("/api/v1/assessments/" + id + "/publish?expectedRevision=0"), tokenB, null).andExpect(status().isNotFound());
        send(post("/api/v1/assessments/" + id + "/copy"), tokenB, null).andExpect(status().isNotFound());
        send(delete("/api/v1/assessments/" + id), tokenB, null).andExpect(status().isNotFound());
        send(get("/api/v1/assessments"), tokenB, null).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void onlyOrgAdminsAndRecruitersHaveAccess() throws Exception {
        UUID tenant = createOrg(slug());
        send(get("/api/v1/assessments"), userToken("PROCTOR", tenant), null).andExpect(status().isForbidden());
        send(get("/api/v1/assessments"), rootToken(), null).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/assessments")).andExpect(status().isUnauthorized());
    }

    @Test
    void publishedAssessmentsAreImmutableAndUndeletableInTheDatabase() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        UUID id = createValid(token, "DB protected");
        send(post("/api/v1/assessments/" + id + "/publish?expectedRevision=0"), token, null).andExpect(status().isOk());
        TransactionTemplate tx = new TransactionTemplate(tm);
        assertThatThrownBy(() -> tx.executeWithoutResult(s -> {
            jdbc.queryForObject("select set_config('app.system', 'on', true)", String.class);
            jdbc.update("update assessment.assessments set title = 'hacked' where id = ?", id);
        })).isInstanceOf(DataAccessException.class).hasMessageContaining("immutable");
        assertThatThrownBy(() -> tx.executeWithoutResult(s -> {
            jdbc.queryForObject("select set_config('app.system', 'on', true)", String.class);
            jdbc.update("delete from assessment.assessments where id = ?", id);
        })).isInstanceOf(DataAccessException.class).hasMessageContaining("cannot be deleted");
    }

    @Test
    void rowLevelSecurityFailsClosedWithoutTenantContext() throws Exception {
        createValid(userToken("RECRUITER", createOrg(slug())), "Hidden without context");
        assertThat(jdbc.queryForObject("select count(*) from assessment.assessments", Integer.class)).isZero();
    }
}
