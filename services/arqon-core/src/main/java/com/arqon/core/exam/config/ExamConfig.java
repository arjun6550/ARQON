package com.arqon.core.exam.config;

import com.arqon.core.exam.service.ExamService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Safety net: auto-submits sessions whose time is up even if the candidate closed the browser. Single-node placeholder (no distributed lock yet). */
@Configuration
@EnableScheduling
class ExamConfig {

    private static final Logger log = LoggerFactory.getLogger(ExamConfig.class);

    private final ExamService exams;

    ExamConfig(ExamService exams) {
        this.exams = exams;
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
    void sweep() {
        try {
            int n = exams.sweepOverdue();
            if (n > 0) log.info("Auto-submitted {} overdue exam session(s)", n);
        } catch (RuntimeException e) {
            log.warn("Overdue sweep failed: {}", e.getClass().getSimpleName());
        }
    }
}
