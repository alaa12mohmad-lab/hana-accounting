// ════════════════════════════════════════════════════════════════
// APP — Bootstrap
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function(){
  // Register all pages (PAGES object defined in router.js)
  Object.assign(PAGES, {
    dashboard:     renderDashboard,
    sarkis:        renderSarkis,
    journal:       renderJournal,
    cheques:       renderCheques,
    'cust-stmt':   renderCustStmt,
    'supp-stmt':   renderSuppStmt,
    'stmt-history':renderStmtHistory,
    'running-bal': renderRunningBal,
    notes:         renderNotes,
    reports:       renderReports,
    'income-stmt': renderIncomeStmt,
    accounts:      renderAccounts,
    expenses:      renderExpenses,
    customers:     renderCustomers,
    suppliers:     renderSuppliers,
    materials:     renderMaterials,
    trucks:        renderTrucks,
    partners:      renderPartners,
    company:       renderCompany,
    users:         renderUsers,
    invitations:   renderInvitations,
  });

  // Date in topbar
  const dateEl=document.getElementById('tb-date');
  if(dateEl) dateEl.textContent=new Date().toLocaleDateString('ar-EG',{
    weekday:'long',year:'numeric',month:'long',day:'numeric'
  });

  // Mobile sidebar
  initMobileSidebar();

  // Start Firebase auth
  initAuthFlow();
});
