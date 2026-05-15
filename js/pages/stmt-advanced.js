// ── Stub pages (implemented in other files or pending) ────────────
function renderStmtHistory(){
  if(typeof renderCustStmt==='function') return renderCustStmt();
  return '<div class="card"><div class="section-title">📋 سجل المستخلصات</div>'
    +'<p class="text-gray">يتم تحميل هذه الصفحة من statements.js</p></div>';
}

function renderRunningBal(){
  return '<div class="card"><div class="section-title">📊 كشف الحساب المتحرك</div>'
    +'<p class="text-gray text-xs mt8">اذهب إلى: مستخلص العميل ← اختر العميل ← كشف الحساب</p></div>';
}

function renderNotes(){
  return '<div class="card"><div class="section-title">📝 إشعارات المديونية</div>'
    +'<p class="text-gray text-xs mt8">الإشعارات متاحة من صفحة المستخلصات</p></div>';
}
// ═══════════════════════════════════════════════════════════════════
// DETAILED QUANTITY STATEMENTS — كشف كميات تفصيلي
// صفحتان: كشف العميل + كشف المورد
// ═══════════════════════════════════════════════════════════════════

// ── كشف كميات العميل ─────────────────────────────────────────────
function renderClientQty(){
  var customers = DB.getAll('customers').map(function(c){ return c.name; });
  var selClient = window._CQ_CLIENT || '';
  var selFrom   = window._CQ_FROM   || '';
  var selTo     = window._CQ_TO     || '';

  // Build rows from all sarkis
  var rows = [];
  DB.getAll('sarkis').forEach(function(sk){
    if(selClient && sk.client !== selClient) return;
    if(selFrom && sk.date < selFrom) return;
    if(selTo   && sk.date > selTo)   return;
    (sk.lines||[]).forEach(function(ln, li){
      rows.push({
        skId: sk.id, lineIdx: li,
        date: sk.date, client: sk.client,
        supplier: sk.supplier, material: sk.material,
        workType: sk.workType||'',
        plateNo:    ln.plateNo||'',
        driverName: ln.driverName||'',
        trips:     Number(ln.trips)||0,
        cubicSell: ln.cubicSell!=null ? Number(ln.cubicSell) : Number(ln.cubicPerTrip)||0,
        discountM: Number(ln.discountM)||0,
        sellPrice: Number(ln.sellPrice)||0,
        netSell:   Number(ln.netSell||ln.netCubic)||0,
        sellTotal: Number(ln.sellTotal)||0,
        status:    sk.status||'مفتوح',
      });
    });
  });

  // Sort by date desc
  rows.sort(function(a,b){ return b.date.localeCompare(a.date) || b.skId-a.skId; });

  // Totals
  var totTrips = 0, totCubic = 0, totAmount = 0;
  rows.forEach(function(r){
    totTrips  += r.trips;
    var net    = Math.max(0, r.trips*r.cubicSell - r.discountM);
    totCubic  += net;
    totAmount += net * r.sellPrice;
  });

  var cusOpts = ['<option value="">— كل العملاء —</option>']
    .concat(customers.map(function(c){
      return '<option value="'+c+'"'+(c===selClient?' selected':'')+'>'+c+'</option>';
    })).join('');

  return '<div>'
    +'<div class="page-header">'
    +'<div><div class="section-title" style="margin:0">📊 كشف كميات العميل التفصيلي</div>'
    +'<p class="text-xs text-gray mt4">عرض وتعديل كل نقلة بشكل مباشر — التعديل يُحدّث الحافظة تلقائياً</p></div>'
    +'</div>'

    // Filter bar
    +'<div class="card mb12" style="padding:10px 14px">'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
    +'<div class="form-group" style="margin:0;min-width:180px"><label style="font-size:10px">العميل</label>'
    +'<select onchange="window._CQ_CLIENT=this.value;nav(\'clientQty\')" style="width:100%">'+cusOpts+'</select></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">من</label>'
    +'<input type="date" value="'+selFrom+'" onchange="window._CQ_FROM=this.value;nav(\'clientQty\')"></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">إلى</label>'
    +'<input type="date" value="'+selTo+'" onchange="window._CQ_TO=this.value;nav(\'clientQty\')"></div>'
    +'<button class="btn btn-gray btn-sm" onclick="window._CQ_CLIENT=\'\';window._CQ_FROM=\'\';window._CQ_TO=\'\';nav(\'clientQty\')">✕ مسح</button>'
    +'<button class="btn btn-gray btn-sm" onclick="printClientQty()">🖨️ طباعة</button>'
    +'</div></div>'

    // KPIs
    +'<div class="grid3 mb12" style="gap:8px">'
    +'<div class="card-sm text-center" style="border-top:3px solid #1F4E78">'
    +'<div class="text-xs text-gray mb4">إجمالي النقلات</div>'
    +'<div style="font-size:20px;font-weight:700;color:#1F4E78">'+totTrips+'</div></div>'
    +'<div class="card-sm text-center" style="border-top:3px solid #059669">'
    +'<div class="text-xs text-gray mb4">إجمالي م³ صافي</div>'
    +'<div style="font-size:20px;font-weight:700;color:#059669">'+totCubic.toFixed(1)+'</div></div>'
    +'<div class="card-sm text-center" style="border-top:3px solid #d97706">'
    +'<div class="text-xs text-gray mb4">إجمالي المبيعات</div>'
    +'<div style="font-size:18px;font-weight:700;color:#d97706">'+curr(totAmount)+'</div></div>'
    +'</div>'

    // Table
    +'<div class="tbl-wrap"><table id="cq-table">'
    +'<thead><tr>'
    +'<th>الحافظة</th><th>التاريخ</th><th>العميل</th><th>المورد</th>'
    +'<th>الخامة</th><th>السيارة</th><th>السائق</th>'
    +'<th style="background:#1a5276;color:#fff">نقلات</th>'
    +'<th style="background:#1a5276;color:#fff">م³عميل</th>'
    +'<th style="background:#1a5276;color:#fff">خصم م</th>'
    +'<th>م³ صافي</th>'
    +'<th style="background:#1a5276;color:#fff">سعر البيع</th>'
    +'<th>إجمالي البيع</th>'
    +'<th>الحالة</th><th>حفظ</th>'
    +'</tr></thead>'
    +'<tbody>'
    +(rows.length===0
      ? '<tr><td colspan="15" class="tbl-empty"><span class="tbl-empty-icon">📊</span>لا توجد بيانات — اختر عميلاً أو غيّر الفلتر</td></tr>'
      : rows.map(function(r){
          var net  = Math.max(0, r.trips*r.cubicSell - r.discountM);
          var tot  = net * r.sellPrice;
          var rowId = 'cq-'+r.skId+'-'+r.lineIdx;
          return '<tr id="'+rowId+'">'
            +'<td><a href="#" onclick="openSarkiModal('+r.skId+');return false" style="color:#1F4E78;font-weight:700">#'+r.skId+'</a></td>'
            +'<td class="text-xs">'+fmtDate(r.date)+'</td>'
            +'<td class="text-xs"><strong>'+r.client+'</strong></td>'
            +'<td class="text-xs text-gray">'+r.supplier+'</td>'
            +'<td class="text-xs">'+r.material+'</td>'
            +'<td class="text-xs">'+r.plateNo+'</td>'
            +'<td class="text-xs">'+r.driverName+'</td>'
            // Editable cells
            +'<td><input type="number" min="0" value="'+r.trips+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="trips"'
            +' onchange="updateQtyCell(this)" style="width:55px;text-align:center;border:1px solid #e2e8f0;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.cubicSell+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="cubicSell"'
            +' onchange="updateQtyCell(this)" style="width:60px;text-align:center;border:1px solid #1a5276;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.discountM+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="discountM"'
            +' onchange="updateQtyCell(this)" style="width:55px;text-align:center;border:1px solid #dc2626;border-radius:4px;padding:2px 4px;font-family:inherit;color:#dc2626"></td>'
            // Calculated
            +'<td class="font-bold text-center" id="net-c-'+r.skId+'-'+r.lineIdx+'">'+net.toFixed(1)+'</td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.sellPrice+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="sellPrice"'
            +' onchange="updateQtyCell(this)" style="width:65px;text-align:center;border:1px solid #1a5276;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td class="font-bold text-green text-center" id="tot-c-'+r.skId+'-'+r.lineIdx+'">'+curr(tot)+'</td>'
            +'<td>'+statusBadge(r.status)+'</td>'
            +'<td><button class="btn btn-xs" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-mode="client"'
            +' onclick="saveQtyRow(this)" style="background:#1F4E78;color:#fff;border:none;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:10px;font-family:inherit">💾</button></td>'
            +'</tr>';
        }).join(''))
    +'</tbody></table></div>'
    +'</div>';
}

