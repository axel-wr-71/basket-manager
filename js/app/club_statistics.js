// js/app/club_statistics.js
import { supabaseClient } from '../auth.js';

/**
 * Komponent statystyk klubu
 */
export async function renderClubStatistics(team, players) {
    console.log("[CLUB STATISTICS] Renderowanie statystyk...");
    
    try {
        // Pobierz statystyki
        const stats = await fetchClubStats(team.id);
        const achievements = await fetchAchievements(team.id);
        const records = await fetchClubRecords(team.id);
        
        return `
            <div class="statistics-container">
                <!-- NAGŁÓWEK -->
                <div class="stats-header">
                    <h2><span class="icon">📊</span> Statystyki Klubu</h2>
                    <p>Analiza danych i osiągnięć Twojego klubu</p>
                </div>
                
                <!-- KLUCZOWE METRYKI -->
                <div class="key-metrics-section">
                    <h3>Kluczowe metryki</h3>
                    <div class="metrics-grid">
                        ${renderKeyMetrics(stats, players)}
                    </div>
                </div>
                
                <!-- WYKRESY I ANALIZY -->
                <div class="charts-section">
                    <h3><span class="icon">📈</span> Analizy trendów</h3>
                    <div class="charts-grid">
                        ${renderCharts(stats)}
                    </div>
                </div>
                
                <!-- REKORDY KLUBU -->
                <div class="records-section">
                    <h3><span class="icon">🏆</span> Rekordy klubu</h3>
                    ${renderClubRecords(records)}
                </div>
                
                <!-- OSIĄGNIĘCIA -->
                <div class="achievements-section">
                    <h3><span class="icon">🎯</span> Osiągnięcia</h3>
                    ${renderAchievements(achievements)}
                </div>
                
                <!-- PORÓWNANIE Z LIGĄ -->
                <div class="comparison-section">
                    <h3><span class="icon">⚖️</span> Porównanie z ligą</h3>
                    ${renderLeagueComparison(team, stats)}
                </div>
            </div>
            
            <style>
                .statistics-container {
                    padding: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .stats-header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e2e8f0;
                }
                
                .stats-header h2 {
                    color: #1a237e;
                    font-size: 2rem;
                    font-weight: 900;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }
                
                .stats-header p {
                    color: #64748b;
                    font-size: 1.1rem;
                }
                
                .key-metrics-section, .charts-section, 
                .records-section, .achievements-section,
                .comparison-section {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 15px rgba(0,0,0,0.08);
                }
                
                h3 {
                    color: #1a237e;
                    margin-bottom: 25px;
                    font-size: 1.3rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                h3 .icon {
                    margin-right: 10px;
                }
                
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }
                
                .metric-card {
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border-radius: 10px;
                    padding: 25px;
                    text-align: center;
                    border: 1px solid #e2e8f0;
                    transition: all 0.3s;
                }
                
                .metric-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    border-color: #e65100;
                }
                
                .metric-icon {
                    font-size: 2.5rem;
                    margin-bottom: 15px;
                }
                
                .metric-value {
                    font-size: 2.8rem;
                    font-weight: 900;
                    margin: 10px 0;
                    color: #1a237e;
                }
                
                .metric-label {
                    font-size: 0.9rem;
                    color: #64748b;
                    text-transform: uppercase;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
                
                .metric-change {
                    font-size: 0.85rem;
                    margin-top: 10px;
                    padding: 4px 12px;
                    border-radius: 12px;
                    display: inline-block;
                    font-weight: 600;
                }
                
                .change-positive {
                    background: #d1fae5;
                    color: #065f46;
                }
                
                .change-negative {
                    background: #fee2e2;
                    color: #991b1b;
                }
                
                .change-neutral {
                    background: #f1f5f9;
                    color: #475569;
                }
                
                .charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 25px;
                }
                
                .chart-container {
                    background: #f8fafc;
                    border-radius: 10px;
                    padding: 20px;
                    border: 1px solid #e2e8f0;
                }
                
                .chart-title {
                    font-weight: 600;
                    color: #1a237e;
                    margin-bottom: 15px;
                    font-size: 1rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .chart-placeholder {
                    height: 200px;
                    background: #e2e8f0;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    font-weight: 600;
                }
                
                .records-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 15px;
                }
                
                .record-item {
                    background: #f8fafc;
                    border-left: 4px solid #e65100;
                    padding: 15px;
                    border-radius: 0 8px 8px 0;
                }
                
                .record-title {
                    font-weight: 700;
                    color: #1a237e;
                    margin-bottom: 5px;
                }
                
                .record-value {
                    font-size: 1.5rem;
                    font-weight: 900;
                    color: #e65100;
                    margin: 5px 0;
                }
                
                .record-description {
                    font-size: 0.85rem;
                    color: #64748b;
                }
                
                .achievements-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .achievement-card {
                    background: white;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                    transition: all 0.3s;
                }
                
                .achievement-card.locked {
                    opacity: 0.5;
                    filter: grayscale(1);
                }
                
                .achievement-card.unlocked {
                    border-color: #f59e0b;
                    background: #fef3c7;
                }
                
                .achievement-icon {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                
                .achievement-name {
                    font-weight: 700;
                    color: #1a237e;
                    margin-bottom: 5px;
                    font-size: 0.9rem;
                }
                
                .achievement-progress {
                    height: 6px;
                    background: #e2e8f0;
                    border-radius: 3px;
                    overflow: hidden;
                    margin: 10px 0;
                }
                
                .progress-bar {
                    height: 100%;
                    background: #10b981;
                }
                
                .progress-text {
                    font-size: 0.75rem;
                    color: #64748b;
                }
                
                .comparison-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .comparison-table th {
                    background: #f1f5f9;
                    padding: 15px;
                    text-align: left;
                    color: #1a237e;
                    font-weight: 700;
                    border-bottom: 2px solid #e2e8f0;
                }
                
                .comparison-table td {
                    padding: 15px;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .comparison-row:hover {
                    background: #f8fafc;
                }
                
                .club-value {
                    font-weight: 700;
                    color: #1a237e;
                }
                
                .league-avg {
                    color: #64748b;
                    font-size: 0.9rem;
                }
                
                .comparison-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .badge-better {
                    background: #d1fae5;
                    color: #065f46;
                }
                
                .badge-worse {
                    background: #fee2e2;
                    color: #991b1b;
                }
                
                .badge-equal {
                    background: #f1f5f9;
                    color: #475569;
                }
            </style>
        `;
        
    } catch (error) {
        console.error("[CLUB STATISTICS] Błąd:", error);
        return `
            <div style="padding: 50px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                <h3 style="color: #7c2d12;">Błąd ładowania statystyk</h3>
                <p style="color: #92400e;">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Renderuje kluczowe metryki
 */
function renderKeyMetrics(stats, players) {
    const metrics = [
        {
            icon: '👥',
            value: players.length,
            label: 'Zawodników w kadrze',
            change: '+2',
            changeType: 'positive'
        },
        {
            icon: '💰',
            value: `$${(stats?.budget || 0).toLocaleString()}`,
            label: 'Budżet klubu',
            change: '+5.2%',
            changeType: 'positive'
        },
        {
            icon: '🎫',
            value: `${stats?.avg_attendance || 0}%`,
            label: 'Średnia frekwencja',
            change: '+3.1%',
            changeType: 'positive'
        },
        {
            icon: '🏆',
            value: stats?.trophies || 0,
            label: 'Zdobyte trofea',
            change: '+1',
            changeType: 'positive'
        },
        {
            icon: '📈',
            value: `${stats?.win_rate || 0}%`,
            label: 'Procent wygranych',
            change: '+2.4%',
            changeType: 'positive'
        },
        {
            icon: '⭐',
            value: stats?.star_players || 0,
            label: 'Gracze All-Star',
            change: '0',
            changeType: 'neutral'
        }
    ];
    
    return metrics.map(metric => `
        <div class="metric-card">
            <div class="metric-icon">${metric.icon}</div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-label">${metric.label}</div>
            <div class="metric-change change-${metric.changeType}">
                ${metric.changeType === 'positive' ? '↗' : 
                  metric.changeType === 'negative' ? '↘' : '→'} 
                ${metric.change}
            </div>
        </div>
    `).join('');
}

/**
 * Renderuje wykresy
 */
function renderCharts(stats) {
    return `
        <div class="chart-container">
            <div class="chart-title">Wyniki meczów (ostatnie 10)</div>
            <div class="chart-placeholder">
                📊 Wykres wyników meczów
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">Frekwencja na meczach</div>
            <div class="chart-placeholder">
                👥 Wykres frekwencji
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">Wzrost wartości klubu</div>
            <div class="chart-placeholder">
                💰 Wykres wartości
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">Struktura wydatków</div>
            <div class="chart-placeholder">
                📈 Wykres wydatków
            </div>
        </div>
    `;
}

/**
 * Renderuje rekordy klubu
 */
function renderClubRecords(records) {
    const defaultRecords = [
        {
            title: 'Najwięcej punktów w meczu',
            value: '142',
            description: 'vs. Warsaw Eagles, 2023'
        },
        {
            title: 'Najwyższa frekwencja',
            value: '98.7%',
            description: 'Finał ligi, 2023'
        },
        {
            title: 'Najdłuższa seria wygranych',
            value: '14',
            description: 'Sezon 2022-2023'
        },
        {
            title: 'Najwyższy transfer',
            value: '$4.2M',
            description: 'James Rodriguez, 2023'
        },
        {
            title: 'MVP sezonu',
            value: '3x',
            description: '2021, 2022, 2023'
        },
        {
            title: 'Najmłodszy debiutant',
            value: '18 lat',
            description: 'Michael Young, 2022'
        }
    ];
    
    return `
        <div class="records-list">
            ${defaultRecords.map(record => `
                <div class="record-item">
                    <div class="record-title">${record.title}</div>
                    <div class="record-value">${record.value}</div>
                    <div class="record-description">${record.description}</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Renderuje osiągnięcia
 */
function renderAchievements(achievements) {
    const defaultAchievements = [
        { icon: '🏆', name: 'Mistrz ligi', unlocked: true, progress: 100 },
        { icon: '🥇', name: 'Zdobywca pucharu', unlocked: true, progress: 100 },
        { icon: '👑', name: 'Złoty sezon', unlocked: false, progress: 65 },
        { icon: '💎', name: 'Elita EBL', unlocked: true, progress: 100 },
        { icon: '📈', name: 'Wzrost wartości', unlocked: false, progress: 45 },
        { icon: '👥', name: 'Stadion wypełniony', unlocked: true, progress: 100 },
        { icon: '⭐', name: '3 MVP ligi', unlocked: false, progress: 66 },
        { icon: '💰', name: 'Milioner', unlocked: true, progress: 100 }
    ];
    
    return `
        <div class="achievements-grid">
            ${defaultAchievements.map(achievement => `
                <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-name">${achievement.name}</div>
                    
                    ${achievement.unlocked ? `
                        <div style="color: #f59e0b; font-size: 0.8rem; font-weight: 600;">
                            ✅ Odblokowano
                        </div>
                    ` : `
                        <div class="achievement-progress">
                            <div class="progress-bar" style="width: ${achievement.progress}%"></div>
                        </div>
                        <div class="progress-text">${achievement.progress}%</div>
                    `}
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Renderuje porównanie z ligą
 */
function renderLeagueComparison(team, stats) {
    const comparisons = [
        { category: 'Średnia wygranych', club: '68%', league: '55%', status: 'better' },
        { category: 'Frekwencja', club: '89%', league: '78%', status: 'better' },
        { category: 'Wartość kadry', club: '$42M', league: '$38M', status: 'better' },
        { category: 'Śr. wiek zawodników', club: '26.2', league: '27.8', status: 'better' },
        { category: 'Wydatki na pensje', club: '$28M', league: '$32M', status: 'better' },
        { category: 'Transfery sezon', club: '12', league: '15', status: 'worse' }
    ];
    
    return `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Kategoria</th>
                    <th>Twój klub</th>
                    <th>Średnia ligi</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${comparisons.map(comp => `
                    <tr class="comparison-row">
                        <td>${comp.category}</td>
                        <td class="club-value">${comp.club}</td>
                        <td class="league-avg">${comp.league}</td>
                        <td>
                            <span class="comparison-badge badge-${comp.status}">
                                ${comp.status === 'better' ? 'Powyżej średniej' :
                                  comp.status === 'worse' ? 'Poniżej średniej' : 'Na średniej'}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Znajdź i zastąp te funkcje:

/**
 * Pobiera statystyki klubu z obsługą błędów
 */
async function fetchClubStats(teamId) {
    try {
        const { data, error } = await supabaseClient
            .from('team_stats')
            .select('*')
            .eq('team_id', teamId)
            .single();
        
        if (error) {
            console.warn("[CLUB STATS] Brak tabeli team_stats:", error.message);
            
            // Spróbuj pobrać z teams.club_stats
            const { data: teamData } = await supabaseClient
                .from('teams')
                .select('club_stats')
                .eq('id', teamId)
                .single();
            
            if (teamData?.club_stats) {
                return typeof teamData.club_stats === 'string' 
                    ? JSON.parse(teamData.club_stats)
                    : teamData.club_stats;
            }
            
            return {};
        }
        return data || {};
    } catch (error) {
        console.warn("[CLUB STATS] Błąd pobierania statystyk:", error.message);
        return {};
    }
}

/**
 * Pobiera osiągnięcia z obsługą błędów
 */
async function fetchAchievements(teamId) {
    try {
        const { data, error } = await supabaseClient
            .from('achievements')
            .select('*')
            .eq('team_id', teamId);
        
        if (error) {
            console.warn("[CLUB STATS] Brak tabeli achievements:", error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.warn("[CLUB STATS] Błąd pobierania osiągnięć:", error.message);
        return [];
    }
}

/**
 * Pobiera rekordy klubu z obsługą błędów
 */
async function fetchClubRecords(teamId) {
    try {
        const { data, error } = await supabaseClient
            .from('club_records')
            .select('*')
            .eq('team_id', teamId);
        
        if (error) {
            console.warn("[CLUB STATS] Brak tabeli club_records:", error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.warn("[CLUB STATS] Błąd pobierania rekordów:", error.message);
        return [];
    }
}}
