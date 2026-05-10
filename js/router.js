// ═══ ROUTER & HELPERS ═══

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
const EXP_CATS = ['وقود','صيانة وإصلاح','رواتب وأجور','إيجار','مرافق (ماء/كهرباء/تلفون)','تأمين','رسوم حكومية','مصاريف إدارية','أخرى'];

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
