package com.arqon.core.platform.api;

import com.arqon.common.tenant.RlsSession;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Super Admin platform-wide operational and assessment telemetry overview.
 * Accessible only by Super Admins holding PERM_ORGANIZATION_READ_ALL.
 */
@RestController
@RequestMapping("/api/v1/platform")
public class PlatformOverviewController {

    public record OrganizationMetrics(long total, long active, long suspended) {}
    public record UserMetrics(long total, long orgAdmins, long recruiters, long candidates) {}
    public record QuestionMetrics(long total, long coding, long mcq) {}
    public record AssessmentMetrics(long total, long draft, long published) {}
    public record ExamMetrics(long total, long inProgress, long completed) {}
    public record SupportedLanguage(String id, String name, String version, String defaultMemoryLimit, String defaultTimeout) {}

    public record PlatformOverviewResponse(
            String platformName,
            String version,
            String status,
            Instant timestamp,
            OrganizationMetrics organizations,
            UserMetrics users,
            QuestionMetrics questions,
            AssessmentMetrics assessments,
            ExamMetrics exams,
            List<SupportedLanguage> supportedLanguages
    ) {}

    private final JdbcTemplate jdbc;
    private final RlsSession rls;

    public PlatformOverviewController(JdbcTemplate jdbc, RlsSession rls) {
        this.jdbc = jdbc;
        this.rls = rls;
    }

    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('PERM_ORGANIZATION_READ_ALL')")
    @Transactional(readOnly = true)
    public PlatformOverviewResponse getOverview() {
        rls.asSystem();

        long orgTotal = queryCount("SELECT count(*) FROM org.organizations");
        long orgActive = queryCount("SELECT count(*) FROM org.organizations WHERE status = 'ACTIVE'");
        long orgSuspended = queryCount("SELECT count(*) FROM org.organizations WHERE status = 'SUSPENDED'");

        long userTotal = queryCount("SELECT count(*) FROM identity.users");
        long userAdmins = queryCount("SELECT count(*) FROM identity.users WHERE role = 'ORG_ADMIN'");
        long userRecruiters = queryCount("SELECT count(*) FROM identity.users WHERE role = 'RECRUITER'");
        long userCandidates = queryCount("SELECT count(*) FROM identity.users WHERE role = 'CANDIDATE'");

        long qTotal = queryCount("SELECT count(*) FROM qbank.questions");
        long qCoding = queryCount("SELECT count(*) FROM qbank.questions WHERE type = 'CODING'");
        long qMcq = queryCount("SELECT count(*) FROM qbank.questions WHERE type = 'MCQ'");

        long aTotal = queryCount("SELECT count(*) FROM assessment.assessments");
        long aDraft = queryCount("SELECT count(*) FROM assessment.assessments WHERE status = 'DRAFT'");
        long aPublished = queryCount("SELECT count(*) FROM assessment.assessments WHERE status = 'PUBLISHED'");

        long eTotal = queryCount("SELECT count(*) FROM exam.exam_sessions");
        long eInProgress = queryCount("SELECT count(*) FROM exam.exam_sessions WHERE status = 'IN_PROGRESS'");
        long eCompleted = queryCount("SELECT count(*) FROM exam.exam_sessions WHERE status IN ('SUBMITTED', 'AUTO_SUBMITTED')");

        List<SupportedLanguage> languages = List.of(
                new SupportedLanguage("java", "Java", "21 LTS", "256MB", "5s"),
                new SupportedLanguage("python", "Python", "3.12", "128MB", "3s"),
                new SupportedLanguage("cpp", "C++", "GCC 13", "128MB", "2s"),
                new SupportedLanguage("javascript", "JavaScript", "Node.js 20 LTS", "128MB", "3s")
        );

        return new PlatformOverviewResponse(
                "ARQON (Arjun + Qualified Onboarding Network)",
                "0.1.0-PROD",
                "UP",
                Instant.now(),
                new OrganizationMetrics(orgTotal, orgActive, orgSuspended),
                new UserMetrics(userTotal, userAdmins, userRecruiters, userCandidates),
                new QuestionMetrics(qTotal, qCoding, qMcq),
                new AssessmentMetrics(aTotal, aDraft, aPublished),
                new ExamMetrics(eTotal, eInProgress, eCompleted),
                languages
        );
    }

    private long queryCount(String sql) {
        try {
            Long count = jdbc.queryForObject(sql, Long.class);
            return count != null ? count : 0L;
        } catch (Exception e) {
            return 0L;
        }
    }
}
