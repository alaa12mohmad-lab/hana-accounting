// ═══════════════════════════════════════════════════════════════════
// ALL WORKS — صفحة الأعمال الشاملة
// ═══════════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────────
window._AW = window._AW || {
  from: '', to: '',
  pageSize: 50,
  page: 1,
  sortCol: 'date',
  sortDir: 'desc',
  filters: {},         // { colKey: searchStr }
  footMode: {},        // { colKey: 'sum'|'avg'|'count' }
  contextMenu: null,
};

// ── Column definitions ─────────────────────────────────────────────
const AW_COLS = [
  { key:'date',        label:'التاريخ',        type:'date',   w:90  },
  { key:'skId',        label:'#حافظة',         type:'num',    w:60  },
  { key:'client',      label:'العميل',          type:'text',   w:120 },
  { key:'supplier',    label:'المورد',          type:'text',   w:120 },
  { key:'material',    label:'الخامة',          type:'text',   w:90  },
  { key:'driverName',  label:'السائق',          type:'text',   w:100 },
  { key:'plateNo',     label:'السيارة',         type:'text',   w:80  },
  { key:'trips',       label:'نقلات',           type:'num',    w:60  },
  { key:'cubicSell',   label:'م³/نقلة (ع)',     type:'num',    w:75  },
  { key:'grossSell',   label:'إجمالي م³ (ع)',   type:'num',    w:80  },
  { key:'discountSell',label:'خصم م³ (ع)',      type:'num',    w:70  },
  { key:'netSell',     label:'صافي م³ (ع)',     type:'num',    w:75  },
  { key:'sellPrice',   label:'سعر بيع',         type:'num',    w:70  },
  { key:'sellTotal',   label:'إجمالي بيع',      type:'money',  w:100 },
  { key:'cubicBuy',    label:'م³/نقلة (م)',     type:'num',    w:75  },
  { key:'grossBuy',    label:'إجمالي م³ (م)',   type:'num',    w:80  },
  { key:'discountBuy', label:'خصم م³ (م)',      type:'num',    w:70  },
  { key:'netBuy',      label:'صافي م³ (م)',     type:'num',    w:75  },
  { key:'buyPrice',    label:'سعر شراء',        type:'num',    w:70  },
  { key:'buyTotal',    label:'إجمالي شراء',     type:'money',  w:100 },
  { key:'profit',      label:'الربح',           type:'money',  w:90  },
  { key:'status',      label:'الحالة',          type:'text',   w:70  },
];

const AW_NUM_COLS = AW_COLS.filter(c=>c.type==='num'||c.type==='money').map(c=>c.key);

// ── Build flat rows from sarkis ────────────────────────────────────
function _awBuildRows(){
  const rows = [];
  DB.getAll('sarkis').forEach(sk=>{
    (sk.lines||[]).forEach((ln,li)=>{
      const cSell = Number(ln.cubicSell!=null?ln.cubicSell:ln.cubicPerTrip)||0;
      const cBuy  = Number(ln.cubicBuy!=null?ln.cubicBuy:ln.cubicPerTrip)||0;
      const discS = Number(ln.discountSell!=null?ln.discountSell:ln.discountM)||0;
      const discB = Number(ln.discountBuy!=null?ln.discountBuy:ln.discountM)||0;
      const trips = Number(ln.trips)||0;
      const gSell = trips*cSell;
      const nSell = Math.max(0,gSell-discS);
      const gBuy  = trips*cBuy;
      const nBuy  = Math.max(0,gBuy-discB);
      const sPrice= Number(ln.sellPrice)||0;
      const bPrice= Number(ln.buyPrice)||0;
      rows.push({
        _skId:   sk.id,
        _lineIdx:li,
        date:        sk.date||'',
        skId:        sk.id,
        client:      sk.client||'',
        supplier:    sk.supplier||'',
        material:    sk.material||'',
        driverName:  ln.driverName||'',
        plateNo:     ln.plateNo||'',
        trips,
        cubicSell:   cSell,
        grossSell:   gSell,
        discountSell:discS,
        netSell:     Number(ln.netSell||ln.netCubic)||nSell,
        sellPrice:   sPrice,
        sellTotal:   Number(ln.sellTotal)||(nSell*sPrice),
        cubicBuy:    cBuy,
        grossBuy:    gBuy,
        discountBuy: discB,
        netBuy:      Number(ln.netBuy||ln.netCubic)||nBuy,
        buyPrice:    bPrice,
        buyTotal:    Number(ln.buyTotal)||(nBuy*bPrice),
        profit:      Number(ln.profit)||((nSell*sPrice)-(nBuy*bPrice)),
        status:      sk.status||'مفتوح',
      });
    });
  });
  return rows;
}

