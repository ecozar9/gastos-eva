const STORAGE_KEY = "gastos-eva-v2";
const OLD_STORAGE_KEY = "gastos-eva-v1";

const CATEGORIES = {
  expense: [
    ["Comida", "🍽️"], ["Casa", "🏠"], ["Transporte", "🚗"], ["Ocio", "🎉"],
    ["Compras", "🛍️"], ["Salud", "💊"], ["Recibos", "🧾"], ["Otros", "📌"], ["Estudios", ""]
  ],
  income: [
    ["Nómina", "💼"], ["Bizum", "🏦"], ["Venta", "🏷️"],
    ["Reembolso", "↩️"], ["Regalo", "🎁"], ["Otros ingresos", "💶"]
  ]
};

const ICONS = Object.fromEntries([...CATEGORIES.expense, ...CATEGORIES.income]);
const state = { movements: loadMovements(), activeView: "summary" };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  form: $("#movementForm"), movementId: $("#movementId"), amount: $("#amount"),
  category: $("#category"), date: $("#date"), note: $("#note"), formTitle: $("#formTitle"),
  saveButton: $("#saveButton"), cancelEditButton: $("#cancelEditButton"),
  summaryMonth: $("#summaryMonth"), historyMonth: $("#historyMonth"), historyType: $("#historyType"),
  historyCategory: $("#historyCategory"), monthBalance: $("#monthBalance"),
  monthIncome: $("#monthIncome"), monthExpenses: $("#monthExpenses"), movementCount: $("#movementCount"),
  categorySummary: $("#categorySummary"), recentMovements: $("#recentMovements"),
  historyMovements: $("#historyMovements"), historyIncome: $("#historyIncome"),
  historyExpenses: $("#historyExpenses"), historyBalance: $("#historyBalance"),
  toast: $("#toast"), importInput: $("#importInput")
};

function normalizeMovement(item) {
  if (!item || typeof item !== "object") return null;
  const amount = Number(item.amount);
  if (!Number.isFinite(amount) || amount <= 0 || typeof item.date !== "string") return null;
  return {
    id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
    type: item.type === "income" ? "income" : "expense",
    amount: Math.round(amount * 100) / 100,
    category: typeof item.category === "string" ? item.category : "Otros",
    date: item.date,
    note: typeof item.note === "string" ? item.note : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
  };
}

function loadMovements() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(current)) return current.map(normalizeMovement).filter(Boolean);
    const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) || "[]");
    if (Array.isArray(old) && old.length) {
      const migrated = old.map(normalizeMovement).filter(Boolean);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return [];
}

