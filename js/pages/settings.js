function buildThemeHTML(){
  var themes = [
    {k:'default', label:'أزرق داكن', icon:'🔵', desc:'الافتراضي', bg:'#1F4E78'},
    {k:'dark',    label:'داكن',       icon:'🌙', desc:'مريح ليلاً', bg:'#1e293b'},
    {k:'green',   label:'أخضر',       icon:'🟢', desc:'هادئ للعين', bg:'#059669'},
    {k:'purple',  label:'بنفسجي',     icon:'🟣', desc:'أنيق',       bg:'#7c3aed'},
    {k:'slate',   label:'رمادي',      icon:'⚫', desc:'محايد',      bg:'#475569'},
    {k:'rose',    label:'وردي',       icon:'🔴', desc:'دافئ',       bg:'#e11d48'},
  ];
  var cur = localStorage.getItem('hana_theme') || 'default';
  var cards = '';
  themes.forEach(function(t){
    var active = t.k === cur;
    var border = active ? '3px solid '+t.bg : '2px solid #e2e8f0';
    var scale  = active ? 'scale(1.05)' : 'scale(1)';
    var check  = active ? '<div style="position:absolute;top:4px;left:4px;background:#fff;border-radius:50%;width:16px;height:16px;text-align:center;line-height:16px;font-size:10px;font-weight:700;color:#16a34a">✓</div>' : '';
    cards += '<div onclick="applyTheme(\'' + t.k + '\')" style="cursor:pointer;border-radius:10px;overflow:hidden;outline:' + border + ';transform:' + scale + ';transition:all .2s;background:#fff">'
      + '<div style="height:55px;background:' + t.bg + ';position:relative">' + check + '</div>'
      + '<div style="padding:8px;text-align:center">'
      + '<div style="font-size:15px">' + t.icon + '</div>'
      + '<div style="font-size:10px;font-weight:700;margin-top:2px">' + t.label + '</div>'
      + '<div style="font-size:9px;color:#64748b">' + t.desc + '</div>'
      + '</div></div>';
  });
  return '<div class="card mt12">'
    + '<div class="section-title">🎨 الثيم والألوان</div>'
    + '<p class="text-xs text-gray mb10">اضغط على أي ثيم لتطبيقه فوراً</p>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">'
    + cards + '</div>'
    + '<div class="alert alert-blue mt10" style="font-size:11px"><span>💡</span>'
    + '<span>ثيم <strong>داكن 🌙</strong> مريح للعمل الليلي</span></div>'
    + '</div>';
}

