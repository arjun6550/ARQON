package com.arqon.core.assessment.api;

import com.arqon.common.api.PageResponse;
import com.arqon.common.tenant.TenantContext;
import com.arqon.core.assessment.api.AssessmentViews.Detail;
import com.arqon.core.assessment.api.AssessmentViews.Summary;
import com.arqon.core.assessment.domain.AssessmentStatus;
import com.arqon.core.assessment.service.AssessmentDraft;
import com.arqon.core.assessment.service.AssessmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/assessments")
@Validated
public class AssessmentController {

    private static final String READ = "hasAuthority('PERM_ASSESSMENT_READ')";
    private static final String WRITE = "hasAuthority('PERM_ASSESSMENT_WRITE')";
    private static final String PUBLISH = "hasAuthority('PERM_ASSESSMENT_PUBLISH')";

    private final AssessmentService service;

    public AssessmentController(AssessmentService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize(WRITE)
    public ResponseEntity<Detail> create(@Valid @RequestBody AssessmentDraft draft, @AuthenticationPrincipal Jwt jwt) {
        var created = service.create(TenantContext.require(), userId(jwt), draft);
        return ResponseEntity.created(URI.create("/api/v1/assessments/" + created.getId())).body(Detail.from(created));
    }

    @GetMapping
    @PreAuthorize(READ)
    public PageResponse<Summary> list(@RequestParam(required = false) AssessmentStatus status,
                                      @RequestParam(defaultValue = "0") @Min(0) int page,
                                      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var result = service.list(TenantContext.require(), status, page, size);
        return new PageResponse<>(result.getContent().stream().map(Summary::from).toList(), page, size, result.getTotalElements());
    }

    @GetMapping("/{id}")
    @PreAuthorize(READ)
    public Detail get(@PathVariable UUID id) {
        return Detail.from(service.get(TenantContext.require(), id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(WRITE)
    public Detail update(@PathVariable UUID id, @Valid @RequestBody AssessmentDraft draft) {
        return Detail.from(service.update(TenantContext.require(), id, draft));
    }

    /** Freezes the assessment. expectedRevision makes sure you publish exactly what you reviewed. */
    @PostMapping("/{id}/publish")
    @PreAuthorize(PUBLISH)
    public Detail publish(@PathVariable UUID id, @RequestParam @Min(0) int expectedRevision, @AuthenticationPrincipal Jwt jwt) {
        return Detail.from(service.publish(TenantContext.require(), userId(jwt), id, expectedRevision));
    }

    @PostMapping("/{id}/copy")
    @PreAuthorize(WRITE)
    public ResponseEntity<Detail> copy(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        var copy = service.copy(TenantContext.require(), userId(jwt), id);
        return ResponseEntity.created(URI.create("/api/v1/assessments/" + copy.getId())).body(Detail.from(copy));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(WRITE)
    public ResponseEntity<Void> archive(@PathVariable UUID id) {
        service.archive(TenantContext.require(), id);
        return ResponseEntity.noContent().build();
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
