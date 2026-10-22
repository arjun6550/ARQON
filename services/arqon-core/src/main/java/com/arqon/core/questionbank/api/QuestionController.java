package com.arqon.core.questionbank.api;

import com.arqon.common.api.PageResponse;
import com.arqon.common.tenant.TenantContext;
import com.arqon.core.questionbank.api.QuestionViews.Detail;
import com.arqon.core.questionbank.api.QuestionViews.Summary;
import com.arqon.core.questionbank.api.QuestionViews.VersionSummary;
import com.arqon.core.questionbank.domain.Difficulty;
import com.arqon.core.questionbank.domain.QuestionType;
import com.arqon.core.questionbank.service.QuestionDraft;
import com.arqon.core.questionbank.service.QuestionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.List;
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
@RequestMapping("/api/v1/questions")
@Validated
public class QuestionController {

    private static final String READ = "hasAuthority('PERM_QUESTION_READ')";
    private static final String WRITE = "hasAuthority('PERM_QUESTION_WRITE')";

    private final QuestionService service;

    public QuestionController(QuestionService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize(WRITE)
    public ResponseEntity<Detail> create(@Valid @RequestBody QuestionDraft draft, @AuthenticationPrincipal Jwt jwt) {
        var created = service.create(TenantContext.require(), userId(jwt), draft);
        return ResponseEntity.created(URI.create("/api/v1/questions/" + created.question().getId()))
                .body(Detail.from(created.question(), created.version()));
    }

    @GetMapping
    @PreAuthorize(READ)
    public PageResponse<Summary> list(@RequestParam(required = false) QuestionType type,
                                      @RequestParam(required = false) Difficulty difficulty,
                                      @RequestParam(required = false) String tag,
                                      @RequestParam(required = false) String search,
                                      @RequestParam(defaultValue = "0") @Min(0) int page,
                                      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var result = service.list(TenantContext.require(), type, difficulty, tag, search, page, size);
        return new PageResponse<>(result.items().stream().map(Summary::from).toList(), page, size, result.totalElements());
    }

    @GetMapping("/{id}")
    @PreAuthorize(READ)
    public Detail get(@PathVariable UUID id) {
        var d = service.get(TenantContext.require(), id, null);
        return Detail.from(d.question(), d.version());
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize(READ)
    public List<VersionSummary> versions(@PathVariable UUID id) {
        return service.history(TenantContext.require(), id).stream().map(VersionSummary::from).toList();
    }

    @GetMapping("/{id}/versions/{version}")
    @PreAuthorize(READ)
    public Detail version(@PathVariable UUID id, @PathVariable int version) {
        var d = service.get(TenantContext.require(), id, version);
        return Detail.from(d.question(), d.version());
    }

    /** Creates a NEW immutable version. Body must carry expectedVersion (the version the editor started from). */
    @PutMapping("/{id}")
    @PreAuthorize(WRITE)
    public Detail update(@PathVariable UUID id, @Valid @RequestBody QuestionDraft draft, @AuthenticationPrincipal Jwt jwt) {
        var d = service.newVersion(TenantContext.require(), userId(jwt), id, draft);
        return Detail.from(d.question(), d.version());
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
