(async function () {
  const PRODUCTS = [
    { key: "Ritello", label: "Vacuum Ritello", color: "#ffd54a" },
    { key: "Placas Solares", label: "Placas Solares", color: "#2d67a7" },
    { key: "Sistemas de Agua", label: "Sistemas de Agua", color: "#8cb6ea" },
    { key: "Baterias", label: "Baterías", color: "#fff2b6" },
  ];
  const LOCATION_TYPES = {
    Oficina: { color: "#ffd54a", symbol: "circle" },
    Kiosko: { color: "#8cb6ea", symbol: "square" },
    Showroom: { color: "#2d67a7", symbol: "diamond" },
  };
  const PRODUCT_STRATEGIES = {
    Ritello: {
      audience:
        "Hogares familiares y clientes orientados a salud, limpieza premium y bienestar indoor.",
      channels:
        "showroom, demostraciones en urbanizaciones, referidos, kioskos de alto tráfico",
      message:
        "Limpieza profunda, mejor experiencia en el hogar y una demostración que se siente de inmediato.",
      milestoneLever:
        "Ayuda a subir volumen y a abrir mercado con una oferta demostrable y fácil de recomendar.",
    },
    "Placas Solares": {
      audience:
        "Dueños de vivienda, familias con factura alta y clientes que buscan resiliencia energética.",
      channels:
        "seminarios educativos, canvassing residencial, alianzas con contratistas, cierre consultivo",
      message:
        "Control de factura, independencia energética y seguridad frente a interrupciones.",
      milestoneLever:
        "Es el producto tractor para mover ingresos grandes y cumplir metas de revenue más rápido.",
    },
    "Sistemas de Agua": {
      audience:
        "Familias preocupadas por continuidad, calidad del agua y protección diaria del hogar.",
      channels:
        "ferias comunitarias, visitas residenciales, bundles con energía, campañas educativas",
      message:
        "Resiliencia práctica para el hogar con una propuesta fácil de entender y urgente para la familia.",
      milestoneLever:
        "Permite penetrar municipios residenciales con necesidad concreta y acelerar unidades vendidas.",
    },
    Baterias: {
      audience:
        "Clientes que priorizan continuidad operacional, protección nocturna y respaldo durante apagones.",
      channels:
        "cross-sell a leads solares, showroom consultivo, campañas de preparación, bundles premium",
      message:
        "Respaldo inmediato, continuidad del hogar y más valor para un sistema energético completo.",
      milestoneLever:
        "Sube ticket promedio y fortalece cierres en clientes listos para una solución completa.",
    },
  };
  const PERIOD_MONTHS = {
    all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    Q1: [1, 2, 3],
    Q2: [4, 5, 6],
    Q3: [7, 8, 9],
    Q4: [10, 11, 12],
  };
  const AVAILABLE_YEARS = [2026, 2027];
  const VIEW_MODE_TEXT = {
    executive:
      "Estado general del dealer: facturación, cobertura, talento, penetración y salud del negocio.",
    sales:
      "Enfoque táctico de ventas para vigilar productividad, ticket promedio, mix y rendimiento territorial.",
    expansion:
      "Enfoque en oficinas, kioskos, showrooms, capacidad operativa y expansión por municipio.",
  };
  const STORAGE_KEYS = {
    sales: "solaris-dashboard-sales-v1",
    network: "solaris-dashboard-network-v1",
    targets: "solaris-dashboard-targets-v1",
    risks: "solaris-dashboard-risks-v1",
  };
  const DEFAULT_TARGETS = {
    revenue: 0,
    units: 0,
    locations: 0,
    sellers: 0,
  };
  const APP_CONFIG = window.SOLARIS_APP_CONFIG || {};
  const WORKSPACE_SLUG = APP_CONFIG.workspaceSlug || "solaris-power";
  const SUPABASE_MODULE_URL =
    APP_CONFIG.supabaseModuleUrl || "https://esm.sh/@supabase/supabase-js@2";
  const REGIONS = {
    "puerto-rico": {
      label: "Puerto Rico",
      marketLabel: "municipio",
      marketsLabel: "municipios",
      geo: window.puertoRicoMunicipios,
    },
    florida: {
      label: "Florida",
      marketLabel: "condado",
      marketsLabel: "condados",
      geo: window.floridaCounties,
    },
  };
  const industrySignals = window.industrySignals || [];
  const REGION_META = Object.fromEntries(
    Object.entries(REGIONS).map(([key, config]) => [
      key,
      {
        ...config,
        territories: config.geo.features
          .map((feature) => ({
            name: feature.properties.NAME,
            population: Number(feature.properties.Population || 0),
            households: Number(feature.properties.Households || 0),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
        bounds: getBounds(config.geo),
        centroidMap: buildCentroidMap(config.geo),
      },
    ]),
  );

  let salesRecords = loadStoredData(STORAGE_KEYS.sales, window.salesRecords || []).map((record) => ({
    ...record,
    region: record.region || "puerto-rico",
    year: Number(record.year || 2026),
  }));
  let networkLocations = loadStoredData(STORAGE_KEYS.network, window.networkSeed || []).map((location) => ({
    ...location,
    region: location.region || "puerto-rico",
  }));
  let targets = loadStoredData(STORAGE_KEYS.targets, DEFAULT_TARGETS);
  let riskAssessments = loadStoredData(
    STORAGE_KEYS.risks,
    Object.fromEntries(industrySignals.map((signal) => [signal.id, "2"])),
  );

  let activeProducts = new Set(PRODUCTS.map((product) => product.key));
  let selectedPeriod = "2026-all";
  let selectedMetric = "revenue";
  let selectedView = "executive";
  let selectedRegion = "puerto-rico";
  let selectedMunicipality = null;
  let supabase = null;
  let authSession = null;
  let authUser = null;
  let authProfile = null;
  let accessProfiles = [];
  let auditEntries = [];
  let cloudEnabled = Boolean(APP_CONFIG.enableCloud && APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey);

  const svg = document.getElementById("mapSvg");
  const heroMarketingBlock = document.getElementById("heroMarketingBlock");
  const loginGate = document.getElementById("loginGate");
  const dashboardMain = document.getElementById("dashboardMain");
  const tooltip = document.getElementById("mapTooltip");
  const kpiGrid = document.getElementById("kpiGrid");
  const detailTitle = document.getElementById("detailTitle");
  const detailContent = document.getElementById("detailContent");
  const trendChart = document.getElementById("trendChart");
  const opportunityTable = document.getElementById("opportunityTable");
  const kpiPlaybook = document.getElementById("kpiPlaybook");
  const industryFeed = document.getElementById("industryFeed");
  const riskSummary = document.getElementById("riskSummary");
  const productAdvisor = document.getElementById("productAdvisor");
  const milestoneCoach = document.getElementById("milestoneCoach");
  const salesList = document.getElementById("salesList");
  const networkList = document.getElementById("networkList");
  const userAccessList = document.getElementById("userAccessList");
  const auditLogList = document.getElementById("auditLogList");
  const regionSelect = document.getElementById("regionSelect");
  const metricSelect = document.getElementById("metricSelect");
  const periodSelect = document.getElementById("periodSelect");
  const productChips = document.getElementById("productChips");
  const legendScale = document.getElementById("legendScale");
  const viewModeDescription = document.getElementById("viewModeDescription");
  const viewModeSwitch = document.getElementById("viewModeSwitch");
  const datasetState = document.getElementById("datasetState");
  const activeGoalState = document.getElementById("activeGoalState");
  const cloudModeBadge = document.getElementById("cloudModeBadge");
  const authStatusText = document.getElementById("authStatusText");
  const authSignedOut = document.getElementById("authSignedOut");
  const authSignedIn = document.getElementById("authSignedIn");
  const authEmailInput = document.getElementById("authEmailInput");
  const sendMagicLinkButton = document.getElementById("sendMagicLinkButton");
  const authUserEmail = document.getElementById("authUserEmail");
  const authUserRole = document.getElementById("authUserRole");
  const syncNowButton = document.getElementById("syncNowButton");
  const signOutButton = document.getElementById("signOutButton");
  const authMessage = document.getElementById("authMessage");
  const salesMunicipalitySelect = document.getElementById("salesMunicipalitySelect");
  const salesProductSelect = document.getElementById("salesProductSelect");
  const salesYearSelect = document.getElementById("salesYearSelect");
  const salesMonthSelect = document.getElementById("salesMonthSelect");
  const salesUnitsInput = document.getElementById("salesUnitsInput");
  const salesRevenueInput = document.getElementById("salesRevenueInput");
  const addSalesButton = document.getElementById("addSalesButton");
  const locationNameInput = document.getElementById("locationNameInput");
  const locationTypeSelect = document.getElementById("locationTypeSelect");
  const locationMunicipalitySelect = document.getElementById("locationMunicipalitySelect");
  const leadersInput = document.getElementById("leadersInput");
  const sellersInput = document.getElementById("sellersInput");
  const addLocationButton = document.getElementById("addLocationButton");
  const targetRevenueInput = document.getElementById("targetRevenueInput");
  const targetUnitsInput = document.getElementById("targetUnitsInput");
  const targetLocationsInput = document.getElementById("targetLocationsInput");
  const targetSellersInput = document.getElementById("targetSellersInput");
  const saveTargetsButton = document.getElementById("saveTargetsButton");
  const resetAllButton = document.getElementById("resetAllButton");

  const municipalityShapes = new Map();

  populateSelectors();
  syncTargetInputs();
  syncSalesYearToPeriod();

  function loadStoredData(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return cloneValue(fallback);
      }
      return JSON.parse(raw);
    } catch (error) {
      return cloneValue(fallback);
    }
  }

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function saveStoredData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("es-PR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("es-PR").format(Math.round(Number(value || 0)));
  }

  function formatPercent(value) {
    return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;
  }

  function monthLabel(month) {
    return new Date(2026, month - 1, 1).toLocaleDateString("es-PR", {
      month: "short",
    });
  }

  function getCurrentRegionMeta() {
    return REGION_META[selectedRegion];
  }

  function getCurrentTerritories() {
    return getCurrentRegionMeta().territories;
  }

  function populateSelectors() {
    const territoryOptions = getCurrentTerritories()
      .map((municipality) => `<option value="${municipality.name}">${municipality.name}</option>`)
      .join("");
    salesMunicipalitySelect.innerHTML = territoryOptions;
    locationMunicipalitySelect.innerHTML = territoryOptions;
    salesYearSelect.innerHTML = AVAILABLE_YEARS.map(
      (year) => `<option value="${year}">${year}</option>`,
    ).join("");
    salesMonthSelect.innerHTML = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return `<option value="${month}">${monthLabel(month)}</option>`;
    }).join("");
  }

  function parsePeriodSelection() {
    const [yearPart, quarterPart] = String(selectedPeriod).split("-");
    const year = Number(yearPart || 2026);
    const quarter = quarterPart || "all";
    return {
      year,
      quarter,
      months: PERIOD_MONTHS[quarter] || PERIOD_MONTHS.all,
    };
  }

  function syncTargetInputs() {
    targetRevenueInput.value = targets.revenue || 0;
    targetUnitsInput.value = targets.units || 0;
    targetLocationsInput.value = targets.locations || 0;
    targetSellersInput.value = targets.sellers || 0;
  }

  function syncSalesYearToPeriod() {
    salesYearSelect.value = String(parsePeriodSelection().year);
  }

  function isCloudActive() {
    return cloudEnabled;
  }

  function roleName() {
    return authProfile?.role || (isCloudActive() ? "viewer" : "local-admin");
  }

  function canEditRecords() {
    return !isCloudActive() || ["admin", "executive", "sales"].includes(roleName());
  }

  function canDeleteRecords() {
    return !isCloudActive() || ["admin", "executive"].includes(roleName());
  }

  function canManageTargets() {
    return !isCloudActive() || ["admin", "executive"].includes(roleName());
  }

  function canAdjustRisks() {
    return !isCloudActive() || ["admin", "executive"].includes(roleName());
  }

  function canManageUsers() {
    return isCloudActive() && roleName() === "admin";
  }

  function canAccessCloudData() {
    return !isCloudActive() || Boolean(authSession);
  }

  function setAuthMessage(message) {
    authMessage.textContent = message;
  }

  function isContentLocked() {
    return isCloudActive() && !authSession;
  }

  function applyContentGate() {
    const locked = isContentLocked();
    heroMarketingBlock.classList.toggle("hidden", locked);
    loginGate.classList.toggle("hidden", !locked);
    dashboardMain.classList.toggle("hidden", locked);
  }

  function clearSharedState() {
    salesRecords = [];
    networkLocations = [];
    targets = cloneValue(DEFAULT_TARGETS);
    riskAssessments = Object.fromEntries(industrySignals.map((signal) => [signal.id, "2"]));
    selectedMunicipality = null;
    syncTargetInputs();
  }

  function applyPermissions() {
    const editAllowed = canEditRecords() && canAccessCloudData();
    const manageTargets = canManageTargets() && canAccessCloudData();
    const riskAllowed = canAdjustRisks() && canAccessCloudData();
    resetAllButton.disabled = isCloudActive();

    [
      salesMunicipalitySelect,
      salesProductSelect,
      salesYearSelect,
      salesMonthSelect,
      salesUnitsInput,
      salesRevenueInput,
      addSalesButton,
      locationNameInput,
      locationTypeSelect,
      locationMunicipalitySelect,
      leadersInput,
      sellersInput,
      addLocationButton,
    ].forEach((element) => {
      element.disabled = !editAllowed;
    });

    [
      targetRevenueInput,
      targetUnitsInput,
      targetLocationsInput,
      targetSellersInput,
      saveTargetsButton,
    ].forEach((element) => {
      element.disabled = !manageTargets;
    });

    industryFeed.querySelectorAll(".risk-exposure").forEach((select) => {
      select.disabled = !riskAllowed;
    });
  }

  function renderAuthState() {
    if (!isCloudActive()) {
      cloudModeBadge.textContent = "Modo local";
      authStatusText.textContent =
        "La app está usando almacenamiento local. Configura Supabase para compartir el dashboard con ejecutivos.";
      authSignedOut.classList.remove("hidden");
      authSignedIn.classList.add("hidden");
      authEmailInput.disabled = true;
      sendMagicLinkButton.disabled = true;
      setAuthMessage("Agrega `config.js` con credenciales de Supabase para habilitar login compartido.");
      authUserEmail.textContent = "-";
      authUserRole.textContent = "local-admin";
      applyContentGate();
      return;
    }

    cloudModeBadge.textContent = authSession ? "Modo compartido" : "Login requerido";
    authStatusText.textContent = authSession
      ? "La app está conectada a la base de datos central y sincronizando información compartida."
      : "Inicia sesión con magic link para trabajar sobre el dashboard compartido.";
    authSignedOut.classList.toggle("hidden", Boolean(authSession));
    authSignedIn.classList.toggle("hidden", !authSession);
    authEmailInput.disabled = false;
    sendMagicLinkButton.disabled = false;
    authUserEmail.textContent = authUser?.email || "-";
    authUserRole.textContent = roleName();
    applyContentGate();
  }

  async function initCloudClient() {
    if (!isCloudActive()) {
      renderAuthState();
      return;
    }

    const module = await import(SUPABASE_MODULE_URL);
    supabase = module.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    const sessionResult = await supabase.auth.getSession();
    authSession = sessionResult.data.session;
    authUser = authSession?.user || null;

    if (authUser) {
      await ensureProfile();
      await loadCloudData();
    } else {
      clearSharedState();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      authSession = session;
      authUser = session?.user || null;
      authProfile = null;
      accessProfiles = [];
      auditEntries = [];

      if (authUser) {
        await ensureProfile();
        await loadCloudData();
      } else {
        clearSharedState();
        renderAuthState();
        renderAccessList();
        renderAuditLog();
        applyPermissions();
        updateDashboard();
      }
    });

    renderAuthState();
  }

  async function ensureProfile() {
    if (!supabase || !authUser) {
      return;
    }

    let result = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (!result.data) {
      await supabase.from("profiles").insert({
        user_id: authUser.id,
        workspace_slug: WORKSPACE_SLUG,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || "",
        role: "viewer",
      });
      result = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();
    }

    authProfile = result.data || null;
    renderAuthState();
  }

  async function loadCloudData() {
    if (!supabase || !authUser) {
      renderAuthState();
      return;
    }

    const [salesRes, locationsRes, targetsRes, risksRes, auditRes, accessRes] = await Promise.all([
      supabase
        .from("sales_records")
        .select("*")
        .eq("workspace_slug", WORKSPACE_SLUG)
        .order("created_at", { ascending: false }),
      supabase
        .from("network_locations")
        .select("*")
        .eq("workspace_slug", WORKSPACE_SLUG)
        .order("created_at", { ascending: false }),
      supabase
        .from("kpi_targets")
        .select("*")
        .eq("workspace_slug", WORKSPACE_SLUG)
        .maybeSingle(),
      supabase
        .from("risk_assessments")
        .select("*")
        .eq("workspace_slug", WORKSPACE_SLUG),
      supabase
        .from("audit_log")
        .select("*")
        .eq("workspace_slug", WORKSPACE_SLUG)
        .order("changed_at", { ascending: false })
        .limit(20),
      canManageUsers()
        ? supabase
            .from("profiles")
            .select("*")
            .eq("workspace_slug", WORKSPACE_SLUG)
            .order("email", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    salesRecords = (salesRes.data || []).map((record) => ({
      ...record,
      municipality: record.municipality,
      createdAt: new Date(record.created_at).getTime(),
    }));
    networkLocations = (locationsRes.data || []).map((location) => ({
      ...location,
      createdAt: new Date(location.created_at).getTime(),
    }));
    targets = targetsRes.data
      ? {
          revenue: Number(targetsRes.data.revenue || 0),
          units: Number(targetsRes.data.units || 0),
          locations: Number(targetsRes.data.locations || 0),
          sellers: Number(targetsRes.data.sellers || 0),
        }
      : cloneValue(DEFAULT_TARGETS);
    riskAssessments = Object.fromEntries(
      industrySignals.map((signal) => {
        const row = (risksRes.data || []).find((item) => item.signal_id === signal.id);
        return [signal.id, String(row?.exposure ?? "2")];
      }),
    );
    auditEntries = auditRes.data || [];
    accessProfiles = accessRes.data || [];

    syncTargetInputs();
    renderAuthState();
    renderAccessList();
    renderAuditLog();
    updateDashboard();
  }

  async function sendMagicLink() {
    if (!supabase || !authEmailInput.value.trim()) {
      setAuthMessage("Escribe un email válido para enviar el acceso.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmailInput.value.trim(),
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    setAuthMessage(
      error
        ? `No se pudo enviar el acceso: ${error.message}`
        : "Revisa tu correo. Se envió un magic link para entrar al dashboard.",
    );
  }

  async function signOut() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setAuthMessage("Sesión cerrada.");
  }

  function renderAccessList() {
    if (!isCloudActive()) {
      userAccessList.innerHTML =
        '<div class="empty-state">El control de acceso se habilita cuando conectas la app a Supabase.</div>';
      return;
    }
    if (!authSession) {
      userAccessList.innerHTML =
        '<div class="empty-state">Inicia sesión para ver roles y permisos compartidos.</div>';
      return;
    }
    if (!canManageUsers()) {
      userAccessList.innerHTML = `<div class="empty-state">Tu rol actual es <strong>${roleName()}</strong>. Solo un admin puede cambiar permisos.</div>`;
      return;
    }

    userAccessList.innerHTML = accessProfiles.length
      ? accessProfiles
          .map(
            (profile) => `
              <div class="record-item">
                <div>
                  <strong>${profile.full_name || profile.email}</strong>
                  <small class="muted">${profile.email}</small>
                </div>
                <select data-profile-id="${profile.user_id}" class="role-select">
                  <option value="admin" ${profile.role === "admin" ? "selected" : ""}>Admin</option>
                  <option value="executive" ${profile.role === "executive" ? "selected" : ""}>Executive</option>
                  <option value="sales" ${profile.role === "sales" ? "selected" : ""}>Sales</option>
                  <option value="viewer" ${profile.role === "viewer" ? "selected" : ""}>Viewer</option>
                </select>
              </div>
            `,
          )
          .join("")
      : '<div class="empty-state">Todavía no hay perfiles sincronizados.</div>';

    userAccessList.querySelectorAll(".role-select").forEach((select) => {
      select.addEventListener("change", async () => {
        await supabase
          .from("profiles")
          .update({ role: select.value })
          .eq("user_id", select.dataset.profileId);
        await loadCloudData();
      });
    });
  }

  function renderAuditLog() {
    if (!isCloudActive()) {
      auditLogList.innerHTML =
        '<div class="empty-state">La auditoría aparece cuando el dashboard trabaja con base de datos central.</div>';
      return;
    }
    if (!authSession) {
      auditLogList.innerHTML =
        '<div class="empty-state">Inicia sesión para ver el historial compartido.</div>';
      return;
    }

    auditLogList.innerHTML = auditEntries.length
      ? auditEntries
          .map(
            (entry) => `
              <div class="record-item">
                <div>
                  <strong>${entry.table_name} · ${entry.operation}</strong>
                  <small class="muted">${new Date(entry.changed_at).toLocaleString("es-PR")} | ${entry.actor_email || "usuario autenticado"}</small>
                </div>
                <span class="tag">${entry.row_id || "registro"}</span>
              </div>
            `,
          )
          .join("")
      : '<div class="empty-state">No hay eventos de auditoría todavía.</div>';
  }

  function getMunicipalityStats() {
    const map = new Map();
    getCurrentTerritories().forEach((municipality) => {
      map.set(normalizeName(municipality.name), {
        municipality: municipality.name,
        population: municipality.population,
        households: municipality.households,
        revenue: 0,
        units: 0,
        products: new Set(),
        productRevenue: Object.fromEntries(PRODUCTS.map((product) => [product.key, 0])),
        productUnits: Object.fromEntries(PRODUCTS.map((product) => [product.key, 0])),
        entryCount: 0,
        leaders: 0,
        sellers: 0,
        presence: 0,
        locations: [],
      });
    });

    networkLocations
      .filter((location) => location.region === selectedRegion)
      .forEach((location) => {
      const key = normalizeName(location.municipality);
      if (!map.has(key)) {
        return;
      }
      const entry = map.get(key);
      entry.leaders += Number(location.leaders || 0);
      entry.sellers += Number(location.sellers || 0);
      entry.presence += 1;
      entry.locations.push(location);
      });

    getFilteredSales().forEach((record) => {
      const key = normalizeName(record.municipality);
      if (!map.has(key)) {
        return;
      }
      const entry = map.get(key);
      entry.revenue += Number(record.revenue || 0);
      entry.units += Number(record.units || 0);
      entry.products.add(record.product);
      entry.productRevenue[record.product] += Number(record.revenue || 0);
      entry.productUnits[record.product] += Number(record.units || 0);
      entry.entryCount += 1;
    });

    Array.from(map.values()).forEach((entry) => {
      entry.avgTicket = entry.units > 0 ? entry.revenue / entry.units : 0;
      entry.sellerProductivity = entry.sellers > 0 ? entry.revenue / entry.sellers : 0;
      entry.marketPotentialScore = calculatePotentialScore(entry);
    });

    return map;
  }

  function calculatePotentialScore(entry) {
    const maxHouseholds = Math.max(...getCurrentTerritories().map((item) => item.households), 1);
    const householdWeight = (entry.households / maxHouseholds) * 55;
    const presenceGap = entry.presence === 0 ? 18 : Math.max(0, 14 - entry.presence * 4);
    const productGap = Math.max(0, 4 - entry.products.size) * 5;
    const salesGap = entry.revenue === 0 ? 10 : 0;
    return Math.min(100, householdWeight + presenceGap + productGap + salesGap);
  }

  function getFilteredSales() {
    const parsedPeriod = parsePeriodSelection();
    const validMonths = new Set(parsedPeriod.months);
    return salesRecords.filter(
      (record) =>
        record.region === selectedRegion &&
        Number(record.year || 2026) === parsedPeriod.year &&
        activeProducts.has(record.product) &&
        validMonths.has(Number(record.month)),
    );
  }

  function getMetricValue(entry) {
    if (!entry) {
      return 0;
    }
    if (selectedMetric === "units") {
      return entry.units;
    }
    if (selectedMetric === "avgTicket") {
      return entry.avgTicket;
    }
    if (selectedMetric === "coverage") {
      return entry.products.size;
    }
    if (selectedMetric === "presence") {
      return entry.presence;
    }
    if (selectedMetric === "leaders") {
      return entry.leaders;
    }
    if (selectedMetric === "sellers") {
      return entry.sellers;
    }
    if (selectedMetric === "sellerProductivity") {
      return entry.sellerProductivity;
    }
    return entry.revenue;
  }

  function buildKpis(municipalityMap) {
    const records = getFilteredSales();
    const totalRevenue = records.reduce((sum, record) => sum + Number(record.revenue || 0), 0);
    const totalUnits = records.reduce((sum, record) => sum + Number(record.units || 0), 0);
    const totalPresence = networkLocations.filter((location) => location.region === selectedRegion).length;
    const totalLeaders = Array.from(municipalityMap.values()).reduce(
      (sum, entry) => sum + entry.leaders,
      0,
    );
    const totalSellers = Array.from(municipalityMap.values()).reduce(
      (sum, entry) => sum + entry.sellers,
      0,
    );
    const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;

    const regionLabel = getCurrentRegionMeta().label;
    const totalRegionSales = salesRecords.filter((record) => record.region === selectedRegion).length;
    const totalRegionLocations = networkLocations.filter((location) => location.region === selectedRegion).length;
    const parsedPeriod = parsePeriodSelection();

    datasetState.textContent =
      totalRegionSales || totalRegionLocations
        ? `${regionLabel} ${parsedPeriod.year}: ${formatNumber(totalRegionSales)} ventas / ${formatNumber(totalRegionLocations)} puntos`
        : "Sin registros";
    activeGoalState.textContent = formatCurrency(targets.revenue || 0);

    const cards = [
      {
        label: "Ingresos",
        value: formatCurrency(totalRevenue),
        note: `Meta ${formatCurrency(targets.revenue || 0)}`,
        progress: calculateProgress(totalRevenue, targets.revenue),
      },
      {
        label: "Unidades",
        value: formatNumber(totalUnits),
        note: `Meta ${formatNumber(targets.units || 0)}`,
        progress: calculateProgress(totalUnits, targets.units),
      },
      {
        label: "Ticket promedio",
        value: formatCurrency(avgTicket),
        note: totalUnits ? "ingresos por unidad" : "sin ventas registradas",
        progress: null,
      },
      {
        label: "Puntos físicos",
        value: formatNumber(totalPresence),
        note: `Meta ${formatNumber(targets.locations || 0)}`,
        progress: calculateProgress(totalPresence, targets.locations),
      },
      {
        label: "Líderes",
        value: formatNumber(totalLeaders),
        note: totalLeaders ? `${formatNumber(totalSellers / Math.max(totalLeaders, 1))} vendedores por líder` : "estructura aún vacía",
        progress: null,
      },
      {
        label: "Vendedores",
        value: formatNumber(totalSellers),
        note: `Meta ${formatNumber(targets.sellers || 0)}`,
        progress: calculateProgress(totalSellers, targets.sellers),
      },
    ];

    kpiGrid.innerHTML = cards
      .map(
        (card) => `
          <article class="kpi-card">
            <small>${card.label}</small>
            <strong>${card.value}</strong>
            <div class="kpi-note">${card.note}</div>
            ${
              card.progress !== null
                ? `<div class="kpi-progress"><div class="mini-progress"><span style="width:${card.progress}%"></span></div></div>`
                : ""
            }
          </article>
        `,
      )
      .join("");
  }

  function calculateProgress(current, target) {
    if (!target) {
      return 0;
    }
    return Math.max(0, Math.min(100, (current / target) * 100));
  }

  function getBounds(targetGeo) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    targetGeo.features.forEach((feature) => {
      const polygons =
        feature.geometry.type === "Polygon"
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
      polygons.forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach(([lon, lat]) => {
            minX = Math.min(minX, lon);
            maxX = Math.max(maxX, lon);
            minY = Math.min(minY, lat);
            maxY = Math.max(maxY, lat);
          });
        });
      });
    });

    return { minX, minY, maxX, maxY };
  }

  function projectPoint(lon, lat) {
    const regionMeta = getCurrentRegionMeta();
    const padding = 35;
    const width = 1000 - padding * 2;
    const height = 650 - padding * 2;
    const scale = Math.min(
      width / (regionMeta.bounds.maxX - regionMeta.bounds.minX),
      height / (regionMeta.bounds.maxY - regionMeta.bounds.minY),
    );
    const xOffset = (1000 - (regionMeta.bounds.maxX - regionMeta.bounds.minX) * scale) / 2;
    const yOffset = (650 - (regionMeta.bounds.maxY - regionMeta.bounds.minY) * scale) / 2;

    return {
      x: xOffset + (lon - regionMeta.bounds.minX) * scale,
      y: 650 - (yOffset + (lat - regionMeta.bounds.minY) * scale),
    };
  }

  function buildPath(geometry) {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    return (
      polygons
        .map((polygon) =>
          polygon
            .map((ring) =>
              ring
                .map(([lon, lat], index) => {
                  const point = projectPoint(lon, lat);
                  return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
                })
                .join(" "),
            )
            .join(" Z "),
        )
        .join(" Z ") + " Z"
    );
  }

  function getCentroid(geometry) {
    const points = [];
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    polygons.forEach((polygon) =>
      polygon.forEach((ring) => ring.forEach((point) => points.push(point))),
    );
    const total = points.reduce(
      (acc, [lon, lat]) => ({ lon: acc.lon + lon, lat: acc.lat + lat }),
      { lon: 0, lat: 0 },
    );
    return [total.lon / points.length, total.lat / points.length];
  }

  function buildCentroidMap(targetGeo) {
    const map = new Map();
    targetGeo.features.forEach((feature) => {
      map.set(normalizeName(feature.properties.NAME), getCentroid(feature.geometry));
    });
    return map;
  }

  function mixColor(start, end, amount) {
    const from = start.match(/\w\w/g).map((hex) => parseInt(hex, 16));
    const to = end.match(/\w\w/g).map((hex) => parseInt(hex, 16));
    const mixed = from.map((value, index) =>
      Math.round(value + (to[index] - value) * amount)
        .toString(16)
        .padStart(2, "0"),
    );
    return `#${mixed.join("")}`;
  }

  function colorForMetric(values, value) {
    const usable = values.filter((entry) => Number.isFinite(entry) && entry > 0);
    if (!value) {
      return "#17304e";
    }
    const max = Math.max(...usable, 1);
    const intensity = value / max;
    return mixColor("17304e", "ffd54a", Math.min(1, intensity));
  }

  function renderMap(municipalityMap) {
    const regionMeta = getCurrentRegionMeta();
    const values = Array.from(municipalityMap.values()).map((entry) => getMetricValue(entry));
    legendScale.style.background = "linear-gradient(90deg, #17304e, #ffd54a)";
    svg.innerHTML = "";
    municipalityShapes.clear();

    regionMeta.geo.features.forEach((feature) => {
      const municipalityName = feature.properties.NAME;
      const key = normalizeName(municipalityName);
      const entry = municipalityMap.get(key);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", buildPath(feature.geometry));
      path.setAttribute("class", "municipio");
      path.style.fill = colorForMetric(values, getMetricValue(entry));
      path.addEventListener("mouseenter", (event) => showTooltip(event, municipalityName, entry));
      path.addEventListener("mousemove", moveTooltip);
      path.addEventListener("mouseleave", hideTooltip);
      path.addEventListener("click", () => {
        selectedMunicipality = municipalityName;
        updateDashboard();
      });
      municipalityShapes.set(key, path);
      svg.appendChild(path);

      if (entry && entry.units > 0) {
        const centroid = regionMeta.centroidMap.get(key);
        const point = projectPoint(centroid[0], centroid[1]);
        const bubble = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bubble.setAttribute("cx", point.x.toFixed(2));
        bubble.setAttribute("cy", point.y.toFixed(2));
        bubble.setAttribute("r", Math.max(4, Math.min(18, 4 + Math.sqrt(entry.units))));
        bubble.setAttribute("class", "bubble");
        svg.appendChild(bubble);
      }
    });

    renderNetworkMarkers();
    updateSelectionState();
  }

  function renderNetworkMarkers() {
    const regionMeta = getCurrentRegionMeta();
    const grouped = new Map();
    networkLocations
      .filter((location) => location.region === selectedRegion)
      .forEach((location) => {
      const key = normalizeName(location.municipality);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(location);
      });

    grouped.forEach((locations, key) => {
      const centroid = regionMeta.centroidMap.get(key);
      if (!centroid) {
        return;
      }
      const center = projectPoint(centroid[0], centroid[1]);

      locations.forEach((location, index) => {
        const config = LOCATION_TYPES[location.type];
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const offsetX = (index % 4) * 14 - 21;
        const offsetY = Math.floor(index / 4) * 14 - 18;
        group.setAttribute("transform", `translate(${center.x + offsetX}, ${center.y + offsetY})`);
        group.setAttribute("class", "marker-symbol");

        if (config.symbol === "circle") {
          const shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          shape.setAttribute("r", "6");
          shape.setAttribute("fill", config.color);
          shape.setAttribute("stroke", "#081321");
          shape.setAttribute("stroke-width", "2");
          group.appendChild(shape);
        } else if (config.symbol === "square") {
          const shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          shape.setAttribute("x", "-6");
          shape.setAttribute("y", "-6");
          shape.setAttribute("width", "12");
          shape.setAttribute("height", "12");
          shape.setAttribute("rx", "2");
          shape.setAttribute("fill", config.color);
          shape.setAttribute("stroke", "#081321");
          shape.setAttribute("stroke-width", "2");
          group.appendChild(shape);
        } else {
          const shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          shape.setAttribute("x", "-6");
          shape.setAttribute("y", "-6");
          shape.setAttribute("width", "12");
          shape.setAttribute("height", "12");
          shape.setAttribute("transform", "rotate(45)");
          shape.setAttribute("fill", config.color);
          shape.setAttribute("stroke", "#081321");
          shape.setAttribute("stroke-width", "2");
          group.appendChild(shape);
        }

        svg.appendChild(group);
      });
    });
  }

  function showTooltip(event, municipalityName, entry) {
    tooltip.hidden = false;
    tooltip.innerHTML = `
      <strong>${municipalityName}</strong><br />
      Ingresos: ${formatCurrency(entry ? entry.revenue : 0)}<br />
      Unidades: ${formatNumber(entry ? entry.units : 0)}<br />
      Puntos: ${formatNumber(entry ? entry.presence : 0)}<br />
      Líderes / vendedores: ${formatNumber(entry ? entry.leaders : 0)} / ${formatNumber(entry ? entry.sellers : 0)}<br />
      Potencial estimado: ${formatNumber(entry ? entry.marketPotentialScore : 0)}/100
    `;
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const rect = svg.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - rect.left + 16}px`;
    tooltip.style.top = `${event.clientY - rect.top + 16}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function updateSelectionState() {
    municipalityShapes.forEach((shape, key) => {
      shape.classList.toggle(
        "active",
        Boolean(selectedMunicipality && key === normalizeName(selectedMunicipality)),
      );
    });
  }

  function pickDefaultMunicipality(municipalityMap) {
    return Array.from(municipalityMap.values()).sort(
      (a, b) => b.marketPotentialScore - a.marketPotentialScore || b.households - a.households,
    )[0]?.municipality;
  }

  function renderDetail(municipalityMap) {
    const targetName = selectedMunicipality || pickDefaultMunicipality(municipalityMap);
    const entry = municipalityMap.get(normalizeName(targetName));
    selectedMunicipality = targetName;
    detailTitle.textContent = targetName || "Sin selección";

    if (!entry) {
      detailContent.innerHTML = `<div class="empty-state">No hay municipio seleccionado.</div>`;
      return;
    }

    detailContent.innerHTML = `
      <div class="detail-metric">
        <span>Ingresos</span>
        <strong>${formatCurrency(entry.revenue)}</strong>
      </div>
      <div class="detail-metric">
        <span>Unidades</span>
        <strong>${formatNumber(entry.units)}</strong>
      </div>
      <div class="detail-metric">
        <span>Ticket promedio</span>
        <strong>${formatCurrency(entry.avgTicket)}</strong>
      </div>
      <div class="detail-metric">
        <span>Productos activos</span>
        <strong>${entry.products.size}/4</strong>
      </div>
      <div class="detail-metric">
        <span>Puntos físicos</span>
        <strong>${formatNumber(entry.presence)}</strong>
      </div>
      <div class="detail-metric">
        <span>Líderes</span>
        <strong>${formatNumber(entry.leaders)}</strong>
      </div>
      <div class="detail-metric">
        <span>Vendedores</span>
        <strong>${formatNumber(entry.sellers)}</strong>
      </div>
      <div class="detail-metric">
        <span>Ventas por vendedor</span>
        <strong>${formatCurrency(entry.sellerProductivity)}</strong>
      </div>
      <div class="detail-metric">
        <span>Población / hogares</span>
        <strong>${formatNumber(entry.population)} / ${formatNumber(entry.households)}</strong>
      </div>
      <div class="detail-metric">
        <span>Potencial del municipio</span>
        <strong class="neutral">${formatNumber(entry.marketPotentialScore)}/100</strong>
      </div>
    `;
  }

  function renderTrend() {
    const parsedPeriod = parsePeriodSelection();
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const total = getFilteredSales()
        .filter((record) => Number(record.month) === month)
        .reduce((sum, record) => sum + Number(record.revenue || 0), 0);
      return { month, total };
    });
    const max = Math.max(...monthly.map((item) => item.total), 1);
    trendChart.innerHTML = monthly
      .map(
        (item) => `
          <div class="trend-col">
            <span class="trend-value">${formatCurrency(item.total)}</span>
            <div class="trend-bar" style="height:${Math.max(10, (item.total / max) * 180)}px"></div>
            <span class="trend-label">${monthLabel(item.month)} ${parsedPeriod.year}</span>
          </div>
        `,
      )
      .join("");
  }

  function renderOpportunityTable(municipalityMap) {
    const rows = Array.from(municipalityMap.values())
      .map((entry) => ({
        municipality: entry.municipality,
        score: entry.marketPotentialScore,
        households: entry.households,
        presenceGap: entry.presence === 0 ? "Abrir presencia" : "Expandir cobertura",
        salesState: entry.revenue === 0 ? "Sin ventas" : formatCurrency(entry.revenue),
      }))
      .sort((a, b) => b.score - a.score || b.households - a.households)
      .slice(0, 8);

    opportunityTable.innerHTML = rows
      .map(
        (row) => `
          <div class="table-row">
            <div>
              <strong>${row.municipality}</strong><br />
              <small>Hogares: ${formatNumber(row.households)} | Acción: ${row.presenceGap}</small>
            </div>
            <div>
              <strong class="neutral">${formatNumber(row.score)}/100</strong><br />
              <small>${row.salesState}</small>
            </div>
          </div>
        `,
      )
      .join("");
  }

  function renderKpiPlaybook(municipalityMap) {
    const records = getFilteredSales();
    const totalRevenue = records.reduce((sum, record) => sum + Number(record.revenue || 0), 0);
    const totalUnits = records.reduce((sum, record) => sum + Number(record.units || 0), 0);
    const totalPresence = networkLocations.filter((location) => location.region === selectedRegion).length;
    const totalLeaders = Array.from(municipalityMap.values()).reduce(
      (sum, entry) => sum + entry.leaders,
      0,
    );
    const totalSellers = Array.from(municipalityMap.values()).reduce(
      (sum, entry) => sum + entry.sellers,
      0,
    );
    const coveredMunicipalities = Array.from(municipalityMap.values()).filter(
      (entry) => entry.revenue > 0,
    ).length;
    const playbook = [
      {
        title: "Ingreso por vendedor",
        value: formatCurrency(totalSellers ? totalRevenue / totalSellers : 0),
        note: "Facturación dividida entre vendedores activos.",
      },
      {
        title: "Ingreso por punto",
        value: formatCurrency(totalPresence ? totalRevenue / totalPresence : 0),
        note: "Facturación dividida entre oficinas, kioskos y showrooms.",
      },
      {
        title: "Cobertura municipal",
        value: `${formatNumber(coveredMunicipalities)}/78`,
        note: "Municipios con ventas registradas en el periodo.",
      },
      {
        title: "Mix de portafolio",
        value: `${countActiveProducts(records)}/4`,
        note: "Cuántos productos lograron ventas reales.",
      },
      {
        title: "Apalancamiento",
        value: totalLeaders ? `${(totalSellers / totalLeaders).toFixed(1)}x` : "0.0x",
        note: "Relación entre vendedores y líderes.",
      },
      {
        title: "Ticket promedio",
        value: formatCurrency(totalUnits ? totalRevenue / totalUnits : 0),
        note: "Ayuda a evaluar calidad de cierres y mix.",
      },
    ];

    kpiPlaybook.innerHTML = playbook
      .map(
        (item) => `
          <div class="playbook-item">
            <strong>${item.title}</strong>
            <div>${item.value}</div>
            <small class="muted">${item.note}</small>
          </div>
        `,
      )
      .join("");
  }

  function countActiveProducts(records) {
    return new Set(records.map((record) => record.product)).size;
  }

  function renderIndustryFeed() {
    const severityBase = { Media: 2, Alta: 3, Baja: 1 };
    const scores = industrySignals.map((signal) => {
      const exposure = Number(riskAssessments[signal.id] || 2);
      return severityBase[signal.severity] * exposure;
    });
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const highCount = scores.filter((score) => score >= 7).length;

    riskSummary.innerHTML = `
      <span class="summary-pill">Riesgo agregado: ${formatNumber(totalScore)}</span>
      <span class="summary-pill">Señales altas: ${formatNumber(highCount)}</span>
      <span class="summary-pill">Fuentes oficiales: ${formatNumber(industrySignals.length)}</span>
    `;

    industryFeed.innerHTML = industrySignals
      .map((signal) => {
        const exposure = riskAssessments[signal.id] || "2";
        const score = (severityBase[signal.severity] || 2) * Number(exposure);
        const scoreLabel = score >= 7 ? "Alto" : score >= 4 ? "Medio" : "Bajo";
        return `
          <div class="feed-card">
            <strong>${signal.title}</strong>
            <small class="muted">${signal.category} | Severidad externa ${signal.severity}</small>
            <p>${signal.summary}</p>
            <p class="muted">${signal.whyItMatters}</p>
            <div class="split-fields">
              <div>
                <small class="muted">Exposición Solaris</small>
                <select data-risk-id="${signal.id}" class="risk-exposure">
                  <option value="1" ${exposure === "1" ? "selected" : ""}>Baja</option>
                  <option value="2" ${exposure === "2" ? "selected" : ""}>Media</option>
                  <option value="3" ${exposure === "3" ? "selected" : ""}>Alta</option>
                </select>
              </div>
              <div>
                <small class="muted">Riesgo combinado</small>
                <div class="${score >= 7 ? "negative" : score >= 4 ? "neutral" : "positive"}">${scoreLabel}</div>
              </div>
            </div>
            <a href="${signal.sourceUrl}" target="_blank" rel="noreferrer">${signal.sourceLabel}</a>
          </div>
        `;
      })
      .join("");

    industryFeed.querySelectorAll(".risk-exposure").forEach((select) => {
      select.addEventListener("change", async () => {
        if (!canAdjustRisks() || !canAccessCloudData()) {
          return;
        }
        riskAssessments[select.dataset.riskId] = select.value;
        if (isCloudActive() && supabase && authSession) {
          const { error } = await supabase.from("risk_assessments").upsert(
            {
              workspace_slug: WORKSPACE_SLUG,
              signal_id: select.dataset.riskId,
              exposure: Number(select.value),
            },
            { onConflict: "workspace_slug,signal_id" },
          );
          if (error) {
            setAuthMessage(`No se pudo guardar el riesgo: ${error.message}`);
            return;
          }
          await loadCloudData();
        } else {
          saveStoredData(STORAGE_KEYS.risks, riskAssessments);
          renderIndustryFeed();
          applyPermissions();
        }
      });
    });
  }

  function getRiskExposure(signalId) {
    return Number(riskAssessments[signalId] || 2);
  }

  function scoreMunicipalityForProduct(entry, productKey) {
    const territories = getCurrentTerritories();
    const maxHouseholds = Math.max(...territories.map((item) => item.households), 1);
    const maxPopulation = Math.max(...territories.map((item) => item.population), 1);
    const householdsBase = (entry.households / maxHouseholds) * 45;
    const populationBase = (entry.population / maxPopulation) * 22;
    const presenceBoost = Math.min(18, entry.presence * 4 + entry.sellers * 0.35);
    const whitespaceBoost = entry.productRevenue[productKey] > 0 ? 0 : 18;
    const crossSellBoost = entry.products.size * 2.5;
    const hurricaneExposure = getRiskExposure("hurricane-season");
    const droughtExposure = getRiskExposure("drought-pr");

    if (productKey === "Ritello") {
      return householdsBase * 0.6 + populationBase * 0.65 + presenceBoost + whitespaceBoost;
    }
    if (productKey === "Placas Solares") {
      return householdsBase * 0.95 + presenceBoost + whitespaceBoost + hurricaneExposure * 5;
    }
    if (productKey === "Sistemas de Agua") {
      return householdsBase * 0.82 + populationBase * 0.18 + whitespaceBoost + droughtExposure * 7 + crossSellBoost;
    }
    return householdsBase * 0.76 + presenceBoost + whitespaceBoost + hurricaneExposure * 6 + entry.productRevenue["Placas Solares"] / 5000;
  }

  function topMunicipalitiesForProduct(municipalityMap, productKey, limit = 3) {
    return Array.from(municipalityMap.values())
      .map((entry) => ({
        municipality: entry.municipality,
        score: scoreMunicipalityForProduct(entry, productKey),
        households: entry.households,
        currentRevenue: entry.productRevenue[productKey],
        presence: entry.presence,
        sellers: entry.sellers,
      }))
      .sort((a, b) => b.score - a.score || b.households - a.households)
      .slice(0, limit);
  }

  function statewideProductTotals(productKey) {
    return getFilteredSales()
      .filter((record) => record.product === productKey)
      .reduce(
        (acc, record) => {
          acc.units += Number(record.units || 0);
          acc.revenue += Number(record.revenue || 0);
          return acc;
        },
        { units: 0, revenue: 0 },
      );
  }

  function renderProductAdvisor(municipalityMap) {
    productAdvisor.innerHTML = PRODUCTS.map((product) => {
      const strategy = PRODUCT_STRATEGIES[product.key];
      const totals = statewideProductTotals(product.key);
      const priorities = topMunicipalitiesForProduct(municipalityMap, product.key);
      const recommendedMove =
        totals.revenue === 0
          ? `Abrir mercado con foco inicial en ${priorities.map((item) => item.municipality).join(", ")}.`
          : `Escalar el producto donde todavía hay espacio en ${priorities.map((item) => item.municipality).join(", ")}.`;

      return `
        <div class="advisor-card">
          <div class="advisor-top">
            <div>
              <strong>${product.label}</strong>
              <small class="muted">${strategy.audience}</small>
            </div>
            <span class="tag">${formatCurrency(totals.revenue)}</span>
          </div>
          <div class="advisor-kpis">
            <div class="advisor-kpi">
              <strong>Dónde</strong>
              <small class="muted">${priorities.map((item) => item.municipality).join(", ")}</small>
            </div>
            <div class="advisor-kpi">
              <strong>A quién</strong>
              <small class="muted">${strategy.audience}</small>
            </div>
            <div class="advisor-kpi">
              <strong>Cómo mercadear</strong>
              <small class="muted">${strategy.message}</small>
            </div>
          </div>
          <div class="advisor-tags">
            ${strategy.channels
              .split(",")
              .map((channel) => `<span class="status-pill">${channel.trim()}</span>`)
              .join("")}
          </div>
          <div class="advisor-note">
            <strong>Sugerencia del sistema</strong>
            <div>${recommendedMove}</div>
            <small class="muted">${strategy.milestoneLever}</small>
          </div>
        </div>
      `;
    }).join("");
  }

  function bestProductForRevenuePush(municipalityMap) {
    return PRODUCTS.map((product) => ({
      key: product.key,
      label: product.label,
      score: topMunicipalitiesForProduct(municipalityMap, product.key, 5).reduce(
        (sum, item) => sum + item.score,
        0,
      ),
    })).sort((a, b) => b.score - a.score)[0];
  }

  function renderMilestoneCoach(municipalityMap) {
    const records = getFilteredSales();
    const totalRevenue = records.reduce((sum, record) => sum + Number(record.revenue || 0), 0);
    const totalUnits = records.reduce((sum, record) => sum + Number(record.units || 0), 0);
    const totalPresence = networkLocations.filter((location) => location.region === selectedRegion).length;
    const totalSellers = Array.from(municipalityMap.values()).reduce(
      (sum, entry) => sum + entry.sellers,
      0,
    );
    const bestProduct = bestProductForRevenuePush(municipalityMap);
    const focusMunicipalities = topMunicipalitiesForProduct(municipalityMap, bestProduct.key).map(
      (item) => item.municipality,
    );
    const revenueGap = Math.max(0, Number(targets.revenue || 0) - totalRevenue);
    const unitGap = Math.max(0, Number(targets.units || 0) - totalUnits);
    const locationGap = Math.max(0, Number(targets.locations || 0) - totalPresence);
    const sellerGap = Math.max(0, Number(targets.sellers || 0) - totalSellers);

    const steps = [];
    if (!Object.values(targets).some((value) => Number(value) > 0)) {
      steps.push(
        "Configura metas numéricas para que el coach pueda medir brechas reales y priorizar acciones con más precisión.",
      );
    }
    if (revenueGap > 0) {
      steps.push(
        `Faltan ${formatCurrency(revenueGap)} para la meta de ingresos. Empuja ${bestProduct.label} en ${focusMunicipalities.join(", ")} con ofensiva consultiva y seguimiento diario.`,
      );
    }
    if (unitGap > 0) {
      steps.push(
        `Faltan ${formatNumber(unitGap)} unidades. Acelera Ritello y Sistemas de Agua con demostraciones, referidos y ofertas de entrada.`,
      );
    }
    if (locationGap > 0) {
      steps.push(
        `Faltan ${formatNumber(locationGap)} puntos físicos. Abre kioskos o showrooms ligeros en municipios con alto score y sin presencia actual.`,
      );
    }
    if (sellerGap > 0) {
      steps.push(
        `Faltan ${formatNumber(sellerGap)} vendedores. Recluta primero en plazas donde ya tienes líderes y pipeline potencial para acelerar productividad.`,
      );
    }
    if (!steps.length) {
      steps.push(
        "Las metas actuales ya están cubiertas. El siguiente milestone sugerido es subir la meta por producto o por municipio prioritario.",
      );
    }

    milestoneCoach.innerHTML = `
      <div class="advisor-card">
        <strong>Producto tractor recomendado</strong>
        <small class="muted">${bestProduct.label} es el mejor vehículo para empujar cumplimiento de milestones ahora mismo.</small>
      </div>
      <div class="advisor-card">
        <strong>Municipios de enfoque</strong>
        <small class="muted">${focusMunicipalities.join(", ")} muestran la mejor combinación entre espacio de mercado, hogares y capacidad comercial.</small>
      </div>
      <div class="advisor-card">
        <strong>Cadencia sugerida</strong>
        <small class="muted">Organiza la semana en prospección residencial, demostración/showroom, seguimiento de leads y cierre de bundle.</small>
      </div>
      ${steps
        .map(
          (step, index) => `
            <div class="milestone-step">
              <strong>Paso ${index + 1}</strong>
              <div>${step}</div>
            </div>
          `,
        )
        .join("")}
    `;
  }

  function renderSalesList() {
    const recent = salesRecords
      .filter((record) => record.region === selectedRegion)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
    salesList.innerHTML = recent.length
      ? recent
          .map(
            (record) => `
              <div class="record-item">
                <div>
                  <strong>${record.municipality} · ${productLabel(record.product)}</strong>
                  <small class="muted">${getCurrentRegionMeta().label} | ${record.year} | ${monthLabel(Number(record.month))} | ${formatNumber(record.units)} und. | ${formatCurrency(record.revenue)}</small>
                </div>
                ${
                  canDeleteRecords()
                    ? `<button class="remove-button" data-sale-id="${record.id}">Eliminar</button>`
                    : `<span class="tag">Solo lectura</span>`
                }
              </div>
            `,
          )
          .join("")
      : `<div class="empty-state">Todavía no hay ventas registradas. El dashboard está listo para empezar desde cero.</div>`;

    salesList.querySelectorAll("[data-sale-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!canDeleteRecords()) {
          return;
        }
        if (isCloudActive() && supabase && authSession) {
          await supabase.from("sales_records").delete().eq("id", button.dataset.saleId);
          await loadCloudData();
          return;
        }
        salesRecords = salesRecords.filter((record) => record.id !== button.dataset.saleId);
        saveStoredData(STORAGE_KEYS.sales, salesRecords);
        updateDashboard();
      });
    });
  }

  function renderNetworkList() {
    const recent = networkLocations
      .filter((location) => location.region === selectedRegion)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
    networkList.innerHTML = recent.length
      ? recent
          .map(
            (item) => `
              <div class="record-item">
                <div>
                  <strong>${item.name}</strong>
                  <span class="tag">${item.type}</span><br />
                  <small class="muted">${getCurrentRegionMeta().label} | ${item.municipality} | ${formatNumber(item.leaders)} líderes | ${formatNumber(item.sellers)} vendedores</small>
                </div>
                ${
                  canDeleteRecords()
                    ? `<button class="remove-button" data-location-id="${item.id}">Eliminar</button>`
                    : `<span class="tag">Solo lectura</span>`
                }
              </div>
            `,
          )
          .join("")
      : `<div class="empty-state">No hay oficinas, kioskos ni showrooms registrados todavía.</div>`;

    networkList.querySelectorAll("[data-location-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!canDeleteRecords()) {
          return;
        }
        if (isCloudActive() && supabase && authSession) {
          await supabase.from("network_locations").delete().eq("id", button.dataset.locationId);
          await loadCloudData();
          return;
        }
        networkLocations = networkLocations.filter((item) => item.id !== button.dataset.locationId);
        saveStoredData(STORAGE_KEYS.network, networkLocations);
        updateDashboard();
      });
    });
  }

  function productLabel(productKey) {
    return PRODUCTS.find((product) => product.key === productKey)?.label || productKey;
  }

  function renderProductChips() {
    productChips.innerHTML = PRODUCTS.map(
      (product) => `
        <button class="chip ${activeProducts.has(product.key) ? "active" : ""}" data-product="${product.key}">
          ${product.label}
        </button>
      `,
    ).join("");

    productChips.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const product = chip.dataset.product;
        if (activeProducts.has(product)) {
          activeProducts.delete(product);
        } else {
          activeProducts.add(product);
        }
        if (!activeProducts.size) {
          activeProducts = new Set(PRODUCTS.map((item) => item.key));
        }
        updateDashboard();
      });
    });
  }

  async function addSalesRecord() {
    if (!canEditRecords() || !canAccessCloudData()) {
      return;
    }
    const municipality = salesMunicipalitySelect.value;
    const product = salesProductSelect.value;
    const year = Number(salesYearSelect.value || 2026);
    const month = Number(salesMonthSelect.value);
    const units = Number(salesUnitsInput.value || 0);
    const revenue = Number(salesRevenueInput.value || 0);

    const nextRecord = {
      id: `sale-${Date.now()}`,
      region: selectedRegion,
      workspace_slug: WORKSPACE_SLUG,
      municipality,
      product,
      year,
      month,
      units,
      revenue,
      createdAt: Date.now(),
    };

    if (isCloudActive() && supabase && authSession) {
      const { error } = await supabase.from("sales_records").insert({
        workspace_slug: WORKSPACE_SLUG,
        region: nextRecord.region,
        municipality: nextRecord.municipality,
        product: nextRecord.product,
        year: nextRecord.year,
        month: nextRecord.month,
        units: nextRecord.units,
        revenue: nextRecord.revenue,
      });
      if (error) {
        setAuthMessage(`No se pudo guardar la venta: ${error.message}`);
        return;
      }
      await loadCloudData();
    } else {
      salesRecords.unshift(nextRecord);
      saveStoredData(STORAGE_KEYS.sales, salesRecords);
    }

    salesUnitsInput.value = "0";
    salesRevenueInput.value = "0";
    selectedMunicipality = municipality;
    updateDashboard();
  }

  async function addLocationRecord() {
    if (!canEditRecords() || !canAccessCloudData()) {
      return;
    }
    const name = locationNameInput.value.trim();
    const municipality = locationMunicipalitySelect.value;
    const type = locationTypeSelect.value;
    const leaders = Number(leadersInput.value || 0);
    const sellers = Number(sellersInput.value || 0);

    if (!name) {
      return;
    }

    const nextLocation = {
      id: `loc-${Date.now()}`,
      region: selectedRegion,
      workspace_slug: WORKSPACE_SLUG,
      name,
      municipality,
      type,
      leaders,
      sellers,
      createdAt: Date.now(),
    };

    if (isCloudActive() && supabase && authSession) {
      const { error } = await supabase.from("network_locations").insert({
        workspace_slug: WORKSPACE_SLUG,
        region: nextLocation.region,
        name: nextLocation.name,
        municipality: nextLocation.municipality,
        type: nextLocation.type,
        leaders: nextLocation.leaders,
        sellers: nextLocation.sellers,
      });
      if (error) {
        setAuthMessage(`No se pudo guardar el punto físico: ${error.message}`);
        return;
      }
      await loadCloudData();
    } else {
      networkLocations.unshift(nextLocation);
      saveStoredData(STORAGE_KEYS.network, networkLocations);
    }

    locationNameInput.value = "";
    leadersInput.value = "0";
    sellersInput.value = "0";
    selectedMunicipality = municipality;
    updateDashboard();
  }

  async function saveTargets() {
    if (!canManageTargets() || !canAccessCloudData()) {
      return;
    }
    targets = {
      revenue: Number(targetRevenueInput.value || 0),
      units: Number(targetUnitsInput.value || 0),
      locations: Number(targetLocationsInput.value || 0),
      sellers: Number(targetSellersInput.value || 0),
    };
    if (isCloudActive() && supabase && authSession) {
      const { error } = await supabase.from("kpi_targets").upsert(
        {
          workspace_slug: WORKSPACE_SLUG,
          revenue: targets.revenue,
          units: targets.units,
          locations: targets.locations,
          sellers: targets.sellers,
        },
        { onConflict: "workspace_slug" },
      );
      if (error) {
        setAuthMessage(`No se pudieron guardar las metas: ${error.message}`);
        return;
      }
      await loadCloudData();
    } else {
      saveStoredData(STORAGE_KEYS.targets, targets);
    }
    updateDashboard();
  }

  function resetDashboard() {
    salesRecords = [];
    networkLocations = [];
    targets = cloneValue(DEFAULT_TARGETS);
    riskAssessments = Object.fromEntries(industrySignals.map((signal) => [signal.id, "2"]));
    selectedMunicipality = null;
    saveStoredData(STORAGE_KEYS.sales, salesRecords);
    saveStoredData(STORAGE_KEYS.network, networkLocations);
    saveStoredData(STORAGE_KEYS.targets, targets);
    saveStoredData(STORAGE_KEYS.risks, riskAssessments);
    syncTargetInputs();
    updateDashboard();
  }

  function updateDashboard() {
    viewModeDescription.textContent = VIEW_MODE_TEXT[selectedView];
    renderProductChips();
    const municipalityMap = getMunicipalityStats();
    selectedMunicipality = selectedMunicipality || pickDefaultMunicipality(municipalityMap);
    buildKpis(municipalityMap);
    renderMap(municipalityMap);
    renderDetail(municipalityMap);
    renderTrend();
    renderOpportunityTable(municipalityMap);
    renderKpiPlaybook(municipalityMap);
    renderIndustryFeed();
    renderProductAdvisor(municipalityMap);
    renderMilestoneCoach(municipalityMap);
    renderSalesList();
    renderNetworkList();
    renderAccessList();
    renderAuditLog();
    renderAuthState();
    applyPermissions();
  }

  metricSelect.addEventListener("change", () => {
    selectedMetric = metricSelect.value;
    updateDashboard();
  });

  regionSelect.addEventListener("change", () => {
    selectedRegion = regionSelect.value;
    selectedMunicipality = null;
    populateSelectors();
    syncSalesYearToPeriod();
    updateDashboard();
  });

  periodSelect.addEventListener("change", () => {
    selectedPeriod = periodSelect.value;
    syncSalesYearToPeriod();
    updateDashboard();
  });

  viewModeSwitch.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      viewModeSwitch.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      selectedView = button.dataset.view;
      if (selectedView === "sales") {
        selectedMetric = "sellerProductivity";
        metricSelect.value = selectedMetric;
      }
      if (selectedView === "expansion") {
        selectedMetric = "presence";
        metricSelect.value = selectedMetric;
      }
      if (selectedView === "executive") {
        selectedMetric = "revenue";
        metricSelect.value = selectedMetric;
      }
      updateDashboard();
    });
  });

  addSalesButton.addEventListener("click", addSalesRecord);
  addLocationButton.addEventListener("click", addLocationRecord);
  saveTargetsButton.addEventListener("click", saveTargets);
  resetAllButton.addEventListener("click", resetDashboard);
  sendMagicLinkButton.addEventListener("click", sendMagicLink);
  signOutButton.addEventListener("click", signOut);
  syncNowButton.addEventListener("click", async () => {
    if (isCloudActive() && authSession) {
      await loadCloudData();
    } else {
      updateDashboard();
    }
  });

  await initCloudClient();
  updateDashboard();
})();
