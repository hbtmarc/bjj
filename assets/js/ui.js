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

  if (dataState.loading.treinos || dataState.loading.progressoApostila) {
    return card(`<p class="page-subtitle">Carregando dados do dashboard...</p>`);
  }

  return card(`
    <h2 class="page-title">Dashboard</h2>
    <p class="page-subtitle">Olá, ${user?.email || "atleta"}. Aqui está seu progresso real.</p>

    <section class="stats-grid">
      <article class="stat-item">
        <h3>Treinos nos últimos 7 dias</h3>
        <strong>${metrics.treinos7d}</strong>
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

function renderPerfil(dataState, feedback) {
  const perfil = dataState.perfil || {};
  const isLoading = dataState.loading.perfil;

  if (isLoading && !perfil.nome) {
    return card(`
      <h2 class="page-title">Perfil</h2>
      <p class="page-subtitle">Carregando perfil...</p>
    `);
  }

  return card(`
    <h2 class="page-title">Perfil</h2>
    <p class="page-subtitle">Atualize seus dados para personalizar seu acompanhamento.</p>
    ${formMessage(feedback)}

    <form id="form-perfil" class="form-grid" novalidate>
      <label class="input-label" for="perfil-nome">Nome</label>
      <input class="text-input" id="perfil-nome" name="nome" type="text" value="${perfil.nome || ""}" required />

      <label class="input-label" for="perfil-apelido">Apelido</label>
      <input class="text-input" id="perfil-apelido" name="apelido" type="text" value="${perfil.apelido || ""}" />

      <label class="input-label" for="perfil-faixa">Faixa</label>
      <input class="text-input" id="perfil-faixa" name="faixa" type="text" value="${perfil.faixa || ""}" />

      <label class="input-label" for="perfil-categoria">Categoria de peso</label>
      <input class="text-input" id="perfil-categoria" name="categoriaDePeso" type="text" value="${perfil.categoriaDePeso || ""}" />

      <label class="input-label" for="perfil-academia">Academia</label>
      <input class="text-input" id="perfil-academia" name="academia" type="text" value="${perfil.academia || ""}" />

      <label class="input-label" for="perfil-professor">Professor</label>
      <input class="text-input" id="perfil-professor" name="professor" type="text" value="${perfil.professor || ""}" />

      <label class="input-label" for="perfil-objetivo">Objetivo</label>
      <textarea class="text-input text-area" id="perfil-objetivo" name="objetivo">${perfil.objetivo || ""}</textarea>

      <button class="primary-btn" type="submit">Salvar perfil</button>
    </form>
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
        <button class="primary-btn" type="submit">${editingTreino ? "Atualizar treino" : "Salvar treino"}</button>
        ${editingTreino ? "<button id=\"btn-cancelar-edicao-treino\" class=\"ghost-btn\" type=\"button\">Cancelar edição</button>" : ""}
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
              <button class="ghost-btn btn-editar-treino" type="button" data-id="${item.id}">Editar</button>
              <button class="ghost-btn danger-btn btn-excluir-treino" type="button" data-id="${item.id}">Excluir</button>
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

              <button class="ghost-btn quick-btn" type="submit">Salvar</button>
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

                  <button class="ghost-btn quick-btn" type="submit">Salvar detalhes</button>
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
          <button class="primary-btn" type="submit">Entrar com e-mail</button>
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
    return renderPerfil(dataState, feedbackByRoute.perfil);
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

export function mountPerfilHandler(onSave) {
  const form = document.querySelector("#form-perfil");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    await onSave({
      nome: String(formData.get("nome") || "").trim(),
      apelido: String(formData.get("apelido") || "").trim(),
      faixa: String(formData.get("faixa") || "").trim(),
      categoriaDePeso: String(formData.get("categoriaDePeso") || "").trim(),
      academia: String(formData.get("academia") || "").trim(),
      professor: String(formData.get("professor") || "").trim(),
      objetivo: String(formData.get("objetivo") || "").trim(),
    });
  });
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
