package com.arqon.core.organization;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.arqon.core.AbstractIT;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Uses REAL logins (identity module) to exercise the organization module's authorization and tenant isolation. */
class OrganizationIT extends AbstractIT {

    private String bearer(String t) { return "Bearer " + t; }

    @Test
    void noTokenIsRejectedWithUniformError() throws Exception {
        mvc.perform(get("/api/v1/organizations/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void superAdminCreatesAndListsOrganizations() throws Exception {
        UUID id = createOrg(slug());
        assertThat(id).isNotNull();
        mvc.perform(get("/api/v1/organizations").header("Authorization", bearer(rootToken())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isArray());
    }

    @Test
    void recruiterAndOrgAdminCannotCreateOrganizations() throws Exception {
        UUID tenant = createOrg(slug());
        for (String role : new String[]{"RECRUITER", "ORG_ADMIN"}) {
            mvc.perform(post("/api/v1/organizations").header("Authorization", bearer(userToken(role, tenant)))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\",\"slug\":\"" + slug() + "\"}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
    }

    @Test
    void duplicateSlugConflictsAndInvalidSlugIsRejected() throws Exception {
        String slug = slug();
        createOrg(slug);
        String root = bearer(rootToken());
        mvc.perform(post("/api/v1/organizations").header("Authorization", root)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Dup\",\"slug\":\"" + slug + "\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));
        mvc.perform(post("/api/v1/organizations").header("Authorization", root)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Bad\",\"slug\":\"Bad Slug!\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void tenantUserSeesOnlyOwnOrganizationAndOtherTenantsLookLikeNotFound() throws Exception {
        UUID a = createOrg(slug());
        UUID b = createOrg(slug());
        String recruiterA = bearer(userToken("RECRUITER", a));
        String adminA = bearer(userToken("ORG_ADMIN", a));

        mvc.perform(get("/api/v1/organizations/me").header("Authorization", recruiterA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(a.toString()));
        mvc.perform(get("/api/v1/organizations/" + a).header("Authorization", adminA)).andExpect(status().isOk());
        // cross-tenant read: RLS hides the row, so the answer is 404 and existence is not revealed
        mvc.perform(get("/api/v1/organizations/" + b).header("Authorization", adminA)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/organizations/" + b).header("Authorization", bearer(rootToken()))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/organizations").header("Authorization", adminA)).andExpect(status().isForbidden());
    }

    @Test
    void rowLevelSecurityFailsClosedWithoutTenantContext() throws Exception {
        createOrg(slug());
        assertThat(jdbc.queryForObject("select count(*) from org.organizations", Integer.class)).isZero();
    }
}