// ── كشف كميات المورد ─────────────────────────────────────────────
function renderSupplierQty(){
  var suppliers = DB.getAll('suppliers').map(function(s){ return s.name; });
  var selSupp   = window._SQ_SUPP || '';
  var selFrom   = window._SQ_FROM || '';
  var selTo     = window._SQ_TO   || '';

  var rows = [];
  DB.getAll('sarkis').forEach(function(sk){
    if(selSupp && sk.supplier !== selSupp) return;
    if(selFrom && sk.date < selFrom) return;
    if(selTo   && sk.date > selTo)   return;
    (sk.lines||[]).forEach(function(ln, li){
      rows.push({
        skId: sk.id, lineIdx: li,
        date: sk.date, client: sk.client,
        supplier: sk.supplier, material: sk.material,
        plateNo:    ln.plateNo||'',
        driverName: ln.driverName||'',
        trips:     Number(ln.trips)||0,
        cubicBuy:  ln.cubicBuy!=null ? Number(ln.cubicBuy) : Number(ln.cubicPerTrip)||0,
        discountM: Number(ln.discountM)||0,
        buyPrice:  Number(ln.buyPrice)||0,
        netBuy:    Number(ln.netBuy||ln.netCubic)||0,
        buyTotal:  Number(ln.buyTotal)||0,
        status:    sk.status||'مفتوح',
      });
    });
  });

  rows.sort(function(a,b){ return b.date.localeCompare(a.date) || b.skId-a.skId; });

  var totTrips = 0, totCubic = 0, totAmount = 0;
  rows.forEach(function(r){
    totTrips  += r.trips;
    var net    = Math.max(0, r.trips*r.cubicBuy - r.discountM);
    totCubic  += net;
    totAmount += net * r.buyPrice;
  });

  var suppOpts = ['<option value="">— كل الموردين —</option>']
    .concat(suppliers.map(function(s){
      return '<option value="'+s+'"'+(s===selSupp?' selected':'')+'>'+s+'</option>';
    })).join('');

  return '<div>'
    +'<div class="page-header">'
    +'<div><div class="section-title" style="margin:0">📦 كشف كميات المورد التفصيلي</div>'
    +'<p class="text-xs text-gray mt4">عرض وتعديل كل نقلة بشكل مباشر — التعديل يُحدّث الحافظة تلقائياً</p></div>'
    +'</div>'

    +'<div class="card mb12" style="padding:10px 14px">'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
    +'<div class="form-group" style="margin:0;min-width:180px"><label style="font-size:10px">المورد</label>'
    +'<select onchange="window._SQ_SUPP=this.value;nav(\'supplierQty\')" style="width:100%">'+suppOpts+'</select></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">من</label>'
    +'<input type="date" value="'+selFrom+'" onchange="window._SQ_FROM=this.value;nav(\'supplierQty\')"></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">إلى</label>'
    +'<input type="date" value="'+selTo+'" onchange="window._SQ_TO=this.value;nav(\'supplierQty\')"></div>'
    +'<button class="btn btn-gray btn-sm" onclick="window._SQ_SUPP=\'\';window._SQ_FROM=\'\';window._SQ_TO=\'\';nav(\'supplierQty\')">✕ مسح</button>'
    +'<button class="btn btn-gray btn-sm" onclick="printSupplierQty()">🖨️ طباعة</button>'
    +'</div></div>'

    +'<div class="grid3 mb12" style="gap:8px">'
    +'<div class="card-sm text-center" style="border-top:3px solid #dc2626">'
    +'<div class="text-xs text-gray mb4">إجمالي النقلات</div>'
    +'<div style="font-size:20px;font-weight:700;color:#dc2626">'+totTrips+'</div></div>'
    +'<div class="card-sm text-center" style="border-top:3px solid #7c3aed">'
    +'<div class="text-xs text-gray mb4">إجمالي م³ صافي (مورد)</div>'
    +'<div style="font-size:20px;font-weight:700;color:#7c3aed">'+totCubic.toFixed(1)+'</div></div>'
    +'<div class="card-sm text-center" style="border-top:3px solid #d97706">'
    +'<div class="text-xs text-gray mb4">إجمالي التكلفة</div>'
    +'<div style="font-size:18px;font-weight:700;color:#d97706">'+curr(totAmount)+'</div></div>'
    +'</div>'

    +'<div class="tbl-wrap"><table id="sq-table">'
    +'<thead><tr>'
    +'<th>الحافظة</th><th>التاريخ</th><th>العميل</th><th>المورد</th>'
    +'<th>الخامة</th><th>السيارة</th><th>السائق</th>'
    +'<th style="background:#4a1942;color:#fff">نقلات</th>'
    +'<th style="background:#4a1942;color:#fff">م³مورد</th>'
    +'<th style="background:#4a1942;color:#fff">خصم م</th>'
    +'<th>م³ صافي</th>'
    +'<th style="background:#4a1942;color:#fff">سعر الشراء</th>'
    +'<th>إجمالي التكلفة</th>'
    +'<th>الحالة</th><th>حفظ</th>'
    +'</tr></thead>'
    +'<tbody>'
    +(rows.length===0
      ? '<tr><td colspan="15" class="tbl-empty"><span class="tbl-empty-icon">📦</span>لا توجد بيانات — اختر مورداً أو غيّر الفلتر</td></tr>'
      : rows.map(function(r){
          var net  = Math.max(0, r.trips*r.cubicBuy - r.discountM);
          var tot  = net * r.buyPrice;
          return '<tr>'
            +'<td><a href="#" onclick="openSarkiModal('+r.skId+');return false" style="color:#dc2626;font-weight:700">#'+r.skId+'</a></td>'
            +'<td class="text-xs">'+fmtDate(r.date)+'</td>'
            +'<td class="text-xs">'+r.client+'</td>'
            +'<td class="text-xs"><strong>'+r.supplier+'</strong></td>'
            +'<td class="text-xs">'+r.material+'</td>'
            +'<td class="text-xs">'+r.plateNo+'</td>'
            +'<td class="text-xs">'+r.driverName+'</td>'
            +'<td><input type="number" min="0" value="'+r.trips+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="trips"'
            +' onchange="updateQtyCell(this)" style="width:55px;text-align:center;border:1px solid #e2e8f0;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.cubicBuy+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="cubicBuy"'
            +' onchange="updateQtyCell(this)" style="width:60px;text-align:center;border:1px solid #7c3aed;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.discountM+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="discountM"'
            +' onchange="updateQtyCell(this)" style="width:55px;text-align:center;border:1px solid #dc2626;border-radius:4px;padding:2px 4px;font-family:inherit;color:#dc2626"></td>'
            +'<td class="font-bold text-center" id="net-s-'+r.skId+'-'+r.lineIdx+'">'+net.toFixed(1)+'</td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.buyPrice+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="buyPrice"'
            +' onchange="updateQtyCell(this)" style="width:65px;text-align:center;border:1px solid #7c3aed;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td class="font-bold text-center" style="color:#dc2626" id="tot-s-'+r.skId+'-'+r.lineIdx+'">'+curr(tot)+'</td>'
            +'<td>'+statusBadge(r.status)+'</td>'
            +'<td><button class="btn btn-xs" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-mode="supplier"'
            +' onclick="saveQtyRow(this)" style="background:#7c3aed;color:#fff;border:none;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:10px;font-family:inherit">💾</button></td>'
            +'</tr>';
        }).join(''))
    +'</tbody></table></div>'
    +'</div>';
}

