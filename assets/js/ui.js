/* ── Inline SVG icon system ─────────────────────────────────── */
const ICONS = {
  edit: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 1.5l3 3L5 14H2v-3z"/><path d="M9.5 3.5l3 3"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10M3 8h10"/></svg>',
  save: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.33 14H2.67A1.33 1.33 0 011.33 12.67V3.33A1.33 1.33 0 012.67 2h8l3.33 3.33v7.34A1.33 1.33 0 0112.67 14z"/><path d="M11.33 14V8.67H4.67V14"/><path d="M4.67 2v3.33h5.33"/></svg>',
  logout: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14H3.33A1.33 1.33 0 012 12.67V3.33A1.33 1.33 0 013.33 2H6"/><path d="M10.67 11.33L14 8l-3.33-3.33"/><path d="M14 8H6"/></svg>',
  cancel: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4L4 12M4 4l8 8"/></svg>',
  login: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14h2.67A1.33 1.33 0 0014 12.67V3.33A1.33 1.33 0 0012.67 2H10"/><path d="M5.33 11.33L2 8l3.33-3.33"/><path d="M2 8h8"/></svg>',
  camera: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.33 5.33A1.33 1.33 0 012.67 4h1.66L5.67 2.67h4.66L11.67 4h1.66a1.33 1.33 0 011.34 1.33v6.67a1.33 1.33 0 01-1.34 1.33H2.67a1.33 1.33 0 01-1.34-1.33V5.33z"/><circle cx="8" cy="8" r="2.33"/></svg>',
  removeImg: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.33" y="2.67" width="13.33" height="10.67" rx="1.33"/><path d="M5.67 6.33l4.66 4.67M10.33 6.33L5.67 11"/></svg>',
};

function iconBtn(icon, label, { cls = "icon-btn", extra = "" } = {}) {
  return `<button class="${cls}" type="button" aria-label="${label}" title="${label}" ${extra}>${ICONS[icon] || ""}</button>`;
}
function iconSubmit(icon, label, { cls = "icon-btn primary-icon-btn", extra = "" } = {}) {
  return `<button class="${cls}" type="submit" aria-label="${label}" title="${label}" ${extra}>${ICONS[icon] || ""}<span class="icon-btn-label">${label}</span></button>`;
}

function card(content) {
  return `<section class="card">${content}</section>`;
}

function formMessage(flash) {
  if (!flash?.text) {
    return "";
  }
  return `<p class="message ${flash.type || "success"}">${flash.text}</p>`;
}

function formatDateFromMs(dateMs) {
  if (!dateMs) {
    return "-";
  }

  const date = new Date(Number(dateMs));
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR");
}

function compareByOrdem(left, right) {
  if ((left.ordemSecao || 0) !== (right.ordemSecao || 0)) {
    return (left.ordemSecao || 0) - (right.ordemSecao || 0);
  }
  return (left.ordemItem || 0) - (right.ordemItem || 0);
}

function renderDashboard(user, dataState) {
  const metrics = dataState.metrics;
  const perfil = dataState.perfil || {};
  const displayName = perfil.nomeCompleto || perfil.nome || user?.email?.split("@")[0] || "atleta";
  const faixaAtual = perfil.faixaAtual || perfil.faixa || "";
  const meta = perfil.objetivoPrincipal || "";
  const treinosAlvo = Number(perfil.frequenciaSemanalDesejada) || 0;

  if (dataState.loading.treinos || dataState.loading.progressoApostila) {
    return card(`<p class="page-subtitle">Carregando dados do dashboard...</p>`);
  }

  // Derive current belt from history (fallback to manual perfil fields)
  const historicoSorted = [...(dataState.historicoGraduacoes || [])].sort((a, b) => (b.dataMs || 0) - (a.dataMs || 0));
  const latestGrad = historicoSorted[0] || null;
  const faixaAtualEff = latestGrad?.faixa || faixaAtual;
  const grauVal = latestGrad ? String(latestGrad.grau ?? "") : String(perfil.grauAtual ?? "");
  const grauLabel = grauVal === "0" ? "" : grauVal ? `${grauVal}° grau` : "";
  const faixaCompleta = [faixaAtualEff, grauLabel].filter(Boolean).join(" • ") || "—";
  const professor = perfil.professor || "";
  const profFaixa = perfil.professorFaixa || "";
  const profGrauVal = String(perfil.professorGrau ?? "");
  const profGrauLabel = profGrauVal === "0" ? "" : profGrauVal ? `${profGrauVal}° grau` : "";
  const profParts = [professor, profFaixa ? `Faixa ${profFaixa}` : "", profGrauLabel].filter(Boolean);
  const profLabel = profParts.length ? profParts.join(" • ") : null;
  const catLabel = perfil.categoriaDePeso || null;
  const gradInfo = computeGradProgress(dataState.historicoGraduacoes, perfil.proximaMetaGraduacao);
  const beltColor = BELT_COLORS[faixaAtualEff] || BELT_COLORS._default;
  const hasContext = Boolean(faixaAtualEff || professor || meta || catLabel || treinosAlvo || gradInfo);

  const ctxChips = [
    faixaAtualEff ? `<span class="chip">Faixa ${faixaAtualEff}</span>` : "",
    meta ? `<span class="chip">${meta}</span>` : "",
  ].filter(Boolean).join("");

  return card(`
    <h2 class="page-title">Dashboard</h2>
    <p class="page-subtitle">Olá, <strong>${displayName}</strong>!${ctxChips ? ` <span class="chip-line dash-greeting-chips">${ctxChips}</span>` : " Aqui está seu progresso real."}</p>

    <section class="stats-grid">
      <article class="stat-item">
        <h3>Treinos nos últimos 7 dias</h3>
        <strong>${metrics.treinos7d}${treinosAlvo ? ` / ${treinosAlvo}` : ""}</strong>
      </article>
      <article class="stat-item">
        <h3>Treinos nos últimos 30 dias</h3>
        <strong>${metrics.treinos30d}</strong>
      </article>
      <article class="stat-item">
        <h3>Média da nota (últimas 5)</h3>
        <strong>${metrics.mediaUltimas5}</strong>
      </article>
      <article class="stat-item">
        <h3>Técnicas mais praticadas</h3>
        <strong>${metrics.tecnicasMaisPraticadas.length}</strong>
      </article>
      <article class="stat-item">
        <h3>Total de itens da apostila</h3>
        <strong>${metrics.totalItensApostila}</strong>
      </article>
      <article class="stat-item">
        <h3>Itens favoritados</h3>
        <strong>${metrics.itensFavoritados}</strong>
      </article>
      <article class="stat-item">
        <h3>Itens concluídos</h3>
        <strong>${metrics.itensConcluidos}</strong>
      </article>
      <article class="stat-item">
        <h3>Confiança média</h3>
        <strong>${metrics.confiancaMedia}</strong>
      </article>
    </section>

    ${hasContext ? `
    <section class="dash-athlete-context">
      <h3 class="section-title">Contexto do atleta</h3>
      <div class="stats-grid">
        <article class="stat-item">
          <h3>Faixa atual</h3>
          <strong>${faixaCompleta}</strong>
          ${latestGrad ? '<span class="muted-text" style="font-size:0.78rem;font-weight:400">Derivado do histórico</span>' : ''}
        </article>
        ${profLabel ? `<article class="stat-item"><h3>Professor</h3><strong>${profLabel}</strong></article>` : ""}
        ${meta ? `<article class="stat-item"><h3>Objetivo</h3><strong>${meta}</strong></article>` : ""}
        ${catLabel ? `<article class="stat-item"><h3>Categoria de peso</h3><strong>${catLabel}</strong></article>` : ""}
        ${treinosAlvo ? `<article class="stat-item"><h3>Meta semanal</h3><strong>${treinosAlvo} treinos/sem.</strong></article>` : ""}
      </div>
      ${gradInfo ? `
      <div class="dash-grad-progress">
        <p class="dash-grad-label">${gradInfo.isOverdue
          ? "Meta de graduação ultrapassada."
          : `Progressão até a próxima faixa: ${gradInfo.pct}%${gradInfo.monthsLeft > 0 ? ` — faltam ${gradInfo.monthsLeft} ${gradInfo.monthsLeft === 1 ? "mês" : "meses"}` : " — objetivo próximo!"}`
        }</p>
        <div class="grad-progress-wrap" role="progressbar" aria-valuenow="${gradInfo.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progressão para próxima graduação">
          <div class="grad-progress-bar" style="width:${gradInfo.pct}%;background:${beltColor.bar}"></div>
        </div>
      </div>
      ` : ""}
    </section>
    ` : ""}

    <div class="split-grid">
      <section>
        <h3 class="section-title">Últimos 3 treinos</h3>
        ${metrics.ultimosTreinos.length === 0
          ? "<p class=\"empty-state\">Você ainda não registrou treinos.</p>"
          : `<ul class="simple-list">${metrics.ultimosTreinos
              .map(
                (item) => `<li><strong>${formatDateFromMs(item.dataMs)}</strong> — ${item.tipoTreino} (${item.duracaoMin} min)</li>`
              )
              .join("")}</ul>`}
      </section>

      <section>
        <h3 class="section-title">Técnicas mais praticadas</h3>
        ${metrics.tecnicasMaisPraticadas.length === 0
          ? "<p class=\"empty-state\">Sem práticas vinculadas até o momento.</p>"
          : `<ul class="simple-list">${metrics.tecnicasMaisPraticadas
              .map((item) => `<li><strong>${item.nome}</strong> — ${item.total} prática(s)</li>`)
              .join("")}</ul>`}
      </section>
    </div>
  `);
}

