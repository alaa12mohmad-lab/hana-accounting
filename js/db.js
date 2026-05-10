// ═══ DATABASE LAYER ═══
// ═══════════════════════════════════════════════════════════════════════════
function createLocalRepo() {
  const STORE_KEY = 'hana_v4';
  let S = {};

  function _load() {
    try { S = JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); }
    catch(e) { S = {}; }
    COLLECTIONS.forEach(k => { if(!S[k]) S[k]=[]; });
    if(!S._seq) S._seq = {};
    COLLECTIONS.forEach(k => { if(!S._seq[k]) S._seq[k] = 1; });
    if(!S._meta) S._meta = { version: SCHEMA_VERSION, createdAt: Date.now() };
    if(!S.company) S.company = {name:'شركة الهنا للنقل',address:'',phone:'',crNumber:'',vatNumber:'',city:'',email:'',activity:''};
    if(!S.customers.length) _seed();
  }

  function _save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
    catch(e) { toast('⚠️ تعذّر الحفظ — المساحة ممتلئة','error'); }
    // Shadow copy
    try {
      sessionStorage.setItem('hana_v4_shadow', JSON.stringify(S));
      localStorage.setItem('hana_v4_shadow',   JSON.stringify(S));
    } catch(e) {}
  }

  function _nextId(col) { const id = S._seq[col]++; _save(); return id; }

  // ── CRUD ────────────────────────────────────────────────
  function getAll(col)       { return [...(S[col]||[])]; }
  function getById(col, id)  { return (S[col]||[]).find(r=>r.id===id)||null; }
  function getWhere(col, fn) { return (S[col]||[]).filter(fn); }

  function insert(col, data) {
    const validated = validate(col, data);
    const record    = auditCreate({ ...validated, id: _nextId(col) });
    S[col].push(record);
    _save();
    return record;
  }

  function update(col, id, patch) {
    const idx = (S[col]||[]).findIndex(r=>r.id===id);
    if(idx < 0) { toast('السجل غير موجود','error'); return null; }
    const validated = validate(col, { ...S[col][idx], ...patch });
    S[col][idx] = auditUpdate(S[col][idx], validated);
    _save();
    return S[col][idx];
  }

  function remove(col, id) {
    S[col] = (S[col]||[]).filter(r=>r.id!==id);
    _save();
  }

  function upsert(col, predicate, data) {
    const existing = (S[col]||[]).find(predicate);
    if(existing) return update(col, existing.id, data);
    return insert(col, data);
  }

  // ── Company ──────────────────────────────────────────────
  function getCompany()       { return S.company||{}; }
  function setCompany(data)   { S.company = {...S.company,...data}; _save(); }

  // ── Backup / Restore ─────────────────────────────────────
  function exportJSON()       { return JSON.stringify(S, null, 2); }
  function importJSON(json)   {
    const parsed = JSON.parse(json);
    // Schema migration
    if(parsed._meta?.version < SCHEMA_VERSION) {
      console.log('[DB] Migrating schema v'+parsed._meta?.version+' → v'+SCHEMA_VERSION);
      parsed._meta.version = SCHEMA_VERSION;
    }
    S = parsed;
    COLLECTIONS.forEach(k => { if(!S[k]) S[k]=[]; });
    _save();
  }

  // ── Seed ─────────────────────────────────────────────────
  function _seed() {
    [
      {name:'الشيخ',openingBalance:450000,prices:[{material:'تربة زلطية',price:135,from:'2026-01-01'}]},
      {name:'طيبة (مشروع الخيول)',openingBalance:247200,prices:[{material:'تربة زلطية',price:135,from:'2026-01-01'}]},
      {name:'إيماك',openingBalance:130000,prices:[{material:'نقل مخلفات',price:100,from:'2026-01-01'}]},
      {name:'طيبة (بن زايد الجنوبي)',openingBalance:0,prices:[]},
      {name:'شركة ريال (موقع 400)',openingBalance:0,prices:[]},
      {name:'الشروق',openingBalance:0,prices:[]},
    ].forEach(c=>{ S.customers.push(auditCreate({...c,phone:'',notes:'',id:_nextId('customers')})); });
    [
      {name:'أيمن',openingBalance:-500000,prices:[{material:'تربة زلطية',price:100,from:'2026-01-01'}]},
      {name:'أحمد الربيعي',openingBalance:-200000,prices:[{material:'رملة',price:65,from:'2026-01-01'}]},
      {name:'نادر',openingBalance:2000,prices:[]},
      {name:'تامر السيد',openingBalance:0,prices:[]},
      {name:'تبع نادر',openingBalance:0,prices:[]},
      {name:'أحمد الفيومي',openingBalance:0,prices:[]},
      {name:'أبو عمار',openingBalance:0,prices:[]},
      {name:'محمد الجرف',openingBalance:0,prices:[]},
      {name:'شديد',openingBalance:0,prices:[]},
      {name:'خالد جمعة',openingBalance:0,prices:[]},
    ].forEach(s=>{ S.suppliers.push(auditCreate({...s,phone:'',notes:'',id:_nextId('suppliers')})); });
    [
      {name:'تربة زلطية',defaultSellPrice:135,defaultBuyPrice:100,unit:'م³'},
      {name:'رملة',defaultSellPrice:95,defaultBuyPrice:65,unit:'م³'},
      {name:'نقل مخلفات',defaultSellPrice:100,defaultBuyPrice:90,unit:'م³'},
      {name:'توريد زلط',defaultSellPrice:350,defaultBuyPrice:330,unit:'م³'},
    ].forEach(m=>{ S.materials.push(auditCreate({...m,id:_nextId('materials')})); });
    [
      {code:'1001',name:'الصندوق',type:'أصول',openingBalance:0},
      {code:'1002',name:'البنك',type:'أصول',openingBalance:0},
      {code:'1003',name:'أوراق قبض',type:'أصول',openingBalance:0},
      {code:'1010',name:'ذمم العملاء',type:'أصول',openingBalance:827200},
      {code:'2001',name:'ذمم الموردين',type:'خصوم',openingBalance:698000},
      {code:'2002',name:'أوراق دفع',type:'خصوم',openingBalance:0},
      {code:'3001',name:'حسابات الشركاء',type:'حقوق ملكية',openingBalance:0},
      {code:'4000',name:'الإيرادات',type:'إيرادات',openingBalance:0},
      {code:'5000',name:'تكلفة المبيعات',type:'مصروفات',openingBalance:0},
      {code:'5010',name:'عمولات الشركاء',type:'مصروفات',openingBalance:0},
    ].forEach(a=>{ S.accounts.push(auditCreate({...a,id:_nextId('accounts')})); });
    _save();
  }

  _load();
  return { getAll, getById, getWhere, insert, update, remove, upsert,
           getCompany, setCompany, exportJSON, importJSON,
           save:_save, nextId:_nextId,
           // Legacy compatibility
           exportData:exportJSON, importData:importJSON };
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUPABASE REPOSITORY (activate when ready)
//  Uncomment and fill SUPABASE_CFG to go online
// ═══════════════════════════════════════════════════════════════════════════
/*
function createSupabaseRepo() {
  const { url, key } = SUPABASE_CFG;
  const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  async function getAll(col) {
    const r = await fetch(`${url}/rest/v1/${col}?select=*&order=id`, {headers});
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  }
  async function getById(col, id) {
    const r = await fetch(`${url}/rest/v1/${col}?id=eq.${id}`, {headers});
    const data = await r.json();
    return data[0]||null;
  }
  async function insert(col, data) {
    const validated = validate(col, data);
    const record = auditCreate(validated);
    const r = await fetch(`${url}/rest/v1/${col}`, {method:'POST',headers,body:JSON.stringify(record)});
    if(!r.ok) throw new Error(await r.text());
    return (await r.json())[0];
  }
  async function update(col, id, patch) {
    const existing = await getById(col, id);
    const validated = validate(col, {...existing,...patch});
    const updated = auditUpdate(existing, validated);
    const r = await fetch(`${url}/rest/v1/${col}?id=eq.${id}`, {method:'PATCH',headers,body:JSON.stringify(updated)});
    if(!r.ok) throw new Error(await r.text());
    return (await r.json())[0];
  }
  async function remove(col, id) {
    const r = await fetch(`${url}/rest/v1/${col}?id=eq.${id}`, {method:'DELETE',headers});
    if(!r.ok) throw new Error(await r.text());
  }

  // Company stored in a special settings table
  async function getCompany() {
    const r = await fetch(`${url}/rest/v1/settings?key=eq.company`, {headers});
    const data = await r.json();
    return data[0]?.value || {};
  }
  async function setCompany(d) {
    await fetch(`${url}/rest/v1/settings`, {
      method:'POST', headers,
      body: JSON.stringify({key:'company',value:d}),
    });
    // upsert using Prefer: resolution=merge-duplicates
  }

  return { getAll, getById, insert, update, remove, getCompany, setCompany };
}
*/

