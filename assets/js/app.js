import { createRouter } from "./router.js";
import { observeAuthState, loginWithEmail, loginWithGoogle, logoutUser } from "./auth.js";
import {
  db,
  ref,
  get,
  set,
  push,
  update,
  onValue,
  serverTimestamp,
  initAnalyticsIfEnabled,
} from "./firebase.js";
import { apostilaItems, apostilaSections } from "./apostila-data.js";
import {
  mountApostilaHandlers,
  mountLoginHandlers,
  mountPerfilHandler,
  mountTecnicasHandlers,
  mountTreinoHandlers,
  renderRouteView,
  setLoginMessage,
  syncShellState,
} from "./ui.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const STUDY_TIMER_SECONDS = 20;
const CLOUDINARY_CLOUD_NAME = "dhbybowgp";
const CLOUDINARY_UPLOAD_PRESET = "avatar_perfil_unsigned";
const MASTERY_FAMILIARITY_THRESHOLD = 3;
const MASTERY_STREAK_THRESHOLD = 2;
const BADGE_CATALOG = {
  first5_mastered: "Primeiros 5 itens dominados",
  first_section_done: "Primeira seção concluída",
  streak_3_days: "3 dias seguidos",
  first_exam_done: "1º simulado concluído",
  perfect_section_review: "Revisão perfeita de uma seção",
};

function uploadAvatarToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Arquivo inválido para upload."));
      return;
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "avatars_bjj");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") {
        return;
      }

      const pct = Math.round((event.loaded / event.total) * 100);
      onProgress(Math.max(0, Math.min(100, pct)));
    };

    xhr.onerror = () => {
      reject(new Error("Falha de rede durante o upload da imagem."));
    };

    xhr.onload = () => {
      const response = xhr.response || {};
      if (xhr.status < 200 || xhr.status >= 300) {
        const cloudinaryMessage = response?.error?.message;
        reject(new Error(cloudinaryMessage || "Cloudinary retornou erro no upload."));
        return;
      }

      const avatarUrl = String(response.secure_url || response.url || "").trim();
      const avatarPublicId = String(response.public_id || "").trim();

      if (!avatarUrl || !avatarPublicId) {
        reject(new Error("Resposta do Cloudinary incompleta."));
        return;
      }

      resolve({ avatarUrl, avatarPublicId });
    };

    xhr.send(formData);
  });
}

const state = {
  user: null,
  route: "/login",
  data: {
    perfil: null,
    treinos: [],
    progressoApostila: {},
    apostilaStudy: {},
    apostilaStudyHistory: [],
    apostilaExamSessions: [],
    apostilaMediaUsage: {},
    apostilaFlow: {
      lastMode: "",
      lastSectionId: "",
      lastActiveAt: 0,
      lastRecommendedAction: "",
    },
    apostilaGamification: {
      streakCurrent: 0,
      streakBest: 0,
      lastStudyDay: "",
      badgesUnlocked: {},
      sectionsReady: {},
    },
    gamificationOverview: {
      streakCurrent: 0,
      streakBest: 0,
      overallReadinessPct: 0,
      sectionsReadyCount: 0,
      readinessBySection: {},
      weakestSection: null,
      todayPlan: null,
      resumeFlow: null,
      recommendation: null,
      nextRecommendationLabel: "Revisar itens pendentes",
      badgesUnlockedList: [],
    },
    historicoGraduacoes: [],
    apostilaItemsComProgresso: [],
    apostilaSections,
    studyInsights: {
      totalItems: apostilaItems.length,
      pendingItems: 0,
      masteredItems: 0,
      weakItems: 0,
      averageFamiliarity: 0,
      sections: [],
    },
    tecnicasFiltradas: [],
    metrics: {
      treinos7d: 0,
      treinos30d: 0,
      mediaUltimas5: "0,0",
      tecnicasMaisPraticadas: [],
      ultimosTreinos: [],
      totalItensApostila: apostilaItems.length,
      itensFavoritados: 0,
      itensConcluidos: 0,
      confiancaMedia: "0,0",
    },
    loading: {
      perfil: false,
      treinos: false,
      progressoApostila: false,
      apostilaStudy: false,
      apostilaStudyHistory: false,
      apostilaExam: false,
      apostilaMediaUsage: false,
      apostilaFlow: false,
      apostilaGamification: false,
      historicoGraduacoes: false,
    },
  },
  ui: {
    treinoEmEdicao: null,
    filtroTecnicaTexto: "",
    filtroTecnicaCategoria: "",
    filtroSomenteFavoritas: false,
    apostilaModo: "ler",
    apostilaStudySession: null,
    apostilaExamSession: null,
    apostilaSupportItemId: null,
    apostilaSupportContext: "",
    apostilaStudySupportVisible: false,
    apostilaExamSupportVisible: false,
    apostilaSectionAlert: null,
    perfilSecaoAberta: null,
  },
  feedback: {
    perfil: { text: "", type: "success" },
    treinos: { text: "", type: "success" },
    tecnicas: { text: "", type: "success" },
    apostila: { text: "", type: "success" },
  },
  listeners: [],
};

const view = document.querySelector("#app-view");
let isRouterStarted = false;
let rerenderScheduled = false;
let apostilaSectionAlertTimeoutId = null;

function renderSessionBooting() {
  if (!view) {
    return;
  }

  view.innerHTML = `
    <section class="card">
      <h2 class="page-title">Carregando sessão</h2>
      <p class="page-subtitle">Restaurando seu acesso...</p>
    </section>
  `;
}

function ensureRouterReady() {
  if (!isRouterStarted) {
    router.start();
    isRouterStarted = true;
    return;
  }

  router.refresh();
}

function setupTopUserMenu() {
  const userMenuWrap = document.querySelector("#top-user-menu");
  const userTrigger = document.querySelector("#btn-user-menu");
  const userDropdown = document.querySelector("#top-user-dropdown");
  const logoutMenuButton = document.querySelector("#btn-logout-menu");
  const userAvatarImg = document.querySelector("#top-user-avatar-img");
  const userAvatarInitials = document.querySelector("#top-user-avatar-initials");

  if (!userMenuWrap || !userTrigger || !userDropdown) {
    return;
  }

  const closeMenu = () => {
    userDropdown.classList.add("is-hidden");
    userTrigger.setAttribute("aria-expanded", "false");
  };

  const toggleMenu = () => {
    const isOpen = !userDropdown.classList.contains("is-hidden");
    if (isOpen) {
      closeMenu();
      return;
    }
    userDropdown.classList.remove("is-hidden");
    userTrigger.setAttribute("aria-expanded", "true");
  };

  userTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      closeMenu();
      return;
    }

    if (!userMenuWrap.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  if (logoutMenuButton) {
    logoutMenuButton.addEventListener("click", async () => {
      closeMenu();
      await logoutUser();
    });
  }

  if (userAvatarImg && userAvatarInitials) {
    userAvatarImg.addEventListener("error", () => {
      userAvatarImg.src = "";
      userAvatarImg.classList.add("is-hidden");
      userAvatarInitials.classList.remove("is-hidden");
    });
  }
}

const router = createRouter({
  getCurrentUser: () => state.user,
  onRouteChange: renderRoute,
});

function normalizeAuthError(error) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/missing-password": "Informe sua senha.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/popup-blocked": "Seu navegador bloqueou o popup de login.",
  };
  return map[error?.code] || "Não foi possível autenticar agora. Tente novamente.";
}

function setRouteFeedback(routeKey, text, type = "success") {
  state.feedback[routeKey] = { text, type };
}

function clearRouteFeedback(routeKey) {
  state.feedback[routeKey] = { text: "", type: "success" };
}

function setLoading(key, value) {
  state.data.loading[key] = value;
}

function resetEditingForms() {
  state.ui.treinoEmEdicao = null;
}

function toDateMsFromIso(isoDate) {
  if (!isoDate || typeof isoDate !== "string") {
    return 0;
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return 0;
  }

  const utc = Date.UTC(year, month - 1, day);
  return Number.isNaN(utc) ? 0 : utc;
}

function normalizeDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseCollection(snapshotValue) {
  if (!snapshotValue) {
    return [];
  }

  return Object.entries(snapshotValue).map(([id, data]) => ({
    id,
    ...data,
  }));
}

function sanitizeTreino(item) {
  const data = normalizeDateInput(item.data || "");
  const dataMs = Number(item.dataMs || 0) || toDateMsFromIso(data);
  const createdAtMs = Number(item.createdAtMs || 0);
  const updatedAtMs = Number(item.updatedAtMs || 0);

  const tecnicaIds = Array.isArray(item.tecnicaIds)
    ? item.tecnicaIds.map((value) => String(value))
    : [];

  const tecnicaResumo = Array.isArray(item.tecnicaResumo)
    ? item.tecnicaResumo.map((row) => ({
        id: String(row.id || ""),
        nome: String(row.nome || "Técnica"),
        categoria: String(row.categoria || ""),
      }))
    : [];

  return {
    ...item,
    data,
    dataMs,
    createdAtMs,
    updatedAtMs,
    tecnicaIds,
    tecnicaResumo,
    notaSessao: Number(item.notaSessao || 0),
    duracaoMin: Number(item.duracaoMin || 0),
  };
}

function normalizeStudyProgressEntry(entry) {
  return {
    familiarity: Number(entry?.familiarity || 0),
    lastSeenAt: Number(entry?.lastSeenAt || 0),
    lastResult: String(entry?.lastResult || ""),
    lastWrongAt: Number(entry?.lastWrongAt || 0),
    streak: Number(entry?.streak || 0),
    dueAt: Number(entry?.dueAt || 0),
    totalCorrect: Number(entry?.totalCorrect || 0),
    totalWrong: Number(entry?.totalWrong || 0),
    totalSkipped: Number(entry?.totalSkipped || 0),
  };
}

function normalizeGamificationEntry(entry) {
  const badges = entry?.badgesUnlocked && typeof entry.badgesUnlocked === "object" ? entry.badgesUnlocked : {};
  const sectionsReady = entry?.sectionsReady && typeof entry.sectionsReady === "object" ? entry.sectionsReady : {};
  return {
    streakCurrent: Number(entry?.streakCurrent || 0),
    streakBest: Number(entry?.streakBest || 0),
    lastStudyDay: String(entry?.lastStudyDay || ""),
    badgesUnlocked: badges,
    sectionsReady,
  };
}

function normalizeApostilaFlowEntry(entry) {
  return {
    lastMode: String(entry?.lastMode || ""),
    lastSectionId: String(entry?.lastSectionId || ""),
    lastActiveAt: Number(entry?.lastActiveAt || 0),
    lastRecommendedAction: String(entry?.lastRecommendedAction || ""),
  };
}

function normalizeMediaUsageEntry(entry) {
  return {
    lastOpenedAt: Number(entry?.lastOpenedAt || 0),
    mediaViewedImage: Boolean(entry?.mediaViewedImage),
    mediaViewedVideo: Boolean(entry?.mediaViewedVideo),
    mediaPlayedAudio: Boolean(entry?.mediaPlayedAudio),
    hintViewed: Boolean(entry?.hintViewed),
    openedCount: Number(entry?.openedCount || 0),
  };
}

