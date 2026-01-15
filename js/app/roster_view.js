// js/app/roster_view.js
import { supabaseClient } from '../auth.js';

/**
 * Renderuje widok listy zawodników (Roster)
 */
export async function renderRosterView(teamData, players) {
    // KLUCZOWA ZMIANA: Celujemy w roster-view-container, nie app-main-view
    const container = document.getElementById('roster-view-container');
    if (!container) {
        console.error("Błąd: Nie znaleziono kontenera #roster-view-container");
        return;
    }

    // Sortowanie zawodników do sekcji TOP (Liderzy)
    // Jeśli tabela statystyk nie istnieje, bierzemy po prostu najlepszych wg OVR
    const sortedByOvr = [...players].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
    const topScorer = sortedByOvr[0]; 
    const topRebounder = sortedByOvr[1];
    const topAssists = sortedByOvr[2];

    const teamDisplayName = teamData.team_name || "Twój Zespół";

    container.innerHTML = `
        <div class="roster-container" style="padding: 30px; color: #333; font-family: 'Inter', sans-serif; background: #f4f7f6; min-height: 100vh;">
            
            <header style="margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="font-size: 2.2em; font-weight: 800; color: #1a237e; margin:0; letter-spacing: -1px;">ROSTER <span style="color: #e65100;">MANAGEMENT</span></h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Current squad: <strong style="color: #1a237e;">${teamDisplayName}</strong></p>
                </div>
                <div style="background: #1a237e; color: white; padding: 12px 24px; border-radius: 50px; font-weight: bold; font-size: 0.9em;">
                    🏀 SQUAD SIZE: ${players.length}
                </div>
            </header>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; margin-bottom: 40px;">
                ${renderTopPlayerCard('TEAM LEADER', topScorer, '🔥')}
                ${renderTopPlayerCard('VETERAN', topRebounder, '💪')}
                ${renderTopPlayerCard('PROSPECT', topAssists, '🪄')}
            </div>

            <div style="background: white; border-radius: 20px; padding: 0; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;">
                <div style="padding: 25px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0; font-size: 1.1em; font-weight: 700; color: #1a237e; text-transform: uppercase; letter-spacing: 1px;">Full Squad List</h3>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background: #f8f9fa; color: #999; font-size: 0.8em; text-transform: uppercase;">
                        <tr>
                            <th style="padding: 15px 25px;">Player</th>
                            <th style="padding: 15px;">Pos</th>
                            <th style="padding: 15px;">Age</th>
                            <th style="padding: 15px;">Height</th>
                            <th style="padding: 15px;">Salary</th>
                            <th style="padding: 15px;">OVR</th>
                            <th style="padding: 15px; text-align: center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${players.map(player => renderPlayerRow(player)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderTopPlayerCard(title, player, emoji) {
    if (!player) return '';
    return `
        <div style="background: white; padding: 25px; border-radius: 20px; border: 1px solid #e0e0e0; display: flex; align-items: center; gap: 20px; position: relative; overflow: hidden;">
            <div style="position: absolute; right: -10px; top: -10px; font-size: 4em; opacity: 0.05;">${emoji}</div>
            <img src="https://via.placeholder.com/80/1a237e/FFFFFF?text=${player.position}" style="width: 80px; height: 80px; border-radius: 15px; object-fit: cover; background: #f0f2f5;">
            <div>
                <div style="font-size: 0.7em; color: #e65100; font-weight: 800; letter-spacing: 1px; margin-bottom: 5px;">${title}</div>
                <div style="font-size: 1.2em; font-weight: 800; color: #1a237e;">${player.first_name} ${player.last_name}</div>
                <div style="font-size: 0.85em; color: #666; margin-top: 3px;">
                    ${player.position} | ${player.age} yrs | $${(player.salary || 50000).toLocaleString()}
                </div>
            </div>
        </div>
    `;
}

function renderPlayerRow(player) {
    return `
        <tr style="border-bottom: 1px solid #f8f9fa; transition: 0.2s;" onmouseover="this.style.background='#fcfdfe'" onmouseout="this.style.background='transparent'">
            <td style="padding: 15px 25px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 40px; height: 40px; border-radius: 8px; background: #eee; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#aaa;">${player.position[0]}</div>
                    <div>
                        <div style="font-weight: 700; color: #1a237e;">${player.first_name} ${player.last_name}</div>
                        <div style="font-size: 0.75em; color: #999;">#${player.id.slice(0,5)}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px; font-weight: 600; color: #444;">${player.position}</td>
            <td style="padding: 15px; color: #666;">${player.age}</td>
            <td style="padding: 15px; color: #666;">${player.height || '---'} cm</td> 
            <td style="padding: 15px; font-family: monospace; font-weight: 600;">$${(player.salary || 50000).toLocaleString()}</td>
            <td style="padding: 15px;">
                <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.9em;">
                    ${player.overall_rating || 0}
                </span>
            </td>
            <td style="padding: 15px; text-align: center;">
                <button onclick="window.showPlayerDetails('${player.id}')" style="background: #f0f2f5; border: none; padding: 8px 16px; border-radius: 8px; color: #1a237e; font-weight: 700; cursor: pointer; font-size: 0.8em; transition: 0.3s;" onmouseover="this.style.background='#1a237e'; this.style.color='white'">
                    SHOW DETAILS
                </button>
            </td>
        </tr>
    `;
}

// Globalna funkcja do obsługi kliknięcia
window.showPlayerDetails = (playerId) => {
    console.log("Navigating to player detail view:", playerId);
    // Tutaj w przyszłości dodamy modal lub osobny widok profilu
};
