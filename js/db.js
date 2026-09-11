// ════════════════════════════════════════════════════════════════
// DATABASE — Firebase Firestore (Single Source of Truth)
// ════════════════════════════════════════════════════════════════

const _cache = {};
const _seqs  = {};
let _db       = null;
let _company  = {name:"شركة الهنا للنقل",address:"",phone:"",crNumber:"",vatNumber:"",city:"",email:"",activity:""};
let _dbReady  = false;
let _dbCBs    = [];
let _pendingWrites = 0;

// ⚠️ تحذير حقيقي من المتصفح لو المستخدم حاول يقفل الصفحة وفيه حفظ لسه ما اتأكدش من السيرفر
window.addEventListener('beforeunload', function(e){
  if(_pendingWrites>0){
    e.preventDefault();
    e.returnValue = 'فيه بيانات لسه بتتحفظ... لو قفلت دلوقتي ممكن تضيع. متأكد؟';
    return e.returnValue;
  }
});
function _trackWrite(promise){
  _pendingWrites++;
  _updateSaveBadge();
  const done=()=>{ _pendingWrites=Math.max(0,_pendingWrites-1); _updateSaveBadge(); };
  promise.then(done, done);
  return promise;
}
function _updateSaveBadge(){
  let el = document.getElementById('save-pending-badge');
  if(_pendingWrites>0){
    if(!el){
      if(!document.getElementById('save-badge-style')){
        var st=document.createElement('style');
        st.id='save-badge-style';
        st.textContent='@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}';
        document.head.appendChild(st);
      }
      el=document.createElement('div');
      el.id='save-pending-badge';
      el.style.cssText='position:fixed;bottom:16px;left:16px;background:#1e293b;color:#fff;'
        +'padding:8px 14px;border-radius:20px;z-index:9999;font-size:11px;font-family:Tahoma;'
        +'direction:rtl;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;gap:6px';
      el.innerHTML='<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#fbbf24;animation:pulse 1s infinite"></span> جاري الحفظ على السيرفر... متقفلش الصفحة';
      document.body.appendChild(el);
    }
  } else if(el){
    el.remove();
  }
}

function onDBReady(fn){ if(_dbReady) fn(); else _dbCBs.push(fn); }
function _markReady(){ _dbReady=true; _dbCBs.forEach(f=>f()); _dbCBs=[]; }
function _refreshPage(){
  const a=document.querySelector(".sb-link.active");
  if(!a) return;
  const m=a.getAttribute("onclick")?.match(/nav\("([^"]+)"\)/)||a.getAttribute("onclick")?.match(/nav\('([^']+)'\)/);
  if(m) setTimeout(()=>nav(m[1]),30);
}

