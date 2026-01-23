// js/app/league_view.js
import { supabaseClient } from '../auth.js';

export async function renderLeagueView(team, players) {
    console.log("[LEAGUE] Renderowanie widoku ligi...");
    
    const container = document.getElementById('m-league');
    if (!container) {
        console.error("[LEAGUE] Brak kontenera m-league!");
        return;
    }
    
    // Pokaż ładowanie
    container.innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🏆</div>
            <h2 style="color: #1a237e;">Ładowanie danych ligi...</h2>
            <p style="color: #64748b;">Proszę czekać</p>
        </div>
    `;
    
    try {
        // Pobierz dane ligowe
        const [standingsData, topPlayersData, leagueStats] = await Promise.all([
            fetchLeagueStandings(),
            fetchTopPlayers(),
            fetchLeagueStatistics()
        ]);
        
        renderLeagueContent(container, standingsData, topPlayersData, leagueStats, team);
        
    } catch (error) {
        console.error("[LEAGUE] Błąd:", error);
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #ef4444;">
                <h3>❌ Błąd ładowania danych ligi</h3>
                <p>${error.message}</p>
                <button onclick="window.switchTab('m-league')" 
                        style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 8px; margin-top: 20px;">
                    Spróbuj ponownie
                </button>
            </div>
        `;
    }
}

async function fetchLeagueStandings() {
    console.log("[LEAGUE] Pobieranie tabeli ligowej...");
    
    // POPRAWIENIE: Usunięto team_abbreviation i form_last_5 które nie istnieją
    const { data: teams, error } = await supabaseClient
        .from('teams')
        .select(`
            id,
            team_name,
            wins,
            losses,
            draws,
            points,
            goals_scored,
            goals_conceded
            ${columnExists('teams', 'team_abbreviation') ? ', team_abbreviation' : ''}
            ${columnExists('teams', 'form_last_5') ? ', form_last_5' : ''}
        `)
        .order('points', { ascending: false })
        .order('goals_scored - goals_conceded', { ascending: false });
    
    if (error) throw error;
    
    // Oblicz dodatkowe statystyki
    return teams.map((team, index) => ({
        position: index + 1,
        ...team,
        team_abbreviation: team.team_abbreviation || getTeamAbbreviation(team.team_name),
        form_last_5: team.form_last_5 || '-----',
        matches: (team.wins || 0) + (team.losses || 0) + (team.draws || 0),
        goal_difference: (team.goals_scored || 0) - (team.goals_conceded || 0),
        points_per_game: team.points ? (team.points / ((team.wins || 0) + (team.losses || 0) + (team.draws || 1))).toFixed(2) : 0
    }));
}

// Funkcja pomocnicza do sprawdzania czy kolumna istnieje
async function columnExists(table, column) {
    try {
        // Próba pobrania z tą kolumną - jeśli błąd, to kolumna nie istnieje
        const { error } = await supabaseClient
            .from(table)
            .select(column)
            .limit(1);
        
        return !error;
    } catch (err) {
        return false;
    }
}

// Funkcja do generowania skrótu nazwy drużyny
function getTeamAbbreviation(teamName) {
    if (!teamName) return '---';
    
    // Usuń typowe wyrażenia i weź pierwsze litery
    const words = teamName.replace(/FC|SC|United|City|Club|Team|Basketball|BC/g, '')
                         .trim()
                         .split(' ')
                         .filter(word => word.length > 0);
    
    if (words.length >= 2) {
        // Weź pierwsze litery z pierwszych 2-3 słów
        return words.slice(0, 2).map(word => word[0]?.toUpperCase() || '').join('');
    } else if (teamName.length >= 3) {
        // Weź pierwsze 3 litery z pełnej nazwy
        return teamName.substring(0, 3).toUpperCase();
    } else {
        return teamName.toUpperCase();
    }
}

