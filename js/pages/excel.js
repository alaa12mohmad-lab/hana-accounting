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

  // Template columns
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
    'م³ للنقلة',
    'خصم م',
    'سعر البيع / م³',
    'سعر الشراء / م³',
    'ملاحظات',
  ];

  // Sample rows
  const customers = DB.getAll('customers');
  const suppliers  = DB.getAll('suppliers');
  const materials  = DB.getAll('materials');
  const c0 = customers[0]?.name||'اسم العميل';
  const s0 = suppliers[0]?.name||'اسم المورد';
  const m0 = materials[0]?.name||'تربة زلطية';
  const sp0 = materials[0]?.defaultSellPrice||135;
  const bp0 = materials[0]?.defaultBuyPrice||100;
  const today = new Date().toISOString().slice(0,10);

  const sample = [
    [1, today, c0, s0, m0, 'توريد', '', 'أحمد محمد', 'أ ب ج 123', 5, 8, 0, sp0, bp0, ''],
    [1, today, c0, s0, m0, 'توريد', '', 'محمد علي',  'د ه و 456', 4, 8, 0, sp0, bp0, ''],
    [1, today, c0, s0, m0, 'توريد', '', 'خالد سعيد', 'ز ح ط 789', 6, 8, 2, sp0, bp0, 'خصم 2 م³'],
    [2, today, c0, s0, m0, 'توريد', '', 'عمر حسن',   'ي ك ل 321', 3, 9, 0, sp0, bp0, ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);

  // Style columns width
  ws['!cols'] = headers.map((h,i)=>({wch: i===0?18:i<7?20:14}));

  // Freeze header row
  ws['!freeze'] = {xSplit:0, ySplit:1};

  // Add notes sheet explaining columns
  const notesData = [
    ['العمود', 'الشرح', 'مثال'],
    ['رقم الحافظة (للتجميع)', 'صفوف بنفس الرقم تُجمَّع في حافظة واحدة', '1'],
    ['التاريخ', 'تاريخ الحافظة بصيغة YYYY-MM-DD', today],
    ['اسم العميل', 'يجب أن يتطابق مع اسم العميل في النظام', c0],
    ['اسم المورد', 'يجب أن يتطابق مع اسم المورد في النظام', s0],
    ['الخامة', 'يجب أن تتطابق مع اسم الخامة في النظام', m0],
    ['نوع الأعمال', 'توريد / نقل / غيره (اختياري)', 'توريد'],
    ['اسم السائق', 'اسم سائق هذا السطر', 'محمد أحمد'],
    ['رقم اللوحة', 'لوحة السيارة', 'أ ب ج 123'],
    ['عدد النقلات', 'عدد الرحلات لهذه السيارة', '5'],
    ['م³ للنقلة', 'السعة التكعيبية للرحلة الواحدة', '8'],
    ['خصم م', 'أمتار الخصم (يُطرح من الإجمالي)', '0'],
    ['سعر البيع / م³', 'سعر البيع للمتر المكعب الواحد', sp0],
    ['سعر الشراء / م³', 'سعر الشراء من المورد', bp0],
    ['ملاحظات', 'ملاحظات اختيارية', ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notesData), 'تعليمات');
  XLSX.utils.book_append_sheet(wb, ws, 'بيانات الحوافظ');

  XLSX.writeFile(wb, 'قالب-الحوافظ.xlsx');
  toast('✅ تم تنزيل القالب');
}

// Parse uploaded Excel and preview
let _xlsxPreview = [];

