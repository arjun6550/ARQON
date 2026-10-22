package com.arqon.core.organization.api;

import com.arqon.common.api.PageResponse;
import com.arqon.common.tenant.TenantContext;
import com.arqon.core.organization.domain.Organization;
import com.arqon.core.organization.service.OrganizationService;
import com.arqon.security.Permission;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/organizations")
@Validated
public class OrganizationController {

    public record CreateOrganizationRequest(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Pattern(regexp = "^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$", message = "must be 3-50 chars: lowercase letters, digits, hyphens") String slug) {}

    public record UpdateOrganizationStatusRequest(
            @NotBlank @Pattern(regexp = "^(ACTIVE|SUSPENDED)$", message = "Status must be ACTIVE or SUSPENDED") String status) {}

    public record OrganizationView(UUID id, String name, String slug, String status, Instant createdAt) {
        static OrganizationView from(Organization o) {
            return new OrganizationView(o.getId(), o.getName(), o.getSlug(), o.getStatus(), o.getCreatedAt());
        }
    }

    private final OrganizationService service;

    public OrganizationController(OrganizationService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_ORGANIZATION_CREATE')")
    public ResponseEntity<OrganizationView> create(@Valid @RequestBody CreateOrganizationRequest request, @AuthenticationPrincipal Jwt jwt) {
        Organization org = service.create(request.name(), request.slug(), UUID.fromString(jwt.getSubject()));
        return ResponseEntity.created(URI.create("/api/v1/organizations/" + org.getId())).body(OrganizationView.from(org));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('PERM_ORGANIZATION_CREATE')")
    public OrganizationView updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateOrganizationStatusRequest request, @AuthenticationPrincipal Jwt jwt) {
        Organization org = service.updateStatus(id, request.status(), UUID.fromString(jwt.getSubject()));
        return OrganizationView.from(org);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_ORGANIZATION_READ_ALL')")
    public PageResponse<OrganizationView> list(@RequestParam(defaultValue = "0") @Min(0) int page,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        PageResponse<Organization> result = service.list(page, size);
        return new PageResponse<>(result.items().stream().map(OrganizationView::from).toList(), page, size, result.totalElements());
    }

    /** The caller's own organization; the tenant comes from the verified token, not from the request. */
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('PERM_ORGANIZATION_READ_OWN')")
    public OrganizationView mine() {
        UUID tenant = TenantContext.require();
        return OrganizationView.from(service.get(tenant, false, tenant));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PERM_ORGANIZATION_READ_OWN','PERM_ORGANIZATION_READ_ALL')")
    public OrganizationView byId(@PathVariable UUID id, Authentication auth) {
        boolean all = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(Permission.ORGANIZATION_READ_ALL.authority()));
        return OrganizationView.from(service.get(id, all, TenantContext.get().orElse(null)));
    }
}
