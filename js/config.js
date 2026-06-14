// ════════════════════════════════════════════════════════════════
// CONFIG — Constants, Validators, Permissions
// ════════════════════════════════════════════════════════════════

const ADMIN_EMAIL    = '3laalafi@gmail.com';
const SCHEMA_VERSION = 5;
const FB_CONFIG_KEY  = 'hana_fb_config';

const COLLECTIONS = [
  'customers','suppliers','materials','trucks',
  'partners','accounts','journal','sarkis',
  'cheques','statements','expenses','notes',
];

// ── Roles & Permissions ──────────────────────────────────────────
const ROLES = {
  admin:      { label: '👑 مدير',   color: '#7c3aed' },
  accountant: { label: '✏️ محاسب', color: '#1d4ed8' },
  reviewer:   { label: '👁️ مراجع', color: '#0f766e' },
};

const PERMISSIONS = {
  admin:      { write:true,  delete:true,  approve:true,  manageUsers:true,  settings:true  },
  accountant: { write:true,  delete:true,  approve:true,  manageUsers:false, settings:false },
  reviewer:   { write:false, delete:false, approve:false, manageUsers:false, settings:false },
};

let _role = 'reviewer';
let _user = null;

function setCurrentUser(user, role) {
  _user = user;
  _role = (user?.email?.toLowerCase() === ADMIN_EMAIL) ? 'admin' : (role || 'reviewer');
}
function can(action)      { return PERMISSIONS[_role]?.[action] ?? false; }
function currentRole()    { return _role; }
function currentUser()    { return _user; }
function isAdmin()        { return _role === 'admin'; }
function isAccountant()   { return _role === 'admin' || _role === 'accountant'; }

// ── Firebase Config ──────────────────────────────────────────────
function getFBConfig() {
  try { return JSON.parse(localStorage.getItem(FB_CONFIG_KEY)||'null'); } catch { return null; }
}
function saveFBConfig(cfg) { localStorage.setItem(FB_CONFIG_KEY, JSON.stringify(cfg)); }

// ── Validators ───────────────────────────────────────────────────
const VALIDATORS = {
  customers: d => { if(!d.name?.trim()) throw new Error('اسم العميل مطلوب'); d.openingBalance=Number(d.openingBalance)||0; d.prices=(d.prices||[]).filter(p=>p.material&&p.price>0); return d; },
  suppliers: d => { if(!d.name?.trim()) throw new Error('اسم المورد مطلوب'); d.openingBalance=Number(d.openingBalance)||0; d.prices=(d.prices||[]).filter(p=>p.material&&p.price>0); return d; },
  materials: d => { if(!d.name?.trim()) throw new Error('اسم الخامة مطلوب'); d.defaultSellPrice=Number(d.defaultSellPrice)||0; d.defaultBuyPrice=Number(d.defaultBuyPrice)||0; return d; },
  trucks:    d => { if(!d.plateNo?.trim()) throw new Error('رقم اللوحة مطلوب'); d.length=Number(d.length)||0; d.width=Number(d.width)||0; d.height=Number(d.height)||0; d.cubic=parseFloat((d.length*d.width*d.height).toFixed(3)); return d; },
  sarkis:    d => { if(!d.client?.trim()) throw new Error('اسم العميل مطلوب'); if(!d.supplier?.trim()) throw new Error('اسم المورد مطلوب'); if(!d.date) throw new Error('التاريخ مطلوب'); return d; },
  journal:   d => { if(!d.date) throw new Error('التاريخ مطلوب'); return d; },
  expenses:  d => { if(!d.date) throw new Error('التاريخ مطلوب'); if(!d.category) throw new Error('الفئة مطلوبة'); if(!Number(d.amount)) throw new Error('المبلغ مطلوب'); d.amount=Number(d.amount); return d; },
  cheques:   d => { if(!d.chequeNo?.trim()) throw new Error('رقم الشيك مطلوب'); if(!Number(d.amount)) throw new Error('المبلغ مطلوب'); d.amount=Number(d.amount); return d; },
};

function validate(col, data) {
  const v = VALIDATORS[col];
  if(!v) return data;
  try   { return v({...data}); }
  catch (e) { toast(e.message,'error'); throw e; }
}

function auditCreate(data) {
  return {...data, _createdAt:Date.now(), _createdBy:_user?.email||'system', _updatedAt:Date.now(), _v:SCHEMA_VERSION};
}
function auditUpdate(existing, patch) {
  return {...existing,...patch, _updatedAt:Date.now(), _updatedBy:_user?.email||'system'};
}

// ── Page Titles ──────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:'لوحة التحكم', sarkis:'الحوافظ اليومية (السركي)',
  journal:'دفتر اليومية', cheques:'الشيكات',
  'cust-stmt':'مستخلص العميل', 'supp-stmt':'مستخلص المورد',
  'stmt-history':'سجل المستخلصات', 'running-bal':'كشف الحساب المتحرك',
  notes:'إشعارات المديونية والدائنية', reports:'التقارير التحليلية',
  'income-stmt':'قائمة الدخل والأرباح', accounts:'دليل الحسابات',
  expenses:'المصروفات والوقود', customers:'العملاء وأسعارهم',
  suppliers:'الموردون وأسعارهم', materials:'الخامات',
  trucks:'السيارات', partners:'الشركاء', 'partner-financials':'حسابات الشركاء',
  company:'إعدادات الشركة', users:'إدارة المستخدمين',
  themes:'الثيم والألوان',
  clientQty:'كشف كميات العميل التفصيلي',
  supplierQty:'كشف كميات المورد التفصيلي',
  backup:'النسخ الاحتياطي وحماية البيانات',
  invitations:'إدارة الدعوات',
};

const EXP_CATS = ['وقود','صيانة وإصلاح','رواتب وأجور','إيجار','مرافق (ماء/كهرباء/تلفون)','تأمين','رسوم حكومية','مصاريف إدارية','أخرى'];
