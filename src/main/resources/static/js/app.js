const API_BASE = "/api/expenses";
const BUDGET_API = "/api/budget/current";

const CATEGORY_COLORS = {
    Food: "#f97316",
    Transport: "#2563eb",
    Housing: "#7c3aed",
    Utilities: "#0f766e",
    Health: "#dc2626",
    Shopping: "#f43f5e",
    Education: "#0ea5e9",
    Entertainment: "#d97706",
    Savings: "#059669",
    Other: "#4b5563"
};

const qs = (id) => document.getElementById(id);

const form = qs("expenseForm");
const tableBody = qs("expenseTableBody");
const emptyState = qs("emptyState");
const formError = qs("formError");
const toast = qs("toast");
const quickCategories = qs("quickCategories");
const anomalyAlertEl = qs("anomalyAlert");

const totalSpendEl = qs("totalSpend");
const monthSpendEl = qs("monthSpend");
const remainingBudgetEl = qs("remainingBudget");
const budgetLabelEl = qs("budgetLabel");
const budgetStatusEl = qs("budgetStatus");
const budgetBar = qs("budgetProgressBar");
const activeMonthLabelEl = qs("activeMonthLabel");
const budgetLockNoteEl = qs("budgetLockNote");

const categoryLegend = qs("categoryLegend");
const chartCanvas = qs("categoryChart");
const chartCtx = chartCanvas.getContext("2d");
const trendCanvas = qs("monthlyTrendChart");
const trendCtx = trendCanvas ? trendCanvas.getContext("2d") : null;

const topCategoryInsightEl = qs("topCategoryInsight");
const recurringShareInsightEl = qs("recurringShareInsight");
const dailyAverageInsightEl = qs("dailyAverageInsight");
const projectionInsightEl = qs("projectionInsight");
const todaySpendInsightEl = qs("todaySpendInsight");
const weekSpendInsightEl = qs("weekSpendInsight");
const streakInsightEl = qs("streakInsight");
const largestTodayInsightEl = qs("largestTodayInsight");
const dueSoonListEl = qs("dueSoonList");
const recentTemplatesEl = qs("recentTemplates");
const undoDeleteBtn = qs("undoDeleteBtn");
const monthlySummaryListEl = qs("monthlySummaryList");

const filters = {
    search: qs("searchInput"),
    type: qs("typeFilter"),
    category: qs("categoryFilter"),
    fromDate: qs("fromDate"),
    toDate: qs("toDate"),
    sortBy: qs("sortBy")
};

const controls = {
    seed: qs("seedDemoBtn"),
    reset: qs("resetAllBtn"),
    editBudget: qs("editBudgetBtn"),
    cancelEdit: qs("cancelEditBtn"),
    exportBtn: qs("exportBtn"),
    importInput: qs("importInput"),
    clearFilters: qs("clearFiltersBtn")
};

let state = {
    expenses: [],
    budgetSummary: null,
    editingId: null,
    loading: false,
    lastDeletedExpense: null
};

let undoTimeoutId = null;
let recentTemplates = [];

const CATEGORY_KEYWORDS = {
    Food: ["food", "grocery", "groceries", "restaurant", "lunch", "dinner", "breakfast", "snack", "cafe", "coffee", "pizza", "zomato", "swiggy"],
    Transport: ["uber", "ola", "taxi", "cab", "metro", "bus", "train", "fuel", "petrol", "diesel", "toll", "parking", "commute"],
    Housing: ["rent", "apartment", "mortgage", "maintenance", "furnishing", "tenant"],
    Utilities: ["electricity", "water", "gas", "internet", "wifi", "broadband", "phone bill", "mobile bill", "recharge"],
    Health: ["doctor", "hospital", "medicine", "pharmacy", "medical", "clinic", "therapy", "insurance"],
    Shopping: ["shopping", "amazon", "flipkart", "mall", "clothes", "fashion", "shoes", "accessories"],
    Education: ["course", "tuition", "book", "udemy", "exam", "school", "college", "training"],
    Entertainment: ["movie", "netflix", "spotify", "prime", "game", "concert", "party", "subscription"],
    Savings: ["saving", "savings", "investment", "sip", "mutual fund", "deposit", "fd", "emergency fund"]
};

async function init() {
    setDefaultDate();
    renderQuickCategories();
    attachEvents();
    await loadExpensesFromServer();
    refresh();
}

