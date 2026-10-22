package com.arqon.core;

import com.arqon.core.invitation.mail.InvitationMail;
import com.arqon.core.invitation.mail.InvitationMailer;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Captures e-mails so tests can read the raw invitation token exactly like a candidate would (from the link). */
@TestConfiguration
public class TestMailConfig {

    public static class CapturingMailer implements InvitationMailer {
        public final List<InvitationMail> sent = new CopyOnWriteArrayList<>();
        public volatile boolean failNext;

        @Override
        public void send(InvitationMail mail) {
            if (failNext) {
                failNext = false;
                throw new IllegalStateException("smtp down");
            }
            sent.add(mail);
        }

        /** Raw token from the most recent mail to the address. */
        public String latestToken(String email) {
            for (int i = sent.size() - 1; i >= 0; i--) {
                if (sent.get(i).to().equals(email)) {
                    String link = sent.get(i).link();
                    return link.substring(link.indexOf('#') + 1);
                }
            }
            throw new AssertionError("no mail sent to " + email);
        }
    }

    @Bean
    @Primary
    CapturingMailer capturingMailer() {
        return new CapturingMailer();
    }
}
