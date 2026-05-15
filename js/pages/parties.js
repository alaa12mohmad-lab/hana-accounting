// ═══ CUSTOMERS / SUPPLIERS / MATERIALS / TRUCKS / PARTNERS ═══

function renderPartyPage(col,title,icon,single){
  const items=DB.getAll(col).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
  return `<div>
    <div class="page-header">
      <button class="btn btn-primary" onclick="openPartyModal('${col}','${single}')">＋ إضافة ${single}</button>
      <span class="text-gray text-sm">${items.length} ${single}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px">
      ${items.map(p=>`<div class="card">
        <div class="flex-between mb8">
          <div><strong style="font-size:13px">${p.name}</strong>${p.phone?`<div class="text-xs text-gray mt4">📞 ${p.phone}</div>`:''}</div>
          <div>
            <div style="text-align:left;margin-bottom:4px"><div class="text-xs text-gray">الرصيد الحالي</div>
              <div class="font-bold tabular" style="font-size:12px;color:${(col==='customers'?getCustomerBalance(p.name):getSupplierBalance(p.name))>0?'#dc2626':'#16a34a'}">${curr(col==='customers'?getCustomerBalance(p.name):getSupplierBalance(p.name))}</div>
            </div>
            <div class="flex" style="gap:3px;justify-content:flex-end">
              <button class="btn-icon bi-edit" onclick="openPartyModal('${col}','${single}',${p.id})">✏️</button>
              <button class="btn-icon bi-del" onclick="deleteParty('${col}',${p.id},'${p.name}')">🗑️</button>
            </div>
          </div>
        </div>
        ${(p.prices||[]).length>0?`
          <div class="text-xs text-gray mb6" style="font-weight:600">${col==='customers'?'أسعار البيع':'أسعار الشراء'} (حسب الخامة والتاريخ):</div>
          ${[...p.prices].sort((a,b)=>b.from.localeCompare(a.from)).slice(0,5).map(pr=>`
            <div class="flex-between" style="background:#f8fafc;border-radius:5px;padding:4px 8px;margin-bottom:3px">
              ${badge(pr.material)}<strong class="text-brand tabular" style="font-size:11px">${curr(pr.price)}/م³</strong>
              <span class="text-xs text-gray">من ${pr.from}</span>
            </div>`).join('')}
          ${(p.prices||[]).length>5?`<div class="text-xs text-gray mt4">+ ${(p.prices||[]).length-5} سعر آخر</div>`:''}
        `:`<div class="text-xs text-gray" style="font-style:italic">لم تُحدد أسعار بعد</div>`}
      </div>`).join('')||`<div class="tbl-empty"><span class="tbl-empty-icon">${icon}</span>لا يوجد ${title}</div>`}
    </div>
  </div>`;
}

function openPartyModal(col,single,editId){
  const item=editId?DB.getById(col,editId):null;
  const materials=DB.getAll('materials');
  window._partyPrices=item?JSON.parse(JSON.stringify(item.prices||[])):[];
  const priceLabel=col==='customers'?'سعر البيع':'سعر الشراء';

  const refreshPrices=()=>{
    const el=document.getElementById('party-prices');
    if(!el)return;
    el.innerHTML=window._partyPrices.map((pr,i)=>`
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:5px;align-items:center;background:#f8fafc;border-radius:6px;padding:5px 7px;margin-bottom:5px">
        <select style="border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px;font-size:10px;width:100%" onchange="window._partyPrices[${i}].material=this.value">
          ${materials.map(m=>`<option ${pr.material===m.name?'selected':''}>${m.name}</option>`).join('')}
        </select>
        <input type="number" placeholder="${priceLabel}/م³" value="${pr.price||''}" oninput="window._partyPrices[${i}].price=Number(this.value)" style="border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px;font-size:10px;width:100%">
        <input type="date" value="${pr.from||''}" oninput="window._partyPrices[${i}].from=this.value" style="border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px;font-size:10px;width:100%">
        <button onclick="window._partyPrices.splice(${i},1);window._rpf()" style="background:#fee2e2;border:none;border-radius:4px;padding:3px 7px;cursor:pointer;color:#dc2626;font-size:11px">✕</button>
      </div>`).join('')||`<div class="text-xs text-gray" style="font-style:italic;padding:8px 0">لا توجد أسعار — اضغط "إضافة سعر"</div>`;
  };
  window._rpf=refreshPrices;

  const v=(k,d='')=>item?.[k]??d;
  openModal(editId?`تعديل ${single}`:`إضافة ${single} جديد`,`
    <div class="form-row fr2 mb10">
      <div class="form-group"><label><span class="req">*</span>الاسم</label><input id="pty-name" value="${v('name')}"></div>
      <div class="form-group"><label>الرصيد الافتتاحي</label><input type="number" id="pty-bal" value="${v('openingBalance',0)}"></div>
    </div>
    <div class="form-row fr2 mb10">
      <div class="form-group"><label>رقم الهاتف</label><input id="pty-phone" value="${v('phone')}"></div>
      <div class="form-group"><label>ملاحظات</label><input id="pty-notes" value="${v('notes')}"></div>
    </div>
    <div class="divider"></div>
    <div class="flex-between mb8">
      <div>
        <strong class="text-sm">جدول ${priceLabel} حسب الخامة والتاريخ</strong>
        <div class="text-xs text-gray mt4">يمكن تكرار الخامة بأسعار مختلفة في تواريخ مختلفة — السعر الأحدث يُطبَّق تلقائياً</div>
      </div>
      <button class="btn btn-gray btn-sm" onclick="window._partyPrices.push({material:'${materials[0]?.name||''}',price:0,from:'${todayStr()}'});window._rpf()">＋ سعر</button>
    </div>
    <div style="font-size:9px;color:#64748b;display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:5px;padding:0 7px;margin-bottom:4px">
      <span>الخامة</span><span>${priceLabel}/م³</span><span>اعتباراً من</span><span></span>
    </div>
    <div id="party-prices"></div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" onclick="saveParty('${col}','${single}',${editId||'null'})">💾 حفظ</button>`,
    'modal-lg');
  refreshPrices();
}

