// ═══ ACCOUNTS ═══
// ═══════════════════════════════════════════════════════
function renderAccounts(){
  const items=DB.getAll('accounts').sort((a,b)=>a.code.localeCompare(b.code));
  const jrn=DB.getAll('journal');
  const debitTypes=['أصول','مصروفات'];
  const creditTypes=['خصوم','حقوق ملكية','إيرادات'];
  const typeColor={أصول:'blue',خصوم:'red','حقوق ملكية':'purple',إيرادات:'green',مصروفات:'yellow'};

  // Compute running balance for each account
  const acctBalance=(code,type,opening)=>{
    let bal=Number(opening)||0;
    const isDebit=debitTypes.includes(type);
    jrn.forEach(j=>{
      if(j.entryType==='يدوي'){
        if(j.debitCode===code)  bal+=isDebit?+(Number(j.debitAmount)||0):-(Number(j.debitAmount)||0);
        if(j.creditCode===code) bal+=isDebit?-(Number(j.creditAmount)||0):+(Number(j.creditAmount)||0);
      } else {
        const amt=Number(j.amount)||0;
        if(j.debitCode===code)  bal+=isDebit?+amt:-amt;
        if(j.creditCode===code) bal+=isDebit?-amt:+amt;
      }
    });
    return bal;
  };

  const totalDebitBal=items.filter(a=>debitTypes.includes(a.type)).reduce((s,a)=>s+acctBalance(a.code,a.type,a.openingBalance),0);
  const totalCreditBal=items.filter(a=>creditTypes.includes(a.type)).reduce((s,a)=>s+acctBalance(a.code,a.type,a.openingBalance),0);
  const balanced=Math.abs(totalDebitBal-totalCreditBal)<0.01;

  return `<div>
    <div class="page-header">
      <button class="btn btn-primary" onclick="openAcctModal()">＋ إضافة حساب</button>
      <div class="card-sm flex" style="gap:12px;flex-wrap:wrap">
        <span class="text-xs text-gray">مجموع المدين: <strong class="text-brand tabular">${curr(totalDebitBal)}</strong></span>
        <span class="text-xs text-gray">مجموع الدائن: <strong class="text-brand tabular">${curr(totalCreditBal)}</strong></span>
        <span class="${balanced?'text-green':'text-red'} font-bold text-xs">${balanced?'✅ الميزان متوازن':'⚠️ الميزان غير متوازن'}</span>
      </div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>الكود</th><th>اسم الحساب</th><th>النوع</th><th>الرصيد الافتتاحي</th><th>الرصيد الحالي</th><th>إجراء</th></tr></thead>
      <tbody>
        ${items.map(a=>{
          const bal=acctBalance(a.code,a.type,a.openingBalance);
          return `<tr>
            <td class="font-mono font-bold text-brand">${a.code}</td>
            <td><strong>${a.name}</strong></td>
            <td>${badge(a.type,typeColor[a.type]||'gray')}</td>
            <td class="tabular text-gray">${curr(a.openingBalance)}</td>
            <td class="tabular font-bold ${bal>=0?'text-brand':'text-red'}">${curr(bal)}</td>
            <td><div class="flex" style="gap:3px">
              <button class="btn btn-gray btn-sm" onclick="viewAcctStatement(${a.id})">📋 كشف حساب</button>
              <button class="btn-icon bi-edit" onclick="openAcctModal(${a.id})">✏️</button>
              <button class="btn-icon bi-del" onclick="delAcct(${a.id},'${a.name}')">🗑️</button>
            </div></td>
          </tr>`;
        }).join('')||`<tr><td colspan="6" class="tbl-empty"><span class="tbl-empty-icon">📒</span>لا توجد حسابات</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}