// ═══ COMPANY SETTINGS & BACKUP ═══
// ═══════════════════════════════════════════════════════
function renderCompany(){
  const c=DB.getCompany();

  // Logo section
  var co = DB.getCompany();
  var logoPreviewContent = co.logo
    ? '<img src="'+co.logo+'" style="width:90px;height:90px;object-fit:contain">'
    : '<div style="text-align:center;color:#94a3b8"><div style="font-size:30px">🖼️</div><div style="font-size:9px;margin-top:4px">لا يوجد شعار</div></div>';
  var deleteBtn = co.logo
    ? '<button class="btn btn-red btn-sm" onclick="removeLogo()">🗑️ حذف الشعار</button>'
    : '';
  var logoSection = '<div class="card mb12">'
    + '<div class="section-title">🖼️ شعار الشركة</div>'
    + '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
    + '<div id="logo-preview" style="width:90px;height:90px;border:2px dashed #e2e8f0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f8fafc;overflow:hidden;flex-shrink:0">'
    + logoPreviewContent
    + '</div>'
    + '<div style="flex:1">'
    + '<p class="text-xs text-gray mb8">يظهر في: الشريط الجانبي والتقارير والفواتير المطبوعة</p>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<label style="display:inline-flex;align-items:center;gap:6px;background:#1F4E78;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit">'
    + '📁 اختر شعاراً'
    + '<input type="file" id="logo-input" accept="image/*" onchange="previewLogo(this)" style="display:none">'
    + '</label>'
    + deleteBtn
    + '</div>'
    + '<p class="text-xs text-gray mt6">PNG أو JPG أو SVG • حجم أقصى 500KB • يُحفظ تلقائياً</p>'
    + '</div></div></div>';

  return `<div>
    ${logoSection}
    <div class="grid2" style="gap:16px;align-items:start">

      <!-- Company Info Card -->
      <div class="card">
        <div class="section-title">🏢 بيانات الشركة</div>
        <div class="form-group"><label>اسم الشركة</label>
          <input id="co-name" value="${c.name||''}" placeholder="شركة الهنا للنقل">
        </div>
        <div class="form-group"><label>المدينة</label>
          <input id="co-city" value="${c.city||''}" placeholder="جدة">
        </div>
        <div class="form-group"><label>العنوان التفصيلي</label>
          <textarea id="co-address" rows="2">${c.address||''}</textarea>
        </div>
        <div class="form-group"><label>رقم الهاتف</label>
          <input id="co-phone" value="${c.phone||''}" placeholder="05xxxxxxxx">
        </div>
        <div class="form-group"><label>البريد الإلكتروني</label>
          <input id="co-email" value="${c.email||''}" placeholder="info@example.com">
        </div>
        <div class="form-group"><label>رقم السجل التجاري</label>
          <input id="co-cr" value="${c.crNumber||''}" placeholder="10xxxxxxxxxx">
        </div>
        <div class="form-group"><label>الرقم الضريبي (VAT)</label>
          <input id="co-vat" value="${c.vatNumber||''}" placeholder="3xxxxxxxxxxxxxxx3">
        </div>
        <div class="form-group"><label>نشاط الشركة</label>
          <input id="co-activity" value="${c.activity||''}" placeholder="نقل مواد البناء والخامات">
        </div>
        <button class="btn btn-primary w-full" onclick="saveCompany()" style="width:100%;justify-content:center">💾 حفظ بيانات الشركة</button>
        <div class="alert alert-blue mt8" style="font-size:10px">
          <span>ℹ️</span><span>هذه البيانات ستظهر في جميع المستندات والفواتير المطبوعة</span>
        </div>
      </div>

      <!-- Backup / Restore Card -->
      <div>
        <div class="card mb12">
          <div class="section-title">💾 النسخ الاحتياطي</div>
          <p class="text-sm text-gray mb12">تصدير كامل لجميع بيانات النظام (عملاء، موردون، حوافظ، قيود، مصروفات...) في ملف JSON واحد.</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:12px">
            <div class="flex-between mb8">
              <div>
                <p class="font-bold text-green" style="font-size:12px">📤 تصدير النسخة الاحتياطية</p>
                <p class="text-xs text-gray mt4">يُنشئ ملف JSON بكل البيانات — احفظه في مكان آمن</p>
              </div>
              <button class="btn btn-green" onclick="exportBackup()">⬇️ تصدير الآن</button>
            </div>
            <div id="backup-info" class="text-xs text-gray"></div>
          </div>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px">
            <p class="font-bold text-brand" style="font-size:12px;margin-bottom:6px">📥 استيراد نسخة احتياطية</p>
            <p class="text-xs text-gray mb8">⚠️ سيؤدي الاستيراد إلى استبدال كافة البيانات الحالية</p>
            <input type="file" id="import-file" accept=".json" style="font-size:11px;margin-bottom:8px">
            <button class="btn btn-primary btn-sm" onclick="importBackup()">📥 استيراد وتطبيق</button>
          </div>
        </div>

        <div class="card mb12">
          <div class="section-title">📋 إحصائيات قاعدة البيانات</div>
          ${['customers','suppliers','materials','trucks','partners','accounts','journal','sarkis','cheques','expenses','statements']
            .map(col=>{
              const n=DB.getAll(col).length;
              const labels={customers:'عملاء',suppliers:'موردون',materials:'خامات',trucks:'سيارات',partners:'شركاء',accounts:'حسابات',journal:'قيود',sarkis:'حوافظ',cheques:'شيكات',expenses:'مصروفات',statements:'مستخلصات معتمدة'};
              return `<div class="flex-between" style="padding:5px 0;border-bottom:1px solid #f1f5f9">
                <span class="text-sm text-gray">${labels[col]||col}</span>
                <span class="font-bold text-brand">${n}</span>
              </div>`;
            }).join('')}
          <div class="flex-between mt8" style="font-size:10px;color:#94a3b8">
            <span>حجم البيانات</span>
            <span>${Math.round(JSON.stringify(DB.getAll('customers')).length/102.4+JSON.stringify(DB.getAll('journal')).length/102.4+JSON.stringify(DB.getAll('sarkis')).length/102.4)} KB تقريباً</span>
          </div>
        </div>

        <div class="card">
          <div class="section-title">⚠️ منطقة الخطر</div>
          <p class="text-xs text-gray mb8">حذف كامل لجميع البيانات — لا يمكن التراجع. تأكد من عمل نسخة احتياطية أولاً.</p>
          <button class="btn btn-red btn-sm" onclick="clearAllData()">🗑️ مسح كامل لجميع البيانات</button>
        </div>
      </div>
    </div>
  \${buildThemeHTML()}
  </div>`;
}

