// ══ FOOTER AGGREGATION SYSTEM ════════════════════════════════════
window._QTotals = {};  // {tableId: {colIdx: 'sum'|'count'|'none'}}

// Default aggregations per table
var _QDefaults = {
  'cq-table': {7:'sum',8:'sum',9:'none',10:'sum',11:'none',12:'sum'},
  'sq-table': {7:'sum',8:'sum',9:'none',10:'sum',11:'none',12:'sum'},
};

function getQTotal(tableId, ci){
  if(!window._QTotals[tableId]) window._QTotals[tableId]={};
  if(window._QTotals[tableId][ci]!==undefined) return window._QTotals[tableId][ci];
  var def = _QDefaults[tableId]||{};
  return def[ci]||'none';
}

function buildQtyFooter(tableId){
  var table = document.getElementById(tableId);
  if(!table) return;

  // Get or create tfoot
  var tfoot = table.querySelector('tfoot');
  if(!tfoot){ tfoot=document.createElement('tfoot'); table.appendChild(tfoot); }

  // Count columns from thead first row
  var firstRow = table.querySelector('thead tr');
  var colCount = firstRow ? firstRow.querySelectorAll('th').length : 15;

  // Get visible rows
  var rows = Array.from(table.querySelectorAll('tbody tr'))
    .filter(function(r){ return r.style.display!=='none'; });

  var bg = tableId==='sq-table' ? '#4a1942' : '#1F4E78';
  var tr = document.createElement('tr');

  for(var ci=0; ci<colCount; ci++){
    var td = document.createElement('td');
    td.setAttribute('data-ci', ci);
    var mode = getQTotal(tableId, ci);

    if(ci===0){
      // Label cell - spans
      td.textContent = 'المجموع';
      td.style.cssText = 'background:'+bg+';color:#fff;padding:5px 8px;font-weight:700;font-size:11px;text-align:right;';
    } else {
      td.style.cssText = 'text-align:center;font-weight:700;font-size:11px;padding:5px 3px;'
        +'cursor:context-menu;background:'+bg+';color:'+(mode==='none'?'rgba(255,255,255,.3)':'#FFE699')+';'
        +'border-right:1px solid rgba(255,255,255,.1);';
      td.title = 'انقر بالزر الأيمن لتغيير التجميع';

      if(mode==='count'){
        td.textContent = rows.length;
      } else if(mode==='sum'){
        var total=0;
        rows.forEach(function(row){
          var cell=row.querySelectorAll('td')[ci];
          if(!cell) return;
          var inp=cell.querySelector('input');
          var raw=inp ? Number(inp.value)||0
            : Number((cell.textContent||'').replace(/[٠-٩]/g,function(d){
                return '٠١٢٣٤٥٦٧٨٩'.indexOf(d);
              }).replace(/[^0-9.-]/g,''))||0;
          total+=raw;
        });
        td.textContent = total===0?'0':total%1===0
          ? total.toLocaleString('ar-EG')
          : total.toFixed(2);
      } else {
        td.textContent = '';
      }

      // Right-click menu
      (function(cell, colIdx, tblId){
        cell.addEventListener('contextmenu', function(e){
          e.preventDefault();
          showFooterMenu(e, tblId, colIdx);
        });
      })(td, ci, tableId);
    }
    tr.appendChild(td);
  }
  tfoot.innerHTML='';
  tfoot.appendChild(tr);
}

