// ── Stub pages (implemented in other files or pending) ────────────
function renderStmtHistory(){
  if(typeof renderCustStmt==='function') return renderCustStmt();
  return '<div class="card"><div class="section-title">📋 سجل المستخلصات</div>'
    +'<p class="text-gray">يتم تحميل هذه الصفحة من statements.js</p></div>';
}

function renderRunningBal(){
  var customers = DB.getAll('customers').map(function(c){ return c.name; });
  var sel = window._RB_CLIENT || '';
  var from = window._RB_FROM || '';
  var to   = window._RB_TO   || '';

  var custOpts = ['<option value="">— اختر العميل —</option>']
    .concat(customers.map(function(c){
      return '<option value="'+c+'"'+(c===sel?' selected':'')+'>'+c+'</option>';
    })).join('');

  var rows = [];
  var runBal = 0;

  if(sel){
    var cust = DB.getAll('customers').find(function(c){ return c.name===sel; });
    var ob = Number(cust?.openingBalance)||0;
    runBal = ob;

    // Collect all transactions
    var txns = [];

    // Opening balance
    if(ob!==0) txns.push({date:'0000-00-00', type:'رصيد أول المدة', desc:'رصيد افتتاحي', debit:ob>0?ob:0, credit:ob<0?Math.abs(ob):0});

    // Sarkis (invoices)
    DB.getAll('sarkis').filter(function(sk){
      return sk.client===sel && sk.status!=='ملغي'
        && (!from||sk.date>=from) && (!to||sk.date<=to);
    }).forEach(function(sk){
      txns.push({date:sk.date, type:'فاتورة', desc:'حافظة #'+sk.id+' — '+sk.material, debit:Number(sk.totalSell)||0, credit:0, ref:'#'+sk.id});
    });

    // Collections
    DB.getAll('journal').filter(function(j){
      return j.entryType==='تحصيل' && j.party===sel
        && (!from||(j.date||'')>=from) && (!to||(j.date||'')<=to);
    }).forEach(function(j){
      txns.push({date:j.date, type:'تحصيل', desc:j.description||'تحصيل نقدي', debit:0, credit:Number(j.amount)||0});
    });

    // Sort by date
    txns.sort(function(a,b){ return a.date.localeCompare(b.date); });

    // Calculate running balance
    rows = txns.map(function(t){
      runBal += t.debit - t.credit;
      return Object.assign({},t,{balance:runBal});
    });
  }

  var totalDebit  = rows.reduce(function(s,r){ return s+r.debit; },0);
  var totalCredit = rows.reduce(function(s,r){ return s+r.credit; },0);
  var finalBal    = rows.length ? rows[rows.length-1].balance : 0;

  return '<div>'
    +'<div class="page-header">'
    +'<div class="section-title" style="margin:0">📊 كشف الحساب المتحرك</div>'
    +'</div>'
    +'<div class="card mb12" style="padding:10px 14px">'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
    +'<div class="form-group" style="margin:0;min-width:200px"><label style="font-size:10px">العميل</label>'
    +'<select data-pg="running-bal" onchange="window._RB_CLIENT=this.value;nav(this.dataset.pg)" style="width:100%">'+custOpts+'</select></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">من</label>'
    +'<input type="date" value="'+from+'" data-pg="running-bal" onchange="window._RB_FROM=this.value;nav(this.dataset.pg)"></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">إلى</label>'
    +'<input type="date" value="'+to+'" data-pg="running-bal" onchange="window._RB_TO=this.value;nav(this.dataset.pg)"></div>'
    +'<button class="btn btn-gray btn-sm" data-pg="running-bal" onclick="window._RB_CLIENT=\'\';window._RB_FROM=\'\';window._RB_TO=\'\';nav(this.dataset.pg)">✕ مسح</button>'
    +'<button class="btn btn-gray btn-sm" onclick="printRunningBal()">🖨️ طباعة</button>'
    +'</div></div>'

    +(sel && rows.length===0 ? '<div class="card" style="text-align:center;padding:30px"><div style="font-size:32px">📭</div><p class="text-gray mt8">لا توجد حركات لهذا العميل</p></div>'
    : !sel ? '<div class="card" style="text-align:center;padding:30px"><div style="font-size:32px">👆</div><p class="text-gray mt8">اختر العميل لعرض كشف الحساب</p></div>'
    : '<div id="rb-table"><div class="tbl-wrap"><table>'
    +'<thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>'
    +'<tbody>'
    +rows.map(function(r){
      return '<tr>'
        +'<td class="text-xs">'+fmtDate(r.date)+'</td>'
        +'<td>'+statusBadge(r.type)+'</td>'
        +'<td class="text-xs">'+r.desc+(r.ref?'  <span style="color:#1F4E78;font-size:9px">'+r.ref+'</span>':'')+'</td>'
        +'<td class="tabular text-red">'+(r.debit>0?curr(r.debit):'—')+'</td>'
        +'<td class="tabular text-green">'+(r.credit>0?curr(r.credit):'—')+'</td>'
        +'<td class="tabular font-bold" style="color:'+(r.balance>=0?'#dc2626':'#16a34a')+'">'+curr(Math.abs(r.balance))+(r.balance>=0?' (مدين)':' (دائن)')+'</td>'
        +'</tr>';
    }).join('')
    +'</tbody>'
    +'<tfoot><tr>'
    +'<td colspan="3" class="font-bold">الإجمالي</td>'
    +'<td class="tabular font-bold text-red">'+curr(totalDebit)+'</td>'
    +'<td class="tabular font-bold text-green">'+curr(totalCredit)+'</td>'
    +'<td class="tabular font-bold" style="color:'+(finalBal>=0?'#dc2626':'#16a34a')+'">'+curr(Math.abs(finalBal))+(finalBal>=0?' (مدين)':' (دائن)')+'</td>'
    +'</tr></tfoot>'
    +'</table></div></div>')
    +'</div>';
}

