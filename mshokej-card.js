class MSHokejCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("div");
  }

  static getStubConfig() {
    return { entity: "sensor.ms_hokej_snapshot", title: "MS Hokej" };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._theme = window.localStorage.getItem("mshokej-card-theme") || "light";
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Missing required entity");
    }
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 12;
  }

  _toggleTheme() {
    this._theme = this._theme === "dark" ? "light" : "dark";
    window.localStorage.setItem("mshokej-card-theme", this._theme);
    this._render();
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  _renderTeam(team, favoriteTeam) {
    const css = team === favoriteTeam ? "favorite-team" : "";
    return `<span class="${css}">${this._escape(team)}</span>`;
  }

  _renderResult(result) {
    if (!result) {
      return "vs";
    }
    let html = `<span>${this._escape(result.text || "vs")}</span>`;
    if (result.suffix) {
      html += ` <span>${this._escape(result.suffix)}</span>`;
    }
    if (result.live_phase) {
      html += `<div class="live-phase">${this._escape(result.live_phase)}</div>`;
    }
    if (result.live_sub) {
      html += `<div class="live-sub">${this._escape(result.live_sub)}</div>`;
    }
    return html;
  }

  _renderOverview(snapshot) {
    const overview = snapshot.overview || {};
    return `
      <div class="summary-grid">
        <div class="summary-card"><strong>${overview.played ?? 0}/${overview.total ?? 0}</strong><span>Odehráno zápasů</span></div>
        <div class="summary-card"><strong>${overview.remaining ?? 0}</strong><span>Zbývá odehrát</span></div>
        <div class="summary-card"><strong>${overview.group_played ?? 0}/${overview.group_total ?? 0}</strong><span>Skupinové zápasy</span></div>
      </div>
    `;
  }

  _renderGroupTable(groupName, rows, favoriteTeam) {
    const body = (rows || [])
      .map((row) => {
        const classes = [];
        if (row.is_top4) classes.push("top4");
        if (row.is_relegated) classes.push("relegation");
        if (row.is_favorite_team) classes.push("favorite-row");
        return `
          <tr class="${classes.join(" ")}">
            <td>${row.position}</td>
            <td>${this._renderTeam(row.team, favoriteTeam)}</td>
            <td>${row.played}</td>
            <td>${row.wins}</td>
            <td>${row.otw}</td>
            <td>${row.otl}</td>
            <td>${row.losses}</td>
            <td>${row.gf}</td>
            <td>${row.ga}</td>
            <td>${row.gd}</td>
            <td><strong>${row.points}</strong></td>
          </tr>
        `;
      })
      .join("");

    return `
      <div>
        <h2>Skupina ${groupName}</h2>
        <table>
          <tr><th>#</th><th>Tým</th><th>Z</th><th>W</th><th>OTW</th><th>OTL</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Body</th></tr>
          ${body}
        </table>
      </div>
    `;
  }

  _matchRow(match, favoriteTeam) {
    const classes = [];
    if (match.is_today) classes.push("today-match");
    if (match.is_favorite_match) classes.push("favorite-match");
    return `
      <tr class="${classes.join(" ")}">
        <td>${this._escape(match.date)}</td>
        <td>${this._escape(match.time)}</td>
        <td>${this._escape(match.phase_label)}</td>
        <td>${this._escape(match.group_label)}</td>
        <td>${this._escape(match.id)}</td>
        <td>${this._renderTeam(match.home, favoriteTeam)} - ${this._renderTeam(match.away, favoriteTeam)}</td>
        <td>${this._renderResult(match.result)}</td>
        <td>${this._escape(match.venue)}</td>
      </tr>
    `;
  }

  _renderMatchTable(title, matches, emptyMessage, favoriteTeam) {
    if (!matches || matches.length === 0) {
      return `<h2>${this._escape(title)}</h2><p>${this._escape(emptyMessage)}</p>`;
    }

    return `
      <h2>${this._escape(title)}</h2>
      <table>
        <tr><th>Datum</th><th>Čas</th><th>Fáze</th><th>Skupina</th><th>ID</th><th>Zápas</th><th>Výsledek</th><th>Místo</th></tr>
        ${matches.map((match) => this._matchRow(match, favoriteTeam)).join("")}
      </table>
    `;
  }

  _renderBracketRound(title, matches, favoriteTeam) {
    return `
      <div class="bracket-round">
        <h3>${this._escape(title)}</h3>
        ${matches
          .map((match) => {
            const extraClass = match.is_final ? "bracket-match-final" : match.is_bronze ? "bracket-match-bronze" : "";
            const pair = match.pair || { home: match.home, away: match.away };
            return `
              <div class="bracket-match ${extraClass}">
                <div class="bracket-match-id">${this._escape(match.id)}</div>
                <div class="bracket-match-pair">${this._renderTeam(pair.home, favoriteTeam)} - ${this._renderTeam(pair.away, favoriteTeam)}</div>
                <div class="bracket-match-result">${this._renderResult(match.result)}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  _renderBracket(snapshot) {
    const favoriteTeam = snapshot.favorite_team;
    return `
      <h2>Play-off pavouk</h2>
      <div class="bracket">
        ${this._renderBracketRound("Čtvrtfinále", snapshot.bracket?.QF || [], favoriteTeam)}
        ${this._renderBracketRound("Semifinále", snapshot.bracket?.SF || [], favoriteTeam)}
        ${this._renderBracketRound("Medaile", snapshot.bracket?.MEDAL || [], favoriteTeam)}
      </div>
    `;
  }

  _renderPredictions(snapshot) {
    const predictions = snapshot.predictions || [];
    const items =
      predictions.length === 0
        ? "<li>Aktuálně nejsou dostupné žádné otevřené predikce postupu.</li>"
        : predictions
            .map((item) => `<li><strong>${this._escape(item.team)}:</strong> ${this._escape(item.summary)}</li>`)
            .join("");
    return `<h2>Predikce postupu</h2><ul>${items}</ul>`;
  }

  _renderContent(snapshot, entityState) {
    const favoriteTeam = snapshot.favorite_team;
    const lastUpdate = snapshot.meta?.last_update_label || entityState?.state || "-";
    const refreshMode = snapshot.meta?.refresh_mode || "-";
    const nextRefresh = snapshot.meta?.next_refresh_at ? ` | další refresh: ${this._escape(snapshot.meta.next_refresh_at)}` : "";

    return `
      <ha-card>
        <div class="container" data-theme="${this._theme}">
          <div class="report-toolbar">
            <button id="themeSwitch" class="theme-switch" type="button">${this._theme === "dark" ? "Světlý režim" : "Tmavý režim"}</button>
          </div>
          <h1>${this._escape(this._config.title || snapshot.title || "MS Hokej")}</h1>
          <div class="meta">Poslední aktualizace: ${this._escape(lastUpdate)} | režim refresh: ${this._escape(refreshMode)}${nextRefresh}</div>
          ${this._renderOverview(snapshot)}
          <div class="grid-two">
            ${this._renderGroupTable("A", snapshot.groups?.A || [], favoriteTeam)}
            ${this._renderGroupTable("B", snapshot.groups?.B || [], favoriteTeam)}
          </div>
          ${this._renderBracket(snapshot)}
          ${this._renderMatchTable("Nejbližší zápasy", snapshot.sections?.nearest || [], "Žádné nejbližší zápasy nejsou k dispozici.", favoriteTeam)}
          ${this._renderMatchTable("Odehrané zápasy", snapshot.sections?.played || [], "Zatím není odehraný žádný zápas.", favoriteTeam)}
          ${this._renderMatchTable("Zbývající zápasy", snapshot.sections?.remaining || [], "Všechny zápasy už jsou odehrané.", favoriteTeam)}
          ${this._renderPredictions(snapshot)}
        </div>
      </ha-card>
    `;
  }

  _render() {
    if (!this._config || !this.shadowRoot) {
      return;
    }

    const entityState = this._hass?.states?.[this._config.entity];
    const snapshot = entityState?.attributes?.snapshot;

    const body = !entityState
      ? `<ha-card><div class="container"><p>Entita ${this._escape(this._config.entity)} nebyla nalezena.</p></div></ha-card>`
      : !snapshot
        ? `<ha-card><div class="container"><p>Entita ${this._escape(this._config.entity)} ještě neposkytuje snapshot.</p></div></ha-card>`
        : this._renderContent(snapshot, entityState);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .container {
          --bg: #f8fafc;
          --fg: #111827;
          --muted: #4b5563;
          --surface: #ffffff;
          --border: #d1d5db;
          --th-bg: #e5e7eb;
          --top4: #dcfce7;
          --relegation: #fee2e2;
          --today: #fff7ed;
          --favorite: #eff6ff;
          --favorite-text: #1d4ed8;
          --bracket-border: #cbd5e1;
          --bracket-shadow: rgba(15, 23, 42, 0.08);
          --final-bg: #fffbeb;
          --bronze-bg: #fff7ed;
          --button-bg: #111827;
          --button-fg: #f8fafc;
          font-family: Helvetica, Arial, sans-serif;
          padding: 24px;
          background: var(--bg);
          color: var(--fg);
        }
        .container[data-theme="dark"] {
          --bg: #0b1220;
          --fg: #e5e7eb;
          --muted: #93a4be;
          --surface: #111a2b;
          --border: #2b3a57;
          --th-bg: #1a2740;
          --top4: #123022;
          --relegation: #3a1d24;
          --today: #38260f;
          --favorite: #0f243f;
          --favorite-text: #8ab4ff;
          --bracket-border: #2b3a57;
          --bracket-shadow: rgba(2, 6, 23, 0.45);
          --final-bg: #3f2f12;
          --bronze-bg: #3a2812;
          --button-bg: #e5e7eb;
          --button-fg: #0b1220;
        }
        h1, h2, h3 { margin-bottom: 8px; }
        .meta { color: var(--muted); margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; background: var(--surface); }
        th, td { border: 1px solid var(--border); padding: 6px 8px; text-align: center; }
        th { background: var(--th-bg); }
        .top4 { background: var(--top4); }
        .relegation { background: var(--relegation); }
        .today-match { background: var(--today); }
        .favorite-match, .favorite-row { background: var(--favorite); }
        .favorite-match.today-match { background: linear-gradient(90deg, var(--favorite) 0%, var(--today) 100%); }
        .favorite-team { color: var(--favorite-text); font-weight: 700; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
        .summary-card strong { font-size: 24px; }
        .bracket { display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 16px; align-items: start; margin-bottom: 24px; }
        .bracket-round { display: flex; flex-direction: column; gap: 14px; }
        .bracket-round h3 { margin-top: 0; }
        .bracket-match { background: var(--surface); border: 1px solid var(--bracket-border); border-radius: 10px; padding: 12px; box-shadow: 0 1px 2px var(--bracket-shadow); }
        .bracket-match-id { font-size: 12px; font-weight: 700; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; }
        .bracket-match-pair { font-weight: 700; margin-bottom: 6px; }
        .bracket-match-final { border-color: #f59e0b; background: var(--final-bg); }
        .bracket-match-bronze { border-color: #d97706; background: var(--bronze-bg); }
        .live-phase, .live-sub { margin-top: 3px; font-size: 12px; font-weight: 700; color: var(--muted); }
        .report-toolbar { display: flex; justify-content: flex-end; margin-bottom: 14px; }
        .theme-switch { border: 1px solid var(--border); background: var(--button-bg); color: var(--button-fg); border-radius: 999px; padding: 7px 13px; cursor: pointer; font-weight: 700; }
        ul { margin-top: 0; }
        @media (min-width: 1000px) {
          .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        }
        @media (max-width: 999px) {
          .bracket { grid-template-columns: 1fr; }
        }
      </style>
      ${body}
    `;

    const button = this.shadowRoot.getElementById("themeSwitch");
    if (button) {
      button.addEventListener("click", () => this._toggleTheme(), { once: true });
    }
  }
}

customElements.define("mshokej-card", MSHokejCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mshokej-card",
  name: "MS Hokej Card",
  description: "Card rendering the MS hockey snapshot in the report.html style."
});