function showFooterMenu(e, tableId, colIdx){
  var old=document.getElementById('footer-ctx-menu');
  if(old) old.remove();

  var cur = getQTotal(tableId, colIdx);
  var menu=document.createElement('div');
  menu.id='footer-ctx-menu';
  menu.style.cssText='position:fixed;z-index:9999;background:#fff;border:1px solid #e2e8f0;'
    +'border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:150px;overflow:hidden;'
    +'font-family:Tahoma,sans-serif;direction:rtl;font-size:12px;';
  menu.style.top=Math.min(e.clientY,window.innerHeight-130)+'px';
  menu.style.right=(window.innerWidth-e.clientX)+'px';

  [['none','— لا شيء —'],['sum','∑ مجموع'],['count','# عدد']].forEach(function(opt){
    var item=document.createElement('div');
    item.textContent=opt[1];
    item.style.cssText='padding:10px 16px;cursor:pointer;color:#374151;'
      +'border-bottom:1px solid #f1f5f9;'
      +(cur===opt[0]?'background:#eff6ff;color:#1d4ed8;font-weight:700;':'');
    item.onmouseenter=function(){ if(cur!==opt[0]) this.style.background='#f8fafc'; };
    item.onmouseleave=function(){ if(cur!==opt[0]) this.style.background=''; };
    item.onclick=function(){
      if(!window._QTotals[tableId]) window._QTotals[tableId]={};
      window._QTotals[tableId][colIdx]=opt[0];
      menu.remove();
      buildQtyFooter(tableId);
    };
    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  var rm=function(){ menu.remove(); document.removeEventListener('click',rm); };
  setTimeout(function(){ document.addEventListener('click',rm); },10);
}

// Old qfFootCell stub (no longer used for tfoot building)
function qfFootCell(){ return ''; }


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
  buildQtyFooter(tableId);
}

function clearQtyFilter(tableId){
  window._QF[tableId] = {};
  var table = document.getElementById(tableId);
  if(!table) return;
  table.querySelectorAll('thead input.col-filter').forEach(function(inp){ inp.value=''; });
  table.querySelectorAll('tbody tr').forEach(function(r){ r.style.display=''; });
  buildQtyFooter(tableId);
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
  var suppliers  = DB.getAll('suppliers').map(function(s){ return s.name; });

  var selType   = window._RB_TYPE   || 'client';
  var selEntity = window._RB_CLIENT || '';
  var from      = window._RB_FROM   || '';
  var to        = window._RB_TO     || '';

  var typeOpts = ['client','supplier'].map(function(t){
    return '<option value="'+t+'"'+(t===selType?' selected':'')+'>'+(t==='client'?'👤 عميل':'🏭 مورد')+'</option>';
  }).join('');

  var entities = selType==='client' ? customers : suppliers;
  var entLabel = selType==='client' ? 'العميل' : 'المورد';

  var entOpts = ['<option value="">— اختر '+entLabel+' —</option>']
    .concat(entities.map(function(n){
      return '<option value="'+n+'"'+(n===selEntity?' selected':'')+'>'+n+'</option>';
    })).join('');

  var rows = [];
  var runBal = 0;

  if(selEntity){
    if(selType==='client'){
      var cust = DB.getAll('customers').find(function(c){ return c.name===selEntity; });
      var ob = Number(cust?.openingBalance)||0;
      runBal = ob;
      var txns = [];
      if(ob!==0) txns.push({date:'0000-00-00',type:'رصيد أول المدة',desc:'رصيد افتتاحي',debit:ob>0?ob:0,credit:ob<0?Math.abs(ob):0});
      DB.getAll('sarkis').filter(function(sk){
        return sk.client===selEntity && sk.status!=='ملغي'
          && (!from||sk.date>=from) && (!to||sk.date<=to);
      }).forEach(function(sk){
        var trips=0, netM3=0;
        (sk.lines||[]).forEach(function(ln){
          trips += Number(ln.trips)||0;
          netM3 += Number(ln.netSell!=null?ln.netSell:ln.netCubic)||0;
        });
        txns.push({date:sk.date,type:'فاتورة',desc:'حافظة #'+sk.id+' — '+sk.material,
          debit:Number(sk.totalSell)||0,credit:0,ref:'#'+sk.id,trips:trips,netM3:netM3});
      });
      DB.getAll('journal').filter(function(j){
        return j.party===selEntity && j.partyType==='عميل'
          && (!from||(j.date||'')>=from) && (!to||(j.date||'')<=to);
      }).forEach(function(j){
        if(j.entryType==='تحصيل'){
          // تحصيل مباشر
          txns.push({date:j.date,type:'تحصيل',desc:j.description||'تحصيل نقدي',
            debit:0, credit:Number(j.amount)||0});
        } else if(j.entryType==='يدوي' && j.creditCode==='1010'){
          // قيد يدوي يضع ذمم العملاء دائن = تحصيل
          txns.push({date:j.date,type:'تحصيل يدوي',desc:j.description||'قيد يدوي',
            debit:0, credit:Number(j.creditAmount)||0});
        }
      });
      txns.sort(function(a,b){ return a.date.localeCompare(b.date); });
      rows = txns.map(function(t){ runBal+=t.debit-t.credit; return Object.assign({},t,{balance:runBal}); });

    } else {
      // SUPPLIER
      var supp = DB.getAll('suppliers').find(function(s){ return s.name===selEntity; });
      var ob2 = Number(supp?.openingBalance)||0;
      runBal = ob2;
      var txns2 = [];
      if(ob2!==0) txns2.push({date:'0000-00-00',type:'رصيد أول المدة',desc:'رصيد افتتاحي',debit:0,credit:ob2>0?ob2:0});
      DB.getAll('sarkis').filter(function(sk){
        return sk.supplier===selEntity && sk.status!=='ملغي'
          && (!from||sk.date>=from) && (!to||sk.date<=to);
      }).forEach(function(sk){
        var trips=0, netM3=0;
        (sk.lines||[]).forEach(function(ln){
          trips += Number(ln.trips)||0;
          netM3 += Number(ln.netBuy!=null?ln.netBuy:ln.netCubic)||0;
        });
        txns2.push({date:sk.date,type:'فاتورة شراء',desc:'حافظة #'+sk.id+' — '+sk.material,
          debit:0,credit:Number(sk.totalBuy)||0,ref:'#'+sk.id,trips:trips,netM3:netM3});
      });
      DB.getAll('journal').filter(function(j){
        return j.party===selEntity && j.partyType==='مورد'
          && (!from||(j.date||'')>=from) && (!to||(j.date||'')<=to);
      }).forEach(function(j){
        if(j.entryType==='دفع'){
          // دفع مباشر
          txns2.push({date:j.date,type:'دفع',desc:j.description||'دفع نقدي',
            debit:Number(j.amount)||0, credit:0});
        } else if(j.entryType==='يدوي' && j.debitCode==='2001'){
          // قيد يدوي يخصم ذمم الموردين = دفع
          txns2.push({date:j.date,type:'دفع يدوي',desc:j.description||'قيد يدوي',
            debit:Number(j.debitAmount)||0, credit:0});
        }
      });
      txns2.sort(function(a,b){ return a.date.localeCompare(b.date); });
      rows = txns2.map(function(t){ runBal+=t.debit-t.credit; return Object.assign({},t,{balance:runBal}); });
    }
  }

  var totalDebit  = rows.reduce(function(s,r){ return s+r.debit; },0);
  var totalCredit = rows.reduce(function(s,r){ return s+r.credit; },0);
  var finalBal    = rows.length ? rows[rows.length-1].balance : 0;

  var balColor = selType==='client'
    ? (finalBal>=0?'#dc2626':'#16a34a')
    : (finalBal<=0?'#dc2626':'#16a34a');

  return '<div>'
    +'<div class="page-header">'
    +'<div class="section-title" style="margin:0">📊 كشف الحساب المتحرك</div>'
    +'</div>'
    +'<div class="card mb12" style="padding:10px 14px">'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">النوع</label>'
    +'<select data-pg="running-bal" onchange="window._RB_TYPE=this.value;window._RB_CLIENT=\'\';nav(this.dataset.pg)" style="width:120px">'+typeOpts+'</select></div>'
    +'<div class="form-group" style="margin:0;min-width:180px"><label style="font-size:10px">'+entLabel+'</label>'
    +'<select data-pg="running-bal" onchange="window._RB_CLIENT=this.value;nav(this.dataset.pg)" style="width:100%">'+entOpts+'</select></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">من</label>'
    +'<input type="date" value="'+from+'" data-pg="running-bal" onchange="window._RB_FROM=this.value;nav(this.dataset.pg)"></div>'
    +'<div class="form-group" style="margin:0"><label style="font-size:10px">إلى</label>'
    +'<input type="date" value="'+to+'" data-pg="running-bal" onchange="window._RB_TO=this.value;nav(this.dataset.pg)"></div>'
    +'<button class="btn btn-gray btn-sm" data-pg="running-bal" onclick="window._RB_CLIENT=\'\';window._RB_FROM=\'\';window._RB_TO=\'\';nav(this.dataset.pg)">✕ مسح</button>'
    +'<button class="btn btn-gray btn-sm" onclick="printRunningBal()">🖨️ طباعة</button>'
    +'<button class="btn btn-gray btn-sm" onclick="exportRunningBalExcel()">📊 Excel</button>'
    +'</div></div>'
    +(selEntity && rows.length===0
      ? '<div class="card" style="text-align:center;padding:30px"><div style="font-size:32px">📭</div><p class="text-gray mt8">لا توجد حركات</p></div>'
      : !selEntity
      ? '<div class="card" style="text-align:center;padding:30px"><div style="font-size:32px">👆</div><p class="text-gray mt8">اختر '+entLabel+' لعرض كشف الحساب</p></div>'
      : '<div id="rb-table"><div class="tbl-wrap"><table>'
        +'<thead><tr>'
          +'<th>التاريخ</th><th>النوع</th><th>البيان</th>'
          +'<th style="text-align:center;background:#1a5276;color:#fff">نقلات</th>'
          +'<th style="text-align:center;background:#1a5276;color:#fff">م³ صافي</th>'
          +'<th>الرصيد الواصل (مدين)</th><th>الرصيد الواصل (دائن)</th>'
          +'<th>الرصيد الباقي</th>'
        +'</tr></thead>'
        +'<tbody>'
        +rows.map(function(r){
          var bal = selType==='client'
            ? (r.balance>=0?curr(r.balance)+' (مدين)':curr(Math.abs(r.balance))+' (دائن)')
            : (r.balance<=0?curr(Math.abs(r.balance))+' (مستحق)':curr(r.balance)+' (رصيد)');
          var balCol = selType==='client'
            ? (r.balance>=0?'#dc2626':'#16a34a')
            : (r.balance<=0?'#dc2626':'#16a34a');
          var hasQty = r.trips!=null || r.netM3!=null;
          return '<tr>'
            +'<td class="text-xs">'+fmtDate(r.date)+'</td>'
            +'<td>'+statusBadge(r.type)+'</td>'
            +'<td class="text-xs">'+r.desc+(r.ref?'  <span style="color:#1F4E78;font-size:9px">'+r.ref+'</span>':'')+'</td>'
            +'<td class="tabular" style="text-align:center">'+(hasQty?num(r.trips):'—')+'</td>'
            +'<td class="tabular" style="text-align:center;color:#1a5276;font-weight:700">'+(hasQty?num(r.netM3.toFixed(1)):'—')+'</td>'
            +'<td class="tabular text-red">'+(r.debit>0?curr(r.debit):'—')+'</td>'
            +'<td class="tabular text-green">'+(r.credit>0?curr(r.credit):'—')+'</td>'
            +'<td class="tabular font-bold" style="color:'+balCol+'">'+bal+'</td>'
            +'</tr>';
        }).join('')
        +'</tbody>'
        +'<tfoot><tr>'
        +'<td colspan="3" class="font-bold">الإجمالي</td>'
        +'<td class="tabular font-bold" style="text-align:center">'+num(rows.reduce(function(s,r){return s+(r.trips||0);},0))+'</td>'
        +'<td class="tabular font-bold" style="text-align:center;color:#1a5276">'+num(rows.reduce(function(s,r){return s+(r.netM3||0);},0).toFixed(1))+'</td>'
        +'<td class="tabular font-bold text-red">'+curr(totalDebit)+'</td>'
        +'<td class="tabular font-bold text-green">'+curr(totalCredit)+'</td>'
        +'<td class="tabular font-bold" style="color:'+balColor+'">'+curr(Math.abs(finalBal))+(selType==='client'?(finalBal>=0?' (مدين)'  :' (دائن)'):(finalBal<=0?' (مستحق)':' (رصيد)'))+'</td>'
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
    +'<button class="btn btn-gray btn-sm" onclick="exportNotesExcel()">📊 Excel</button>'
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
        discountM: Number(ln.discountSell!=null?ln.discountSell:ln.discountM)||0,
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
    +'<button class="btn btn-gray btn-sm" onclick="exportClientQtyExcel()">📊 Excel</button>'
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
    +'<th style="background:#1a5276;color:#fff">خصم م³ عميل</th>'
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
            +'<td><input type="number" min="0" step="0.01" value="'+r.discountM+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="discountSell"'
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
    +'</div>'

    // ── Hourly loader jobs section ──
    +(function(){
      var hJobs=DB.getAll('loaderHours').filter(function(j){
        if(selClient&&j.client!==selClient) return false;
        if(selFrom&&j.date<selFrom) return false;
        if(selTo&&j.date>selTo) return false;
        return true;
      }).sort(function(a,b){return b.date.localeCompare(a.date);});
      if(!hJobs.length) return '';
      var totH=hJobs.reduce(function(s,j){return s+(Number(j.hours)||0);},0);
      var totHRev=hJobs.reduce(function(s,j){return s+(Number(j.netClient)||0);},0);
      return '<div class="card mt12">'
        +'<div class="flex-between mb8">'
        +'<div class="section-title" style="margin:0;color:#7c3aed">⏱️ أعمال الساعات ('+hJobs.length+' سجل)</div>'
        +'<strong style="color:#7c3aed">'+curr(totHRev)+'</strong></div>'
        +'<div class="tbl-wrap"><table style="font-size:10px">'
        +'<thead><tr style="background:#7c3aed;color:#fff">'
        +'<th>التاريخ</th><th>اللودر</th><th>العميل</th><th>البيان</th>'
        +'<th style="text-align:center">الساعات</th><th style="text-align:center">سعر/ساعة</th>'
        +'<th style="text-align:center">الإجمالي</th><th style="text-align:center">خصم</th>'
        +'<th style="text-align:center">صافي الإيراد</th>'
        +'</tr></thead><tbody>'
        +hJobs.map(function(j){
          var ld=DB.getAll('loaders').find(function(l){return l.id===j.loaderId;});
          return '<tr>'
            +'<td>'+fmtDate(j.date)+'</td>'
            +'<td class="text-xs text-gray">'+(ld?ld.name:'—')+'</td>'
            +'<td><strong>'+j.client+'</strong></td>'
            +'<td class="text-xs">'+(j.description||'—')+'</td>'
            +'<td style="text-align:center;font-weight:700">'+(Number(j.hours)||0)+'</td>'
            +'<td style="text-align:center">'+curr(j.pricePerHour||0)+'</td>'
            +'<td style="text-align:center;color:#1d4ed8">'+curr(j.grossAmount||0)+'</td>'
            +'<td style="text-align:center;color:#d97706">'+curr(j.discountClient||0)+'</td>'
            +'<td style="text-align:center;font-weight:700;color:#7c3aed">'+curr(j.netClient||0)+'</td>'
            +'</tr>';
        }).join('')
        +'</tbody><tfoot><tr style="background:#ede9fe;font-weight:700">'
        +'<td colspan="4">الإجمالي</td>'
        +'<td style="text-align:center">'+totH.toFixed(1)+' س</td>'
        +'<td colspan="3"></td>'
        +'<td style="text-align:center;color:#7c3aed">'+curr(totHRev)+'</td>'
        +'</tr></tfoot></table></div></div>';
    })()

    // ── Loading loader jobs section ──
    +(function(){
      var lJobs=DB.getAll('loaderLoading').filter(function(j){
        if(selClient&&j.client!==selClient) return false;
        if(selFrom&&j.date<selFrom) return false;
        if(selTo&&j.date>selTo) return false;
        return true;
      }).sort(function(a,b){return b.date.localeCompare(a.date);});
      if(!lJobs.length) return '';
      var totLTrips=lJobs.reduce(function(s,j){return s+(Number(j.trips)||0);},0);
      var totLM3=lJobs.reduce(function(s,j){return s+(Number(j.netM3)||0);},0);
      var totLRev=lJobs.reduce(function(s,j){return s+(Number(j.netClient)||0);},0);
      return '<div class="card mt12">'
        +'<div class="flex-between mb8">'
        +'<div class="section-title" style="margin:0;color:#0369a1">🚛 أعمال التحميل ('+lJobs.length+' سجل)</div>'
        +'<strong style="color:#0369a1">'+curr(totLRev)+'</strong></div>'
        +'<div class="tbl-wrap"><table style="font-size:10px">'
        +'<thead><tr style="background:#0369a1;color:#fff">'
        +'<th>التاريخ</th><th>اللودر</th><th>العميل</th><th>نوع العمل</th>'
        +'<th style="text-align:center">السيارة</th><th style="text-align:center">نقلات</th>'
        +'<th style="text-align:center">م³/نقلة</th><th style="text-align:center">إجمالي م³</th>'
        +'<th style="text-align:center">خصم م³</th><th style="text-align:center">صافي م³</th>'
        +'<th style="text-align:center">سعر/م³</th><th style="text-align:center">خصم عميل</th>'
        +'<th style="text-align:center">صافي الإيراد</th>'
        +'</tr></thead><tbody>'
        +lJobs.map(function(j){
          var ld=DB.getAll('loaders').find(function(l){return l.id===j.loaderId;});
          var lines=j.lines||[{plateNo:j.plateNo||'—',trips:j.trips||0,cubicPerTrip:j.cubicPerTrip||0,grossM3:j.grossM3||0,discountM3:j.discountM3||0,netM3:j.netM3||0,pricePerM3:j.pricePerM3||0}];
          return lines.map(function(ln,li){
            return '<tr style="'+(li%2?'background:#f0f9ff':'')+'">'
              +(li===0?'<td rowspan="'+lines.length+'">'+fmtDate(j.date)+'</td>'
                +'<td rowspan="'+lines.length+'" class="text-xs text-gray">'+(ld?ld.name:'—')+'</td>'
                +'<td rowspan="'+lines.length+'"><strong>'+j.client+'</strong></td>'
                +'<td rowspan="'+lines.length+'">'+badge(j.workType||'تحميل','blue')+'</td>':'')
              +'<td style="text-align:center;font-family:monospace;font-size:10px">'+(ln.plateNo||'—')+'</td>'
              +'<td style="text-align:center;font-weight:700">'+(Number(ln.trips)||0)+'</td>'
              +'<td style="text-align:center">'+(Number(ln.cubicPerTrip)||0)+'</td>'
              +'<td style="text-align:center">'+(Number(ln.grossM3)||0).toFixed(1)+'</td>'
              +'<td style="text-align:center;color:#dc2626">'+(Number(ln.discountM3)||0)+'</td>'
              +'<td style="text-align:center;font-weight:700;color:#0369a1">'+(Number(ln.netM3)||0).toFixed(1)+'</td>'
              +'<td style="text-align:center">'+curr(ln.pricePerM3||0)+'</td>'
              +(li===0?'<td rowspan="'+lines.length+'" style="text-align:center;color:#d97706">'+curr(j.discountClient||0)+'</td>'
                +'<td rowspan="'+lines.length+'" style="text-align:center;font-weight:700;color:#0369a1">'+curr(j.netClient||0)+'</td>':'')
              +'</tr>';
          }).join('');
        }).join('')
        +'</tbody><tfoot><tr style="background:#e0f2fe;font-weight:700">'
        +'<td colspan="5">الإجمالي</td>'
        +'<td style="text-align:center">'+totLTrips+'</td>'
        +'<td colspan="3"></td>'
        +'<td style="text-align:center;color:#0369a1">'+totLM3.toFixed(1)+' م³</td>'
        +'<td colspan="1"></td>'
        +'<td colspan="1"></td>'
        +'<td style="text-align:center;color:#0369a1">'+curr(totLRev)+'</td>'
        +'</tr></tfoot></table></div></div>';
    })()

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
        discountM: Number(ln.discountSell!=null?ln.discountSell:ln.discountM)||0,
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
    +'<button class="btn btn-gray btn-sm" onclick="exportSupplierQtyExcel()">📊 Excel</button>'
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
    +'<th style="background:#4a1942;color:#fff">خصم م³ مورد</th>'
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
            +'<td><input type="number" min="0" step="0.01" value="'+r.discountM+'" data-sk="'+r.skId+'" data-li="'+r.lineIdx+'" data-field="discountBuy" onchange="updateQtyCell(this)" style="width:55px;text-align:center;border:1px solid #dc2626;border-radius:4px;padding:2px 4px;font-family:inherit;color:#dc2626"></td>'
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

// ── Update cell live preview ──────────────────────────────────────
window.updateQtyCell = function(input){
  var sk    = input.getAttribute('data-sk');
  var li    = input.getAttribute('data-li');
  var field = input.getAttribute('data-field');

  // Mark row as modified
  var row = input.closest('tr');
  if(row) row.style.background = 'rgba(255,200,0,.08)';

  // Read all current values for this row
  var trips  = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="trips"]')?.value)||0;
  var cSell  = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="cubicSell"]')?.value)||0;
  var cBuy   = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="cubicBuy"]')?.value)||0;
  var discS  = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="discountSell"]')?.value)||0;
  var discB  = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="discountBuy"]')?.value)||0;
  var disc   = discS || discB || 0; // fallback
  var sPrice = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="sellPrice"]')?.value)||0;
  var bPrice = Number(document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="buyPrice"]')?.value)||0;

  // إذا تغيّر خصم العميل → يُطبَّق تلقائياً على المورد
  if(field === 'discountSell'){
    var discBInput = document.querySelector('[data-sk="'+sk+'"][data-li="'+li+'"][data-field="discountBuy"]');
    if(discBInput){
      discBInput.value = discS;
      discB = discS;
    }
  }

  // Update client net/total preview
  var netC = document.getElementById('net-c-'+sk+'-'+li);
  var totC = document.getElementById('tot-c-'+sk+'-'+li);
  if(cSell && netC){
    var nc = Math.max(0, trips*cSell - discS);
    netC.textContent = nc.toFixed(1);
    if(totC) totC.textContent = curr(nc*sPrice);
  }
  // Update supplier net/total preview
  var netS = document.getElementById('net-s-'+sk+'-'+li);
  var totS = document.getElementById('tot-s-'+sk+'-'+li);
  if(cBuy && netS){
    var nb = Math.max(0, trips*cBuy - (field==='discountSell'?discS:discB));
    netS.textContent = nb.toFixed(1);
    if(totS) totS.textContent = curr(nb*bPrice);
  }
};