// ═══════════════════════════════════════════════════════════════════════════
//  FACTORY — change this ONE line to switch to Supabase
// ═══════════════════════════════════════════════════════════════════════════
// DB = Firebase if configured, else localStorage
// ═══════════════════════════════════════════════════════════════════════════
//  SHADOW COPY & RECOVERY
// ═══════════════════════════════════════════════════════════════════════════
const BACKUP_KEY    = 'hana_v4_shadow';
const BACKUP_TS_KEY = 'hana_v4_last_export';

function writeShadowCopy() {
  try {
    const data = DB.exportJSON();
    sessionStorage.setItem(BACKUP_KEY, data);
    localStorage.setItem(BACKUP_KEY, data);
  } catch(e) {}
}

function tryRecoverFromShadow() {
  try {
    const main = localStorage.getItem('hana_v4');
    if(!main || main.length < 50) {
      const shadow = localStorage.getItem(BACKUP_KEY) || sessionStorage.getItem(BACKUP_KEY);
      if(shadow && shadow.length > 100) {
        localStorage.setItem('hana_v4', shadow);
        location.reload();
      }
    }
  } catch(e) {}
}

function getLastExportDate() {
  const ts = localStorage.getItem(BACKUP_TS_KEY);
  return ts ? new Date(Number(ts)) : null;
}
function updateExportTimestamp() {
  localStorage.setItem(BACKUP_TS_KEY, Date.now().toString());
}
function getDaysSinceBackup() {
  const last = getLastExportDate();
  return last ? Math.floor((Date.now()-last.getTime())/864e5) : null;
}

