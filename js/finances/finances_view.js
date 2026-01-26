// js/finances/finances_view.js

import { supabase } from '../auth.js';

export function renderFinancesView(team, players) {
    console.log('[FINANCES] Rendering finances view for team:', team?.team_name);
    
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
                        <p>${team?.team_name || 'Twoja drużyna'} | Aktualne na: ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="header-actions">
                        <button id="btn-refresh-finances" class="btn-finance-secondary">
                            🔄 Odśwież
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
                        <div class="stat-value" id="current-balance">$${team?.cash || '0'}</div>
                    </div>
                    
                    <div class="finance-stat-card" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <div class="stat-icon">📈</div>
                        <div class="stat-title">Miesięczny budżet</div>
                        <div class="stat-value" id="monthly-budget">$2,500,000</div>
                    </div>
                    
                    <div class="finance-stat-card" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                        <div class="stat-icon">📉</div>
                        <div class="stat-title">Wydatki na pensje</div>
                        <div class="stat-value" id="salary-expenses">$${calculateSalaryExpenses(players)}</div>
                    </div>
                    
                    <div class="finance-stat-card" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-title">Prognoza na sezon</div>
                        <div class="stat-value" id="season-projection">$5,000,000</div>
                    </div>
                </div>
            </div>

            <!-- WYKRESY FINANSOWE -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>📊</span> Analiza finansowa</h3>
                    <p>Wizualizacja przepływów pieniężnych</p>
                    
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4>Przychody vs Wydatki</h4>
                            <canvas id="incomeExpenseChart" height="250"></canvas>
                        </div>
                        <div class="chart-container">
                            <h4>Struktura wydatków</h4>
                            <canvas id="expenseBreakdownChart" height="250"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- HISTORIA TRANSAKCJI -->
            <div class="finances-section">
                <div class="finances-section-card">
                    <h3><span>📝</span> Ostatnie transakcje</h3>
                    <p>Ostatnie operacje finansowe</p>
                    
                    <div class="transactions-table-container">
                        <table class="transactions-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Opis</th>
                                    <th>Kwota</th>
                                    <th>Saldo po</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-list">
                                <tr>
                                    <td colspan="4" class="loading-cell">
                                        Ładowanie historii...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- STOPKA -->
            <div class="finances-footer">
                <p>© ${new Date().getFullYear()} EBL Finances | Ostatnia aktualizacja: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    `;
    
    // Inicjalizacja wykresów
    setTimeout(() => {
        initCharts();
        loadTransactionHistory(team?.id);
        setupFinancesEventListeners();
    }, 100);
}

function calculateSalaryExpenses(players) {
    if (!players || players.length === 0) return '0';
    const total = players.reduce((sum, player) => sum + (player.salary || 0), 0);
    return formatCurrency(total);
}

function formatCurrency(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'k';
    }
    return amount;
}

function initCharts() {
    // Wykres przychodów vs wydatków
    const incomeExpenseCtx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    if (incomeExpenseCtx) {
        new Chart(incomeExpenseCtx, {
            type: 'bar',
            data: {
                labels: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze'],
                datasets: [
                    {
                        label: 'Przychody',
                        data: [1200000, 1350000, 1280000, 1450000, 1500000, 1650000],
                        backgroundColor: '#10b981',
                    },
                    {
                        label: 'Wydatki',
                        data: [1100000, 1150000, 1200000, 1250000, 1300000, 1350000],
                        backgroundColor: '#ef4444',
                    }
                ]
            },
            options: {
                responsive: true,
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
    }
    
    // Wykres struktury wydatków
    const expenseBreakdownCtx = document.getElementById('expenseBreakdownChart')?.getContext('2d');
    if (expenseBreakdownCtx) {
        new Chart(expenseBreakdownCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pensje graczy', 'Koszty operacyjne', 'Marketing', 'Rozwój', 'Inne'],
                datasets: [{
                    data: [45, 25, 15, 10, 5],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#ef4444',
                        '#8b5cf6',
                        '#f59e0b'
                    ],
                }]
            },
            options: {
                responsive: true,
            }
        });
    }
}

async function loadTransactionHistory(teamId) {
    if (!teamId) return;
    
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    try {
        // Tutaj dodaj prawdziwe zapytanie do Supabase
        // const { data, error } = await supabase
        //     .from('financial_transactions')
        //     .select('*')
        //     .eq('team_id', teamId)
        //     .order('date', { ascending: false })
        //     .limit(10);
        
        // Na razie mock data
        const mockTransactions = [
            { date: '2024-01-15', description: 'Sprzedaż biletów - mecz domowy', amount: 125000, balance_after: 2625000 },
            { date: '2024-01-14', description: 'Pensja - gracz #1', amount: -42500, balance_after: 2500000 },
            { date: '2024-01-13', description: 'Sponsoring - firma XYZ', amount: 50000, balance_after: 2542500 },
        ];
        
        container.innerHTML = mockTransactions.map(transaction => `
            <tr>
                <td>${new Date(transaction.date).toLocaleDateString('pl-PL')}</td>
                <td>${transaction.description}</td>
                <td style="color: ${transaction.amount >= 0 ? '#10b981' : '#ef4444'};">
                    ${transaction.amount >= 0 ? '+' : ''}$${formatCurrency(transaction.amount)}
                </td>
                <td>$${formatCurrency(transaction.balance_after)}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('[FINANCES] Error loading transactions:', error);
        container.innerHTML = `
            <tr>
                <td colspan="4" style="color: #ef4444;">
                    Błąd ładowania historii transakcji
                </td>
            </tr>
        `;
    }
}

function setupFinancesEventListeners() {
    document.getElementById('btn-refresh-finances')?.addEventListener('click', () => {
        alert('Odświeżanie danych finansowych...');
        location.reload();
    });
}

// Dla kompatybilności z starym kodem
window.loadFinancialData = function() {
    console.log('[FINANCES] Global function called');
    const { team, players } = window.gameState || {};
    renderFinancesView(team, players);
};
