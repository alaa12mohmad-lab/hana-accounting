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
}

function closeModalOnBg(e){
  if(e.target===document.getElementById('modal-overlay')) closeModal();
}

// ── Helpers ───────────────────────────────────────────────────────
function todayStr(){ return new Date().toISOString().slice(0,10); }

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
           'تم الصرف':'green','مرتجع':'red','تحصيل':'green','دفع':'red','يدوي':'blue'};
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
  const mc=document.getElementById('modal-content');
  const mt=document.getElementById('modal-title');
  const mb=document.getElementById('modal-body');
  const mf=document.getElementById('modal-footer');
  if(!ov||!mc) return;
  if(mt) mt.textContent=title;
  if(mb) mb.innerHTML=body;
  if(mf) mf.innerHTML=footer||'';
  mc.className='modal-content '+cls;
  ov.style.display='flex';
  document.body.style.overflow='hidden';
}
function closeModal(){
  const ov=document.getElementById('modal-overlay');
  if(ov) ov.style.display='none';
  document.body.style.overflow='';
}

// ── onDBReady wrapper ─────────────────────────────────────────────
function onDBReady(fn){
  if(typeof DB!=='undefined' && DB.isReady && DB.isReady()) fn();
  else if(typeof DB!=='undefined' && DB.onReady) DB.onReady(fn);
  else setTimeout(fn, 500);
}

// ── calcLine ──────────────────────────────────────────────────────
function calcLine(l){
  var trips     = Number(l.trips)     || 0;
  var discountM = Number(l.discountM) || 0;
  var sellPrice = Number(l.sellPrice) || 0;
  var buyPrice  = Number(l.buyPrice)  || 0;

  var cubicSell = (l.cubicSell != null && l.cubicSell !== '')
    ? Number(l.cubicSell)
    : (Number(l.cubicPerTrip) || 0);
  var cubicBuy  = (l.cubicBuy  != null && l.cubicBuy  !== '')
    ? Number(l.cubicBuy)
    : (Number(l.cubicPerTrip) || 0);

  var grossSell = trips * cubicSell;
  var grossBuy  = trips * cubicBuy;
  var netSell   = Math.max(0, grossSell - discountM);
  var netBuy    = Math.max(0, grossBuy  - discountM);

  return Object.assign({}, l, {
    grossCubic:  parseFloat(grossSell.toFixed(3)),
    grossSell:   parseFloat(grossSell.toFixed(3)),
    grossBuy:    parseFloat(grossBuy.toFixed(3)),
    netCubic:    parseFloat(netSell.toFixed(3)),
    netSell:     parseFloat(netSell.toFixed(3)),
    netBuy:      parseFloat(netBuy.toFixed(3)),
    sellTotal:   parseFloat((netSell * sellPrice).toFixed(2)),
    buyTotal:    parseFloat((netBuy  * buyPrice).toFixed(2)),
    profit:      parseFloat((netSell * sellPrice - netBuy * buyPrice).toFixed(2)),
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
  return {
    totalSell:   parseFloat(totSell.toFixed(2)),
    totalBuy:    parseFloat(totBuy.toFixed(2)),
    totalProfit: parseFloat((totSell-totBuy).toFixed(2)),
    totalTrips:  totTrips,
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
  const sells=DB.getAll('sarkis').filter(s=>s.client===name&&s.status!=='ملغي').reduce((t,s)=>t+(Number(s.totalSell)||0),0);
  const colls=DB.getAll('journal').filter(j=>j.entryType==='تحصيل'&&j.party===name).reduce((t,j)=>t+(Number(j.amount)||0),0);
  return ob+sells-colls;
}
function getSupplierBalance(name){
  const s=DB.getAll('suppliers').find(x=>x.name===name);
  const ob=Number(s?.openingBalance)||0;
  const buys=DB.getAll('sarkis').filter(sk=>sk.supplier===name&&sk.status!=='ملغي').reduce((t,sk)=>t+(Number(sk.totalBuy)||0),0);
  const pmts=DB.getAll('journal').filter(j=>j.entryType==='دفع'&&j.party===name).reduce((t,j)=>t+(Number(j.amount)||0),0);
  return ob+buys-pmts;
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
