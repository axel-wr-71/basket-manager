// finances_view.js

import { supabase } from '../auth.js';

export function renderFinancesView() {
    console.log('[FINANCES] Rendering finances view...');
    
    const container = document.getElementById('finances-view-container');
    if (!container) {
        console.error('[FINANCES] Container not found');
        return;
    }
    
    container.innerHTML = `
        <div class="finances-modern-wrapper">
            <!-- NAGŁÓWEK -->
            <div class="finances-header">
                <div class="header-content">
                    <div>
                        <h1>💰 <span style="color:#ff6d00">FINANSE</span> DRUŻYNY</h1>
                        <p>Kompletne zarządzanie finansami | Aktualne na: ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="header-actions">
                        <button id="btn-refresh-finances" class="btn-finance-secondary">
                            🔄 Odśwież
                        </button>
                        <button id="btn-export-report" class="btn-finance-primary">
                            📥 Raport PDF
                        </button>
                    </div>
                </div>
            </div>

            <!-- KARTY PODSUMOWANIA -->
            <div class="finances-section">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    <div class="finance-stat-card" style="background: linear-gradient(135deg, #10b981, #059669);">
                        <div class="stat-icon">💰</div>
                        <div class="stat-title">Saldo bieżące</div>
                        <div class="stat-value" id="current-balance">$0</div>
                        <div class="stat-trend" id="balance-trend">Ładowanie...</div>
                    </div>
                    
                    <div class="finance-stat-card" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <div class="stat-icon">📈</div>
                        <div class="stat-title">Przychody (miesiąc)</div>
                        <div class="stat-value" id="monthly-income">$0</div>
                        <div class="stat-trend" id="income-trend">Ładowanie...</div>
                    </div>
                    
                    <div class="finance-stat-card" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                        <div class="stat-icon">📉</div>
                        <div class="stat-title">Wydatki (miesiąc)</div>
                        <div class="stat-value" id="monthly-expenses">$0</div>
                        <div class="stat-trend" id="expenses-trend">Ładowanie...</div>
                    </div>
                    
                    <div class="finance-stat-card" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-title">Prognoza sezonu</div>
                        <div class="stat-value" id="season-projection">$0</div>
                        <div class="stat-trend" id="projection-trend">Ładowanie...</div>
                    </div>
                </div>
            </div>

            <!-- WYKRESY FINANSOWE -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>📊</span> Analiza finansowa</h3>
                    <p>Wizualizacja przepływów pieniężnych i trendów</p>
                    
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4>Przychody vs Wydatki (ostatnie 6 miesięcy)</h4>
                            <canvas id="incomeExpenseChart" height="250"></canvas>
                        </div>
                        <div class="chart-container">
                            <h4>Struktura wydatków</h4>
                            <canvas id="expenseBreakdownChart" height="250"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ŹRÓDŁA PRZYCHODÓW -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>💵</span> Źródła przychodów</h3>
                    <p>Szczegółowy przegląd wszystkich wpływów finansowych</p>
                    
                    <div class="income-grid" id="income-sources">
                        <div class="loading-placeholder">
                            <div class="loading-spinner"></div>
                            <p>Ładowanie danych przychodów...</p>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="btn-add-income" class="btn-finance-success">
                            <span>➕</span> Dodaj przychód
                        </button>
                        <button id="btn-sponsorship-deals" class="btn-finance-primary">
                            <span>🤝</span> Negocjuj sponsorów
                        </button>
                    </div>
                </div>
            </div>

            <!-- STRUKTURA WYDATKÓW -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>📋</span> Struktura wydatków</h3>
                    <p>Miesięczne wydatki drużyny z podziałem na kategorie</p>
                    
                    <div class="expenses-grid" id="expenses-breakdown">
                        <div class="loading-placeholder">
                            <div class="loading-spinner"></div>
                            <p>Ładowanie danych wydatków...</p>
                        </div>
                    </div>
                    
                    <div class="budget-controls">
                        <div class="budget-slider">
                            <label for="budget-adjustment">Dostosuj budżet marketingowy:</label>
                            <input type="range" id="budget-adjustment" min="0" max="200" value="100">
                            <span id="budget-percentage">100%</span>
                        </div>
                        <button id="btn-optimize-expenses" class="btn-finance-warning">
                            <span>⚡</span> Optymalizuj wydatki
                        </button>
                    </div>
                </div>
            </div>

            <!-- HISTORIA TRANSAKCJI -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>📝</span> Historia transakcji</h3>
                    <p>Ostatnie operacje finansowe drużyny</p>
                    
                    <div class="transaction-filters">
                        <select id="transaction-type-filter">
                            <option value="all">Wszystkie transakcje</option>
                            <option value="income">Tylko przychody</option>
                            <option value="expense">Tylko wydatki</option>
                            <option value="transfer">Transfery graczy</option>
                            <option value="sponsor">Sponsoring</option>
                        </select>
                        <input type="date" id="transaction-date-from" placeholder="Od daty">
                        <input type="date" id="transaction-date-to" placeholder="Do daty">
                        <button id="btn-apply-filters" class="btn-finance-secondary">
                            🔍 Filtruj
                        </button>
                    </div>
                    
                    <div class="transactions-table-container">
                        <table class="transactions-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Opis</th>
                                    <th>Kategoria</th>
                                    <th>Kwota</th>
                                    <th>Saldo po</th>
                                    <th>Akcje</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-list">
                                <tr>
                                    <td colspan="6" class="loading-cell">
                                        <div class="loading-spinner-small"></div>
                                        Ładowanie historii...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="table-footer">
                        <div class="pagination">
                            <button id="btn-prev-page" class="btn-pagination">← Poprzednia</button>
                            <span id="current-page">Strona 1</span>
                            <button id="btn-next-page" class="btn-pagination">Następna →</button>
                        </div>
                        <button id="btn-export-transactions" class="btn-finance-secondary">
                            📋 Eksportuj do CSV
                        </button>
                    </div>
                </div>
            </div>

            <!-- PLANOWANIE BUDŻETU -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>🎯</span> Planowanie budżetu</h3>
                    <p>Zarządzaj budżetem na kolejne miesiące</p>
                    
                    <div class="budget-planning-grid">
                        <div class="budget-category">
                            <h4>Pensje graczy</h4>
                            <div class="budget-bar">
                                <div class="budget-progress" style="width: 85%; background: #3b82f6;"></div>
                            </div>
                            <div class="budget-info">
                                <span class="budget-current">$850,000</span>
                                <span class="budget-total"> / $1,000,000</span>
                            </div>
                        </div>
                        <div class="budget-category">
                            <h4>Marketing</h4>
                            <div class="budget-bar">
                                <div class="budget-progress" style="width: 45%; background: #10b981;"></div>
                            </div>
                            <div class="budget-info">
                                <span class="budget-current">$45,000</span>
                                <span class="budget-total"> / $100,000</span>
                            </div>
                        </div>
                        <div class="budget-category">
                            <h4>Rozwój akademii</h4>
                            <div class="budget-bar">
                                <div class="budget-progress" style="width: 60%; background: #f59e0b;"></div>
                            </div>
                            <div class="budget-info">
                                <span class="budget-current">$30,000</span>
                                <span class="budget-total"> / $50,000</span>
                            </div>
                        </div>
                        <div class="budget-category">
                            <h4>Infrastruktura</h4>
                            <div class="budget-bar">
                                <div class="budget-progress" style="width: 30%; background: #8b5cf6;"></div>
                            </div>
                            <div class="budget-info">
                                <span class="budget-current">$15,000</span>
                                <span class="budget-total"> / $50,000</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="budget-actions">
                        <button id="btn-set-budget" class="btn-finance-success">
                            <span>💼</span> Ustaw nowy budżet
                        </button>
                        <button id="btn-forecast" class="btn-finance-primary">
                            <span>🔮</span> Generuj prognozę
                        </button>
                    </div>
                </div>
            </div>

            <!-- ANALITYKA I RAPORTY -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>📈</span> Analityka finansowa</h3>
                    <p>Zaawansowane wskaźniki i analizy</p>
                    
                    <div class="analytics-grid">
                        <div class="metric-card">
                            <h4>🏆 Rentowność</h4>
                            <div class="metric-value" id="profitability-metric">0%</div>
                            <div class="metric-description">Marża zysku netto</div>
                        </div>
                        <div class="metric-card">
                            <h4>💧 Płynność</h4>
                            <div class="metric-value" id="liquidity-metric">0.0</div>
                            <div class="metric-description">Wskaźnik bieżącej płynności</div>
                        </div>
                        <div class="metric-card">
                            <h4>⚡ Efektywność</h4>
                            <div class="metric-value" id="efficiency-metric">0%</div>
                            <div class="metric-description">ROI (zwrot z inwestycji)</div>
                        </div>
                        <div class="metric-card">
                            <h4>📈 Wzrost</h4>
                            <div class="metric-value" id="growth-metric">0%</div>
                            <div class="metric-description">Wzrost przychodów YoY</div>
                        </div>
                    </div>
                    
                    <div class="report-actions">
                        <button id="btn-generate-report" class="btn-finance-primary">
                            <span>📊</span> Generuj raport miesięczny
                        </button>
                        <button id="btn-compare-teams" class="btn-finance-secondary">
                            <span>🏀</span> Porównaj z innymi drużynami
                        </button>
                    </div>
                </div>
            </div>

            <!-- SZYBKIE AKCJE -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>⚡</span> Szybkie akcje</h3>
                    <p>Natychmiastowe operacje finansowe</p>
                    
                    <div class="quick-actions-grid">
                        <button class="finance-quick-btn" data-action="request-loan">
                            🏦 Wniosek o pożyczkę
                        </button>
                        <button class="finance-quick-btn" data-action="issue-shares">
                            📈 Emituj akcje
                        </button>
                        <button class="finance-quick-btn" data-action="sponsorship-deal">
                            🤝 Nowy sponsor
                        </button>
                        <button class="finance-quick-btn" data-action="sell-merchandise">
                            👕 Sprzedaż merchandisingu
                        </button>
                        <button class="finance-quick-btn" data-action="player-contract">
                            🏀 Renegocjuj kontrakt
                        </button>
                        <button class="finance-quick-btn" data-action="emergency-funds">
                            🚨 Fundusz awaryjny
                        </button>
                    </div>
                </div>
            </div>

            <!-- ALERTY FINANSOWE -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>🚨</span> Alerty finansowe</h3>
                    <div id="finance-alerts">
                        <div class="alert alert-warning">
                            <strong>⚠️ Uwaga!</strong> Wydatki na pensje przekraczają 85% budżetu
                        </div>
                        <div class="alert alert-info">
                            <strong>💡 Wskazówka:</strong> Możesz zaoszczędzić $15k optymalizując koszty podróży
                        </div>
                    </div>
                </div>
            </div>

            <!-- STOPKA -->
            <div class="finances-footer">
                <p>© ${new Date().getFullYear()} EBL Finances | Ostatnia aktualizacja: <span id="last-update-time">${new Date().toLocaleString()}</span></p>
                <p>Dane są aktualizowane automatycznie co 5 minut</p>
            </div>
        </div>
    `;
    
    // Inicjalizacja modułu
    loadFinancialData();
    setupFinancesEventListeners();
    initCharts();
}