function initFirestoreDB(db){
  _db=db;
  COLLECTIONS.forEach(col=>{_cache[col]=[];_seqs[col]=1;});
  _db.enablePersistence({synchronizeTabs:true}).then(()=>{
    console.log('✅ Firestore offline persistence enabled — البيانات هتتحفظ محليًا وتتزامن تلقائيًا حتى لو النت اتقطع لحظيًا');
  }).catch(err=>{
    console.warn('⚠️ Firestore persistence FAILED to enable:', err.code, err.message);
    setTimeout(function(){
      var warn=document.createElement('div');
      warn.id='fs-persist-warn';
      warn.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);'
        +'background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:10px 16px;'
        +'border-radius:8px;z-index:9999;font-size:11px;font-family:Tahoma;text-align:center;direction:rtl;max-width:90%';
      warn.innerHTML='⚠️ التخزين المحلي غير مفعّل ('+(err.code||'')+') — لو فتحت النظام في أكتر من تبويب/نافذة في نفس الوقت، اقفل الباقي واسيب واحدة بس. متستناش قبل ما تقفل بعد أي حفظ.'
        +'<button onclick="this.parentElement.remove()" style="margin-right:10px;background:none;border:none;cursor:pointer;font-size:14px">×</button>';
      if(!document.getElementById('fs-persist-warn'))
        document.body.appendChild(warn);
    },1500);
  });
  let done=0;
  COLLECTIONS.forEach(col=>{
    _db.collection(col).onSnapshot(snap=>{
      _cache[col]=snap.docs.map(d=>({...d.data(),_fbId:d.id}));
      const mx=Math.max(0,..._cache[col].map(r=>Number(r.id)||0));
      if(mx>=_seqs[col]) _seqs[col]=mx+1;
      done++;
      if(done>=COLLECTIONS.length&&!_dbReady){
        _markReady();
        // ملحوظة: البيانات التجريبية مبقتش بتتحمل تلقائياً — لازم المستخدم يطلبها بنفسه
        // من صفحة الإعدادات (منطقة الخطر) عشان نمنع تلوث البيانات الحقيقية بالغلط.
      }
      if(_dbReady) _refreshPage();
    },err=>{
      done++;
      console.warn('Firestore listener error:', err.code, err.message);
      if(done>=COLLECTIONS.length&&!_dbReady){
        _markReady();
        // Show warning if blocked
        if(err.code==='permission-denied'||err.code==='unavailable'||!err.code){
          setTimeout(function(){
            var warn=document.createElement('div');
            warn.id='fs-warn';
            warn.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);'
              +'background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:10px 16px;'
              +'border-radius:8px;z-index:9999;font-size:11px;font-family:Tahoma;text-align:center;direction:rtl';
            warn.innerHTML='⚠️ Firestore محجوب — عطّل مانع الإعلانات (Ad Blocker / Brave Shields) للعمل بشكل كامل'
              +'<button onclick="this.parentElement.remove()" style="margin-right:10px;background:none;border:none;cursor:pointer;font-size:14px">×</button>';
            if(!document.getElementById('fs-warn'))
              document.body.appendChild(warn);
          },3000);
        }
      }
    });
  });
  _db.collection("_cfg").doc("company").onSnapshot(doc=>{if(doc.exists)_company=doc.data();});
}

const DB={
  getAll:(col)=>[...(_cache[col]||[])],
  getById:(col,id)=>(_cache[col]||[]).find(r=>r.id===id)||null,
  getWhere:(col,fn)=>(_cache[col]||[]).filter(fn),
  insert(col,data){
    if(!_db){toast("Firebase غير متصل","error");return null;}
    const v=validate(col,data), id=_seqs[col]++, rec=auditCreate({...v,id});
    _cache[col].push(rec);
    _trackWrite(_db.collection(col).add(rec)).catch(e=>{_cache[col]=_cache[col].filter(r=>r.id!==id);toast("❌ فشل الحفظ فعليًا على السيرفر: "+e.message,"error");});
    return rec;
  },
  update(col,id,patch){
    if(!_db){toast("Firebase غير متصل","error");return null;}
    const idx=(_cache[col]||[]).findIndex(r=>r.id===id);
    if(idx<0){toast("السجل غير موجود","error");return null;}
    const old=_cache[col][idx],v=validate(col,{...old,...patch}),upd=auditUpdate(old,v);
    _cache[col][idx]=upd;
    if(old._fbId) _trackWrite(_db.collection(col).doc(old._fbId).set(upd)).catch(e=>{_cache[col][idx]=old;toast("❌ فشل التعديل فعليًا على السيرفر: "+e.message,"error");});
    return upd;
  },
  remove(col,id){
    if(!_db){toast("Firebase غير متصل","error");return;}
    const idx=(_cache[col]||[]).findIndex(r=>r.id===id);
    if(idx<0) return;
    const old=_cache[col][idx];
    _cache[col].splice(idx,1);
    if(old._fbId) _trackWrite(_db.collection(col).doc(old._fbId).delete()).catch(e=>{_cache[col].splice(idx,0,old);toast("❌ فشل الحذف فعليًا على السيرفر: "+e.message,"error");});
  },
  getCompany(){return _company;},
  setCompany(d){_company={..._company,...d};_db?.collection("_cfg").doc("company").set(_company).catch(e=>toast("خطأ: "+e.message,"error"));},
  exportJSON(){return JSON.stringify({...Object.fromEntries(COLLECTIONS.map(c=>[c,_cache[c]])),company:_company,_meta:{version:SCHEMA_VERSION,exportedAt:Date.now()}},null,2);},
  async importJSON(json){
    const p=JSON.parse(json);toast("⏳ جاري الاستيراد...","info");
    for(const col of COLLECTIONS){if(!p[col]?.length) continue;const sn=await _db.collection(col).get();const b=_db.batch();sn.docs.forEach(d=>b.delete(d.ref));await b.commit();const items=p[col];for(let i=0;i<items.length;i+=400){const b2=_db.batch();items.slice(i,i+400).forEach(it=>b2.set(_db.collection(col).doc(),it));await b2.commit();}}
    if(p.company) await _db.collection("_cfg").doc("company").set(p.company);toast("✅ تم الاستيراد بنجاح");
  },
  exportData(){return this.exportJSON();},
  importData(j){return this.importJSON(j);},
  save(){},
};

