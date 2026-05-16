// ── Footer aggregation system ─────────────────────────────────────
// State: {tableId: {colIdx: 'sum'|'count'|'none'}}
window._QTotals = {
  'cq-table': {7:'sum', 8:'sum', 10:'sum', 12:'sum'},  // نقلات, م³عميل, م³صافي, إجمالي
  'sq-table': {7:'sum', 8:'sum', 10:'sum', 12:'sum'},  // نقلات, م³مورد, م³صافي, إجمالي
};

function updateQtyFooter(tableId){
  var table = document.getElementById(tableId);
  if(!table) return;
  var tfoot = table.querySelector('tfoot');
  if(!tfoot) return;
  var cfg = window._QTotals[tableId] || {};

  // Get visible rows only
  var rows = Array.from(table.querySelectorAll('tbody tr'))
    .filter(function(r){ return r.style.display !== 'none'; });

  var cells = tfoot.querySelectorAll('td[data-colidx]');
  cells.forEach(function(cell){
    var ci = Number(cell.getAttribute('data-colidx'));
    var mode = cfg[ci] || 'none';
    if(mode === 'none'){ cell.textContent = ''; return; }

    var vals = rows.map(function(row){
      var td = row.querySelectorAll('td')[ci];
      if(!td) return 0;
      var inp = td.querySelector('input');
      var raw = inp ? inp.value : (td.textContent||'').replace(/[^0-9.-]/g,'');
      return Number(raw) || 0;
    });

    if(mode === 'count'){
      cell.textContent = rows.length;
      cell.title = 'عدد الصفوف';
    } else if(mode === 'sum'){
      var total = vals.reduce(function(a,b){ return a+b; }, 0);
      cell.textContent = total % 1 === 0 ? total.toLocaleString('ar-EG')
        : total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
      cell.title = 'المجموع';
    }
  });
}