function getLocalDayKey(timestampMs = Date.now()) {
  const date = new Date(timestampMs);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayDiff(previousDayKey, currentDayKey) {
  if (!previousDayKey || !currentDayKey) {
    return 0;
  }

  const prev = new Date(`${previousDayKey}T00:00:00`);
  const curr = new Date(`${currentDayKey}T00:00:00`);
  if (Number.isNaN(prev.getTime()) || Number.isNaN(curr.getTime())) {
    return 0;
  }

  return Math.round((curr.getTime() - prev.getTime()) / DAY_MS);
}

function isStudyItemMastered(progress) {
  return progress.familiarity >= MASTERY_FAMILIARITY_THRESHOLD
    && progress.totalCorrect > progress.totalWrong
    && progress.streak >= MASTERY_STREAK_THRESHOLD;
}

function isStudyItemWeak(progress, nowMs = Date.now()) {
  const recentWrong = progress.lastWrongAt > 0 && nowMs - progress.lastWrongAt <= 14 * DAY_MS;
  return progress.familiarity <= 1
    || progress.totalWrong > progress.totalCorrect
    || (progress.lastResult === "wrong" && recentWrong)
    || progress.streak <= 0;
}

function computeStudyInsights() {
  const sections = [...(state.data.apostilaSections || [])].sort((a, b) => (a.ordemSecao || 0) - (b.ordemSecao || 0));
  const now = Date.now();

  let totalItems = 0;
  let pendingItems = 0;
  let masteredItems = 0;
  let weakItems = 0;
  let totalFamiliarity = 0;

  const sectionInsights = sections.map((section) => {
    const items = [...(section.itens || [])].sort((a, b) => (a.ordemItem || 0) - (b.ordemItem || 0));
    let studied = 0;
    let mastered = 0;
    let weak = 0;
    let familiaritySum = 0;

    items.forEach((item) => {
      const progress = normalizeStudyProgressEntry(state.data.apostilaStudy?.[item.id]);
      const isStudied = progress.lastSeenAt > 0 || progress.totalCorrect > 0 || progress.totalWrong > 0 || progress.totalSkipped > 0;
      const isMastered = isStudyItemMastered(progress);
      const isWeak = isStudyItemWeak(progress, now);
      const isPending = progress.dueAt > 0 ? progress.dueAt <= now : !isMastered;

      totalItems += 1;
      familiaritySum += progress.familiarity;
      totalFamiliarity += progress.familiarity;

      if (isStudied) {
        studied += 1;
      }
      if (isMastered) {
        mastered += 1;
        masteredItems += 1;
      }
      if (isWeak) {
        weak += 1;
        weakItems += 1;
      }
      if (isPending) {
        pendingItems += 1;
      }
    });

    const averageFamiliarity = items.length ? familiaritySum / items.length : 0;
    const progressPct = items.length ? Math.round((mastered / items.length) * 100) : 0;

    return {
      id: section.id,
      ordemSecao: section.ordemSecao,
      titulo: section.titulo,
      totalItems: items.length,
      studiedItems: studied,
      masteredItems: mastered,
      weakItems: weak,
      averageFamiliarity,
      progressPct,
    };
  });

  state.data.studyInsights = {
    totalItems,
    pendingItems,
    masteredItems,
    weakItems,
    averageFamiliarity: totalItems ? totalFamiliarity / totalItems : 0,
    sections: sectionInsights,
  };

  computeGamificationOverview();
}

function buildReadinessLabelForSection(sectionInsight) {
  const total = Number(sectionInsight.totalItems || 0);
  const studied = Number(sectionInsight.studiedItems || 0);
  const mastered = Number(sectionInsight.masteredItems || 0);
  const weak = Number(sectionInsight.weakItems || 0);
  const avgFam = Number(sectionInsight.averageFamiliarity || 0);
  const masteredRatio = total > 0 ? mastered / total : 0;

  const section = (state.data.apostilaSections || []).find((item) => item.id === sectionInsight.id);
  const recentActiveItems = (section?.itens || []).reduce((acc, item) => {
    const progress = normalizeStudyProgressEntry(state.data.apostilaStudy?.[item.id]);
    if (progress.lastSeenAt > 0 && Date.now() - progress.lastSeenAt <= 7 * DAY_MS) {
      return acc + 1;
    }
    return acc;
  }, 0);

  if (studied === 0) {
    return "Não iniciada";
  }

  if (
    masteredRatio >= 0.75
    && avgFam >= 3.2
    && weak <= 1
    && recentActiveItems >= Math.max(1, Math.ceil(total * 0.35))
  ) {
    return "Pronta para simulado";
  }

  if (
    masteredRatio >= 0.55
    && avgFam >= 2.6
    && weak <= Math.max(2, Math.ceil(total * 0.2))
  ) {
    return "Quase pronta";
  }

  return "Em progresso";
}

function computeGamificationOverview() {
  const sectionInsights = state.data.studyInsights?.sections || [];
  const readinessBySection = {};
  let sectionsReadyCount = 0;

  sectionInsights.forEach((sectionInsight) => {
    const status = buildReadinessLabelForSection(sectionInsight);
    readinessBySection[sectionInsight.id] = status;
    if (status === "Pronta para simulado") {
      sectionsReadyCount += 1;
    }
  });

  const totalSections = sectionInsights.length;
  const totalItems = Number(state.data.studyInsights?.totalItems || 0);
  const overallReadinessPct = totalSections > 0 ? Math.round((sectionsReadyCount / totalSections) * 100) : 0;
  const pendingItems = Number(state.data.studyInsights?.pendingItems || 0);
  const weakestSection = [...sectionInsights]
    .sort((a, b) => {
      if ((a.weakItems || 0) !== (b.weakItems || 0)) {
        return (b.weakItems || 0) - (a.weakItems || 0);
      }
      return (a.progressPct || 0) - (b.progressPct || 0);
    })[0] || null;
  const pendingHighThreshold = Math.max(8, Math.ceil(totalItems * 0.1));
  const hasHighPending = pendingItems >= pendingHighThreshold;
  const hasWeakSectionPressure = Boolean(weakestSection && Number(weakestSection.weakItems || 0) >= Math.max(3, Math.ceil(Number(weakestSection.totalItems || 0) * 0.25)));
  const continueOrderSection = [...sectionInsights]
    .filter((section) => readinessBySection[section.id] !== "Pronta para simulado")
    .sort((a, b) => (a.ordemSecao || 0) - (b.ordemSecao || 0))[0] || null;
  const simuladoTarget = [...sectionInsights]
    .filter((section) => readinessBySection[section.id] === "Pronta para simulado" || readinessBySection[section.id] === "Quase pronta")
    .sort((a, b) => {
      if ((b.progressPct || 0) !== (a.progressPct || 0)) {
        return (b.progressPct || 0) - (a.progressPct || 0);
      }
      return (a.ordemSecao || 0) - (b.ordemSecao || 0);
    })[0] || null;

  let recommendation = {
    type: "pending",
    title: "Revisar itens pendentes",
    description: "Priorize os itens com revisão em atraso para manter continuidade.",
    sectionId: null,
  };

  if (!hasHighPending && hasWeakSectionPressure && weakestSection) {
    recommendation = {
      type: "weak_section",
      title: "Reforçar seção fraca",
      description: `Focar ${weakestSection.ordemSecao}. ${weakestSection.titulo}.`,
      sectionId: weakestSection.id,
    };
  }

  if (!hasHighPending && !hasWeakSectionPressure && simuladoTarget) {
    recommendation = {
      type: "exam_section",
      title: "Fazer simulado por seção",
      description: `Simule ${simuladoTarget.ordemSecao}. ${simuladoTarget.titulo}.`,
      sectionId: simuladoTarget.id,
    };
  }

  if (!hasHighPending && !hasWeakSectionPressure && !simuladoTarget && continueOrderSection) {
    recommendation = {
      type: "continue_order",
      title: "Continuar estudo em ordem oficial",
      description: `Avance por ${continueOrderSection.ordemSecao}. ${continueOrderSection.titulo}.`,
      sectionId: continueOrderSection.id,
    };
  }

  const gamif = normalizeGamificationEntry(state.data.apostilaGamification);
  const flow = normalizeApostilaFlowEntry(state.data.apostilaFlow);
  const isResumeRecent = flow.lastActiveAt > 0 && (Date.now() - flow.lastActiveAt) <= 36 * 60 * 60 * 1000;
  const resumeFlow = isResumeRecent && flow.lastMode
    ? {
        lastMode: flow.lastMode,
        lastSectionId: flow.lastSectionId || "",
        lastActiveAt: flow.lastActiveAt,
      }
    : null;

  const todayPlan = {
    prioridade: recommendation.title,
    pendingItems,
    weakestSection: weakestSection
      ? {
          id: weakestSection.id,
          label: `${weakestSection.ordemSecao}. ${weakestSection.titulo}`,
          weakItems: Number(weakestSection.weakItems || 0),
        }
      : null,
    recommendation,
  };
  const badgesUnlockedList = Object.keys(gamif.badgesUnlocked || {})
    .filter((badgeId) => BADGE_CATALOG[badgeId])
    .map((badgeId) => ({
      id: badgeId,
      label: BADGE_CATALOG[badgeId],
      unlockedAt: Number(gamif.badgesUnlocked[badgeId] || 0),
    }))
    .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));

  state.data.gamificationOverview = {
    streakCurrent: Number(gamif.streakCurrent || 0),
    streakBest: Number(gamif.streakBest || 0),
    overallReadinessPct,
    sectionsReadyCount,
    readinessBySection,
    weakestSection: todayPlan.weakestSection,
    todayPlan,
    resumeFlow,
    recommendation,
    nextRecommendationLabel: recommendation.title,
    badgesUnlockedList,
  };
}

async function patchApostilaGamification(patch) {
  if (!state.user) {
    return;
  }

  const current = normalizeGamificationEntry(state.data.apostilaGamification);
  state.data.apostilaGamification = {
    ...current,
    ...patch,
    badgesUnlocked: {
      ...(current.badgesUnlocked || {}),
      ...(patch.badgesUnlocked || {}),
    },
    sectionsReady: {
      ...(current.sectionsReady || {}),
      ...(patch.sectionsReady || {}),
    },
  };
  computeGamificationOverview();

  try {
    const gamificationRef = ref(db, `users/${state.user.uid}/apostilaGamification`);
    await update(gamificationRef, patch);
  } catch {
    setRouteFeedback("apostila", "Falha ao atualizar dados de motivação.", "error");
  }
}

async function patchApostilaFlow(patch) {
  if (!state.user) {
    return;
  }

  const current = normalizeApostilaFlowEntry(state.data.apostilaFlow);
  state.data.apostilaFlow = {
    ...current,
    ...patch,
  };
  computeGamificationOverview();

  try {
    const flowRef = ref(db, `users/${state.user.uid}/apostilaFlow`);
    await update(flowRef, patch);
  } catch {
    setRouteFeedback("apostila", "Falha ao atualizar fluxo de aprendizado.", "error");
  }
}

function registerApostilaFlowActivity({ mode, sectionId = "", recommendedAction = "" }) {
  patchApostilaFlow({
    lastMode: String(mode || ""),
    lastSectionId: String(sectionId || ""),
    lastActiveAt: Date.now(),
    lastRecommendedAction: String(recommendedAction || ""),
  });
}

function runGuidedRecommendationAction(actionType, sectionId = "") {
  if (actionType === "pending") {
    startApostilaStudySession({ mode: "pending", sectionId: "", sourceAction: "pending" });
    return;
  }

  if (actionType === "weak_section" || actionType === "continue_order") {
    startApostilaStudySession({ mode: "section", sectionId, sourceAction: actionType });
    return;
  }

  if (actionType === "exam_section") {
    state.ui.apostilaModo = "simulado";
    startApostilaExamSession({ mode: "section", sectionId, promptStyle: "mov_to_jp", sourceAction: actionType });
    return;
  }

  startApostilaStudySession({ mode: "pending", sectionId: "", sourceAction: "pending" });
}

function resumeLastApostilaFlow() {
  const flow = normalizeApostilaFlowEntry(state.data.apostilaFlow);
  if (!flow.lastMode) {
    return;
  }

  if (flow.lastMode === "exam_section") {
    state.ui.apostilaModo = "simulado";
    startApostilaExamSession({ mode: "section", sectionId: flow.lastSectionId, promptStyle: "mov_to_jp", sourceAction: "resume" });
    return;
  }

  if (flow.lastMode === "exam_full") {
    state.ui.apostilaModo = "simulado";
    startApostilaExamSession({ mode: "full", sectionId: "", promptStyle: "mov_to_jp", sourceAction: "resume" });
    return;
  }

  if (flow.lastMode === "exam_random") {
    state.ui.apostilaModo = "simulado";
    startApostilaExamSession({ mode: "random", sectionId: "", promptStyle: "mov_to_jp", sourceAction: "resume" });
    return;
  }

  if (flow.lastMode === "pending" || flow.lastMode === "jp_to_mov" || flow.lastMode === "mov_to_jp") {
    state.ui.apostilaModo = "estudar";
    startApostilaStudySession({ mode: flow.lastMode, sectionId: "", sourceAction: "resume" });
    return;
  }

  if (flow.lastMode === "random") {
    state.ui.apostilaModo = "estudar";
    startApostilaStudySession({ mode: "random", sectionId: "", sourceAction: "resume" });
    return;
  }

  if (flow.lastMode === "ordered") {
    state.ui.apostilaModo = "estudar";
    startApostilaStudySession({ mode: "ordered", sectionId: "", sourceAction: "resume" });
    return;
  }

  state.ui.apostilaModo = "estudar";
  startApostilaStudySession({ mode: "section", sectionId: flow.lastSectionId, sourceAction: "resume" });
}

