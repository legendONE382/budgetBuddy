// Elements
const form = document.getElementById('transaction-form');
const descInput = document.getElementById('desc');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const listEl = document.getElementById('transaction-list');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const filterEl = document.getElementById('filter');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const navbar = document.querySelector('.navbar');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Theme
themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  body.classList.toggle('light-mode');
  navbar.classList.toggle('dark-mode');
  navbar.classList.toggle('light-mode');
  themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
});

// Add Transaction
form.addEventListener('submit', e => {
  e.preventDefault();
  const txn = {
    id: Date.now(),
    desc: descInput.value,
    amount: +amountInput.value,
    type: typeInput.value
  };
  transactions.push(txn);
  update();
  form.reset();
});

// Render & Update
filterEl.addEventListener('change', renderList);

function update() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  renderSummary();
  renderList();
}

function renderSummary() {
  const incomes = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  totalIncomeEl.textContent = `₦${incomes.toFixed(2)}`;
  totalExpenseEl.textContent = `₦${expenses.toFixed(2)}`;
  totalBalanceEl.textContent = `₦${(incomes - expenses).toFixed(2)}`;
}

function renderList() {
  const filter = filterEl.value;
  listEl.innerHTML = '';
  transactions
    .filter(t => filter === 'all' ? true : t.type === filter)
    .forEach(t => {
      const li = document.createElement('li');
      li.className = `list-group-item d-flex justify-content-between align-items-center ${t.type}`;
      li.innerHTML = `
        <div>
          <strong>${t.desc}</strong><br>
          <small>${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</small>
        </div>
        <div>
          ₦${t.amount.toFixed(2)}
          <button class="btn btn-sm btn-outline-danger ms-3" onclick="remove(${t.id})">&times;</button>
        </div>
      `;
      listEl.appendChild(li);
    });
}

function remove(id) {
  transactions = transactions.filter(t => t.id !== id);
  update();
}


// Initialize
update();
