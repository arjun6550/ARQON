package com.arqon.core.assessment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.arqon.common.domain.Language;
import com.arqon.common.error.ArqonException;
import com.arqon.core.assessment.domain.AssessmentConfig;
import com.arqon.core.assessment.domain.Policies.IdentityPolicy;
import com.arqon.core.assessment.domain.Policies.IntegrityPolicy;
import com.arqon.core.assessment.domain.Policies.RecoveryPolicy;
import com.arqon.core.assessment.domain.Policies.ResultVisibility;
import com.arqon.core.assessment.domain.Policies.ScoringPolicy;
import com.arqon.core.assessment.domain.Schedule;
import com.arqon.core.assessment.domain.ScheduleType;
import com.arqon.core.assessment.domain.Section;
import com.arqon.core.assessment.domain.Section.Item;
import com.arqon.core.assessment.domain.SectionType;
import com.arqon.core.assessment.domain.TabSwitchAction;
import com.arqon.core.questionbank.QuestionBankApi;
import com.arqon.core.questionbank.QuestionBankApi.Kind;
import com.arqon.core.questionbank.QuestionBankApi.PinnableQuestion;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AssessmentValidatorTest {

    static final UUID TENANT = UUID.randomUUID();
    static final UUID MCQ_Q = UUID.randomUUID();
    static final UUID CODING_Q = UUID.randomUUID();
    static final Instant NOW = Instant.parse("2030-01-01T00:00:00Z");

    /** Fake question bank: MCQ_Q and CODING_Q (Java/Python only) exist at version 1. */
    private final QuestionBankApi bank = new QuestionBankApi() {
        @Override
        public Optional<PinnableQuestion> findPinnable(UUID tenant, UUID id, int version) {
            if (version != 1) return Optional.empty();
            if (id.equals(MCQ_Q)) return Optional.of(new PinnableQuestion(id, 1, Kind.MCQ, "mcq", Set.of()));
            if (id.equals(CODING_Q)) return Optional.of(new PinnableQuestion(id, 1, Kind.CODING, "coding", Set.of(Language.JAVA, Language.PYTHON)));
            return Optional.empty();
        }

        @Override
        public Optional<QuestionSnapshot> snapshot(UUID tenant, UUID id, int version) {
            return Optional.empty(); // not needed by the validator
        }
    };
    private final AssessmentValidator validator = new AssessmentValidator(bank);

    private static Schedule flexible(int windowHours, int duration) {
        Instant start = NOW.plus(1, ChronoUnit.DAYS);
        return new Schedule(ScheduleType.FLEXIBLE_WINDOW, start, start.plus(windowHours, ChronoUnit.HOURS), duration);
    }

    private static AssessmentConfig config(Schedule schedule, Set<Language> langs, Map<SectionType, Integer> weights) {
        return new AssessmentConfig(schedule, langs,
                new IntegrityPolicy(true, false, false, true, TabSwitchAction.WARN, 3),
                new ScoringPolicy(weights, 50), new ResultVisibility(false, true, false, false),
                new RecoveryPolicy(true, 300, 3), new IdentityPolicy(true, false, false, false), true);
    }

    private static Section mcq(UUID... qs) {
        return new Section("MCQ", SectionType.MCQ, java.util.Arrays.stream(qs).map(q -> new Item(q, 1, 10)).toList());
    }

    private static Section coding(UUID... qs) {
        return new Section("Coding", SectionType.CODING, java.util.Arrays.stream(qs).map(q -> new Item(q, 1, 50)).toList());
    }

    private AssessmentConfig valid() {
        return config(flexible(48, 90), Set.of(Language.JAVA), Map.of(SectionType.MCQ, 40, SectionType.CODING, 60));
    }

    @Test
    void validDraftAndPublishPass() {
        var sections = List.of(mcq(MCQ_Q), coding(CODING_Q));
        assertThatCode(() -> validator.validate(TENANT, valid(), sections, false, NOW)).doesNotThrowAnyException();
        assertThatCode(() -> validator.validate(TENANT, valid(), sections, true, NOW)).doesNotThrowAnyException();
    }

    @Test
    void fixedWindowDurationIsDerivedFromTheWindow() {
        Instant start = NOW.plus(1, ChronoUnit.DAYS);
        var fixed = config(new Schedule(ScheduleType.FIXED_WINDOW, start, start.plus(3, ChronoUnit.HOURS), 60), Set.of(), Map.of());
        assertThat(AssessmentValidator.normalize(fixed).schedule().durationMinutes()).isEqualTo(180);
    }

    @Test
    void fixedWindowLongerThanThreeHoursIsRejected() {
        Instant start = NOW.plus(1, ChronoUnit.DAYS);
        var fixed = config(new Schedule(ScheduleType.FIXED_WINDOW, start, start.plus(4, ChronoUnit.HOURS), 180), Set.of(), Map.of());
        assertThatThrownBy(() -> validator.validate(TENANT, AssessmentValidator.normalize(fixed), List.of(), false, NOW)).isInstanceOf(ArqonException.class);
    }

    @Test
    void flexibleWindowShorterThanDurationAndReversedWindowAreRejected() {
        var tooShort = config(flexible(1, 120), Set.of(), Map.of());
        assertThatThrownBy(() -> validator.validate(TENANT, tooShort, List.of(), false, NOW)).isInstanceOf(ArqonException.class);
        Instant start = NOW.plus(2, ChronoUnit.DAYS);
        var reversed = config(new Schedule(ScheduleType.FLEXIBLE_WINDOW, start, start.minus(1, ChronoUnit.HOURS), 60), Set.of(), Map.of());
        assertThatThrownBy(() -> validator.validate(TENANT, reversed, List.of(), false, NOW)).isInstanceOf(ArqonException.class);
    }

    @Test
    void unknownOrWrongVersionQuestionIsRejected() {
        assertThatThrownBy(() -> validator.validate(TENANT, valid(), List.of(mcq(UUID.randomUUID())), false, NOW)).isInstanceOf(ArqonException.class);
        var wrongVersion = new Section("MCQ", SectionType.MCQ, List.of(new Item(MCQ_Q, 2, 10)));
        assertThatThrownBy(() -> validator.validate(TENANT, valid(), List.of(wrongVersion), false, NOW)).isInstanceOf(ArqonException.class);
    }

    @Test
    void questionKindMustMatchSectionTypeAndDuplicatesAreRejected() {
        var wrongSection = new Section("Coding", SectionType.CODING, List.of(new Item(MCQ_Q, 1, 10)));
        assertThatThrownBy(() -> validator.validate(TENANT, valid(), List.of(wrongSection), false, NOW)).isInstanceOf(ArqonException.class);
        assertThatThrownBy(() -> validator.validate(TENANT, valid(), List.of(mcq(MCQ_Q), mcq(MCQ_Q)), false, NOW)).isInstanceOf(ArqonException.class);
    }

    @Test
    void codingNeedsAnEnabledLanguageTheQuestionSupports() {
        var onlyCpp = config(flexible(48, 90), Set.of(Language.CPP), Map.of(SectionType.CODING, 100));
        assertThatThrownBy(() -> validator.validate(TENANT, onlyCpp, List.of(coding(CODING_Q)), false, NOW)).isInstanceOf(ArqonException.class);
        var none = config(flexible(48, 90), Set.of(), Map.of(SectionType.CODING, 100));
        assertThatThrownBy(() -> validator.validate(TENANT, none, List.of(coding(CODING_Q)), false, NOW)).isInstanceOf(ArqonException.class);
    }

    @Test
    void publishNeedsSectionsWithQuestions() {
        assertThatThrownBy(() -> validator.validate(TENANT, valid(), List.of(), true, NOW)).isInstanceOf(ArqonException.class);
        assertThatThrownBy(() -> validator.validate(TENANT, valid(), List.of(mcq()), true, NOW)).isInstanceOf(ArqonException.class);
    }

    @Test
    void publishNeedsWeightsForExactlyThePresentSectionTypesSummingTo100() {
        var sections = List.of(mcq(MCQ_Q), coding(CODING_Q));
        var sum90 = config(flexible(48, 90), Set.of(Language.JAVA), Map.of(SectionType.MCQ, 40, SectionType.CODING, 50));
        assertThatThrownBy(() -> validator.validate(TENANT, sum90, sections, true, NOW)).isInstanceOf(ArqonException.class);
        var missing = config(flexible(48, 90), Set.of(Language.JAVA), Map.of(SectionType.MCQ, 100));
        assertThatThrownBy(() -> validator.validate(TENANT, missing, sections, true, NOW)).isInstanceOf(ArqonException.class);
        var zero = config(flexible(48, 90), Set.of(Language.JAVA), Map.of(SectionType.MCQ, 100, SectionType.CODING, 0));
        assertThatThrownBy(() -> validator.validate(TENANT, zero, sections, true, NOW)).isInstanceOf(ArqonException.class);
        // a weights-only draft is fine while still editing
        assertThatCode(() -> validator.validate(TENANT, sum90, sections, false, NOW)).doesNotThrowAnyException();
    }

    @Test
    void publishRequiresTheWindowToEndInTheFuture() {
        var sections = List.of(mcq(MCQ_Q), coding(CODING_Q));
        assertThatThrownBy(() -> validator.validate(TENANT, valid(), sections, true, NOW.plus(10, ChronoUnit.DAYS))).isInstanceOf(ArqonException.class);
    }
}