async function registerApostilaMediaUsage(itemId, markerType) {
  if (!state.user || !itemId) {
    return;
  }

  const key = String(itemId || "").trim();
  if (!key) {
    return;
  }

  const current = normalizeMediaUsageEntry(state.data.apostilaMediaUsage?.[key]);
  const now = Date.now();
  const patch = {};

  if (markerType === "opened") {
    patch.lastOpenedAt = now;
    patch.openedCount = Number(current.openedCount || 0) + 1;
  }
  if (markerType === "image") {
    patch.mediaViewedImage = true;
  }
  if (markerType === "video") {
    patch.mediaViewedVideo = true;
  }
  if (markerType === "audio") {
    patch.mediaPlayedAudio = true;
  }
  if (markerType === "hint") {
    patch.hintViewed = true;
  }

  if (!Object.keys(patch).length) {
    return;
  }

  state.data.apostilaMediaUsage = {
    ...(state.data.apostilaMediaUsage || {}),
    [key]: {
      ...current,
      ...patch,
    },
  };

  try {
    const usageRef = ref(db, `users/${state.user.uid}/apostilaMediaUsage/${key}`);
    await update(usageRef, patch);
  } catch {
    setRouteFeedback("apostila", "Falha ao registrar uso de mídia de apoio.", "error");
  }
}

async function unlockGamificationBadges(badgeIds) {
  const ids = Array.from(new Set((badgeIds || []).filter(Boolean)));
  if (!ids.length) {
    return [];
  }

  const current = normalizeGamificationEntry(state.data.apostilaGamification);
  const now = Date.now();
  const newBadgesPatch = {};
  const earnedNow = [];

  ids.forEach((id) => {
    if (!BADGE_CATALOG[id]) {
      return;
    }
    if (!current.badgesUnlocked?.[id]) {
      newBadgesPatch[id] = now;
      earnedNow.push(BADGE_CATALOG[id]);
    }
  });

  if (!Object.keys(newBadgesPatch).length) {
    return [];
  }

  await patchApostilaGamification({
    badgesUnlocked: {
      ...(current.badgesUnlocked || {}),
      ...newBadgesPatch,
    },
  });

  return earnedNow;
}

async function applyStudyStreakUpdate() {
  const current = normalizeGamificationEntry(state.data.apostilaGamification);
  const today = getLocalDayKey();
  const lastDay = String(current.lastStudyDay || "");

  if (lastDay === today) {
    return {
      updated: false,
      streakCurrent: Number(current.streakCurrent || 0),
      streakBest: Number(current.streakBest || 0),
      impactText: "Sequência mantida hoje.",
    };
  }

  const diff = lastDay ? getDayDiff(lastDay, today) : 0;
  const nextCurrent = !lastDay
    ? 1
    : diff <= 1
      ? Number(current.streakCurrent || 0) + 1
      : 1;
  const nextBest = Math.max(Number(current.streakBest || 0), nextCurrent);
  const impactText = !lastDay
    ? "Sequência iniciada: 1 dia."
    : diff <= 1
      ? `Sequência aumentou para ${nextCurrent} dia(s).`
      : "Sequência reiniciada após pausa.";

  await patchApostilaGamification({
    streakCurrent: nextCurrent,
    streakBest: nextBest,
    lastStudyDay: today,
  });

  return {
    updated: true,
    streakCurrent: nextCurrent,
    streakBest: nextBest,
    impactText,
  };
}

async function evaluateDerivedBadges({ perfectSectionReview = false, examCompleted = false } = {}) {
  const overview = state.data.gamificationOverview || {};
  const newlyEligible = [];

  if (Number(state.data.studyInsights?.masteredItems || 0) >= 5) {
    newlyEligible.push("first5_mastered");
  }
  if (Number(overview.sectionsReadyCount || 0) >= 1) {
    newlyEligible.push("first_section_done");
  }
  if (Number(overview.streakCurrent || 0) >= 3 || Number(overview.streakBest || 0) >= 3) {
    newlyEligible.push("streak_3_days");
  }
  if (examCompleted || (state.data.apostilaExamSessions || []).length > 0) {
    newlyEligible.push("first_exam_done");
  }
  if (perfectSectionReview) {
    newlyEligible.push("perfect_section_review");
  }

  return unlockGamificationBadges(newlyEligible);
}

function buildNextActionLabel() {
  const recommendation = state.data.gamificationOverview?.recommendation;
  if (!recommendation) {
    return "Revisar itens pendentes";
  }
  return recommendation.title;
}

function buildStudyRewardFeedback(session, streakInfo, badgesEarnedNow) {
  const stats = session?.sessionStats || {};
  const completed = Number(stats.completed || 0);
  const correct = Number(stats.correct || 0);
  const wrong = Number(stats.wrong || 0);
  const skipped = Number(stats.skipped || 0);
  const acc = completed > 0 ? Math.round((correct / completed) * 100) : 0;
  const recommendation = state.data.gamificationOverview?.recommendation || null;

  return {
    title: "Sessão concluída com consistência",
    progressText: `${completed} itens · ${correct} acertos · ${wrong} erros · ${acc}% de acerto`,
    improvedText: `Você consolidou ${correct} item(ns) nesta rodada.`,
    weakText: wrong + skipped > 0 ? `${wrong + skipped} item(ns) ainda pedem reforço imediato.` : "Sem pontos críticos nesta sessão.",
    streakText: streakInfo?.impactText || "Sequência registrada.",
    badgeEarned: badgesEarnedNow?.[0] || "",
    nextAction: buildNextActionLabel(),
    nextActionType: recommendation?.type || "pending",
    nextActionSectionId: recommendation?.sectionId || "",
  };
}