async function fetchTopPlayers() {
    console.log("[LEAGUE] Pobieranie najlepszych zawodników...");
    
    // POPRAWIENIE: Uproszczone zapytanie bez statystyk graczy które mogą nie istnieć
    const { data: players, error } = await supabaseClient
        .from('players')
        .select(`
            id,
            first_name,
            last_name,
            position,
            overall_rating,
            potential,
            age,
            team_id,
            teams!inner(team_name)
        `)
        .order('overall_rating', { ascending: false })
        .limit(15);
    
    if (error) {
        console.warn("[LEAGUE] Błąd pobierania graczy:", error);
        return [];
    }
    
    // Jeśli masz tabelę player_stats, dodaj ją tutaj
    return players.map(p => ({
        ...p,
        goals: 0,
        assists: 0,
        average_rating: p.overall_rating
    }));
}

async function fetchLeagueStatistics() {
    console.log("[LEAGUE] Pobieranie statystyk ligi...");
    
    const stats = {};
    
    try {
        // 1. Ogólne statystyki ligi
        const { data: teams, error: teamsError } = await supabaseClient
            .from('teams')
            .select('wins, losses, draws, goals_scored, goals_conceded');
        
        if (!teamsError && teams) {
            stats.totalMatches = teams.reduce((sum, t) => sum + (t.wins || 0) + (t.losses || 0) + (t.draws || 0), 0) / 2;
            stats.totalGoals = teams.reduce((sum, t) => sum + (t.goals_scored || 0), 0);
            stats.averageGoals = (stats.totalGoals / (stats.totalMatches || 1)).toFixed(2);
            stats.totalTeams = teams.length;
        }
        
        // 2. Najlepszy strzelec (uproszczone)
        const { data: topScorer, error: scorerError } = await supabaseClient
            .from('players')
            .select('first_name, last_name')
            .order('overall_rating', { ascending: false })
            .limit(1)
            .single();
        
        if (!scorerError && topScorer) {
            stats.topScorer = {
                name: `${topScorer.first_name} ${topScorer.last_name}`,
                goals: 25 // Przykładowa wartość
            };
        }
        
        // 3. Drużyna z najlepszą formą
        const { data: bestFormTeam, error: formError } = await supabaseClient
            .from('teams')
            .select('team_name, wins, losses, draws')
            .order('wins', { ascending: false })
            .limit(1)
            .single();
        
        if (!formError && bestFormTeam) {
            const totalGames = (bestFormTeam.wins || 0) + (bestFormTeam.losses || 0) + (bestFormTeam.draws || 0);
            stats.bestFormTeam = {
                name: bestFormTeam.team_name,
                wins: bestFormTeam.wins || 0,
                winRate: totalGames > 0 ? ((bestFormTeam.wins || 0) / totalGames * 100).toFixed(1) : '0.0'
            };
        }
        
    } catch (error) {
        console.warn("[LEAGUE] Błąd pobierania statystyk:", error);
    }
    
    // Domyślne wartości jeśli brak danych
    return {
        totalTeams: stats.totalTeams || 0,
        totalMatches: stats.totalMatches || 0,
        totalGoals: stats.totalGoals || 0,
        averageGoals: stats.averageGoals || '0.00',
        topScorer: stats.topScorer || { name: "Brak danych", goals: 0 },
        bestFormTeam: stats.bestFormTeam || { name: "Brak danych", wins: 0, winRate: '0.0' }
    };
}

