// ═══ EXPENSES, SALARIES & AUTO-JOURNAL ═══════════════════════════
// كل عملية مالية تُقيَّد تلقائياً في دفتر اليومية

// ── Auto Journal Helper ───────────────────────────────────────────
function autoJrnEntry({date, desc, amount, debitCode, debitName, creditCode, creditName, entryType, ref}){
  if(!amount || amount<=0) return null;
  const n = Number(amount);
  const entry = DB.insert('journal',{
    date:         date||todayStr(),
    description:  desc,
    entryType:    entryType||'مصروف',
    // حقل amount للعرض في جدول اليومية
    amount:       n,
    // حقول القيد المزدوج
    debitAmount:  n,
    creditAmount: n,
    debitCode,  debitName,
    creditCode, creditName,
    debitAccount:  debitCode+' '+debitName,
    creditAccount: creditCode+' '+creditName,
    reference:    ref||'',
    party:        desc,
    paymentType:  'نقدي',
    _auto:        true,
  });
  return entry;
}

// Payment type → credit account
function payAcct(pt){
  if(!pt||pt==='نقدي'||pt==='كاش') return {code:'1001',name:'الصندوق'};
  if(pt==='شيك آجل'||pt==='شيك فوري') return {code:'1002',name:'البنك'};
  return {code:'1002',name:'البنك'};
}

