// ═══ JOURNAL ═══
function renderJournal(){
  const jrn=DB.getAll('journal').sort((a,b)=>b.createdAt-a.createdAt);
  const filtered=jrn.filter(j=>_JRN_TAB==='all'||j.entryType===_JRN_TAB);
  const manualOk=jrn.filter(j=>j.entryType==='يدوي').every(j=>Math.abs((Number(j.debitAmount)||0)-(Number(j.creditAmount)||0))<0.01);
  const tabs=[['all','الكل'],['تحصيل','تحصيلات'],['دفع','مدفوعات'],['يدوي','قيود يدوية']];
  return `<div>
    <div class="page-header">
      <div class="flex-wrap">
        <button class="btn btn-green" onclick="openJrnModal('تحصيل')">📥 تحصيل من عميل</button>
        <button class="btn btn-red" onclick="openJrnModal('دفع')">📤 دفع لمورد</button>
        <button class="btn btn-primary" onclick="openJrnModal('يدوي')">📝 قيد يدوي</button>
        <div class="flex" style="background:#f1f5f9;border-radius:7px;padding:3px;gap:2px">
          ${tabs.map(([v,l])=>`<button class="btn btn-sm" style="${_JRN_TAB===v?'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1)':'background:none;color:#64748b'}" onclick="_JRN_TAB='${v}';nav('journal')">${l}</button>`).join('')}
        </div>
      </div>
      <div class="flex" style="gap:10px">
        ${!manualOk?`<span style="color:#dc2626;font-size:11px;font-weight:600">⚠️ قيود غير متوازنة</span>`:''}
      </div>
    </div>
    <div class="grid4 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">التحصيلات</div><div class="font-bold text-green tabular">${curr(jrn.filter(j=>j.entryType==='تحصيل').reduce((s,j)=>s+(Number(j.amount)||0),0))}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">المدفوعات</div><div class="font-bold text-red tabular">${curr(jrn.filter(j=>j.entryType==='دفع').reduce((s,j)=>s+(Number(j.amount)||0),0))}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">قيود يدوية</div><div class="font-bold text-brand">${jrn.filter(j=>j.entryType==='يدوي').length}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">توازن القيود</div><div class="font-bold ${manualOk?'text-green':'text-red'}">${manualOk?'✅ متوازن':'⚠️ غير متوازن'}</div></div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>#</th><th>التاريخ</th><th>نوع القيد</th><th>الجهة</th><th>المبلغ</th><th>من حساب (مدين)</th><th>إلى حساب (دائن)</th><th>طريقة الدفع</th><th>المرجع</th><th>البيان</th><th>إجراء</th></tr></thead>
      <tbody>
        ${filtered.map((j,idx)=>`<tr style="${j.entryType==='تحصيل'?'border-right:3px solid #10b981':j.entryType==='دفع'?'border-right:3px solid #ef4444':''}">
          <td class="text-gray text-xs">${filtered.length-idx}</td>
          <td>${fmtDate(j.date)}</td>
          <td>${statusBadge(j.entryType)}</td>
          <td><strong>${j.party||'—'}</strong>${j.partyType?`<br><span class="text-xs text-gray">${j.partyType}</span>`:''}</td>
          <td class="tabular font-bold ${j.entryType==='تحصيل'?'text-green':j.entryType==='دفع'?'text-red':'text-brand'}">${j.entryType==='يدوي'?curr(j.debitAmount||0):curr(j.amount)}</td>
          <td class="text-xs text-gray">${j.debitCode?j.debitCode+' '+j.debitName:j.debitAccount||'—'}</td>
          <td class="text-xs text-gray">${j.creditCode?j.creditCode+' '+j.creditName:j.creditAccount||'—'}</td>
          <td>${j.paymentType?badge(j.paymentType,'blue'):'—'}</td>
          <td class="font-mono text-xs">${j.reference||'—'}</td>
          <td class="text-gray">${j.description||'—'}</td>
          <td><div class="flex" style="gap:3px">
            <button class="btn-icon bi-edit" onclick="openJrnModal('',${j.id})">✏️</button>
            <button class="btn-icon bi-del" onclick="deleteJrn(${j.id})">🗑️</button>
          </div></td>
        </tr>`).join('')||`<tr><td colspan="11" class="tbl-empty"><span class="tbl-empty-icon">📝</span>لا توجد قيود</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}

