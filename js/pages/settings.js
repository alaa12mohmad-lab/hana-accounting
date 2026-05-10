// ═══ COMPANY SETTINGS & BACKUP ═══
// ═══════════════════════════════════════════════════════
function renderCompany(){
  const c=DB.getCompany();
  return `<div>
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
