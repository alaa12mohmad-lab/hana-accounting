// ════════════════════════════════════════════════════════════════
// THEMES — نظام الثيمات والألوان
// ════════════════════════════════════════════════════════════════

const THEMES = {
  default: { label: 'أزرق داكن',  icon: '🔵', desc: 'الثيم الافتراضي الكلاسيكي'  },
  green:   { label: 'أخضر',       icon: '🟢', desc: 'هادئ ومريح للعين'            },
  purple:  { label: 'بنفسجي',     icon: '🟣', desc: 'أنيق وعصري'                  },
  slate:   { label: 'رمادي',      icon: '⚫', desc: 'محايد واحترافي'               },
  rose:    { label: 'وردي',       icon: '🔴', desc: 'دافئ ومميّز'                  },
  dark:    { label: 'داكن',       icon: '🌙', desc: 'مريح في الإضاءة المنخفضة'    },
};

const THEME_KEY = 'hana_theme';

// ── Apply theme ──────────────────────────────────────────────────
function applyTheme(name) {
  const theme = THEMES[name] ? name : 'default';
  document.documentElement.setAttribute('data-theme', theme === 'default' ? '' : theme);
  localStorage.setItem(THEME_KEY, theme);
  // Update active state in UI
  document.querySelectorAll('.theme-card').forEach(card => {
    const active = card.dataset.theme === theme;
    card.style.outline = active ? '3px solid var(--brand)' : '2px solid var(--border)';
    card.style.transform = active ? 'scale(1.03)' : 'scale(1)';
  });
}

// ── Load saved theme on startup ──────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'default';
  applyTheme(saved);
}

// ── Render theme picker ───────────────────────────────────────────
function renderThemePicker() {
  const current = localStorage.getItem(THEME_KEY) || 'default';
  const cards = Object.entries(THEMES).map(([key, t]) => {
    const active  = key === current;
    const preview = getThemePreview(key);
    return `
      <div class="theme-card"
        data-theme="${key}"
        onclick="applyTheme('${key}')"
        style="
          cursor:pointer;
          border-radius:12px;
          overflow:hidden;
          outline:${active ? '3px solid var(--brand)' : '2px solid var(--border)'};
          transform:${active ? 'scale(1.03)' : 'scale(1)'};
          transition:all .2s;
          background:var(--bg-card);
        ">
        <!-- Preview -->
        <div style="height:70px;${preview};position:relative;overflow:hidden">
          <div style="position:absolute;top:8px;right:8px;left:8px;height:12px;background:rgba(255,255,255,.3);border-radius:6px"></div>
          <div style="position:absolute;top:26px;right:8px;width:40%;height:8px;background:rgba(255,255,255,.5);border-radius:4px"></div>
          <div style="position:absolute;top:40px;right:8px;left:8px;height:6px;background:rgba(255,255,255,.2);border-radius:3px"></div>
          <div style="position:absolute;top:52px;right:8px;width:60%;height:6px;background:rgba(255,255,255,.2);border-radius:3px"></div>
          ${active ? '<div style="position:absolute;top:6px;left:6px;background:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px">✓</div>' : ''}
        </div>
        <!-- Label -->
        <div style="padding:10px;text-align:center">
          <div style="font-size:18px;margin-bottom:3px">${t.icon}</div>
          <div style="font-size:12px;font-weight:700;color:var(--text)">${t.label}</div>
          <div style="font-size:10px;color:var(--text-gray);margin-top:2px">${t.desc}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="section-title">🎨 الثيم والألوان</div>
      <p class="text-xs text-gray mb12">اختر الثيم المناسب لك — يُحفظ تلقائياً</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px">
        ${cards}
      </div>
      <div class="alert alert-blue mt12" style="font-size:11px">
        <span>💡</span>
        <span>تلميح: ثيم <strong>داكن 🌙</strong> مريح جداً للعمل الليلي</span>
      </div>
    </div>`;
}

function getThemePreview(key) {
  const previews = {
    default: 'background:linear-gradient(135deg,#1a2d45,#1F4E78)',
    dark:    'background:linear-gradient(135deg,#0f172a,#1e293b)',
    green:   'background:linear-gradient(135deg,#064e3b,#059669)',
    purple:  'background:linear-gradient(135deg,#2e1065,#7c3aed)',
    slate:   'background:linear-gradient(135deg,#0f172a,#475569)',
    rose:    'background:linear-gradient(135deg,#4c0519,#e11d48)',
  };
  return previews[key] || previews.default;
}
