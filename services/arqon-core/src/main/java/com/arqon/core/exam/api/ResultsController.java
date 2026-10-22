package com.arqon.core.exam.api;

import com.arqon.common.api.PageResponse;
import com.arqon.common.tenant.TenantContext;
import com.arqon.core.exam.api.ExamViews.ResultDetail;
import com.arqon.core.exam.api.ExamViews.ResultRow;
import com.arqon.core.exam.service.ResultsService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Validated
public class ResultsController {

    private static final String READ = "hasAuthority('PERM_RESULT_READ')";

    private final ResultsService service;

    public ResultsController(ResultsService service) {
        this.service = service;
    }

    @GetMapping("/assessments/{assessmentId}/results")
    @PreAuthorize(READ)
    public PageResponse<ResultRow> list(@PathVariable UUID assessmentId, @RequestParam(defaultValue = "0") @Min(0) int page,
                                        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var r = service.list(TenantContext.require(), assessmentId, page, size);
        return new PageResponse<>(r.getContent(), page, size, r.getTotalElements());
    }

    @GetMapping("/results/{sessionId}")
    @PreAuthorize(READ)
    public ResultDetail detail(@PathVariable UUID sessionId) {
        return service.detail(TenantContext.require(), sessionId);
    }
}
