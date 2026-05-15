// ════════════════════════════════════════════════════════════════
// FIREBASE — Auth + Roles + Invitations + PWA Install
// ════════════════════════════════════════════════════════════════

// ── Auth Screen Tabs ─────────────────────────────────────────────
function showAuthTab(tab){
  const li=document.getElementById('auth-login'), re=document.getElementById('auth-register');
  const tl=document.getElementById('tab-login'), tr=document.getElementById('tab-register');
  if(!li||!re) return;
  li.style.display=tab==='login'?'':'none';
  re.style.display=tab==='register'?'':'none';
  const on='flex:1;padding:13px;border:none;background:#fff;font-family:Tahoma,sans-serif;font-size:13px;font-weight:700;color:#1F4E78;border-bottom:3px solid #1F4E78;cursor:pointer;margin-bottom:-2px';
  const off='flex:1;padding:13px;border:none;background:#f8fafc;font-family:Tahoma,sans-serif;font-size:12px;font-weight:600;color:#64748b;cursor:pointer';
  if(tl) tl.style.cssText=tab==='login'?on:off;
  if(tr) tr.style.cssText=tab==='register'?on:off;
}
function showAuthErr(id,msg){ const el=document.getElementById(id); if(el){el.style.display='flex';el.innerHTML='<span style="margin-left:5px">❌</span><span>'+msg+'</span>';} }
function clearAuthErr(id){ const el=document.getElementById(id); if(el){el.style.display='none';el.innerHTML='';} }

// ── Login ────────────────────────────────────────────────────────
async function doLogin(){
  const email=document.getElementById('login-email')?.value?.trim();
  const pass=document.getElementById('login-pass')?.value;
  clearAuthErr('login-err');
  if(!email||!pass){showAuthErr('login-err','أدخل البريد وكلمة المرور');return;}
  const btn=document.getElementById('login-btn');
  if(btn){btn.disabled=true;btn.textContent='⏳...';}
  try{
    await firebase.auth().signInWithEmailAndPassword(email,pass);
  }catch(e){
    const m={'auth/user-not-found':'البريد غير مسجّل','auth/wrong-password':'كلمة المرور خاطئة','auth/invalid-email':'بريد غير صالح','auth/too-many-requests':'محاولات كثيرة','auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة','auth/network-request-failed':'لا يوجد اتصال'};
    showAuthErr('login-err',m[e.code]||e.message);
    if(btn){btn.disabled=false;btn.textContent='🔐 دخول';}
  }
}

// ── Invitation Check ─────────────────────────────────────────────
async function checkInvitation(email){
  if(email.toLowerCase()===ADMIN_EMAIL) return true;
  var emailLower = email.toLowerCase();
  try{
    // Primary check: active invitations
    var snap=await firebase.firestore().collection('invitations')
      .where('email','==',emailLower).where('active','==',true).get();
    if(!snap.empty) return true;
    // Fallback: any invitation not explicitly disabled
    var snap2=await firebase.firestore().collection('invitations')
      .where('email','==',emailLower).get();
    return snap2.docs.some(function(d){
      var data=d.data();
      return data.active!==false && !data.revoked;
    });
  }catch(e){ console.warn('checkInvitation:',e.message); return false; }
}

// ── Register ─────────────────────────────────────────────────────
async function doRegister(){
  const email=document.getElementById('reg-email')?.value?.trim()?.toLowerCase();
  const pass=document.getElementById('reg-pass')?.value;
  const pass2=document.getElementById('reg-pass2')?.value;
  clearAuthErr('reg-err');
  if(!email){showAuthErr('reg-err','أدخل البريد الإلكتروني');return;}
  if(!pass||pass.length<6){showAuthErr('reg-err','كلمة المرور 6 أحرف على الأقل');return;}
  if(pass!==pass2){showAuthErr('reg-err','كلمتا المرور غير متطابقتين');return;}
  const btn=document.getElementById('reg-btn');
  if(btn){btn.disabled=true;btn.textContent='⏳ جاري التحقق...';}
  try{
    const invited=await checkInvitation(email);
    if(!invited){showAuthErr('reg-err','هذا البريد غير مدعو — تواصل مع المدير');if(btn){btn.disabled=false;btn.textContent='✅ إنشاء الحساب';}return;}
    const cred = await firebase.auth().createUserWithEmailAndPassword(email,pass);
    // Add user to _users with default role
    try{
      await firebase.firestore().collection('_users').doc(cred.user.uid).set({
        email: email,
        role: 'reviewer',
        createdAt: Date.now(),
        createdBy: 'self-register',
      });
    }catch(e){ console.warn('Could not set user role:', e); }
    // Mark invitation used
    try{const sn=await firebase.firestore().collection('invitations').where('email','==',email).get();sn.docs.forEach(d=>d.ref.update({used:true,usedAt:Date.now()}));}catch{}
  }catch(e){
    const m={'auth/email-already-in-use':'البريد مسجّل مسبقاً','auth/invalid-email':'بريد غير صالح','auth/weak-password':'كلمة المرور ضعيفة'};
    showAuthErr('reg-err',m[e.code]||e.message);
    if(btn){btn.disabled=false;btn.textContent='✅ إنشاء الحساب';}
  }
}

