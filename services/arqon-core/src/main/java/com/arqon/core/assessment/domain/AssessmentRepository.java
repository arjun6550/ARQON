package com.arqon.core.assessment.domain;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentRepository extends JpaRepository<Assessment, UUID> {
    Page<Assessment> findByStatus(AssessmentStatus status, Pageable pageable);
    Page<Assessment> findByStatusNot(AssessmentStatus status, Pageable pageable);
}