async function apiRequest(path = "", options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json"
        },
        ...options
    });

    if (!response.ok) {
        let message = "Unexpected server error";
        try {
            const text = await response.text();
            if (text.trim().startsWith("{")) {
                const parsed = JSON.parse(text);
                message = parsed.message || parsed.error || message;
            } else {
                message = text;
            }
        } catch {
            message = response.statusText || message;
        }
        throw new Error(message || `Request failed (${response.status})`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function mapServerExpense(item) {
    return {
        id: item.id,
        title: item.title,
        amount: Number(item.amount),
        date: item.expenseDate,
        category: item.category,
        paymentMethod: item.paymentMethod,
        notes: item.notes || "",
        recurring: Boolean(item.recurring)
    };
}

async function loadExpensesFromServer() {
    setLoading(true);
    try {
        const data = await apiRequest();
        state.expenses = Array.isArray(data) ? data.map(mapServerExpense) : [];
        refreshCategoryOptions();
        await loadBudgetSummary();
    } catch (error) {
        showToast("Could not load expenses. Check server/database.");
        console.error(error);
    } finally {
        setLoading(false);
    }
}

function getCurrentMonthKey() {
    return new Date().toISOString().slice(0, 7);
}

async function loadBudgetSummary(monthKey = getCurrentMonthKey()) {
    try {
        const response = await fetch(`${BUDGET_API}?month=${encodeURIComponent(monthKey)}`);
        if (!response.ok) {
            throw new Error("Failed to load budget");
        }
        state.budgetSummary = await response.json();
    } catch (error) {
        console.error(error);
        state.budgetSummary = {
            month: monthKey,
            budget: 0,
            spent: 0,
            remaining: 0,
            locked: false
        };
    }
}

async function updateBudget(amount, monthKey = getCurrentMonthKey()) {
    const response = await fetch(`${BUDGET_API}?month=${encodeURIComponent(monthKey)}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount })
    });

    if (!response.ok) {
        throw new Error("Could not update budget");
    }

    state.budgetSummary = await response.json();
}

function attachEvents() {
    form.addEventListener("submit", handleFormSubmit);

    Object.values(filters).forEach((el) => {
        el.addEventListener("input", refresh);
        el.addEventListener("change", refresh);
    });

    controls.cancelEdit.addEventListener("click", () => {
        clearForm();
        state.editingId = null;
        controls.cancelEdit.hidden = true;
        qs("saveBtn").textContent = "Save Expense";
    });

    controls.clearFilters.addEventListener("click", clearFilters);
    controls.seed.addEventListener("click", () => void seedDemoData());
    controls.reset.addEventListener("click", () => void hardReset());
    controls.editBudget.addEventListener("click", setBudget);
    controls.exportBtn.addEventListener("click", exportCsv);
    controls.importInput.addEventListener("change", (event) => void importCsv(event));

    tableBody.addEventListener("click", handleTableAction);
    undoDeleteBtn.addEventListener("click", () => void undoDelete());
    recentTemplatesEl.addEventListener("click", handleTemplateClick);

    qs("title").addEventListener("input", updateFormAssist);
    qs("notes").addEventListener("input", updateFormAssist);
    qs("amount").addEventListener("input", updateFormAssist);
    qs("category").addEventListener("change", updateFormAssist);
}

function setLoading(isLoading) {
    state.loading = isLoading;
    qs("saveBtn").disabled = isLoading;
    controls.seed.disabled = isLoading;
    controls.reset.disabled = isLoading;
    controls.editBudget.disabled = isLoading;
    controls.exportBtn.disabled = isLoading;
    controls.clearFilters.disabled = isLoading;
}

function setDefaultDate() {
    qs("date").value = toLocalDateKey(new Date());
}

function toLocalDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function toDateAtMidnight(dateString) {
    const [year, month, day] = String(dateString).split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
}

function clearFilters() {
    filters.search.value = "";
    filters.type.value = "all";
    filters.category.value = "all";
    filters.fromDate.value = "";
    filters.toDate.value = "";
    filters.sortBy.value = "date-desc";
    refresh();
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value || 0);
}

function formatDate(dateString) {
    const d = new Date(dateString + "T00:00:00");
    if (Number.isNaN(d.getTime())) {
        return dateString;
    }
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    formError.textContent = "";

    const payload = {
        title: qs("title").value.trim(),
        amount: Number(qs("amount").value),
        date: qs("date").value,
        category: qs("category").value,
        paymentMethod: qs("paymentMethod").value,
        notes: qs("notes").value.trim(),
        recurring: qs("recurring").checked
    };

    const validationError = validateExpense(payload);
    if (validationError) {
        formError.textContent = validationError;
        return;
    }

    const currentMonth = getCurrentMonthKey();
    if (!state.editingId && state.budgetSummary?.locked && payload.date.startsWith(currentMonth)) {
        formError.textContent = "Monthly budget is locked. Increase budget to add more expenses.";
        return;
    }

    setLoading(true);
    try {
        if (state.editingId) {
            await apiRequest(`/${state.editingId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            showToast("Expense updated");
        } else {
            await apiRequest("", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            showToast("Expense added");
        }

        await loadExpensesFromServer();
        await loadBudgetSummary();
    } catch (error) {
        formError.textContent = error.message || "Save failed. Check server connection.";
        console.error(error);
        return;
    } finally {
        setLoading(false);
    }

    clearForm();
    state.editingId = null;
    controls.cancelEdit.hidden = true;
    qs("saveBtn").textContent = "Save Expense";
    refresh();
}

function validateExpense(expense) {
    if (!expense.title || expense.title.length < 2) {
        return "Title must be at least 2 characters.";
    }
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
        return "Amount must be greater than zero.";
    }
    if (!expense.date) {
        return "Please select a valid date.";
    }
    if (!expense.category) {
        return "Please choose a category.";
    }
    if (!expense.paymentMethod) {
        return "Please choose a payment method.";
    }
    return "";
}

function clearForm() {
    form.reset();
    setDefaultDate();
    hideAnomalyAlert();
}

function updateFormAssist() {
    autoSuggestCategory();
    renderAnomalyAlert();
}

function autoSuggestCategory() {
    const categoryEl = qs("category");
    if (!categoryEl) return;

    const title = qs("title").value.trim();
    const notes = qs("notes").value.trim();
    const suggestion = suggestCategory(title, notes);
    if (!suggestion) return;

    if (!categoryEl.value || categoryEl.value === "Other") {
        categoryEl.value = suggestion;
    }
}

function suggestCategory(title, notes = "") {
    const text = `${title} ${notes}`.toLowerCase();
    if (!text.trim()) return "";

    let bestCategory = "";
    let bestScore = 0;

    Object.entries(CATEGORY_KEYWORDS).forEach(([category, words]) => {
        const score = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
        }
    });

    return bestScore > 0 ? bestCategory : "";
}

function renderAnomalyAlert() {
    const amount = Number(qs("amount").value);
    const category = qs("category").value;

    if (!Number.isFinite(amount) || amount <= 0 || !category) {
        hideAnomalyAlert();
        return;
    }

    const baselineRows = state.expenses.filter((item) => item.category === category);
    if (baselineRows.length < 3) {
        hideAnomalyAlert();
        return;
    }

    const avg = baselineRows.reduce((sum, item) => sum + item.amount, 0) / baselineRows.length;
    const max = baselineRows.reduce((m, item) => Math.max(m, item.amount), 0);
    const threshold = Math.max(avg * 1.8, max * 1.15);

    if (amount > threshold) {
        const multiple = (amount / Math.max(avg, 1)).toFixed(1);
        anomalyAlertEl.hidden = false;
        anomalyAlertEl.textContent = `Spending alert: this is about ${multiple}x your usual ${category} expense (${formatCurrency(avg)} avg).`;
        return;
    }

    hideAnomalyAlert();
}

function hideAnomalyAlert() {
    anomalyAlertEl.hidden = true;
    anomalyAlertEl.textContent = "";
}

function getFilteredExpenses() {
    let rows = [...state.expenses];

    const search = filters.search.value.trim().toLowerCase();
    if (search) {
        rows = rows.filter((item) =>
            [item.title, item.notes, item.paymentMethod, item.category]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search)
        );
    }

    if (filters.type.value !== "all") {
        const recurringWanted = filters.type.value === "recurring";
        rows = rows.filter((item) => item.recurring === recurringWanted);
    }

    if (filters.category.value !== "all") {
        rows = rows.filter((item) => item.category === filters.category.value);
    }

    if (filters.fromDate.value) {
        rows = rows.filter((item) => item.date >= filters.fromDate.value);
    }

    if (filters.toDate.value) {
        rows = rows.filter((item) => item.date <= filters.toDate.value);
    }

    const sortBy = filters.sortBy.value;
    rows.sort((a, b) => {
        if (sortBy === "date-asc") return a.date.localeCompare(b.date);
        if (sortBy === "date-desc") return b.date.localeCompare(a.date);
        if (sortBy === "amount-asc") return a.amount - b.amount;
        if (sortBy === "amount-desc") return b.amount - a.amount;
        return a.title.localeCompare(b.title);
    });

    return rows;
}

