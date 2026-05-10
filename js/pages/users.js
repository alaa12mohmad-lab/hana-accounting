// ════════════════════════════════════════════════════════════════
// USERS — إدارة المستخدمين والصلاحيات
// ════════════════════════════════════════════════════════════════

function renderUsers() {
  if (!isAdmin()) {
    return '<div class="card"><div class="alert alert-red"><span>🔒</span><span>للمدير فقط</span></div></div>';
  }
  setTimeout(() => loadUsersPage(), 100);
  return `
    <div>
      <div class="page-header">
        <div>
          <div class="section-title" style="margin:0">👥 إدارة المستخدمين والصلاحيات</div>
          <p class="text-xs text-gray mt4">اضغط على الدور لتغييره مباشرة</p>
        </div>
        <button class="btn btn-primary" onclick="loadUsersPage()">🔄 تحديث</button>
      </div>
      <div class="grid3 mb12" style="gap:8px">
        <div class="card-sm" style="border-right:4px solid #7c3aed">
          <div style="font-size:16px;margin-bottom:3px">👑 مدير</div>
          <div class="text-xs text-gray">كل الصلاحيات + إدارة النظام</div>
        </div>
        <div class="card-sm" style="border-right:4px solid #1d4ed8">
          <div style="font-size:16px;margin-bottom:3px">✏️ محاسب</div>
          <div class="text-xs text-gray">إدخال + تعديل + حذف البيانات</div>
        </div>
        <div class="card-sm" style="border-right:4px solid #0f766e">
          <div style="font-size:16px;margin-bottom:3px">👁️ مراجع</div>
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

async function loadUsersPage() {
  const el = document.getElementById('users-container');
  if (!el) return;

  try {
    const snap = await firebase.firestore()
      .collection('_users')
      .orderBy('createdAt', 'desc')
      .get();

    const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

    if (users.length === 0) {
      el.innerHTML = `
        <div style="text-align:center;padding:40px;color:#94a3b8">
          <div style="font-size:40px;margin-bottom:10px">👥</div>
          <p style="font-weight:600">لا يوجد مستخدمون بعد</p>
          <p class="text-xs mt4">اذهب إلى 📧 إدارة الدعوات لإضافة مستخدم</p>
        </div>`;
      return;
    }

    // Build table
    const tbody = users.map(u => {
      const role   = u.role || 'reviewer';
      const rInfo  = ROLES[role] || ROLES.reviewer;
      const isAdmU = u.email?.toLowerCase() === ADMIN_EMAIL;
      return `<tr>
        <td>
          <div style="font-weight:600;font-size:12px">${u.email || u.uid}</div>
          ${isAdmU ? '<div class="text-xs" style="color:#7c3aed;font-weight:700">مدير النظام</div>' : ''}
        </td>
        <td>
          <span id="rb-${u.uid}" style="background:${rInfo.color}20;color:${rInfo.color};border:1px solid ${rInfo.color}40;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">
            ${rInfo.label}
          </span>
        </td>
        <td class="text-xs text-gray">${u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
        <td>
          ${isAdmU
            ? '<span class="text-xs text-gray">ثابت</span>'
            : `<div class="flex" style="gap:5px" id="rbg-${u.uid}">
                ${Object.entries(ROLES).map(([k, v]) => `
                  <button
                    class="role-btn"
                    data-uid="${u.uid}"
                    data-role="${k}"
                    style="
                      background:${role===k ? v.color : '#f1f5f9'};
                      color:${role===k ? '#fff' : '#374151'};
                      border:none;border-radius:8px;padding:5px 12px;
                      font-size:11px;font-weight:600;cursor:pointer;
                      font-family:inherit;
                    "
                  >${v.label}</button>`).join('')}
               </div>`
          }
        </td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>البريد الإلكتروني</th>
              <th>الدور الحالي</th>
              <th>تاريخ التسجيل</th>
              <th>تغيير الدور</th>
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>`;

    // ── Attach click handlers via event delegation ──────────────
    el.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const uid     = this.dataset.uid;
        const newRole = this.dataset.role;
        await applyRoleChange(uid, newRole);
      });
    });

  } catch (e) {
    el.innerHTML = `<div class="alert alert-red"><span>❌</span><span>${e.message}</span></div>`;
  }
}

// ── Apply role change ─────────────────────────────────────────────
async function applyRoleChange(uid, newRole) {
  const rInfo = ROLES[newRole];
  if (!rInfo) return;

  // Disable all buttons in that user's group
  const group = document.getElementById('rbg-' + uid);
  if (group) group.querySelectorAll('.role-btn').forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.5';
  });

  try {
    await firebase.firestore().collection('_users').doc(uid).update({
      role:      newRole,
      updatedAt: Date.now(),
      updatedBy: ADMIN_EMAIL,
    });

    // Update badge color + label
    const badge = document.getElementById('rb-' + uid);
    if (badge) {
      badge.textContent   = rInfo.label;
      badge.style.color   = rInfo.color;
      badge.style.background  = rInfo.color + '20';
      badge.style.borderColor = rInfo.color + '40';
    }

    // Update button styles
    if (group) {
      group.querySelectorAll('.role-btn').forEach(b => {
        const isActive = b.dataset.role === newRole;
        b.disabled        = false;
        b.style.opacity   = '1';
        b.style.background = isActive ? rInfo.color : '#f1f5f9';
        b.style.color      = isActive ? '#fff' : '#374151';
      });
    }

    toast('✅ تم تغيير الدور إلى ' + rInfo.label);

  } catch (e) {
    toast('❌ خطأ: ' + e.message, 'error');
    if (group) group.querySelectorAll('.role-btn').forEach(b => {
      b.disabled      = false;
      b.style.opacity = '1';
    });
  }
}