function persistMovements() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.movements)); }
function todayISO() { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function currentMonth() { return todayISO().slice(0,7); }
function formatMoney(v) { return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(v); }
function formatDate(s) { return new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${s}T12:00:00`)); }
function parseAmount(raw) { const n=Number(raw.trim().replace(/\s/g,"").replace(",",".")); return Number.isFinite(n)?Math.round(n*100)/100:NaN; }
function escapeHTML(v="") { return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function sortNewest(items) { return [...items].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||"").localeCompare(a.createdAt||"")); }
function selectedType() { return $("input[name='movementType']:checked").value; }

function setType(type, selectedCategory="") {
  const radio = $(`input[name='movementType'][value='${type}']`);
  if (radio) radio.checked = true;
  elements.category.innerHTML = CATEGORIES[type].map(([name,icon])=>`<option value="${name}">${icon} ${name}</option>`).join("");
  if (selectedCategory && [...elements.category.options].some(o=>o.value===selectedCategory)) elements.category.value=selectedCategory;
  elements.note.placeholder = type === "income" ? "Ej.: nómina de julio" : "Ej.: compra del supermercado";
}

function populateHistoryCategories() {
  elements.historyCategory.innerHTML = '<option value="">Todas las categorías</option>' +
    [...CATEGORIES.expense,...CATEGORIES.income].map(([name])=>name).filter((v,i,a)=>a.indexOf(v)===i)
      .map(name=>`<option value="${name}">${ICONS[name]||"📌"} ${name}</option>`).join("");
}

function totals(items) {
  const income = items.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
  const expenses = items.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  return { income, expenses, balance: income-expenses };
}

function showView(name) {
  state.activeView=name;
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));
  $$(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  if(name==="summary") renderSummary();
  if(name==="history") renderHistory();
  if(name==="add"&&!elements.movementId.value) setTimeout(()=>elements.amount.focus(),50);
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderSummary() {
  const month=elements.summaryMonth.value||currentMonth();
  const items=sortNewest(state.movements.filter(x=>x.date.startsWith(month)));
  const t=totals(items);
  elements.monthIncome.textContent=formatMoney(t.income);
  elements.monthExpenses.textContent=formatMoney(t.expenses);
  elements.monthBalance.textContent=formatMoney(t.balance);
  elements.movementCount.textContent=items.length===0?"Todavía no hay movimientos":`${items.length} ${items.length===1?"movimiento":"movimientos"}`;
  renderCategorySummary(items.filter(x=>x.type==="expense"),t.expenses);
  renderMovementList(elements.recentMovements,items.slice(0,5),{emptyMessage:"Todavía no has añadido movimientos este mes.",showActions:false});
}

function renderCategorySummary(items,total) {
  const grouped=items.reduce((r,x)=>{r[x.category]=(r[x.category]||0)+x.amount;return r;},{});
  const rows=Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  if(!rows.length){elements.categorySummary.innerHTML='<div class="empty-state">Aquí aparecerá el reparto de tus gastos.</div>';return;}
  elements.categorySummary.innerHTML=rows.map(([category,amount])=>{
    const p=total?amount/total*100:0;
    return `<div class="category-row"><span class="category-name">${ICONS[category]||"📌"} ${escapeHTML(category)}</span><div class="category-bar"><span style="width:${Math.max(p,3)}%"></span></div><span class="category-value">${formatMoney(amount)}</span></div>`;
  }).join("");
}

function renderHistory() {
  const month=elements.historyMonth.value, type=elements.historyType.value, category=elements.historyCategory.value;
  const filtered=sortNewest(state.movements.filter(x=>(!month||x.date.startsWith(month))&&(!type||x.type===type)&&(!category||x.category===category)));
  const t=totals(filtered);
  elements.historyIncome.textContent=formatMoney(t.income);
  elements.historyExpenses.textContent=formatMoney(t.expenses);
  elements.historyBalance.textContent=formatMoney(t.balance);
  renderMovementList(elements.historyMovements,filtered,{emptyMessage:"No hay movimientos con estos filtros.",showActions:true});
}

function renderMovementList(container,items,options) {
  if(!items.length){container.innerHTML=`<div class="empty-state">${options.emptyMessage}</div>`;return;}
  container.innerHTML=items.map(x=>{
    const description=x.note?.trim()||x.category, isIncome=x.type==="income", sign=isIncome?"+":"−";
    const actions=options.showActions?`<div class="movement-actions"><button class="small-button" type="button" data-action="edit" data-id="${x.id}">Editar</button><button class="small-button delete" type="button" data-action="delete" data-id="${x.id}">Borrar</button></div>`:"";
    return `<article class="movement-item"><div class="movement-main"><div class="movement-info"><strong>${ICONS[x.category]||"📌"} ${escapeHTML(description)}</strong><span>${isIncome?"Ingreso":"Gasto"} · ${escapeHTML(x.category)} · ${formatDate(x.date)}</span></div><span class="movement-amount ${x.type}">${sign}${formatMoney(x.amount)}</span></div>${actions}</article>`;
  }).join("");
}

function resetForm() {
  elements.form.reset(); elements.movementId.value=""; elements.date.value=todayISO();
  setType("expense"); elements.formTitle.textContent="Añadir movimiento"; elements.saveButton.textContent="Guardar movimiento";
  elements.cancelEditButton.classList.add("hidden");
}

function startEdit(id) {
  const x=state.movements.find(i=>i.id===id); if(!x)return;
  elements.movementId.value=x.id; setType(x.type,x.category); elements.amount.value=String(x.amount).replace(".",",");
  elements.date.value=x.date; elements.note.value=x.note||""; elements.formTitle.textContent="Editar movimiento";
  elements.saveButton.textContent="Guardar cambios"; elements.cancelEditButton.classList.remove("hidden"); showView("add");
}

function deleteMovement(id) {
  const x=state.movements.find(i=>i.id===id); if(!x)return;
  if(!confirm(`¿Quieres borrar este ${x.type==="income"?"ingreso":"gasto"} de ${formatMoney(x.amount)}?`))return;
  state.movements=state.movements.filter(i=>i.id!==id); persistMovements(); renderSummary(); renderHistory(); showToast("Movimiento borrado");
}

function saveMovement(event) {
  event.preventDefault();
  const amount=parseAmount(elements.amount.value); if(!Number.isFinite(amount)||amount<=0){showToast("Introduce una cantidad válida");elements.amount.focus();return;}
  const id=elements.movementId.value, old=state.movements.find(x=>x.id===id);
  const data={id:id||crypto.randomUUID(),type:selectedType(),amount,category:elements.category.value,date:elements.date.value,note:elements.note.value.trim(),createdAt:old?.createdAt||new Date().toISOString()};
  state.movements=id?state.movements.map(x=>x.id===id?data:x):[...state.movements,data];
  persistMovements(); resetForm(); renderSummary(); renderHistory(); showView("summary"); showToast(id?"Cambios guardados":"Movimiento guardado");
}

function csvCell(value) { const s=String(value??""); return `"${s.replaceAll('"','""')}"`; }
function excelNumber(value) { return Number(value).toFixed(2).replace(".",","); }

function exportExcelSummary() {
  const month=elements.summaryMonth.value||currentMonth();
  const items=sortNewest(state.movements.filter(x=>x.date.startsWith(month)));
  const t=totals(items);
  const expenseGroups=items.filter(x=>x.type==="expense").reduce((r,x)=>{r[x.category]=(r[x.category]||0)+x.amount;return r;},{});
  const incomeGroups=items.filter(x=>x.type==="income").reduce((r,x)=>{r[x.category]=(r[x.category]||0)+x.amount;return r;},{});
  const rows=[];
  rows.push(["RESUMEN MENSUAL",month]); rows.push([]);
  rows.push(["Ingresos",excelNumber(t.income)]); rows.push(["Gastos",excelNumber(t.expenses)]); rows.push(["Saldo",excelNumber(t.balance)]); rows.push(["Número de movimientos",items.length]); rows.push([]);
  rows.push(["INGRESOS POR CATEGORÍA","Importe"]);
  Object.entries(incomeGroups).sort((a,b)=>b[1]-a[1]).forEach(([c,a])=>rows.push([c,excelNumber(a)]));
  rows.push([]); rows.push(["GASTOS POR CATEGORÍA","Importe"]);
  Object.entries(expenseGroups).sort((a,b)=>b[1]-a[1]).forEach(([c,a])=>rows.push([c,excelNumber(a)]));
  rows.push([]); rows.push(["DETALLE","Tipo","Categoría","Descripción","Importe"]);
  items.forEach(x=>rows.push([x.date,x.type==="income"?"Ingreso":"Gasto",x.category,x.note||"",excelNumber(x.amount)]));
  const csv="\uFEFF"+rows.map(row=>row.map(csvCell).join(";")).join("\r\n");
  downloadBlob(new Blob([csv],{type:"text/csv;charset=utf-8;"}),`resumen-finanzas-${month}.csv`);
  showToast("Resumen descargado");
}

function exportBackup() {
  const data={app:"Mis finanzas",version:2,exportedAt:new Date().toISOString(),movements:state.movements};
  downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),`copia-finanzas-${todayISO()}.json`);
  showToast("Copia descargada");
}