function openJrnModal(type,editId){
  const j=editId?DB.getById('journal',editId):null;
  const t=j?.entryType||type;
  const customers=DB.getAll('customers');
  const suppliers=DB.getAll('suppliers');
  const accts=DB.getAll('accounts').sort((a,b)=>a.code.localeCompare(b.code));
  const PTYPES=['نقدي','تحويل بنكي','شيك فوري','شيك آجل','تحويل محفظة','كاش'];
  const v=(k,d='')=>j?.[k]??d;
  const acctOpts=accts.map(a=>`<option value="${a.code}|${a.name}">${a.code} — ${a.name}</option>`).join('');
  const custOpts=customers.map(c=>`<option ${v('party')===c.name?'selected':''}>${c.name}</option>`).join('');
  const suppOpts=suppliers.map(s=>`<option ${v('party')===s.name?'selected':''}>${s.name}</option>`).join('');

  let body='';
  if(t==='تحصيل'||t==='دفع'){
    const isCol=t==='تحصيل';
    const defPtype=v('paymentType','نقدي');
    const deb=isCol?debitAccount(defPtype):{code:'2001',name:'ذمم الموردين'};
    const crd=isCol?{code:'1010',name:'ذمم العملاء'}:creditAccount(defPtype);
    body=`
      <div class="alert alert-${isCol?'green':'red'} mb12"><span>${isCol?'📥':'📤'}</span>
        <span>${isCol?'تحصيل من عميل: مدين (نقدية/بنك) ← دائن (ذمم العملاء)':'دفع لمورد: مدين (ذمم الموردين) ← دائن (نقدية/بنك)'}</span>
      </div>
      <div class="form-row fr2 mb10">
        <div class="form-group"><label><span class="req">*</span>التاريخ</label><input type="date" id="jn-date" value="${v('date',todayStr())}"></div>
        <div class="form-group"><label><span class="req">*</span>${isCol?'العميل':'المورد'}</label>
          <select id="jn-party">${isCol?custOpts:suppOpts}</select>
        </div>
      </div>
      <div class="form-row fr2 mb10">
        <div class="form-group"><label><span class="req">*</span>المبلغ</label><input type="number" id="jn-amt" value="${v('amount')}" placeholder="0.00"></div>
        <div class="form-group"><label><span class="req">*</span>طريقة الدفع</label>
          <select id="jn-ptype" onchange="updateJrnAccounts(this,'${t}')">${PTYPES.map(p=>`<option ${defPtype===p?'selected':''}>${p}</option>`).join('')}</select>
        </div>
      </div>
      <div id="jn-cheque-row" style="${['شيك آجل','شيك فوري'].includes(defPtype)?'':'display:none'}" class="form-row fr2 mb10">
        <div class="form-group"><label>رقم الشيك</label><input class="font-mono" id="jn-chkno" value="${v('chequeNo')}"></div>
        <div class="form-group"><label>تاريخ استحقاق الشيك</label><input type="date" id="jn-chkdue" value="${v('chequeDue')}"></div>
      </div>
      <div id="jn-bank-row" style="${['تحويل بنكي','شيك فوري','تحويل محفظة'].includes(defPtype)?'':'display:none'}" class="form-group mb10">
        <label>البنك</label><input id="jn-bank" value="${v('bank')}">
      </div>
      <div class="grid2 mb10" style="background:#f0f9ff;border-radius:8px;padding:10px;gap:8px">
        <div><label style="font-size:10px;font-weight:600;color:#1d4ed8;margin-bottom:3px;display:block">الحساب المدين</label>
          <input id="jn-debit-disp" value="${deb.code} — ${deb.name}" readonly style="background:#dbeafe;font-size:11px;border-radius:6px;border:1px solid #bfdbfe;padding:5px 8px;width:100%">
        </div>
        <div><label style="font-size:10px;font-weight:600;color:#15803d;margin-bottom:3px;display:block">الحساب الدائن</label>
          <input id="jn-credit-disp" value="${crd.code} — ${crd.name}" readonly style="background:#dcfce7;font-size:11px;border-radius:6px;border:1px solid #bbf7d0;padding:5px 8px;width:100%">
        </div>
      </div>
      <div class="form-row fr2 mb10">
        <div class="form-group"><label>رقم المرجع</label><input id="jn-ref" value="${v('reference')}" placeholder="رقم حافظة / فاتورة"></div>
        <div class="form-group"><label>البيان</label><input id="jn-desc" value="${v('description')}" placeholder="وصف القيد"></div>
      </div>`;
  } else {
    // MANUAL ENTRY with smart party detection
    body=`
      <div class="alert alert-blue mb12"><span>📖</span><span>قيد يدوي — عند اختيار ذمم العملاء (1010) أو ذمم الموردين (2001) ستظهر قائمة بأسماء الجهة لربط الرصيد</span></div>
      <div class="form-row fr2 mb10">
        <div class="form-group"><label><span class="req">*</span>التاريخ</label><input type="date" id="jn-date" value="${v('date',todayStr())}"></div>
        <div class="form-group"><label>المرجع</label><input id="jn-ref" value="${v('reference')}" placeholder="رقم فاتورة/شيك..."></div>
      </div>
      <div class="grid2 mb10" style="gap:12px">
        <div style="background:#eff6ff;border-radius:8px;padding:12px">
          <div style="color:#1d4ed8;font-weight:700;font-size:11px;margin-bottom:8px">📘 الطرف المدين (من)</div>
          <div class="form-group"><label>الحساب <span class="req">*</span></label>
            <select id="jn-debit-acct" onchange="onJrnAcctChange('debit',this)"><option value="">اختر الحساب</option>${acctOpts}</select>
          </div>
          <div id="jn-debit-party-row" style="display:none" class="form-group">
            <label id="jn-debit-party-label">الجهة</label>
            <select id="jn-debit-party"></select>
          </div>
          <div class="form-group" style="margin-bottom:0"><label>المبلغ <span class="req">*</span></label>
            <input type="number" id="jn-debit-amt" value="${v('debitAmount')}" placeholder="0.00" oninput="checkJrnBalance()">
          </div>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:12px">
          <div style="color:#15803d;font-weight:700;font-size:11px;margin-bottom:8px">📗 الطرف الدائن (إلى)</div>
          <div class="form-group"><label>الحساب <span class="req">*</span></label>
            <select id="jn-credit-acct" onchange="onJrnAcctChange('credit',this)"><option value="">اختر الحساب</option>${acctOpts}</select>
          </div>
          <div id="jn-credit-party-row" style="display:none" class="form-group">
            <label id="jn-credit-party-label">الجهة</label>
            <select id="jn-credit-party"></select>
          </div>
          <div class="form-group" style="margin-bottom:0"><label>المبلغ <span class="req">*</span></label>
            <input type="number" id="jn-credit-amt" value="${v('creditAmount')}" placeholder="0.00" oninput="checkJrnBalance()">
          </div>
        </div>
      </div>
      <div id="jn-balance-ind" class="alert alert-blue" style="font-size:11px;padding:7px 10px">أدخل المبلغين للتحقق من التوازن</div>
      <div class="form-group mt10"><label><span class="req">*</span>البيان</label><input id="jn-desc" value="${v('description')}" placeholder="وصف القيد"></div>`;
  }

  openModal(editId?'تعديل قيد':(t==='تحصيل'?'📥 تحصيل من عميل':t==='دفع'?'📤 دفع لمورد':'📝 قيد يدوي'),body,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" onclick="saveJrn('${t}',${editId||'null'})">💾 حفظ القيد</button>`,
    'modal-md');

  // Restore values for manual edit
  if(j&&j.entryType==='يدوي'){
    setTimeout(()=>{
      if(j.debitCode){
        const ds=document.getElementById('jn-debit-acct');
        if(ds)for(let o of ds.options)if(o.value.startsWith(j.debitCode+'|')){ds.value=o.value;onJrnAcctChange('debit',ds);}
      }
      if(j.creditCode){
        const cs=document.getElementById('jn-credit-acct');
        if(cs)for(let o of cs.options)if(o.value.startsWith(j.creditCode+'|')){cs.value=o.value;onJrnAcctChange('credit',cs);}
      }
      if(j.party){
        const dp=document.getElementById('jn-debit-party');
        const cp=document.getElementById('jn-credit-party');
        if(dp)for(let o of dp.options)if(o.value===j.party)dp.value=j.party;
        if(cp)for(let o of cp.options)if(o.value===j.party)cp.value=j.party;
      }
    },80);
  }
}

