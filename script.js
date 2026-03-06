const currency = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });
const today = new Date().toISOString().split('T')[0];

const form = document.getElementById('transaction-form');
const descInput = document.getElementById('desc');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const filterEl = document.getElementById('filter');
const listEl = document.getElementById('transaction-list');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const monthlyBudgetInput = document.getElementById('monthly-budget');
const saveBudgetBtn = document.getElementById('save-budget');
const budgetProgressEl = document.getElementById('budget-progress');
const budgetStatusEl = document.getElementById('budget-status');
const insightsEl = document.getElementById('insights');
const clearDataBtn = document.getElementById('clear-data');
const themeToggle = document.getElementById('theme-toggle');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatWindow = document.getElementById('chat-window');

dateInput.value = today;

let transactions = JSON.parse(localStorage.getItem('transactions_v2')) || [];
let monthlyBudget = Number(localStorage.getItem('monthly_budget')) || 0;
let chatHistory = JSON.parse(localStorage.getItem('assistant_history')) || [];

function saveState() {
  localStorage.setItem('transactions_v2', JSON.stringify(transactions));
  localStorage.setItem('monthly_budget', monthlyBudget.toString());
  localStorage.setItem('assistant_history', JSON.stringify(chatHistory.slice(-10)));
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
  themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', toggleTheme);

function addTransaction(e) {
  e.preventDefault();
  const amount = Number(amountInput.value);
  if (!descInput.value.trim() || !typeInput.value || !categoryInput.value || !dateInput.value || amount <= 0) {
    return;
  }

  transactions.unshift({
    id: Date.now(),
    desc: descInput.value.trim(),
    amount,
    type: typeInput.value,
    category: categoryInput.value,
    date: dateInput.value
  });

  form.reset();
  dateInput.value = today;
  updateUI();
}

function removeTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  updateUI();
}

window.removeTransaction = removeTransaction;

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getSummary() {
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense };
}

