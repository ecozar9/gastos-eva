const STORAGE_KEY = "gastos-eva-v1";

const CATEGORY_ICONS = {
  Comida: "🍽️",
  Casa: "🏠",
  Transporte: "🚗",
  Ocio: "🎉",
  Compras: "🛍️",
  Salud: "💊",
  Otros: "📌",
};

const state = {
  expenses: loadExpenses(),
  activeView: "summary",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  form: $("#expenseForm"),
  expenseId: $("#expenseId"),
  amount: $("#amount"),
  category: $("#category"),
  date: $("#date"),
  note: $("#note"),
  formTitle: $("#formTitle"),
  saveButton: $("#saveButton"),
  cancelEditButton: $("#cancelEditButton"),
  summaryMonth: $("#summaryMonth"),
  historyMonth: $("#historyMonth"),
  historyCategory: $("#historyCategory"),
  monthTotal: $("#monthTotal"),
  expenseCount: $("#expenseCount"),
  categorySummary: $("#categorySummary"),
  recentExpenses: $("#recentExpenses"),
  historyExpenses: $("#historyExpenses"),
  historyTotal: $("#historyTotal"),
  toast: $("#toast"),
  importInput: $("#importInput"),
};

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function persistExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

function parseAmount(rawValue) {
  const normalized = rawValue.trim().replace(/\s/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : NaN;
}

function escapeHTML(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sortNewest(expenses) {
  return [...expenses].sort((a, b) => {
    const dateDifference = b.date.localeCompare(a.date);
    return dateDifference || (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

function expensesForMonth(month) {
  return state.expenses.filter((expense) => expense.date.startsWith(month));
}

function showView(viewName) {
  state.activeView = viewName;

  $$(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  $$(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  if (viewName === "summary") renderSummary();
  if (viewName === "history") renderHistory();
  if (viewName === "add" && !elements.expenseId.value) elements.amount.focus();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSummary() {
  const selectedMonth = elements.summaryMonth.value || currentMonth();
  const expenses = sortNewest(expensesForMonth(selectedMonth));
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  elements.monthTotal.textContent = formatMoney(total);
  elements.expenseCount.textContent =
    expenses.length === 0
      ? "Todavía no hay gastos"
      : `${expenses.length} ${expenses.length === 1 ? "gasto registrado" : "gastos registrados"}`;

  renderCategorySummary(expenses, total);
  renderExpenseList(elements.recentExpenses, expenses.slice(0, 5), {
    emptyMessage: "Todavía no has añadido gastos este mes.",
    showActions: false,
  });
}

function renderCategorySummary(expenses, total) {
  const totals = expenses.reduce((result, expense) => {
    result[expense.category] = (result[expense.category] || 0) + expense.amount;
    return result;
  }, {});

  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (rows.length === 0) {
    elements.categorySummary.innerHTML =
      '<div class="empty-state">Aquí aparecerá el reparto por categorías.</div>';
    return;
  }

  elements.categorySummary.innerHTML = rows
    .map(([category, amount]) => {
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      return `
        <div class="category-row">
          <span class="category-name">${CATEGORY_ICONS[category] || "📌"} ${escapeHTML(category)}</span>
          <div class="category-bar" aria-label="${percentage.toFixed(0)}%">
            <span style="width:${Math.max(percentage, 3)}%"></span>
          </div>
          <span class="category-value">${formatMoney(amount)}</span>
        </div>
      `;
    })
    .join("");
}

function renderHistory() {
  const month = elements.historyMonth.value;
  const category = elements.historyCategory.value;

  const filtered = sortNewest(
    state.expenses.filter((expense) => {
      const matchesMonth = !month || expense.date.startsWith(month);
      const matchesCategory = !category || expense.category === category;
      return matchesMonth && matchesCategory;
    })
  );

  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  elements.historyTotal.textContent = formatMoney(total);

  renderExpenseList(elements.historyExpenses, filtered, {
    emptyMessage: "No hay gastos con estos filtros.",
    showActions: true,
  });
}

function renderExpenseList(container, expenses, options) {
  if (expenses.length === 0) {
    container.innerHTML = `<div class="empty-state">${options.emptyMessage}</div>`;
    return;
  }

  container.innerHTML = expenses
    .map((expense) => {
      const description = expense.note?.trim() || expense.category;
      const actions = options.showActions
        ? `
          <div class="expense-actions">
            <button class="small-button" type="button" data-action="edit" data-id="${expense.id}">Editar</button>
            <button class="small-button delete" type="button" data-action="delete" data-id="${expense.id}">Borrar</button>
          </div>
        `
        : "";

      return `
        <article class="expense-item">
          <div class="expense-main">
            <div class="expense-info">
              <strong>${CATEGORY_ICONS[expense.category] || "📌"} ${escapeHTML(description)}</strong>
              <span>${escapeHTML(expense.category)} · ${formatDate(expense.date)}</span>
            </div>
            <span class="expense-amount">−${formatMoney(expense.amount)}</span>
          </div>
          ${actions}
        </article>
      `;
    })
    .join("");
}

function resetForm() {
  elements.form.reset();
  elements.expenseId.value = "";
  elements.date.value = todayISO();
  elements.category.value = "Comida";
  elements.formTitle.textContent = "Añadir gasto";
  elements.saveButton.textContent = "Guardar gasto";
  elements.cancelEditButton.classList.add("hidden");
}

function startEdit(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) return;

  elements.expenseId.value = expense.id;
  elements.amount.value = String(expense.amount).replace(".", ",");
  elements.category.value = expense.category;
  elements.date.value = expense.date;
  elements.note.value = expense.note || "";
  elements.formTitle.textContent = "Editar gasto";
  elements.saveButton.textContent = "Guardar cambios";
  elements.cancelEditButton.classList.remove("hidden");
  showView("add");
}

function deleteExpense(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) return;

  const accepted = window.confirm(
    `¿Quieres borrar el gasto de ${formatMoney(expense.amount)}?`
  );

  if (!accepted) return;

  state.expenses = state.expenses.filter((item) => item.id !== id);
  persistExpenses();
  renderSummary();
  renderHistory();
  showToast("Gasto borrado");
}

function saveExpense(event) {
  event.preventDefault();

  const amount = parseAmount(elements.amount.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Introduce una cantidad válida");
    elements.amount.focus();
    return;
  }

  const id = elements.expenseId.value;
  const expenseData = {
    id: id || crypto.randomUUID(),
    amount,
    category: elements.category.value,
    date: elements.date.value,
    note: elements.note.value.trim(),
    createdAt: id
      ? state.expenses.find((expense) => expense.id === id)?.createdAt || new Date().toISOString()
      : new Date().toISOString(),
  };

  if (id) {
    state.expenses = state.expenses.map((expense) =>
      expense.id === id ? expenseData : expense
    );
  } else {
    state.expenses.push(expenseData);
  }

  persistExpenses();
  resetForm();
  renderSummary();
  renderHistory();
  showView("summary");
  showToast(id ? "Cambios guardados" : "Gasto guardado");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function monthName(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

function excelNumber(value) {
  return Number(value).toFixed(2).replace(".", ",");
}

function exportExcelSummary() {
  const month = elements.summaryMonth.value || currentMonth();
  const expenses = sortNewest(expensesForMonth(month));
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const totalsByCategory = expenses.reduce((result, expense) => {
    result[expense.category] = (result[expense.category] || 0) + expense.amount;
    return result;
  }, {});

  const rows = [
    ["RESUMEN DE GASTOS"],
    ["Mes", monthName(month)],
    ["Total gastado (€)", excelNumber(total)],
    ["Número de gastos", expenses.length],
    [],
    ["RESUMEN POR CATEGORÍA"],
    ["Categoría", "Total (€)", "Porcentaje"],
  ];

  Object.entries(totalsByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount]) => {
      const percentage = total > 0 ? `${((amount / total) * 100).toFixed(1).replace(".", ",")}%` : "0%";
      rows.push([category, excelNumber(amount), percentage]);
    });

  rows.push(
    [],
    ["DETALLE DE GASTOS"],
    ["Fecha", "Categoría", "Descripción", "Importe (€)"]
  );

  expenses.forEach((expense) => {
    rows.push([
      formatDate(expense.date),
      expense.category,
      expense.note?.trim() || "",
      excelNumber(expense.amount),
    ]);
  });

  const csv = `sep=;\r\n${rows
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n")}`;

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resumen-gastos-${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Resumen para Excel descargado");
}

function exportBackup() {
  const backup = {
    app: "Mis gastos",
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses: state.expenses,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `copia-gastos-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Copia descargada");
}

async function importBackup(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedExpenses = Array.isArray(parsed) ? parsed : parsed.expenses;

    if (!Array.isArray(importedExpenses)) {
      throw new Error("Formato no válido");
    }

    const existingIds = new Set(state.expenses.map((expense) => expense.id));
    const validExpenses = importedExpenses.filter(
      (expense) =>
        expense &&
        typeof expense.id === "string" &&
        typeof expense.amount === "number" &&
        typeof expense.category === "string" &&
        typeof expense.date === "string" &&
        !existingIds.has(expense.id)
    );

    state.expenses.push(...validExpenses);
    persistExpenses();
    renderSummary();
    renderHistory();
    elements.importInput.value = "";
    showToast(`${validExpenses.length} gastos importados`);
  } catch {
    elements.importInput.value = "";
    showToast("No se ha podido importar la copia");
  }
}

function clearAllData() {
  if (state.expenses.length === 0) {
    showToast("No hay datos para borrar");
    return;
  }

  const accepted = window.confirm(
    "¿Seguro que quieres borrar todos los gastos? Esta acción no se puede deshacer."
  );

  if (!accepted) return;

  state.expenses = [];
  persistExpenses();
  resetForm();
  renderSummary();
  renderHistory();
  showView("summary");
  showToast("Todos los datos se han borrado");
}

let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2200);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // La aplicación sigue funcionando aunque el modo sin conexión falle.
      });
    });
  }
}

function initialise() {
  const month = currentMonth();
  elements.summaryMonth.value = month;
  elements.historyMonth.value = month;
  elements.date.value = todayISO();

  $$(".nav-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.go));
  });

  $("#quickAddButton").addEventListener("click", () => {
    resetForm();
    showView("add");
  });

  elements.form.addEventListener("submit", saveExpense);
  elements.cancelEditButton.addEventListener("click", () => {
    resetForm();
    showView("history");
  });

  elements.summaryMonth.addEventListener("change", renderSummary);
  elements.historyMonth.addEventListener("change", renderHistory);
  elements.historyCategory.addEventListener("change", renderHistory);

  elements.historyExpenses.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    if (button.dataset.action === "edit") startEdit(button.dataset.id);
    if (button.dataset.action === "delete") deleteExpense(button.dataset.id);
  });

  $("#exportButton").addEventListener("click", exportBackup);
  $("#excelButton").addEventListener("click", exportExcelSummary);
  elements.importInput.addEventListener("change", (event) =>
    importBackup(event.target.files[0])
  );
  $("#clearButton").addEventListener("click", clearAllData);

  renderSummary();
  renderHistory();
  registerServiceWorker();
}

initialise();
