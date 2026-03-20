package com.oficina.backend.service;

import com.oficina.backend.model.QuoteEmailRequest;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

@Service
public class QuoteEmailService {
    private static final Logger log = LoggerFactory.getLogger(QuoteEmailService.class);

    private final JavaMailSender mailSender;
    private final String companyEmail;
    private final String fromEmail;
    private final String smtpHost;
    private final String smtpUsername;
    private final String smtpPassword;
    private final boolean skipWhenSmtpMissing;

    public QuoteEmailService(
            JavaMailSender mailSender,
            @Value("${app.company.email}") String companyEmail,
            @Value("${app.mail.from:${spring.mail.username:no-reply@localhost}}") String fromEmail,
            @Value("${spring.mail.host:}") String smtpHost,
            @Value("${spring.mail.username:}") String smtpUsername,
            @Value("${spring.mail.password:}") String smtpPassword,
            @Value("${app.mail.skip-when-smtp-missing:true}") boolean skipWhenSmtpMissing) {
        this.mailSender = mailSender;
        this.companyEmail = companyEmail;
        this.fromEmail = fromEmail;
        this.smtpHost = smtpHost;
        this.smtpUsername = smtpUsername;
        this.smtpPassword = smtpPassword;
        this.skipWhenSmtpMissing = skipWhenSmtpMissing;
    }

    public boolean sendQuotePdf(QuoteEmailRequest request) throws Exception {
        if (smtpHost == null || smtpHost.isBlank()) {
            if (skipWhenSmtpMissing) {
                log.warn("SMTP não configurado; envio de email ignorado (modo teste).");
                return false;
            }
            throw new IllegalStateException("SMTP não configurado. Define spring.mail.host, spring.mail.port, spring.mail.username e spring.mail.password.");
        }
        if (smtpUsername == null || smtpUsername.isBlank() || smtpPassword == null || smtpPassword.isBlank()) {
            if (skipWhenSmtpMissing) {
                log.warn("Credenciais SMTP ausentes; envio de email ignorado (modo teste).");
                return false;
            }
            throw new IllegalStateException("Credenciais SMTP ausentes. Define MAIL_USERNAME e MAIL_PASSWORD (App Password do Gmail).");
        }

        byte[] invoicePrimary = decodeBase64(request.getInvoiceAttachmentBase64());
        byte[] invoiceAlt = decodeBase64(request.getInvoiceAttachmentBase64Alt());

        boolean companySent = false;
        boolean clientSent = false;
        Exception clientError = null;

        try {
            sendEmail(
                    request.getClientEmail().trim(),
                    "Pedido de Orçamento Solar",
                    buildClientBody(request),
                    invoicePrimary,
                    request.getInvoiceAttachmentName(),
                    request.getInvoiceAttachmentMime(),
                    invoiceAlt,
                    request.getInvoiceAttachmentNameAlt(),
                    request.getInvoiceAttachmentMimeAlt(),
                    request.getInvoiceAttachmentBase64(),
                    request.getInvoiceAttachmentBase64Alt()
            );
            clientSent = true;
        } catch (Exception ex) {
            clientError = ex;
            log.warn("Falha ao enviar email para o cliente: {}", ex.getMessage());
        }

        sendEmail(
                companyEmail.trim(),
                "Novo Pedido de Orçamento Solar",
                buildCompanyBody(request),
                invoicePrimary,
                request.getInvoiceAttachmentName(),
                request.getInvoiceAttachmentMime(),
                invoiceAlt,
                request.getInvoiceAttachmentNameAlt(),
                request.getInvoiceAttachmentMimeAlt(),
                request.getInvoiceAttachmentBase64(),
                request.getInvoiceAttachmentBase64Alt()
        );
        companySent = true;

        if (!companySent && clientError != null) {
            throw clientError;
        }
        if (!clientSent && clientError != null) {
            // Não bloqueia o envio para a empresa, mas sinaliza no backend.
            log.warn("Email enviado para a empresa, mas falhou para o cliente.");
        }
        return true;
    }

    private byte[] decodeBase64(String base64Raw) {
        if (base64Raw == null || base64Raw.isBlank()) {
            return null;
        }

        String cleaned = base64Raw;
        int commaIndex = cleaned.indexOf(',');
        if (commaIndex >= 0) {
            cleaned = cleaned.substring(commaIndex + 1);
        }

        return Base64.getDecoder().decode(cleaned);
    }