function downloadBlob(blob,filename) { const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),500); }

async function importBackup(file) {
  if(!file)return;
  try {
    const parsed=JSON.parse(await file.text());
    const imported=Array.isArray(parsed)?parsed:(parsed.movements||parsed.expenses);
    if(!Array.isArray(imported))throw new Error();
    const ids=new Set(state.movements.map(x=>x.id));
    const valid=imported.map(normalizeMovement).filter(x=>x&&!ids.has(x.id));
    state.movements.push(...valid); persistMovements(); renderSummary(); renderHistory(); elements.importInput.value=""; showToast(`${valid.length} movimientos importados`);
  } catch { elements.importInput.value=""; showToast("No se ha podido importar la copia"); }
}

function clearAllData() {
  if(!state.movements.length){showToast("No hay datos para borrar");return;}
  if(!confirm("¿Seguro que quieres borrar todos los gastos e ingresos?"))return;
  state.movements=[];persistMovements();resetForm();renderSummary();renderHistory();showView("summary");showToast("Todos los datos se han borrado");
}

let toastTimer;
function showToast(message){clearTimeout(toastTimer);elements.toast.textContent=message;elements.toast.classList.add("visible");toastTimer=setTimeout(()=>elements.toast.classList.remove("visible"),2200);}

function registerServiceWorker(){if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));}

function initialise(){
  const month=currentMonth(); elements.summaryMonth.value=month;elements.historyMonth.value=month;elements.date.value=todayISO();
  setType("expense");populateHistoryCategories();
  $$(".nav-button").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  $$("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
  $("#quickAddButton").addEventListener("click",()=>{resetForm();showView("add");});
  $$("input[name='movementType']").forEach(r=>r.addEventListener("change",()=>setType(r.value)));
  elements.form.addEventListener("submit",saveMovement);
  elements.cancelEditButton.addEventListener("click",()=>{resetForm();showView("history");});
  elements.summaryMonth.addEventListener("change",renderSummary);
  [elements.historyMonth,elements.historyType,elements.historyCategory].forEach(e=>e.addEventListener("change",renderHistory));
  elements.historyMovements.addEventListener("click",event=>{const b=event.target.closest("[data-action]");if(!b)return;b.dataset.action==="edit"?startEdit(b.dataset.id):deleteMovement(b.dataset.id);});
  $("#excelButton").addEventListener("click",exportExcelSummary);
  $("#exportButton").addEventListener("click",exportBackup);
  elements.importInput.addEventListener("change",e=>importBackup(e.target.files[0]));
  $("#clearButton").addEventListener("click",clearAllData);
  renderSummary();renderHistory();registerServiceWorker();
}
initialise();