async function loadFinancialData() {
    console.log('[FINANCES] Loading financial data...');
    
    try {
        // Pobierz dane finansowe z Supabase
        const { data: financeData, error } = await supabase
            .from('team_finances')
            .select('*')
            .eq('team_id', getCurrentTeamId())
            .single();
        
        if (error) throw error;
        
        // Symulacja danych jeśli baza jest pusta
        const data = financeData || generateMockFinancialData();
        
        // Aktualizuj UI
        updateFinancialSummary(data);
        updateIncomeSources(data.income);
        updateExpensesBreakdown(data.expenses);
        updateTransactionHistory(data.transactions);
        updateFinancialMetrics(data.metrics);
        
        console.log('[FINANCES] Data loaded successfully');
        
    } catch (error) {
        console.error('[FINANCES] Error loading data:', error);
        
        // Fallback do danych testowych
        const mockData = generateMockFinancialData();
        updateFinancialSummary(mockData);
        updateIncomeSources(mockData.income);
        updateExpensesBreakdown(mockData.expenses);
        updateTransactionHistory(mockData.transactions);
        updateFinancialMetrics(mockData.metrics);
        
        showFinanceError('Nie udało się załadować danych finansowych. Pokazujemy dane testowe.');
    }
}

function updateFinancialSummary(data) {
    document.getElementById('current-balance').textContent = `$${formatCurrency(data.balance.current)}`;
    document.getElementById('monthly-income').textContent = `$${formatCurrency(data.income.total)}`;
    document.getElementById('monthly-expenses').textContent = `$${formatCurrency(data.expenses.total)}`;
    document.getElementById('season-projection').textContent = `$${formatCurrency(data.projection)}`;
    
    // Trendy
    document.getElementById('balance-trend').innerHTML = getTrendHTML(data.balance.trend);
    document.getElementById('income-trend').innerHTML = getTrendHTML(data.income.trend);
    document.getElementById('expenses-trend').innerHTML = getTrendHTML(data.expenses.trend);
    document.getElementById('projection-trend').innerHTML = getTrendHTML(data.projection_trend);
}

