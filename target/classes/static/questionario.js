  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.js";
  }
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

  async function idbSet(key, value) {
    const db = await openLocalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  const clientAddressTitle = document.getElementById("clientAddressTitle");
  const centerText = document.getElementById("centerText");
  const areaText = document.getElementById("areaText");
  const zoneText = document.getElementById("zoneText");
  const form = document.getElementById("questionnaireForm");
  const statusEl = document.getElementById("status");
  const backBtn = document.getElementById("backBtn");
  const priceLight = document.getElementById("priceLight");
  const priceValue = document.getElementById("priceValue");
  const pricePerKwhInput = document.getElementById("pricePerKwh");
  const powerTermInput = document.getElementById("powerTerm");
  const monthlyKwhTotalText = document.getElementById("monthlyKwhTotalText");
  const monthlyKwhCoveredText = document.getElementById("monthlyKwhCoveredText");
  const monthlyKwpText = document.getElementById("monthlyKwpText");
  const panelProductionText = document.getElementById("panelProductionText");
  const panelsNeededText = document.getElementById("panelsNeededText");
  const batteryCapacityText = document.getElementById("batteryCapacityText");
  const powerTermWarning = document.getElementById("powerTermWarning");
  const chartHomeFill = document.getElementById("chartHomeFill");
  const chartHomePct = document.getElementById("chartHomePct");
  const chartGridFill = document.getElementById("chartGridFill");
  const chartGridPct = document.getElementById("chartGridPct");
  const chartSystemFill = document.getElementById("chartSystemFill");
  const chartSystemPct = document.getElementById("chartSystemPct");
  const chartNetworkFill = document.getElementById("chartNetworkFill");
  const chartNetworkPct = document.getElementById("chartNetworkPct");
  const chartBatteryProdRow = document.getElementById("chartBatteryProdRow");
  const chartBatteryUseRow = document.getElementById("chartBatteryUseRow");
  const chartBatteryProdFill = document.getElementById("chartBatteryProdFill");
  const chartBatteryUseFill = document.getElementById("chartBatteryUseFill");
  const chartBatteryProdPct = document.getElementById("chartBatteryProdPct");
  const chartBatteryUsePct = document.getElementById("chartBatteryUsePct");
  const chartHomeCaption = document.getElementById("chartHomeCaption");
  const chartBatteryCaption = document.getElementById("chartBatteryCaption");
  const chartGridCaption = document.getElementById("chartGridCaption");
  const chartSystemCaption = document.getElementById("chartSystemCaption");
  const chartBatteryUseCaption = document.getElementById("chartBatteryUseCaption");
  const chartNetworkCaption = document.getElementById("chartNetworkCaption");
  const openAdditionalInfo = document.getElementById("openAdditionalInfo");
  const additionalInfoText = document.getElementById("additionalInfoText");
  const additionalModal = document.getElementById("additionalModal");
  const additionalTitle = document.getElementById("additionalTitle");
  const closeAdditionalModal = document.getElementById("closeAdditionalModal");
  const additionalNext = document.getElementById("additionalNext");
  const powerTermModal = document.getElementById("powerTermModal");
  const powerTermModalText = document.getElementById("powerTermModalText");
  const powerTermClose = document.getElementById("powerTermClose");
  const invoiceCapture = document.getElementById("invoiceCapture");
  const invoicePdfUpload = document.getElementById("invoicePdfUpload");
  const openInvoiceMenu = document.getElementById("openInvoiceMenu");
  const openInvoicePdf = document.getElementById("openInvoicePdf");
  const openInvoiceCapture = document.getElementById("openInvoiceCapture");
  const invoiceMenu = document.getElementById("invoiceMenu");
  const invoiceStatus = document.getElementById("invoiceStatus");
  const cameraOverlay = document.getElementById("cameraOverlay");
  const cameraPreview = document.getElementById("cameraPreview");
  const cameraCanvas = document.getElementById("cameraCanvas");
  const closeCamera = document.getElementById("closeCamera");
  const capturePhoto = document.getElementById("capturePhoto");
  let cameraStream = null;
  const hasPool = document.getElementById("hasPool");
  const hasAc = document.getElementById("hasAc");
  const hasEv = document.getElementById("hasEv");
  const hasRadiators = document.getElementById("hasRadiators");
  const hasWaterHeater = document.getElementById("hasWaterHeater");
  const hasAerotermia = document.getElementById("hasAerotermia");
  const batteryChoiceInputs = Array.from(document.querySelectorAll('input[name="batteryChoice"]'));
  const phaseTypeInputs = Array.from(document.querySelectorAll('input[name="phaseType"]'));
  const usageTimeInputs = Array.from(document.querySelectorAll('input[name="usageTime"]'));
  const modalSteps = Array.from(document.querySelectorAll(".modal-step"));
  const totalAdditionalSteps = modalSteps.length;
  let currentAdditionalStep = 1;
  let showPowerTermPopup = false;

  let roofData = loadStoredJson("roofSelection");
  let savedQuestionnaire = loadStoredJson("contactQuestionnaire");
  let invoiceFile = loadStoredJson("invoiceFile");
  let invoicePhoto = loadStoredJson("invoicePhoto");
  let invoicePdf = loadStoredJson("invoicePdf");
  const GOOGLE_MAPS_KEY = "AIzaSyDb_0_8iNV8ojyt8nbqXKt7SBVgWGc-qRs";

  if (roofData && !Number.isFinite(roofData.areaSqm) && Number.isFinite(roofData.area)) {
    roofData.areaSqm = roofData.area;
  }

  // Configuração da região (ajusta estes valores conforme o país/região)
  const REGION_LAT_MIN = 36.9;
  const REGION_LAT_MAX = 42.2;
  const REGION_ZONE_COUNT = 4;
  const REGION_ZONE_LABELS = ["Sul", "Centro Sul", "Centro", "Norte"];

  // Produção média mensal por painel (0.53 kWp) em kWh, por zona.
  const ZONE_PANEL_MONTHLY_KWH = {
    "Norte": 67,
    "Centro": 66,
    "Centro Sul": 69,
    "Sul": 77
  };
  const DEFAULT_PANEL_MONTHLY_KWH = 66.25;

  function getLatitudeZone(lat, minLat, maxLat, zoneCount = 3, labels = null) {
    if (!Number.isFinite(lat) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      return null;
    }
    const interval = maxLat - minLat;
    if (interval <= 0 || zoneCount <= 0) {
      return null;
    }
    if (lat < minLat || lat > maxLat) {
      return "Fora da região";
    }

    const step = interval / zoneCount;
    const zoneIndex = Math.min(zoneCount - 1, Math.floor((lat - minLat) / step));

    if (Array.isArray(labels) && labels.length === zoneCount) {
      return labels[zoneIndex] || "Zona";
    }
    if (zoneCount === 3) {
      return ["Sul", "Centro", "Norte"][zoneIndex] || "Zona";
    }
    return `Zona ${zoneIndex + 1}`;
  }

  let map = null;
  let overlayView = null;
  let roofPolygon = null;
  let roofMarker = null;
  let panelPolygons = [];
  let panelPolygonsLatLng = [];

  let currentZoneLabel = null;
  let lastPanelsNeeded = 0;

  if (!roofData || !roofData.center || !Array.isArray(roofData.points) || roofData.points.length < 3) {
    statusEl.textContent = "Não encontrámos seleção de telhado. Volta ao passo anterior.";
    clientAddressTitle.textContent = "Sem morada";
  } else {
    const selectedAddress = roofData.address || "não disponível";
    clientAddressTitle.textContent = selectedAddress;
    centerText.textContent = `Centro: lat ${roofData.center.lat.toFixed(6)}, lon ${roofData.center.lng.toFixed(6)}`;
    areaText.textContent = `Área estimada: ${(roofData.areaSqm || 0).toFixed(1)} m²`;
    currentZoneLabel = getLatitudeZone(
      roofData.center.lat,
      REGION_LAT_MIN,
      REGION_LAT_MAX,
      REGION_ZONE_COUNT,
      REGION_ZONE_LABELS
    );
    zoneText.textContent = currentZoneLabel ? `Zona: ${currentZoneLabel}` : "Zona: configure latitudes";
  }

  function initQuestionnaireMap() {
    map = new google.maps.Map(document.getElementById("roofPreview"), {
      center: { lat: 38.7223, lng: -9.1393 },
      zoom: 12,
      mapTypeId: "satellite",
      disableDefaultUI: true,
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
      keyboardShortcuts: false,
      gestureHandling: "none"
    });

    overlayView = new google.maps.OverlayView();
    overlayView.onAdd = function () {};
    overlayView.draw = function () {};
    overlayView.setMap(map);

    if (!roofData || !roofData.center || !Array.isArray(roofData.points) || roofData.points.length < 3) {
      return;
    }

    const path = roofData.points.map((point) => ({ lat: point.lat, lng: point.lng }));
    roofPolygon = new google.maps.Polygon({
      paths: path,
      strokeColor: "#14b8a6",
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: "#14b8a6",
      fillOpacity: 0.35,
      clickable: false
    });
    roofPolygon.setMap(map);

    roofMarker = new google.maps.Marker({
      position: { lat: roofData.center.lat, lng: roofData.center.lng },
      map,
      clickable: false
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
    google.maps.event.addListenerOnce(map, "idle", () => updatePanelOverlay(lastPanelsNeeded));
  }

  backBtn.addEventListener("click", () => {
    window.location.href = "geocoding.html";
  });

  function getAdditionalCount() {
    return [
      hasPool.checked,
      hasAc.checked,
      hasEv.checked,
      hasRadiators.checked,
      hasWaterHeater.checked,
      hasAerotermia.checked
    ].filter(Boolean).length;
  }

  function selectedAdditionalLabels() {
    const labels = [];
    if (hasPool.checked) labels.push("Piscina");
    if (hasAc.checked) labels.push("Ar condicionado");
    if (hasEv.checked) labels.push("Carro para carregar");
    if (hasRadiators.checked) labels.push("Radiadores elétricos");
    if (hasWaterHeater.checked) labels.push("Esquentador de água elétrico");
    if (hasAerotermia.checked) labels.push("Aerotermia");
    return labels;
  }

  function getBatteryLabel() {
    const selected = batteryChoiceInputs.find((input) => input.checked);
    if (!selected) return null;
    if (selected.value !== "sim") return "Não";
    const capacity = getBatteryCapacityKwh(lastPanelsNeeded);
    if (!capacity) {
      const panelInfo = lastPanelsNeeded ? ` (${lastPanelsNeeded} painéis)` : "";
      return `Sem bateria${panelInfo}`;
    }
    return `Sim (${capacity} kWh)`;
  }

  function getPhaseTypeLabel() {
    const selected = phaseTypeInputs.find((input) => input.checked);
    if (!selected) return null;
    return selected.value === "monofasica" ? "Monofásica" : "Trifásica";
  }

  function getUsageTimeLabel() {
    const selected = usageTimeInputs.find((input) => input.checked);
    if (!selected) return null;
    switch (selected.value) {
      case "manhas":
        return "Manhãs (08h:00-16h:00)";
      case "tardes":
        return "Tardes (16h:00-00h:00)";
      case "noites":
        return "Noites (00h:00-08h:00)";
      default:
        return "Dia todo";
    }
  }

  function panelsFromKwp(kwp) {
    if (!Number.isFinite(kwp) || kwp <= 0) return 0;
    if (kwp <= 1.1) return 2;
    if (kwp <= 2.1) return 4;
    if (kwp <= 3.2) return 6;
    if (kwp <= 4.2) return 8;
    if (kwp <= 5.3) return 10;
    if (kwp <= 6.4) return 12;
    if (kwp <= 7.4) return 14;
    if (kwp <= 8.5) return 16;
    if (kwp <= 10.6) return 20;
    if (kwp <= 11.7) return 22;
    if (kwp <= 13.8) return 26;
    return 26;
  }

  function getBatteryCapacityKwh(panelsCount) {
    if (!Number.isFinite(panelsCount) || panelsCount <= 0) return null;
    if (panelsCount <= 2) return 0;
    if (panelsCount <= 8) return 5;
    if (panelsCount <= 12) return 10;
    if (panelsCount <= 16) return 15;
    if (panelsCount <= 22) return 20;
    if (panelsCount <= 26) return 25;
    return 25;
  }

  function roundToOneDecimal(value) {
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    const thousand = Math.floor((value + Number.EPSILON) * 1000);
    const base = Math.floor(thousand / 100); // base at 1 decimal, as integer (e.g. 2.1 -> 21)
    const remainder = thousand - base * 100; // 0..99 (represents 0.00..0.099)
    return remainder > 40 ? (base + 1) / 10 : base / 10;
  }

  function requiredKvaFromKwp(kwp) {
    if (!Number.isFinite(kwp) || kwp <= 0) return null;
    const inverterPowerKw = kwp / 1.2;
    return inverterPowerKw / 0.9;
  }

  function renderAdditionalSummary() {
    const labels = selectedAdditionalLabels();
    const phaseLabel = getPhaseTypeLabel();
    const usageLabel = getUsageTimeLabel();
    const batteryLabel = getBatteryLabel();
    const parts = [];
    if (labels.length > 0) {
      parts.push(`Consumos: ${labels.join(", ")} (+${labels.length} painel/painéis)`);
    }
    if (phaseLabel) {
      parts.push(`Luz: ${phaseLabel}`);
    }
    if (batteryLabel) {
      parts.push(`Bateria: ${batteryLabel}`);
    }
    if (usageLabel) {
      parts.push(`Mais consumo: ${usageLabel}`);
    }
    additionalInfoText.textContent = parts.length
      ? parts.join(" | ")
      : "Sem consumos adicionais selecionados.";
  }

  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function renderPriceSlider() {
    const min = Number(priceLight.min);
    const max = Number(priceLight.max);
    const value = Number(priceLight.value);
    const percent = ((value - min) / (max - min)) * 100;
    priceLight.style.background = `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${percent}%, #d1d5db ${percent}%, #d1d5db 100%)`;
    priceValue.textContent = `${value}€`;

    const pricePerKwhRaw = Number(String(pricePerKwhInput.value || "").replace(",", "."));
    const pricePerKwh = Number.isFinite(pricePerKwhRaw) && pricePerKwhRaw > 0 ? pricePerKwhRaw : 0.20;
    const powerTermRaw = Number(String(powerTermInput.value || "").replace(",", "."));
    const powerTerm = Number.isFinite(powerTermRaw) && powerTermRaw > 0 ? powerTermRaw : null;
    const panelPower = 0.53;
    const productionPerPanel = ZONE_PANEL_MONTHLY_KWH[currentZoneLabel] ?? DEFAULT_PANEL_MONTHLY_KWH;
    const usageTime = usageTimeInputs.find((input) => input.checked)?.value || null;
    const usageFactor = usageTime === "manhas" ? 0.71 : usageTime === "tardes" ? 0.88 : usageTime === "noites" ? 0.28 : 0.61;
    const wantsBattery = batteryChoiceInputs.find((input) => input.checked)?.value === "sim";
    const batteryEfficiency = 0.9;
    const inverterEfficiency = 0.95;
    const batteryUseEfficiency = batteryEfficiency * inverterEfficiency;

    const monthlyKwhTotal = value / pricePerKwh;
    const monthlyKwhCovered = monthlyKwhTotal * usageFactor;
    const monthlyKwhForPanels = wantsBattery ? monthlyKwhTotal : monthlyKwhCovered;
    const requiredKwp = (monthlyKwhForPanels / productionPerPanel) * panelPower;
    const requiredKwpRounded = roundToOneDecimal(requiredKwp);
    let panelsNeeded = panelsFromKwp(requiredKwpRounded) + getAdditionalCount();
    if (panelsNeeded % 2 !== 0) {
      panelsNeeded += 1;
    }

    monthlyKwhTotalText.textContent = `${monthlyKwhTotal.toFixed(1)} kWh`;
    monthlyKwhCoveredText.textContent = `${monthlyKwhCovered.toFixed(1)} kWh`;
    const monthlyKwpRaw = panelsNeeded * panelPower;
    const monthlyKwpAdjusted = monthlyKwpRaw / 1.2;
    monthlyKwpText.textContent = `${requiredKwpRounded.toFixed(1)} kWp`;
    panelProductionText.textContent = `${productionPerPanel.toFixed(0)} kWh/mês`;
    panelsNeededText.textContent = `${panelsNeeded} painéis`;
    if (batteryCapacityText) {
      const capacity = wantsBattery ? getBatteryCapacityKwh(panelsNeeded) : 0;
      batteryCapacityText.textContent = capacity > 0 ? `${capacity} kWh` : "Sem bateria";
    }
    lastPanelsNeeded = panelsNeeded;
    updatePanelOverlay(panelsNeeded);
    renderAdditionalSummary();

    const productionMonthly = productionPerPanel * panelsNeeded;
    const alignmentFactor = 0.85; // 85% eficiência temporal (ajustável)

    // --- CONSUMO ---
    const consumoTotal = monthlyKwhTotal;
    const consumoSolar = monthlyKwhCovered;
    const consumoNoite = consumoTotal - consumoSolar;

    // --- DIRETO ---
    const homeFromTotal = Math.min(productionMonthly, consumoSolar * alignmentFactor);

    // --- EXCEDENTE ---
    const excedente = Math.max(0, productionMonthly - homeFromTotal);

    // --- BATERIA (FIX REALISTA) ---
    const productionDaily = productionMonthly / 30;
    const consumoSolarDaily = consumoSolar / 30;

    const excedenteDaily = Math.max(0, productionDaily - consumoSolarDaily);

    const capacityPerDay = wantsBattery ? getBatteryCapacityKwh(panelsNeeded) || 0 : 0;
    const capacidadeDia = wantsBattery ? capacityPerDay : 0;

    const bateriaDaily = Math.min(capacidadeDia, excedenteDaily);

    const batteryCharge = wantsBattery ? Math.min(excedente, bateriaDaily * 30) : 0;

    const batteryFromTotal = wantsBattery ? Math.min(batteryCharge * batteryUseEfficiency, consumoNoite) : 0;

    // --- REDE ---
    const gridFromTotal = Math.max(0, consumoTotal - homeFromTotal - batteryFromTotal);

    // --- EXPORTAÇÃO ---
    const gridFromCovered = Math.max(0, excedente - batteryCharge);

    // --- PRODUÇÃO DISTRIBUIÇÃO ---
    const homeFromCovered = homeFromTotal;
    // Para o gráfico de produção, mostramos a energia efetivamente utilizada (já com perdas).
    const batteryFromCovered = batteryFromTotal;

    // --- BASES ---
    const coveredBase = homeFromCovered + batteryFromCovered + gridFromCovered;
    const totalBase = consumoTotal;

    // --- PERCENTAGENS PRODUÇÃO ---
    const homeCoveredPct = coveredBase ? (homeFromCovered / coveredBase) * 100 : 0;
    const batteryProdPct = coveredBase ? (batteryFromCovered / coveredBase) * 100 : 0;
    const gridCoveredPct = coveredBase ? (gridFromCovered / coveredBase) * 100 : 0;

    // --- PERCENTAGENS CONSUMO ---
    const systemPct = totalBase ? (homeFromTotal / totalBase) * 100 : 0;
    const batteryUsePct = totalBase ? (batteryFromTotal / totalBase) * 100 : 0;
    const networkPct = totalBase ? (gridFromTotal / totalBase) * 100 : 0;

    if (chartBatteryProdRow) {
      chartBatteryProdRow.style.display = wantsBattery ? "grid" : "none";
    }
    if (chartBatteryUseRow) {
      chartBatteryUseRow.style.display = wantsBattery ? "grid" : "none";
    }

    if (chartHomeFill && chartGridFill && chartSystemFill && chartNetworkFill) {
      chartHomeFill.style.width = `${homeCoveredPct.toFixed(1)}%`;
      if (chartBatteryProdFill) {
        chartBatteryProdFill.style.width = `${batteryProdPct.toFixed(1)}%`;
      }
      chartGridFill.style.width = `${gridCoveredPct.toFixed(1)}%`;
      chartSystemFill.style.width = `${systemPct.toFixed(1)}%`;
      if (chartBatteryUseFill) {
        chartBatteryUseFill.style.width = `${batteryUsePct.toFixed(1)}%`;
      }
      chartNetworkFill.style.width = `${networkPct.toFixed(1)}%`;
    }
    if (chartHomePct && chartGridPct && chartSystemPct && chartNetworkPct) {
      chartHomePct.textContent = `${homeCoveredPct.toFixed(0)}%`;
      if (chartBatteryProdPct) {
        chartBatteryProdPct.textContent = `${batteryProdPct.toFixed(0)}%`;
      }
      chartGridPct.textContent = `${gridCoveredPct.toFixed(0)}%`;
      chartSystemPct.textContent = `${systemPct.toFixed(0)}%`;
      if (chartBatteryUsePct) {
        chartBatteryUsePct.textContent = `${batteryUsePct.toFixed(0)}%`;
      }
      chartNetworkPct.textContent = `${networkPct.toFixed(0)}%`;
    }
    if (chartHomeCaption) {
      chartHomeCaption.textContent = `${homeFromCovered.toFixed(0)} kWh para a habitação`;
    }
    if (chartBatteryCaption) {
      chartBatteryCaption.textContent = `${batteryFromCovered.toFixed(0)} kWh para a bateria`;
      chartBatteryCaption.style.display = wantsBattery ? "block" : "none";
    }
    if (chartGridCaption) {
      chartGridCaption.textContent = `${gridFromCovered.toFixed(0)} kWh para a rede`;
    }
    if (chartSystemCaption) {
      chartSystemCaption.textContent = `${homeFromTotal.toFixed(0)} kWh do sistema`;
    }
    if (chartBatteryUseCaption) {
      chartBatteryUseCaption.textContent = `${batteryFromTotal.toFixed(0)} kWh da bateria`;
      chartBatteryUseCaption.style.display = wantsBattery ? "block" : "none";
    }
    if (chartNetworkCaption) {
      chartNetworkCaption.textContent = `${gridFromTotal.toFixed(0)} kWh da rede`;
    }

    if (powerTermWarning) {
      const requiredKva = requiredKvaFromKwp(requiredKwpRounded);
      if (powerTerm && requiredKva && powerTerm < requiredKva) {
        powerTermWarning.textContent = "O termo de potência pode ser insuficiente para esta instalação.";
        if (showPowerTermPopup && powerTermModal && powerTermModalText) {
          powerTermModalText.textContent = "Aumentar o termo de potência.";
          powerTermModal.classList.add("open");
        }
      } else {
        powerTermWarning.textContent = "";
      }
    }
    showPowerTermPopup = false;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distancePointToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
    const clamped = Math.min(1, Math.max(0, t));
    const projX = a.x + clamped * dx;
    const projY = a.y + clamped * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  }

  function minDistanceToEdges(point, polygon) {
    let min = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const dist = distancePointToSegment(point, polygon[i], polygon[j]);
      if (dist < min) min = dist;
    }
    return min;
  }

  function canPlaceRect(center, width, height, polygon, margin = 0) {
    const halfW = width / 2;
    const halfH = height / 2;
    const corners = [
      { x: center.x - halfW, y: center.y - halfH },
      { x: center.x + halfW, y: center.y - halfH },
      { x: center.x + halfW, y: center.y + halfH },
      { x: center.x - halfW, y: center.y + halfH }
    ];
    return corners.every((corner) => {
      if (!pointInPolygon(corner, polygon)) return false;
      return minDistanceToEdges(corner, polygon) >= margin;
    });
  }

  function polygonAreaPx(points) {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    return Math.abs(area / 2);
  }

  function getPolygonCenter(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  function rotatePoint(point, angle, origin) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    return {
      x: origin.x + dx * cos - dy * sin,
      y: origin.y + dx * sin + dy * cos
    };
  }

  function encodeNumber(value) {
    let v = value < 0 ? ~(value << 1) : (value << 1);
    let encoded = "";
    while (v >= 0x20) {
      encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    encoded += String.fromCharCode(v + 63);
    return encoded;
  }

  function encodePolyline(points) {
    let lastLat = 0;
    let lastLng = 0;
    let result = "";
    points.forEach((point) => {
      const lat = Math.round(point.lat * 1e5);
      const lng = Math.round(point.lng * 1e5);
      const dLat = lat - lastLat;
      const dLng = lng - lastLng;
      lastLat = lat;
      lastLng = lng;
      result += encodeNumber(dLat) + encodeNumber(dLng);
    });
    return result;
  }

  function buildPathParam(options, points) {
    if (!points || !points.length) return null;
    const encoded = encodePolyline(points);
    const segments = [];
    if (options.fillColor) segments.push(`fillcolor:${options.fillColor}`);
    if (options.color) segments.push(`color:${options.color}`);
    if (options.weight !== undefined) segments.push(`weight:${options.weight}`);
    segments.push(`enc:${encoded}`);
    return segments.join("|");
  }

  function buildStaticMapUrl() {
    if (!map || !roofData || !roofData.center || !Array.isArray(roofData.points) || roofData.points.length < 3) {
      return null;
    }
    const center = map.getCenter();
    const zoom = map.getZoom();
    const params = [];
    params.push(`center=${center.lat()},${center.lng()}`);
    params.push(`zoom=${zoom}`);
    params.push("size=640x400");
    params.push("scale=2");
    params.push("maptype=satellite");
    params.push(`key=${GOOGLE_MAPS_KEY}`);

    const roofPath = buildPathParam(
      { color: "0x14b8a6ff", fillColor: "0x14b8a655", weight: 2 },
      roofData.points.map((point) => ({ lat: point.lat, lng: point.lng }))
    );
    if (roofPath) {
      params.push(`path=${encodeURIComponent(roofPath)}`);
    }

    if (panelPolygonsLatLng.length) {
      const panelOptions = { color: "0x0b0b0bff", fillColor: "0x0b0b0bb3", weight: 1 };
      panelPolygonsLatLng.forEach((panel) => {
        const panelPath = buildPathParam(panelOptions, panel);
        if (panelPath) {
          params.push(`path=${encodeURIComponent(panelPath)}`);
        }
      });
    }

    let url = `https://maps.googleapis.com/maps/api/staticmap?${params.join("&")}`;
    if (url.length > 8000 && panelPolygonsLatLng.length) {
      const reduced = panelPolygonsLatLng.slice(0, Math.max(10, Math.floor(panelPolygonsLatLng.length / 2)));
      const reducedParams = params.filter((param) => !param.startsWith("path=") || param.includes("14b8a6"));
      reduced.forEach((panel) => {
        const panelPath = buildPathParam({ color: "0x0b0b0bff", fillColor: "0x0b0b0bb3", weight: 1 }, panel);
        if (panelPath) {
          reducedParams.push(`path=${encodeURIComponent(panelPath)}`);
        }
      });
      url = `https://maps.googleapis.com/maps/api/staticmap?${reducedParams.join("&")}`;
    }

    return url;
  }

  async function generateMapSnapshot() {
    const url = buildStaticMapUrl();
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      return {
        dataUrl,
        name: "mapa-telhado.png",
        mime: blob.type || "image/png"
      };
    } catch (error) {
      console.error("Erro ao gerar mapa estático:", error);
      return null;
    }
  }

  function getPolygonOrientation(points) {
    if (!points || points.length < 2) return 0;
    let maxLen = 0;
    let bestAngle = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      const len = Math.hypot(dx, dy);
      if (len > maxLen) {
        maxLen = len;
        bestAngle = Math.atan2(dy, dx);
      }
    }
    return bestAngle;
  }

  function getMapSize() {
    if (!map) return { x: 0, y: 0 };
    const rect = map.getDiv().getBoundingClientRect();
    return { x: rect.width, y: rect.height };
  }

  function getPanelPixelSize(polygonPoints) {
    const roofAreaSqm = Number(roofData && roofData.areaSqm);
    const areaPx = polygonAreaPx(polygonPoints);
    if (!Number.isFinite(roofAreaSqm) || roofAreaSqm <= 0 || areaPx <= 0) {
      return null;
    }
    const pxPerMeter = Math.sqrt(areaPx / roofAreaSqm);
    const panelWidthMeters = 2.278;
    const panelHeightMeters = 1.134;
    const gapMeters = 0.025;
    return {
      width: Math.max(10, panelWidthMeters * pxPerMeter),
      height: Math.max(6, panelHeightMeters * pxPerMeter),
      gap: Math.max(2, gapMeters * pxPerMeter)
    };
  }

  function buildPanelPositions(polygonPoints, count, angle) {
    if (!polygonPoints || polygonPoints.length < 3 || count <= 0) {
      return [];
    }
    const fallback = (() => {
      const mapSize = getMapSize();
      const baseWidth = Math.max(10, Math.round(mapSize.x / 42));
      const baseHeight = Math.max(6, Math.round(baseWidth * 0.62));
      const baseGap = Math.max(2, Math.round(baseWidth * 0.2));
      return { width: baseWidth, height: baseHeight, gap: baseGap };
    })();
    const realSize = getPanelPixelSize(polygonPoints);
    const base = realSize || fallback;
    let best = [];
    const orientations = [
      { width: base.width, height: base.height },
      { width: base.height, height: base.width }
    ];
    const offsetSteps = [0, 0.33, 0.66];

    const origin = getPolygonCenter(polygonPoints);
    const rotation = Number.isFinite(angle) ? angle : 0;
    const rotatedPolygon = polygonPoints.map((point) => rotatePoint(point, -rotation, origin));

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    rotatedPolygon.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    for (const orient of orientations) {
      const width = orient.width;
      const height = orient.height;
      const gap = base.gap;
      const stepX = width + gap;
      const stepY = height + gap;

      for (const ox of offsetSteps) {
        for (const oy of offsetSteps) {
          const startX = minX + width / 2 + stepX * ox;
          const startY = minY + height / 2 + stepY * oy;
          const placed = [];

          for (let y = startY; y <= maxY - height / 2; y += stepY) {
            for (let x = startX; x <= maxX - width / 2; x += stepX) {
              if (canPlaceRect({ x, y }, width, height, rotatedPolygon, base.gap)) {
                const worldCenter = rotatePoint({ x, y }, rotation, origin);
                placed.push({ x: worldCenter.x, y: worldCenter.y, width, height, angle: rotation });
                if (placed.length >= count) break;
              }
            }
            if (placed.length >= count) break;
          }
          if (placed.length >= count) {
            return placed;
          }
          if (placed.length > best.length) {
            best = placed;
          }
        }
      }
    }
    return best;
  }

  function clearPanelOverlay() {
    panelPolygons.forEach((polygon) => polygon.setMap(null));
    panelPolygons = [];
  }

  function updatePanelOverlay(panelsNeeded) {
    if (!map || !overlayView) return;
    if (!roofData || !Array.isArray(roofData.points) || roofData.points.length < 3) {
      clearPanelOverlay();
      return;
    }
    if (!Number.isFinite(panelsNeeded) || panelsNeeded <= 0) {
      clearPanelOverlay();
      return;
    }
    const projection = overlayView.getProjection();
    if (!projection) {
      google.maps.event.addListenerOnce(map, "idle", () => updatePanelOverlay(panelsNeeded));
      return;
    }
    const polygonPoints = roofData.points
      .map((point) => projection.fromLatLngToDivPixel(new google.maps.LatLng(point.lat, point.lng)))
      .map((point) => ({ x: point.x, y: point.y }));
    if (polygonPoints.length < 3) {
      clearPanelOverlay();
      return;
    }
    const angle = getPolygonOrientation(polygonPoints);
    const positions = buildPanelPositions(polygonPoints, panelsNeeded, angle);
    clearPanelOverlay();
    panelPolygonsLatLng = [];

    positions.forEach((pos) => {
      const halfW = pos.width / 2;
      const halfH = pos.height / 2;
      const relCorners = [
        { x: -halfW, y: -halfH },
        { x: halfW, y: -halfH },
        { x: halfW, y: halfH },
        { x: -halfW, y: halfH }
      ];
      const corners = relCorners.map((corner) => {
        const rotated = rotatePoint(
          { x: pos.x + corner.x, y: pos.y + corner.y },
          pos.angle || 0,
          { x: pos.x, y: pos.y }
        );
        return projection.fromDivPixelToLatLng(new google.maps.Point(rotated.x, rotated.y));
      });
      const path = corners.map((corner) => ({ lat: corner.lat(), lng: corner.lng() }));
      const panel = new google.maps.Polygon({
        paths: path,
        strokeColor: "#0b0b0b",
        strokeOpacity: 1,
        strokeWeight: 1,
        fillColor: "#0b0b0b",
        fillOpacity: 0.7,
        clickable: false
      });
      panel.setMap(map);
      panelPolygons.push(panel);
      panelPolygonsLatLng.push(path);
    });
  }

  openAdditionalInfo.addEventListener("click", () => {
    additionalModal.classList.add("open");
    setAdditionalStep(1);
  });

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function parseEuroValue(text) {
    const cleaned = text.replace(/\s/g, "");
    const match = cleaned.match(/(\d+[.,]\d{2})\s*€?/);
    if (!match) return null;
    return Number(match[1].replace(",", "."));
  }

  function extractValuesFromOcr(rawText) {
    const text = rawText.replace(/\s+/g, " ").trim();
    const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    const unitPriceCandidates = [];
    const baseUnitPriceCandidates = [];
    const basePriceCandidates = [];
    const discountedPriceCandidates = [];
    const totalCandidates = [];
    const totalCandidatesNoDiscount = [];
    let summedEnergyTotal = 0;
    let summedEnergyKwh = 0;
    let unitPriceFromLines = null;

    const unitRegex = /(\d+[.,]\d+)\s*(€\s*\/\s*kwh|eur\s*\/\s*kwh|€\s*kwh)/i;
    const kwhQtyRegex = /(\d+[.,]\d+)\s*kwh/i;
    const euroRegex = /(\d+[.,]\d{2})\s*€/i;
    const priceInTableRegex = /(\d+[.,]\d+)\s*€\s*(?=\s*\d+[.,]\d{2}\s*€)/i;
    const basePriceLineRegex = /preço\s*base/i;
    const totalValorBaseRegex = /total\s+valor\s+base/i;
    const energyHeaderRegex = /(consumo\s+real|termo\s+de\s+energia|tarifa\s+social)/i;
    const energyBlockEndRegex = /(potência\s+contratada|taxas\s+e\s+impostos|total\s+luz|total\s+da\s+fatura)/i;
    const powerTermRegex = /(termo\s+de\s+pot[eê]ncia|pot[eê]ncia)/i;
    const powerKvaRegex = /(\d+[.,]\d+)\s*k\s*va/i;
    let inEnergyBlock = false;

    function normalizeLine(rawLine) {
      return rawLine
        .replace(/O(?=\\d)/g, "0")
        .replace(/l(?=\\d)/g, "1")
        .replace(/I(?=\\d)/g, "1");
    }

    let powerTermValue = null;
    for (const rawLine of lines) {
      const line = normalizeLine(rawLine);
      const lower = line.toLowerCase();
      if (energyHeaderRegex.test(lower)) {
        inEnergyBlock = true;
      } else if (energyBlockEndRegex.test(lower)) {
        inEnergyBlock = false;
      }
      const unitMatch = line.match(unitRegex);
      if (unitMatch) {
        unitPriceCandidates.push(Number(unitMatch[1].replace(",", ".")));
      }

      if (line.toLowerCase().includes("kwh")) {
        const lowerInline = line.toLowerCase();
        const hasDiscountInline = ["desconto", "desc."].some((k) => lowerInline.includes(k));
        const unitAll = Array.from(line.matchAll(/(\d+[.,]\d+)\s*€\s*\/\s*kwh/ig)).map((m) => Number(m[1].replace(",", ".")));
        if (!hasDiscountInline && unitAll.length) {
          baseUnitPriceCandidates.push(unitAll[0]);
        }
      }

      const euroMatches = Array.from(line.matchAll(/(\d+[.,]\d{2})\s*€/ig)).map((m) => Number(m[1].replace(",", ".")));
      const euroValue = euroMatches.length ? euroMatches[euroMatches.length - 1] : null;
      const kwhMatch = line.match(kwhQtyRegex);
      const kwhValue = kwhMatch ? Number(kwhMatch[1].replace(",", ".")) : null;
      const priceInTableMatch = line.match(priceInTableRegex);
      const priceInTable = priceInTableMatch ? Number(priceInTableMatch[1].replace(",", ".")) : null;
      const powerKvaMatch = line.match(powerKvaRegex);
      if (!powerTermValue && powerKvaMatch && (powerTermRegex.test(lower) || lower.includes("kva"))) {
        powerTermValue = Number(powerKvaMatch[1].replace(",", "."));
      }

      if (euroValue !== null) {
        const isEnergyLine = ["termo de energia", "energia (real)", "energia real", "energia", "consumo real"].some((k) => lower.includes(k)) || inEnergyBlock;
        const hasTax = ["iva", "imposto", "taxa", "contrib"].some((k) => lower.includes(k));
        const isTotal = ["total", "subtotal"].some((k) => lower.includes(k));
        const hasDiscount = ["desconto", "desc."].some((k) => lower.includes(k));
        const hasBase = ["base", "preço base", "preco base"].some((k) => lower.includes(k));
        const isPowerLine = ["kva", "potencia", "potência", "dias"].some((k) => lower.includes(k));

        if (isEnergyLine && !hasDiscount) {
          if (unitMatch) {
            unitPriceCandidates.push(Number(unitMatch[1].replace(",", ".")));
          } else if (priceInTable) {
            unitPriceCandidates.push(priceInTable);
          }
        }

        if (totalValorBaseRegex.test(lower) && isEnergyLine && !hasDiscount) {
          totalCandidatesNoDiscount.push(euroValue);
          totalCandidates.push(euroValue);
        }

        if (isEnergyLine && !hasTax && !isTotal && !hasDiscount) {
          basePriceCandidates.push(euroValue);
        }
        if (hasDiscount) {
          discountedPriceCandidates.push(euroValue);
        }
        if (isEnergyLine && !hasTax && isTotal && !hasDiscount) {
          totalCandidatesNoDiscount.push(euroValue);
          totalCandidates.push(euroValue);
        }

        if (((isEnergyLine && !hasTax) || inEnergyBlock) && !isPowerLine && kwhValue && !hasDiscount) {
          summedEnergyKwh += kwhValue;

          const lineTotals = euroMatches.filter((value) => value >= 1);
          if (lineTotals.length) {
            summedEnergyTotal += Math.max(...lineTotals);
          } else if (euroValue) {
            summedEnergyTotal += euroValue;
          }

          const lineUnitCandidates = euroMatches.filter((value) => value > 0 && value < 1);
          if (!unitPriceFromLines && lineUnitCandidates.length) {
            unitPriceFromLines = Math.min(...lineUnitCandidates);
          }

          if (!unitPriceFromLines && priceInTable) {
            unitPriceFromLines = priceInTable;
          }
        }

        if (kwhValue && unitMatch) {
          const computed = kwhValue * Number(unitMatch[1].replace(",", "."));
          totalCandidates.push(computed);
        }
      }
    }

    let pricePerKwh = baseUnitPriceCandidates.length ? Math.max(...baseUnitPriceCandidates) : null;
    if (!pricePerKwh && unitPriceCandidates.length) {
      pricePerKwh = Math.max(...unitPriceCandidates);
    }
    if (!pricePerKwh && unitPriceFromLines) {
      pricePerKwh = unitPriceFromLines;
    }
    let priceLight = null;
    if (totalCandidatesNoDiscount.length) {
      priceLight = Math.max(...totalCandidatesNoDiscount);
    } else if (totalCandidates.length) {
      priceLight = Math.max(...totalCandidates);
    } else if (summedEnergyTotal > 0) {
      priceLight = summedEnergyTotal;
    } else if (basePriceCandidates.length) {
      priceLight = Math.max(...basePriceCandidates);
    }

    if (!pricePerKwh && summedEnergyTotal > 0 && summedEnergyKwh > 0) {
      pricePerKwh = summedEnergyTotal / summedEnergyKwh;
    }

    if (!pricePerKwh) {
      const fallback = text.match(unitRegex);
      pricePerKwh = fallback ? Number(fallback[1].replace(",", ".")) : null;
    }

    if (!powerTermValue) {
      const powerTextMatch = text.match(powerKvaRegex);
      if (powerTextMatch) {
        powerTermValue = Number(powerTextMatch[1].replace(",", "."));
      }
    }

    return { pricePerKwh, priceLight, powerTermValue };
  }

  async function handleInvoiceFile(file) {
    if (!file) return;
    invoiceStatus.textContent = "A ler fatura…";

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      invoiceFile = {
        name: file.name,
        type: file.type,
        dataUrl
      };
      persistJson("invoiceFile", invoiceFile);
      try {
        await idbSet("invoiceFile", invoiceFile);
        await idbSet("invoiceKind", file.type === "application/pdf" ? "pdf" : "photo");
      } catch (error) {
        console.warn("Falha ao guardar fatura em IndexedDB:", error);
      }
    if (file.type === "application/pdf") {
      invoicePdf = invoiceFile;
      invoicePhoto = null;
      persistJson("invoicePdf", invoicePdf);
      sessionStorage.removeItem("invoicePhoto");
      localStorage.removeItem("invoicePhoto");
    } else {
      invoicePhoto = invoiceFile;
      invoicePdf = null;
      persistJson("invoicePhoto", invoicePhoto);
      sessionStorage.removeItem("invoicePdf");
      localStorage.removeItem("invoicePdf");
    }

      try {
        let rawText = "";
        if (file.type === "application/pdf") {
          const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i += 1) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map((item) => item.str).join(" "));
          }
          rawText = pages.join(" ");
        } else {
          const result = await Tesseract.recognize(file, "por+eng");
          rawText = result.data && result.data.text ? result.data.text : "";
        }
        const extracted = extractValuesFromOcr(rawText);
        let applied = false;

        if (Number.isFinite(extracted.pricePerKwh) && extracted.pricePerKwh > 0) {
          pricePerKwhInput.value = extracted.pricePerKwh.toFixed(4);
          applied = true;
        }
        if (Number.isFinite(extracted.powerTermValue) && extracted.powerTermValue > 0) {
          powerTermInput.value = extracted.powerTermValue.toFixed(2);
          applied = true;
        }
        if (Number.isFinite(extracted.priceLight) && extracted.priceLight > 0) {
          const value = clamp(Math.round(extracted.priceLight), Number(priceLight.min), Number(priceLight.max));
          priceLight.value = String(value);
          applied = true;
        }

        if (applied) {
          renderPriceSlider();
          invoiceStatus.textContent = "Valores encontrados e aplicados. Pode ajustar manualmente se necessário.";
        } else {
          invoiceStatus.textContent = "Não foi possível detetar valores. Pode preencher manualmente.";
        }
      } catch (error) {
        invoiceStatus.textContent = "Falha ao ler a fatura. Pode preencher manualmente.";
        console.error("OCR erro:", error);
      }
    };
    reader.readAsDataURL(file);
  }

  openInvoiceMenu.addEventListener("click", () => {
    invoiceMenu.classList.toggle("open");
  });

  openInvoiceCapture.addEventListener("click", () => {
    invoiceMenu.classList.remove("open");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      openCamera();
      return;
    }
    invoiceCapture.value = "";
    invoiceCapture.click();
  });

  invoiceCapture.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    handleInvoiceFile(file);
  });

  async function openCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraPreview.srcObject = cameraStream;
      cameraOverlay.classList.add("open");
      cameraOverlay.setAttribute("aria-hidden", "false");
    } catch (error) {
      invoiceStatus.textContent = "Não foi possível abrir a câmara. Pode carregar uma foto.";
      invoiceCapture.value = "";
      invoiceCapture.click();
    }
  }

  function closeCameraModal() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    cameraOverlay.classList.remove("open");
    cameraOverlay.setAttribute("aria-hidden", "true");
  }

  closeCamera.addEventListener("click", closeCameraModal);

  cameraOverlay.addEventListener("click", (event) => {
    if (event.target === cameraOverlay) {
      closeCameraModal();
    }
  });

  capturePhoto.addEventListener("click", () => {
    if (!cameraPreview.videoWidth || !cameraPreview.videoHeight) {
      return;
    }
    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;
    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraPreview, 0, 0);
    cameraCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "fatura-capturada.jpg", { type: "image/jpeg" });
      handleInvoiceFile(file);
      closeCameraModal();
    }, "image/jpeg", 0.92);
  });

  openInvoicePdf.addEventListener("click", () => {
    invoiceMenu.classList.remove("open");
    invoicePdfUpload.click();
  });

  invoicePdfUpload.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    handleInvoiceFile(file);
  });

  document.addEventListener("click", (event) => {
    if (!invoiceMenu.contains(event.target) && event.target !== openInvoiceMenu) {
      invoiceMenu.classList.remove("open");
    }
  });

  closeAdditionalModal.addEventListener("click", () => {
    additionalModal.classList.remove("open");
  });

  additionalModal.addEventListener("click", (event) => {
    if (event.target === additionalModal) {
      additionalModal.classList.remove("open");
    }
  });

  if (powerTermClose) {
    powerTermClose.addEventListener("click", () => {
      powerTermModal.classList.remove("open");
    });
  }

  if (powerTermModal) {
    powerTermModal.addEventListener("click", (event) => {
      if (event.target === powerTermModal) {
        powerTermModal.classList.remove("open");
      }
    });
  }

  function setAdditionalStep(step) {
    currentAdditionalStep = Math.min(Math.max(step, 1), totalAdditionalSteps);
    modalSteps.forEach((section) => {
      section.classList.toggle("active", Number(section.dataset.step) === currentAdditionalStep);
    });
    additionalTitle.textContent = "Equipamentos ou Futuros Equipamentos";
    additionalNext.textContent = currentAdditionalStep === totalAdditionalSteps ? "Concluir" : "Seguinte";
  }

  additionalNext.addEventListener("click", () => {
    if (currentAdditionalStep === totalAdditionalSteps) {
      additionalModal.classList.remove("open");
      renderAdditionalSummary();
      return;
    }
    setAdditionalStep(currentAdditionalStep + 1);
  });

  [hasPool, hasAc, hasEv, hasRadiators, hasWaterHeater, hasAerotermia].forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      renderAdditionalSummary();
      renderPriceSlider();
    });
  });

  [...batteryChoiceInputs, ...phaseTypeInputs, ...usageTimeInputs].forEach((input) => {
    input.addEventListener("change", () => {
      renderAdditionalSummary();
      renderPriceSlider();
    });
  });

  if (savedQuestionnaire) {
    if (savedQuestionnaire.priceLight !== undefined) {
      priceLight.value = String(savedQuestionnaire.priceLight);
    }
    if (savedQuestionnaire.pricePerKwh !== undefined) {
      pricePerKwhInput.value = String(savedQuestionnaire.pricePerKwh);
    }
    if (savedQuestionnaire.powerTerm !== undefined) {
      powerTermInput.value = String(savedQuestionnaire.powerTerm);
    }
    if (savedQuestionnaire.propertyType) {
      const propertyOption = form.querySelector(`input[name="propertyType"][value="${savedQuestionnaire.propertyType}"]`);
      if (propertyOption) propertyOption.checked = true;
    }
    if (savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.hasBattery !== undefined) {
      const value = savedQuestionnaire.additionalInfo.hasBattery ? "sim" : "nao";
      const batteryOption = batteryChoiceInputs.find((input) => input.value === value);
      if (batteryOption) batteryOption.checked = true;
    }
    hasPool.checked = Boolean(savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.hasPool);
    hasAc.checked = Boolean(savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.hasAc);
    hasEv.checked = Boolean(savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.hasEv);
    hasRadiators.checked = Boolean(savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.hasRadiators);
    hasWaterHeater.checked = Boolean(savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.hasWaterHeater);
    hasAerotermia.checked = Boolean(savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.hasAerotermia);
    if (savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.phaseType) {
      const phaseOption = phaseTypeInputs.find((input) => input.value === savedQuestionnaire.additionalInfo.phaseType);
      if (phaseOption) phaseOption.checked = true;
    }
    if (savedQuestionnaire.additionalInfo && savedQuestionnaire.additionalInfo.usageTime) {
      const usageOption = usageTimeInputs.find((input) => input.value === savedQuestionnaire.additionalInfo.usageTime);
      if (usageOption) usageOption.checked = true;
    }
  }

  if (invoiceFile && invoiceFile.dataUrl) {
    invoiceStatus.textContent = "Fatura carregada. Será enviada por email.";
  } else if ((invoicePhoto && invoicePhoto.dataUrl) || (invoicePdf && invoicePdf.dataUrl)) {
    invoiceStatus.textContent = "Fatura carregada. Será enviada por email.";
  }

  priceLight.addEventListener("input", () => {
    showPowerTermPopup = true;
    renderPriceSlider();
  });
  pricePerKwhInput.addEventListener("input", () => {
    let value = pricePerKwhInput.value.replace(",", ".").replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    const [intPartRaw, decPartRaw] = value.split(".");
    const intPart = (intPartRaw || "").slice(0, 2);
    const decPart = (decPartRaw || "").slice(0, 4);
    pricePerKwhInput.value = decPartRaw !== undefined ? `${intPart}.${decPart}` : intPart;
    showPowerTermPopup = true;
    renderPriceSlider();
  });
  powerTermInput.addEventListener("input", () => {
    let value = powerTermInput.value.replace(",", ".").replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    const [intPartRaw, decPartRaw] = value.split(".");
    const intPart = (intPartRaw || "").slice(0, 2);
    const decPart = (decPartRaw || "").slice(0, 2);
    powerTermInput.value = decPartRaw !== undefined ? `${intPart}.${decPart}` : intPart;
  });
  renderAdditionalSummary();
  renderPriceSlider();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const priceValueNumber = Number(formData.get("priceLight"));
    const pricePerKwhRaw = Number(String(formData.get("pricePerKwh") || "").replace(",", "."));
    const pricePerKwh = Number.isFinite(pricePerKwhRaw) && pricePerKwhRaw > 0 ? pricePerKwhRaw : 0.20;
    const powerTermRaw = Number(String(formData.get("powerTerm") || "").replace(",", "."));
    const powerTerm = Number.isFinite(powerTermRaw) && powerTermRaw > 0 ? powerTermRaw : null;
    const panelPower = 0.53;
    const productionPerPanel = ZONE_PANEL_MONTHLY_KWH[currentZoneLabel] ?? DEFAULT_PANEL_MONTHLY_KWH;
    const usageTime = usageTimeInputs.find((input) => input.checked)?.value || null;
    const usageFactor =
      usageTime === "manhas" ? 0.71
      : usageTime === "tardes" ? 0.88
      : usageTime === "noites" ? 0.28
      : 0.61;
    const wantsBattery = batteryChoiceInputs.find((input) => input.checked)?.value === "sim";

    const monthlyKwhEstimate = priceValueNumber / pricePerKwh;
    const monthlyKwhCoveredEstimate = monthlyKwhEstimate * usageFactor;
    const monthlyKwhForPanels = wantsBattery ? monthlyKwhEstimate : monthlyKwhCoveredEstimate;
    const requiredKwp = (monthlyKwhForPanels / productionPerPanel) * panelPower;
    const requiredKwpRounded = roundToOneDecimal(requiredKwp);
    const additionalPanels = getAdditionalCount();
    const basePanelsNeeded = panelsFromKwp(requiredKwpRounded);
    const monthlyKwpNeeded = requiredKwpRounded;
    let totalPanels = basePanelsNeeded + additionalPanels;
    if (totalPanels % 2 !== 0) {
      totalPanels += 1;
    }
    const requiredKva = requiredKvaFromKwp(requiredKwpRounded);
    const batteryCapacityKwh = wantsBattery ? getBatteryCapacityKwh(totalPanels) : null;

    if (powerTerm && requiredKva && powerTerm < requiredKva) {
      powerTermWarning.textContent = "Aumentar o termo de potência.";
    }

    const mapSnapshot = await generateMapSnapshot();
    try {
      if (mapSnapshot) {
        await idbSet("mapSnapshot", mapSnapshot);
      }
    } catch (error) {
      console.warn("Falha ao guardar mapa em IndexedDB:", error);
    }
    const mapSnapshotUrl = buildStaticMapUrl();
    const payload = {
      propertyType: formData.get("propertyType"),
      priceLight: priceValueNumber,
      pricePerKwh,
      powerTerm,
      zoneLabel: currentZoneLabel,
      panelMonthlyKwh: productionPerPanel,
      panelPowerKw: panelPower,
      monthlyKwhEstimate,
      monthlyKwhCoveredEstimate,
      monthlyKwhForPanels,
      usageFactor,
      monthlyKwpNeeded,
      basePanelsNeeded,
      additionalPanels,
      batteryCapacityKwh,
      additionalInfo: {
        hasPool: hasPool.checked,
        hasAc: hasAc.checked,
        hasEv: hasEv.checked,
        hasBattery: batteryChoiceInputs.find((input) => input.checked)?.value === "sim",
        hasRadiators: hasRadiators.checked,
        hasWaterHeater: hasWaterHeater.checked,
        hasAerotermia: hasAerotermia.checked,
        phaseType: phaseTypeInputs.find((input) => input.checked)?.value || null,
        usageTime: usageTimeInputs.find((input) => input.checked)?.value || null
      },
      invoiceFile,
      mapSnapshotBase64: mapSnapshot ? mapSnapshot.dataUrl : null,
      mapSnapshotName: mapSnapshot ? mapSnapshot.name : null,
      mapSnapshotMime: mapSnapshot ? mapSnapshot.mime : null,
      mapSnapshotUrl,
      panelsNeeded: totalPanels,
      updatedAt: new Date().toISOString()
    };
    persistJson("contactQuestionnaire", payload);
    statusEl.textContent = "Dados guardados. A avançar para contacto...";
    window.location.href = "contacto.html";
  });

  window.initQuestionnaireMap = initQuestionnaireMap;
