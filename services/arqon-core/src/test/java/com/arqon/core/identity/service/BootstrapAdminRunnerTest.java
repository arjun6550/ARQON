package com.arqon.core.identity.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.arqon.common.tenant.RlsSession;
import com.arqon.core.identity.config.BootstrapAdminProperties;
import com.arqon.core.identity.domain.User;
import com.arqon.core.identity.domain.UserRepository;
import com.arqon.security.Role;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

class BootstrapAdminRunnerTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private RlsSession rlsSession;
    private AuditWriter auditWriter;
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        rlsSession = mock(RlsSession.class);
        auditWriter = mock(AuditWriter.class);
        transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        when(passwordEncoder.encode(any())).thenAnswer(inv -> "hashed:" + inv.getArgument(0));
    }

    @Test
    @DisplayName("Provisions Platform Super Admin when none exists")
    void provisionsSuperAdminWhenNoneExists() {
        BootstrapAdminProperties props = new BootstrapAdminProperties("Arjun Shinde", "arjunnshinde9@gmail.com", "Secure-Passw0rd-12345");
        BootstrapAdminRunner runner = new BootstrapAdminRunner(props, userRepository, passwordEncoder, rlsSession, auditWriter, transactionManager);

        when(userRepository.findByEmail("arjunnshinde9@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByRole(Role.SUPER_ADMIN)).thenReturn(false);

        runner.run(new DefaultApplicationArguments(new String[0]));

        verify(rlsSession).asSystem();
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("arjunnshinde9@gmail.com");
        assertThat(saved.getRole()).isEqualTo(Role.SUPER_ADMIN);
        assertThat(saved.getTenantId()).isNull();
        assertThat(saved.getPasswordHash()).isEqualTo("hashed:Secure-Passw0rd-12345");
        verify(auditWriter).record(null, null, "BOOTSTRAP_SUPER_ADMIN_CREATED", "arjunnshinde9@gmail.com", "startup");
    }

    @Test
    @DisplayName("Idempotently skips when Platform Super Admin already exists with same email")
    void skipsIdempotentlyWhenSuperAdminAlreadyExistsWithSameEmail() {
        BootstrapAdminProperties props = new BootstrapAdminProperties("Arjun Shinde", "arjunnshinde9@gmail.com", "Secure-Passw0rd-12345");
        BootstrapAdminRunner runner = new BootstrapAdminRunner(props, userRepository, passwordEncoder, rlsSession, auditWriter, transactionManager);

        User existingAdmin = new User(null, "arjunnshinde9@gmail.com", "existing_hash", Role.SUPER_ADMIN, null);
        when(userRepository.findByEmail("arjunnshinde9@gmail.com")).thenReturn(Optional.of(existingAdmin));

        runner.run(new DefaultApplicationArguments(new String[0]));

        verify(userRepository, never()).save(any());
        verify(auditWriter, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Fails fast when configured email exists with incompatible role or tenant")
    void throwsSecurityExceptionWhenEmailExistsWithIncompatibleRole() {
        BootstrapAdminProperties props = new BootstrapAdminProperties("Arjun Shinde", "arjunnshinde9@gmail.com", "Secure-Passw0rd-12345");
        BootstrapAdminRunner runner = new BootstrapAdminRunner(props, userRepository, passwordEncoder, rlsSession, auditWriter, transactionManager);

        User tenantUser = new User(UUID.randomUUID(), "arjunnshinde9@gmail.com", "existing_hash", Role.RECRUITER, UUID.randomUUID());
        when(userRepository.findByEmail("arjunnshinde9@gmail.com")).thenReturn(Optional.of(tenantUser));

        assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("incompatible role or tenant ownership");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Skips execution when no password is provided")
    void skipsWhenNoPasswordProvided() {
        BootstrapAdminProperties props = new BootstrapAdminProperties("Arjun Shinde", "arjunnshinde9@gmail.com", "");
        BootstrapAdminRunner runner = new BootstrapAdminRunner(props, userRepository, passwordEncoder, rlsSession, auditWriter, transactionManager);

        runner.run(new DefaultApplicationArguments(new String[0]));

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects passwords shorter than 12 characters")
    void throwsWhenPasswordTooShort() {
        BootstrapAdminProperties props = new BootstrapAdminProperties("Arjun Shinde", "arjunnshinde9@gmail.com", "short-pw");
        BootstrapAdminRunner runner = new BootstrapAdminRunner(props, userRepository, passwordEncoder, rlsSession, auditWriter, transactionManager);

        assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 12 characters");

        verify(userRepository, never()).save(any());
    }
}
