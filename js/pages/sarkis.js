function buildSkThead(){
  var cols = [
    {key:'id',          label:'رقم'},
    {key:'date',        label:'التاريخ'},
    {key:'client',      label:'العميل'},
    {key:'supplier',    label:'المورد'},
    {key:'material',    label:'الخامة'},
    {key:'netM3',       label:'م³ صافي'},
    {key:'totalSell',   label:'المبيعات'},
    {key:'totalBuy',    label:'التكلفة'},
    {key:'totalProfit', label:'الربح'},
    {key:'status',      label:'الحالة'},
    {key:null,          label:'إجراء'},
  ];
  var sf  = window._SF || {};
  var out = '<tr>';
  cols.forEach(function(c){
    if(!c.key){
      out += '<th style="padding:6px 4px">'+c.label+'</th>';
    } else {
      var active = sf.sortKey === c.key;
      var arrow  = active ? (sf.sortDir===-1 ? ' ▼' : ' ▲') : ' ⇅';
      // Use data-key attribute to avoid quote issues in onclick
      out += '<th data-skey="'+c.key+'" onclick="sortSarkiBy(this.dataset.skey)" style="'
        + 'padding:6px 4px;cursor:pointer;user-select:none;white-space:nowrap;'
        + (active ? 'background:rgba(255,255,255,.2);' : '')
        + '">'
        + c.label
        + '<span style="font-size:8px;margin-right:3px">' + arrow + '</span>'
        + '</th>';
    }
  });
  out += '</tr>';
  return out;
}


function buildSkThead(){
  var cols = [
    {key:null,     label:'رقم'},
    {key:'date',   label:'التاريخ'},
    {key:'client', label:'العميل'},
    {key:'supplier',label:'المورد'},
    {key:'material',label:'الخامة'},
    {key:'netM3',  label:'م³ صافي'},
    {key:'totalSell', label:'المبيعات'},
    {key:'totalBuy',  label:'التكلفة'},
    {key:'totalProfit',label:'الربح'},
    {key:'status', label:'الحالة'},
    {key:null,     label:'إجراء'},
  ];
  var sf = window._SF || {};
  var html = '<tr>';
  cols.forEach(function(c){
    if(!c.key){
      html += '<th style="padding:6px 4px">'+c.label+'</th>';
    } else {
      var active = sf.sortKey===c.key;
      var icon   = active ? (sf.sortDir===-1 ? ' ▼':' ▲') : ' ⇅';
      html += '<th onclick="sortSarkiBy(\''+c.key+'\')" style="'
        +'padding:6px 4px;cursor:pointer;user-select:none;white-space:nowrap;'
        +(active?'text-decoration:underline;':'opacity:.85;')
        +'">'+c.label+'<span style="font-size:9px;margin-right:2px">'+icon+'</span></th>';
    }
  });
  html += '</tr>';
  return html;
}


// ── Sort column ──────────────────────────────────────────────────
function sortSarkiBy(key){
  if(window._SF.sortKey===key){
    window._SF.sortDir = -window._SF.sortDir;
  } else {
    window._SF.sortKey = key;
    window._SF.sortDir = -1;
  }
  nav('sarkis');
}

// ── Sort icon ────────────────────────────────────────────────────
function sortIcon(key){
  if(window._SF.sortKey!==key) return '<span style="opacity:.3;font-size:9px">⇅</span>';
  return window._SF.sortDir===-1
    ? '<span style="font-size:9px">▼</span>'
    : '<span style="font-size:9px">▲</span>';
}
// ═══ SARKIS / MANIFESTS ═══

// ── Global state ──────────────────────────────────────────────