function buildExamRewardFeedback(session, badgesEarnedNow) {
  const total = Number(session?.queue?.length || 0);
  const stats = session?.examStats || {};
  const correct = Number(stats.correct || 0);
  const wrong = Number(stats.wrong || 0);
  const skipped = Number(stats.skipped || 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
  const recommendation = state.data.gamificationOverview?.recommendation || null;

  return {
    title: "Simulado finalizado",
    progressText: `${total} itens · ${correct} acertos · ${wrong} erros · ${skipped} pulados · ${acc}%`,
    improvedText: `Desempenho consolidado com ${correct} resposta(s) corretas.`,
    weakText: wrong + skipped > 0 ? `${wrong + skipped} item(ns) merecem revisão dirigida.` : "Ótimo sinal: sem fragilidades evidentes neste simulado.",
    streakText: "A consistência diária fortalece retenção de longo prazo.",
    badgeEarned: badgesEarnedNow?.[0] || "",
    nextAction: buildNextActionLabel(),
    nextActionType: recommendation?.type || "pending",
    nextActionSectionId: recommendation?.sectionId || "",
  };
}

function normalizeExamSessionEntry(entry) {
  return {
    mode: String(entry?.mode || ""),
    selectedSectionId: entry?.selectedSectionId ? String(entry.selectedSectionId) : null,
    promptStyle: String(entry?.promptStyle || "mov_to_jp"),
    startedAt: Number(entry?.startedAt || 0),
    finishedAt: Number(entry?.finishedAt || 0),
    score: Number(entry?.score || 0),
    totalItems: Number(entry?.totalItems || 0),
    correct: Number(entry?.correct || 0),
    wrong: Number(entry?.wrong || 0),
    skipped: Number(entry?.skipped || 0),
    mistakes: Array.isArray(entry?.mistakes) ? entry.mistakes.map((item) => String(item || "")).filter(Boolean) : [],
  };
}

function normalizeStudyHistoryEntry(entry) {
  const gradeCounts = entry?.gradeCounts && typeof entry.gradeCounts === "object" ? entry.gradeCounts : {};
  const gradedItems = Array.isArray(entry?.gradedItems)
    ? entry.gradedItems.map((item) => ({
        itemId: String(item?.itemId || ""),
        order: Number(item?.order || 0),
        score: Number(item?.score || 0),
        label: String(item?.label || "0"),
      })).filter((item) => item.itemId)
    : [];

  return {
    mode: String(entry?.mode || "ordered"),
    reason: String(entry?.reason || "auto_end"),
    startedAt: Number(entry?.startedAt || 0),
    finishedAt: Number(entry?.finishedAt || 0),
    savedAt: Number(entry?.savedAt || 0),
    totalQueue: Number(entry?.totalQueue || 0),
    evaluatedCount: Number(entry?.evaluatedCount || 0),
    points: Number(entry?.points || 0),
    scorePct: Number(entry?.scorePct || 0),
    executionPct: Number(entry?.executionPct || 0),
    gradeCounts: {
      note1: Number(gradeCounts.note1 || 0),
      note05: Number(gradeCounts.note05 || 0),
      note0: Number(gradeCounts.note0 || 0),
    },
    gradedItems,
  };
}

function sortTreinosNewestFirst(items) {
  return items.sort((left, right) => {
    if (left.dataMs !== right.dataMs) {
      return right.dataMs - left.dataMs;
    }
    return (right.createdAtMs || 0) - (left.createdAtMs || 0);
  });
}

function mergeApostilaComProgresso() {
  const progresso = state.data.progressoApostila || {};

  state.data.apostilaItemsComProgresso = apostilaItems.map((seed) => {
    const userProgress = progresso[seed.id] || {};

    return {
      ...seed,
      favorita: Boolean(userProgress.favorita),
      nivelConfianca: Number(userProgress.nivelConfianca || 0),
      concluida: Boolean(userProgress.concluida),
      observacoesPessoais: String(userProgress.observacoesPessoais || ""),
      significado: String(userProgress.significado || ""),
      detalhesExecucao: String(userProgress.detalhesExecucao || ""),
      pontosDeAtencao: String(userProgress.pontosDeAtencao || ""),
      errosComuns: String(userProgress.errosComuns || ""),
      observacoesDoProfessor: String(userProgress.observacoesDoProfessor || ""),
      updatedAtMs: Number(userProgress.updatedAtMs || 0),
    };
  }).sort((left, right) => {
    if (left.ordemSecao !== right.ordemSecao) {
      return left.ordemSecao - right.ordemSecao;
    }
    return left.ordemItem - right.ordemItem;
  });

  applyTecnicaFilters();
}

function applyTecnicaFilters() {
  const query = state.ui.filtroTecnicaTexto.trim().toLowerCase();
  const categoria = state.ui.filtroTecnicaCategoria;
  const onlyFav = state.ui.filtroSomenteFavoritas;

  state.data.tecnicasFiltradas = state.data.apostilaItemsComProgresso.filter((item) => {
    if (onlyFav && !item.favorita) {
      return false;
    }

    if (categoria && item.categoria !== categoria) {
      return false;
    }

    if (!query) {
      return true;
    }

    return item.nome.toLowerCase().includes(query);
  });
}

function computeMetrics() {
  const treinos = state.data.treinos;
  const apostila = state.data.apostilaItemsComProgresso;

  const now = Date.now();
  const last7 = now - 7 * DAY_MS;
  const last30 = now - 30 * DAY_MS;

  const treinos7d = treinos.filter((item) => item.dataMs >= last7).length;
  const treinos30d = treinos.filter((item) => item.dataMs >= last30).length;

  const ultimas5 = treinos.slice(0, 5).filter((item) => item.notaSessao > 0);
  const mediaUltimas5 = ultimas5.length
    ? (ultimas5.reduce((total, item) => total + item.notaSessao, 0) / ultimas5.length).toFixed(1).replace(".", ",")
    : "0,0";

  const countByTecnicaId = {};
  treinos.forEach((treino) => {
    (treino.tecnicaResumo || []).forEach((tecnica) => {
      const id = String(tecnica.id || "");
      if (!id) {
        return;
      }
      countByTecnicaId[id] = (countByTecnicaId[id] || 0) + 1;
    });
  });

  const apostilaById = new Map(apostila.map((item) => [item.id, item]));
  const tecnicasMaisPraticadas = Object.entries(countByTecnicaId)
    .map(([id, total]) => ({
      id,
      total,
      nome: apostilaById.get(id)?.nome || "Técnica removida",
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);

  const totalItensApostila = apostila.length;
  const itensFavoritados = apostila.filter((item) => item.favorita).length;
  const itensConcluidos = apostila.filter((item) => item.concluida).length;
  const confiancas = apostila.map((item) => Number(item.nivelConfianca || 0)).filter((value) => value > 0);
  const confiancaMedia = confiancas.length
    ? (confiancas.reduce((a, b) => a + b, 0) / confiancas.length).toFixed(1).replace(".", ",")
    : "0,0";

  state.data.metrics = {
    treinos7d,
    treinos30d,
    mediaUltimas5,
    tecnicasMaisPraticadas,
    ultimosTreinos: treinos.slice(0, 3),
    totalItensApostila,
    itensFavoritados,
    itensConcluidos,
    confiancaMedia,
  };
}

function unbindAllListeners() {
  state.listeners.forEach((stop) => stop());
  state.listeners = [];
}

async function ensureDefaultPerfil(user) {
  const perfilRef = ref(db, `users/${user.uid}/perfil`);
  const snapshot = await get(perfilRef);

  if (snapshot.exists()) {
    return;
  }

  const now = Date.now();
  const nomePadrao = user.displayName || user.email?.split("@")[0] || "Atleta";
  await set(perfilRef, {
    nome: nomePadrao,
    nomeCompleto: nomePadrao,
    apelido: "",
    faixa: "",
    faixaAtual: "",
    grauAtual: "",
    categoriaDePeso: "",
    pesoAtual: "",
    ladoDominante: "",
    estiloPreferido: "",
    frequenciaSemanalDesejada: "",
    objetivoPrincipal: "",
    academia: "",
    professor: "",
    professorFaixa: "",
    professorGrau: "",
    dataNascimento: "",
    cidadeUF: "",
    dataUltimaGraduacao: "",
    proximaMetaGraduacao: "",
    observacoesDeEvolucao: "",
    objetivo: "",
    avatarUrl: "",
    avatarPublicId: "",
    reduzirAnimacoes: false,
    resumoPublico: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAtMs: now,
    updatedAtMs: now,
  });
}

function bindRealtimeData(user) {
  const perfilRef = ref(db, `users/${user.uid}/perfil`);
  const treinosRef = ref(db, `users/${user.uid}/treinos`);
  const progressoRef = ref(db, `users/${user.uid}/progressoApostila`);
  const apostilaStudyRef = ref(db, `users/${user.uid}/apostilaStudy`);
  const apostilaStudyHistoryRef = ref(db, `users/${user.uid}/apostilaStudyHistory`);
  const apostilaExamRef = ref(db, `users/${user.uid}/apostilaExam`);
  const apostilaMediaUsageRef = ref(db, `users/${user.uid}/apostilaMediaUsage`);
  const apostilaFlowRef = ref(db, `users/${user.uid}/apostilaFlow`);
  const gamificationRef = ref(db, `users/${user.uid}/apostilaGamification`);
  const historicoRef = ref(db, `users/${user.uid}/historicoGraduacoes`);

  setLoading("perfil", true);
  setLoading("treinos", true);
  setLoading("progressoApostila", true);
  setLoading("apostilaStudy", true);
  setLoading("apostilaStudyHistory", true);
  setLoading("apostilaExam", true);
  setLoading("apostilaMediaUsage", true);
  setLoading("apostilaFlow", true);
  setLoading("apostilaGamification", true);
  setLoading("historicoGraduacoes", true);

  const stopPerfil = onValue(
    perfilRef,
    (snapshot) => {
      state.data.perfil = snapshot.val() || null;
      setLoading("perfil", false);
      document.documentElement.classList.toggle("reduce-motion", Boolean(state.data.perfil?.reduzirAnimacoes));
      rerender();
    },
    () => {
      setLoading("perfil", false);
      setRouteFeedback("perfil", "Falha ao carregar perfil.", "error");
      rerender();
    }
  );

  const stopHistorico = onValue(
    historicoRef,
    (snapshot) => {
      state.data.historicoGraduacoes = parseCollection(snapshot.val());
      setLoading("historicoGraduacoes", false);
      rerender();
    },
    () => {
      setLoading("historicoGraduacoes", false);
      rerender();
    }
  );

  const stopTreinos = onValue(
    treinosRef,
    (snapshot) => {
      const items = parseCollection(snapshot.val()).map(sanitizeTreino);
      state.data.treinos = sortTreinosNewestFirst(items);
      setLoading("treinos", false);
      computeMetrics();
      rerender();
    },
    () => {
      setLoading("treinos", false);
      setRouteFeedback("treinos", "Falha ao carregar treinos.", "error");
      rerender();
    }
  );

  const stopProgresso = onValue(
    progressoRef,
    (snapshot) => {
      state.data.progressoApostila = snapshot.val() || {};
      mergeApostilaComProgresso();
      computeMetrics();
      setLoading("progressoApostila", false);
      rerender();
    },
    () => {
      setLoading("progressoApostila", false);
      setRouteFeedback("apostila", "Falha ao carregar progresso da apostila.", "error");
      rerender();
    }
  );

  const stopApostilaStudy = onValue(
    apostilaStudyRef,
    (snapshot) => {
      const raw = snapshot.val() || {};
      const normalized = {};

      Object.entries(raw).forEach(([itemId, value]) => {
        normalized[itemId] = normalizeStudyProgressEntry(value);
      });

      state.data.apostilaStudy = normalized;
      computeStudyInsights();
      setLoading("apostilaStudy", false);
      rerender();
    },
    () => {
      setLoading("apostilaStudy", false);
      rerender();
    }
  );

  const stopApostilaStudyHistory = onValue(
    apostilaStudyHistoryRef,
    (snapshot) => {
      state.data.apostilaStudyHistory = parseCollection(snapshot.val())
        .map((entry) => ({
          id: entry.id,
          ...normalizeStudyHistoryEntry(entry),
        }))
        .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
      setLoading("apostilaStudyHistory", false);
      rerender();
    },
    () => {
      setLoading("apostilaStudyHistory", false);
      rerender();
    }
  );

  const stopApostilaExam = onValue(
    apostilaExamRef,
    (snapshot) => {
      state.data.apostilaExamSessions = parseCollection(snapshot.val()).sort((a, b) => {
        return Number(b.startedAt || 0) - Number(a.startedAt || 0);
      }).map((entry) => ({
        id: entry.id,
        ...normalizeExamSessionEntry(entry),
      }));
      computeGamificationOverview();
      setLoading("apostilaExam", false);
      rerender();
    },
    () => {
      setLoading("apostilaExam", false);
      rerender();
    }
  );

  const stopApostilaMediaUsage = onValue(
    apostilaMediaUsageRef,
    (snapshot) => {
      const raw = snapshot.val() || {};
      const normalized = {};
      Object.entries(raw).forEach(([itemId, value]) => {
        normalized[itemId] = normalizeMediaUsageEntry(value);
      });
      state.data.apostilaMediaUsage = normalized;
      setLoading("apostilaMediaUsage", false);
      rerender();
    },
    () => {
      setLoading("apostilaMediaUsage", false);
      rerender();
    }
  );

  const stopApostilaFlow = onValue(
    apostilaFlowRef,
    (snapshot) => {
      state.data.apostilaFlow = normalizeApostilaFlowEntry(snapshot.val() || {});
      computeGamificationOverview();
      setLoading("apostilaFlow", false);
      rerender();
    },
    () => {
      setLoading("apostilaFlow", false);
      rerender();
    }
  );

  const stopApostilaGamification = onValue(
    gamificationRef,
    (snapshot) => {
      state.data.apostilaGamification = normalizeGamificationEntry(snapshot.val() || {});
      computeGamificationOverview();
      setLoading("apostilaGamification", false);
      rerender();
    },
    () => {
      setLoading("apostilaGamification", false);
      rerender();
    }
  );

  state.listeners = [stopPerfil, stopHistorico, stopTreinos, stopProgresso, stopApostilaStudy, stopApostilaStudyHistory, stopApostilaExam, stopApostilaMediaUsage, stopApostilaFlow, stopApostilaGamification];
}

function resetPrivateData() {
  unbindAllListeners();
  if (apostilaSectionAlertTimeoutId) {
    clearTimeout(apostilaSectionAlertTimeoutId);
    apostilaSectionAlertTimeoutId = null;
  }
  state.data.perfil = null;
  state.data.treinos = [];
  state.data.progressoApostila = {};
  state.data.apostilaStudy = {};
  state.data.apostilaStudyHistory = [];
  state.data.apostilaExamSessions = [];
  state.data.apostilaMediaUsage = {};
  state.data.apostilaFlow = {
    lastMode: "",
    lastSectionId: "",
    lastActiveAt: 0,
    lastRecommendedAction: "",
  };
  state.data.apostilaGamification = {
    streakCurrent: 0,
    streakBest: 0,
    lastStudyDay: "",
    badgesUnlocked: {},
    sectionsReady: {},
  };
  state.data.gamificationOverview = {
    streakCurrent: 0,
    streakBest: 0,
    overallReadinessPct: 0,
    sectionsReadyCount: 0,
    readinessBySection: {},
    weakestSection: null,
    todayPlan: null,
    resumeFlow: null,
    recommendation: null,
    nextRecommendationLabel: "Revisar itens pendentes",
    badgesUnlockedList: [],
  };
  state.data.historicoGraduacoes = [];
  state.data.apostilaItemsComProgresso = [];
  state.data.studyInsights = {
    totalItems: apostilaItems.length,
    pendingItems: 0,
    masteredItems: 0,
    weakItems: 0,
    averageFamiliarity: 0,
    sections: [],
  };
  state.data.tecnicasFiltradas = [];
  state.data.metrics = {
    treinos7d: 0,
    treinos30d: 0,
    mediaUltimas5: "0,0",
    tecnicasMaisPraticadas: [],
    ultimosTreinos: [],
    totalItensApostila: apostilaItems.length,
    itensFavoritados: 0,
    itensConcluidos: 0,
    confiancaMedia: "0,0",
  };
  state.data.loading = {
    perfil: false,
    treinos: false,
    progressoApostila: false,
    apostilaStudy: false,
    apostilaStudyHistory: false,
    apostilaExam: false,
    apostilaMediaUsage: false,
    apostilaFlow: false,
    apostilaGamification: false,
    historicoGraduacoes: false,
  };
  state.ui = {
    treinoEmEdicao: null,
    filtroTecnicaTexto: "",
    filtroTecnicaCategoria: "",
    filtroSomenteFavoritas: false,
    apostilaModo: "ler",
    apostilaStudySession: null,
    apostilaExamSession: null,
    apostilaSupportItemId: null,
    apostilaSupportContext: "",
    apostilaStudySupportVisible: false,
    apostilaExamSupportVisible: false,
    apostilaSectionAlert: null,
    perfilSecaoAberta: null,
  };
  clearRouteFeedback("perfil");
  clearRouteFeedback("treinos");
  clearRouteFeedback("tecnicas");
  clearRouteFeedback("apostila");
}

function rerender() {
  if (rerenderScheduled) {
    return;
  }

  rerenderScheduled = true;
  const schedule = typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
    ? window.requestAnimationFrame.bind(window)
    : (callback) => setTimeout(callback, 16);

  schedule(() => {
    rerenderScheduled = false;
    renderRoute(state.route, state.user);
  });
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyTreinosLocal(items) {
  state.data.treinos = sortTreinosNewestFirst(items.map(sanitizeTreino));
  computeMetrics();
}

function applyProgressoLocalPatch(techId, patch) {
  const current = state.data.progressoApostila?.[techId] || {};
  state.data.progressoApostila = {
    ...(state.data.progressoApostila || {}),
    [techId]: {
      ...current,
      ...patch,
    },
  };
  mergeApostilaComProgresso();
  computeMetrics();
}

function removeHistoricoLocalById(id) {
  state.data.historicoGraduacoes = (state.data.historicoGraduacoes || []).filter((item) => item.id !== id);
}

function getOrderedApostilaItems() {
  return [...(state.data.apostilaSections || [])]
    .sort((a, b) => (a.ordemSecao || 0) - (b.ordemSecao || 0))
    .flatMap((section) => [...(section.itens || [])].sort((a, b) => (a.ordemItem || 0) - (b.ordemItem || 0)));
}

function buildStudyQueueBySection(sectionId) {
  if (!sectionId) {
    return [];
  }

  const section = (state.data.apostilaSections || []).find((item) => item.id === sectionId);
  if (!section) {
    return [];
  }

  return [...(section.itens || [])]
    .sort((a, b) => (a.ordemItem || 0) - (b.ordemItem || 0))
    .map((item) => item.id)
    .filter(Boolean);
}

function buildStudyQueueJapaneseOnly() {
  return getOrderedApostilaItems()
    .filter((item) => item.hasJapanese)
    .map((item) => item.id)
    .filter(Boolean);
}

function buildStudyQueuePending() {
  const now = Date.now();
  const orderedItems = getOrderedApostilaItems();
  const studyEntries = state.data.apostilaStudy || {};
  const hasHistory = Object.keys(studyEntries).length > 0;

  if (!hasHistory) {
    return buildStudyQueueJapaneseOnly().slice(0, 20);
  }

  const queue = orderedItems
    .map((item) => {
      const progress = normalizeStudyProgressEntry(studyEntries[item.id]);
      const overdueMs = progress.dueAt > 0 && progress.dueAt <= now ? now - progress.dueAt : 0;
      const overdueDays = overdueMs > 0 ? overdueMs / DAY_MS : 0;
      const dueScore = progress.dueAt <= 0 ? 1.8 : (overdueMs > 0 ? Math.min(6, 2 + overdueDays) : 0);
      const lowFamiliarityScore = Math.max(0, 5 - progress.familiarity) * 1.35;
      const mistakeBiasScore = Math.max(0, progress.totalWrong - progress.totalCorrect) * 1.8;
      const recentErrorScore = progress.lastResult === "wrong"
        ? (now - progress.lastSeenAt <= 3 * DAY_MS ? 3 : 1.4)
        : 0;
      const lowStreakScore = Math.max(0, 3 - progress.streak) * 0.9;
      const weightedScore = dueScore + lowFamiliarityScore + mistakeBiasScore + recentErrorScore + lowStreakScore;

      return {
        id: item.id,
        weightedScore,
        isDue: progress.dueAt <= now,
        ordemSecao: Number(item.ordemSecao || 0),
        ordemItem: Number(item.ordemItem || 0),
      };
    })
    .sort((a, b) => {
      if (a.weightedScore !== b.weightedScore) {
        return b.weightedScore - a.weightedScore;
      }
      if (a.isDue !== b.isDue) {
        return Number(b.isDue) - Number(a.isDue);
      }
      if (a.ordemSecao !== b.ordemSecao) {
        return a.ordemSecao - b.ordemSecao;
      }
      return a.ordemItem - b.ordemItem;
    })
    .map((item) => item.id)
    .filter(Boolean);

  const prioritized = queue.slice(0, 30);
  return prioritized.length ? prioritized : buildStudyQueueJapaneseOnly().slice(0, 20);
}

function getSectionByApostilaItemId(itemId) {
  if (!itemId) {
    return null;
  }

  const sections = state.data.apostilaSections || [];
  for (const section of sections) {
    const exists = (section.itens || []).some((item) => item.id === itemId);
    if (exists) {
      return section;
    }
  }

  return null;
}

function registerSectionCompletedAlert(sectionId) {
  if (!sectionId) {
    return;
  }

  const section = (state.data.apostilaSections || []).find((candidate) => candidate.id === sectionId);
  if (!section) {
    return;
  }

  state.ui.apostilaSectionAlert = {
    sectionId,
    label: `${section.ordemSecao}. ${section.titulo}`,
    createdAt: Date.now(),
  };

  if (apostilaSectionAlertTimeoutId) {
    clearTimeout(apostilaSectionAlertTimeoutId);
  }

  apostilaSectionAlertTimeoutId = setTimeout(() => {
    if (state.ui.apostilaSectionAlert?.sectionId === sectionId) {
      state.ui.apostilaSectionAlert = null;
      rerender();
    }
    apostilaSectionAlertTimeoutId = null;
  }, 2800);
}

function createStudySessionState({ selectedMode, selectedSectionId, queue }) {
  const normalizedQueue = Array.isArray(queue) ? queue.filter(Boolean) : [];

  return {
    selectedMode,
    selectedSectionId: selectedSectionId || null,
    startedAt: Date.now(),
    finishedAt: 0,
    historySaved: false,
    queue: normalizedQueue,
    currentIndex: 0,
    currentItem: normalizedQueue[0] || null,
    timerTotalSeconds: STUDY_TIMER_SECONDS,
    timerRemainingSeconds: STUDY_TIMER_SECONDS,
    timerStartedAt: Date.now(),
    isPaused: false,
    itemGrades: {},
    answerRevealed: false,
    finished: normalizedQueue.length === 0,
    sessionStats: {
      correct: 0,
      half: 0,
      wrong: 0,
      skipped: 0,
      notDone: 0,
      completed: 0,
      points: 0,
      wrongItemIds: [],
    },
  };
}

function getStudySessionTimerRemaining(session) {
  if (!session) {
    return STUDY_TIMER_SECONDS;
  }

  const total = Number(session.timerTotalSeconds || STUDY_TIMER_SECONDS);
  const baseRemaining = Math.max(0, Number(session.timerRemainingSeconds || total));
  if (session.isPaused) {
    return baseRemaining;
  }

  const startedAt = Number(session.timerStartedAt || Date.now());
  const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
  return Math.max(0, baseRemaining - elapsed);
}

function resetStudySessionTimer(session) {
  if (!session) {
    return;
  }

  const total = Number(session.timerTotalSeconds || STUDY_TIMER_SECONDS);
  session.timerRemainingSeconds = total;
  session.timerStartedAt = Date.now();
  session.isPaused = false;
}

function pauseStudySessionTimer(session) {
  if (!session || session.isPaused) {
    return;
  }

  session.timerRemainingSeconds = getStudySessionTimerRemaining(session);
  session.isPaused = true;
}

function resumeStudySessionTimer(session) {
  if (!session || !session.isPaused) {
    return;
  }

  session.isPaused = false;
  session.timerStartedAt = Date.now();
}

function toggleApostilaStudyPause() {
  const session = state.ui.apostilaStudySession;
  if (!session || session.finished) {
    return;
  }

  if (session.isPaused) {
    resumeStudySessionTimer(session);
  } else {
    pauseStudySessionTimer(session);
  }

  rerender();
}

function createExamDrillSessionState({ queue }) {
  const normalizedQueue = Array.isArray(queue) ? queue.filter(Boolean) : [];

  return {
    examMode: "ordinal",
    queue: normalizedQueue,
    currentIndex: 0,
    currentItem: normalizedQueue[0] || null,
    timerTotalSeconds: STUDY_TIMER_SECONDS,
    timerRemainingSeconds: STUDY_TIMER_SECONDS,
    timerStartedAt: Date.now(),
    isPaused: false,
    itemGrades: {},
    answerRevealed: false,
    finished: normalizedQueue.length === 0,
    finishedAt: 0,
    sessionStats: {
      correct: 0,
      half: 0,
      wrong: 0,
      skipped: 0,
      notDone: 0,
      completed: 0,
      points: 0,
      wrongItemIds: [],
    },
  };
}

function startApostilaExamDrillSession() {
  const queue = getOrderedApostilaItems().map((item) => item.id).filter(Boolean);
  state.ui.apostilaExamSession = createExamDrillSessionState({ queue });
  state.ui.apostilaSupportItemId = null;
  state.ui.apostilaSupportContext = "";
  state.ui.apostilaStudySupportVisible = false;
  state.ui.apostilaExamSupportVisible = false;
  rerender();
}

function toggleApostilaExamPause() {
  const session = state.ui.apostilaExamSession;
  if (!session || session.finished) {
    return;
  }

  if (session.isPaused) {
    resumeStudySessionTimer(session);
  } else {
    pauseStudySessionTimer(session);
  }

  rerender();
}

async function answerApostilaExamDrillSession(result) {
  const session = state.ui.apostilaExamSession;
  if (!session || session.finished || !session.currentItem || session.isPaused) {
    return;
  }

  const currentItemId = session.currentItem;
  const currentSectionId = getSectionByApostilaItemId(currentItemId)?.id || "";

  if (result === "repeat") {
    session.answerRevealed = false;
    rerender();
    return;
  }

  if (result === "not_done") {
    session.sessionStats.notDone = Number(session.sessionStats.notDone || 0) + 1;
  } else if (result === "correct") {
    session.sessionStats.correct += 1;
    session.sessionStats.points += 1;
    session.itemGrades[currentItemId] = { score: 1, label: "1" };
  } else if (result === "half") {
    session.sessionStats.half += 1;
    session.sessionStats.points += 0.5;
    session.itemGrades[currentItemId] = { score: 0.5, label: "0,5" };
  } else {
    session.sessionStats.wrong += 1;
    session.itemGrades[currentItemId] = { score: 0, label: "0" };
  }

  if (result !== "not_done") {
    session.sessionStats.completed += 1;
  }

  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.queue.length) {
    if (currentSectionId) {
      registerSectionCompletedAlert(currentSectionId);
    }
    session.currentIndex = nextIndex;
    session.currentItem = null;
    session.answerRevealed = false;
    session.finished = true;
    session.finishedAt = Date.now();
    rerender();
    return;
  }

  const nextItemId = session.queue[nextIndex] || null;
  const nextSectionId = getSectionByApostilaItemId(nextItemId)?.id || "";
  if (currentSectionId && nextSectionId && currentSectionId !== nextSectionId) {
    registerSectionCompletedAlert(currentSectionId);
  }

  session.currentIndex = nextIndex;
  session.currentItem = session.queue[nextIndex] || null;
  resetStudySessionTimer(session);
  session.answerRevealed = false;
  rerender();
}

function restartApostilaExamDrillSession() {
  startApostilaExamDrillSession();
}

function endApostilaExamDrillSession() {
  const session = state.ui.apostilaExamSession;
  if (!session) {
    return;
  }

  if (session.finished) {
    state.ui.apostilaExamSession = null;
    rerender();
    return;
  }

  session.finished = true;
  session.finishedAt = Date.now();
  session.currentItem = null;
  session.answerRevealed = false;
  rerender();
}

async function saveApostilaStudyHistorySnapshot(session, reason = "auto_end") {
  if (!state.user || !session || session.historySaved) {
    return;
  }

  const queue = Array.isArray(session.queue) ? session.queue : [];
  const itemGrades = session.itemGrades && typeof session.itemGrades === "object" ? session.itemGrades : {};
  const gradedItems = queue
    .map((itemId, index) => {
      const grade = itemGrades[itemId];
      if (!grade) {
        return null;
      }

      return {
        itemId,
        order: index + 1,
        score: Number(grade.score || 0),
        label: String(grade.label || "0"),
      };
    })
    .filter(Boolean);

  if (!gradedItems.length) {
    return;
  }

  const evaluatedCount = gradedItems.length;
  const points = Number(session?.sessionStats?.points || 0);
  const totalQueue = queue.length;
  const gradeCounts = gradedItems.reduce((acc, item) => {
    if (item.score >= 1) {
      acc.note1 += 1;
    } else if (item.score >= 0.5) {
      acc.note05 += 1;
    } else {
      acc.note0 += 1;
    }
    return acc;
  }, { note1: 0, note05: 0, note0: 0 });
  const finishedAt = Number(session.finishedAt || Date.now());
  const savedAt = Date.now();
  const id = `study_${savedAt}`;

  const entry = {
    id,
    mode: String(session.selectedMode || "ordered"),
    reason: String(reason || "auto_end"),
    startedAt: Number(session.startedAt || 0),
    finishedAt,
    savedAt,
    totalQueue,
    evaluatedCount,
    points,
    scorePct: evaluatedCount > 0 ? Math.round((points / evaluatedCount) * 100) : 0,
    executionPct: totalQueue > 0 ? Math.round((evaluatedCount / totalQueue) * 100) : 0,
    gradeCounts,
    gradedItems,
  };

  const current = Array.isArray(state.data.apostilaStudyHistory) ? state.data.apostilaStudyHistory : [];
  const next = [entry, ...current]
    .map((item) => ({ id: String(item.id || ""), ...normalizeStudyHistoryEntry(item) }))
    .filter((item) => item.id)
    .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))
    .slice(0, 5);

  const payload = {};
  next.forEach((item) => {
    const { id: itemId, ...rest } = item;
    payload[itemId] = rest;
  });

  session.historySaved = true;
  state.data.apostilaStudyHistory = next;
  rerender();

  try {
    const historyRef = ref(db, `users/${state.user.uid}/apostilaStudyHistory`);
    await set(historyRef, payload);
  } catch {
    session.historySaved = false;
    setRouteFeedback("apostila", "Falha ao salvar histórico automático de estudo.", "error");
  }
}

function startApostilaStudySession({ mode, sectionId = null, sourceAction = "" }) {
  let queue = [];

  if (mode === "ordered") {
    queue = getOrderedApostilaItems().map((item) => item.id).filter(Boolean);
  } else if (mode === "random") {
    queue = shuffleArray(getOrderedApostilaItems().map((item) => item.id).filter(Boolean));
  } else if (mode === "section") {
    queue = buildStudyQueueBySection(sectionId);
  } else if (mode === "jp_to_mov" || mode === "mov_to_jp") {
    queue = buildStudyQueueJapaneseOnly();
  } else if (mode === "pending") {
    queue = buildStudyQueuePending();
  }

  if (!queue.length && mode !== "section") {
    queue = buildStudyQueueJapaneseOnly();
  }

  state.ui.apostilaStudySession = createStudySessionState({
    selectedMode: mode,
    selectedSectionId: mode === "section" ? sectionId : null,
    queue,
  });

  registerApostilaFlowActivity({
    mode: mode === "section" ? "section" : mode,
    sectionId: mode === "section" ? String(sectionId || "") : "",
    recommendedAction: sourceAction,
  });
  state.ui.apostilaSupportItemId = null;
  state.ui.apostilaSupportContext = "";
  state.ui.apostilaStudySupportVisible = false;
  state.ui.apostilaExamSupportVisible = false;

  rerender();
}

function revealApostilaStudyAnswer() {
  const session = state.ui.apostilaStudySession;
  if (!session || session.finished) {
    return;
  }

  session.answerRevealed = true;
  rerender();
}

async function updateApostilaStudyProgress(itemId, result) {
  if (!state.user || !itemId) {
    return;
  }

  const current = normalizeStudyProgressEntry(state.data.apostilaStudy?.[itemId]);
  const now = Date.now();
  const patch = {
    lastSeenAt: now,
    lastResult: result,
  };

  if (result === "correct") {
    const familiarity = Math.min(5, Number(current.familiarity || 0) + 1);
    const streak = Number(current.streak || 0) + 1;
    const baseHoursByFamiliarity = [8, 16, 30, 52, 86, 132];
    const baseHours = baseHoursByFamiliarity[familiarity] || 30;
    const streakMultiplier = Math.min(1.8, 1 + streak * 0.12);
    const nextHours = Math.round(baseHours * streakMultiplier);

    patch.familiarity = familiarity;
    patch.streak = streak;
    patch.totalCorrect = Number(current.totalCorrect || 0) + 1;
    patch.dueAt = now + nextHours * 60 * 60 * 1000;
  } else if (result === "wrong") {
    patch.familiarity = Math.max(0, Number(current.familiarity || 0) - 1);
    patch.streak = 0;
    patch.totalWrong = Number(current.totalWrong || 0) + 1;
    patch.lastWrongAt = now;
    patch.dueAt = now + 75 * 60 * 1000;
  } else if (result === "skipped") {
    patch.streak = Math.max(0, Number(current.streak || 0) - 1);
    patch.totalSkipped = Number(current.totalSkipped || 0) + 1;
    patch.dueAt = now + 3 * 60 * 60 * 1000;
  } else if (result === "half") {
    patch.streak = 0;
    patch.totalSkipped = Number(current.totalSkipped || 0) + 1;
    patch.dueAt = now + 90 * 60 * 1000;
  }

  state.data.apostilaStudy = {
    ...(state.data.apostilaStudy || {}),
    [itemId]: {
      ...current,
      ...patch,
    },
  };
  computeStudyInsights();

  try {
    const itemRef = ref(db, `users/${state.user.uid}/apostilaStudy/${itemId}`);
    await update(itemRef, patch);
  } catch {
    setRouteFeedback("apostila", "Falha ao atualizar progresso de estudo.", "error");
  }
}

async function answerApostilaStudySession(result) {
  const session = state.ui.apostilaStudySession;
  if (!session || session.finished || !session.currentItem) {
    return;
  }

  if (session.isPaused) {
    return;
  }

  const currentItemId = session.currentItem;
  const currentSectionId = getSectionByApostilaItemId(currentItemId)?.id || "";

  if (result === "repeat") {
    session.answerRevealed = false;
    rerender();
    return;
  }

  if (result === "not_done") {
    session.sessionStats.notDone = Number(session.sessionStats.notDone || 0) + 1;

    const nextIndexNotDone = session.currentIndex + 1;
    if (nextIndexNotDone >= session.queue.length) {
      if (currentSectionId) {
        registerSectionCompletedAlert(currentSectionId);
      }
      session.currentIndex = nextIndexNotDone;
      session.currentItem = null;
      session.answerRevealed = false;
      session.finished = true;
      session.finishedAt = Date.now();
      await saveApostilaStudyHistorySnapshot(session, "auto_complete");
      rerender();
      return;
    }

    const nextItemIdNotDone = session.queue[nextIndexNotDone] || null;
    const nextSectionIdNotDone = getSectionByApostilaItemId(nextItemIdNotDone)?.id || "";
    if (currentSectionId && nextSectionIdNotDone && currentSectionId !== nextSectionIdNotDone) {
      registerSectionCompletedAlert(currentSectionId);
    }

    session.currentIndex = nextIndexNotDone;
    session.currentItem = session.queue[nextIndexNotDone] || null;
    resetStudySessionTimer(session);
    session.answerRevealed = false;
    state.ui.apostilaStudySupportVisible = false;
    state.ui.apostilaSupportItemId = null;
    state.ui.apostilaSupportContext = "";
    rerender();
    return;
  }

  if (result === "correct" || result === "wrong" || result === "skipped" || result === "half") {
    await updateApostilaStudyProgress(currentItemId, result);
  }

  if (result === "correct") {
    session.sessionStats.correct += 1;
    session.sessionStats.points += 1;
    session.itemGrades[currentItemId] = { score: 1, label: "1" };
  } else if (result === "half") {
    session.sessionStats.half += 1;
    session.sessionStats.points += 0.5;
    session.itemGrades[currentItemId] = { score: 0.5, label: "0,5" };
  } else if (result === "wrong") {
    session.sessionStats.wrong += 1;
    if (!session.sessionStats.wrongItemIds.includes(currentItemId)) {
      session.sessionStats.wrongItemIds.push(currentItemId);
    }
    session.sessionStats.points += 0;
    session.itemGrades[currentItemId] = { score: 0, label: "0" };
  } else {
    session.sessionStats.skipped += 1;
    session.sessionStats.points += 0;
    session.itemGrades[currentItemId] = { score: 0, label: "0" };
  }

  session.sessionStats.completed += 1;

  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.queue.length) {
    if (currentSectionId) {
      registerSectionCompletedAlert(currentSectionId);
    }
    session.currentIndex = nextIndex;
    session.currentItem = null;
    session.answerRevealed = false;
    session.finished = true;
    session.finishedAt = Date.now();
    const streakInfo = await applyStudyStreakUpdate();
    await patchApostilaGamification({
      sectionsReady: { ...(state.data.gamificationOverview?.readinessBySection || {}) },
    });
    const perfectSectionReview = session.selectedMode === "section" && session.sessionStats.wrong === 0 && session.sessionStats.completed > 0;
    const badgesEarnedNow = await evaluateDerivedBadges({ perfectSectionReview });
    session.rewardFeedback = buildStudyRewardFeedback(session, streakInfo, badgesEarnedNow);
    await saveApostilaStudyHistorySnapshot(session, "auto_complete");
    rerender();
    return;
  }

  const nextItemId = session.queue[nextIndex] || null;
  const nextSectionId = getSectionByApostilaItemId(nextItemId)?.id || "";
  if (currentSectionId && nextSectionId && currentSectionId !== nextSectionId) {
    registerSectionCompletedAlert(currentSectionId);
  }

  session.currentIndex = nextIndex;
  session.currentItem = session.queue[nextIndex] || null;
  resetStudySessionTimer(session);
  session.answerRevealed = false;
  state.ui.apostilaStudySupportVisible = false;
  state.ui.apostilaSupportItemId = null;
  state.ui.apostilaSupportContext = "";
  rerender();
}