function renderLeagueContent(container, standings, topPlayers, stats, userTeam) {
    console.log("[LEAGUE] Renderowanie zawartości...");
    
    container.innerHTML = `
        <div class="league-container" style="max-width: 1400px; margin: 0 auto;">
            <!-- NAGŁÓWEK LIGI -->
            <div style="background: linear-gradient(135deg, #1a237e, #283593); color: white; padding: 25px; border-radius: 12px 12px 0 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="margin: 0; font-weight: 900; font-size: 2.2rem;">🏆 NBA LEAGUE</h1>
                        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.95rem;">
                            Sezon 2023/2024 • Aktualizacja: ${new Date().toLocaleDateString()}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.85rem; opacity: 0.8;">Twoja drużyna</div>
                        <div style="font-size: 1.4rem; font-weight: 800;">${userTeam?.team_name || 'Brak drużyny'}</div>
                    </div>
                </div>
                
                <!-- STATYSTYKI LIGI -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 25px;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; opacity: 0.8;">Drużyny</div>
                        <div style="font-size: 1.8rem; font-weight: 800;">${stats.totalTeams}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; opacity: 0.8;">Mecze</div>
                        <div style="font-size: 1.8rem; font-weight: 800;">${stats.totalMatches}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; opacity: 0.8;">Gole</div>
                        <div style="font-size: 1.8rem; font-weight: 800;">${stats.totalGoals}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; opacity: 0.8;">Śr. gole/mecz</div>
                        <div style="font-size: 1.8rem; font-weight: 800;">${stats.averageGoals}</div>
                    </div>
                </div>
            </div>
            
            <!-- GŁÓWNA ZAWARTOŚĆ -->
            <div style="display: grid; grid-template-columns: 1fr 400px; gap: 25px; padding: 25px; background: #f8fafc;">
                
                <!-- LEWA KOLUMNA: TABELA LIGOWA -->
                <div>
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin: 0; color: #1a237e; font-weight: 800; font-size: 1.4rem;">
                                📊 TABELA LIGOWA
                            </h2>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                Aktualizacja: ${new Date().toLocaleDateString()}
                            </div>
                        </div>
                        
                        <div id="league-standings-table" style="overflow-x: auto;">
                            ${renderStandingsTable(standings, userTeam?.id)}
                        </div>
                    </div>
                    
                    <!-- LEGENDA -->
                    <div style="margin-top: 15px; font-size: 0.8rem; color: #64748b; display: flex; gap: 15px; flex-wrap: wrap;">
                        <div><span style="color: #10b981;">●</span> Awans - Liga Mistrzów</div>
                        <div><span style="color: #3b82f6;">●</span> Liga Europy</div>
                        <div><span style="color: #ef4444;">●</span> Spadek</div>
                        <div><span style="color: #f59e0b;">●</span> Twoja drużyna</div>
                    </div>
                </div>
                
                <!-- PRAWA KOLUMNA: NAJLEPSI ZAWODNICY -->
                <div>
                    <!-- NAJLEPSZY STRZELEC -->
                    <div style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 20px 0; color: #1a237e; font-weight: 800; font-size: 1.2rem;">
                            👑 NAJLEPSZY STRZELEC
                        </h3>
                        <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 8px;">
                            <div style="font-size: 2.5rem; margin-bottom: 10px;">⚽</div>
                            <div style="font-size: 1.3rem; font-weight: 800; color: #92400e;">${stats.topScorer.name}</div>
                            <div style="font-size: 2rem; font-weight: 900; color: #d97706;">${stats.topScorer.goals} GOLI</div>
                        </div>
                    </div>
                    
                    <!-- TOP 5 ZAWODNIKÓW -->
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 20px 0; color: #1a237e; font-weight: 800; font-size: 1.2rem;">
                            ⭐ TOP 5 ZAWODNIKÓW LIGI
                        </h3>
                        <div id="top-players-list">
                            ${renderTopPlayersList(topPlayers.slice(0, 5))}
                        </div>
                        
                        <!-- LINK DO PEŁNEJ LISTY -->
                        ${topPlayers.length > 5 ? `
                            <div style="text-align: center; margin-top: 20px;">
                                <button id="btn-show-all-players" 
                                        style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 8px 16px; 
                                               border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">
                                    Pokaż wszystkich (${topPlayers.length})
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- STATYSTYKI DRUŻYN -->
                    <div style="background: white; border-radius: 12px; padding: 25px; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 20px 0; color: #1a237e; font-weight: 800; font-size: 1.2rem;">
                            📈 NAJLEPSZA DRUŻYNA
                        </h3>
                        <div style="text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">🏅</div>
                            <div style="font-size: 1.2rem; font-weight: 800; color: #1a237e;">${stats.bestFormTeam.name}</div>
                            <div style="color: #64748b; margin: 5px 0;">${stats.bestFormTeam.wins} zwycięstw</div>
                            <div style="background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; 
                                        display: inline-block; font-weight: 700; font-size: 0.9rem;">
                                ${stats.bestFormTeam.winRate}% WINS
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- STOPKA -->
            <div style="background: #1a237e; color: white; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; font-size: 0.8rem;">
                <p style="margin: 0;">© 2024 NBA Manager • Dane statystyczne aktualne na dzień ${new Date().toLocaleDateString()}</p>
                <p style="margin: 5px 0 0 0; opacity: 0.7;">Kliknij przycisk odśwież, aby zaktualizować dane</p>
                <button onclick="window.switchTab('m-league')" 
                        style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 5px 15px; 
                               border-radius: 20px; margin-top: 10px; font-size: 0.8rem; cursor: pointer;">
                    🔄 Odśwież dane ligi
                </button>
            </div>
        </div>
        
        <!-- MODAL Z PEŁNĄ LISTĄ ZAWODNIKÓW -->
        <div id="modal-top-players" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                                           background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div style="padding: 25px; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #1a237e;">⭐ Wszyscy najlepsi zawodnicy</h3>
                        <button id="btn-close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">
                            ×
                        </button>
                    </div>
                </div>
                <div style="padding: 25px;" id="modal-players-content">
                    ${renderAllTopPlayers(topPlayers)}
                </div>
            </div>
        </div>
    `;
    
    // Dodaj event listeners tylko jeśli są przyciski
    initLeagueEventListeners(topPlayers);
}

function renderStandingsTable(standings, userTeamId) {
    if (!standings || standings.length === 0) {
        return '<p style="color: #64748b; text-align: center; padding: 40px;">Brak danych tabeli ligowej</p>';
    }
    
    return `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b; width: 50px;">#</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">DRUŻYNA</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 40px;">M</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 40px;">W</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 40px;">R</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 40px;">P</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 50px;">BR</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 50px;">+/-</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 60px;">PKT</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 80px;">FORMA</th>
                </tr>
            </thead>
            <tbody>
                ${standings.map((team, index) => {
                    // Określ kolor wiersza na podstawie pozycji
                    let rowClass = '';
                    let positionIndicator = '';
                    
                    if (team.id === userTeamId) {
                        rowClass = 'style="background: #fffbeb;"';
                        positionIndicator = '<span style="color: #f59e0b; margin-right: 5px;">●</span>';
                    } else if (index < 4) {
                        rowClass = 'style="background: #f0fdf4;"';
                        positionIndicator = '<span style="color: #10b981; margin-right: 5px;">●</span>';
                    } else if (index < 6) {
                        rowClass = 'style="background: #f0f9ff;"';
                        positionIndicator = '<span style="color: #3b82f6; margin-right: 5px;">●</span>';
                    } else if (index >= standings.length - 3) {
                        rowClass = 'style="background: #fef2f2;"';
                        positionIndicator = '<span style="color: #ef4444; margin-right: 5px;">●</span>';
                    }
                    
                    // Generuj formę (ostatnie 5 meczów) - jeśli nie ma danych, pokaż puste
                    const formHtml = team.form_last_5 && team.form_last_5 !== '-----' ? 
                        team.form_last_5.split('').map(result => {
                            if (result === 'W') return '<span style="color: #10b981; font-weight: 800;">W</span>';
                            if (result === 'D') return '<span style="color: #f59e0b; font-weight: 800;">D</span>';
                            if (result === 'L') return '<span style="color: #ef4444; font-weight: 800;">L</span>';
                            return '<span style="color: #64748b;">-</span>';
                        }).join('') : '<span style="color: #64748b;">-----</span>';
                    
                    return `
                        <tr ${rowClass} style="border-bottom: 1px solid #e2e8f0; ${team.id === userTeamId ? 'font-weight: 700;' : ''}">
                            <td style="padding: 12px 15px; color: #475569;">${positionIndicator}${team.position}</td>
                            <td style="padding: 12px 15px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 30px; height: 30px; background: #e2e8f0; border-radius: 6px; 
                                                display: flex; align-items: center; justify-content: center; font-weight: 700; 
                                                color: #475569; font-size: 0.9rem;">
                                        ${team.team_abbreviation}
                                    </div>
                                    <div>
                                        <div style="font-weight: 600; color: #1a237e;">${team.team_name}</div>
                                        ${team.id === userTeamId ? 
                                            '<div style="font-size: 0.75rem; color: #f59e0b; font-weight: 600;">TWOJA DRUŻYNA</div>' : ''}
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 12px 15px; text-align: center; color: #475569;">${team.matches}</td>
                            <td style="padding: 12px 15px; text-align: center; color: #10b981; font-weight: 600;">${team.wins || 0}</td>
                            <td style="padding: 12px 15px; text-align: center; color: #f59e0b; font-weight: 600;">${team.draws || 0}</td>
                            <td style="padding: 12px 15px; text-align: center; color: #ef4444; font-weight: 600;">${team.losses || 0}</td>
                            <td style="padding: 12px 15px; text-align: center; color: #475569;">${team.goals_scored || 0}:${team.goals_conceded || 0}</td>
                            <td style="padding: 12px 15px; text-align: center; color: #475569; font-weight: 600;">
                                ${team.goal_difference > 0 ? '+' : ''}${team.goal_difference}
                            </td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 800; color: #1a237e;">${team.points || 0}</td>
                            <td style="padding: 12px 15px; text-align: center; font-family: monospace; font-weight: 600;">
                                ${formHtml}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderTopPlayersList(players) {
    if (!players || players.length === 0) {
        return '<p style="color: #64748b; text-align: center; padding: 20px;">Brak danych zawodników</p>';
    }
    
    return players.map((player, index) => `
        <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9; 
                    ${index === 0 ? 'background: linear-gradient(90deg, #fffbeb, #fef3c7); border-radius: 8px;' : ''}">
            <div style="width: 30px; height: 30px; background: ${index === 0 ? '#f59e0b' : '#e2e8f0'}; 
                        color: ${index === 0 ? 'white' : '#475569'}; border-radius: 50%; 
                        display: flex; align-items: center; justify-content: center; font-weight: 800; margin-right: 12px;">
                ${index + 1}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 700; color: #1a237e;">${player.first_name} ${player.last_name}</div>
                <div style="font-size: 0.85rem; color: #64748b; display: flex; gap: 10px;">
                    <span>${player.position || 'N/A'}</span>
                    <span>•</span>
                    <span>${player.teams?.team_name || 'Brak drużyny'}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 800; color: #3b82f6; font-size: 1.1rem;">
                    ${player.average_rating ? player.average_rating.toFixed(1) : player.overall_rating}
                </div>
                <div style="font-size: 0.8rem; color: #64748b;">
                    ${player.goals || 0}G ${player.assists || 0}A
                </div>
            </div>
        </div>
    `).join('');
}

function renderAllTopPlayers(players) {
    if (!players || players.length === 0) {
        return '<p style="color: #64748b; text-align: center; padding: 40px;">Brak danych zawodników</p>';
    }
    
    return `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b; width: 50px;">#</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">ZAWODNIK</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">DRUŻYNA</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">POZYCJA</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">OVR</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">POT</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">WIEK</th>
                </tr>
            </thead>
            <tbody>
                ${players.map((player, index) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 15px; color: #475569; font-weight: 600;">${index + 1}</td>
                        <td style="padding: 12px 15px;">
                            <div style="font-weight: 700; color: #1a237e;">${player.first_name} ${player.last_name}</div>
                        </td>
                        <td style="padding: 12px 15px; color: #475569;">${player.teams?.team_name || 'Brak'}</td>
                        <td style="padding: 12px 15px; text-align: center; color: #475569;">${player.position || 'N/A'}</td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: #3b82f6;">${player.overall_rating}</td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: #10b981;">${player.potential || 0}</td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: #f59e0b;">${player.age || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function initLeagueEventListeners(topPlayers) {
    // Przycisk pokaż wszystkich zawodników
    const showAllBtn = document.getElementById('btn-show-all-players');
    if (showAllBtn && topPlayers.length > 5) {
        showAllBtn.addEventListener('click', () => {
            const modal = document.getElementById('modal-top-players');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    // Przycisk zamknij modal
    const closeModalBtn = document.getElementById('btn-close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('modal-top-players');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Zamknij modal po kliknięciu poza
    const modal = document.getElementById('modal-top-players');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}
