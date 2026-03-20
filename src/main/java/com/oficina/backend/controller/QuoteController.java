package com.oficina.backend.controller;

import com.oficina.backend.model.QuoteEmailRequest;
import com.oficina.backend.service.OdooSubmissionService;
import com.oficina.backend.service.QuoteEmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/quote")
@CrossOrigin
public class QuoteController {

    private final QuoteEmailService quoteEmailService;
    private final OdooSubmissionService odooSubmissionService;

    public QuoteController(QuoteEmailService quoteEmailService, OdooSubmissionService odooSubmissionService) {
        this.quoteEmailService = quoteEmailService;
        this.odooSubmissionService = odooSubmissionService;
    }

    @PostMapping("/email")
    public ResponseEntity<?> sendQuoteEmail(@RequestBody QuoteEmailRequest request) {
        if (isBlank(request.getClientName()) || isBlank(request.getClientEmail())) {
            return ResponseEntity.badRequest().body("Campos obrigatorios: clientName, clientEmail.");
        }
        if (isBlank(request.getClientNif())) {
            return ResponseEntity.badRequest().body("Campo obrigatorio: clientNif.");
        }
        if (!request.getClientNif().trim().matches("\\d{9}")) {
            return ResponseEntity.badRequest().body("Campo invalido: clientNif deve ter 9 digitos.");
        }

        try {
            boolean sent = quoteEmailService.sendQuotePdf(request);
            odooSubmissionService.submitWebsiteRecord(request);
            if (sent) {
                return ResponseEntity.ok("Email enviado com sucesso para cliente e empresa. Submissao registada no Odoo.");
            }
            return ResponseEntity.ok("SMTP nao configurado: fluxo concluido em modo teste e submissao registada no Odoo.");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Falha no processamento: " + rootMessage(ex));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() != null ? current.getMessage() : throwable.getMessage();
    }
}