function openSarkiImportModal(){
  // XLSX is now embedded — always available
  if(typeof XLSX==='undefined'){ toast('خطأ: مكتبة Excel غير محملة','error'); return; }
  openModal('📥 استيراد حوافظ من Excel',`
    <div class="alert alert-blue mb12">
      <span>📋</span>
      <div>
        <strong>خطوات الاستيراد:</strong><br>
        <span class="text-xs">1. نزّل القالب ← 2. أدخل البيانات في Excel ← 3. ارفع الملف ← 4. راجع البيانات ← 5. استورد</span>
      </div>
    </div>

    <div class="flex-wrap mb12" style="gap:8px">
      <button class="btn btn-green" onclick="downloadSarkiTemplate()">⬇️ تنزيل القالب الفارغ</button>
      <span class="text-xs text-gray" style="align-self:center">أو ارفع ملف Excel محتوي على نفس الأعمدة</span>
    </div>

    <div class="excel-drop" id="excel-drop"
      ondragover="event.preventDefault();this.classList.add('drag')"
      ondragleave="this.classList.remove('drag')"
      ondrop="onExcelDrop(event)"
      onclick="document.getElementById('excel-file-inp').click()">
      <div class="excel-drop-icon">📊</div>
      <p class="font-bold text-brand" style="font-size:12px">اسحب ملف Excel هنا أو اضغط للاختيار</p>
      <p class="text-xs text-gray mt4">يدعم .xlsx و .xls</p>
    </div>
    <input type="file" id="excel-file-inp" accept=".xlsx,.xls" style="display:none" onchange="onExcelFileChange(this)">

    <div id="excel-preview-area"></div>`,
    `<button class="btn btn-gray" onclick="closeModal();_xlsxPreview=[]">إغلاق</button>
     <button class="btn btn-primary" id="import-xl-btn" onclick="importSarkisFromExcel()" disabled style="opacity:.4">📥 استيراد الحوافظ</button>`,
    'modal-xl');
}

function onExcelDrop(e){
  e.preventDefault();
  document.getElementById('excel-drop').classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if(file) parseExcelFile(file);
}
function onExcelFileChange(inp){
  const file = inp.files[0];
  if(file) parseExcelFile(file);
}


// ── Fix Excel date string (handles UTC offset issue) ─────────────
function fixExcelDate(val){
  if(!val) return '';
  var s = String(val).trim();
  // Already yyyy-mm-dd format
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Date object
  if(val instanceof Date){
    // Use local date (not UTC) to avoid timezone shift
    var y = val.getFullYear();
    var m = String(val.getMonth()+1).padStart(2,'0');
    var d = String(val.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  }
  // Excel serial number
  if(!isNaN(Number(s)) && Number(s) > 1000){
    var n = Number(s);
    // Excel date serial → JS date (local time, not UTC)
    var d2 = new Date(Math.round((n - 25569) * 86400 * 1000));
    // Add local timezone offset to correct UTC shift
    var localDate = new Date(d2.getTime() + d2.getTimezoneOffset() * 60000);
    var y2 = localDate.getFullYear();
    var m2 = String(localDate.getMonth()+1).padStart(2,'0');
    var d3 = String(localDate.getDate()).padStart(2,'0');
    return y2+'-'+m2+'-'+d3;
  }
  // Try to parse as date string
  try{
    var parsed = new Date(s);
    if(!isNaN(parsed)){
      var y3 = parsed.getFullYear();
      var m3 = String(parsed.getMonth()+1).padStart(2,'0');
      var d4 = String(parsed.getDate()).padStart(2,'0');
      return y3+'-'+m3+'-'+d4;
    }
  }catch(e){}
  return s;
}

function parseExcelFile(file){
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      // raw:false + dateNF = XLSX converts dates to strings in local format
      const wb  = XLSX.read(e.target.result, {type:'binary', raw:false, dateNF:'yyyy-mm-dd'});
      // Find sheet named 'بيانات الحوافظ' or use first sheet
      const sheetName = wb.SheetNames.find(n=>n.includes('حوافظ')||n.includes('بيانات')) || wb.SheetNames[0];
      const ws  = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, {raw:false, dateNF:'yyyy-mm-dd', defval:''});

      if(!rows.length) return toast('الملف فارغ أو لا يحتوي على بيانات','error');

      // Normalize column names (trim spaces)
      const normalized = rows.map(r=>{
        const obj={};
        Object.entries(r).forEach(([k,v])=>{ obj[k.trim()]=v; });
        return obj;
      });

      _xlsxPreview = normalized;
      renderExcelPreview(normalized);
      const btn = document.getElementById('import-xl-btn');
      if(btn){ btn.disabled=false; btn.style.opacity='1'; }
      toast(`تم قراءة ${rows.length} سطر من الملف`,'info');
    }catch(err){
      toast('خطأ في قراءة الملف: '+err.message,'error');
    }
  };
  reader.readAsBinaryString(file);
}