// ── Backup Warning Bar ─────────────────────────────────────────────────────
function renderBackupBar() {
  const days = getDaysSinceBackup();
  if(days !== null && days < 3) return;   // recent backup — hide
  const bar = document.createElement('div');
  bar.id = 'backup-bar';
  bar.style.cssText = 'background:linear-gradient(135deg,#fef3c7,#fde68a);border-bottom:2px solid #f59e0b;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:600;color:#92400e;position:sticky;top:0;z-index:200';
  bar.innerHTML = days===null
    ? `<span>⚠️ لم تقم بأي نسخة احتياطية بعد — بياناتك في خطر إذا مُسح المتصفح</span>
       <button onclick="quickExport()" style="background:#fff;border:1px solid #d97706;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:10px;font-weight:700;color:#92400e">💾 نسخ احتياطي الآن</button>`
    : `<span>⚠️ آخر نسخة احتياطية منذ ${days} أيام</span>
       <button onclick="quickExport()" style="background:#fff;border:1px solid #d97706;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:10px;font-weight:700;color:#92400e">💾 نسخ احتياطي الآن</button>`;
  const content = document.getElementById('content');
  if(content && !document.getElementById('backup-bar')) {
    content.parentNode.insertBefore(bar, content);
  }
}

function quickExport() {
  const data = DB.exportJSON();
  const blob = new Blob([data],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `hana-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  updateExportTimestamp();
  const bar = document.getElementById('backup-bar');
  if(bar) bar.remove();
  toast('✅ تم تصدير النسخة الاحتياطية');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MIGRATION PATH GUIDE (for future Supabase migration)
// ═══════════════════════════════════════════════════════════════════════════
/*
  SUPABASE MIGRATION STEPS:
  ─────────────────────────
  1. Go to https://supabase.com → New Project → Free tier
  2. Create these tables (SQL Editor):

  CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    opening_balance NUMERIC DEFAULT 0,
    phone TEXT,
    prices JSONB DEFAULT '[]',
    _created_at TIMESTAMPTZ DEFAULT NOW(),
    _updated_at TIMESTAMPTZ DEFAULT NOW(),
    _created_by TEXT DEFAULT 'admin'
  );

  -- Repeat for: suppliers, materials, trucks, partners,
  --             accounts, journal, sarkis, cheques,
  --             statements, expenses, settings

  3. Enable Row Level Security (RLS) → Add policies
  4. Get your project URL + anon key from Settings → API
  5. Fill SUPABASE_CFG above:
     { url: 'https://xxxx.supabase.co', key: 'eyJ...' }
  6. Change:  const DB = createLocalRepo();
     To:      const DB = createSupabaseRepo();
  7. Run migration: exportJSON() from old → importJSON() to new

  AUTHENTICATION (optional, for multi-user):
  ─────────────────────────────────────────
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: 'admin@hana.com', password: 'password'
  });
  CURRENT_USER = user.email;
*/


// ═══════════════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════════════
// DB replaced by Repository pattern


// ═══════════════════════════════════════════════════════
// FORMATTERS & HELPERS
// ═══════════════════════════════════════════════════════
const _f2 = new Intl.NumberFormat('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2});
const _f0 = new Intl.NumberFormat('ar-EG',{minimumFractionDigits:0,maximumFractionDigits:0});
function curr(n){ const v=Number(n)||0; return _f2.format(v)+' ج.م'; }
function num(n) { return _f0.format(Number(n)||0); }
function pct(n) { return ((Number(n)||0)*100).toFixed(1)+'%'; }
function fmtDate(ts){ if(!ts) return '—'; const d=new Date(ts); return isNaN(d)?'—':d.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function badge(t,c='blue'){ return `<span class="badge badge-${c}">${t}</span>`; }
function statusBadge(s){ const m={'مفتوح':'yellow','معتمد':'green','ملغي':'red','معلق':'yellow','تم الصرف':'green','مرتجع':'red','تحصيل':'green','دفع':'red','يدوي':'blue'}; return badge(s,m[s]||'gray'); }

// Get price for customer+material on a given date (latest rate on or before date)
function getCustomerPrice(customerName, materialName, date){
  const c = DB.getAll('customers').find(x=>x.name===customerName);
  if(!c||!c.prices) return null;
  const d = date||todayStr();
  const matches = (c.prices||[]).filter(p=>p.material===materialName && p.from<=d);
  if(!matches.length) return null;
  return matches.sort((a,b)=>b.from.localeCompare(a.from))[0].price;
}

function getSupplierPrice(supplierName, materialName, date){
  const s = DB.getAll('suppliers').find(x=>x.name===supplierName);
  if(!s||!s.prices) return null;
  const d = date||todayStr();
  const matches = (s.prices||[]).filter(p=>p.material===materialName && p.from<=d);
  if(!matches.length) return null;
  return matches.sort((a,b)=>b.from.localeCompare(a.from))[0].price;
}

// Balance helpers
function getCustomerBalance(customerName){
  const c = DB.getAll('customers').find(x=>x.name===customerName);
  const opening = Number(c?.openingBalance)||0;
  const lastStmt = getLastStatement(customerName,'customer');
  if(lastStmt) return Number(lastStmt.closingBalance)||0;
  // sales from sarkis
  const sarkiSales = DB.getAll('sarkis')
    .filter(sk=>sk.client===customerName&&sk.status!=='ملغي')
    .reduce((s,sk)=>s+(Number(sk.totalSell)||0),0);
  // collections from journal
  const jrnColl = DB.getAll('journal')
    .filter(j=>j.entryType==='تحصيل'&&j.party===customerName)
    .reduce((s,j)=>s+(Number(j.amount)||0),0);
  return opening + sarkiSales - jrnColl;
}

function getSupplierBalance(supplierName){
  const s = DB.getAll('suppliers').find(x=>x.name===supplierName);
  const opening = Number(s?.openingBalance)||0;
  const lastStmt = getLastStatement(supplierName,'supplier');
  if(lastStmt) return Number(lastStmt.closingBalance)||0;
  // purchases from sarkis
  const sarkiPurch = DB.getAll('sarkis')
    .filter(sk=>sk.supplier===supplierName&&sk.status!=='ملغي')
    .reduce((s,sk)=>s+(Number(sk.totalBuy)||0),0);
  // payments from journal
  const jrnPmt = DB.getAll('journal')
    .filter(j=>j.entryType==='دفع'&&j.party===supplierName)
    .reduce((s,j)=>s+(Number(j.amount)||0),0);
  return opening + sarkiPurch - jrnPmt;
}

function getLastStatement(entityName,type){
  return DB.getAll('statements')
    .filter(s=>s.entityName===entityName&&s.type===type&&s.status==='معتمد')
    .sort((a,b)=>b.approvedAt-a.approvedAt)[0]||null;
}

// Sarkis calculation
function calcLine(line){
  const trips=Number(line.trips)||0;
  const cubic=Number(line.cubicPerTrip)||0;
  const discM=Number(line.discountM)||0;
  const gross=trips*cubic;
  const net=Math.max(0,gross-discM);
  const sell=Number(line.sellPrice)||0;
  const buy=Number(line.buyPrice)||0;
  return{...line,grossCubic:gross,netCubic:net,sellTotal:net*sell,buyTotal:net*buy,profit:net*sell-net*buy};
}
function calcSarkiTotals(lines){
  return (lines||[]).reduce((a,l)=>({
    totalTrips:a.totalTrips+(Number(l.trips)||0),
    totalGross:a.totalGross+(Number(l.grossCubic)||0),
    totalNet:a.totalNet+(Number(l.netCubic)||0),
    totalSell:a.totalSell+(Number(l.sellTotal)||0),
    totalBuy:a.totalBuy+(Number(l.buyTotal)||0),
    totalProfit:a.totalProfit+(Number(l.profit)||0),
  }),{totalTrips:0,totalGross:0,totalNet:0,totalSell:0,totalBuy:0,totalProfit:0});
}

function getPartnerCommission(ops,partner){
  let total=0;
  ops.forEach(op=>{
    const d=new Date(op.date).toISOString().slice(0,10);
    (partner.rates||[]).forEach(r=>{
      if(r.material===op.material&&r.from<=d&&(!r.to||r.to>=d))
        total+=(Number(op.netCubic)||0)*(Number(r.pricePerCubic)||0);
    });
  });
  return total;
}

// Payment type helpers
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

// ═══════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════
const PAGE_TITLES={
  dashboard:'لوحة التحكم', sarkis:'الحوافظ اليومية (السركي)',
  journal:'دفتر اليومية', cheques:'الشيكات',
  'cust-stmt':'مستخلص العميل','supp-stmt':'مستخلص المورد',
  reports:'التقارير التحليلية', accounts:'دليل الحسابات',
  customers:'العملاء وأسعارهم', suppliers:'الموردون وأسعارهم',
  materials:'الخامات', trucks:'السيارات', partners:'الشركاء',
  'income-stmt':'قائمة الدخل والأرباح','expenses':'المصروفات والوقود','company':'إعدادات الشركة والحماية',
  'stmt-history':'سجل المستخلصات التاريخي','running-bal':'كشف الحساب بالرصيد المتحرك','notes':'إشعارات المديونية والدائنية',
  'invitations':'إدارة الدعوات',
};