function showFooterMenu(e, tableId, colIdx){
  e.preventDefault();
  // Remove any existing menu
  var old = document.getElementById('footer-ctx-menu');
  if(old) old.remove();

  var cfg = window._QTotals[tableId] || {};
  var cur = cfg[colIdx] || 'none';

  var menu = document.createElement('div');
  menu.id = 'footer-ctx-menu';
  menu.style.cssText = 'position:fixed;z-index:9999;background:#fff;border:1px solid #e2e8f0;'
    + 'border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:140px;overflow:hidden;'
    + 'font-family:Tahoma,sans-serif;direction:rtl;font-size:12px;';
  menu.style.top  = Math.min(e.clientY, window.innerHeight-130) + 'px';
  menu.style.right = (window.innerWidth - e.clientX) + 'px';

  [['none','— لا شيء —'],['sum','∑ مجموع'],['count','# عدد']].forEach(function(opt){
    var item = document.createElement('div');
    item.textContent = opt[1];
    item.style.cssText = 'padding:9px 14px;cursor:pointer;'
      + (cur===opt[0] ? 'background:#eff6ff;color:#1d4ed8;font-weight:700;' : 'color:#374151;')
      + 'border-bottom:1px solid #f1f5f9;';
    item.onmouseenter = function(){ if(cur!==opt[0]) this.style.background='#f8fafc'; };
    item.onmouseleave = function(){ if(cur!==opt[0]) this.style.background=''; };
    item.onclick = function(){
      if(!window._QTotals[tableId]) window._QTotals[tableId]={};
      if(opt[0]==='none') delete window._QTotals[tableId][colIdx];
      else window._QTotals[tableId][colIdx] = opt[0];
      menu.remove();
      updateQtyFooter(tableId);
    };
    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  setTimeout(function(){ document.addEventListener('click', function rm(){ menu.remove(); document.removeEventListener('click',rm); }); }, 10);
}

// Build a footer cell
function qfFootCell(tableId, colIdx, defaultMode){
  if(defaultMode && defaultMode!=='none'){
    if(!window._QTotals[tableId]) window._QTotals[tableId]={};
    if(!window._QTotals[tableId][colIdx]) window._QTotals[tableId][colIdx]=defaultMode;
  }
  return '<td data-colidx="'+colIdx+'" oncontextmenu="showFooterMenu(event,\''+tableId+'\','+colIdx+')" '
    +'style="text-align:center;font-weight:700;font-size:11px;padding:5px 3px;cursor:context-menu;'
    +'background:#1F4E78;color:#FFE699;border-right:1px solid rgba(255,255,255,.1)" '
    +'title="انقر بالزر الأيمن لتغيير التجميع"></td>';
}

// Call after render
function initQtyFooters(){
  setTimeout(function(){
    updateQtyFooter('cq-table');
    updateQtyFooter('sq-table');
  }, 50);
}

// Patch filterQtyTable to update footer after filter
var _origFilterQty = window.filterQtyTable;
window.filterQtyTable = function(tableId, colIdx, val){
  _origFilterQty(tableId, colIdx, val);
  updateQtyFooter(tableId);
};
var _origClearQty = window.clearQtyFilter;
window.clearQtyFilter = function(tableId){
  _origClearQty(tableId);
  updateQtyFooter(tableId);
};

// ── Column filter for qty tables ─────────────────────────────────
window._QF = {}; // {tableId: {colIdx: value}}

function filterQtyTable(tableId, colIdx, val){
  if(!window._QF[tableId]) window._QF[tableId] = {};
  if(val.trim()==='') delete window._QF[tableId][colIdx];
  else window._QF[tableId][colIdx] = val.trim().toLowerCase();

  var table = document.getElementById(tableId);
  if(!table) return;
  var filters = window._QF[tableId] || {};
  var rows = table.querySelectorAll('tbody tr');
  rows.forEach(function(row){
    var cells = row.querySelectorAll('td');
    var show = true;
    Object.keys(filters).forEach(function(ci){
      var cell = cells[ci];
      if(cell){
        var text = (cell.textContent||cell.innerText||'').toLowerCase();
        var inp  = cell.querySelector('input');
        if(inp) text = inp.value.toLowerCase();
        if(text.indexOf(filters[ci]) < 0) show = false;
      }
    });
    row.style.display = show ? '' : 'none';
  });
}

function clearQtyFilter(tableId){
  window._QF[tableId] = {};
  var table = document.getElementById(tableId);
  if(!table) return;
  table.querySelectorAll('thead input.col-filter').forEach(function(inp){ inp.value=''; });
  table.querySelectorAll('tbody tr').forEach(function(r){ r.style.display=''; });
}

// Build a filter input cell
function qfInput(tableId, colIdx, placeholder){
  return '<th style="padding:2px 3px;background:#f8fafc">'
    +'<input class="col-filter" type="text" placeholder="'+(placeholder||'بحث...')+'"'
    +' oninput="filterQtyTable(\''+tableId+'\','+colIdx+',this.value)"'
    +' style="width:100%;font-size:9px;padding:2px 4px;border:1px solid #e2e8f0;border-radius:4px;font-family:inherit;direction:rtl">'
    +'</th>';
}


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
    +'</tbody>'
    +'<tfoot><tr>'
    +'<td colspan="7" style="background:#4a1942;color:#fff;padding:5px 8px;font-weight:700;font-size:11px">المجموع — انقر بالزر الأيمن على أي خلية لتغيير التجميع</td>'
    +qfFootCell('sq-table',7,'sum')
    +qfFootCell('sq-table',8,'sum')
    +qfFootCell('sq-table',9,'none')
    +qfFootCell('sq-table',10,'sum')
    +qfFootCell('sq-table',11,'none')
    +qfFootCell('sq-table',12,'sum')
    +'<td style="background:#4a1942"></td><td style="background:#4a1942"></td><td style="background:#4a1942"></td>'
    +'</tr></tfoot>'
    +'</tbody></table></div>'
    +'</div>';
  setTimeout(function(){updateQtyFooter('sq-table');},80);
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
    +'<thead>'
    +'<tr>'
    +'<th>الحافظة</th><th>التاريخ</th><th>العميل</th><th>المورد</th>'
    +'<th>الخامة</th><th>السيارة</th><th>السائق</th>'
    +'<th style="background:#1a5276;color:#fff">نقلات</th>'
    +'<th style="background:#1a5276;color:#fff">م³عميل</th>'
    +'<th style="background:#1a5276;color:#fff">خصم م</th>'
    +'<th>م³ صافي</th>'
    +'<th style="background:#1a5276;color:#fff">سعر البيع</th>'
    +'<th>إجمالي البيع</th>'
    +'<th>الحالة</th><th>حفظ</th>'
    +'</tr>'
    +'<tr>'
    +qfInput("cq-table",0,"# حافظة")
    +qfInput("cq-table",1,"تاريخ")
    +qfInput("cq-table",2,"عميل")
    +qfInput("cq-table",3,"مورد")
    +qfInput("cq-table",4,"خامة")
    +qfInput("cq-table",5,"سيارة")
    +qfInput("cq-table",6,"سائق")
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +qfInput("cq-table",13,"حالة")
    +'<th style="padding:2px;background:#f8fafc"><button onclick="clearQtyFilter(\'cq-table\')" style="font-size:9px;padding:2px 5px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer">✕</button></th>'
    +'</tr>'
    +'</thead>'
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
    +'</tbody>'
    +'<tfoot><tr>'
    +'<td colspan="7" style="background:#4a1942;color:#fff;padding:5px 8px;font-weight:700;font-size:11px">المجموع — انقر بالزر الأيمن على أي خلية لتغيير التجميع</td>'
    +qfFootCell('sq-table',7,'sum')
    +qfFootCell('sq-table',8,'sum')
    +qfFootCell('sq-table',9,'none')
    +qfFootCell('sq-table',10,'sum')
    +qfFootCell('sq-table',11,'none')
    +qfFootCell('sq-table',12,'sum')
    +'<td style="background:#4a1942"></td><td style="background:#4a1942"></td><td style="background:#4a1942"></td>'
    +'</tr></tfoot>'
    +'</tbody></table></div>'
    +'</div>';
  setTimeout(function(){updateQtyFooter('sq-table');},80);
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
    totAmount += r.buyPrice > 0 ? net * r.buyPrice : r.buyTotal;
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
    +'<thead>'
    +'<tr>'
    +'<th>الحافظة</th><th>التاريخ</th><th>العميل</th><th>المورد</th>'
    +'<th>الخامة</th><th>السيارة</th><th>السائق</th>'
    +'<th style="background:#4a1942;color:#fff">نقلات</th>'
    +'<th style="background:#4a1942;color:#fff">م³مورد</th>'
    +'<th style="background:#4a1942;color:#fff">خصم م</th>'
    +'<th>م³ صافي</th>'
    +'<th style="background:#4a1942;color:#fff">سعر الشراء</th>'
    +'<th>إجمالي التكلفة</th>'
    +'<th style="background:#064e3b;color:#fff">محفوظ</th>'
    +'<th>الحالة</th><th>حفظ</th>'
    +'</tr>'
    +'<tr>'
    +qfInput("sq-table",0,"# حافظة")
    +qfInput("sq-table",1,"تاريخ")
    +qfInput("sq-table",2,"عميل")
    +qfInput("sq-table",3,"مورد")
    +qfInput("sq-table",4,"خامة")
    +qfInput("sq-table",5,"سيارة")
    +qfInput("sq-table",6,"سائق")
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"></th>'
    +'<th style="padding:2px;background:#f8fafc"><button onclick="clearQtyFilter(\'sq-table\')" style="font-size:9px;padding:2px 5px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer">✕</button></th>'
    +'</tr>'
    +'</thead>'
    +'<tbody>'
    +(rows.length===0
      ? '<tr><td colspan="16" class="tbl-empty"><span class="tbl-empty-icon">📦</span>لا توجد بيانات — اختر مورداً أو غيّر الفلتر</td></tr>'
      : rows.map(function(r){
          var net  = Math.max(0, r.trips*r.cubicBuy - r.discountM);
          var tot  = r.buyPrice > 0 ? net * r.buyPrice : r.buyTotal;
          return '<tr>'
            +'<td><a href="#" onclick="openSarkiModal('+r.skId+');return false" style="color:#dc2626;font-weight:700">#'+r.skId+'</a></td>'
            +'<td class="text-xs">'+fmtDate(r.date)+'</td>'
            +'<td class="text-xs">'+r.client+'</td>'
            +'<td class="text-xs"><strong>'+r.supplier+'</strong></td>'
            +'<td class="text-xs">'+r.material+'</td>'
            +'<td class="text-xs">'+r.plateNo+'</td>'
            +'<td class="text-xs">'+r.driverName+'</td>'
            +'<td><input type="number" min="0" value="'+r.trips+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="trips" onchange="updateQtyCell(this)" style="width:55px;text-align:center;border:1px solid #e2e8f0;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.cubicBuy+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="cubicBuy" onchange="updateQtyCell(this)" style="width:60px;text-align:center;border:1px solid #7c3aed;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.discountM+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="discountM" onchange="updateQtyCell(this)" style="width:55px;text-align:center;border:1px solid #dc2626;border-radius:4px;padding:2px 4px;font-family:inherit;color:#dc2626"></td>'
            +'<td class="font-bold text-center" id="net-s-'+r.skId+'-'+r.lineIdx+'">'+net.toFixed(1)+'</td>'
            +'<td><input type="number" min="0" step="0.01" value="'+r.buyPrice+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="buyPrice" onchange="updateQtyCell(this)" style="width:65px;text-align:center;border:1px solid #7c3aed;border-radius:4px;padding:2px 4px;font-family:inherit"></td>'
            +'<td class="font-bold text-center" style="color:#dc2626" id="tot-s-'+r.skId+'-'+r.lineIdx+'">'+curr(tot)+'</td>'
            +'<td class="text-center text-xs" style="color:'+(Math.abs(tot-r.buyTotal)<1?'#16a34a':'#d97706')+'">'
            +(Math.abs(tot-r.buyTotal)<1?'✓':curr(r.buyTotal))+'</td>'
            +'<td>'+statusBadge(r.status)+'</td>'
            +'<td><button class="btn btn-xs" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-mode="supplier" onclick="saveQtyRow(this)" style="background:#7c3aed;color:#fff;border:none;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:10px;font-family:inherit">💾</button></td>'
            +'</tr>';
        }).join(''))
    +'</tbody></table></div>'
    +'</div>';
}
