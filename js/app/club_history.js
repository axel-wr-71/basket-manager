// js/app/club_history.js
import { supabaseClient } from '../auth.js';

/**
 * Komponent historii klubu
 */
export async function renderClubHistory(team, players) {
    console.log("[CLUB HISTORY] Renderowanie historii klubu...");
    
    try {
        // Pobierz historię klubu
        const history = await fetchClubHistory(team.id);
        const trophies = await fetchClubTrophies(team.id);
        const transfers = await fetchTransferHistory(team.id);
        
        return `
            <div class="club-history-container">
                <!-- STATYSTYKI PODSUMOWUJĄCE -->
                <div class="history-stats-grid">
                    ${renderHistoryStats(history, trophies, transfers)}
                </div>
                
                <!-- OŚ CZASU WYDARZEŃ -->
                <div class="timeline-section">
                    <h3><span class="icon">📅</span> Oś czasu wydarzeń</h3>
                    <div class="timeline">
                        ${renderHistoryTimeline(history)}
                    </div>
                </div>
                
                <!-- KALENDARZ SEZONÓW -->
                <div class="seasons-section">
                    <h3><span class="icon">🏀</span> Historia sezonów</h3>
                    <div class="seasons-grid">
                        ${renderSeasonsHistory(team)}
                    </div>
                </div>
                
                <!-- LEGENDARNE MOMENTY -->
                <div class="legendary-moments">
                    <h3><span class="icon">⭐</span> Legendarne momenty</h3>
                    <div class="moments-grid">
                        ${renderLegendaryMoments(history)}
                    </div>
                </div>
            </div>
            
            <style>
                .club-history-container {
                    padding: 20px;
                }
                
                .history-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    background: white;
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                .stat-value {
                    font-size: 2.5rem;
                    font-weight: 900;
                    color: #1a237e;
                    margin: 10px 0;
                }
                
                .stat-label {
                    font-size: 0.9rem;
                    color: #64748b;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                
                .timeline-section, .seasons-section, .legendary-moments {
                    background: white;
                    border-radius: 10px;
                    padding: 25px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                h3 {
                    color: #1a237e;
                    margin-bottom: 20px;
                    font-size: 1.2rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                h3 .icon {
                    margin-right: 10px;
                }
                
                .timeline {
                    position: relative;
                    padding-left: 30px;
                    border-left: 3px solid #e2e8f0;
                }
                
                .timeline-item {
                    position: relative;
                    margin-bottom: 25px;
                    padding-left: 20px;
                }
                
                .timeline-item::before {
                    content: '';
                    position: absolute;
                    left: -33px;
                    top: 5px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #e65100;
                }
                
                .timeline-date {
                    font-size: 0.9rem;
                    color: #e65100;
                    font-weight: 700;
                    margin-bottom: 5px;
                }
                
                .timeline-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #1a237e;
                    margin-bottom: 5px;
                }
                
                .timeline-description {
                    font-size: 0.9rem;
                    color: #64748b;
                    line-height: 1.4;
                }
                
                .seasons-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 15px;
                }
                
                .season-card {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 15px;
                    transition: all 0.3s;
                }
                
                .season-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    border-color: #e65100;
                }
                
                .season-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .season-year {
                    font-weight: 800;
                    color: #1a237e;
                    font-size: 1.1rem;
                }
                
                .season-result {
                    background: #f0f9ff;
                    color: #0369a1;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .season-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-top: 10px;
                }
                
                .stat-item {
                    text-align: center;
                }
                
                .stat-number {
                    font-weight: 800;
                    color: #1a237e;
                    font-size: 1.2rem;
                }
                
                .stat-name {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 2px;
                }
                
                .moments-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 15px;
                }
                
                .moment-card {
                    background: #fef3c7;
                    border: 2px solid #f59e0b;
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                }
                
                .moment-icon {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                
                .moment-title {
                    font-weight: 800;
                    color: #92400e;
                    margin-bottom: 5px;
                }
                
                .moment-description {
                    font-size: 0.9rem;
                    color: #92400e;
                    opacity: 0.8;
                }
            </style>
        `;
        
    } catch (error) {
        console.error("[CLUB HISTORY] Błąd:", error);
        return `
            <div style="padding: 50px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                <h3 style="color: #7c2d12;">Błąd ładowania historii</h3>
                <p style="color: #92400e;">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Renderuje statystyki historii
 */
function renderHistoryStats(history, trophies, transfers) {
    const totalEvents = history.length;
    const totalTrophies = trophies.length;
    const totalTransfers = transfers.length;
    const championshipTrophies = trophies.filter(t => t.trophy_type === 'championship').length;
    
    return `
        <div class="stat-card">
            <div class="stat-value">${totalEvents}</div>
            <div class="stat-label">Wydarzenia</div>
        </div>
        
        <div class="stat-card">
            <div class="stat-value">${totalTrophies}</div>
            <div class="stat-label">Trofea</div>
        </div>
        
        <div class="stat-card">
            <div class="stat-value">${championshipTrophies}</div>
            <div class="stat-label">Mistrzostwa</div>
        </div>
        
        <div class="stat-card">
            <div class="stat-value">${totalTransfers}</div>
            <div class="stat-label">Transfery</div>
        </div>
    `;
}

/**
 * Renderuje oś czasu wydarzeń
 */
function renderHistoryTimeline(history) {
    if (!history || history.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📜</div>
                <p>Brak historii do wyświetlenia</p>
                <p style="font-size: 0.9rem;">Stwórz historię swojego klubu!</p>
            </div>
        `;
    }
    
    return history.slice(0, 10).map(event => {
        const eventDate = new Date(event.event_date);
        const eventIcons = {
            'championship': '🏆',
            'transfer': '🔄',
            'achievement': '⭐',
            'promotion': '📈',
            'other': '📝'
        };
        
        return `
            <div class="timeline-item">
                <div class="timeline-date">${eventDate.toLocaleDateString('pl-PL')}</div>
                <div class="timeline-title">
                    ${eventIcons[event.event_type] || '📝'} ${event.title}
                </div>
                <div class="timeline-description">
                    ${event.description || 'Brak opisu'}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Renderuje historię sezonów
 */
function renderSeasonsHistory(team) {
    // Symulacja danych sezonów
    const seasons = [
        { year: 2023, wins: 45, losses: 17, position: 1, result: 'Mistrzostwo' },
        { year: 2022, wins: 42, losses: 20, position: 2, result: 'Finał' },
        { year: 2021, wins: 38, losses: 24, position: 4, result: 'Półfinał' },
        { year: 2020, wins: 35, losses: 27, position: 6, result: 'Ćwierćfinał' },
        { year: 2019, wins: 30, losses: 32, position: 8, result: 'Play-in' }
    ];
    
    return seasons.map(season => `
        <div class="season-card">
            <div class="season-header">
                <div class="season-year">Sezon ${season.year}</div>
                <div class="season-result">${season.result}</div>
            </div>
            
            <div class="season-stats">
                <div class="stat-item">
                    <div class="stat-number">${season.wins}</div>
                    <div class="stat-name">Wygrane</div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-number">${season.losses}</div>
                    <div class="stat-name">Przegrane</div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-number">${season.position}</div>
                    <div class="stat-name">Miejsce</div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Renderuje legendarne momenty
 */
function renderLegendaryMoments(history) {
    const legendaryEvents = history
        .filter(event => event.importance_level >= 4)
        .slice(0, 4);
    
    if (legendaryEvents.length === 0) {
        return `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🏆</div>
                <p>Brak legendarnych momentów</p>
                <p style="font-size: 0.9rem;">Zdobywaj ważne trofea aby się tu pojawiły!</p>
            </div>
        `;
    }
    
    return legendaryEvents.map(event => {
        const momentIcons = {
            'championship': '🏆',
            'achievement': '⭐',
            'record': '📊',
            'other': '🎉'
        };
        
        return `
            <div class="moment-card">
                <div class="moment-icon">${momentIcons[event.event_type] || '🎉'}</div>
                <div class="moment-title">${event.title}</div>
                <div class="moment-description">${event.description || 'Legendarne osiągnięcie'}</div>
            </div>
        `;
    }).join('');
}

/**
 * Pobiera historię klubu
 */
async function fetchClubHistory(teamId) {
    const { data, error } = await supabaseClient
        .from('club_history')
        .select('*')
        .eq('team_id', teamId)
        .order('event_date', { ascending: false })
        .limit(20);
    
    if (error) throw error;
    return data || [];
}

/**
 * Pobiera trofea klubu
 */
async function fetchClubTrophies(teamId) {
    const { data, error } = await supabaseClient
        .from('club_trophies')
        .select('*')
        .eq('team_id', teamId)
        .order('obtained_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

/**
 * Pobiera historię transferów
 */
async function fetchTransferHistory(teamId) {
    const { data, error } = await supabaseClient
        .from('transfers')
        .select('*')
        .or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`)
        .order('transfer_date', { ascending: false })
        .limit(50);
    
    if (error) throw error;
    return data || [];
}
