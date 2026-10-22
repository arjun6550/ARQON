package com.arqon.core.identity.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.identity.config.AuthProperties;
import com.arqon.core.identity.domain.RefreshToken;
import com.arqon.core.identity.domain.RefreshTokenRepository;
import com.arqon.core.identity.domain.User;
import com.arqon.core.identity.domain.UserRepository;
import com.arqon.core.identity.domain.UserStatus;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Login / refresh / logout. These flows run in "system" RLS mode because the tenant is not known until the user
 * is found. Failure paths throw ArqonException but still COMMIT (noRollbackFor) so lockout counters,
 * reuse-detection revocations and audit rows persist.
 */
@Service
public class AuthService {

    public record AuthResult(String accessToken, long expiresInSeconds, String refreshToken, User user) {}

    private static final String GENERIC_LOGIN_ERROR = "Invalid email or password";

    private final UserRepository users;
    private final RefreshTokenRepository tokens;
    private final TokenService tokenService;
    private final PasswordEncoder encoder;
    private final RlsSession rls;
    private final AuditWriter audit;
    private final AuthProperties props;
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository tokens, TokenService tokenService,
                       PasswordEncoder encoder, RlsSession rls, AuditWriter audit, AuthProperties props) {
        this.users = users;
        this.tokens = tokens;
        this.tokenService = tokenService;
        this.encoder = encoder;
        this.rls = rls;
        this.audit = audit;
        this.props = props;
        // Used to spend the same hashing time when the user does not exist (prevents user enumeration by timing).
        this.dummyHash = encoder.encode("dummy-password-for-timing-equalisation");
    }

    @Transactional(noRollbackFor = ArqonException.class)
    public AuthResult login(String email, String password, String ip) {
        rls.asSystem();
        Instant now = Instant.now();
        Optional<User> found = users.findByEmail(email.trim().toLowerCase(Locale.ROOT));

        if (found.isEmpty()) {
            encoder.matches(password, dummyHash);
            audit.record(null, null, "LOGIN_FAILED", "unknown-user", ip);
            throw invalidLogin();
        }
        User user = found.get();
        if (user.getStatus() != UserStatus.ACTIVE || user.isLocked(now)) {
            encoder.matches(password, dummyHash);
            audit.record(user.getTenantId(), user.getId(), "LOGIN_BLOCKED", "user:" + user.getId(), ip);
            throw invalidLogin();
        }
        if (!encoder.matches(password, user.getPasswordHash())) {
            user.recordFailedLogin(props.maxFailedAttempts(), props.lockDuration(), now);
            audit.record(user.getTenantId(), user.getId(), "LOGIN_FAILED", "user:" + user.getId(), ip);
            throw invalidLogin();
        }

        user.recordSuccessfulLogin(now);
        UUID sessionId = UUID.randomUUID();
        String refresh = issueRefreshToken(user, UUID.randomUUID(), sessionId, now);
        audit.record(user.getTenantId(), user.getId(), "LOGIN_SUCCEEDED", "session:" + sessionId, ip);
        return new AuthResult(tokenService.issueAccessToken(user, sessionId), tokenService.accessTtlSeconds(), refresh, user);
    }

    @Transactional(noRollbackFor = ArqonException.class)
    public AuthResult refresh(String rawToken, String ip) {
        rls.asSystem();
        Instant now = Instant.now();
        RefreshToken current = tokens.findByTokenHash(TokenService.hash(rawToken)).orElseThrow(AuthService::invalidSession);

        if (current.getRevokedAt() != null || current.getExpiresAt().isBefore(now)) {
            throw invalidSession();
        }
        if (current.getRotatedAt() != null) {
            // An already-rotated token was presented again: assume theft and kill the whole token family.
            tokens.revokeFamily(current.getFamilyId(), now);
            audit.record(current.getTenantId(), current.getUserId(), "REFRESH_REUSE_DETECTED", "family:" + current.getFamilyId(), ip);
            throw invalidSession();
        }
        User user = users.findById(current.getUserId()).orElseThrow(AuthService::invalidSession);
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw invalidSession();
        }
        current.markRotated(now);
        String next = issueRefreshToken(user, current.getFamilyId(), current.getSessionId(), now);
        audit.record(user.getTenantId(), user.getId(), "TOKEN_REFRESHED", "session:" + current.getSessionId(), ip);
        return new AuthResult(tokenService.issueAccessToken(user, current.getSessionId()), tokenService.accessTtlSeconds(), next, user);
    }

    /** Idempotent: unknown/expired tokens are ignored. */
    @Transactional
    public void logout(String rawToken, String ip) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        rls.asSystem();
        tokens.findByTokenHash(TokenService.hash(rawToken)).ifPresent(t -> {
            tokens.revokeFamily(t.getFamilyId(), Instant.now());
            audit.record(t.getTenantId(), t.getUserId(), "LOGOUT", "session:" + t.getSessionId(), ip);
        });
    }

    private String issueRefreshToken(User user, UUID familyId, UUID sessionId, Instant now) {
        String raw = tokenService.newRefreshTokenValue();
        tokens.save(new RefreshToken(user.getId(), user.getTenantId(), familyId, sessionId,
                TokenService.hash(raw), now.plus(props.refreshTtl())));
        return raw;
    }

    private static ArqonException invalidLogin() {
        return new ArqonException(ErrorCode.UNAUTHENTICATED, GENERIC_LOGIN_ERROR);
    }

    private static ArqonException invalidSession() {
        return new ArqonException(ErrorCode.UNAUTHENTICATED, "Session expired. Please sign in again.");
    }
}