function onJrnAcctChange(side, sel){
  const val=sel.value;
  const code=val.split('|')[0]||'';
  const customers=DB.getAll('customers');
  const suppliers=DB.getAll('suppliers');
  const rowId=`jn-${side}-party-row`;
  const lblId=`jn-${side}-party-label`;
  const partyId=`jn-${side}-party`;
  const row=document.getElementById(rowId);
  const lbl=document.getElementById(lblId);
  const psel=document.getElementById(partyId);
  if(!row||!lbl||!psel)return;

  if(code===ACCT_CUSTOMERS){
    row.style.display='';
    lbl.textContent='العميل المتأثر';
    psel.innerHTML=customers.map(c=>`<option>${c.name}</option>`).join('');
  } else if(code===ACCT_SUPPLIERS){
    row.style.display='';
    lbl.textContent='المورد المتأثر';
    psel.innerHTML=suppliers.map(s=>`<option>${s.name}</option>`).join('');
  } else {
    row.style.display='none';
  }
}

function updateJrnAccounts(sel,type){
  const pt=sel.value;
  const isCol=type==='تحصيل';
  const deb=isCol?debitAccount(pt):{code:'2001',name:'ذمم الموردين'};
  const crd=isCol?{code:'1010',name:'ذمم العملاء'}:creditAccount(pt);
  const dd=document.getElementById('jn-debit-disp');
  const cd=document.getElementById('jn-credit-disp');
  if(dd)dd.value=deb.code+' — '+deb.name;
  if(cd)cd.value=crd.code+' — '+crd.name;
  const chqRow=document.getElementById('jn-cheque-row');
  const bnkRow=document.getElementById('jn-bank-row');
  if(chqRow)chqRow.style.display=['شيك آجل','شيك فوري'].includes(pt)?'':'none';
  if(bnkRow)bnkRow.style.display=['تحويل بنكي','شيك فوري','تحويل محفظة'].includes(pt)?'':'none';
}