function saveParty(col,single,editId){
  const name=document.getElementById('pty-name')?.value?.trim();
  if(!name)return toast('أدخل الاسم','error');
  const data={name,openingBalance:Number(document.getElementById('pty-bal')?.value)||0,
    phone:document.getElementById('pty-phone')?.value||'',
    notes:document.getElementById('pty-notes')?.value||'',
    prices:window._partyPrices||[]};
  if(editId){DB.update(col,editId,data);toast('تم التعديل ✓');}
  else{DB.insert(col,data);toast('تمت الإضافة ✓');}
  closeModal();nav(col);
}
function deleteParty(col,id,name){confirmDelete(`حذف "${name}"؟`,()=>{DB.remove(col,id);toast('تم الحذف');nav(col);});}

function renderMaterials(){
  const items=DB.getAll('materials').sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
  return `<div>
    <div class="page-header"><button class="btn btn-primary" onclick="openMatModal()">＋ إضافة خامة</button><span class="text-gray text-sm">${items.length} خامة</span></div>
    <div class="alert alert-blue mb12"><span>ℹ️</span><span>الأسعار هنا هي الافتراضية. الأسعار الفعلية تُحدد في كل عميل/مورد بصفحات الإعدادات.</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>اسم الخامة</th><th>الوحدة</th><th>سعر بيع افتراضي</th><th>سعر شراء افتراضي</th><th>هامش افتراضي</th><th>إجراء</th></tr></thead>
      <tbody>
        ${items.map(m=>{const mg=m.defaultSellPrice&&m.defaultBuyPrice?(((m.defaultSellPrice-m.defaultBuyPrice)/m.defaultSellPrice)*100).toFixed(1)+'%':'—';
          return `<tr><td><strong>${m.name}</strong></td><td class="text-gray">${m.unit||'م³'}</td><td class="tabular font-bold text-brand">${curr(m.defaultSellPrice)}</td><td class="tabular text-gray">${curr(m.defaultBuyPrice)}</td><td>${badge(mg,parseFloat(mg)>15?'green':'yellow')}</td>
          <td><div class="flex" style="gap:3px"><button class="btn-icon bi-edit" onclick="openMatModal(${m.id})">✏️</button><button class="btn-icon bi-del" onclick="deleteMat(${m.id},'${m.name}')">🗑️</button></div></td></tr>`;
        }).join('')||`<tr><td colspan="6" class="tbl-empty"><span class="tbl-empty-icon">🪨</span>لا توجد خامات</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}
