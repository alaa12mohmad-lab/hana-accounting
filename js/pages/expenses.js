// ═══ EXPENSES & FUEL ═══

function renderExpenses(){
  const expenses=DB.getAll('expenses').sort((a,b)=>new Date(b.date)-new Date(a.date));
  const trucks=DB.getAll('trucks');
  const cats=['الكل',...EXP_CATS];

  // Apply filters
  const filtered=expenses.filter(e=>{
    if(_EXP_FILTER.cat!=='الكل'&&e.category!==_EXP_FILTER.cat) return false;
    if(_EXP_FILTER.truck&&e.truckId&&e.truckId!==_EXP_FILTER.truck) return false;
    if(_EXP_FILTER.from&&e.date<_EXP_FILTER.from) return false;
    if(_EXP_FILTER.to&&e.date>_EXP_FILTER.to) return false;
    return true;
  });

  const total=filtered.reduce((s,e)=>s+(Number(e.amount)||0),0);

  // Category summary for filtered
  const catSummary={};
  filtered.forEach(e=>{ catSummary[e.category]=(catSummary[e.category]||0)+(Number(e.amount)||0); });

  const topCat=Object.entries(catSummary).sort((a,b)=>b[1]-a[1]);

  const catColors={
    'وقود':'orange',
    'صيانة وإصلاح':'red',
    'رواتب وأجور':'purple',
    'إيجار':'blue',
    'مرافق (ماء/كهرباء/تلفون)':'teal',
    'تأمين':'green',
    'رسوم حكومية':'gray',
    'مصاريف إدارية':'yellow',
    'أخرى':'gray',
  };

  return `<div>
    <div class="page-header">
      <div class="flex-wrap">
        <button class="btn btn-primary" onclick="openExpModal()">＋ إضافة مصروف</button>
        <button class="btn btn-orange btn-sm" onclick="openExpModal('وقود')">⛽ تعبئة وقود</button>
        <button class="btn btn-red btn-sm" onclick="openExpModal('صيانة وإصلاح')">🔧 صيانة</button>
        <button class="btn btn-purple btn-sm" style="background:#7c3aed" onclick="openExpModal('رواتب وأجور')">👷 راتب</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb12">
      <div class="form-row fr4">
        <div class="form-group"><label>الفئة</label>
          <select onchange="_EXP_FILTER.cat=this.value;nav('expenses')">
            ${cats.map(c=>`<option ${_EXP_FILTER.cat===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>السيارة</label>
          <select onchange="_EXP_FILTER.truck=this.value;nav('expenses')">
            <option value="">كل السيارات</option>
            ${trucks.map(t=>`<option value="${t.id}" ${_EXP_FILTER.truck===t.id?'selected':''}>${t.plateNo}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>من تاريخ</label>
          <input type="date" value="${_EXP_FILTER.from}" onchange="_EXP_FILTER.from=this.value;nav('expenses')">
        </div>
        <div class="form-group"><label>إلى تاريخ</label>
          <input type="date" value="${_EXP_FILTER.to}" onchange="_EXP_FILTER.to=this.value;nav('expenses')">
        </div>
      </div>
      <div class="flex" style="margin-top:6px">
        <button class="btn btn-gray btn-sm" onclick="_EXP_FILTER={cat:'الكل',from:'',to:'',truck:''};nav('expenses')">✕ مسح الفلاتر</button>
        <span class="text-xs text-gray" style="margin-right:8px">${filtered.length} مصروف — إجمالي: <strong class="text-red">${curr(total)}</strong></span>
      </div>
    </div>

    <!-- Category breakdown -->
    ${topCat.length>0?`
    <div class="grid4 mb12">
      ${topCat.slice(0,4).map(([cat,amt])=>`
        <div class="card-sm">
          <div class="text-xs text-gray mb4">${cat}</div>
          <div class="font-bold text-red tabular">${curr(amt)}</div>
          <div style="height:4px;background:#f1f5f9;border-radius:2px;margin-top:6px">
            <div style="height:4px;background:#ef4444;border-radius:2px;width:${Math.min(100,(amt/total*100)).toFixed(0)}%"></div>
          </div>
          <div class="text-xs text-gray mt4">${(amt/total*100).toFixed(1)}%</div>
        </div>`).join('')}
    </div>`:''}

    <!-- Table -->
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>التاريخ</th><th>الفئة</th><th>المبلغ</th><th>السيارة</th>
        <th>الكمية/الوحدة</th><th>السعر/وحدة</th><th>المرجع</th><th>البيان</th><th>إجراء</th>
      </tr></thead>
      <tbody>
        ${filtered.map(e=>{
          const truck=e.truckId?DB.getById('trucks',e.truckId):null;
          return `<tr>
            <td>${fmtDate(e.date)}</td>
            <td>${badge(e.category,catColors[e.category]||'gray')}</td>
            <td class="tabular font-bold text-red">${curr(e.amount)}</td>
            <td class="font-mono text-sm">${truck?truck.plateNo:e.truckPlate||'—'}</td>
            <td class="tabular text-gray">${e.qty?e.qty+' '+(e.unit||''):e.unit||'—'}</td>
            <td class="tabular text-gray">${e.unitPrice?curr(e.unitPrice):'—'}</td>
            <td class="font-mono text-xs text-gray">${e.receiptNo||'—'}</td>
            <td class="text-gray">${e.description||'—'}</td>
            <td><div class="flex" style="gap:3px">
              <button class="btn-icon bi-edit" onclick="openExpModal('',${e.id})">✏️</button>
              <button class="btn-icon bi-del" onclick="deleteExp(${e.id})">🗑️</button>
            </div></td>
          </tr>`;
        }).join('')||`<tr><td colspan="9" class="tbl-empty"><span class="tbl-empty-icon">💸</span>لا توجد مصروفات</td></tr>`}
      </tbody>
      ${filtered.length>0?`<tfoot><tr>
        <td colspan="2">الإجمالي</td>
        <td class="tabular font-bold text-red">${curr(total)}</td>
        <td colspan="6"></td>
      </tr></tfoot>`:''}
    </table></div>
  </div>`;
}

function openExpModal(defaultCat, editId){
  const e=editId?DB.getById('expenses',editId):null;
  const trucks=DB.getAll('trucks');
  const suppliers=DB.getAll('suppliers');
  const defCat=e?.category||defaultCat||EXP_CATS[0];
  const v=(k,d='')=>e?.[k]??d;
  const isFuel=defCat==='وقود';
  const isMaint=defCat==='صيانة وإصلاح';
  const isSalary=defCat==='رواتب وأجور';

  const truckOpts=trucks.map(t=>`<option value="${t.id}" ${v('truckId')===t.id?'selected':''}>${t.plateNo}${t.driverName?' — '+t.driverName:''}</option>`).join('');
  const suppOpts=suppliers.map(s=>`<option ${v('supplierId')===s.name?'selected':''}>${s.name}</option>`).join('');

  openModal(editId?'تعديل مصروف':(defaultCat?`إضافة: ${defaultCat}`:'إضافة مصروف'),`
    <div class="form-row fr2 mb10">
      <div class="form-group"><label><span class="req">*</span>التاريخ</label>
        <input type="date" id="ex-date" value="${v('date',todayStr())}">
      </div>
      <div class="form-group"><label><span class="req">*</span>الفئة</label>
        <select id="ex-cat" onchange="onExpCatChange(this)">
          ${EXP_CATS.map(c=>`<option ${defCat===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Fuel specific fields -->
    <div id="ex-fuel-row" style="${isFuel?'':'display:none'}" class="card-sm mb10" style="background:#fff7ed">
      <div style="font-size:10px;font-weight:700;color:#d97706;margin-bottom:8px">⛽ بيانات الوقود</div>
      <div class="form-row fr3">
        <div class="form-group"><label>عدد اللترات</label>
          <input type="number" id="ex-liters" value="${v('qty')}" placeholder="0" oninput="calcFuelTotal()">
        </div>
        <div class="form-group"><label>سعر اللتر (ج.م)</label>
          <input type="number" id="ex-literprice" value="${v('unitPrice')}" placeholder="0.00" oninput="calcFuelTotal()">
        </div>
        <div class="form-group"><label>قراءة العداد (اختياري)</label>
          <input type="number" id="ex-odometer" value="${v('odometer')}" placeholder="كم">
        </div>
      </div>
    </div>

    <!-- Maintenance specific -->
    <div id="ex-maint-row" style="${isMaint?'':'display:none'}" class="form-group mb10">
      <label>نوع الصيانة</label>
      <select id="ex-maint-type">
        ${['تغيير زيت','فلاتر','إطارات','فرامل','محرك','كهرباء','هيكل','فحص دوري','أخرى']
          .map(t=>`<option ${v('maintType')===t?'selected':''}>${t}</option>`).join('')}
      </select>
    </div>

    <!-- Salary specific -->
    <div id="ex-salary-row" style="${isSalary?'':'display:none'}" class="form-row fr2 mb10">
      <div class="form-group"><label>اسم الموظف / السائق</label>
        <input id="ex-empname" value="${v('empName')}" placeholder="اسم الموظف">
      </div>
      <div class="form-group"><label>الشهر</label>
        <input type="month" id="ex-month" value="${v('month',new Date().toISOString().slice(0,7))}">
      </div>
    </div>

    <div class="form-row fr2 mb10">
      <div class="form-group"><label><span class="req">*</span>المبلغ الإجمالي (ج.م)</label>
        <input type="number" id="ex-amount" value="${v('amount')}" placeholder="0.00">
      </div>
      <div class="form-group"><label>السيارة المرتبطة</label>
        <select id="ex-truck"><option value="">— غير مرتبطة —</option>${truckOpts}</select>
      </div>
    </div>
    <div class="form-row fr2 mb10">
      <div class="form-group"><label>الجهة المموِّلة / المورد</label>
        <select id="ex-supp"><option value="">—</option>${suppOpts}</select>
      </div>
      <div class="form-group"><label>رقم الفاتورة / الإيصال</label>
        <input id="ex-receipt" value="${v('receiptNo')}" placeholder="INV-001">
      </div>
    </div>
    <div class="form-group"><label>البيان / الوصف</label>
      <input id="ex-desc" value="${v('description')}" placeholder="تفاصيل إضافية">
    </div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" onclick="saveExp(${editId||'null'})">💾 حفظ</button>`,
    'modal-md');
}

function onExpCatChange(sel){
  const cat=sel.value;
  document.getElementById('ex-fuel-row').style.display   = cat==='وقود'?'':'none';
  document.getElementById('ex-maint-row').style.display  = cat==='صيانة وإصلاح'?'':'none';
  document.getElementById('ex-salary-row').style.display = cat==='رواتب وأجور'?'':'none';
}

function calcFuelTotal(){
  const liters=Number(document.getElementById('ex-liters')?.value)||0;
  const price =Number(document.getElementById('ex-literprice')?.value)||0;
  const total=liters*price;
  const el=document.getElementById('ex-amount');
  if(el&&total>0) el.value=total.toFixed(2);
}

function saveExp(editId){
  const cat=document.getElementById('ex-cat')?.value;
  const amt=Number(document.getElementById('ex-amount')?.value);
  const date=document.getElementById('ex-date')?.value||todayStr();
  if(!amt)return toast('أدخل المبلغ','error');
  const truckSel=document.getElementById('ex-truck');
  const truckId=truckSel?.value||'';
  const truck=truckId?DB.getById('trucks',truckId):null;
  const data={
    date, category:cat,
    amount:amt,
    truckId, truckPlate:truck?.plateNo||'',
    supplierId:document.getElementById('ex-supp')?.value||'',
    receiptNo:document.getElementById('ex-receipt')?.value||'',
    description:document.getElementById('ex-desc')?.value||'',
    // Fuel
    qty:Number(document.getElementById('ex-liters')?.value)||0,
    unitPrice:Number(document.getElementById('ex-literprice')?.value)||0,
    unit:cat==='وقود'?'لتر':'',
    odometer:Number(document.getElementById('ex-odometer')?.value)||0,
    // Maintenance
    maintType:document.getElementById('ex-maint-type')?.value||'',
    // Salary
    empName:document.getElementById('ex-empname')?.value||'',
    month:document.getElementById('ex-month')?.value||'',
  };
  if(editId){DB.update('expenses',editId,data);toast('تم التعديل ✓');}
  else{DB.insert('expenses',data);toast('تمت الإضافة ✓');}
  closeModal();nav('expenses');
}
function deleteExp(id){confirmDelete('حذف هذا المصروف؟',()=>{DB.remove('expenses',id);toast('تم الحذف');nav('expenses');});}

// ═══════════════════════════════════════════════════════
// INCOME STATEMENT — قائمة الدخل الحقيقية
// ═══════════════════════════════════════════════════════
let _IS={from:'2026-01-01',to:todayStr()};