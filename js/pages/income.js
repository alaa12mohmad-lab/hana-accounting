// ═══ INCOME STATEMENT ═══

function renderIncomeStmt(){
  const fd=new Date(_IS.from), td=new Date(_IS.to);

  // Revenue from sarkis
  const sarkis=DB.getAll('sarkis').filter(sk=>{
    const d=new Date(sk.date);
    return sk.status!=='ملغي'&&d>=fd&&d<=td;
  });
  const totalRevenue=sarkis.reduce((s,r)=>s+(Number(r.totalSell)||0),0);
  const totalCOGS   =sarkis.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue?grossProfit/totalRevenue:0;

  // Expenses breakdown
  const expenses=DB.getAll('expenses').filter(e=>{
    const d=new Date(e.date);
    return d>=fd&&d<=td;
  });
  const expBycat={};
  EXP_CATS.forEach(c=>expBycat[c]=0);
  expenses.forEach(e=>{ expBycat[e.category]=(expBycat[e.category]||0)+(Number(e.amount)||0); });
  const totalExpenses=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);

  // Net profit
  const netProfit=grossProfit-totalExpenses;
  const netMargin=totalRevenue?netProfit/totalRevenue:0;

  // Per-material breakdown
  const materials=DB.getAll('materials');
  const matBD=materials.map(m=>{
    const rows=sarkis.filter(r=>r.material===m.name);
    const rev=rows.reduce((s,r)=>s+(Number(r.totalSell)||0),0);
    const cost=rows.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);
    return {mat:m.name,rev,cost,profit:rev-cost,margin:rev?((rev-cost)/rev):0,cubic:rows.reduce((s,r)=>s+(Number(r.totalNet)||0),0)};
  }).filter(m=>m.rev>0).sort((a,b)=>b.rev-a.rev);

  // Per-customer breakdown
  const customers=DB.getAll('customers');
  const custBD=customers.map(c=>{
    const rows=sarkis.filter(r=>r.client===c.name);
    const rev=rows.reduce((s,r)=>s+(Number(r.totalSell)||0),0);
    const cost=rows.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);
    return {name:c.name,rev,cost,profit:rev-cost,margin:rev?((rev-cost)/rev):0};
  }).filter(c=>c.rev>0).sort((a,b)=>b.rev-a.rev);

  // Expense type color
  const expColor={'وقود':'orange','صيانة وإصلاح':'red','رواتب وأجور':'purple'};

  return `<div>
    <!-- Period selector -->
    <div class="card mb12">
      <div class="form-row fr2" style="max-width:400px">
        <div class="form-group"><label>من تاريخ</label>
          <input type="date" value="${_IS.from}" onchange="_IS.from=this.value;nav('income-stmt')">
        </div>
        <div class="form-group"><label>إلى تاريخ</label>
          <input type="date" value="${_IS.to}" onchange="_IS.to=this.value;nav('income-stmt')">
        </div>
      </div>
      <div class="flex" style="margin-top:6px;gap:6px">
        <button class="btn btn-gray btn-sm" onclick="setISPeriod('month')">الشهر الحالي</button>
        <button class="btn btn-gray btn-sm" onclick="setISPeriod('quarter')">الربع الحالي</button>
        <button class="btn btn-gray btn-sm" onclick="setISPeriod('year')">السنة الحالية</button>
        <button class="btn btn-primary btn-sm" onclick="printIncomeStmt()" style="margin-right:auto">🖨️ طباعة قائمة الدخل</button>
      </div>
    </div>

    <!-- Main Income Statement -->
    <div class="grid2" style="gap:14px;align-items:start">
      <div>
        <!-- Formal P&L -->
        <div class="card mb12">
          <div class="section-title">📊 قائمة الدخل — نتائج الأعمال</div>
          <div style="font-size:11px">

            <!-- Revenue section -->
            <div style="background:#eff6ff;border-radius:8px;padding:10px;margin-bottom:8px">
              <div class="flex-between mb6"><span style="font-weight:700;color:#1e40af">الإيرادات</span></div>
              <div class="flex-between" style="padding:3px 8px">
                <span class="text-gray">إيرادات المبيعات (الحوافظ)</span>
                <span class="tabular font-bold text-brand">${curr(totalRevenue)}</span>
              </div>
              <div class="flex-between" style="padding:3px 8px;border-top:1px solid #bfdbfe;margin-top:6px">
                <span style="font-weight:700;color:#1e40af">إجمالي الإيرادات</span>
                <span class="tabular font-bold" style="color:#1e40af;font-size:13px">${curr(totalRevenue)}</span>
              </div>
            </div>

            <!-- COGS -->
            <div style="background:#fff7ed;border-radius:8px;padding:10px;margin-bottom:8px">
              <div class="flex-between mb6"><span style="font-weight:700;color:#c2410c">تكلفة المبيعات</span></div>
              <div class="flex-between" style="padding:3px 8px">
                <span class="text-gray">تكلفة الموردين (من الحوافظ)</span>
                <span class="tabular text-red">(${curr(totalCOGS)})</span>
              </div>
              <div class="flex-between" style="padding:3px 8px;border-top:1px solid #fed7aa;margin-top:6px">
                <span style="font-weight:700;color:#c2410c">إجمالي تكلفة المبيعات</span>
                <span class="tabular font-bold text-red">(${curr(totalCOGS)})</span>
              </div>
            </div>

            <!-- Gross Profit -->
            <div style="background:${grossProfit>=0?'#f0fdf4':'#fff1f2'};border-radius:8px;padding:10px;margin-bottom:8px;border:2px solid ${grossProfit>=0?'#86efac':'#fca5a5'}">
              <div class="flex-between">
                <span style="font-weight:700;font-size:13px">مجمل الربح</span>
                <div style="text-align:left">
                  <div class="tabular font-bold ${grossProfit>=0?'text-green':'text-red'}" style="font-size:14px">${curr(grossProfit)}</div>
                  <div class="text-xs text-gray">هامش ${pct(grossMargin)}</div>
                </div>
              </div>
            </div>

            <!-- Operating Expenses -->
            <div style="background:#fef2f2;border-radius:8px;padding:10px;margin-bottom:8px">
              <div class="flex-between mb6"><span style="font-weight:700;color:#991b1b">المصروفات التشغيلية</span></div>
              ${EXP_CATS.filter(c=>expBycat[c]>0).map(cat=>`
                <div class="flex-between" style="padding:3px 8px">
                  <span class="text-gray">• ${cat}</span>
                  <span class="tabular text-red">(${curr(expBycat[cat])})</span>
                </div>`).join('')}
              ${totalExpenses===0?`<div class="text-xs text-gray" style="padding:3px 8px;font-style:italic">لم تُسجَّل مصروفات في هذه الفترة</div>`:''}
              <div class="flex-between" style="padding:3px 8px;border-top:1px solid #fecaca;margin-top:6px">
                <span style="font-weight:700;color:#991b1b">إجمالي المصروفات</span>
                <span class="tabular font-bold text-red">(${curr(totalExpenses)})</span>
              </div>
            </div>

            <!-- Net Profit -->
            <div style="background:${netProfit>=0?'#f0fdf4':'#fff1f2'};border-radius:10px;padding:14px;border:2px solid ${netProfit>=0?'#22c55e':'#ef4444'}">
              <div class="flex-between">
                <div>
                  <div style="font-weight:700;font-size:14px">صافي الربح</div>
                  <div class="text-xs text-gray mt4">إيرادات − تكلفة مبيعات − مصروفات</div>
                </div>
                <div style="text-align:left">
                  <div class="tabular font-bold ${netProfit>=0?'text-green':'text-red'}" style="font-size:18px">${curr(netProfit)}</div>
                  <div class="text-xs text-gray">هامش صافي ${pct(netMargin)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Expense Breakdown Chart-like -->
        ${totalExpenses>0?`
        <div class="card">
          <div class="section-title">📊 توزيع المصروفات</div>
          ${EXP_CATS.filter(c=>expBycat[c]>0).sort((a,b)=>expBycat[b]-expBycat[a]).map(cat=>`
            <div style="margin-bottom:8px">
              <div class="flex-between mb4">
                <span class="text-sm">${cat}</span>
                <span class="tabular font-bold text-red text-sm">${curr(expBycat[cat])}</span>
              </div>
              <div style="height:6px;background:#fee2e2;border-radius:3px">
                <div style="height:6px;background:#ef4444;border-radius:3px;width:${(expBycat[cat]/totalExpenses*100).toFixed(0)}%"></div>
              </div>
              <div class="text-xs text-gray mt4">${(expBycat[cat]/totalExpenses*100).toFixed(1)}% من إجمالي المصروفات</div>
            </div>`).join('')}
        </div>`:''}
      </div>

      <div>
        <!-- KPIs -->
        <div class="grid2 mb12" style="gap:8px">
          <div class="kpi kpi-blue"><div class="kpi-icon">💰</div><div class="kpi-label">الإيرادات</div><div class="kpi-value">${curr(totalRevenue)}</div></div>
          <div class="kpi kpi-green"><div class="kpi-icon">✅</div><div class="kpi-label">مجمل الربح</div><div class="kpi-value">${curr(grossProfit)}</div><div class="kpi-sub">هامش ${pct(grossMargin)}</div></div>
          <div class="kpi kpi-red"><div class="kpi-icon">💸</div><div class="kpi-label">المصروفات</div><div class="kpi-value">${curr(totalExpenses)}</div></div>
          <div class="kpi ${netProfit>=0?'kpi-green':'kpi-red'}"><div class="kpi-icon">${netProfit>=0?'🏆':'⚠️'}</div><div class="kpi-label">صافي الربح</div><div class="kpi-value">${curr(netProfit)}</div><div class="kpi-sub">هامش ${pct(netMargin)}</div></div>
        </div>

        <!-- Sarkis stats -->
        <div class="card mb12">
          <div class="section-title">📋 إحصائيات الحوافظ</div>
          <div class="flex-between" style="padding:5px 0;border-bottom:1px solid #f1f5f9">
            <span class="text-sm text-gray">عدد الحوافظ</span><span class="font-bold">${sarkis.length}</span>
          </div>
          <div class="flex-between" style="padding:5px 0;border-bottom:1px solid #f1f5f9">
            <span class="text-sm text-gray">إجمالي النقلات</span><span class="font-bold">${num(sarkis.reduce((s,r)=>s+(Number(r.totalTrips)||0),0))}</span>
          </div>
          <div class="flex-between" style="padding:5px 0;border-bottom:1px solid #f1f5f9">
            <span class="text-sm text-gray">إجمالي م³</span><span class="font-bold">${sarkis.reduce((s,r)=>s+(Number(r.totalNet)||0),0).toFixed(1)}</span>
          </div>
          <div class="flex-between" style="padding:5px 0">
            <span class="text-sm text-gray">متوسط ربح الحافظة</span>
            <span class="font-bold text-green">${curr(sarkis.length?grossProfit/sarkis.length:0)}</span>
          </div>
        </div>

        <!-- Material breakdown -->
        ${matBD.length>0?`
        <div class="card mb12">
          <div class="section-title">🪨 الربح حسب الخامة</div>
          ${matBD.map(m=>`
            <div class="flex-between" style="padding:6px 0;border-bottom:1px solid #f1f5f9">
              <div>${badge(m.mat)}</div>
              <div style="text-align:left">
                <div class="font-bold text-green tabular">${curr(m.profit)}</div>
                <div class="text-xs text-gray">${pct(m.margin)} هامش</div>
              </div>
            </div>`).join('')}
        </div>`:''}

        <!-- Customer breakdown -->
        ${custBD.length>0?`
        <div class="card">
          <div class="section-title">👤 الإيرادات حسب العميل</div>
          ${custBD.map((c,i)=>`
            <div class="flex-between" style="padding:6px 0;border-bottom:1px solid #f1f5f9">
              <div class="flex">
                <span style="width:18px;height:18px;background:#e0e7ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#3730a3">${i+1}</span>
                <span style="margin-right:7px;font-size:11px">${c.name}</span>
              </div>
              <div style="text-align:left">
                <div class="font-bold text-brand tabular">${curr(c.rev)}</div>
                <div class="text-xs text-gray">${pct(totalRevenue?c.rev/totalRevenue:0)}</div>
              </div>
            </div>`).join('')}
        </div>`:''}
      </div>
    </div>
  </div>`;
}