function renderExcelPreview(rows){
  const area = document.getElementById('excel-preview-area');
  if(!area) return;

  // Group by رقم الحافظة
  const groups = {};
  rows.forEach(r=>{
    const gKey = r['رقم الحافظة (للتجميع)'] || r['رقم الحافظة'] || '1';
    if(!groups[gKey]) groups[gKey]=[];
    groups[gKey].push(r);
  });
  const groupCount = Object.keys(groups).length;

  // Validate: check required fields
  const missing = [];
  rows.forEach((r,i)=>{
    if(!r['اسم العميل']&&!r['العميل']) missing.push(`سطر ${i+2}: اسم العميل فارغ`);
    if(!r['اسم المورد']&&!r['المورد']) missing.push(`سطر ${i+2}: اسم المورد فارغ`);
  });

  // Preview table
  const cols = Object.keys(rows[0]);
  area.innerHTML = `
    <div class="alert ${missing.length?'alert-yellow':'alert-green'} mt10 mb8">
      <span>${missing.length?'⚠️':'✅'}</span>
      <div>
        <strong>${rows.length} سطر → ${groupCount} حافظة</strong>
        ${missing.length?`<br><span class="text-xs">${missing.slice(0,3).join(' | ')}${missing.length>3?'...':''}</span>`:'<br><span class="text-xs">البيانات تبدو صحيحة</span>'}
      </div>
    </div>
    <div class="preview-tbl-wrap">
      <table>
        <thead><tr>${cols.map(c=>`<th style="padding:5px 6px;white-space:nowrap;font-size:10px">${c}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.slice(0,20).map((r,i)=>`<tr ${i%2?'style="background:#f8fafc"':''}>
            ${cols.map(c=>`<td style="padding:4px 6px;font-size:10px;white-space:nowrap">${r[c]??''}</td>`).join('')}
          </tr>`).join('')}
          ${rows.length>20?`<tr><td colspan="${cols.length}" style="text-align:center;padding:6px;color:#94a3b8;font-size:10px">... و${rows.length-20} سطر آخر</td></tr>`:''}
        </tbody>
      </table>
    </div>`;
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
        const cubicPerTrip = Number(r['م³ للنقلة']      || r['م3/نقلة'] || r['م³/نقلة'] || 0);
        const discountM    = Number(r['خصم م'] || 0);
        const discountSell = Number(r['خصم م³ العميل'] ?? r['خصم م'] ?? 0);
        const discountBuy  = Number(r['خصم م³ المورد'] ?? r['خصم م'] ?? 0);
        const sellPrice    = Number(r['سعر البيع / م³']  || r['سعر البيع'] || r['سعر بيع'] || 0);
        const buyPrice     = Number(r['سعر الشراء / م³'] || r['سعر الشراء'] || r['سعر شراء'] || 0);
        const gross = trips * cubicPerTrip;
        const net   = Math.max(0, gross - discountM);
        const netS = Math.max(0, gross - discountSell);
        const netB = Math.max(0, gross - discountBuy);
        return {
          driverName:   String(r['اسم السائق']  || '').trim(),
          plateNo:      String(r['رقم اللوحة']  || '').trim(),
          trips, cubicPerTrip,
          cubicSell:    cubicPerTrip,
          cubicBuy:     cubicPerTrip,
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
