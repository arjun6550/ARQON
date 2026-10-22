package com.arqon.core.exam.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExamSessionRepository extends JpaRepository<ExamSession, UUID> {
    Optional<ExamSession> findByTokenHash(String tokenHash);

    Optional<ExamSession> findByInvitationId(UUID invitationId);

    Page<ExamSession> findByAssessmentIdOrderByStartedAtDesc(UUID assessmentId, Pageable pageable);

    List<ExamSession> findTop100ByStatusAndDeadlineAtBefore(ExamStatus status, Instant before);
}
