package com.arqon.core.questionbank;

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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class QuestionBankIT extends AbstractIT {

    @Autowired PlatformTransactionManager tm;

    private static String mcqJson(String title, String tag, Integer expectedVersion) {
        return """
                {"type":"MCQ","title":"%s","body":"Pick one","difficulty":"EASY","tags":["geo","%s"],
                 "mcq":{"options":[{"text":"Paris","correct":true},{"text":"Rome","correct":false}],"multipleCorrect":false}%s}
                """.formatted(title, tag, expectedVersion == null ? "" : ",\"expectedVersion\":" + expectedVersion);
    }

    private static String codingJson(String title, String tag) {
        return """
                {"type":"CODING","title":"%s","body":"Read two ints and print the sum","difficulty":"MEDIUM","tags":["%s"],
                 "coding":{"languages":["JAVA","PYTHON"],"starterCode":{"JAVA":"class Main {}"},"timeLimitMs":2000,"memoryLimitMb":256,
                  "testCases":[{"input":"1 2","expectedOutput":"3","hidden":false,"weight":1},
                               {"input":"5 7","expectedOutput":"12","hidden":true,"weight":3}]}}
                """.formatted(title, tag);
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b, String token, String body) throws Exception {
        b.header("Authorization", "Bearer " + token);
        if (body != null) {
            b.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(b);
    }

    private UUID create(String token, String json) throws Exception {
        String res = send(post("/api/v1/questions"), token, json).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return UUID.fromString(JsonPath.read(res, "$.id"));
    }

    private static String uniq() { return "t" + UUID.randomUUID().toString().substring(0, 8); }

    @Test
    void createsMcqWithNormalizedTagsAndVersionOne() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        send(post("/api/v1/questions"), token, mcqJson("Capital of France", "Basics", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("MCQ"))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.currentVersion").value(1))
                .andExpect(jsonPath("$.tags[1]").value("basics"))
                .andExpect(jsonPath("$.mcq.options[0].correct").value(true));
    }

    @Test
    void authorSeesHiddenTestCasesAndStarterCode() throws Exception {
        String token = userToken("ORG_ADMIN", createOrg(slug()));
        UUID id = create(token, codingJson("Sum", uniq()));
        send(get("/api/v1/questions/" + id), token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coding.testCases[1].hidden").value(true))
                .andExpect(jsonPath("$.coding.testCases[1].expectedOutput").value("12"))
                .andExpect(jsonPath("$.coding.starterCode.JAVA").value("class Main {}"));
    }

    @Test
    void invalidContentGivesFieldLevelErrors() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        String noCorrect = mcqJson("Bad", uniq(), null).replace("\"correct\":true", "\"correct\":false");
        send(post("/api/v1/questions"), token, noCorrect)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0].field").value("mcq.options"));
        send(post("/api/v1/questions"), token, mcqJson("", uniq(), null))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void listFiltersByTypeTagAndSearch() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        String tag = uniq();
        String marker = "Zebra" + uniq();
        create(token, mcqJson(marker + " geography", tag, null));
        create(token, codingJson("Sum numbers", tag));

        send(get("/api/v1/questions?tag=" + tag), token, null).andExpect(jsonPath("$.totalElements").value(2));
        send(get("/api/v1/questions?tag=" + tag + "&type=CODING"), token, null)
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].type").value("CODING"));
        send(get("/api/v1/questions?search=" + marker.toLowerCase()), token, null)
                .andExpect(jsonPath("$.totalElements").value(1));
        send(get("/api/v1/questions?tag=" + tag + "&difficulty=HARD"), token, null).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void updatesCreateNewImmutableVersionsAndOldOnesStayReadable() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        UUID id = create(token, mcqJson("Original title", uniq(), null));

        send(put("/api/v1/questions/" + id), token, mcqJson("Edited title", uniq(), 1))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2)).andExpect(jsonPath("$.title").value("Edited title"));
        send(get("/api/v1/questions/" + id), token, null).andExpect(jsonPath("$.currentVersion").value(2)).andExpect(jsonPath("$.title").value("Edited title"));
        send(get("/api/v1/questions/" + id + "/versions/1"), token, null).andExpect(jsonPath("$.title").value("Original title"));
        send(get("/api/v1/questions/" + id + "/versions"), token, null).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].version").value(2));

        // stale editor (still on version 1) must not overwrite
        send(put("/api/v1/questions/" + id), token, mcqJson("Stale edit", uniq(), 1))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));
        // missing expectedVersion and type change are rejected
        send(put("/api/v1/questions/" + id), token, mcqJson("No version", uniq(), null)).andExpect(status().isBadRequest());
        send(put("/api/v1/questions/" + id), token, codingJson("Type change", uniq()).replace("\"tags\"", "\"expectedVersion\":2,\"tags\"")).andExpect(status().isBadRequest());
    }

    @Test
    void archiveHidesFromListsButKeepsVersionsReadable() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        String tag = uniq();
        UUID id = create(token, mcqJson("To archive", tag, null));
        send(delete("/api/v1/questions/" + id), token, null).andExpect(status().isNoContent());
        send(get("/api/v1/questions?tag=" + tag), token, null).andExpect(jsonPath("$.totalElements").value(0));
        send(get("/api/v1/questions/" + id), token, null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ARCHIVED"));
        send(put("/api/v1/questions/" + id), token, mcqJson("Edit archived", tag, 1)).andExpect(status().isConflict());
    }

    @Test
    void tenantsCannotSeeOrTouchEachOthersQuestions() throws Exception {
        String tokenA = userToken("RECRUITER", createOrg(slug()));
        String tokenB = userToken("RECRUITER", createOrg(slug()));
        String tag = uniq();
        UUID id = create(tokenA, mcqJson("Tenant A secret", tag, null));

        send(get("/api/v1/questions/" + id), tokenB, null).andExpect(status().isNotFound());
        send(get("/api/v1/questions/" + id + "/versions"), tokenB, null).andExpect(status().isNotFound());
        send(put("/api/v1/questions/" + id), tokenB, mcqJson("Hijack", tag, 1)).andExpect(status().isNotFound());
        send(delete("/api/v1/questions/" + id), tokenB, null).andExpect(status().isNotFound());
        send(get("/api/v1/questions?tag=" + tag), tokenB, null).andExpect(jsonPath("$.totalElements").value(0));
        send(get("/api/v1/questions/" + id), tokenA, null).andExpect(status().isOk());
    }

    @Test
    void onlyOrgAdminsAndRecruitersHaveAccess() throws Exception {
        UUID tenant = createOrg(slug());
        send(get("/api/v1/questions"), userToken("PROCTOR", tenant), null).andExpect(status().isForbidden());
        send(get("/api/v1/questions"), rootToken(), null).andExpect(status().isForbidden()); // platform admin has no tenant-data access
        mvc.perform(get("/api/v1/questions")).andExpect(status().isUnauthorized());
    }

    @Test
    void versionsAreImmutableAtTheDatabaseLevel() throws Exception {
        String token = userToken("RECRUITER", createOrg(slug()));
        create(token, mcqJson("Immutable", uniq(), null));
        TransactionTemplate tx = new TransactionTemplate(tm);
        assertThatThrownBy(() -> tx.executeWithoutResult(s -> {
            jdbc.queryForObject("select set_config('app.system', 'on', true)", String.class);
            jdbc.update("update qbank.question_versions set title = 'hacked'");
        })).isInstanceOf(DataAccessException.class).hasMessageContaining("immutable");
    }

    @Test
    void rowLevelSecurityFailsClosedWithoutTenantContext() throws Exception {
        create(userToken("RECRUITER", createOrg(slug())), mcqJson("Visible only with context", uniq(), null));
        assertThat(jdbc.queryForObject("select count(*) from qbank.questions", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from qbank.question_versions", Integer.class)).isZero();
    }
}