// ── Main Render ───────────────────────────────────────────────────
function renderExpenses(){
  const tab = window._EXP_TAB||'expenses';
  return `<div>
    <div class="page-header">
      <div class="section-title" style="margin:0">💸 المصروفات والرواتب</div>
    </div>
    <!-- Tabs -->
    <div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:16px">
      ${[['expenses','💸 المصروفات'],['salaries','👷 الرواتب والأجور'],['partners','🤝 مستحقات الشركاء'],['partner-report','📊 تقارير الشركاء']].map(([k,l])=>`
        <button onclick="window._EXP_TAB='${k}';nav('expenses')" style="
          padding:10px 18px;border:none;background:none;cursor:pointer;
          font-family:inherit;font-size:12px;font-weight:600;
          color:${tab===k?'#1F4E78':'#64748b'};
          border-bottom:${tab===k?'3px solid #1F4E78':'3px solid transparent'};
          margin-bottom:-2px">${l}</button>`).join('')}
    </div>
    <div id="exp-tab-content">
      ${tab==='expenses' ? renderExpTab() : tab==='salaries' ? renderSalTab() : tab==='partner-report' ? renderPartnerReport() : renderPartnersTab()}
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// TAB 1: المصروفات
// ════════════════════════════════════════════════════════════════
// EXP_CATS defined in config.js

function renderExpTab(){
  const recs = DB.getAll('expenses').sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total = recs.reduce((s,r)=>s+(Number(r.amount)||0),0);
  return `<div>
    <div class="flex-between mb12">
      <div class="kpi-card card-sm" style="border-top:3px solid #dc2626;min-width:160px;text-align:center">
        <div class="text-xs text-gray">إجمالي المصروفات</div>
        <div style="font-size:18px;font-weight:700;color:#dc2626">${curr(total)}</div>
      </div>
      <button class="btn btn-primary" onclick="openExpModal()">＋ مصروف جديد</button>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>التاريخ</th><th>الفئة</th><th>البيان</th><th>المبلغ</th>
        <th>طريقة الدفع</th><th>قيد اليومية</th><th>إجراء</th>
      </tr></thead>
      <tbody>
      ${recs.length===0
        ?'<tr><td colspan="7" class="tbl-empty"><span class="tbl-empty-icon">💸</span>لا توجد مصروفات</td></tr>'
        :recs.map(r=>`<tr>
          <td class="text-xs">${fmtDate(r.date)}</td>
          <td>${badge(r.category||'—','gray')}</td>
          <td class="text-xs">${r.description||'—'}</td>
          <td class="font-bold text-red">${curr(r.amount)}</td>
          <td class="text-xs">${r.payType||'نقدي'}</td>
          <td>${r._jrnId?badge('✓ مقيّد','green'):badge('غير مقيّد','gray')}</td>
          <td><div class="flex" style="gap:4px">
            <button class="btn btn-xs" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:inherit" onclick="openExpModal(${r.id})">تعديل</button>
            <button class="btn btn-xs" style="background:#dc2626;color:#fff;border:none;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:inherit" onclick="deleteExp(${r.id})">🗑️</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function openExpModal(editId){
  const r = editId?DB.getById('expenses',editId):null;
  const body=`<div class="form-row fr2">
    <div class="form-group"><label><span class="req">*</span> التاريخ</label>
      <input type="date" id="ex-date" value="${r?.date||todayStr()}"></div>
    <div class="form-group"><label><span class="req">*</span> الفئة</label>
      <select id="ex-cat">
        ${EXP_CATS.map(c=>`<option${c===(r?.category||'')?' selected':''}>${c}</option>`).join('')}
      </select></div>
  </div>
  <div class="form-row fr2">
    <div class="form-group"><label><span class="req">*</span> المبلغ</label>
      <input type="number" id="ex-amt" min="0" step="0.01" value="${r?.amount||''}"></div>
    <div class="form-group"><label>طريقة الدفع</label>
      <select id="ex-pay">
        ${['نقدي','بنك','شيك آجل','شيك فوري'].map(p=>`<option${p===(r?.payType||'نقدي')?' selected':''}>${p}</option>`).join('')}
      </select></div>
  </div>
  <div class="form-group"><label>البيان / الملاحظات</label>
    <input id="ex-desc" value="${r?.description||''}"></div>
  <div class="form-row fr2">
    <div class="form-group"><label>السيارة (اختياري)</label>
      <select id="ex-truck">
        <option value="">— عام —</option>
        ${DB.getAll('trucks').map(t=>`<option value="${t.plateNo}"${t.plateNo===(r?.truck||'')?' selected':''}>${t.plateNo}</option>`).join('')}
      </select></div>
    <div class="form-group"><label>المورد / الجهة (اختياري)</label>
      <input id="ex-vendor" value="${r?.vendor||''}"></div>
  </div>
  <div class="alert alert-blue mt8" style="font-size:11px">
    <span>ℹ️</span><span>سيُقيَّد هذا المصروف تلقائياً في دفتر اليومية عند الحفظ</span>
  </div>`;
  openModal(editId?'تعديل مصروف':'مصروف جديد', body,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" data-eid="${editId||''}" onclick="saveExp(this.dataset.eid?Number(this.dataset.eid):null)">💾 حفظ وتقييد</button>`,
    'modal-md');
}

function saveExp(editId){
  const date=document.getElementById('ex-date')?.value||todayStr();
  const cat =document.getElementById('ex-cat')?.value;
  const amt =Number(document.getElementById('ex-amt')?.value);
  const pay =document.getElementById('ex-pay')?.value||'نقدي';
  const desc=document.getElementById('ex-desc')?.value||'';
  const truck=document.getElementById('ex-truck')?.value||'';
  const vendor=document.getElementById('ex-vendor')?.value||'';
  if(!cat)  return toast('اختر الفئة','error');
  if(!amt)  return toast('أدخل المبلغ','error');

  // Determine expense account
  const expAcct = cat==='وقود'?{code:'5020',name:'مصروف وقود'}
    : cat==='رواتب وأجور'?{code:'5010',name:'مصروف رواتب وأجور'}
    : cat==='صيانة وإصلاح'?{code:'5030',name:'مصروف صيانة'}
    : {code:'5000',name:'مصروف '+cat};
  const payA = payAcct(pay);
  const fullDesc = cat+(truck?' — '+truck:'')+(vendor?' — '+vendor:'')+(desc?' — '+desc:'');

  let jrnId = null;
  if(!editId){
    // Auto-create journal entry
    const jrn = autoJrnEntry({
      date, desc:fullDesc, amount:amt,
      debitCode:expAcct.code, debitName:expAcct.name,
      creditCode:payA.code,   creditName:payA.name,
      entryType:'مصروف', ref:'exp-auto',
    });
    jrnId = jrn?.id;
  }

  const data={date,category:cat,amount:amt,payType:pay,description:desc,truck,vendor,_jrnId:jrnId||undefined};
  if(editId) DB.update('expenses',editId,data);
  else       DB.insert('expenses',data);
  toast('✅ تم الحفظ والتقييد في اليومية');
  closeModal();
  window._EXP_TAB='expenses';
  nav('expenses');
}

function deleteExp(id){
  if(!confirm('حذف هذا المصروف؟')) return;
  DB.remove('expenses',id);
  toast('تم الحذف');
}

// ════════════════════════════════════════════════════════════════
// TAB 2: الرواتب والأجور
// ════════════════════════════════════════════════════════════════
function renderSalTab(){
  const recs=DB.getAll('expenses').filter(r=>r.category==='رواتب وأجور')
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total=recs.reduce((s,r)=>s+(Number(r.amount)||0),0);
  return `<div>
    <div class="flex-between mb12">
      <div class="kpi-card card-sm" style="border-top:3px solid #7c3aed;min-width:160px;text-align:center">
        <div class="text-xs text-gray">إجمالي الرواتب المصروفة</div>
        <div style="font-size:18px;font-weight:700;color:#7c3aed">${curr(total)}</div>
      </div>
      <button class="btn btn-primary" onclick="openSalModal()">＋ صرف راتب / أجر</button>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>التاريخ</th><th>الموظف/السائق</th><th>البيان</th><th>المبلغ</th><th>طريقة الدفع</th><th>قيد اليومية</th><th>إجراء</th></tr></thead>
      <tbody>
      ${recs.length===0
        ?'<tr><td colspan="7" class="tbl-empty"><span class="tbl-empty-icon">👷</span>لا توجد رواتب مصروفة</td></tr>'
        :recs.map(r=>`<tr>
          <td class="text-xs">${fmtDate(r.date)}</td>
          <td><strong>${r.vendor||r.truck||'—'}</strong></td>
          <td class="text-xs">${r.description||'—'}</td>
          <td class="font-bold" style="color:#7c3aed">${curr(r.amount)}</td>
          <td class="text-xs">${r.payType||'نقدي'}</td>
          <td>${r._jrnId?badge('✓ مقيّد','green'):badge('غير مقيّد','gray')}</td>
          <td><button class="btn btn-xs" style="background:#dc2626;color:#fff;border:none;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:inherit" onclick="deleteExp(${r.id})">🗑️</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function openSalModal(){
  const body=`<div class="form-row fr2">
    <div class="form-group"><label><span class="req">*</span> التاريخ</label>
      <input type="date" id="sl-date" value="${todayStr()}"></div>
    <div class="form-group"><label><span class="req">*</span> اسم الموظف / السائق</label>
      <input id="sl-name" placeholder="مثال: محمد السائق"></div>
  </div>
  <div class="form-row fr2">
    <div class="form-group"><label><span class="req">*</span> المبلغ</label>
      <input type="number" id="sl-amt" min="0" step="0.01"></div>
    <div class="form-group"><label>طريقة الدفع</label>
      <select id="sl-pay">
        ${['نقدي','بنك','شيك آجل'].map(p=>`<option>${p}</option>`).join('')}
      </select></div>
  </div>
  <div class="form-group"><label>البيان (شهر الراتب / نوع الأجر)</label>
    <input id="sl-desc" placeholder="مثال: راتب مايو 2026 — سائق"></div>
  <div class="alert alert-blue mt8" style="font-size:11px">
    <span>ℹ️</span><span>سيُقيَّد تلقائياً: مدين مصروف رواتب ← دائن الصندوق/البنك</span>
  </div>`;
  openModal('صرف راتب / أجر', body,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" onclick="saveSal()">💾 صرف وتقييد</button>`,
    'modal-md');
}

function saveSal(){
  const date=document.getElementById('sl-date')?.value||todayStr();
  const name=document.getElementById('sl-name')?.value?.trim();
  const amt =Number(document.getElementById('sl-amt')?.value);
  const pay =document.getElementById('sl-pay')?.value||'نقدي';
  const desc=document.getElementById('sl-desc')?.value||'';
  if(!name) return toast('أدخل اسم الموظف','error');
  if(!amt)  return toast('أدخل المبلغ','error');
  const payA = payAcct(pay);
  const fullDesc='راتب/أجر — '+name+(desc?' — '+desc:'');
  const jrn=autoJrnEntry({
    date, desc:fullDesc, amount:amt,
    debitCode:'5010', debitName:'مصروف رواتب وأجور',
    creditCode:payA.code, creditName:payA.name,
    entryType:'راتب',
  });
  DB.insert('expenses',{date,category:'رواتب وأجور',amount:amt,payType:pay,description:desc,vendor:name,_jrnId:jrn?.id});
  toast('✅ تم صرف الراتب وتقييده في اليومية');
  closeModal();
  window._EXP_TAB='salaries';
  nav('expenses');
}

// ════════════════════════════════════════════════════════════════
// TAB 3: مستحقات الشركاء
// ════════════════════════════════════════════════════════════════
function renderPartnersTab(){
  const partners = DB.getAll('partners');
  if(!partners.length) return `<div class="card" style="text-align:center;padding:40px;color:#94a3b8">
    <div style="font-size:40px">🤝</div>
    <p class="mt8 font-bold">لا يوجد شركاء</p>
    <p class="text-xs mt4">أضف الشركاء أولاً من صفحة الشركاء</p>
    <button class="btn btn-primary mt12" onclick="nav('partners')">الذهاب لصفحة الشركاء</button>
  </div>`;

  // ── الحساب الصحيح: م³ صافي × سعر المتر للشريك لكل خامة ──
  const approvedSarkis = DB.getAll('sarkis').filter(s=>s.status!=='ملغي');
  const allPayments    = DB.getAll('expenses').filter(r=>r.category==='مستحق شريك');

  const partnerData = partners.map(p=>{
    const rates = p.rates || []; // [{material, pricePerCubic}]
    
    // حساب المستحق: لكل حافظة معتمدة
    let due = 0;
    const details = []; // تفاصيل لكل خامة

    rates.forEach(rate=>{
      if(!rate.material || !rate.pricePerCubic) return;
      let netM3 = 0;
      approvedSarkis.forEach(sk=>{
        if(sk.material !== rate.material) return;
        // م³ صافي من كل السطور
        (sk.lines||[]).forEach(ln=>{
          netM3 += Number(ln.netSell || ln.netCubic) || 0;
        });
      });
      const subtotal = netM3 * Number(rate.pricePerCubic);
      if(netM3 > 0){
        details.push({mat:rate.material, m3:netM3, price:rate.pricePerCubic, sub:subtotal});
        due += subtotal;
      }
    });

    const paid       = allPayments.filter(r=>r.vendor===p.name).reduce((t,r)=>t+(Number(r.amount)||0),0);
    const manualAdj  = getPartnerManualBalance(p.name); // قيود يدوية: + إضافة / - صرف
    const remaining  = due - paid + manualAdj;
    return {p, rates, due, paid, manualAdj, remaining, details};
  });

  const totalDue  = partnerData.reduce((t,d)=>t+d.due, 0);
  const totalPaid = partnerData.reduce((t,d)=>t+d.paid, 0);

  return `<div>
    <div class="alert alert-blue mb12" style="font-size:11px">
      <span>📊</span>
      <div>
        إجمالي المستحقات: <strong>${curr(totalDue)}</strong> — 
        المدفوع: <strong class="text-green">${curr(totalPaid)}</strong> — 
        المتبقي: <strong class="text-red">${curr(totalDue-totalPaid)}</strong>
      </div>
    </div>
    <div style="display:grid;gap:12px">
    ${partnerData.map(({p,rates,due,paid,manualAdj,remaining,details})=>`
      <div class="card" style="border-right:4px solid ${remaining>0?'#d97706':'#16a34a'}">
        <div class="flex-between mb8">
          <div>
            <div style="font-size:14px;font-weight:700">${p.name}</div>
            <div class="text-xs text-gray mt4">
              ${rates.length>0
                ? rates.filter(r=>r.material&&r.pricePerCubic).map(r=>`<span style="background:#f1f5f9;padding:2px 8px;border-radius:10px;margin-left:4px">${r.material}: <strong>${r.pricePerCubic} ج.م/م³</strong></span>`).join('')
                : '<span class="text-gray">لم تُحدَّد أسعار بعد — افتح صفحة الشركاء وأضف الأسعار</span>'}
            </div>
          </div>
          <div style="display:flex;gap:16px;align-items:center">
            <div style="text-align:center">
              <div class="text-xs text-gray">المستحق</div>
              <div style="font-size:16px;font-weight:700;color:#d97706">${curr(due)}</div>
            </div>
            <div style="text-align:center">
              <div class="text-xs text-gray">المدفوع</div>
              <div style="font-size:16px;font-weight:700;color:#16a34a">${curr(paid)}</div>
            </div>
            <div style="text-align:center">
              <div class="text-xs text-gray">المتبقي</div>
              <div style="font-size:16px;font-weight:700;color:${remaining>0?'#dc2626':'#16a34a'}">${curr(remaining)}</div>
              ${manualAdj!==0?`<div class="text-xs" style="color:${manualAdj>0?'#16a34a':'#d97706'}">قيود يدوية: ${manualAdj>0?'+':''}${curr(manualAdj)}</div>`:''}
            </div>
          </div>
        </div>

        <!-- تفاصيل الحساب -->
        ${details.length>0?`
        <div style="background:#f8fafc;border-radius:8px;padding:8px;margin-bottom:10px">
          <table style="width:100%;font-size:10px;border-collapse:collapse">
            <thead><tr style="color:#64748b">
              <th style="padding:3px 6px;text-align:right">الخامة</th>
              <th style="padding:3px 6px;text-align:center">م³ صافي</th>
              <th style="padding:3px 6px;text-align:center">سعر/م³</th>
              <th style="padding:3px 6px;text-align:center">المستحق</th>
            </tr></thead>
            <tbody>
              ${details.map(d=>`<tr style="border-top:1px solid #e2e8f0">
                <td style="padding:3px 6px;font-weight:600">${d.mat}</td>
                <td style="padding:3px 6px;text-align:center">${d.m3.toFixed(1)}</td>
                <td style="padding:3px 6px;text-align:center">${d.price}</td>
                <td style="padding:3px 6px;text-align:center;font-weight:700;color:#d97706">${curr(d.sub)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`:''}

        <!-- شريط التقدم -->
        <div style="background:#e2e8f0;border-radius:8px;height:8px;overflow:hidden;margin-bottom:10px">
          <div style="background:#16a34a;height:100%;width:${Math.min(100,due>0?paid/due*100:0).toFixed(1)}%;transition:width .5s"></div>
        </div>

        <div style="display:flex;gap:6px">
          ${remaining>0
            ?`<button class="btn btn-primary btn-sm" data-pname="${p.name}" data-pamt="${remaining.toFixed(2)}" onclick="openPartnerPayModal(this.dataset.pname,this.dataset.pamt)">💰 صرف مستحقات</button>`
            :`<span class="badge badge-green" style="align-self:center">✅ مسوّى</span>`}
          <button class="btn btn-gray btn-sm" data-pname="${p.name}" onclick="showPartnerHistory(this.dataset.pname)">📋 سجل المدفوعات</button>
        </div>
      </div>
    `).join('')}
    </div>
  </div>`;
}


function openPartnerPayModal(partnerName, remaining){
  const body=`<div class="alert alert-blue mb12" style="font-size:11px">
    <span>🤝</span><span>المتبقي من مستحقات <strong>${partnerName}</strong>: <strong>${curr(remaining)}</strong></span>
  </div>
  <div class="form-row fr2">
    <div class="form-group"><label><span class="req">*</span> التاريخ</label>
      <input type="date" id="pp-date" value="${todayStr()}"></div>
    <div class="form-group"><label><span class="req">*</span> المبلغ المدفوع</label>
      <input type="number" id="pp-amt" min="0" step="0.01" value="${remaining}"></div>
  </div>
  <div class="form-group"><label>طريقة الدفع</label>
    <select id="pp-pay">
      ${['نقدي','بنك','شيك آجل'].map(p=>`<option>${p}</option>`).join('')}
    </select></div>
  <div class="form-group"><label>ملاحظات</label>
    <input id="pp-desc" placeholder="مثال: دفعة على حساب المستحقات"></div>
  <div class="alert alert-yellow mt8" style="font-size:11px">
    <span>⚠️</span><span>سيُقيَّد تلقائياً: مدين حساب الشريك ← دائن الصندوق/البنك</span>
  </div>`;
  openModal('صرف مستحقات الشريك — '+partnerName, body,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" data-pname="${partnerName}" onclick="savePartnerPay(this.dataset.pname)">💾 صرف وتقييد</button>`,
    'modal-md');
}

function savePartnerPay(partnerName){
  const date=document.getElementById('pp-date')?.value||todayStr();
  const amt =Number(document.getElementById('pp-amt')?.value);
  const pay =document.getElementById('pp-pay')?.value||'نقدي';
  const desc=document.getElementById('pp-desc')?.value||'';
  if(!amt) return toast('أدخل المبلغ','error');
  const payA=payAcct(pay);
  const fullDesc='مستحقات الشريك — '+partnerName+(desc?' — '+desc:'');
  const jrn=autoJrnEntry({
    date, desc:fullDesc, amount:amt,
    debitCode:'3001', debitName:'حساب الشريك — '+partnerName,
    creditCode:payA.code, creditName:payA.name,
    entryType:'صرف شريك',
  });
  DB.insert('expenses',{date,category:'مستحق شريك',amount:amt,payType:pay,description:desc||fullDesc,vendor:partnerName,_jrnId:jrn?.id});
  toast('✅ تم الصرف والتقييد في اليومية');
  closeModal();
  window._EXP_TAB='partners';
  nav('expenses');
}

function showPartnerHistory(name){
  const payments=DB.getAll('expenses').filter(r=>r.vendor===name&&r.category==='مستحق شريك')
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total=payments.reduce((t,r)=>t+(Number(r.amount)||0),0);
  openModal('سجل مدفوعات — '+name,
    `<div class="tbl-wrap"><table>
      <thead><tr><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th><th>ملاحظات</th></tr></thead>
      <tbody>
      ${payments.length===0
        ?'<tr><td colspan="4" class="tbl-empty">لا توجد مدفوعات</td></tr>'
        :payments.map(r=>`<tr>
          <td class="text-xs">${fmtDate(r.date)}</td>
          <td class="font-bold text-green">${curr(r.amount)}</td>
          <td class="text-xs">${r.payType||'نقدي'}</td>
          <td class="text-xs">${r.description||'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
    ${payments.length?`<div class="flex-between mt10 card-sm"><span>الإجمالي المدفوع</span><strong class="text-green">${curr(total)}</strong></div>`:''}`,
    '<button class="btn btn-gray" onclick="closeModal()">إغلاق</button>',
    'modal-md');
}


// ══ تقارير الشركاء ════════════════════════════════════════════════
window._PR = {from:'', to:'', partner:'', view:'summary'}; // state

function renderPartnerReport(){
  const partners = DB.getAll('partners');
  const st = window._PR;

  const partnerOpts = ['<option value="">— كل الشركاء —</option>']
    .concat(partners.map(p=>`<option value="${p.name}" ${p.name===st.partner?'selected':''}>${p.name}</option>`))
    .join('');

  // ── Collect data ──────────────────────────────────────────────
  const approvedSarkis = DB.getAll('sarkis').filter(sk=>{
    if(sk.status==='ملغي') return false;
    if(st.from && sk.date < st.from) return false;
    if(st.to   && sk.date > st.to)   return false;
    return true;
  });

  // Build per-partner per-material data
  const reportData = partners
    .filter(p => !st.partner || p.name===st.partner)
    .map(p=>{
      const rates = p.rates||[];
      const materials = [...new Set(rates.map(r=>r.material).filter(Boolean))];
      
      const matDetails = materials.map(mat=>{
        const rate = rates.find(r=>r.material===mat);
        const price = Number(rate?.pricePerCubic)||0;

        // Per-sarki lines for this material
        const lines = [];
        approvedSarkis.forEach(sk=>{
          if(sk.material !== mat) return;
          (sk.lines||[]).forEach(ln=>{
            const net = Number(ln.netSell||ln.netCubic)||0;
            if(!net) return;
            lines.push({
              date: sk.date,
              skId: sk.id,
              client: sk.client,
              plateNo: ln.plateNo||'',
              trips: Number(ln.trips)||0,
              netM3: net,
              price,
              amount: net * price,
            });
          });
        });

        const totM3     = lines.reduce((s,l)=>s+l.netM3, 0);
        const totAmount = lines.reduce((s,l)=>s+l.amount, 0);
        return {mat, price, lines, totM3, totAmount};
      }).filter(m=>m.totM3>0);

      const totalM3     = matDetails.reduce((s,m)=>s+m.totM3, 0);
      const totalAmount = matDetails.reduce((s,m)=>s+m.totAmount, 0);

      // Payments made
      const paid = DB.getAll('expenses')
        .filter(r=>r.category==='مستحق شريك'&&r.vendor===p.name)
        .reduce((s,r)=>s+(Number(r.amount)||0), 0);
      const manualAdj = getPartnerManualBalance(p.name);
      const remaining = totalAmount - paid + manualAdj;

      return {p, matDetails, totalM3, totalAmount, paid, manualAdj, remaining};
    }).filter(d=>d.totalM3>0||d.totalAmount>0);

  const grandM3     = reportData.reduce((s,d)=>s+d.totalM3, 0);
  const grandAmount = reportData.reduce((s,d)=>s+d.totalAmount, 0);
  const grandPaid   = reportData.reduce((s,d)=>s+d.paid, 0);
  const grandRem    = reportData.reduce((s,d)=>s+d.remaining, 0);

  // ── Render ────────────────────────────────────────────────────
  return `<div>
    <!-- Filters -->
    <div class="card mb12" style="padding:10px 14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="margin:0;min-width:160px">
          <label style="font-size:10px">الشريك</label>
          <select onchange="window._PR.partner=this.value;nav('expenses')" style="width:100%">${partnerOpts}</select>
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">من</label>
          <input type="date" value="${st.from}" onchange="window._PR.from=this.value;nav('expenses')">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">إلى</label>
          <input type="date" value="${st.to}" onchange="window._PR.to=this.value;nav('expenses')">
        </div>
        <div style="display:flex;gap:4px;align-self:flex-end">
          <button class="btn btn-sm ${st.view==='summary'?'btn-primary':'btn-gray'}"
            onclick="window._PR.view='summary';nav('expenses')">📋 ملخص</button>
          <button class="btn btn-sm ${st.view==='detail'?'btn-primary':'btn-gray'}"
            onclick="window._PR.view='detail';nav('expenses')">🔍 تفصيلي</button>
          <button class="btn btn-gray btn-sm" onclick="window._PR.from='';window._PR.to='';window._PR.partner='';nav('expenses')">✕ مسح</button>
          <button class="btn btn-gray btn-sm" onclick="printPartnerReport()">🖨️ PDF</button>
          <button class="btn btn-gray btn-sm" onclick="exportPartnerReportExcel()">📊 Excel</button>
        </div>
      </div>
    </div>

    <!-- KPI bar -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      ${[
        ['إجمالي م³','💧',grandM3.toFixed(1),'#1d4ed8'],
        ['إجمالي المستحق','💰',curr(grandAmount),'#d97706'],
        ['إجمالي المدفوع','✅',curr(grandPaid),'#16a34a'],
        ['إجمالي المتبقي','⚠️',curr(grandRem),grandRem>0?'#dc2626':'#16a34a'],
      ].map(([lbl,ic,val,col])=>`
        <div class="card" style="padding:12px;text-align:center;border-top:3px solid ${col}">
          <div style="font-size:20px">${ic}</div>
          <div class="text-xs text-gray mt4">${lbl}</div>
          <div style="font-size:14px;font-weight:700;color:${col};margin-top:4px">${val}</div>
        </div>`).join('')}
    </div>

    <!-- Report -->
    <div id="partner-report-content">
    ${reportData.length===0
      ? `<div class="card" style="text-align:center;padding:40px">
           <div style="font-size:36px">📭</div>
           <p class="text-gray mt8">لا توجد بيانات للفترة المحددة</p>
         </div>`
      : reportData.map(({p,matDetails,totalM3,totalAmount,paid,manualAdj,remaining})=>`
        <div class="card mb12">
          <div class="flex-between mb8">
            <div>
              <div style="font-size:16px;font-weight:700">🤝 ${p.name}</div>
              <div class="text-xs text-gray mt4">
                ${st.from||'البداية'} → ${st.to||'اليوم'}
              </div>
            </div>
            <div style="display:flex;gap:20px">
              <div style="text-align:center">
                <div class="text-xs text-gray">م³ إجمالي</div>
                <div style="font-size:18px;font-weight:700;color:#1d4ed8">${totalM3.toFixed(1)}</div>
              </div>
              <div style="text-align:center">
                <div class="text-xs text-gray">المستحق</div>
                <div style="font-size:18px;font-weight:700;color:#d97706">${curr(totalAmount)}</div>
              </div>
              <div style="text-align:center">
                <div class="text-xs text-gray">المدفوع</div>
                <div style="font-size:18px;font-weight:700;color:#16a34a">${curr(paid)}</div>
              </div>
              <div style="text-align:center">
                <div class="text-xs text-gray">المتبقي</div>
                <div style="font-size:18px;font-weight:700;color:${remaining>0?'#dc2626':'#16a34a'}">${curr(remaining)}</div>
              </div>
            </div>
          </div>

          ${matDetails.map(({mat,price,lines,totM3,totAmount})=>`
            <div style="background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:8px">
              <div class="flex-between mb6">
                <div style="font-weight:700;color:#374151">📦 ${mat}</div>
                <div style="font-size:11px;color:#64748b">
                  سعر المتر: <strong>${price} ج.م</strong> |
                  م³ صافي: <strong style="color:#1d4ed8">${totM3.toFixed(1)}</strong> |
                  المستحق: <strong style="color:#d97706">${curr(totAmount)}</strong>
                </div>
              </div>
              ${st.view==='detail'?`
              <div class="tbl-wrap">
                <table style="font-size:10px">
                  <thead><tr style="background:#e2e8f0">
                    <th>التاريخ</th><th>حافظة</th><th>العميل</th><th>السيارة</th><th>نقلات</th><th>م³ صافي</th><th>سعر/م³</th><th>المستحق</th>
                  </tr></thead>
                  <tbody>
                    ${lines.sort((a,b)=>a.date.localeCompare(b.date)).map(l=>`
                      <tr>
                        <td>${fmtDate(l.date)}</td>
                        <td>#${l.skId}</td>
                        <td>${l.client}</td>
                        <td class="text-xs" dir="ltr">${l.plateNo}</td>
                        <td style="text-align:center">${l.trips}</td>
                        <td style="text-align:center;font-weight:700;color:#1d4ed8">${l.netM3.toFixed(1)}</td>
                        <td style="text-align:center">${l.price}</td>
                        <td style="text-align:center;font-weight:700;color:#d97706">${curr(l.amount)}</td>
                      </tr>`).join('')}
                    <tr style="background:#FFE699;font-weight:700">
                      <td colspan="4">الإجمالي</td>
                      <td style="text-align:center">${lines.reduce((s,l)=>s+l.trips,0)}</td>
                      <td style="text-align:center;color:#1d4ed8">${totM3.toFixed(1)}</td>
                      <td></td>
                      <td style="text-align:center;color:#d97706">${curr(totAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>`:
              `<div style="display:flex;gap:4px;flex-wrap:wrap">
                ${(()=>{const acc={};lines.forEach(l=>{if(!acc[l.client])acc[l.client]={client:l.client,m3:0,amount:0};acc[l.client].m3+=l.netM3;acc[l.client].amount+=l.amount;});return Object.values(acc).map(c=>`<span style="background:#e0f2fe;color:#0369a1;border-radius:6px;padding:3px 8px;font-size:10px">${c.client}: ${c.m3.toFixed(1)} م³ / ${curr(c.amount)}</span>`).join('');})()}
              </div>`}
            </div>`).join('')}
        </div>`).join('')}
    </div>
  </div>`;
}

// ── Print Partner Report ──────────────────────────────────────────
function printPartnerReport(){
  const co = DB.getCompany();
  const st = window._PR;
  const content = document.getElementById('partner-report-content');
  if(!content){ toast('لا توجد بيانات','error'); return; }

  const printCSS = `
    *{font-family:Tahoma,sans-serif;direction:rtl;box-sizing:border-box}
    body{padding:14px;font-size:11px;color:#1f2937}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px}
    .flex-between{display:flex;justify-content:space-between;align-items:center}
    table{width:100%;border-collapse:collapse;font-size:10px}
    thead tr{background:#1F4E78;color:#fff}
    thead th{padding:5px 4px;text-align:right}
    tbody td{padding:4px;border-bottom:1px solid #eee}
    @media print{@page{margin:8mm;size:A4}}
  `;

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <title>تقرير الشركاء</title><style>${printCSS}</style></head><body>
    <div style="border-bottom:3px solid #1F4E78;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between">
      <div>
        <div style="font-size:16px;font-weight:700;color:#1F4E78">${co.name||'شركة الهنا للنقل'}</div>
        <div style="font-size:13px;font-weight:700;margin-top:4px">📊 تقرير الشركاء${st.partner?' — '+st.partner:''}</div>
      </div>
      <div style="text-align:left;font-size:10px;color:#666">
        <div>من: ${st.from||'البداية'}</div>
        <div>إلى: ${st.to||'اليوم'}</div>
        <div>تاريخ الطباعة: ${fmtDate(Date.now())}</div>
      </div>
    </div>
    ${content.innerHTML}
    <script>setTimeout(()=>window.print(),600)</script>
    </body></html>`);
  w.document.close();
}

// ── Excel Export ──────────────────────────────────────────────────
function exportPartnerReportExcel(){
  if(typeof XLSX==='undefined'){ toast('مكتبة Excel غير محملة','error'); return; }
  const co = DB.getCompany();
  const st = window._PR;
  const partners = DB.getAll('partners').filter(p=>!st.partner||p.name===st.partner);
  const approvedSarkis = DB.getAll('sarkis').filter(sk=>{
    if(sk.status==='ملغي') return false;
    if(st.from && sk.date<st.from) return false;
    if(st.to   && sk.date>st.to)   return false;
    return true;
  });

  const wb = XLSX.utils.book_new();

  partners.forEach(p=>{
    const rates = p.rates||[];
    const allLines = [];

    rates.forEach(rate=>{
      if(!rate.material||!rate.pricePerCubic) return;
      const price = Number(rate.pricePerCubic)||0;
      approvedSarkis.forEach(sk=>{
        if(sk.material!==rate.material) return;
        (sk.lines||[]).forEach(ln=>{
          const net = Number(ln.netSell||ln.netCubic)||0;
          if(!net) return;
          allLines.push([
            sk.date?sk.date.split('-').reverse().join('/'):'-',
            '#'+sk.id, sk.client, rate.material,
            ln.plateNo||'', ln.driverName||'',
            Number(ln.trips)||0,
            net, price, net*price,
          ]);
        });
      });
    });

    if(!allLines.length) return;

    const paid = DB.getAll('expenses').filter(r=>r.category==='مستحق شريك'&&r.vendor===p.name)
      .reduce((s,r)=>s+(Number(r.amount)||0),0);
    const totM3  = allLines.reduce((s,r)=>s+r[7],0);
    const totAmt = allLines.reduce((s,r)=>s+r[9],0);

    const wsData = [
      [co.name||'شركة الهنا للنقل','','','','','','','','',''],
      ['تقرير الشريك: '+p.name,'','','','من: '+(st.from||'البداية'),'إلى: '+(st.to||'اليوم'),'','','',''],
      [],
      ['التاريخ','رقم الحافظة','العميل','الخامة','السيارة','السائق','نقلات','م³ صافي','سعر/م³','المستحق'],
      ...allLines.sort((a,b)=>a[0].localeCompare(b[0])),
      [],
      ['','','','','','','الإجمالي', totM3, '', totAmt],
      [],
      ['','','','المدفوع','',paid,'','المتبقي','',totAmt-paid],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:12},{wch:10},{wch:14},{wch:14},{wch:12},{wch:12},{wch:8},{wch:10},{wch:8},{wch:14}];
    ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:9}},{s:{r:1,c:0},e:{r:1,c:9}}];

    const sheetName = p.name.slice(0,31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  if(wb.SheetNames.length===0){ toast('لا توجد بيانات للتصدير','error'); return; }
  XLSX.writeFile(wb, 'تقرير_الشركاء_'+(st.from||'')+'_'+(st.to||'')+'.xlsx');
  toast('✅ تم تصدير تقرير الشركاء');
}
