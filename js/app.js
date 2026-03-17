const STORAGE_KEYS = {
    clients: "click_manager_clients",
    sessions: "click_manager_sessions",
    payments: "click_manager_payments",
    availability: "click_manager_availability",
    profile: "click_manager_profile",
    settings: "click_manager_settings",
    users: "click_manager_users",
    currentUser: "click_manager_current_user",
    contracts: "click_manager_contracts"
};

const defaultSettings = {
    professionalName: "",
    studioName: "",
    bio: "",
    instagram: "",
    whatsapp: "",
    website: "",
    city: "",
    sessionPrice: 0,
    monthlyAverageSessions: 0,
    bookingDeposit: 30,
    acceptedPayments: "Pix, Cartão, Boleto",
    paymentDeadline: "7 dias",
    publicName: "",
    publicBio: "",
    publicInstagram: "",
    watermarkText: "Click Manager",
    extraPhotoPrice: 35,
    galleryExpirationDays: 30,
    notificationsEmail: true,
    notificationsWhatsapp: false
};

function readStorage(key, fallback) {
    try {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignora falhas locais de armazenamento sem quebrar a UI.
    }
}

const state = {
    clients: readStorage(STORAGE_KEYS.clients, []),
    sessions: readStorage(STORAGE_KEYS.sessions, []),
    payments: readStorage(STORAGE_KEYS.payments, []),
    users: readStorage(STORAGE_KEYS.users, []),
    currentUser: readStorage(STORAGE_KEYS.currentUser, null),
    contracts: readStorage(STORAGE_KEYS.contracts, []),
    profile: readStorage(STORAGE_KEYS.profile, {
        sessionPrice: 0,
        monthlyAverageSessions: 0
    }),
    settings: {
        ...defaultSettings,
        ...readStorage(STORAGE_KEYS.settings, {})
    },
    gallerySelection: new Set(),
    calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedAgendaDate: new Date().toISOString().split("T")[0],
    availability: normalizeAvailability(readStorage(STORAGE_KEYS.availability, createDefaultAvailability()))
};

const photoPalette = [
    ["#a5b4fc", "#2563eb"],
    ["#c4b5fd", "#7c3aed"],
    ["#f9a8d4", "#ec4899"],
    ["#86efac", "#16a34a"],
    ["#fdba74", "#f97316"],
    ["#93c5fd", "#0f172a"]
];

const pricePerPhoto = 35;
const defaultSlots = ["09:00", "11:30", "15:00", "17:00"];
const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function createDefaultAvailability() {
    return {
        0: { enabled: false, slots: [] },
        1: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
        2: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
        3: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
        4: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
        5: { enabled: false, slots: ["09:00", "11:30"] },
        6: { enabled: false, slots: [] }
    };
}

function normalizeAvailability(rawAvailability) {
    const fallback = createDefaultAvailability();
    const normalized = {};

    for (let weekday = 0; weekday < 7; weekday += 1) {
        const source = rawAvailability?.[weekday] ?? fallback[weekday];
        normalized[weekday] = {
            enabled: Boolean(source?.enabled),
            slots: Array.isArray(source?.slots)
                ? source.slots.filter((slot) => defaultSlots.includes(slot))
                : [...fallback[weekday].slots]
        };
    }

    return normalized;
}

function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        weekday: "long"
    }).format(date);
}

function getSessionPrice(session) {
    return Number(session.price || state.profile.sessionPrice || 0);
}