const CATEGORIAS_PESO = [
  { valor: "Galo",         label: "Galo (≤ 57,5 kg)" },
  { valor: "Pluma",        label: "Pluma (≤ 64 kg)" },
  { valor: "Pena",         label: "Pena (≤ 70 kg)" },
  { valor: "Leve",         label: "Leve (≤ 76 kg)" },
  { valor: "Meio-leve",    label: "Meio-leve (≤ 82,3 kg)" },
  { valor: "Médio",        label: "Médio (≤ 88,3 kg)" },
  { valor: "Meio-pesado",  label: "Meio-pesado (≤ 94,3 kg)" },
  { valor: "Pesado",       label: "Pesado (≤ 100,5 kg)" },
  { valor: "Super-pesado", label: "Super-pesado (+ 100,5 kg)" },
  { valor: "Pesadíssimo",  label: "Pesadíssimo (Aberto)" },
];

const FAIXAS_LIST = ["Branca","Cinza","Amarela","Laranja","Verde","Azul","Roxa","Marrom","Preta"];
const ADULT_BELT_PATH = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];
const YOUTH_BELT_PATH = ["Branca", "Cinza", "Amarela", "Laranja", "Verde", "Azul", "Roxa", "Marrom", "Preta"];

// Belt color palette — add future faixas here
const BELT_COLORS = {
  Branca:  { bg: "#ffffff", fg: "#555",    border: "#d1d5db", accent: "#374151", bar: "linear-gradient(90deg,#e5e7eb,#9ca3af)",  cardFrom: "#f9fafb", cardTo: "#f3f4f6" },
  Cinza:   { bg: "#9ca3af", fg: "#fff",    border: "#6b7280", accent: "#374151", bar: "linear-gradient(90deg,#d1d5db,#6b7280)",  cardFrom: "#f3f4f6", cardTo: "#e5e7eb" },
  Amarela: { bg: "#fbbf24", fg: "#333",    border: "#f59e0b", accent: "#92400e", bar: "linear-gradient(90deg,#fef3c7,#f59e0b)",  cardFrom: "#fffbeb", cardTo: "#fef3c7" },
  Laranja: { bg: "#f97316", fg: "#fff",    border: "#ea580c", accent: "#9a3412", bar: "linear-gradient(90deg,#ffedd5,#ea580c)",  cardFrom: "#fff7ed", cardTo: "#ffedd5" },
  Verde:   { bg: "#22c55e", fg: "#fff",    border: "#16a34a", accent: "#14532d", bar: "linear-gradient(90deg,#dcfce7,#16a34a)",  cardFrom: "#f0fdf4", cardTo: "#dcfce7" },
  Azul:    { bg: "#3b82f6", fg: "#fff",    border: "#2563eb", accent: "#1d4ed8", bar: "linear-gradient(90deg,#dbeafe,#2563eb)",  cardFrom: "#eff6ff", cardTo: "#dbeafe" },
  Roxa:    { bg: "#7c3aed", fg: "#fff",    border: "#6d28d9", accent: "#4c1d95", bar: "linear-gradient(90deg,#ede9fe,#6d28d9)",  cardFrom: "#f5f3ff", cardTo: "#ede9fe" },
  Marrom:  { bg: "#92400e", fg: "#fff",    border: "#78350f", accent: "#451a03", bar: "linear-gradient(90deg,#fde68a,#78350f)",  cardFrom: "#fef3c7", cardTo: "#fde68a" },
  Preta:   { bg: "#1f2937", fg: "#f9fafb", border: "#111827", accent: "#030712", bar: "linear-gradient(90deg,#e5e7eb,#111827)",  cardFrom: "#f3f4f6", cardTo: "#d1d5db" },
  _default:{ bg: "#6366f1", fg: "#fff",    border: "#4f46e5", accent: "#3730a3", bar: "linear-gradient(90deg,#e0e7ff,#4f46e5)",  cardFrom: "#f0f4ff", cardTo: "#eef2fb" },
};

/**
 * Builds a multi-stop CSS gradient spanning all 9 belt colors in order.
 * direction: CSS angle string, e.g. "90deg" (horizontal) or "180deg" (vertical)
 */
function buildBeltOrderGradient(direction = "90deg", beltPath = FAIXAS_LIST) {
  const path = beltPath?.length ? beltPath : FAIXAS_LIST;
  const n = Math.max(1, path.length - 1);
  const stops = path.map((f, i) => `${BELT_COLORS[f]?.bg || "#ccc"} ${Math.round((i / n) * 100)}%`);
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}

