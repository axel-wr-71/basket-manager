// js/app/roster_view.js
import { supabaseClient } from '../auth.js';

/**
 * Mapowanie liczbowego potencjału na prestiżowe rangi
 */
function getPotentialLabel(pot) {
    const p = parseInt(pot) || 0;
    if (p >= 96) return { label: 'G.O.A.T.', color: '#d4af37' };
    if (p >= 92) return { label: 'All-Time Great', color: '#b8860b' };
    if (p >= 88) return { label: 'Elite Franchise', color: '#3b82f6' };
    if (p >= 84) return { label: 'Star Performer', color: '#8b5cf6' };
    if (p >= 79) return { label: 'High Prospect', color: '#10b981' };
    if (p >= 74) return { label: 'Solid Starter', color: '#6366f1' };
    if (p >= 68) return { label: 'Reliable Bench', color: '#64748b' };
    if (p >= 60) return { label: 'Role Player', color: '#94a3b8' };
    if (p >= 50) return { label: 'Deep Bench', color: '#cbd5e1' };
    return { label: 'Project Player', color: '#94a3b8' };
}

/**
 * Zwraca kolor dla wartości umiejętności (Skala 1-20)
 */
function getSkillColor(val) {
    const v = parseInt(val) || 0;
    if (v >= 19) return '#d4af37'; // Złoty (GOAT)
    if (v >= 17) return '#8b5cf6'; // Fioletowy (Elite)
    if (v >= 15) return '#10b981'; // Zielony (Great)
    if (v >= 13) return '#06b6d4'; // Morski (Good)
    if (v >= 11) return '#3b82f6'; // Niebieski (Solid)
    if (v >= 9)  return '#64748b'; // Stalowy (Average)
    if (v >= 7)  return '#475569'; // CIEMNIEJSZY (Raw) - poprawione dla widoczności
    if (v >= 5)  return '#f59e0b'; // Mocniejszy żółty (Weak)
    if (v >= 3)  return '#f97316'; // Pomarańczowy (Poor)
    return '#ef4444';             // Czerwony (Critical)
}

export async function renderRosterView(teamData, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    const safePlayers = Array.isArray(players) ? players : [];
    const sortedByOvr = [...safePlayers].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
    
    const teamLeader = sortedByOvr[0];
    const topProspect = safePlayers
        .filter(p => p.age <= 21)
        .sort((a, b) => (b.potential || 0) - (a.potential || 0))[0];

    container.innerHTML = `
        <div class="roster-container" style="padding: 30px; color: #333; font-family: 'Inter', sans-serif; background: #f4f7f6; min-height: 100vh;">
            <header style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="font-size: 2.2em; font-weight: 800; color: #1a237e; margin:0; letter-spacing: -1px;">ROSTER <span style="color: #e65100;">MANAGEMENT</span></h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Current squad: <strong style="color: #1a237e;">${teamData.team_name || "Twój Zespół"}</strong></p>
                </div>
                <div style="background: #1a237e; color: white; padding: 12px 24px; border-radius: 15px; font-weight: bold; font-size: 0.9em; box-shadow: 0 4px 10px rgba(26,35,126,0.2);">
                    🏀 SQUAD SIZE: ${safePlayers.length} / 12
                </div>
            </header>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; margin-bottom: 30px;">
                ${renderFeaturedPlayerCard('FRANCHISE STAR', teamLeader)}
                ${renderFeaturedPlayerCard('FUTURE PILLAR', topProspect || sortedByOvr[1])}
            </div>

            <div style="background: white; border-radius: 20px; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background: #f8f9fa; color: #94a3b8; font-size: 0.75em; text-transform: uppercase; letter-spacing: 1px;">
                        <tr>
                            <th style="padding: 15px 25px;">Player & Scouting Report</th>
                            <th style="padding: 15px;">Pos</th>
                            <th style="padding: 15px;">Age</th>
                            <th style="padding: 15px;">Height</th>
                            <th style="padding: 15px;">Salary</th>
                            <th style="padding: 15px;">Potential</th>
                            <th style="padding: 15px;">OVR</th>
                            <th style="padding: 15px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${safePlayers.map(player => renderPlayerRow(player)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderFeaturedPlayerCard(title, player) {
    if (!player) return '';
    const pot = getPotentialLabel(player.potential);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}&backgroundColor=b6e3f4`;
    
    return `
        <div style="background: #1a237e; padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; color: white;">
            <img src="${avatarUrl}" style="width: 80px; height: 80px; border-radius: 15px; background: white; border: 3px solid #e65100; object-fit: cover;">
            <div>
                <div style="font-size: 0.65em; color: #e65100; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 5px; text-transform: uppercase;">${title}</div>
                <div style="font-size: 1.4em; font-weight: 800;">${player.first_name} ${player.last_name}</div>
                <div style="font-size: 0.85em; color: #a5b4fc; font-weight: 600;">${player.position} | <span style="color: ${pot.color}">${pot.label}</span></div>
            </div>
        </div>
    `;
}