// ── renderSarkis (main page) ───────────────────────────────────
function renderSarkis(){
  var recs   = DB.getAll('sarkis');
  var clients = DB.getAll('customers').map(function(c){return c.name;});

  // Filter state
  if(typeof _SF==='undefined') window._SF={client:'كل العملاء',status:'كل الحالات'};
  var filtered = recs.filter(function(s){
    if(_SF.client!=='كل العملاء' && s.client!==_SF.client) return false;
    if(_SF.status!=='كل الحالات' && s.status!==_SF.status) return false;
    return true;
  }).sort(function(a,b){
    var key = window._SF.sortKey||'date';
    var dir = window._SF.sortDir||(-1);
    var av, bv;
    if(key==='id'){        return dir*((Number(a.id)||0)-(Number(b.id)||0)); }
    if(key==='date'){      av=a.date||'';       bv=b.date||'';       return dir*av.localeCompare(bv); }
    if(key==='client'){    av=a.client||'';     bv=b.client||'';     return dir*av.localeCompare(bv,'ar'); }
    if(key==='supplier'){  av=a.supplier||'';   bv=b.supplier||'';   return dir*av.localeCompare(bv,'ar'); }
    if(key==='material'){  av=a.material||'';   bv=b.material||'';   return dir*av.localeCompare(bv,'ar'); }
    if(key==='netM3'){
      av=(a.lines||[]).reduce(function(t,l){return t+(Number(l.netCubic)||0);},0);
      bv=(b.lines||[]).reduce(function(t,l){return t+(Number(l.netCubic)||0);},0);
      return dir*(av-bv);
    }
    if(key==='totalSell'){  return dir*((Number(a.totalSell)||0)-(Number(b.totalSell)||0)); }
    if(key==='totalBuy'){   return dir*((Number(a.totalBuy)||0)-(Number(b.totalBuy)||0)); }
    if(key==='totalProfit'){return dir*((Number(a.totalProfit)||0)-(Number(b.totalProfit)||0)); }
    if(key==='status'){    av=a.status||'';     bv=b.status||'';     return dir*av.localeCompare(bv,'ar'); }
    return dir*(a.date||'').localeCompare(b.date||'');
  });

  // Totals
  var totSell=0, totBuy=0, totProfit=0, totTrips=0;
  filtered.forEach(function(s){
    totSell   += Number(s.totalSell)||0;
    totBuy    += Number(s.totalBuy)||0;
    totProfit += Number(s.totalProfit)||0;
    totTrips  += (s.lines||[]).reduce(function(t,l){return t+(Number(l.trips)||0);},0);
  });

  var cusOpts = ['كل العملاء'].concat(clients).map(function(c){
    return '<option'+(c===_SF.client?' selected':'')+'>'+c+'</option>';
  }).join('');
  var stOpts = ['كل الحالات','مفتوح','معتمد','ملغي'].map(function(st){
    return '<option'+(st===_SF.status?' selected':'')+'>'+st+'</option>';
  }).join('');

  return '<div>'
    + '<div class="page-header">'
    + '<div class="section-title" style="margin:0">📋 الحوافظ اليومية (السركي)</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn btn-primary" onclick="openSarkiModal()">＋ حافظة جديدة</button>'
    + '<button class="btn btn-gray btn-sm" onclick="openSkFilter()">فلتر/رهش/موي</button>'
    + '<button class="btn btn-green btn-sm" onclick="if(typeof importSarkiExcel===\'function\')importSarkiExcel()">📊 استيراد من Excel</button>'
    + '</div></div>'

    // Filter bar
    + '<div class="card mb12" style="padding:10px 14px">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<select onchange="_SF.client=this.value;nav(\'sarkis\')" style="border:1px solid #e2e8f0;border-radius:7px;padding:6px 10px;font-family:inherit;font-size:12px">'+cusOpts+'</select>'
    + '<select onchange="_SF.status=this.value;nav(\'sarkis\')" style="border:1px solid #e2e8f0;border-radius:7px;padding:6px 10px;font-family:inherit;font-size:12px">'+stOpts+'</select>'
    + ((_SF.client!=='كل العملاء'||_SF.status!=='كل الحالات')
        ? '<button class="btn btn-gray btn-sm" onclick="_SF={client:\'كل العملاء\',status:\'كل الحالات\'};nav(\'sarkis\')">✕ مسح</button>'
        : '')
    + '<span class="text-xs text-gray">'+filtered.length+' حافظة</span>'
    + '</div></div>'

    // KPIs
    + '<div class="grid4 mb12" style="gap:8px">'
    + kpi('إجمالي المبيعات', curr(totSell), '💰', '#16a34a')
    + kpi('إجمالي التكلفة',  curr(totBuy),  '💸', '#dc2626')
    + kpi('صافي الربح',      curr(totProfit),'📈', '#1F4E78')
    + kpi('عدد النقلات',     totTrips,       '🚛', '#d97706')
    + '</div>'

    // Table
    + '<div class="tbl-wrap"><table>'
    + '<thead>'+buildSkThead()+'</thead>'
    + '<tbody>'
    + (filtered.length===0
        ? '<tr><td colspan="11" class="tbl-empty"><span class="tbl-empty-icon">📋</span>لا توجد حوافظ — أضف حافظة جديدة</td></tr>'
        : filtered.map(function(sk){
            var netM3 = (sk.lines||[]).reduce(function(t,l){return t+(Number(l.netCubic)||0);},0);
            return '<tr>'
              +'<td class="font-bold">#'+sk.id+'</td>'
              +'<td class="text-xs">'+fmtDate(sk.date)+'</td>'
              +'<td><strong>'+sk.client+'</strong></td>'
              +'<td class="text-gray">'+sk.supplier+'</td>'
              +'<td class="text-xs">'+sk.material+'</td>'
              +'<td class="font-bold">'+netM3.toFixed(1)+'</td>'
              +'<td class="text-green font-bold">'+curr(sk.totalSell)+'</td>'
              +'<td class="text-red">'+curr(sk.totalBuy)+'</td>'
              +'<td class="font-bold" style="color:'+(sk.totalProfit>=0?'#16a34a':'#dc2626')+'">'+curr(sk.totalProfit)+'</td>'
              +'<td>'+statusBadge(sk.status||'مفتوح')+'</td>'
              +'<td><div class="flex" style="gap:4px">'
              +'<button class="btn btn-xs" style="background:#1F4E78;color:#fff;border:none;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:inherit" onclick="viewSarki('+sk.id+')">عرض</button>'
              +'<button class="btn btn-xs" style="background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:inherit" onclick="openSarkiModal('+sk.id+')">تعديل</button>'
              +(sk.status!=='معتمد'?'<button class="btn btn-xs" style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:inherit" onclick="approveSarki('+sk.id+')">اعتماد</button>':'')
              +'<button class="btn btn-xs" style="background:#dc2626;color:#fff;border:none;border-radius:5px;padding:3px 8px;cursor:pointer;font-size:10px;font-family:inherit" onclick="deleteSarki('+sk.id+')">🗑️</button>'
              +'</div></td></tr>';
          }).join(''))
    + '</tbody></table></div>'
    + '</div>';
}

