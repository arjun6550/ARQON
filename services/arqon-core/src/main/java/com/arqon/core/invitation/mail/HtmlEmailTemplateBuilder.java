package com.arqon.core.invitation.mail;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public final class HtmlEmailTemplateBuilder {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);

    private HtmlEmailTemplateBuilder() {}

    public static String buildHtml(InvitationMail m) {
        String formattedStart = m.windowStart() != null ? FMT.format(m.windowStart()) : "Immediate";
        String formattedEnd = m.windowEnd() != null ? FMT.format(m.windowEnd()) : "No expiration";
        String formattedExpiry = m.expiresAt() != null ? FMT.format(m.expiresAt()) : formattedEnd;

        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Invitation to %s</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #0e1118; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e7e9ef;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #0e1118; padding: 40px 10px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; background-color: #161a24; border: 1px solid #2a3042; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                          <!-- Accent banner -->
                          <tr>
                            <td height="4" style="background: linear-gradient(90deg, #2fae8f, #f4d13d, #2fae8f); font-size: 0; line-height: 0;">&nbsp;</td>
                          </tr>
                          <!-- Brand Header -->
                          <tr>
                            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #2a3042;">
                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%">
                                <tr>
                                  <td>
                                    <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">ARQON</span>
                                    <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background-color: rgba(47, 174, 143, 0.15); color: #7fe0c3; font-size: 11px; font-weight: 600;">OFFICIAL INVITATION</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <!-- Main Body -->
                          <tr>
                            <td style="padding: 36px;">
                              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                                You are invited to take an online assessment
                              </h1>
                              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #99a1b5;">
                                Hello <strong style="color: #ffffff;">%s</strong>,
                                <br>
                                You have been invited to complete a technical examination on the ARQON platform.
                              </p>

                              <!-- Assessment Metadata Card -->
                              <div style="background-color: #1f2432; border: 1px solid #2a3042; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7fe0c3; font-weight: 700; margin-bottom: 6px;">Assessment Title</div>
                                <div style="font-size: 18px; font-weight: 700; color: #ffffff;">%s</div>
                                
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin-top: 16px; border-top: 1px solid #2a3042; padding-top: 12px;">
                                  <tr>
                                    <td width="35%%" style="padding: 4px 0;">
                                      <span style="font-size: 11px; color: #99a1b5; display: block;">TIME ALLOWED</span>
                                      <strong style="font-size: 14px; color: #ffffff;">⏱️ %d Minutes</strong>
                                    </td>
                                    <td width="65%%" style="padding: 4px 0;">
                                      <span style="font-size: 11px; color: #99a1b5; display: block;">SCHEDULE WINDOW</span>
                                      <strong style="font-size: 12px; color: #ffffff;">%s – %s</strong>
                                    </td>
                                  </tr>
                                </table>
                              </div>

                              <!-- Action CTA -->
                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin-bottom: 28px;">
                                <tr>
                                  <td align="center">
                                    <a href="%s" target="_blank" style="display: inline-block; background-color: #0b6b55; color: #ffffff; text-decoration: none; padding: 15px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 4px 14px rgba(11, 107, 85, 0.4);">
                                      Start Assessment Now →
                                    </a>
                                  </td>
                                </tr>
                              </table>

                              <!-- Fallback URL -->
                              <p style="margin: 0 0 20px 0; font-size: 12px; color: #99a1b5; line-height: 1.5; word-break: break-all;">
                                Direct access link:
                                <br>
                                <a href="%s" style="color: #7fe0c3; text-decoration: underline;">%s</a>
                              </p>

                              <!-- Rules Box -->
                              <div style="background-color: rgba(244, 209, 61, 0.08); border-left: 3px solid #f4d13d; border-radius: 4px 8px 8px 4px; padding: 12px 16px; margin-top: 24px;">
                                <p style="margin: 0; font-size: 12px; color: #f4d98a; line-height: 1.5;">
                                  <strong>Examination Instructions:</strong>
                                  <br>
                                  • This invitation link is unique to your candidate email and expires on <strong>%s</strong>.
                                  <br>
                                  • The examination timer begins as soon as you press "Start Exam" in the portal.
                                  <br>
                                  • In case of internet interruption or accidental reload, reopen this link to continue.
                                </p>
                              </div>
                            </td>
                          </tr>
                          <!-- Footer -->
                          <tr>
                            <td style="padding: 20px 36px; background-color: #0e1118; border-top: 1px solid #2a3042; text-align: center;">
                              <p style="margin: 0; font-size: 11px; color: #5b6273; line-height: 1.5;">
                                Delivered by <strong>ARQON Examination Platform</strong>
                                <br>
                                Arjun + Qualified Onboarding Network · Confidential Candidate Link
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                m.assessmentTitle(),
                m.to(),
                m.assessmentTitle(),
                m.durationMinutes(),
                formattedStart,
                formattedEnd,
                m.link(),
                m.link(),
                m.link(),
                formattedExpiry
        );
    }

    public static String buildPlainText(InvitationMail m) {
        String formattedStart = m.windowStart() != null ? FMT.format(m.windowStart()) : "Immediate";
        String formattedEnd = m.windowEnd() != null ? FMT.format(m.windowEnd()) : "No expiration";
        String formattedExpiry = m.expiresAt() != null ? FMT.format(m.expiresAt()) : formattedEnd;

        return """
                Hello,

                You have been invited to take the assessment "%s".

                Open your personal link to start the exam:
                %s

                Assessment Details:
                • Duration: %d minutes once started
                • Available Window: %s to %s
                • Link Expiration: %s

                This link is personal to your candidate email. Do not share it.
                The examination timer begins when you click "Start Exam" on the page.

                --
                ARQON — Arjun + Qualified Onboarding Network
                """.formatted(
                m.assessmentTitle(),
                m.link(),
                m.durationMinutes(),
                formattedStart,
                formattedEnd,
                formattedExpiry
        );
    }
}