async function endApostilaStudySession() {
  const session = state.ui.apostilaStudySession;
  if (!session) {
    return;
  }

  if (session.finished) {
    if (!session.historySaved) {
      await saveApostilaStudyHistorySnapshot(session, "manual_end");
    }
    state.ui.apostilaStudySession = null;
    rerender();
    return;
  }

  session.finished = true;
  session.finishedAt = Date.now();
  session.currentItem = null;
  session.answerRevealed = false;
  if (!session.rewardFeedback && Number(session.sessionStats?.completed || 0) > 0) {
    const streakInfo = await applyStudyStreakUpdate();
    await patchApostilaGamification({
      sectionsReady: { ...(state.data.gamificationOverview?.readinessBySection || {}) },
    });
    const perfectSectionReview = session.selectedMode === "section" && session.sessionStats.wrong === 0 && session.sessionStats.completed > 0;
    const badgesEarnedNow = await evaluateDerivedBadges({ perfectSectionReview });
    session.rewardFeedback = buildStudyRewardFeedback(session, streakInfo, badgesEarnedNow);
  }
  await saveApostilaStudyHistorySnapshot(session, "manual_end");
  rerender();
}

function restartApostilaStudySession() {
  const session = state.ui.apostilaStudySession;
  if (!session) {
    return;
  }

  startApostilaStudySession({
    mode: session.selectedMode,
    sectionId: session.selectedSectionId,
  });
}