function openMatModal(editId){
  const m=editId?DB.getById('materials',editId):null;
  const v=(k,d='')=>m?.[k]??d;
  openModal(editId?'تعديل خامة':'إضافة خامة جديدة',`
    <div class="form-group mb10"><label><span class="req">*</span>اسم الخامة</label><input id="mt-name" value="${v('name')}" placeholder="مثال: رملة ناعمة"></div>
    <div class="form-row fr3">
      <div class="form-group"><label>سعر البيع الافتراضي</label><input type="number" id="mt-sell" value="${v('defaultSellPrice')}"></div>
      <div class="form-group"><label>سعر الشراء الافتراضي</label><input type="number" id="mt-buy" value="${v('defaultBuyPrice')}"></div>
      <div class="form-group"><label>الوحدة</label><input id="mt-unit" value="${v('unit','م³')}"></div>
    </div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveMat(${editId||'null'})">💾 حفظ</button>`,
    'modal-sm');
}
function saveMat(editId){
  const name=document.getElementById('mt-name')?.value?.trim();
  if(!name)return toast('أدخل اسم الخامة','error');
  const data={name,defaultSellPrice:Number(document.getElementById('mt-sell')?.value)||0,defaultBuyPrice:Number(document.getElementById('mt-buy')?.value)||0,unit:document.getElementById('mt-unit')?.value||'م³'};
  if(editId){DB.update('materials',editId,data);toast('تم التعديل ✓');}else{DB.insert('materials',data);toast('تمت الإضافة ✓');}
  closeModal();nav('materials');
}
function deleteMat(id,name){confirmDelete(`حذف "${name}"؟`,()=>{DB.remove('materials',id);toast('تم الحذف');nav('materials');});}

function renderTrucks(){
  const items=DB.getAll('trucks').sort((a,b)=>(a.plateNo||'').localeCompare(b.plateNo||''));
  const suppliers=DB.getAll('suppliers');
  return `<div>
    <div class="page-header"><button class="btn btn-primary" onclick="openTruckModal()">＋ إضافة سيارة</button><span class="text-gray text-sm">${items.length} سيارة</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>رقم اللوحة</th><th>السائق</th><th>المورد</th><th>الطول</th><th>العرض</th><th>الارتفاع</th><th>السعة م³</th><th>إجراء</th></tr></thead>
      <tbody>
        ${items.map(t=>`<tr><td class="font-mono font-bold">${t.plateNo}</td><td>${t.driverName||'—'}</td><td class="text-gray">${t.supplier||'—'}</td><td class="tabular text-center">${t.length||'—'}</td><td class="tabular text-center">${t.width||'—'}</td><td class="tabular text-center">${t.height||'—'}</td><td>${badge((t.cubic||0)+' م³')}</td>
          <td><div class="flex" style="gap:3px"><button class="btn-icon bi-edit" onclick="openTruckModal(${t.id})">✏️</button><button class="btn-icon bi-del" onclick="delTruck(${t.id},'${t.plateNo}')">🗑️</button></div></td>
        </tr>`).join('')||`<tr><td colspan="8" class="tbl-empty"><span class="tbl-empty-icon">🚚</span>لا توجد سيارات</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}
function openTruckModal(editId){
  const t=editId?DB.getById('trucks',editId):null;
  const suppliers=DB.getAll('suppliers');
  const v=(k,d='')=>t?.[k]??d;
  openModal(editId?'تعديل سيارة':'إضافة سيارة',`
    <div class="form-row fr2 mb10"><div class="form-group"><label><span class="req">*</span>رقم اللوحة</label><input class="font-mono" id="tr-plate" value="${v('plateNo')}"></div>
    <div class="form-group"><label>السائق</label><input id="tr-driver" value="${v('driverName')}"></div></div>
    <div class="form-group mb10"><label>المورد (المالك)</label><select id="tr-supp"><option value="">— اختياري —</option>${suppliers.map(s=>`<option ${v('supplier')===s.name?'selected':''}>${s.name}</option>`).join('')}</select></div>
    <div style="background:#eff6ff;border-radius:8px;padding:10px;margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:#1e40af;margin-bottom:7px">📐 أبعاد الحمولة — التكعيب يُحسب تلقائياً</div>
      <div class="form-row fr3 mb8">
        <div class="form-group" style="margin:0"><label>الطول (م)</label><input type="number" step="0.1" id="tr-l" value="${v('length')}" oninput="calcTCubic()"></div>
        <div class="form-group" style="margin:0"><label>العرض (م)</label><input type="number" step="0.1" id="tr-w" value="${v('width')}" oninput="calcTCubic()"></div>
        <div class="form-group" style="margin:0"><label>الارتفاع (م)</label><input type="number" step="0.1" id="tr-h" value="${v('height')}" oninput="calcTCubic()"></div>
      </div>
      <div style="text-align:center"><span class="text-xs text-brand">السعة = </span><span id="tr-cubic" style="font-size:15px;font-weight:700;color:#1e40af">${v('cubic',0)} م³</span></div>
    </div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveTruck(${editId||'null'})">💾 حفظ</button>`,
    'modal-md');
}
function calcTCubic(){const l=Number(document.getElementById('tr-l')?.value)||0;const w=Number(document.getElementById('tr-w')?.value)||0;const h=Number(document.getElementById('tr-h')?.value)||0;const el=document.getElementById('tr-cubic');if(el)el.textContent=(l*w*h).toFixed(3)+' م³';}
function saveTruck(editId){
  const plate=document.getElementById('tr-plate')?.value?.trim();
  if(!plate)return toast('أدخل رقم اللوحة','error');
  const l=Number(document.getElementById('tr-l')?.value)||0,w=Number(document.getElementById('tr-w')?.value)||0,h=Number(document.getElementById('tr-h')?.value)||0;
  const data={plateNo:plate,driverName:document.getElementById('tr-driver')?.value||'',supplier:document.getElementById('tr-supp')?.value||'',length:l,width:w,height:h,cubic:parseFloat((l*w*h).toFixed(3))};
  if(editId){DB.update('trucks',editId,data);toast('تم التعديل ✓');}else{DB.insert('trucks',data);toast('تمت الإضافة ✓');}
  closeModal();nav('trucks');
}
function delTruck(id,plate){confirmDelete(`حذف السيارة "${plate}"؟`,()=>{DB.remove('trucks',id);toast('تم الحذف');nav('trucks');});}