function renderPlayerRow(player) {
    const potLabel = getPotentialLabel(player.potential);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}&backgroundColor=f0f2f5`;
    
    // Obliczanie paska postępu potencjału
    const currentOvr = player.overall_rating || 0;
    const maxPot = player.potential || 1;
    const progressWidth = Math.min(Math.round((currentOvr / maxPot) * 100), 100);

    return `
        <tr style="border-bottom: 1px solid #f8f9fa; transition: 0.2s;" onmouseover="this.style.background='#fcfdfe'" onmouseout="this.style.background='transparent'">
            <td style="padding: 20px 25px;">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 800; color: #1a237e; font-size: 1.1em;">${player.first_name} ${player.last_name}</span>
                        ${player.is_rookie ? '<span style="background:#ef4444; color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:900;">ROOKIE</span>' : ''}
                    </div>
                    
                    <div style="display: flex; align-items: flex-start; gap: 20px;">
                        <img src="${avatarUrl}" style="width: 60px; height: 60px; border-radius: 12px; border: 1px solid #e0e0e0; background: #fff;">
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8f9fa; padding: 12px; border-radius: 12px; border: 1px solid #f0f0f0; flex-grow: 1; max-width: 400px;">
                            <div>
                                <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Attack</div>
                                ${renderSkillMini('2PT', player.skill_2pt)}
                                ${renderSkillMini('3PT', player.skill_3pt)}
                                ${renderSkillMini('Dunk', player.skill_dunk)}
                                ${renderSkillMini('Pass', player.skill_passing)}
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Defense</div>
                                ${renderSkillMini('1v1 Def', player.skill_1on1_def)}
                                ${renderSkillMini('Reb', player.skill_rebound)}
                                ${renderSkillMini('Block', player.skill_block)}
                                ${renderSkillMini('Steal', player.skill_steal)}
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">General</div>
                                ${renderSkillMini('1v1 Off', player.skill_1on1_off)}
                                ${renderSkillMini('Dribble', player.skill_dribbling)}
                                ${renderSkillMini('Stamina', player.skill_stamina)}
                                ${renderSkillMini('FT', player.skill_ft)}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px;">
                <div style="font-size: 0.85em; font-weight: 600; color: #444; background: #f0f2f5; display: inline-block; padding: 4px 12px; border-radius: 20px;">${player.position}</div>
            </td>
            <td style="padding: 15px; color: #666; font-weight: 600;">${player.age}</td>
            <td style="padding: 15px; color: #666; font-weight: 600;">${player.height || '--'} cm</td>
            <td style="padding: 15px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #2e7d32; font-size: 0.9em;">
                $${(player.salary || 0).toLocaleString()}
            </td>
            <td style="padding: 15px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-weight: 800; color: ${potLabel.color}; font-size: 0.8em; white-space: nowrap;">${potLabel.label}</span>
                    <div style="width: 80px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                        <div style="width: ${progressWidth}%; height: 100%; background: ${potLabel.color};"></div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px;">
                <div style="width: 45px; height: 45px; border-radius: 12px; background: #e8f5e9; color: #2e7d32; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1em; border: 2px solid #c8e6c9;">
                    ${player.overall_rating || 0}
                </div>
            </td>
            <td style="padding: 15px; text-align: center;">
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                    <button onclick="window.sellPlayer('${player.id}')" style="width: 100px; background: #fee2e2; border: 1px solid #ef4444; padding: 6px 0; border-radius: 8px; color: #ef4444; font-weight: 700; cursor: pointer; font-size: 0.7em; transition: 0.2s;" onmouseover="this.style.background='#ef4444'; this.style.color='white'">
                        SELL
                    </button>
                    <button onclick="window.showPlayerProfile('${player.id}')" style="width: 100px; background: white; border: 1px solid #1a237e; padding: 6px 0; border-radius: 8px; color: #1a237e; font-weight: 700; cursor: pointer; font-size: 0.7em; transition: 0.2s;" onmouseover="this.style.background='#1a237e'; this.style.color='white'">
                        PROFILE
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function renderSkillMini(name, val) {
    const v = (val !== undefined && val !== null) ? val : '--';
    const color = getSkillColor(v);
    
    return `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; border-bottom: 1px solid rgba(0,0,0,0.03);">
            <span style="color: #64748b; font-weight: 500;">${name}</span>
            <span style="font-weight: 800; color: ${color};">${v}</span>
        </div>
    `;
}

// Obsługa przycisków
window.showPlayerProfile = (playerId) => {
    console.log("Opening Profile Hub for player:", playerId);
};

window.sellPlayer = (playerId) => {
    const confirmSell = confirm("Czy na pewno chcesz wystawić tego zawodnika na listę transferową?");
    if (confirmSell) {
        console.log("Initiating sale for player:", playerId);
    }
};
