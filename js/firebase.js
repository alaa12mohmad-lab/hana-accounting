// ═══ FIREBASE REPO + AUTH + INVITATIONS ═══
// ════════════════════════════════════════════════════
function buildDB(){
  const cfg = getFBConfig();
  if(cfg?.apiKey && typeof firebase!=='undefined'){
    return createFirebaseRepo(cfg);
  }
  // Fallback: localStorage
  setConnStatus('local','بيانات محلية');
  return createLocalRepo();
}



// ════════════════════════════════════════════════════════════
// AUTH SYSTEM — Invitation-only with Firebase
// Admin: 3laalafi@gmail.com
// ════════════════════════════════════════════════════════════
const ADMIN_EMAIL = '3laalafi@gmail.com';

// ── Tab switcher ─────────────────────────────────────────────
function showAuthTab(tab){
  const login = document.getElementById('auth-login');
  const reg   = document.getElementById('auth-register');
  const tl    = document.getElementById('tab-login');
  const tr    = document.getElementById('tab-register');
  if(!login||!reg) return;
  const activeStyle  = 'flex:1;padding:13px;border:none;background:#fff;font-family:Tahoma,sans-serif;font-size:13px;font-weight:700;color:#1F4E78;border-bottom:3px solid #1F4E78;cursor:pointer;margin-bottom:-2px';
  const passiveStyle = 'flex:1;padding:13px;border:none;background:#f8fafc;font-family:Tahoma,sans-serif;font-size:12px;font-weight:600;color:#64748b;cursor:pointer';
  login.style.display = tab==='login'    ? '' : 'none';
  reg.style.display   = tab==='register' ? '' : 'none';
  if(tl) tl.style.cssText = tab==='login' ? activeStyle : passiveStyle;
  if(tr) tr.style.cssText = tab==='register' ? activeStyle : passiveStyle;
}

function showAuthErr(id, msg){
  const el = document.getElementById(id);
  if(!el) return;
  el.style.display = 'flex';
  el.innerHTML = '<span style="margin-left:5px;font-size:14px">❌</span><span>'+msg+'</span>';
}
function clearAuthErr(id){
  const el = document.getElementById(id);
  if(el){ el.style.display='none'; el.innerHTML=''; }
}

// ── Login ────────────────────────────────────────────────────
async function doLogin(){
  const email = document.getElementById('login-email')?.value?.trim();
  const pass  = document.getElementById('login-pass')?.value;
  clearAuthErr('login-err');
  if(!email||!pass){ showAuthErr('login-err','أدخل البريد وكلمة المرور'); return; }
  const btn = document.getElementById('login-btn');
  if(btn){ btn.disabled=true; btn.textContent='⏳ جاري الدخول...'; }
  try{
    await firebase.auth().signInWithEmailAndPassword(email, pass);
  }catch(e){
    const map={'auth/user-not-found':'البريد الإلكتروني غير مسجّل','auth/wrong-password':'كلمة المرور غير صحيحة','auth/invalid-email':'بريد إلكتروني غير صالح','auth/too-many-requests':'محاولات كثيرة — انتظر قليلاً','auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة','auth/network-request-failed':'لا يوجد اتصال بالإنترنت'};
    showAuthErr('login-err', map[e.code]||e.message);
    if(btn){ btn.disabled=false; btn.textContent='🔐 دخول'; }
  }
}

// ── Invitation check ─────────────────────────────────────────
async function checkInvitation(email){
  if(email.toLowerCase()===ADMIN_EMAIL) return true;
  try{
    const snap = await firebase.firestore()
      .collection('invitations')
      .where('email','==',email.toLowerCase())
      .where('active','==',true)
      .get();
    return !snap.empty;
  }catch(e){ return false; }
}

