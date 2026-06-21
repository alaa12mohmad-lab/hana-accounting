// ═══ LOADERS — آلات التحميل كمراكز ربح ═══════════════════════════

window._LD_TAB = 'list';
window._LD_SEL = null; // selected loader id

// ── Main render ───────────────────────────────────────────────────
function renderLoaders(){
  const tab = window._LD_TAB;
  const loaders = DB.getAll('loaders');

  const tabs = [
    ['list','🚜 اللوادر'],
    ['report','📊 تقرير مركز الربح'],
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

      // Expenses from journal
      const jExpenses = DB.getAll('journal').filter(j=>
        (j.entryType==='يدوي'||j.category) && j.loaderId===ld.id
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
              const share = netProfit * Number(pt.ownershipPct)/100;
              return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;min-width:140px">
                <div style="font-weight:700;font-size:11px">${pt.partnerName}</div>
                <div style="font-size:10px;color:#7c3aed">${pt.ownershipPct}% ملكية</div>
                <div style="font-size:10px;color:#16a34a">حصة الربح: ${curr(share)}</div>
                ${debt>0?`<div style="font-size:10px;color:#d97706">عهدة: ${curr(debt)}</div>`:''}
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

  const totalCosts = totalExp; // الإهلاك مفصول تماماً عن حساب الربح والمصاريف
  const netProfit  = totalRevenue - totalCosts;

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
              تكلفة الشراء: ${curr(ld.purchasePrice||0)}
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
        ${jExpenses.length>0?`
        <div class="tbl-wrap mt8"><table style="font-size:10px">
          <thead><tr style="background:#dc2626;color:#fff">
            <th>التاريخ</th><th>نوع المصروف</th><th>البيان</th><th style="text-align:center">المبلغ</th>
          </tr></thead>
          <tbody>
            ${jExpenses.map(j=>`<tr>
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
        <div class="section-title mb8" style="margin:0 0 10px">💰 توزيع الأرباح (بدون احتساب الإهلاك)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
          ${[{partnerName:'الشركة',ownershipPct:companyPct,paidAmount:0},...partners].map(pt=>{
            const share = netProfit * Number(pt.ownershipPct)/100;
            const ownershipAmt = ld.purchasePrice ? Number(ld.purchasePrice)*Number(pt.ownershipPct)/100 : 0;
            const debt = pt.partnerName==='الشركة' ? 0 : Math.max(0, ownershipAmt - Number(pt.paidAmount||0));
            return `<div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">
              <div style="font-weight:700">${pt.partnerName==='الشركة'?'🏢':'🤝'} ${pt.partnerName}</div>
              <div style="font-size:11px;color:#7c3aed;margin:4px 0">${pt.ownershipPct}% ملكية</div>
              <div style="font-size:13px;font-weight:700;color:${share>=0?'#16a34a':'#dc2626'}">${curr(share)}</div>
              ${debt>0?`<div style="font-size:10px;color:#d97706;margin-top:4px">⚠️ عهدة: ${curr(debt)}</div>`:''}
            </div>`;
          }).join('')}
        </div>
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
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px">
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
    partners:        window._LDPartners.filter(p=>p.partnerName&&p.ownershipPct),
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
