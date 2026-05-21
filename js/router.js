// ═══ ROUTER & HELPERS ════════════════════════════════════════════

// ── Global page registry ──────────────────────────────────────────
const PAGES = {};

function nav(page){
  document.querySelectorAll('.sb-link').forEach(el=>{
    el.classList.toggle('active', el.getAttribute('onclick')===`nav('${page}')`);
  });
  const titleEl = document.getElementById('tb-title');
  if(titleEl) titleEl.textContent = PAGE_TITLES[page]||page;
  const el = document.getElementById('content');
  if(!el) return;
  const renderer = PAGES[page];
  if(renderer){
    el.innerHTML = typeof renderer==='function' ? renderer() : '';
  } else {
    el.innerHTML = '<div class="card" style="margin:20px;text-align:center;padding:40px">'
      +'<div style="font-size:36px">🚧</div><p class="text-gray mt8">الصفحة قيد التطوير</p></div>';
  }
  window.scrollTo(0,0);
  // Build qty footers after render (DOM is ready now)
  if(page==='clientQty'   && typeof buildQtyFooter==='function') buildQtyFooter('cq-table');
  if(page==='supplierQty' && typeof buildQtyFooter==='function') buildQtyFooter('sq-table');
}

function closeModalOnBg(e){
  if(e.target===document.getElementById('modal-overlay')) closeModal();
}

// ── Helpers ───────────────────────────────────────────────────────
function todayStr(){ return new Date().toISOString().slice(0,10); }
function pct(n){ return ((Number(n)||0)*100).toFixed(1)+'%'; }
function writeShadowCopy(){}
function tryRecoverFromShadow(){}
function renderBackupBar(){}