// ── Save row back to sarkis ───────────────────────────────────────
// ── calcLine fallback for keshf al-kamiyat ──
function calcLine(line){
  var trips  = Number(line.trips)||0;
  // Sell side
  var cSell  = Number(line.cubicSell!=null ? line.cubicSell : line.cubicPerTrip)||0;
  var discS  = Number(line.discountSell!=null ? line.discountSell : line.discountM)||0;
  var sPrice = Number(line.sellPrice)||0;
  var grossC = trips * cSell;
  var netC   = Math.max(0, grossC - discS);
  line.grossCubic  = grossC;
  line.netCubic    = netC;
  line.netSell     = netC;
  line.sellTotal   = netC * sPrice;
  // Buy side
  var cBuy   = Number(line.cubicBuy!=null ? line.cubicBuy : line.cubicPerTrip)||0;
  var discB  = Number(line.discountBuy!=null ? line.discountBuy : line.discountM)||0;
  var bPrice = Number(line.buyPrice)||0;
  var grossB = trips * cBuy;
  var netB   = Math.max(0, grossB - discB);
  line.grossCubic  = line.grossCubic || grossB;
  line.netCubic    = line.netCubic  || netB;
  line.buyTotal    = netB * bPrice;
  line.profit      = line.sellTotal - line.buyTotal;
  return line;
}

