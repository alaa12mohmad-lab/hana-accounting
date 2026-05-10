// ═══ DASHBOARD ═══
// ═══════════════════════════════════════════════════════
function renderDashboard(){
  const sarkis=DB.getAll('sarkis').filter(s=>s.status!=='ملغي');
  const jrn=DB.getAll('journal');
  const cheques=DB.getAll('cheques');
  const customers=DB.getAll('customers');
  const suppliers=DB.getAll('suppliers');

  const totalSell=sarkis.reduce((s,r)=>s+(Number(r.totalSell)||0),0);
  const totalBuy=sarkis.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);
  const totalProfit=sarkis.reduce((s,r)=>s+(Number(r.totalProfit)||0),0);
  const totalColl=jrn.filter(j=>j.entryType==='تحصيل').reduce((s,j)=>s+(Number(j.amount)||0),0);
  const totalPmt=jrn.filter(j=>j.entryType==='دفع').reduce((s,j)=>s+(Number(j.amount)||0),0);

  const today=Date.now();const in7=today+7*864e5;
  const pendIn=cheques.filter(c=>c.type==='in'&&c.status==='معلق');
  const pendOut=cheques.filter(c=>c.type==='out'&&c.status==='معلق');
  const dueChqs=cheques.filter(c=>c.status==='معلق'&&new Date(c.dueDate).getTime()<=in7);

  const custRows=customers.map(c=>{
    const bal=getCustomerBalance(c.name);
    return {...c,bal};
  }).filter(c=>c.name);

  const suppRows=suppliers.map(s=>{
    const bal=getSupplierBalance(s.name);
    return {...s,bal};
  }).filter(s=>s.name);

  const dueAlert=dueChqs.length?`<div class="alert alert-yellow mb12">
    <span>⏰</span><div><strong>شيكات مستحقة خلال 7 أيام (${dueChqs.length})</strong><br>
    ${dueChqs.slice(0,4).map(c=>`${c.type==='in'?'وارد':'صادر'}: ${curr(c.amount)} — ${fmtDate(c.dueDate)}`).join(' • ')}</div>
  </div>`:'';

  return `<div>
    ${dueAlert}
    <div class="grid4 mb12">
      <div class="kpi kpi-blue"><div class="kpi-icon">💰</div><div class="kpi-label">إجمالي المبيعات (حوافظ)</div><div class="kpi-value">${curr(totalSell)}</div></div>
      <div class="kpi kpi-red"><div class="kpi-icon">📉</div><div class="kpi-label">إجمالي التكاليف</div><div class="kpi-value">${curr(totalBuy)}</div></div>
      <div class="kpi kpi-green"><div class="kpi-icon">✅</div><div class="kpi-label">صافي الربح</div><div class="kpi-value">${curr(totalProfit)}</div></div>
      <div class="kpi kpi-purple"><div class="kpi-icon">📊</div><div class="kpi-label">هامش الربح</div><div class="kpi-value">${pct(totalSell?totalProfit/totalSell:0)}</div></div>
    </div>
    <div class="grid4 mb16">
      <div class="kpi kpi-teal"><div class="kpi-icon">📥</div><div class="kpi-label">إجمالي التحصيلات (يومية)</div><div class="kpi-value">${curr(totalColl)}</div></div>
      <div class="kpi kpi-orange"><div class="kpi-icon">📤</div><div class="kpi-label">إجمالي المدفوعات (يومية)</div><div class="kpi-value">${curr(totalPmt)}</div></div>
      <div class="kpi kpi-green"><div class="kpi-icon">🏦</div><div class="kpi-label">شيكات واردة معلقة</div><div class="kpi-value">${curr(pendIn.reduce((s,c)=>s+(Number(c.amount)||0),0))}</div><div class="kpi-sub">${pendIn.length} شيك</div></div>
      <div class="kpi kpi-red"><div class="kpi-icon">🏦</div><div class="kpi-label">شيكات صادرة معلقة</div><div class="kpi-value">${curr(pendOut.reduce((s,c)=>s+(Number(c.amount)||0),0))}</div><div class="kpi-sub">${pendOut.length} شيك</div></div>
    </div>
    <div class="grid2 mb12">
      <div class="card">
        <div class="section-title">👤 أرصدة العملاء الحالية</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>العميل</th><th>الرصيد المستحق</th></tr></thead>
          <tbody>
            ${custRows.map(c=>`<tr>
              <td><strong>${c.name}</strong></td>
              <td class="tabular ${c.bal>0?'balance-neg':'balance-pos'}">${curr(c.bal)}</td>
            </tr>`).join('')}
            <tr style="background:#fafafa;font-weight:700">
              <td>الإجمالي</td>
              <td class="tabular text-red">${curr(custRows.reduce((s,c)=>s+c.bal,0))}</td>
            </tr>
          </tbody>
        </table></div>
      </div>
      <div class="card">
        <div class="section-title">🏭 أرصدة الموردين الحالية</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>المورد</th><th>الرصيد المستحق</th></tr></thead>
          <tbody>
            ${suppRows.map(s=>`<tr>
              <td><strong>${s.name}</strong></td>
              <td class="tabular ${s.bal>0?'balance-neg':'balance-pos'}">${curr(s.bal)}</td>
            </tr>`).join('')}
            <tr style="background:#fafafa;font-weight:700">
              <td>الإجمالي</td>
              <td class="tabular text-red">${curr(suppRows.reduce((s,r)=>s+r.bal,0))}</td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">🕐 آخر الحوافظ المعتمدة</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>التاريخ</th><th>العميل</th><th>المورد</th><th>الخامة</th><th>م³</th><th>البيع</th><th>التكلفة</th><th>الربح</th></tr></thead>
        <tbody>
          ${[...DB.getAll('sarkis')].sort((a,b)=>b.createdAt-a.createdAt).slice(0,8).map(sk=>`<tr>
            <td class="font-mono font-bold text-brand">#${sk.id}</td>
            <td>${fmtDate(sk.date)}</td>
            <td><strong>${sk.client}</strong></td>
            <td class="text-gray">${sk.supplier}</td>
            <td>${badge(sk.material)}</td>
            <td class="tabular">${(sk.totalNet||0).toFixed(1)}</td>
            <td class="tabular text-brand">${curr(sk.totalSell)}</td>
            <td class="tabular text-gray">${curr(sk.totalBuy)}</td>
            <td class="tabular font-bold text-green">${curr(sk.totalProfit)}</td>
          </tr>`).join('')||`<tr><td colspan="9" class="tbl-empty"><span class="tbl-empty-icon">📋</span>لا توجد حوافظ</td></tr>`}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// SARKIS — الحوافظ (الفاتورة)
// ═══════════════════════════════════════════════════════
let _SK_LINES=[], _SK_EDIT=null, _SK_FILTER={date:'',client:'',status:''};

function renderSarkis(){
  const sarkis=DB.getAll('sarkis').sort((a,b)=>b.id-a.id);
  const customers=DB.getAll('customers');
  const filtered=sarkis.filter(sk=>
    (!_SK_FILTER.client||sk.client===_SK_FILTER.client)&&
    (!_SK_FILTER.status||sk.status===_SK_FILTER.status)&&
    (!_SK_FILTER.date||sk.date===_SK_FILTER.date)
  );
  const strip={
    trips:filtered.reduce((s,r)=>s+(Number(r.totalTrips)||0),0),
    net:filtered.reduce((s,r)=>s+(Number(r.totalNet)||0),0),
    sell:filtered.reduce((s,r)=>s+(Number(r.totalSell)||0),0),
    profit:filtered.reduce((s,r)=>s+(Number(r.totalProfit)||0),0),
  };
  return `<div>
    <div class="page-header">
      <div class="flex-wrap">
        <button class="btn btn-primary" onclick="openSarkiModal()">＋ حافظة جديدة</button>
        <button class="btn btn-green" onclick="openSarkiImportModal()">📊 استيراد من Excel</button>
        <input type="date" style="width:140px;padding:5px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px" value="${_SK_FILTER.date}" onchange="_SK_FILTER.date=this.value;nav('sarkis')" title="فلتر بالتاريخ">
        <select style="padding:5px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px" onchange="_SK_FILTER.client=this.value;nav('sarkis')">
          <option value="">كل العملاء</option>
          ${customers.map(c=>`<option ${_SK_FILTER.client===c.name?'selected':''}>${c.name}</option>`).join('')}
        </select>
        <select style="padding:5px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px" onchange="_SK_FILTER.status=this.value;nav('sarkis')">
          <option value="">كل الحالات</option>
          ${['مفتوح','معتمد','ملغي'].map(s=>`<option ${_SK_FILTER.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="btn btn-gray btn-sm" onclick="_SK_FILTER={date:'',client:'',status:''};nav('sarkis')">✕ مسح</button>
      </div>
      <span class="text-gray text-sm">${filtered.length} حافظة</span>
    </div>
    <div class="grid4 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">النقلات</div><div class="font-bold text-brand">${num(strip.trips)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">م³ صافي</div><div class="font-bold text-brand">${strip.net.toFixed(1)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي البيع</div><div class="font-bold text-brand">${curr(strip.sell)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">صافي الربح</div><div class="font-bold text-green">${curr(strip.profit)}</div></div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>رقم</th><th>التاريخ</th><th>العميل</th><th>المورد</th><th>الخامة</th><th>النقلات</th><th>م³ صافي</th><th>إجمالي البيع</th><th>الربح</th><th>الحالة</th><th>إجراء</th></tr></thead>
      <tbody>
        ${filtered.map(sk=>`<tr>
          <td><span class="font-mono font-bold text-brand" style="background:#eff6ff;padding:1px 7px;border-radius:4px">#${sk.id}</span></td>
          <td>${fmtDate(sk.date)}</td>
          <td><strong>${sk.client}</strong></td>
          <td class="text-gray">${sk.supplier}</td>
          <td>${badge(sk.material)}</td>
          <td class="tabular text-center">${num(sk.totalTrips||0)}</td>
          <td class="tabular font-bold">${(sk.totalNet||0).toFixed(1)}</td>
          <td class="tabular text-brand">${curr(sk.totalSell)}</td>
          <td class="tabular font-bold text-green">${curr(sk.totalProfit)}</td>
          <td>${statusBadge(sk.status)}</td>
          <td><div class="flex" style="gap:3px">
            <button class="btn-icon bi-view" onclick="viewSarki(${sk.id})" title="عرض">👁</button>
            <button class="btn-icon bi-print" onclick="printSarki(${sk.id})" title="طباعة">🖨️</button>
            ${sk.status==='مفتوح'?`<button class="btn-icon bi-edit" onclick="openSarkiModal(${sk.id})">✏️</button><button class="btn-icon bi-ok" onclick="approveSarki(${sk.id})" title="اعتماد">✅</button>`:''}
            <button class="btn-icon bi-del" onclick="deleteSarki(${sk.id})">🗑️</button>
          </div></td>
        </tr>`).join('')||`<tr><td colspan="11" class="tbl-empty"><span class="tbl-empty-icon">📋</span>لا توجد حوافظ</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}