function printRunningBal(){
  var tbl = document.getElementById('rb-table');
  if(!tbl){ toast('اختر العميل أولاً','error'); return; }
  _pw('كشف الحساب المتحرك — '+(window._RB_CLIENT||''), printHeaderHTML()+tbl.innerHTML);
}

function renderNotes(){
  var customers = DB.getAll('customers');
  var threshold = Number(window._NT_THRESH)||0;

  // Calc balances for all customers
  var debtors = customers.map(function(c){
    var ob    = Number(c.openingBalance)||0;
    var sells = DB.getAll('sarkis').filter(function(s){ return s.client===c.name&&s.status!=='ملغي'; })
                  .reduce(function(t,s){ return t+(Number(s.totalSell)||0); },0);
    var colls = DB.getAll('journal').filter(function(j){ return j.entryType==='تحصيل'&&j.party===c.name; })
                  .reduce(function(t,j){ return t+(Number(j.amount)||0); },0);
    var bal = ob+sells-colls;
    return {name:c.name, phone:c.phone||'', balance:bal, sells:sells, colls:colls};
  }).filter(function(c){ return c.balance>threshold; })
    .sort(function(a,b){ return b.balance-a.balance; });

  var total = debtors.reduce(function(s,c){ return s+c.balance; },0);

  return '<div>'
    +'<div class="page-header">'
    +'<div class="section-title" style="margin:0">📋 إشعارات المديونية والداينية</div>'
    +'</div>'
    +'<div class="card mb12" style="padding:10px 14px">'
    +'<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">عرض الأرصدة أعلى من</label>'
    +'<input type="number" min="0" step="100" value="'+threshold+'" data-pg="notes" onchange="window._NT_THRESH=this.value;nav(this.dataset.pg)" style="width:130px"></div>'
    +'<button class="btn btn-gray btn-sm" onclick="printNotes()">🖨️ طباعة الكل</button>'
    +'</div></div>'
    +'<div class="alert alert-blue mb12" style="font-size:11px">'
    +'<span>📊</span><div>إجمالي المديونية: <strong>'+curr(total)+'</strong> — '
    +debtors.length+' عميل لديهم أرصدة مدينة</div></div>'
    +'<div class="tbl-wrap"><table id="notes-table">'
    +'<thead><tr><th>م</th><th>العميل</th><th>الهاتف</th><th>إجمالي المبيعات</th><th>إجمالي التحصيل</th><th>الرصيد المدين</th><th>إجراء</th></tr></thead>'
    +'<tbody>'
    +(debtors.length===0
      ? '<tr><td colspan="7" class="tbl-empty"><span class="tbl-empty-icon">✅</span>لا توجد مديونيات بهذا الشرط</td></tr>'
      : debtors.map(function(c,i){
          return '<tr>'
            +'<td>'+(i+1)+'</td>'
            +'<td class="font-bold">'+c.name+'</td>'
            +'<td class="text-xs" dir="ltr">'+( c.phone||'—')+'</td>'
            +'<td class="tabular text-red">'+curr(c.sells)+'</td>'
            +'<td class="tabular text-green">'+curr(c.colls)+'</td>'
            +'<td class="tabular font-bold" style="color:#dc2626;font-size:14px">'+curr(c.balance)+'</td>'
            +'<td><button class="btn btn-xs" style="background:#1F4E78;color:#fff;border:none;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:10px;font-family:inherit" '
            +'data-name="'+c.name+'" data-bal="'+c.balance+'" onclick="printSingleNote(this.dataset.name,this.dataset.bal)">🖨️ إشعار</button></td>'
            +'</tr>';
        }).join(''))
    +'</tbody></table></div>'
    +'</div>';
}

function printNotes(){
  var tbl = document.getElementById('notes-table');
  if(!tbl) return;
  var clone = tbl.cloneNode(true);
  clone.querySelectorAll('th:last-child,td:last-child').forEach(function(el){ el.remove(); });
  _pw('إشعارات المديونية', printHeaderHTML()+clone.outerHTML);
}

function printSingleNote(name, balance){
  var co = DB.getCompany();
  var html = printHeaderHTML()
    +'<div style="text-align:center;margin:20px 0;padding:20px;border:2px solid #1F4E78;border-radius:8px">'
    +'<div style="font-size:14px;font-weight:700;color:#1F4E78;margin-bottom:10px">إشعار بالرصيد المدين</div>'
    +'<div style="font-size:12px;margin-bottom:8px">السادة / <strong>'+name+'</strong></div>'
    +'<div style="font-size:11px;color:#666;margin-bottom:16px">تحية طيبة وبعد،</div>'
    +'<div style="font-size:11px;margin-bottom:16px">نفيدكم بأن رصيدكم المدين لدينا حتى تاريخ '+fmtDate(Date.now())+' هو:</div>'
    +'<div style="font-size:24px;font-weight:700;color:#dc2626;margin:16px 0">'+curr(Number(balance))+'</div>'
    +'<div style="font-size:11px;color:#666">نرجو التكرم بالسداد في أقرب وقت ممكن</div>'
    +'</div>'
    +'<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:10px">'
    +'<div>توقيع المحاسب: ________________</div>'
    +'<div>ختم الشركة</div></div>';
  _pw('إشعار مديونية — '+name, html);
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