// ── Update cell live preview ──────────────────────────────────────
window.updateQtyCell = function(input){
  var sk    = input.getAttribute('data-sk');
  var li    = input.getAttribute('data-li');
  var field = input.getAttribute('data-field');
  var val   = Number(input.value)||0;

  // Mark row as modified
  var row = input.closest('tr');
  if(row) row.style.background = 'rgba(255,200,0,.08)';

  // Recalculate preview for client row
  var trips = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="trips"]')?.value)||0;
  var cSell = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="cubicSell"]')?.value)||0;
  var cBuy  = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="cubicBuy"]')?.value)||0;
  var disc  = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="discountM"]')?.value)||0;
  var sPrice= Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="sellPrice"]')?.value)||0;
  var bPrice= Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="buyPrice"]')?.value)||0;

  // Update net and total preview
  var netC = document.getElementById('net-c-'+sk+'-'+li);
  var totC = document.getElementById('tot-c-'+sk+'-'+li);
  var netS = document.getElementById('net-s-'+sk+'-'+li);
  var totS = document.getElementById('tot-s-'+sk+'-'+li);

  if(cSell && netC){ var nc=Math.max(0,trips*cSell-disc); netC.textContent=nc.toFixed(1); if(totC) totC.textContent=curr(nc*sPrice); }
  if(cBuy  && netS){ var nb=Math.max(0,trips*cBuy-disc);  netS.textContent=nb.toFixed(1); if(totS) totS.textContent=curr(nb*bPrice); }
};

