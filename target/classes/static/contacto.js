  function loadStoredJson(key) {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function persistJson(key, value) {
    const raw = JSON.stringify(value);
    try {
      sessionStorage.setItem(key, raw);
    } catch (error) {
      console.warn("Falha ao guardar em sessionStorage:", error);
    }
    try {
      localStorage.setItem(key, raw);
    } catch (error) {
      console.warn("Falha ao guardar em localStorage:", error);
    }
  }

  function openLocalDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("macwatts-storage", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("uploads")) {
          db.createObjectStore("uploads");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbGet(key) {
    const db = await openLocalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readonly");
      const request = tx.objectStore("uploads").get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbDel(key) {
    const db = await openLocalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function formatBatterySummary(questionnaireData) {
    const hasBattery = questionnaireData && questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasBattery;
    if (hasBattery === undefined) return "não disponível";
    if (!hasBattery) return "Não";
    const capacityRaw = questionnaireData ? questionnaireData.batteryCapacityKwh : null;
    const capacity = Number(capacityRaw);
    if (!Number.isFinite(capacity)) {
      return "Sim";
    }
    if (capacity <= 0) {
      return "Sem bateria";
    }
    return `Sim (${capacity.toFixed(0)} kWh)`;
  }

  function formatBatteryCapacity(questionnaireData) {
    const hasBattery = questionnaireData && questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasBattery;
    if (!hasBattery) return "Sem bateria";
    const capacityRaw = questionnaireData ? questionnaireData.batteryCapacityKwh : null;
    const capacity = Number(capacityRaw);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return "Sem bateria";
    }
    return `${capacity.toFixed(0)} kWh`;
  }

  const backBtn = document.getElementById("backBtn");
  const form = document.getElementById("contactForm");
  const statusEl = document.getElementById("status");
  const sumAddress = document.getElementById("sumAddress");
  const sumCoords = document.getElementById("sumCoords");
  const sumArea = document.getElementById("sumArea");
  const sumProperty = document.getElementById("sumProperty");
  const sumPrice = document.getElementById("sumPrice");
  const sumPricePerKwh = document.getElementById("sumPricePerKwh");
  const sumKwh = document.getElementById("sumKwh");
  const sumKwhCovered = document.getElementById("sumKwhCovered");
  const sumZone = document.getElementById("sumZone");
  const sumPanelProduction = document.getElementById("sumPanelProduction");
  const sumPanels = document.getElementById("sumPanels");
  const sumAdditional = document.getElementById("sumAdditional");
  const sumEquipments = document.getElementById("sumEquipments");
  const sumUsage = document.getElementById("sumUsage");
  const sumPhase = document.getElementById("sumPhase");
  const sumBattery = document.getElementById("sumBattery");
  const sumPowerTerm = document.getElementById("sumPowerTerm");

  let roofData = loadStoredJson("roofSelection");
  let questionnaireData = loadStoredJson("contactQuestionnaire");
  let invoiceFile = loadStoredJson("invoiceFile");
  let invoicePhoto = loadStoredJson("invoicePhoto");
  let invoicePdf = loadStoredJson("invoicePdf");

  function renderSummary() {
    if (roofData) {
      sumAddress.textContent = `Morada: ${roofData.address || "não disponível"}`;
      if (roofData.center && typeof roofData.center.lat === "number" && typeof roofData.center.lng === "number") {
        sumCoords.textContent = `Coordenadas: lat ${roofData.center.lat.toFixed(6)}, lon ${roofData.center.lng.toFixed(6)}`;
      }
      sumArea.textContent = `Área do telhado: ${(roofData.areaSqm || 0).toFixed(1)} m²`;
    }

    if (questionnaireData) {
      const additionalLabels = [];
      if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasPool) additionalLabels.push("Piscina");
      if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasAc) additionalLabels.push("Ar condicionado");
      if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasEv) additionalLabels.push("Carro para carregar");
      if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasRadiators) additionalLabels.push("Radiadores elétricos");
      if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasWaterHeater) additionalLabels.push("Esquentador de água elétrico");
      if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasAerotermia) additionalLabels.push("Aerotermia");

      const usageTimeLabel = (() => {
        const value = questionnaireData.additionalInfo && questionnaireData.additionalInfo.usageTime;
        if (!value) return "não disponível";
        if (value === "manhas") return "Manhãs (08h:00-16h:00)";
        if (value === "tardes") return "Tardes (16h:00-00h:00)";
        if (value === "noites") return "Noites (00h:00-08h:00)";
        return "Dia todo";
      })();

      const phaseLabel = (() => {
        const value = questionnaireData.additionalInfo && questionnaireData.additionalInfo.phaseType;
        if (!value) return "não disponível";
        return value === "monofasica" ? "Monofásica" : "Trifásica";
      })();

      const batteryLabel = formatBatterySummary(questionnaireData);

      sumProperty.textContent = `Tipo de imóvel: ${questionnaireData.propertyType || "não disponível"}`;
      sumPrice.textContent = `Preço da luz: ${Number(questionnaireData.priceLight || 0).toFixed(0)}€`;
      if (questionnaireData.pricePerKwh !== undefined && Number.isFinite(Number(questionnaireData.pricePerKwh))) {
        sumPricePerKwh.textContent = `Preço por kWh: ${Number(questionnaireData.pricePerKwh).toFixed(4)}€`;
      } else {
        sumPricePerKwh.textContent = "Preço por kWh: 0.20€";
      }
      sumKwh.textContent = `Consumo mensal (total): ${Number(questionnaireData.monthlyKwhEstimate || 0).toFixed(1)} kWh`;
      sumKwhCovered.textContent = `Consumo mensal: ${Number(questionnaireData.monthlyKwhCoveredEstimate || 0).toFixed(1)} kWh`;
      if (questionnaireData.zoneLabel) {
        sumZone.textContent = `Zona: ${questionnaireData.zoneLabel}`;
      } else {
        sumZone.textContent = "Zona: não disponível";
      }
      if (questionnaireData.panelMonthlyKwh !== undefined && Number.isFinite(Number(questionnaireData.panelMonthlyKwh))) {
        sumPanelProduction.textContent = `Produção média por painel: ${Number(questionnaireData.panelMonthlyKwh).toFixed(0)} kWh/mês`;
      } else {
        sumPanelProduction.textContent = "Produção média por painel: não disponível";
      }
      const fitPanels = Number(questionnaireData.panelsNeeded || 0);
      const idealPanels = Number(questionnaireData.panelsIdeal || 0);
      if (fitPanels > 0 && idealPanels > 0 && fitPanels < idealPanels) {
        sumPanels.textContent = `Painéis necessários: ${fitPanels} (cabem) / ${idealPanels} (ideal)`;
      } else {
        sumPanels.textContent = `Painéis necessários: ${fitPanels} painéis`;
      }
      sumAdditional.textContent = `Informações adicionais: ${additionalLabels.length ? "ver abaixo" : "nenhuma"}`;
      sumEquipments.textContent = `Equipamentos: ${additionalLabels.length ? additionalLabels.join(", ") : "nenhum"}`;
      sumUsage.textContent = `Maior consumo: ${usageTimeLabel}`;
      sumPhase.textContent = `Tipo de contador: ${phaseLabel}`;
      sumBattery.textContent = `Bateria: ${batteryLabel}`;
      if (questionnaireData.powerTerm !== undefined && Number.isFinite(Number(questionnaireData.powerTerm))) {
        sumPowerTerm.textContent = `Termo de potência: ${Number(questionnaireData.powerTerm).toFixed(2)} kVA`;
      } else {
        sumPowerTerm.textContent = "Termo de potência: não disponível";
      }
    }
  }

  async function hydrateUploadsFromIdb() {
    try {
      if (!invoiceFile) {
        const storedInvoice = await idbGet("invoiceFile");
        const storedKind = await idbGet("invoiceKind");
        if (storedInvoice) {
          invoiceFile = storedInvoice;
          const kind = storedKind || storedInvoice.type;
          if (kind === "pdf" || storedInvoice.type === "application/pdf") {
            invoicePdf = storedInvoice;
            invoicePhoto = null;
          } else {
            invoicePhoto = storedInvoice;
            invoicePdf = null;
          }
        }
      }
      if (questionnaireData && !questionnaireData.mapSnapshotBase64) {
        const storedMap = await idbGet("mapSnapshot");
        if (storedMap) {
          questionnaireData.mapSnapshotBase64 = storedMap.dataUrl;
          questionnaireData.mapSnapshotName = storedMap.name;
          questionnaireData.mapSnapshotMime = storedMap.mime;
        }
      }
    } catch (error) {
      console.warn("Falha ao ler anexos do IndexedDB:", error);
    }
    renderSummary();
  }

  renderSummary();
  hydrateUploadsFromIdb();

  backBtn.addEventListener("click", () => {
    window.location.href = "questionario.html";
  });

  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function formatPtNumber(value, decimals = 0) {
    if (!Number.isFinite(value)) return "";
    return value.toFixed(decimals).replace(".", ",");
  }

  function roundToOneDecimal(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round((value + Number.EPSILON) * 10) / 10;
  }

  function formatAddressShort(address) {
    const raw = String(address || "").trim();
    if (!raw) return "";
    const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const shortParts = parts.slice(0, 3);
      const hasPortugal = parts.some((part) => part.toLowerCase().includes("portugal"));
      if (!hasPortugal) {
        shortParts.push("Portugal");
      }
      return shortParts.join(", ");
    }
    return raw.toLowerCase().includes("portugal") ? raw : `${raw}, Portugal`;
  }

  function buildQuestionnaireSummary(questionnaireData, roofData) {
    if (!questionnaireData) return "";
    const lines = [];
    if (roofData && roofData.areaSqm !== undefined) {
      lines.push(`Área do telhado: ${Number(roofData.areaSqm || 0).toFixed(1)} m²`);
    }
    if (questionnaireData.propertyType) lines.push(`Tipo de imóvel: ${questionnaireData.propertyType}`);
    if (questionnaireData.priceLight !== undefined) lines.push(`Preço da luz: ${Number(questionnaireData.priceLight).toFixed(0)}€`);
    if (questionnaireData.pricePerKwh !== undefined && Number.isFinite(Number(questionnaireData.pricePerKwh))) {
      lines.push(`Preço por kWh: ${Number(questionnaireData.pricePerKwh).toFixed(4)}€`);
    }
    if (questionnaireData.zoneLabel) lines.push(`Zona: ${questionnaireData.zoneLabel}`);
    if (questionnaireData.panelMonthlyKwh !== undefined && Number.isFinite(Number(questionnaireData.panelMonthlyKwh))) {
      lines.push(`Produção média por painel: ${Number(questionnaireData.panelMonthlyKwh).toFixed(0)} kWh/mês`);
    }
    if (questionnaireData.powerTerm !== undefined && Number.isFinite(Number(questionnaireData.powerTerm))) {
      lines.push(`Termo de potência: ${Number(questionnaireData.powerTerm).toFixed(2)} kVA`);
    }
    if (questionnaireData.monthlyKwhEstimate) lines.push(`Consumo mensal (total): ${Number(questionnaireData.monthlyKwhEstimate).toFixed(1)} kWh`);
    if (questionnaireData.monthlyKwhCoveredEstimate) lines.push(`Consumo mensal: ${Number(questionnaireData.monthlyKwhCoveredEstimate).toFixed(1)} kWh`);
    if (questionnaireData.monthlyKwpNeeded) {
      const roundedKwp = roundToOneDecimal(Number(questionnaireData.monthlyKwpNeeded));
      lines.push(`kWp necessário: ${roundedKwp.toFixed(1)} kWp`);
    }
    if (questionnaireData.panelsNeeded) {
      const fitPanels = Number(questionnaireData.panelsNeeded);
      const idealPanels = Number(questionnaireData.panelsIdeal);
      if (Number.isFinite(idealPanels) && idealPanels > 0 && fitPanels > 0 && fitPanels < idealPanels) {
        lines.push(`Painéis (cabem/ideal): ${fitPanels}/${idealPanels}`);
      } else {
        lines.push(`Painéis necessários: ${fitPanels}`);
      }
    }

    const usageTime = questionnaireData.additionalInfo && questionnaireData.additionalInfo.usageTime;
    if (usageTime) {
      const label = usageTime === "manhas" ? "Manhãs (08h:00-16h:00)"
        : usageTime === "tardes" ? "Tardes (16h:00-00h:00)"
          : usageTime === "noites" ? "Noites (00h:00-08h:00)"
            : "Dia todo";
      lines.push(`Maior consumo: ${label}`);
    }

    const phaseType = questionnaireData.additionalInfo && questionnaireData.additionalInfo.phaseType;
    if (phaseType) {
      lines.push(`Tipo de contador: ${phaseType === "monofasica" ? "Monofásica" : "Trifásica"}`);
    }

    if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasBattery !== undefined) {
      lines.push(`Bateria: ${formatBatterySummary(questionnaireData)}`);
      lines.push(`Capacidade da bateria: ${formatBatteryCapacity(questionnaireData)}`);
    }

    const extras = [];
    if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasPool) extras.push("Piscina");
    if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasAc) extras.push("Ar condicionado");
    if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasEv) extras.push("Carro para carregar");
    if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasRadiators) extras.push("Radiadores elétricos");
    if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasWaterHeater) extras.push("Esquentador de água elétrico");
    if (questionnaireData.additionalInfo && questionnaireData.additionalInfo.hasAerotermia) extras.push("Aerotermia");
    if (extras.length) lines.push(`Equipamentos: ${extras.join(", ")}`);

    return lines.join("\n");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!invoiceFile) {
      try {
        const storedInvoice = await idbGet("invoiceFile");
        const storedKind = await idbGet("invoiceKind");
        if (storedInvoice) {
          invoiceFile = storedInvoice;
          const kind = storedKind || storedInvoice.type;
          if (kind === "pdf" || storedInvoice.type === "application/pdf") {
            invoicePdf = storedInvoice;
            invoicePhoto = null;
          } else {
            invoicePhoto = storedInvoice;
            invoicePdf = null;
          }
        }
      } catch (error) {
        console.warn("Falha ao carregar fatura do IndexedDB:", error);
      }
    }
    if (questionnaireData && !questionnaireData.mapSnapshotBase64) {
      try {
        const storedMap = await idbGet("mapSnapshot");
        if (storedMap) {
          questionnaireData.mapSnapshotBase64 = storedMap.dataUrl;
          questionnaireData.mapSnapshotName = storedMap.name;
          questionnaireData.mapSnapshotMime = storedMap.mime;
        }
      } catch (error) {
        console.warn("Falha ao carregar mapa do IndexedDB:", error);
      }
    }

    const formData = new FormData(form);
    const clientData = {
      clientName: String(formData.get("clientName") || "").trim(),
      clientEmail: String(formData.get("clientEmail") || "").trim(),
      clientPhone: String(formData.get("clientPhone") || "").trim(),
      clientNif: String(formData.get("clientNif") || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const nifDigits = clientData.clientNif.replace(/\D/g, "");
    clientData.clientNif = nifDigits;

    if (!clientData.clientName || !clientData.clientEmail || !clientData.clientPhone || !clientData.clientNif) {
      statusEl.textContent = "Preenche nome, email, telemóvel e NIF.";
      return;
    }
    if (clientData.clientNif.length !== 9) {
      statusEl.textContent = "O NIF deve ter exatamente 9 dígitos.";
      return;
    }

    const finalData = {
      roof: roofData,
      roofLocation: {
        latitude: (roofData && roofData.center && roofData.center.lat !== undefined) ? roofData.center.lat : null,
        longitude: (roofData && roofData.center && roofData.center.lng !== undefined) ? roofData.center.lng : null
      },
      questionnaire: questionnaireData,
      contact: clientData
    };

    persistJson("quoteRequest", finalData);

    statusEl.textContent = "A enviar pedido...";

    try {
      const addressSummary = formatAddressShort(roofData && roofData.address ? roofData.address : "");
      const questionnaireSummary = buildQuestionnaireSummary(questionnaireData, roofData);
      const primaryInvoice = [invoiceFile, invoicePdf, invoicePhoto].find((item) => item && item.dataUrl);
      const alternativeInvoice = [invoicePdf, invoicePhoto].find((item) => {
        return item
          && item.dataUrl
          && (!primaryInvoice || item.dataUrl !== primaryInvoice.dataUrl);
      });

      const payload = {
        clientName: clientData.clientName,
        clientEmail: clientData.clientEmail,
        clientPhone: clientData.clientPhone,
        clientNif: clientData.clientNif,
        addressSummary,
        questionnaireSummary,
        latitude: (roofData && roofData.center && roofData.center.lat !== undefined) ? roofData.center.lat : null,
        longitude: (roofData && roofData.center && roofData.center.lng !== undefined) ? roofData.center.lng : null,
        invoiceAttachmentBase64: primaryInvoice ? primaryInvoice.dataUrl : null,
        invoiceAttachmentName: primaryInvoice ? primaryInvoice.name : null,
        invoiceAttachmentMime: primaryInvoice ? primaryInvoice.type : null,
        invoiceAttachmentBase64Alt: alternativeInvoice ? alternativeInvoice.dataUrl : null,
        invoiceAttachmentNameAlt: alternativeInvoice ? alternativeInvoice.name : null,
        invoiceAttachmentMimeAlt: alternativeInvoice ? alternativeInvoice.type : null,
        mapSnapshotBase64: questionnaireData && questionnaireData.mapSnapshotBase64 ? questionnaireData.mapSnapshotBase64 : null,
        mapSnapshotName: questionnaireData && questionnaireData.mapSnapshotName ? questionnaireData.mapSnapshotName : null,
        mapSnapshotMime: questionnaireData && questionnaireData.mapSnapshotMime ? questionnaireData.mapSnapshotMime : null,
        mapSnapshotUrl: questionnaireData && questionnaireData.mapSnapshotUrl ? questionnaireData.mapSnapshotUrl : null
      };

      const response = await fetch("/api/quote/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(responseText || `HTTP ${response.status}`);
      }

      const keysToClear = [
        "roofSelection",
        "contactQuestionnaire",
        "invoiceFile",
        "invoicePhoto",
        "invoicePdf",
        "quoteRequest"
      ];
      keysToClear.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
      try {
        await idbDel("invoiceFile");
        await idbDel("invoiceKind");
        await idbDel("mapSnapshot");
      } catch (error) {
        console.warn("Falha ao limpar anexos do IndexedDB:", error);
      }

      statusEl.textContent = "Pedido enviado. A empresa entrará em contacto em breve.";
      setTimeout(() => {
        window.location.href = "geocoding.html";
      }, 1200);
    } catch (error) {
      statusEl.textContent = `Falhou o envio: ${error.message || "erro desconhecido"}`;
      console.error("Erro ao enviar pedido:", error);
    }
  });
