const currency = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });
const today = new Date().toISOString().split('T')[0];

const el = (id) => document.getElementById(id);

const form = el('transaction-form');
const descInput = el('desc');
const amountInput = el('amount');
const typeInput = el('type');
const categoryInput = el('category');
const dateInput = el('date');
const filterEl = el('filter');
const listEl = el('transaction-list');
const totalBalanceEl = el('total-balance');
const totalIncomeEl = el('total-income');
const totalExpenseEl = el('total-expense');
const reputationScoreEl = el('reputation-score');
const monthlyBudgetInput = el('monthly-budget');
const saveBudgetBtn = el('save-budget');
const budgetProgressEl = el('budget-progress');
const budgetStatusEl = el('budget-status');
const streakStatusEl = el('streak-status');
const insightsEl = el('insights');
const clearDataBtn = el('clear-data');
const themeToggle = el('theme-toggle');
const chatForm = el('chat-form');
const chatInput = el('chat-input');
const chatWindow = el('chat-window');
const reportOutputEl = el('report-output');
const generateReportBtn = el('generate-report');
const copyReportBtn = el('copy-report');
const profileNameEl = el('profile-name');
const profileTaglineEl = el('profile-tagline');
const saveProfileBtn = el('save-profile');
const profilePreviewEl = el('profile-preview');

dateInput.value = today;

let transactions = JSON.parse(localStorage.getItem('transactions_v3')) || [];
let monthlyBudget = Number(localStorage.getItem('monthly_budget_v3')) || 0;
let chatHistory = JSON.parse(localStorage.getItem('assistant_history_v3')) || [];
let profile = JSON.parse(localStorage.getItem('public_profile_v1')) || { name: '', tagline: '' };

function saveState() {
  localStorage.setItem('transactions_v3', JSON.stringify(transactions));
  localStorage.setItem('monthly_budget_v3', monthlyBudget.toString());
  localStorage.setItem('assistant_history_v3', JSON.stringify(chatHistory.slice(-10)));
  localStorage.setItem('public_profile_v1', JSON.stringify(profile));
}

function getSummary() {
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense };
}

function getMonthlyExpense() {
  const now = new Date();
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, t) => sum + t.amount, 0);
}

function getTopCategories() {
  const totalByCategory = {};
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    totalByCategory[t.category] = (totalByCategory[t.category] || 0) + t.amount;
  });
  return Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);
}

function getConsistencyStreak() {
  const expenseDates = [...new Set(transactions.filter((t) => t.type === 'expense').map((t) => t.date))].sort().reverse();
  if (!expenseDates.length) return 0;
  let streak = 1;
  let cursor = new Date(expenseDates[0]);
  for (let i = 1; i < expenseDates.length; i += 1) {
    const current = new Date(expenseDates[i]);
    const prevDay = new Date(cursor);
    prevDay.setDate(prevDay.getDate() - 1);
    if (current.toDateString() === prevDay.toDateString()) {
      streak += 1;
      cursor = current;
    } else {
      break;
    }
  }
  return streak;
}

function getReputationScore() {
  const { income, expense } = getSummary();
  const monthlyExpense = getMonthlyExpense();
  const topCategories = getTopCategories();
  const streak = getConsistencyStreak();

  const volumeScore = Math.min(transactions.length * 3, 30);
  const budgetScore = monthlyBudget ? Math.max(0, 35 - Math.max(((monthlyExpense - monthlyBudget) / monthlyBudget) * 35, 0)) : 15;
  const savingsScore = income > 0 ? Math.min(Math.max(((income - expense) / income) * 35, 0), 25) : 0;
  const categoryScore = topCategories.length >= 2 ? 10 : 4;
  const streakScore = Math.min(streak * 2, 10);

  return Math.round(volumeScore + budgetScore + savingsScore + categoryScore + streakScore);
}

function renderSummary() {
  const { income, expense, balance } = getSummary();
  totalIncomeEl.textContent = currency.format(income);
  totalExpenseEl.textContent = currency.format(expense);
  totalBalanceEl.textContent = currency.format(balance);
  reputationScoreEl.textContent = `${getReputationScore()}/100`;
}

