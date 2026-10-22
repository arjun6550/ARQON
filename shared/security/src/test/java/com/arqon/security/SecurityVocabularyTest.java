package com.arqon.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class SecurityVocabularyTest {

    private Jwt jwt(Map<String, Object> claims) {
        return new Jwt("t", Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "RS256"), claims);
    }

    @Test
    void superAdminCanCreateOrganizationsButRecruiterCannot() {
        assertThat(RolePermissions.of(Role.SUPER_ADMIN)).contains(Permission.ORGANIZATION_CREATE);
        assertThat(RolePermissions.of(Role.RECRUITER)).doesNotContain(Permission.ORGANIZATION_CREATE, Permission.USER_CREATE);
        assertThat(RolePermissions.of(Role.CANDIDATE)).isEmpty();
    }

    @Test
    void onlyOrgAdminAndRecruiterManageQuestions() {
        assertThat(RolePermissions.of(Role.RECRUITER)).contains(Permission.QUESTION_READ, Permission.QUESTION_WRITE);
        assertThat(RolePermissions.of(Role.ORG_ADMIN)).contains(Permission.QUESTION_READ, Permission.QUESTION_WRITE);
        assertThat(RolePermissions.of(Role.PROCTOR)).doesNotContain(Permission.QUESTION_READ);
        assertThat(RolePermissions.of(Role.SUPER_ADMIN)).contains(Permission.QUESTION_READ, Permission.QUESTION_WRITE);
        assertThat(RolePermissions.of(Role.CANDIDATE)).isEmpty();
    }

    @Test
    void onlyOrgAdminAndRecruiterManageAssessments() {
        assertThat(RolePermissions.of(Role.RECRUITER)).contains(Permission.ASSESSMENT_READ, Permission.ASSESSMENT_WRITE, Permission.ASSESSMENT_PUBLISH);
        assertThat(RolePermissions.of(Role.ORG_ADMIN)).contains(Permission.ASSESSMENT_READ, Permission.ASSESSMENT_WRITE, Permission.ASSESSMENT_PUBLISH);
        assertThat(RolePermissions.of(Role.PROCTOR)).doesNotContain(Permission.ASSESSMENT_READ);
        assertThat(RolePermissions.of(Role.SUPER_ADMIN)).contains(Permission.ASSESSMENT_READ, Permission.ASSESSMENT_PUBLISH,
                Permission.INVITATION_READ, Permission.INVITATION_WRITE);
        assertThat(RolePermissions.of(Role.RECRUITER)).contains(Permission.INVITATION_READ, Permission.INVITATION_WRITE);
        assertThat(RolePermissions.of(Role.ORG_ADMIN)).contains(Permission.INVITATION_READ, Permission.INVITATION_WRITE);
        assertThat(RolePermissions.of(Role.PROCTOR)).doesNotContain(Permission.INVITATION_WRITE, Permission.RESULT_READ);
        assertThat(RolePermissions.of(Role.RECRUITER)).contains(Permission.RESULT_READ);
        assertThat(RolePermissions.of(Role.SUPER_ADMIN)).contains(Permission.RESULT_READ);
        assertThat(RolePermissions.of(Role.CANDIDATE)).isEmpty();
    }

    @Test
    void orgAdminCannotCreateUsersInAnyTenant() {
        assertThat(RolePermissions.of(Role.ORG_ADMIN)).contains(Permission.USER_CREATE).doesNotContain(Permission.USER_CREATE_ANY_TENANT);
    }

    @Test
    void converterMapsRoleToAuthorities() {
        var auth = new ArqonJwtAuthenticationConverter().convert(jwt(Map.of("sub", "u1", "role", "ORG_ADMIN")));
        assertThat(auth.getAuthorities().stream().map(Object::toString).toList())
                .contains("ROLE_ORG_ADMIN", "PERM_USER_CREATE").doesNotContain("PERM_ORGANIZATION_CREATE");
    }

    @Test
    void unknownRoleGetsNoAuthorities() {
        var auth = new ArqonJwtAuthenticationConverter().convert(jwt(Map.of("sub", "u1", "role", "HACKER")));
        assertThat(auth.getAuthorities()).isEmpty();
    }

    @Test
    void audienceValidatorRejectsWrongAudience() {
        var validator = ArqonJwtValidators.create(JwtClaims.ISSUER, JwtClaims.AUDIENCE);
        Jwt wrong = new Jwt("t", Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "RS256"),
                Map.of("sub", "u1", "iss", JwtClaims.ISSUER, "aud", List.of("other-api")));
        Jwt right = new Jwt("t", Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "RS256"),
                Map.of("sub", "u1", "iss", JwtClaims.ISSUER, "aud", List.of(JwtClaims.AUDIENCE)));
        assertThat(validator.validate(wrong).hasErrors()).isTrue();
        assertThat(validator.validate(right).hasErrors()).isFalse();
    }
}