window.saveQtyRow = function(btn){
  var skId = Number(btn.getAttribute('data-sk'));
  var li   = Number(btn.getAttribute('data-li'));
  var mode = btn.getAttribute('data-mode');

  var sk = DB.getById('sarkis', skId);
  if(!sk){ toast('الحافظة غير موجودة','error'); return; }

  var lines = sk.lines ? sk.lines.slice() : [];
  if(!lines[li]){ toast('السطر غير موجود','error'); return; }

  var line = Object.assign({}, lines[li]);

  var trips = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="trips"]')?.value)||0;
  var discS = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="discountSell"]')?.value)||0;
  var discB = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="discountBuy"]')?.value)||0;
  line.trips = trips;
  if(mode==='client'){
    line.discountSell = discS;
    line.discountM    = discS;
    line.discountBuy  = discS; // خصم العميل يسمع في المورد
  } else {
    line.discountBuy  = discB;
    // خصم المورد لا يُطبَّق على العميل
  }

  if(mode==='client'){
    var cSell  = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="cubicSell"]')?.value)||0;
    var sPrice = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="sellPrice"]')?.value)||0;
    line.cubicSell = cSell;
    line.sellPrice = sPrice;
  } else {
    var cBuy   = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="cubicBuy"]')?.value)||0;
    var bPrice = Number(document.querySelector('[data-sk="'+skId+'"][data-li="'+li+'"][data-field="buyPrice"]')?.value)||0;
    line.cubicBuy = cBuy;
    line.buyPrice = bPrice;
  }

  line = calcLine(line);
  lines[li] = line;
  var totals = calcSarkiTotals(lines);

  DB.update('sarkis', skId, Object.assign({}, sk, {
    lines:       lines,
    totalSell:   totals.totalSell,
    totalBuy:    totals.totalBuy,
    totalProfit: totals.totalProfit,
    totalTrips:  totals.totalTrips,
  }));

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
  if(!tbl){ toast('لا توجد بيانات','error'); return; }
  var clone = tbl.cloneNode(true);
  clone.querySelectorAll('input').forEach(function(inp){
    var td=inp.closest('td'); if(td) td.innerHTML='<span>'+inp.value+'</span>';
  });
  clone.querySelectorAll('th:last-child,td:last-child').forEach(function(el){ el.remove(); });
  _pw('كشف كميات العميل', printHeaderHTML()+clone.outerHTML);
}

