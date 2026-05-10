// ════════════════════════════════════════════════════════════════
// USERS — إدارة المستخدمين والصلاحيات
// ════════════════════════════════════════════════════════════════

function renderUsers() {
  if (!isAdmin()) {
    return '<div class="card"><div class="alert alert-red"><span>🔒</span><span>للمدير فقط</span></div></div>';
  }
  setTimeout(loadUsersPage, 100);
  return `<div>
    <div class="page-header">
      <div>
        <div class="section-title" style="margin:0">👥 إدارة المستخدمين والصلاحيات</div>
        <p class="text-xs text-gray mt4">اضغط على الدور لتغييره مباشرة</p>
      </div>
      <button class="btn btn-primary" onclick="loadUsersPage()">🔄 تحديث</button>
    </div>
    <div class="grid3 mb12" style="gap:8px">
      <div class="card-sm" style="border-right:4px solid #7c3aed">
        <div style="font-size:15px;font-weight:700;color:#7c3aed;margin-bottom:3px">👑 مدير</div>
        <div class="text-xs text-gray">كل الصلاحيات + إدارة النظام</div>
      </div>
      <div class="card-sm" style="border-right:4px solid #1d4ed8">
        <div style="font-size:15px;font-weight:700;color:#1d4ed8;margin-bottom:3px">✏️ محاسب</div>
        <div class="text-xs text-gray">إدخال + تعديل + حذف البيانات</div>
      </div>
      <div class="card-sm" style="border-right:4px solid #0f766e">
        <div style="font-size:15px;font-weight:700;color:#0f766e;margin-bottom:3px">👁️ مراجع</div>
        <div class="text-xs text-gray">قراءة وطباعة فقط</div>
      </div>
    </div>
    <div class="card" id="users-container">
      <div style="text-align:center;padding:30px;color:#94a3b8">
        <div style="font-size:32px">⏳</div>
        <p class="mt4">جاري التحميل...</p>
      </div>
    </div>
  </div>`;
}

window.loadUsersPage = async function() {
  const el = document.getElementById('users-container');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">⏳ جاري التحميل...</div>';

  try {
    const snap = await firebase.firestore()
      .collection('_users')
      .orderBy('createdAt','desc')
      .get();

    const users = snap.docs.map(d => ({uid: d.id, ...d.data()}));

    if (users.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8">
        <div style="font-size:40px;margin-bottom:10px">👥</div>
        <p style="font-weight:600">لا يوجد مستخدمون بعد</p>
        <p class="text-xs mt4">اذهب إلى 📧 إدارة الدعوات لإضافة مستخدم جديد</p>
      </div>`;
      return;
    }

    let rows = '';
    users.forEach(function(u) {
      const role   = u.role || 'reviewer';
      const rInfo  = ROLES[role] || ROLES.reviewer;
      const isAdmU = u.email && u.email.toLowerCase() === ADMIN_EMAIL;

      let btnHtml = '<span class="text-xs text-gray">ثابت</span>';
      if (!isAdmU) {
        btnHtml = '<div style="display:flex;gap:5px;flex-wrap:wrap">';
        Object.keys(ROLES).forEach(function(k) {
          const v      = ROLES[k];
          const active = role === k;
          const bg     = active ? v.color : '#f1f5f9';
          const fg     = active ? '#ffffff' : '#374151';
          const border = active ? '2px solid ' + v.color : '2px solid #e2e8f0';
          // Use data attributes — no quotes inside quotes
          btnHtml += '<button'
            + ' data-uid="' + u.uid + '"'
            + ' data-role="' + k + '"'
            + ' class="usr-role-btn"'
            + ' style="background:' + bg + ';color:' + fg + ';border:' + border + ';'
            + 'border-radius:8px;padding:5px 12px;font-size:11px;font-weight:600;'
            + 'cursor:pointer;font-family:inherit"'
            + '>' + v.label + '</button>';
        });
        btnHtml += '</div>';
      }

      rows += '<tr>'
        + '<td><div style="font-weight:600;font-size:12px">' + (u.email || u.uid) + '</div>'
        + (isAdmU ? '<div class="text-xs" style="color:#7c3aed;font-weight:700">مدير النظام</div>' : '')
        + '</td>'
        + '<td><span id="rb-' + u.uid + '" style="background:' + rInfo.color + '20;color:' + rInfo.color + ';'
        + 'border:1px solid ' + rInfo.color + '40;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">'
        + rInfo.label + '</span></td>'
        + '<td class="text-xs text-gray">' + (u.createdAt ? fmtDate(u.createdAt) : '—') + '</td>'
        + '<td>' + btnHtml + '</td>'
        + '</tr>';
    });

    el.innerHTML = '<div class="tbl-wrap"><table>'
      + '<thead><tr><th>البريد الإلكتروني</th><th>الدور الحالي</th><th>تاريخ التسجيل</th><th>تغيير الدور</th></tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table></div>';

    // Attach listeners AFTER innerHTML is set
    el.querySelectorAll('.usr-role-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        window.applyRoleChange(this.getAttribute('data-uid'), this.getAttribute('data-role'));
      });
    });

  } catch(e) {
    console.error('loadUsersPage error:', e);
    el.innerHTML = '<div class="alert alert-red"><span>❌</span><span>' + e.message + '</span></div>';
  }
};

window.applyRoleChange = async function(uid, newRole) {
  if (!uid || !newRole) { console.error('applyRoleChange: missing args', uid, newRole); return; }
  const rInfo = ROLES[newRole];
  if (!rInfo) { console.error('applyRoleChange: unknown role', newRole); return; }

  console.log('Changing role:', uid, '->', newRole);

  // Disable buttons
  document.querySelectorAll('.usr-role-btn[data-uid="' + uid + '"]').forEach(function(b) {
    b.disabled = true;
    b.style.opacity = '0.4';
  });

  try {
    await firebase.firestore().collection('_users').doc(uid).update({
      role:      newRole,
      updatedAt: Date.now(),
      updatedBy: ADMIN_EMAIL,
    });
    console.log('Role updated successfully');

    // Update badge
    const badge = document.getElementById('rb-' + uid);
    if (badge) {
      badge.textContent        = rInfo.label;
      badge.style.color        = rInfo.color;
      badge.style.background   = rInfo.color + '20';
      badge.style.borderColor  = rInfo.color + '40';
    }

    // Update button styles
    document.querySelectorAll('.usr-role-btn[data-uid="' + uid + '"]').forEach(function(b) {
      const isActive           = b.getAttribute('data-role') === newRole;
      const bRole              = ROLES[b.getAttribute('data-role')];
      b.disabled               = false;
      b.style.opacity          = '1';
      b.style.background       = isActive ? rInfo.color : '#f1f5f9';
      b.style.color            = isActive ? '#fff' : '#374151';
      b.style.border           = isActive ? '2px solid ' + rInfo.color : '2px solid #e2e8f0';
    });

    toast('✅ تم تغيير الدور إلى ' + rInfo.label);

  } catch(e) {
    console.error('applyRoleChange error:', e);
    toast('❌ خطأ: ' + e.message, 'error');
    document.querySelectorAll('.usr-role-btn[data-uid="' + uid + '"]').forEach(function(b) {
      b.disabled = false;
      b.style.opacity = '1';
    });
  }
};
