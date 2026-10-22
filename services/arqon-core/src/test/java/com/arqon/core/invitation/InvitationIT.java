package com.arqon.core.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.arqon.core.AbstractIT;
import com.arqon.core.TestMailConfig.CapturingMailer;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class InvitationIT extends AbstractIT {

    @Autowired CapturingMailer mailer;

    private ResultActions send(MockHttpServletRequestBuilder b, String token, String json) throws Exception {
        if (token != null) b.header("Authorization", "Bearer " + token);
        if (json != null) b.contentType(MediaType.APPLICATION_JSON).content(json);
        return mvc.perform(b);
    }

    private String assessmentJson(UUID mcq, UUID coding) {
        return """
                {"title":"Backend screening","description":"d","config":{
                  "schedule":{"type":"FLEXIBLE_WINDOW","windowStart":"2035-01-01T00:00:00Z","windowEnd":"2035-01-08T00:00:00Z","durationMinutes":90},
                  "allowedLanguages":["JAVA","PYTHON"],
                  "integrity":{"fullscreenRequired":true,"cameraRequired":true,"microphoneRequired":false,"blockCopyPaste":true,"tabSwitchAction":"WARN","maxWarnings":3},
                  "scoring":{"weights":{"MCQ":40,"CODING":60},"passPercentage":50},
                  "visibility":{"mcqImmediate":false,"codingAfterSubmit":true,"showHiddenTestDetails":false,"showCorrectAnswers":false},
                  "recovery":{"allowRecovery":true,"graceSeconds":300,"maxRecoveries":3},
                  "identity":{"emailVerification":true,"otp":false,"idUpload":false,"selfie":false},
                  "singleSession":true},
                 "sections":[{"title":"MCQ","type":"MCQ","items":[{"questionId":"%s","version":1,"points":10}]},
                             {"title":"Coding","type":"CODING","items":[{"questionId":"%s","version":1,"points":50}]}]}
                """.formatted(mcq, coding);
    }

    private UUID assessment(String token, boolean publish) throws Exception {
        String res = send(post("/api/v1/assessments"), token, assessmentJson(createMcqQuestion(token), createCodingQuestion(token)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        UUID id = UUID.fromString(JsonPath.read(res, "$.id"));
        if (publish) send(post("/api/v1/assessments/" + id + "/publish?expectedRevision=0"), token, null).andExpect(status().isOk());
        return id;
    }

    private ResultActions invite(String token, UUID assessmentId, String... emails) throws Exception {
        String list = String.join("\",\"", emails);
        return send(post("/api/v1/assessments/" + assessmentId + "/invitations"), token, "{\"emails\":[\"" + list + "\"]}");
    }

    private ResultActions resolve(String rawToken) throws Exception {
        return send(post("/api/v1/public/invitations/resolve"), null, "{\"token\":\"" + rawToken + "\"}");
    }

    private String invitationId(String token, UUID assessmentId, String email) throws Exception {
        String res = send(get("/api/v1/assessments/" + assessmentId + "/invitations"), token, null).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        java.util.List<String> ids = JsonPath.read(res, "$.items[?(@.candidateEmail=='" + email + "')].id");
        return ids.get(0);
    }

    @Test
    void recruiterInvitesCandidatesMailIsSentAndDuplicatesAndBadEmailsAreReported() throws Exception {
        String rec = userToken("RECRUITER", createOrg(slug()));
        UUID a = assessment(rec, true);
        String e1 = email(), e2 = email();

        invite(rec, a, e1, e2.toUpperCase(), "not-an-email").andExpect(status().isCreated())
                .andExpect(jsonPath("$.created").value(2)).andExpect(jsonPath("$.skipped").value(1));
        assertThat(mailer.latestToken(e1)).hasSize(43);
        assertThat(mailer.sent.stream().filter(m -> m.to().equals(e2)).count()).as("addresses are lower-cased").isEqualTo(1);

        invite(rec, a, e1).andExpect(status().isCreated()).andExpect(jsonPath("$.created").value(0))
                .andExpect(jsonPath("$.results[0].outcome").value("DUPLICATE"));

        send(get("/api/v1/assessments/" + a + "/invitations"), rec, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].emailStatus").value("SENT"))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[0].token").doesNotExist())
                .andExpect(jsonPath("$.items[0].tokenHash").doesNotExist());
    }

    @Test
    void failedEmailIsVisibleAndResendRecovers() throws Exception {
        String rec = userToken("RECRUITER", createOrg(slug()));
        UUID a = assessment(rec, true);
        String e = email();
        mailer.failNext = true;
        invite(rec, a, e).andExpect(status().isCreated()).andExpect(jsonPath("$.created").value(1));
        send(get("/api/v1/assessments/" + a + "/invitations"), rec, null).andExpect(jsonPath("$.items[0].emailStatus").value("FAILED"));

        String id = invitationId(rec, a, e);
        send(post("/api/v1/invitations/" + id + "/resend"), rec, null).andExpect(status().isAccepted());
        send(get("/api/v1/assessments/" + a + "/invitations"), rec, null).andExpect(jsonPath("$.items[0].emailStatus").value("SENT"));
        assertThat(mailer.latestToken(e)).hasSize(43);
    }

    @Test
    void draftAssessmentsCannotBeUsed() throws Exception {
        String rec = userToken("RECRUITER", createOrg(slug()));
        invite(rec, assessment(rec, false), email()).andExpect(status().isConflict());
    }

    @Test
    void candidateResolvesLinkOnceMoreIdempotentlyAndSeesOnlyWhatTheyNeed() throws Exception {
        String rec = userToken("RECRUITER", createOrg(slug()));
        UUID a = assessment(rec, true);
        String e = "candidate" + UUID.randomUUID().toString().substring(0, 6) + "@test.local";
        invite(rec, a, e).andExpect(status().isCreated());
        String raw = mailer.latestToken(e);

        for (int i = 0; i < 2; i++) {
            resolve(raw).andExpect(status().isOk())
                    .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                    .andExpect(jsonPath("$.assessment.title").value("Backend screening"))
                    .andExpect(jsonPath("$.assessment.durationMinutes").value(90))
                    .andExpect(jsonPath("$.assessment.requirements.camera").value(true))
                    .andExpect(jsonPath("$.windowState").value("UPCOMING"))
                    .andExpect(jsonPath("$.candidate").value(e.charAt(0) + "***" + e.substring(e.indexOf('@'))))
                    .andExpect(jsonPath("$.assessment.sections").doesNotExist())
                    .andExpect(jsonPath("$.assessment.id").doesNotExist());
        }
        send(get("/api/v1/assessments/" + a + "/invitations"), rec, null).andExpect(jsonPath("$.items[0].status").value("OPENED"));
    }

    @Test
    void unknownMalformedRevokedAndReplacedTokensAllLookTheSame() throws Exception {
        String rec = userToken("RECRUITER", createOrg(slug()));
        UUID a = assessment(rec, true);
        String e = email();
        invite(rec, a, e).andExpect(status().isCreated());
        String oldRaw = mailer.latestToken(e);

        resolve("x".repeat(43)).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("This invitation link is invalid or has expired."));
        resolve("short").andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("This invitation link is invalid or has expired."));

        String id = invitationId(rec, a, e);
        send(post("/api/v1/invitations/" + id + "/resend"), rec, null).andExpect(status().isAccepted());
        String newRaw = mailer.latestToken(e);
        assertThat(newRaw).isNotEqualTo(oldRaw);
        resolve(oldRaw).andExpect(status().isNotFound());
        resolve(newRaw).andExpect(status().isOk());

        send(delete("/api/v1/invitations/" + id), rec, null).andExpect(status().isNoContent());
        resolve(newRaw).andExpect(status().isNotFound());
        send(post("/api/v1/invitations/" + id + "/resend"), rec, null).andExpect(status().isConflict());

        // after revoke the same address can be invited again
        invite(rec, a, e).andExpect(status().isCreated()).andExpect(jsonPath("$.created").value(1));
    }

    @Test
    void tenantsAreIsolatedAndPermissionsEnforced() throws Exception {
        UUID orgA = createOrg(slug());
        String recA = userToken("RECRUITER", orgA);
        String recB = userToken("RECRUITER", createOrg(slug()));
        UUID a = assessment(recA, true);
        String e = email();
        invite(recA, a, e).andExpect(status().isCreated());
        String id = invitationId(recA, a, e);

        invite(recB, a, email()).andExpect(status().isNotFound());
        send(get("/api/v1/assessments/" + a + "/invitations"), recB, null).andExpect(status().isNotFound());
        send(delete("/api/v1/invitations/" + id), recB, null).andExpect(status().isNotFound());
        send(post("/api/v1/invitations/" + id + "/resend"), recB, null).andExpect(status().isNotFound());

        String proctor = userToken("PROCTOR", orgA);
        invite(proctor, a, email()).andExpect(status().isForbidden());
        send(get("/api/v1/assessments/" + a + "/invitations"), proctor, null).andExpect(status().isForbidden());
        invite(rootToken(), a, email()).andExpect(status().isForbidden());
        send(post("/api/v1/assessments/" + a + "/invitations"), null, "{\"emails\":[\"x@y.io\"]}").andExpect(status().isUnauthorized());
    }

    @Test
    void validatesRequests() throws Exception {
        String rec = userToken("RECRUITER", createOrg(slug()));
        UUID a = assessment(rec, true);
        send(post("/api/v1/assessments/" + a + "/invitations"), rec, "{\"emails\":[]}").andExpect(status().isBadRequest());
        send(post("/api/v1/assessments/" + a + "/invitations"), rec, "{\"emails\":[\"a@b.io\"],\"expiresAt\":\"2020-01-01T00:00:00Z\"}").andExpect(status().isBadRequest());
        send(post("/api/v1/assessments/" + a + "/invitations"), rec, "{\"emails\":[\"a@b.io\"],\"expiresAt\":\"2040-01-01T00:00:00Z\"}").andExpect(status().isBadRequest());
        send(post("/api/v1/assessments/" + a + "/invitations"), rec, "{\"emails\":[\"" + email() + "\"],\"expiresAt\":\"2034-12-31T00:00:00Z\"}").andExpect(status().isCreated());
    }
}