    private String buildClientBody(QuoteEmailRequest request) {
        StringBuilder body = new StringBuilder();
        body.append("Segue o pedido de orçamento solar.\n\n");
        body.append("Cliente: ").append(safe(request.getClientName())).append("\n");
        body.append("Email do cliente: ").append(safe(request.getClientEmail())).append("\n");
        if (!safe(request.getClientPhone()).isEmpty()) {
            body.append("Telemóvel: ").append(safe(request.getClientPhone())).append("\n");
        }
        if (!safe(request.getClientNif()).isEmpty()) {
            body.append("NIF: ").append(safe(request.getClientNif())).append("\n");
        }
        if (!safe(request.getAddressSummary()).isEmpty()) {
            body.append("Morada: ").append(safe(request.getAddressSummary())).append("\n");
        }
        if (request.getLatitude() != null && request.getLongitude() != null) {
            body.append("Coordenadas: lat ")
                    .append(formatCoord(request.getLatitude()))
                    .append(", lon ")
                    .append(formatCoord(request.getLongitude()))
                    .append("\n");
        }
        if (!safe(request.getQuestionnaireSummary()).isEmpty()) {
            body.append("\nQuestionário:\n");
            body.append(safe(request.getQuestionnaireSummary())).append("\n");
        }
        return body.toString();
    }

    private String buildCompanyBody(QuoteEmailRequest request) {
        StringBuilder body = new StringBuilder();
        body.append("Segue o pedido de orçamento solar.\n\n");
        body.append("Cliente: ").append(safe(request.getClientName())).append("\n");
        body.append("Email do cliente: ").append(safe(request.getClientEmail())).append("\n");
        if (!safe(request.getClientPhone()).isEmpty()) {
            body.append("Telemóvel: ").append(safe(request.getClientPhone())).append("\n");
        }
        if (!safe(request.getClientNif()).isEmpty()) {
            body.append("NIF: ").append(safe(request.getClientNif())).append("\n");
        }
        if (!safe(request.getAddressSummary()).isEmpty()) {
            body.append("Morada: ").append(safe(request.getAddressSummary())).append("\n");
        }
        if (request.getLatitude() != null && request.getLongitude() != null) {
            body.append("Coordenadas: lat ")
                    .append(formatCoord(request.getLatitude()))
                    .append(", lon ")
                    .append(formatCoord(request.getLongitude()))
                    .append("\n");
        }
        if (!safe(request.getQuestionnaireSummary()).isEmpty()) {
            body.append("\nQuestionário:\n");
            body.append(safe(request.getQuestionnaireSummary())).append("\n");
        }
        return body.toString();
    }

    private void sendEmail(String to, String subject, String body, byte[] invoiceBytes, String invoiceName, String invoiceMime, byte[] invoiceBytesAlt, String invoiceNameAlt, String invoiceMimeAlt, String invoiceBase64, String invoiceBase64Alt) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(body, false);
        attachIfPresent(helper, invoiceBytes, invoiceName, invoiceMime, invoiceBase64);
        if (!isSameAttachment(invoiceBytes, invoiceName, invoiceMime, invoiceBase64, invoiceBytesAlt, invoiceNameAlt, invoiceMimeAlt, invoiceBase64Alt)) {
            attachIfPresent(helper, invoiceBytesAlt, invoiceNameAlt, invoiceMimeAlt, invoiceBase64Alt);
        }
        mailSender.send(message);
    }

    private boolean isSameAttachment(byte[] primaryBytes, String primaryName, String primaryMime, String primaryBase64,
                                     byte[] altBytes, String altName, String altMime, String altBase64) {
        if (altBytes == null || altBytes.length == 0) {
            return false;
        }
        if (primaryBytes != null && primaryBytes.length > 0 && Arrays.equals(primaryBytes, altBytes)) {
            return true;
        }
        if (primaryBase64 != null && altBase64 != null && primaryBase64.equals(altBase64)) {
            return true;
        }
        if (primaryName != null && altName != null && primaryName.equalsIgnoreCase(altName)) {
            if ((primaryMime == null && altMime == null) || (primaryMime != null && primaryMime.equalsIgnoreCase(altMime))) {
                return true;
            }
        }
        return false;
    }

    private void attachIfPresent(MimeMessageHelper helper, byte[] bytes, String nameRaw, String mimeRaw, String base64) throws Exception {
        if (bytes == null || bytes.length == 0) {
            return;
        }
        String resolvedMime = resolveMime(mimeRaw, base64);
        String name = (nameRaw == null || nameRaw.isBlank()) ? "fatura-luz" : nameRaw.trim();
        if (!name.contains(".") && resolvedMime != null) {
            name = name + mimeToExtension(resolvedMime);
        }
        helper.addAttachment(name, new ByteArrayResource(bytes), resolvedMime != null ? resolvedMime : "application/octet-stream");
    }

    private String resolveMime(String mime, String base64) {
        if (mime != null && !mime.isBlank()) {
            return mime.trim();
        }
        if (base64 == null) {
            return null;
        }
        int comma = base64.indexOf(',');
        if (comma > 0) {
            String header = base64.substring(0, comma);
            int colon = header.indexOf(':');
            int semi = header.indexOf(';');
            if (colon >= 0 && semi > colon) {
                return header.substring(colon + 1, semi);
            }
        }
        return null;
    }

    private String mimeToExtension(String mime) {
        if (mime == null) {
            return "";
        }
        return switch (mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "application/pdf" -> ".pdf";
            default -> "";
        };
    }

    private String formatCoord(Double value) {
        if (value == null) {
            return "";
        }
        return String.format(java.util.Locale.ROOT, "%.6f", value);
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