function setISPeriod(p){
  const now=new Date();
  if(p==='month'){
    _IS.from=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
    _IS.to=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);
  } else if(p==='quarter'){
    const q=Math.floor(now.getMonth()/3);
    _IS.from=new Date(now.getFullYear(),q*3,1).toISOString().slice(0,10);
    _IS.to=new Date(now.getFullYear(),q*3+3,0).toISOString().slice(0,10);
  } else {
    _IS.from=`${now.getFullYear()}-01-01`;
    _IS.to=`${now.getFullYear()}-12-31`;
  }
  nav('income-stmt');
}

function printIncomeStmt(){
  const fd=new Date(_IS.from),td=new Date(_IS.to);
  const sarkis=DB.getAll('sarkis').filter(sk=>{const d=new Date(sk.date);return sk.status!=='ملغي'&&d>=fd&&d<=td;});
  const expenses=DB.getAll('expenses').filter(e=>{const d=new Date(e.date);return d>=fd&&d<=td;});
  const totalRevenue=sarkis.reduce((s,r)=>s+(Number(r.totalSell)||0),0);
  const totalCOGS=sarkis.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);
  const grossProfit=totalRevenue-totalCOGS;
  const expBycat={};
  EXP_CATS.forEach(c=>expBycat[c]=0);
  expenses.forEach(e=>{expBycat[e.category]=(expBycat[e.category]||0)+(Number(e.amount)||0);});
  const totalExpenses=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const netProfit=grossProfit-totalExpenses;
  const _n=(n)=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';
  const _d=(ts)=>ts?new Date(ts).toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  const co=DB.getCompany();
  const PCSS=`*{font-family:Tahoma,sans-serif;margin:0;padding:0;box-sizing:border-box;direction:rtl}body{padding:14px;font-size:11px}
  .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1F4E78;padding-bottom:10px;margin-bottom:14px}
  .co{font-size:16px;font-weight:700;color:#1F4E78}.co-sub{font-size:9px;color:#666;margin-top:2px}
  .title{text-align:center;font-size:14px;font-weight:700;color:#1F4E78;margin-bottom:4px}
  .period{text-align:center;font-size:10px;color:#666;margin-bottom:14px}
  .section{margin-bottom:12px}
  .row{display:flex;justify-content:space-between;padding:4px 10px;font-size:11px}
  .row.indent{padding-right:20px;color:#666}
  .row.total{background:#f5f8fc;font-weight:700;border-top:1px solid #ddd;margin-top:4px}
  .row.grand{background:#1F4E78;color:#fff;font-weight:700;font-size:13px;padding:8px 10px;border-radius:5px;margin-top:10px}
  .row.profit{background:#f0fdf4;font-weight:700;border:2px solid #86efac;border-radius:5px;padding:8px 10px}
  .row.loss{background:#fff1f2;font-weight:700;border:2px solid #fca5a5;border-radius:5px;padding:8px 10px}
  .section-head{font-weight:700;color:#1F4E78;padding:6px 10px;background:#eff6ff;border-radius:5px;margin-bottom:4px;font-size:12px}
  .stamps{display:flex;justify-content:space-around;margin-top:28px}
  .stamp{text-align:center;border-top:1px solid #333;padding-top:5px;width:140px;font-size:10px}
  @media print{@page{margin:10mm;size:A4}body{padding:0}}`;

  const w=window.open('','_blank');
  const sc='<scr'+'ipt>setTimeout(()=>window.print(),700)<'+'/scr'+'ipt>';
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>قائمة الدخل<\/title><style>${PCSS}<\/style><\/head><body>
    <div class="hdr">
      <div><div class="co">${co.name||'شركة الهنا للنقل'}</div>
        ${co.crNumber?`<div class="co-sub">س.ت: ${co.crNumber}</div>`:''}
        ${co.phone?`<div class="co-sub">هاتف: ${co.phone}</div>`:''}
      </div>
      <div style="text-align:left;font-size:10px;color:#666"><div>${_d(Date.now())}</div></div>
    </div>
    <div class="title">قائمة الدخل والأرباح والخسائر</div>
    <div class="period">عن الفترة من ${_d(_IS.from)} إلى ${_d(_IS.to)}</div>

    <!-- Revenue -->
    <div class="section">
      <div class="section-head">الإيرادات</div>
      <div class="row indent"><span>إيرادات المبيعات (الحوافظ — ${sarkis.length} حافظة)</span><span>${_n(totalRevenue)}</span></div>
      <div class="row total"><span>إجمالي الإيرادات</span><span>${_n(totalRevenue)}</span></div>
    </div>

    <!-- COGS -->
    <div class="section">
      <div class="section-head">تكلفة المبيعات</div>
      <div class="row indent"><span>تكلفة الموردين</span><span>(${_n(totalCOGS)})</span></div>
      <div class="row total"><span>إجمالي تكلفة المبيعات</span><span>(${_n(totalCOGS)})</span></div>
    </div>

    <!-- Gross Profit -->
    <div class="row ${grossProfit>=0?'profit':'loss'}">
      <span>مجمل الربح</span>
      <span>${_n(grossProfit)} (هامش ${(totalRevenue?grossProfit/totalRevenue*100:0).toFixed(1)}%)</span>
    </div>

    <!-- Expenses -->
    <div class="section" style="margin-top:12px">
      <div class="section-head">المصروفات التشغيلية</div>
      ${EXP_CATS.filter(c=>expBycat[c]>0).map(c=>`
        <div class="row indent"><span>${c}</span><span>(${_n(expBycat[c])})</span></div>`).join('')}
      ${totalExpenses===0?`<div class="row indent" style="color:#999;font-style:italic"><span>لم تُسجَّل مصروفات في هذه الفترة</span><span>—</span></div>`:''}
      <div class="row total"><span>إجمالي المصروفات التشغيلية</span><span>(${_n(totalExpenses)})</span></div>
    </div>

    <!-- Net Profit -->
    <div class="row grand">
      <span>صافي الربح (الخسارة)</span>
      <span>${_n(netProfit)} — هامش ${(totalRevenue?netProfit/totalRevenue*100:0).toFixed(1)}%</span>
    </div>

    <div class="stamps">
      <div class="stamp">المحاسب</div>
      <div class="stamp">المدير المالي</div>
      <div class="stamp">المدير العام</div>
    </div>
  ${sc}<\/body><\/html>`);
  w.document.close();
}


// ═══════════════════════════════════════════════════════
// AUTO-BACKUP & DATA SAFETY SYSTEM
// ═══════════════════════════════════════════════════════
// BACKUP_KEY defined in repo
// BACKUP_TS_KEY defined in repo
const BACKUP_WARNING = 7 * 24 * 60 * 60 * 1000;  // warn after 7 days without export

// Shadow copy — written on every save (secondary storage)
// writeShadowCopy → see repo layer


// Patch DB.save to always write shadow
(function(){
  const origSave = DB.save.bind(DB);
  // We can't replace DB.save from outside the closure,
  // so we poll: write shadow every 60 seconds
  setInterval(writeShadowCopy, 60000);
})();

// getLastExportDate → see repo layer


// updateExportTimestamp → see repo layer


// getDaysSinceBackup → see repo layer


// ── Backup bar (shown at top of page) ──────────────────
// renderBackupBar → see repo layer


// quickExport → see repo layer


// Recover from shadow copy if main data corrupted
// tryRecoverFromShadow → see repo layer


// ── Enhanced renderCompany with backup info ─────────────
function renderCompany(){
  const c = DB.getCompany();
  const days = getDaysSinceBackup();
  const lastExport = getLastExportDate();
  const totalRecords =
    DB.getAll('sarkis').length +
    DB.getAll('journal').length +
    DB.getAll('expenses').length;
  const dbSize = Math.round(localStorage.getItem('hana_v4')?.length / 1024) || 0;

  const fbSetup = (typeof renderFBSetup==='function') ? renderFBSetup() : '';
  return `<div>
    <div class="grid2" style="gap:14px;align-items:start">

      <!-- Company Info -->
      <div class="card">
        <div class="section-title">🏢 بيانات الشركة</div>
        <div class="form-group"><label>اسم الشركة</label><input id="co-name" value="${c.name||''}" placeholder="شركة الهنا للنقل"></div>
        <div class="form-group"><label>المدينة</label><input id="co-city" value="${c.city||''}" placeholder="جدة"></div>
        <div class="form-group"><label>العنوان</label><textarea id="co-address" rows="2">${c.address||''}</textarea></div>
        <div class="form-row fr2">
          <div class="form-group"><label>الهاتف</label><input id="co-phone" value="${c.phone||''}"></div>
          <div class="form-group"><label>البريد الإلكتروني</label><input id="co-email" value="${c.email||''}"></div>
        </div>
        <div class="form-row fr2">
          <div class="form-group"><label>رقم السجل التجاري</label><input id="co-cr" value="${c.crNumber||''}"></div>
          <div class="form-group"><label>الرقم الضريبي</label><input id="co-vat" value="${c.vatNumber||''}"></div>
        </div>
        <div class="form-group"><label>النشاط التجاري</label><input id="co-activity" value="${c.activity||''}" placeholder="نقل مواد البناء"></div>
        <button class="btn btn-primary" onclick="saveCompany()" style="width:100%;justify-content:center;margin-top:4px">💾 حفظ بيانات الشركة</button>
        <div class="alert alert-blue mt8" style="font-size:10px"><span>ℹ️</span><span>تظهر هذه البيانات في جميع المستندات والفواتير المطبوعة</span></div>
      </div>

      <div>
        <!-- Backup Status Card -->
        <div class="card mb12" style="border:2px solid ${days===null||days>=7?'#f59e0b':'#10b981'}">
          <div class="flex-between mb12">
            <div class="section-title" style="margin-bottom:0">💾 حماية البيانات</div>
            <span class="badge ${days===null?'badge-red':days>=7?'badge-yellow':'badge-green'}">
              ${days===null?'⚠️ لا توجد نسخة احتياطية':days>=7?`⚠️ منذ ${days} أيام`:'✅ محمية'}
            </span>
          </div>

          ${days!==null?`<div class="alert alert-${days<7?'green':'yellow'} mb10" style="font-size:10px">
            <span>${days<7?'✅':'⚠️'}</span>
            <span>آخر نسخة احتياطية: <strong>${lastExport?.toLocaleDateString('ar-EG')}</strong> (منذ ${days} ${days===1?'يوم':'أيام'})</span>
          </div>`:`<div class="alert alert-red mb10" style="font-size:10px"><span>⛔</span><span>لم تقم بأي نسخة احتياطية — بياناتك عرضة للضياع</span></div>`}

          <!-- Stats -->
          <div class="grid3 mb12" style="gap:6px">
            <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي السجلات</div><div class="font-bold text-brand">${totalRecords}</div></div>
            <div class="card-sm text-center"><div class="text-xs text-gray mb4">حجم البيانات</div><div class="font-bold text-brand">${dbSize} KB</div></div>
            <div class="card-sm text-center"><div class="text-xs text-gray mb4">النسخة الظلية</div><div class="font-bold text-green">✅ تلقائية</div></div>
          </div>

          <!-- Export JSON -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:10px">
            <div class="flex-between mb6">
              <div>
                <p class="font-bold text-green" style="font-size:11px">📤 تصدير نسخة احتياطية JSON</p>
                <p class="text-xs text-gray">ملف JSON كامل لجميع البيانات — احفظه في مكان آمن</p>
              </div>
              <button class="btn btn-green" onclick="quickExport()">⬇️ تصدير الآن</button>
            </div>
          </div>

          <!-- Export Excel Backup -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:10px">
            <div class="flex-between mb6">
              <div>
                <p class="font-bold text-brand" style="font-size:11px">📊 تصدير نسخة Excel شاملة</p>
                <p class="text-xs text-gray">ملف Excel متعدد الأوراق — حوافظ، يومية، مصروفات، عملاء</p>
              </div>
              <button class="btn btn-primary" onclick="exportToExcel()">📊 Excel</button>
            </div>
          </div>

          <!-- Import -->
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px">
            <p class="font-bold" style="font-size:11px;color:#92400e;margin-bottom:4px">📥 استعادة نسخة احتياطية</p>
            <p class="text-xs text-gray mb8">⚠️ سيستبدل جميع البيانات الحالية</p>
            <div class="flex" style="gap:8px">
              <input type="file" id="import-file" accept=".json" style="font-size:10px;flex:1">
              <button class="btn btn-orange btn-sm" onclick="importBackup()">📥 استعادة</button>
            </div>
          </div>
        </div>

        <!-- DB Stats -->
        <div class="card mb12">
          <div class="section-title">📋 إحصائيات قاعدة البيانات</div>
          ${['sarkis:حوافظ','journal:قيود اليومية','expenses:مصروفات','cheques:شيكات','customers:عملاء','suppliers:موردون','materials:خامات','trucks:سيارات','partners:شركاء','statements:مستخلصات معتمدة'].map(pair=>{
            const [col,lbl]=pair.split(':');
            return `<div class="flex-between" style="padding:4px 0;border-bottom:1px solid #f1f5f9">
              <span class="text-sm text-gray">${lbl}</span>
              <span class="font-bold text-brand">${DB.getAll(col).length}</span>
            </div>`;
          }).join('')}
        </div>

        <!-- Danger Zone -->
        <div class="card" style="border:1px solid #fca5a5">
          <div class="section-title" style="color:#dc2626">⚠️ منطقة الخطر</div>
          <p class="text-xs text-gray mb8">حذف كامل لجميع البيانات — لا يمكن التراجع</p>
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

function importBackup(){
  const file = document.getElementById('import-file')?.files?.[0];
  if(!file) return toast('اختر ملف JSON أولاً','error');
  if(!file.name.endsWith('.json')) return toast('يجب أن يكون الملف بصيغة JSON','error');
  if(!confirm('⚠️ سيتم استبدال كافة البيانات الحالية بالنسخة المختارة.\nهل أنت متأكد؟')) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      DB.importData(e.target.result);
      updateExportTimestamp();
      toast('✅ تم استعادة البيانات بنجاح');
      setTimeout(()=>nav('dashboard'),800);
    }catch(err){
      toast('❌ الملف غير صالح','error');
    }
  };
  reader.readAsText(file);
}

function clearAllData(){
  if(!confirm('⚠️ تحذير: سيتم حذف كافة البيانات نهائياً.\nتأكد من عمل نسخة احتياطية أولاً.')) return;
  if(!confirm('تأكيد أخير — هذا الإجراء لا يمكن التراجع عنه')) return;
  localStorage.removeItem('hana_v4');
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(BACKUP_TS_KEY);
  toast('تم مسح البيانات — سيتم إعادة التحميل');
  setTimeout(()=>location.reload(),1500);
}
