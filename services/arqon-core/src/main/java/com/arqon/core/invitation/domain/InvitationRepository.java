package com.arqon.core.invitation.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {
    Optional<Invitation> findByTokenHash(String tokenHash);

    Page<Invitation> findByAssessmentIdOrderByCreatedAtDesc(UUID assessmentId, Pageable pageable);

    boolean existsByAssessmentIdAndCandidateEmailAndStatusNot(UUID assessmentId, String candidateEmail, InvitationStatus status);
}
