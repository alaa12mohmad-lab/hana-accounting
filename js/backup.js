// ════════════════════════════════════════════════════════════════
// BACKUP SYSTEM — نظام النسخ الاحتياطي المتكامل
// قاعدة 3-2-1: Firebase + IndexedDB + ملف محلي
// ════════════════════════════════════════════════════════════════

var BACKUP_DB_NAME    = 'hana_backups';
var BACKUP_STORE      = 'snapshots';
var BACKUP_MAX_COPIES = 7;          // آخر 7 نسخ
var BACKUP_INTERVAL   = 24 * 60 * 60 * 1000; // كل 24 ساعة
var BACKUP_WARN_DAYS  = 3;          // تحذير إذا مضى 3 أيام
var _idb              = null;

// ── Open IndexedDB ────────────────────────────────────────────
function openBackupDB(){
  return new Promise(function(resolve, reject){
    if(_idb){ resolve(_idb); return; }
    var req = indexedDB.open(BACKUP_DB_NAME, 1);
    req.onupgradeneeded = function(e){
      var db = e.target.result;
      if(!db.objectStoreNames.contains(BACKUP_STORE)){
        db.createObjectStore(BACKUP_STORE, {keyPath:'id', autoIncrement:true});
      }
    };
    req.onsuccess = function(e){ _idb=e.target.result; resolve(_idb); };
    req.onerror   = function(e){ reject(e); };
  });
}

// ── Save snapshot to IndexedDB ────────────────────────────────
async function saveBackupToDB(label){
  try{
    var data  = DB.exportJSON();
    var snap  = {
      label:     label || 'تلقائي',
      data:      data,
      timestamp: Date.now(),
      size:      data.length,
      records:   countRecords(JSON.parse(data)),
    };
    var db    = await openBackupDB();
    var tx    = db.transaction(BACKUP_STORE,'readwrite');
    var store = tx.objectStore(BACKUP_STORE);
    store.add(snap);

    // Keep only last N copies
    var all = await getAllBackups();
    if(all.length > BACKUP_MAX_COPIES){
      var toDelete = all.slice(0, all.length - BACKUP_MAX_COPIES);
      var tx2 = db.transaction(BACKUP_STORE,'readwrite');
      var st2 = tx2.objectStore(BACKUP_STORE);
      toDelete.forEach(function(s){ st2.delete(s.id); });
    }

    localStorage.setItem('hana_last_backup', Date.now().toString());
    return snap;
  }catch(e){
    console.error('Backup save failed:', e);
    return null;
  }
}

// ── Get all backups ───────────────────────────────────────────
function getAllBackups(){
  return new Promise(function(resolve, reject){
    openBackupDB().then(function(db){
      var tx    = db.transaction(BACKUP_STORE,'readonly');
      var store = tx.objectStore(BACKUP_STORE);
      var req   = store.getAll();
      req.onsuccess = function(){ resolve(req.result||[]); };
      req.onerror   = function(){ resolve([]); };
    }).catch(function(){ resolve([]); });
  });
}

// ── Restore from backup ───────────────────────────────────────
async function restoreBackup(id){
  var db    = await openBackupDB();
  var tx    = db.transaction(BACKUP_STORE,'readonly');
  var store = tx.objectStore(BACKUP_STORE);
  return new Promise(function(resolve, reject){
    var req = store.get(id);
    req.onsuccess = function(){
      if(req.result) resolve(req.result);
      else reject(new Error('النسخة غير موجودة'));
    };
    req.onerror = reject;
  });
}

