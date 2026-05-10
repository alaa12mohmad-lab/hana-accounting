// ════════════════════════════════════════════════════════════════
// USERS — إدارة المستخدمين والصلاحيات
// ════════════════════════════════════════════════════════════════

function renderUsers() {
  if (!isAdmin()) {
    return '<div class="card"><div class="alert alert-red"><span>🔒</span><span>هذه الصفحة للمدير فقط</span></div></div>';
  }
  setTimeout(() => loadUsersPage(), 100);
  return `
    <div>
      <div class="page-header">
        <div>
          <div class="section-title" style="margin:0">👥 إدارة المستخدمين والصلاحيات</div>
          <p class="text-xs text-gray mt4">تحكّم في صلاحيات كل مستخدم</p>
        </div>
        <button class="btn btn-primary" onclick="loadUsersPage()">🔄 تحديث</button>
      </div>

      <!-- Role legend -->
      <div class="grid3 mb12" style="gap:8px">
        <div class="card-sm" style="border-right:4px solid #7c3aed;padding:10px 12px">
          <div style="font-size:18px;margin-bottom:4px">👑</div>
          <div style="font-weight:700;color:#7c3aed;font-size:12px">مدير</div>
          <div class="text-xs text-gray">كل الصلاحيات + إدارة المستخدمين والدعوات والإعدادات</div>
        </div>
        <div class="card-sm" style="border-right:4px solid #1d4ed8;padding:10px 12px">
          <div style="font-size:18px;margin-bottom:4px">✏️</div>
          <div style="font-weight:700;color:#1d4ed8;font-size:12px">محاسب</div>
          <div class="text-xs text-gray">إدخال + تعديل + حذف البيانات + طباعة التقارير</div>
        </div>
        <div class="card-sm" style="border-right:4px solid #0f766e;padding:10px 12px">
          <div style="font-size:18px;margin-bottom:4px">👁️</div>
          <div style="font-weight:700;color:#0f766e;font-size:12px">مراجع</div>
          <div class="text-xs text-gray">قراءة وطباعة فقط — لا يمكنه تعديل أي بيانات</div>
        </div>
      </div>

      <!-- Users table -->
      <div class="card" id="users-container">
        <div style="text-align:center;padding:30px;color:#94a3b8">
          <div style="font-size:32px;margin-bottom:8px">⏳</div>
          <p>جاري تحميل المستخدمين...</p>
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
          <div style="font-size:40px;margin-bottom:12px">👥</div>
          <p style="font-size:14px;font-weight:600;margin-bottom:6px">لا يوجد مستخدمون بعد</p>
          <p class="text-xs">عند تسجيل أي مستخدم سيظهر هنا تلقائياً</p>
          <p class="text-xs mt4">اذهب إلى <strong>📧 إدارة الدعوات</strong> لإضافة مستخدم جديد</p>
        </div>`;
      return;
    }

    let rows = '';
    users.forEach(u => {
      const role    = u.role || 'reviewer';
      const rInfo   = ROLES[role] || ROLES.reviewer;
      const isAdmUsr = u.email?.toLowerCase() === ADMIN_EMAIL;

      // Role buttons
      let roleBtns = '';
      if (isAdmUsr) {
        roleBtns = '<span class="text-xs text-gray">مدير النظام — ثابت</span>';
      } else {
        Object.entries(ROLES).forEach(([k, v]) => {
          const active = role === k;
          roleBtns += `<button
            onclick="setRole('${u.uid}', '${k}', this)"
            style="
              background:${active ? v.color : '#f1f5f9'};
              color:${active ? '#fff' : '#374151'};
              border:none;border-radius:8px;padding:5px 12px;
              font-size:11px;font-weight:600;cursor:pointer;
              font-family:inherit;transition:.15s;
              ${active ? 'box-shadow:0 2px 6px ' + v.color + '40' : ''}
            ">${v.label}</button>`;
        });
      }

      rows += `
        <tr id="user-row-${u.uid}">
          <td>
            <div style="font-weight:600;font-size:12px">${u.email || u.uid}</div>
            ${isAdmUsr ? '<div class="text-xs" style="color:#7c3aed;font-weight:600">مدير النظام</div>' : ''}
          </td>
          <td>
            <span id="role-badge-${u.uid}" style="
              background:${rInfo.color}20;color:${rInfo.color};
              border:1px solid ${rInfo.color}40;
              padding:3px 10px;border-radius:20px;
              font-size:11px;font-weight:700;white-space:nowrap
            ">${rInfo.label}</span>
          </td>
          <td class="text-xs text-gray">${u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
          <td>
            <div class="flex" style="gap:5px;flex-wrap:wrap" id="role-btns-${u.uid}">
              ${roleBtns}
            </div>
          </td>
        </tr>`;
    });

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
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  } catch (e) {
    el.innerHTML = `
      <div class="alert alert-red">
        <span>❌</span>
        <div>
          <strong>خطأ في تحميل المستخدمين</strong><br>
          <span class="text-xs">${e.message}</span>
        </div>
      </div>`;
  }
}

// ── Set Role ─────────────────────────────────────────────────────
async function setRole(uid, newRole, btn) {
  const rInfo = ROLES[newRole];
  if (!rInfo) return;

  // Visual feedback
  const container = document.getElementById('role-btns-' + uid);
  if (container) {
    const allBtns = container.querySelectorAll('button');
    allBtns.forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
  }

  try {
    await firebase.firestore().collection('_users').doc(uid).update({
      role:      newRole,
      updatedAt: Date.now(),
      updatedBy: ADMIN_EMAIL,
    });

    // Update badge
    const badge = document.getElementById('role-badge-' + uid);
    if (badge) {
      badge.textContent  = rInfo.label;
      badge.style.color  = rInfo.color;
      badge.style.background = rInfo.color + '20';
      badge.style.borderColor = rInfo.color + '40';
    }

    // Update buttons
    if (container) {
      const allBtns = container.querySelectorAll('button');
      allBtns.forEach(b => {
        b.disabled = false;
        b.style.opacity = '1';
        const btnRole = b.getAttribute('onclick').match(/'([^']+)'\s*,\s*this/)?.[1] ||
                        b.getAttribute('onclick').match(/"([^"]+)"\s*,\s*this/)?.[1];
        // Simpler: reload
      });
    }

    toast('✅ تم تغيير الدور إلى ' + rInfo.label);
    // Reload to reflect changes
    setTimeout(() => loadUsersPage(), 500);

  } catch (e) {
    toast('❌ خطأ: ' + e.message, 'error');
    if (container) {
      const allBtns = container.querySelectorAll('button');
      allBtns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    }
  }
}