function renderTransactions() {
  const filter = filterEl.value;
  const filtered = transactions.filter((t) => (filter === 'all' ? true : t.type === filter));
  listEl.innerHTML = filtered.length ? '' : '<li class="list-group-item text-center text-muted py-4">No transactions yet.</li>';

  filtered.forEach((t) => {
    const li = document.createElement('li');
    li.className = `list-group-item ${t.type}`;
    li.innerHTML = `<div class="d-flex justify-content-between gap-3 align-items-start"><div><p class="fw-semibold mb-1">${t.desc}</p><small class="text-muted">${t.category} • ${new Date(t.date).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })} • ${t.type}</small></div><div class="text-end"><p class="fw-semibold mb-1">${currency.format(t.amount)}</p><button onclick="removeTransaction(${t.id})" class="btn btn-sm btn-outline-danger">Delete</button></div></div>`;
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
  } else {
    const monthlyExpense = getMonthlyExpense();
    const usedPct = Math.min((monthlyExpense / monthlyBudget) * 100, 100);
    budgetProgressEl.style.width = `${usedPct}%`;
    budgetProgressEl.textContent = `${usedPct.toFixed(0)}% used`;
    budgetProgressEl.className = `progress-bar ${usedPct < 60 ? 'bg-success' : usedPct < 85 ? 'bg-warning' : 'bg-danger'}`;
    const left = monthlyBudget - monthlyExpense;
    budgetStatusEl.textContent = left >= 0 ? `You have ${currency.format(left)} left this month.` : `You are ${currency.format(Math.abs(left))} over budget this month.`;
  }
  streakStatusEl.textContent = `Consistency streak: ${getConsistencyStreak()} day(s) of tracked spending.`;
}

function renderInsights() {
  const { income, expense } = getSummary();
  const top = getTopCategories();
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const topText = top.length ? top.map(([n, v]) => `${n}: ${currency.format(v)}`).join(' • ') : 'No category data yet.';
  insightsEl.innerHTML = `<ul class="mb-0 insight-list"><li><strong>Savings rate:</strong> ${savingsRate.toFixed(1)}%</li><li><strong>Top expense categories:</strong> ${topText}</li><li><strong>Reputation suggestion:</strong> Post your monthly report weekly to show consistency.</li></ul>`;
}

function renderProfile() {
  profileNameEl.value = profile.name;
  profileTaglineEl.value = profile.tagline;
  const name = profile.name || 'Your Name';
  const tagline = profile.tagline || 'Budget discipline in public.';
  profilePreviewEl.innerHTML = `<h3 class="h6 mb-1">${name}</h3><p class="mb-1">${tagline}</p><small class="text-muted">Reputation score: ${getReputationScore()}/100</small>`;
}

function generateReportText() {
  const { income, expense, balance } = getSummary();
  const monthlyExpense = getMonthlyExpense();
  const score = getReputationScore();
  const topText = getTopCategories().map(([name, total]) => `${name} (${currency.format(total)})`).join(', ') || 'N/A';
  const status = monthlyBudget ? (monthlyExpense <= monthlyBudget ? 'Under budget ✅' : 'Over budget ⚠️') : 'No budget set yet';
  const author = profile.name || 'Anonymous Builder';

  return `📊 ${author} — Monthly Money Discipline Report\n\n• Income: ${currency.format(income)}\n• Expense: ${currency.format(expense)}\n• Net balance: ${currency.format(balance)}\n• Budget status: ${status}\n• Top spend categories: ${topText}\n• Consistency streak: ${getConsistencyStreak()} day(s)\n• Reputation score: ${score}/100\n\nI am building my finance reputation in public with BudgetBuddy AI. #BuildInPublic #MoneyDiscipline`;
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
  if (q.includes('post') || q.includes('reputation') || q.includes('online')) {
    return 'Post one weekly insight: budget status, top category cut, and your score trend. Consistency builds trust faster than perfection.';
  }
  if (q.includes('save')) return 'To save more, start with your top expense category and cut it by 10% this week.';
  if (q.includes('budget')) return monthlyBudget ? budgetStatusEl.textContent : 'Set a monthly budget first so I can coach you better.';
  return 'Ask about savings, spending cuts, or what to post publicly for reputation growth.';
}

function renderChat() {
  chatWindow.innerHTML = '';
  if (!chatHistory.length) {
    addAssistantMessage('assistant', 'Hi! I am your BudgetBuddy AI coach. I can help you improve money habits and craft proof posts for your reputation.');
    return;
  }
  chatHistory.forEach((m) => addAssistantMessage(m.role, m.text));
}

function updateUI() {
  renderSummary();
  renderTransactions();
  renderBudgetProgress();
  renderInsights();
  renderProfile();
  renderChat();
  saveState();
}

function addTransaction(e) {
  e.preventDefault();
  const amount = Number(amountInput.value);
  if (!descInput.value.trim() || !typeInput.value || !categoryInput.value || !dateInput.value || amount <= 0) return;
  transactions.unshift({ id: Date.now(), desc: descInput.value.trim(), amount, type: typeInput.value, category: categoryInput.value, date: dateInput.value });
  form.reset();
  dateInput.value = today;
  updateUI();
}

function removeTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  updateUI();
}

window.removeTransaction = removeTransaction;

form.addEventListener('submit', addTransaction);
filterEl.addEventListener('change', renderTransactions);

saveBudgetBtn.addEventListener('click', () => {
  monthlyBudget = Number(monthlyBudgetInput.value) || 0;
  updateUI();
});

saveProfileBtn.addEventListener('click', () => {
  profile = { name: profileNameEl.value.trim(), tagline: profileTaglineEl.value.trim() };
  updateUI();
});

generateReportBtn.addEventListener('click', () => {
  reportOutputEl.value = generateReportText();
});

copyReportBtn.addEventListener('click', async () => {
  if (!reportOutputEl.value) reportOutputEl.value = generateReportText();
  try {
    await navigator.clipboard.writeText(reportOutputEl.value);
    copyReportBtn.textContent = 'Copied!';
    setTimeout(() => { copyReportBtn.textContent = 'Copy report text'; }, 1200);
  } catch {
    copyReportBtn.textContent = 'Copy failed';
  }
});

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

clearDataBtn.addEventListener('click', () => {
  transactions = [];
  monthlyBudget = 0;
  chatHistory = [];
  reportOutputEl.value = '';
  updateUI();
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
  themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
});

updateUI();