function restartWrongItemsStudySession() {
  const session = state.ui.apostilaStudySession;
  if (!session) {
    return;
  }

  const wrongQueue = Array.from(new Set(session.sessionStats?.wrongItemIds || []));
  if (!wrongQueue.length) {
    startApostilaStudySession({
      mode: session.selectedMode,
      sectionId: session.selectedSectionId,
    });
    return;
  }

  state.ui.apostilaStudySession = createStudySessionState({
    selectedMode: "wrong_retry",
    selectedSectionId: session.selectedSectionId || null,
    queue: wrongQueue,
  });

  rerender();
}

function startStudySessionFromItems(itemIds, selectedMode = "exam_review") {
  const queue = Array.from(new Set((itemIds || []).map((itemId) => String(itemId || "")).filter(Boolean)));
  if (!queue.length) {
    return;
  }

  state.ui.apostilaModo = "estudar";
  state.ui.apostilaExamSession = null;
  state.ui.apostilaStudySession = createStudySessionState({
    selectedMode,
    selectedSectionId: null,
    queue,
  });
  registerApostilaFlowActivity({
    mode: selectedMode,
    sectionId: "",
    recommendedAction: "review_mistakes",
  });
  state.ui.apostilaStudySupportVisible = false;
  state.ui.apostilaExamSupportVisible = false;
  state.ui.apostilaSupportItemId = null;
  state.ui.apostilaSupportContext = "";
  rerender();
}

function buildExamQueueBySection(sectionId) {
  return buildStudyQueueBySection(sectionId);
}