function parseDateOnlyToMs(dateIso) {
  if (!dateIso) return 0;
  const parsed = new Date(`${dateIso}T12:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getIdadeAtual(dataNascimento) {
  const birthMs = parseDateOnlyToMs(dataNascimento);
  if (!birthMs) return null;
  const birth = new Date(birthMs);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function getBeltPathByAge(idadeAtual) {
  if (typeof idadeAtual === "number" && idadeAtual < 18) {
    return YOUTH_BELT_PATH;
  }
  return ADULT_BELT_PATH;
}

function ensurePathContainsFaixa(path, faixa) {
  if (!faixa) return [...path];
  if (path.includes(faixa)) return [...path];
  return [...path, faixa];
}

function getNextFaixaFromPath(path, faixaAtual) {
  const idx = path.indexOf(faixaAtual);
  if (idx < 0 || idx >= path.length - 1) return "";
  return path[idx + 1];
}

function buildPathSegmentGradient(path, fromFaixa, toFaixa, direction = "90deg") {
  if (!fromFaixa) return buildBeltOrderGradient(direction, path);
  const fromIdx = path.indexOf(fromFaixa);
  if (fromIdx < 0) return buildBeltOrderGradient(direction, path);
  const toIdx = toFaixa ? path.indexOf(toFaixa) : -1;
  const sliceEnd = toIdx > fromIdx ? toIdx : fromIdx;
  const segment = path.slice(fromIdx, sliceEnd + 1);
  if (segment.length <= 1) {
    const single = BELT_COLORS[fromFaixa]?.bg || BELT_COLORS._default.bg;
    return `linear-gradient(${direction}, ${single} 0%, ${single} 100%)`;
  }
  return buildBeltOrderGradient(direction, segment);
}

/**
 * Faixa-cycle bar: 0-80% solid current belt, 80-100% gradient current→next.
 */
function buildFaixaCycleGradient(faixaAtual, nextFaixa, direction = "90deg") {
  const curBg = (BELT_COLORS[faixaAtual] || BELT_COLORS._default).bg;
  const nxtBg = nextFaixa ? (BELT_COLORS[nextFaixa] || BELT_COLORS._default).bg : curBg;
  return `linear-gradient(${direction}, ${curBg} 0%, ${curBg} 80%, ${nxtBg} 100%)`;
}

/**
 * Stepped vertical gradient for the timeline: one color block per history entry.
 * Historico is sorted newest-first (top→bottom in the UI).
 */
function buildTimelineBlockGradient(historico) {
  if (!historico || !historico.length) return "transparent";
  const n = historico.length;
  const stops = [];
  historico.forEach((entry, i) => {
    const bg = (BELT_COLORS[entry.faixa] || BELT_COLORS._default).bg;
    const s = ((i / n) * 100).toFixed(1);
    const e = (((i + 1) / n) * 100).toFixed(1);
    stops.push(`${bg} ${s}%`, `${bg} ${e}%`);
  });
  return `linear-gradient(180deg, ${stops.join(", ")})`;
}

function getHistoricoDateMs(entry) {
  return Number(entry?.dataMs) || parseDateOnlyToMs(entry?.dataGrad);
}

/**
 * Formats a day count into a human-readable PT-BR duration string.
 * < 30 d  → "18 dias treinando"
 * 1-11 m  → "253 dias treinando (8 meses)"
 * ≥ 12 m  → "428 dias treinando (1 ano e 2 meses)"
 * Returns { main, detail, html } where html wraps detail in <span class="training-duration-detail">.
 */
function formatTrainingDuration(days) {
  if (!days || days < 1) return null;
  const dLabel = `${days} ${days === 1 ? "dia" : "dias"} treinando`;
  const totalMonths = Math.floor(days / 30.44);
  if (totalMonths < 1) return { main: dLabel, detail: "", html: dLabel };
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  let parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  const detail = parts.join(" e ");
  const html = `${dLabel} <span class="training-duration-detail">(${detail})</span>`;
  return { main: dLabel, detail: `(${detail})`, html };
}

function computeTrainingDays(historicoGraduacoes) {
  const validDatesAsc = [...(historicoGraduacoes || [])]
    .map((entry) => getHistoricoDateMs(entry))
    .filter((ms) => ms > 0)
    .sort((a, b) => a - b);

  if (!validDatesAsc.length) return null;

  const earliestMs = validDatesAsc[0];
  const currentFaixaStartMs = validDatesAsc[validDatesAsc.length - 1];
  const startMs = earliestMs || currentFaixaStartMs;
  if (!startMs) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.floor((Date.now() - startMs) / dayMs));
  return { days, startMs };
}

/**
 * Derives graduation progress from the history array (single source of truth).
 * Falls back to auto-estimated timelines when no target date is set.
 */
function computeGradProgress(historicoGraduacoes, proximaMetaGraduacao) {
  const sorted = [...(historicoGraduacoes || [])].sort((a, b) => (b.dataMs || 0) - (a.dataMs || 0));
  if (!sorted.length) return null;

  const latest = sorted[0];
  const startMs = getHistoricoDateMs(latest);
  if (!startMs) return null;

  let endMs = proximaMetaGraduacao ? new Date(proximaMetaGraduacao).getTime() : 0;
  if (!endMs || endMs <= startMs) {
    // Auto-estimate months to next graduation per faixa
    const autoMonths = {
      Branca: 6, Cinza: 6, Amarela: 8, Laranja: 8, Verde: 10,
      Azul: 14, Roxa: 20, Marrom: 24, Preta: 36,
    };
    const months = autoMonths[latest.faixa] || 12;
    endMs = startMs + Math.round(months * 30.44 * 24 * 60 * 60 * 1000);
  }

  const now = Date.now();
  if (endMs <= startMs) return null;

  const pct = Math.min(100, Math.max(0, Math.round(((now - startMs) / (endMs - startMs)) * 100)));
  const msLeft = endMs - now;
  const monthsLeft = Math.max(0, Math.round(msLeft / (30.44 * 24 * 60 * 60 * 1000)));
  const grauVal = String(latest.grau ?? "");
  const grauLabel = grauVal === "0" ? "" : grauVal ? `${grauVal}° grau` : "";

  return {
    pct,
    monthsLeft,
    isOverdue: now > endMs,
    faixa: latest.faixa || "",
    grauLabel,
    targetDate: new Date(endMs).toLocaleDateString("pt-BR"),
  };
}

function renderPerfil(dataState, feedback, user, uiState) {
  const perfil = dataState.perfil || {};
  const isLoading = dataState.loading.perfil;
  const secaoAberta = uiState?.perfilSecaoAberta ?? null;
  const historico = [...(dataState.historicoGraduacoes || [])].sort((a, b) => (b.dataMs || 0) - (a.dataMs || 0));
  // single source of truth: latest history entry

  if (isLoading && !perfil.nomeCompleto && !perfil.nome) {
    return card(`
      <h2 class="page-title">Perfil</h2>
      <p class="page-subtitle">Carregando perfil...</p>
    `);
  }

  const displayName = perfil.nomeCompleto || perfil.nome || "";
  const initials = displayName.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  // Derive current belt from history; fall back to manual perfil fields
  const latestGrad = historico[0] || null;
  const faixaAtual = latestGrad?.faixa || perfil.faixaAtual || perfil.faixa || "";
  const grauAtualVal = latestGrad ? String(latestGrad.grau ?? "") : String(perfil.grauAtual ?? "");
  const grauAtualNum = Math.max(0, Number(grauAtualVal) || 0);
  const grauAtualLabel = grauAtualVal === "0" ? "" : grauAtualVal ? `${grauAtualVal}° grau` : "";
  const faixaChip = [faixaAtual, grauAtualLabel].filter(Boolean).join(" · ") || "—";
  const beltColor = BELT_COLORS[faixaAtual] || BELT_COLORS._default;
  const idadeAtual = getIdadeAtual(perfil.dataNascimento);
  const beltPathBase = getBeltPathByAge(idadeAtual);
  const beltPath = ensurePathContainsFaixa(beltPathBase, faixaAtual);
  const nextFaixa = getNextFaixaFromPath(beltPath, faixaAtual);
  const faixaCycleGradH = buildFaixaCycleGradient(faixaAtual, nextFaixa, "90deg");
  const tlBlockGrad = buildTimelineBlockGradient(historico);
  const grauPct = Math.min(80, grauAtualNum * 20);
  const trainingInfo = computeTrainingDays(historico);
  const durationFmt = trainingInfo ? formatTrainingDuration(trainingInfo.days) : null;
  const diasTreinandoLabel = durationFmt ? durationFmt.html : "—";

  const profFaixa = perfil.professorFaixa || "";
  const profLine = [perfil.professor].filter(Boolean).join(" - ");
  const acadProfParts = [];
  if (perfil.academia) acadProfParts.push(perfil.academia);
  if (profLine) acadProfParts.push(`Prof. ${profLine}`);
  const acadProfLine = acadProfParts.join(' <span class="perfil-sep" aria-hidden="true">•</span> ');
  const ageTierLabel = typeof idadeAtual === "number" ? (idadeAtual < 18 ? "Juvenil" : "Adulto") : "n/i";
  const ageMiniLabel = typeof idadeAtual === "number" ? `${idadeAtual}a · ${ageTierLabel}` : `idade n/i · ${ageTierLabel}`;

  const emailValue = user?.email || "";
  const gradInfo = computeGradProgress(historico, perfil.proximaMetaGraduacao);

  const faixaOptionsList = ensurePathContainsFaixa(beltPath, perfil.faixaAtual || perfil.faixa || "");
  const faixaOptions = faixaOptionsList
    .map((f) => `<option value="${f}" ${(perfil.faixaAtual || perfil.faixa || "") === f ? "selected" : ""}>${f}</option>`)
    .join("");

  const faixaOptProf = FAIXAS_LIST
    .map((f) => `<option value="${f}" ${profFaixa === f ? "selected" : ""}>${f}</option>`)
    .join("");

  const grauOptions = [0,1,2,3,4]
    .map((g) => `<option value="${g}" ${String(perfil.grauAtual) === String(g) ? "selected" : ""}>${g === 0 ? "Sem grau" : g + "° grau"}</option>`)
    .join("");

  const grauOptProf = [0,1,2,3,4]
    .map((g) => `<option value="${g}" ${String(perfil.professorGrau) === String(g) ? "selected" : ""}>${g === 0 ? "Sem grau" : g + "° grau"}</option>`)
    .join("");

  const categoriaOptions = CATEGORIAS_PESO
    .map(({ valor, label }) => `<option value="${valor}" ${perfil.categoriaDePeso === valor ? "selected" : ""}>${label}</option>`)
    .join("");

  const objetivoOptions = ["Competir","Defesa pessoal","Saúde e condicionamento","Aprendizado técnico","Socialização"]
    .map((o) => `<option value="${o}" ${perfil.objetivoPrincipal === o ? "selected" : ""}>${o}</option>`)
    .join("");

  const grauDots = Array.from({ length: 4 }, (_, i) => {
    const pos = (i + 1) * 20;
    const earned = i < grauAtualNum;
    const cls = earned ? "perfil-belt-grau-dot" : "perfil-belt-grau-dot perfil-belt-grau-dot--future";
    return `<span class="${cls}" style="left:${pos}%" aria-hidden="true"></span>`;
  }).join("");

  // ── Featured header belt progression ─────────────────────────
  const headerGradBar = gradInfo ? `
    <div class="perfil-belt-prog">
      <div class="perfil-belt-prog-labels">
        <span class="perfil-belt-prog-from" style="color:${beltColor.accent}">${faixaAtual || "—"}</span>
        <span class="perfil-belt-prog-pct">${grauPct}% <small style="font-weight:400;font-size:0.72rem;color:var(--muted)">${grauAtualNum}/4 graus</small></span>
        ${nextFaixa ? `<span class="perfil-belt-prog-to" style="color:${(BELT_COLORS[nextFaixa]||BELT_COLORS._default).accent}">${nextFaixa}</span>` : `<span class="perfil-belt-prog-to">—</span>`}
      </div>
      <div class="perfil-belt-prog-wrap">
        <div class="perfil-belt-prog-track" role="progressbar"
            aria-valuenow="${grauPct}" aria-valuemin="0" aria-valuemax="100"
            aria-label="Progressão para próxima faixa"
            style="background:${faixaCycleGradH}">
          <div class="perfil-belt-prog-dim" style="left:${grauPct}%"></div>
          ${grauDots}
        </div>
        <div class="perfil-belt-prog-marker" style="left:${grauPct}%;border-color:${beltColor.border}"></div>
      </div>
      <p class="perfil-belt-prog-sub">${gradInfo.isOverdue
        ? "Meta ultrapassada"
        : gradInfo.monthsLeft === 0 ? "Objetivo próximo!"
        : `Faltam ${gradInfo.monthsLeft} ${gradInfo.monthsLeft === 1 ? "mês" : "meses"}`
      }</p>
      <p class="perfil-belt-prog-days">${diasTreinandoLabel}</p>
    </div>
  ` : "";

  // ── Timeline items ────────────────────────────────────────────
  const timelineItems = historico.map((entry) => {
    const eGrau = String(entry.grau ?? "");
    const eGrauLabel = eGrau === "0" ? "" : eGrau ? `${eGrau}° grau` : "";
    const eDate = entry.dataGrad ? new Date(entry.dataGrad + "T12:00:00").toLocaleDateString("pt-BR") : "—";
    const eBelt = BELT_COLORS[entry.faixa] || BELT_COLORS._default;
    const isPathFaixa = beltPath.includes(entry.faixa);
    const eDotBg = isPathFaixa ? eBelt.bg : "#cbd5e1";
    const eDotBorder = isPathFaixa ? eBelt.border : "#94a3b8";
    const eAccent = isPathFaixa ? eBelt.accent : "#475569";
    const faixaOptEditList = ensurePathContainsFaixa(beltPath, entry.faixa);
    const faixaOptEdit = faixaOptEditList.map((f) => `<option value="${f}" ${entry.faixa === f ? "selected" : ""}>${f}</option>`).join("");
    const grauOptEdit = [0,1,2,3,4].map((g) => `<option value="${g}" ${String(entry.grau) === String(g) ? "selected" : ""}>${g === 0 ? "Sem grau" : g + "° grau"}</option>`).join("");
    const eGrauNum = Math.max(0, Number(entry.grau) || 0);
    const innerDots = eGrauNum > 0
      ? `<span class="grad-tl-grau-dots" aria-label="${eGrauNum} grau${eGrauNum > 1 ? 's' : ''}">${Array.from({ length: eGrauNum }, () => '<span class="grad-tl-inner-dot"></span>').join('')}</span>`
      : '';
    return `
      <li class="grad-tl-item" style="--tl-belt-bg:${eDotBg};--tl-belt-border:${eDotBorder}">
        <div class="grad-tl-dot" aria-hidden="true">${innerDots}</div>
        <div class="grad-tl-body">
          <div class="grad-tl-row">
            <div class="grad-tl-info">
              <strong class="grad-tl-belt" style="color:${eAccent}">${entry.faixa || "—"}${eGrauLabel ? ` · ${eGrauLabel}` : ""}</strong>
              <span class="grad-tl-date">${eDate}</span>
              ${entry.observacoes ? `<p class="grad-tl-obs">${entry.observacoes}</p>` : ""}
            </div>
            <div class="grad-tl-actions">
              ${iconBtn('edit', 'Editar', { cls: 'icon-btn btn-edit-grad', extra: `data-grad-id="${entry.id}"` })}
              ${iconBtn('trash', 'Remover', { cls: 'icon-btn danger-icon-btn btn-del-grad', extra: `data-grad-id="${entry.id}"` })}
            </div>
          </div>
          <form class="grad-tl-edit-form form-grid is-hidden" data-grad-id="${entry.id}" novalidate>
            <label class="input-label" for="egh-faixa-${entry.id}">Faixa</label>
            <select class="text-input" id="egh-faixa-${entry.id}" name="faixaEdit" required>
              <option value="">— selecione —</option>${faixaOptEdit}
            </select>
            <label class="input-label" for="egh-grau-${entry.id}">Grau</label>
            <select class="text-input" id="egh-grau-${entry.id}" name="grauEdit">
              <option value="">— selecione —</option>${grauOptEdit}
            </select>
            <label class="input-label" for="egh-data-${entry.id}">Data</label>
            <input class="text-input" id="egh-data-${entry.id}" name="dataGradEdit" type="date" value="${entry.dataGrad || ""}" required />
            <label class="input-label" for="egh-obs-${entry.id}">Observações</label>
            <textarea class="text-input text-area compact-area" id="egh-obs-${entry.id}" name="obsEdit">${entry.observacoes || ""}</textarea>
            <div class="perfil-section-save">
              ${iconSubmit('save', 'Salvar alterações')}
            </div>
          </form>
        </div>
      </li>`;
  }).join("");

  return card(`
    <h2 class="page-title">Perfil</h2>
    ${formMessage(feedback)}

    <!-- ── Athlete card header ──────────────────────────────── -->
    <header class="perfil-athlete-card">
      <div class="perfil-avatar-col">
        <label class="perfil-avatar-label" for="perfil-avatar-input" title="Alterar foto de perfil">
          <div class="perfil-avatar" id="perfil-avatar-wrap" style="border-color:${beltColor.border}">
            <img class="perfil-avatar-img ${perfil.avatarUrl ? '' : 'is-hidden'}" id="perfil-avatar-preview"
              src="${perfil.avatarUrl || ''}" alt="Foto do atleta"
              onerror="this.classList.add('is-hidden');this.nextElementSibling.classList.remove('is-hidden')" />
            <span class="perfil-avatar-initials ${perfil.avatarUrl ? 'is-hidden' : ''}" id="perfil-avatar-initials"
              style="background:${beltColor.bg};color:${beltColor.fg}">${initials}</span>
          </div>
          <input id="perfil-avatar-input" type="file" accept="image/*" class="sr-only" />
        </label>
        <span class="perfil-avatar-hint" id="perfil-avatar-hint">Alterar foto</span>
        <span class="perfil-avatar-uploading is-hidden" id="perfil-avatar-uploading">Enviando…</span>
        <span class="perfil-avatar-status is-hidden" id="perfil-avatar-status" role="status" aria-live="polite"></span>
        <button id="btn-remove-avatar" class="icon-btn danger-icon-btn perfil-remove-avatar ${perfil.avatarUrl ? '' : 'is-hidden'}" type="button" aria-label="Remover foto" title="Remover foto">${ICONS.removeImg}</button>
      </div>

      <div class="perfil-athlete-info">
        <div class="perfil-summary-top">
          <div class="perfil-summary-identity">
            ${perfil.apelido
              ? `<div class="perfil-primary-row">
                   <p class="perfil-display-name">${perfil.apelido}</p>
                   <span class="perfil-age-mini">${ageMiniLabel}</span>
                 </div>
                 <p class="perfil-secondary-name">${displayName}</p>
                 ${acadProfLine ? `<p class="perfil-acad-prof">${acadProfLine}</p>` : ""}`
              : `<div class="perfil-primary-row">
                   <p class="perfil-display-name">${displayName || '<em class="muted-text">Nome não definido</em>'}</p>
                   <span class="perfil-age-mini">${ageMiniLabel}</span>
                 </div>
                 ${acadProfLine ? `<p class="perfil-acad-prof">${acadProfLine}</p>` : ""}`
            }
          </div>
          <div class="perfil-summary-pill-col">
            <p class="perfil-faixa-badge">
              <span class="perfil-faixa-pill" style="background:${beltColor.bg};color:${beltColor.fg};border:1.5px solid ${beltColor.border};box-shadow:0 1px 3px ${beltColor.bg}66">${faixaChip}</span>
            </p>

            ${(perfil.objetivoPrincipal || perfil.categoriaDePeso || perfil.frequenciaSemanalDesejada) ? `
            <div class="perfil-chip-strip">
              ${perfil.objetivoPrincipal ? `<span class="chip">${perfil.objetivoPrincipal}</span>` : ""}
              ${perfil.categoriaDePeso ? `<span class="chip">${perfil.categoriaDePeso}</span>` : ""}
              ${perfil.frequenciaSemanalDesejada ? `<span class="chip">${perfil.frequenciaSemanalDesejada}×/sem.</span>` : ""}
            </div>` : ""}
          </div>
        </div>

        ${headerGradBar}
      </div>
    </header>

    <!-- ── Editable sections (inside form) ─────────────────── -->
    <form id="form-perfil" novalidate>
      <p id="perfil-dirty-hint" class="perfil-dirty-hint is-hidden" role="status" aria-live="polite">Há alterações não salvas nesta seção.</p>

      <details class="perfil-section" data-secao="identidade" ${secaoAberta === "identidade" ? "open" : ""}>
        <summary class="perfil-section-title">Identidade do atleta</summary>
        <div class="perfil-section-body form-grid">
          <label class="input-label" for="pf-nomeCompleto">Nome completo</label>
          <input class="text-input" id="pf-nomeCompleto" name="nomeCompleto" type="text" autocomplete="name"
            value="${perfil.nomeCompleto || perfil.nome || ""}" required />

          <label class="input-label" for="pf-apelido">Apelido</label>
          <input class="text-input" id="pf-apelido" name="apelido" type="text" autocomplete="nickname"
            value="${perfil.apelido || ""}" />

          <label class="input-label" for="pf-email">E-mail (não editável)</label>
          <input class="text-input perfil-readonly" id="pf-email" type="email" autocomplete="email"
            value="${emailValue}" readonly aria-readonly="true" tabindex="-1" />

          <label class="input-label" for="pf-dataNascimento">Data de nascimento</label>
          <input class="text-input" id="pf-dataNascimento" name="dataNascimento" type="date" autocomplete="bday"
            value="${perfil.dataNascimento || ""}" />

          <label class="input-label" for="pf-cidadeUF">Cidade / UF</label>
          <input class="text-input" id="pf-cidadeUF" name="cidadeUF" type="text" autocomplete="address-level2"
            value="${perfil.cidadeUF || ""}" placeholder="Ex: São Paulo, SP" />

          <label class="input-label" for="pf-academia">Academia</label>
          <input class="text-input" id="pf-academia" name="academia" type="text" autocomplete="organization"
            value="${perfil.academia || ""}" />

          <label class="input-label" for="pf-professor">Professor</label>
          <input class="text-input" id="pf-professor" name="professor" type="text"
            value="${perfil.professor || ""}" />

          <label class="input-label" for="pf-profFaixa">Faixa do professor</label>
          <select class="text-input" id="pf-profFaixa" name="professorFaixa">
            <option value="">— selecione —</option>
            ${faixaOptProf}
          </select>

          <label class="input-label" for="pf-profGrau">Grau do professor</label>
          <select class="text-input" id="pf-profGrau" name="professorGrau">
            <option value="">— selecione —</option>
            ${grauOptProf}
          </select>

          <div class="perfil-section-save">
            <button class="primary-icon-btn" type="submit" name="secao" value="identidade">${ICONS.save}<span class="icon-btn-label">Salvar identidade</span></button>
          </div>
        </div>
      </details>

      <details class="perfil-section" data-secao="esportes" ${secaoAberta === "esportes" ? "open" : ""}>
        <summary class="perfil-section-title">Dados esportivos</summary>
        <div class="perfil-section-body form-grid">
          <label class="input-label" for="pf-faixaAtual">Faixa atual <span class="perfil-field-hint">(suplente ao histórico)</span></label>
          <select class="text-input" id="pf-faixaAtual" name="faixaAtual">
            <option value="">— selecione —</option>
            ${faixaOptions}
          </select>

          <label class="input-label" for="pf-grauAtual">Grau atual <span class="perfil-field-hint">(suplente ao histórico)</span></label>
          <select class="text-input" id="pf-grauAtual" name="grauAtual">
            <option value="">— selecione —</option>
            ${grauOptions}
          </select>

          <label class="input-label" for="pf-categoriaDePeso">Categoria de peso</label>
          <select class="text-input" id="pf-categoriaDePeso" name="categoriaDePeso">
            <option value="">— selecione —</option>
            ${categoriaOptions}
          </select>

          <label class="input-label" for="pf-pesoAtual">Peso atual (kg)</label>
          <input class="text-input" id="pf-pesoAtual" name="pesoAtual" type="number" min="30" max="250" step="0.1"
            value="${perfil.pesoAtual || ""}" />

          <label class="input-label" for="pf-pesoCompeticao">Peso de competição (kg)</label>
          <input class="text-input" id="pf-pesoCompeticao" name="pesoCompeticao" type="number" min="30" max="250" step="0.1"
            value="${perfil.pesoCompeticao || ""}" />

          <label class="input-label" for="pf-ladoDominante">Lado dominante</label>
          <select class="text-input" id="pf-ladoDominante" name="ladoDominante">
            <option value="">— selecione —</option>
            <option value="Destro" ${perfil.ladoDominante === "Destro" ? "selected" : ""}>Destro</option>
            <option value="Canhoto" ${perfil.ladoDominante === "Canhoto" ? "selected" : ""}>Canhoto</option>
          </select>

          <label class="input-label" for="pf-estiloPreferido">Estilo preferido</label>
          <input class="text-input" id="pf-estiloPreferido" name="estiloPreferido" type="text"
            value="${perfil.estiloPreferido || ""}" placeholder="Ex: Guard player, Passador…" />

          <label class="input-label" for="pf-frequencia">Frequência semanal desejada (treinos)</label>
          <input class="text-input" id="pf-frequencia" name="frequenciaSemanalDesejada" type="number"
            min="1" max="14" value="${perfil.frequenciaSemanalDesejada || ""}" />

          <label class="input-label" for="pf-objetivo">Objetivo principal</label>
          <select class="text-input" id="pf-objetivo" name="objetivoPrincipal">
            <option value="">— selecione —</option>
            ${objetivoOptions}
          </select>

          <label class="input-label" for="pf-proximaMeta">Meta de próxima graduação</label>
          <input class="text-input" id="pf-proximaMeta" name="proximaMetaGraduacao" type="date"
            value="${perfil.proximaMetaGraduacao || ""}" />

          <label class="input-label" for="pf-obsEvolucao">Observações de evolução</label>
          <textarea class="text-input text-area" id="pf-obsEvolucao" name="observacoesDeEvolucao">${perfil.observacoesDeEvolucao || ""}</textarea>

          <div class="perfil-section-save">
            <button class="primary-icon-btn" type="submit" name="secao" value="esportes">${ICONS.save}<span class="icon-btn-label">Salvar esportivos</span></button>
          </div>
        </div>
      </details>

      <details class="perfil-section" data-secao="preferencias" ${secaoAberta === "preferencias" ? "open" : ""}>
        <summary class="perfil-section-title">Preferências e conta</summary>
        <div class="perfil-section-body">
          <div class="toggle-list">
            <div class="toggle-row">
              <span class="toggle-label">
                <span class="toggle-label-main">Reduzir animações</span>
                <span class="toggle-label-sub">Desativa transições e efeitos de movimento</span>
              </span>
              <label class="toggle-switch" for="pref-animacoes">
                <input id="pref-animacoes" name="reduzirAnimacoes" type="checkbox" value="on" ${perfil.reduzirAnimacoes ? "checked" : ""} />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <div class="toggle-row">
              <span class="toggle-label">
                <span class="toggle-label-main">Perfil público</span>
                <span class="toggle-label-sub">Em breve — funcionalidade não disponível ainda</span>
              </span>
              <label class="toggle-switch" for="pref-publico">
                <input id="pref-publico" name="resumoPublico" type="checkbox" value="on" disabled ${perfil.resumoPublico ? "checked" : ""} />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>
          </div>

          <div class="perfil-section-save">
            <button class="primary-icon-btn" type="submit" name="secao" value="preferencias">${ICONS.save}<span class="icon-btn-label">Salvar preferências</span></button>
          </div>

          <div class="perfil-actions-secondary">
            <p class="input-label">Ações da conta</p>
            <button id="btn-perfil-logout" class="icon-btn danger-icon-btn" type="button" aria-label="Sair da conta" title="Sair da conta">${ICONS.logout}<span class="icon-btn-label">Sair</span></button>
          </div>
        </div>
      </details>

    </form>

    <!-- ── Progression card (read-only, derived from history) ── -->
    <details class="perfil-section" data-secao="graduacao" ${secaoAberta === "graduacao" ? "open" : ""}>
      <summary class="perfil-section-title">Progressão de faixa</summary>
      <div class="perfil-section-body">
        ${gradInfo ? `
        <div class="grad-progress-card" style="background:linear-gradient(135deg,${beltColor.cardFrom} 0%,${beltColor.cardTo} 100%);border-color:${beltColor.border}">
          <div class="grad-progress-card-head">
            <div>
              <p class="grad-progress-card-belt" style="color:${beltColor.accent}">${gradInfo.faixa}${gradInfo.grauLabel ? ` · ${gradInfo.grauLabel}` : ""}</p>
              <p class="grad-progress-card-pct" style="color:${beltColor.accent}">${grauPct}% <small style="font-weight:500;font-size:0.72rem">${grauAtualNum}/4 graus</small></p>
            </div>
            <p class="grad-progress-card-sub">${gradInfo.isOverdue
              ? "Meta ultrapassada — revise a data alvo"
              : gradInfo.monthsLeft === 0 ? "Objetivo próximo!" : `Faltam ${gradInfo.monthsLeft} ${gradInfo.monthsLeft === 1 ? "mês" : "meses"}`
            }</p>
          </div>
          <div class="grad-progress-wrap grad-progress-path" role="progressbar" aria-valuenow="${grauPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progressão até próxima graduação" style="background:${faixaCycleGradH}">
            <div class="grad-progress-dim" style="left:${grauPct}%"></div>
            ${grauDots}
            <div class="grad-progress-marker" style="left:${grauPct}%;border-color:${beltColor.border}"></div>
          </div>
          <p class="grad-progress-label">Meta: ${gradInfo.targetDate} · ${nextFaixa ? `Próxima faixa: ${nextFaixa}` : "Última faixa da trilha"}</p>
          <p class="grad-progress-days">${diasTreinandoLabel}</p>
        </div>
        ` : `<p class="empty-state">Adicione uma graduação no histórico abaixo para ver a progressão automaticamente.</p>`}
        <p class="perfil-grad-hint">A progressão é calculada com base no histórico de graduações. Para definir uma meta manual, use "Meta de próxima graduação" em Dados esportivos.</p>
      </div>
    </details>

    <!-- ── Graduation timeline ──────────────────────────────── -->
    <details class="perfil-section" data-secao="historico" ${secaoAberta === "historico" ? "open" : ""}>
      <summary class="perfil-section-title">Histórico de graduações</summary>
      <div class="perfil-section-body">

        ${dataState.loading.historicoGraduacoes
          ? `<p class="empty-state">Carregando histórico...</p>`
          : historico.length === 0
            ? `<p class="empty-state">Nenhuma graduação registrada ainda.</p>`
            : `<ul class="grad-timeline" style="--belt-path-gradient:${tlBlockGrad}">${timelineItems}</ul>`
        }

        <form id="form-grad-historico" class="form-grid grad-hist-add-form" novalidate>
          <p class="perfil-section-label">Adicionar graduação</p>

          <label class="input-label" for="gh-faixa">Faixa</label>
          <select class="text-input" id="gh-faixa" name="faixaGrad" required>
            <option value="">— selecione —</option>
            ${beltPath.map((f) => `<option value="${f}">${f}</option>`).join("")}
          </select>

          <label class="input-label" for="gh-grau">Grau</label>
          <select class="text-input" id="gh-grau" name="grauGrad">
            <option value="">— selecione —</option>
            ${[0,1,2,3,4].map((g) => `<option value="${g}">${g === 0 ? "Sem grau" : g + "° grau"}</option>`).join("")}
          </select>

          <label class="input-label" for="gh-data">Data da graduação</label>
          <input class="text-input" id="gh-data" name="dataGrad" type="date" required />

          <label class="input-label" for="gh-obs">Observações</label>
          <textarea class="text-input text-area compact-area" id="gh-obs" name="obsGrad"></textarea>

          <div class="perfil-section-save">
            <button class="primary-icon-btn" type="submit">${ICONS.plus}<span class="icon-btn-label">Adicionar</span></button>
          </div>
        </form>

      </div>
    </details>
  `);
}

function renderTecnicaSelector(apostilaItems, selectedIds = []) {
  if (!apostilaItems.length) {
    return `<p class="empty-state">A apostila ainda não possui itens.</p>`;
  }

  const orderedItems = [...apostilaItems].sort(compareByOrdem);
  const grouped = orderedItems.reduce((acc, item) => {
    const key = `${item.ordemSecao}::${item.secaoId}`;
    if (!acc[key]) {
      acc[key] = {
        ordemSecao: item.ordemSecao,
        secaoId: item.secaoId,
        secaoTitulo: item.secaoTitulo,
        itens: [],
      };
    }
    acc[key].itens.push(item);
    return acc;
  }, {});

  const sections = Object.values(grouped).sort((left, right) => left.ordemSecao - right.ordemSecao);

  return `
    <div class="selector-group-list">
      ${sections
        .map(
          (section) => {
            const selectedCount = section.itens.filter((item) => selectedIds.includes(item.id)).length;
            return `
        <details class="selector-group" ${selectedCount > 0 ? "open" : ""}>
          <summary>
            <span class="selector-group-title">${section.ordemSecao}. ${section.secaoTitulo}</span>
            <span class="selector-group-count">${selectedCount}/${section.itens.length}</span>
          </summary>
          <div class="check-list compact-check-list">
            ${section.itens
              .map(
                (tecnica) => `
              <label class="check-row" for="vinculo-${tecnica.id}">
                <input
                  id="vinculo-${tecnica.id}"
                  type="checkbox"
                  name="tecnicaIds"
                  value="${tecnica.id}"
                  ${selectedIds.includes(tecnica.id) ? "checked" : ""}
                />
                <span class="check-main">${tecnica.ordemItem}. ${tecnica.nome}</span>
              </label>
            `
              )
              .join("")}
          </div>
        </details>
      `
          }
        )
        .join("")}
    </div>
  `;
}

function renderTreinos(dataState, feedback, uiState) {
  const treinos = dataState.treinos || [];
  const apostilaItems = dataState.apostilaItemsComProgresso || [];
  const editingTreino = uiState.treinoEmEdicao;

  return card(`
    <h2 class="page-title">Treinos</h2>
    <p class="page-subtitle">Registre cada sessão e vincule técnicas da apostila.</p>
    ${formMessage(feedback)}

    <form id="form-treino" class="form-grid" novalidate>
      <input type="hidden" name="treinoId" value="${editingTreino?.id || ""}" />

      <label class="input-label" for="treino-data">Data</label>
      <input class="text-input" id="treino-data" name="data" type="date" value="${editingTreino?.data || ""}" required />

      <label class="input-label" for="treino-tipo">Tipo de treino</label>
      <select class="text-input" id="treino-tipo" name="tipoTreino" required>
        <option value="aula" ${editingTreino?.tipoTreino === "aula" ? "selected" : ""}>Aula</option>
        <option value="drill" ${editingTreino?.tipoTreino === "drill" ? "selected" : ""}>Drill</option>
        <option value="rola" ${editingTreino?.tipoTreino === "rola" ? "selected" : ""}>Rola</option>
        <option value="competicao" ${editingTreino?.tipoTreino === "competicao" ? "selected" : ""}>Competição</option>
      </select>

      <label class="input-label" for="treino-duracao">Duração (min)</label>
      <input class="text-input" id="treino-duracao" name="duracaoMin" type="number" min="1" value="${editingTreino?.duracaoMin || ""}" required />

      <label class="input-label" for="treino-nota">Nota da sessão (1 a 5)</label>
      <input class="text-input" id="treino-nota" name="notaSessao" type="number" min="1" max="5" value="${editingTreino?.notaSessao || ""}" required />

      <label class="input-label" for="treino-obs">Observações</label>
      <textarea class="text-input text-area" id="treino-obs" name="observacoes">${editingTreino?.observacoes || ""}</textarea>

      <p class="input-label">Técnicas praticadas no treino</p>
      ${renderTecnicaSelector(apostilaItems, editingTreino?.tecnicaIds || [])}

      <div class="actions-row">
        <button class="primary-icon-btn" type="submit">${ICONS.save}<span class="icon-btn-label">${editingTreino ? "Atualizar" : "Salvar treino"}</span></button>
        ${editingTreino ? `<button id="btn-cancelar-edicao-treino" class="icon-btn" type="button" aria-label="Cancelar edição" title="Cancelar edição">${ICONS.cancel}<span class="icon-btn-label">Cancelar</span></button>` : ""}
      </div>
    </form>

    <h3 class="section-title">Histórico</h3>
    ${dataState.loading.treinos
      ? "<p class=\"page-subtitle\">Carregando treinos...</p>"
      : treinos.length === 0
      ? "<p class=\"empty-state\">Nenhum treino registrado ainda. Comece pelo formulário acima.</p>"
      : `<ul class="entity-list">${treinos
          .map(
            (item) => `
          <li class="entity-item">
            <p><strong>${formatDateFromMs(item.dataMs)}</strong> • ${item.tipoTreino}</p>
            <p>Duração: ${item.duracaoMin} min • Nota: ${item.notaSessao}/5</p>
            <p>${item.observacoes || "Sem observações."}</p>
            <p class="chip-line">${item.tecnicaResumo?.length
              ? item.tecnicaResumo.map((tecnica) => `<span class=\"chip\">${tecnica.nome}</span>`).join("")
              : "<span class=\"empty-state\">Sem técnicas vinculadas.</span>"}</p>
            <div class="actions-row">
              ${iconBtn('edit', 'Editar', { cls: 'icon-btn btn-editar-treino', extra: `data-id="${item.id}"` })}
              ${iconBtn('trash', 'Excluir', { cls: 'icon-btn danger-icon-btn btn-excluir-treino', extra: `data-id="${item.id}"` })}
            </div>
          </li>
        `
          )
          .join("")}</ul>`}
  `);
}

function renderTecnicas(dataState, feedback, uiState) {
  const tecnicas = dataState.tecnicasFiltradas || [];
  const categorias = Array.from(new Set((dataState.apostilaItemsComProgresso || []).map((item) => item.categoria)));

  return card(`
    <h2 class="page-title">Técnicas</h2>
    <p class="page-subtitle">Galeria completa da apostila para marcar evolução pessoal.</p>
    ${formMessage(feedback)}

    <div class="filter-row">
      <input class="text-input" id="filtro-tecnica-busca" type="text" placeholder="Buscar por nome" value="${uiState.filtroTecnicaTexto || ""}" />
      <select class="text-input" id="filtro-tecnica-categoria">
        <option value="">Todas as categorias</option>
        ${categorias
          .map(
            (categoria) => `<option value="${categoria}" ${uiState.filtroTecnicaCategoria === categoria ? "selected" : ""}>${categoria}</option>`
          )
          .join("")}
      </select>
      <label class="check-row" for="filtro-tecnica-favorita">
        <input id="filtro-tecnica-favorita" type="checkbox" ${uiState.filtroSomenteFavoritas ? "checked" : ""} />
        Somente favoritas
      </label>
    </div>

    ${dataState.loading.progressoApostila
      ? "<p class=\"page-subtitle\">Carregando apostila...</p>"
      : tecnicas.length === 0
      ? "<p class=\"empty-state\">Nenhuma técnica encontrada para o filtro atual.</p>"
      : `<ul class="entity-list dense-tech-list">${tecnicas
          .map(
            (item) => `
          <li class="entity-item dense-tech-item">
            <div class="dense-head">
              <p class="dense-title"><strong>${item.ordemSecao}.${item.ordemItem} • ${item.nome}</strong></p>
              <p class="dense-subtitle">${item.categoria} • ${item.linhaGrupo}</p>
            </div>

            <form class="form-progresso-tecnica dense-controls" data-tech-id="${item.id}">
              <label class="check-row" for="fav-${item.id}">
                <input id="fav-${item.id}" name="favorita" type="checkbox" ${item.favorita ? "checked" : ""} />
                Favorita
              </label>

              <label class="check-row" for="concluida-${item.id}">
                <input id="concluida-${item.id}" name="concluida" type="checkbox" ${item.concluida ? "checked" : ""} />
                Concluída
              </label>

              <label class="input-label" for="confianca-${item.id}">Confiança</label>
              <input class="text-input compact-input" id="confianca-${item.id}" name="nivelConfianca" type="number" min="0" max="5" value="${item.nivelConfianca || 0}" />

              <label class="input-label" for="obs-${item.id}">Observações pessoais</label>
              <textarea class="text-input text-area compact-area" id="obs-${item.id}" name="observacoesPessoais">${item.observacoesPessoais || ""}</textarea>

              <button class="icon-btn quick-btn" type="submit" aria-label="Salvar" title="Salvar">${ICONS.save}<span class="icon-btn-label">Salvar</span></button>
            </form>
          </li>
        `
          )
          .join("")}</ul>`}
  `);
}

function renderApostila(dataState, feedback) {
  const sections = [...(dataState.apostilaSections || [])].sort((left, right) => (left.ordemSecao || 0) - (right.ordemSecao || 0));
  const byId = new Map((dataState.apostilaItemsComProgresso || []).map((item) => [item.id, item]));
  const metrics = dataState.metrics;

  return card(`
    <h2 class="page-title">Apostila</h2>
    <p class="page-subtitle">Conteúdo organizado por seções da apostila do instrutor.</p>
    ${formMessage(feedback)}

    <section class="apostila-topbar">
      <article class="topbar-item"><span>Total</span><strong>${metrics.totalItensApostila}</strong></article>
      <article class="topbar-item"><span>Concluídos</span><strong>${metrics.itensConcluidos}</strong></article>
      <article class="topbar-item"><span>Favoritos</span><strong>${metrics.itensFavoritados}</strong></article>
      <article class="topbar-item"><span>Confiança média</span><strong>${metrics.confiancaMedia}</strong></article>
    </section>

    <nav class="apostila-index" aria-label="Índice da apostila">
      ${sections
        .map(
          (section) => `<button type="button" class="index-pill btn-indice-secao" data-target-id="secao-${section.id}">${section.ordemSecao}. ${section.titulo}</button>`
        )
        .join("")}
    </nav>

    ${sections
      .map((section) => {
        const orderedItens = [...section.itens].sort(compareByOrdem);
        const rows = orderedItens
          .map((seedItem) => {
            const item = byId.get(seedItem.id) || seedItem;
            const hasAnyDetail = Boolean(item.significado || item.detalhesExecucao || item.pontosDeAtencao || item.errosComuns || item.observacoesDoProfessor);

            return `
            <li class="apostila-row">
              <details class="apostila-item-disclosure">
                <summary class="apostila-row-summary">
                  <div class="apostila-row-left">
                    <p class="apostila-ordem">${item.ordemSecao}.${item.ordemItem}</p>
                    <p class="apostila-title"><strong>${item.nome}</strong></p>
                  </div>
                  <div class="apostila-row-right">
                    <div class="apostila-badges">
                      ${item.favorita ? '<span class="chip">Favorita</span>' : ''}
                      ${item.concluida ? '<span class="chip">Concluída</span>' : ''}
                      <span class="chip">Confiança ${item.nivelConfianca || 0}</span>
                    </div>
                    <span class="apostila-action">Detalhes</span>
                  </div>
                </summary>
                <div class="details-panel apostila-detail-panel">
                  <p class="apostila-detail-meta">Grupo/Categoria: ${item.categoria} • ${item.linhaGrupo}</p>
                  ${hasAnyDetail ? "" : "<p class=\"empty-state\">Conteúdo pendente</p>"}
                  <form class="form-apostila-detalhes form-grid" data-tech-id="${item.id}">
                  <label class="input-label" for="sig-${item.id}">Significado</label>
                  <textarea class="text-input text-area" id="sig-${item.id}" name="significado">${item.significado || ""}</textarea>

                  <label class="input-label" for="det-${item.id}">Detalhes de execução</label>
                  <textarea class="text-input text-area" id="det-${item.id}" name="detalhesExecucao">${item.detalhesExecucao || ""}</textarea>

                  <label class="input-label" for="pta-${item.id}">Pontos de atenção</label>
                  <textarea class="text-input text-area" id="pta-${item.id}" name="pontosDeAtencao">${item.pontosDeAtencao || ""}</textarea>

                  <label class="input-label" for="err-${item.id}">Erros comuns</label>
                  <textarea class="text-input text-area" id="err-${item.id}" name="errosComuns">${item.errosComuns || ""}</textarea>

                  <label class="input-label" for="prof-${item.id}">Observações do professor</label>
                  <textarea class="text-input text-area" id="prof-${item.id}" name="observacoesDoProfessor">${item.observacoesDoProfessor || ""}</textarea>

                  <button class="icon-btn quick-btn" type="submit" aria-label="Salvar detalhes" title="Salvar detalhes">${ICONS.save}<span class="icon-btn-label">Salvar</span></button>
                </form>
                </div>
              </details>
            </li>
          `;
          })
          .join("");

        return `
          <details class="apostila-section" id="secao-${section.id}" ${section.ordemSecao === 1 ? "open" : ""}>
            <summary class="section-title apostila-section-summary">${section.ordemSecao}. ${section.titulo}</summary>
            <ul class="entity-list">${rows}</ul>
          </details>
        `;
      })
      .join("")}
  `);
}

export function syncShellState({ route, user }) {
  const logoutButton = document.querySelector("#btn-logout");
  const bottomNav = document.querySelector("#bottom-nav");

  if (logoutButton) {
    logoutButton.classList.toggle("is-hidden", !user);
  }

  if (bottomNav) {
    bottomNav.classList.toggle("is-hidden", !user);
  }

  document.querySelectorAll(".nav-link").forEach((element) => {
    const routeTarget = element.getAttribute("href")?.replace("#", "");
    const isActive = routeTarget === route;
    element.classList.toggle("active", isActive);
    element.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

export function renderRouteView(route, user, dataState, feedbackByRoute, uiState) {
  if (route === "/login") {
    return card(`
      <div class="login-wrap">
        <h2 class="login-title">Entrar na sua conta</h2>
        <p class="login-subtitle">Acompanhe sua evolução no Jiu-Jitsu com clareza.</p>
        <form id="form-login" class="form-grid" novalidate>
          <label class="input-label" for="email">E-mail</label>
          <input id="email" name="email" class="text-input" type="email" placeholder="voce@exemplo.com" autocomplete="email" required />
          <label class="input-label" for="senha">Senha</label>
          <input id="senha" name="senha" class="text-input" type="password" placeholder="Digite sua senha" autocomplete="current-password" required />
          <button class="primary-icon-btn" type="submit">${ICONS.login}<span class="icon-btn-label">Entrar com e-mail</span></button>
        </form>
        <p class="sep">ou</p>
        <button id="btn-google" class="google-btn" type="button">Entrar com Google</button>
        <p id="login-message" class="message is-hidden" role="status" aria-live="polite"></p>
        <p class="note">Somente usuários autenticados acessam o painel.</p>
      </div>
    `);
  }

  if (route === "/dashboard") {
    return renderDashboard(user, dataState);
  }

  if (route === "/treinos") {
    return renderTreinos(dataState, feedbackByRoute.treinos, uiState);
  }

  if (route === "/tecnicas") {
    return renderTecnicas(dataState, feedbackByRoute.tecnicas, uiState);
  }

  if (route === "/apostila") {
    return renderApostila(dataState, feedbackByRoute.apostila);
  }

  if (route === "/perfil") {
    return renderPerfil(dataState, feedbackByRoute.perfil, user, uiState);
  }

  return card(`<p>Página não encontrada.</p>`);
}

export function mountLoginHandlers({ onEmailLogin, onGoogleLogin }) {
  const form = document.querySelector("#form-login");
  const googleButton = document.querySelector("#btn-google");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const senha = String(formData.get("senha") || "");
      await onEmailLogin({ email, senha });
    });
  }

  if (googleButton) {
    googleButton.addEventListener("click", async () => {
      await onGoogleLogin();
    });
  }
}

export function mountPerfilHandler({ onSave, onLogout, onAvatarUpload, onAvatarRemove, onAddGrad, onDeleteGrad, onEditGrad }) {
  // ── Avatar upload + remove (Firebase Cloud Storage) ───
  const avatarInput = document.querySelector("#perfil-avatar-input");
  const avatarImg = document.querySelector("#perfil-avatar-preview");
  const avatarInitials = document.querySelector("#perfil-avatar-initials");
  const avatarRemoveBtn = document.querySelector("#btn-remove-avatar");
  const avatarHint = document.querySelector("#perfil-avatar-hint");
  const avatarUploading = document.querySelector("#perfil-avatar-uploading");
  const avatarStatus = document.querySelector("#perfil-avatar-status");

  const setAvatarStatus = (text, type = "info") => {
    if (!avatarStatus) return;
    if (!text) {
      avatarStatus.textContent = "";
      avatarStatus.classList.add("is-hidden");
      avatarStatus.classList.remove("success", "error", "info");
      return;
    }
    avatarStatus.textContent = text;
    avatarStatus.classList.remove("is-hidden", "success", "error", "info");
    avatarStatus.classList.add(type);
  };

  if (avatarInput && avatarImg && avatarInitials) {
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files?.[0];
      if (!file || !onAvatarUpload) return;

      // Show local preview immediately via FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarImg.src = String(e.target?.result || "");
        avatarImg.classList.remove("is-hidden");
        avatarInitials.classList.add("is-hidden");
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Cloud Storage
      if (avatarHint) avatarHint.classList.add("is-hidden");
      if (avatarUploading) avatarUploading.classList.remove("is-hidden");
      setAvatarStatus("Enviando 0%", "info");
      try {
        const url = await onAvatarUpload(file, (pct) => {
          setAvatarStatus(`Enviando ${Math.max(0, Math.min(100, pct))}%`, "info");
        });
        avatarImg.src = url; // replace data-URL with permanent URL
        if (avatarRemoveBtn) avatarRemoveBtn.classList.remove("is-hidden");
        setAvatarStatus("Foto atualizada com sucesso.", "success");
      } catch (err) {
        console.error("Avatar upload failed:", err);
        // revert preview
        avatarImg.src = "";
        avatarImg.classList.add("is-hidden");
        avatarInitials.classList.remove("is-hidden");
        setAvatarStatus("Não foi possível enviar a foto.", "error");
      } finally {
        if (avatarHint) avatarHint.classList.remove("is-hidden");
        if (avatarUploading) avatarUploading.classList.add("is-hidden");
        avatarInput.value = "";
      }
    });
  }

  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener("click", async () => {
      if (avatarHint) avatarHint.classList.add("is-hidden");
      if (avatarUploading) avatarUploading.classList.remove("is-hidden");
      setAvatarStatus("Removendo foto...", "info");
      try {
        if (onAvatarRemove) await onAvatarRemove();
        if (avatarImg) { avatarImg.src = ""; avatarImg.classList.add("is-hidden"); }
        if (avatarInitials) avatarInitials.classList.remove("is-hidden");
        if (avatarInput) avatarInput.value = "";
        avatarRemoveBtn.classList.add("is-hidden");
        setAvatarStatus("Foto removida.", "success");
      } catch (err) {
        console.error("Avatar remove failed:", err);
        setAvatarStatus("Não foi possível remover a foto.", "error");
      } finally {
        if (avatarHint) avatarHint.classList.remove("is-hidden");
        if (avatarUploading) avatarUploading.classList.add("is-hidden");
      }
    });
  }

  // ── Reduce-motion toggle ──────────────────────────────
  const animacoesToggle = document.querySelector("#pref-animacoes");
  if (animacoesToggle) {
    animacoesToggle.addEventListener("change", () => {
      document.documentElement.classList.toggle("reduce-motion", animacoesToggle.checked);
    });
  }

  // ── Logout ────────────────────────────────────────────
  const logoutBtn = document.querySelector("#btn-perfil-logout");
  if (logoutBtn && onLogout) {
    logoutBtn.addEventListener("click", async () => {
      await onLogout();
    });
  }

  // ── Unsaved changes hint ──────────────────────────────
  const dirtyHint = document.querySelector("#perfil-dirty-hint");
  const formPerfil = document.querySelector("#form-perfil");

  if (formPerfil && dirtyHint) {
    const showDirty = () => dirtyHint.classList.remove("is-hidden");
    formPerfil.addEventListener("input", showDirty);
    formPerfil.addEventListener("change", showDirty);
  }

  // ── Main perfil form submit ───────────────────────────
  if (formPerfil) {
    formPerfil.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(formPerfil);
      const secao = String(formData.get("secao") || "").trim() || null;
      const pesoAtualRaw = formData.get("pesoAtual");
      const pesoCompRaw = formData.get("pesoCompeticao");
      const freqRaw = formData.get("frequenciaSemanalDesejada");

      if (dirtyHint) {
        dirtyHint.classList.add("is-hidden");
      }

      await onSave(
        {
          nomeCompleto: String(formData.get("nomeCompleto") || "").trim(),
          apelido: String(formData.get("apelido") || "").trim(),
          dataNascimento: String(formData.get("dataNascimento") || "").trim(),
          cidadeUF: String(formData.get("cidadeUF") || "").trim(),
          academia: String(formData.get("academia") || "").trim(),
          professor: String(formData.get("professor") || "").trim(),
          professorFaixa: String(formData.get("professorFaixa") || "").trim(),
          professorGrau: String(formData.get("professorGrau") || "").trim(),
          faixaAtual: String(formData.get("faixaAtual") || "").trim(),
          grauAtual: String(formData.get("grauAtual") || "").trim(),
          categoriaDePeso: String(formData.get("categoriaDePeso") || "").trim(),
          pesoAtual: pesoAtualRaw !== "" && pesoAtualRaw !== null ? Number(pesoAtualRaw) : "",
          pesoCompeticao: pesoCompRaw !== "" && pesoCompRaw !== null ? Number(pesoCompRaw) : "",
          ladoDominante: String(formData.get("ladoDominante") || "").trim(),
          estiloPreferido: String(formData.get("estiloPreferido") || "").trim(),
          frequenciaSemanalDesejada: freqRaw !== "" && freqRaw !== null ? Number(freqRaw) : "",
          objetivoPrincipal: String(formData.get("objetivoPrincipal") || "").trim(),
          proximaMetaGraduacao: String(formData.get("proximaMetaGraduacao") || "").trim(),
          observacoesDeEvolucao: String(formData.get("observacoesDeEvolucao") || "").trim(),
          reduzirAnimacoes: formData.get("reduzirAnimacoes") === "on",
          resumoPublico: formData.get("resumoPublico") === "on",
        },
        secao
      );
    });
  }

  // ── Graduation history add form ───────────────────────
  const formGradHist = document.querySelector("#form-grad-historico");
  if (formGradHist && onAddGrad) {
    formGradHist.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(formGradHist);
      const faixaGrad = String(formData.get("faixaGrad") || "").trim();
      const dataGrad = String(formData.get("dataGrad") || "").trim();

      if (!faixaGrad || !dataGrad) {
        return;
      }

      await onAddGrad({
        faixa: faixaGrad,
        grau: String(formData.get("grauGrad") || "").trim(),
        dataGrad,
        observacoes: String(formData.get("obsGrad") || "").trim(),
      });

      formGradHist.reset();
    });
  }

  // ── Graduation history delete ─────────────────────────
  document.querySelectorAll(".btn-del-grad").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const gradId = String(btn.getAttribute("data-grad-id") || "");
      if (!gradId) {
        return;
      }
      const ok = window.confirm("Remover esta entrada do histórico de graduações?");
      if (!ok) {
        return;
      }
      await onDeleteGrad(gradId);
    });
  });

  // ── Graduation history inline edit (toggle) ───────────
  document.querySelectorAll(".btn-edit-grad").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gradId = String(btn.getAttribute("data-grad-id") || "");
      const editForm = document.querySelector(`.grad-tl-edit-form[data-grad-id="${gradId}"]`);
      if (!editForm) return;
      const isHidden = editForm.classList.toggle("is-hidden");
      btn.textContent = isHidden ? "Editar" : "Cancelar";
    });
  });

  // ── Graduation history inline edit (submit) ───────────
  if (onEditGrad) {
    document.querySelectorAll(".grad-tl-edit-form").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const gradId = String(form.getAttribute("data-grad-id") || "");
        if (!gradId) return;
        const fd = new FormData(form);
        const faixaEdit = String(fd.get("faixaEdit") || "").trim();
        const dataEdit = String(fd.get("dataGradEdit") || "").trim();
        if (!faixaEdit || !dataEdit) return;
        await onEditGrad(gradId, {
          faixa: faixaEdit,
          grau: String(fd.get("grauEdit") || "").trim(),
          dataGrad: dataEdit,
          observacoes: String(fd.get("obsEdit") || "").trim(),
        });
      });
    });
  }
}

export function mountTreinoHandlers({ onSave, onStartEdit, onCancelEdit, onDelete }) {
  const form = document.querySelector("#form-treino");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const tecnicaIds = formData.getAll("tecnicaIds").map((item) => String(item));

      await onSave({
        id: String(formData.get("treinoId") || "").trim() || null,
        data: String(formData.get("data") || "").trim(),
        tipoTreino: String(formData.get("tipoTreino") || "").trim(),
        duracaoMin: Number(formData.get("duracaoMin") || 0),
        notaSessao: Number(formData.get("notaSessao") || 0),
        observacoes: String(formData.get("observacoes") || "").trim(),
        tecnicaIds,
      });
    });
  }

  const cancelButton = document.querySelector("#btn-cancelar-edicao-treino");
  if (cancelButton) {
    cancelButton.addEventListener("click", onCancelEdit);
  }

  document.querySelectorAll(".btn-editar-treino").forEach((button) => {
    button.addEventListener("click", () => {
      onStartEdit(String(button.getAttribute("data-id") || ""));
    });
  });

  document.querySelectorAll(".btn-excluir-treino").forEach((button) => {
    button.addEventListener("click", async () => {
      const treinoId = String(button.getAttribute("data-id") || "");
      if (!treinoId) {
        return;
      }

      const shouldDelete = window.confirm("Deseja realmente excluir este treino?");
      if (!shouldDelete) {
        return;
      }

      await onDelete(treinoId);
    });
  });
}

export function mountTecnicasHandlers({ onSaveProgress, onFilterChange }) {
  const searchInput = document.querySelector("#filtro-tecnica-busca");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      onFilterChange({ texto: searchInput.value });
    });
  }

  const categoriaInput = document.querySelector("#filtro-tecnica-categoria");
  if (categoriaInput) {
    categoriaInput.addEventListener("change", () => {
      onFilterChange({ categoria: categoriaInput.value });
    });
  }

  const onlyFavInput = document.querySelector("#filtro-tecnica-favorita");
  if (onlyFavInput) {
    onlyFavInput.addEventListener("change", () => {
      onFilterChange({ somenteFavoritas: onlyFavInput.checked });
    });
  }

  document.querySelectorAll(".form-progresso-tecnica").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const techId = String(form.getAttribute("data-tech-id") || "");

      await onSaveProgress({
        techId,
        favorita: Boolean(formData.get("favorita")),
        nivelConfianca: Number(formData.get("nivelConfianca") || 0),
        concluida: Boolean(formData.get("concluida")),
        observacoesPessoais: String(formData.get("observacoesPessoais") || "").trim(),
      });
    });
  });
}

export function mountApostilaHandlers({ onSaveDetalhes }) {
  document.querySelectorAll(".btn-indice-secao").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = String(button.getAttribute("data-target-id") || "");
      if (!targetId) {
        return;
      }

      const section = document.getElementById(targetId);
      if (!section) {
        return;
      }

      if (section instanceof HTMLDetailsElement) {
        section.open = true;
      }

      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".form-apostila-detalhes").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const techId = String(form.getAttribute("data-tech-id") || "");

      await onSaveDetalhes({
        techId,
        significado: String(formData.get("significado") || "").trim(),
        detalhesExecucao: String(formData.get("detalhesExecucao") || "").trim(),
        pontosDeAtencao: String(formData.get("pontosDeAtencao") || "").trim(),
        errosComuns: String(formData.get("errosComuns") || "").trim(),
        observacoesDoProfessor: String(formData.get("observacoesDoProfessor") || "").trim(),
      });
    });
  });
}

export function setLoginMessage({ text, type = "error" }) {
  const target = document.querySelector("#login-message");
  if (!target) {
    return;
  }

  if (!text) {
    target.textContent = "";
    target.className = "message is-hidden";
    return;
  }

  target.textContent = text;
  target.className = `message ${type}`;
}
