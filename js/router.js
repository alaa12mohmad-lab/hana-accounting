// ═══ ROUTER & HELPERS ═══

// ── Shared Helpers ───────────────────────────────────────────────
function todayStr(){ return new Date().toISOString().slice(0,10); }

function writeShadowCopy(){ /* Firebase handles persistence */ }
function tryRecoverFromShadow(){ /* no-op in Firebase mode */ }
function renderBackupBar(){ /* no-op in Firebase mode */ }
function quickExport(){
  const data = DB.exportJSON();
  const blob = new Blob([data],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download='hana-backup-'+todayStr()+'.json'; a.click();
  URL.revokeObjectURL(url);
  toast('✅ تم تصدير النسخة الاحتياطية');
}
function getDaysSinceBackup(){ return null; }
function getLastExportDate(){ return null; }
function updateExportTimestamp(){}

function curr(n){ return new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0)+' ج.م'; }
function num(n){ return new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2}).format(Number(n)||0); }
function pct(n){ return ((Number(n)||0)*100).toFixed(1)+'%'; }
function fmtDate(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  return isNaN(d)?'—':d.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function badge(t,c='blue'){
  const colors={blue:'#1d4ed8',green:'#16a34a',red:'#dc2626',orange:'#ea580c',
    yellow:'#d97706',purple:'#7c3aed',gray:'#64748b',teal:'#0f766e',pink:'#db2777'};
  const col=colors[c]||c;
  return `<span class="badge" style="background:${col}20;color:${col};border:1px solid ${col}40;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">${t}</span>`;
}
function statusBadge(s){
  const m={'مفتوح':'yellow','معتمد':'green','ملغي':'red','معلق':'yellow',
           'تم الصرف':'green','مرتجع':'red','تحصيل':'green','دفع':'red','يدوي':'blue'};
  return badge(s,m[s]||'gray');
}

// ── Print Helper ──────────────────────────────────────────────────
const PCSS=`*{font-family:Tahoma,sans-serif;direction:rtl;margin:0;padding:0;box-sizing:border-box}
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
  w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>'+title+'<\/title><style>'+PCSS+'<\/style><\/head><body>'+
    '<div class="hdr"><div class="co">'+(co.name||'شركة الهنا للنقل')+'</div><div style="font-size:10px;color:#666">'+fmtDate(Date.now())+'</div></div>'+
    body+sc+'<\/body><\/html>');
  w.document.close();
}
function printHeaderHTML(){
  const co=DB.getCompany();
  return '<div class="hdr"><div class="co">'+(co.name||'شركة الهنا للنقل')+
    (co.crNumber?'<div style="font-size:9px;color:#666">س.ت: '+co.crNumber+'</div>':'')+
    '</div><div style="text-align:left;font-size:10px;color:#666">'+fmtDate(Date.now())+'</div></div>';
}

// ── Price Helpers ─────────────────────────────────────────────────
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
function getLastStatement(name,type){
  return DB.getAll('statements').filter(s=>s.entityName===name&&s.type===type&&s.status==='معتمد').sort((a,b)=>b.approvedAt-a.approvedAt)[0]||null;
}
function debitAccount(type){
  if(['نقدي','كاش'].includes(type)) return {code:'1001',name:'الصندوق'};
  if(type==='شيك آجل') return {code:'1003',name:'أوراق قبض'};
  return {code:'1002',name:'البنك'};
}
function creditAccount(type){
  if(['نقدي','كاش'].includes(type)) return {code:'1001',name:'الصندوق'};
  if(type==='شيك آجل') return {code:'2002',name:'أوراق دفع'};
  return {code:'1002',name:'البنك'};
}

// Global page registry — populated by app.js
const PAGES = {};

function nav(page) {
  document.querySelectorAll('.sb-link').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick') === `nav('${page}')`);
  });
  document.getElementById('tb-title').textContent = PAGE_TITLES[page] || page;
  const el = document.getElementById('content');
  const renderer = PAGES[page];
  if (renderer) {
    el.innerHTML = typeof renderer === 'function' ? renderer() : '';
  } else {
    el.innerHTML = '<div class="card" style="margin:20px;text-align:center;padding:40px">' +
      '<div style="font-size:36px">🚧</div><p>الصفحة قيد التطوير</p></div>';
  }
  window.scrollTo(0, 0);
}

function closeModalOnBg(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ═══════════════════════════════════════════════════════
// MODAL & TOAST
// ═══════════════════════════════════════════════════════
function openModal(title,body,foot='',size='modal-md'){
  document.getElementById('modal-box').className='modal '+size;
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-body').innerHTML=body;
  document.getElementById('modal-foot').innerHTML=foot;
  document.getElementById('modal-overlay').classList.add('show');
}
function closeModal(){ document.getElementById('modal-overlay').classList.remove('show'); }
function closeModalOnBg(e){ if(e.target===document.getElementById('modal-overlay')) closeModal(); }

function toast(msg,type='success'){
  const el=document.createElement('div');
  el.className=`toast toast-${type}`;
  el.textContent=msg;
  document.getElementById('toast-container').appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),300); },2800);
}

let _delCb=null;
function confirmDelete(msg,cb){
  _delCb=cb;
  openModal('تأكيد الحذف',
    `<div style="text-align:center;padding:10px"><div style="font-size:38px;margin-bottom:10px">⚠️</div><p style="font-weight:600;margin-bottom:5px">هل أنت متأكد؟</p><p class="text-gray text-sm">${msg}</p></div>`,
    `<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-red" onclick="_delCb&&_delCb();closeModal()">نعم، احذف</button>`,
    'modal-sm');
}