function renderTable(rows) {
    if (!rows.length) {
        tableBody.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    tableBody.innerHTML = rows.map((item) => `
        <tr>
            <td>${escapeHtml(item.title)}${item.notes ? `<div class="muted-note">${escapeHtml(item.notes)}</div>` : ""}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td>${formatDate(item.date)}</td>
            <td>${escapeHtml(item.paymentMethod)}</td>
            <td>
                <span class="badge ${item.recurring ? "badge-recurring" : "badge-onetime"}">
                    ${item.recurring ? "Recurring" : "One-time"}
                </span>
            </td>
            <td>
                <div class="row-actions">
                    <button class="row-edit" data-action="edit" data-id="${item.id}">Edit</button>
                    <button class="row-delete" data-action="delete" data-id="${item.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.getAttribute("data-id");
    const action = button.getAttribute("data-action");
    const numericId = Number(id);

    if (action === "delete") {
        const deletedExpense = state.expenses.find((item) => item.id === numericId) || null;
        setLoading(true);
        try {
            await apiRequest(`/${numericId}`, { method: "DELETE" });
            await loadExpensesFromServer();
            await loadBudgetSummary();
            rememberDeletedExpense(deletedExpense);
            refresh();
            showToast("Expense deleted. You can undo it.");
        } catch (error) {
            showToast("Delete failed");
            console.error(error);
        } finally {
            setLoading(false);
        }
        return;
    }

    if (action === "edit") {
        const expense = state.expenses.find((item) => item.id === numericId);
        if (!expense) return;

        state.editingId = Number(expense.id);
        qs("title").value = expense.title;
        qs("amount").value = String(expense.amount);
        qs("date").value = expense.date;
        qs("category").value = expense.category;
        qs("paymentMethod").value = expense.paymentMethod;
        qs("notes").value = expense.notes || "";
        qs("recurring").checked = Boolean(expense.recurring);
        controls.cancelEdit.hidden = false;
        qs("saveBtn").textContent = "Update Expense";
        updateFormAssist();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function rememberDeletedExpense(expense) {
    if (!expense) {
        state.lastDeletedExpense = null;
        undoDeleteBtn.disabled = true;
        return;
    }

    state.lastDeletedExpense = {
        title: expense.title,
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        notes: expense.notes || "",
        recurring: Boolean(expense.recurring)
    };

    undoDeleteBtn.disabled = false;

    if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
    }

    undoTimeoutId = setTimeout(() => {
        state.lastDeletedExpense = null;
        undoDeleteBtn.disabled = true;
    }, 12000);
}

async function undoDelete() {
    if (!state.lastDeletedExpense) {
        showToast("Nothing to undo");
        undoDeleteBtn.disabled = true;
        return;
    }

    setLoading(true);
    try {
        await createExpense(state.lastDeletedExpense);
        state.lastDeletedExpense = null;
        undoDeleteBtn.disabled = true;
        if (undoTimeoutId) {
            clearTimeout(undoTimeoutId);
            undoTimeoutId = null;
        }
        await loadExpensesFromServer();
        refresh();
        showToast("Deleted expense restored");
    } catch (error) {
        showToast(error.message || "Undo failed");
        console.error(error);
    } finally {
        setLoading(false);
    }
}

async function setBudget() {
    const initial = state.budgetSummary?.budget > 0 ? String(state.budgetSummary.budget) : "";
    const value = window.prompt("Set your monthly budget", initial);
    if (value === null) return;

    const budget = Number(value);
    if (!Number.isFinite(budget) || budget <= 0) {
        showToast("Enter a valid budget amount");
        return;
    }

    setLoading(true);
    try {
        await updateBudget(budget);
        refresh();
        showToast("Monthly budget updated");
    } catch (error) {
        showToast("Could not update budget");
        console.error(error);
    } finally {
        setLoading(false);
    }
}

function renderStats(filteredRows) {
    const total = state.expenses.reduce((sum, item) => sum + item.amount, 0);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthRows = state.expenses.filter((item) => item.date.startsWith(currentMonth));
    const monthTotal = currentMonthRows.reduce((sum, item) => sum + item.amount, 0);

    const budgetAmount = Number(state.budgetSummary?.budget || 0);
    const remainingRaw = budgetAmount - monthTotal;
    const remaining = Math.max(remainingRaw, 0);

    totalSpendEl.textContent = formatCurrency(total);
    monthSpendEl.textContent = formatCurrency(monthTotal);
    remainingBudgetEl.textContent = budgetAmount > 0 ? formatCurrency(remainingRaw) : "Set budget";

    activeMonthLabelEl.textContent = `Month: ${state.budgetSummary?.month || currentMonth}`;

    budgetLabelEl.textContent = budgetAmount > 0
        ? `${formatCurrency(budgetAmount)} budget set`
        : "No budget set yet";

    const ratio = budgetAmount > 0 ? Math.min((monthTotal / budgetAmount) * 100, 100) : 0;
    budgetBar.style.width = `${ratio}%`;

    if (!budgetAmount) {
        budgetStatusEl.textContent = "Set your monthly budget to unlock burn tracking.";
        budgetLockNoteEl.textContent = "";
    } else if (monthTotal >= budgetAmount) {
        budgetStatusEl.textContent = "Budget exceeded. Increase budget before adding new expenses.";
        budgetLockNoteEl.textContent = "Entry locked for this month until budget is increased.";
    } else if (ratio > 80) {
        budgetStatusEl.textContent = "Approaching budget limit. Consider lower-priority cuts.";
        budgetLockNoteEl.textContent = "";
    } else {
        budgetStatusEl.textContent = `On track. ${formatCurrency(remaining)} remaining this month.`;
        budgetLockNoteEl.textContent = "";
    }

    applyBudgetLockUI(monthTotal, budgetAmount);

    renderCategoryChart(filteredRows);
    renderDeepInsights(filteredRows, monthTotal, budgetAmount);
    renderMonthlyTrend();
    renderDailyFocus();
    renderMonthlySummary(currentMonthRows, monthTotal, budgetAmount);
}

function applyBudgetLockUI(monthTotal, budgetAmount) {
    const locked = budgetAmount > 0 && monthTotal >= budgetAmount;
    const entrySection = document.querySelector(".entry");
    if (!entrySection) return;

    entrySection.classList.toggle("entry-locked", locked);

    if (!state.editingId) {
        qs("saveBtn").disabled = state.loading || locked;
    }
}

function renderDeepInsights(filteredRows, monthTotal, budgetAmount) {
    const map = {};
    let recurringTotal = 0;
    const dailySet = new Set();
    let largest = 0;

    filteredRows.forEach((item) => {
        map[item.category] = (map[item.category] || 0) + item.amount;
        if (item.recurring) {
            recurringTotal += item.amount;
        }
        dailySet.add(item.date);
        largest = Math.max(largest, item.amount);
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top = entries[0];
    const filteredTotal = filteredRows.reduce((sum, item) => sum + item.amount, 0);
    const recurringShare = filteredTotal > 0 ? (recurringTotal / filteredTotal) * 100 : 0;
    const averagePerDay = dailySet.size > 0 ? filteredTotal / dailySet.size : 0;

    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthSpend = day > 0 ? (monthTotal / day) * daysInMonth : 0;

    topCategoryInsightEl.textContent = top
        ? `${top[0]} (${Math.round((top[1] / Math.max(filteredTotal, 1)) * 100)}%)`
        : "-";
    recurringShareInsightEl.textContent = `${Math.round(recurringShare)}%`;
    dailyAverageInsightEl.textContent = formatCurrency(averagePerDay);
    projectionInsightEl.textContent = formatCurrency(projectedMonthSpend);

    if (budgetAmount > 0 && projectedMonthSpend > budgetAmount) {
        projectionInsightEl.textContent += " (over)";
    }
}

function renderMonthlyTrend() {
    if (!trendCtx || !trendCanvas) return;

    const monthMap = {};
    state.expenses.forEach((item) => {
        const key = item.date.slice(0, 7);
        monthMap[key] = (monthMap[key] || 0) + item.amount;
    });

    const now = new Date();
    const labels = [];
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toISOString().slice(0, 7));
    }

    const values = labels.map((key) => monthMap[key] || 0);
    const maxValue = Math.max(...values, 1);

    trendCtx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);

    const left = 28;
    const bottom = 142;
    const chartWidth = 304;
    const barGap = 8;
    const barWidth = (chartWidth - (barGap * (values.length - 1))) / values.length;

    values.forEach((value, idx) => {
        const ratio = value / maxValue;
        const barHeight = ratio * 90;
        const x = left + idx * (barWidth + barGap);
        const y = bottom - barHeight;

        trendCtx.fillStyle = "#0f766e";
        trendCtx.fillRect(x, y, barWidth, barHeight);

        trendCtx.fillStyle = "#5a6774";
        trendCtx.font = "11px Space Grotesk";
        trendCtx.textAlign = "center";
        trendCtx.fillText(labels[idx].slice(5), x + (barWidth / 2), 158);
    });
}

function renderDailyFocus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toLocalDateKey(today);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const todayRows = state.expenses.filter((item) => item.date === todayKey);
    const todaySpend = todayRows.reduce((sum, item) => sum + item.amount, 0);

    const weekSpend = state.expenses
        .filter((item) => {
            const d = toDateAtMidnight(item.date);
            return d >= sevenDaysAgo && d <= today;
        })
        .reduce((sum, item) => sum + item.amount, 0);

    const largestToday = todayRows.reduce((max, item) => Math.max(max, item.amount), 0);

    todaySpendInsightEl.textContent = formatCurrency(todaySpend);
    weekSpendInsightEl.textContent = formatCurrency(weekSpend);
    largestTodayInsightEl.textContent = formatCurrency(largestToday);
    const streak = computeNoSpendStreak(today);
    streakInsightEl.textContent = `${streak} day${streak === 1 ? "" : "s"}`;

    renderDueSoonRecurring(today);
    renderRecentTemplates();
}

function renderMonthlySummary(currentMonthRows, monthTotal, budgetAmount) {
    if (!monthlySummaryListEl) return;

    if (!currentMonthRows.length) {
        monthlySummaryListEl.innerHTML = "<li>No entries yet this month. Add expenses to generate a summary.</li>";
        return;
    }

    const monthDays = new Date().getDate();
    const avgPerDay = monthTotal / Math.max(monthDays, 1);
    const topCategory = getTopCategory(currentMonthRows);
    const largestExpense = currentMonthRows.reduce((best, item) => item.amount > best.amount ? item : best, currentMonthRows[0]);
    const projected = projectEndOfMonthSpend(monthTotal);

    const summaryLines = [
        `You spent ${formatCurrency(monthTotal)} this month so far (${formatCurrency(avgPerDay)} per day).`,
        topCategory
            ? `${escapeHtml(topCategory.name)} leads at ${formatCurrency(topCategory.amount)} (${topCategory.share}% of this month).`
            : "No category trend yet.",
        `Largest transaction: ${escapeHtml(largestExpense.title)} at ${formatCurrency(largestExpense.amount)}.`
    ];

    if (budgetAmount > 0) {
        const remaining = budgetAmount - monthTotal;
        summaryLines.push(`Budget status: ${remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over budget`}.`);

        if (projected > budgetAmount) {
            summaryLines.push(buildCutSuggestion(currentMonthRows, projected - budgetAmount));
        } else {
            summaryLines.push("Projection looks healthy based on current pace.");
        }
    } else {
        summaryLines.push("Set a monthly budget to unlock auto budget coaching.");
    }

    monthlySummaryListEl.innerHTML = summaryLines
        .map((line) => `<li>${line}</li>`)
        .join("");
}

function getTopCategory(rows) {
    const map = {};
    rows.forEach((item) => {
        map[item.category] = (map[item.category] || 0) + item.amount;
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return null;

    const [name, amount] = entries[0];
    const total = rows.reduce((sum, item) => sum + item.amount, 0);
    const share = Math.round((amount / Math.max(total, 1)) * 100);
    return { name, amount, share };
}

function projectEndOfMonthSpend(monthTotal) {
    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return day > 0 ? (monthTotal / day) * daysInMonth : 0;
}

function buildCutSuggestion(rows, overshoot) {
    const categoryTotals = {};
    rows.forEach((item) => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    });

    const ranked = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

    if (!ranked.length) {
        return "Projection is over target. Try reducing non-essential expenses this week.";
    }

    const primaryCut = Math.round(overshoot * 0.6);
    const secondaryCut = Math.round(overshoot * 0.4);
    const first = escapeHtml(ranked[0]?.[0] || "Top category");
    const second = escapeHtml(ranked[1]?.[0] || "Other");

    return `To stay on budget, try cutting about ${formatCurrency(primaryCut)} from ${first} and ${formatCurrency(secondaryCut)} from ${second}.`;
}

function computeNoSpendStreak(today) {
    const spentDates = new Set(state.expenses.map((item) => item.date));
    let streak = 0;

    for (let i = 0; i < 365; i += 1) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = toLocalDateKey(d);
        if (spentDates.has(key)) {
            break;
        }
        streak += 1;
    }

    return streak;
}

function renderDueSoonRecurring(today) {
    const recurringRows = state.expenses.filter((item) => item.recurring);
    if (!recurringRows.length) {
        dueSoonListEl.innerHTML = "<li>No recurring expenses yet.</li>";
        return;
    }

    const recurringTemplates = new Map();
    recurringRows.forEach((item) => {
        const key = `${item.title}|${item.category}|${item.paymentMethod}|${Number(item.amount).toFixed(2)}`;
        const existing = recurringTemplates.get(key);
        if (!existing || item.date > existing.date) {
            recurringTemplates.set(key, item);
        }
    });

    const dueSoon = Array.from(recurringTemplates.values())
        .map((item) => {
            const sourceDate = toDateAtMidnight(item.date);
            const targetDay = sourceDate.getDate();
            const nextDue = new Date(today.getFullYear(), today.getMonth(), Math.min(targetDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()));
            if (nextDue < today) {
                const daysInNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
                nextDue.setMonth(nextDue.getMonth() + 1);
                nextDue.setDate(Math.min(targetDay, daysInNextMonth));
            }

            const diff = Math.round((nextDue.getTime() - today.getTime()) / 86400000);
            return {
                title: item.title,
                amount: item.amount,
                daysUntil: diff
            };
        })
        .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 10)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

    if (!dueSoon.length) {
        dueSoonListEl.innerHTML = "<li>Nothing due in the next 10 days.</li>";
        return;
    }

    dueSoonListEl.innerHTML = dueSoon.map((item) => `
        <li>
            <span>${escapeHtml(item.title)}</span>
            <strong>${item.daysUntil === 0 ? "Due today" : `in ${item.daysUntil} day${item.daysUntil === 1 ? "" : "s"}`} • ${formatCurrency(item.amount)}</strong>
        </li>
    `).join("");
}