function buildExamQueueFull() {
  return getOrderedApostilaItems().map((item) => item.id).filter(Boolean);
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildExamQueueRandom() {
  return shuffleArray(buildExamQueueFull());
}

function createExamSessionState({ examMode, selectedSectionId, queue, promptStyle }) {
  const normalizedQueue = Array.isArray(queue) ? queue.filter(Boolean) : [];

  return {
    examMode,
    selectedSectionId: selectedSectionId || null,
    promptStyle: promptStyle || "mov_to_jp",
    queue: normalizedQueue,
    currentIndex: 0,
    currentItem: normalizedQueue[0] || null,
    answerRevealed: false,
    finished: normalizedQueue.length === 0,
    startedAt: Date.now(),
    persisted: false,
    examStats: {
      correct: 0,
      wrong: 0,
      skipped: 0,
      completed: 0,
      mistakes: [],
    },
  };
}

function startApostilaExamSession({ mode, sectionId = null, promptStyle = "mov_to_jp", sourceAction = "" }) {
  let queue = [];

  if (mode === "section") {
    queue = buildExamQueueBySection(sectionId);
  } else if (mode === "full") {
    queue = buildExamQueueFull();
  } else if (mode === "random") {
    queue = buildExamQueueRandom();
  }

  state.ui.apostilaExamSession = createExamSessionState({
    examMode: mode,
    selectedSectionId: mode === "section" ? sectionId : null,
    queue,
    promptStyle,
  });

  registerApostilaFlowActivity({
    mode: mode === "section" ? "exam_section" : mode === "random" ? "exam_random" : "exam_full",
    sectionId: mode === "section" ? String(sectionId || "") : "",
    recommendedAction: sourceAction,
  });
  state.ui.apostilaSupportItemId = null;
  state.ui.apostilaSupportContext = "";
  state.ui.apostilaStudySupportVisible = false;
  state.ui.apostilaExamSupportVisible = false;

  rerender();
}

function revealApostilaExamAnswer() {
  const session = state.ui.apostilaExamSession;
  if (!session || session.finished) {
    return;
  }

  session.answerRevealed = true;
  rerender();
}

async function persistApostilaExamSession(session) {
  if (!state.user || !session || session.persisted) {
    return false;
  }

  const finishedAt = Date.now();
  const totalItems = Number(session.queue?.length || 0);
  const correct = Number(session.examStats?.correct || 0);
  const wrong = Number(session.examStats?.wrong || 0);
  const skipped = Number(session.examStats?.skipped || 0);
  const mistakes = Array.from(new Set(session.examStats?.mistakes || []));
  const score = totalItems > 0 ? Math.round((correct / totalItems) * 100) : 0;

  const payload = {
    mode: session.examMode,
    title: "Simulação finalizada",
    progressText: `${total} movimentos · ${correct} execuções validadas · ${wrong} pontos para revisar · consistência ${score}%`,
    improvedText: `${correct} movimento(s) foram consolidados nesta rodada.`,
    weakText: wrong + skipped > 0 ? `${wrong + skipped} movimento(s) pedem repetição imediata.` : "Sem pontos frágeis nesta simulação.",
    score,
    totalItems,
    mistakes,
    correct,
    wrong,
    skipped,
  };

  try {
    const examRootRef = ref(db, `users/${state.user.uid}/apostilaExam`);
    const sessionRef = push(examRootRef);
    await set(sessionRef, payload);
    session.persisted = true;
    return true;
  } catch {
    setRouteFeedback("apostila", "Falha ao registrar resultado do simulado.", "error");
    return false;
  }
}

async function endApostilaExamSession() {
  const session = state.ui.apostilaExamSession;
  if (!session) {
    return;
  }

  if (session.finished) {
    state.ui.apostilaExamSession = null;
    rerender();
    return;
  }

  session.finished = true;
  session.currentItem = null;
  session.answerRevealed = false;
  const persistedNow = await persistApostilaExamSession(session);
  const badgesEarnedNow = persistedNow ? await evaluateDerivedBadges({ examCompleted: true }) : [];
  session.rewardFeedback = buildExamRewardFeedback(session, badgesEarnedNow);
  rerender();
}

async function answerApostilaExamSession(result) {
  const session = state.ui.apostilaExamSession;
  if (!session || session.finished || !session.currentItem) {
    return;
  }

  const currentItemId = session.currentItem;
  if (result === "correct") {
    session.examStats.correct += 1;
  } else if (result === "wrong") {
    session.examStats.wrong += 1;
    if (!session.examStats.mistakes.includes(currentItemId)) {
      session.examStats.mistakes.push(currentItemId);
    }
  } else if (result === "skipped") {
    session.examStats.skipped += 1;
  }

  session.examStats.completed += 1;

  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.queue.length) {
    session.currentIndex = nextIndex;
    session.currentItem = null;
    session.answerRevealed = false;
    session.finished = true;
    const persistedNow = await persistApostilaExamSession(session);
    const badgesEarnedNow = persistedNow ? await evaluateDerivedBadges({ examCompleted: true }) : [];
    session.rewardFeedback = buildExamRewardFeedback(session, badgesEarnedNow);
    rerender();
    return;
  }

  session.currentIndex = nextIndex;
  session.currentItem = session.queue[nextIndex] || null;
  session.answerRevealed = false;
  state.ui.apostilaExamSupportVisible = false;
  state.ui.apostilaSupportItemId = null;
  state.ui.apostilaSupportContext = "";
  rerender();
}

function restartApostilaExamSession() {
  const session = state.ui.apostilaExamSession;
  if (!session) {
    return;
  }

  startApostilaExamSession({
    mode: session.examMode,
    sectionId: session.selectedSectionId,
    promptStyle: session.promptStyle,
  });
}

function reviewCurrentExamMistakes() {
  const session = state.ui.apostilaExamSession;
  if (!session) {
    return;
  }

  startStudySessionFromItems(session.examStats?.mistakes || [], "exam_review");
}

function reviewSavedExamMistakes(sessionId) {
  const target = (state.data.apostilaExamSessions || []).find((entry) => entry.id === sessionId);
  if (!target) {
    return;
  }

  startStudySessionFromItems(target.mistakes || [], "exam_review");
}

function getTecnicaResumo(tecnicaIds) {
  const byId = new Map(state.data.apostilaItemsComProgresso.map((item) => [item.id, item]));
  return tecnicaIds
    .map((id) => {
      const tecnica = byId.get(id);
      if (!tecnica) {
        return null;
      }
      return {
        id: tecnica.id,
        nome: tecnica.nome,
        categoria: tecnica.categoria,
      };
    })
    .filter(Boolean);
}

function setTreinoEdit(id) {
  const treino = state.data.treinos.find((item) => item.id === id);
  state.ui.treinoEmEdicao = treino || null;
  rerender();
}

async function saveTreino(payload) {
  if (!state.user) {
    return;
  }

  const data = normalizeDateInput(payload.data);
  const dataMs = toDateMsFromIso(data);

  if (!data || !payload.tipoTreino || payload.duracaoMin <= 0 || payload.notaSessao < 1 || payload.notaSessao > 5) {
    setRouteFeedback("treinos", "Preencha os campos obrigatórios corretamente.", "error");
    rerender();
    return;
  }

  const now = Date.now();
  const tecnicaIds = Array.from(new Set(payload.tecnicaIds || []));
  const tecnicaResumo = getTecnicaResumo(tecnicaIds);
  const previousTreinos = cloneJson(state.data.treinos);
  const isEdit = Boolean(payload.id);
  const localId = isEdit ? payload.id : push(ref(db, `users/${state.user.uid}/treinos`)).key;

  if (!localId) {
    setRouteFeedback("treinos", "Não foi possível gerar ID do treino.", "error");
    rerender();
    return;
  }

  const base = {
    id: localId,
    data,
    dataMs,
    tipoTreino: payload.tipoTreino,
    duracaoMin: payload.duracaoMin,
    observacoes: payload.observacoes || "",
    notaSessao: payload.notaSessao,
    tecnicaIds,
    tecnicaResumo,
    updatedAt: serverTimestamp(),
    updatedAtMs: now,
  };

  const optimistList = isEdit
    ? state.data.treinos.map((item) => (item.id === localId ? { ...item, ...base } : item))
    : [{
        ...base,
        createdAtMs: now,
      }, ...state.data.treinos];

  applyTreinosLocal(optimistList);
  state.ui.treinoEmEdicao = null;
  setRouteFeedback("treinos", isEdit ? "Atualizando treino..." : "Registrando treino...", "success");
  rerender();

  try {
    if (isEdit) {
      const treinoRef = ref(db, `users/${state.user.uid}/treinos/${localId}`);
      await update(treinoRef, base);
      setRouteFeedback("treinos", "Treino atualizado com sucesso.", "success");
    } else {
      const treinoRef = ref(db, `users/${state.user.uid}/treinos/${localId}`);
      await set(treinoRef, {
        ...base,
        createdAt: serverTimestamp(),
        createdAtMs: now,
      });
      setRouteFeedback("treinos", "Treino registrado com sucesso.", "success");
    }
  } catch {
    applyTreinosLocal(previousTreinos);
    setRouteFeedback("treinos", "Erro ao salvar treino.", "error");
  }

  rerender();
}

async function deleteTreino(id) {
  if (!state.user || !id) {
    return;
  }

  const previousTreinos = cloneJson(state.data.treinos);
  applyTreinosLocal(state.data.treinos.filter((item) => item.id !== id));
  setRouteFeedback("treinos", "Removendo treino...", "success");

  try {
    const treinoRef = ref(db, `users/${state.user.uid}/treinos/${id}`);
    await set(treinoRef, null);
    setRouteFeedback("treinos", "Treino excluído com sucesso.", "success");

    if (state.ui.treinoEmEdicao?.id === id) {
      state.ui.treinoEmEdicao = null;
    }
  } catch {
    applyTreinosLocal(previousTreinos);
    setRouteFeedback("treinos", "Erro ao excluir treino.", "error");
  }

  rerender();
}

async function saveTecnicaProgress(payload) {
  if (!state.user || !payload.techId) {
    return;
  }

  const nivelConfianca = Number(payload.nivelConfianca || 0);
  if (nivelConfianca < 0 || nivelConfianca > 5) {
    setRouteFeedback("tecnicas", "Nível de confiança deve estar entre 0 e 5.", "error");
    rerender();
    return;
  }

  const now = Date.now();
  const progressRef = ref(db, `users/${state.user.uid}/progressoApostila/${payload.techId}`);
  const previousProgresso = cloneJson(state.data.progressoApostila || {});

  applyProgressoLocalPatch(payload.techId, {
    favorita: Boolean(payload.favorita),
    nivelConfianca,
    concluida: Boolean(payload.concluida),
    observacoesPessoais: String(payload.observacoesPessoais || ""),
    updatedAtMs: now,
  });
  setRouteFeedback("tecnicas", "Salvando progresso...", "success");
  rerender();

  try {
    await update(progressRef, {
      favorita: Boolean(payload.favorita),
      nivelConfianca,
      concluida: Boolean(payload.concluida),
      observacoesPessoais: String(payload.observacoesPessoais || ""),
      updatedAt: serverTimestamp(),
      updatedAtMs: now,
    });
    setRouteFeedback("tecnicas", "Progresso da técnica salvo com sucesso.", "success");
  } catch {
    state.data.progressoApostila = previousProgresso;
    mergeApostilaComProgresso();
    computeMetrics();
    setRouteFeedback("tecnicas", "Erro ao salvar progresso da técnica.", "error");
  }

  rerender();
}

async function saveApostilaDetalhes(payload) {
  if (!state.user || !payload.techId) {
    return;
  }

  const now = Date.now();
  const progressRef = ref(db, `users/${state.user.uid}/progressoApostila/${payload.techId}`);
  const previousProgresso = cloneJson(state.data.progressoApostila || {});

  applyProgressoLocalPatch(payload.techId, {
    significado: String(payload.significado || ""),
    detalhesExecucao: String(payload.detalhesExecucao || ""),
    pontosDeAtencao: String(payload.pontosDeAtencao || ""),
    errosComuns: String(payload.errosComuns || ""),
    observacoesDoProfessor: String(payload.observacoesDoProfessor || ""),
    updatedAtMs: now,
  });
  setRouteFeedback("apostila", "Salvando detalhes...", "success");
  rerender();

  try {
    await update(progressRef, {
      significado: String(payload.significado || ""),
      detalhesExecucao: String(payload.detalhesExecucao || ""),
      pontosDeAtencao: String(payload.pontosDeAtencao || ""),
      errosComuns: String(payload.errosComuns || ""),
      observacoesDoProfessor: String(payload.observacoesDoProfessor || ""),
      updatedAt: serverTimestamp(),
      updatedAtMs: now,
    });
    setRouteFeedback("apostila", "Detalhes da apostila salvos com sucesso.", "success");
  } catch {
    state.data.progressoApostila = previousProgresso;
    mergeApostilaComProgresso();
    computeMetrics();
    setRouteFeedback("apostila", "Erro ao salvar detalhes da apostila.", "error");
  }

  rerender();
}

function handleTecnicaFilterChange({ texto, categoria, somenteFavoritas }) {
  if (typeof texto === "string") {
    state.ui.filtroTecnicaTexto = texto;
  }

  if (typeof categoria === "string") {
    state.ui.filtroTecnicaCategoria = categoria;
  }

  if (typeof somenteFavoritas === "boolean") {
    state.ui.filtroSomenteFavoritas = somenteFavoritas;
  }

  applyTecnicaFilters();
  rerender();
}