function updateIncomeSources(income) {
    const container = document.getElementById('income-sources');
    
    const html = `
        <div class="income-source">
            <div class="income-icon">🎫</div>
            <div class="income-info">
                <h5>Bilety</h5>
                <div class="income-amount">$${formatCurrency(income.tickets)}</div>
            </div>
            <div class="income-trend ${income.tickets_trend}">
                ${income.tickets_trend === 'up' ? '📈' : '📉'}
            </div>
        </div>
        
        <div class="income-source">
            <div class="income-icon">👕</div>
            <div class="income-info">
                <h5>Merchandising</h5>
                <div class="income-amount">$${formatCurrency(income.merchandise)}</div>
            </div>
            <div class="income-trend ${income.merchandise_trend}">
                ${income.merchandise_trend === 'up' ? '📈' : '📉'}
            </div>
        </div>
        
        <div class="income-source">
            <div class="income-icon">🤝</div>
            <div class="income-info">
                <h5>Sponsorzy</h5>
                <div class="income-amount">$${formatCurrency(income.sponsors)}</div>
            </div>
            <button class="btn-income-details" onclick="showSponsorDetails()">
                Szczegóły
            </button>
        </div>
        
        <div class="income-source">
            <div class="income-icon">📺</div>
            <div class="income-info">
                <h5>TV & Media</h5>
                <div class="income-amount">$${formatCurrency(income.tv_rights)}</div>
            </div>
            <div class="income-trend ${income.tv_trend}">
                ${income.tv_trend === 'up' ? '📈' : '📉'}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function updateExpensesBreakdown(expenses) {
    const container = document.getElementById('expenses-breakdown');
    
    const total = expenses.total;
    const categories = [
        { name: 'Pensje graczy', amount: expenses.player_salaries, percent: (expenses.player_salaries / total * 100).toFixed(1), color: '#3b82f6' },
        { name: 'Koszty operacyjne', amount: expenses.operational, percent: (expenses.operational / total * 100).toFixed(1), color: '#10b981' },
        { name: 'Transfery', amount: expenses.transfers, percent: (expenses.transfers / total * 100).toFixed(1), color: '#ef4444' },
        { name: 'Marketing', amount: expenses.marketing, percent: (expenses.marketing / total * 100).toFixed(1), color: '#8b5cf6' },
        { name: 'Rozwój', amount: expenses.development, percent: (expenses.development / total * 100).toFixed(1), color: '#f59e0b' }
    ];
    
    let html = '';
    categories.forEach(category => {
        html += `
            <div class="expense-category">
                <div class="expense-header">
                    <span class="expense-name">${category.name}</span>
                    <span class="expense-percent">${category.percent}%</span>
                </div>
                <div class="expense-bar">
                    <div class="expense-progress" style="width: ${category.percent}%; background: ${category.color};"></div>
                </div>
                <div class="expense-amount">$${formatCurrency(category.amount)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function updateTransactionHistory(transactions) {
    const container = document.getElementById('transactions-list');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    📭 Brak transakcji do wyświetlenia
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    transactions.forEach(transaction => {
        const typeClass = transaction.type === 'income' ? 'type-income' : 'type-expense';
        const icon = transaction.type === 'income' ? '📈' : '📉';
        
        html += `
            <tr class="transaction-row ${typeClass}">
                <td>${formatDate(transaction.date)}</td>
                <td>
                    <div class="transaction-description">
                        <span class="transaction-icon">${icon}</span>
                        ${transaction.description}
                    </div>
                </td>
                <td>
                    <span class="transaction-category ${transaction.category}">
                        ${getCategoryLabel(transaction.category)}
                    </span>
                </td>
                <td class="transaction-amount ${typeClass}">
                    ${transaction.type === 'income' ? '+' : '-'}$${formatCurrency(transaction.amount)}
                </td>
                <td class="transaction-balance">
                    $${formatCurrency(transaction.balance_after)}
                </td>
                <td>
                    <button class="btn-transaction-details" onclick="showTransactionDetails('${transaction.id}')">
                        Szczegóły
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function updateFinancialMetrics(metrics) {
    document.getElementById('profitability-metric').textContent = `${metrics.profitability}%`;
    document.getElementById('liquidity-metric').textContent = metrics.liquidity.toFixed(2);
    document.getElementById('efficiency-metric').textContent = `${metrics.efficiency}%`;
    document.getElementById('growth-metric').textContent = `${metrics.growth}%`;
}

function initCharts() {
    // Inicjalizacja wykresów Chart.js
    const incomeExpenseCtx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    const expenseBreakdownCtx = document.getElementById('expenseBreakdownChart')?.getContext('2d');
    
    if (!incomeExpenseCtx || !expenseBreakdownCtx) return;
    
    // Wykres przychodów vs wydatków
    new Chart(incomeExpenseCtx, {
        type: 'line',
        data: {
            labels: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze'],
            datasets: [
                {
                    label: 'Przychody',
                    data: [1200000, 1350000, 1280000, 1450000, 1500000, 1650000],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Wydatki',
                    data: [1100000, 1150000, 1200000, 1250000, 1300000, 1350000],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + (value / 1000000) + 'M';
                        }
                    }
                }
            }
        }
    });
    
    // Wykres struktury wydatków
    new Chart(expenseBreakdownCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pensje', 'Operacyjne', 'Transfery', 'Marketing', 'Rozwój'],
            datasets: [{
                data: [45, 25, 15, 10, 5],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#ef4444',
                    '#8b5cf6',
                    '#f59e0b'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

function setupFinancesEventListeners() {
    console.log('[FINANCES] Setting up event listeners...');
    
    // Przycisk odświeżania
    document.getElementById('btn-refresh-finances')?.addEventListener('click', () => {
        loadFinancialData();
        showFinanceNotification('Dane finansowe odświeżone', 'success');
    });
    
    // Eksport raportu
    document.getElementById('btn-export-report')?.addEventListener('click', () => {
        exportFinancialReport();
    });
    
    // Dodaj przychód
    document.getElementById('btn-add-income')?.addEventListener('click', () => {
        showAddIncomeModal();
    });
    
    // Negocjuj sponsorów
    document.getElementById('btn-sponsorship-deals')?.addEventListener('click', () => {
        showSponsorshipNegotiationModal();
    });
    
    // Optymalizuj wydatki
    document.getElementById('btn-optimize-expenses')?.addEventListener('click', () => {
        optimizeExpenses();
    });
    
    // Filtrowanie transakcji
    document.getElementById('btn-apply-filters')?.addEventListener('click', () => {
        applyTransactionFilters();
    });
    
    // Paginacja
    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        navigateTransactionsPage('prev');
    });
    
    document.getElementById('btn-next-page')?.addEventListener('click', () => {
        navigateTransactionsPage('next');
    });
    
    // Eksport transakcji
    document.getElementById('btn-export-transactions')?.addEventListener('click', () => {
        exportTransactionsToCSV();
    });
    
    // Ustaw budżet
    document.getElementById('btn-set-budget')?.addEventListener('click', () => {
        showBudgetSettingModal();
    });
    
    // Generuj prognozę
    document.getElementById('btn-forecast')?.addEventListener('click', () => {
        generateFinancialForecast();
    });
    
    // Generuj raport
    document.getElementById('btn-generate-report')?.addEventListener('click', () => {
        generateMonthlyReport();
    });
    
    // Porównaj drużyny
    document.getElementById('btn-compare-teams')?.addEventListener('click', () => {
        showTeamComparisonModal();
    });
    
    // Szybkie akcje
    document.querySelectorAll('.finance-quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickFinanceAction(action);
        });
    });
    
    // Suwak budżetu
    const budgetSlider = document.getElementById('budget-adjustment');
    const budgetPercentage = document.getElementById('budget-percentage');
    
    if (budgetSlider && budgetPercentage) {
        budgetSlider.addEventListener('input', function() {
            budgetPercentage.textContent = this.value + '%';
        });
        
        budgetSlider.addEventListener('change', function() {
            adjustMarketingBudget(parseInt(this.value));
        });
    }
}

// Funkcje pomocnicze
function formatCurrency(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(2) + 'M';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'k';
    }
    return amount.toLocaleString('en-US');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
}

function getTrendHTML(trend) {
    if (trend === 'up') {
        return '<span style="color:#10b981">📈 +5.2%</span>';
    } else if (trend === 'down') {
        return '<span style="color:#ef4444">📉 -2.1%</span>';
    }
    return '<span style="color:#64748b">➡️ Stabilnie</span>';
}

function getCategoryLabel(category) {
    const labels = {
        'ticket_sales': 'Sprzedaż biletów',
        'merchandise': 'Merchandising',
        'sponsorship': 'Sponsoring',
        'tv_rights': 'Prawa TV',
        'player_transfer': 'Transfer gracza',
        'player_salary': 'Pensja gracza',
        'staff_salary': 'Pensja sztabu',
        'facility': 'Obiekt',
        'travel': 'Podróże',
        'marketing': 'Marketing',
        'development': 'Rozwój'
    };
    return labels[category] || category;
}

function getCurrentTeamId() {
    // Pobierz ID drużyny z localStorage lub kontekstu aplikacji
    const userData = JSON.parse(localStorage.getItem('ebl_user_data'));
    return userData?.team_id || 1;
}

function generateMockFinancialData() {
    return {
        balance: {
            current: 2500000,
            trend: 'up'
        },
        income: {
            total: 1650000,
            tickets: 850000,
            tickets_trend: 'up',
            merchandise: 250000,
            merchandise_trend: 'up',
            sponsors: 400000,
            tv_rights: 150000,
            tv_trend: 'stable'
        },
        expenses: {
            total: 1350000,
            player_salaries: 850000,
            operational: 250000,
            transfers: 150000,
            marketing: 80000,
            development: 20000
        },
        projection: 3200000,
        projection_trend: 'up',
        transactions: [
            {
                id: 1,
                date: '2024-01-15',
                description: 'Sprzedaż biletów - mecz z Lakers',
                category: 'ticket_sales',
                type: 'income',
                amount: 125000,
                balance_after: 2625000
            },
            {
                id: 2,
                date: '2024-01-14',
                description: 'Pensja - LeBron James',
                category: 'player_salary',
                type: 'expense',
                amount: 425000,
                balance_after: 2500000
            }
        ],
        metrics: {
            profitability: 18.2,
            liquidity: 1.85,
            efficiency: 24.7,
            growth: 12.5
        }
    };
}

// Funkcje akcji
function showAddIncomeModal() {
    const modalHTML = `
        <div class="finance-modal-overlay">
            <div class="finance-modal">
                <h3><span>➕</span> Dodaj nowy przychód</h3>
                
                <form id="add-income-form">
                    <div class="form-group">
                        <label>Typ przychodu:</label>
                        <select id="income-type" required>
                            <option value="">Wybierz typ...</option>
                            <option value="tickets">Sprzedaż biletów</option>
                            <option value="merchandise">Merchandising</option>
                            <option value="sponsorship">Sponsoring</option>
                            <option value="tv_rights">Prawa TV</option>
                            <option value="other">Inny</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Kwota ($):</label>
                        <input type="number" id="income-amount" min="100" max="10000000" step="1000" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Opis:</label>
                        <textarea id="income-description" rows="3" required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Data:</label>
                        <input type="date" id="income-date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn-finance-success">
                            💾 Zapisz przychód
                        </button>
                        <button type="button" onclick="closeFinanceModal()" class="btn-finance-secondary">
                            ✕ Anuluj
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Event listener dla formularza
    document.getElementById('add-income-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addNewIncome();
    });
}

async function addNewIncome() {
    const type = document.getElementById('income-type').value;
    const amount = parseFloat(document.getElementById('income-amount').value);
    const description = document.getElementById('income-description').value;
    const date = document.getElementById('income-date').value;
    
    try {
        // Tutaj dodaj logikę zapisu do bazy danych
        showFinanceNotification(`Dodano nowy przychód: $${formatCurrency(amount)}`, 'success');
        closeFinanceModal();
        loadFinancialData(); // Odśwież dane
    } catch (error) {
        showFinanceError('Nie udało się dodać przychodu: ' + error.message);
    }
}

function showSponsorshipNegotiationModal() {
    showFinanceNotification('Rozpoczynanie negocjacji sponsorów...', 'info');
    // Tutaj implementacja pełnego modalu negocjacji
}

function optimizeExpenses() {
    showFinanceNotification('Analizuję możliwości optymalizacji wydatków...', 'info');
    
    // Symulacja analizy
    setTimeout(() => {
        const savings = Math.floor(Math.random() * 50000) + 10000;
        showFinanceNotification(`Znaleziono oszczędności: $${formatCurrency(savings)} rocznie!`, 'success');
    }, 1500);
}

function exportFinancialReport() {
    showFinanceNotification('Generowanie raportu PDF...', 'info');
    
    // Symulacja generowania raportu
    setTimeout(() => {
        const link = document.createElement('a');
        link.href = '#';
        link.download = `financial-report-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        
        showFinanceNotification('Raport wygenerowany pomyślnie!', 'success');
    }, 2000);
}

function handleQuickFinanceAction(action) {
    const actions = {
        'request-loan': () => {
            showLoanApplicationModal();
        },
        'issue-shares': () => {
            showSharesIssueModal();
        },
        'sponsorship-deal': () => {
            showSponsorshipDealModal();
        },
        'sell-merchandise': () => {
            showMerchandiseSaleModal();
        },
        'player-contract': () => {
            showContractRenegotiationModal();
        },
        'emergency-funds': () => {
            requestEmergencyFunds();
        }
    };
    
    if (actions[action]) {
        actions[action]();
    }
}

function showLoanApplicationModal() {
    alert('Funkcja: Wniosek o pożyczkę\n(Tu będzie modal aplikacji o pożyczkę)');
}

function showFinanceNotification(message, type = 'info') {
    // Możesz dodać system powiadomień
    console.log(`[FINANCE NOTIFICATION ${type.toUpperCase()}]: ${message}`);
    
    // Tymczasowy alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `finance-alert finance-alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <span class="alert-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            ${message}
        </div>
    `;
    
    document.querySelector('.finances-modern-wrapper')?.appendChild(alertDiv);
    
    // Usuń po 5 sekundach
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showFinanceError(message) {
    showFinanceNotification(message, 'error');
}

function closeFinanceModal() {
    const modal = document.querySelector('.finance-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Export głównej funkcji
export { renderFinancesView };

// Funkcje globalne (dostępne z poziomu HTML)
window.showTransactionDetails = function(transactionId) {
    alert(`Szczegóły transakcji #${transactionId}\n(Tu będzie modal ze szczegółami)`);
};

window.showSponsorDetails = function() {
    alert('Szczegóły kontraktów sponsorskich\n(Tu będzie modal z listą sponsorów)');
};
