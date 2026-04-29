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
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class QuoteEmailService {
    private static final Logger log = LoggerFactory.getLogger(QuoteEmailService.class);

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private final String companyEmail;
    private final String fromEmail;
    private final String smtpHost;
    private final String smtpUsername;
    private final String smtpPassword;
    private final boolean skipWhenSmtpMissing;
    private final String resendApiKey;
    private final String resendFrom;
    private final boolean resendEnabled;
    private final String staticMapsKey;

    public QuoteEmailService(
            JavaMailSender mailSender,
            ObjectMapper objectMapper,
            @Value("${app.company.email}") String companyEmail,
            @Value("${app.mail.from:${spring.mail.username:no-reply@localhost}}") String fromEmail,
            @Value("${spring.mail.host:}") String smtpHost,
            @Value("${spring.mail.username:}") String smtpUsername,
            @Value("${spring.mail.password:}") String smtpPassword,
            @Value("${app.mail.skip-when-smtp-missing:true}") boolean skipWhenSmtpMissing,
            @Value("${app.resend.api-key:}") String resendApiKey,
            @Value("${app.resend.from:${app.mail.from}}") String resendFrom,
            @Value("${app.resend.enabled:true}") boolean resendEnabled,
            @Value("${app.maps.static-key:}") String staticMapsKey) {
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
        this.companyEmail = companyEmail;
        this.fromEmail = fromEmail;
        this.smtpHost = smtpHost;
        this.smtpUsername = smtpUsername;
        this.smtpPassword = smtpPassword;
        this.skipWhenSmtpMissing = skipWhenSmtpMissing;
        this.resendApiKey = resendApiKey;
        this.resendFrom = resendFrom;
        this.resendEnabled = resendEnabled;
        this.staticMapsKey = staticMapsKey;
        log.info("Email transport: Resend {} (from: {}), SMTP host: {}",
                (resendEnabled && resendApiKey != null && !resendApiKey.isBlank()) ? "ATIVO" : "INATIVO",
                (resendFrom == null || resendFrom.isBlank()) ? "não definido" : resendFrom,
                (smtpHost == null || smtpHost.isBlank()) ? "não definido" : smtpHost);
    }

    public boolean sendQuotePdf(QuoteEmailRequest request) throws Exception {
        if (resendEnabled && resendApiKey != null && !resendApiKey.isBlank()) {
            return sendQuoteViaResend(request);
        }
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
        MapSnapshot mapSnapshot = resolveMapSnapshot(request);

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
                request.getInvoiceAttachmentBase64Alt(),
                mapSnapshot.bytes,
                mapSnapshot.name,
                mapSnapshot.mime,
                mapSnapshot.base64
        );

        return true;
    }

    private boolean sendQuoteViaResend(QuoteEmailRequest request) throws Exception {
        byte[] invoicePrimary = decodeBase64(request.getInvoiceAttachmentBase64());
        byte[] invoiceAlt = decodeBase64(request.getInvoiceAttachmentBase64Alt());
        MapSnapshot mapSnapshot = resolveMapSnapshot(request);

        sendResendEmail(
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
                request.getInvoiceAttachmentBase64Alt(),
                mapSnapshot.bytes,
                mapSnapshot.name,
                mapSnapshot.mime,
                mapSnapshot.base64
        );

        return true;
    }

    private void sendResendEmail(String to, String subject, String body, byte[] invoiceBytes, String invoiceName, String invoiceMime,
                                 byte[] invoiceBytesAlt, String invoiceNameAlt, String invoiceMimeAlt,
                                 String invoiceBase64, String invoiceBase64Alt,
                                 byte[] mapBytes, String mapName, String mapMime, String mapBase64) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("from", resendFrom);
        payload.put("to", List.of(to));
        payload.put("subject", subject);
        payload.put("text", body);

        List<Map<String, Object>> attachments = new ArrayList<>();
        Map<String, Object> primaryAttachment = buildResendAttachment(invoiceBytes, invoiceName, invoiceMime, invoiceBase64);
        if (primaryAttachment != null) {
            attachments.add(primaryAttachment);
        }
        if (!isSameAttachment(invoiceBytes, invoiceName, invoiceMime, invoiceBase64, invoiceBytesAlt, invoiceNameAlt, invoiceMimeAlt, invoiceBase64Alt)) {
            Map<String, Object> altAttachment = buildResendAttachment(invoiceBytesAlt, invoiceNameAlt, invoiceMimeAlt, invoiceBase64Alt);
            if (altAttachment != null) {
                attachments.add(altAttachment);
            }
        }
        Map<String, Object> mapAttachment = buildResendAttachment(mapBytes, mapName, mapMime, mapBase64);
        if (mapAttachment != null) {
            attachments.add(mapAttachment);
        }
        if (!attachments.isEmpty()) {
            payload.put("attachments", attachments);
        }

        String json = objectMapper.writeValueAsString(payload);
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("Resend error: HTTP " + response.statusCode() + " - " + response.body());
        }
    }

    private Map<String, Object> buildResendAttachment(byte[] bytes, String nameRaw, String mimeRaw, String base64) {
        String resolvedMime = resolveMime(mimeRaw, base64);
        String name = (nameRaw == null || nameRaw.isBlank()) ? "fatura-luz" : nameRaw.trim();
        if (!name.contains(".") && resolvedMime != null) {
            name = name + mimeToExtension(resolvedMime);
        }
        String content = extractBase64Content(base64);
        if ((content == null || content.isBlank()) && bytes != null && bytes.length > 0) {
            content = Base64.getEncoder().encodeToString(bytes);
        }
        if (content == null || content.isBlank()) {
            return null;
        }
        Map<String, Object> attachment = new HashMap<>();
        attachment.put("filename", name);
        attachment.put("content", content);
        if (resolvedMime != null && !resolvedMime.isBlank()) {
            attachment.put("content_type", resolvedMime);
        }
        return attachment;
    }

    private MapSnapshot resolveMapSnapshot(QuoteEmailRequest request) {
        byte[] bytes = decodeBase64(request.getMapSnapshotBase64());
        String name = trimOrNull(request.getMapSnapshotName());
        String mime = trimOrNull(request.getMapSnapshotMime());
        String base64 = request.getMapSnapshotBase64();
        if ((bytes == null || bytes.length == 0) && request.getMapSnapshotUrl() != null && !request.getMapSnapshotUrl().isBlank()) {
            try {
                MapSnapshot remote = fetchRemoteMapSnapshot(withStaticMapsKey(request.getMapSnapshotUrl()));
                if (remote != null && remote.bytes != null && remote.bytes.length > 0) {
                    bytes = remote.bytes;
                    if (mime == null || mime.isBlank()) {
                        mime = remote.mime;
                    }
                    if (name == null || name.isBlank()) {
                        name = remote.name;
                    }
                    if (base64 == null || base64.isBlank()) {
                        base64 = remote.base64;
                    }
                }
            } catch (Exception ex) {
                log.warn("Falha ao obter mapa estático: {}", ex.getMessage());
            }
        }

        if (name == null || name.isBlank()) {
            name = "mapa-telhado";
        }
        return new MapSnapshot(bytes, name, mime, base64);
    }

    private MapSnapshot fetchRemoteMapSnapshot(String url) throws Exception {
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "macwatts-backend")
                .GET()
                .build();

        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<byte[]> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("HTTP " + response.statusCode());
        }

        byte[] bytes = response.body();
        String contentType = response.headers().firstValue("content-type").orElse(null);
        String mime = null;
        if (contentType != null && !contentType.isBlank()) {
            int semi = contentType.indexOf(';');
            mime = (semi >= 0 ? contentType.substring(0, semi) : contentType).trim();
        }

        String base64Content = Base64.getEncoder().encodeToString(bytes != null ? bytes : new byte[0]);
        String base64 = (mime != null && !mime.isBlank())
                ? "data:" + mime + ";base64," + base64Content
                : base64Content;

        String name = "mapa-telhado";
        if (mime != null && !mime.isBlank()) {
            name = name + mimeToExtension(mime);
        }

        return new MapSnapshot(bytes, name, mime, base64);
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String withStaticMapsKey(String url) {
        if (url == null || url.isBlank()) return url;
        if (staticMapsKey == null || staticMapsKey.isBlank()) return url;
        String trimmed = url.trim();
        if (trimmed.contains("key=")) {
            return trimmed.replaceAll("key=[^&]*", "key=" + staticMapsKey);
        }
        return trimmed + (trimmed.contains("?") ? "&" : "?") + "key=" + staticMapsKey;
    }


    private static class MapSnapshot {
        private final byte[] bytes;
        private final String name;
        private final String mime;
        private final String base64;

        private MapSnapshot(byte[] bytes, String name, String mime, String base64) {
            this.bytes = bytes;
            this.name = name;
            this.mime = mime;
            this.base64 = base64;
        }
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

    private String extractBase64Content(String base64Raw) {
        if (base64Raw == null || base64Raw.isBlank()) {
            return null;
        }
        int commaIndex = base64Raw.indexOf(',');
        return commaIndex >= 0 ? base64Raw.substring(commaIndex + 1) : base64Raw;
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
        if (!safe(request.getMapSnapshotUrl()).isEmpty()) {
            body.append("Mapa (link): ").append(safe(request.getMapSnapshotUrl())).append("\n");
        }
        if (!safe(request.getQuestionnaireSummary()).isEmpty()) {
            body.append("\nQuestionário:\n");
            body.append(safe(request.getQuestionnaireSummary())).append("\n");
        }
        return body.toString();
    }

    private void sendEmail(String to, String subject, String body, byte[] invoiceBytes, String invoiceName, String invoiceMime,
                           byte[] invoiceBytesAlt, String invoiceNameAlt, String invoiceMimeAlt,
                           String invoiceBase64, String invoiceBase64Alt,
                           byte[] mapBytes, String mapName, String mapMime, String mapBase64) throws Exception {
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
        attachIfPresent(helper, mapBytes, mapName, mapMime, mapBase64);
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