async function saveGraduacaoHistorico(payload) {
  if (!state.user) {
    return;
  }

  const dataMs = payload.dataGrad ? new Date(payload.dataGrad + "T12:00:00").getTime() : 0;
  const now = Date.now();
  const previousHistorico = cloneJson(state.data.historicoGraduacoes || []);
  const localId = push(ref(db, `users/${state.user.uid}/historicoGraduacoes`)).key;

  if (!localId) {
    setRouteFeedback("perfil", "Não foi possível gerar ID da graduação.", "error");
    rerender();
    return;
  }

  state.data.historicoGraduacoes = [{
    id: localId,
    faixa: String(payload.faixa || ""),
    grau: String(payload.grau || ""),
    dataGrad: String(payload.dataGrad || ""),
    dataMs,
    observacoes: String(payload.observacoes || ""),
    createdAtMs: now,
  }, ...(state.data.historicoGraduacoes || [])];
  state.ui.perfilSecaoAberta = "historico";
  setRouteFeedback("perfil", "Adicionando graduação...", "success");
  rerender();

  try {
    const entryRef = ref(db, `users/${state.user.uid}/historicoGraduacoes/${localId}`);
    await set(entryRef, {
      faixa: String(payload.faixa || ""),
      grau: String(payload.grau || ""),
      dataGrad: String(payload.dataGrad || ""),
      dataMs,
      observacoes: String(payload.observacoes || ""),
      createdAtMs: now,
    });
    setRouteFeedback("perfil", "Entrada de graduação adicionada.", "success");
  } catch {
    state.data.historicoGraduacoes = previousHistorico;
    setRouteFeedback("perfil", "Erro ao salvar entrada de graduação.", "error");
  }

  rerender();
}

async function deleteGraduacaoHistorico(id) {
  if (!state.user || !id) {
    return;
  }

  const previousHistorico = cloneJson(state.data.historicoGraduacoes || []);
  removeHistoricoLocalById(id);
  state.ui.perfilSecaoAberta = "historico";
  setRouteFeedback("perfil", "Removendo graduação...", "success");
  rerender();

  try {
    const entryRef = ref(db, `users/${state.user.uid}/historicoGraduacoes/${id}`);
    await set(entryRef, null);
    state.ui.perfilSecaoAberta = "historico";
    setRouteFeedback("perfil", "Entrada removida do histórico.", "success");
  } catch {
    state.data.historicoGraduacoes = previousHistorico;
    setRouteFeedback("perfil", "Erro ao remover entrada.", "error");
  }

  rerender();
}

async function updateGraduacaoHistorico(id, payload) {
  if (!state.user || !id) {
    return;
  }

  const dataMs = payload.dataGrad ? new Date(payload.dataGrad + "T12:00:00").getTime() : 0;
  const now = Date.now();
  const previousHistorico = cloneJson(state.data.historicoGraduacoes || []);

  state.data.historicoGraduacoes = (state.data.historicoGraduacoes || []).map((entry) => (
    entry.id === id
      ? {
          ...entry,
          faixa: String(payload.faixa || ""),
          grau: String(payload.grau || ""),
          dataGrad: String(payload.dataGrad || ""),
          dataMs,
          observacoes: String(payload.observacoes || ""),
          updatedAtMs: now,
        }
      : entry
  ));
  state.ui.perfilSecaoAberta = "historico";
  setRouteFeedback("perfil", "Atualizando graduação...", "success");
  rerender();

  try {
    const entryRef = ref(db, `users/${state.user.uid}/historicoGraduacoes/${id}`);
    await update(entryRef, {
      faixa: String(payload.faixa || ""),
      grau: String(payload.grau || ""),
      dataGrad: String(payload.dataGrad || ""),
      dataMs,
      observacoes: String(payload.observacoes || ""),
      updatedAtMs: now,
    });
    state.ui.perfilSecaoAberta = "historico";
    setRouteFeedback("perfil", "Graduação atualizada com sucesso.", "success");
  } catch {
    state.data.historicoGraduacoes = previousHistorico;
    setRouteFeedback("perfil", "Erro ao atualizar graduação.", "error");
  }

  rerender();
}

function renderRoute(route, user) {
  state.route = route;
  if (!view) {
    return;
  }

  view.innerHTML = renderRouteView(route, user, state.data, state.feedback, state.ui);
  syncShellState({ route, user, dataState: state.data });

  if (route === "/login") {
    mountLoginHandlers({
      onEmailLogin: async ({ email, senha }) => {
        setLoginMessage({ text: "" });
        try {
          await loginWithEmail({ email, senha });
          setLoginMessage({ text: "Login realizado com sucesso.", type: "success" });
        } catch (error) {
          setLoginMessage({ text: normalizeAuthError(error), type: "error" });
        }
      },
      onGoogleLogin: async () => {
        setLoginMessage({ text: "" });
        try {
          await loginWithGoogle();
          setLoginMessage({ text: "Login com Google realizado com sucesso.", type: "success" });
        } catch (error) {
          setLoginMessage({ text: normalizeAuthError(error), type: "error" });
        }
      },
    });
  }

  if (route === "/perfil") {
    mountPerfilHandler({
      onSave: async (payload, secao) => {
        if (!state.user) {
          return;
        }

        if (!payload.nomeCompleto) {
          setRouteFeedback("perfil", "Nome completo é obrigatório.", "error");
          rerender();
          return;
        }

        if (secao) {
          state.ui.perfilSecaoAberta = secao;
        }

        const now = Date.now();
        const previousPerfil = cloneJson(state.data.perfil || {});
        const optimisticPerfil = {
          ...(state.data.perfil || {}),
          ...payload,
          nome: payload.nomeCompleto,
          faixa: payload.faixaAtual,
          updatedAtMs: now,
        };

        state.data.perfil = optimisticPerfil;
        setRouteFeedback("perfil", "Salvando perfil...", "success");
        rerender();

        try {
          const perfilRef = ref(db, `users/${state.user.uid}/perfil`);
          await update(perfilRef, {
            ...payload,
            nome: payload.nomeCompleto,
            faixa: payload.faixaAtual,
            updatedAt: serverTimestamp(),
            updatedAtMs: now,
          });
          setRouteFeedback("perfil", "Perfil salvo com sucesso.", "success");
        } catch {
          state.data.perfil = previousPerfil;
          setRouteFeedback("perfil", "Não foi possível salvar o perfil.", "error");
        }

        rerender();
      },
      onLogout: async () => {
        await logoutUser();
      },
      onAvatarUpload: async (file, onProgress) => {
        if (!state.user || !file) return "";
        const uid = state.user.uid;
        const { avatarUrl, avatarPublicId } = await uploadAvatarToCloudinary(file, onProgress);
        const perfilRef = ref(db, `users/${uid}/perfil`);
        await update(perfilRef, {
          avatarUrl,
          avatarPublicId,
          updatedAt: serverTimestamp(),
          updatedAtMs: Date.now(),
        });
        return avatarUrl;
      },
      onAvatarRemove: async () => {
        if (!state.user) return;
        const uid = state.user.uid;
        const perfilRef = ref(db, `users/${uid}/perfil`);
        await update(perfilRef, {
          avatarUrl: "",
          avatarPublicId: "",
          updatedAt: serverTimestamp(),
          updatedAtMs: Date.now(),
        });
      },
      onAddGrad: saveGraduacaoHistorico,
      onDeleteGrad: deleteGraduacaoHistorico,
      onEditGrad: updateGraduacaoHistorico,
    });
  }

  if (route === "/treinos") {
    mountTreinoHandlers({
      onSave: saveTreino,
      onStartEdit: setTreinoEdit,
      onCancelEdit: () => {
        state.ui.treinoEmEdicao = null;
        rerender();
      },
      onDelete: deleteTreino,
    });
  }

  if (route === "/tecnicas") {
    mountTecnicasHandlers({
      onSaveProgress: saveTecnicaProgress,
      onFilterChange: handleTecnicaFilterChange,
    });
  }

  if (route === "/apostila") {
    mountApostilaHandlers({
      modoAtual: state.ui.apostilaModo,
      onModeChange: (modo) => {
        const previousMode = state.ui.apostilaModo;
        if (
          previousMode === "estudar"
          && modo !== "estudar"
          && state.ui.apostilaStudySession
          && !state.ui.apostilaStudySession.finished
          && !state.ui.apostilaStudySession.isPaused
        ) {
          pauseStudySessionTimer(state.ui.apostilaStudySession);
        }

        if (
          previousMode === "simulado"
          && modo !== "simulado"
          && state.ui.apostilaExamSession
          && !state.ui.apostilaExamSession.finished
          && !state.ui.apostilaExamSession.isPaused
        ) {
          pauseStudySessionTimer(state.ui.apostilaExamSession);
        }

        state.ui.apostilaModo = modo;

        if (modo === "simulado" && state.ui.apostilaStudySession && !state.ui.apostilaStudySession.finished && !state.ui.apostilaStudySession.isPaused) {
          pauseStudySessionTimer(state.ui.apostilaStudySession);
        }

        state.ui.apostilaSupportItemId = null;
        state.ui.apostilaSupportContext = "";
        state.ui.apostilaStudySupportVisible = false;
        state.ui.apostilaExamSupportVisible = false;
        rerender();
      },
      onStartStudySession: ({ mode, sectionId }) => {
        startApostilaStudySession({ mode, sectionId });
      },
      onRevealStudyAnswer: () => {
        revealApostilaStudyAnswer();
      },
      onAnswerStudySession: async (result) => {
        await answerApostilaStudySession(result);
      },
      onEndStudySession: async () => {
        await endApostilaStudySession();
      },
      onRestartStudySession: () => {
        restartApostilaStudySession();
      },
      onToggleStudyPause: () => {
        toggleApostilaStudyPause();
      },
      onRestartWrongStudySession: () => {
        restartWrongItemsStudySession();
      },
      onStartExamSession: ({ mode, sectionId, promptStyle }) => {
        startApostilaExamDrillSession();
      },
      onRevealExamAnswer: () => {
        revealApostilaExamAnswer();
      },
      onAnswerExamSession: async (result) => {
        await answerApostilaExamDrillSession(result);
      },
      onEndExamSession: async () => {
        endApostilaExamDrillSession();
      },
      onRestartExamSession: () => {
        restartApostilaExamDrillSession();
      },
      onToggleExamPause: () => {
        toggleApostilaExamPause();
      },
      onReviewCurrentExamMistakes: () => {
        reviewCurrentExamMistakes();
      },
      onReviewSavedExamMistakes: (sessionId) => {
        reviewSavedExamMistakes(sessionId);
      },
      onRunGuidedAction: ({ actionType, sectionId }) => {
        runGuidedRecommendationAction(actionType, sectionId);
      },
      onResumeFlow: () => {
        resumeLastApostilaFlow();
      },
      onOpenItemSupport: async ({ itemId, context }) => {
        const normalizedItemId = itemId || null;
        const normalizedContext = context || "";
        const isSameTarget = state.ui.apostilaSupportItemId === normalizedItemId && state.ui.apostilaSupportContext === normalizedContext;

        if (isSameTarget) {
          state.ui.apostilaSupportItemId = null;
          state.ui.apostilaSupportContext = "";
          state.ui.apostilaStudySupportVisible = false;
          state.ui.apostilaExamSupportVisible = false;
          rerender();
          return;
        }

        state.ui.apostilaSupportItemId = normalizedItemId;
        state.ui.apostilaSupportContext = normalizedContext;
        if (context === "study") {
          state.ui.apostilaStudySupportVisible = true;
        }
        if (context === "exam") {
          state.ui.apostilaExamSupportVisible = true;
        }
        if (context === "reading") {
          state.ui.apostilaStudySupportVisible = false;
          state.ui.apostilaExamSupportVisible = false;
        }
        await registerApostilaMediaUsage(itemId, "opened");
        rerender();
      },
      onCloseItemSupport: ({ context }) => {
        state.ui.apostilaSupportItemId = null;
        state.ui.apostilaSupportContext = "";
        if (context === "study") {
          state.ui.apostilaStudySupportVisible = false;
        } else if (context === "exam") {
          state.ui.apostilaExamSupportVisible = false;
        } else {
          state.ui.apostilaStudySupportVisible = false;
          state.ui.apostilaExamSupportVisible = false;
        }
        rerender();
      },
      onTrackItemSupportUsage: async ({ itemId, markerType }) => {
        await registerApostilaMediaUsage(itemId, markerType);
      },
    });
  }
}

function start() {
  setupTopUserMenu();
  mergeApostilaComProgresso();
  computeStudyInsights();
  computeMetrics();
  renderSessionBooting();

  observeAuthState(async (user) => {
    state.user = user;

    if (!user) {
      resetPrivateData();
      ensureRouterReady();
      return;
    }

    resetEditingForms();
    ensureRouterReady();
    bindRealtimeData(user);

    ensureDefaultPerfil(user).catch(() => {
      setRouteFeedback("perfil", "Não foi possível inicializar perfil padrão.", "error");
      rerender();
    });
  });

  initAnalyticsIfEnabled(false);
}

start();