function kpi(label, val, icon, color){
  return '<div class="card-sm text-center" style="border-top:3px solid '+color+'">'
    +'<div style="font-size:18px;margin-bottom:4px">'+icon+'</div>'
    +'<div style="font-size:11px;color:#64748b;margin-bottom:4px">'+label+'</div>'
    +'<div style="font-size:16px;font-weight:700;color:'+color+'">'+val+'</div>'
    +'</div>';
}



// ── Calculation Helpers ───────────────────────────────────────



function openSarkiModal(editId){
  _SK_EDIT=editId||null;
  const sk=editId?DB.getById('sarkis',editId):null;
  const customers=DB.getAll('customers');
  const suppliers=DB.getAll('suppliers');
  const materials=DB.getAll('materials');
  const trucks=DB.getAll('trucks');

  if(sk){ _SK_LINES=(sk.lines||[]).map(l=>({...l})); }
  else{
    const mat=materials[0];
    _SK_LINES=[{driverName:'',plateNo:'',truckId:'',trips:'',cubicPerTrip:'',discountM:0,
      sellPrice:mat?.defaultSellPrice||'',buyPrice:mat?.defaultBuyPrice||'',
      grossCubic:0,netCubic:0,sellTotal:0,buyTotal:0,profit:0}];
  }

  const v=(k,d='')=>sk?.[k]??d;
  const matOpts=materials.map(m=>`<option value="${m.name}" data-sell="${m.defaultSellPrice}" data-buy="${m.defaultBuyPrice}" ${v('material')===m.name||(!sk&&materials[0]?.name===m.name)?'selected':''}>${m.name}</option>`).join('');
  const cusOpts=customers.map(c=>`<option ${v('client')===c.name?'selected':''}>${c.name}</option>`).join('');
  const supOpts=suppliers.map(s=>`<option ${v('supplier')===s.name?'selected':''}>${s.name}</option>`).join('');

  const body=`
    <div class="form-row fr3 mb12">
      <div class="form-group"><label><span class="req">*</span>التاريخ</label><input type="date" id="sk-date" value="${v('date',todayStr())}"></div>
      <div class="form-group"><label><span class="req">*</span>العميل</label>
        <select id="sk-client" onchange="onSkClientChange()"><option value="">اختر</option>${cusOpts}</select>
      </div>
      <div class="form-group"><label><span class="req">*</span>المورد</label>
        <select id="sk-supplier" onchange="onSkSupplierChange()"><option value="">اختر</option>${supOpts}</select>
      </div>
    </div>
    <div class="form-row fr3 mb12">
      <div class="form-group"><label><span class="req">*</span>الخامة</label>
        <select id="sk-material" onchange="onSkMaterialChange(this)">${matOpts}</select>
      </div>
      <div class="form-group"><label>نوع الأعمال</label><input id="sk-worktype" value="${v('workType')}"></div>
      <div class="form-group"><label>لودر التحميل</label><input id="sk-loader" value="${v('loaderName')}"></div>
    </div>
    <div class="form-group mb12"><label>وصف الأعمال</label><input id="sk-desc" value="${v('description')}"></div>

    <div class="flex-between mb8">
      <div>
        <strong class="text-sm">السيارات والنقلات</strong>
        <span id="sk-price-hint" class="text-xs text-gray" style="margin-right:8px"></span>
      </div>
      <button class="btn btn-gray btn-sm" onclick="addSkLine()">＋ سطر</button>
    </div>
    <div style="overflow-x:auto;border-radius:8px;border:1px solid #e5e7eb">
      <table class="sarki-tbl" id="sk-tbl">
        <thead style="background:#1F4E78;color:#fff;font-size:10px">
          <tr>
            <th style="padding:6px 4px">م</th>
            <th style="padding:6px 4px;min-width:120px">السيارة</th>
            <th style="padding:6px 4px;min-width:80px">السائق</th>
            <th style="padding:6px 4px;min-width:70px">اللوحة</th>
            <th style="padding:6px 4px;min-width:55px">نقلات</th>
            <th style="padding:6px 4px;min-width:60px;background:#1a5276" title="تكعيب العميل">م³عميل</th>
            <th style="padding:6px 4px;min-width:60px;background:#1a3a1a" title="تكعيب المورد">م³مورد</th>
            <th style="padding:6px 4px;min-width:55px">إجمالي م³</th>
            <th style="padding:6px 4px;min-width:50px">خصم م</th>
            <th style="padding:6px 4px;min-width:55px">صافي م³</th>
            <th style="padding:6px 4px;min-width:60px">س.بيع</th>
            <th style="padding:6px 4px;min-width:60px">س.شراء</th>
            <th style="padding:6px 4px;min-width:85px">مبيعات</th>
            <th style="padding:6px 4px;min-width:85px">تكلفة</th>
            <th style="padding:6px 4px;min-width:85px">ربح</th>
            <th style="padding:6px 4px"></th>
          </tr>
        </thead>
        <tbody id="sk-body"></tbody>
        <tfoot id="sk-foot"></tfoot>
      </table>
    </div>
    <div class="form-row fr2 mt12">
      <div class="form-group"><label>ملاحظات</label><textarea id="sk-notes" rows="2">${v('notes')}</textarea></div>
      <div class="form-group"><label>الحالة</label>
        <select id="sk-status">${['مفتوح','معتمد','ملغي'].map(s=>`<option ${v('status','مفتوح')===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
    </div>`;

  openModal(editId?`تعديل سركي #${editId}`:'حافظة جديدة',body,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>
     <button class="btn btn-primary" onclick="saveSarki()">💾 حفظ الحافظة</button>`,
    'modal-xl');

  renderSkLines();
  // Trigger price update
  setTimeout(()=>{
    const matSel=document.getElementById('sk-material');
    if(matSel) onSkMaterialChange(matSel);
  },50);
}

function onSkClientChange(){
  const matSel=document.getElementById('sk-material');
  if(matSel) onSkMaterialChange(matSel);
}
function onSkSupplierChange(){
  const matSel=document.getElementById('sk-material');
  if(matSel) onSkMaterialChange(matSel);
}

function onSkMaterialChange(sel){
  const date=document.getElementById('sk-date')?.value||todayStr();
  const client=document.getElementById('sk-client')?.value||'';
  const supplier=document.getElementById('sk-supplier')?.value||'';
  const matName=sel?.value||'';

  // Get prices for this customer/supplier/material
  const cPrice=client?getCustomerPrice(client,matName,date):null;
  const sPrice=supplier?getSupplierPrice(supplier,matName,date):null;

  // Show hint
  const hint=document.getElementById('sk-price-hint');
  if(hint){
    const parts=[];
    if(cPrice!==null) parts.push(`سعر بيع ${client}: <strong class="text-brand">${cPrice}</strong>`);
    if(sPrice!==null) parts.push(`سعر شراء ${supplier}: <strong class="text-red">${sPrice}</strong>`);
    hint.innerHTML=parts.length?'⚡ '+parts.join(' | '):'';
  }

  // Update all lines with new prices (but allow manual override)
  const mat=DB.getAll('materials').find(m=>m.name===matName);
  const defSell=cPrice??mat?.defaultSellPrice??0;
  const defBuy=sPrice??mat?.defaultBuyPrice??0;

  _SK_LINES=_SK_LINES.map(l=>calcLine({...l,sellPrice:defSell,buyPrice:defBuy}));
  renderSkLines();
}

function renderSkLines(){
  const trucks=DB.getAll('trucks');
  const body=document.getElementById('sk-body');
  if(!body) return;
  body.innerHTML=_SK_LINES.map((line,i)=>`
    <tr id="sk-row-${i}">
      <td class="calc-cell">${i+1}</td>
      <td><select style="font-size:10px;border:1px solid #e5e7eb;border-radius:4px;padding:3px 4px;width:100%" onchange="onSkTruckChange(${i},this)">
        <option value="">— يدوي —</option>
        ${trucks.map(t=>`<option value="${t.id}" data-plate="${t.plateNo}" data-cubic="${t.cubic||''}" data-driver="${t.driverName||''}">${t.plateNo}${t.cubic?' ('+t.cubic+'م³)':''}</option>`).join('')}
      </select></td>
      <td><input placeholder="السائق" value="${line.driverName||''}" oninput="_SK_LINES[${i}].driverName=this.value" style="min-width:75px"></td>
      <td><input placeholder="اللوحة" value="${line.plateNo||''}" oninput="_SK_LINES[${i}].plateNo=this.value" style="font-family:monospace;min-width:65px"></td>
      <td><input type="number" min="0" value="${line.trips||''}" placeholder="0" oninput="_SK_LINES[${i}].trips=this.value;recalcSkLine(${i})" style="min-width:50px"></td>
      <td><input type="number" min="0" step="0.01" value="${line.cubicSell??line.cubicPerTrip??''}" placeholder="0"
        title="تكعيب العميل — يؤثر على سعر البيع فقط"
        oninput="_SK_LINES[${i}].cubicSell=Number(this.value);recalcSkLine(${i})"
        style="min-width:55px;border-bottom:2px solid #1a5276"></td>
      <td><input type="number" min="0" step="0.01" value="${line.cubicBuy??line.cubicPerTrip??''}" placeholder="0"
        title="تكعيب المورد — يؤثر على سعر الشراء فقط"
        oninput="_SK_LINES[${i}].cubicBuy=Number(this.value);recalcSkLine(${i})"
        style="min-width:55px;border-bottom:2px solid #1a3a1a"></td>
      <td class="calc-cell" id="sk-g-${i}">${(line.grossSell??line.grossCubic??0).toFixed(1)}</td>
      <td><input type="number" min="0" value="${line.discountM||''}" placeholder="0" oninput="_SK_LINES[${i}].discountM=this.value;recalcSkLine(${i})" style="min-width:45px;color:#dc2626"></td>
      <td class="calc-cell text-brand" id="sk-n-${i}">${(line.netSell??line.netCubic??0).toFixed(1)}</td>
      <td><input type="number" min="0" value="${line.sellPrice||''}" placeholder="0" oninput="_SK_LINES[${i}].sellPrice=this.value;recalcSkLine(${i})" style="min-width:55px"></td>
      <td><input type="number" min="0" value="${line.buyPrice||''}" placeholder="0" oninput="_SK_LINES[${i}].buyPrice=this.value;recalcSkLine(${i})" style="min-width:55px"></td>
      <td class="calc-cell nowrap text-brand" id="sk-s-${i}">${curr(line.sellTotal)}</td>
      <td class="calc-cell nowrap text-gray" id="sk-b-${i}">${curr(line.buyTotal)}</td>
      <td class="calc-cell nowrap font-bold ${(line.profit||0)>=0?'text-green':'text-red'}" id="sk-p-${i}">${curr(line.profit)}</td>
      <td>${_SK_LINES.length>1?`<button style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:13px;padding:2px" onclick="removeSkLine(${i})">✕</button>`:''}</td>
    </tr>`).join('');
  updateSkFoot();
}

function recalcSkLine(i){
  _SK_LINES[i]=calcLine(_SK_LINES[i]);
  const l=_SK_LINES[i];
  const g=document.getElementById(`sk-g-${i}`);const n=document.getElementById(`sk-n-${i}`);
  const s=document.getElementById(`sk-s-${i}`);const b=document.getElementById(`sk-b-${i}`);const p=document.getElementById(`sk-p-${i}`);
  if(g)g.textContent=(l.grossCubic||0).toFixed(1);
  if(n)n.textContent=(l.netCubic||0).toFixed(1);
  if(s)s.textContent=curr(l.sellTotal);
  if(b)b.textContent=curr(l.buyTotal);
  if(p){p.textContent=curr(l.profit);p.className=`calc-cell nowrap font-bold ${l.profit>=0?'text-green':'text-red'}`;}
  updateSkFoot();
}

function updateSkFoot(){
  const t=calcSarkiTotals(_SK_LINES);
  const foot=document.getElementById('sk-foot');
  if(!foot)return;
  foot.innerHTML=`<tr>
    <td colspan="4" style="font-weight:700">المجموع</td>
    <td style="text-align:center;font-weight:700">${num(t.totalTrips)}</td>
    <td></td>
    <td style="text-align:center;font-weight:700">${t.totalGross.toFixed(1)}</td>
    <td></td>
    <td style="text-align:center;font-weight:700;color:#1F4E78">${t.totalNet.toFixed(1)}</td>
    <td colspan="2"></td>
    <td style="font-weight:700;color:#1F4E78">${curr(t.totalSell)}</td>
    <td style="font-weight:700;color:#374151">${curr(t.totalBuy)}</td>
    <td style="font-weight:700;color:#16a34a">${curr(t.totalProfit)}</td>
    <td></td>
  </tr>`;
}

function onSkTruckChange(i,sel){
  const opt=sel.options[sel.selectedIndex];
  if(opt.value){
    _SK_LINES[i].plateNo=opt.dataset.plate||'';
    var cubic=Number(opt.dataset.cubic)||0;
    _SK_LINES[i].cubicPerTrip=cubic;
    _SK_LINES[i].cubicSell=cubic;
    _SK_LINES[i].cubicBuy=cubic;
    _SK_LINES[i].driverName=_SK_LINES[i].driverName||opt.dataset.driver||'';
    _SK_LINES[i].truckId=opt.value;
    recalcSkLine(i);
    renderSkLines();
  }
}

function addSkLine(){
  const last=_SK_LINES[_SK_LINES.length-1]||{};
  _SK_LINES.push(calcLine({driverName:'',plateNo:last.plateNo||'',truckId:'',
    trips:'',cubicPerTrip:last.cubicPerTrip||'',discountM:0,
    sellPrice:last.sellPrice||0,buyPrice:last.buyPrice||0,
    grossCubic:0,netCubic:0,sellTotal:0,buyTotal:0,profit:0}));
  renderSkLines();
}
function removeSkLine(i){ if(_SK_LINES.length<=1)return; _SK_LINES.splice(i,1); renderSkLines(); }

function saveSarki(){
  const client=document.getElementById('sk-client')?.value;
  const supplier=document.getElementById('sk-supplier')?.value;
  const material=document.getElementById('sk-material')?.value;
  if(!client)  return toast('اختر العميل','error');
  if(!supplier)return toast('اختر المورد','error');
  if(!material)return toast('اختر الخامة','error');
  const lines=_SK_LINES.map(calcLine);
  const totals=calcSarkiTotals(lines);
  const data={
    date:document.getElementById('sk-date')?.value||todayStr(),
    client,supplier,material,
    workType:document.getElementById('sk-worktype')?.value||'',
    loaderName:document.getElementById('sk-loader')?.value||'',
    description:document.getElementById('sk-desc')?.value||'',
    notes:document.getElementById('sk-notes')?.value||'',
    status:document.getElementById('sk-status')?.value||'مفتوح',
    lines,...totals,
  };
  if(_SK_EDIT){DB.update('sarkis',_SK_EDIT,data);toast('تم التعديل ✓');}
  else{DB.insert('sarkis',data);toast('تمت الإضافة ✓');}
  closeModal();nav('sarkis');
}

function approveSarki(id){DB.update('sarkis',id,{status:'معتمد',approvedAt:Date.now()});toast('✅ تم الاعتماد');nav('sarkis');}
function deleteSarki(id){const sk=DB.getById('sarkis',id);confirmDelete(`حذف السركي #${id}؟`,()=>{DB.remove('sarkis',id);toast('تم الحذف');nav('sarkis');});}

function viewSarki(id){
  const sk=DB.getById('sarkis',id);if(!sk)return;
  const t=calcSarkiTotals(sk.lines||[]);
  openModal(`سركي #${sk.id} — ${sk.client}`,`
    <div class="grid3 mb12" style="background:#f8fafc;border-radius:8px;padding:10px;gap:6px">
      ${[['التاريخ',fmtDate(sk.date)],['العميل',sk.client],['المورد',sk.supplier],['الخامة',sk.material],['نوع الأعمال',sk.workType||'—'],['الحالة',sk.status]]
        .map(([l,v])=>`<div><div class="text-xs text-gray mb4">${l}</div><strong>${v}</strong></div>`).join('')}
    </div>
    <div style="overflow-x:auto;border-radius:7px;border:1px solid #e5e7eb">
      <table style="font-size:10px">
        <thead style="background:#1F4E78;color:#fff"><tr>
          ${['م','السائق','اللوحة','نقلات','م³/نقلة','إجمالي م³','خصم','صافي م³','س.بيع','س.شراء','مبيعات','تكلفة','ربح']
            .map(h=>`<th style="padding:6px 5px;white-space:nowrap">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${(sk.lines||[]).map((l,i)=>`<tr style="${i%2?'background:#f8fafc':''}">
            <td style="padding:5px;text-align:center;color:#64748b">${i+1}</td>
            <td style="padding:5px">${l.driverName||'—'}</td>
            <td style="padding:5px;font-family:monospace">${l.plateNo||'—'}</td>
            <td style="padding:5px;text-align:center">${l.trips||0}</td>
            <td style="padding:5px;text-align:center">${l.cubicPerTrip||0}</td>
            <td style="padding:5px;text-align:center;font-weight:700">${(l.grossCubic||0).toFixed(1)}</td>
            <td style="padding:5px;text-align:center;color:#dc2626">${l.discountM||0}</td>
            <td style="padding:5px;text-align:center;font-weight:700;color:#1F4E78">${(l.netCubic||0).toFixed(1)}</td>
            <td style="padding:5px;text-align:center">${l.sellPrice||0}</td>
            <td style="padding:5px;text-align:center">${l.buyPrice||0}</td>
            <td style="padding:5px;font-weight:600;color:#1F4E78">${curr(l.sellTotal)}</td>
            <td style="padding:5px">${curr(l.buyTotal)}</td>
            <td style="padding:5px;font-weight:700;color:${(l.profit||0)>=0?'#16a34a':'#dc2626'}">${curr(l.profit)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr style="background:#fefce8;font-weight:700">
          <td colspan="4" style="padding:6px 5px">المجموع</td>
          <td style="padding:6px 5px;text-align:center">${t.totalGross.toFixed(1)}</td>
          <td></td>
          <td style="padding:6px 5px;text-align:center;color:#1F4E78">${t.totalNet.toFixed(1)}</td>
          <td colspan="2"></td>
          <td style="padding:6px 5px;color:#1F4E78">${curr(t.totalSell)}</td>
          <td style="padding:6px 5px">${curr(t.totalBuy)}</td>
          <td style="padding:6px 5px;color:#16a34a">${curr(t.totalProfit)}</td>
        </tr></tfoot>
      </table>
    </div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إغلاق</button>
     <button class="btn btn-primary" onclick="printSarki(${sk.id})">🖨️ طباعة</button>
     ${sk.status==='مفتوح'?`<button class="btn btn-green" onclick="approveSarki(${sk.id});closeModal()">✅ اعتماد</button>`:''}`,
    'modal-xl');
}


// ═══════════════════════════════════════════════════════
// JOURNAL — دفتر اليومية الذكي
// ═══════════════════════════════════════════════════════
let _JRN_TAB='all';
const ACCT_CUSTOMERS='1010'; // ذمم العملاء
const ACCT_SUPPLIERS='2001'; // ذمم الموردين

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
// ── Filter Modal ──────────────────────────────────────────────
function openSkFilter(){
  openModal('فلتر/رهش/موي — السركي',
    '<div class="form-group mb10"><label>العميل</label>'
    +'<select id="sf-client" style="width:100%"><option>كل العملاء</option>'
    +DB.getAll('customers').map(function(c){return '<option'+(window._SF&&window._SF.client===c.name?' selected':'')+'>'+c.name+'</option>';}).join('')
    +'</select></div>'
    +'<div class="form-group mb10"><label>الحالة</label>'
    +'<select id="sf-status" style="width:100%">'
    +['كل الحالات','مفتوح','معتمد','ملغي'].map(function(st){return '<option'+(window._SF&&window._SF.status===st?' selected':'')+'>'+st+'</option>';}).join('')
    +'</select></div>',
    '<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>'
    +'<button class="btn btn-primary" onclick="applySkFilter()">تطبيق</button>',
    'modal-sm');
}

function applySkFilter(){
  window._SF = {
    client: document.getElementById('sf-client')?.value || 'كل العملاء',
    status: document.getElementById('sf-status')?.value || 'كل الحالات',
  };
  closeModal();
  nav('sarkis');
}

// ── Excel Import wrapper ──────────────────────────────────────
function importSarkiExcel(){
  if(typeof openSarkiImportModal === 'function'){
    openSarkiImportModal();
  } else {
    toast('ميزة الاستيراد غير متاحة حالياً','error');
  }
}
