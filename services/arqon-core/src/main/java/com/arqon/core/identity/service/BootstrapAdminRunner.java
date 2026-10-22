package com.arqon.core.identity.service;

import com.arqon.common.tenant.RlsSession;
import com.arqon.core.identity.config.BootstrapAdminProperties;
import com.arqon.core.identity.domain.User;
import com.arqon.core.identity.domain.UserRepository;
import com.arqon.security.Role;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Creates the initial PLATFORM_SUPER_ADMIN (Role.SUPER_ADMIN) from protected configuration if none exists.
 * Enforces idempotency, non-leakage, and explicit conflict detection if an account exists with an incompatible role.
 */
@Component
class BootstrapAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    private final BootstrapAdminProperties props;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final RlsSession rls;
    private final AuditWriter audit;
    private final TransactionTemplate tx;

    BootstrapAdminRunner(BootstrapAdminProperties props, UserRepository users, PasswordEncoder encoder,
                         RlsSession rls, AuditWriter audit, PlatformTransactionManager tm) {
        this.props = props;
        this.users = users;
        this.encoder = encoder;
        this.rls = rls;
        this.audit = audit;
        this.tx = new TransactionTemplate(tm);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (props.email() == null || props.email().isBlank() || props.password() == null || props.password().isBlank()) {
            log.info("No bootstrap admin password configured; skipping super admin provisioning");
            return;
        }
        if (props.password().length() < 12) {
            throw new IllegalStateException("Bootstrap admin password must be at least 12 characters");
        }
        final String targetEmail = props.email().trim().toLowerCase(Locale.ROOT);
        tx.executeWithoutResult(status -> {
            rls.asSystem();

            Optional<User> existingUserOpt = users.findByEmail(targetEmail);
            if (existingUserOpt.isPresent()) {
                User existing = existingUserOpt.get();
                if (existing.getRole() != Role.SUPER_ADMIN || existing.getTenantId() != null) {
                    log.error("Bootstrap security conflict: email '{}' already exists with incompatible role '{}' or tenant ownership '{}'",
                            targetEmail, existing.getRole(), existing.getTenantId());
                    throw new IllegalStateException("Configured bootstrap email " + targetEmail +
                            " already exists with incompatible role or tenant ownership");
                }
                log.info("Platform Super Admin '{}' is already provisioned; bootstrap skipped (idempotent)", targetEmail);
                return;
            }

            if (users.existsByRole(Role.SUPER_ADMIN)) {
                log.info("A SUPER_ADMIN account already exists in the system; bootstrap skipped");
                return;
            }

            users.save(new User(null, targetEmail, encoder.encode(props.password()), Role.SUPER_ADMIN, null));
            audit.record(null, null, "BOOTSTRAP_SUPER_ADMIN_CREATED", targetEmail, "startup");
            log.warn("Bootstrap Platform Super Admin successfully provisioned for '{}' ({})", targetEmail, props.name());
        });
    }
}