// ── Logout ───────────────────────────────────────────────────────
function doLogout(){
  if(!confirm('تسجيل الخروج من النظام؟')) return;
  firebase.auth().signOut();
}

// ── Get/Set User Role in Firestore ───────────────────────────────
async function getUserRole(uid, email){
  if(email?.toLowerCase()===ADMIN_EMAIL) return 'admin';
  try{
    const doc=await firebase.firestore().collection('_users').doc(uid).get();
    return doc.exists ? (doc.data().role||'reviewer') : 'reviewer';
  }catch{return 'reviewer';}
}

async function setUserRole(uid, role){
  await firebase.firestore().collection('_users').doc(uid).set({role,updatedAt:Date.now(),updatedBy:ADMIN_EMAIL},{merge:true});
}

// ── User Badge (Topbar) ──────────────────────────────────────────
function renderUserBadge(user){
  const el=document.getElementById('user-badge');
  if(!el) return;
  const roleInfo=ROLES[currentRole()]||ROLES.reviewer;
  const isAdm=isAdmin();
  el.innerHTML=
    '<div style="display:flex;align-items:center;gap:6px">'+
    '<span style="background:#eff6ff;border-radius:20px;padding:3px 10px;font-size:10px;color:#1F4E78;font-weight:700;white-space:nowrap">'+
    roleInfo.label+' — '+user.email.split('@')[0]+'</span>'+
    '<button onclick="doLogout()" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:11px;color:#dc2626;font-weight:700;font-family:inherit;white-space:nowrap">خروج</button>'+
    '</div>';
  // Show/hide admin-only sidebar links
  const usersLink=document.getElementById('sb-users');
  const invLink=document.getElementById('sb-invites');
  if(usersLink) usersLink.style.display=isAdm?'':'none';
  if(invLink)   invLink.style.display=isAdm?'':'none';
  // Hide write buttons for reviewers
  if(!can('write')) applyReviewerMode();
}

function applyReviewerMode(){
  // Add CSS class to body to hide write-only elements
  document.body.classList.add('reviewer-mode');
}


// ── Ensure user is in _users (creates if missing) ────────────────
async function ensureUserInDB(user){
  const isAdm = user.email.toLowerCase() === ADMIN_EMAIL;
  const defaultRole = isAdm ? 'admin' : 'reviewer';
  try{
    const doc = await firebase.firestore().collection('_users').doc(user.uid).get();
    if(!doc.exists){
      // Create entry
      await firebase.firestore().collection('_users').doc(user.uid).set({
        email: user.email,
        role: defaultRole,
        createdAt: Date.now(),
        createdBy: 'auto',
      });
      return defaultRole;
    }
    const data = doc.data();
    // If admin email, always return admin
    if(isAdm) return 'admin';
    return data.role || 'reviewer';
  }catch(e){
    console.warn('ensureUserInDB error:', e);
    return defaultRole;
  }
}