function getMonthlyExpense() {
  const now = new Date();
  return transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

function getTopCategories() {
  const categoryTotals = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  return Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function renderSummary() {
  const summary = getSummary();
  totalIncomeEl.textContent = currency.format(summary.income);
  totalExpenseEl.textContent = currency.format(summary.expense);
  totalBalanceEl.textContent = currency.format(summary.balance);
}

function renderTransactions() {
  const filter = filterEl.value;
  const filtered = transactions.filter((t) => (filter === 'all' ? true : t.type === filter));

  listEl.innerHTML = filtered.length
    ? ''
    : `<li class="list-group-item text-center text-muted py-4">No transactions yet. Start by adding your first entry.</li>`;

  filtered.forEach((t) => {
    const li = document.createElement('li');
    li.className = `list-group-item ${t.type}`;
    li.innerHTML = `
      <div class="d-flex justify-content-between gap-3 align-items-start">
        <div>
          <p class="fw-semibold mb-1">${t.desc}</p>
          <small class="text-muted">${t.category} • ${formatDate(t.date)} • ${t.type}</small>
        </div>
        <div class="text-end">
          <p class="fw-semibold mb-1">${currency.format(t.amount)}</p>
          <button onclick="removeTransaction(${t.id})" class="btn btn-sm btn-outline-danger">Delete</button>
        </div>
      </div>
    `;
    listEl.appendChild(li);
  });
}

function renderBudgetProgress() {
  monthlyBudgetInput.value = monthlyBudget || '';

  if (!monthlyBudget) {
    budgetProgressEl.style.width = '0%';
    budgetProgressEl.textContent = '0%';
    budgetProgressEl.className = 'progress-bar';
    budgetStatusEl.textContent = 'Set your monthly budget to unlock coaching insights.';
    return;
  }

  const monthlyExpense = getMonthlyExpense();
  const usedPct = Math.min((monthlyExpense / monthlyBudget) * 100, 100);

  budgetProgressEl.style.width = `${usedPct}%`;
  budgetProgressEl.textContent = `${usedPct.toFixed(0)}% used`;

  if (usedPct < 60) {
    budgetProgressEl.className = 'progress-bar bg-success';
  } else if (usedPct < 85) {
    budgetProgressEl.className = 'progress-bar bg-warning';
  } else {
    budgetProgressEl.className = 'progress-bar bg-danger';
  }

  const left = monthlyBudget - monthlyExpense;
  budgetStatusEl.textContent = left >= 0
    ? `You have ${currency.format(left)} left this month.`
    : `You are ${currency.format(Math.abs(left))} over budget this month.`;
}

function renderInsights() {
  const summary = getSummary();
  const topCategories = getTopCategories();
  const monthlyExpense = getMonthlyExpense();
  const savingsRate = summary.income > 0 ? ((summary.income - summary.expense) / summary.income) * 100 : 0;

  const topCategoryText = topCategories.length
    ? topCategories.map(([name, total]) => `${name}: ${currency.format(total)}`).join(' • ')
    : 'No expense categories yet.';

  const budgetWarning = monthlyBudget
    ? monthlyExpense > monthlyBudget
      ? `⚠️ You are currently over your monthly expense target.`
      : `✅ You are within your monthly expense target.`
    : 'Set a monthly target to get budget pressure alerts.';

  insightsEl.innerHTML = `
    <ul class="mb-0 insight-list">
      <li><strong>Savings rate:</strong> ${savingsRate.toFixed(1)}% ${savingsRate < 20 ? '(Aim for at least 20% if possible)' : '(Great job!)'}</li>
      <li><strong>Top expense categories:</strong> ${topCategoryText}</li>
      <li><strong>This month spending:</strong> ${currency.format(monthlyExpense)}</li>
      <li>${budgetWarning}</li>
    </ul>
  `;
}

function addAssistantMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-message ${role}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function answerBudgetQuestion(question) {
  const q = question.toLowerCase();
  const summary = getSummary();
  const topCategories = getTopCategories();
  const monthlyExpense = getMonthlyExpense();
  const left = monthlyBudget - monthlyExpense;

  if (q.includes('save') || q.includes('savings')) {
    const target = summary.income * 0.2;
    const current = summary.income - summary.expense;
    const gap = target - current;
    return gap > 0
      ? `To hit a 20% savings target, reduce expenses by about ${currency.format(gap)} or increase income by that amount.`
      : `You are already above a 20% savings target. Keep it consistent by automating transfers after each income.`;
  }

  if (q.includes('cut') || q.includes('reduce') || q.includes('spend less')) {
    if (!topCategories.length) {
      return 'Add a few expense entries first, then I can identify where to reduce spending fastest.';
    }
    const [name, amount] = topCategories[0];
    return `Your biggest spending category is ${name} (${currency.format(amount)}). Try a 10% cut there first for quick impact.`;
  }

  if (q.includes('budget') || q.includes('month')) {
    if (!monthlyBudget) {
      return 'Set your monthly budget first, and I will track over/under status automatically.';
    }
    return left >= 0
      ? `You are within budget with ${currency.format(left)} left this month.`
      : `You are over budget by ${currency.format(Math.abs(left))}. Pause non-essential spending for the rest of the month.`;
  }

  if (q.includes('income') || q.includes('earn')) {
    return `Total income tracked is ${currency.format(summary.income)}. Consider adding a side-income category to monitor growth experiments.`;
  }

  return 'I can help with saving strategies, spending cuts, and monthly budget planning. Ask something like: “How can I reduce this month’s spending?”';
}

function renderChat() {
  chatWindow.innerHTML = '';
  if (!chatHistory.length) {
    addAssistantMessage('assistant', 'Hi! I am your BudgetBuddy AI coach. Ask me how to save more, cut spending, or stay on budget.');
    return;
  }
  chatHistory.forEach((m) => addAssistantMessage(m.role, m.text));
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;

  chatHistory.push({ role: 'user', text: question });
  addAssistantMessage('user', question);

  const answer = answerBudgetQuestion(question);
  chatHistory.push({ role: 'assistant', text: answer });
  addAssistantMessage('assistant', answer);

  chatInput.value = '';
  saveState();
});

saveBudgetBtn.addEventListener('click', () => {
  monthlyBudget = Number(monthlyBudgetInput.value) || 0;
  updateUI();
});

clearDataBtn.addEventListener('click', () => {
  transactions = [];
  monthlyBudget = 0;
  chatHistory = [];
  updateUI();
});

filterEl.addEventListener('change', renderTransactions);
form.addEventListener('submit', addTransaction);

function updateUI() {
  renderSummary();
  renderTransactions();
  renderBudgetProgress();
  renderInsights();
  renderChat();
  saveState();
}

updateUI();
