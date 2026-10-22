package com.arqon.core.exam.api;

import com.arqon.core.exam.api.ExamViews.SaveRequest;
import com.arqon.core.exam.api.ExamViews.SavedView;
import com.arqon.core.exam.api.ExamViews.SessionView;
import com.arqon.core.exam.api.ExamViews.StartRequest;
import com.arqon.core.exam.api.ExamViews.SubmittedView;
import com.arqon.core.exam.service.ExamService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Candidate endpoints. Unauthenticated at the Spring Security level (permitAll): the secret IS the credential
 * (invitation token to start, then the opaque X-Exam-Session token). Everything is server-authoritative.
 */
@RestController
@RequestMapping("/api/v1/public/exam")
public class ExamController {

    static final String HEADER = "X-Exam-Session";

    private final ExamService service;

    public ExamController(ExamService service) {
        this.service = service;
    }

    @PostMapping("/start")
    public ResponseEntity<SessionView> start(@Valid @RequestBody StartRequest request, HttpServletRequest http) {
        return noStore(service.start(request.token(), http.getRemoteAddr()));
    }

    @GetMapping("/session")
    public ResponseEntity<SessionView> session(@RequestHeader(HEADER) String token) {
        return noStore(service.view(token));
    }

    @PutMapping("/answers/{questionId}")
    public ResponseEntity<SavedView> save(@RequestHeader(HEADER) String token, @PathVariable UUID questionId, @Valid @RequestBody SaveRequest body) {
        return noStore(service.save(token, questionId, body.answer()));
    }

    @PostMapping("/submit")
    public ResponseEntity<SubmittedView> submit(@RequestHeader(HEADER) String token, HttpServletRequest http) {
        return noStore(service.submit(token, http.getRemoteAddr()));
    }

    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Referrer-Policy", "no-referrer").body(body);
    }
}
