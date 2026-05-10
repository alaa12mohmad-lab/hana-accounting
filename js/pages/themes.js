// ════════════════════════════════════════════════════════════════
// THEMES PAGE — صفحة الثيمات والألوان
// ════════════════════════════════════════════════════════════════

var THEMES_LIST = [
  {k:'default', label:'أزرق داكن', icon:'🔵', desc:'الثيم الافتراضي الكلاسيكي',
   sidebar:'linear-gradient(180deg,#1a2d45,#1F4E78)', accent:'#1F4E78'},
  {k:'dark',    label:'داكن',       icon:'🌙', desc:'مريح في الإضاءة المنخفضة',
   sidebar:'linear-gradient(180deg,#0f172a,#1e293b)', accent:'#3b82f6'},
  {k:'green',   label:'أخضر',       icon:'🟢', desc:'هادئ ومريح للعين',
   sidebar:'linear-gradient(180deg,#064e3b,#059669)', accent:'#059669'},
  {k:'purple',  label:'بنفسجي',     icon:'🟣', desc:'أنيق وعصري',
   sidebar:'linear-gradient(180deg,#2e1065,#7c3aed)', accent:'#7c3aed'},
  {k:'slate',   label:'رمادي',      icon:'⚫', desc:'محايد واحترافي',
   sidebar:'linear-gradient(180deg,#0f172a,#475569)', accent:'#475569'},
  {k:'rose',    label:'وردي',       icon:'🔴', desc:'دافئ ومميّز',
   sidebar:'linear-gradient(180deg,#4c0519,#e11d48)', accent:'#e11d48'},
];

window.applyTheme = function(key) {
  if (key === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', key);
  }
  localStorage.setItem('hana_theme', key);
  var t = THEMES_LIST.find(function(x){return x.k===key;}) || THEMES_LIST[0];
  // Update sidebar background immediately
  var sb = document.getElementById('sidebar');
  if (sb) sb.style.background = t.sidebar;
  // Refresh theme page if open
  var active = document.querySelector('.sb-link.active');
  if (active && active.getAttribute('onclick') && active.getAttribute('onclick').indexOf('themes') > -1) {
    setTimeout(function(){ nav('themes'); }, 50);
  }
  if (typeof toast === 'function') toast('🎨 تم تطبيق ثيم ' + t.label);
};

// Apply saved theme on load
(function(){
  var saved = localStorage.getItem('hana_theme');
  if (saved && saved !== 'default') {
    document.documentElement.setAttribute('data-theme', saved);
    var t = THEMES_LIST.find(function(x){return x.k===saved;});
    if (t) {
      var sb = document.getElementById('sidebar');
      if (sb) sb.style.background = t.sidebar;
    }
  }
})();

function renderThemes() {
  var cur = localStorage.getItem('hana_theme') || 'default';
  var html = '<div>';

  // Header
  html += '<div class="page-header">'
    + '<div><div class="section-title" style="margin:0">🎨 الثيم والألوان</div>'
    + '<p class="text-xs text-gray mt4">اضغط على أي ثيم لتطبيقه فوراً — يُحفظ تلقائياً</p></div>'
    + '</div>';

  // Theme cards
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:20px">';

  THEMES_LIST.forEach(function(t) {
    var active = t.k === cur;
    html += '<div onclick="applyTheme(\'' + t.k + '\')" style="'
      + 'cursor:pointer;border-radius:14px;overflow:hidden;'
      + 'outline:' + (active ? '4px solid ' + t.accent : '2px solid #e2e8f0') + ';'
      + 'transform:' + (active ? 'scale(1.04)' : 'scale(1)') + ';'
      + 'box-shadow:' + (active ? '0 8px 24px rgba(0,0,0,.15)' : '0 2px 8px rgba(0,0,0,.06)') + ';'
      + 'transition:all .25s;background:#fff">'

      // Preview bar (sidebar simulation)
      + '<div style="display:flex;height:90px">'

      // Mini sidebar
      + '<div style="width:40px;background:' + t.sidebar + ';display:flex;flex-direction:column;align-items:center;padding:8px 4px;gap:4px">'
      + '<div style="width:24px;height:4px;background:rgba(255,255,255,.8);border-radius:2px"></div>'
      + '<div style="width:20px;height:3px;background:rgba(255,255,255,.4);border-radius:2px"></div>'
      + '<div style="width:20px;height:3px;background:rgba(255,255,255,.4);border-radius:2px"></div>'
      + '<div style="width:20px;height:3px;background:rgba(255,255,255,.6);border-radius:2px"></div>'
      + '<div style="width:20px;height:3px;background:rgba(255,255,255,.4);border-radius:2px"></div>'
      + '</div>'

      // Mini content
      + '<div style="flex:1;padding:8px;background:#f8fafc;display:flex;flex-direction:column;gap:4px">'
      + '<div style="height:8px;background:' + t.accent + ';border-radius:4px;width:60%"></div>'
      + '<div style="height:6px;background:#e2e8f0;border-radius:3px"></div>'
      + '<div style="height:6px;background:#e2e8f0;border-radius:3px;width:80%"></div>'
      + '<div style="height:16px;background:' + t.accent + '22;border-radius:4px;margin-top:4px"></div>'
      + '</div>'
      + '</div>'

      // Label
      + '<div style="padding:12px;background:#fff;text-align:center;border-top:1px solid #f1f5f9">'
      + '<div style="font-size:22px;margin-bottom:4px">' + t.icon + '</div>'
      + '<div style="font-size:13px;font-weight:700;color:#1a202c">' + t.label + '</div>'
      + '<div style="font-size:10px;color:#64748b;margin-top:2px">' + t.desc + '</div>'
      + (active
          ? '<div style="margin-top:6px;background:' + t.accent + ';color:#fff;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;display:inline-block">✓ مُطبَّق</div>'
          : '')
      + '</div>'
      + '</div>';
  });

  html += '</div>';

  // Tips
  html += '<div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0">'
    + '<div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:8px">💡 نصائح</div>'
    + '<ul style="font-size:11px;color:#15803d;line-height:1.8;padding-right:16px;margin:0">'
    + '<li>ثيم <strong>داكن 🌙</strong> يقلل إجهاد العين عند العمل الليلي</li>'
    + '<li>ثيم <strong>أخضر 🟢</strong> هو الأكثر راحةً للعيون بشكل عام</li>'
    + '<li>الثيم يُحفظ تلقائياً ويُطبَّق في كل زيارة</li>'
    + '<li>يمكن تغيير الثيم في أي وقت بدون فقدان البيانات</li>'
    + '</ul>'
    + '</div>';

  html += '</div>';
  return html;
}
