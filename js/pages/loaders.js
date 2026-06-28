// ═══ LOADERS — آلات التحميل كمراكز ربح ═══════════════════════════

window._LD_TAB = 'list';
window._LD_SEL = null; // selected loader id

// ── Helper: cumulative net profit of a loader since purchase (no date filter) ──
function getLoaderCumulativeProfit(ld){
  const allSarkis = DB.getAll('sarkis').filter(sk=>sk.status!=='ملغي');
  let revenue = 0;
  allSarkis.forEach(sk=>{
    (sk.lines||[]).forEach(ln=>{
      if(ln.loaderName!==ld.name) return;
      const net   = Number(ln.netSell||ln.netCubic)||0;
      const price = getLoaderPrice(ld, sk.material);
      revenue += net*price;
    });
  });
  DB.getAll('loaderHours').filter(j=>j.loaderId===ld.id).forEach(j=>{
    revenue += Number(j.netClient)||0;
  });
  DB.getAll('loaderLoading').filter(j=>j.loaderId===ld.id).forEach(j=>{
    revenue += Number(j.netClient)||0;
  });
  const jExpenses = DB.getAll('journal').filter(j=>j.loaderId===ld.id && j.loaderExpType!=='توزيع أرباح');
  const expenses = jExpenses.reduce((s,j)=>s+(Number(j.amount||j.debitAmount)||0),0);
  return revenue - expenses;
}

// ── Helper: total profit already disbursed to a specific partner for a loader ──
function getLoaderPartnerDisbursed(loaderId, partnerName){
  // جلب كود حساب الشريك من إعدادات اللودر
  const ld = DB.getAll('loaders').find(l=>l.id===loaderId);
  const pt = (ld?.partners||[]).find(p=>p.partnerName===partnerName);
  const accountCode = pt?.accountCode||'';

  let total = 0;

  // 1. صرف أرباح مرتبط بالشريك مباشرة (party=شريك)
  DB.getAll('journal').filter(j=>
    j.entryType==='يدوي' && j.loaderId===loaderId &&
    j.loaderExpType==='توزيع أرباح' &&
    j.party===partnerName && j.partyType==='شريك'
  ).forEach(j=>{ total += Number(j.debitAmount)||0; });

  // 2. مسحوبات من حساب الشريك الشخصي (debitCode = كود حسابه في دليل الحسابات)
  if(accountCode){
    DB.getAll('journal').filter(j=>
      j.entryType==='يدوي' &&
      j.debitCode===accountCode &&
      j.creditCode==='1010'
    ).forEach(j=>{ total += Number(j.debitAmount)||0; });
  }

  return total;
}

// ── Open prefilled manual journal entry to disburse profit to a partner ──
function openLoaderDisburseModal(loaderId, partnerName){
  openJrnModal('يدوي', null, {
    debitCode:'3001', debitName:'حسابات الشركاء',
    party:partnerName, partyType:'شريك',
    loaderId:loaderId, loaderExpType:'توزيع أرباح',
    description:'صرف أرباح من اللودر — '+partnerName,
  });
}

// ── Main render ───────────────────────────────────────────────────
function renderLoaders(){
  const tab = window._LD_TAB;
  const loaders = DB.getAll('loaders');

  const tabs = [
    ['list','🚜 اللوادر'],
    ['hourly','⏱️ الساعات'],
    ['loading','🚛 التحميل'],
    ['report','📊 مركز الربح'],
    ['collections','💵 التحصيلات'],
    ['statements','📋 المستخلصات'],
  ];

  const tabBar = tabs.map(([k,l])=>`
    <button onclick="window._LD_TAB='${k}';nav('loaders')"
      style="padding:9px 18px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:12px;
      color:${tab===k?'#1d4ed8':'#64748b'};font-weight:${tab===k?'700':'400'};
      border-bottom:${tab===k?'2px solid #1d4ed8':'2px solid transparent'};margin-bottom:-2px">${l}</button>
  `).join('');

  let content = '';

  if(tab==='list'){
    content = renderLoaderList(loaders);
  } else if(tab==='hourly'){
    content = typeof renderLoaderHourly==='function'?renderLoaderHourly(loaders):'';
  } else if(tab==='loading'){
    content = typeof renderLoaderLoading==='function'?renderLoaderLoading(loaders):'';
  } else if(tab==='collections'){
    content = renderLoaderCollections(loaders);
  } else if(tab==='statements'){
    content = typeof renderLoaderStatements==='function'?renderLoaderStatements(loaders):'';
  } else {
    content = renderLoaderReport(loaders);
  }

  return `<div>
    <div class="page-header">
      <div class="section-title" style="margin:0">🚜 اللوادر وآلات التحميل</div>
      <button class="btn btn-primary" onclick="openLoaderModal()">+ إضافة لودر</button>
    </div>
    <div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:12px">
      ${tabBar}
    </div>
    ${content}
  </div>`;
}

// ── Loader list tab ───────────────────────────────────────────────
function renderLoaderList(loaders){
  if(!loaders.length) return `
    <div class="card" style="text-align:center;padding:60px">
      <div style="font-size:48px">🚜</div>
      <p class="font-bold mt8">لا توجد لوادر</p>
      <p class="text-gray text-xs mt4">أضف اللودر الأول لبدء تتبع إيراداته</p>
      <button class="btn btn-primary mt12" onclick="openLoaderModal()">+ إضافة لودر</button>
    </div>`;

  const allSarkis = DB.getAll('sarkis').filter(sk=>sk.status!=='ملغي');

  return `<div style="display:grid;gap:12px">
    ${loaders.map(ld=>{
      // Calculate this month's revenue from sarkis lines
      const now = new Date();
      const monthStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
      let monthRevenue=0, totalRevenue=0, totalTrips=0, totalM3=0;

      allSarkis.forEach(sk=>{
        (sk.lines||[]).forEach(ln=>{
          if(ln.loaderName!==ld.name) return;
          const net = Number(ln.netSell||ln.netCubic)||0;
          const price = getLoaderPrice(ld, sk.material);
          const rev = net * price;
          totalRevenue += rev;
          totalTrips   += Number(ln.trips)||0;
          totalM3      += net;
          if(sk.date&&sk.date.startsWith(monthStr)) monthRevenue += rev;
        });
      });
      // Hourly + loading revenue
      DB.getAll('loaderHours').filter(j=>j.loaderId===ld.id).forEach(j=>{
        totalRevenue += Number(j.netClient)||0;
        if((j.date||'').startsWith(monthStr)) monthRevenue += Number(j.netClient)||0;
      });
      DB.getAll('loaderLoading').filter(j=>j.loaderId===ld.id).forEach(j=>{
        totalRevenue += Number(j.netClient)||0;
        if((j.date||'').startsWith(monthStr)) monthRevenue += Number(j.netClient)||0;
      });

      // Expenses from journal (مصاريف فقط — توزيعات الأرباح ليست مصروفاً)
      const jExpenses = DB.getAll('journal').filter(j=>
        (j.entryType==='يدوي'||j.category) && j.loaderId===ld.id && j.loaderExpType!=='توزيع أرباح'
      );
      const totalExpenses = jExpenses.reduce((s,j)=>s+(Number(j.amount||j.debitAmount)||0),0);

      // Depreciation
      const monthsDep = ld.purchaseDate
        ? Math.max(1,Math.round((Date.now()-new Date(ld.purchaseDate))/(30*24*3600*1000)))
        : 0;
      const monthlyDep = ld.purchasePrice && ld.usefulLifeMonths
        ? Number(ld.purchasePrice)/Number(ld.usefulLifeMonths) : 0;
      const totalDep = monthlyDep * monthsDep;

      const netProfit = totalRevenue - totalExpenses; // الإهلاك لا يؤثر على الربح التشغيلي
      const statusCol = ld.status==='نشط' ? '#16a34a' : '#94a3b8';

      return `<div class="card" style="border-right:4px solid ${statusCol}">
        <div class="flex-between mb8">
          <div>
            <div style="font-size:16px;font-weight:700">🚜 ${ld.name}</div>
            <div class="text-xs text-gray mt4">
              ${ld.plateNo?'لوحة: '+ld.plateNo+' | ':''}
              ${ld.purchasePrice?'تكلفة: '+curr(ld.purchasePrice)+' | ':''}
              ${badge(ld.status||'نشط','green')}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-gray btn-sm" onclick="openLoaderModal(${ld.id})">✏️ تعديل</button>
            <button class="btn btn-gray btn-sm" onclick="window._LD_SEL=${ld.id};window._LD_TAB='report';nav('loaders')">📊 تقرير</button>
            <button class="btn-icon bi-del" onclick="deleteLoader(${ld.id})">🗑️</button>
          </div>
        </div>

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
          ${[
            ['إيراد الشهر','💰',curr(monthRevenue),'#1d4ed8'],
            ['إجمالي م³','📦',totalM3.toFixed(1)+' م³','#7c3aed'],
            ['مصاريف','💸',curr(totalExpenses),'#d97706'],
            ['صافي الربح','📈',curr(netProfit),netProfit>=0?'#16a34a':'#dc2626'],
          ].map(([l,ic,v,col])=>`
            <div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:11px;color:#64748b">${ic} ${l}</div>
              <div style="font-size:13px;font-weight:700;color:${col};margin-top:2px">${v}</div>
            </div>`).join('')}
        </div>
        ${ld.purchasePrice?`<div class="text-xs" style="color:#94a3b8;background:#f8fafc;border-radius:6px;padding:5px 8px;margin-bottom:8px">
          📊 للمطالعة فقط — إهلاك متراكم: ${curr(totalDep)} (لا يدخل في حساب الربح)
        </div>`:''}

        <!-- Partners -->
        ${(ld.partners||[]).length>0?`
        <div style="background:#f8fafc;border-radius:6px;padding:8px;margin-bottom:8px">
          <div class="text-xs font-bold mb4" style="color:#7c3aed">👥 الشركاء</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${(ld.partners||[]).map(pt=>{
              const ownershipAmt = ld.purchasePrice ? Number(ld.purchasePrice)*Number(pt.ownershipPct)/100 : 0;
              const debt = Math.max(0, ownershipAmt - Number(pt.paidAmount||0));
              const cumProfit  = getLoaderCumulativeProfit(ld); // ربح تشغيلي صافٍ منذ الشراء (بدون إهلاك)
              const cumShare   = cumProfit * Number(pt.ownershipPct)/100;
              const disbursed  = getLoaderPartnerDisbursed(ld.id, pt.partnerName);
              const remaining  = cumShare - disbursed;
              return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;min-width:160px">
                <div style="font-weight:700;font-size:11px">${pt.partnerName}</div>
                <div style="font-size:10px;color:#7c3aed">${pt.ownershipPct}% ملكية</div>
                <div style="font-size:10px;color:#16a34a">إجمالي حصته من الربح: ${curr(cumShare)}</div>
                <div style="font-size:10px;color:#64748b">مصروف له فعلياً: ${curr(disbursed)}</div>
                <div style="font-size:11px;font-weight:700;color:${remaining>0?'#d97706':'#16a34a'}">المتبقي له: ${curr(remaining)}</div>
                ${debt>0?`<div style="font-size:10px;color:#dc2626">⚠️ عهدة شراء: ${curr(debt)}</div>`:''}
                ${remaining>0?`<button class="btn btn-sm" data-lid="${ld.id}" data-pname="${pt.partnerName}"
                  onclick="openLoaderDisburseModal(Number(this.dataset.lid),this.dataset.pname)"
                  style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:10px;font-family:inherit;margin-top:4px;width:100%">💸 صرف ربح</button>`:''}
              </div>`;
            }).join('')}
          </div>
        </div>`:''}

        <!-- Material prices -->
        ${(ld.prices||[]).length>0?`
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${(ld.prices||[]).map(pr=>`
            <span style="background:#ede9fe;color:#7c3aed;border-radius:10px;padding:2px 8px;font-size:10px">
              ${pr.material}: ${pr.pricePerM3} ج.م/م³
            </span>`).join('')}
        </div>`:'<div class="text-xs text-gray">لم تُحدَّد أسعار الخامات بعد</div>'}
      </div>`;
    }).join('')}
  </div>`;
}

// ── Helper: get loader price for material ─────────────────────────
function getLoaderPrice(ld, material){
  const pr = (ld.prices||[]).find(p=>p.material===material);
  return pr ? Number(pr.pricePerM3)||0 : 0;
}