function getCurrentMonthSessions() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${year}-${month}`;
    return state.sessions.filter((session) => session.date.startsWith(prefix));
}

function getPendingPayments() {
    return state.sessions
        .filter((session) => session.paymentStatus !== "Pago")
        .map((session) => ({
            id: session.id,
            client: session.client,
            label: session.title,
            amount: formatCurrency(getSessionPrice(session)),
            due: session.date,
            paymentStatus: session.paymentStatus || "Pendente"
        }));
}

function persistCurrentUser() {
    writeStorage(STORAGE_KEYS.currentUser, state.currentUser);
}

function persistSettings() {
    writeStorage(STORAGE_KEYS.settings, state.settings);
}

function getCurrentClient() {
    return state.currentUser?.role === "client" ? state.currentUser : null;
}

function getCurrentClientContract() {
    const client = getCurrentClient();
    if (!client) {
        return null;
    }
    return state.contracts.find((contract) => contract.clientEmail === client.email) || null;
}

function getPhotographerDisplayName() {
    return state.settings.publicName || state.settings.professionalName || "Fotógrafo";
}

function getSessionsForDate(dateString) {
    return state.sessions.filter((session) => session.date === dateString);
}

function getAvailabilityForDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    const weekday = date.getDay();
    const config = state.availability[weekday];
    if (!config?.enabled) {
        return { enabled: false, availableSlots: [], bookedSlots: [] };
    }

    const bookedSlots = getSessionsForDate(dateString).map((session) => session.time);
    const availableSlots = config.slots.filter((slot) => !bookedSlots.includes(slot));
    return { enabled: true, availableSlots, bookedSlots };
}

function buildSvgImage(title, index) {
    const [start, end] = photoPalette[index % photoPalette.length];
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
            <defs>
                <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stop-color="${start}" />
                    <stop offset="100%" stop-color="${end}" />
                </linearGradient>
            </defs>
            <rect width="800" height="800" fill="url(#g)" />
            <circle cx="630" cy="170" r="90" fill="rgba(255,255,255,0.18)" />
            <path d="M0 620 C120 520 180 500 320 580 S580 730 800 560 V800 H0 Z" fill="rgba(255,255,255,0.16)" />
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                fill="rgba(255,255,255,0.92)" font-size="54" font-family="Manrope, sans-serif" font-weight="800">
                ${title}
            </text>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const deliveryPhotos = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    title: `Foto ${String(index + 1).padStart(2, "0")}`,
    src: buildSvgImage(`Entrega ${index + 1}`, index + 3),
    price: pricePerPhoto
}));

const portfolioDb = {
    name: "click_manager_portfolio",
    version: 1,
    store: "images"
};
let portfolioDragId = null;

function openPortfolioDb() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(portfolioDb.name, portfolioDb.version);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(portfolioDb.store)) {
                db.createObjectStore(portfolioDb.store, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getPortfolioRecords() {
    if (!("indexedDB" in window)) {
        return [];
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readonly");
        const store = tx.objectStore(portfolioDb.store);
        const request = store.getAll();
        request.onsuccess = () => {
            const records = request.result.sort((a, b) => a.order - b.order);
            resolve(records);
            db.close();
        };
        request.onerror = () => {
            reject(request.error);
            db.close();
        };
    });
}

async function savePortfolioFile(file) {
    if (!("indexedDB" in window)) {
        return;
    }
    const records = await getPortfolioRecords();
    const nextOrder = records.length ? records[records.length - 1].order + 1 : 1;
    const record = {
        id: Date.now() + Math.random(),
        name: file.name,
        blob: file,
        order: nextOrder,
        createdAt: new Date().toISOString()
    };
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        tx.objectStore(portfolioDb.store).put(record);
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

async function updatePortfolioRecords(records) {
    if (!("indexedDB" in window)) {
        return;
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        const store = tx.objectStore(portfolioDb.store);
        records.forEach((record) => store.put(record));
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

async function deletePortfolioRecord(id) {
    if (!("indexedDB" in window)) {
        return;
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        tx.objectStore(portfolioDb.store).delete(id);
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

async function clearPortfolioRecords() {
    if (!("indexedDB" in window)) {
        return;
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        tx.objectStore(portfolioDb.store).clear();
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function setupSidebar() {
    const toggle = document.querySelector("[data-sidebar-toggle]");
    const sidebar = document.getElementById("sidebar");
    if (!toggle || !sidebar) {
        return;
    }

    toggle.addEventListener("click", () => {
        sidebar.classList.toggle("is-open");
    });
}

function setupAuth() {
    const tabs = document.querySelectorAll("[data-auth-tab]");
    const forms = {
        login: document.getElementById("loginForm"),
        register: document.getElementById("registerForm")
    };
    const roleSelect = document.getElementById("registerRole");
    const photographerFields = document.getElementById("photographerFields");
    const clientFields = document.getElementById("clientFields");
    const demoCredentials = {
        email: "demo@clickmanager.com",
        password: "123456"
    };

    if (!forms.login || !forms.register || tabs.length === 0) {
        return;
    }

    function setActiveAuthMode(mode) {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.authTab === mode;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });

        Object.entries(forms).forEach(([key, form]) => {
            const isActive = key === mode;
            form.classList.toggle("is-active", isActive);
            form.hidden = !isActive;
        });
    }

    function updateRegisterRoleView() {
        if (!roleSelect || !photographerFields || !clientFields || !forms.register) {
            return;
        }
        const isPhotographer = roleSelect.value === "photographer";
        photographerFields.hidden = !isPhotographer;
        clientFields.hidden = isPhotographer;
        ["sessionPrice", "monthlyAverageSessions"].forEach((name) => {
            const input = forms.register.elements[name];
            if (input) {
                input.required = isPhotographer;
            }
        });
        ["photographerName", "shareCode"].forEach((name) => {
            const input = forms.register.elements[name];
            if (input) {
                input.required = !isPhotographer;
            }
        });
    }

    roleSelect?.addEventListener("change", updateRegisterRoleView);
    updateRegisterRoleView();
    setActiveAuthMode("login");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const mode = tab.dataset.authTab;
            if (mode !== "login" && mode !== "register") {
                return;
            }
            setActiveAuthMode(mode);
        });
    });

    Object.values(forms).forEach((form) => {
        if (!form) {
            return;
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const email = form.elements.email.value.trim();
            const password = form.elements.password.value.trim();
            const feedback = form.querySelector(".form-feedback");

            if (!email || !password || password.length < 6 || !email.includes("@")) {
                feedback.textContent = "Verifique e-mail e senha. A senha precisa ter pelo menos 6 caracteres.";
                feedback.style.color = "var(--danger)";
                return;
            }

            if (form.id === "loginForm") {
                if (email !== demoCredentials.email || password !== demoCredentials.password) {
                    const user = state.users.find((item) => item.email === email && item.password === password);
                    if (!user) {
                        feedback.textContent = "Use o login de demonstração ou um cadastro criado na plataforma.";
                        feedback.style.color = "var(--danger)";
                        return;
                    }
                    state.currentUser = user;
                    persistCurrentUser();
                    feedback.style.color = "var(--success)";
                    feedback.textContent = user.role === "client"
                        ? "Acesso do cliente validado. Redirecionando."
                        : "Login validado. Redirecionando para o dashboard.";
                    window.setTimeout(() => {
                        window.location.href = user.role === "client"
                            ? "./pages/meus-contratos.html"
                            : "./pages/dashboard.html";
                    }, 900);
                    return;
                }

                state.currentUser = {
                    role: "photographer",
                    fullName: "Usuário Demo",
                    email: demoCredentials.email
                };
                persistCurrentUser();
                feedback.style.color = "var(--success)";
                feedback.textContent = "Login validado. Redirecionando para o dashboard.";
            } else {
                const role = form.elements.role.value;
                const fullName = form.elements.fullName.value.trim();
                if (state.users.some((item) => item.email === email)) {
                    feedback.textContent = "Já existe uma conta com este e-mail.";
                    feedback.style.color = "var(--danger)";
                    return;
                }

                if (role === "photographer") {
                    const sessionPrice = Number(form.elements.sessionPrice?.value || 0);
                    const monthlyAverageSessions = Number(form.elements.monthlyAverageSessions?.value || 0);
                    if (sessionPrice <= 0 || monthlyAverageSessions <= 0) {
                        feedback.textContent = "Informe o valor do ensaio e a média mensal para configurar o painel.";
                        feedback.style.color = "var(--danger)";
                        return;
                    }

                    state.profile = {
                        sessionPrice,
                        monthlyAverageSessions
                    };
                    writeStorage(STORAGE_KEYS.profile, state.profile);
                    state.settings = {
                        ...state.settings,
                        professionalName: fullName,
                        publicName: fullName,
                        sessionPrice,
                        monthlyAverageSessions
                    };
                    persistSettings();
                }

                const newUser = {
                    id: Date.now(),
                    role,
                    fullName,
                    email,
                    password,
                    photographerName: form.elements.photographerName?.value.trim() || "",
                    shareCode: form.elements.shareCode?.value.trim() || ""
                };
                state.users.push(newUser);
                writeStorage(STORAGE_KEYS.users, state.users);

                if (role === "client") {
                    const contract = {
                        id: `CTR-${Date.now()}`,
                        clientEmail: email,
                        clientName: fullName,
                        photographerName: newUser.photographerName || "Fotógrafo responsável",
                        shareCode: newUser.shareCode || "Link compartilhado",
                        status: "Pendente",
                        signedAt: null,
                        title: "Contrato de prestação de serviço fotográfico"
                    };
                    state.contracts.push(contract);
                    writeStorage(STORAGE_KEYS.contracts, state.contracts);
                    feedback.textContent = "Cadastro do cliente concluído. Faça login para assinar o contrato e acessar seus ensaios.";
                } else {
                    feedback.textContent = "Cadastro criado com sucesso. O painel financeiro já foi configurado com sua média inicial.";
                }

                feedback.style.color = "var(--success)";
                setActiveAuthMode("login");
            }

            window.setTimeout(() => {
                if (form.id === "loginForm") {
                    window.location.href = "./pages/dashboard.html";
                }
            }, 900);
        });
    });
}

function renderDashboard() {
    const summaryCards = document.getElementById("summaryCards");
    const upcomingSessions = document.getElementById("upcomingSessions");
    const pendingPayments = document.getElementById("pendingPayments");
    const recentClients = document.getElementById("recentClients");
    const agendaHighlights = document.getElementById("agendaHighlights");
    const financeChart = document.getElementById("financeChart");
    const financialPeriodBadge = document.getElementById("financialPeriodBadge");
    const heroMetricLabel = document.getElementById("heroMetricLabel");
    const heroMetricValue = document.getElementById("heroMetricValue");
    const heroMetricHelper = document.getElementById("heroMetricHelper");

    if (!summaryCards || !upcomingSessions || !pendingPayments || !recentClients) {
        return;
    }

    const currentMonthSessions = getCurrentMonthSessions();
    const pendingPaymentItems = getPendingPayments();
    const completedRevenue = currentMonthSessions
        .filter((session) => session.paymentStatus === "Pago")
        .reduce((sum, session) => sum + getSessionPrice(session), 0);
    const estimatedRevenue = state.profile.sessionPrice * state.profile.monthlyAverageSessions;
    const sessionsGoalPercent = state.profile.monthlyAverageSessions > 0
        ? Math.min(100, Math.round((currentMonthSessions.length / state.profile.monthlyAverageSessions) * 100))
        : 0;
    const revenueGoalPercent = estimatedRevenue > 0
        ? Math.min(100, Math.round((completedRevenue / estimatedRevenue) * 100))
        : 0;
    const contractCoveragePercent = currentMonthSessions.length > 0
        ? Math.round((currentMonthSessions.filter((session) => session.contract).length / currentMonthSessions.length) * 100)
        : 0;

    const metrics = [
        { label: "Próximos ensaios", value: state.sessions.length, helper: "Agenda registrada no sistema" },
        { label: "Pagamentos pendentes", value: pendingPaymentItems.length, helper: "Recebimentos vinculados aos ensaios" },
        { label: "Clientes ativos", value: state.clients.filter((client) => client.status === "Ativo").length, helper: "Base com contrato ativo" },
        { label: "Média estimada mensal", value: formatCurrency(estimatedRevenue), helper: "Baseada no cadastro do fotógrafo" }
    ];

    if (heroMetricLabel && heroMetricValue && heroMetricHelper) {
        heroMetricLabel.textContent = "Média mensal estimada";
        heroMetricValue.textContent = formatCurrency(estimatedRevenue);
        heroMetricHelper.textContent = state.profile.monthlyAverageSessions > 0
            ? `${state.profile.monthlyAverageSessions} ensaios/mês x ${formatCurrency(state.profile.sessionPrice)} por ensaio.`
            : "Complete o cadastro do fotógrafo para gerar a média mensal.";
    }

    summaryCards.innerHTML = metrics.map((item) => `
        <article class="metric-card">
            <p>${item.label}</p>
            <strong>${item.value}</strong>
            <small>${item.helper}</small>
        </article>
    `).join("");

    upcomingSessions.innerHTML = state.sessions.length ? state.sessions.slice(0, 3).map((session) => `
        <div class="stack-item">
            <strong>${session.title}</strong>
            <div class="stack-item__meta">${session.client} · ${session.date} · ${session.time}</div>
            <div class="stack-item__meta">${session.location} · ${session.status}</div>
        </div>
    `).join("") : `<div class="stack-item"><strong>Nenhum ensaio cadastrado</strong><div class="stack-item__meta">Adicione ensaios reais para visualizar sua agenda.</div></div>`;

    pendingPayments.innerHTML = pendingPaymentItems.length ? pendingPaymentItems.map((payment) => `
        <div class="stack-item">
            <strong>${payment.amount}</strong>
            <div class="stack-item__meta">${payment.client} · ${payment.label}</div>
            <div class="stack-item__meta">${payment.paymentStatus} · ${payment.due}</div>
        </div>
    `).join("") : `<div class="stack-item"><strong>Nenhum pagamento pendente</strong><div class="stack-item__meta">Cadastre valores reais conforme seus contratos.</div></div>`;

    recentClients.innerHTML = state.clients.length ? state.clients.slice(0, 4).map((client) => `
        <div class="client-item">
            <div class="client-line">
                <strong>${client.name}</strong>
                <span class="badge">${client.status}</span>
            </div>
            <div class="client-meta">${client.email}</div>
            <div class="client-meta">${client.type} · Último ensaio ${client.lastSession}</div>
        </div>
    `).join("") : `<div class="client-item"><strong>Nenhum cliente recente</strong><div class="client-meta">Cadastre clientes para alimentar o painel.</div></div>`;

    if (agendaHighlights) {
        agendaHighlights.innerHTML = state.sessions.length ? state.sessions.slice(0, 4).map((session) => `
            <div class="stack-item">
                <strong>${session.title}</strong>
                <div class="stack-item__meta">${session.date} · ${session.time}</div>
                <div class="stack-item__meta">${session.client} · ${session.location}</div>
                <div class="stack-item__meta">${session.contract ? `Contrato ${session.contract}` : "Sem contrato vinculado"}</div>
            </div>
        `).join("") : `<div class="stack-item"><strong>Sua agenda está limpa</strong><div class="stack-item__meta">Use a página de ensaios para cadastrar compromissos reais.</div></div>`;
    }

    if (financeChart && financialPeriodBadge) {
        financialPeriodBadge.textContent = new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric"
        }).format(new Date());

        const indicators = [
            { label: "Meta de ensaios", percent: sessionsGoalPercent, helper: `${currentMonthSessions.length} de ${state.profile.monthlyAverageSessions || 0} ensaios` },
            { label: "Meta de receita", percent: revenueGoalPercent, helper: `${formatCurrency(completedRevenue)} de ${formatCurrency(estimatedRevenue)}` },
            { label: "Ensaios com contrato", percent: contractCoveragePercent, helper: `${currentMonthSessions.filter((session) => session.contract).length} com contrato` }
        ];

        financeChart.innerHTML = indicators.map((item, index) => `
            <div class="bar bar-${index + 1}" style="min-height:${Math.max(112, item.percent * 1.8)}px">
                <span>${item.label}</span>
                <strong>${item.percent}%</strong>
                <small>${item.helper}</small>
            </div>
        `).join("");
    }
}

function renderAgendaControls() {
    const settingsRoot = document.getElementById("weekdaySettings");
    if (!settingsRoot) {
        return;
    }

    state.availability = normalizeAvailability(state.availability);

    settingsRoot.innerHTML = weekdayNames.map((name, weekday) => {
        const config = state.availability[weekday];
        return `
            <div class="weekday-card">
                <div class="weekday-card__top">
                    <div>
                        <strong>${name}</strong>
                        <div class="client-meta">${config.enabled ? "Disponível para agendamento" : "Fora da agenda"}</div>
                    </div>
                    <label class="switch" aria-label="Ativar ${name}">
                        <input type="checkbox" data-weekday-toggle="${weekday}" ${config.enabled ? "checked" : ""}>
                        <span></span>
                    </label>
                </div>
                <div class="slot-group">
                    <span class="client-meta">Horários liberados</span>
                    <div class="slot-chips">
                        ${defaultSlots.map((slot) => `
                            <button
                                class="slot-chip ${config.slots.includes(slot) ? "is-active" : ""}"
                                type="button"
                                data-slot-toggle="${weekday}|${slot}"
                            >${slot}</button>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    }).join("");

    settingsRoot.querySelectorAll("[data-weekday-toggle]").forEach((input) => {
        input.addEventListener("change", () => {
            const weekday = Number(input.dataset.weekdayToggle);
            state.availability[weekday].enabled = input.checked;
            writeStorage(STORAGE_KEYS.availability, state.availability);
            renderAgenda();
        });
    });

    settingsRoot.querySelectorAll("[data-slot-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
            const [weekdayRaw, slot] = button.dataset.slotToggle.split("|");
            const weekday = Number(weekdayRaw);
            const slotList = state.availability[weekday].slots;
            const index = slotList.indexOf(slot);

            if (index >= 0) {
                slotList.splice(index, 1);
            } else {
                slotList.push(slot);
                slotList.sort();
            }

            writeStorage(STORAGE_KEYS.availability, state.availability);
            renderAgenda();
        });
    });
}

function renderAgendaCalendar() {
    const calendarRoot = document.getElementById("agendaCalendar");
    const monthLabel = document.getElementById("calendarMonthLabel");
    if (!calendarRoot || !monthLabel) {
        return;
    }

    state.availability = normalizeAvailability(state.availability);

    const monthDate = state.calendarDate;
    monthLabel.textContent = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric"
    }).format(monthDate);

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const calendarDays = [];

    for (let index = 0; index < 42; index += 1) {
        const dayNumber = index - startOffset + 1;
        let currentDate;
        let outside = false;

        if (dayNumber <= 0) {
            currentDate = new Date(year, month - 1, daysInPreviousMonth + dayNumber);
            outside = true;
        } else if (dayNumber > daysInMonth) {
            currentDate = new Date(year, month + 1, dayNumber - daysInMonth);
            outside = true;
        } else {
            currentDate = new Date(year, month, dayNumber);
        }

        const dateString = currentDate.toISOString().split("T")[0];
        const sessions = getSessionsForDate(dateString);
        const availability = getAvailabilityForDate(dateString);
        const isSelected = state.selectedAgendaDate === dateString;

        calendarDays.push(`
            <button
                class="calendar-day ${outside ? "is-outside" : ""} ${sessions.length ? "is-session" : ""} ${!availability.enabled ? "is-unavailable" : ""} ${isSelected ? "is-selected" : ""}"
                type="button"
                data-calendar-date="${dateString}"
            >
                <span class="calendar-day__number">${currentDate.getDate()}</span>
                <div class="calendar-day__meta">
                    ${sessions.length ? `<span class="calendar-chip calendar-chip--session">${sessions.length} ensaio${sessions.length > 1 ? "s" : ""}</span>` : ""}
                    ${availability.enabled
                        ? `<span class="calendar-chip calendar-chip--available">${availability.availableSlots.length} horário${availability.availableSlots.length !== 1 ? "s" : ""}</span>`
                        : `<span class="calendar-chip">${weekdayNames[currentDate.getDay()].slice(0, 3)} bloqueado</span>`
                    }
                </div>
            </button>
        `);
    }

    calendarRoot.innerHTML = calendarDays.join("");

    calendarRoot.querySelectorAll("[data-calendar-date]").forEach((button) => {
        button.addEventListener("click", () => {
            state.selectedAgendaDate = button.dataset.calendarDate;
            renderAgenda();
        });
    });
}

function renderSelectedDateAvailability() {
    const label = document.getElementById("selectedDateLabel");
    const status = document.getElementById("selectedDateStatus");
    const slotsRoot = document.getElementById("clientAvailabilitySlots");
    if (!label || !status || !slotsRoot) {
        return;
    }

    const dateString = state.selectedAgendaDate;
    const sessions = getSessionsForDate(dateString);
    const availability = getAvailabilityForDate(dateString);
    label.textContent = formatDateLabel(dateString);

    if (!availability.enabled) {
        status.textContent = "Este dia está fechado na agenda do fotógrafo.";
        slotsRoot.innerHTML = `<span class="slot-chip is-disabled">Sem disponibilidade</span>`;
        return;
    }

    if (availability.availableSlots.length === 0) {
        status.textContent = sessions.length
            ? "Todos os horários de trabalho deste dia já estão ocupados."
            : "Nenhum horário foi liberado pelo fotógrafo para esta data.";
    } else {
        status.textContent = sessions.length
            ? "Horários disponíveis já descontam os ensaios agendados."
            : "Dia disponível para novos agendamentos.";
    }

    const availableMarkup = availability.availableSlots.map((slot) => `<span class="slot-chip is-active">${slot}</span>`);
    const bookedMarkup = availability.bookedSlots.map((slot) => `<span class="slot-chip is-booked">${slot}</span>`);
    slotsRoot.innerHTML = [...availableMarkup, ...bookedMarkup].join("") || `<span class="slot-chip is-disabled">Sem horários livres</span>`;
}

function setupAgendaNavigation() {
    const prevButton = document.getElementById("prevMonthBtn");
    const nextButton = document.getElementById("nextMonthBtn");
    if (!prevButton || !nextButton) {
        return;
    }

    prevButton.addEventListener("click", () => {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
        renderAgenda();
    });

    nextButton.addEventListener("click", () => {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
        renderAgenda();
    });
}

function renderAgenda() {
    const calendarRoot = document.getElementById("agendaCalendar");
    const settingsRoot = document.getElementById("weekdaySettings");
    if (!calendarRoot) {
        return;
    }

    if (!state.selectedAgendaDate) {
        state.selectedAgendaDate = new Date().toISOString().split("T")[0];
    }

    state.availability = normalizeAvailability(state.availability);
    writeStorage(STORAGE_KEYS.availability, state.availability);

    renderAgendaControls();
    renderAgendaCalendar();
    renderSelectedDateAvailability();

    if (calendarRoot.innerHTML.trim() === "") {
        calendarRoot.innerHTML = `<div class="stack-item"><strong>Calendário indisponível</strong><div class="stack-item__meta">Recarregue a página para aplicar a configuração padrão.</div></div>`;
    }

    if (settingsRoot && settingsRoot.innerHTML.trim() === "") {
        settingsRoot.innerHTML = `<div class="stack-item"><strong>Configurações indisponíveis</strong><div class="stack-item__meta">A agenda foi reinicializada com a configuração padrão.</div></div>`;
    }
}

function renderClientContracts() {
    const title = document.getElementById("clientContractsTitle");
    const subtitle = document.getElementById("clientContractsSubtitle");
    const badge = document.getElementById("contractStatusBadge");
    const card = document.getElementById("contractCard");
    if (!title || !subtitle || !badge || !card) {
        return;
    }

    const client = getCurrentClient();
    const contract = getCurrentClientContract();
    if (!client || !contract) {
        title.textContent = "Meus Contratos";
        subtitle.textContent = "Faça login pelo link compartilhado para acessar o contrato do seu ensaio.";
        badge.textContent = "Sem acesso";
        card.innerHTML = `<div class="stack-item"><strong>Nenhum contrato disponível</strong><div class="stack-item__meta">Entre com uma conta de cliente para visualizar e assinar.</div></div>`;
        return;
    }

    title.textContent = `Meus Contratos | ${contract.photographerName}`;
    subtitle.textContent = `Você recebeu este contrato a partir do compartilhamento do ensaio com ${contract.photographerName}.`;
    badge.textContent = contract.status;
    card.innerHTML = `
        <div class="stack-item">
            <strong>${contract.title}</strong>
            <div class="stack-item__meta">Fotógrafo: ${contract.photographerName}</div>
            <div class="stack-item__meta">Cliente: ${contract.clientName}</div>
            <div class="stack-item__meta">Origem do acesso: ${contract.shareCode}</div>
            <div class="stack-item__meta">Status atual: ${contract.status}</div>
            ${contract.signedAt ? `<div class="stack-item__meta">Assinado em ${contract.signedAt}</div>` : `<button class="btn btn-primary" type="button" id="signContractBtn">Assinar contrato</button>`}
        </div>
    `;

    document.getElementById("signContractBtn")?.addEventListener("click", () => {
        contract.status = "Assinado";
        contract.signedAt = new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date());
        writeStorage(STORAGE_KEYS.contracts, state.contracts);
        renderClientContracts();
    });
}

function renderClientSessions() {
    const title = document.getElementById("clientSessionsTitle");
    const subtitle = document.getElementById("clientSessionsSubtitle");
    const gate = document.getElementById("clientSessionsGate");
    if (!title || !subtitle || !gate) {
        return;
    }

    const client = getCurrentClient();
    const contract = getCurrentClientContract();
    if (!client || !contract) {
        gate.innerHTML = `<div class="stack-item"><strong>Acesso indisponível</strong><div class="stack-item__meta">Faça login com uma conta de cliente para visualizar seus ensaios.</div></div>`;
        return;
    }

    title.textContent = `Meus Ensaios | ${contract.photographerName}`;
    subtitle.textContent = `Área vinculada ao fotógrafo ${contract.photographerName}.`;

    if (contract.status !== "Assinado") {
        gate.innerHTML = `
            <div class="stack-item">
                <strong>Assinatura pendente</strong>
                <div class="stack-item__meta">Você precisa assinar o contrato em Meus Contratos antes de acessar os ensaios.</div>
                <a class="btn btn-primary" href="./meus-contratos.html">Ir para Meus Contratos</a>
            </div>
        `;
        return;
    }

    const clientSessions = state.sessions.filter((session) =>
        session.client?.toLowerCase() === client.fullName.toLowerCase() || session.clientEmail === client.email
    );

    gate.innerHTML = clientSessions.length ? `
        <div class="stack-list">
            ${clientSessions.map((session) => `
                <div class="session-item">
                    <div class="session-line">
                        <strong>${session.title}</strong>
                        <span class="badge">${session.status}</span>
                    </div>
                    <div class="client-meta">${session.date} · ${session.time} · ${session.location}</div>
                    <div class="client-meta">Fotógrafo: ${contract.photographerName}</div>
                    <div class="client-meta">Contrato: ${session.contract || "Não vinculado"} · Imagens enviadas: ${session.imageCount || 0}</div>
                </div>
            `).join("")}
        </div>
    ` : `<div class="stack-item"><strong>Nenhum ensaio disponível ainda</strong><div class="stack-item__meta">Assim que o fotógrafo cadastrar ou compartilhar seus ensaios, eles aparecerão aqui.</div></div>`;
}

function populateSettingsForm(formId, fields) {
    const form = document.getElementById(formId);
    if (!form) {
        return null;
    }
    fields.forEach((field) => {
        const input = form.elements[field];
        if (!input) {
            return;
        }
        if (input.type === "checkbox") {
            input.checked = Boolean(state.settings[field]);
        } else {
            input.value = state.settings[field] ?? "";
        }
    });
    return form;
}

function updateSettingsSummary() {
    const value = document.getElementById("settingsSummaryValue");
    const helper = document.getElementById("settingsSummaryHelper");
    if (!value || !helper) {
        return;
    }
    value.textContent = getPhotographerDisplayName();
    helper.textContent = state.settings.sessionPrice > 0
        ? `${formatCurrency(Number(state.settings.sessionPrice))} por ensaio · média de ${state.settings.monthlyAverageSessions || 0} ensaios/mês.`
        : "Preencha as seções abaixo para personalizar a plataforma.";
}

function setupSettings() {
    const professionalForm = populateSettingsForm("professionalSettingsForm", [
        "professionalName", "studioName", "bio", "instagram", "whatsapp", "website", "city"
    ]);
    const financialForm = populateSettingsForm("financialSettingsForm", [
        "sessionPrice", "monthlyAverageSessions", "bookingDeposit", "acceptedPayments", "paymentDeadline"
    ]);
    const portfolioForm = populateSettingsForm("portfolioSettingsForm", [
        "publicName", "publicBio", "publicInstagram"
    ]);
    const deliveryForm = populateSettingsForm("deliverySettingsForm", [
        "watermarkText", "extraPhotoPrice", "galleryExpirationDays"
    ]);
    const notificationForm = populateSettingsForm("notificationSettingsForm", [
        "notificationsEmail", "notificationsWhatsapp"
    ]);

    updateSettingsSummary();

    professionalForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        Object.assign(state.settings, {
            professionalName: professionalForm.elements.professionalName.value.trim(),
            studioName: professionalForm.elements.studioName.value.trim(),
            bio: professionalForm.elements.bio.value.trim(),
            instagram: professionalForm.elements.instagram.value.trim(),
            whatsapp: professionalForm.elements.whatsapp.value.trim(),
            website: professionalForm.elements.website.value.trim(),
            city: professionalForm.elements.city.value.trim()
        });
        persistSettings();
        updateSettingsSummary();
    });

    financialForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        Object.assign(state.settings, {
            sessionPrice: Number(financialForm.elements.sessionPrice.value || 0),
            monthlyAverageSessions: Number(financialForm.elements.monthlyAverageSessions.value || 0),
            bookingDeposit: Number(financialForm.elements.bookingDeposit.value || 0),
            acceptedPayments: financialForm.elements.acceptedPayments.value.trim(),
            paymentDeadline: financialForm.elements.paymentDeadline.value.trim()
        });
        state.profile = {
            sessionPrice: Number(state.settings.sessionPrice || 0),
            monthlyAverageSessions: Number(state.settings.monthlyAverageSessions || 0)
        };
        writeStorage(STORAGE_KEYS.profile, state.profile);
        persistSettings();
        updateSettingsSummary();
        renderDashboard();
    });

    portfolioForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        Object.assign(state.settings, {
            publicName: portfolioForm.elements.publicName.value.trim(),
            publicBio: portfolioForm.elements.publicBio.value.trim(),
            publicInstagram: portfolioForm.elements.publicInstagram.value.trim()
        });
        persistSettings();
        updateSettingsSummary();
        renderPortfolio();
    });

    deliveryForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        Object.assign(state.settings, {
            watermarkText: deliveryForm.elements.watermarkText.value.trim() || "Click Manager",
            extraPhotoPrice: Number(deliveryForm.elements.extraPhotoPrice.value || 0),
            galleryExpirationDays: Number(deliveryForm.elements.galleryExpirationDays.value || 30)
        });
        persistSettings();
        updateSettingsSummary();
        renderGallery();
    });

    notificationForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        Object.assign(state.settings, {
            notificationsEmail: notificationForm.elements.notificationsEmail.checked,
            notificationsWhatsapp: notificationForm.elements.notificationsWhatsapp.checked
        });
        persistSettings();
        updateSettingsSummary();
    });
}

function setupModals() {
    const openButtons = document.querySelectorAll("[data-modal-open]");
    const closeButtons = document.querySelectorAll("[data-modal-close]");

    openButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const modal = document.getElementById(button.dataset.modalOpen);
            modal?.classList.add("is-open");
            modal?.setAttribute("aria-hidden", "false");
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const modal = button.closest(".modal");
            modal?.classList.remove("is-open");
            modal?.setAttribute("aria-hidden", "true");
        });
    });
}

function renderClients() {
    const tableBody = document.getElementById("clientTableBody");
    const countBadge = document.getElementById("clientCountBadge");
    if (!tableBody || !countBadge) {
        return;
    }

    countBadge.textContent = `${state.clients.length} clientes`;
    tableBody.innerHTML = state.clients.length ? state.clients.map((client) => `
        <tr>
            <td><strong>${client.name}</strong></td>
            <td>${client.email}</td>
            <td>${client.type}</td>
            <td>${client.status}</td>
            <td>${client.lastSession}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-ghost" type="button" data-edit-client="${client.id}">Editar</button>
                </div>
            </td>
        </tr>
    `).join("") : `<tr><td colspan="6">Nenhum cliente cadastrado. Use o botão "Adicionar cliente" para começar.</td></tr>`;

    tableBody.querySelectorAll("[data-edit-client]").forEach((button) => {
        button.addEventListener("click", () => openClientModal(Number(button.dataset.editClient)));
    });
}

function openClientModal(clientId) {
    const modal = document.getElementById("clientModal");
    const form = document.getElementById("clientForm");
    const title = document.getElementById("clientModalTitle");
    if (!modal || !form || !title) {
        return;
    }

    const client = state.clients.find((item) => item.id === clientId);
    title.textContent = client ? "Editar cliente" : "Novo cliente";
    form.reset();
    form.elements.clientId.value = "";

    if (client) {
        form.elements.clientId.value = client.id;
        form.elements.name.value = client.name;
        form.elements.email.value = client.email;
        form.elements.type.value = client.type;
        form.elements.status.value = client.status;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

function setupClientForm() {
    const form = document.getElementById("clientForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const id = Number(form.elements.clientId.value);
        const payload = {
            id: id || Date.now(),
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            type: form.elements.type.value,
            status: form.elements.status.value,
            lastSession: "Novo cadastro"
        };

        if (!payload.name || !payload.email) {
            return;
        }

        if (id) {
            state.clients = state.clients.map((client) => client.id === id ? { ...client, ...payload, lastSession: client.lastSession } : client);
        } else {
            state.clients.unshift(payload);
        }

        writeStorage(STORAGE_KEYS.clients, state.clients);
        renderClients();
        renderDashboard();
        document.getElementById("clientModal")?.classList.remove("is-open");
        form.reset();
    });
}

function renderSessions() {
    const sessionList = document.getElementById("sessionList");
    const startInput = document.getElementById("filterStart");
    const endInput = document.getElementById("filterEnd");
    if (!sessionList) {
        return;
    }

    const start = startInput?.value || "";
    const end = endInput?.value || "";
    const filtered = state.sessions.filter((session) => {
        if (start && session.date < start) {
            return false;
        }
        if (end && session.date > end) {
            return false;
        }
        return true;
    });

    sessionList.innerHTML = filtered.length
        ? filtered.map((session) => `
            <article class="session-item">
                <div class="session-line">
                    <strong>${session.title}</strong>
                    <span class="badge">${session.status}</span>
                </div>
                <div class="client-meta">${session.client} · ${session.date} · ${session.time}</div>
                <div class="client-meta">${session.location}</div>
                <div class="client-meta">Contrato: ${session.contract || "Não vinculado"} · Valor: ${formatCurrency(getSessionPrice(session))}</div>
                <div class="client-meta">Pagamento: ${session.paymentStatus || "Pendente"} · Imagens: ${session.imageCount || 0}</div>
            </article>
        `).join("")
        : `<article class="session-item"><strong>Nenhum ensaio cadastrado</strong><div class="client-meta">Crie seus próximos compromissos para alimentar a agenda.</div></article>`;
}

function setupSessions() {
    const sessionForm = document.getElementById("sessionForm");
    const filters = [document.getElementById("filterStart"), document.getElementById("filterEnd")];

    filters.forEach((filter) => filter?.addEventListener("input", renderSessions));

    if (sessionForm) {
        if (sessionForm.elements.price) {
            sessionForm.elements.price.value = state.profile.sessionPrice || "";
        }
        if (sessionForm.elements.time) {
            sessionForm.elements.time.value = "10:00";
        }

        sessionForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const files = Array.from(sessionForm.elements.images.files || []);
            const linkedClient = state.users.find((user) =>
                user.role === "client" && user.fullName.toLowerCase() === sessionForm.elements.client.value.trim().toLowerCase()
            );
            state.sessions.unshift({
                id: Date.now(),
                title: sessionForm.elements.title.value.trim(),
                client: sessionForm.elements.client.value.trim(),
                clientEmail: linkedClient?.email || "",
                date: sessionForm.elements.date.value,
                time: sessionForm.elements.time.value,
                location: sessionForm.elements.location.value.trim(),
                contract: sessionForm.elements.contract.value.trim(),
                price: Number(sessionForm.elements.price.value || state.profile.sessionPrice || 0),
                paymentStatus: sessionForm.elements.paymentStatus.value,
                imageCount: files.length,
                imageNames: files.map((file) => file.name),
                status: "Novo"
            });
            writeStorage(STORAGE_KEYS.sessions, state.sessions);
            renderSessions();
            renderDashboard();
            renderAgenda();
            document.getElementById("sessionModal")?.classList.remove("is-open");
            sessionForm.reset();
        });
    }
}

async function renderPortfolio() {
    const portfolioGrid = document.getElementById("portfolioGrid");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightboxImage");
    const emptyState = document.getElementById("portfolioEmptyState");
    const countBadge = document.getElementById("portfolioCountBadge");
    const portfolioTitle = document.querySelector(".portfolio-header__content h1");
    const portfolioBio = document.querySelector(".portfolio-header__content p:not(.eyebrow)");
    const portfolioInstagram = document.querySelector(".instagram-link");
    if (!portfolioGrid || !lightbox || !lightboxImage) {
        return;
    }

    if (portfolioTitle) {
        portfolioTitle.textContent = state.settings.publicName || "Seu Portfólio";
    }
    if (portfolioBio) {
        portfolioBio.textContent = state.settings.publicBio || "Atualize sua bio em Configurações para apresentar melhor seu trabalho.";
    }
    if (portfolioInstagram) {
        const handle = state.settings.publicInstagram || state.settings.instagram || "";
        portfolioInstagram.textContent = handle || "Adicione seu Instagram em Configurações";
        portfolioInstagram.href = handle ? `https://instagram.com/${handle.replace("@", "")}` : "#";
    }

    const records = await getPortfolioRecords();
    countBadge.textContent = `${records.length} imagem${records.length !== 1 ? "ens" : ""}`;
    emptyState.hidden = records.length !== 0;

    portfolioGrid.innerHTML = records.map((photo) => {
        const src = URL.createObjectURL(photo.blob);
        return `
        <article class="portfolio-card" data-preview-image="${src}" data-portfolio-id="${photo.id}" draggable="true">
            <div class="portfolio-card__toolbar">
                <button class="portfolio-card__handle" type="button" aria-label="Arrastar imagem">⋮⋮</button>
                <button class="portfolio-card__delete" type="button" data-delete-portfolio="${photo.id}" aria-label="Remover imagem">✕</button>
            </div>
            <img src="${src}" alt="${photo.name}" loading="lazy">
        </article>
    `;
    }).join("");

    portfolioGrid.querySelectorAll("[data-preview-image]").forEach((card) => {
        card.addEventListener("click", () => {
            lightboxImage.src = card.dataset.previewImage;
            lightbox.classList.add("is-open");
            lightbox.setAttribute("aria-hidden", "false");
        });

        card.addEventListener("dragstart", () => {
            portfolioDragId = Number(card.dataset.portfolioId);
            card.classList.add("is-dragging");
        });

        card.addEventListener("dragend", () => {
            portfolioDragId = null;
            card.classList.remove("is-dragging");
        });

        card.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        card.addEventListener("drop", async (event) => {
            event.preventDefault();
            const targetId = Number(card.dataset.portfolioId);
            if (!portfolioDragId || portfolioDragId === targetId) {
                return;
            }
            const reordered = await getPortfolioRecords();
            const fromIndex = reordered.findIndex((item) => item.id === portfolioDragId);
            const toIndex = reordered.findIndex((item) => item.id === targetId);
            const [movedItem] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, movedItem);
            reordered.forEach((item, index) => {
                item.order = index + 1;
            });
            await updatePortfolioRecords(reordered);
            renderPortfolio();
        });
    });

    document.querySelectorAll("[data-lightbox-close]").forEach((button) => {
        button.addEventListener("click", () => {
            lightbox.classList.remove("is-open");
            lightbox.setAttribute("aria-hidden", "true");
        });
    });

    portfolioGrid.querySelectorAll("[data-delete-portfolio]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();
            await deletePortfolioRecord(Number(button.dataset.deletePortfolio));
            renderPortfolio();
        });
    });
}