function printSupplierQty(){
  var tbl = document.getElementById('sq-table');
  if(!tbl){ toast('لا توجد بيانات','error'); return; }
  var clone = tbl.cloneNode(true);
  clone.querySelectorAll('input').forEach(function(inp){
    var td=inp.closest('td'); if(td) td.innerHTML='<span>'+inp.value+'</span>';
  });
  clone.querySelectorAll('th:last-child,td:last-child').forEach(function(el){ el.remove(); });
  _pw('كشف كميات المورد', printHeaderHTML()+clone.outerHTML);
}

// ══ EXCEL EXPORT FUNCTIONS ════════════════════════════════════════

function xlsxExport(sheetData, filename, sheetName){
  if(typeof XLSX === 'undefined'){ toast('مكتبة Excel غير محملة','error'); return; }
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto column widths based on content
  if(sheetData.length > 0){
    var colWidths = sheetData[0].map(function(_,ci){
      var max = 8;
      sheetData.forEach(function(row){
        if(row[ci]===undefined||row[ci]===null) return;
        var len = String(row[ci]).length;
        if(len > max) max = len;
      });
      return {wch: Math.min(max+2, 45)};
    });
    ws['!cols'] = colWidths;
  }

  // Freeze top rows (header area)
  ws['!freeze'] = {xSplit:0, ySplit:4, topLeftCell:'A5', activePane:'bottomLeft'};

  XLSX.utils.book_append_sheet(wb, ws, sheetName||'بيانات');
  XLSX.writeFile(wb, filename+'.xlsx');
  toast('✅ تم تصدير '+filename+'.xlsx');
}

