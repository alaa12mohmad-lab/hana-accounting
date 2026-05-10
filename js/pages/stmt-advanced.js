// ═══ STATEMENT HISTORY + RUNNING BALANCE + NOTES ═══

function renderStmtHistory() {
  const stmts = DB.getAll('statements').sort((a, b) => b.approvedAt - a.approvedAt);
  const customers = DB.getAll('customers');
  const suppliers  = DB.getAll('suppliers');
  const allEntities = [
    ...customers.map(c => ({ name: c.name, type: 'customer' })),
    ...suppliers.map(s => ({ name: s.name, type: 'supplier' })),
  ];

  const filtered = stmts.filter(s => {
    if (_SH.type !== 'all' && s.type !== _SH.type) return false;
    if (_SH.entity && s.entityName !== _SH.entity) return false;
    if (_SH.from && s.toDate < _SH.from) return false;
    if (_SH.to   && s.fromDate > _SH.to) return false;
    return true;
  });

  const totalClosing = filtered.reduce((s, r) => s + (Number(r.closingBalance) || 0), 0);
  const approved = filtered.filter(s => s.status === 'معتمد').length;

  const entOpts = allEntities.map(e =>
    `<option value="${e.name}" ${_SH.entity === e.name ? 'selected' : ''}>${e.name} (${e.type === 'customer' ? 'عميل' : 'مورد'})</option>`
  ).join('');

  return `<div>
    <!-- Filters -->
    <div class="card mb12">
      <div class="form-row fr4">
        <div class="form-group"><label>النوع</label>
          <select onchange="_SH.type=this.value;nav('stmt-history')">
            <option value="all" ${_SH.type==='all'?'selected':''}>الكل</option>
            <option value="customer" ${_SH.type==='customer'?'selected':''}>عملاء</option>
            <option value="supplier" ${_SH.type==='supplier'?'selected':''}>موردون</option>
          </select>
        </div>
        <div class="form-group"><label>الجهة</label>
          <select onchange="_SH.entity=this.value;nav('stmt-history')">
            <option value="">الكل</option>${entOpts}
          </select>
        </div>
        <div class="form-group"><label>من تاريخ</label>
          <input type="date" value="${_SH.from}" onchange="_SH.from=this.value;nav('stmt-history')">
        </div>
        <div class="form-group"><label>إلى تاريخ</label>
          <input type="date" value="${_SH.to}" onchange="_SH.to=this.value;nav('stmt-history')">
        </div>
      </div>
      <button class="btn btn-gray btn-sm mt8" onclick="_SH={type:'all',entity:'',from:'',to:''};nav('stmt-history')">✕ مسح الفلاتر</button>
    </div>

    <!-- Stats -->
    <div class="grid4 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي المستخلصات</div><div class="font-bold text-brand">${filtered.length}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">معتمدة</div><div class="font-bold text-green">${approved}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي الأرصدة المرحّلة</div><div class="font-bold text-brand tabular">${curr(totalClosing)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">جهات مختلفة</div><div class="font-bold text-brand">${[...new Set(filtered.map(s=>s.entityName))].length}</div></div>
    </div>

    <!-- Table -->
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>#</th><th>النوع</th><th>الجهة</th><th>من</th><th>إلى</th>
        <th>رصيد افتتاحي</th><th>مبيعات/مشتريات</th><th>تحصيلات/مدفوعات</th>
        <th>الرصيد المرحّل</th><th>تاريخ الاعتماد</th><th>إجراء</th>
      </tr></thead>
      <tbody>
        ${filtered.map(s => `<tr>
          <td><span class="font-mono font-bold text-brand" style="background:#eff6ff;padding:1px 7px;border-radius:4px">${s.id}</span></td>
          <td>${badge(s.type==='customer'?'👤 عميل':'🏭 مورد', s.type==='customer'?'blue':'orange')}</td>
          <td><strong>${s.entityName}</strong></td>
          <td class="text-gray">${fmtDate(s.fromDate)}</td>
          <td class="text-gray">${fmtDate(s.toDate)}</td>
          <td class="tabular">${curr(s.openingBalance)}</td>
          <td class="tabular text-brand">${curr(s.totalSell||s.totalPurchases||0)}</td>
          <td class="tabular text-green">${curr(s.totalColl||s.totalPaid||0)}</td>
          <td class="tabular font-bold ${(Number(s.closingBalance)||0)>0?'text-red':'text-green'}">${curr(s.closingBalance)}</td>
          <td class="text-gray">${fmtDate(s.approvedAt)}</td>
          <td><div class="flex" style="gap:3px">
            <button class="btn-icon bi-view" onclick="viewStmtDetail(${s.id})" title="عرض">👁</button>
            <button class="btn-icon bi-print" onclick="printStmtFromHistory(${s.id})" title="طباعة">🖨️</button>
            <button class="btn-icon bi-del" onclick="deleteStmt(${s.id})" title="حذف">🗑️</button>
          </div></td>
        </tr>`).join('') || `<tr><td colspan="11" class="tbl-empty"><span class="tbl-empty-icon">📚</span>لا توجد مستخلصات معتمدة</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}

function viewStmtDetail(id) {
  const s = DB.getById('statements', id);
  if (!s) return;
  openModal(`مستخلص #${s.id} — ${s.entityName}`, `
    <div class="grid3 mb12" style="background:#f8fafc;border-radius:8px;padding:12px;gap:8px">
      ${[
        ['الجهة', s.entityName],
        ['النوع', s.type==='customer'?'عميل':'مورد'],
        ['الفترة', fmtDate(s.fromDate)+' — '+fmtDate(s.toDate)],
        ['الرصيد الافتتاحي', curr(s.openingBalance)],
        ['المبيعات/المشتريات', curr(s.totalSell||s.totalPurchases||0)],
        ['التحصيلات/المدفوعات', curr(s.totalColl||s.totalPaid||0)],
        ['الرصيد الختامي', curr(s.closingBalance)],
        ['تاريخ الاعتماد', fmtDate(s.approvedAt)],
        ['ملاحظات', s.notes||'—'],
      ].map(([l,v])=>`<div><div class="text-xs text-gray mb4">${l}</div><strong>${v}</strong></div>`).join('')}
    </div>
    <div class="${(Number(s.closingBalance)||0)>0?'alert alert-red':'alert alert-green'}">
      <span>${(Number(s.closingBalance)||0)>0?'⚠️':'✅'}</span>
      <span>الرصيد المرحّل: <strong>${curr(s.closingBalance)}</strong></span>
    </div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إغلاق</button>
     <button class="btn btn-primary" onclick="printStmtFromHistory(${s.id})">🖨️ طباعة</button>`,
    'modal-md');
}