function viewAcctStatement(id){
  const acct=DB.getById('accounts',id);if(!acct)return;
  const jrn=DB.getAll('journal').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const debitTypes=['أصول','مصروفات'];
  const isDebit=debitTypes.includes(acct.type);
  let running=Number(acct.openingBalance)||0;

  const rows=[];
  jrn.forEach(j=>{
    let affect=0,side='';
    if(j.entryType==='يدوي'){
      if(j.debitCode===acct.code){affect=Number(j.debitAmount)||0;side='مدين';}
      else if(j.creditCode===acct.code){affect=Number(j.creditAmount)||0;side='دائن';}
    } else {
      const amt=Number(j.amount)||0;
      if(j.debitCode===acct.code){affect=amt;side='مدين';}
      else if(j.creditCode===acct.code){affect=amt;side='دائن';}
    }
    if(!affect)return;
    const change=isDebit?(side==='مدين'?affect:-affect):(side==='دائن'?affect:-affect);
    running+=change;
    rows.push({...j,affect,side,running,change});
  });

  openModal(`كشف حساب: ${acct.code} — ${acct.name}`,`
    <div class="grid4 mb12" style="gap:8px">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">الرصيد الافتتاحي</div><div class="font-bold text-brand tabular">${curr(acct.openingBalance)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">حركات مدينة</div><div class="font-bold text-blue-600 tabular">${curr(rows.filter(r=>r.side==='مدين').reduce((s,r)=>s+r.affect,0))}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">حركات دائنة</div><div class="font-bold text-orange tabular">${curr(rows.filter(r=>r.side==='دائن').reduce((s,r)=>s+r.affect,0))}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">الرصيد الحالي</div><div class="font-bold text-brand tabular">${curr(running)}</div></div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>التاريخ</th><th>نوع القيد</th><th>الجهة</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
      <tbody>
        <tr style="background:#f0f9ff;font-weight:600">
          <td colspan="6">رصيد أول المدة</td>
          <td class="tabular font-bold text-brand">${curr(acct.openingBalance)}</td>
        </tr>
        ${rows.map(r=>`<tr style="${r.side==='مدين'?'background:#eff6ff':'background:#f0fdf4'}">
          <td>${fmtDate(r.date)}</td>
          <td>${statusBadge(r.entryType)}</td>
          <td><strong>${r.party||'—'}</strong></td>
          <td class="text-gray">${r.description||'—'}</td>
          <td class="tabular text-blue-700">${r.side==='مدين'?curr(r.affect):'—'}</td>
          <td class="tabular text-orange">${r.side==='دائن'?curr(r.affect):'—'}</td>
          <td class="tabular font-bold ${r.running>=0?'text-brand':'text-red'}">${curr(r.running)}</td>
        </tr>`).join('')||`<tr><td colspan="7" class="tbl-empty">لا توجد حركات</td></tr>`}
        <tr style="background:#fefce8;font-weight:700">
          <td colspan="6">رصيد آخر المدة</td>
          <td class="tabular text-brand">${curr(running)}</td>
        </tr>
      </tbody>
    </table></div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إغلاق</button>
     <button class="btn btn-primary" onclick="printAcctStatement(${id})">🖨️ طباعة</button>`,
    'modal-xl');
}