function renderRecentTemplates() {
    const sorted = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date));
    const unique = [];
    const seen = new Set();

    sorted.forEach((item) => {
        const key = `${item.title}|${item.category}|${item.paymentMethod}|${Number(item.amount).toFixed(2)}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(item);
    });

    recentTemplates = unique.slice(0, 6);

    if (!recentTemplates.length) {
        recentTemplatesEl.innerHTML = "<span class=\"muted-note\">Add a few expenses to build quick templates.</span>";
        return;
    }

    recentTemplatesEl.innerHTML = recentTemplates.map((item, idx) => `
        <button type="button" class="template-chip" data-template-idx="${idx}">
            ${escapeHtml(item.title)} • ${formatCurrency(item.amount)}
        </button>
    `).join("");
}

function handleTemplateClick(event) {
    const button = event.target.closest("button[data-template-idx]");
    if (!button) return;

    const index = Number(button.getAttribute("data-template-idx"));
    const template = recentTemplates[index];
    if (!template) return;

    qs("title").value = template.title;
    qs("amount").value = String(template.amount);
    qs("category").value = template.category;
    qs("paymentMethod").value = template.paymentMethod;
    qs("notes").value = template.notes || "";
    qs("recurring").checked = Boolean(template.recurring);
    qs("date").value = toLocalDateKey(new Date());
    formError.textContent = "";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Template applied");
}

function renderCategoryChart(rows) {
    const map = {};
    rows.forEach((item) => {
        map[item.category] = (map[item.category] || 0) + item.amount;
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);

    chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

    if (!entries.length) {
        chartCtx.fillStyle = "#7b8790";
        chartCtx.font = "600 14px Space Grotesk";
        chartCtx.textAlign = "center";
        chartCtx.fillText("No data for selected filters", chartCanvas.width / 2, chartCanvas.height / 2);
        categoryLegend.innerHTML = "";
        return;
    }

    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    let start = -Math.PI / 2;
    const centerX = chartCanvas.width / 2;
    const centerY = chartCanvas.height / 2;
    const radius = 110;

    entries.forEach(([category, amount]) => {
        const angle = (amount / total) * Math.PI * 2;
        chartCtx.beginPath();
        chartCtx.moveTo(centerX, centerY);
        chartCtx.arc(centerX, centerY, radius, start, start + angle);
        chartCtx.closePath();
        chartCtx.fillStyle = CATEGORY_COLORS[category] || "#64748b";
        chartCtx.fill();
        start += angle;
    });

    chartCtx.beginPath();
    chartCtx.arc(centerX, centerY, 52, 0, Math.PI * 2);
    chartCtx.fillStyle = "#ffffff";
    chartCtx.fill();

    chartCtx.fillStyle = "#1f2937";
    chartCtx.font = "700 15px Outfit";
    chartCtx.textAlign = "center";
    chartCtx.fillText("Filtered", centerX, centerY - 4);
    chartCtx.font = "700 14px Space Grotesk";
    chartCtx.fillText(formatCurrency(total), centerX, centerY + 16);

    categoryLegend.innerHTML = entries.map(([category, amount]) => {
        const pct = Math.round((amount / total) * 100);
        const color = CATEGORY_COLORS[category] || "#64748b";
        return `
            <li>
                <span><span class="legend-swatch" style="background:${color}"></span>${escapeHtml(category)}</span>
                <strong>${formatCurrency(amount)} (${pct}%)</strong>
            </li>
        `;
    }).join("");
}

function refreshCategoryOptions() {
    const categories = new Set(state.expenses.map((item) => item.category));
    const selected = filters.category.value;

    filters.category.innerHTML = '<option value="all">All Categories</option>' +
        Array.from(categories)
            .sort((a, b) => a.localeCompare(b))
            .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
            .join("");

    if (categories.has(selected)) {
        filters.category.value = selected;
    }
}

function renderQuickCategories() {
    const categories = Object.keys(CATEGORY_COLORS);
    quickCategories.innerHTML = categories.map((cat) =>
        `<button type="button" class="chip" data-quick-category="${cat}">${cat}</button>`
    ).join("");

    quickCategories.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-quick-category]");
        if (!button) return;
        qs("category").value = button.getAttribute("data-quick-category");
    });
}

function refresh() {
    const rows = getFilteredExpenses();
    renderTable(rows);
    renderStats(rows);
}

async function createExpense(payload) {
    await apiRequest("", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

async function seedDemoData() {
    const today = new Date();
    const iso = (daysAgo) => {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().slice(0, 10);
    };

    const demoRows = [
        {
            title: "Monthly Rent",
            amount: 1100,
            date: iso(4),
            category: "Housing",
            paymentMethod: "Bank Transfer",
            notes: "Apartment payment",
            recurring: true
        },
        {
            title: "Grocery Run",
            amount: 134.78,
            date: iso(2),
            category: "Food",
            paymentMethod: "Card",
            notes: "Weekly stock-up",
            recurring: false
        },
        {
            title: "Fuel",
            amount: 54.25,
            date: iso(3),
            category: "Transport",
            paymentMethod: "UPI/Wallet",
            notes: "Car refill",
            recurring: false
        },
        {
            title: "Streaming Subscription",
            amount: 15.99,
            date: iso(7),
            category: "Entertainment",
            paymentMethod: "Card",
            notes: "Monthly plan",
            recurring: true
        },
        {
            title: "Emergency Fund",
            amount: 220,
            date: iso(1),
            category: "Savings",
            paymentMethod: "Bank Transfer",
            notes: "Monthly transfer",
            recurring: true
        }
    ];

    setLoading(true);
    try {
        for (const row of demoRows) {
            await createExpense(row);
        }
        await loadExpensesFromServer();
        refresh();
        showToast("Demo data loaded");
    } catch (error) {
        showToast("Could not load demo data");
        console.error(error);
    } finally {
        setLoading(false);
    }

    if (!state.budgetSummary?.budget) {
        await updateBudget(2600);
    }
}

async function hardReset() {
    if (!window.confirm("This will remove all expense data and budget. Continue?")) {
        return;
    }

    setLoading(true);
    try {
        await apiRequest("", { method: "DELETE" });
        state.expenses = [];
        state.editingId = null;
        clearForm();
        clearFilters();
        await loadBudgetSummary();
        refreshCategoryOptions();
        refresh();
        showToast("All data reset");
    } catch (error) {
        showToast("Reset failed");
        console.error(error);
    } finally {
        setLoading(false);
    }
}

function exportCsv() {
    if (!state.expenses.length) {
        showToast("No expense data to export");
        return;
    }

    const header = ["title", "amount", "date", "category", "paymentMethod", "notes", "recurring"];
    const rows = state.expenses.map((item) => [
        item.title,
        item.amount,
        item.date,
        item.category,
        item.paymentMethod,
        item.notes || "",
        item.recurring ? "true" : "false"
    ]);

    const csv = [header, ...rows]
        .map((line) => line.map(csvEscape).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `expense-pulse-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("CSV exported");
}

function csvEscape(value) {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
        return `"${text.replaceAll("\"", "\"\"")}"`;
    }
    return text;
}

