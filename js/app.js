// ════════════════════════════════════════════════════════════════
// APP — Bootstrap
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function(){
  // Register all pages (PAGES object defined in router.js)
  Object.assign(PAGES, {
    dashboard:     typeof renderDashboard==='function'?renderDashboard:function(){return '';},
    sarkis:        typeof renderSarkis==='function'?renderSarkis:function(){return '';},
    journal:       typeof renderJournal==='function'?renderJournal:function(){return '';},
    cheques:       typeof renderCheques==='function'?renderCheques:function(){return '';},
    'cust-stmt':   typeof renderCustStmt==='function'?renderCustStmt:function(){return '';},
    'supp-stmt':   typeof renderSuppStmt==='function'?renderSuppStmt:function(){return '';},
    'stmt-history':typeof renderStmtHistory==='function'?renderStmtHistory:function(){return '<div class="card"><p class="text-gray">الصفحة قيد التطوير</p></div>';},
    'running-bal': typeof renderRunningBal==='function'?renderRunningBal:function(){return '<div class="card"><p class="text-gray">الصفحة قيد التطوير</p></div>';},
    notes:         typeof renderNotes==='function'?renderNotes:function(){return '<div class="card"><p class="text-gray">الصفحة قيد التطوير</p></div>';},
    reports:       typeof renderReports==='function'?renderReports:function(){return '';},
    'income-stmt': typeof renderIncomeStmt==='function'?renderIncomeStmt:function(){return '';},
    accounts:      typeof renderAccounts==='function'?renderAccounts:function(){return '';},
    expenses:      typeof renderExpenses==='function'?renderExpenses:function(){return '';},
    customers:     typeof renderCustomers==='function'?renderCustomers:function(){return '';},
    suppliers:     typeof renderSuppliers==='function'?renderSuppliers:function(){return '';},
    materials:     typeof renderMaterials==='function'?renderMaterials:function(){return '';},
    trucks:        typeof renderTrucks==='function'?renderTrucks:function(){return '';},
    partners:      typeof renderPartners==='function'?renderPartners:function(){return '';},
    company:       typeof renderCompany==='function'?renderCompany:function(){return '';},
    users:         typeof renderUsers==='function'?renderUsers:function(){return '';},
    themes:        typeof renderThemes==='function' ? renderThemes : function(){return '<div class="card"><p>ارفع ملف themes.js</p></div>';},
    clientQty:     typeof renderClientQty==='function'?renderClientQty:function(){return '';},
    supplierQty:   typeof renderSupplierQty==='function'?renderSupplierQty:function(){return '';},
    backup:        typeof renderBackup==='function'?renderBackup:function(){return ''},
    invitations:   typeof renderInvitations==='function'?renderInvitations:function(){return '';},
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