function printAcctStatement(id){
  const acct=DB.getById('accounts',id);if(!acct)return;
  const jrn=DB.getAll('journal').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const debitTypes=['أصول','مصروفات'];
  const isDebit=debitTypes.includes(acct.type);
  let running=Number(acct.openingBalance)||0;
  const rows=[];
  jrn.forEach(j=>{
    let affect=0,side='';
    if(j.entryType==='يدوي'){
      if(j.debitCode===acct.code){affect=Number(j.debitAmount)||0;side='مدين';}
      else if(j.creditCode===acct.code){affect=Number(j.creditAmount)||0;side='دائن';}
    } else {
      const amt=Number(j.amount)||0;
      if(j.debitCode===acct.code){affect=amt;side='مدين';}
      else if(j.creditCode===acct.code){affect=amt;side='دائن';}
    }
    if(!affect)return;
    const change=isDebit?(side==='مدين'?affect:-affect):(side==='دائن'?affect:-affect);
    running+=change;
    rows.push({...j,affect,side,running});
  });
  const _n2=(n)=>new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';
  const _d2=(ts)=>{if(!ts)return '—';const d=new Date(ts);return isNaN(d)?'—':d.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});};
  const w=window.open('','_blank');
  const sc='<scr'+'ipt>setTimeout(()=>window.print(),600)<'+'/scr'+'ipt>';
  const PCSS2=`*{font-family:Tahoma,sans-serif;margin:0;padding:0;box-sizing:border-box;direction:rtl}body{padding:12px;font-size:11px}.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1F4E78;padding-bottom:8px;margin-bottom:10px}.co{font-size:16px;font-weight:700;color:#1F4E78}table{width:100%;border-collapse:collapse;font-size:10px}thead tr{background:#1F4E78;color:#fff}thead th{padding:6px 5px;text-align:right}tbody tr:nth-child(even){background:#f5f8fc}tbody td{padding:4px 5px;border-bottom:1px solid #eee}tfoot tr{background:#FFE699;font-weight:700}tfoot td{padding:5px}@media print{@page{margin:9mm}body{padding:0}}`;
  w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كشف حساب<\/title><style>'+PCSS2+'<\/style><\/head><body>'+
    '<div class="hdr"><div><div class="co">شركة الهنا للنقل</div><div style="font-size:10px;color:#666">كشف حساب: '+acct.code+' — '+acct.name+'</div><div style="font-size:10px;color:#666">'+_d2(Date.now())+'</div></div><div style="text-align:left;font-size:10px;color:#666">نوع الحساب: '+acct.type+'</div></div>'+
    '<table><thead><tr><th>التاريخ</th><th>نوع القيد</th><th>الجهة</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>'+
    '<tr style="background:#eff6ff;font-weight:600"><td colspan="6">رصيد أول المدة</td><td>'+_n2(acct.openingBalance)+'</td></tr>'+
    rows.map(r=>'<tr><td>'+_d2(r.date)+'</td><td>'+r.entryType+'</td><td>'+(r.party||'—')+'</td><td>'+(r.description||'—')+'</td><td>'+(r.side==='مدين'?_n2(r.affect):'—')+'</td><td>'+(r.side==='دائن'?_n2(r.affect):'—')+'</td><td style="font-weight:700">'+_n2(r.running)+'</td></tr>').join('')+
    '</tbody><tfoot><tr><td colspan="6">رصيد آخر المدة</td><td>'+_n2(running)+'</td></tr></tfoot></table>'+
    sc+'<\/body><\/html>');
  w.document.close();
}

function openAcctModal(editId){
  const a=editId?DB.getById('accounts',editId):null;
  const TYPES=['أصول','خصوم','حقوق ملكية','إيرادات','مصروفات'];
  const v=(k,d='')=>a?.[k]??d;
  openModal(editId?'تعديل حساب':'إضافة حساب جديد',`
    <div class="form-row fr2 mb10">
      <div class="form-group"><label><span class="req">*</span>كود الحساب</label><input class="font-mono" id="ac-code" value="${v('code')}" placeholder="1001"></div>
      <div class="form-group"><label><span class="req">*</span>نوع الحساب</label><select id="ac-type">${TYPES.map(t=>`<option ${v('type')===t?'selected':''}>${t}</option>`).join('')}</select></div>
    </div>
    <div class="form-group mb10"><label><span class="req">*</span>اسم الحساب</label><input id="ac-name" value="${v('name')}" placeholder="اسم الحساب"></div>
    <div class="form-group"><label>الرصيد الافتتاحي (ج.م)</label><input type="number" id="ac-bal" value="${v('openingBalance',0)}"></div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveAcct(${editId||'null'})">💾 حفظ</button>`,
    'modal-sm');
}
function saveAcct(editId){
  const code=document.getElementById('ac-code')?.value?.trim();
  const name=document.getElementById('ac-name')?.value?.trim();
  if(!code||!name)return toast('أدخل الكود والاسم','error');
  const data={code,name,type:document.getElementById('ac-type')?.value,openingBalance:Number(document.getElementById('ac-bal')?.value)||0};
  if(editId){DB.update('accounts',editId,data);toast('تم التعديل ✓');}else{DB.insert('accounts',data);toast('تمت الإضافة ✓');}
  closeModal();nav('accounts');
}
function delAcct(id,name){confirmDelete(`حذف حساب "${name}"؟`,()=>{DB.remove('accounts',id);toast('تم الحذف');nav('accounts');});}

// ═══════════════════════════════════════════════════════
// SETTINGS — Customers, Suppliers, Materials, Trucks, Partners
// ═══════════════════════════════════════════════════════
function renderCustomers(){ return renderPartyPage('customers','العملاء','👥','عميل'); }
function renderSuppliers(){ return renderPartyPage('suppliers','الموردون','🏗️','مورد'); }