async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const parsed = parseCsv(String(reader.result || ""));
            const imported = parsed
                .filter((row) => row.title && row.amount && row.date && row.category && row.paymentMethod)
                .map((row) => ({
                    title: String(row.title).trim(),
                    amount: Number(row.amount),
                    date: String(row.date),
                    category: String(row.category),
                    paymentMethod: String(row.paymentMethod),
                    notes: String(row.notes || ""),
                    recurring: String(row.recurring).toLowerCase() === "true"
                }))
                .filter((item) => !validateExpense(item));

            setLoading(true);
            for (const item of imported) {
                await createExpense(item);
            }
            await loadExpensesFromServer();
            refresh();
            showToast(`${imported.length} row(s) imported`);
        } catch {
            showToast("Could not import CSV file");
        } finally {
            setLoading(false);
            controls.importInput.value = "";
        }
    };

    reader.readAsText(file);
}

function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];

    const headers = splitCsvLine(lines[0]).map((h) => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i += 1) {
        const values = splitCsvLine(lines[i]);
        if (!values.length || values.every((v) => !v.trim())) continue;
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] ?? "";
        });
        rows.push(row);
    }

    return rows;
}

function splitCsvLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

init().catch((error) => {
    console.error(error);
    showToast("Initialization failed");
});
