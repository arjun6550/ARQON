package com.arqon.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Shared base for integration tests (needs Docker). One Postgres container + one Spring context for all ITs.
 * The app connects as the non-owner role arqon_app, so Row-Level Security is REALLY enforced; Flyway uses the owner.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestMailConfig.class)
public abstract class AbstractIT {

    public static final String ADMIN_EMAIL = "root@test.local";
    public static final String PASSWORD = "Test-Passw0rd-123!";

    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16").withInitScript("test-init-roles.sql");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", () -> "arqon_app");
        r.add("spring.datasource.password", () -> "app_pw");
        r.add("arqon.migration.url", POSTGRES::getJdbcUrl);
        r.add("arqon.migration.user", POSTGRES::getUsername);
        r.add("arqon.migration.password", POSTGRES::getPassword);
    }

    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcTemplate jdbc;

    protected MvcResult login(String email, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}")).andReturn();
    }

    protected String token(String email, String password) throws Exception {
        MvcResult r = login(email, password);
        assertThat(r.getResponse().getStatus()).as(r.getResponse().getContentAsString()).isEqualTo(200);
        return JsonPath.read(r.getResponse().getContentAsString(), "$.accessToken");
    }

    protected String rootToken() throws Exception {
        return token(ADMIN_EMAIL, PASSWORD);
    }

    protected UUID createOrg(String slug) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/organizations").header("Authorization", "Bearer " + rootToken())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Acme\",\"slug\":\"" + slug + "\"}")).andReturn();
        assertThat(r.getResponse().getStatus()).as(r.getResponse().getContentAsString()).isEqualTo(201);
        return UUID.fromString(JsonPath.read(r.getResponse().getContentAsString(), "$.id"));
    }

    protected String createUser(String adminToken, String email, String role, UUID tenant) throws Exception {
        String tenantJson = tenant == null ? "" : ",\"tenantId\":\"" + tenant + "\"";
        MvcResult r = mvc.perform(post("/api/v1/users").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"role\":\"" + role + "\"" + tenantJson + "}")).andReturn();
        assertThat(r.getResponse().getStatus()).as(r.getResponse().getContentAsString()).isEqualTo(201);
        return JsonPath.read(r.getResponse().getContentAsString(), "$.id");
    }

    /** Creates a user in the tenant (as SUPER_ADMIN) and returns an access token for them. */
    protected String userToken(String role, UUID tenant) throws Exception {
        String email = email();
        createUser(rootToken(), email, role, tenant);
        return token(email, PASSWORD);
    }

    protected UUID createMcqQuestion(String token) throws Exception {
        String json = "{\"type\":\"MCQ\",\"title\":\"Q " + UUID.randomUUID() + "\",\"body\":\"Pick\",\"difficulty\":\"EASY\",\"tags\":[\"t\"],"
                + "\"mcq\":{\"options\":[{\"text\":\"A\",\"correct\":true},{\"text\":\"B\",\"correct\":false}],\"multipleCorrect\":false}}";
        return createQuestion(token, json);
    }

    protected UUID createCodingQuestion(String token) throws Exception {
        String json = "{\"type\":\"CODING\",\"title\":\"C " + UUID.randomUUID() + "\",\"body\":\"Sum\",\"difficulty\":\"MEDIUM\",\"tags\":[\"t\"],"
                + "\"coding\":{\"languages\":[\"JAVA\",\"PYTHON\"],\"starterCode\":{},\"timeLimitMs\":2000,\"memoryLimitMb\":256,"
                + "\"testCases\":[{\"input\":\"1 2\",\"expectedOutput\":\"3\",\"hidden\":false,\"weight\":1}]}}";
        return createQuestion(token, json);
    }

    private UUID createQuestion(String token, String json) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/questions").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json)).andReturn();
        assertThat(r.getResponse().getStatus()).as(r.getResponse().getContentAsString()).isEqualTo(201);
        return UUID.fromString(JsonPath.read(r.getResponse().getContentAsString(), "$.id"));
    }

    protected static String email() { return "u" + UUID.randomUUID().toString().substring(0, 8) + "@test.local"; }

    protected static String slug() { return "org-" + UUID.randomUUID().toString().substring(0, 8); }
}
