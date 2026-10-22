package com.arqon.core.exam.api;

import com.arqon.core.exam.domain.Answer;
import com.arqon.core.exam.domain.ExamResult;
import com.arqon.core.exam.domain.ExamSession;
import com.arqon.core.exam.domain.Snapshot;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ExamViews {

    private ExamViews() {}

    public record StartRequest(@NotBlank @Size(max = 200) String token) {}

    public record SaveRequest(@NotNull Answer answer) {}

    /** What a candidate may see: no correct flags, no hidden tests. */
    public record CandidateItem(UUID questionId, int version, int points, boolean coding, String title, String body,
                                List<String> options, boolean multipleCorrect, List<String> languages, Map<String, String> starterCode,
                                List<Snapshot.Sample> samples, int hiddenTestCount) {
        static CandidateItem from(Snapshot.Item i) {
            return new CandidateItem(i.questionId(), i.version(), i.points(), i.coding(), i.title(), i.body(),
                    i.options().stream().map(Snapshot.Opt::text).toList(), i.multipleCorrect(), i.languages(), i.starterCode(),
                    i.samples(), i.hiddenTestCount());
        }
    }

    public record CandidateSection(String title, boolean coding, List<CandidateItem> items) {}

    public record SessionView(String sessionToken, String status, String title, Instant startedAt, Instant deadlineAt, Instant submittedAt,
                              Instant serverNow, List<CandidateSection> sections, Map<UUID, Answer> answers) {
        /** Finished sessions get no questions back. */
        public static SessionView of(String token, ExamSession s, Map<UUID, Answer> answers, Instant now) {
            boolean open = s.isOpen();
            List<CandidateSection> sections = open ? s.getSnapshot().sections().stream().map(sec -> new CandidateSection(sec.title(), sec.coding(),
                    sec.items().stream().map(CandidateItem::from).toList())).toList() : List.of();
            return new SessionView(token, s.getStatus().name(), s.getSnapshot().title(), s.getStartedAt(), s.getDeadlineAt(), s.getSubmittedAt(),
                    now, sections, open ? answers : Map.of());
        }
    }

    public record SavedView(Instant serverNow, Instant deadlineAt) {}

    public record SubmittedView(String status, Instant submittedAt) {}

    public record ResultRow(UUID sessionId, String candidateEmail, String status, Instant startedAt, Instant submittedAt, ExamResult result) {
        public static ResultRow from(ExamSession s) {
            return new ResultRow(s.getId(), s.getCandidateEmail(), s.getStatus().name(), s.getStartedAt(), s.getSubmittedAt(), s.getResult());
        }
    }

    public record QuestionResult(UUID questionId, String title, boolean coding, int points, Boolean correct, List<Integer> selected,
                                 List<Integer> correctOptions, List<String> options, String language, String code) {}

    public record ResultDetail(ResultRow summary, List<QuestionResult> questions) {}
}
