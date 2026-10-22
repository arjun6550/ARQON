package com.arqon.core.invitation.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** devLogLinks: LOCAL DEV ONLY, prints the invitation link to the log so it works without a mail server. Refused in prod. baseUrl = where the candidate web app lives; the e-mailed link is {baseUrl}/invite#{token}. */
@ConfigurationProperties("arqon.invitation")
public record InvitationProperties(@DefaultValue("http://localhost:5173") String baseUrl,
                                   @DefaultValue("no-reply@arqon.local") String mailFrom,
                                   @DefaultValue("30") int resolvePerMinutePerIp,
                                   @DefaultValue("false") boolean devLogLinks) {}