function deleteStmt(id) {
  const s = DB.getById('statements', id);
  confirmDelete(`حذف المستخلص #${id} — ${s?.entityName}؟ سيتم فقدان الرصيد المرحّل.`, () => {
    DB.remove('statements', id);
    toast('تم الحذف');
    nav('stmt-history');
  });
}

function printStmtFromHistory(id) {
  const s = DB.getById('statements', id);
  if (!s) return;
  if (s.type === 'customer') {
    const old = _CS; _CS = { party: s.entityName, from: s.fromDate, to: s.toDate, mat: 'الكل' };
    printCustStmt(); _CS = old;
  } else {
    const old = _SS; _SS = { party: s.entityName, from: s.fromDate, to: s.toDate, mat: 'الكل' };
    printSuppStmt(); _SS = old;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. RUNNING BALANCE ACCOUNT STATEMENT — كشف الحساب بالرصيد المتحرك
// ═══════════════════════════════════════════════════════════════════════════
let _RB = {
  entityType: 'customer',
  entity: '',
  from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
  to: todayStr(),
};

function renderRunningBal() {
  const customers = DB.getAll('customers');
  const suppliers  = DB.getAll('suppliers');
  if (!_RB.entity) _RB.entity = customers[0]?.name || '';

  const entities = _RB.entityType === 'customer' ? customers : suppliers;
  const { balance: openBal, label: openLabel } = getPeriodOpeningBalance(_RB.entity, _RB.entityType, _RB.from);
  const txns = getEntityTransactions(_RB.entity, _RB.entityType, _RB.from, _RB.to);

  // Build running balance rows
  let running = openBal;
  const rows = txns.map(tx => {
    running = running + tx.debit - tx.credit;
    return { ...tx, running };
  });

  const totalDebit  = rows.reduce((s, r) => s + r.debit,  0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closingBal  = running;

  const entOpts = entities.map(e =>
    `<option ${_RB.entity === e.name ? 'selected' : ''}>${e.name}</option>`
  ).join('');

  return `<div>
    <!-- Controls -->
    <div class="card mb12">
      <div class="form-row fr4">
        <div class="form-group"><label>نوع الجهة</label>
          <select onchange="_RB.entityType=this.value;_RB.entity='';nav('running-bal')">
            <option value="customer" ${_RB.entityType==='customer'?'selected':''}>عميل</option>
            <option value="supplier" ${_RB.entityType==='supplier'?'selected':''}>مورد</option>
          </select>
        </div>
        <div class="form-group"><label>${_RB.entityType==='customer'?'العميل':'المورد'}</label>
          <select onchange="_RB.entity=this.value;nav('running-bal')">${entOpts}</select>
        </div>
        <div class="form-group"><label>من تاريخ</label>
          <input type="date" value="${_RB.from}" onchange="_RB.from=this.value;nav('running-bal')">
        </div>
        <div class="form-group"><label>إلى تاريخ</label>
          <input type="date" value="${_RB.to}" onchange="_RB.to=this.value;nav('running-bal')">
        </div>
      </div>
      <div class="flex mt8" style="gap:6px">
        <button class="btn btn-gray btn-sm" onclick="setRBPeriod('month')">هذا الشهر</button>
        <button class="btn btn-gray btn-sm" onclick="setRBPeriod('quarter')">هذا الربع</button>
        <button class="btn btn-gray btn-sm" onclick="setRBPeriod('year')">هذه السنة</button>
        <button class="btn btn-primary btn-sm" onclick="printRunningBal()" style="margin-right:auto">🖨️ طباعة كشف الحساب</button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid4 mb12">
      <div class="card-sm text-center">
        <div class="text-xs text-gray mb4">${openLabel}</div>
        <div class="font-bold text-brand tabular">${curr(openBal)}</div>
      </div>
      <div class="card-sm text-center">
        <div class="text-xs text-gray mb4">${_RB.entityType==='customer'?'إجمالي المبيعات':'إجمالي المشتريات'}</div>
        <div class="font-bold text-brand tabular">${curr(totalDebit)}</div>
      </div>
      <div class="card-sm text-center">
        <div class="text-xs text-gray mb4">${_RB.entityType==='customer'?'إجمالي التحصيلات':'إجمالي المدفوعات'}</div>
        <div class="font-bold text-green tabular">${curr(totalCredit)}</div>
      </div>
      <div class="card-sm text-center" style="border-color:${closingBal>0?'#fca5a5':'#86efac'}">
        <div class="text-xs text-gray mb4">الرصيد الختامي</div>
        <div class="font-bold tabular ${closingBal>0?'text-red':'text-green'}" style="font-size:15px">${curr(closingBal)}</div>
      </div>
    </div>

    <!-- Running balance table — the core feature -->
    <div class="card p-0" style="padding:0">
      <div style="padding:12px 14px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between">
        <strong class="section-title" style="margin:0">📊 كشف الحساب التفصيلي — ${_RB.entity}</strong>
        <span class="text-xs text-gray">${rows.length} حركة</span>
      </div>
      <div class="tbl-wrap" style="border-radius:0">
        <table>
          <thead><tr>
            <th>التاريخ</th><th>نوع الحركة</th><th>البيان</th><th>مرجع</th>
            <th>مدين (له)</th><th>دائن (عليه)</th><th>الرصيد</th>
          </tr></thead>
          <tbody>
            <!-- Opening balance row -->
            <tr style="background:#eff6ff;font-weight:600">
              <td colspan="3">${openLabel}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td class="tabular font-bold text-brand">${curr(openBal)}</td>
            </tr>
            ${rows.map((r, i) => `<tr style="${i%2===0?'background:#fafafa':''}">
              <td class="nowrap">${fmtDate(r.date)}</td>
              <td>${badge(r.type, r.badgeColor||'gray')}</td>
              <td style="max-width:250px;white-space:normal;font-size:11px">${r.description}</td>
              <td class="font-mono text-xs text-gray">${r.ref||'—'}</td>
              <td class="tabular ${r.debit>0?'text-brand font-bold':'text-gray'}">${r.debit>0?curr(r.debit):'—'}</td>
              <td class="tabular ${r.credit>0?'text-green font-bold':'text-gray'}">${r.credit>0?curr(r.credit):'—'}</td>
              <td class="tabular font-bold ${r.running>0?'text-red':'text-green'} nowrap">${curr(r.running)}</td>
            </tr>`).join('') || `<tr><td colspan="7" class="tbl-empty">لا توجد حركات في هذه الفترة</td></tr>`}
          </tbody>
          ${rows.length>0?`<tfoot>
            <tr>
              <td colspan="3" style="font-weight:700;padding:8px 10px">الإجمالي</td>
              <td></td>
              <td class="tabular font-bold text-brand" style="padding:8px 10px">${curr(totalDebit)}</td>
              <td class="tabular font-bold text-green" style="padding:8px 10px">${curr(totalCredit)}</td>
              <td class="tabular font-bold ${closingBal>0?'text-red':'text-green'}" style="padding:8px 10px">${curr(closingBal)}</td>
            </tr>
          </tfoot>`:''}
        </table>
      </div>
    </div>
  </div>`;
}

function setRBPeriod(p) {
  const now = new Date();
  if (p === 'month') {
    _RB.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    _RB.to   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0, 10);
  } else if (p === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    _RB.from = new Date(now.getFullYear(), q*3, 1).toISOString().slice(0, 10);
    _RB.to   = new Date(now.getFullYear(), q*3+3, 0).toISOString().slice(0, 10);
  } else {
    _RB.from = `${now.getFullYear()}-01-01`;
    _RB.to   = `${now.getFullYear()}-12-31`;
  }
  nav('running-bal');
}

function printRunningBal() {
  const { balance: openBal, label: openLabel } = getPeriodOpeningBalance(_RB.entity, _RB.entityType, _RB.from);
  const txns = getEntityTransactions(_RB.entity, _RB.entityType, _RB.from, _RB.to);
  let running = openBal;
  const rows = txns.map(tx => { running += tx.debit - tx.credit; return {...tx, running}; });
  const totalDebit  = rows.reduce((s,r)=>s+r.debit, 0);
  const totalCredit = rows.reduce((s,r)=>s+r.credit, 0);
  const co = DB.getCompany();
  const _n = n => new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';
  const _d = ts => ts?new Date(ts).toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';

  const PCSS = `*{font-family:Tahoma,sans-serif;direction:rtl;margin:0;padding:0;box-sizing:border-box}
    body{padding:14px;font-size:11px}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1F4E78;padding-bottom:9px;margin-bottom:12px}
    .co{font-size:16px;font-weight:700;color:#1F4E78}.co-sub{font-size:9px;color:#666}
    .title{text-align:center;font-size:14px;font-weight:700;color:#1F4E78;margin-bottom:3px}
    .period{text-align:center;font-size:10px;color:#666;margin-bottom:12px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
    .kc{border:1px solid #ddd;border-radius:4px;padding:7px;text-align:center}
    .kl{font-size:9px;color:#888;margin-bottom:2px}.kv{font-size:12px;font-weight:700;color:#1F4E78}
    table{width:100%;border-collapse:collapse;font-size:10px}
    thead tr{background:#1F4E78;color:#fff}thead th{padding:6px 5px;text-align:right}
    tbody tr:nth-child(even){background:#f5f8fc}tbody td{padding:4px 5px;border-bottom:1px solid #eee}
    tfoot tr{background:#FFE699;font-weight:700}tfoot td{padding:6px 5px}
    .bal-pos{color:#dc2626;font-weight:700}.bal-neg{color:#16a34a;font-weight:700}
    .stamps{display:flex;justify-content:space-around;margin-top:24px}
    .stamp{text-align:center;border-top:1px solid #333;padding-top:5px;width:130px;font-size:10px}
    @media print{@page{margin:9mm;size:A4}body{padding:0}}`;

  const w = window.open('','_blank');
  const sc = '<scr'+'ipt>setTimeout(()=>window.print(),700)<'+'/scr'+'ipt>';
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كشف حساب<\/title><style>${PCSS}<\/style><\/head><body>
    <div class="hdr">
      <div><div class="co">${co.name||'شركة الهنا للنقل'}</div>
        ${co.crNumber?`<div class="co-sub">س.ت: ${co.crNumber}</div>`:''}
      </div>
      <div style="text-align:left;font-size:10px;color:#666">${_d(Date.now())}</div>
    </div>
    <div class="title">كشف الحساب بالرصيد المتحرك</div>
    <div class="period">${_RB.entityType==='customer'?'عميل':'مورد'}: <strong>${_RB.entity}</strong> — الفترة: ${_d(_RB.from)} إلى ${_d(_RB.to)}</div>
    <div class="kpis">
      <div class="kc"><div class="kl">${openLabel}</div><div class="kv">${_n(openBal)}</div></div>
      <div class="kc"><div class="kl">${_RB.entityType==='customer'?'إجمالي المبيعات':'إجمالي المشتريات'}</div><div class="kv">${_n(totalDebit)}</div></div>
      <div class="kc"><div class="kl">${_RB.entityType==='customer'?'إجمالي التحصيلات':'إجمالي المدفوعات'}</div><div class="kv">${_n(totalCredit)}</div></div>
      <div class="kc"><div class="kl">الرصيد الختامي</div><div class="kv ${running>0?'bal-pos':'bal-neg'}">${_n(running)}</div></div>
    </div>
    <table>
      <thead><tr><th>التاريخ</th><th>نوع الحركة</th><th>البيان</th><th>مرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
      <tbody>
        <tr style="background:#eff6ff;font-weight:600"><td colspan="4">${openLabel}</td><td>—</td><td>—</td><td style="color:#1F4E78">${_n(openBal)}</td></tr>
        ${rows.map((r,i)=>`<tr ${i%2?'style="background:#f5f8fc"':''}><td>${_d(r.date)}</td><td>${r.type}</td><td>${r.description}</td><td style="font-family:monospace">${r.ref||'—'}</td><td>${r.debit>0?_n(r.debit):'—'}</td><td>${r.credit>0?_n(r.credit):'—'}</td><td class="${r.running>0?'bal-pos':'bal-neg'}">${_n(r.running)}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="4">الإجمالي</td><td>${_n(totalDebit)}</td><td>${_n(totalCredit)}</td><td class="${running>0?'bal-pos':'bal-neg'}">${_n(running)}</td></tr></tfoot>
    </table>
    <div class="stamps">
      <div class="stamp">المحاسب</div>
      <div class="stamp">المدير</div>
      <div class="stamp">${_RB.entityType==='customer'?'العميل':'المورد'} / المفوض</div>
    </div>
  ${sc}<\/body><\/html>`);
  w.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. DEBIT / CREDIT NOTES — إشعارات المديونية والدائنية
// ═══════════════════════════════════════════════════════════════════════════
let _NT_FILTER = { type: 'all', entityType: 'customer', entity: '' };
let _noteSeq = 1;

function getNextNoteNumber(noteType) {
  const prefix = noteType === 'debit' ? 'DN' : 'CN';
  const existing = DB.getAll('notes').filter(n => n.noteType === noteType);
  const num = (existing.length + 1).toString().padStart(4, '0');
  return `${prefix}-${num}`;
}

function renderNotes() {
  const notes = DB.getAll('notes').sort((a, b) => new Date(b.date) - new Date(a.date));
  const customers = DB.getAll('customers');
  const suppliers  = DB.getAll('suppliers');

  const filtered = notes.filter(n => {
    if (_NT_FILTER.type !== 'all' && n.noteType !== _NT_FILTER.type) return false;
    if (_NT_FILTER.entityType !== 'all' && n.entityType !== _NT_FILTER.entityType) return false;
    if (_NT_FILTER.entity && n.entity !== _NT_FILTER.entity) return false;
    return true;
  });

  const totalDebit  = filtered.filter(n=>n.noteType==='debit').reduce((s,n)=>s+(Number(n.amount)||0),0);
  const totalCredit = filtered.filter(n=>n.noteType==='credit').reduce((s,n)=>s+(Number(n.amount)||0),0);

  return `<div>
    <div class="page-header">
      <div class="flex-wrap">
        <button class="btn btn-orange" onclick="openNoteModal('debit')">📄 إشعار مديونية (Debit Note)</button>
        <button class="btn btn-purple" style="background:#7c3aed" onclick="openNoteModal('credit')">📄 إشعار دائنية (Credit Note)</button>
        <div class="flex" style="background:#f1f5f9;border-radius:7px;padding:3px;gap:2px">
          ${[['all','الكل'],['debit','مديونية'],['credit','دائنية']].map(([v,l])=>
            `<button class="btn btn-sm" style="${_NT_FILTER.type===v?'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1)':'background:none;color:#64748b'}" onclick="_NT_FILTER.type='${v}';nav('notes')">${l}</button>`
          ).join('')}
        </div>
      </div>
    </div>

    <div class="alert alert-blue mb12" style="font-size:11px">
      <span>ℹ️</span>
      <div>
        <strong>إشعار المديونية (Debit Note):</strong> يزيد ما يجب على العميل أو يزيد ما يجب للمورد — مثل: تصحيح خطأ في الكميات، رسوم إضافية<br>
        <strong>إشعار الدائنية (Credit Note):</strong> يُخفّض ما يجب على العميل أو يُخفّض ما يجب للمورد — مثل: خصم، إرجاع بضاعة
      </div>
    </div>

    <div class="grid3 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي إشعارات المديونية</div><div class="font-bold text-orange tabular">${curr(totalDebit)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي إشعارات الدائنية</div><div class="font-bold text-purple tabular" style="color:#7c3aed">${curr(totalCredit)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">صافي التأثير</div><div class="font-bold tabular ${(totalDebit-totalCredit)>0?'text-brand':'text-green'}">${curr(totalDebit-totalCredit)}</div></div>
    </div>

    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>رقم الإشعار</th><th>التاريخ</th><th>النوع</th><th>نوع الجهة</th>
        <th>الجهة</th><th>المبلغ</th><th>السبب</th><th>مرجع السركي</th><th>إجراء</th>
      </tr></thead>
      <tbody>
        ${filtered.map(n => `<tr>
          <td><span class="font-mono font-bold" style="font-size:11px">${n.number}</span></td>
          <td>${fmtDate(n.date)}</td>
          <td>${badge(n.noteType==='debit'?'مديونية':'دائنية', n.noteType==='debit'?'orange':'purple')}</td>
          <td>${badge(n.entityType==='customer'?'عميل':'مورد', n.entityType==='customer'?'blue':'teal')}</td>
          <td><strong>${n.entity}</strong></td>
          <td class="tabular font-bold ${n.noteType==='debit'?'text-orange':'text-purple'}" style="${n.noteType==='credit'?'color:#7c3aed':''}">${curr(n.amount)}</td>
          <td style="max-width:200px;white-space:normal;font-size:11px">${n.reason}</td>
          <td class="font-mono text-xs text-gray">${n.sarkiRef||'—'}</td>
          <td><div class="flex" style="gap:3px">
            <button class="btn-icon bi-print" onclick="printNote(${n.id})" title="طباعة">🖨️</button>
            <button class="btn-icon bi-del" onclick="deleteNote(${n.id})">🗑️</button>
          </div></td>
        </tr>`).join('') || `<tr><td colspan="9" class="tbl-empty"><span class="tbl-empty-icon">📋</span>لا توجد إشعارات</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}

function openNoteModal(noteType, editId) {
  const n = editId ? DB.getById('notes', editId) : null;
  const customers = DB.getAll('customers');
  const suppliers  = DB.getAll('suppliers');
  const isDebit = noteType === 'debit';
  const v = (k, d='') => n?.[k] ?? d;
  const defEntityType = v('entityType', 'customer');
  const entities = defEntityType === 'customer' ? customers : suppliers;

  openModal(isDebit ? '📄 إشعار مديونية (Debit Note)' : '📄 إشعار دائنية (Credit Note)', `
    <div class="alert alert-${isDebit?'orange':'purple'} mb12" style="${isDebit?'background:#fff7ed;border-color:#fed7aa;color:#9a3412':'background:#f5f3ff;border-color:#ddd6fe;color:#5b21b6'}">
      <span>${isDebit?'📈':'📉'}</span>
      <span>${isDebit?'إشعار مديونية — يزيد الرصيد المستحق على العميل أو للمورد':'إشعار دائنية — يُخفّض الرصيد المستحق على العميل أو للمورد'}</span>
    </div>
    <div class="form-row fr3 mb10">
      <div class="form-group"><label>رقم الإشعار</label>
        <input id="nt-num" value="${v('number', getNextNoteNumber(noteType))}" class="font-mono">
      </div>
      <div class="form-group"><label><span class="req">*</span>التاريخ</label>
        <input type="date" id="nt-date" value="${v('date', todayStr())}">
      </div>
      <div class="form-group"><label><span class="req">*</span>المبلغ (ج.م)</label>
        <input type="number" id="nt-amt" value="${v('amount')}" placeholder="0.00">
      </div>
    </div>
    <div class="form-row fr2 mb10">
      <div class="form-group"><label>نوع الجهة</label>
        <select id="nt-etype" onchange="onNoteEntityTypeChange(this)">
          <option value="customer" ${defEntityType==='customer'?'selected':''}>عميل</option>
          <option value="supplier" ${defEntityType==='supplier'?'selected':''}>مورد</option>
        </select>
      </div>
      <div class="form-group"><label><span class="req">*</span>الجهة</label>
        <select id="nt-entity">
          ${entities.map(e=>`<option ${v('entity')===e.name?'selected':''}>${e.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group mb10"><label><span class="req">*</span>سبب الإشعار</label>
      <input id="nt-reason" value="${v('reason')}" placeholder="${isDebit?'مثال: تعديل كميات سركي #12، رسوم إضافية...':'مثال: خصم متفق عليه، إرجاع خامة...'}">
    </div>
    <div class="form-row fr2 mb10">
      <div class="form-group"><label>مرجع السركي</label>
        <input id="nt-sarkiref" value="${v('sarkiRef')}" placeholder="#123" class="font-mono">
      </div>
      <div class="form-group"><label>ملاحظات</label>
        <input id="nt-notes" value="${v('notes')}">
      </div>
    </div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn ${isDebit?'btn-orange':'btn-primary'}" style="${!isDebit?'background:#7c3aed':''}" onclick="saveNote('${noteType}', ${editId||'null'})">💾 حفظ الإشعار</button>`,
    'modal-md');
}

function onNoteEntityTypeChange(sel) {
  const type = sel.value;
  const entities = type === 'customer' ? DB.getAll('customers') : DB.getAll('suppliers');
  const entSel = document.getElementById('nt-entity');
  if (entSel) entSel.innerHTML = entities.map(e=>`<option>${e.name}</option>`).join('');
}

function saveNote(noteType, editId) {
  const num    = document.getElementById('nt-num')?.value?.trim();
  const date   = document.getElementById('nt-date')?.value || todayStr();
  const amt    = Number(document.getElementById('nt-amt')?.value);
  const etype  = document.getElementById('nt-etype')?.value;
  const entity = document.getElementById('nt-entity')?.value;
  const reason = document.getElementById('nt-reason')?.value?.trim();
  if (!entity) return toast('اختر الجهة', 'error');
  if (!amt)    return toast('أدخل المبلغ', 'error');
  if (!reason) return toast('أدخل سبب الإشعار', 'error');

  const data = {
    noteType, number: num, date, amount: amt,
    entityType: etype, entity, reason,
    sarkiRef: document.getElementById('nt-sarkiref')?.value || '',
    notes:    document.getElementById('nt-notes')?.value || '',
  };

  if (editId) { DB.update('notes', editId, data); toast('تم التعديل ✓'); }
  else        { DB.insert('notes', data); toast('✅ تم إنشاء الإشعار'); }
  closeModal();
  nav('notes');
}

function deleteNote(id) {
  const n = DB.getById('notes', id);
  confirmDelete(`حذف الإشعار ${n?.number}؟`, () => {
    DB.remove('notes', id);
    toast('تم الحذف');
    nav('notes');
  });
}

function printNote(id) {
  const n = DB.getById('notes', id);
  if (!n) return;
  const co = DB.getCompany();
  const _n = v => new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(v)||0)+' ج.م';
  const _d = ts => ts?new Date(ts).toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  const isDebit = n.noteType === 'debit';

  const PCSS = `*{font-family:Tahoma,sans-serif;direction:rtl;margin:0;padding:0}body{padding:15px;font-size:11px}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid ${isDebit?'#d97706':'#7c3aed'};padding-bottom:10px;margin-bottom:14px}
    .co{font-size:16px;font-weight:700;color:#1F4E78}.note-no{font-size:20px;font-weight:700;color:${isDebit?'#d97706':'#7c3aed'};border:2px solid currentColor;padding:3px 12px;border-radius:5px}
    .info{background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .il{font-size:9px;color:#888;margin-bottom:2px}.iv{font-weight:700;font-size:12px}
    .amount-box{border:2px solid ${isDebit?'#d97706':'#7c3aed'};border-radius:10px;padding:16px;text-align:center;margin:16px 0}
    .amt-label{font-size:11px;color:#666;margin-bottom:6px}
    .amt-value{font-size:24px;font-weight:700;color:${isDebit?'#d97706':'#7c3aed'}}
    .stamps{display:flex;justify-content:space-around;margin-top:30px}
    .stamp{text-align:center;border-top:1px solid #333;padding-top:5px;width:130px;font-size:10px}
    @media print{@page{margin:10mm;size:A4}body{padding:0}}`;

  const w = window.open('','_blank');
  const sc = '<scr'+'ipt>setTimeout(()=>window.print(),600)<'+'/scr'+'ipt>';
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${n.number}<\/title><style>${PCSS}<\/style><\/head><body>
    <div class="hdr">
      <div><div class="co">${co.name||'شركة الهنا للنقل'}</div>${co.crNumber?`<div style="font-size:9px;color:#666">س.ت: ${co.crNumber}</div>`:''}</div>
      <div class="note-no">${isDebit?'إشعار مديونية':'إشعار دائنية'}<br><span style="font-size:14px">${n.number}</span></div>
    </div>
    <div class="info">
      <div><div class="il">التاريخ</div><div class="iv">${_d(n.date)}</div></div>
      <div><div class="il">${n.entityType==='customer'?'العميل':'المورد'}</div><div class="iv">${n.entity}</div></div>
      <div><div class="il">مرجع السركي</div><div class="iv">${n.sarkiRef||'—'}</div></div>
    </div>
    <div style="padding:12px;background:#fafafa;border-radius:8px;margin-bottom:14px">
      <div style="font-size:10px;color:#888;margin-bottom:4px">سبب الإشعار</div>
      <div style="font-size:13px;font-weight:600">${n.reason}</div>
      ${n.notes?`<div style="font-size:10px;color:#666;margin-top:6px">${n.notes}</div>`:''}
    </div>
    <div class="amount-box">
      <div class="amt-label">${isDebit?'المبلغ المستحق الإضافي':'المبلغ المخصوم'}</div>
      <div class="amt-value">${_n(n.amount)}</div>
    </div>
    <div class="stamps">
      <div class="stamp">المحاسب</div>
      <div class="stamp">المدير</div>
      <div class="stamp">${n.entityType==='customer'?'العميل':'المورد'} / المفوض</div>
    </div>
  ${sc}<\/body><\/html>`);
  w.document.close();
}



// ════════════════════════════════════════════════════
// FIREBASE INTEGRATION
// ════════════════════════════════════════════════════
const FB_CFG_KEY  = 'hana_fb_config';
const FB_USER_KEY = 'hana_fb_user';
const FB_WARN_DAYS = 3;

function getFBConfig()       { try{return JSON.parse(localStorage.getItem(FB_CFG_KEY)||'null');}catch{return null;} }
function saveFBConfig(c)     { localStorage.setItem(FB_CFG_KEY,JSON.stringify(c)); }
function clearFBConfig()     { localStorage.removeItem(FB_CFG_KEY); localStorage.removeItem(FB_USER_KEY); }

// ── Status indicator (topbar) ─────────────────────
function setConnStatus(status, msg){
  const el = document.getElementById('conn-status');
  if(!el) return;
  const clr = {connected:'#16a34a',connecting:'#d97706',error:'#dc2626',offline:'#ea580c',local:'#94a3b8'};
  const ico = {connected:'🟢',connecting:'🟡',error:'🔴',offline:'🟠',local:'⚪'};
  el.textContent = (ico[status]||'') + ' ' + msg;
  el.style.color  = clr[status]||'#94a3b8';
}

// ── Backup warning banner ──────────────────────────
function renderBackupBar(){
  const ts   = localStorage.getItem('hana_v4_last_export');
  const days = ts ? Math.floor((Date.now()-Number(ts))/864e5) : null;
  if(days !== null && days < FB_WARN_DAYS) return;
  if(document.getElementById('backup-bar')) return;
  const bar  = document.createElement('div');
  bar.id     = 'backup-bar';
  bar.style.cssText = 'background:#fef3c7;border-bottom:2px solid #f59e0b;padding:7px 16px;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:600;color:#92400e;position:sticky;top:0;z-index:200;flex-shrink:0';
  bar.innerHTML = days===null
    ? '<span>⚠️ لم تقم بأي نسخة احتياطية — بياناتك في خطر</span><button onclick="quickExport()" style="background:#fff;border:1px solid #d97706;border-radius:5px;padding:2px 10px;cursor:pointer;font-size:10px;font-weight:700;color:#92400e;margin-right:8px">💾 نسخ احتياطي الآن</button>'
    : '<span>⚠️ آخر نسخة احتياطية منذ '+days+' أيام</span><button onclick="quickExport()" style="background:#fff;border:1px solid #d97706;border-radius:5px;padding:2px 10px;cursor:pointer;font-size:10px;font-weight:700;color:#92400e;margin-right:8px">💾 نسخ احتياطي الآن</button>';
  const main = document.getElementById('main');
  const topbar = document.getElementById('topbar');
  if(main && topbar) main.insertBefore(bar, topbar.nextSibling);
}

function quickExport(){
  const data = DB.exportJSON ? DB.exportJSON() : DB.exportData();
  const blob = new Blob([data],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'hana-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem('hana_v4_last_export', Date.now().toString());
  const bar = document.getElementById('backup-bar');
  if(bar) bar.remove();
  toast('✅ تم تصدير النسخة الاحتياطية');
}

function tryRecoverFromShadow(){
  try{
    const main = localStorage.getItem('hana_v4');
    if(!main || main.length < 50){
      const shadow = localStorage.getItem('hana_v4_shadow') || sessionStorage.getItem('hana_v4_shadow');
      if(shadow && shadow.length > 100){
        localStorage.setItem('hana_v4', shadow);
        location.reload();
      }
    }
  }catch(e){}
}

function writeShadowCopy(){
  try{
    const d = DB.exportJSON ? DB.exportJSON() : DB.exportData();
    sessionStorage.setItem('hana_v4_shadow', d);
    localStorage.setItem('hana_v4_shadow', d);
  }catch(e){}
}

// ════════════════════════════════════════════════════
// FIREBASE REPOSITORY (activated when config exists)
// ════════════════════════════════════════════════════
function createFirebaseRepo(fbConfig){
  const cache = {};
  const seqs  = {};
  COLLECTIONS.forEach(col=>{ cache[col]=[]; seqs[col]=1; });
  let _co  = {name:'شركة الهنا للنقل',address:'',phone:'',crNumber:'',vatNumber:'',city:'',email:'',activity:''};
  let _db, _auth;

  function init(){
    try{
      if(!firebase.apps.length) firebase.initializeApp(fbConfig);
      else firebase.app();
      _db   = firebase.firestore();
      _auth = firebase.auth();
      _db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
      setConnStatus('connecting','جاري الاتصال...');
      _listen();
      _auth.onAuthStateChanged(user=>{
        if(!user) _autoLogin();
        else{ document.getElementById('modal-overlay')?.classList.remove('show'); }
      });
    }catch(e){
      setConnStatus('error','خطأ في Firebase');
      toast('خطأ Firebase: '+e.message,'error');
    }
  }

  function _autoLogin(){
    const saved = localStorage.getItem(FB_USER_KEY);
    if(saved){
      const u = JSON.parse(saved);
      _auth.signInWithEmailAndPassword(u.e, u.p).catch(()=>showFBLogin());
    } else { showFBLogin(); }
  }

  function _listen(){
    let done = 0;
    const total = COLLECTIONS.length;
    COLLECTIONS.forEach(col=>{
      _db.collection(col).onSnapshot(snap=>{
        cache[col] = snap.docs.map(d=>({...d.data(),_fbId:d.id}));
        const mx = Math.max(0,...cache[col].map(r=>Number(r.id)||0));
        if(mx >= seqs[col]) seqs[col]=mx+1;
        done++;
        if(done>=total){
          setConnStatus('connected','متصل بـ Firebase ☁️');
          if(!cache.customers.length && !cache.materials.length) _seed();
          _refresh();
        }
        if(done>total) _refresh();
      }, err=>{
        done++;
        if(err.code==='permission-denied') showFBLogin();
        else setConnStatus('error','خطأ في الاتصال');
      });
    });
    _db.collection('_cfg').doc('company').onSnapshot(d=>{ if(d.exists) _co=d.data(); });
  }

  function _refresh(){
    const a = document.querySelector('.sb-link.active');
    if(!a) return;
    const m = a.getAttribute('onclick')?.match(/nav\('([^']+)'\)/);
    if(m) setTimeout(()=>nav(m[1]),30);
  }

  function _nid(col){ return seqs[col]++; }

  function getAll(col)        { return [...(cache[col]||[])]; }
  function getById(col,id)    { return (cache[col]||[]).find(r=>r.id===id)||null; }
  function getWhere(col,fn)   { return (cache[col]||[]).filter(fn); }

  function insert(col,data){
    const v = VALIDATORS[col] ? validate(col,data) : {...data};
    const id = _nid(col);
    const rec = auditCreate({...v,id});
    cache[col].push(rec);
    _db.collection(col).add(rec).catch(e=>{
      cache[col] = cache[col].filter(r=>r.id!==id);
      toast('خطأ في الحفظ: '+e.message,'error');
      _refresh();
    });
    return rec;
  }

  function update(col,id,patch){
    const idx = (cache[col]||[]).findIndex(r=>r.id===id);
    if(idx<0){ toast('السجل غير موجود','error'); return null; }
    const old = cache[col][idx];
    const v   = VALIDATORS[col] ? validate(col,{...old,...patch}) : {...old,...patch};
    const upd = auditUpdate(old,v);
    cache[col][idx]=upd;
    if(old._fbId) _db.collection(col).doc(old._fbId).set(upd).catch(e=>{
      cache[col][idx]=old;
      toast('خطأ في التعديل: '+e.message,'error');
      _refresh();
    });
    return upd;
  }

  function remove(col,id){
    const idx = (cache[col]||[]).findIndex(r=>r.id===id);
    if(idx<0) return;
    const old = cache[col][idx];
    cache[col].splice(idx,1);
    if(old._fbId) _db.collection(col).doc(old._fbId).delete().catch(e=>{
      cache[col].splice(idx,0,old);
      toast('خطأ في الحذف: '+e.message,'error');
      _refresh();
    });
  }

  function getCompany(){ return _co; }
  function setCompany(d){
    _co={..._co,...d};
    _db.collection('_cfg').doc('company').set(_co).catch(e=>toast('خطأ: '+e.message,'error'));
  }

  function exportJSON(){
    return JSON.stringify({...Object.fromEntries(COLLECTIONS.map(c=>[c,cache[c]])),company:_co,_meta:{version:SCHEMA_VERSION,exportedAt:Date.now()}},null,2);
  }

  async function importJSON(json){
    const parsed = JSON.parse(json);
    toast('⏳ جاري الاستيراد إلى Firebase...','info');
    for(const col of COLLECTIONS){
      if(!parsed[col]?.length) continue;
      const snap = await _db.collection(col).get();
      const delB = _db.batch();
      snap.docs.forEach(d=>delB.delete(d.ref));
      await delB.commit();
      const items = parsed[col];
      for(let i=0;i<items.length;i+=400){
        const addB = _db.batch();
        items.slice(i,i+400).forEach(item=>addB.set(_db.collection(col).doc(),item));
        await addB.commit();
      }
    }
    if(parsed.company) await _db.collection('_cfg').doc('company').set(parsed.company);
    toast('✅ تم الاستيراد إلى Firebase');
  }

  function _seed(){
    [{name:'الشيخ',openingBalance:450000,phone:'',notes:'',prices:[{material:'تربة زلطية',price:135,from:'2026-01-01'}]},{name:'طيبة (مشروع الخيول)',openingBalance:247200,phone:'',notes:'',prices:[{material:'تربة زلطية',price:135,from:'2026-01-01'}]},{name:'إيماك',openingBalance:130000,phone:'',notes:'',prices:[{material:'نقل مخلفات',price:100,from:'2026-01-01'}]},{name:'طيبة (بن زايد الجنوبي)',openingBalance:0,phone:'',notes:'',prices:[]},{name:'شركة ريال (موقع 400)',openingBalance:0,phone:'',notes:'',prices:[]},{name:'الشروق',openingBalance:0,phone:'',notes:'',prices:[]}].forEach(c=>insert('customers',c));
    [{name:'أيمن',openingBalance:-500000,phone:'',notes:'',prices:[{material:'تربة زلطية',price:100,from:'2026-01-01'}]},{name:'أحمد الربيعي',openingBalance:-200000,phone:'',notes:'',prices:[{material:'رملة',price:65,from:'2026-01-01'}]},{name:'نادر',openingBalance:2000,phone:'',notes:'',prices:[]},{name:'تامر السيد',openingBalance:0,phone:'',notes:'',prices:[]},{name:'تبع نادر',openingBalance:0,phone:'',notes:'',prices:[]},{name:'أحمد الفيومي',openingBalance:0,phone:'',notes:'',prices:[]},{name:'أبو عمار',openingBalance:0,phone:'',notes:'',prices:[]},{name:'محمد الجرف',openingBalance:0,phone:'',notes:'',prices:[]},{name:'شديد',openingBalance:0,phone:'',notes:'',prices:[]},{name:'خالد جمعة',openingBalance:0,phone:'',notes:'',prices:[]}].forEach(s=>insert('suppliers',s));
    [{name:'تربة زلطية',defaultSellPrice:135,defaultBuyPrice:100,unit:'م³'},{name:'رملة',defaultSellPrice:95,defaultBuyPrice:65,unit:'م³'},{name:'نقل مخلفات',defaultSellPrice:100,defaultBuyPrice:90,unit:'م³'},{name:'توريد زلط',defaultSellPrice:350,defaultBuyPrice:330,unit:'م³'}].forEach(m=>insert('materials',m));
    [{code:'1001',name:'الصندوق',type:'أصول',openingBalance:0},{code:'1002',name:'البنك',type:'أصول',openingBalance:0},{code:'1003',name:'أوراق قبض',type:'أصول',openingBalance:0},{code:'1010',name:'ذمم العملاء',type:'أصول',openingBalance:827200},{code:'2001',name:'ذمم الموردين',type:'خصوم',openingBalance:698000},{code:'2002',name:'أوراق دفع',type:'خصوم',openingBalance:0},{code:'3001',name:'حسابات الشركاء',type:'حقوق ملكية',openingBalance:0},{code:'4000',name:'الإيرادات',type:'إيرادات',openingBalance:0},{code:'5000',name:'تكلفة المبيعات',type:'مصروفات',openingBalance:0},{code:'5010',name:'عمولات الشركاء',type:'مصروفات',openingBalance:0}].forEach(a=>insert('accounts',a));
  }

  init();
  return {getAll,getById,getWhere,insert,update,remove,getCompany,setCompany,exportJSON,importJSON,save:()=>{},nextId:_nid,exportData:exportJSON,importData:importJSON};
}

// ════════════════════════════════════════════════════
// FIREBASE LOGIN SCREEN
// ════════════════════════════════════════════════════
function showFBLogin(){
  openModal('🔐 تسجيل الدخول',
    '<div style="text-align:center;padding:10px 0 14px"><div style="font-size:40px">🚛</div><p style="color:#64748b;font-size:12px;margin-top:6px">سجّل دخولك للوصول إلى بياناتك</p></div>'+
    '<div class="form-group mb10"><label>البريد الإلكتروني</label><input type="email" id="fb-email" dir="ltr" placeholder="admin@example.com" onkeydown="if(event.key===\'Enter\')doFBLogin()"></div>'+
    '<div class="form-group mb10"><label>كلمة المرور</label><input type="password" id="fb-pass" dir="ltr" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')doFBLogin()"></div>'+
    '<div id="fb-login-err" class="alert alert-red" style="display:none"></div>',
    '<button class="btn btn-primary" onclick="doFBLogin()" style="width:100%;justify-content:center">🔐 دخول</button>',
    'modal-sm');
  document.getElementById('modal-overlay').onclick = null;
}

function doFBLogin(){
  const email = document.getElementById('fb-email')?.value?.trim();
  const pass  = document.getElementById('fb-pass')?.value;
  const err   = document.getElementById('fb-login-err');
  if(!email||!pass){ if(err){err.style.display='flex';err.innerHTML='<span>⚠️</span><span>أدخل البريد وكلمة المرور</span>';} return; }
  firebase.auth().signInWithEmailAndPassword(email,pass)
    .then(()=>{
      localStorage.setItem(FB_USER_KEY,JSON.stringify({e:email,p:pass}));
      closeModal();
      document.getElementById('modal-overlay').onclick = closeModalOnBg;
      toast('✅ تم تسجيل الدخول');
    })
    .catch(e=>{
      const msgs={'auth/user-not-found':'البريد غير مسجّل','auth/wrong-password':'كلمة المرور خاطئة','auth/invalid-email':'بريد غير صالح','auth/too-many-requests':'محاولات كثيرة — انتظر'};
      if(err){err.style.display='flex';err.innerHTML='<span>❌</span><span>'+(msgs[e.code]||e.message)+'</span>';}
    });
}

function doFBLogout(){
  if(!confirm('تسجيل الخروج؟')) return;
  clearFBConfig();
  toast('تم قطع الاتصال — إعادة تحميل...');
  setTimeout(()=>location.reload(),1000);
}

// ════════════════════════════════════════════════════
// FIREBASE SETUP SECTION (inside renderCompany)
// ════════════════════════════════════════════════════
function renderFBSetup(){
  const cfg = getFBConfig();
  const ok  = !!(cfg?.apiKey);

  if(ok) return '<div class="card" style="border:2px solid #10b981">'+
    '<div class="flex-between mb10"><div class="section-title" style="margin:0">☁️ Firebase متصل</div><span class="badge badge-green">✅ مُفعَّل</span></div>'+
    '<div class="alert alert-green mb10" style="font-size:10px"><span>✅</span><div>المشروع: <strong>'+cfg.projectId+'</strong> — البيانات تُحفظ في السحابة تلقائياً</div></div>'+
    '<div class="flex-wrap" style="gap:8px">'+
    '<button class="btn btn-primary btn-sm" onclick="migrateLocalToFB()">📤 نقل البيانات المحلية → Firebase</button>'+
    '<button class="btn btn-red btn-sm" onclick="doFBLogout()">❌ قطع الاتصال وتسجيل الخروج</button>'+
    '</div></div>';

  const steps = [
    ['1','اذهب إلى','<a href="https://console.firebase.google.com" target="_blank" style="color:#2563eb;font-weight:600">console.firebase.google.com</a> → New Project (مجاني)'],
    ['2','Firestore','Build → Firestore Database → Create → Start in test mode'],
    ['3','Auth','Build → Authentication → Sign-in method → Email/Password → Enable'],
    ['4','مستخدم','Build → Authentication → Users → Add user (بريدك + كلمة مرور)'],
    ['5','Config','Project Settings ⚙️ → Your apps → Web app ↔ → انسخ الـ config'],
    ['6','لصق','الصق القيم في الحقول أدناه واضغط اتصل'],
  ];

  return '<div class="card" style="border:2px solid #f59e0b">'+
    '<div class="flex-between mb10"><div class="section-title" style="margin:0">☁️ الاتصال بـ Firebase</div><span class="badge badge-yellow">⚠️ غير مُفعَّل</span></div>'+
    '<div style="background:#fefce8;border-radius:7px;padding:10px;margin-bottom:12px">'+
    '<p style="font-size:10px;font-weight:700;color:#92400e;margin-bottom:8px">📋 خطوات الإعداد (5 دقائق)</p>'+
    steps.map(([n,t,d])=>'<div style="display:flex;gap:7px;margin-bottom:5px;align-items:flex-start"><span style="background:#1F4E78;color:#fff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">'+n+'</span><div style="font-size:10px"><strong>'+t+':</strong> '+d+'</div></div>').join('')+
    '</div>'+
    '<div class="form-row fr2 mb8"><div class="form-group"><label>API Key</label><input id="fb-apiKey" dir="ltr" placeholder="AIzaSy..." style="font-size:11px"></div>'+
    '<div class="form-group"><label>Project ID</label><input id="fb-projectId" dir="ltr" placeholder="my-project-123" style="font-size:11px"></div></div>'+
    '<div class="form-row fr2 mb8"><div class="form-group"><label>Auth Domain</label><input id="fb-authDomain" dir="ltr" placeholder="project.firebaseapp.com" style="font-size:11px"></div>'+
    '<div class="form-group"><label>Storage Bucket</label><input id="fb-storageBucket" dir="ltr" placeholder="project.appspot.com" style="font-size:11px"></div></div>'+
    '<div class="form-row fr2 mb12"><div class="form-group"><label>Messaging Sender ID</label><input id="fb-senderId" dir="ltr" placeholder="123456789" style="font-size:11px"></div>'+
    '<div class="form-group"><label>App ID</label><input id="fb-appId" dir="ltr" placeholder="1:123:web:abc" style="font-size:11px"></div></div>'+
    '<button class="btn btn-primary" onclick="saveFBSetup()" style="width:100%;justify-content:center">☁️ اتصل بـ Firebase الآن</button>'+
    '<div class="alert alert-blue mt10" style="font-size:10px"><span>🔒</span><div>قواعد Firestore المطلوبة: اذهب إلى Firestore → Rules وضع:<br>'+
    '<code style="background:#e0e7ff;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:9px;direction:ltr;display:inline-block;margin-top:4px">allow read, write: if request.auth != null;</code></div></div>'+
    '</div>';
}

function saveFBSetup(){
  const cfg = {
    apiKey:            document.getElementById('fb-apiKey')?.value?.trim(),
    projectId:         document.getElementById('fb-projectId')?.value?.trim(),
    authDomain:        document.getElementById('fb-authDomain')?.value?.trim(),
    storageBucket:     document.getElementById('fb-storageBucket')?.value?.trim(),
    messagingSenderId: document.getElementById('fb-senderId')?.value?.trim(),
    appId:             document.getElementById('fb-appId')?.value?.trim(),
  };
  if(!cfg.apiKey||!cfg.projectId) return toast('أدخل API Key و Project ID على الأقل','error');
  saveFBConfig(cfg);
  toast('✅ تم حفظ الإعدادات — جاري إعادة التحميل...');
  setTimeout(()=>location.reload(),1200);
}

async function migrateLocalToFB(){
  if(!confirm('نقل كل البيانات المحلية إلى Firebase؟\nسيتم استبدال البيانات الموجودة في Firebase.')) return;
  const local = localStorage.getItem('hana_v4');
  if(!local||local.length<50) return toast('لا توجد بيانات محلية للنقل','error');
  try{
    await DB.importJSON(local);
    toast('✅ تم نقل كل البيانات إلى Firebase بنجاح');
    nav('dashboard');
  }catch(e){ toast('خطأ في النقل: '+e.message,'error'); }
}

// ════════════════════════════════════════════════════
// DB FACTORY — ONE LINE TO SWITCH