function setupPortfolioManager() {
    const uploadInput = document.getElementById("portfolioUpload");
    const clearButton = document.getElementById("clearPortfolioBtn");
    if (!uploadInput || !clearButton) {
        return;
    }

    uploadInput.addEventListener("change", async () => {
        const files = Array.from(uploadInput.files || []);
        for (const file of files) {
            await savePortfolioFile(file);
        }
        uploadInput.value = "";
        renderPortfolio();
    });

    clearButton.addEventListener("click", async () => {
        await clearPortfolioRecords();
        renderPortfolio();
    });
}

function updatePurchaseSummary() {
    const unitPrice = Number(state.settings.extraPhotoPrice || pricePerPhoto);
    const total = state.gallerySelection.size * unitPrice;
    const selectedTotal = document.getElementById("selectedTotal");
    const selectedCount = document.getElementById("selectedCount");
    const checkoutQuantity = document.getElementById("checkoutQuantity");
    const checkoutTotal = document.getElementById("checkoutTotal");

    if (selectedTotal) {
        selectedTotal.textContent = formatCurrency(total);
    }
    if (selectedCount) {
        selectedCount.textContent = `${state.gallerySelection.size} fotos selecionadas`;
    }
    if (checkoutQuantity) {
        checkoutQuantity.textContent = String(state.gallerySelection.size);
    }
    if (checkoutTotal) {
        checkoutTotal.textContent = formatCurrency(total);
    }
}