// ── Save row back to sarkis ───────────────────────────────────────
window.saveQtyRow = function(btn){
  var skId  = Number(btn.getAttribute('data-sk'));
  var li    = Number(btn.getAttribute('data-li'));
  var mode  = btn.getAttribute('data-mode'); // 'client' or 'supplier'

  var sk = DB.getById('sarkis', skId);
  if(!sk){ toast('الحافظة غير موجودة','error'); return; }

  var lines = sk.lines ? sk.lines.slice() : [];
  if(!lines[li]){ toast('السطر غير موجود','error'); return; }

  var line = Object.assign({}, lines[li]);

  // Read values from inputs
  var trips  = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="trips"]')?.value)||0;
  var disc   = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="discountM"]')?.value)||0;

  line.trips    = trips;
  line.discountM= disc;

  if(mode==='client'){
    var cSell  = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="cubicSell"]')?.value)||0;
    var sPrice = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="sellPrice"]')?.value)||0;
    line.cubicSell = cSell;
    line.sellPrice = sPrice;
  } else {
    var cBuy   = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="cubicBuy"]')?.value)||0;
    var bPrice = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="buyPrice"]')?.value)||0;
    line.cubicBuy  = cBuy;
    line.buyPrice  = bPrice;
  }

  // Recalculate line
  line = calcLine(line);
  lines[li] = line;

  // Recalculate sarkis totals
  var totals = calcSarkiTotals(lines);

  DB.update('sarkis', skId, Object.assign({}, sk, {
    lines:        lines,
    totalSell:    totals.totalSell,
    totalBuy:     totals.totalBuy,
    totalProfit:  totals.totalProfit,
    totalTrips:   totals.totalTrips,
  }));

  // Visual feedback
  var row = btn.closest('tr');
  if(row){
    row.style.background = 'rgba(22,163,74,.1)';
    setTimeout(function(){ row.style.background = ''; }, 1500);
  }
  toast('✅ تم تحديث الحافظة #'+skId);
};

