// ═══ STATEMENTS ═══

// ════════════════════════════════════════════════════════
// HELPER: حساب رصيد أول المدة تراكمياً قبل تاريخ معين
// ════════════════════════════════════════════════════════
function _calcOpeningBefore(type, partyName, beforeDate){
  const isCust = type==='customer';
  let base = 0;
  if(isCust){
    const c = DB.getAll('customers').find(x=>x.name===partyName);
    base = Number(c?.openingBalance)||0;
  } else {
    const s = DB.getAll('suppliers').find(x=>x.name===partyName);
    base = Number(s?.openingBalance)||0;
  }

  // آخر مستخلص معتمد قبل تاريخ البداية
  const stmts = DB.getAll('statements')
    .filter(s=>s.entityName===partyName && s.type===(isCust?'customer':'supplier') && s.status==='معتمد')
    .sort((a,b)=>b.approvedAt-a.approvedAt);
  const lastStmt = stmts.find(s=> s.toDate < beforeDate);

  let fromDate = null;
  if(lastStmt){
    base = Number(lastStmt.closingBalance)||0;
    fromDate = lastStmt.toDate;
  }

  // حوافظ قبل الفترة (وبعد المستخلص إن وجد)
  DB.getAll('sarkis').forEach(sk=>{
    if(sk.status==='ملغي') return;
    if(fromDate && sk.date<=fromDate) return;
    if(sk.date>=beforeDate) return;
    if(isCust && sk.client===partyName)    base += Number(sk.totalSell)||0;
    if(!isCust && sk.supplier===partyName) base += Number(sk.totalBuy)||0;
  });

  // قيود قبل الفترة
  DB.getAll('journal').forEach(j=>{
    if(fromDate && j.date<=fromDate) return;
    if(j.date>=beforeDate) return;
    if(isCust){
      if(j.entryType==='تحصيل'&&j.party===partyName) base -= Number(j.amount)||0;
      if(j.entryType==='يدوي'&&j.party===partyName&&j.partyType==='عميل'&&j.creditCode==='1010') base -= Number(j.creditAmount)||0;
    } else {
      if(j.entryType==='دفع'&&j.party===partyName) base -= Number(j.amount)||0;
      if(j.entryType==='يدوي'&&j.party===partyName&&j.partyType==='مورد'&&j.debitCode==='2001') base -= Number(j.debitAmount)||0;
    }
  });

  const label = lastStmt
    ? `رصيد مرحَّل + حركات حتى ${fmtDate(beforeDate)}`
    : `رصيد أول المدة (حتى ${fmtDate(beforeDate)})`;

  return {opening: base, label, lastStmt};
}

// ═══════════════════════════════════════════════════════
// CUSTOMER STATEMENT
// ═══════════════════════════════════════════════════════
let _CS={party:'',from:'2026-01-01',to:todayStr(),mat:'الكل'};