function _seed(){
  if(!confirm('⚠️ سيتم إضافة بيانات تجريبية (عملاء وموردون وخامات وحسابات وهمية) فوق بياناتك الحالية.\nاستخدم هذا فقط للتجربة على قاعدة بيانات فاضية تماماً — لا تستخدمه على بيانات حقيقية.\nمتأكد؟')) return;
  [{name:"الشيخ",openingBalance:450000,phone:"",notes:"",prices:[{material:"تربة زلطية",price:135,from:"2026-01-01"}]},{name:"طيبة (مشروع الخيول)",openingBalance:247200,phone:"",notes:"",prices:[{material:"تربة زلطية",price:135,from:"2026-01-01"}]},{name:"إيماك",openingBalance:130000,phone:"",notes:"",prices:[{material:"نقل مخلفات",price:100,from:"2026-01-01"}]},{name:"طيبة (بن زايد الجنوبي)",openingBalance:0,phone:"",notes:"",prices:[]},{name:"شركة ريال (موقع 400)",openingBalance:0,phone:"",notes:"",prices:[]},{name:"الشروق",openingBalance:0,phone:"",notes:"",prices:[]}].forEach(c=>DB.insert("customers",c));
  [{name:"أيمن",openingBalance:-500000,phone:"",notes:"",prices:[{material:"تربة زلطية",price:100,from:"2026-01-01"}]},{name:"أحمد الربيعي",openingBalance:-200000,phone:"",notes:"",prices:[{material:"رملة",price:65,from:"2026-01-01"}]},{name:"نادر",openingBalance:2000,phone:"",notes:"",prices:[]},{name:"تامر السيد",openingBalance:0,phone:"",notes:"",prices:[]},{name:"تبع نادر",openingBalance:0,phone:"",notes:"",prices:[]},{name:"أحمد الفيومي",openingBalance:0,phone:"",notes:"",prices:[]},{name:"أبو عمار",openingBalance:0,phone:"",notes:"",prices:[]},{name:"محمد الجرف",openingBalance:0,phone:"",notes:"",prices:[]},{name:"شديد",openingBalance:0,phone:"",notes:"",prices:[]},{name:"خالد جمعة",openingBalance:0,phone:"",notes:"",prices:[]}].forEach(s=>DB.insert("suppliers",s));
  [{name:"تربة زلطية",defaultSellPrice:135,defaultBuyPrice:100,unit:"م³"},{name:"رملة",defaultSellPrice:95,defaultBuyPrice:65,unit:"م³"},{name:"نقل مخلفات",defaultSellPrice:100,defaultBuyPrice:90,unit:"م³"},{name:"توريد زلط",defaultSellPrice:350,defaultBuyPrice:330,unit:"م³"}].forEach(m=>DB.insert("materials",m));
  [{code:"1001",name:"الصندوق",type:"أصول",openingBalance:0},{code:"1002",name:"البنك",type:"أصول",openingBalance:0},{code:"1003",name:"أوراق قبض",type:"أصول",openingBalance:0},{code:"1010",name:"ذمم العملاء",type:"أصول",openingBalance:827200},{code:"2001",name:"ذمم الموردين",type:"خصوم",openingBalance:698000},{code:"2002",name:"أوراق دفع",type:"خصوم",openingBalance:0},{code:"3001",name:"حسابات الشركاء",type:"حقوق ملكية",openingBalance:0},{code:"4000",name:"الإيرادات",type:"إيرادات",openingBalance:0},{code:"5000",name:"تكلفة المبيعات",type:"مصروفات",openingBalance:0},{code:"5010",name:"عمولات الشركاء",type:"مصروفات",openingBalance:0}].forEach(a=>DB.insert("accounts",a));
  toast('✅ تم تحميل البيانات التجريبية');
}