function saveCompany(){
  DB.setCompany({
    name:    document.getElementById('co-name')?.value||'',
    city:    document.getElementById('co-city')?.value||'',
    address: document.getElementById('co-address')?.value||'',
    phone:   document.getElementById('co-phone')?.value||'',
    email:   document.getElementById('co-email')?.value||'',
    crNumber:document.getElementById('co-cr')?.value||'',
    vatNumber:document.getElementById('co-vat')?.value||'',
    activity:document.getElementById('co-activity')?.value||'',
  });
  toast('✅ تم حفظ بيانات الشركة');
}

function exportBackup(){
  const data = DB.exportData();
  const blob = new Blob([data],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `hana-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  const el = document.getElementById('backup-info');
  if(el) el.innerHTML = `✅ تم تصدير النسخة الاحتياطية — ${date}`;
  toast('✅ تم تصدير النسخة الاحتياطية');
}

function importBackup(){
  const file = document.getElementById('import-file')?.files?.[0];
  if(!file) return toast('اختر ملف JSON أولاً','error');
  if(!file.name.endsWith('.json')) return toast('الملف يجب أن يكون بصيغة JSON','error');
  if(!confirm('⚠️ سيتم استبدال كافة البيانات الحالية. هل أنت متأكد؟')) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      DB.importData(e.target.result);
      toast('✅ تم استيراد البيانات بنجاح');
      nav('dashboard');
    }catch(err){
      toast('❌ الملف غير صالح — تأكد أنه نسخة احتياطية صحيحة','error');
    }
  };
  reader.readAsText(file);
}

function clearAllData(){
  if(!confirm('⚠️ تحذير: سيتم حذف كافة البيانات نهائياً. هل أنت متأكد تماماً؟')) return;
  if(!confirm('تأكيد أخير — هذا الإجراء لا يمكن التراجع عنه. استمرار؟')) return;
  localStorage.removeItem('hana_v4');
  toast('تم مسح البيانات — سيتم إعادة التحميل');
  setTimeout(()=>location.reload(),1500);
}

// ═══════════════════════════════════════════════════════
// EXPENSES & FUEL MANAGEMENT — إدارة المصروفات والوقود
// ═══════════════════════════════════════════════════════
let _EXP_FILTER={cat:'الكل',from:'',to:'',truck:''};
// ── Logo Functions ────────────────────────────────────────────────
function previewLogo(input){
  var file = input.files[0];
  if(!file) return;
  if(file.size > 600000){ toast('حجم الملف كبير جداً — الحد 500KB','error'); return; }
  var reader = new FileReader();
  reader.onload = function(e){
    var base64 = e.target.result;
    // Preview
    var preview = document.getElementById('logo-preview');
    if(preview) preview.innerHTML = '<img src="'+base64+'" style="width:90px;height:90px;object-fit:contain">';
    // Save to Firebase
    var co = DB.getCompany();
    DB.setCompany({...co, logo: base64});
    // Update sidebar
    if(typeof updateSidebarLogo==='function') setTimeout(updateSidebarLogo,300);
    toast('✅ تم حفظ الشعار');
  };
  reader.readAsDataURL(file);
}

function removeLogo(){
  if(!confirm('حذف شعار الشركة؟')) return;
  var co = DB.getCompany();
  delete co.logo;
  DB.setCompany({...co, logo:''});
  var preview = document.getElementById('logo-preview');
  if(preview) preview.innerHTML = '<div style="text-align:center;color:#94a3b8"><div style="font-size:28px">🖼️</div><div style="font-size:9px;margin-top:4px">لا يوجد شعار</div></div>';
  if(typeof updateSidebarLogo==='function') setTimeout(updateSidebarLogo,300);
  toast('تم حذف الشعار');
}