function checkJrnBalance(){
  const d=Number(document.getElementById('jn-debit-amt')?.value)||0;
  const c=Number(document.getElementById('jn-credit-amt')?.value)||0;
  const el=document.getElementById('jn-balance-ind');
  if(!el)return;
  if(!d&&!c){el.innerHTML='أدخل المبلغين للتحقق من التوازن';el.className='alert alert-blue';return;}
  if(Math.abs(d-c)<0.01){el.innerHTML='✅ القيد متوازن — مدين = دائن = '+curr(d);el.className='alert alert-green';}
  else{el.innerHTML='⚠️ غير متوازن — مدين: '+curr(d)+' | دائن: '+curr(c)+' | فرق: '+curr(Math.abs(d-c));el.className='alert alert-red';}
}

function saveJrn(type,editId){
  const date=document.getElementById('jn-date')?.value||todayStr();
  let data={date,entryType:type};

  if(type==='تحصيل'||type==='دفع'){
    const party=document.getElementById('jn-party')?.value;
    const amt=Number(document.getElementById('jn-amt')?.value);
    const pt=document.getElementById('jn-ptype')?.value||'نقدي';
    if(!party)return toast('اختر الجهة','error');
    if(!amt)return toast('أدخل المبلغ','error');
    if(['شيك آجل','شيك فوري'].includes(document.getElementById('jn-ptype')?.value||'')){
      const chkNo = document.getElementById('jn-chkno')?.value?.trim();
      if(!chkNo){ toast('أدخل رقم الشيك','error'); return; }
      const chkDue = document.getElementById('jn-chkdue')?.value;
      if(!chkDue){ toast('أدخل تاريخ استحقاق الشيك','error'); return; }
    }
    const isCol=type==='تحصيل';
    const deb=isCol?debitAccount(pt):{code:'2001',name:'ذمم الموردين'};
    const crd=isCol?{code:'1010',name:'ذمم العملاء'}:creditAccount(pt);
    data={...data, party, partyType:isCol?'عميل':'مورد',
      amount:amt, paymentType:pt,
      debitCode:deb.code, debitName:deb.name, debitAccount:deb.code+' '+deb.name,
      creditCode:crd.code, creditName:crd.name, creditAccount:crd.code+' '+crd.name,
      chequeNo:document.getElementById('jn-chkno')?.value||'',
      chequeDue:document.getElementById('jn-chkdue')?.value||'',
      bank:document.getElementById('jn-bank')?.value||'',
      reference:document.getElementById('jn-ref')?.value||'',
      description:document.getElementById('jn-desc')?.value||'',
    };
    // Auto-sync cheque from journal entry
    if(['شيك آجل','شيك فوري'].includes(pt)){
      const chqData = {
        type:       isCol?'in':'out',
        customer:   isCol?party:'',
        supplier:   isCol?'':party,
        amount:     amt,
        chequeNo:   data.chequeNo||('JRN-'+Date.now()),
        issueDate:  date,
        dueDate:    data.chequeDue||'',
        bank:       data.bank||'',
        status:     'معلق',
        relatedRef: data.reference||'',
        _fromJournal: true,
      };
      if(editId && data._linkedChequeId){
        // UPDATE existing linked cheque
        const existing = DB.getById('cheques', data._linkedChequeId);
        if(existing) DB.update('cheques', data._linkedChequeId, chqData);
        else { const c=DB.insert('cheques',chqData); data._linkedChequeId=c.id; }
      } else if(!editId){
        // CREATE new cheque and link it
        const c = DB.insert('cheques', chqData);
        data._linkedChequeId = c.id;
      }
    }
  } else {
    // Manual
    const dSel=document.getElementById('jn-debit-acct')?.value?.split('|');
    const cSel=document.getElementById('jn-credit-acct')?.value?.split('|');
    const dAmt=Number(document.getElementById('jn-debit-amt')?.value)||0;
    const cAmt=Number(document.getElementById('jn-credit-amt')?.value)||0;
    const desc=document.getElementById('jn-desc')?.value;
    if(!dSel||dSel.length<2)return toast('اختر حساب المدين','error');
    if(!cSel||cSel.length<2)return toast('اختر حساب الدائن','error');
    if(!dAmt)return toast('أدخل مبلغ المدين','error');
    if(Math.abs(dAmt-cAmt)>0.01)return toast('القيد غير متوازن — المدين ≠ الدائن','error');
    if(!desc)return toast('أدخل البيان','error');
    // Determine party from smart selection
    const dCode=dSel[0],cCode=cSel[0];
    let party='',partyType='';
    if(dCode===ACCT_CUSTOMERS||cCode===ACCT_CUSTOMERS){
      const dp=document.getElementById('jn-debit-party');
      const cp=document.getElementById('jn-credit-party');
      party=(dCode===ACCT_CUSTOMERS?dp:cp)?.value||'';
      partyType='عميل';
    } else if(dCode===ACCT_SUPPLIERS||cCode===ACCT_SUPPLIERS){
      const dp=document.getElementById('jn-debit-party');
      const cp=document.getElementById('jn-credit-party');
      party=(dCode===ACCT_SUPPLIERS?dp:cp)?.value||'';
      partyType='مورد';
    }
    data={...data, party, partyType,
      debitCode:dSel[0], debitName:dSel[1],
      creditCode:cSel[0], creditName:cSel[1],
      debitAmount:dAmt, creditAmount:cAmt,
      reference:document.getElementById('jn-ref')?.value||'',
      description:desc,
    };
  }
  if(editId){DB.update('journal',editId,data);toast('تم التعديل ✓');}
  else{DB.insert('journal',data);toast('تمت الإضافة ✓');}
  closeModal();nav('journal');
}
function deleteJrn(id){
  const j = DB.getById('journal', id);
  confirmDelete('حذف هذا القيد؟', ()=>{
    // Remove linked cheque if exists
    if(j?._linkedChequeId){
      const chq = DB.getById('cheques', j._linkedChequeId);
      if(chq && chq._fromJournal) DB.remove('cheques', j._linkedChequeId);
    }
    DB.remove('journal', id);
    toast('تم الحذف');
    nav('journal');
  });
}

// ═══════════════════════════════════════════════════════
// CHEQUES
// ═══════════════════════════════════════════════════════
let _CHQ_TAB='all';