// ── كشف الحساب المتحرك → Excel ──────────────────────────────────
function exportRunningBalExcel(){
  var selType   = window._RB_TYPE   || 'client';
  var selEntity = window._RB_CLIENT || '';
  var from      = window._RB_FROM   || '';
  var to        = window._RB_TO     || '';
  if(!selEntity){ toast('اختر العميل أو المورد أولاً','error'); return; }

  var co = DB.getCompany();
  var rows = [];
  var runBal = 0;
  var txns = [];

  if(selType==='client'){
    var cust = DB.getAll('customers').find(function(c){ return c.name===selEntity; });
    var ob = Number(cust?.openingBalance)||0;
    runBal = ob;
    if(ob!==0) txns.push({date:'',type:'رصيد أول المدة',desc:'رصيد افتتاحي',debit:ob>0?ob:0,credit:ob<0?Math.abs(ob):0});
    DB.getAll('sarkis').filter(function(sk){
      return sk.client===selEntity&&sk.status!=='ملغي'&&(!from||sk.date>=from)&&(!to||sk.date<=to);
    }).forEach(function(sk){
      var trips=0, netM3=0;
      (sk.lines||[]).forEach(function(ln){
        trips += Number(ln.trips)||0;
        netM3 += Number(ln.netSell!=null?ln.netSell:ln.netCubic)||0;
      });
      txns.push({date:sk.date,type:'فاتورة',desc:'حافظة #'+sk.id+' — '+sk.material,
        debit:Number(sk.totalSell)||0,credit:0,ref:'#'+sk.id,trips:trips,netM3:netM3});
    });
    DB.getAll('journal').filter(function(j){
      return j.party===selEntity&&j.partyType==='عميل'&&(!from||(j.date||'')>=from)&&(!to||(j.date||'')<=to);
    }).forEach(function(j){
      if(j.entryType==='تحصيل')
        txns.push({date:j.date,type:'تحصيل',desc:j.description||'تحصيل',debit:0,credit:Number(j.amount)||0});
      else if(j.entryType==='يدوي'&&j.creditCode==='1010')
        txns.push({date:j.date,type:'تحصيل يدوي',desc:j.description||'قيد يدوي',debit:0,credit:Number(j.creditAmount)||0});
    });
  } else {
    var supp = DB.getAll('suppliers').find(function(s){ return s.name===selEntity; });
    var ob2 = Number(supp?.openingBalance)||0;
    runBal = ob2;
    if(ob2!==0) txns.push({date:'',type:'رصيد أول المدة',desc:'رصيد افتتاحي',debit:0,credit:ob2>0?ob2:0});
    DB.getAll('sarkis').filter(function(sk){
      return sk.supplier===selEntity&&sk.status!=='ملغي'&&(!from||sk.date>=from)&&(!to||sk.date<=to);
    }).forEach(function(sk){
      var trips=0, netM3=0;
      (sk.lines||[]).forEach(function(ln){
        trips += Number(ln.trips)||0;
        netM3 += Number(ln.netBuy!=null?ln.netBuy:ln.netCubic)||0;
      });
      txns.push({date:sk.date,type:'فاتورة شراء',desc:'حافظة #'+sk.id+' — '+sk.material,
        debit:0,credit:Number(sk.totalBuy)||0,ref:'#'+sk.id,trips:trips,netM3:netM3});
    });
    DB.getAll('journal').filter(function(j){
      return j.party===selEntity&&j.partyType==='مورد'&&(!from||(j.date||'')>=from)&&(!to||(j.date||'')<=to);
    }).forEach(function(j){
      if(j.entryType==='دفع')
        txns.push({date:j.date,type:'دفع',desc:j.description||'دفع',debit:Number(j.amount)||0,credit:0});
      else if(j.entryType==='يدوي'&&j.debitCode==='2001')
        txns.push({date:j.date,type:'دفع يدوي',desc:j.description||'قيد يدوي',debit:Number(j.debitAmount)||0,credit:0});
    });
  }

  txns.sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });

  var header = [
    [co.name||'شركة الهنا للنقل','','','','','كشف الحساب المتحرك',''],
    [selEntity,'','','','','من: '+(from||'البداية'),'إلى: '+(to||'اليوم')],
    [],
    ['التاريخ','النوع','البيان','نقلات','م³ صافي','الرصيد الواصل (مدين)','الرصيد الواصل (دائن)','الرصيد الباقي'],
  ];

  var dataRows = txns.map(function(t){
    runBal += t.debit - t.credit;
    return [
      t.date ? t.date.split('-').reverse().join('/') : '—',
      t.type,
      t.desc + (t.ref?'  '+t.ref:''),
      t.trips!=null ? t.trips : '',
      t.netM3!=null ? parseFloat(t.netM3.toFixed(1)) : '',
      t.debit||'',
      t.credit||'',
      runBal,
    ];
  });

  var totDebit  = txns.reduce(function(s,t){ return s+t.debit; },0);
  var totCredit = txns.reduce(function(s,t){ return s+t.credit; },0);
  var totTrips  = txns.reduce(function(s,t){ return s+(t.trips||0); },0);
  var totNetM3  = txns.reduce(function(s,t){ return s+(t.netM3||0); },0);
  var footer = [['','','الإجمالي',totTrips,parseFloat(totNetM3.toFixed(1)),totDebit,totCredit,runBal]];

  xlsxExport(header.concat(dataRows).concat(footer),
    'كشف_حساب_'+selEntity, 'كشف الحساب');
}