function renderPartners(){
  const items=DB.getAll('partners').sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
  const materials=DB.getAll('materials');
  return `<div>
    <div class="page-header"><button class="btn btn-primary" onclick="openPartnerModal()">＋ إضافة شريك</button><span class="text-gray text-sm">${items.length} شريك</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">
      ${items.map(p=>`<div class="card">
        <div class="flex-between mb8"><strong style="font-size:13px">${p.name}</strong>
          <div class="flex" style="gap:3px"><button class="btn-icon bi-edit" onclick="openPartnerModal(${p.id})">✏️</button><button class="btn-icon bi-del" onclick="delPartner(${p.id},'${p.name}')">🗑️</button></div>
        </div>
        ${(p.rates||[]).length>0?(p.rates||[]).map(r=>`<div class="flex-between" style="background:#f8fafc;border-radius:5px;padding:4px 8px;margin-bottom:3px">${badge(r.material)}<strong class="text-brand tabular" style="font-size:11px">${curr(r.pricePerCubic)}/م³</strong><span class="text-xs text-gray">${r.from}${r.to?' — '+r.to:' (مفتوح)'}</span></div>`).join(''):`<div class="text-xs text-gray" style="font-style:italic">لم تُحدد عمولات</div>`}
      </div>`).join('')||`<div class="tbl-empty"><span class="tbl-empty-icon">🤝</span>لا يوجد شركاء</div>`}
    </div>
  </div>`;
}
function openPartnerModal(editId){
  const p=editId?DB.getById('partners',editId):null;
  const materials=DB.getAll('materials');
  window._pRates=p?JSON.parse(JSON.stringify(p.rates||[])):[];
  const rf=()=>{const el=document.getElementById('pr-rates');if(!el)return;el.innerHTML=window._pRates.map((r,i)=>`<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:5px;align-items:center;background:#f8fafc;border-radius:5px;padding:5px;margin-bottom:4px"><select style="border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px;font-size:10px;width:100%" onchange="window._pRates[${i}].material=this.value">${materials.map(m=>`<option ${r.material===m.name?'selected':''}>${m.name}</option>`).join('')}</select><input type="number" placeholder="العمولة/م³" value="${r.pricePerCubic||''}" oninput="window._pRates[${i}].pricePerCubic=Number(this.value)" style="border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px;font-size:10px;width:100%"><input type="date" value="${r.from||''}" oninput="window._pRates[${i}].from=this.value" style="border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px;font-size:10px;width:100%"><input type="date" value="${r.to||''}" oninput="window._pRates[${i}].to=this.value" style="border:1px solid #e5e7eb;border-radius:4px;padding:3px 5px;font-size:10px;width:100%"><button onclick="window._pRates.splice(${i},1);window._prf()" style="background:#fee2e2;border:none;border-radius:4px;padding:3px 7px;cursor:pointer;color:#dc2626;font-size:11px">✕</button></div>`).join('')||`<div class="text-xs text-gray" style="font-style:italic;padding:6px">لا توجد عمولات</div>`;};
  window._prf=rf;
  const v=(k,d='')=>p?.[k]??d;
  openModal(editId?'تعديل شريك':'إضافة شريك',`
    <div class="form-row fr3 mb10">
  <div class="form-group"><label><span class="req">*</span>الاسم</label><input id="pr-name" value="${v('name')}"></div>
  <div class="form-group"><label>الهاتف</label><input id="pr-phone" value="${v('phone')}"></div>
  <div class="form-group"><label>نسبة المشاركة في الأرباح %</label><input type="number" id="pr-share" min="0" max="100" step="0.1" value="${p?.sharePercent||0}" placeholder="مثال: 30"></div>
</div>
    <div class="divider"></div>
    <div class="flex-between mb8"><div><strong class="text-sm">جدول العمولات</strong><div class="text-xs text-gray">خامة / عمولة م³ / من تاريخ / إلى تاريخ (فارغ=مفتوح)</div></div>
    <button class="btn btn-gray btn-sm" onclick="window._pRates.push({material:'${materials[0]?.name||''}',pricePerCubic:0,from:'${todayStr()}',to:''});window._prf()">＋</button></div>
    <div id="pr-rates"></div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="savePartner(${editId||'null'})">💾 حفظ</button>`,
    'modal-lg');
  rf();
}
function savePartner(editId){
  const name=document.getElementById('pr-name')?.value?.trim();
  if(!name)return toast('أدخل الاسم','error');
  const sharePercent=Number(document.getElementById('pr-share')?.value)||0;
  const data={name,phone:document.getElementById('pr-phone')?.value||'',sharePercent,rates:window._pRates||[]};
  if(editId){DB.update('partners',editId,data);toast('تم التعديل ✓');}else{DB.insert('partners',data);toast('تمت الإضافة ✓');}
  closeModal();nav('partners');
}
function delPartner(id,name){confirmDelete(`حذف "${name}"؟`,()=>{DB.remove('partners',id);toast('تم الحذف');nav('partners');});}


