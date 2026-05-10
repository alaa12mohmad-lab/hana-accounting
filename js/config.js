// ═══ CONFIG ═══


// ═══════════════════════════════════════════════════════════════════════════
//  DATA LAYER v2 — Repository Pattern
//  Switch between localStorage and Supabase by changing ONE line:
//    const DB = createRepo('local');      ← offline HTML
//    const DB = createRepo('supabase');   ← online with Supabase
// ═══════════════════════════════════════════════════════════════════════════

const SCHEMA_VERSION  = 4;          // increment when schema changes
const CURRENT_USER    = 'admin';    // replace with auth user when online
const COLLECTIONS     = ['customers','suppliers','materials','trucks',
                          'partners','accounts','journal','sarkis',
                          'cheques','statements','expenses','notes'];

// ── Supabase config (fill when ready to go online) ─────────────────────────
const SUPABASE_CFG = {
  url: '',       // e.g. 'https://xxxx.supabase.co'
  key: '',       // anon/public key from Supabase dashboard
};

// ═══════════════════════════════════════════════════════════════════════════
//  VALIDATORS — prevent bad data from entering the system
// ═══════════════════════════════════════════════════════════════════════════
const VALIDATORS = {
  customers: d => {
    if(!d.name?.trim())            throw new Error('اسم العميل مطلوب');
    if(d.name.length > 100)        throw new Error('الاسم طويل جداً');
    d.openingBalance = Number(d.openingBalance)||0;
    d.prices = (d.prices||[]).filter(p=>p.material&&p.price>0);
    return d;
  },
  suppliers: d => {
    if(!d.name?.trim())            throw new Error('اسم المورد مطلوب');
    d.openingBalance = Number(d.openingBalance)||0;
    d.prices = (d.prices||[]).filter(p=>p.material&&p.price>0);
    return d;
  },
  materials: d => {
    if(!d.name?.trim())            throw new Error('اسم الخامة مطلوب');
    d.defaultSellPrice = Number(d.defaultSellPrice)||0;
    d.defaultBuyPrice  = Number(d.defaultBuyPrice)||0;
    if(d.defaultSellPrice < d.defaultBuyPrice) {
      console.warn('[Validator] سعر البيع أقل من الشراء للخامة:', d.name);
    }
    return d;
  },
  trucks: d => {
    if(!d.plateNo?.trim())         throw new Error('رقم اللوحة مطلوب');
    d.length = Number(d.length)||0;
    d.width  = Number(d.width)||0;
    d.height = Number(d.height)||0;
    d.cubic  = parseFloat((d.length*d.width*d.height).toFixed(3));
    return d;
  },
  sarkis: d => {
    if(!d.client?.trim())          throw new Error('اسم العميل مطلوب');
    if(!d.supplier?.trim())        throw new Error('اسم المورد مطلوب');
    if(!d.date)                    throw new Error('التاريخ مطلوب');
    if(!Array.isArray(d.lines)||!d.lines.length) throw new Error('أضف سطراً على الأقل');
    d.totalSell   = Number((d.totalSell||0).toFixed(2));
    d.totalBuy    = Number((d.totalBuy||0).toFixed(2));
    d.totalProfit = Number((d.totalProfit||0).toFixed(2));
    return d;
  },
  journal: d => {
    if(!d.date)                    throw new Error('التاريخ مطلوب');
    if(!d.entryType)               throw new Error('نوع القيد مطلوب');
    if(d.entryType==='يدوي') {
      if(!Number(d.debitAmount))   throw new Error('مبلغ المدين مطلوب');
      if(Math.abs((Number(d.debitAmount)||0)-(Number(d.creditAmount)||0))>0.01)
        throw new Error('القيد غير متوازن — المدين ≠ الدائن');
    } else {
      if(!Number(d.amount))        throw new Error('المبلغ مطلوب');
    }
    return d;
  },
  expenses: d => {
    if(!d.date)                    throw new Error('التاريخ مطلوب');
    if(!d.category)                throw new Error('الفئة مطلوبة');
    if(!Number(d.amount))          throw new Error('المبلغ مطلوب');
    d.amount = Number(d.amount);
    return d;
  },
  cheques: d => {
    if(!d.chequeNo?.trim())        throw new Error('رقم الشيك مطلوب');
    if(!Number(d.amount))          throw new Error('المبلغ مطلوب');
    if(!d.dueDate)                 throw new Error('تاريخ الاستحقاق مطلوب');
    d.amount = Number(d.amount);
    return d;
  },
};

function validate(col, data) {
  const v = VALIDATORS[col];
  if(!v) return data;
  try { return v({...data}); }
  catch(e) { toast(e.message, 'error'); throw e; }
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUDIT — every record gets a change log
// ═══════════════════════════════════════════════════════════════════════════
function auditCreate(data) {
  return { ...data, _createdAt: Date.now(), _createdBy: CURRENT_USER,
           _updatedAt: Date.now(), _updatedBy: CURRENT_USER, _v: SCHEMA_VERSION };
}
function auditUpdate(existing, patch) {
  return { ...existing, ...patch, _updatedAt: Date.now(), _updatedBy: CURRENT_USER };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOCAL STORAGE REPOSITORY