// ── Print functions ───────────────────────────────────────────────
function printClientQty(){
  var tbl = document.getElementById('cq-table');
  if(!tbl){ toast('لا توجد بيانات للطباعة','error'); return; }
  // Clone table and remove edit columns
  var clone = tbl.cloneNode(true);
  // Remove input fields - replace with values
  clone.querySelectorAll('input').forEach(function(inp){
    var td = inp.closest('td');
    if(td){ td.innerHTML = '<span>'+inp.value+'</span>'; }
  });
  // Remove save column
  clone.querySelectorAll('th:last-child, td:last-child').forEach(function(el){ el.remove(); });
  _pw('كشف كميات العميل', printHeaderHTML()+'<br>'+clone.outerHTML);
}

function printSupplierQty(){
  var tbl = document.getElementById('sq-table');
  if(!tbl){ toast('لا توجد بيانات للطباعة','error'); return; }
  var clone = tbl.cloneNode(true);
  clone.querySelectorAll('input').forEach(function(inp){
    var td = inp.closest('td');
    if(td){ td.innerHTML = '<span>'+inp.value+'</span>'; }
  });
  clone.querySelectorAll('th:last-child, td:last-child').forEach(function(el){ el.remove(); });
  _pw('كشف كميات المورد', printHeaderHTML()+'<br>'+clone.outerHTML);
}