// ── Filter & sort rows ─────────────────────────────────────────────
function _awFilterRows(rows){
  const aw = window._AW;
  let r = rows;

  // Date range
  if(aw.from) r = r.filter(x=>x.date>=aw.from);
  if(aw.to)   r = r.filter(x=>x.date<=aw.to);

  // Column filters
  Object.entries(aw.filters).forEach(([col,val])=>{
    if(!val) return;
    const v = val.toString().toLowerCase();
    r = r.filter(x=>{
      const cv = (x[col]??'').toString().toLowerCase();
      return cv.includes(v);
    });
  });

  // Sort
  r = [...r].sort((a,b)=>{
    let av = a[aw.sortCol]??'', bv = b[aw.sortCol]??'';
    if(typeof av==='number') return aw.sortDir==='asc'?av-bv:bv-av;
    return aw.sortDir==='asc'
      ? av.toString().localeCompare(bv.toString(),'ar')
      : bv.toString().localeCompare(av.toString(),'ar');
  });

  return r;
}

// ── Format cell value ──────────────────────────────────────────────
function _awFmt(val, type){
  if(val===''||val===null||val===undefined) return '—';
  if(type==='money') return curr(val);
  if(type==='num')   return typeof val==='number'?val.toFixed(val%1===0?0:2):val;
  if(type==='date')  return fmtDate(val);
  return val;
}