// ── Main Auth Flow ────────────────────────────────────────────────
function initAuthFlow(){
  const fbCfg=getFBConfig();
  if(!fbCfg?.apiKey){
    // No Firebase config — show setup screen
    showSetupScreen();
    return;
  }
  try{
    if(!firebase.apps.length) firebase.initializeApp(fbCfg);
    const db=firebase.firestore();
    const auth=firebase.auth();
    initFirestoreDB(db);
    setConnStatus('connecting','جاري الاتصال...');
    auth.onAuthStateChanged(async user=>{
      if(!user){
        showAuthScreen();
        setConnStatus('local','غير متصل');
        return;
      }
      const allowed=await checkInvitation(user.email);
      if(!allowed){showAuthErr('login-err','هذا الحساب غير مصرح له');firebase.auth().signOut();return;}
      // Ensure user exists in _users (creates entry if missing)
      const role = await ensureUserInDB(user);
      setCurrentUser(user, role);
      hideAuthScreen();
      renderUserBadge(user);
      setConnStatus('connected','متصل ☁️');
      onDBReady(function(){
        nav('dashboard');
        if(typeof initBackupSystem==='function') initBackupSystem();
      });
    });
  }catch(e){
    setConnStatus('error','خطأ Firebase');
    toast('خطأ: '+e.message,'error');
    showSetupScreen();
  }
}

function showAuthScreen(){
  const as=document.getElementById('auth-screen');
  if(as) as.style.display='flex';
  document.getElementById('sidebar').style.display='none';
  document.getElementById('main').style.display='none';
}
function hideAuthScreen(){
  const as=document.getElementById('auth-screen');
  if(as) as.style.display='none';
  document.getElementById('sidebar').style.removeProperty('display');
  document.getElementById('main').style.removeProperty('display');
}

// ── Setup Screen (no Firebase config yet) ────────────────────────
function showSetupScreen(){
  const as=document.getElementById('auth-screen');
  if(as){
    as.style.display='flex';
    as.innerHTML='<div id="auth-card"><div style="background:linear-gradient(135deg,#1F4E78,#1e40af);padding:28px 24px;text-align:center;color:#fff"><div style="font-size:52px;margin-bottom:10px">🚛</div><h1 style="font-size:20px;font-weight:800;margin:0 0 4px">شركة الهنا للنقل</h1><p style="font-size:11px;opacity:.7;margin:0">النظام المحاسبي الإداري</p></div>'+
    '<div style="padding:22px">'+
    '<div class="alert alert-blue mb12" style="font-size:11px"><span>⚙️</span><div>النظام يحتاج إعداد Firebase للعمل.<br>يجب إدخال بيانات الاتصال مرة واحدة فقط.</div></div>'+
    renderFBSetupForm()+
    '</div></div>';
  }
}

function renderFBSetupForm(){
  return '<div style="font-weight:700;font-size:13px;color:#1F4E78;margin-bottom:12px">☁️ إعداد Firebase</div>'+
    '<div style="display:grid;gap:8px;margin-bottom:12px">'+
    '<div><label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px">API Key</label><input id="fb-apiKey" dir="ltr" placeholder="AIzaSy..." style="width:100%;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12px;box-sizing:border-box"></div>'+
    '<div><label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px">Project ID</label><input id="fb-projectId" dir="ltr" placeholder="my-project-123" style="width:100%;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12px;box-sizing:border-box"></div>'+
    '<div><label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px">Auth Domain</label><input id="fb-authDomain" dir="ltr" placeholder="project.firebaseapp.com" style="width:100%;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12px;box-sizing:border-box"></div>'+
    '<div><label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px">App ID</label><input id="fb-appId" dir="ltr" placeholder="1:123:web:abc" style="width:100%;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12px;box-sizing:border-box"></div>'+
    '<div><label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px">Storage Bucket</label><input id="fb-storageBucket" dir="ltr" placeholder="project.appspot.com" style="width:100%;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12px;box-sizing:border-box"></div>'+
    '<div><label style="font-size:10px;font-weight:700;color:#374151;display:block;margin-bottom:3px">Messaging Sender ID</label><input id="fb-senderId" dir="ltr" placeholder="123456789" style="width:100%;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:12px;box-sizing:border-box"></div>'+
    '</div>'+
    '<button onclick="saveAndConnect()" style="width:100%;background:linear-gradient(135deg,#1F4E78,#1e40af);color:#fff;border:none;border-radius:10px;padding:12px;font-family:Tahoma,sans-serif;font-size:14px;font-weight:700;cursor:pointer">☁️ اتصل بـ Firebase</button>'+
    '<p style="text-align:center;font-size:9px;color:#94a3b8;margin:10px 0 0">هذه البيانات لن تُرفع على GitHub — تُحفظ في متصفحك فقط</p>';
}

