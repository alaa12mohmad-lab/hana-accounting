// ═══ CHEQUES ═══
function renderCheques(){
  const cheques=DB.getAll('cheques');
  const customers=DB.getAll('customers');
  const suppliers=DB.getAll('suppliers');
  const today=Date.now();const in7=today+7*864e5;
  const filtered=cheques.filter(c=>{
    if(_CHQ_TAB==='in')return c.type==='in';
    if(_CHQ_TAB==='out')return c.type==='out';
    if(_CHQ_TAB==='pending')return c.status==='معلق';
    if(_CHQ_TAB==='due')return c.status==='معلق'&&new Date(c.dueDate).getTime()<=in7;
    return true;
  }).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
  const pendIn=cheques.filter(c=>c.type==='in'&&c.status==='معلق').reduce((s,r)=>s+(Number(r.amount)||0),0);
  const pendOut=cheques.filter(c=>c.type==='out'&&c.status==='معلق').reduce((s,r)=>s+(Number(r.amount)||0),0);
  const dueCount=cheques.filter(c=>c.status==='معلق'&&new Date(c.dueDate).getTime()<=in7).length;
  const tabs=[['all','الكل'],['in','واردة'],['out','صادرة'],['pending','معلقة'],['due','مستحقة قريباً']];
  return `<div>
    <div class="grid3 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">شيكات واردة معلقة</div><div class="font-bold text-green tabular">${curr(pendIn)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">شيكات صادرة معلقة</div><div class="font-bold text-red tabular">${curr(pendOut)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">مستحقة خلال 7 أيام</div><div class="font-bold text-orange">${dueCount} شيك</div></div>
    </div>
    <div class="page-header">
      <div class="flex-wrap">
        <button class="btn btn-green btn-sm" onclick="openChequeModal('in')">📥 شيك وارد</button>
        <button class="btn btn-red btn-sm" onclick="openChequeModal('out')">📤 شيك صادر</button>
        <div class="flex" style="background:#f1f5f9;border-radius:7px;padding:3px;gap:2px">
          ${tabs.map(([v,l])=>`<button class="btn btn-sm" style="${_CHQ_TAB===v?'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1)':'background:none;color:#64748b'}" onclick="_CHQ_TAB='${v}';nav('cheques')">${l}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>النوع</th><th>الجهة</th><th>المبلغ</th><th>رقم الشيك</th><th>الإصدار</th><th>الاستحقاق</th><th>البنك</th><th>الحالة</th><th>إجراء</th></tr></thead>
      <tbody>
        ${filtered.map(c=>{
          const due=new Date(c.dueDate).getTime();
          const late=c.status==='معلق'&&due<today;
          const soon=c.status==='معلق'&&!late&&due<=in7;
          return `<tr style="${late?'background:#fff1f2':soon?'background:#fefce8':''}">
            <td>
              ${badge(c.type==='in'?'📥 وارد':'📤 صادر',c.type==='in'?'green':'red')}
              ${c._fromJournal?`<span class="badge badge-purple" style="font-size:9px;margin-right:3px">يومية</span>`:''}
            </td>
            <td><strong>${c.type==='in'?c.customer||'—':c.supplier||'—'}</strong></td>
            <td class="tabular font-bold">${curr(c.amount)}</td>
            <td class="font-mono">${c.chequeNo}</td>
            <td class="text-gray">${fmtDate(c.issueDate)}</td>
            <td class="${late?'text-red font-bold':soon?'text-orange font-bold':''}">${fmtDate(c.dueDate)}${late?' ⚠️':soon?' ⏰':''}</td>
            <td class="text-gray">${c.bank||'—'}</td>
            <td>${statusBadge(c.status)}</td>
            <td><div class="flex" style="gap:3px">
              ${c.status==='معلق'?`<button class="btn btn-xs btn-green" onclick="updChq(${c.id},'تم الصرف')">صُرف</button><button class="btn btn-xs btn-red" onclick="updChq(${c.id},'مرتجع')">مرتجع</button>`:''}
              <button class="btn-icon bi-edit" onclick="openChequeModal(null,${c.id})">✏️</button>
              <button class="btn-icon bi-del" onclick="delChq(${c.id})">🗑️</button>
            </div></td>
          </tr>`;
        }).join('')||`<tr><td colspan="9" class="tbl-empty"><span class="tbl-empty-icon">🏦</span>لا توجد شيكات</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}
function openChequeModal(type,editId){
  const ch=editId?DB.getById('cheques',editId):null;
  const t=ch?.type||type||'in';
  const customers=DB.getAll('customers');const suppliers=DB.getAll('suppliers');
  const v=(k,d='')=>ch?.[k]??d;
  openModal(editId?'تعديل شيك':(t==='in'?'إضافة شيك وارد':'إضافة شيك صادر'),`
    <div class="form-row fr2 mb10">
      <div class="form-group"><label>النوع</label><select id="ch-type"><option value="in" ${t==='in'?'selected':''}>📥 وارد</option><option value="out" ${t==='out'?'selected':''}>📤 صادر</option></select></div>
      <div class="form-group"><label><span class="req">*</span>الجهة</label>
        ${t==='in'?`<select id="ch-party"><option value="">اختر عميل</option>${customers.map(c=>`<option ${v('customer')===c.name?'selected':''}>${c.name}</option>`).join('')}</select>`
                  :`<select id="ch-party"><option value="">اختر مورد</option>${suppliers.map(s=>`<option ${v('supplier')===s.name?'selected':''}>${s.name}</option>`).join('')}</select>`}
      </div>
    </div>
    <div class="form-row fr2 mb10">
      <div class="form-group"><label><span class="req">*</span>المبلغ</label><input type="number" id="ch-amt" value="${v('amount')}"></div>
      <div class="form-group"><label><span class="req">*</span>رقم الشيك</label><input class="font-mono" id="ch-no" value="${v('chequeNo')}"></div>
    </div>
    <div class="form-row fr2 mb10">
      <div class="form-group"><label>تاريخ الإصدار</label><input type="date" id="ch-issue" value="${v('issueDate',todayStr())}"></div>
      <div class="form-group"><label><span class="req">*</span>تاريخ الاستحقاق</label><input type="date" id="ch-due" value="${v('dueDate')}"></div>
    </div>
    <div class="form-row fr2">
      <div class="form-group"><label>البنك</label><input id="ch-bank" value="${v('bank')}"></div>
      <div class="form-group"><label>الحالة</label><select id="ch-status">${['معلق','تم الصرف','مرتجع'].map(s=>`<option ${v('status','معلق')===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveChq(${editId||'null'},'${t}')">💾 حفظ</button>`,
    'modal-md');
}
function saveChq(editId,type){
  const party=document.getElementById('ch-party')?.value;
  const amt=Number(document.getElementById('ch-amt')?.value);
  const chNo=document.getElementById('ch-no')?.value;
  const due=document.getElementById('ch-due')?.value;
  const chType=document.getElementById('ch-type')?.value||type;
  if(!party)return toast('اختر الجهة','error');
  if(!amt)return toast('أدخل المبلغ','error');
  if(!chNo)return toast('أدخل رقم الشيك','error');
  if(!due)return toast('أدخل تاريخ الاستحقاق','error');
  const data={type:chType,customer:chType==='in'?party:'',supplier:chType==='out'?party:'',
    amount:amt,chequeNo:chNo,issueDate:document.getElementById('ch-issue')?.value||todayStr(),
    dueDate:due,bank:document.getElementById('ch-bank')?.value||'',
    status:document.getElementById('ch-status')?.value||'معلق'};
  if(editId){DB.update('cheques',editId,data);toast('تم التعديل ✓');}
  else{DB.insert('cheques',data);toast('تمت الإضافة ✓');}
  closeModal();nav('cheques');
}
function updChq(id,s){DB.update('cheques',id,{status:s});toast(s==='تم الصرف'?'✅ تم الصرف':'مرتجع');nav('cheques');}
function delChq(id){confirmDelete('حذف هذا الشيك؟',()=>{DB.remove('cheques',id);toast('تم الحذف');nav('cheques');});}