function curr(n){
  return new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م';
}
function num(n){
  return new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0);
}
function fmtDate(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  return isNaN(d)?'—':d.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function badge(t,c='blue'){
  const colors={blue:'#1d4ed8',green:'#16a34a',red:'#dc2626',orange:'#ea580c',
    yellow:'#d97706',purple:'#7c3aed',gray:'#64748b',teal:'#0f766e',pink:'#db2777'};
  const col=colors[c]||c;
  return `<span style="background:${col}20;color:${col};border:1px solid ${col}40;`
    +`padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">${t}</span>`;
}
function statusBadge(s){
  const m={'مفتوح':'yellow','معتمد':'green','ملغي':'red','معلق':'yellow',
           'تم الصرف':'green','مرتجع':'red',
           'تحصيل':'green','تحصيل يدوي':'teal',
           'دفع':'red','دفع يدوي':'pink',
           'يدوي':'blue','فاتورة':'orange','فاتورة شراء':'purple',
           'رصيد أول المدة':'gray'};
  return badge(s, m[s]||'gray');
}
function toast(msg,type='success'){
  const t=document.createElement('div');
  t.className='toast '+(type==='error'?'toast-error':type==='warn'?'toast-warn':'toast-ok');
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

// ── Print ─────────────────────────────────────────────────────────
const PRINT_CSS_BASE=`*{font-family:Tahoma,sans-serif;direction:rtl;margin:0;padding:0;box-sizing:border-box}
body{padding:14px;font-size:11px;color:#1f2937}
.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1F4E78;padding-bottom:9px;margin-bottom:12px}
.co{font-size:16px;font-weight:700;color:#1F4E78}
table{width:100%;border-collapse:collapse;font-size:10px}
thead tr{background:#1F4E78;color:#fff}thead th{padding:6px 5px;text-align:right}
tbody tr:nth-child(even){background:#f5f8fc}tbody td{padding:4px 5px;border-bottom:1px solid #eee}
tfoot tr{background:#FFE699;font-weight:700}tfoot td{padding:6px 5px}
@media print{@page{margin:9mm;size:A4}body{padding:0}}`;

function _pw(title,body){
  const w=window.open('','_blank');
  const co=DB.getCompany();
  const sc='<scr'+'ipt>setTimeout(()=>window.print(),700)<'+'/scr'+'ipt>';
  w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>'+title
    +'</title><style>'+PRINT_CSS_BASE+'</style></head><body>'
    +'<div class="hdr"><div class="co">'+(co.name||'شركة الهنا للنقل')
    +'</div><div style="font-size:10px;color:#666">'+fmtDate(Date.now())+'</div></div>'
    +body+sc+'</body></html>');
  w.document.close();
}

function printHeaderHTML(){
  const co=DB.getCompany();
  return '<div class="hdr"><div class="co">'+(co.name||'شركة الهنا للنقل')
    +(co.crNumber?'<div style="font-size:9px;color:#666">س.ت: '+co.crNumber+'</div>':'')
    +'</div><div style="text-align:left;font-size:10px;color:#666">'+fmtDate(Date.now())+'</div></div>';
}

// ── Modal ─────────────────────────────────────────────────────────
function openModal(title, body, footer, cls='modal-lg'){
  const ov=document.getElementById('modal-overlay');
  const mc=document.getElementById('modal-box');       // was modal-content
  const mt=document.getElementById('modal-title');
  const mb=document.getElementById('modal-body');
  const mf=document.getElementById('modal-foot');     // was modal-footer
  if(!ov) return;
  if(mt) mt.textContent=title;
  if(mb) mb.innerHTML=body;
  if(mf) mf.innerHTML=footer||'';
  if(mc) mc.className='modal '+cls;
  ov.style.display='flex';
  document.body.style.overflow='hidden';
}



// ── onDBReady wrapper ─────────────────────────────────────────────
function onDBReady(fn){
  if(typeof DB!=='undefined' && DB.isReady && DB.isReady()) fn();
  else if(typeof DB!=='undefined' && DB.onReady) DB.onReady(fn);
  else setTimeout(fn, 500);
}

// ── calcLine ──────────────────────────────────────────────────────
function calcLine(l){
  var trips      = Number(l.trips)      || 0;
  var sellPrice  = Number(l.sellPrice)  || 0;
  var buyPrice   = Number(l.buyPrice)   || 0;

  var cubicSell  = (l.cubicSell != null && l.cubicSell !== '')
    ? Number(l.cubicSell) : (Number(l.cubicPerTrip) || 0);
  var cubicBuy   = (l.cubicBuy  != null && l.cubicBuy  !== '')
    ? Number(l.cubicBuy)  : (Number(l.cubicPerTrip) || 0);

  // خصم منفصل للعميل والمورد
  // discountSell = خصم العميل, discountBuy = خصم المورد
  // discountM = خصم مشترك قديم (للتوافق مع البيانات القديمة)
  var discountSell = (l.discountSell != null && l.discountSell !== '')
    ? Number(l.discountSell) : (Number(l.discountM) || 0);
  var discountBuy  = (l.discountBuy  != null && l.discountBuy  !== '')
    ? Number(l.discountBuy)  : (Number(l.discountM) || 0);

  var grossSell  = trips * cubicSell;
  var grossBuy   = trips * cubicBuy;
  var netSell    = Math.max(0, grossSell - discountSell);
  var netBuy     = Math.max(0, grossBuy  - discountBuy);

  return Object.assign({}, l, {
    discountSell:  parseFloat(discountSell.toFixed(3)),
    discountBuy:   parseFloat(discountBuy.toFixed(3)),
    grossCubic:    parseFloat(grossSell.toFixed(3)),
    grossSell:     parseFloat(grossSell.toFixed(3)),
    grossBuy:      parseFloat(grossBuy.toFixed(3)),
    netCubic:      parseFloat(netSell.toFixed(3)),
    netSell:       parseFloat(netSell.toFixed(3)),
    netBuy:        parseFloat(netBuy.toFixed(3)),
    sellTotal:     parseFloat((netSell * sellPrice).toFixed(2)),
    buyTotal:      parseFloat((netBuy  * buyPrice).toFixed(2)),
    profit:        parseFloat((netSell * sellPrice - netBuy * buyPrice).toFixed(2)),
  });
}

// ── calcSarkiTotals ───────────────────────────────────────────────
function calcSarkiTotals(lines){
  var totSell=0, totBuy=0, totTrips=0;
  (lines||[]).forEach(function(l){
    totSell  += Number(l.sellTotal)||0;
    totBuy   += Number(l.buyTotal)||0;
    totTrips += Number(l.trips)||0;
  });
  var totGross=0, totNet=0;
  (lines||[]).forEach(function(l){
    totGross += Number(l.grossCubic||l.grossSell)||0;
    totNet   += Number(l.netCubic||l.netSell)||0;
  });
  return {
    totalSell:   parseFloat(totSell.toFixed(2)),
    totalBuy:    parseFloat(totBuy.toFixed(2)),
    totalProfit: parseFloat((totSell-totBuy).toFixed(2)),
    totalTrips:  totTrips,
    totalGross:  parseFloat(totGross.toFixed(3)),
    totalNet:    parseFloat(totNet.toFixed(3)),
  };
}

// ── getPartnerCommission ──────────────────────────────────────────
function getPartnerCommission(lines, sharePercent){
  var total = (lines||[]).reduce(function(s,l){
    return s + (Number(l.profit)||0);
  }, 0);
  return total * (Number(sharePercent)||0) / 100;
}

// ── excelDateToStr ────────────────────────────────────────────────
function excelDateToStr(val){
  if(!val) return '';
  if(typeof val==='string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if(typeof val==='number' || (typeof val==='string' && !isNaN(val))){
    var n=Number(val);
    if(n>1000 && n<200000){
      var utcMs=Math.round((n-25569)*86400*1000);
      var localMs=utcMs+(new Date().getTimezoneOffset()*-60000);
      var d=new Date(localMs);
      return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
    }
  }
  if(val instanceof Date){
    return val.getFullYear()+'-'+String(val.getMonth()+1).padStart(2,'0')+'-'+String(val.getDate()).padStart(2,'0');
  }
  try{
    var parsed=new Date(val);
    if(!isNaN(parsed)){
      return parsed.getFullYear()+'-'+String(parsed.getMonth()+1).padStart(2,'0')+'-'+String(parsed.getDate()).padStart(2,'0');
    }
  }catch(e){}
  return '';
}

// ── Balance helpers ───────────────────────────────────────────────
function getCustomerBalance(name){
  const c=DB.getAll('customers').find(x=>x.name===name);
  const ob=Number(c?.openingBalance)||0;
  const sells=DB.getAll('sarkis').filter(s=>s.client===name&&s.status!=='ملغي')
    .reduce((t,s)=>t+(Number(s.totalSell)||0),0);
  const jEntries = DB.getAll('journal').filter(j=>j.party===name&&j.partyType==='عميل');
  // تحصيل مباشر (زر تحصيل من عميل)
  const colls=jEntries.filter(j=>j.entryType==='تحصيل').reduce((t,j)=>t+(Number(j.amount)||0),0);
  // قيد يدوي يخصم ذمم العملاء (دائن 1010)
  const manualColls=jEntries.filter(j=>j.entryType==='يدوي'&&j.creditCode==='1010')
    .reduce((t,j)=>t+(Number(j.creditAmount)||0),0);
  return ob+sells-colls-manualColls;
}
function getSupplierBalance(name){
  const s=DB.getAll('suppliers').find(x=>x.name===name);
  const ob=Number(s?.openingBalance)||0;
  const buys=DB.getAll('sarkis').filter(sk=>sk.supplier===name&&sk.status!=='ملغي')
    .reduce((t,sk)=>t+(Number(sk.totalBuy)||0),0);
  const jEntries = DB.getAll('journal').filter(j=>j.party===name&&j.partyType==='مورد');
  // دفع مباشر (زر دفع للمورد)
  const pmts=jEntries.filter(j=>j.entryType==='دفع').reduce((t,j)=>t+(Number(j.amount)||0),0);
  // قيد يدوي يخصم ذمم الموردين (مدين 2001)
  const manualPmts=jEntries.filter(j=>j.entryType==='يدوي'&&j.debitCode==='2001')
    .reduce((t,j)=>t+(Number(j.debitAmount)||0),0);
  return ob+buys-pmts-manualPmts;
}
function getCustomerPrice(customerName, materialName, date){
  const c=DB.getAll('customers').find(x=>x.name===customerName);
  if(!c||!c.prices) return null;
  const valid=c.prices.filter(p=>p.material===materialName&&(!date||p.from<=date)).sort((a,b)=>b.from.localeCompare(a.from));
  return valid[0]?.price||null;
}
function getSupplierPrice(supplierName, materialName, date){
  const s=DB.getAll('suppliers').find(x=>x.name===supplierName);
  if(!s||!s.prices) return null;
  const valid=s.prices.filter(p=>p.material===materialName&&(!date||p.from<=date)).sort((a,b)=>b.from.localeCompare(a.from));
  return valid[0]?.price||null;
}
function getLastStatement(name,type){
  return DB.getAll('statements').filter(s=>s.entityName===name&&s.type===type&&s.status==='معتمد').sort((a,b)=>b.approvedAt-a.approvedAt)[0]||null;
}

// ── Journal account helpers ───────────────────────────────────────
function debitAccount(payType){
  if(!payType||payType==='نقدي'||payType==='كاش') return {code:'1001',name:'الصندوق'};
  if(payType==='بنك'||payType==='تحويل') return {code:'1002',name:'البنك'};
  if(payType==='شيك فوري') return {code:'1002',name:'البنك'};
  if(payType==='شيك آجل')  return {code:'1003',name:'أوراق قبض'};
  return {code:'1001',name:'الصندوق'};
}
function creditAccount(payType){
  if(!payType||payType==='نقدي'||payType==='كاش') return {code:'1001',name:'الصندوق'};
  if(payType==='بنك'||payType==='تحويل') return {code:'1002',name:'البنك'};
  if(payType==='شيك فوري') return {code:'1002',name:'البنك'};
  if(payType==='شيك آجل')  return {code:'2002',name:'أوراق دفع'};
  return {code:'1001',name:'الصندوق'};
}

// ── Confirm delete helper ─────────────────────────────────────────
function confirmDelete(msg, cb){
  if(typeof cb === 'function'){
    // Callback pattern: confirmDelete('message', ()=>{...})
    if(window.confirm(msg||'هل تريد الحذف؟')) cb();
  } else {
    // Return value pattern: if(confirmDelete('message'))
    return window.confirm(msg||'هل تريد الحذف؟');
  }
}

// ── Show auth error helper ────────────────────────────────────────
function showAuthErr(id,msg){
  var el=document.getElementById(id);
  if(el){el.style.display='flex';el.innerHTML='<span>❌</span><span>'+msg+'</span>';}
}
function clearAuthErr(id){
  var el=document.getElementById(id);
  if(el){el.style.display='none';el.innerHTML='';}
}
function showAuthTab(tab){
  var li=document.getElementById('auth-login');
  var re=document.getElementById('auth-register');
  var tl=document.getElementById('tab-login');
  var tr=document.getElementById('tab-register');
  if(tab==='login'){
    if(li)li.style.display='';if(re)re.style.display='none';
    if(tl)tl.classList.add('active-tab');if(tr)tr.classList.remove('active-tab');
  } else {
    if(li)li.style.display='none';if(re)re.style.display='';
    if(tl)tl.classList.remove('active-tab');if(tr)tr.classList.add('active-tab');
  }
}
