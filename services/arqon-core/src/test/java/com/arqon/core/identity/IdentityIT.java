package com.arqon.core.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.arqon.core.AbstractIT;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class IdentityIT extends AbstractIT {

    @Test
    void pingIsPublicAndReturnsCorrelationId() throws Exception {
        mvc.perform(get("/api/v1/system/ping"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Correlation-Id"))
                .andExpect(jsonPath("$.service").value("arqon-core"))
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void jwksExposesOnlyPublicKey() throws Exception {
        String body = mvc.perform(get("/.well-known/jwks.json")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(body).contains("\"kty\":\"RSA\"").doesNotContain("\"d\":");
    }

    @Test
    void protectedEndpointsRequireTokenWithUniformError() throws Exception {
        mvc.perform(get("/api/v1/users")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(get("/api/v1/users").header("Authorization", "Bearer not.a.jwt")).andExpect(status().isUnauthorized());
    }

    @Test
    void loginSucceedsAndSetsHardenedRefreshCookie() throws Exception {
        MvcResult r = login(ADMIN_EMAIL, PASSWORD);
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        String setCookie = r.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).contains("arqon_refresh=").contains("HttpOnly").contains("SameSite=Strict").contains("Path=/api/v1/auth");
        assertThat(r.getResponse().getContentAsString()).doesNotContain("passwordHash").doesNotContain("password_hash");
    }

    @Test
    void wrongPasswordAndUnknownUserGiveTheSameGenericError() throws Exception {
        String a = login(ADMIN_EMAIL, "wrong-password-123").getResponse().getContentAsString();
        String b = login("nobody@test.local", "wrong-password-123").getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(a, "$.message")).isEqualTo(JsonPath.<String>read(b, "$.message"));
        assertThat(JsonPath.<Integer>read(a, "$.status")).isEqualTo(401);
    }

    @Test
    void accountLocksAfterRepeatedFailures() throws Exception {
        UUID tenant = createOrg(slug());
        String victim = email();
        createUser(rootToken(), victim, "RECRUITER", tenant);
        for (int i = 0; i < 5; i++) {
            assertThat(login(victim, "wrong-password-123").getResponse().getStatus()).isEqualTo(401);
        }
        assertThat(login(victim, PASSWORD).getResponse().getStatus()).isEqualTo(401); // locked even with the right password
    }

    @Test
    void refreshRotatesAndReuseOfOldTokenRevokesTheFamily() throws Exception {
        Cookie c1 = login(ADMIN_EMAIL, PASSWORD).getResponse().getCookie("arqon_refresh");

        mvc.perform(post("/api/v1/auth/refresh").cookie(c1)).andExpect(status().isForbidden()); // no CSRF header

        MvcResult r1 = mvc.perform(post("/api/v1/auth/refresh").cookie(c1).header("X-ARQON-CSRF", "1"))
                .andExpect(status().isOk()).andReturn();
        Cookie c2 = r1.getResponse().getCookie("arqon_refresh");
        assertThat(c2.getValue()).isNotEqualTo(c1.getValue());

        mvc.perform(post("/api/v1/auth/refresh").cookie(c1).header("X-ARQON-CSRF", "1")).andExpect(status().isUnauthorized()); // replay
        mvc.perform(post("/api/v1/auth/refresh").cookie(c2).header("X-ARQON-CSRF", "1")).andExpect(status().isUnauthorized()); // family revoked
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        Cookie c = login(ADMIN_EMAIL, PASSWORD).getResponse().getCookie("arqon_refresh");
        mvc.perform(post("/api/v1/auth/logout").cookie(c).header("X-ARQON-CSRF", "1")).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/refresh").cookie(c).header("X-ARQON-CSRF", "1")).andExpect(status().isUnauthorized());
    }

    @Test
    void orgAdminCannotCreateUsersInAnotherTenantAndOnlySeesOwnTenant() throws Exception {
        String root = rootToken();
        UUID tenantA = createOrg(slug());
        UUID tenantB = createOrg(slug());
        String adminA = email();
        createUser(root, adminA, "ORG_ADMIN", tenantA);
        createUser(root, email(), "RECRUITER", tenantA);
        createUser(root, email(), "ORG_ADMIN", tenantB);
        String tokenA = token(adminA, PASSWORD);

        mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + tokenA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email() + "\",\"password\":\"" + PASSWORD + "\",\"role\":\"RECRUITER\",\"tenantId\":\"" + tenantB + "\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.items[*].tenantId", everyItem(is(tenantA.toString()))));
    }

    @Test
    void recruiterCannotCreateUsers() throws Exception {
        String recruiter = userToken("RECRUITER", createOrg(slug()));
        mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + recruiter).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email() + "\",\"password\":\"" + PASSWORD + "\",\"role\":\"RECRUITER\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void superAdminCannotBeCreatedThroughTheApi() throws Exception {
        mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + rootToken()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email() + "\",\"password\":\"" + PASSWORD + "\",\"role\":\"SUPER_ADMIN\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cannotCreateUserForNonexistentOrganization() throws Exception {
        mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + rootToken()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email() + "\",\"password\":\"" + PASSWORD + "\",\"role\":\"ORG_ADMIN\",\"tenantId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void rowLevelSecurityFailsClosedWithoutTenantContext() {
        assertThat(jdbc.queryForObject("select count(*) from identity.users", Integer.class)).isZero();
    }

    @Test
    void flywayCreatedModuleOwnedTablesInSeparateSchemas() {
        Integer identityTables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'identity' "
                        + "and table_name in ('outbox_events','processed_events','users','refresh_tokens','audit_events')", Integer.class);
        Integer orgTables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'org' "
                        + "and table_name in ('organizations','outbox_events','processed_events')", Integer.class);
        assertThat(identityTables).isEqualTo(5);
        assertThat(orgTables).isEqualTo(3);
    }
}