function saveAndConnect(){
  const cfg={
    apiKey:            document.getElementById('fb-apiKey')?.value?.trim(),
    projectId:         document.getElementById('fb-projectId')?.value?.trim(),
    authDomain:        document.getElementById('fb-authDomain')?.value?.trim(),
    storageBucket:     document.getElementById('fb-storageBucket')?.value?.trim(),
    messagingSenderId: document.getElementById('fb-senderId')?.value?.trim(),
    appId:             document.getElementById('fb-appId')?.value?.trim(),
  };
  if(!cfg.apiKey||!cfg.projectId){toast('أدخل API Key و Project ID على الأقل','error');return;}
  saveFBConfig(cfg);
  toast('✅ تم الحفظ — جاري الاتصال...');
  setTimeout(()=>location.reload(),1200);
}

function disconnectFirebase(){
  if(!confirm('قطع الاتصال بـ Firebase؟')) return;
  localStorage.removeItem(FB_CONFIG_KEY);
  toast('تم قطع الاتصال — إعادة تحميل...');
  setTimeout(()=>location.reload(),1000);
}

// ── Connection Status ─────────────────────────────────────────────
function setConnStatus(status,msg){
  const el=document.getElementById('conn-status');
  if(!el) return;
  const clr={connected:'#16a34a',connecting:'#d97706',error:'#dc2626',local:'#94a3b8'};
  const ico={connected:'🟢',connecting:'🟡',error:'🔴',local:'⚫'};
  el.textContent=(ico[status]||'')+(msg?' '+msg:'');
  el.style.color=clr[status]||'#94a3b8';
}

// ══════════════════════════════════════════════════════════════════
// INVITATIONS (Admin only)
// ══════════════════════════════════════════════════════════════════
function renderInvitations(){
  if(!isAdmin()) return '<div class="card"><div class="alert alert-red"><span>🔒</span><span>للمدير فقط</span></div></div>';
  setTimeout(()=>_loadInvites(),80);
  return '<div id="inv-container"><div class="card" style="text-align:center;padding:30px"><div style="font-size:28px">⏳</div></div></div>';
}

async function _loadInvites(){
  const el=document.getElementById('inv-container');
  if(!el) return;
  try{
    const snap=await firebase.firestore().collection('invitations').orderBy('addedAt','desc').get();
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    el.innerHTML='<div>'+
      '<div class="page-header"><div><div class="section-title" style="margin:0">📧 إدارة الدعوات</div>'+
      '<p class="text-xs text-gray mt4">أضف بريد المستخدم هنا ثم أرسل له رابط النظام</p></div>'+
      '<button class="btn btn-primary" onclick="openAddInviteModal()">＋ دعوة جديدة</button></div>'+
      '<div class="tbl-wrap"><table><thead><tr><th>البريد</th><th>تاريخ الإضافة</th><th>الحالة</th><th>إجراء</th></tr></thead>'+
      '<tbody>'+
      (rows.length===0?'<tr><td colspan="4" class="tbl-empty"><span class="tbl-empty-icon">📧</span>لا توجد دعوات</td></tr>':
        rows.map(inv=>'<tr>'+
          '<td class="font-mono"><strong>'+inv.email+'</strong></td>'+
          '<td class="text-gray text-xs">'+fmtDate(inv.addedAt)+'</td>'+
          '<td>'+(inv.used?badge('مستخدمة','green'):inv.active?badge('نشطة','blue'):badge('ملغاة','gray'))+'</td>'+
          '<td><div class="flex" style="gap:4px">'+
          (inv.active&&!inv.used?'<button class="btn btn-gray btn-xs" onclick="revokeInvite(\''+inv.id+'\')">🚫 إلغاء</button>':'')+
          '<button class="btn btn-red btn-xs" onclick="deleteInvite(\''+inv.id+'\')">🗑️</button></div></td></tr>').join(''))+
      '</tbody></table></div></div>';
  }catch(e){el.innerHTML='<div class="card"><div class="alert alert-red"><span>❌</span><span>'+e.message+'</span></div></div>';}
}