// ── Download backup as JSON file ──────────────────────────────
function downloadBackup(data, label){
  var d    = new Date();
  var name = 'hana-backup-'
    + d.getFullYear() + '-'
    + String(d.getMonth()+1).padStart(2,'0') + '-'
    + String(d.getDate()).padStart(2,'0')
    + (label?'-'+label:'')
    + '.json';
  var blob = new Blob([data||DB.exportJSON()], {type:'application/json'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem('hana_last_backup', Date.now().toString());
}

// ── Count records helper ──────────────────────────────────────
function countRecords(parsed){
  var n = 0;
  var cols=['sarkis','journal','expenses','cheques','statements','notes'];
  cols.forEach(function(c){ if(parsed[c]) n+=parsed[c].length; });
  return n;
}

// ── Auto backup on startup ────────────────────────────────────
async function autoBackupCheck(){
  var last  = parseInt(localStorage.getItem('hana_last_backup')||'0');
  var hours = Math.floor((Date.now()-last)/3600000);
  if(hours >= 24){
    // Auto-save to IndexedDB silently
    var snap = await saveBackupToDB('تلقائي');
    if(snap) console.log('✅ Auto backup saved:', snap.records, 'records');
  }
}

// ── Days since last backup ────────────────────────────────────
function daysSinceBackup(){
  var last = parseInt(localStorage.getItem('hana_last_backup')||'0');
  if(!last) return null;
  return Math.floor((Date.now()-last)/86400000);
}

// ════════════════════════════════════════════════════════════════
// BACKUP PAGE UI
// ════════════════════════════════════════════════════════════════
function renderBackup(){
  setTimeout(loadBackupPage, 100);
  return '<div id="backup-page-container">'
    +'<div style="text-align:center;padding:40px;color:#94a3b8">'
    +'<div style="font-size:32px">⏳</div><p class="mt4">جاري التحميل...</p>'
    +'</div></div>';
}

async function loadBackupPage(){
  var el = document.getElementById('backup-page-container');
  if(!el) return;

  var backups = await getAllBackups();
  backups = backups.slice().reverse(); // newest first
  var days = daysSinceBackup();
  var co   = DB.getCompany();
  var data = DB.exportJSON();
  var parsed = JSON.parse(data);
  var totalRec = countRecords(parsed);

  el.innerHTML =
    // ── Status card
    '<div class="card mb12" style="border-top:3px solid '+(days===null||days>=3?'#ef4444':'#16a34a')+'">'
    +'<div class="flex-between mb10">'
    +'<div class="section-title" style="margin:0">💾 حالة النسخ الاحتياطي</div>'
    +'<span style="background:'+(days===null||days>=3?'#fef2f2':'#f0fdf4')+';color:'+(days===null||days>=3?'#dc2626':'#16a34a')+';padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">'
    +(days===null?'⚠️ لا توجد نسخة':days===0?'✅ محدّثة اليوم':days>=3?'❌ منذ '+days+' أيام':'✅ منذ '+days+' يوم')
    +'</span></div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:14px">'
    +'<div class="card-sm text-center"><div class="text-xs text-gray mb4">السجلات</div><div style="font-size:20px;font-weight:700;color:#1F4E78">'+totalRec+'</div></div>'
    +'<div class="card-sm text-center"><div class="text-xs text-gray mb4">الحجم</div><div style="font-size:20px;font-weight:700;color:#1F4E78">'+Math.round(data.length/1024)+' KB</div></div>'
    +'<div class="card-sm text-center"><div class="text-xs text-gray mb4">النسخ المحفوظة</div><div style="font-size:20px;font-weight:700;color:#1F4E78">'+backups.length+'</div></div>'
    +'<div class="card-sm text-center"><div class="text-xs text-gray mb4">أقصى نسخ</div><div style="font-size:20px;font-weight:700;color:#1F4E78">'+BACKUP_MAX_COPIES+'</div></div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-primary" onclick="manualBackup()">'
    +'<span>💾</span> نسخ احتياطي الآن</button>'
    +'<button class="btn btn-green" onclick="downloadBackup(null,\'manual\')">'
    +'<span>⬇️</span> تنزيل ملف JSON</button>'
    +'<button class="btn btn-gray" onclick="exportBackupExcel()">'
    +'<span>📊</span> تصدير Excel</button>'
    +'</div></div>'

    // ── Backup history
    +'<div class="card mb12">'
    +'<div class="section-title">📋 سجل النسخ الاحتياطية</div>'
    +'<p class="text-xs text-gray mb10">آخر '+BACKUP_MAX_COPIES+' نسخ محفوظة تلقائياً في المتصفح — مستقلة عن Firebase</p>'
    +(backups.length===0
      ? '<div style="text-align:center;padding:20px;color:#94a3b8"><div style="font-size:28px">📭</div><p>لا توجد نسخ محفوظة بعد — اضغط "نسخ احتياطي الآن"</p></div>'
      : '<div class="tbl-wrap"><table>'
        +'<thead><tr><th>التاريخ والوقت</th><th>النوع</th><th>السجلات</th><th>الحجم</th><th>إجراء</th></tr></thead>'
        +'<tbody>'
        +backups.map(function(b){
          var d=new Date(b.timestamp);
          var dateStr=d.toLocaleDateString('ar-EG')+' '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
          return '<tr>'
            +'<td class="text-xs">'+dateStr+'</td>'
            +'<td>'+(b.label==='تلقائي'
              ? '<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:10px">🤖 تلقائي</span>'
              : '<span style="background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:10px">👤 يدوي</span>')+'</td>'
            +'<td class="font-bold">'+b.records+'</td>'
            +'<td class="text-xs text-gray">'+Math.round(b.size/1024)+' KB</td>'
            +'<td><div style="display:flex;gap:4px">'
            +'<button class="btn btn-xs" style="background:#1F4E78;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:10px;font-family:inherit" onclick="downloadSavedBackup('+b.id+')">⬇️ تنزيل</button>'
            +'<button class="btn btn-xs" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:10px;font-family:inherit" onclick="restoreFromBackup('+b.id+')">🔄 استعادة</button>'
            +'</div></td>'
            +'</tr>';
        }).join('')
        +'</tbody></table></div>')
    +'</div>'

    // ── Restore from file
    +'<div class="card mb12">'
    +'<div class="section-title">📥 استعادة من ملف</div>'
    +'<p class="text-xs text-gray mb10">استعادة نسخة احتياطية محفوظة مسبقاً (ملف JSON)</p>'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    +'<input type="file" id="restore-file" accept=".json" style="flex:1;min-width:200px">'
    +'<button class="btn btn-orange" onclick="restoreFromFile()">📥 استعادة من الملف</button>'
    +'</div>'
    +'<div class="alert alert-yellow mt10" style="font-size:11px">'
    +'<span>⚠️</span><span>الاستعادة ستستبدل جميع البيانات الحالية — تأكد من عمل نسخة احتياطية أولاً</span>'
    +'</div></div>'

    // ── Dual Firebase
    +(typeof renderBackupFBSettings==='function' ? renderBackupFBSettings() : '')

    // ── Tips
    +'<div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0">'
    +'<div class="section-title" style="color:#166534">💡 نصائح حماية البيانات</div>'
    +'<ul style="font-size:11px;color:#15803d;line-height:2;padding-right:16px;margin:0">'
    +'<li>النظام يحفظ نسخة تلقائية كل 24 ساعة في المتصفح</li>'
    +'<li>احتفظ بنسخة JSON أسبوعية في مكان آمن (Google Drive / USB)</li>'
    +'<li>Firebase Firestore تحمي من فقدان البيانات بسبب الأعطال التقنية</li>'
    +'<li>الخطر الأكبر هو الحذف العرضي — النسخ المحلية تحميك منه</li>'
    +'<li>آخر '+BACKUP_MAX_COPIES+' نسخ محفوظة في المتصفح حتى بدون إنترنت</li>'
    +'</ul></div>';
}

// ── Manual backup ─────────────────────────────────────────────
window.manualBackup = async function(){
  if(typeof toast==='function') toast('⏳ جاري حفظ النسخة...','info');
  var snap = await saveBackupToDB('يدوي');
  if(snap){
    if(typeof toast==='function') toast('✅ تم حفظ النسخة — '+snap.records+' سجل');
    loadBackupPage();
  } else {
    if(typeof toast==='function') toast('❌ فشل الحفظ','error');
  }
};

window.downloadSavedBackup = async function(id){
  try{
    var snap = await restoreBackup(id);
    downloadBackup(snap.data, new Date(snap.timestamp).toISOString().slice(0,10));
    if(typeof toast==='function') toast('✅ تم تنزيل النسخة');
  }catch(e){ if(typeof toast==='function') toast('❌ '+e.message,'error'); }
};

window.restoreFromBackup = async function(id){
  if(!confirm('استعادة هذه النسخة؟\n⚠️ سيتم استبدال جميع البيانات الحالية')) return;
  try{
    var snap = await restoreBackup(id);
    if(typeof toast==='function') toast('⏳ جاري الاستعادة...','info');
    await DB.importJSON(snap.data);
    if(typeof toast==='function') toast('✅ تمت الاستعادة بنجاح');
    if(typeof nav==='function') nav('dashboard');
  }catch(e){ if(typeof toast==='function') toast('❌ '+e.message,'error'); }
};

window.restoreFromFile = async function(){
  var file = document.getElementById('restore-file')?.files[0];
  if(!file){ if(typeof toast==='function') toast('اختر ملفاً أولاً','error'); return; }
  if(!file.name.endsWith('.json')){ if(typeof toast==='function') toast('يجب أن يكون الملف JSON','error'); return; }
  if(!confirm('استعادة من الملف؟\n⚠️ سيتم استبدال جميع البيانات الحالية')) return;
  var reader = new FileReader();
  reader.onload = async function(e){
    try{
      if(typeof toast==='function') toast('⏳ جاري الاستعادة...','info');
      await DB.importJSON(e.target.result);
      if(typeof toast==='function') toast('✅ تمت الاستعادة بنجاح');
      if(typeof nav==='function') nav('dashboard');
    }catch(err){ if(typeof toast==='function') toast('❌ الملف غير صحيح: '+err.message,'error'); }
  };
  reader.readAsText(file);
};

window.exportBackupExcel = function(){
  if(typeof exportToExcel==='function') exportToExcel();
  else if(typeof toast==='function') toast('قيد التطوير','error');
};

// ── Initialize backup system on startup ──────────────────────
window.initBackupSystem = async function(){
  await autoBackupCheck();
  // Show warning if no recent backup
  var days = daysSinceBackup();
  if(days === null || days >= BACKUP_WARN_DAYS){
    setTimeout(function(){
      showBackupWarning(days);
    }, 3000);
  }
};

function showBackupWarning(days){
  if(document.getElementById('backup-warn')) return;
  var bar = document.createElement('div');
  bar.id  = 'backup-warn';
  bar.style.cssText='position:fixed;bottom:'+(document.getElementById('pwa-banner')?'65px':'0')+';left:0;right:0;'
    +'background:linear-gradient(135deg,#92400e,#d97706);color:#fff;padding:10px 16px;'
    +'display:flex;align-items:center;justify-content:space-between;z-index:9996;'
    +'font-family:Tahoma,sans-serif;direction:rtl;gap:8px;font-size:12px;';
  bar.innerHTML='<div style="display:flex;align-items:center;gap:8px">'
    +'<span style="font-size:18px">⚠️</span>'
    +'<span>'+(days===null?'لم تقم بأي نسخة احتياطية بعد!':'آخر نسخة احتياطية منذ '+days+' أيام')+'</span>'
    +'</div>'
    +'<div style="display:flex;gap:6px">'
    +'<button onclick="manualBackup();this.closest(\'#backup-warn\').remove()" '
    +'style="background:#fff;color:#92400e;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700">'
    +'💾 نسخ الآن</button>'
    +'<button onclick="nav(\'backup\')" '
    +'style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;font-size:11px">'
    +'عرض</button>'
    +'<button onclick="this.closest(\'#backup-warn\').remove()" '
    +'style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;padding:0 4px">×</button>'
    +'</div>';
  document.body.appendChild(bar);
}
