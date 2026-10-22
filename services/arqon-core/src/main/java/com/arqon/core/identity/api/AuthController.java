package com.arqon.core.identity.api;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.core.identity.config.AuthProperties;
import com.arqon.core.identity.service.AuthService;
import com.arqon.core.identity.service.AuthService.AuthResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Access token: returned in the body, kept in memory by the SPA. Refresh token: opaque, rotating, HttpOnly +
 * SameSite=Strict cookie scoped to /api/v1/auth. Cookie endpoints also require the X-ARQON-CSRF header, which a
 * cross-site request cannot add without a CORS preflight.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    public static final String REFRESH_COOKIE = "arqon_refresh";
    public static final String CSRF_HEADER = "X-ARQON-CSRF";

    public record LoginRequest(@NotBlank @Size(max = 320) String email, @NotBlank @Size(max = 128) String password) {}

    public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserView user) {}

    private final AuthService authService;
    private final AuthProperties props;

    public AuthController(AuthService authService, AuthProperties props) {
        this.authService = authService;
        this.props = props;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return respond(authService.login(request.email(), request.password(), http.getRemoteAddr()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String cookie, HttpServletRequest http) {
        requireCsrfHeader(http);
        if (cookie == null || cookie.isBlank()) {
            throw new ArqonException(ErrorCode.UNAUTHENTICATED, "Session expired. Please sign in again.");
        }
        return respond(authService.refresh(cookie, http.getRemoteAddr()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String cookie, HttpServletRequest http) {
        requireCsrfHeader(http);
        authService.logout(cookie, http.getRemoteAddr());
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString()).build();
    }

    private ResponseEntity<AuthResponse> respond(AuthResult result) {
        AuthResponse body = new AuthResponse(result.accessToken(), "Bearer", result.expiresInSeconds(), UserView.from(result.user()));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(result.refreshToken(), props.refreshTtl()).toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(body);
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();
    }

    private static void requireCsrfHeader(HttpServletRequest http) {
        if (http.getHeader(CSRF_HEADER) == null) {
            throw new ArqonException(ErrorCode.FORBIDDEN, "Missing required header");
        }
    }
}