function openAddInviteModal(){
  openModal('📧 دعوة مستخدم جديد',
    '<div class="alert alert-blue mb12" style="font-size:11px"><span>💡</span><span>أضف بريد المستخدم ثم أرسل له رابط الموقع. سيُنشئ كلمة مروره بنفسه.</span></div>'+
    '<div class="form-group mb10"><label><span class="req">*</span> البريد الإلكتروني</label><input type="email" id="inv-email" dir="ltr" placeholder="name@example.com"></div>'+
    '<div class="form-group"><label>ملاحظة</label><input id="inv-note" placeholder="مثال: المحاسب الجديد..."></div>',
    '<button class="btn btn-gray" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="addInvite()">📧 إضافة</button>',
    'modal-sm');
  setTimeout(()=>document.getElementById('inv-email')?.focus(),200);
}

async function addInvite(){
  const email=document.getElementById('inv-email')?.value?.trim()?.toLowerCase();
  const note=document.getElementById('inv-note')?.value?.trim()||'';
  if(!email||!email.includes('@')){toast('أدخل بريد صحيح','error');return;}
  try{
    const ex=await firebase.firestore().collection('invitations').where('email','==',email).get();
    if(!ex.empty){toast('هذا البريد مضاف مسبقاً','error');return;}
    await firebase.firestore().collection('invitations').add({email,note,active:true,used:false,addedAt:Date.now(),addedBy:ADMIN_EMAIL});
    closeModal();toast('✅ تمت إضافة الدعوة');_loadInvites();
  }catch(e){toast('خطأ: '+e.message,'error');}
}
async function revokeInvite(id){if(!confirm('إلغاء الدعوة؟'))return;await firebase.firestore().collection('invitations').doc(id).update({active:false});toast('تم الإلغاء');_loadInvites();}
async function deleteInvite(id){if(!confirm('حذف نهائياً؟'))return;await firebase.firestore().collection('invitations').doc(id).delete();toast('تم الحذف');_loadInvites();}

// ══════════════════════════════════════════════════════════════════
// USER MANAGEMENT (Admin only)
// ══════════════════════════════════════════════════════════════════
function renderUsers(){
  if(!isAdmin()) return '<div class="card"><div class="alert alert-red"><span>🔒</span><span>للمدير فقط</span></div></div>';
  setTimeout(()=>_loadUsers(),80);
  return '<div id="users-container"><div class="card" style="text-align:center;padding:30px"><div style="font-size:28px">⏳</div></div></div>';
}

async function _loadUsers(){
  const el=document.getElementById('users-container');
  if(!el) return;
  try{
    const snap=await firebase.firestore().collection('_users').orderBy('createdAt','desc').get();
    const users=snap.docs.map(d=>({uid:d.id,...d.data()}));
    let rows='';
    if(users.length===0){
      rows='<tr><td colspan="4" class="tbl-empty"><span class="tbl-empty-icon">👥</span>لا يوجد مستخدمون</td></tr>';
    } else {
      users.forEach(u=>{
        const role=u.role||'reviewer';
        const rInfo=ROLES[role]||ROLES.reviewer;
        const isAdmUser=u.email?.toLowerCase()===ADMIN_EMAIL;
        let btns='<span class="text-xs text-gray">ثابت</span>';
        if(!isAdmUser){
          btns='<div class="flex" style="gap:4px">';
          Object.entries(ROLES).forEach(([k,v])=>{
            const bg=role===k?v.color:'#f1f5f9';
            const fg=role===k?'#fff':'#374151';
            btns+='<button data-uid="'+u.uid+'" data-k="'+k+'" onclick="changeUserRole(this.dataset.uid,this.dataset.k)" style="background:'+bg+';color:'+fg+';border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">'+v.label+'</button>';
          });
          btns+='</div>';
        }
        rows+='<tr>'+
          '<td><strong>'+(u.email||u.uid)+'</strong>'+(isAdmUser?' <span style="background:#7c3aed20;color:#7c3aed;border:1px solid #7c3aed40;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">مدير</span>':'')+'</td>'+
          '<td><span style="background:'+rInfo.color+'20;color:'+rInfo.color+';border:1px solid '+rInfo.color+'40;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">'+rInfo.label+'</span></td>'+
          '<td class="text-xs text-gray">'+(u.createdAt?fmtDate(u.createdAt):'—')+'</td>'+
          '<td>'+btns+'</td></tr>';
      });
    }
    el.innerHTML='<div>'+
      '<div class="page-header"><div class="section-title" style="margin:0">👥 إدارة المستخدمين</div></div>'+
      '<div class="alert alert-blue mb12" style="font-size:11px"><span>ℹ️</span>'+
      '<div><strong>👑 مدير</strong>: كل الصلاحيات &nbsp;|&nbsp; <strong>✏️ محاسب</strong>: إدخال وتعديل &nbsp;|&nbsp; <strong>👁️ مراجع</strong>: قراءة فقط</div></div>'+
      '<div class="tbl-wrap"><table>'+
      '<thead><tr><th>البريد الإلكتروني</th><th>الدور</th><th>تاريخ التسجيل</th><th>تغيير الدور</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div></div>';
  }catch(e){
    el.innerHTML='<div class="card"><div class="alert alert-red"><span>❌</span><span>'+e.message+'</span></div></div>';
  }
}