function renderCustStmt(){
  const customers=DB.getAll('customers');
  const materials=DB.getAll('materials');
  if(!_CS.party&&customers[0])_CS.party=customers[0].name;

  const {opening, label: openLabel, lastStmt} = _calcOpeningBefore('customer', _CS.party, _CS.from);

  const fd=new Date(_CS.from),td=new Date(_CS.to);

  const sarkis=DB.getAll('sarkis').filter(sk=>{
    const d=new Date(sk.date);
    return sk.client===_CS.party&&sk.status!=='ملغي'&&d>=fd&&d<=td&&(_CS.mat==='الكل'||sk.material===_CS.mat);
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);

  // أعمال الساعات للعميل
  const hourlyJobs=DB.getAll('loaderHours').filter(j=>{
    const d=new Date(j.date);
    return j.client===_CS.party&&d>=fd&&d<=td;
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
  const totalHourlySell=hourlyJobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);

  // أعمال التحميل للعميل
  const loadingJobs=DB.getAll('loaderLoading').filter(j=>{
    const d=new Date(j.date);
    return j.client===_CS.party&&d>=fd&&d<=td;
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
  const totalLoadingSell=loadingJobs.reduce((s,j)=>s+(Number(j.netClient)||0),0);

  const colls=DB.getAll('journal').filter(j=>{
    const d=new Date(j.date);
    if(!(d>=fd&&d<=td)) return false;
    if(j.entryType==='تحصيل'&&j.party===_CS.party) return true;
    if(j.entryType==='يدوي'&&j.party===_CS.party&&j.partyType==='عميل'&&j.creditCode==='1010') return true;
    return false;
  }).map(j=>{
    if(j.entryType==='يدوي') return {...j, amount:Number(j.creditAmount)||0, paymentType:'قيد يدوي'};
    return j;
  });

  const totalSarkisSell=sarkis.reduce((s,r)=>s+(Number(r.totalSell)||0),0);
  const totalSell=totalSarkisSell+totalHourlySell+totalLoadingSell;
  const totalColl=colls.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const totalNet=sarkis.reduce((s,r)=>s+(Number(r.totalNet)||0),0);
  const balance=opening+totalSell-totalColl;
  const matNames=['الكل',...materials.map(m=>m.name)];

  const matSummary={};
  sarkis.forEach(sk=>{
    if(!matSummary[sk.material])matSummary[sk.material]={cubic:0,sell:0,trips:0,count:0};
    matSummary[sk.material].cubic+=(Number(sk.totalNet)||0);
    matSummary[sk.material].sell+=(Number(sk.totalSell)||0);
    matSummary[sk.material].trips+=(Number(sk.totalTrips)||0);
    matSummary[sk.material].count++;
  });

  return `<div>
    <div class="card mb12">
      <div class="form-row fr4">
        <div class="form-group"><label>العميل</label><select onchange="_CS.party=this.value;nav('cust-stmt')">${customers.map(c=>`<option ${_CS.party===c.name?'selected':''}>${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>من</label><input type="date" value="${_CS.from}" onchange="_CS.from=this.value;nav('cust-stmt')"></div>
        <div class="form-group"><label>إلى</label><input type="date" value="${_CS.to}" onchange="_CS.to=this.value;nav('cust-stmt')"></div>
        <div class="form-group"><label>الخامة</label><select onchange="_CS.mat=this.value;nav('cust-stmt')">${matNames.map(m=>`<option ${_CS.mat===m?'selected':''}>${m}</option>`).join('')}</select></div>
      </div>
      ${lastStmt?`<div class="alert alert-blue mt8">📋 مستخلص سابق معتمد: <strong>رقم ${lastStmt.id}</strong> — رصيد مرحَّل: <strong>${curr(lastStmt.closingBalance)}</strong> — بتاريخ ${fmtDate(lastStmt.approvedAt)}</div>`:''}
      ${!lastStmt&&opening!==0?`<div class="alert alert-blue mt8">📊 رصيد أول المدة محسوب تراكمياً من كل الحركات السابقة لـ ${fmtDate(_CS.from)}</div>`:''}
    </div>

    <div class="grid4 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">${openLabel}</div><div class="font-bold text-brand tabular" style="font-size:13px">${curr(opening)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي المبيعات</div><div class="font-bold text-brand tabular">${curr(totalSell)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي التحصيلات</div><div class="font-bold text-green tabular">${curr(totalColl)}</div></div>
      <div class="card-sm text-center" style="border-color:${balance>0?'#fca5a5':'#86efac'}">
        <div class="text-xs text-gray mb4">الرصيد المستحق</div>
        <div class="font-bold tabular ${balance>0?'text-red':'text-green'}" style="font-size:15px">${curr(balance)}</div>
      </div>
    </div>

    <div class="flex-wrap mb12">
      <button class="btn btn-primary" onclick="printCustStmt()">🖨️ طباعة PDF شامل</button>
      <button class="btn btn-green" onclick="approveStmt('customer',_CS.party,_CS.from,_CS.to,${opening},${totalSell},0,${totalColl},0,${balance})">✅ اعتماد وترحيل الرصيد</button>
    </div>

    ${Object.keys(matSummary).length>0?`
    <div class="card mb12">
      <div class="section-title">🪨 ملخص الخامات</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>الخامة</th><th>عدد الحوافظ</th><th>إجمالي النقلات</th><th>إجمالي م³</th><th>إجمالي البيع</th></tr></thead>
        <tbody>
          ${Object.entries(matSummary).map(([mat,v])=>`<tr>
            <td>${badge(mat)}</td>
            <td class="tabular text-center">${v.count}</td>
            <td class="tabular text-center">${num(v.trips)}</td>
            <td class="tabular text-center font-bold">${v.cubic.toFixed(1)}</td>
            <td class="tabular font-bold text-brand">${curr(v.sell)}</td>
          </tr>`).join('')}
          <tr style="background:#fafafa;font-weight:700">
            <td>الإجمالي</td>
            <td class="tabular text-center">${sarkis.length}</td>
            <td class="tabular text-center">${num(sarkis.reduce((s,r)=>s+(Number(r.totalTrips)||0),0))}</td>
            <td class="tabular text-center">${totalNet.toFixed(1)}</td>
            <td class="tabular text-brand">${curr(totalSell)}</td>
          </tr>
        </tbody>
      </table></div>
    </div>`:''}

    <div class="card mb12">
      <div class="flex-between mb8">
        <div class="section-title" style="margin-bottom:0">🚛 تفاصيل الحوافظ — كل النقلات (${sarkis.length} حافظة)</div>
        <strong class="text-brand tabular">${curr(totalSell)}</strong>
      </div>
      ${sarkis.map(sk=>`
        <div style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;overflow:hidden">
          <div style="background:#f8fafc;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb">
            <div class="flex" style="gap:8px">
              <span class="font-mono font-bold text-brand" style="background:#eff6ff;padding:1px 7px;border-radius:4px">#${sk.id}</span>
              <span class="font-bold text-sm">${fmtDate(sk.date)}</span>
              ${badge(sk.material)}
              <span class="text-xs text-gray">المورد: ${sk.supplier}</span>
              ${sk.workType?`<span class="text-xs text-gray">${sk.workType}</span>`:''}
            </div>
            <div class="flex" style="gap:12px">
              <span class="text-xs text-gray">${(Number(sk.totalNet)||0).toFixed(1)} م³ | ${num(sk.totalTrips)} نقلة</span>
              <strong class="text-brand tabular">${curr(sk.totalSell)}</strong>
              ${statusBadge(sk.status)}
            </div>
          </div>
          <table style="font-size:10px">
            <thead style="background:#1F4E78;color:#fff">
              <tr><th style="padding:5px 6px">السائق</th><th style="padding:5px 6px">اللوحة</th><th style="padding:5px 6px;text-align:center">نقلات</th><th style="padding:5px 6px;text-align:center">م³/نقلة</th><th style="padding:5px 6px;text-align:center">إجمالي م³</th><th style="padding:5px 6px;text-align:center">خصم م</th><th style="padding:5px 6px;text-align:center">صافي م³</th><th style="padding:5px 6px;text-align:center">سعر/م³</th><th style="padding:5px 6px">إجمالي البيع</th></tr>
            </thead>
            <tbody>
              ${(sk.lines||[]).map((l,i)=>`<tr style="${i%2?'background:#f8fafc':''}">
                <td style="padding:4px 6px">${l.driverName||'—'}</td>
                <td style="padding:4px 6px;font-family:monospace">${l.plateNo||'—'}</td>
                <td style="padding:4px 6px;text-align:center">${l.trips||0}</td>
                <td style="padding:4px 6px;text-align:center">${l.cubicSell!=null?l.cubicSell:(l.cubicPerTrip||0)}</td>
                <td style="padding:4px 6px;text-align:center">${(l.grossSell!=null?l.grossSell:l.grossCubic||0).toFixed(1)}</td>
                <td style="padding:4px 6px;text-align:center;color:#dc2626">${l.discountSell!=null?l.discountSell:(l.discountM||0)}</td>
                <td style="padding:4px 6px;text-align:center;font-weight:700;color:#1F4E78">${(l.netSell!=null?l.netSell:l.netCubic||0).toFixed(1)}</td>
                <td style="padding:4px 6px;text-align:center">${l.sellPrice||0}</td>
                <td style="padding:4px 6px;font-weight:600;color:#1F4E78">${curr(l.sellTotal)}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#fefce8;font-weight:700;font-size:10px">
                <td colspan="2" style="padding:5px 6px">مجموع الحافظة</td>
                <td style="padding:5px 6px;text-align:center">${num(sk.totalTrips)}</td>
                <td></td>
                <td style="padding:5px 6px;text-align:center">${(sk.totalGross||0).toFixed(1)}</td>
                <td></td>
                <td style="padding:5px 6px;text-align:center;color:#1F4E78">${(sk.totalNet||0).toFixed(1)}</td>
                <td></td>
                <td style="padding:5px 6px;color:#1F4E78">${curr(sk.totalSell)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`).join('')||`<div class="tbl-empty">لا توجد حوافظ في هذه الفترة</div>`}
    </div>

    ${hourlyJobs.length>0?`
    <div class="card mb12">
      <div class="flex-between mb8">
        <div class="section-title" style="margin-bottom:0">⏱️ أعمال اللودر بالساعات (${hourlyJobs.length})</div>
        <strong class="text-brand tabular">${curr(totalHourlySell)}</strong>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>التاريخ</th><th>اللودر</th><th>البيان</th><th style="text-align:center">الساعات</th><th style="text-align:center">سعر/ساعة</th><th style="text-align:center">خصم</th><th>صافي الإيراد</th></tr></thead>
        <tbody>
          ${hourlyJobs.map(j=>{
            const ld=DB.getAll('loaders').find(l=>l.id===j.loaderId);
            return `<tr>
              <td>${fmtDate(j.date)}</td>
              <td class="text-gray text-xs">${ld?.name||'—'}</td>
              <td class="text-xs">${j.description||'—'}</td>
              <td style="text-align:center">${Number(j.hours)||0}</td>
              <td style="text-align:center">${curr(j.pricePerHour||0)}</td>
              <td style="text-align:center;color:#d97706">${curr(j.discountClient||0)}</td>
              <td class="tabular font-bold text-brand">${curr(j.netClient||0)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot><tr><td colspan="6" style="font-weight:700">الإجمالي</td><td class="tabular text-brand font-bold">${curr(totalHourlySell)}</td></tr></tfoot>
      </table></div>
    </div>`:''}

    ${loadingJobs.length>0?`
    <div class="card mb12">
      <div class="flex-between mb8">
        <div class="section-title" style="margin-bottom:0">🚛 أعمال اللودر تحميل (${loadingJobs.length})</div>
        <strong class="text-brand tabular">${curr(totalLoadingSell)}</strong>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>التاريخ</th><th>اللودر</th><th>نوع العمل</th><th>السيارة</th><th style="text-align:center">نقلات</th><th style="text-align:center">م³ صافي</th><th style="text-align:center">خصم</th><th>صافي الإيراد</th></tr></thead>
        <tbody>
          ${loadingJobs.map(j=>{
            const ld=DB.getAll('loaders').find(l=>l.id===j.loaderId);
            return `<tr>
              <td>${fmtDate(j.date)}</td>
              <td class="text-gray text-xs">${ld?.name||'—'}</td>
              <td>${badge(j.workType||'تحميل','blue')}</td>
              <td class="font-mono text-xs">${j.plateNo||'—'}</td>
              <td style="text-align:center">${Number(j.trips)||0}</td>
              <td style="text-align:center;font-weight:700">${(Number(j.netM3)||0).toFixed(1)}</td>
              <td style="text-align:center;color:#d97706">${curr(j.discountClient||0)}</td>
              <td class="tabular font-bold text-brand">${curr(j.netClient||0)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot><tr><td colspan="7" style="font-weight:700">الإجمالي</td><td class="tabular text-brand font-bold">${curr(totalLoadingSell)}</td></tr></tfoot>
      </table></div>
    </div>`:''}

    <div class="card">
      <div class="flex-between mb8">
        <div class="section-title" style="margin-bottom:0">💵 التحصيلات من دفتر اليومية (${colls.length})</div>
        <strong class="text-green tabular">${curr(totalColl)}</strong>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>طريقة الدفع</th><th>رقم الشيك</th><th>البنك</th><th>البيان</th></tr></thead>
        <tbody>
          ${colls.map(c=>`<tr>
            <td>${fmtDate(c.date)}</td>
            <td>${statusBadge(c.entryType==='يدوي'?'تحصيل يدوي':'تحصيل')}</td>
            <td class="tabular font-bold text-green">${curr(c.amount)}</td>
            <td>${badge(c.paymentType||'—','blue')}</td>
            <td class="font-mono">${c.chequeNo||'—'}</td>
            <td class="text-gray">${c.bank||'—'}</td>
            <td class="text-gray">${c.description||(c.entryType==='يدوي'?'قيد يدوي → '+(c.debitCode||'')+' '+(c.debitName||''):'—')}</td>
          </tr>`).join('')||`<tr><td colspan="7" class="tbl-empty">لا توجد تحصيلات</td></tr>`}
          ${colls.length>0?`<tfoot><tr><td colspan="1" style="font-weight:700">الإجمالي</td><td class="tabular text-green font-bold">${curr(totalColl)}</td><td colspan="5"></td></tr></tfoot>`:''}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// SUPPLIER STATEMENT
// ═══════════════════════════════════════════════════════
let _SS={party:'',from:'2026-01-01',to:todayStr(),mat:'الكل'};

function renderSuppStmt(){
  const suppliers=DB.getAll('suppliers');
  const materials=DB.getAll('materials');
  if(!_SS.party&&suppliers[0])_SS.party=suppliers[0].name;

  const {opening, label: openLabel, lastStmt} = _calcOpeningBefore('supplier', _SS.party, _SS.from);

  const fd=new Date(_SS.from),td=new Date(_SS.to);

  const sarkis=DB.getAll('sarkis').filter(sk=>{
    const d=new Date(sk.date);
    return sk.supplier===_SS.party&&sk.status!=='ملغي'&&d>=fd&&d<=td&&(_SS.mat==='الكل'||sk.material===_SS.mat);
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);

  const pmts=DB.getAll('journal').filter(j=>{
    const d=new Date(j.date);
    if(!(d>=fd&&d<=td)) return false;
    if(j.entryType==='دفع'&&j.party===_SS.party) return true;
    if(j.entryType==='يدوي'&&j.party===_SS.party&&j.partyType==='مورد'&&j.debitCode==='2001') return true;
    return false;
  }).map(j=>{
    if(j.entryType==='يدوي') return {...j, amount:Number(j.debitAmount)||0, paymentType:'قيد يدوي'};
    return j;
  });

  const totalBuy=sarkis.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);
  const totalPmt=pmts.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const totalNet=sarkis.reduce((s,r)=>s+(Number(r.totalNet)||0),0);
  const balance=opening+totalBuy-totalPmt;
  const matNames=['الكل',...materials.map(m=>m.name)];

  const matSummary={};
  sarkis.forEach(sk=>{
    if(!matSummary[sk.material])matSummary[sk.material]={cubic:0,buy:0,trips:0,count:0};
    matSummary[sk.material].cubic+=(Number(sk.totalNet)||0);
    matSummary[sk.material].buy+=(Number(sk.totalBuy)||0);
    matSummary[sk.material].trips+=(Number(sk.totalTrips)||0);
    matSummary[sk.material].count++;
  });

  return `<div>
    <div class="card mb12">
      <div class="form-row fr4">
        <div class="form-group"><label>المورد</label><select onchange="_SS.party=this.value;nav('supp-stmt')">${suppliers.map(s=>`<option ${_SS.party===s.name?'selected':''}>${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>من</label><input type="date" value="${_SS.from}" onchange="_SS.from=this.value;nav('supp-stmt')"></div>
        <div class="form-group"><label>إلى</label><input type="date" value="${_SS.to}" onchange="_SS.to=this.value;nav('supp-stmt')"></div>
        <div class="form-group"><label>الخامة</label><select onchange="_SS.mat=this.value;nav('supp-stmt')">${matNames.map(m=>`<option ${_SS.mat===m?'selected':''}>${m}</option>`).join('')}</select></div>
      </div>
      ${lastStmt?`<div class="alert alert-blue mt8">📋 مستخلص سابق معتمد: <strong>رقم ${lastStmt.id}</strong> — رصيد مرحَّل: <strong>${curr(lastStmt.closingBalance)}</strong> — بتاريخ ${fmtDate(lastStmt.approvedAt)}</div>`:''}
      ${!lastStmt&&opening!==0?`<div class="alert alert-blue mt8">📊 رصيد أول المدة محسوب تراكمياً من كل الحركات السابقة لـ ${fmtDate(_SS.from)}</div>`:''}
    </div>

    <div class="grid4 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">${openLabel}</div><div class="font-bold text-brand tabular" style="font-size:13px">${curr(opening)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي المشتريات</div><div class="font-bold text-orange tabular">${curr(totalBuy)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي المدفوعات</div><div class="font-bold text-green tabular">${curr(totalPmt)}</div></div>
      <div class="card-sm text-center" style="border-color:${balance>0?'#fca5a5':'#86efac'}">
        <div class="text-xs text-gray mb4">الرصيد المستحق</div>
        <div class="font-bold tabular ${balance>0?'text-red':'text-green'}" style="font-size:15px">${curr(balance)}</div>
      </div>
    </div>

    <div class="flex-wrap mb12">
      <button class="btn btn-primary" onclick="printSuppStmt()">🖨️ طباعة PDF شامل</button>
      <button class="btn btn-green" onclick="approveStmt('supplier',_SS.party,_SS.from,_SS.to,${opening},0,${totalBuy},0,${totalPmt},${balance})">✅ اعتماد وترحيل الرصيد</button>
    </div>

    ${Object.keys(matSummary).length>0?`
    <div class="card mb12">
      <div class="section-title">🪨 ملخص الخامات</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>الخامة</th><th>عدد الحوافظ</th><th>النقلات</th><th>م³ صافي</th><th>تكلفة المورد</th></tr></thead>
        <tbody>
          ${Object.entries(matSummary).map(([mat,v])=>`<tr><td>${badge(mat)}</td><td class="tabular text-center">${v.count}</td><td class="tabular text-center">${num(v.trips)}</td><td class="tabular text-center font-bold">${v.cubic.toFixed(1)}</td><td class="tabular font-bold text-orange">${curr(v.buy)}</td></tr>`).join('')}
          <tr style="background:#fafafa;font-weight:700"><td>الإجمالي</td><td class="tabular text-center">${sarkis.length}</td><td class="tabular text-center">${num(sarkis.reduce((s,r)=>s+(Number(r.totalTrips)||0),0))}</td><td class="tabular text-center">${totalNet.toFixed(1)}</td><td class="tabular text-orange">${curr(totalBuy)}</td></tr>
        </tbody>
      </table></div>
    </div>`:''}

    <div class="card mb12">
      <div class="flex-between mb8">
        <div class="section-title" style="margin-bottom:0">🚛 تفاصيل الحوافظ — كل النقلات (${sarkis.length} حافظة)</div>
        <strong class="text-orange tabular">${curr(totalBuy)}</strong>
      </div>
      ${sarkis.map(sk=>`
        <div style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;overflow:hidden">
          <div style="background:#f8fafc;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb">
            <div class="flex" style="gap:8px">
              <span class="font-mono font-bold text-brand" style="background:#eff6ff;padding:1px 7px;border-radius:4px">#${sk.id}</span>
              <span class="font-bold text-sm">${fmtDate(sk.date)}</span>
              ${badge(sk.material)}
              <span class="text-xs text-gray">العميل: ${sk.client}</span>
            </div>
            <div class="flex" style="gap:12px">
              <span class="text-xs text-gray">${(Number(sk.totalNet)||0).toFixed(1)} م³</span>
              <strong class="text-orange tabular">${curr(sk.totalBuy)}</strong>
              ${statusBadge(sk.status)}
            </div>
          </div>
          <table style="font-size:10px">
            <thead style="background:#1F4E78;color:#fff">
              <tr><th style="padding:5px 6px">السائق</th><th style="padding:5px 6px">اللوحة</th><th style="padding:5px 6px;text-align:center">نقلات</th><th style="padding:5px 6px;text-align:center">م³/نقلة</th><th style="padding:5px 6px;text-align:center">إجمالي م³</th><th style="padding:5px 6px;text-align:center">خصم م</th><th style="padding:5px 6px;text-align:center">صافي م³</th><th style="padding:5px 6px;text-align:center">سعر شراء</th><th style="padding:5px 6px">تكلفة المورد</th></tr>
            </thead>
            <tbody>
              ${(sk.lines||[]).map((l,i)=>`<tr style="${i%2?'background:#f8fafc':''}">
                <td style="padding:4px 6px">${l.driverName||'—'}</td>
                <td style="padding:4px 6px;font-family:monospace">${l.plateNo||'—'}</td>
                <td style="padding:4px 6px;text-align:center">${l.trips||0}</td>
                <td style="padding:4px 6px;text-align:center">${l.cubicBuy!=null?l.cubicBuy:(l.cubicPerTrip||0)}</td>
                <td style="padding:4px 6px;text-align:center">${(l.grossBuy!=null?l.grossBuy:l.grossCubic||0).toFixed(1)}</td>
                <td style="padding:4px 6px;text-align:center;color:#dc2626">${l.discountBuy!=null?l.discountBuy:(l.discountM||0)}</td>
                <td style="padding:4px 6px;text-align:center;font-weight:700;color:#1F4E78">${(l.netBuy!=null?l.netBuy:l.netCubic||0).toFixed(1)}</td>
                <td style="padding:4px 6px;text-align:center">${l.buyPrice||0}</td>
                <td style="padding:4px 6px;font-weight:600;color:#d97706">${curr(l.buyTotal)}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#fefce8;font-weight:700;font-size:10px">
                <td colspan="2" style="padding:5px 6px">مجموع الحافظة</td>
                <td style="padding:5px 6px;text-align:center">${num(sk.totalTrips)}</td>
                <td></td>
                <td style="padding:5px 6px;text-align:center">${(sk.totalGross||0).toFixed(1)}</td>
                <td></td>
                <td style="padding:5px 6px;text-align:center;color:#1F4E78">${(sk.totalNet||0).toFixed(1)}</td>
                <td></td>
                <td style="padding:5px 6px;color:#d97706">${curr(sk.totalBuy)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`).join('')||`<div class="tbl-empty">لا توجد حوافظ</div>`}
    </div>

    <div class="card">
      <div class="flex-between mb8">
        <div class="section-title" style="margin-bottom:0">💸 المدفوعات من دفتر اليومية (${pmts.length})</div>
        <strong class="text-red tabular">${curr(totalPmt)}</strong>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>طريقة الدفع</th><th>رقم الشيك</th><th>البنك</th><th>البيان</th></tr></thead>
        <tbody>
          ${pmts.map(p=>`<tr>
            <td>${fmtDate(p.date)}</td>
            <td>${statusBadge(p.entryType==='يدوي'?'دفع يدوي':'دفع')}</td>
            <td class="tabular font-bold text-red">${curr(p.amount)}</td>
            <td>${badge(p.paymentType||'—','yellow')}</td>
            <td class="font-mono">${p.chequeNo||'—'}</td>
            <td class="text-gray">${p.bank||'—'}</td>
            <td class="text-gray">${p.description||(p.entryType==='يدوي'?'قيد يدوي → '+(p.creditCode||'')+' '+(p.creditName||''):'—')}</td>
          </tr>`).join('')||`<tr><td colspan="7" class="tbl-empty">لا توجد مدفوعات</td></tr>`}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

function approveStmt(type,party,from,to,opening,totalSell,totalBuy,totalColl,totalPmt,balance){
  const notes=prompt('ملاحظات الاعتماد (اختياري):','');
  if(notes===null)return;
  DB.insert('statements',{type,entityName:party,fromDate:from,toDate:to,
    openingBalance:opening,totalSell,totalBuy,totalColl,totalPmt,
    closingBalance:balance,status:'معتمد',approvedAt:Date.now(),notes:notes||''});
  toast('✅ تم الاعتماد وترحيل الرصيد');
  nav(type==='customer'?'cust-stmt':'supp-stmt');
}

// ═══════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════