function renderGallery() {
    const deliveryGrid = document.getElementById("deliveryGrid");
    if (!deliveryGrid) {
        return;
    }

    deliveryGrid.innerHTML = deliveryPhotos.map((photo) => `
        <article class="gallery-card ${state.gallerySelection.has(photo.id) ? "is-selected" : ""}" data-photo-id="${photo.id}">
            <img src="${photo.src}" alt="${photo.title}" loading="lazy">
            <div class="gallery-card__overlay">
                <div class="watermark">${state.settings.watermarkText || "Click Manager"}</div>
            </div>
            <div class="gallery-checkbox" aria-hidden="true"></div>
            <div class="gallery-card__footer">
                <strong>${photo.title}</strong>
                <button class="btn" type="button" data-buy-single="${photo.id}">Comprar individual</button>
            </div>
        </article>
    `).join("");

    deliveryGrid.querySelectorAll(".gallery-card").forEach((card) => {
        card.addEventListener("click", (event) => {
            if (event.target.closest("[data-buy-single]")) {
                return;
            }
            const id = Number(card.dataset.photoId);
            if (state.gallerySelection.has(id)) {
                state.gallerySelection.delete(id);
            } else {
                state.gallerySelection.add(id);
            }
            renderGallery();
            updatePurchaseSummary();
        });
    });

    deliveryGrid.querySelectorAll("[data-buy-single]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const id = Number(button.dataset.buySingle);
            state.gallerySelection = new Set([id]);
            renderGallery();
            updatePurchaseSummary();
            openPurchaseModal();
        });
    });
}