// ── Register ─────────────────────────────────────────────────
async function doRegister(){
  const email = document.getElementById('reg-email')?.value?.trim()?.toLowerCase();
  const pass  = document.getElementById('reg-pass')?.value;
  const pass2 = document.getElementById('reg-pass2')?.value;
  clearAuthErr('reg-err');
  if(!email){ showAuthErr('reg-err','أدخل البريد الإلكتروني'); return; }
  if(!pass||pass.length<6){ showAuthErr('reg-err','كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
  if(pass!==pass2){ showAuthErr('reg-err','كلمتا المرور غير متطابقتين'); return; }
  const btn = document.getElementById('reg-btn');
  if(btn){ btn.disabled=true; btn.textContent='⏳ جاري التحقق من الدعوة...'; }
  try{
    const invited = await checkInvitation(email);
    if(!invited){
      showAuthErr('reg-err','هذا البريد غير مدعو — تواصل مع المدير ليضيفك أولاً');
      if(btn){ btn.disabled=false; btn.textContent='✅ إنشاء الحساب'; }
      return;
    }
    if(btn) btn.textContent='⏳ جاري إنشاء الحساب...';
    await firebase.auth().createUserWithEmailAndPassword(email, pass);
    // Mark invitation as used
    try{
      const snap = await firebase.firestore().collection('invitations').where('email','==',email).get();
      snap.docs.forEach(d=>d.ref.update({used:true,usedAt:Date.now()}));
    }catch(e){}
  }catch(e){
    const map={'auth/email-already-in-use':'هذا البريد مسجّل مسبقاً — استخدم تسجيل الدخول','auth/invalid-email':'بريد إلكتروني غير صالح','auth/weak-password':'كلمة المرور ضعيفة — 6 أحرف على الأقل'};
    showAuthErr('reg-err', map[e.code]||e.message);
    if(btn){ btn.disabled=false; btn.textContent='✅ إنشاء الحساب'; }
  }
}

// ── Logout ───────────────────────────────────────────────────
function doLogout(){
  if(!confirm('تسجيل الخروج من النظام؟')) return;
  firebase.auth().signOut();
}

// ── User badge (topbar) ──────────────────────────────────────
function renderUserBadge(user){
  const el = document.getElementById('user-badge');
  if(!el) return;
  const isAdmin = user.email.toLowerCase()===ADMIN_EMAIL;
  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:5px">'+
    '<span style="background:#eff6ff;border-radius:6px;padding:3px 8px;font-size:10px;color:#1F4E78;font-weight:700;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+
    (isAdmin?'👑 ':'👤 ')+user.email+'</span>'+
    '<button onclick="doLogout()" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:6px;padding:3px 9px;cursor:pointer;font-size:10px;color:#dc2626;font-weight:700;font-family:inherit">خروج</button>'+
    '</div>';
  // Show invitations link for admin
  const sbInvites = document.getElementById('sb-invites');
  if(sbInvites && isAdmin) sbInvites.style.display='';
}

// ── Main auth flow ────────────────────────────────────────────
function initAuthFlow(){
  const fbCfg = typeof getFBConfig==='function' ? getFBConfig() : null;

  if(!fbCfg?.apiKey || typeof firebase==='undefined'){
    // No Firebase config — run locally without auth
    document.getElementById('auth-screen')?.style.setProperty('display','none','important');
    nav('dashboard');
    return;
  }

  // Firebase mode — wait for auth state
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display = 'none';

  firebase.auth().onAuthStateChanged(async user=>{
    if(!user){
      document.getElementById('auth-screen').style.display = 'flex';
      document.getElementById('sidebar').style.display = 'none';
      document.getElementById('main').style.display = 'none';
      // Reset buttons
      const lb = document.getElementById('login-btn');
      const rb = document.getElementById('reg-btn');
      if(lb){ lb.disabled=false; lb.textContent='🔐 دخول'; }
      if(rb){ rb.disabled=false; rb.textContent='✅ إنشاء الحساب'; }
      return;
    }
    // Check invitation
    const allowed = await checkInvitation(user.email);
    if(!allowed){
      showAuthErr('login-err','هذا الحساب غير مصرح له بالدخول');
      firebase.auth().signOut();
      return;
    }
    // Authenticated & invited → show app
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('sidebar').style.removeProperty('display');
    document.getElementById('main').style.removeProperty('display');
    renderUserBadge(user);
    nav('dashboard');
  });
}

// ════════════════════════════════════════════════════════════
// MOBILE SIDEBAR
// ════════════════════════════════════════════════════════════
function initMobileSidebar(){
  // Show mob-close buttons on mobile only
  const isMob = ()=>window.innerWidth<=768;
  window.addEventListener('resize',()=>{
    const closeBtns = document.querySelectorAll('.mob-close-btn');
    closeBtns.forEach(b=>b.style.display=isMob()?'':'none');
    if(!isMob()){
      document.getElementById('sidebar')?.classList.remove('mob-open');
      document.getElementById('mob-overlay').style.display='none';
    }
  });
  if(isMob()){
    const closeBtns = document.querySelectorAll('.mob-close-btn');
    closeBtns.forEach(b=>b.style.display='');
  }
}

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

// Mobile-aware toggleSidebar (replaces original safely via window)
window.__toggleSidebarMobile = function(){
  if(window.innerWidth<=768){
    const sb = document.getElementById('sidebar');
    if(sb?.classList.contains('mob-open')) closeMobSidebar();
    else openMobSidebar();
  } else {
    document.getElementById('sidebar')?.classList.toggle('closed');
    document.getElementById('main')?.classList.toggle('full');
  }
};

// Close mobile sidebar on nav (safe - no override)
document.addEventListener('click', function(e){
  const link = e.target.closest('.sb-link');
  if(link && window.innerWidth <= 768) closeMobSidebar();
});

// ════════════════════════════════════════════════════════════
// INVITATIONS MANAGEMENT (Admin only)
// ════════════════════════════════════════════════════════════
function renderInvitations(){
  const user = firebase.auth().currentUser;
  if(!user||user.email.toLowerCase()!==ADMIN_EMAIL){
    return '<div class="card"><div class="alert alert-red"><span>🔒</span><span>هذه الصفحة للمدير فقط</span></div></div>';
  }
  setTimeout(()=>_loadInvites(),80);
  return '<div id="invites-container"><div class="card" style="text-align:center;padding:30px"><div style="font-size:28px">⏳</div><p class="text-gray">جاري التحميل...</p></div></div>';
}

async function _loadInvites(){
  const el = document.getElementById('invites-container');
  if(!el) return;
  try{
    const snap = await firebase.firestore().collection('invitations')
      .orderBy('addedAt','desc').get();
    const rows = snap.docs.map(d=>({id:d.id,...d.data()}));
    el.innerHTML = `
    <div>
      <div class="page-header">
        <div>
          <div class="section-title" style="margin:0">📧 إدارة الدعوات</div>
          <p class="text-xs text-gray mt4">فقط البريد المضاف هنا يمكنه التسجيل في النظام</p>
        </div>
        <button class="btn btn-primary" onclick="openAddInviteModal()">＋ إضافة دعوة جديدة</button>
      </div>
      <div class="alert alert-blue mb12" style="font-size:11px">
        <span>💡</span>
        <div>
          <strong>كيف تعمل الدعوات:</strong><br>
          1. أضف بريد الشخص هنا ← 2. أرسله له رابط النظام ← 3. يفتح الرابط ويسجّل بنفسه بكلمة مروره الخاصة
        </div>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>البريد الإلكتروني</th><th>تاريخ الإضافة</th>
          <th>الحالة</th><th>ملاحظة</th><th>إجراء</th>
        </tr></thead>
        <tbody>
          ${rows.length===0
            ? '<tr><td colspan="5" class="tbl-empty"><span class="tbl-empty-icon">📧</span>لا توجد دعوات — أضف بريد إلكتروني للبدء</td></tr>'
            : rows.map(inv=>`<tr>
                <td dir="ltr" style="text-align:right">
                  <strong class="font-mono" style="font-size:12px">${inv.email}</strong>
                  ${inv.email===ADMIN_EMAIL?'<span class="badge badge-purple" style="margin-right:6px">مدير</span>':''}
                </td>
                <td class="text-gray text-xs">${inv.addedAt?fmtDate(inv.addedAt):'—'}</td>
                <td>${inv.used?badge('مستخدمة ✓','green'):inv.active?badge('نشطة','blue'):badge('ملغاة','gray')}</td>
                <td class="text-xs text-gray">${inv.note||'—'}</td>
                <td><div class="flex" style="gap:4px">
                  ${inv.active&&!inv.used?`<button class="btn btn-gray btn-xs" onclick="revokeInvite('${inv.id}')" title="إلغاء الدعوة">🚫 إلغاء</button>`:''}
                  <button class="btn btn-red btn-xs" onclick="deleteInvite('${inv.id}')" title="حذف نهائي">🗑️</button>
                </div></td>
              </tr>`).join('')
          }
        </tbody>
      </table></div>
    </div>`;
  }catch(e){
    el.innerHTML='<div class="card"><div class="alert alert-red"><span>❌</span><span>خطأ: '+e.message+'</span></div></div>';
  }
}

function openAddInviteModal(){
  openModal('📧 إضافة دعوة جديدة',
    '<div class="alert alert-blue mb12" style="font-size:11px"><span>📧</span><span>سيتمكن هذا البريد من إنشاء حساب وتسجيل الدخول للنظام</span></div>'+
    '<div class="form-group mb10"><label><span class="req">*</span> البريد الإلكتروني</label>'+
    '<input type="email" id="inv-email" dir="ltr" placeholder="name@example.com" style="direction:ltr"></div>'+
    '<div class="form-group"><label>ملاحظة (اختياري)</label>'+
    '<input id="inv-note" placeholder="مثال: محاسب الشركة، المدير المالي..."></div>',
    '<button class="btn btn-gray" onclick="closeModal()">إلغاء</button>'+
    '<button class="btn btn-primary" onclick="addInvite()">📧 إضافة الدعوة</button>',
    'modal-sm');
  setTimeout(()=>document.getElementById('inv-email')?.focus(),200);
}

async function addInvite(){
  const email = document.getElementById('inv-email')?.value?.trim()?.toLowerCase();
  const note  = document.getElementById('inv-note')?.value?.trim()||'';
  if(!email||!email.includes('@')){ toast('أدخل بريد إلكتروني صحيح','error'); return; }
  try{
    const existing = await firebase.firestore().collection('invitations')
      .where('email','==',email).get();
    if(!existing.empty){ toast('هذا البريد مضاف مسبقاً','error'); return; }
    await firebase.firestore().collection('invitations').add({
      email, note, active:true, used:false,
      addedAt:Date.now(), addedBy:ADMIN_EMAIL,
    });
    closeModal();
    toast('✅ تمت إضافة الدعوة بنجاح');
    _loadInvites();
  }catch(e){ toast('خطأ: '+e.message,'error'); }
}

async function revokeInvite(id){
  if(!confirm('إلغاء هذه الدعوة؟ لن يتمكن الشخص من التسجيل بعد الآن')) return;
  await firebase.firestore().collection('invitations').doc(id).update({active:false});
  toast('تم إلغاء الدعوة'); _loadInvites();
}

async function deleteInvite(id){
  if(!confirm('حذف هذه الدعوة نهائياً؟')) return;
  await firebase.firestore().collection('invitations').doc(id).delete();
  toast('تم الحذف'); _loadInvites();
}
