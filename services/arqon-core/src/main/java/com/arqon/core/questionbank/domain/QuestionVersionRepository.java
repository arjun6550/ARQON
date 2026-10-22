package com.arqon.core.questionbank.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionVersionRepository extends JpaRepository<QuestionVersion, UUID> {
    Optional<QuestionVersion> findByQuestionIdAndVersion(UUID questionId, int version);
    List<QuestionVersion> findByQuestionIdOrderByVersionDesc(UUID questionId);
}
