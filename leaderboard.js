/**
 * Finn's Arcade - Shared Leaderboard Utilities
 * Stores top 10 scores per game in localStorage AND syncs to a shared
 * cloud leaderboard via JSONBin.io so all players see the same scores.
 *
 * Cloud setup (one-time):
 *   1. Create a free account at https://jsonbin.io
 *   2. Go to API Keys → create a key, copy it
 *   3. Replace JSONBIN_API_KEY below with your key
 *   4. On first save a bin is auto-created and the ID stored in localStorage
 *      under 'hs_cloud_bin_id' — note it down from the console and set
 *      JSONBIN_BIN_ID below so all devices share the same bin.
 *
 * Without a key, the arcade works fine with local-only scores.
 */

// ── Cloud config ─────────────────────────────────────────────────────────
const JSONBIN_API_KEY = '$2a$10$bml7rUmOxvUmnVquNJagxenHRX3Aijn4RwZgaJrUbAeSgZ7RMDREW';
const JSONBIN_BIN_ID  = '6a22774dda38895dfe8add8a';
const CLOUD_ENABLED   = !JSONBIN_API_KEY.includes('REPLACE');
// ─────────────────────────────────────────────────────────────────────────

const HS = {
  MAX: 10,

  // ── Cloud helpers ──────────────────────────────────────────────────────

  /** Push all local scores to JSONBin (fire-and-forget). */
  _cloudPush() {
    if (!CLOUD_ENABLED) return;
    try {
      const all = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('hs_') && !k.startsWith('hs_cloud')) {
          try { all[k.slice(3)] = JSON.parse(localStorage.getItem(k)); } catch {}
        }
      }
      const binId = JSONBIN_BIN_ID !== 'REPLACE_WITH_YOUR_BIN_ID'
        ? JSONBIN_BIN_ID
        : localStorage.getItem('hs_cloud_bin_id');

      if (binId) {
        // GET current cloud scores, merge with local, then PUT merged result
        // (avoids overwriting other players' scores)
        const MAX = this.MAX;
        fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
          headers: { 'X-Master-Key': JSONBIN_API_KEY, 'X-Bin-Meta': 'false' }
        })
        .then(r => r.json())
        .then(cloud => {
          const merged = Object.assign({}, all);
          if (cloud && typeof cloud === 'object') {
            Object.keys(cloud).forEach(key => {
              const remote = Array.isArray(cloud[key]) ? cloud[key] : [];
              const local  = merged[key] || [];
              merged[key]  = [...local, ...remote]
                .filter((e, i, arr) => arr.findIndex(x => x.n === e.n && x.s === e.s) === i)
                .sort((a, b) => b.s - a.s)
                .slice(0, MAX);
            });
          }
          return fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
            body: JSON.stringify(merged)
          });
        })
        .catch(() => {});
      } else {
        // Create bin on first push
        fetch('https://api.jsonbin.io/v3/b', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
            'X-Bin-Name': "Finn's Arcade Leaderboard",
            'X-Bin-Private': 'false'
          },
          body: JSON.stringify(all)
        }).then(r => r.json()).then(d => {
          if (d.metadata && d.metadata.id) {
            localStorage.setItem('hs_cloud_bin_id', d.metadata.id);
            console.log('✅ Leaderboard bin created! ID:', d.metadata.id,
              '\nPaste this into JSONBIN_BIN_ID in leaderboard.js so all devices sync.');
          }
        }).catch(() => {});
      }
    } catch {}
  },

  /**
   * Pull cloud scores and merge into localStorage (cloud wins ties with higher score).
   * Returns a Promise that resolves when done (or immediately if cloud disabled).
   */
  _cloudPull() {
    if (!CLOUD_ENABLED) return Promise.resolve();
    const binId = JSONBIN_BIN_ID !== 'REPLACE_WITH_YOUR_BIN_ID'
      ? JSONBIN_BIN_ID
      : localStorage.getItem('hs_cloud_bin_id');
    if (!binId) return Promise.resolve();
    return fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY, 'X-Bin-Meta': 'false' }
    })
    .then(r => r.json())
    .then(cloud => {
      // cloud is an object: { gameKey: [{n,s}, ...], ... }
      if (!cloud || typeof cloud !== 'object') return;
      Object.keys(cloud).forEach(key => {
        const remote = Array.isArray(cloud[key]) ? cloud[key] : [];
        if (!remote.length) return;
        const local  = this.get(key);
        // Merge: combine both lists, deduplicate by n+s, keep top MAX
        const merged = [...local, ...remote]
          .filter((e, i, arr) => arr.findIndex(x => x.n === e.n && x.s === e.s) === i)
          .sort((a, b) => b.s - a.s)
          .slice(0, this.MAX);
        try { localStorage.setItem('hs_' + key, JSON.stringify(merged)); } catch {}
      });
    })
    .catch(() => {});
  },

  /** Auto-inject a fixed in-game Home button when the DOM is ready. */
  _injectHomeBtn() {
    const inject = () => {
      if (document.getElementById('_hs_home_btn')) return;
      const btn = document.createElement('button');
      btn.id = '_hs_home_btn';
      btn.textContent = '🏠';
      btn.title = 'Back to Finn\'s Arcade';
      btn.setAttribute('style',
        'position:fixed;top:10px;left:10px;z-index:999;' +
        'width:42px;height:42px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);' +
        'background:rgba(0,0,0,0.55);color:#fff;font-size:1.2rem;' +
        'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:background 0.15s,transform 0.1s;' +
        'touch-action:manipulation;-webkit-tap-highlight-color:transparent;'
      );
      btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(0,0,0,0.8)');
      btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(0,0,0,0.55)');
      btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.9)', { passive: true });
      btn.addEventListener('touchend',   () => btn.style.transform = 'scale(1)',   { passive: true });
      btn.addEventListener('click', () => { window.location.href = 'index.html'; });
      document.body.appendChild(btn);
    };
    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  },

  /** Returns sorted array of {n, s} objects (name, score). */
  get(key) {
    try { return JSON.parse(localStorage.getItem('hs_' + key) || '[]'); }
    catch { return []; }
  },

  /** Returns true if score qualifies for the top-10. */
  isTop(key, score) {
    if (score <= 0) return false;
    const list = this.get(key);
    return list.length < this.MAX || score > list[list.length - 1].s;
  },

  /** Adds a score entry and persists. Returns updated sorted list. */
  add(key, name, score) {
    const list = this.get(key);
    const clean = (name + '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || '???';
    list.push({ n: clean, s: score });
    list.sort((a, b) => b.s - a.s);
    if (list.length > this.MAX) list.length = this.MAX;
    try { localStorage.setItem('hs_' + key, JSON.stringify(list)); } catch {}
    // Push all scores to cloud
    this._cloudPush();
    return list;
  },

  /** Returns the #1 score entry, or null. */
  top1(key) {
    const list = this.get(key);
    return list.length ? list[0] : null;
  },

  /**
   * Returns an HTML string for the leaderboard table.
   * @param {string} key  - game key
   * @param {string} hiColor - accent color for scores (e.g. '#ffd700')
   * @param {number|null} highlightScore - score to highlight as "NEW"
   */
  tableHTML(key, hiColor, highlightScore) {
    const list = this.get(key);
    const c = hiColor || '#ffd700';
    if (!list.length) {
      return `<p style="color:#666;font-size:0.85rem;margin:8px 0">No high scores yet – be the first!</p>`;
    }
    const medals = ['🥇', '🥈', '🥉'];
    const rows = list.map((e, i) => {
      const isNew = highlightScore !== null && e.s === highlightScore && i === list.findIndex(x => x.s === highlightScore);
      const rowBg = isNew ? 'rgba(255,215,0,0.12)' : (i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent');
      const rankCol = i === 0 ? '#ffd700' : i === 1 ? '#ccc' : i === 2 ? '#cd7f32' : '#666';
      const safeName  = (e.n  + '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || '???';
      const safeScore = parseInt(e.s, 10) || 0;
      return `<tr style="background:${rowBg}">
        <td style="padding:3px 8px;text-align:center;color:${rankCol};font-size:1rem">${medals[i] || (i + 1)}</td>
        <td style="padding:3px 12px;font-weight:900;letter-spacing:3px;color:#fff;font-size:1rem">${safeName}</td>
        <td style="padding:3px 10px;color:${c};font-weight:900;font-size:1rem;text-align:right">${safeScore}</td>
        ${isNew ? '<td style="padding:3px 6px;color:#ffd700;font-size:0.7rem;font-weight:900">NEW!</td>' : '<td></td>'}
      </tr>`;
    }).join('');

    return `<table style="border-collapse:collapse;margin:4px auto;font-family:monospace;min-width:220px">
      <thead><tr>
        <th style="color:#555;font-size:0.7rem;padding:2px 8px;text-align:center">#</th>
        <th style="color:#555;font-size:0.7rem;padding:2px 12px;text-align:left">NAME</th>
        <th style="color:#555;font-size:0.7rem;padding:2px 10px;text-align:right">SCORE</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  },

  /**
   * Shows the game-over high-score flow inside a given overlay element.
   * Replaces the overlay innerHTML with score, optional initials input, leaderboard, and a restart button.
   *
   * @param {object} opts
   *   key         {string}   - game key for localStorage
   *   score       {number}   - current score
   *   overlayEl   {Element}  - the overlay DOM element
   *   title       {string}   - headline text (HTML allowed)
   *   subtitle    {string}   - sub-text below the title
   *   btnLabel    {string}   - label for the restart button
   *   onRestart   {Function} - called when restart is clicked
   *   hiColor     {string}   - accent colour for scores
   *   titleStyle  {string}   - extra inline CSS for the h2
   *   btnStyle    {string}   - extra inline CSS for the button
   *   btnClass    {string}   - CSS class for the button
   */
  /** Creates a small "🏠 Home" button that navigates to index.html */
  _homeBtn() {
    const btn = document.createElement('button');
    btn.textContent = '🏠 Home';
    btn.setAttribute('style',
      'margin-top:8px;padding:7px 22px;font-size:0.95rem;font-weight:900;letter-spacing:1px;' +
      'background:rgba(255,255,255,0.1);color:#ccc;border:1px solid #444;border-radius:30px;' +
      'cursor:pointer;font-family:inherit;transition:background 0.15s'
    );
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.2)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.1)');
    btn.addEventListener('click', () => { window.location.href = 'index.html'; });
    return btn;
  },

  showGameOver(opts) {
    const {
      key, score, overlayEl, title, subtitle,
      btnLabel = '▶ TRY AGAIN!',
      onRestart,
      hiColor = '#ffd700',
      titleStyle = '',
      btnStyle = '',
      btnClass = 'play-btn'
    } = opts;

    const isHi = this.isTop(key, score);
    overlayEl.style.display = 'flex';

    // Pull cloud scores so in-game leaderboard shows all players, not just local
    this._cloudPull().then(() => {
      const lbEl = document.getElementById('_hs_lb');
      if (lbEl) lbEl.innerHTML = this.tableHTML(key, hiColor, null);
    });

    if (isHi && score > 0) {
      overlayEl.innerHTML = `
        <h2 style="${titleStyle}">${title}</h2>
        <p style="color:${hiColor};font-size:1.4rem;font-weight:900;font-family:monospace;letter-spacing:2px;margin:4px 0">SCORE: ${score}</p>
        <p style="color:#ffd700;font-size:1rem;margin:6px 0">🏆 NEW HIGH SCORE!</p>
        <p style="color:#aaa;font-size:0.85rem;margin-bottom:6px">Enter your initials (3 chars):</p>
        <div id="_hs_row" style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <input id="_hs_ini" maxlength="3" autocomplete="off" autocapitalize="characters"
            style="font-size:2rem;width:96px;text-align:center;text-transform:uppercase;
                   background:rgba(0,0,0,0.6);color:#ffd700;border:2px solid #ffd700;
                   border-radius:8px;padding:4px 8px;letter-spacing:6px;font-family:monospace;outline:none">
          <button id="_hs_save" class="${btnClass}"
            style="${btnStyle}padding:8px 18px;font-size:1.2rem;margin:0">✓ SAVE</button>
        </div>
        <div id="_hs_lb" style="margin:4px 0 8px">${this.tableHTML(key, hiColor, null)}</div>
      `;

      const ini = document.getElementById('_hs_ini');
      const saveBtn = document.getElementById('_hs_save');

      const doSave = () => {
        const name = ini.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || '???';
        this.add(key, name, score);
        document.getElementById('_hs_row').remove();
        document.getElementById('_hs_lb').innerHTML = this.tableHTML(key, hiColor, score);
        const btn = document.createElement('button');
        btn.className = btnClass;
        btn.setAttribute('style', btnStyle);
        btn.textContent = btnLabel;
        btn.addEventListener('click', () => { overlayEl.style.display = 'none'; onRestart(); });
        overlayEl.appendChild(btn);
        overlayEl.appendChild(this._homeBtn());
        // Notify index page to refresh scores
        try { localStorage.setItem('hs_updated', Date.now()); } catch {}
      };

      saveBtn.addEventListener('click', doSave);
      ini.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
      // Auto-uppercase as user types
      ini.addEventListener('input', () => { ini.value = ini.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      setTimeout(() => ini.focus(), 80);

    } else {
      overlayEl.innerHTML = `
        <h2 style="${titleStyle}">${title}</h2>
        <p style="color:${hiColor};font-size:1.4rem;font-weight:900;font-family:monospace;letter-spacing:2px;margin:4px 0">SCORE: ${score}</p>
        ${subtitle ? `<p style="color:#aaa;margin:4px 0">${subtitle}</p>` : ''}
        <p style="color:${hiColor};font-size:0.9rem;font-weight:900;margin:10px 0 4px;letter-spacing:1px">🏆 LEADERBOARD</p>
        <div id="_hs_lb">${this.tableHTML(key, hiColor, null)}</div>
      `;
      const btn = document.createElement('button');
      btn.className = btnClass;
      btn.setAttribute('style', (btnStyle || '') + 'margin-top:12px');
      btn.textContent = btnLabel;
      btn.addEventListener('click', () => { overlayEl.style.display = 'none'; onRestart(); });
      overlayEl.appendChild(btn);
      overlayEl.appendChild(this._homeBtn());
    }
  }
};

HS._injectHomeBtn();