async function _loadUsers_old(){
async function changeUserRole(uid,role){
  try{
    await setUserRole(uid,role);
    toast('✅ تم تغيير الدور إلى '+ROLES[role].label);
    _loadUsers();
  }catch(e){toast('خطأ: '+e.message,'error');}
}

// ══════════════════════════════════════════════════════════════════
// PWA INSTALL PROMPT
// ══════════════════════════════════════════════════════════════════
let _pwaPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _pwaPrompt=e;
  // Show install button after 3 seconds
  setTimeout(showPWABanner,3000);
});

function showPWABanner(){
  if(!_pwaPrompt||document.getElementById('pwa-banner')) return;
  const banner=document.createElement('div');
  banner.id='pwa-banner';
  banner.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#1F4E78;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;z-index:9998;box-shadow:0 -4px 20px rgba(0,0,0,.2);font-family:Tahoma,sans-serif;direction:rtl';
  banner.innerHTML=
    '<div style="display:flex;align-items:center;gap:10px">'+
    '<span style="font-size:24px">🚛</span>'+
    '<div><div style="font-size:13px;font-weight:700">ثبّت التطبيق</div>'+
    '<div style="font-size:10px;opacity:.8">وصول سريع من الهاتف بدون متصفح</div></div></div>'+
    '<div style="display:flex;gap:8px">'+
    '<button onclick="installPWA()" style="background:#fff;color:#1F4E78;border:none;border-radius:8px;padding:8px 16px;font-family:Tahoma,sans-serif;font-size:12px;font-weight:700;cursor:pointer">تثبيت ⬇️</button>'+
    '<button onclick="dismissPWA()" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;padding:8px 12px;font-family:Tahoma,sans-serif;font-size:12px;cursor:pointer">لاحقاً</button>'+
    '</div>';
  document.body.appendChild(banner);
}

async function installPWA(){
  if(!_pwaPrompt) return;
  _pwaPrompt.prompt();
  const{outcome}=await _pwaPrompt.userChoice;
  if(outcome==='accepted') toast('✅ تم تثبيت التطبيق بنجاح');
  _pwaPrompt=null;
  dismissPWA();
}
function dismissPWA(){document.getElementById('pwa-banner')?.remove();}
window.addEventListener('appinstalled',()=>{dismissPWA();toast('✅ التطبيق مثبّت على جهازك');});

// ══════════════════════════════════════════════════════════════════
// FIREBASE CONFIG IN SETTINGS PAGE
// ══════════════════════════════════════════════════════════════════
function renderFBSetup(){
  const cfg=getFBConfig();
  const ok=!!(cfg?.apiKey);
  if(ok) return '<div class="card" style="border:2px solid #10b981">'+
    '<div class="flex-between mb10"><div class="section-title" style="margin:0">☁️ Firebase متصل</div><span class="badge badge-green">✅ مُفعَّل</span></div>'+
    '<div class="alert alert-green mb10" style="font-size:11px"><span>✅</span><div>المشروع: <strong>'+cfg.projectId+'</strong> — البيانات محفوظة في السحابة</div></div>'+
    '<button class="btn btn-red btn-sm" onclick="disconnectFirebase()">❌ قطع الاتصال</button></div>';
  return '<div class="card" style="border:2px solid #f59e0b">'+
    '<div class="section-title">☁️ إعداد Firebase</div>'+renderFBSetupForm()+'</div>';
}

function buildDB(){ return DB; }

}
