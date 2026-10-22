package com.arqon.core.questionbank.service;

import com.arqon.common.tenant.RlsSession;
import com.arqon.core.questionbank.QuestionBankApi;
import com.arqon.core.questionbank.domain.QuestionRepository;
import com.arqon.core.questionbank.domain.QuestionStatus;
import com.arqon.core.questionbank.domain.QuestionVersionRepository;
import com.arqon.core.questionbank.domain.TestCase;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class QuestionBankApiImpl implements QuestionBankApi {

    private final QuestionRepository questions;
    private final QuestionVersionRepository versions;
    private final RlsSession rls;

    QuestionBankApiImpl(QuestionRepository questions, QuestionVersionRepository versions, RlsSession rls) {
        this.questions = questions;
        this.versions = versions;
        this.rls = rls;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PinnableQuestion> findPinnable(UUID tenantId, UUID questionId, int version) {
        rls.asTenant(tenantId); // other tenants' questions are invisible, so they cannot be pinned
        return questions.findById(questionId)
                .filter(q -> q.getStatus() == QuestionStatus.ACTIVE)
                .flatMap(q -> versions.findByQuestionIdAndVersion(questionId, version).map(v -> new PinnableQuestion(
                        questionId, version, Kind.valueOf(q.getType().name()), v.getTitle(),
                        v.getContent().coding() != null ? Set.copyOf(v.getContent().coding().languages()) : Set.of())));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QuestionSnapshot> snapshot(UUID tenantId, UUID questionId, int version) {
        rls.asTenant(tenantId);
        return questions.findById(questionId).flatMap(q -> versions.findByQuestionIdAndVersion(questionId, version).map(v -> {
            var mcq = v.getContent().mcq();
            var coding = v.getContent().coding();
            Kind kind = Kind.valueOf(q.getType().name());
            List<Option> options = mcq == null ? List.of() : mcq.options().stream().map(o -> new Option(o.text(), o.correct())).toList();
            List<Sample> samples = coding == null ? List.of() : coding.testCases().stream().filter(t -> !t.hidden())
                    .map(t -> new Sample(t.input(), t.expectedOutput())).toList();
            int hidden = coding == null ? 0 : (int) coding.testCases().stream().filter(TestCase::hidden).count();
            return new QuestionSnapshot(questionId, version, kind, v.getTitle(), v.getBody(), options, mcq != null && mcq.multipleCorrect(),
                    coding == null ? List.of() : List.copyOf(coding.languages()),
                    coding == null || coding.starterCode() == null ? Map.of() : Map.copyOf(coding.starterCode()), samples, hidden);
        }));
    }
}
