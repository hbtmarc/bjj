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
  storage,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
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

const state = {
  user: null,
  route: "/login",
  data: {
    perfil: null,
    treinos: [],
    progressoApostila: {},
    historicoGraduacoes: [],
    apostilaItemsComProgresso: [],
    apostilaSections,
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
      historicoGraduacoes: false,
    },
  },
  ui: {
    treinoEmEdicao: null,
    filtroTecnicaTexto: "",
    filtroTecnicaCategoria: "",
    filtroSomenteFavoritas: false,
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
const logoutButton = document.querySelector("#btn-logout");

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
    pesoCompeticao: "",
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
  const historicoRef = ref(db, `users/${user.uid}/historicoGraduacoes`);

  setLoading("perfil", true);
  setLoading("treinos", true);
  setLoading("progressoApostila", true);
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

  state.listeners = [stopPerfil, stopHistorico, stopTreinos, stopProgresso];
}

function resetPrivateData() {
  unbindAllListeners();
  state.data.perfil = null;
  state.data.treinos = [];
  state.data.progressoApostila = {};
  state.data.historicoGraduacoes = [];
  state.data.apostilaItemsComProgresso = [];
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
    historicoGraduacoes: false,
  };
  state.ui = {
    treinoEmEdicao: null,
    filtroTecnicaTexto: "",
    filtroTecnicaCategoria: "",
    filtroSomenteFavoritas: false,
    perfilSecaoAberta: null,
  };
  clearRouteFeedback("perfil");
  clearRouteFeedback("treinos");
  clearRouteFeedback("tecnicas");
  clearRouteFeedback("apostila");
}

function rerender() {
  renderRoute(state.route, state.user);
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

  const base = {
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

  try {
    if (payload.id) {
      const treinoRef = ref(db, `users/${state.user.uid}/treinos/${payload.id}`);
      await update(treinoRef, base);
      setRouteFeedback("treinos", "Treino atualizado com sucesso.", "success");
    } else {
      const treinosRef = ref(db, `users/${state.user.uid}/treinos`);
      const treinoRef = push(treinosRef);
      await set(treinoRef, {
        ...base,
        createdAt: serverTimestamp(),
        createdAtMs: now,
      });
      setRouteFeedback("treinos", "Treino registrado com sucesso.", "success");
    }

    state.ui.treinoEmEdicao = null;
  } catch {
    setRouteFeedback("treinos", "Erro ao salvar treino.", "error");
  }

  rerender();
}

async function deleteTreino(id) {
  if (!state.user || !id) {
    return;
  }

  try {
    const treinoRef = ref(db, `users/${state.user.uid}/treinos/${id}`);
    await set(treinoRef, null);
    setRouteFeedback("treinos", "Treino excluído com sucesso.", "success");

    if (state.ui.treinoEmEdicao?.id === id) {
      state.ui.treinoEmEdicao = null;
    }
  } catch {
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
  const historicoRef = ref(db, `users/${state.user.uid}/historicoGraduacoes`);

  try {
    const entryRef = push(historicoRef);
    await set(entryRef, {
      faixa: String(payload.faixa || ""),
      grau: String(payload.grau || ""),
      dataGrad: String(payload.dataGrad || ""),
      dataMs,
      observacoes: String(payload.observacoes || ""),
      createdAtMs: now,
    });
    state.ui.perfilSecaoAberta = "historico";
    setRouteFeedback("perfil", "Entrada de graduação adicionada.", "success");
  } catch {
    setRouteFeedback("perfil", "Erro ao salvar entrada de graduação.", "error");
  }

  rerender();
}

async function deleteGraduacaoHistorico(id) {
  if (!state.user || !id) {
    return;
  }

  try {
    const entryRef = ref(db, `users/${state.user.uid}/historicoGraduacoes/${id}`);
    await set(entryRef, null);
    state.ui.perfilSecaoAberta = "historico";
    setRouteFeedback("perfil", "Entrada removida do histórico.", "success");
  } catch {
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
  syncShellState({ route, user });

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

        try {
          const now = Date.now();
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
          setRouteFeedback("perfil", "Não foi possível salvar o perfil.", "error");
        }

        rerender();
      },
      onLogout: async () => {
        await logoutUser();
      },
      onAvatarUpload: async (file, onProgress) => {
        if (!state.user || !file) return;
        const uid = state.user.uid;
        const avatarRef = storageRef(storage, `avatars/${uid}/profile.jpg`);
        const uploadTask = uploadBytesResumable(avatarRef, file, { contentType: file.type || "image/jpeg" });
        const unsubscribe = uploadTask.on("state_changed", (snapshot) => {
          if (typeof onProgress === "function") {
            const pct = snapshot.totalBytes
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
            onProgress(pct);
          }
        });

        try {
          await uploadTask;
        } finally {
          unsubscribe();
        }

        const url = await getDownloadURL(uploadTask.snapshot.ref);
        const perfilRef = ref(db, `users/${uid}/perfil`);
        await update(perfilRef, { avatarUrl: url, updatedAt: serverTimestamp(), updatedAtMs: Date.now() });
        return url;
      },
      onAvatarRemove: async () => {
        if (!state.user) return;
        const uid = state.user.uid;
        const perfil = state.data.perfil || {};
        if (perfil.avatarUrl) {
          try {
            const oldRef = storageRef(storage, `avatars/${uid}/profile.jpg`);
            await deleteObject(oldRef);
          } catch { /* file may not exist, ignore */ }
        }
        const perfilRef = ref(db, `users/${uid}/perfil`);
        await update(perfilRef, { avatarUrl: "", updatedAt: serverTimestamp(), updatedAtMs: Date.now() });
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
      onSaveDetalhes: saveApostilaDetalhes,
    });
  }
}

function setupLogout() {
  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", async () => {
    await logoutUser();
  });
}

function start() {
  setupLogout();
  mergeApostilaComProgresso();
  computeMetrics();

  observeAuthState(async (user) => {
    state.user = user;

    if (!user) {
      resetPrivateData();
      router.refresh();
      return;
    }

    try {
      await ensureDefaultPerfil(user);
    } catch {
      setRouteFeedback("perfil", "Não foi possível inicializar perfil padrão.", "error");
    }

    resetEditingForms();
    bindRealtimeData(user);
    router.refresh();
  });

  router.start();
  initAnalyticsIfEnabled(false);
}

start();