// ── Loader report tab ─────────────────────────────────────────────
function renderLoaderReport(loaders){
  const selId = window._LD_SEL;
  const from  = window._LD_FROM||'';
  const to    = window._LD_TO  ||'';

  const ldOpts = ['<option value="">— اختر لودر —</option>']
    .concat(loaders.map(ld=>`<option value="${ld.id}" ${ld.id==selId?'selected':''}>${ld.name}</option>`))
    .join('');

  const filterBar = `
    <div class="card mb12" style="padding:10px 14px">
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;min-width:160px">
          <label style="font-size:10px">اللودر</label>
          <select onchange="window._LD_SEL=this.value?Number(this.value):null;nav('loaders')"
            style="width:100%">${ldOpts}</select>
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">من</label>
          <input type="date" value="${from}" onchange="window._LD_FROM=this.value;nav('loaders')">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">إلى</label>
          <input type="date" value="${to}" onchange="window._LD_TO=this.value;nav('loaders')">
        </div>
        <button class="btn btn-gray btn-sm" onclick="window._LD_FROM='';window._LD_TO='';nav('loaders')">✕</button>
        <button class="btn btn-gray btn-sm" onclick="printLoaderReport()">🖨️ طباعة</button>
        <button class="btn btn-gray btn-sm" onclick="exportLoaderReportExcel()">📊 Excel</button>
      </div>
    </div>`;

  if(!selId) return filterBar+`
    <div class="card" style="text-align:center;padding:40px">
      <div style="font-size:36px">👆</div>
      <p class="text-gray mt8">اختر لودراً لعرض تقرير مركز الربح</p>
    </div>`;

  const ld = loaders.find(l=>l.id==selId);
  if(!ld) return filterBar+'<div class="alert alert-red">لودر غير موجود</div>';

  const allSarkis = DB.getAll('sarkis').filter(sk=>{
    if(sk.status==='ملغي') return false;
    if(from && sk.date<from) return false;
    if(to   && sk.date>to)   return false;
    return true;
  });

  // Collect invoice lines for this loader
  const invLines = [];
  allSarkis.forEach(sk=>{
    (sk.lines||[]).forEach(ln=>{
      if(ln.loaderName!==ld.name) return;
      const net   = Number(ln.netSell||ln.netCubic)||0;
      const price = getLoaderPrice(ld, sk.material);
      invLines.push({
        date:sk.date, skId:sk.id, client:sk.client,
        material:sk.material, plateNo:ln.plateNo||'',
        trips:Number(ln.trips)||0, netM3:net,
        price, revenue:net*price,
      });
    });
  });

  invLines.sort((a,b)=>a.date.localeCompare(b.date));
  const totalRevenue = invLines.reduce((s,l)=>s+l.revenue, 0);
  const totalM3      = invLines.reduce((s,l)=>s+l.netM3,   0);
  const totalTrips   = invLines.reduce((s,l)=>s+l.trips,    0);

  // Hourly jobs revenue
  const hourlyJobs = DB.getAll('loaderHours').filter(j=>{
    if(j.loaderId!==ld.id) return false;
    if(from && j.date<from) return false;
    if(to   && j.date>to)   return false;
    return true;
  }).sort((a,b)=>a.date.localeCompare(b.date));
  const totalHourlyRevenue = hourlyJobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);
  const totalHours = hourlyJobs.reduce((s,j)=>s+(Number(j.hours)||0),0);

  // Loading jobs revenue
  const loadingJobs = DB.getAll('loaderLoading').filter(j=>{
    if(j.loaderId!==ld.id) return false;
    if(from && j.date<from) return false;
    if(to   && j.date>to)   return false;
    return true;
  }).sort((a,b)=>a.date.localeCompare(b.date));
  const totalLoadingRevenue = loadingJobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);
  const totalLoadingTrips   = loadingJobs.reduce((s,j)=>s+(Number(j.trips)||0),0);
  const totalLoadingNetM3   = loadingJobs.reduce((s,j)=>s+(Number(j.netM3)||0),0);
  const grandRevenue = totalRevenue + totalHourlyRevenue + totalLoadingRevenue;

  // Expenses from journal linked to this loader
  const jExpenses = DB.getAll('journal').filter(j=>{
    if(j.loaderId!==ld.id) return false;
    if(from && (j.date||'')<from) return false;
    if(to   && (j.date||'')>to)   return false;
    return true;
  });
  const fuelExp  = jExpenses.filter(j=>j.loaderExpType==='سولار').reduce((s,j)=>s+(Number(j.amount||j.debitAmount)||0),0);
  const maintExp = jExpenses.filter(j=>j.loaderExpType==='صيانة').reduce((s,j)=>s+(Number(j.amount||j.debitAmount)||0),0);
  const salaryExp= jExpenses.filter(j=>j.loaderExpType==='راتب سائق').reduce((s,j)=>s+(Number(j.amount||j.debitAmount)||0),0);
  const otherExp = jExpenses.filter(j=>!j.loaderExpType).reduce((s,j)=>s+(Number(j.amount||j.debitAmount)||0),0);
  const totalExp = fuelExp+maintExp+salaryExp+otherExp;

  // Depreciation
  const monthlyDep = (ld.purchasePrice&&ld.usefulLifeMonths)
    ? Number(ld.purchasePrice)/Number(ld.usefulLifeMonths) : 0;
  const periodMonths = (from&&to)
    ? Math.max(1,Math.ceil((new Date(to)-new Date(from))/(30*24*3600*1000)))
    : new Date().getMonth()+1;
  const periodDep = monthlyDep * periodMonths;

  const totalCosts = totalExp;
  const netProfit  = grandRevenue - totalCosts;

  // Partner profit shares
  const partners = ld.partners||[];
  const companyPct = 100 - partners.reduce((s,p)=>s+Number(p.ownershipPct||0),0);

  return filterBar+`
    <div id="loader-report-content">
      <!-- Header card -->
      <div class="card mb12" style="background:linear-gradient(135deg,#1F4E78,#1a3a5c);color:#fff;padding:16px">
        <div class="flex-between">
          <div>
            <div style="font-size:20px;font-weight:700">🚜 ${ld.name}</div>
            <div style="font-size:11px;opacity:.8;margin-top:4px">
              ${from||'منذ البداية'} — ${to||'إلى اليوم'} |
              تكلفة الشراء: ${curr(ld.purchasePrice||0)} | خامات: ${curr(totalRevenue)} | ساعات: ${curr(totalHourlyRevenue)} | تحميل: ${curr(totalLoadingRevenue)}
            </div>
          </div>
          <div style="text-align:center;background:rgba(255,255,255,.15);border-radius:10px;padding:10px 20px">
            <div style="font-size:11px;opacity:.8">صافي الربح</div>
            <div style="font-size:24px;font-weight:700;color:${netProfit>=0?'#86efac':'#fca5a5'}">${curr(netProfit)}</div>
          </div>
        </div>
      </div>

      <!-- Revenue section -->
      <div class="card mb10">
        <div class="flex-between mb8">
          <div class="section-title" style="margin:0;color:#16a34a">📈 الإيراد من الحوافظ</div>
          <div style="font-size:14px;font-weight:700;color:#16a34a">${curr(totalRevenue)}</div>
        </div>
        <div class="tbl-wrap"><table style="font-size:10px">
          <thead><tr style="background:#16a34a;color:#fff">
            <th>التاريخ</th><th>حافظة</th><th>العميل</th><th>الخامة</th><th>السيارة</th>
            <th style="text-align:center">نقلات</th><th style="text-align:center">م³ صافي</th>
            <th style="text-align:center">سعر/م³</th><th style="text-align:center">الإيراد</th>
          </tr></thead>
          <tbody>
            ${invLines.map(l=>`<tr>
              <td>${fmtDate(l.date)}</td>
              <td><a href="#" onclick="openSarkiModal(${l.skId});return false" style="color:#1d4ed8">#${l.skId}</a></td>
              <td>${l.client}</td>
              <td>${badge(l.material,'purple')}</td>
              <td dir="ltr" class="text-xs">${l.plateNo}</td>
              <td style="text-align:center">${l.trips}</td>
              <td style="text-align:center;font-weight:700;color:#1d4ed8">${l.netM3.toFixed(1)}</td>
              <td style="text-align:center">${l.price}</td>
              <td style="text-align:center;font-weight:700;color:#16a34a">${curr(l.revenue)}</td>
            </tr>`).join('')||'<tr><td colspan="9" class="tbl-empty"><span class="tbl-empty-icon">📭</span>لا توجد بيانات — تأكد من تحديد اللودر في سطور الحوافظ</td></tr>'}
          </tbody>
          <tfoot><tr style="background:#dcfce7;font-weight:700">
            <td colspan="5">الإجمالي</td>
            <td style="text-align:center">${totalTrips}</td>
            <td style="text-align:center;color:#1d4ed8">${totalM3.toFixed(1)}</td>
            <td></td>
            <td style="text-align:center;color:#16a34a">${curr(totalRevenue)}</td>
          </tr></tfoot>
        </table></div>
      </div>

      <!-- Hourly section -->
      ${hourlyJobs.length>0?`<div class="card mb10">
        <div class="flex-between mb8">
          <div class="section-title" style="margin:0;color:#7c3aed">⏱️ إيراد الساعات</div>
          <div style="font-size:14px;font-weight:700;color:#7c3aed">${curr(totalHourlyRevenue)}</div>
        </div>
        <div class="tbl-wrap"><table style="font-size:10px">
          <thead><tr style="background:#7c3aed;color:#fff"><th>التاريخ</th><th>العميل</th><th>البيان</th><th>الساعات</th><th>سعر/ساعة</th><th>الإجمالي</th><th>خصم</th><th>صافي</th></tr></thead>
          <tbody>${hourlyJobs.map(j=>`<tr><td>${fmtDate(j.date)}</td><td>${j.client||'—'}</td><td class="text-xs">${j.description||'—'}</td><td style="text-align:center">${Number(j.hours)||0}</td><td style="text-align:center">${curr(j.pricePerHour||0)}</td><td style="text-align:center">${curr(j.grossAmount||0)}</td><td style="text-align:center;color:#d97706">${curr(j.discountClient||0)}</td><td style="text-align:center;font-weight:700;color:#7c3aed">${curr(j.netClient||0)}</td></tr>`).join('')}</tbody>
          <tfoot><tr style="background:#ede9fe;font-weight:700"><td colspan="7">الإجمالي</td><td style="text-align:center;color:#7c3aed">${curr(totalHourlyRevenue)}</td></tr></tfoot>
        </table></div></div>`:''}

      <!-- Loading section -->
      ${loadingJobs.length>0?`<div class="card mb10">
        <div class="flex-between mb8">
          <div class="section-title" style="margin:0;color:#0369a1">🚛 إيراد التحميل</div>
          <div style="font-size:14px;font-weight:700;color:#0369a1">${curr(totalLoadingRevenue)}</div>
        </div>
        <div class="tbl-wrap"><table style="font-size:10px">
          <thead><tr style="background:#0369a1;color:#fff"><th>التاريخ</th><th>العميل</th><th>نوع العمل</th><th>السيارة</th><th>نقلات</th><th>م³ صافي</th><th>سعر/م³</th><th>خصم</th><th>صافي</th></tr></thead>
          <tbody>${loadingJobs.map(j=>`<tr><td>${fmtDate(j.date)}</td><td>${j.client||'—'}</td><td>${badge(j.workType||'تحميل','blue')}</td><td class="font-mono text-xs">${j.plateNo||'—'}</td><td style="text-align:center">${Number(j.trips)||0}</td><td style="text-align:center;color:#0369a1">${(Number(j.netM3)||0).toFixed(1)}</td><td style="text-align:center">${curr(j.pricePerM3||0)}</td><td style="text-align:center;color:#d97706">${curr(j.discountClient||0)}</td><td style="text-align:center;font-weight:700;color:#0369a1">${curr(j.netClient||0)}</td></tr>`).join('')}</tbody>
          <tfoot><tr style="background:#e0f2fe;font-weight:700"><td colspan="8">الإجمالي</td><td style="text-align:center;color:#0369a1">${curr(totalLoadingRevenue)}</td></tr></tfoot>
        </table></div></div>`:''}

      <!-- Expenses section -->
      <div class="card mb10">
        <div class="flex-between mb8">
          <div class="section-title" style="margin:0;color:#dc2626">💸 المصاريف</div>
          <div style="font-size:14px;font-weight:700;color:#dc2626">${curr(totalCosts)}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
          ${[
            ['⛽ سولار',fuelExp,'#d97706'],
            ['🔧 صيانة',maintExp,'#dc2626'],
            ['👷 راتب سائق',salaryExp,'#7c3aed'],
            ['📦 أخرى',otherExp,'#64748b'],
          ].map(([l,v,col])=>`
            <div style="background:#fef2f2;border-radius:8px;padding:8px;text-align:center;border-right:3px solid ${col}">
              <div style="font-size:10px;color:#64748b">${l}</div>
              <div style="font-size:13px;font-weight:700;color:${col}">${curr(v)}</div>
            </div>`).join('')}
        </div>
        ${jExpenses.filter(j=>j.loaderExpType!=='توزيع أرباح').length>0?`
        <div class="tbl-wrap mt8"><table style="font-size:10px">
          <thead><tr style="background:#dc2626;color:#fff">
            <th>التاريخ</th><th>نوع المصروف</th><th>البيان</th><th style="text-align:center">المبلغ</th>
          </tr></thead>
          <tbody>
            ${jExpenses.filter(j=>j.loaderExpType!=='توزيع أرباح').map(j=>`<tr>
              <td>${fmtDate(j.date)}</td>
              <td>${badge(j.loaderExpType||'أخرى','gray')}</td>
              <td class="text-xs">${j.description||j.notes||'—'}</td>
              <td style="text-align:center;color:#dc2626">${curr(j.amount||j.debitAmount||0)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`:'<div class="text-xs text-gray mt8 text-center">أضف المصاريف من دفتر اليومية مع تحديد هذا اللودر</div>'}
      </div>

      <!-- Depreciation (informational only - does NOT affect profit) -->
      <div class="card mb10" style="background:#f8fafc;border:1px dashed #94a3b8">
        <div class="flex-between">
          <div>
            <div style="font-weight:700;font-size:12px;color:#64748b">📊 الإهلاك (للمطالعة فقط)</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">هذا الرقم لا يؤثر على الربح أو توزيعه على الشركاء — فقط لمتابعة استهلاك قيمة الأصل</div>
          </div>
          <div style="text-align:left">
            <div style="font-size:10px;color:#94a3b8">إهلاك شهري: ${curr(monthlyDep)}</div>
            <div style="font-size:16px;font-weight:700;color:#64748b">${curr(periodDep)}</div>
            <div style="font-size:9px;color:#94a3b8">(${periodMonths} شهر من الفترة المحددة)</div>
          </div>
        </div>
      </div>

      <!-- Profit distribution -->
      <div class="card mb10">
        <div class="section-title mb8" style="margin:0 0 10px">💰 توزيع الأرباح</div>
        <div class="text-xs text-gray mb8">
          الأرقام أدناه <strong>تراكمية منذ شراء اللودر</strong> (وليست محصورة بالفترة المختارة أعلاه) — لأن المتبقي للشريك حساب جارٍ مستمر
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
          ${(()=>{
            const cumProfit = getLoaderCumulativeProfit(ld);
            return [{partnerName:'الشركة',ownershipPct:companyPct,paidAmount:0},...partners].map(pt=>{
              const cumShare  = cumProfit * Number(pt.ownershipPct)/100;
              const ownershipAmt = ld.purchasePrice ? Number(ld.purchasePrice)*Number(pt.ownershipPct)/100 : 0;
              const debt = pt.partnerName==='الشركة' ? 0 : Math.max(0, ownershipAmt - Number(pt.paidAmount||0));
              const disbursed = pt.partnerName==='الشركة' ? 0 : getLoaderPartnerDisbursed(ld.id, pt.partnerName);
              const remaining = cumShare - disbursed;
              return `<div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">
                <div style="font-weight:700">${pt.partnerName==='الشركة'?'🏢':'🤝'} ${pt.partnerName}</div>
                <div style="font-size:11px;color:#7c3aed;margin:4px 0">${pt.ownershipPct}% ملكية</div>
                <div style="font-size:11px;color:#16a34a">إجمالي حصته: ${curr(cumShare)}</div>
                ${pt.partnerName!=='الشركة'?`
                <div style="font-size:11px;color:#64748b">مصروف له: ${curr(disbursed)}</div>
                <div style="font-size:13px;font-weight:700;color:${remaining>=0?'#d97706':'#dc2626'};margin-top:2px">المتبقي له: ${curr(remaining)}</div>
                ${debt>0?`<div style="font-size:10px;color:#dc2626;margin-top:4px">⚠️ عهدة شراء: ${curr(debt)}</div>`:''}
                ${remaining>0?`<button data-lid="${ld.id}" data-pname="${pt.partnerName}"
                  onclick="openLoaderDisburseModal(Number(this.dataset.lid),this.dataset.pname)"
                  style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;font-size:11px;font-family:inherit;margin-top:6px;width:100%">💸 صرف ربح</button>`:''}
                `:`<div style="font-size:13px;font-weight:700;color:#1d4ed8;margin-top:2px">(لا تحتاج صرفاً)</div>`}
              </div>`;
            }).join('');
          })()}
        </div>

        <!-- Disbursement log -->
        ${(()=>{
          const distEntries = DB.getAll('journal').filter(j=>
            j.entryType==='يدوي' && j.loaderId===ld.id && j.loaderExpType==='توزيع أرباح'
          ).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
          if(!distEntries.length) return '';
          return `
          <div class="text-xs font-bold mt12 mb6" style="color:#374151">📋 سجل الصرف</div>
          <div class="tbl-wrap"><table style="font-size:10px">
            <thead><tr style="background:#374151;color:#fff">
              <th>التاريخ</th><th>الشريك</th><th>البيان</th><th style="text-align:center">المبلغ</th>
            </tr></thead>
            <tbody>
              ${distEntries.map(j=>`<tr>
                <td>${fmtDate(j.date)}</td>
                <td class="font-bold">${j.party}</td>
                <td class="text-xs">${j.description||'—'}</td>
                <td style="text-align:center;color:#16a34a;font-weight:700">${curr(j.debitAmount||0)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`;
        })()}
      </div>
    </div>`;
}

// ── Open loader modal ─────────────────────────────────────────────
function openLoaderModal(id){
  const materials = DB.getAll('materials');
  const partners  = DB.getAll('partners');
  const ld = id ? DB.getById('loaders',id) : null;
  const v  = (k,d='')=>ld?.[k]??d;

  window._LDPrices   = ld ? JSON.parse(JSON.stringify(ld.prices||[])) : [];
  window._LDPartners = ld ? JSON.parse(JSON.stringify(ld.partners||[])) : [];

  const rPrices = ()=>{
    const el = document.getElementById('ld-prices');
    if(!el) return;
    el.innerHTML = window._LDPrices.map((pr,i)=>`
      <div style="display:grid;grid-template-columns:2fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px">
        <select onchange="window._LDPrices[${i}].material=this.value" style="font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;font-family:inherit">
          <option value="">اختر خامة</option>
          ${materials.map(m=>`<option ${pr.material===m.name?'selected':''}>${m.name}</option>`).join('')}
        </select>
        <input type="number" min="0" step="0.01" value="${pr.pricePerM3||''}" placeholder="سعر/م³"
          oninput="window._LDPrices[${i}].pricePerM3=Number(this.value)"
          style="font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;font-family:inherit">
        <button onclick="window._LDPrices.splice(${i},1);rPrices()" style="background:#fee2e2;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;color:#dc2626">✕</button>
      </div>`).join('')||'<div class="text-xs text-gray">لا توجد أسعار</div>';
  };
  window._rLDPrices = rPrices;

  const rPartners = ()=>{
    const el = document.getElementById('ld-partners');
    if(!el) return;
    el.innerHTML = window._LDPartners.map((pt,i)=>`
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px">
        <select onchange="window._LDPartners[${i}].partnerName=this.value" style="font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;font-family:inherit">
          <option value="">اختر شريك</option>
          ${partners.map(p=>`<option ${pt.partnerName===p.name?'selected':''}>${p.name}</option>`).join('')}
        </select>
        <input type="number" min="0" max="100" step="0.5" value="${pt.ownershipPct||''}" placeholder="% ملكية"
          oninput="window._LDPartners[${i}].ownershipPct=Number(this.value)"
          style="font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;font-family:inherit">
        <input type="number" min="0" step="100" value="${pt.paidAmount||''}" placeholder="مدفوع ج.م"
          oninput="window._LDPartners[${i}].paidAmount=Number(this.value)"
          style="font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;font-family:inherit">
        <input type="text" value="${pt.accountCode||''}" placeholder="كود حسابه (مثال: 3002)"
          oninput="window._LDPartners[${i}].accountCode=this.value.trim()"
          style="font-size:11px;padding:4px 6px;border:1px solid #1a5276;border-radius:5px;font-family:inherit;font-family:monospace"
          title="كود حساب المسحوبات في دليل الحسابات">
        <button onclick="window._LDPartners.splice(${i},1);rPartners()" style="background:#fee2e2;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;color:#dc2626">✕</button>
      </div>`).join('')||'<div class="text-xs text-gray">الشركة تمتلك 100%</div>';
  };
  window._rLDPartners = rPartners;

  const body = `
    <div class="form-row fr3">
      <div class="form-group"><label>اسم اللودر <span class="req">*</span></label><input id="ld-name" value="${v('name')}"></div>
      <div class="form-group"><label>رقم اللوحة</label><input id="ld-plate" value="${v('plateNo')}"></div>
      <div class="form-group"><label>الحالة</label>
        <select id="ld-status">
          <option ${v('status','نشط')==='نشط'?'selected':''}>نشط</option>
          <option ${v('status')==='متوقف'?'selected':''}>متوقف</option>
        </select>
      </div>
    </div>
    <div class="form-row fr3">
      <div class="form-group"><label>تاريخ الشراء</label><input type="date" id="ld-date" value="${v('purchaseDate')}"></div>
      <div class="form-group"><label>تكلفة الشراء (ج.م)</label><input type="number" id="ld-price" value="${v('purchasePrice')}" placeholder="0"></div>
      <div class="form-group"><label>العمر الإنتاجي (شهر)</label><input type="number" id="ld-life" value="${v('usefulLifeMonths',60)}" placeholder="60"></div>
    </div>

    <div class="section-title mt12 mb8">💰 أسعار الخامات</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:8px;padding:6px 10px;background:#f1f5f9;border-radius:6px">
      الإيراد = م³ صافي × سعر/م³ لكل خامة. الخامات غير المحددة = 0
    </div>
    <div id="ld-prices"></div>
    <button onclick="window._LDPrices.push({material:'',pricePerM3:0});window._rLDPrices()" class="btn btn-gray btn-sm mt4">+ خامة</button>

    <div class="section-title mt12 mb8">👥 الشركاء في اللودر</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:8px;padding:6px 10px;background:#f1f5f9;border-radius:6px">
      حدد نسبة ملكية كل شريك والمبلغ الذي دفعه فعلياً من حصته
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;padding:0 2px;margin-bottom:4px">
      <span style="font-size:10px;color:#64748b">الشريك</span>
      <span style="font-size:10px;color:#64748b">% ملكية</span>
      <span style="font-size:10px;color:#64748b">مدفوع ج.م</span>
      <span style="font-size:10px;color:#1a5276;font-weight:700">كود الحساب</span>
      <span></span>
    </div>
    <div id="ld-partners"></div>
    <button onclick="window._LDPartners.push({partnerName:'',ownershipPct:0,paidAmount:0});window._rLDPartners()" class="btn btn-gray btn-sm mt4">+ شريك</button>
  `;

  const footer = `
    <button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="saveLoader(${id||'null'})">💾 حفظ اللودر</button>`;

  openModal((id?'تعديل':'إضافة')+' لودر', body, footer, 'modal-xl');
  setTimeout(()=>{ rPrices(); rPartners(); }, 80);
}

// ── Save loader ───────────────────────────────────────────────────
function saveLoader(id){
  const name = document.getElementById('ld-name')?.value?.trim();
  if(!name) return toast('أدخل اسم اللودر','error');

  const data = {
    name,
    plateNo:         document.getElementById('ld-plate')?.value?.trim()||'',
    status:          document.getElementById('ld-status')?.value||'نشط',
    purchaseDate:    document.getElementById('ld-date')?.value||'',
    purchasePrice:   Number(document.getElementById('ld-price')?.value)||0,
    usefulLifeMonths:Number(document.getElementById('ld-life')?.value)||60,
    prices:          window._LDPrices.filter(p=>p.material&&p.pricePerM3),
    partners:        window._LDPartners.filter(p=>p.partnerName&&p.ownershipPct).map(p=>({...p,accountCode:p.accountCode||''})),
  };

  if(id) DB.update('loaders',id,data);
  else   DB.insert('loaders',data);

  // Refresh loaders cache for sarkis modal
  window._LOADERS = DB.getAll('loaders');
  closeModal();
  toast('✅ تم حفظ اللودر: '+name);
  nav('loaders');
}

// ── Delete loader ─────────────────────────────────────────────────
function deleteLoader(id){
  const ld = DB.getById('loaders',id);
  if(!confirmDelete('حذف لودر "'+ld?.name+'"؟ سيُحذف من كل السجلات')) return;
  DB.delete('loaders',id);
  window._LOADERS = DB.getAll('loaders');
  toast('تم الحذف');
  nav('loaders');
}

// ── Print loader report ───────────────────────────────────────────
function printLoaderReport(){
  const el = document.getElementById('loader-report-content');
  if(!el){ toast('اختر لودراً أولاً','error'); return; }
  const co = DB.getCompany();
  _pw('تقرير مركز ربح اللودر', printHeaderHTML()+el.innerHTML);
}

// ── Excel loader report ───────────────────────────────────────────
function exportLoaderReportExcel(){
  if(typeof XLSX==='undefined'){ toast('مكتبة Excel غير محملة','error'); return; }
  const loaders = DB.getAll('loaders');
  const ld = loaders.find(l=>l.id==window._LD_SEL);
  if(!ld){ toast('اختر لودراً أولاً','error'); return; }

  const from = window._LD_FROM||'';
  const to   = window._LD_TO||'';
  const co   = DB.getCompany();

  const allSarkis = DB.getAll('sarkis').filter(sk=>{
    if(sk.status==='ملغي') return false;
    if(from && sk.date<from) return false;
    if(to   && sk.date>to)   return false;
    return true;
  });

  const rows = [];
  allSarkis.forEach(sk=>{
    (sk.lines||[]).forEach(ln=>{
      if(ln.loaderName!==ld.name) return;
      const net   = Number(ln.netSell||ln.netCubic)||0;
      const price = getLoaderPrice(ld, sk.material);
      rows.push([
        sk.date?sk.date.split('-').reverse().join('/'):'-',
        '#'+sk.id, sk.client, sk.material,
        ln.plateNo||'', Number(ln.trips)||0,
        net, price, net*price,
      ]);
    });
  });
  rows.sort((a,b)=>a[0].localeCompare(b[0]));

  const totM3  = rows.reduce((s,r)=>s+r[6],0);
  const totRev = rows.reduce((s,r)=>s+r[8],0);

  const data = [
    [co.name||'شركة الهنا للنقل','','','','','','','',''],
    ['تقرير مركز ربح: '+ld.name,'','','','من: '+(from||'البداية'),'إلى: '+(to||'اليوم'),'','',''],
    [],
    ['التاريخ','رقم الحافظة','العميل','الخامة','السيارة','نقلات','م³ صافي','سعر/م³','الإيراد'],
    ...rows,
    [],
    ['','','','','','الإجمالي',totM3,'',totRev],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=[{wch:12},{wch:10},{wch:14},{wch:14},{wch:12},{wch:8},{wch:10},{wch:8},{wch:14}];
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}},{s:{r:1,c:0},e:{r:1,c:8}}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ld.name.slice(0,31));
  XLSX.writeFile(wb, 'تقرير_لودر_'+ld.name+'.xlsx');
  toast('✅ تم التصدير');
}

// ═══════════════════════════════════════════════════════════════════
// LOADER LOADING JOBS — أعمال اللودر تحميل لعملاء خارجيين
// ═══════════════════════════════════════════════════════════════════

// ── Render loading jobs tab ───────────────────────────────────────
function renderLoaderLoading(loaders){
  const selId = window._LDL_SEL || (loaders[0]?.id||null);
  const from  = window._LDL_FROM || '';
  const to    = window._LDL_TO   || '';

  const ldOpts = loaders.map(ld=>
    `<option value="${ld.id}" ${ld.id==selId?'selected':''}>${ld.name}</option>`
  ).join('');

  const jobs = DB.getAll('loaderLoading').filter(j=>{
    if(j.loaderId !== selId) return false;
    if(from && j.date < from) return false;
    if(to   && j.date > to)   return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);

  const totTrips  = jobs.reduce((s,j)=>s+(Number(j.trips)||0),0);
  const totGrossM3= jobs.reduce((s,j)=>s+(Number(j.grossM3)||0),0);
  const totNetM3  = jobs.reduce((s,j)=>s+(Number(j.netM3)||0),0);
  const totGross  = jobs.reduce((s,j)=>s+(Number(j.grossAmount)||0),0);
  const totDisc   = jobs.reduce((s,j)=>s+(Number(j.discountClient)||0),0);
  const totNet    = jobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);

  return `<div>
    <div class="card mb12" style="padding:10px 14px">
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;min-width:160px">
          <label style="font-size:10px">اللودر</label>
          <select onchange="window._LDL_SEL=Number(this.value)||null;nav('loaders')" style="width:100%">
            ${ldOpts}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">من</label>
          <input type="date" value="${from}" onchange="window._LDL_FROM=this.value;nav('loaders')">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">إلى</label>
          <input type="date" value="${to}" onchange="window._LDL_TO=this.value;nav('loaders')">
        </div>
        <button class="btn btn-gray btn-sm" onclick="window._LDL_FROM='';window._LDL_TO='';nav('loaders')">✕</button>
        <button class="btn btn-primary btn-sm" onclick="openLoaderLoadingModal(null,${selId||'null'})">+ إضافة عمل تحميل</button>
        <button class="btn btn-gray btn-sm" onclick="printLoaderLoading()">🖨️ طباعة</button>
        <button class="btn btn-gray btn-sm" onclick="exportLoaderLoadingExcel()">📊 Excel</button>
      </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px">
      ${[
        ['النقلات','🚛',totTrips+' نقلة','#1d4ed8'],
        ['م³ صافي','📦',totNetM3.toFixed(1)+' م³','#7c3aed'],
        ['إجمالي الإيراد','💰',curr(totGross),'#16a34a'],
        ['خصم العميل','🔻',curr(totDisc),'#d97706'],
        ['صافي الإيراد','📈',curr(totNet),totNet>=0?'#16a34a':'#dc2626'],
      ].map(([l,ic,v,col])=>`
        <div class="card-sm text-center">
          <div class="text-xs text-gray mb4">${ic} ${l}</div>
          <div style="font-size:13px;font-weight:700;color:${col}">${v}</div>
        </div>`).join('')}
    </div>

    <!-- Table -->
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>#</th><th>التاريخ</th><th>العميل</th><th>نوع العمل</th><th>رقم السيارة</th>
        <th style="text-align:center">نقلات</th>
        <th style="text-align:center">م³/نقلة</th>
        <th style="text-align:center">إجمالي م³</th>
        <th style="text-align:center;background:#dc2626;color:#fff">خصم م³</th>
        <th style="text-align:center">صافي م³</th>
        <th style="text-align:center">سعر/م³</th>
        <th style="text-align:center">الإجمالي</th>
        <th style="text-align:center;background:#d97706;color:#fff">خصم عميل</th>
        <th style="text-align:center;color:#16a34a">صافي الإيراد</th>
        <th>إجراء</th>
      </tr></thead>
      <tbody>
        ${jobs.length===0
          ? `<tr><td colspan="15" class="tbl-empty"><span class="tbl-empty-icon">🚛</span>لا توجد بيانات — أضف عمل تحميل</td></tr>`
          : jobs.map((j,i)=>`<tr>
              <td class="text-gray text-xs">${i+1}</td>
              <td>${fmtDate(j.date)}</td>
              <td><strong>${j.client||'—'}</strong></td>
              <td>${badge(j.workType||'تحميل','blue')}</td>
              <td class="font-mono text-xs">${j.plateNo||'—'}</td>
              <td style="text-align:center;font-weight:700">${Number(j.trips)||0}</td>
              <td style="text-align:center">${Math.round((Number(j.cubicPerTrip)||0)*100)/100}</td>
              <td style="text-align:center">${(Number(j.grossM3)||0).toFixed(1)}</td>
              <td style="text-align:center;color:#dc2626">${Number(j.discountM3)||0}</td>
              <td style="text-align:center;font-weight:700;color:#7c3aed">${(Number(j.netM3)||0).toFixed(1)}</td>
              <td style="text-align:center">${curr(j.pricePerM3||0)}</td>
              <td style="text-align:center;font-weight:700;color:#1d4ed8">${curr(j.grossAmount||0)}</td>
              <td style="text-align:center;color:#d97706">${curr(j.discountClient||0)}</td>
              <td style="text-align:center;font-weight:700;color:#16a34a">${curr(j.netClient||0)}</td>
              <td>
                <button onclick="openLoaderLoadingModal(${j.id},${selId||'null'})" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:11px">✏️</button>
                <button onclick="deleteLoaderLoading(${j.id})" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:11px">🗑️</button>
              </td>
            </tr>`).join('')}
      </tbody>
      ${jobs.length>0?`<tfoot><tr style="background:#fefce8;font-weight:700">
        <td colspan="5">الإجمالي</td>
        <td style="text-align:center">${totTrips}</td>
        <td></td>
        <td style="text-align:center">${totGrossM3.toFixed(1)}</td>
        <td></td>
        <td style="text-align:center;color:#7c3aed">${totNetM3.toFixed(1)}</td>
        <td></td>
        <td style="text-align:center;color:#1d4ed8">${curr(totGross)}</td>
        <td style="text-align:center;color:#d97706">${curr(totDisc)}</td>
        <td style="text-align:center;color:#16a34a">${curr(totNet)}</td>
        <td></td>
      </tr></tfoot>`:''}
    </table></div>
  </div>`;
}

// ── Modal ─────────────────────────────────────────────────────────
// ── Modal: multi-line loading job (like sarkis) ───────────────────
function openLoaderLoadingModal(jobId, loaderId){
  const loaders   = DB.getAll('loaders');
  const customers = DB.getAll('customers');
  const job = jobId ? DB.getById('loaderLoading', jobId) : null;
  const v   = (k,d='')=>job?.[k]??d;
  const ld  = loaders.find(l=>l.id==(job?.loaderId||loaderId))||loaders[0];

  const ldOpts = loaders.map(l=>
    `<option value="${l.id}" ${l.id==(job?.loaderId||loaderId)?'selected':''}>${l.name}</option>`
  ).join('');

  const defaultTypes = ['تحميل','قطع','تشوين','نقل ونفايات','تسوية'];
  const customTypes  = JSON.parse(localStorage.getItem('_ldLoadTypes')||'[]');
  const allTypes     = [...new Set([...defaultTypes,...customTypes])].filter(Boolean);

  // Init lines
  window._LLLines = job?.lines ? JSON.parse(JSON.stringify(job.lines)) : [{plateNo:'',trips:0,cubicPerTrip:0,discountM3:0,netM3:0,pricePerM3:0,grossAmount:0}];

  const rLines = ()=>{
    const el = document.getElementById('ll-lines-body');
    if(!el) return;
    const client = document.getElementById('ll-client')?.value||'';
    const wtype  = document.getElementById('ll-wtype')?.value||'';
    const ldId   = Number(document.getElementById('ll-loader')?.value)||null;
    const ldObj  = DB.getAll('loaders').find(l=>l.id===ldId);
    const autoPrice = getLoaderLoadingPrice(ldObj||{}, client, wtype);

    el.innerHTML = window._LLLines.map((ln,i)=>`
      <tr>
        <td><input type="text" value="${ln.plateNo||''}" placeholder="اللوحة"
          oninput="window._LLLines[${i}].plateNo=this.value"
          style="width:90px;font-size:10px;padding:3px 5px;border:1px solid #e2e8f0;border-radius:4px;font-family:inherit"></td>
        <td><input type="number" min="0" value="${ln.trips||0}"
          oninput="window._LLLines[${i}].trips=Number(this.value);llLineRecalc(${i})"
          style="width:60px;text-align:center;font-size:10px;padding:3px 5px;border:1px solid #e2e8f0;border-radius:4px;font-family:inherit"></td>
        <td><input type="number" min="0" step="0.01" value="${ln.cubicPerTrip||0}"
          oninput="window._LLLines[${i}].cubicPerTrip=Number(this.value);llLineRecalc(${i})"
          style="width:65px;text-align:center;font-size:10px;padding:3px 5px;border:1px solid #e2e8f0;border-radius:4px;font-family:inherit"></td>
        <td style="text-align:center;font-weight:700;color:#7c3aed;font-size:10px" id="ll-gm3-${i}">${((ln.trips||0)*(ln.cubicPerTrip||0)).toFixed(1)}</td>
        <td><input type="number" min="0" step="0.01" value="${ln.discountM3||0}"
          oninput="window._LLLines[${i}].discountM3=Number(this.value);llLineRecalc(${i})"
          style="width:55px;text-align:center;font-size:10px;padding:3px 5px;border:1px solid #dc2626;border-radius:4px;font-family:inherit;color:#dc2626"></td>
        <td style="text-align:center;font-weight:700;color:#1d4ed8;font-size:10px" id="ll-nm3-${i}">${(ln.netM3||0).toFixed(1)}</td>
        <td><input type="number" min="0" step="0.01" value="${ln.pricePerM3||autoPrice}"
          oninput="window._LLLines[${i}].pricePerM3=Number(this.value);llLineRecalc(${i})"
          style="width:65px;text-align:center;font-size:10px;padding:3px 5px;border:1px solid #1a5276;border-radius:4px;font-family:inherit"></td>
        <td style="text-align:center;font-weight:700;color:#16a34a;font-size:10px" id="ll-amt-${i}">${curr(ln.grossAmount||0)}</td>
        <td><button onclick="window._LLLines.splice(${i},1);window._rLLLines()" 
          style="background:#fee2e2;border:none;border-radius:4px;padding:3px 7px;cursor:pointer;color:#dc2626;font-size:11px">✕</button></td>
      </tr>`).join('');
    llUpdateTotals();
  };
  window._rLLLines = rLines;

  const body = `
    <div class="form-row fr2 mb8">
      <div class="form-group"><label>اللودر <span class="req">*</span></label>
        <select id="ll-loader" onchange="window._rLLLines()">${ldOpts}</select></div>
      <div class="form-group"><label>التاريخ <span class="req">*</span></label>
        <input type="date" id="ll-date" value="${v('date',todayStr())}"></div>
    </div>
    <div class="form-row fr2 mb8">
      <div class="form-group"><label>العميل <span class="req">*</span></label>
        <select id="ll-client" onchange="window._rLLLines()">
          <option value="">— اختر عميل —</option>
          ${customers.map(c=>`<option ${v('client')===c.name?'selected':''}>${c.name}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>نوع العمل <span class="req">*</span></label>
        <div style="display:flex;gap:6px">
          <select id="ll-wtype" style="flex:1" onchange="window._rLLLines()">
            ${allTypes.map(t=>`<option ${v('workType')===t?'selected':''}>${t}</option>`).join('')}
          </select>
          <input id="ll-wtype-new" placeholder="نوع جديد..." style="width:110px;font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;font-family:inherit">
          <button onclick="(function(){var n=document.getElementById('ll-wtype-new').value.trim();if(!n)return;var s=document.getElementById('ll-wtype');var o=document.createElement('option');o.text=n;o.value=n;s.add(o);s.value=n;var saved=JSON.parse(localStorage.getItem('_ldLoadTypes')||'[]');if(!saved.includes(n)){saved.push(n);localStorage.setItem('_ldLoadTypes',JSON.stringify(saved));}document.getElementById('ll-wtype-new').value='';window._rLLLines();})()" 
            style="background:#1d4ed8;color:#fff;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;font-family:inherit">+ إضافة</button>
        </div>
      </div>
    </div>
    <div class="form-row fr2 mb8">
      <div class="form-group"><label>البيان</label>
        <input id="ll-desc" value="${v('description')}" placeholder="وصف العمل"></div>
      <div class="form-group"><label>خصم إجمالي على العميل (ج.م)</label>
        <input type="number" id="ll-disc-client" min="0" value="${v('discountClient',0)}" oninput="llUpdateTotals()"></div>
    </div>

    <!-- Lines table -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px">
      <div style="background:#1F4E78;color:#fff;padding:6px 10px;font-size:11px;font-weight:700">📦 سطور العمل</div>
      <div class="tbl-wrap" style="margin:0"><table style="font-size:10px">
        <thead><tr style="background:#1a3a5c;color:#fff">
          <th style="padding:5px 6px">السيارة/اللوحة</th>
          <th style="padding:5px 6px;text-align:center">نقلات</th>
          <th style="padding:5px 6px;text-align:center">م³/نقلة</th>
          <th style="padding:5px 6px;text-align:center">إجمالي م³</th>
          <th style="padding:5px 6px;text-align:center;color:#fca5a5">خصم م³</th>
          <th style="padding:5px 6px;text-align:center;color:#93c5fd">صافي م³</th>
          <th style="padding:5px 6px;text-align:center">سعر/م³</th>
          <th style="padding:5px 6px;text-align:center;color:#86efac">الإجمالي</th>
          <th style="padding:5px 6px"></th>
        </tr></thead>
        <tbody id="ll-lines-body"></tbody>
        <tfoot>
          <tr style="background:#fefce8;font-weight:700;font-size:10px">
            <td style="padding:5px 8px">المجموع</td>
            <td style="text-align:center" id="ll-tot-trips">0</td>
            <td></td>
            <td style="text-align:center;color:#7c3aed" id="ll-tot-gm3">0.0</td>
            <td></td>
            <td style="text-align:center;color:#1d4ed8" id="ll-tot-nm3">0.0</td>
            <td></td>
            <td style="text-align:center;color:#16a34a" id="ll-tot-amt">0.00 ج.م</td>
            <td></td>
          </tr>
        </tfoot>
      </table></div>
      <div style="padding:8px 10px">
        <button onclick="window._LLLines.push({plateNo:'',trips:0,cubicPerTrip:0,discountM3:0,netM3:0,pricePerM3:0,grossAmount:0});window._rLLLines()"
          style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;padding:4px 12px;cursor:pointer;font-size:11px;font-family:inherit;color:#1d4ed8">+ إضافة سطر</button>
      </div>
    </div>

    <!-- Net total -->
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">صافي الإيراد بعد خصم العميل</div>
      <div id="ll-net-total" style="font-size:20px;font-weight:700;color:#16a34a">0.00 ج.م</div>
    </div>

`;

  const foot = `
    <button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="saveLoaderLoading(${jobId||'null'})">💾 حفظ</button>`;

  openModal((jobId?'تعديل':'إضافة')+' عمل تحميل لودر', body, foot, 'modal-xl');
  setTimeout(()=>{ window._rLLLines && window._rLLLines(); }, 150);
}

function saveLoaderLoading(jobId){
  const loaderId = Number(document.getElementById('ll-loader')?.value)||null;
  const date     = document.getElementById('ll-date')?.value;
  const client   = document.getElementById('ll-client')?.value;
  const lines    = (window._LLLines||[]).filter(l=>l.trips>0);

  if(!loaderId||!date||!client||!lines.length) return toast('أكمل الحقول المطلوبة (لازم سطر واحد على الأقل)','error');

  let workType = document.getElementById('ll-wtype')?.value||'تحميل';

  const trips     = lines.reduce((s,l)=>s+(Number(l.trips)||0),0);
  const grossM3   = lines.reduce((s,l)=>s+(Number(l.grossM3)||0),0);
  const netM3     = lines.reduce((s,l)=>s+(Number(l.netM3)||0),0);
  const grossAmt  = lines.reduce((s,l)=>s+(Number(l.grossAmount)||0),0);
  const discC     = Number(document.getElementById('ll-disc-client')?.value)||0;
  const netClient = Math.max(0, grossAmt - discC);

  const data = {
    loaderId, date, client, workType,
    description: document.getElementById('ll-desc')?.value?.trim()||'',
    lines,
    trips, grossM3, netM3,
    grossAmount:    grossAmt,
    discountClient: discC,
    netClient,
    // for backward compat
    cubicPerTrip: netM3>0&&trips>0 ? Math.round((netM3/trips)*100)/100 : 0,
    pricePerM3: grossAmt>0&&netM3>0 ? grossAmt/netM3 : 0,
  };

  if(jobId) DB.update('loaderLoading', jobId, data);
  else      DB.insert('loaderLoading', data);

  toast('✅ تم الحفظ');
  closeModal();
  nav('loaders');
}

function deleteLoaderLoading(id){
  confirmDelete('حذف هذا السجل؟', ()=>{
    DB.remove('loaderLoading', id);
    toast('تم الحذف');
    nav('loaders');
  });
}

function printLoaderLoading(){
  const loaders = DB.getAll('loaders');
  const selId   = window._LDL_SEL||(loaders[0]?.id||null);
  const ld      = loaders.find(l=>l.id==selId);
  if(!ld){ toast('اختر لودراً أولاً','error'); return; }
  const from = window._LDL_FROM||'';
  const to   = window._LDL_TO||'';
  const jobs = DB.getAll('loaderLoading').filter(j=>{
    if(j.loaderId!==selId) return false;
    if(from && j.date<from) return false;
    if(to   && j.date>to)   return false;
    return true;
  }).sort((a,b)=>a.date.localeCompare(b.date));

  const _n = n=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';
  const _d = d=>{ if(!d)return'—'; const dd=new Date(d); return isNaN(dd)?d:dd.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}); };

  const totTrips = jobs.reduce((s,j)=>s+(Number(j.trips)||0),0);
  const totNetM3 = jobs.reduce((s,j)=>s+(Number(j.netM3)||0),0);
  const totNet   = jobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);

  const rows = jobs.map((j,i)=>`<tr>
    <td>${i+1}</td><td>${_d(j.date)}</td><td>${j.client||'—'}</td><td>${j.workType||'—'}</td>
    <td>${j.plateNo||'—'}</td><td>${Number(j.trips)||0}</td><td>${(Number(j.netM3)||0).toFixed(1)}</td>
    <td>${_n(j.pricePerM3)}</td><td>${_n(j.discountClient)}</td><td>${_n(j.netClient)}</td>
  </tr>`).join('');

  const totGross = jobs.reduce((s,j)=>s+(Number(j.grossAmount)||0),0);
  const totDisc  = jobs.reduce((s,j)=>s+(Number(j.discountClient)||0),0);
  const co = DB.getCompany();
  const w  = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <style>
      *{font-family:Tahoma,sans-serif;font-size:10px;direction:rtl}
      body{padding:14px}
      .hdr{border-bottom:3px solid #1F4E78;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start}
      .co{font-size:14px;font-weight:700;color:#1F4E78}
      .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
      .kpi-box{border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}
      .kpi-label{font-size:9px;color:#64748b;margin-bottom:2px}
      .kpi-val{font-size:12px;font-weight:700}
      table{width:100%;border-collapse:collapse}
      th{background:#0369a1;color:#fff;padding:6px 5px;text-align:right}
      td{padding:4px 5px;border-bottom:1px solid #eee}
      tfoot td{background:#fefce8;font-weight:700}
      .footer{margin-top:10px;border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
      @media print{@page{margin:9mm;size:A4}body{padding:0}}
    </style></head><body>
    <div class="hdr">
      <div>
        <div class="co">${co.name||'شركة الهنا للنقل'}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">تقرير أعمال التحميل: ${ld.name}</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:2px">
          الفترة: ${from?_d(from):'البداية'} — ${to?_d(to):'اليوم'} | 
          تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
        </div>
      </div>
      <div style="text-align:center;background:#0369a1;color:#fff;border-radius:8px;padding:8px 16px">
        <div style="font-size:9px;opacity:.8">صافي الإيراد</div>
        <div style="font-size:18px;font-weight:700">${_n(totNet)}</div>
      </div>
    </div>
    <div class="kpi">
      <div class="kpi-box"><div class="kpi-label">إجمالي النقلات</div><div class="kpi-val" style="color:#1d4ed8">${totTrips} نقلة</div></div>
      <div class="kpi-box"><div class="kpi-label">م³ صافي</div><div class="kpi-val" style="color:#7c3aed">${totNetM3.toFixed(1)}</div></div>
      <div class="kpi-box"><div class="kpi-label">خصم العملاء</div><div class="kpi-val" style="color:#d97706">${_n(totDisc)}</div></div>
      <div class="kpi-box"><div class="kpi-label">صافي الإيراد</div><div class="kpi-val" style="color:#16a34a">${_n(totNet)}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>التاريخ</th><th>العميل</th><th>نوع العمل</th><th>السيارة</th>
        <th style="text-align:center">نقلات</th>
        <th style="text-align:center">م³ صافي</th>
        <th style="text-align:center">سعر/م³</th>
        <th style="text-align:center">خصم عميل</th>
        <th style="text-align:center">صافي الإيراد</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="5">الإجمالي</td>
        <td style="text-align:center;color:#1d4ed8">${totTrips}</td>
        <td style="text-align:center;color:#7c3aed">${totNetM3.toFixed(1)}</td>
        <td></td>
        <td style="text-align:center;color:#d97706">${_n(totDisc)}</td>
        <td style="text-align:center;color:#16a34a">${_n(totNet)}</td>
      </tr></tfoot>
    </table>
    <div class="footer">
      <span>${co.name||'شركة الهنا للنقل'}</span>
      <span>${new Date().toLocaleDateString('ar-EG')}</span>
    </div>
    <script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
  w.document.close();
}

function exportLoaderLoadingExcel(){
  if(typeof XLSX==='undefined'){ toast('مكتبة Excel غير محملة','error'); return; }
  const loaders = DB.getAll('loaders');
  const selId   = window._LDL_SEL||(loaders[0]?.id||null);
  const ld      = loaders.find(l=>l.id==selId);
  if(!ld){ toast('اختر لودراً أولاً','error'); return; }
  const from = window._LDL_FROM||'';
  const to   = window._LDL_TO||'';
  const jobs = DB.getAll('loaderLoading').filter(j=>{
    if(j.loaderId!==selId) return false;
    if(from && j.date<from) return false;
    if(to   && j.date>to)   return false;
    return true;
  }).sort((a,b)=>a.date.localeCompare(b.date));

  const co = DB.getCompany();
  const header = [
    [co.name||'شركة الهنا للنقل','','أعمال التحميل: '+ld.name,'','','','','','',''],
    ['الفترة: '+(from||'البداية')+' — '+(to||'اليوم'),'','','','','','','','',''],
    [],
    ['#','التاريخ','العميل','نوع العمل','السيارة','نقلات','م³ صافي','سعر/م³','خصم عميل','صافي الإيراد'],
  ];
  const rows = jobs.map((j,i)=>[
    i+1,
    j.date?j.date.split('-').reverse().join('/'):'-',
    j.client||'', j.workType||'', j.plateNo||'',
    Number(j.trips)||0,
    Number(j.netM3)||0,
    Number(j.pricePerM3)||0,
    Number(j.discountClient)||0,
    Number(j.netClient)||0,
  ]);
  const totRow = ['','','','الإجمالي','',
    jobs.reduce((s,j)=>s+(Number(j.trips)||0),0),
    jobs.reduce((s,j)=>s+(Number(j.netM3)||0),0),
    '','',
    jobs.reduce((s,j)=>s+(Number(j.netClient)||0),0),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...header,...rows,totRow]);
  ws['!cols']=[{wch:4},{wch:12},{wch:16},{wch:12},{wch:14},{wch:8},{wch:10},{wch:10},{wch:10},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws, 'تحميل '+ld.name.slice(0,20));
  XLSX.writeFile(wb, 'تحميل_لودر_'+ld.name+'.xlsx');
  toast('✅ تم التصدير');
}

// ═══════════════════════════════════════════════════════════════════
// LOADER STATEMENTS
// ═══════════════════════════════════════════════════════════════════
function renderLoaderStatements(loaders){
  const selId=window._LDS_SEL||(loaders[0]?.id||null);
  const from=window._LDS_FROM||'', to=window._LDS_TO||'';
  const ldOpts=loaders.map(ld=>`<option value="${ld.id}" ${ld.id==selId?'selected':''}>${ld.name}</option>`).join('');
  const ld=loaders.find(l=>l.id==selId);
  const stmts=DB.getAll('loaderStatements').filter(s=>s.loaderId===selId).sort((a,b)=>b.createdAt-a.createdAt);
  let periodRevCubic=0,periodRevHourly=0,periodRevLoading=0,periodExp=0;
  if(ld&&from&&to){
    DB.getAll('sarkis').filter(sk=>sk.status!=='ملغي'&&sk.date>=from&&sk.date<=to).forEach(sk=>{
      (sk.lines||[]).forEach(ln=>{
        if(ln.loaderName!==ld.name) return;
        periodRevCubic+=(Number(ln.netSell||ln.netCubic)||0)*getLoaderPrice(ld,sk.material);
      });
    });
    DB.getAll('loaderHours').filter(j=>j.loaderId===selId&&j.date>=from&&j.date<=to).forEach(j=>{periodRevHourly+=Number(j.netClient)||0;});
    DB.getAll('loaderLoading').filter(j=>j.loaderId===selId&&j.date>=from&&j.date<=to).forEach(j=>{periodRevLoading+=Number(j.netClient)||0;});
    DB.getAll('journal').filter(j=>j.loaderId===ld.id&&j.loaderExpType!=='توزيع أرباح'&&(j.date||'')>=from&&(j.date||'')<=to).forEach(j=>{periodExp+=Number(j.amount||j.debitAmount)||0;});
  }
  const periodGrand=periodRevCubic+periodRevHourly+periodRevLoading;
  const periodProfit=periodGrand-periodExp;
  const partners=ld?.partners||[];
  const companyPct=100-partners.reduce((s,p)=>s+Number(p.ownershipPct||0),0);
  return `<div>
    <div class="card mb12" style="padding:10px 14px">
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;min-width:160px"><label style="font-size:10px">اللودر</label>
          <select onchange="window._LDS_SEL=Number(this.value)||null;nav('loaders')" style="width:100%">${ldOpts}</select></div>
        <div class="form-group" style="margin:0"><label style="font-size:10px">من تاريخ</label>
          <input type="date" value="${from}" onchange="window._LDS_FROM=this.value;nav('loaders')"></div>
        <div class="form-group" style="margin:0"><label style="font-size:10px">إلى تاريخ</label>
          <input type="date" value="${to}" onchange="window._LDS_TO=this.value;nav('loaders')"></div>
        <button class="btn btn-gray btn-sm" onclick="window._LDS_FROM='';window._LDS_TO='';nav('loaders')">✕</button>
        ${from&&to&&ld?`<button class="btn btn-primary btn-sm" onclick="openLoaderStmtApprove(${selId||'null'})">✅ اعتماد</button>`:''}
        <button class="btn btn-gray btn-sm" onclick="openLoaderPrintOptions(${selId||'null'})">🖨️ طباعة مخصصة</button>
      </div>
    </div>
    ${ld&&from&&to?`
    <div class="card mb12" style="background:linear-gradient(135deg,#1F4E78,#1a3a5c);color:#fff;padding:16px">
      <div class="flex-between mb8">
        <div><div style="font-size:18px;font-weight:700">🚜 ${ld.name} — مستخلص الفترة</div>
          <div style="font-size:11px;opacity:.8;margin-top:4px">${fmtDate(from)} — ${fmtDate(to)}</div></div>
        <div style="text-align:center;background:rgba(255,255,255,.15);border-radius:10px;padding:10px 20px">
          <div style="font-size:11px;opacity:.8">صافي الربح</div>
          <div style="font-size:24px;font-weight:700;color:${periodProfit>=0?'#86efac':'#fca5a5'}">${curr(periodProfit)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
        ${[['إيراد الخامات','📦',curr(periodRevCubic)],['إيراد الساعات','⏱️',curr(periodRevHourly)],['إيراد التحميل','🚛',curr(periodRevLoading)],['إجمالي الإيراد','💰',curr(periodGrand)],['المصاريف','💸',curr(periodExp)]].map(([l,ic,v])=>`
          <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:10px;opacity:.7">${ic} ${l}</div>
            <div style="font-size:12px;font-weight:700;margin-top:2px">${v}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card mb12">
      <div class="section-title mb8">💰 توزيع أرباح الفترة على الشركاء</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        ${[{partnerName:'الشركة',ownershipPct:companyPct},...partners].map(pt=>{
          const share=periodProfit*Number(pt.ownershipPct)/100;
          const disbP=DB.getAll('journal').filter(j=>j.entryType==='يدوي'&&j.loaderId===ld.id&&j.loaderExpType==='توزيع أرباح'&&j.party===pt.partnerName&&(j.date||'')>=from&&(j.date||'')<=to).reduce((s,j)=>s+(Number(j.debitAmount)||0),0);
          const rem=share-disbP;
          return `<div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">
            <div style="font-weight:700">${pt.partnerName==='الشركة'?'🏢':'🤝'} ${pt.partnerName}</div>
            <div style="font-size:11px;color:#7c3aed">${pt.ownershipPct}% ملكية</div>
            <div style="font-size:13px;font-weight:700;color:#16a34a">حصته: ${curr(share)}</div>
            <div style="font-size:11px;color:#64748b">مصروف: ${curr(disbP)}</div>
            <div style="font-size:12px;font-weight:700;color:${rem>0?'#d97706':'#16a34a'}">المتبقي: ${curr(rem)}</div>
            ${pt.partnerName!=='الشركة'&&rem>0?`<button data-lid="${ld.id}" data-pname="${pt.partnerName}" onclick="openLoaderDisburseModal(Number(this.dataset.lid),this.dataset.pname)" style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;font-size:11px;font-family:inherit;margin-top:6px;width:100%">💸 صرف</button>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>`:'<div class="card" style="text-align:center;padding:30px"><div style="font-size:32px">📅</div><p class="text-gray mt8">اختر اللودر والفترة</p></div>'}
    <div class="card">
      <div class="section-title mb8">📋 المستخلصات المؤرشفة</div>
      ${stmts.length===0?'<div class="tbl-empty">لا توجد مستخلصات</div>':`<div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>الفترة</th><th>خامات</th><th>ساعات</th><th>تحميل</th><th>مصاريف</th><th>صافي الربح</th><th>تاريخ الاعتماد</th><th>إجراء</th></tr></thead>
        <tbody>${stmts.map(s=>`<tr>
          <td class="font-mono font-bold text-brand">#${s.id}</td>
          <td class="text-xs">${fmtDate(s.from)} — ${fmtDate(s.to)}</td>
          <td class="tabular">${curr(s.revCubic||0)}</td>
          <td class="tabular">${curr(s.revHourly||0)}</td>
          <td class="tabular">${curr(s.revLoading||0)}</td>
          <td class="tabular text-red">${curr(s.expenses||0)}</td>
          <td class="tabular font-bold ${(s.netProfit||0)>=0?'text-brand':'text-red'}">${curr(s.netProfit||0)}</td>
          <td class="text-xs text-gray">${fmtDate(s.createdAt)}</td>
          <td>
            <button class="btn btn-gray btn-sm" onclick="printArchivedLoaderStmt(${s.id})">🖨️</button>
            <button class="btn btn-gray btn-sm" style="color:#dc2626" onclick="deleteLoaderStmt(${s.id})">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>
  </div>`;
}

function openLoaderStmtApprove(loaderId){
  const ld=DB.getById('loaders',loaderId);
  const from=window._LDS_FROM, to=window._LDS_TO;
  if(!ld||!from||!to) return toast('حدد اللودر والفترة أولاً','error');
  let revCubic=0,revHourly=0,revLoading=0,expenses=0;
  DB.getAll('sarkis').filter(sk=>sk.status!=='ملغي'&&sk.date>=from&&sk.date<=to).forEach(sk=>{
    (sk.lines||[]).forEach(ln=>{if(ln.loaderName!==ld.name)return;revCubic+=(Number(ln.netSell||ln.netCubic)||0)*getLoaderPrice(ld,sk.material);});
  });
  DB.getAll('loaderHours').filter(j=>j.loaderId===loaderId&&j.date>=from&&j.date<=to).forEach(j=>{revHourly+=Number(j.netClient)||0;});
  DB.getAll('loaderLoading').filter(j=>j.loaderId===loaderId&&j.date>=from&&j.date<=to).forEach(j=>{revLoading+=Number(j.netClient)||0;});
  DB.getAll('journal').filter(j=>j.loaderId===ld.id&&j.loaderExpType!=='توزيع أرباح'&&(j.date||'')>=from&&(j.date||'')<=to).forEach(j=>{expenses+=Number(j.amount||j.debitAmount)||0;});
  const netProfit=revCubic+revHourly+revLoading-expenses;
  const partners=ld.partners||[];
  const companyPct=100-partners.reduce((s,p)=>s+Number(p.ownershipPct||0),0);
  const sharesHtml=[{partnerName:'الشركة',ownershipPct:companyPct},...partners].map(pt=>`
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9">
      <span>${pt.partnerName} (${pt.ownershipPct}%)</span>
      <strong style="color:#1d4ed8">${curr(netProfit*Number(pt.ownershipPct)/100)}</strong>
    </div>`).join('');
  openModal('اعتماد مستخلص اللودر',`
    <div class="alert alert-blue mb12"><span>📋</span><div>الفترة: <strong>${fmtDate(from)}</strong> — <strong>${fmtDate(to)}</strong></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
      <div class="card-sm text-center"><div class="text-xs text-gray">إيراد الخامات</div><div class="font-bold text-brand">${curr(revCubic)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray">إيراد الساعات</div><div class="font-bold text-brand">${curr(revHourly)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray">إيراد التحميل</div><div class="font-bold text-brand">${curr(revLoading)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray">المصاريف</div><div class="font-bold text-red">${curr(expenses)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray">إجمالي الإيراد</div><div class="font-bold text-brand">${curr(revCubic+revHourly+revLoading)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray">صافي الربح</div><div class="font-bold" style="color:${netProfit>=0?'#16a34a':'#dc2626'}">${curr(netProfit)}</div></div>
    </div>
    <div class="section-title mb6">توزيع الأرباح</div>${sharesHtml}
    <div class="form-group mt12"><label>ملاحظات</label><textarea id="stmt-notes" rows="2"></textarea></div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" onclick="saveLoaderStatement(${loaderId},'${from}','${to}',${revCubic},${revHourly},${revLoading},${expenses},${netProfit})">✅ اعتماد وأرشفة</button>`,
    'modal-lg');
}

function saveLoaderStatement(loaderId,from,to,revCubic,revHourly,revLoading,expenses,netProfit){
  DB.insert('loaderStatements',{loaderId,from,to,revCubic,revHourly,revLoading,expenses,netProfit,notes:document.getElementById('stmt-notes')?.value||'',createdAt:Date.now(),status:'معتمد'});
  toast('✅ تم اعتماد وأرشفة المستخلص');closeModal();nav('loaders');
}

function deleteLoaderStmt(id){confirmDelete('حذف هذا المستخلص؟',()=>{DB.remove('loaderStatements',id);toast('تم الحذف');nav('loaders');});}

function printLoaderStatement(loaderId){
  const ld=DB.getAll('loaders').find(l=>l.id==loaderId);
  const from=window._LDS_FROM||'',to=window._LDS_TO||'';
  if(!ld){toast('اختر لودراً أولاً','error');return;}
  let revCubic=0,revHourly=0,revLoading=0,expenses=0;
  const cubicRows=[],hourlyRows=[],loadingRows=[],expRows=[];
  DB.getAll('sarkis').filter(sk=>sk.status!=='ملغي'&&(!from||sk.date>=from)&&(!to||sk.date<=to)).forEach(sk=>{
    (sk.lines||[]).forEach(ln=>{
      if(ln.loaderName!==ld.name) return;
      const net=Number(ln.netSell||ln.netCubic)||0,price=getLoaderPrice(ld,sk.material),rev=net*price;
      revCubic+=rev;
      cubicRows.push(`<tr><td>${sk.date}</td><td>#${sk.id}</td><td>${sk.client}</td><td>${sk.material}</td><td>${net.toFixed(1)}</td><td>${price}</td><td>${new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(rev)}</td></tr>`);
    });
  });
  DB.getAll('loaderHours').filter(j=>j.loaderId===loaderId&&(!from||j.date>=from)&&(!to||j.date<=to)).forEach(j=>{
    revHourly+=Number(j.netClient)||0;
    hourlyRows.push(`<tr><td>${j.date}</td><td>${j.client}</td><td>${j.description||'—'}</td><td>${j.hours}</td><td>${new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(j.pricePerHour||0)}</td><td>${new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(j.netClient||0)}</td></tr>`);
  });
  DB.getAll('loaderLoading').filter(j=>j.loaderId===loaderId&&(!from||j.date>=from)&&(!to||j.date<=to)).forEach(j=>{
    revLoading+=Number(j.netClient)||0;
    loadingRows.push(`<tr><td>${j.date}</td><td>${j.client}</td><td>${j.workType||'تحميل'}</td><td>${j.trips}</td><td>${(j.netM3||0).toFixed(1)}</td><td>${new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(j.pricePerM3||0)}/م³</td><td>${new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(j.netClient||0)}</td></tr>`);
  });
  DB.getAll('journal').filter(j=>j.loaderId===ld.id&&j.loaderExpType!=='توزيع أرباح'&&(!from||(j.date||'')>=from)&&(!to||(j.date||'')<=to)).forEach(j=>{
    const amt=Number(j.amount||j.debitAmount)||0;expenses+=amt;
    expRows.push(`<tr><td>${j.date}</td><td>${j.loaderExpType||'أخرى'}</td><td>${j.description||'—'}</td><td>${new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(amt)}</td></tr>`);
  });
  const netProfit=revCubic+revHourly+revLoading-expenses;
  const co=DB.getCompany();
  const _n=n=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(n)+' ج.م';
  const partners=ld.partners||[];
  const companyPct=100-partners.reduce((s,p)=>s+Number(p.ownershipPct||0),0);
  const sharesHtml=[{partnerName:'الشركة',ownershipPct:companyPct},...partners].map(pt=>`<tr><td>${pt.partnerName}</td><td>${pt.ownershipPct}%</td><td style="font-weight:700;color:#1F4E78">${_n(netProfit*Number(pt.ownershipPct)/100)}</td></tr>`).join('');
  const css=`*{font-family:Tahoma,sans-serif;direction:rtl;font-size:10px}body{padding:12px}h2{color:#1F4E78;font-size:14px;margin:0 0 4px}.hdr{border-bottom:3px solid #1F4E78;padding-bottom:8px;margin-bottom:12px}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#1F4E78;color:#fff;padding:5px 6px;text-align:right}td{padding:4px 6px;border-bottom:1px solid #eee}tfoot td{background:#fefce8;font-weight:700}.kpi{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px}.kpi-box{border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}.kpi-label{font-size:9px;color:#64748b}.kpi-val{font-size:12px;font-weight:700}.section{font-size:12px;font-weight:700;color:#1F4E78;margin:10px 0 4px;border-right:3px solid #1F4E78;padding-right:6px}@media print{@page{margin:9mm}}`;
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>مستخلص لودر</title><style>${css}</style></head><body>
    <div class="hdr"><h2>${co.name||''} — مستخلص لودر: ${ld.name}</h2><div style="font-size:9px;color:#555">الفترة: ${from||'البداية'} — ${to||'اليوم'} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div></div>
    <div class="kpi">
      <div class="kpi-box"><div class="kpi-label">إيراد الخامات</div><div class="kpi-val" style="color:#16a34a">${_n(revCubic)}</div></div>
      <div class="kpi-box"><div class="kpi-label">إيراد الساعات</div><div class="kpi-val" style="color:#7c3aed">${_n(revHourly)}</div></div>
      <div class="kpi-box"><div class="kpi-label">إيراد التحميل</div><div class="kpi-val" style="color:#0369a1">${_n(revLoading)}</div></div>
      <div class="kpi-box"><div class="kpi-label">المصاريف</div><div class="kpi-val" style="color:#dc2626">${_n(expenses)}</div></div>
      <div class="kpi-box"><div class="kpi-label">صافي الربح</div><div class="kpi-val" style="color:${netProfit>=0?'#16a34a':'#dc2626'}">${_n(netProfit)}</div></div>
    </div>
    ${cubicRows.length?`<div class="section">📦 إيراد الخامات</div><table><thead><tr><th>التاريخ</th><th>حافظة</th><th>العميل</th><th>الخامة</th><th>م³</th><th>سعر/م³</th><th>الإيراد</th></tr></thead><tbody>${cubicRows.join('')}</tbody><tfoot><tr><td colspan="6">الإجمالي</td><td>${_n(revCubic)}</td></tr></tfoot></table>`:''}
    ${hourlyRows.length?`<div class="section">⏱️ إيراد الساعات</div><table><thead><tr><th>التاريخ</th><th>العميل</th><th>البيان</th><th>الساعات</th><th>سعر/ساعة</th><th>صافي الإيراد</th></tr></thead><tbody>${hourlyRows.join('')}</tbody><tfoot><tr><td colspan="5">الإجمالي</td><td>${_n(revHourly)}</td></tr></tfoot></table>`:''}
    ${loadingRows.length?`<div class="section">🚛 إيراد التحميل</div><table><thead><tr><th>التاريخ</th><th>العميل</th><th>نوع العمل</th><th>نقلات</th><th>م³ صافي</th><th>سعر/م³</th><th>صافي الإيراد</th></tr></thead><tbody>${loadingRows.join('')}</tbody><tfoot><tr><td colspan="6">الإجمالي</td><td>${_n(revLoading)}</td></tr></tfoot></table>`:''}
    ${expRows.length?`<div class="section">💸 المصاريف</div><table><thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${expRows.join('')}</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td>${_n(expenses)}</td></tr></tfoot></table>`:''}
    <div class="section">💰 توزيع الأرباح</div>
    <table><thead><tr><th>الشريك</th><th>نسبة الملكية</th><th>حصته من الربح</th></tr></thead><tbody>${sharesHtml}</tbody></table>
    <script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
  w.document.close();
}

function printArchivedLoaderStmt(stmtId){
  const stmt=DB.getById('loaderStatements',stmtId);
  if(!stmt) return toast('المستخلص غير موجود','error');
  window._LDS_FROM=stmt.from; window._LDS_TO=stmt.to;
  printLoaderStatement(stmt.loaderId);
}

// ═══════════════════════════════════════════════════════════════════
// LOADER HOURLY JOBS
// ═══════════════════════════════════════════════════════════════════
function getLoaderHourlyPrice(ld,clientName){const hp=(ld.hourlyPrices||[]).find(p=>p.client===clientName);return hp?Number(hp.pricePerHour)||0:0;}

function renderLoaderHourly(loaders){
  const selId=window._LDH_SEL||(loaders[0]?.id||null);
  const from=window._LDH_FROM||'',to=window._LDH_TO||'';
  const ldOpts=loaders.map(ld=>`<option value="${ld.id}" ${ld.id==selId?'selected':''}>${ld.name}</option>`).join('');
  const jobs=DB.getAll('loaderHours').filter(j=>{if(j.loaderId!==selId)return false;if(from&&j.date<from)return false;if(to&&j.date>to)return false;return true;}).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  const totHours=jobs.reduce((s,j)=>s+(Number(j.hours)||0),0);
  const totGross=jobs.reduce((s,j)=>s+(Number(j.grossAmount)||0),0);
  const totDisc=jobs.reduce((s,j)=>s+(Number(j.discountClient)||0),0);
  const totNet=jobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);
  return `<div>
    <div class="card mb12" style="padding:10px 14px">
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;min-width:160px"><label style="font-size:10px">اللودر</label>
          <select onchange="window._LDH_SEL=Number(this.value)||null;nav('loaders')" style="width:100%">${ldOpts}</select></div>
        <div class="form-group" style="margin:0"><label style="font-size:10px">من</label><input type="date" value="${from}" onchange="window._LDH_FROM=this.value;nav('loaders')"></div>
        <div class="form-group" style="margin:0"><label style="font-size:10px">إلى</label><input type="date" value="${to}" onchange="window._LDH_TO=this.value;nav('loaders')"></div>
        <button class="btn btn-gray btn-sm" onclick="window._LDH_FROM='';window._LDH_TO='';nav('loaders')">✕</button>
        <button class="btn btn-primary btn-sm" onclick="openLoaderHourlyModal(null,${selId||'null'})">+ إضافة يومية ساعات</button>
        <button class="btn btn-gray btn-sm" onclick="printLoaderHourly()">🖨️</button>
        <button class="btn btn-gray btn-sm" onclick="exportLoaderHourlyExcel()">📊 Excel</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      ${[['إجمالي الساعات','⏱️',totHours.toFixed(1)+' س','#1d4ed8'],['إجمالي الإيراد','💰',curr(totGross),'#16a34a'],['خصم العميل','🔻',curr(totDisc),'#d97706'],['صافي الإيراد','📈',curr(totNet),totNet>=0?'#16a34a':'#dc2626']].map(([l,ic,v,col])=>`
        <div class="card-sm text-center"><div class="text-xs text-gray mb4">${ic} ${l}</div><div style="font-size:13px;font-weight:700;color:${col}">${v}</div></div>`).join('')}
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>#</th><th>التاريخ</th><th>العميل</th><th>البيان</th>
        <th style="text-align:center">الساعات</th><th style="text-align:center">سعر/ساعة</th>
        <th style="text-align:center">الإجمالي</th><th style="text-align:center;background:#d97706;color:#fff">خصم عميل</th>
        <th style="text-align:center;color:#16a34a">صافي الإيراد</th><th>إجراء</th>
      </tr></thead>
      <tbody>
        ${jobs.length===0?`<tr><td colspan="10" class="tbl-empty"><span class="tbl-empty-icon">⏱️</span>لا توجد بيانات</td></tr>`
          :jobs.map((j,i)=>`<tr>
            <td class="text-gray text-xs">${i+1}</td><td>${fmtDate(j.date)}</td>
            <td><strong>${j.client||'—'}</strong></td><td class="text-xs text-gray">${j.description||'—'}</td>
            <td style="text-align:center;font-weight:700">${Number(j.hours)||0}</td>
            <td style="text-align:center">${curr(j.pricePerHour||0)}</td>
            <td style="text-align:center;font-weight:700;color:#1d4ed8">${curr(j.grossAmount||0)}</td>
            <td style="text-align:center;color:#d97706">${curr(j.discountClient||0)}</td>
            <td style="text-align:center;font-weight:700;color:#16a34a">${curr(j.netClient||0)}</td>
            <td>
              <button onclick="openLoaderHourlyModal(${j.id},${selId||'null'})" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:11px">✏️</button>
              <button onclick="deleteLoaderHourly(${j.id})" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:11px">🗑️</button>
            </td>
          </tr>`).join('')}
      </tbody>
      ${jobs.length>0?`<tfoot><tr style="background:#fefce8;font-weight:700">
        <td colspan="4">الإجمالي</td><td style="text-align:center">${totHours.toFixed(1)}</td><td></td>
        <td style="text-align:center;color:#1d4ed8">${curr(totGross)}</td>
        <td style="text-align:center;color:#d97706">${curr(totDisc)}</td>
        <td style="text-align:center;color:#16a34a">${curr(totNet)}</td><td></td>
      </tr></tfoot>`:''}
    </table></div>
  </div>`;
}

function openLoaderHourlyModal(jobId,loaderId){
  const loaders=DB.getAll('loaders'),customers=DB.getAll('customers');
  const job=jobId?DB.getById('loaderHours',jobId):null;
  const v=(k,d='')=>job?.[k]??d;
  const ldOpts=loaders.map(l=>`<option value="${l.id}" ${l.id==(job?.loaderId||loaderId)?'selected':''}>${l.name}</option>`).join('');
  const body=`
    <div class="form-row fr2 mb8">
      <div class="form-group"><label>اللودر <span class="req">*</span></label><select id="lh-loader" onchange="window._lhRecalc&&window._lhRecalc()">${ldOpts}</select></div>
      <div class="form-group"><label>التاريخ <span class="req">*</span></label><input type="date" id="lh-date" value="${v('date',todayStr())}"></div>
    </div>
    <div class="form-row fr2 mb8">
      <div class="form-group"><label>العميل <span class="req">*</span></label>
        <select id="lh-client" onchange="window._lhRecalc&&window._lhRecalc()">
          <option value="">— اختر عميل —</option>
          ${customers.map(c=>`<option ${v('client')===c.name?'selected':''}>${c.name}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>البيان</label><input id="lh-desc" value="${v('description')}" placeholder="وصف العمل"></div>
    </div>
    <div class="form-row fr3 mb8">
      <div class="form-group"><label>عدد الساعات <span class="req">*</span></label><input type="number" id="lh-hours" min="0" step="0.5" value="${v('hours',0)}" oninput="window._lhRecalc&&window._lhRecalc()"></div>
      <div class="form-group"><label>سعر الساعة (ج.م)</label><input type="number" id="lh-price" min="0" step="0.5" value="${v('pricePerHour',0)}" oninput="window._lhRecalc&&window._lhRecalc()"></div>
      <div class="form-group"><label>الإجمالي</label><div id="lh-gross" style="font-size:16px;font-weight:700;color:#1d4ed8;padding:8px 0">${curr(v('grossAmount',0))}</div></div>
    </div>
    <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:10px">
      <div class="form-group" style="margin-bottom:8px"><label style="color:#d97706">خصم على العميل (ج.م) — اختياري</label>
        <input type="number" id="lh-disc-client" min="0" value="${v('discountClient',0)}" oninput="window._lhRecalc&&window._lhRecalc()"></div>
      <div style="font-size:13px;font-weight:700">صافي الإيراد: <span id="lh-net-client" style="color:#16a34a">${curr(v('netClient',0))}</span></div>
    </div>`;
  openModal((jobId?'تعديل':'إضافة')+' يومية ساعات لودر',body,`<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveLoaderHourly(${jobId||'null'})">💾 حفظ</button>`,'modal-lg');
  setTimeout(()=>{
    const recalc=()=>{
      const ld=DB.getAll('loaders').find(l=>l.id==Number(document.getElementById('lh-loader')?.value));
      const client=document.getElementById('lh-client')?.value||'';
      const hours=Number(document.getElementById('lh-hours')?.value)||0;
      const hp=(ld?.hourlyPrices||[]).find(p=>p.client===client);
      const price=hp?Number(hp.pricePerHour)||0:0;
      const el=document.getElementById('lh-price');if(el&&!el.dataset.manual)el.value=price;
      const gross=hours*(Number(document.getElementById('lh-price')?.value)||0);
      const g=document.getElementById('lh-gross');if(g)g.textContent=curr(gross);
      const discC=Number(document.getElementById('lh-disc-client')?.value)||0;
      const net=Math.max(0,gross-discC);
      const n=document.getElementById('lh-net-client');if(n)n.textContent=curr(net);
    };
    window._lhRecalc=recalc;recalc();
  },100);
}

function saveLoaderHourly(jobId){
  const loaderId=Number(document.getElementById('lh-loader')?.value)||null;
  const date=document.getElementById('lh-date')?.value;
  const client=document.getElementById('lh-client')?.value;
  const hours=Number(document.getElementById('lh-hours')?.value)||0;
  const price=Number(document.getElementById('lh-price')?.value)||0;
  if(!loaderId||!date||!client||!hours) return toast('أكمل الحقول المطلوبة','error');
  const gross=hours*price;
  const discClient=Number(document.getElementById('lh-disc-client')?.value)||0;
  const netClient=Math.max(0,gross-discClient);
  const data={loaderId,date,client,description:document.getElementById('lh-desc')?.value||'',hours,pricePerHour:price,grossAmount:gross,discountClient:discClient,netClient};
  if(jobId) DB.update('loaderHours',jobId,data);
  else DB.insert('loaderHours',data);
  toast('✅ تم الحفظ');closeModal();nav('loaders');
}

function deleteLoaderHourly(id){confirmDelete('حذف هذه اليومية؟',()=>{DB.remove('loaderHours',id);toast('تم الحذف');nav('loaders');});}

function printLoaderHourly(){
  const _ldrs=DB.getAll('loaders');
  const _hSel=window._LDH_SEL||(_ldrs[0]?.id||null);
  const ld=_ldrs.find(l=>l.id==_hSel);
  if(!ld){toast('اختر لودراً أولاً','error');return;}
  const from=window._LDH_FROM||'',to=window._LDH_TO||'';
  const jobs=DB.getAll('loaderHours').filter(j=>j.loaderId==_hSel&&(!from||j.date>=from)&&(!to||j.date<=to)).sort((a,b)=>a.date.localeCompare(b.date));
  const _n=n=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';
  const rows=jobs.map((j,i)=>`<tr><td>${i+1}</td><td>${j.date}</td><td>${j.client||'—'}</td><td>${j.description||'—'}</td><td>${j.hours}</td><td>${_n(j.pricePerHour)}</td><td>${_n(j.grossAmount)}</td><td>${_n(j.discountClient)}</td><td>${_n(j.netClient)}</td></tr>`).join('');
  const totHours=jobs.reduce((s,j)=>s+(Number(j.hours)||0),0);
  const totGross=jobs.reduce((s,j)=>s+(Number(j.grossAmount)||0),0);
  const totDisc=jobs.reduce((s,j)=>s+(Number(j.discountClient)||0),0);
  const totNet=jobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);
  const _d=d=>{if(!d)return'—';const dd=new Date(d);return isNaN(dd)?d:dd.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});};
  const co=DB.getCompany();
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>
    *{font-family:Tahoma,sans-serif;font-size:10px;direction:rtl}
    body{padding:14px}
    .hdr{border-bottom:3px solid #1F4E78;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start}
    .co{font-size:14px;font-weight:700;color:#1F4E78}
    .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .kpi-box{border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}
    .kpi-label{font-size:9px;color:#64748b;margin-bottom:2px}
    .kpi-val{font-size:12px;font-weight:700}
    table{width:100%;border-collapse:collapse}
    th{background:#1F4E78;color:#fff;padding:6px 5px;text-align:right}
    td{padding:4px 5px;border-bottom:1px solid #eee}
    tfoot td{background:#fefce8;font-weight:700}
    .footer{margin-top:10px;border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
    @media print{@page{margin:9mm;size:A4}body{padding:0}}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="co">${co.name||'شركة الهنا للنقل'}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">تقرير ساعات اللودر: ${ld.name}</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:2px">
        الفترة: ${from?_d(from):'البداية'} — ${to?_d(to):'اليوم'} | 
        تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
      </div>
    </div>
    <div style="text-align:center;background:#1F4E78;color:#fff;border-radius:8px;padding:8px 16px">
      <div style="font-size:9px;opacity:.8">صافي الإيراد</div>
      <div style="font-size:18px;font-weight:700">${_n(totNet)}</div>
    </div>
  </div>
  <div class="kpi">
    <div class="kpi-box"><div class="kpi-label">إجمالي الساعات</div><div class="kpi-val" style="color:#7c3aed">${totHours.toFixed(1)} س</div></div>
    <div class="kpi-box"><div class="kpi-label">إجمالي الإيراد</div><div class="kpi-val" style="color:#1d4ed8">${_n(totGross)}</div></div>
    <div class="kpi-box"><div class="kpi-label">إجمالي الخصم</div><div class="kpi-val" style="color:#d97706">${_n(totDisc)}</div></div>
    <div class="kpi-box"><div class="kpi-label">صافي الإيراد</div><div class="kpi-val" style="color:#16a34a">${_n(totNet)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>التاريخ</th><th>العميل</th><th>البيان</th>
      <th style="text-align:center">الساعات</th>
      <th style="text-align:center">سعر/ساعة</th>
      <th style="text-align:center">الإجمالي</th>
      <th style="text-align:center">خصم عميل</th>
      <th style="text-align:center">صافي الإيراد</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="4">الإجمالي</td>
      <td style="text-align:center;color:#7c3aed">${totHours.toFixed(1)}</td>
      <td></td>
      <td style="text-align:center;color:#1d4ed8">${_n(totGross)}</td>
      <td style="text-align:center;color:#d97706">${_n(totDisc)}</td>
      <td style="text-align:center;color:#16a34a">${_n(totNet)}</td>
    </tr></tfoot>
  </table>
  <div class="footer">
    <span>${co.name||'شركة الهنا للنقل'}</span>
    <span>${new Date().toLocaleDateString('ar-EG')}</span>
  </div>
  <script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
  w.document.close();
}

function exportLoaderHourlyExcel(){
  if(typeof XLSX==='undefined'){toast('مكتبة Excel غير محملة','error');return;}
  const _ldrs2=DB.getAll('loaders');
  const _hSel2=window._LDH_SEL||(_ldrs2[0]?.id||null);
  const ld=_ldrs2.find(l=>l.id==_hSel2);
  if(!ld){toast('اختر لودراً أولاً','error');return;}
  const from=window._LDH_FROM||'',to=window._LDH_TO||'';
  const jobs=DB.getAll('loaderHours').filter(j=>j.loaderId==_hSel2&&(!from||j.date>=from)&&(!to||j.date<=to)).sort((a,b)=>a.date.localeCompare(b.date));
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([
    [DB.getCompany().name||'','','ساعات اللودر: '+ld.name,'','','','','',''],
    ['الفترة: '+(from||'البداية')+' — '+(to||'اليوم'),'','','','','','','',''],
    [],
    ['#','التاريخ','العميل','البيان','الساعات','سعر/ساعة','الإجمالي','خصم عميل','صافي الإيراد'],
    ...jobs.map((j,i)=>[i+1,j.date?j.date.split('-').reverse().join('/'):'',j.client||'',j.description||'',Number(j.hours)||0,Number(j.pricePerHour)||0,Number(j.grossAmount)||0,Number(j.discountClient)||0,Number(j.netClient)||0]),
    ['','','','الإجمالي',jobs.reduce((s,j)=>s+(Number(j.hours)||0),0),'',jobs.reduce((s,j)=>s+(Number(j.grossAmount)||0),0),jobs.reduce((s,j)=>s+(Number(j.discountClient)||0),0),jobs.reduce((s,j)=>s+(Number(j.netClient)||0),0)],
  ]);
  XLSX.utils.book_append_sheet(wb,ws,'ساعات '+ld.name.slice(0,25));
  XLSX.writeFile(wb,'ساعات_لودر_'+ld.name+'.xlsx');
  toast('✅ تم التصدير');
}

// ═══ GLOBAL RECALC FOR LOADING MODAL ═══
function llLineRecalc(i){
  var ln=window._LLLines&&window._LLLines[i];if(!ln)return;
  var gm3=(Number(ln.trips)||0)*(Number(ln.cubicPerTrip)||0);
  var nm3=Math.max(0,gm3-(Number(ln.discountM3)||0));
  var amt=nm3*(Number(ln.pricePerM3)||0);
  ln.grossM3=gm3;ln.netM3=nm3;ln.grossAmount=amt;
  var gEl=document.getElementById('ll-gm3-'+i),nEl=document.getElementById('ll-nm3-'+i),aEl=document.getElementById('ll-amt-'+i);
  if(gEl)gEl.textContent=gm3.toFixed(1);if(nEl)nEl.textContent=nm3.toFixed(1);if(aEl)aEl.textContent=curr(amt);
  llUpdateTotals();
}
function llUpdateTotals(){
  var lines=window._LLLines||[];
  var totTrips=lines.reduce(function(s,l){return s+(Number(l.trips)||0);},0);
  var totGM3=lines.reduce(function(s,l){return s+(Number(l.grossM3)||0);},0);
  var totNM3=lines.reduce(function(s,l){return s+(Number(l.netM3)||0);},0);
  var totAmt=lines.reduce(function(s,l){return s+(Number(l.grossAmount)||0);},0);
  var discC=Number(document.getElementById('ll-disc-client')?.value)||0;
  var net=Math.max(0,totAmt-discC);
  var t=document.getElementById('ll-tot-trips');if(t)t.textContent=totTrips;
  var g=document.getElementById('ll-tot-gm3');if(g)g.textContent=totGM3.toFixed(1);
  var n=document.getElementById('ll-tot-nm3');if(n)n.textContent=totNM3.toFixed(1);
  var a=document.getElementById('ll-tot-amt');if(a)a.textContent=curr(totAmt);
  var nt=document.getElementById('ll-net-total');if(nt)nt.textContent=curr(net);
}
function getLoaderLoadingPrice(ld,clientName,workType){
  const p=(ld.loadingPrices||[]).find(p=>p.client===clientName&&p.workType===workType);
  return p?Number(p.pricePerM3)||0:0;
}

// ═══════════════════════════════════════════════════════════════════
// LOADER COLLECTIONS — تحصيلات اللودر من العملاء
// ═══════════════════════════════════════════════════════════════════
function renderLoaderCollections(loaders){
  const selId = window._LDC_SEL || (loaders[0]?.id||null);
  const from  = window._LDC_FROM || '';
  const to    = window._LDC_TO   || '';

  const ldOpts = loaders.map(ld=>
    `<option value="${ld.id}" ${ld.id==selId?'selected':''}>${ld.name}</option>`
  ).join('');

  const ld = loaders.find(l=>l.id==selId);

  // Build client list that has work with this loader in period
  let clientSales = {};
  if(ld){
    // Hourly jobs
    DB.getAll('loaderHours').filter(j=>{
      if(j.loaderId!==selId) return false;
      if(from && j.date<from) return false;
      if(to   && j.date>to)   return false;
      return true;
    }).forEach(j=>{
      if(!clientSales[j.client]) clientSales[j.client]={hourly:0,loading:0};
      clientSales[j.client].hourly += Number(j.netClient)||0;
    });
    // Loading jobs
    DB.getAll('loaderLoading').filter(j=>{
      if(j.loaderId!==selId) return false;
      if(from && j.date<from) return false;
      if(to   && j.date>to)   return false;
      return true;
    }).forEach(j=>{
      if(!clientSales[j.client]) clientSales[j.client]={hourly:0,loading:0};
      clientSales[j.client].loading += Number(j.netClient)||0;
    });
  }

  const clients = Object.keys(clientSales);

  // Get collections per client from journal
  function getClientCollections(clientName){
    return DB.getAll('journal').filter(j=>{
      if(!from || !to) return false;
      const d = j.date||'';
      if(d<from || d>to) return false;
      // تحصيل مباشر
      if(j.entryType==='تحصيل' && j.party===clientName) return true;
      // قيد يدوي يُدين ذمم العملاء (1010 دائن)
      if(j.entryType==='يدوي' && j.party===clientName &&
         j.partyType==='عميل' && j.creditCode==='1010') return true;
      return false;
    }).map(j=>{
      const amount = j.entryType==='يدوي'
        ? Number(j.creditAmount)||0
        : Number(j.amount)||0;
      // من أخذه — لو مدين حساب شريك (3001)
      const takenBy = (j.entryType==='يدوي' && j.debitCode==='3001' && j.party===clientName)
        ? (j.debitName||'شريك')
        : (j.entryType==='يدوي' && j.debitCode==='3001')
        ? (j.party||'شريك')
        : '';
      // تحقق من اسم الشريك من حقل party لو القيد من العميل للشريك
      const partnerName = (j.entryType==='يدوي' && j.debitCode==='3001')
        ? (j.debitName||'')
        : '';
      return {
        date: j.date||'',
        amount,
        description: j.description||'—',
        paymentType: j.paymentType||'—',
        takenBy: partnerName || takenBy,
        entryId: j.id,
      };
    }).sort((a,b)=>a.date.localeCompare(b.date));
  }

  // Totals
  const totalSalesAll = clients.reduce((s,c)=>{
    const cs = clientSales[c];
    return s + cs.hourly + cs.loading;
  },0);

  const allCollections = {};
  clients.forEach(c=>{ allCollections[c] = getClientCollections(c); });

  const totalCollAll = clients.reduce((s,c)=>
    s + allCollections[c].reduce((ss,col)=>ss+col.amount,0), 0);
  const totalRemaining = totalSalesAll - totalCollAll;

  return `<div>
    <!-- Filter bar -->
    <div class="card mb12" style="padding:10px 14px">
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;min-width:160px">
          <label style="font-size:10px">اللودر</label>
          <select onchange="window._LDC_SEL=Number(this.value)||null;nav('loaders')" style="width:100%">
            ${ldOpts}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">من تاريخ</label>
          <input type="date" value="${from}" onchange="window._LDC_FROM=this.value;nav('loaders')">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">إلى تاريخ</label>
          <input type="date" value="${to}" onchange="window._LDC_TO=this.value;nav('loaders')">
        </div>
        <button class="btn btn-gray btn-sm" onclick="window._LDC_FROM='';window._LDC_TO='';nav('loaders')">✕</button>
        <button class="btn btn-gray btn-sm" onclick="printLoaderCollections(${selId||'null'})">🖨️ طباعة</button>
      </div>
    </div>

    ${!ld||!from||!to?`<div class="card" style="text-align:center;padding:30px">
      <div style="font-size:32px">📅</div>
      <p class="text-gray mt8">اختر اللودر والفترة لعرض التحصيلات</p>
    </div>`:`

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
      <div class="card-sm text-center">
        <div class="text-xs text-gray mb4">💰 إجمالي المبيعات (ساعات+تحميل)</div>
        <div style="font-size:16px;font-weight:700;color:#1d4ed8">${curr(totalSalesAll)}</div>
      </div>
      <div class="card-sm text-center">
        <div class="text-xs text-gray mb4">✅ إجمالي التحصيلات</div>
        <div style="font-size:16px;font-weight:700;color:#16a34a">${curr(totalCollAll)}</div>
      </div>
      <div class="card-sm text-center" style="border-color:${totalRemaining>0?'#fca5a5':'#86efac'}">
        <div class="text-xs text-gray mb4">⏳ إجمالي الباقي</div>
        <div style="font-size:16px;font-weight:700;color:${totalRemaining>0?'#dc2626':'#16a34a'}">${curr(totalRemaining)}</div>
      </div>
    </div>

    <!-- Summary table -->
    <div class="card mb12">
      <div class="section-title mb8">📊 ملخص بالعميل</div>
      ${clients.length===0?'<div class="tbl-empty">لا توجد أعمال للودر في هذه الفترة</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>العميل</th>
          <th style="text-align:center;color:#7c3aed">ساعات</th>
          <th style="text-align:center;color:#0369a1">تحميل</th>
          <th style="text-align:center;color:#1d4ed8">إجمالي المبيعات</th>
          <th style="text-align:center;color:#16a34a">التحصيلات</th>
          <th style="text-align:center;color:#dc2626">الباقي</th>
        </tr></thead>
        <tbody>
          ${clients.map(clientName=>{
            const cs = clientSales[clientName];
            const totalSales = cs.hourly + cs.loading;
            const cols = allCollections[clientName];
            const totalColl = cols.reduce((s,c)=>s+c.amount,0);
            const remaining = totalSales - totalColl;
            return `<tr>
              <td><strong>${clientName}</strong></td>
              <td style="text-align:center;color:#7c3aed">${curr(cs.hourly)}</td>
              <td style="text-align:center;color:#0369a1">${curr(cs.loading)}</td>
              <td style="text-align:center;font-weight:700;color:#1d4ed8">${curr(totalSales)}</td>
              <td style="text-align:center;font-weight:700;color:#16a34a">${curr(totalColl)}</td>
              <td style="text-align:center;font-weight:700;color:${remaining>0?'#dc2626':'#16a34a'}">${curr(remaining)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot><tr style="background:#fefce8;font-weight:700">
          <td>الإجمالي</td>
          <td style="text-align:center;color:#7c3aed">${curr(clients.reduce((s,c)=>s+clientSales[c].hourly,0))}</td>
          <td style="text-align:center;color:#0369a1">${curr(clients.reduce((s,c)=>s+clientSales[c].loading,0))}</td>
          <td style="text-align:center;color:#1d4ed8">${curr(totalSalesAll)}</td>
          <td style="text-align:center;color:#16a34a">${curr(totalCollAll)}</td>
          <td style="text-align:center;color:${totalRemaining>0?'#dc2626':'#16a34a'}">${curr(totalRemaining)}</td>
        </tr></tfoot>
      </table></div>`}
    </div>

    <!-- Detail per client -->
    ${clients.map(clientName=>{
      const cs = clientSales[clientName];
      const totalSales = cs.hourly + cs.loading;
      const cols = allCollections[clientName];
      const totalColl = cols.reduce((s,c)=>s+c.amount,0);
      const remaining = totalSales - totalColl;
      return `<div class="card mb10">
        <div class="flex-between mb8">
          <div>
            <div style="font-size:14px;font-weight:700">👤 ${clientName}</div>
            <div class="text-xs text-gray mt4">
              مبيعات: ${curr(totalSales)} |
              تحصيلات: ${curr(totalColl)} |
              <span style="color:${remaining>0?'#dc2626':'#16a34a'};font-weight:700">الباقي: ${curr(remaining)}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${remaining>0?`<button class="btn btn-primary btn-sm" onclick="openJrnModal('يدوي',null,{creditCode:'1010',creditName:'ذمم العملاء',party:'${clientName}',partyType:'عميل',description:'تحصيل أعمال لودر ${ld.name}'})">💵 تسجيل قيد تحصيل</button>`:''}
          </div>
        </div>

        <!-- Collections detail -->
        ${cols.length===0?`<div class="alert alert-blue">لا توجد تحصيلات مسجّلة لهذا العميل في الفترة</div>`:`
        <div class="tbl-wrap"><table style="font-size:10px">
          <thead><tr style="background:#16a34a;color:#fff">
            <th>التاريخ</th>
            <th>البيان</th>
            <th style="text-align:center">طريقة الدفع</th>
            <th style="text-align:center">من أخذه</th>
            <th style="text-align:center">المبلغ</th>
          </tr></thead>
          <tbody>
            ${cols.map(col=>`<tr>
              <td>${fmtDate(col.date)}</td>
              <td class="text-xs">${col.description}</td>
              <td style="text-align:center">${col.paymentType!=='—'?badge(col.paymentType,'blue'):'—'}</td>
              <td style="text-align:center">${col.takenBy?`<span style="background:#fef3c7;color:#92400e;border-radius:10px;padding:2px 8px;font-size:10px">🤝 ${col.takenBy}</span>`:'<span class="text-gray text-xs">مباشر</span>'}</td>
              <td style="text-align:center;font-weight:700;color:#16a34a">${curr(col.amount)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr style="background:#dcfce7;font-weight:700">
            <td colspan="4">إجمالي التحصيلات</td>
            <td style="text-align:center;color:#16a34a">${curr(totalColl)}</td>
          </tr></tfoot>
        </table></div>`}
      </div>`;
    }).join('')}
    `}
  </div>`;
}

function printLoaderCollections(loaderId){
  const ld = DB.getAll('loaders').find(l=>l.id==loaderId);
  const from = window._LDC_FROM||'';
  const to   = window._LDC_TO||'';
  if(!ld||!from||!to){ toast('اختر اللودر والفترة أولاً','error'); return; }

  let clientSales = {};
  DB.getAll('loaderHours').filter(j=>j.loaderId===loaderId&&j.date>=from&&j.date<=to).forEach(j=>{
    if(!clientSales[j.client]) clientSales[j.client]={hourly:0,loading:0};
    clientSales[j.client].hourly += Number(j.netClient)||0;
  });
  DB.getAll('loaderLoading').filter(j=>j.loaderId===loaderId&&j.date>=from&&j.date<=to).forEach(j=>{
    if(!clientSales[j.client]) clientSales[j.client]={hourly:0,loading:0};
    clientSales[j.client].loading += Number(j.netClient)||0;
  });

  const clients = Object.keys(clientSales);
  const _n = n=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';

  function getColls(clientName){
    return DB.getAll('journal').filter(j=>{
      const d=j.date||'';if(d<from||d>to) return false;
      if(j.entryType==='تحصيل'&&j.party===clientName) return true;
      if(j.entryType==='يدوي'&&j.party===clientName&&j.partyType==='عميل'&&j.creditCode==='1010') return true;
      return false;
    }).map(j=>({
      date:j.date||'',
      amount:j.entryType==='يدوي'?Number(j.creditAmount)||0:Number(j.amount)||0,
      description:j.description||'—',
      takenBy:(j.entryType==='يدوي'&&j.debitCode==='3001')?(j.debitName||'شريك'):'',
    })).sort((a,b)=>a.date.localeCompare(b.date));
  }

  const totalSalesAll = clients.reduce((s,c)=>s+clientSales[c].hourly+clientSales[c].loading,0);
  const allColls = {};
  clients.forEach(c=>{ allColls[c]=getColls(c); });
  const totalCollAll = clients.reduce((s,c)=>s+allColls[c].reduce((ss,col)=>ss+col.amount,0),0);
  const totalRem = totalSalesAll - totalCollAll;

  const co = DB.getCompany();
  const css=`*{font-family:Tahoma,sans-serif;direction:rtl;font-size:10px}body{padding:14px}
    h2{color:#1F4E78;font-size:14px;margin:0}.hdr{border-bottom:3px solid #1F4E78;padding-bottom:8px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    th{background:#1F4E78;color:#fff;padding:5px 7px;text-align:right}
    td{padding:4px 7px;border-bottom:1px solid #eee}
    tfoot td{background:#fefce8;font-weight:700}
    .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
    .kpi-box{border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}
    .kpi-label{font-size:9px;color:#64748b}.kpi-val{font-size:13px;font-weight:700}
    .client-hdr{background:#f8fafc;padding:6px 10px;font-weight:700;border-right:3px solid #1F4E78;margin:10px 0 5px;font-size:11px}
    @media print{@page{margin:10mm;size:A4}}`;

  const summaryRows = clients.map(c=>{
    const cs=clientSales[c];
    const cols=allColls[c];
    const totalS=cs.hourly+cs.loading;
    const totalC=cols.reduce((s,col)=>s+col.amount,0);
    const rem=totalS-totalC;
    return `<tr><td><strong>${c}</strong></td><td>${_n(cs.hourly)}</td><td>${_n(cs.loading)}</td><td style="font-weight:700">${_n(totalS)}</td><td style="color:#16a34a;font-weight:700">${_n(totalC)}</td><td style="color:${rem>0?'#dc2626':'#16a34a'};font-weight:700">${_n(rem)}</td></tr>`;
  }).join('');

  const detailHtml = clients.map(c=>{
    const cols=allColls[c];
    if(!cols.length) return '';
    const rows=cols.map(col=>`<tr><td>${col.date}</td><td>${col.description}</td><td style="color:#16a34a;font-weight:700">${_n(col.amount)}</td><td>${col.takenBy?'🤝 '+col.takenBy:'مباشر'}</td></tr>`).join('');
    const totalC=cols.reduce((s,col)=>s+col.amount,0);
    return `<div class="client-hdr">👤 ${c}</div>
      <table><thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th><th>من أخذه</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">الإجمالي</td><td style="color:#16a34a">${_n(totalC)}</td><td></td></tr></tfoot></table>`;
  }).join('');

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تحصيلات لودر</title><style>${css}</style></head><body>
    <div class="hdr">
      <h2>${co.name||'شركة الهنا للنقل'} — تحصيلات لودر: ${ld.name}</h2>
      <div style="font-size:9px;color:#64748b;margin-top:3px">الفترة: ${from} — ${to} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-box"><div class="kpi-label">إجمالي المبيعات</div><div class="kpi-val" style="color:#1d4ed8">${_n(totalSalesAll)}</div></div>
      <div class="kpi-box"><div class="kpi-label">إجمالي التحصيلات</div><div class="kpi-val" style="color:#16a34a">${_n(totalCollAll)}</div></div>
      <div class="kpi-box"><div class="kpi-label">الباقي</div><div class="kpi-val" style="color:${totalRem>0?'#dc2626':'#16a34a'}">${_n(totalRem)}</div></div>
    </div>
    <table><thead><tr><th>العميل</th><th>ساعات</th><th>تحميل</th><th>إجمالي المبيعات</th><th>التحصيلات</th><th>الباقي</th></tr></thead>
    <tbody>${summaryRows}</tbody>
    <tfoot><tr><td>الإجمالي</td><td>${_n(clients.reduce((s,c)=>s+clientSales[c].hourly,0))}</td><td>${_n(clients.reduce((s,c)=>s+clientSales[c].loading,0))}</td><td style="color:#1d4ed8">${_n(totalSalesAll)}</td><td style="color:#16a34a">${_n(totalCollAll)}</td><td style="color:${totalRem>0?'#dc2626':'#16a34a'}">${_n(totalRem)}</td></tr></tfoot></table>
    <h3 style="color:#1F4E78;font-size:12px;margin:14px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">تفصيل التحصيلات بالعميل</h3>
    ${detailHtml}
    <script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
  w.document.close();
}
