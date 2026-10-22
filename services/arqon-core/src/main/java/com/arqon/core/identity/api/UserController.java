package com.arqon.core.identity.api;

import com.arqon.common.api.PageResponse;
import com.arqon.common.tenant.TenantContext;
import com.arqon.core.identity.domain.User;
import com.arqon.core.identity.service.UserService;
import com.arqon.core.identity.service.UserService.CreateCommand;
import com.arqon.security.JwtClaims;
import com.arqon.security.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@Validated
public class UserController {

    public record CreateUserRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(min = 12, max = 128) String password,
            @NotNull Role role,
            UUID tenantId) {}

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('PERM_USER_CREATE','PERM_USER_CREATE_ANY_TENANT')")
    public ResponseEntity<UserView> create(@Valid @RequestBody CreateUserRequest request, @AuthenticationPrincipal Jwt jwt, HttpServletRequest http) {
        User created = userService.create(role(jwt), UUID.fromString(jwt.getSubject()), TenantContext.get().orElse(null),
                new CreateCommand(request.email(), request.password(), request.role(), request.tenantId()), http.getRemoteAddr());
        return ResponseEntity.created(URI.create("/api/v1/users/" + created.getId())).body(UserView.from(created));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_USER_READ')")
    public PageResponse<UserView> list(@RequestParam(defaultValue = "0") @Min(0) int page,
                                       @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
                                       @AuthenticationPrincipal Jwt jwt) {
        Page<User> result = userService.list(role(jwt), TenantContext.get().orElse(null), PageRequest.of(page, size, Sort.by("createdAt")));
        return new PageResponse<>(result.getContent().stream().map(UserView::from).toList(), page, size, result.getTotalElements());
    }

    @GetMapping("/me")
    public UserView me(@AuthenticationPrincipal Jwt jwt) {
        return UserView.from(userService.get(UUID.fromString(jwt.getSubject()), role(jwt), TenantContext.get().orElse(null)));
    }

    private static Role role(Jwt jwt) {
        return Role.valueOf(jwt.getClaimAsString(JwtClaims.ROLE));
    }
}
