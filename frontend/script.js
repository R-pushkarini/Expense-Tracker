const API_URL = 'http://localhost:5000/api';
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setDateToToday();
    
    // Auth Form Events
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    
    // Expense Form Events
    document.getElementById('expense-form').addEventListener('submit', handleAddExpense);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Filter and delete events
    document.getElementById('filter-category').addEventListener('input', filterExpenses);
    document.getElementById('clear-filter-btn').addEventListener('click', clearFilter);
    document.getElementById('delete-all-btn').addEventListener('click', deleteAllExpenses);
});

// Auth Functions
function toggleForms() {
    document.getElementById('loginForm').style.display = 
        document.getElementById('loginForm').style.display === 'none' ? 'block' : 'none';
    document.getElementById('signupForm').style.display = 
        document.getElementById('signupForm').style.display === 'none' ? 'block' : 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showApp();
            loadExpenses();
            errorDiv.classList.remove('show');
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Error: ' + error.message;
        errorDiv.classList.add('show');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const errorDiv = document.getElementById('signup-error');

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.classList.add('show');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            errorDiv.classList.remove('show');
            alert('Signup successful! Please login.');
            toggleForms();
            document.getElementById('signup-form').reset();
        } else {
            errorDiv.textContent = data.message || 'Signup failed';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Error: ' + error.message;
        errorDiv.classList.add('show');
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        currentUser = JSON.parse(user);
        showApp();
        loadExpenses();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function showApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
}

async function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showAuth();
    document.getElementById('login-form').reset();
    document.getElementById('expense-form').reset();
}

// Expense Functions
function setDateToToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

async function handleAddExpense(e) {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;

    try {
        const response = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ category, amount, description, date })
        });

        if (response.ok) {
            document.getElementById('expense-form').reset();
            setDateToToday();
            loadExpenses();
        } else {
            alert('Failed to add expense');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadExpenses() {
    try {
        const response = await fetch(`${API_URL}/expenses`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const expenses = await response.json();
            displayExpenses(expenses);
            updateStatistics(expenses);
        } else if (response.status === 401) {
            handleLogout();
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

function displayExpenses(expenses) {
    const tbody = document.getElementById('expenses-body');
    const noExpenses = document.getElementById('no-expenses');

    if (expenses.length === 0) {
        tbody.innerHTML = '';
        noExpenses.style.display = 'block';
        return;
    }

    noExpenses.style.display = 'none';
    tbody.innerHTML = expenses.map(expense => `
        <tr>
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>${expense.category}</td>
            <td>${expense.description}</td>
            <td>$${parseFloat(expense.amount).toFixed(2)}</td>
            <td>
                <button class="btn btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updateStatistics(expenses) {
    const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthExpenses = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    document.getElementById('total-expenses').textContent = `$${total.toFixed(2)}`;
    document.getElementById('month-expenses').textContent = `$${monthExpenses.toFixed(2)}`;
}

async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            const response = await fetch(`${API_URL}/expenses/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                loadExpenses();
            } else {
                alert('Failed to delete expense');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

function filterExpenses() {
    const filter = document.getElementById('filter-category').value.toLowerCase();
    const rows = document.querySelectorAll('#expenses-body tr');

    rows.forEach(row => {
        const category = row.cells[1].textContent.toLowerCase();
        row.style.display = category.includes(filter) ? '' : 'none';
    });
}

function clearFilter() {
    document.getElementById('filter-category').value = '';
    const rows = document.querySelectorAll('#expenses-body tr');
    rows.forEach(row => {
        row.style.display = '';
    });
}

async function deleteAllExpenses() {
    if (confirm('Are you sure you want to delete ALL expenses? This cannot be undone.')) {
        try {
            const response = await fetch(`${API_URL}/expenses/delete-all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                loadExpenses();
            } else {
                alert('Failed to delete all expenses');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}