// ── Render ─────────────────────────────────────────────────────────
function renderAllWorks(){
  const aw   = window._AW;
  const allRows = _awBuildRows();
  const filtered = _awFilterRows(allRows);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total/aw.pageSize));
  if(aw.page > pages) aw.page = pages;
  const start = (aw.page-1)*aw.pageSize;
  const pageRows = filtered.slice(start, start+aw.pageSize);

  // Column filter inputs
  const filterInputs = AW_COLS.map(col=>`
    <th style="padding:2px;background:#f1f5f9">
      <input type="text" placeholder="🔍"
        value="${(aw.filters[col.key]||'').replace(/"/g,'&quot;')}"
        onchange="window._AW.filters['${col.key}']=this.value;window._AW.page=1;nav('allworks')"
        style="width:${col.w-8}px;font-size:9px;padding:2px 4px;border:1px solid #cbd5e1;border-radius:4px;font-family:inherit;direction:rtl">
    </th>`).join('');

  // Header cells
  const headerCells = AW_COLS.map(col=>`
    <th onclick="window._AW.sortCol='${col.key}';window._AW.sortDir=window._AW.sortDir==='asc'?'desc':'asc';nav('allworks')"
      style="padding:6px 4px;white-space:nowrap;cursor:pointer;user-select:none;min-width:${col.w}px;background:#1F4E78;color:#fff;font-size:10px">
      ${col.label}
      ${aw.sortCol===col.key?(aw.sortDir==='asc'?'↑':'↓'):''}
    </th>`).join('');

  // Data rows
  const dataRows = pageRows.length===0
    ? `<tr><td colspan="${AW_COLS.length+1}" class="tbl-empty">لا توجد بيانات</td></tr>`
    : pageRows.map((r,i)=>{
        const bg = i%2===0?'':'background:#f8fafc';
        const cells = AW_COLS.map(col=>{
          const val = r[col.key];
          const isNum = col.type==='num'||col.type==='money';
          // Editable cells
          if(['trips','cubicSell','discountSell','sellPrice','cubicBuy','discountBuy','buyPrice'].includes(col.key)){
            return `<td style="padding:2px;${bg}">
              <input type="number" min="0" step="0.01"
                value="${val??''}"
                data-sk="${r._skId}" data-li="${r._lineIdx}" data-field="${col.key}"
                onchange="awSaveCell(this)"
                style="width:${col.w-6}px;text-align:center;border:1px solid #e2e8f0;border-radius:3px;padding:2px;font-size:10px;font-family:inherit">
            </td>`;
          }
          return `<td style="padding:4px 6px;font-size:10px;text-align:${isNum?'center':'right'};${bg};white-space:nowrap">
            ${_awFmt(val,col.type)}
          </td>`;
        }).join('');
        return `<tr>
          ${cells}
          <td style="padding:2px;${bg}">
            <button onclick="openSarkiModal(${r._skId})"
              style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px;white-space:nowrap">
              ✏️ فتح
            </button>
          </td>
        </tr>`;
      }).join('');

  // Footer row with sum/avg/count
  const footerCells = AW_COLS.map(col=>{
    const isNum = col.type==='num'||col.type==='money';
    if(!isNum) return `<td style="background:#fefce8;padding:4px 6px;font-size:9px;text-align:center" oncontextmenu="awCtxMenu(event,'${col.key}');return false">—</td>`;
    const mode = aw.footMode[col.key]||'sum';
    const vals = filtered.map(r=>Number(r[col.key])||0).filter(v=>!isNaN(v));
    let result = '';
    if(mode==='sum')   result = curr(vals.reduce((s,v)=>s+v,0));
    if(mode==='avg')   result = vals.length?curr(vals.reduce((s,v)=>s+v,0)/vals.length):'—';
    if(mode==='count') result = vals.length+' سطر';
    const modeLabel = mode==='sum'?'Σ':mode==='avg'?'⌀':'#';
    return `<td style="background:#fefce8;padding:4px 6px;font-size:10px;font-weight:700;text-align:center;cursor:context-menu"
      oncontextmenu="awCtxMenu(event,'${col.key}');return false"
      title="كليك يمين لتغيير النوع">
      <span style="font-size:8px;color:#94a3b8">${modeLabel} </span>${result}
    </td>`;
  }).join('');

  // Pagination
  const pageSizeOpts = [10,25,50,100,250,500,'الكل'].map(n=>
    `<option value="${n}" ${aw.pageSize===n||(n==='الكل'&&aw.pageSize===999999)?'selected':''}>${n}</option>`
  ).join('');

  const pageNums = [];
  for(let p=Math.max(1,aw.page-2);p<=Math.min(pages,aw.page+2);p++) pageNums.push(p);

  return `<div onclick="awCloseCtx(event)">
    <!-- Header -->
    <div class="page-header">
      <div class="section-title" style="margin:0">📑 الأعمال — كل سطور الحوافظ</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-gray btn-sm" onclick="awExportExcel()">📊 Excel</button>
        <button class="btn btn-gray btn-sm" onclick="awExportPDF()">🖨️ PDF</button>
      </div>
    </div>

    <!-- Filters bar -->
    <div class="card mb8" style="padding:10px 14px">
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">من تاريخ</label>
          <input type="date" value="${aw.from}"
            onchange="window._AW.from=this.value;window._AW.page=1;nav('allworks')">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:10px">إلى تاريخ</label>
          <input type="date" value="${aw.to}"
            onchange="window._AW.to=this.value;window._AW.page=1;nav('allworks')">
        </div>
        <button class="btn btn-gray btn-sm" onclick="window._AW.from='';window._AW.to='';window._AW.filters={};window._AW.page=1;nav('allworks')">
          ✕ مسح الفلاتر
        </button>
        <div style="margin-right:auto;font-size:11px;color:#64748b;align-self:center">
          إجمالي النتائج: <strong>${total.toLocaleString('ar-EG')}</strong> سطر
          | عرض <strong>${start+1}–${Math.min(start+aw.pageSize,total)}</strong>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px">
      <table style="border-collapse:collapse;width:100%;min-width:1800px">
        <thead>
          <tr>${headerCells}<th style="background:#1F4E78;color:#fff;padding:6px;font-size:10px;min-width:60px">إجراء</th></tr>
          <tr>${filterInputs}<th style="background:#f1f5f9"></th></tr>
        </thead>
        <tbody>${dataRows}</tbody>
        <tfoot>
          <tr>
            ${footerCells}
            <td style="background:#fefce8"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Pagination -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;color:#64748b">عدد السطور:</span>
        <select onchange="window._AW.pageSize=this.value==='الكل'?999999:Number(this.value);window._AW.page=1;nav('allworks')"
          style="font-size:11px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:5px;font-family:inherit">
          ${pageSizeOpts}
        </select>
      </div>
      <div style="display:flex;gap:4px;align-items:center">
        <button class="btn btn-gray btn-sm" ${aw.page<=1?'disabled':''} onclick="window._AW.page=1;nav('allworks')">⟪</button>
        <button class="btn btn-gray btn-sm" ${aw.page<=1?'disabled':''} onclick="window._AW.page--;nav('allworks')">‹</button>
        ${pageNums.map(p=>`
          <button onclick="window._AW.page=${p};nav('allworks')"
            style="padding:4px 10px;border:1px solid ${p===aw.page?'#1d4ed8':'#e2e8f0'};
            background:${p===aw.page?'#1d4ed8':'#fff'};color:${p===aw.page?'#fff':'#374151'};
            border-radius:5px;cursor:pointer;font-size:11px;font-family:inherit">${p}</button>`).join('')}
        <button class="btn btn-gray btn-sm" ${aw.page>=pages?'disabled':''} onclick="window._AW.page++;nav('allworks')">›</button>
        <button class="btn btn-gray btn-sm" ${aw.page>=pages?'disabled':''} onclick="window._AW.page=${pages};nav('allworks')">⟫</button>
        <span style="font-size:11px;color:#64748b">صفحة ${aw.page} من ${pages}</span>
      </div>
    </div>

    <!-- Context menu -->
    <div id="aw-ctx" style="display:none;position:fixed;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);z-index:9999;min-width:140px;padding:4px 0"></div>
  </div>`;
}

// ── Save cell inline ───────────────────────────────────────────────
function awSaveCell(input){
  const skId  = Number(input.dataset.sk);
  const li    = Number(input.dataset.li);
  const field = input.dataset.field;
  const val   = Number(input.value)||0;

  const sk = DB.getById('sarkis', skId);
  if(!sk) return toast('الحافظة غير موجودة','error');

  const lines = JSON.parse(JSON.stringify(sk.lines||[]));
  if(!lines[li]) return toast('السطر غير موجود','error');

  lines[li][field] = val;

  // خصم العميل → يُطبَّق على المورد تلقائياً
  if(field==='discountSell'){
    lines[li].discountM   = val;
    lines[li].discountBuy = lines[li].discountBuy??val;
    // لو لم يُعدَّل مورد يدوياً → نطبق نفس الخصم
    if(!lines[li]._buyDiscManual) lines[li].discountBuy = val;
  }

  // إعادة حساب السطر
  const ln = lines[li];
  const cS = Number(ln.cubicSell!=null?ln.cubicSell:ln.cubicPerTrip)||0;
  const cB = Number(ln.cubicBuy!=null?ln.cubicBuy:ln.cubicPerTrip)||0;
  const dS = Number(ln.discountSell!=null?ln.discountSell:ln.discountM)||0;
  const dB = Number(ln.discountBuy!=null?ln.discountBuy:ln.discountM)||0;
  const tr = Number(ln.trips)||0;
  const gS = tr*cS, nS = Math.max(0,gS-dS);
  const gB = tr*cB, nB = Math.max(0,gB-dB);
  const sP = Number(ln.sellPrice)||0, bP = Number(ln.buyPrice)||0;

  ln.grossSell  = gS; ln.netSell = nS; ln.sellTotal = nS*sP;
  ln.grossBuy   = gB; ln.netBuy  = nB; ln.buyTotal  = nB*bP;
  ln.grossCubic = gS; ln.netCubic= nS;
  ln.profit     = (nS*sP)-(nB*bP);

  // إعادة حساب إجماليات الحافظة
  const totals = typeof calcSarkiTotals==='function'
    ? calcSarkiTotals(lines)
    : { totalSell: lines.reduce((s,l)=>s+(Number(l.sellTotal)||0),0),
        totalBuy:  lines.reduce((s,l)=>s+(Number(l.buyTotal)||0),0),
        totalNet:  lines.reduce((s,l)=>s+(Number(l.netSell)||0),0),
        totalTrips:lines.reduce((s,l)=>s+(Number(l.trips)||0),0),
        totalProfit:lines.reduce((s,l)=>s+(Number(l.profit)||0),0) };

  DB.update('sarkis', skId, Object.assign({}, sk, {
    lines,
    totalSell:   totals.totalSell,
    totalBuy:    totals.totalBuy,
    totalNet:    totals.totalNet||totals.totalSell,
    totalTrips:  totals.totalTrips,
    totalProfit: totals.totalProfit,
  }));

  // تلوين السطر تأكيداً
  const row = input.closest('tr');
  if(row){ row.style.background='rgba(22,163,74,.12)'; setTimeout(()=>row.style.background='',1500); }
  toast('✅ تم الحفظ','success');
}

// ── Context menu for footer ────────────────────────────────────────
function awCtxMenu(e, col){
  e.preventDefault();
  e.stopPropagation();
  const menu = document.getElementById('aw-ctx');
  if(!menu) return;
  const cur = window._AW.footMode[col]||'sum';
  menu.innerHTML = [
    ['sum','Σ مجموع'],
    ['avg','⌀ متوسط'],
    ['count','# عدد'],
  ].map(([mode,label])=>`
    <div onclick="window._AW.footMode['${col}']='${mode}';awCloseCtx();nav('allworks')"
      style="padding:8px 16px;cursor:pointer;font-size:12px;font-family:inherit;
      background:${cur===mode?'#eff6ff':'#fff'};color:${cur===mode?'#1d4ed8':'#374151'};
      display:flex;align-items:center;gap:8px"
      onmouseenter="this.style.background='#f1f5f9'"
      onmouseleave="this.style.background='${cur===mode?'#eff6ff':'#fff'}'">
      ${label}
    </div>`).join('');
  menu.style.display  = 'block';
  menu.style.left     = e.clientX+'px';
  menu.style.top      = e.clientY+'px';
}

function awCloseCtx(e){
  const menu = document.getElementById('aw-ctx');
  if(menu) menu.style.display='none';
}

// ── Export Excel ───────────────────────────────────────────────────
function awExportExcel(){
  if(typeof XLSX==='undefined'){ toast('مكتبة Excel غير محملة','error'); return; }
  const aw = window._AW;
  const rows = _awFilterRows(_awBuildRows());
  const co   = DB.getCompany();

  const header = [
    [co.name||'شركة الهنا للنقل', ...Array(AW_COLS.length-1).fill('')],
    ['صفحة الأعمال الشاملة', ...Array(AW_COLS.length-1).fill('')],
    AW_COLS.map(c=>c.label),
  ];
  const data = rows.map(r=>AW_COLS.map(c=>{
    const v = r[c.key];
    return (c.type==='num'||c.type==='money')?Number(v)||0:v??'';
  }));

  // Footer totals
  const totals = AW_COLS.map(c=>{
    if(c.type!=='num'&&c.type!=='money') return '';
    return rows.reduce((s,r)=>s+(Number(r[c.key])||0),0);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...header,...data,totals]);
  ws['!cols'] = AW_COLS.map(c=>({wch:Math.round(c.w/7)}));
  XLSX.utils.book_append_sheet(wb, ws, 'الأعمال');
  XLSX.writeFile(wb, 'الأعمال_'+new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')+'.xlsx');
  toast('✅ تم تصدير Excel');
}

// ── Export PDF ─────────────────────────────────────────────────────
function awExportPDF(){
  const aw   = window._AW;
  const rows = _awFilterRows(_awBuildRows());
  const co   = DB.getCompany();

  const css = `*{font-family:Tahoma,sans-serif;direction:rtl;font-size:8px}
    body{padding:10px}
    .hdr{border-bottom:3px solid #1F4E78;padding-bottom:6px;margin-bottom:10px;display:flex;justify-content:space-between}
    .co{font-size:13px;font-weight:700;color:#1F4E78}
    table{width:100%;border-collapse:collapse}
    th{background:#1F4E78;color:#fff;padding:4px 3px;text-align:right;white-space:nowrap;font-size:8px}
    td{padding:3px;border-bottom:1px solid #f1f5f9;white-space:nowrap}
    tr:nth-child(even){background:#f8fafc}
    tfoot td{background:#fefce8;font-weight:700}
    @media print{@page{margin:8mm;size:A3 landscape}body{padding:0}}`;

  const thead = '<tr>'+AW_COLS.map(c=>`<th>${c.label}</th>`).join('')+'</tr>';
  const tbody = rows.map(r=>'<tr>'+AW_COLS.map(c=>`<td>${_awFmt(r[c.key],c.type)}</td>`).join('')+'</tr>').join('');
  const tfoot = '<tr>'+AW_COLS.map(c=>{
    if(c.type!=='num'&&c.type!=='money') return '<td></td>';
    return `<td style="text-align:center;font-weight:700">${curr(rows.reduce((s,r)=>s+(Number(r[c.key])||0),0))}</td>`;
  }).join('')+'</tr>';

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <title>الأعمال</title><style>${css}</style></head><body>
    <div class="hdr">
      <div><div class="co">${co.name||'شركة الهنا للنقل'}</div>
      <div style="font-size:9px;color:#64748b">صفحة الأعمال الشاملة — ${rows.length} سطر | ${new Date().toLocaleDateString('ar-EG')}</div></div>
    </div>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>
    <script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
  w.document.close();
}
