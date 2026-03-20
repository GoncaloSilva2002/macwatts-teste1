package com.oficina.backend.model;

public class QuoteEmailRequest {

    private String clientName;
    private String clientEmail;
    private String clientPhone;
    private String clientNif;
    private String pdfBase64;
    private String addressSummary;
    private String questionnaireSummary;
    private Double latitude;
    private Double longitude;
    private String invoiceAttachmentBase64;
    private String invoiceAttachmentName;
    private String invoiceAttachmentMime;
    private String invoiceAttachmentBase64Alt;
    private String invoiceAttachmentNameAlt;
    private String invoiceAttachmentMimeAlt;

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getClientEmail() {
        return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
        this.clientEmail = clientEmail;
    }

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }

    public String getClientNif() {
        return clientNif;
    }

    public void setClientNif(String clientNif) {
        this.clientNif = clientNif;
    }

    public String getPdfBase64() {
        return pdfBase64;
    }

    public void setPdfBase64(String pdfBase64) {
        this.pdfBase64 = pdfBase64;
    }

    public String getAddressSummary() {
        return addressSummary;
    }

    public void setAddressSummary(String addressSummary) {
        this.addressSummary = addressSummary;
    }

    public String getQuestionnaireSummary() {
        return questionnaireSummary;
    }

    public void setQuestionnaireSummary(String questionnaireSummary) {
        this.questionnaireSummary = questionnaireSummary;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getInvoiceAttachmentBase64() {
        return invoiceAttachmentBase64;
    }

    public void setInvoiceAttachmentBase64(String invoiceAttachmentBase64) {
        this.invoiceAttachmentBase64 = invoiceAttachmentBase64;
    }

    public String getInvoiceAttachmentName() {
        return invoiceAttachmentName;
    }

    public void setInvoiceAttachmentName(String invoiceAttachmentName) {
        this.invoiceAttachmentName = invoiceAttachmentName;
    }

    public String getInvoiceAttachmentMime() {
        return invoiceAttachmentMime;
    }

    public void setInvoiceAttachmentMime(String invoiceAttachmentMime) {
        this.invoiceAttachmentMime = invoiceAttachmentMime;
    }

    public String getInvoiceAttachmentBase64Alt() {
        return invoiceAttachmentBase64Alt;
    }

    public void setInvoiceAttachmentBase64Alt(String invoiceAttachmentBase64Alt) {
        this.invoiceAttachmentBase64Alt = invoiceAttachmentBase64Alt;
    }

    public String getInvoiceAttachmentNameAlt() {
        return invoiceAttachmentNameAlt;
    }

    public void setInvoiceAttachmentNameAlt(String invoiceAttachmentNameAlt) {
        this.invoiceAttachmentNameAlt = invoiceAttachmentNameAlt;
    }

    public String getInvoiceAttachmentMimeAlt() {
        return invoiceAttachmentMimeAlt;
    }

    public void setInvoiceAttachmentMimeAlt(String invoiceAttachmentMimeAlt) {
        this.invoiceAttachmentMimeAlt = invoiceAttachmentMimeAlt;
    }
}