// ── كشف كميات العميل → Excel ─────────────────────────────────────
function exportClientQtyExcel(){
  var selClient = window._CQ_CLIENT || '';
  var from      = window._CQ_FROM   || '';
  var to        = window._CQ_TO     || '';
  var co = DB.getCompany();

  var rows = [];
  DB.getAll('sarkis').forEach(function(sk){
    if(selClient && sk.client!==selClient) return;
    if(from && sk.date<from) return;
    if(to   && sk.date>to)   return;
    (sk.lines||[]).forEach(function(ln){
      var trips     = Number(ln.trips)||0;
      var cubicSell = ln.cubicSell!=null ? Number(ln.cubicSell) : Number(ln.cubicPerTrip)||0;
      var cubicBuy  = ln.cubicBuy!=null  ? Number(ln.cubicBuy)  : Number(ln.cubicPerTrip)||0;
      var discSell  = ln.discountSell!=null ? Number(ln.discountSell) : Number(ln.discountM)||0;
      var discBuy   = ln.discountBuy!=null  ? Number(ln.discountBuy)  : Number(ln.discountM)||0;
      var netSell   = Math.max(0, trips*cubicSell - discSell);
      var netBuy    = Math.max(0, trips*cubicBuy  - discBuy);
      var sellPrice = Number(ln.sellPrice)||0;
      var buyPrice  = Number(ln.buyPrice)||0;
      rows.push([
        '#'+sk.id,
        sk.date ? sk.date.split('-').reverse().join('/') : '',
        sk.client, sk.supplier, sk.material,
        ln.plateNo||'', ln.driverName||'',
        trips,
        cubicSell, discSell, netSell, sellPrice, netSell*sellPrice,
        cubicBuy,  discBuy,  netBuy,  buyPrice,  netBuy*buyPrice,
        sk.status||'',
      ]);
    });
  });
  rows.sort(function(a,b){ return (b[1]||'').localeCompare(a[1]||''); });

  var cols = ['الحافظة','التاريخ','العميل','المورد','الخامة','السيارة','السائق',
    'نقلات',
    'م³ عميل','خصم م³ عميل','م³ صافي عميل','سعر البيع','إجمالي البيع',
    'م³ مورد','خصم م³ مورد','م³ صافي مورد','سعر الشراء','إجمالي التكلفة',
    'الحالة'];

  var hdrSpan = new Array(cols.length).fill('');
  var header = [
    Object.assign(hdrSpan.slice(), {0: co.name||'شركة الهنا للنقل', 5:'كشف كميات العميل التفصيلي'}),
    Object.assign(hdrSpan.slice(), {0: selClient||'كل العملاء', 4:'من: '+(from||'البداية'), 5:'إلى: '+(to||'اليوم')}),
    [],
    cols,
  ];

  var totRow = new Array(cols.length).fill('');
  totRow[6]  = 'الإجمالي';
  totRow[7]  = rows.reduce(function(s,r){return s+r[7];},0);
  totRow[10] = rows.reduce(function(s,r){return s+r[10];},0);
  totRow[12] = rows.reduce(function(s,r){return s+r[12];},0);
  totRow[15] = rows.reduce(function(s,r){return s+r[15];},0);
  totRow[17] = rows.reduce(function(s,r){return s+r[17];},0);

  xlsxExport(header.concat(rows).concat([totRow]),
    'كشف_كميات_عميل'+(selClient?'_'+selClient:''), 'كميات العميل');
}