// ═══════════════════════════════════════════════════════
// PRINT / PDF
// ═══════════════════════════════════════════════════════
const PCSS_PARTIES=`*{font-family:Tahoma,'Cairo',sans-serif;margin:0;padding:0;box-sizing:border-box;direction:rtl}body{padding:12px;color:#111;font-size:11px}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1F4E78;padding-bottom:9px;margin-bottom:10px}.co{font-size:16px;font-weight:700;color:#1F4E78}.co-sub{font-size:9px;color:#666;margin-top:2px}.doc-no{font-size:18px;font-weight:700;color:#C00000;border:2px solid #C00000;padding:2px 9px;border-radius:5px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;background:#f5f8fc;padding:8px;border-radius:5px;margin-bottom:9px}.ml{font-size:9px;color:#888;margin-bottom:1px}.mv{font-weight:700;font-size:11px}table{width:100%;border-collapse:collapse;font-size:10px}thead tr{background:#1F4E78;color:#fff}thead th{padding:5px 4px;text-align:right}tbody tr:nth-child(even){background:#f5f8fc}tbody td{padding:4px;border-bottom:1px solid #eee}tfoot tr{background:#FFE699;font-weight:700}tfoot td{padding:5px 4px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:9px}.kc{border:1px solid #ddd;border-radius:4px;padding:6px;text-align:center}.kl{font-size:9px;color:#888;margin-bottom:1px}.kv{font-size:11px;font-weight:700;color:#1F4E78}.kc.red .kv{color:#C00000}.kc.green .kv{color:#00B050}.stamps{display:flex;justify-content:space-around;margin-top:22px}.stamp{text-align:center;border-top:1px solid #333;padding-top:5px;width:130px;font-size:10px}.footer{margin-top:10px;border-top:1px solid #ddd;padding-top:6px;display:flex;justify-content:space-between;font-size:9px;color:#999}@media print{@page{margin:9mm;size:A4}body{padding:0}}`;
function _n(n){return new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';}
function _d(ts){if(!ts)return '—';const d=new Date(ts);return isNaN(d)?'—':d.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});}
function _pw(title,html){const w=window.open('','_blank');const sc='<scr'+'ipt>setTimeout(()=>window.print(),600)<'+'/scr'+'ipt>';w.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>'+title+'<\/title><style>'+PCSS_PARTIES+'<\/style><\/head><body>'+html+sc+'<\/body><\/html>');w.document.close();}

function printSarki(id){
  const sk=DB.getById('sarkis',id);if(!sk)return;
  const t=calcSarkiTotals(sk.lines||[]);
  const rows=(sk.lines||[]).map((l,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${l.driverName||'—'}</td><td style="font-family:monospace">${l.plateNo||'—'}</td><td style="text-align:center">${l.trips||0}</td><td style="text-align:center">${l.cubicPerTrip||0}</td><td style="text-align:center;font-weight:700">${(l.grossCubic||0).toFixed(1)}</td><td style="text-align:center;color:#C00000">${l.discountM||0}</td><td style="text-align:center;font-weight:700;color:#1F4E78">${(l.netCubic||0).toFixed(1)}</td><td style="text-align:center">${l.sellPrice||0}</td><td style="text-align:center">${l.buyPrice||0}</td><td style="font-weight:600;color:#1F4E78">${_n(l.sellTotal)}</td></tr>`).join('');
  _pw('سركي #'+sk.id,`<div class="hdr"><div><div class="co">شركة الهنا للنقل</div><div class="co-sub">حافظة يومية — سركي سيارات</div><div class="co-sub">${_d(sk.date)}</div></div><div class="doc-no">سركي #${sk.id}</div></div>
  <div class="meta"><div><div class="ml">العميل</div><div class="mv">${sk.client}</div></div><div><div class="ml">المورد</div><div class="mv">${sk.supplier}</div></div><div><div class="ml">الخامة</div><div class="mv">${sk.material}</div></div><div><div class="ml">نوع الأعمال</div><div class="mv">${sk.workType||'—'}</div></div><div><div class="ml">لودر التحميل</div><div class="mv">${sk.loaderName||'—'}</div></div><div><div class="ml">الحالة</div><div class="mv">${sk.status}</div></div>${sk.description?'<div style="grid-column:span 3"><div class="ml">الوصف</div><div class="mv">'+sk.description+'</div></div>':''}</div>
  <table><thead><tr><th>م</th><th>السائق</th><th>اللوحة</th><th>نقلات</th><th>م³/نقلة</th><th>إجمالي م³</th><th>خصم م</th><th>صافي م³</th><th>س.بيع</th><th>س.شراء</th><th>إجمالي البيع</th></tr></thead><tbody>${rows}</tbody>
  <tfoot><tr><td colspan="3">الإجمالي</td><td style="text-align:center">${t.totalTrips}</td><td></td><td style="text-align:center">${t.totalGross.toFixed(1)}</td><td></td><td style="text-align:center;color:#1F4E78">${t.totalNet.toFixed(1)}</td><td colspan="2"></td><td>${_n(t.totalSell)}</td></tr></tfoot></table>
  <div class="kpis"><div class="kc"><div class="kl">إجمالي م³</div><div class="kv" style="color:#374151">${t.totalNet.toFixed(1)}</div></div><div class="kc"><div class="kl">إجمالي البيع</div><div class="kv">${_n(t.totalSell)}</div></div><div class="kc red"><div class="kl">إجمالي التكلفة</div><div class="kv">${_n(t.totalBuy)}</div></div><div class="kc green"><div class="kl">صافي الربح</div><div class="kv">${_n(t.totalProfit)}</div></div></div>
  ${sk.notes?'<div style="margin-top:9px;padding:7px;background:#FFF2CC;border-radius:4px"><strong>ملاحظات:</strong> '+sk.notes+'</div>':''}
  <div class="stamps"><div class="stamp">المحاسب</div><div class="stamp">مشرف الموقع</div><div class="stamp">العميل / المفوض</div></div>
  <div class="footer"><span>شركة الهنا للنقل</span><span>${_d(Date.now())}</span></div>`);
}

function printCustStmt(){
  const customers=DB.getAll('customers');
  const cs=customers.find(c=>c.name===_CS.party);
  const lastStmt=getLastStatement(_CS.party,'customer');
  const opening=lastStmt?Number(lastStmt.closingBalance)||0:Number(cs?.openingBalance)||0;
  const fd=new Date(_CS.from),td=new Date(_CS.to);
  const sarkis=DB.getAll('sarkis').filter(sk=>{const d=new Date(sk.date);return sk.client===_CS.party&&sk.status!=='ملغي'&&d>=fd&&d<=td&&(_CS.mat==='الكل'||sk.material===_CS.mat);});
  const colls=DB.getAll('journal').filter(j=>{const d=new Date(j.date);return j.entryType==='تحصيل'&&j.party===_CS.party&&d>=fd&&d<=td;});
  const totalSell=sarkis.reduce((s,r)=>s+(Number(r.totalSell)||0),0);
  const totalColl=colls.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const balance=opening+totalSell-totalColl;
  _pw('مستخلص عميل — '+_CS.party,`<div class="hdr"><div><div class="co">شركة الهنا للنقل</div><div class="co-sub">مستخلص حساب عميل</div><div class="co-sub">الفترة: ${_d(_CS.from)} — ${_d(_CS.to)}</div></div><div style="font-size:14px;font-weight:700;color:#1F4E78">${_CS.party}</div></div>
  <div class="kpis" style="margin-bottom:9px"><div class="kc"><div class="kl">الرصيد الافتتاحي</div><div class="kv">${_n(opening)}</div></div><div class="kc"><div class="kl">إجمالي المبيعات</div><div class="kv">${_n(totalSell)}</div></div><div class="kc green"><div class="kl">إجمالي التحصيلات</div><div class="kv">${_n(totalColl)}</div></div><div class="kc ${balance>0?'red':'green'}"><div class="kl">الرصيد المستحق</div><div class="kv">${_n(balance)}</div></div></div>
  <p style="font-weight:700;margin-bottom:5px">الحوافظ (${sarkis.length})</p>
  <table><thead><tr><th>#</th><th>التاريخ</th><th>الخامة</th><th>م³</th><th>إجمالي البيع</th><th>المورد</th></tr></thead>
  <tbody>${sarkis.map(sk=>`<tr><td style="font-family:monospace">#${sk.id}</td><td>${_d(sk.date)}</td><td>${sk.material}</td><td style="text-align:center">${(Number(sk.totalNet)||0).toFixed(1)}</td><td style="font-weight:600;color:#1F4E78">${_n(sk.totalSell)}</td><td>${sk.supplier}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="3">الإجمالي</td><td style="text-align:center">${sarkis.reduce((s,r)=>s+(Number(r.totalNet)||0),0).toFixed(1)}</td><td>${_n(totalSell)}</td><td></td></tr></tfoot></table>
  <p style="font-weight:700;margin:8px 0 5px">التحصيلات من اليومية (${colls.length})</p>
  <table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th><th>رقم الشيك</th><th>البيان</th></tr></thead>
  <tbody>${colls.map(c=>`<tr><td>${_d(c.date)}</td><td style="font-weight:600;color:#00B050">${_n(c.amount)}</td><td>${c.paymentType||'—'}</td><td style="font-family:monospace">${c.chequeNo||'—'}</td><td>${c.description||'—'}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="1">الإجمالي</td><td style="color:#00B050">${_n(totalColl)}</td><td colspan="3"></td></tr></tfoot></table>
  <div class="stamps"><div class="stamp">المحاسب</div><div class="stamp">المدير</div><div class="stamp">العميل / المفوض</div></div>
  <div class="footer"><span>شركة الهنا للنقل</span><span>${_d(Date.now())}</span></div>`);
}

function printSuppStmt(){
  const suppliers=DB.getAll('suppliers');
  const ss=suppliers.find(s=>s.name===_SS.party);
  const lastStmt=getLastStatement(_SS.party,'supplier');
  const opening=lastStmt?Number(lastStmt.closingBalance)||0:Number(ss?.openingBalance)||0;
  const fd=new Date(_SS.from),td=new Date(_SS.to);
  const sarkis=DB.getAll('sarkis').filter(sk=>{const d=new Date(sk.date);return sk.supplier===_SS.party&&sk.status!=='ملغي'&&d>=fd&&d<=td&&(_SS.mat==='الكل'||sk.material===_SS.mat);});
  const pmts=DB.getAll('journal').filter(j=>{const d=new Date(j.date);return j.entryType==='دفع'&&j.party===_SS.party&&d>=fd&&d<=td;});
  const totalBuy=sarkis.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);
  const totalPmt=pmts.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const balance=opening+totalBuy-totalPmt;
  _pw('مستخلص مورد — '+_SS.party,`<div class="hdr"><div><div class="co">شركة الهنا للنقل</div><div class="co-sub">مستخلص حساب مورد</div><div class="co-sub">الفترة: ${_d(_SS.from)} — ${_d(_SS.to)}</div></div><div style="font-size:14px;font-weight:700;color:#1F4E78">${_SS.party}</div></div>
  <div class="kpis" style="margin-bottom:9px"><div class="kc"><div class="kl">الرصيد الافتتاحي</div><div class="kv">${_n(opening)}</div></div><div class="kc"><div class="kl">إجمالي المشتريات</div><div class="kv">${_n(totalBuy)}</div></div><div class="kc green"><div class="kl">إجمالي المدفوعات</div><div class="kv">${_n(totalPmt)}</div></div><div class="kc ${balance>0?'red':'green'}"><div class="kl">الرصيد المستحق</div><div class="kv">${_n(balance)}</div></div></div>
  <p style="font-weight:700;margin-bottom:5px">الحوافظ — تكاليف المورد</p>
  <table><thead><tr><th>#</th><th>التاريخ</th><th>الخامة</th><th>م³</th><th>تكلفة المورد</th><th>العميل</th></tr></thead>
  <tbody>${sarkis.map(sk=>`<tr><td style="font-family:monospace">#${sk.id}</td><td>${_d(sk.date)}</td><td>${sk.material}</td><td style="text-align:center">${(Number(sk.totalNet)||0).toFixed(1)}</td><td style="font-weight:600">${_n(sk.totalBuy)}</td><td>${sk.client}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="3">الإجمالي</td><td style="text-align:center">${sarkis.reduce((s,r)=>s+(Number(r.totalNet)||0),0).toFixed(1)}</td><td>${_n(totalBuy)}</td><td></td></tr></tfoot></table>
  <p style="font-weight:700;margin:8px 0 5px">المدفوعات من اليومية</p>
  <table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th><th>رقم الشيك</th><th>البيان</th></tr></thead>
  <tbody>${pmts.map(p=>`<tr><td>${_d(p.date)}</td><td style="font-weight:600;color:#C00000">${_n(p.amount)}</td><td>${p.paymentType||'—'}</td><td style="font-family:monospace">${p.chequeNo||'—'}</td><td>${p.description||'—'}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td>الإجمالي</td><td style="color:#00B050">${_n(totalPmt)}</td><td colspan="3"></td></tr></tfoot></table>
  <div class="stamps"><div class="stamp">المحاسب</div><div class="stamp">المدير</div><div class="stamp">المورد / المفوض</div></div>
  <div class="footer"><span>شركة الهنا للنقل</span><span>${_d(Date.now())}</span></div>`);
}

function printReport(){
  const sarkis=DB.getAll('sarkis').filter(sk=>sk.status!=='ملغي');
  const materials=DB.getAll('materials');
  const fd=new Date(_RP.from),td=new Date(_RP.to);
  const filtered=sarkis.filter(sk=>{const d=new Date(sk.date);return d>=fd&&d<=td&&(_RP.mat==='الكل'||sk.material===_RP.mat);});
  const kpis={count:filtered.length,cubic:filtered.reduce((s,r)=>s+(Number(r.totalNet)||0),0),sell:filtered.reduce((s,r)=>s+(Number(r.totalSell)||0),0),buy:filtered.reduce((s,r)=>s+(Number(r.totalBuy)||0),0),profit:filtered.reduce((s,r)=>s+(Number(r.totalProfit)||0),0)};
  const matBD=materials.map(m=>{const rows=filtered.filter(r=>r.material===m.name);const sell=rows.reduce((s,r)=>s+(Number(r.totalSell)||0),0);const buy=rows.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);const profit=rows.reduce((s,r)=>s+(Number(r.totalProfit)||0),0);const cubic=rows.reduce((s,r)=>s+(Number(r.totalNet)||0),0);return{mat:m.name,count:rows.length,cubic,sell,buy,profit,margin:sell?profit/sell:0};});
  const customers=DB.getAll('customers');
  const entBD=customers.map(c=>{const rows=filtered.filter(r=>r.client===c.name);const sell=rows.reduce((s,r)=>s+(Number(r.totalSell)||0),0);const profit=rows.reduce((s,r)=>s+(Number(r.totalProfit)||0),0);const cubic=rows.reduce((s,r)=>s+(Number(r.totalNet)||0),0);return{name:c.name,count:rows.length,cubic,sell,profit,margin:sell?profit/sell:0};}).filter(e=>e.sell>0).sort((a,b)=>b.sell-a.sell);
  _pw('التقرير التحليلي',`<div class="hdr"><div><div class="co">شركة الهنا للنقل</div><div class="co-sub">التقرير التحليلي الشامل</div><div class="co-sub">الفترة: ${_d(_RP.from)} — ${_d(_RP.to)}</div></div><div style="font-size:10px;text-align:left;color:#666">${_d(Date.now())}</div></div>
  <div class="kpis" style="margin-bottom:9px"><div class="kc"><div class="kl">عدد الحوافظ</div><div class="kv" style="color:#374151">${kpis.count}</div></div><div class="kc"><div class="kl">إجمالي البيع</div><div class="kv">${_n(kpis.sell)}</div></div><div class="kc red"><div class="kl">إجمالي التكلفة</div><div class="kv">${_n(kpis.buy)}</div></div><div class="kc green"><div class="kl">صافي الربح</div><div class="kv">${_n(kpis.profit)}</div></div></div>
  <p style="font-weight:700;margin-bottom:5px">تحليل الخامات</p>
  <table><thead><tr><th>الخامة</th><th>عدد</th><th>م³</th><th>البيع</th><th>التكلفة</th><th>الربح</th><th>هامش%</th></tr></thead>
  <tbody>${matBD.map(m=>`<tr><td>${m.mat}</td><td style="text-align:center">${m.count}</td><td style="text-align:center">${m.cubic.toFixed(1)}</td><td>${_n(m.sell)}</td><td>${_n(m.buy)}</td><td style="font-weight:700;color:#00B050">${_n(m.profit)}</td><td style="text-align:center">${(m.margin*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>
  <p style="font-weight:700;margin:8px 0 5px">تحليل العملاء</p>
  <table><thead><tr><th>العميل</th><th>عدد</th><th>م³</th><th>البيع</th><th>الربح</th><th>هامش%</th></tr></thead>
  <tbody>${entBD.map(e=>`<tr><td>${e.name}</td><td style="text-align:center">${e.count}</td><td style="text-align:center">${e.cubic.toFixed(1)}</td><td>${_n(e.sell)}</td><td style="font-weight:700;color:#00B050">${_n(e.profit)}</td><td style="text-align:center">${(e.margin*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>
  <div class="footer"><span>شركة الهنا للنقل — نظام إدارة محاسبي</span><span>${_d(Date.now())}</span></div>`);
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