function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('closed');
  document.getElementById('main').classList.toggle('full');
}

// Expense categories
// EXP_CATS defined in config.js

function getExpenseSummary(from, to){
  const fd=new Date(from||'2000-01-01'), td=new Date(to||'2099-12-31');
  const exps=DB.getAll('expenses').filter(e=>{const d=new Date(e.date);return d>=fd&&d<=td;});
  const bycat={};
  EXP_CATS.forEach(c=>bycat[c]=0);
  exps.forEach(e=>{ bycat[e.category]=(bycat[e.category]||0)+(Number(e.amount)||0); });
  const total=exps.reduce((s,e)=>s+(Number(e.amount)||0),0);
  return {bycat,total,exps};
}

function getCompanyHeader(){
  const c=DB.getCompany();
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1F4E78;padding-bottom:10px;margin-bottom:12px">
      <div>
        <div style="font-size:18px;font-weight:700;color:#1F4E78">${c.name||'شركة الهنا للنقل'}</div>
        ${c.address?`<div style="font-size:10px;color:#666;margin-top:2px">${c.address}${c.city?' — '+c.city:''}</div>`:''}
        ${c.phone?`<div style="font-size:10px;color:#666">هاتف: ${c.phone}</div>`:''}
        ${c.crNumber?`<div style="font-size:10px;color:#666">س.ت: ${c.crNumber}</div>`:''}
        ${c.vatNumber?`<div style="font-size:10px;color:#666">رقم ضريبي: ${c.vatNumber}</div>`:''}
      </div>
      <div style="text-align:left;font-size:10px;color:#666">
        <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'})}</div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
// ROUTER — Updated with Phase A pages
// ═══════════════════════════════════════════════════════
const PAGE_TITLES_EXT={
  'income-stmt':'قائمة الدخل والأرباح',
  'expenses':'المصروفات والوقود',
  'company':'إعدادات الشركة',
};


// ═══════════════════════════════════════════════════════
// DASHBOARD
// ─── Mobile Sidebar ────────────────────────────────────────────
function openMobSidebar(){
  document.getElementById('sidebar')?.classList.add('mob-open');
  document.getElementById('mob-overlay').style.display='block';
  document.body.style.overflow='hidden';
}
function closeMobSidebar(){
  document.getElementById('sidebar')?.classList.remove('mob-open');
  document.getElementById('mob-overlay').style.display='none';
  document.body.style.overflow='';
}
function toggleSidebarMobile(){
  const open = document.getElementById('sidebar')?.classList.contains('mob-open');
  if(window.innerWidth<=768){ if(open) closeMobSidebar(); else openMobSidebar(); }
  else{ document.getElementById('sidebar')?.classList.toggle('closed'); document.getElementById('main')?.classList.toggle('full'); }
}
function initMobileSidebar(){
  if(window.innerWidth<=768){
    document.querySelectorAll('.mob-close-btn').forEach(b=>b.style.display='block');
  }
  // Close sidebar when nav link clicked on mobile
  document.addEventListener('click', function(e){
    if(e.target.closest('.sb-link') && window.innerWidth<=768) closeMobSidebar();
  });
}
