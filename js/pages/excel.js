// ═══ EXCEL IMPORT / EXPORT ═══
// ── Export to Excel (full backup) ──────────────────────
function exportToExcel(){
  if(typeof XLSX==='undefined'){ toast('خطأ في مكتبة Excel','error'); return; }
  const wb = XLSX.utils.book_new();

  // Sheet 1: Sarkis summary
  const sarkisRows = DB.getAll('sarkis').map(sk=>({
    'رقم السركي': sk.id,
    'التاريخ': sk.date,
    'العميل': sk.client,
    'المورد': sk.supplier,
    'الخامة': sk.material,
    'نوع الأعمال': sk.workType||'',
    'إجمالي النقلات': sk.totalTrips||0,
    'م³ صافي': Number((sk.totalNet||0).toFixed(2)),
    'إجمالي البيع': Number((sk.totalSell||0).toFixed(2)),
    'إجمالي التكلفة': Number((sk.totalBuy||0).toFixed(2)),
    'صافي الربح': Number((sk.totalProfit||0).toFixed(2)),
    'الحالة': sk.status,
    'ملاحظات': sk.notes||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sarkisRows), 'الحوافظ');

  // Sheet 2: Sarkis lines detail
  const linesRows = [];
  DB.getAll('sarkis').forEach(sk=>{
    (sk.lines||[]).forEach(l=>{
      linesRows.push({
        'رقم السركي': sk.id,
        'التاريخ': sk.date,
        'العميل': sk.client,
        'المورد': sk.supplier,
        'الخامة': sk.material,
        'اسم السائق': l.driverName||'',
        'رقم اللوحة': l.plateNo||'',
        'عدد النقلات': Number(l.trips)||0,
        'م³/نقلة': Number(l.cubicPerTrip)||0,
        'خصم م': Number(l.discountM)||0,
        'صافي م³': Number((l.netCubic||0).toFixed(2)),
        'سعر البيع': Number(l.sellPrice)||0,
        'سعر الشراء': Number(l.buyPrice)||0,
        'إجمالي البيع': Number((l.sellTotal||0).toFixed(2)),
        'إجمالي الشراء': Number((l.buyTotal||0).toFixed(2)),
        'الربح': Number((l.profit||0).toFixed(2)),
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linesRows), 'تفاصيل النقلات');

  // Sheet 3: Journal
  const jrnRows = DB.getAll('journal').map(j=>({
    'التاريخ': j.date,
    'نوع القيد': j.entryType,
    'الجهة': j.party||'',
    'المبلغ': Number(j.amount||j.debitAmount)||0,
    'طريقة الدفع': j.paymentType||'',
    'رقم الشيك': j.chequeNo||'',
    'حساب مدين': j.debitCode ? j.debitCode+' '+j.debitName : '',
    'حساب دائن': j.creditCode ? j.creditCode+' '+j.creditName : '',
    'المرجع': j.reference||'',
    'البيان': j.description||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jrnRows), 'دفتر اليومية');

  // Sheet 4: Expenses
  const expRows = DB.getAll('expenses').map(e=>({
    'التاريخ': e.date,
    'الفئة': e.category,
    'المبلغ': Number(e.amount)||0,
    'السيارة': e.truckPlate||'',
    'الكمية': e.qty||'',
    'رقم الإيصال': e.receiptNo||'',
    'البيان': e.description||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'المصروفات');

  // Sheet 5: Customers
  const custRows = DB.getAll('customers').map(c=>({
    'اسم العميل': c.name,
    'الرصيد الافتتاحي': Number(c.openingBalance)||0,
    'الرصيد الحالي': Number(getCustomerBalance(c.name).toFixed(2)),
    'الهاتف': c.phone||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custRows), 'العملاء');

  // Sheet 6: Suppliers
  const suppRows = DB.getAll('suppliers').map(s=>({
    'اسم المورد': s.name,
    'الرصيد الافتتاحي': Number(s.openingBalance)||0,
    'الرصيد الحالي': Number(getSupplierBalance(s.name).toFixed(2)),
    'الهاتف': s.phone||'',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suppRows), 'الموردون');

  const date = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `hana-backup-${date}.xlsx`);
  updateExportTimestamp();
  const bar = document.getElementById('backup-bar');
  if(bar) bar.remove();
  toast('✅ تم تصدير ملف Excel');
}

// ═══════════════════════════════════════════════════════
// EXCEL IMPORT FOR SARKIS — رفع قالب Excel للحوافظ
// ═══════════════════════════════════════════════════════

// Download blank template
function downloadSarkiTemplate(){
  if(typeof XLSX==='undefined'){ toast('خطأ في مكتبة Excel','error'); return; }
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Instructions ─────────────────────────────────────
  const instructions = [
    ['العمود','الشرح','مثال','ملاحظة'],
    ['رقم الحافظة (للتجميع)','صفوف بنفس الرقم تُجمَّع في حافظة واحدة','1','إلزامي'],
    ['التاريخ (YYYY-MM-DD)','تاريخ الحافظة بالصيغة الدولية','2026-05-21','إلزامي'],
    ['اسم العميل','يجب أن يتطابق مع اسم العميل في النظام','الشيخ','إلزامي'],
    ['اسم المورد','يجب أن يتطابق مع اسم المورد في النظام','أبو عمار','إلزامي'],
    ['الخامة','يجب أن تتطابق مع اسم الخامة في النظام','نقل مخلفات','إلزامي'],
    ['نوع الأعمال','توريد / نقل / غيره','توريد','اختياري'],
    ['لودر التحميل','اسم لودر التحميل','','اختياري'],
    ['اسم السائق','اسم سائق هذا السطر','محمد أحمد','اختياري'],
    ['رقم اللوحة','رقم لوحة السيارة','أ ب ج ١٢٣','اختياري'],
    ['عدد النقلات','عدد الرحلات لهذه السيارة','5','إلزامي'],
    ['م³ عميل للنقلة','التكعيب المباع للعميل للرحلة الواحدة','8','إلزامي'],
    ['م³ مورد للنقلة','التكعيب المشتراه من المورد للرحلة الواحدة','7.5','إلزامي - يمكن أن يختلف عن تكعيب العميل'],
    ['خصم م³ عميل','أمتار تُخصم من إجمالي العميل','0','اختياري - 0 إذا لا يوجد خصم'],
    ['خصم م³ مورد','أمتار تُخصم من إجمالي المورد','0','اختياري - 0 إذا لا يوجد خصم'],
    ['سعر البيع / م³','سعر بيع المتر للعميل','100','إلزامي'],
    ['سعر الشراء / م³','سعر شراء المتر من المورد','90','إلزامي'],
    ['ملاحظات','ملاحظات اختيارية','','اختياري'],
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst['!cols'] = [{wch:22},{wch:50},{wch:15},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsInst, 'تعليمات');

  // ── Sheet 2: Data template ─────────────────────────────────────
  const headers = [
    'رقم الحافظة (للتجميع)',
    'التاريخ (YYYY-MM-DD)',
    'اسم العميل',
    'اسم المورد',
    'الخامة',
    'نوع الأعمال',
    'لودر التحميل',
    'اسم السائق',
    'رقم اللوحة',
    'عدد النقلات',
    'م³ عميل للنقلة',
    'م³ مورد للنقلة',
    'خصم م³ عميل',
    'خصم م³ مورد',
    'سعر البيع / م³',
    'سعر الشراء / م³',
    'ملاحظات',
  ];

  const customers = DB.getAll('customers');
  const suppliers  = DB.getAll('suppliers');
  const materials  = DB.getAll('materials');

  const c1 = customers[0]?.name || 'اسم العميل';
  const s1 = suppliers[0]?.name || 'اسم المورد';
  const m1 = materials[0]?.name || 'الخامة';

  // Sample data rows
  const sampleRows = [
    [1,'2026-05-21',c1,s1,m1,'توريد','','محمد أحمد','أ ب ج ١٢٣', 5, 8, 8, 0, 0, 100, 90, ''],
    [1,'2026-05-21',c1,s1,m1,'توريد','','محمد علي', 'د ه و ٤٥٦', 4, 8, 8, 0, 0, 100, 90, ''],
    [1,'2026-05-21',c1,s1,m1,'توريد','','خالد سعيد','ز ح ط ٧٨٩', 6, 8, 7.5, 2, 0, 100, 90, 'خصم ٢ م³ للعميل فقط'],
    [2,'2026-05-21',c1,s1,m1,'توريد','','عمر حسن', 'ي ك ل ٣٢١', 3, 9, 9, 0, 1, 100, 90, 'خصم ١ م³ للمورد فقط'],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Column widths
  wsData['!cols'] = [
    {wch:22}, // رقم الحافظة
    {wch:18}, // التاريخ
    {wch:16}, // العميل
    {wch:16}, // المورد
    {wch:14}, // الخامة
    {wch:12}, // نوع الأعمال
    {wch:12}, // لودر
    {wch:14}, // السائق
    {wch:12}, // اللوحة
    {wch:10}, // نقلات
    {wch:14}, // م³ عميل
    {wch:14}, // م³ مورد
    {wch:13}, // خصم عميل
    {wch:13}, // خصم مورد
    {wch:14}, // سعر بيع
    {wch:14}, // سعر شراء
    {wch:16}, // ملاحظات
  ];

  // Freeze header row
  wsData['!freeze'] = {xSplit:0, ySplit:1, topLeftCell:'A2'};

  XLSX.utils.book_append_sheet(wb, wsData, 'بيانات الحوافظ');
  XLSX.writeFile(wb, 'قالب-الحوافظ.xlsx');
  toast('✅ تم تنزيل القالب المحدث (م³ عميل + م³ مورد + خصم منفصل)');
}


function importSarkisFromExcel(){
  if(!_xlsxPreview.length) return toast('لا توجد بيانات للاستيراد','error');

  // Group rows by 'رقم الحافظة (للتجميع)'
  const groups = {};
  _xlsxPreview.forEach(r=>{
    const gKey = String(r['رقم الحافظة (للتجميع)'] || r['رقم الحافظة'] || r['حافظة'] || '1');
    if(!groups[gKey]) groups[gKey]=[];
    groups[gKey].push(r);
  });

  let importedCount = 0;
  let errorCount    = 0;

  Object.entries(groups).forEach(([gKey, rows])=>{
    try{
      const first = rows[0];
      // Extract header values (from first row of group)
      const client   = String(first['اسم العميل']   || first['العميل']   || '').trim();
      const supplier = String(first['اسم المورد']   || first['المورد']   || '').trim();
      const material = String(first['الخامة']        || '').trim();
      const date     = String(first['التاريخ (YYYY-MM-DD)'] || first['التاريخ'] || todayStr()).trim();
      const workType = String(first['نوع الأعمال'] || '').trim();
      const loader   = String(first['لودر التحميل'] || '').trim();

      if(!client || !supplier) { errorCount++; return; }

      // Build lines
      const lines = rows.map(r=>{
        const trips        = Number(r['عدد النقلات']    || r['نقلات'] || 0);
        // يقرأ تكعيب العميل والمورد منفصلين - أو م³ للنقلة القديم للتوافق
        const _cubicOld    = Number(r['م³ للنقلة'] || r['م3/نقلة'] || r['م³/نقلة'] || 0);
        const cubicSellIn  = Number(r['م³ عميل للنقلة'] || r['تكعيب العميل'] || 0) || _cubicOld;
        const cubicBuyIn   = Number(r['م³ مورد للنقلة'] || r['تكعيب المورد'] || 0) || _cubicOld;
        const cubicPerTrip = cubicSellIn; // للتوافق مع الكود القديم
        const discountM    = Number(r['خصم م'] || 0);
        const discountSell = Number(r['خصم م³ عميل'] ?? r['خصم م³ العميل'] ?? r['خصم م'] ?? 0);
        const discountBuy  = Number(r['خصم م³ مورد'] ?? r['خصم م³ المورد'] ?? r['خصم م'] ?? 0);
        const sellPrice    = Number(r['سعر البيع / م³']  || r['سعر البيع'] || r['سعر بيع'] || 0);
        const buyPrice     = Number(r['سعر الشراء / م³'] || r['سعر الشراء'] || r['سعر شراء'] || 0);
        const gross = trips * cubicSellIn; // إجمالي العميل
        const net   = Math.max(0, gross - discountSell);
        const netS = Math.max(0, trips*cubicSellIn - discountSell);
        const netB = Math.max(0, trips*cubicBuyIn  - discountBuy);
        return {
          driverName:   String(r['اسم السائق']  || '').trim(),
          plateNo:      String(r['رقم اللوحة']  || '').trim(),
          trips, cubicPerTrip,
          cubicSell:    cubicSellIn,
          cubicBuy:     cubicBuyIn,
          discountM,
          discountSell, discountBuy,
          grossCubic:   gross,
          grossSell:    gross,
          grossBuy:     gross,
          netCubic:     netS,
          netSell:      netS,
          netBuy:       netB,
          sellPrice, buyPrice,
          sellTotal:    netS * sellPrice,
          buyTotal:     netB * buyPrice,
          profit:       netS * sellPrice - netB * buyPrice,
          notes:        String(r['ملاحظات'] || '').trim(),
        };
      });

      const totals = lines.reduce((a,l)=>({
        totalTrips:  a.totalTrips  + l.trips,
        totalGross:  a.totalGross  + l.grossCubic,
        totalNet:    a.totalNet    + l.netCubic,
        totalSell:   a.totalSell   + l.sellTotal,
        totalBuy:    a.totalBuy    + l.buyTotal,
        totalProfit: a.totalProfit + l.profit,
      }),{totalTrips:0,totalGross:0,totalNet:0,totalSell:0,totalBuy:0,totalProfit:0});

      DB.insert('sarkis',{
        date, client, supplier, material, workType,
        loaderName: loader,
        lines, ...totals,
        status: 'مفتوح',
        importedFrom: 'excel',
        notes: `مستورد من Excel — مجموعة ${gKey}`,
      });
      importedCount++;
    }catch(e){
      errorCount++;
    }
  });

  closeModal();
  _xlsxPreview = [];
  if(importedCount>0){
    toast(`✅ تم استيراد ${importedCount} حافظة بنجاح${errorCount?` (${errorCount} بها خطأ)`:''}`);
  } else {
    toast(`❌ لم يتم استيراد أي حافظة — تحقق من البيانات`,'error');
  }
  nav('sarkis');
}

// ─── Excel import button injected into Sarkis toolbar ──
// Sarkis page already has btn added inline — no override needed
// Button added directly in renderSarkis function above


// ── Sync journal entries with cheques page ──────────────────────────────────
function syncJournalChequeLinks(){
  const jrnEntries = DB.getAll('journal').filter(j=>
    ['شيك آجل','شيك فوري'].includes(j.paymentType) && j.chequeNo
  );
  jrnEntries.forEach(j=>{
    if(j._linkedChequeId){
      // Verify linked cheque still exists
      const chq = DB.getById('cheques', j._linkedChequeId);
      if(!chq){
        // Re-create it
        const isCol = j.entryType==='تحصيل';
        const c = DB.insert('cheques',{
          type: isCol?'in':'out',
          customer: isCol?j.party:'',
          supplier: isCol?'':j.party,
          amount: Number(j.amount)||0,
          chequeNo: j.chequeNo,
          issueDate: j.date,
          dueDate: j.chequeDue||'',
          bank: j.bank||'',
          status: 'معلق',
          relatedRef: j.reference||'',
          _fromJournal: true,
        });
        DB.update('journal', j.id, {_linkedChequeId: c.id});
      }
    } else {
      // Journal entry has cheque info but no linked cheque — create it
      const existingChq = DB.getAll('cheques').find(c=>
        c.chequeNo===j.chequeNo && c._fromJournal &&
        Math.abs((Number(c.amount)||0)-(Number(j.amount)||0)) < 0.01
      );
      if(!existingChq){
        const isCol = j.entryType==='تحصيل';
        const c = DB.insert('cheques',{
          type: isCol?'in':'out',
          customer: isCol?j.party:'',
          supplier: isCol?'':j.party,
          amount: Number(j.amount)||0,
          chequeNo: j.chequeNo,
          issueDate: j.date||'',
          dueDate: j.chequeDue||'',
          bank: j.bank||'',
          status: 'معلق',
          relatedRef: j.reference||'',
          _fromJournal: true,
        });
        DB.update('journal', j.id, {_linkedChequeId: c.id});
      } else {
        // Link exists but ID wasn't stored
        DB.update('journal', j.id, {_linkedChequeId: existingChq.id});
      }
    }
  });
}



// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 1 — STATEMENTS DEVELOPMENT
//  1. Statement History
//  2. Running Balance Account Statement
//  3. Debit / Credit Notes
// ═══════════════════════════════════════════════════════════════════════════

// ── Helpers shared across Phase 1 ──────────────────────────────────────────
function getEntityOpeningBalance(name, col) {
  const entity = DB.getAll(col).find(e => e.name === name);
  return Number(entity?.openingBalance) || 0;
}

// Get all transactions for an entity in chronological order
// Returns array of: {date, type, description, debit, credit, ref, source}
function getEntityTransactions(entityName, entityType, fromDate, toDate) {
  const fd = fromDate ? new Date(fromDate) : new Date('2000-01-01');
  const td = toDate   ? new Date(toDate)   : new Date('2099-12-31');
  const txns = [];

  if (entityType === 'customer') {
    // Sales from Sarkis
    DB.getAll('sarkis')
      .filter(sk => sk.client === entityName && sk.status !== 'ملغي')
      .filter(sk => { const d = new Date(sk.date); return d >= fd && d <= td; })
      .forEach(sk => txns.push({
        date: sk.date,
        type: 'سركي',
        description: `سركي #${sk.id} — ${sk.material}${sk.workType?' ('+sk.workType+')':''}`,
        debit:  Number(sk.totalSell) || 0,   // increases what customer owes
        credit: 0,
        ref: `#${sk.id}`,
        source: 'sarkis',
        sourceId: sk.id,
        badgeColor: 'blue',
      }));
    // Collections from Journal
    DB.getAll('journal')
      .filter(j => j.entryType === 'تحصيل' && j.party === entityName)
      .filter(j => { const d = new Date(j.date); return d >= fd && d <= td; })
      .forEach(j => txns.push({
        date: j.date,
        type: 'تحصيل',
        description: `${j.paymentType||'تحصيل'}${j.chequeNo?' — شيك '+j.chequeNo:''}${j.description?' — '+j.description:''}`,
        debit:  0,
        credit: Number(j.amount) || 0,       // decreases what customer owes
        ref: j.reference || '',
        source: 'journal',
        sourceId: j.id,
        badgeColor: 'green',
      }));
    // Debit / Credit Notes
    DB.getAll('notes')
      .filter(n => n.entity === entityName && n.entityType === 'customer')
      .filter(n => { const d = new Date(n.date); return d >= fd && d <= td; })
      .forEach(n => txns.push({
        date: n.date,
        type: n.noteType === 'debit' ? 'إشعار مديونية' : 'إشعار دائنية',
        description: `${n.number} — ${n.reason}`,
        debit:  n.noteType === 'debit'  ? Number(n.amount) : 0,
        credit: n.noteType === 'credit' ? Number(n.amount) : 0,
        ref: n.number,
        source: 'notes',
        sourceId: n.id,
        badgeColor: n.noteType === 'debit' ? 'orange' : 'purple',
      }));
  } else {
    // Purchases from Sarkis
    DB.getAll('sarkis')
      .filter(sk => sk.supplier === entityName && sk.status !== 'ملغي')
      .filter(sk => { const d = new Date(sk.date); return d >= fd && d <= td; })
      .forEach(sk => txns.push({
        date: sk.date,
        type: 'سركي',
        description: `سركي #${sk.id} — ${sk.material}${sk.workType?' ('+sk.workType+')':''}`,
        debit:  Number(sk.totalBuy) || 0,
        credit: 0,
        ref: `#${sk.id}`,
        source: 'sarkis',
        sourceId: sk.id,
        badgeColor: 'blue',
      }));
    // Payments from Journal
    DB.getAll('journal')
      .filter(j => j.entryType === 'دفع' && j.party === entityName)
      .filter(j => { const d = new Date(j.date); return d >= fd && d <= td; })
      .forEach(j => txns.push({
        date: j.date,
        type: 'دفع',
        description: `${j.paymentType||'دفع'}${j.chequeNo?' — شيك '+j.chequeNo:''}${j.description?' — '+j.description:''}`,
        debit:  0,
        credit: Number(j.amount) || 0,
        ref: j.reference || '',
        source: 'journal',
        sourceId: j.id,
        badgeColor: 'red',
      }));
    // Notes
    DB.getAll('notes')
      .filter(n => n.entity === entityName && n.entityType === 'supplier')
      .filter(n => { const d = new Date(n.date); return d >= fd && d <= td; })
      .forEach(n => txns.push({
        date: n.date,
        type: n.noteType === 'debit' ? 'إشعار مديونية' : 'إشعار دائنية',
        description: `${n.number} — ${n.reason}`,
        debit:  n.noteType === 'debit'  ? Number(n.amount) : 0,
        credit: n.noteType === 'credit' ? Number(n.amount) : 0,
        ref: n.number,
        source: 'notes',
        sourceId: n.id,
        badgeColor: n.noteType === 'debit' ? 'orange' : 'purple',
      }));
  }

  // Sort by date ascending
  return txns.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Get opening balance for a period (from last approved statement or entity opening)
function getPeriodOpeningBalance(entityName, entityType, fromDate) {
  const col = entityType === 'customer' ? 'customers' : 'suppliers';
  // Find last approved statement BEFORE fromDate
  const lastStmt = DB.getAll('statements')
    .filter(s => s.entityName === entityName && s.type === entityType && s.status === 'معتمد')
    .filter(s => s.toDate < fromDate)
    .sort((a, b) => b.toDate.localeCompare(a.toDate))[0];

  if (lastStmt) return { balance: Number(lastStmt.closingBalance) || 0, label: `رصيد مستخلص رقم ${lastStmt.id}` };
  return { balance: getEntityOpeningBalance(entityName, col), label: 'الرصيد الافتتاحي' };
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. STATEMENT HISTORY — سجل المستخلصات
// ═══════════════════════════════════════════════════════════════════════════
let _SH = { type: 'all', entity: '', from: '', to: '' };
