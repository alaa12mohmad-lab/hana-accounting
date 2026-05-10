// ═══ APP INIT ═══
// ── DB Factory ────────────────────────────────────
const DB = (typeof buildDB === 'function') ? buildDB() : createLocalRepo();

// ── Router pages ──────────────────────────────────
const PAGE_REGISTRY = {
  dashboard:   renderDashboard,
  sarkis:      renderSarkis,
  journal:     renderJournal,
  cheques:     renderCheques,
  'cust-stmt': renderCustStmt,
  'supp-stmt': renderSuppStmt,
  'stmt-history': renderStmtHistory,
  'running-bal':  renderRunningBal,
  notes:          renderNotes,
  reports:     renderReports,
  accounts:    renderAccounts,
  customers:   renderCustomers,
  suppliers:   renderSuppliers,
  materials:   renderMaterials,
  trucks:      renderTrucks,
  partners:    renderPartners,
  'income-stmt': renderIncomeStmt,
  expenses:    renderExpenses,
  company:     renderCompany,
  invitations: renderInvitations,
};

// ── Bootstrap ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // Register pages in router
  Object.assign(PAGES, PAGE_REGISTRY);

  // Date in topbar
  const dateEl = document.getElementById('tb-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  // Shadow copy auto-save
  tryRecoverFromShadow();
  setInterval(writeShadowCopy, 120000);
  setTimeout(renderBackupBar, 1000);

  // Mobile sidebar
  initMobileSidebar();

  // Auth flow (Firebase or direct)
  initAuthFlow();
});