// ── كشف كميات المورد → Excel ─────────────────────────────────────
function exportSupplierQtyExcel(){
  var selSupp = window._SQ_SUPP || '';
  var from    = window._SQ_FROM || '';
  var to      = window._SQ_TO   || '';
  var co = DB.getCompany();

  var rows = [];
  DB.getAll('sarkis').forEach(function(sk){
    if(selSupp && sk.supplier!==selSupp) return;
    if(from && sk.date<from) return;
    if(to   && sk.date>to)   return;
    (sk.lines||[]).forEach(function(ln){
      var trips     = Number(ln.trips)||0;
      var cubicSell = ln.cubicSell!=null ? Number(ln.cubicSell) : Number(ln.cubicPerTrip)||0;
      var cubicBuy  = ln.cubicBuy!=null  ? Number(ln.cubicBuy)  : Number(ln.cubicPerTrip)||0;
      var discSell  = ln.discountSell!=null ? Number(ln.discountSell) : Number(ln.discountM)||0;
      var discBuy   = ln.discountBuy!=null  ? Number(ln.discountBuy)  : Number(ln.discountM)||0;
      var netSell   = Math.max(0, trips*cubicSell - discSell);
      var netBuy    = Math.max(0, trips*cubicBuy  - discBuy);
      var sellPrice = Number(ln.sellPrice)||0;
      var buyPrice  = Number(ln.buyPrice)||0;
      var stored    = Number(ln.buyTotal)||0;
      rows.push([
        '#'+sk.id,
        sk.date ? sk.date.split('-').reverse().join('/') : '',
        sk.client, sk.supplier, sk.material,
        ln.plateNo||'', ln.driverName||'',
        trips,
        cubicSell, discSell, netSell, sellPrice, netSell*sellPrice,
        cubicBuy,  discBuy,  netBuy,  buyPrice,
        buyPrice>0 ? netBuy*buyPrice : stored,
        stored,
        sk.status||'',
      ]);
    });
  });
  rows.sort(function(a,b){ return (b[1]||'').localeCompare(a[1]||''); });

  var cols = ['الحافظة','التاريخ','العميل','المورد','الخامة','السيارة','السائق',
    'نقلات',
    'م³ عميل','خصم م³ عميل','م³ صافي عميل','سعر البيع','إجمالي البيع',
    'م³ مورد','خصم م³ مورد','م³ صافي مورد','سعر الشراء','إجمالي التكلفة',
    'محفوظ','الحالة'];

  var hdrSpan = new Array(cols.length).fill('');
  var header = [
    Object.assign(hdrSpan.slice(), {0: co.name||'شركة الهنا للنقل', 5:'كشف كميات المورد التفصيلي'}),
    Object.assign(hdrSpan.slice(), {0: selSupp||'كل الموردين', 4:'من: '+(from||'البداية'), 5:'إلى: '+(to||'اليوم')}),
    [],
    cols,
  ];

  var totRow = new Array(cols.length).fill('');
  totRow[6]  = 'الإجمالي';
  totRow[7]  = rows.reduce(function(s,r){return s+r[7];},0);
  totRow[10] = rows.reduce(function(s,r){return s+r[10];},0);
  totRow[12] = rows.reduce(function(s,r){return s+r[12];},0);
  totRow[15] = rows.reduce(function(s,r){return s+r[15];},0);
  totRow[17] = rows.reduce(function(s,r){return s+r[17];},0);
  totRow[18] = rows.reduce(function(s,r){return s+r[18];},0);

  xlsxExport(header.concat(rows).concat([totRow]),
    'كشف_كميات_مورد'+(selSupp?'_'+selSupp:''), 'كميات المورد');
}


// ── إشعارات المديونية → Excel ────────────────────────────────────
function exportNotesExcel(){
  var threshold = Number(window._NT_THRESH)||0;
  var co = DB.getCompany();

  var rows = DB.getAll('customers').map(function(c){
    var ob    = Number(c.openingBalance)||0;
    var sells = DB.getAll('sarkis').filter(function(s){return s.client===c.name&&s.status!=='ملغي';})
                  .reduce(function(t,s){return t+(Number(s.totalSell)||0);},0);
    var colls = DB.getAll('journal').filter(function(j){return j.entryType==='تحصيل'&&j.party===c.name;})
                  .reduce(function(t,j){return t+(Number(j.amount)||0);},0);
    var bal = ob+sells-colls;
    return {name:c.name,phone:c.phone||'',sells:sells,colls:colls,bal:bal};
  }).filter(function(c){return c.bal>threshold;})
    .sort(function(a,b){return b.bal-a.bal;});

  var header = [
    [co.name||'شركة الهنا للنقل','','','كشف المديونيات',''],
    ['الأرصدة أعلى من: '+threshold+' ج.م','','','',''],
    [],
    ['م','العميل','الهاتف','إجمالي المبيعات','إجمالي التحصيل','الرصيد المدين'],
  ];

  var dataRows = rows.map(function(c,i){
    return [i+1, c.name, c.phone, c.sells, c.colls, c.bal];
  });

  var totRow = ['','الإجمالي','',
    rows.reduce(function(s,c){return s+c.sells;},0),
    rows.reduce(function(s,c){return s+c.colls;},0),
    rows.reduce(function(s,c){return s+c.bal;},0),
  ];

  xlsxExport(header.concat(dataRows).concat([totRow]), 'كشف_المديونيات', 'المديونيات');
}
