// ═══ REPORTS ═══
let _RP={from:'2026-01-01',to:todayStr(),viewBy:'عميل',mat:'الكل',tab:'overview'};
function renderReports(){
  const materials=DB.getAll('materials');
  const customers=DB.getAll('customers');
  const suppliers=DB.getAll('suppliers');
  const partners=DB.getAll('partners');
  const matNames=['الكل',...materials.map(m=>m.name)];
  const sarkis=DB.getAll('sarkis').filter(sk=>sk.status!=='ملغي');
  const fd=new Date(_RP.from),td=new Date(_RP.to);
  const filtered=sarkis.filter(sk=>{const d=new Date(sk.date);return d>=fd&&d<=td&&(_RP.mat==='الكل'||sk.material===_RP.mat);});
  const kpis={count:filtered.length,cubic:filtered.reduce((s,r)=>s+(Number(r.totalNet)||0),0),sell:filtered.reduce((s,r)=>s+(Number(r.totalSell)||0),0),buy:filtered.reduce((s,r)=>s+(Number(r.totalBuy)||0),0),profit:filtered.reduce((s,r)=>s+(Number(r.totalProfit)||0),0)};
  const matBD=materials.map(m=>{const rows=filtered.filter(r=>r.material===m.name);const sell=rows.reduce((s,r)=>s+(Number(r.totalSell)||0),0);const buy=rows.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);const profit=rows.reduce((s,r)=>s+(Number(r.totalProfit)||0),0);const cubic=rows.reduce((s,r)=>s+(Number(r.totalNet)||0),0);return{mat:m.name,count:rows.length,cubic,sell,buy,profit,margin:sell?profit/sell:0};});
  const entities=_RP.viewBy==='عميل'?customers:suppliers;
  const entBD=entities.map(e=>{const rows=filtered.filter(r=>_RP.viewBy==='عميل'?r.client===e.name:r.supplier===e.name);const sell=rows.reduce((s,r)=>s+(Number(r.totalSell)||0),0);const buy=rows.reduce((s,r)=>s+(Number(r.totalBuy)||0),0);const profit=rows.reduce((s,r)=>s+(Number(r.totalProfit)||0),0);const cubic=rows.reduce((s,r)=>s+(Number(r.totalNet)||0),0);return{name:e.name,count:rows.length,cubic,sell,buy,profit,margin:sell?profit/sell:0};}).filter(e=>e.sell>0).sort((a,b)=>b.sell-a.sell);
  const partnerComm=partners.map(p=>({name:p.name,commission:getPartnerCommission(filtered.flatMap(sk=>(sk.lines||[]).map(l=>({...l,date:sk.date,material:sk.material}))),p)})).sort((a,b)=>b.commission-a.commission);
  const tabs=[['overview','نظرة عامة'],['materials','الخامات'],['entities',_RP.viewBy==='عميل'?'العملاء':'الموردين'],['partners','الشركاء']];
  return `<div>
    <div class="card mb12">
      <div class="form-row fr4">
        <div class="form-group"><label>من</label><input type="date" value="${_RP.from}" onchange="_RP.from=this.value;nav('reports')"></div>
        <div class="form-group"><label>إلى</label><input type="date" value="${_RP.to}" onchange="_RP.to=this.value;nav('reports')"></div>
        <div class="form-group"><label>تحليل حسب</label><select onchange="_RP.viewBy=this.value;nav('reports')"><option ${_RP.viewBy==='عميل'?'selected':''}>عميل</option><option ${_RP.viewBy==='مورد'?'selected':''}>مورد</option></select></div>
        <div class="form-group"><label>الخامة</label><select onchange="_RP.mat=this.value;nav('reports')">${matNames.map(m=>`<option ${_RP.mat===m?'selected':''}>${m}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="grid6 mb12">
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">الحوافظ</div><div class="font-bold text-brand">${num(kpis.count)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">م³ صافي</div><div class="font-bold text-brand">${kpis.cubic.toFixed(1)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي البيع</div><div class="font-bold text-brand tabular">${curr(kpis.sell)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">إجمالي التكلفة</div><div class="font-bold text-red tabular">${curr(kpis.buy)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">صافي الربح</div><div class="font-bold text-green tabular">${curr(kpis.profit)}</div></div>
      <div class="card-sm text-center"><div class="text-xs text-gray mb4">هامش الربح</div><div class="font-bold" style="color:#7c3aed">${pct(kpis.sell?kpis.profit/kpis.sell:0)}</div></div>
    </div>
    <div class="flex-wrap mb12">
      ${tabs.map(([v,l])=>`<button class="btn ${_RP.tab===v?'btn-primary':'btn-gray'}" onclick="_RP.tab='${v}';nav('reports')">${l}</button>`).join('')}
      <button class="btn btn-primary" style="margin-right:auto" onclick="printReport()">🖨️ طباعة</button>
    </div>
    ${_RP.tab==='materials'?`<div class="card"><div class="tbl-wrap"><table><thead><tr><th>الخامة</th><th>حوافظ</th><th>م³</th><th>البيع</th><th>التكلفة</th><th>الربح</th><th>هامش%</th></tr></thead><tbody>${matBD.map(m=>`<tr><td>${badge(m.mat)}</td><td class="tabular text-center">${num(m.count)}</td><td class="tabular text-center">${m.cubic.toFixed(1)}</td><td class="tabular text-brand">${curr(m.sell)}</td><td class="tabular text-gray">${curr(m.buy)}</td><td class="tabular font-bold text-green">${curr(m.profit)}</td><td class="tabular" style="color:#7c3aed">${pct(m.margin)}</td></tr>`).join('')}<tr style="background:#fafafa;font-weight:700"><td>الإجمالي</td><td class="tabular text-center">${num(matBD.reduce((s,r)=>s+r.count,0))}</td><td class="tabular text-center">${matBD.reduce((s,r)=>s+r.cubic,0).toFixed(1)}</td><td class="tabular text-brand">${curr(matBD.reduce((s,r)=>s+r.sell,0))}</td><td class="tabular">${curr(matBD.reduce((s,r)=>s+r.buy,0))}</td><td class="tabular text-green">${curr(matBD.reduce((s,r)=>s+r.profit,0))}</td><td></td></tr></tbody></table></div></div>`:''}
    ${_RP.tab==='entities'?`<div class="card"><div class="tbl-wrap"><table><thead><tr><th>الجهة</th><th>حوافظ</th><th>م³</th><th>البيع</th><th>التكلفة</th><th>الربح</th><th>هامش%</th></tr></thead><tbody>${entBD.map(e=>`<tr><td><strong>${e.name}</strong></td><td class="tabular text-center">${num(e.count)}</td><td class="tabular text-center">${e.cubic.toFixed(1)}</td><td class="tabular text-brand">${curr(e.sell)}</td><td class="tabular text-gray">${curr(e.buy)}</td><td class="tabular font-bold text-green">${curr(e.profit)}</td><td class="tabular" style="color:#7c3aed">${pct(e.margin)}</td></tr>`).join('')||`<tr><td colspan="7" class="tbl-empty">لا توجد بيانات</td></tr>`}</tbody></table></div></div>`:''}
    ${_RP.tab==='partners'?`<div class="card"><div class="tbl-wrap"><table><thead><tr><th>الشريك</th><th>إجمالي العمولة</th></tr></thead><tbody>${partnerComm.map(p=>`<tr><td><strong>${p.name}</strong></td><td class="tabular font-bold text-brand">${curr(p.commission)}</td></tr>`).join('')||`<tr><td colspan="2" class="tbl-empty">لا يوجد شركاء</td></tr>`}<tr style="background:#fafafa;font-weight:700"><td>الإجمالي</td><td class="tabular text-brand">${curr(partnerComm.reduce((s,p)=>s+p.commission,0))}</td></tr></tbody></table></div></div>`:''}
    ${_RP.tab==='overview'?`<div class="grid2"><div class="card"><div class="section-title">🪨 أفضل الخامات</div>${[...matBD].sort((a,b)=>b.profit-a.profit).slice(0,5).map((m,i)=>`<div class="flex-between" style="padding:7px 0;border-bottom:1px solid #f1f5f9"><div class="flex"><span style="width:18px;height:18px;background:#e0e7ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#3730a3">${i+1}</span><span style="margin-right:7px;font-size:11px">${m.mat}</span></div><span class="font-bold text-green tabular">${curr(m.profit)}</span></div>`).join('')}</div><div class="card"><div class="section-title">${_RP.viewBy==='عميل'?'👤 أفضل العملاء':'🏭 أفضل الموردين'}</div>${entBD.slice(0,5).map((e,i)=>`<div class="flex-between" style="padding:7px 0;border-bottom:1px solid #f1f5f9"><div class="flex"><span style="width:18px;height:18px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#166534">${i+1}</span><span style="margin-right:7px;font-size:11px">${e.name}</span></div><span class="font-bold text-brand tabular">${curr(e.sell)}</span></div>`).join('')}</div></div>`:''}
  </div>`;
}

// ═══════════════════════════════════════════════════════
// ACCOUNTS + ACCOUNT STATEMENT