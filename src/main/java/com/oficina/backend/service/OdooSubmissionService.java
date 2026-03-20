package com.oficina.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oficina.backend.model.QuoteEmailRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OdooSubmissionService {
    private static final Logger log = LoggerFactory.getLogger(OdooSubmissionService.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final String odooUrl;
    private final String odooDb;
    private final String odooLogin;
    private final String odooApiKey;
    private final String submissionModel;
    private final boolean createLead;

    public OdooSubmissionService(
            @Value("${app.odoo.enabled:false}") boolean enabled,
            @Value("${app.odoo.url:}") String odooUrl,
            @Value("${app.odoo.db:}") String odooDb,
            @Value("${app.odoo.login:}") String odooLogin,
            @Value("${app.odoo.api-key:}") String odooApiKey,
            @Value("${app.odoo.model:x_website_submission}") String submissionModel,
            @Value("${app.odoo.create-lead:false}") boolean createLead) {
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.enabled = enabled;
        this.odooUrl = odooUrl;
        this.odooDb = odooDb;
        this.odooLogin = odooLogin;
        this.odooApiKey = odooApiKey;
        this.submissionModel = submissionModel;
        this.createLead = createLead;
    }

    public void submitWebsiteRecord(QuoteEmailRequest request) throws Exception {
        if (!enabled) {
            log.info("Integracao Odoo desativada (app.odoo.enabled=false).");
            return;
        }
        validateConfig();

        int uid = login();

        String clientName = safe(request.getClientName());
        String clientEmail = safe(request.getClientEmail());
        String clientPhone = safe(request.getClientPhone());
        String clientNif = normalizeNif(request.getClientNif());
        String address = safe(request.getAddressSummary());
        String questionnaire = safe(request.getQuestionnaireSummary());
        String signature = buildSubmissionSignature(clientName, clientEmail, clientPhone, clientNif, address, questionnaire);

        Integer partnerId = findPartnerId(uid, clientNif, clientEmail);
        boolean existingPartner = partnerId != null;
        boolean signatureFieldAvailable = false;
        String previousSignature = null;
        if (existingPartner) {
            signatureFieldAvailable = hasPartnerSignatureField(uid);
            if (signatureFieldAvailable) {
                previousSignature = readPartnerSignature(uid, partnerId);
            }
        }

        Map<String, Object> partnerVals = new HashMap<>();
        partnerVals.put("name", clientName);
        partnerVals.put("email", clientEmail);
        partnerVals.put("phone", clientPhone);
        partnerVals.put("vat", clientNif);
        partnerVals.put("street", address);
        partnerVals.put("comment", questionnaire);
        if (signatureFieldAvailable) {
            partnerVals.put("x_studio_last_submission_signature", signature);
        }
        cleanEmpty(partnerVals);

        if (partnerId == null) {
            partnerId = createPartner(uid, partnerVals);
        } else if (!partnerVals.isEmpty()) {
            writePartner(uid, partnerId, partnerVals);
        }

        if (existingPartner && signatureFieldAvailable && !signature.equals(safe(previousSignature))) {
            postPartnerSubmissionNote(uid, partnerId, clientName, clientEmail, clientPhone, clientNif, address, questionnaire);
        }

        if (createLead) {
            createOpportunity(uid, partnerId, clientName, clientEmail, clientPhone, clientNif, address, questionnaire);
        }
        createSubmissionRecord(uid, clientName, clientEmail, clientPhone, clientNif, address, questionnaire);
    }

    private int login() throws Exception {
        JsonNode result = jsonRpc("common", "login", List.of(odooDb, odooLogin, odooApiKey));
        if (result == null || !result.isInt()) {
            throw new IllegalStateException("Falha no login Odoo: uid invalido.");
        }
        return result.asInt();
    }

    private Integer findPartnerId(int uid, String nif, String email) throws Exception {
        if (!isBlank(nif)) {
            List<Object> domainByNif = List.of(List.of("vat", "=", nif));
            JsonNode result = executeKw(uid, "res.partner", "search", List.of(domainByNif), Map.of("limit", 1));
            Integer id = firstId(result);
            if (id != null) {
                return id;
            }
        }

        if (!isBlank(email)) {
            List<Object> domainByEmail = List.of(List.of("email", "=", email));
            JsonNode result = executeKw(uid, "res.partner", "search", List.of(domainByEmail), Map.of("limit", 1));
            return firstId(result);
        }

        return null;
    }

    private int createPartner(int uid, Map<String, Object> partnerVals) throws Exception {
        JsonNode result = executeKw(uid, "res.partner", "create", List.of(partnerVals), null);
        if (result == null || !result.isInt()) {
            throw new IllegalStateException("Nao foi possivel criar contacto no Odoo.");
        }
        return result.asInt();
    }

    private void writePartner(int uid, int partnerId, Map<String, Object> partnerVals) throws Exception {
        executeKw(uid, "res.partner", "write", List.of(List.of(partnerId), partnerVals), null);
    }

    private void createOpportunity(
            int uid,
            int partnerId,
            String clientName,
            String clientEmail,
            String clientPhone,
            String clientNif,
            String address,
            String questionnaire) throws Exception {
        String leadName = isBlank(clientName) ? "Website - Sem nome" : "Website - " + clientName;
        String description = "Submissao website\n"
                + "NIF: " + (isBlank(clientNif) ? "-" : clientNif) + "\n"
                + "Morada: " + (isBlank(address) ? "-" : address) + "\n\n"
                + "Questionario:\n" + (isBlank(questionnaire) ? "-" : questionnaire);

        Map<String, Object> leadVals = new HashMap<>();
        leadVals.put("name", leadName);
        leadVals.put("type", "opportunity");
        leadVals.put("partner_id", partnerId);
        leadVals.put("contact_name", clientName);
        leadVals.put("email_from", clientEmail);
        leadVals.put("phone", clientPhone);
        leadVals.put("description", description);
        // Keep opportunity unassigned so it is not tied to the integration user.
        leadVals.put("user_id", false);
        cleanEmpty(leadVals);

        executeKw(uid, "crm.lead", "create", List.of(leadVals), null);
    }

    private void createSubmissionRecord(
            int uid,
            String clientName,
            String clientEmail,
            String clientPhone,
            String clientNif,
            String address,
            String questionnaire) throws Exception {
        String submissionTitle = isBlank(clientName) ? "Submissao website" : "Submissao website - " + clientName;
        Map<String, Object> values = new HashMap<>();
        values.put("x_name", submissionTitle);
        values.put("x_studio_name", clientName);
        values.put("x_studio_email", clientEmail);
        values.put("x_studio_phone", clientPhone);
        values.put("x_studio_nif", clientNif);
        values.put("x_studio_address", address);
        values.put("x_studio_message", "Pedido de orcamento enviado via website.");
        values.put("x_studio_questionnaire", questionnaire);
        cleanEmpty(values);

        executeKw(uid, submissionModel, "create", List.of(values), null);
    }

    private boolean hasPartnerSignatureField(int uid) throws Exception {
        JsonNode result = executeKw(uid, "res.partner", "fields_get", List.of(List.of("x_studio_last_submission_signature")), null);
        return result != null && result.has("x_studio_last_submission_signature");
    }

    private String readPartnerSignature(int uid, int partnerId) throws Exception {
        JsonNode result = executeKw(
                uid,
                "res.partner",
                "read",
                List.of(List.of(partnerId), List.of("x_studio_last_submission_signature")),
                null
        );
        if (result == null || !result.isArray() || result.isEmpty()) {
            return "";
        }
        JsonNode first = result.get(0);
        JsonNode signatureNode = first.get("x_studio_last_submission_signature");
        if (signatureNode == null || signatureNode.isNull()) {
            return "";
        }
        return signatureNode.asText("");
    }

    private void postPartnerSubmissionNote(
            int uid,
            int partnerId,
            String clientName,
            String clientEmail,
            String clientPhone,
            String clientNif,
            String address,
            String questionnaire) throws Exception {
        String body = "Nova submissao website (mesmo NIF)\n\n"
                + "Dados de contacto\n"
                + "Nome: " + fallback(clientName) + "\n"
                + "Email: " + fallback(clientEmail) + "\n"
                + "Telefone: " + fallback(clientPhone) + "\n"
                + "NIF: " + fallback(clientNif) + "\n"
                + "Morada: " + fallback(address) + "\n\n"
                + "Questionario\n"
                + formatMultiline(questionnaire);

        executeKw(
                uid,
                "res.partner",
                "message_post",
                List.of(List.of(partnerId)),
                Map.of(
                        "body", body,
                        "message_type", "comment",
                        "subtype_xmlid", "mail.mt_note"
                )
        );
    }

    private JsonNode executeKw(int uid, String model, String method, List<Object> methodArgs, Map<String, Object> kwargs) throws Exception {
        List<Object> args;
        if (kwargs == null || kwargs.isEmpty()) {
            args = List.of(odooDb, uid, odooApiKey, model, method, methodArgs);
        } else {
            args = List.of(odooDb, uid, odooApiKey, model, method, methodArgs, kwargs);
        }
        return jsonRpc("object", "execute_kw", args);
    }

    private JsonNode jsonRpc(String service, String method, List<Object> args) throws Exception {
        Map<String, Object> payload = Map.of(
                "jsonrpc", "2.0",
                "method", "call",
                "params", Map.of(
                        "service", service,
                        "method", method,
                        "args", args
                ),
                "id", System.currentTimeMillis()
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(stripTrailingSlash(odooUrl) + "/jsonrpc"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(20))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("HTTP " + response.statusCode() + " no Odoo.");
        }

        JsonNode root = objectMapper.readTree(response.body());
        if (root.has("error") && !root.get("error").isNull()) {
            throw new IllegalStateException("Erro Odoo: " + root.get("error").toString());
        }

        return root.get("result");
    }

    private Integer firstId(JsonNode result) {
        if (result == null || !result.isArray() || result.isEmpty()) {
            return null;
        }
        JsonNode first = result.get(0);
        if (first != null && first.isInt()) {
            return first.asInt();
        }
        return null;
    }

    private void cleanEmpty(Map<String, Object> values) {
        values.entrySet().removeIf(entry -> {
            Object value = entry.getValue();
            return value == null || (value instanceof String && ((String) value).isBlank());
        });
    }

    private void validateConfig() {
        if (isBlank(odooUrl) || isBlank(odooDb) || isBlank(odooLogin) || isBlank(odooApiKey)) {
            throw new IllegalStateException("Configuracao Odoo incompleta. Define app.odoo.url, app.odoo.db, app.odoo.login e app.odoo.api-key.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizeNif(String nifRaw) {
        String nif = safe(nifRaw).replaceAll("\\D+", "");
        return nif;
    }

    private String buildSubmissionSignature(
            String clientName,
            String clientEmail,
            String clientPhone,
            String clientNif,
            String address,
            String questionnaire) {
        return String.join("|",
                safe(clientName),
                safe(clientEmail).toLowerCase(),
                safe(clientPhone),
                safe(clientNif),
                safe(address),
                safe(questionnaire)
        );
    }

    private String fallback(String value) {
        return isBlank(value) ? "-" : value;
    }

    private String formatMultiline(String value) {
        return fallback(value).replace("\r\n", "\n").replace("\r", "\n");
    }

    private String stripTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        if (value.endsWith("/")) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
