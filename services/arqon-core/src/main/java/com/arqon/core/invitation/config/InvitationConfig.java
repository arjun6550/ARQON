package com.arqon.core.invitation.config;

import com.arqon.core.invitation.mail.DevLinkLoggingMailer;
import com.arqon.core.invitation.mail.InvitationMailer;
import com.arqon.core.invitation.mail.RealtimeMailOutbox;
import com.arqon.core.invitation.mail.SmtpInvitationMailer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;

@Configuration
@EnableConfigurationProperties(InvitationProperties.class)
class InvitationConfig {

    /** Real-time SMTP and reactive outbox mailer. */
    @Bean
    InvitationMailer invitationMailer(ObjectProvider<JavaMailSender> sender,
                                     RealtimeMailOutbox outbox,
                                     InvitationProperties props,
                                     Environment env) {
        boolean prod = env.acceptsProfiles(Profiles.of("prod"));
        if (prod && props.devLogLinks()) {
            throw new IllegalStateException("arqon.invitation.dev-log-links must not be enabled in the prod profile");
        }
        JavaMailSender s = sender.getIfAvailable();
        InvitationMailer base = new SmtpInvitationMailer(s, props.mailFrom(), outbox, prod);
        return props.devLogLinks() ? new DevLinkLoggingMailer(base) : base;
    }
}