function openPurchaseModal() {
    const modal = document.getElementById("purchaseModal");
    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
}

function setupPurchaseFlow() {
    const buySelectedBtn = document.getElementById("buySelectedBtn");
    const finalizeBtn = document.getElementById("finalizeBtn");
    const confirmBtn = document.getElementById("confirmPurchaseBtn");
    const feedback = document.getElementById("purchaseFeedback");

    buySelectedBtn?.addEventListener("click", () => {
        if (state.gallerySelection.size === 0) {
            alert("Selecione ao menos uma foto para continuar.");
            return;
        }
        openPurchaseModal();
    });

    finalizeBtn?.addEventListener("click", openPurchaseModal);

    confirmBtn?.addEventListener("click", () => {
        if (state.gallerySelection.size === 0) {
            feedback.textContent = "Nenhuma foto selecionada para compra.";
            feedback.style.color = "var(--danger)";
            return;
        }
        const method = document.getElementById("paymentMethod")?.value || "Pix";
        feedback.style.color = "var(--success)";
        feedback.textContent = `Pagamento simulado com sucesso via ${method}. Pedido enviado para processamento.`;
    });
}

function init() {
    const safeRun = (callback) => {
        try {
            callback();
        } catch (error) {
            console.error(error);
        }
    };

    safeRun(setupSidebar);
    safeRun(setupModals);
    safeRun(setupAuth);
    safeRun(setupAgendaNavigation);
    safeRun(renderAgenda);
    safeRun(setupSettings);
    safeRun(setupPortfolioManager);
    safeRun(renderDashboard);
    safeRun(renderClients);
    safeRun(setupClientForm);
    safeRun(renderSessions);
    safeRun(setupSessions);
    safeRun(() => { void renderPortfolio(); });
    safeRun(renderClientContracts);
    safeRun(renderClientSessions);
    safeRun(renderGallery);
    safeRun(updatePurchaseSummary);
    safeRun(setupPurchaseFlow);
}

document.addEventListener("DOMContentLoaded", init);
