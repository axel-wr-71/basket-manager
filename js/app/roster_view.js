// js/app/roster_view.js
import { supabaseClient } from '../auth.js';

/**
 * Mapowanie liczbowego potencjału na 10 prestiżowych rang
 */
function getPotentialLabel(pot) {
    if (pot >= 96) return { label: 'G.O.A.T.', color: '#d4af37' };
    if (pot >= 92) return { label: 'All-Time Great', color: '#b8860b' };
    if (pot >= 88) return { label: 'Elite Franchise', color: '#3b82f6' };
    if (pot >= 84) return { label: 'Star Performer', color: '#8b5cf6' };
    if (pot >= 79) return { label: 'High Prospect', color: '#10b981' };
    if (pot >= 74) return { label: 'Solid Starter', color: '#6366f1' };
    if (pot >= 68) return { label: 'Reliable Bench', color: '#64748b' };
    if (pot >= 60) return { label: 'Role Player', color: '#94a3b8' };
    if (pot >= 50) return { label: 'Deep Bench', color: '#cbd5e1' };
    return { label: 'Project Player', color: '#e2e8f0' };
}

/**
 * Renderuje widok listy zawodników (Roster)
 */
export async function renderRosterView(teamData, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) {
        console.error("Błąd: Nie znaleziono kontenera #roster-view-container");
        return;
    }

    const sortedByOvr = [...players].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
    
    // ZMIANA: Prezentujemy 2 główne sloty (Lider i Top Prospect)
    const teamLeader = sortedByOvr[0];
    const topProspect = [...players]
        .filter(p => p.age <= 21)
        .sort((a, b) => (b.potential || 0) - (a.potential || 0))[0];

    const teamDisplayName = teamData.team_name || "Twój Zespół";

    container.innerHTML = `
        <div class="roster-container" style="padding: 30px; color: #333; font-family: 'Inter', sans-serif; background: #f4f7f6; min-height: 100vh;">
            
            <header style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="font-size: 2.2em; font-weight: 800; color: #1a237e; margin:0; letter-spacing: -1px;">ROSTER <span style="color: #e65100;">MANAGEMENT</span></h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Current squad: <strong style="color: #1a237e;">${teamDisplayName}</strong></p>
                </div>
                <div style="background: #1a237e; color: white; padding: 12px 24px; border-radius: 15px; font-weight: bold; font-size: 0.9em; box-shadow: 0 4px 10px rgba(26,35,126,0.2);">
                    🏀 SQUAD SIZE: ${players.length} / 12
                </div>
            </header>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; margin-bottom: 30px;">
                ${renderFeaturedPlayerCard('FRANCHISE STAR', teamLeader)}
                ${renderFeaturedPlayerCard('FUTURE PILLAR', topProspect || sortedByOvr[1])}
            </div>

            <div style="background: white; border-radius: 20px; padding: 0; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;">
                <div style="padding: 25px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff;">
                    <h3 style="margin:0; font-size: 1.1em; font-weight: 700; color: #1a237e; text-transform: uppercase; letter-spacing: 1px;">Full Squad List</h3>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background: #f8f9fa; color: #94a3b8; font-size: 0.75em; text-transform: uppercase; letter-spacing: 1px;">
                        <tr>
                            <th style="padding: 15px 25px;">Player & Scouting Report</th>
                            <th style="padding: 15px;">Pos</th>
                            <th style="padding: 15px;">Age</th>
                            <th style="padding: 15px;">Potential Class</th>
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

function renderFeaturedPlayerCard(title, player) {
    if (!player) return '';
    const pot = getPotentialLabel(player.potential);
    // Dynamiczna miniaturka (awatar) na podstawie nazwiska
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}&backgroundColor=b6e3f4`;
    
    return `
        <div style="background: #1a237e; padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; color: white; box-shadow: 0 10px 20px rgba(26,35,126,0.2);">
            <img src="${avatarUrl}" style="width: 80px; height: 80px; border-radius: 50%; background: white; border: 3px solid #e65100; object-fit: cover;">
            <div>
                <div style="font-size: 0.65em; color: #e65100; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 5px; text-transform: uppercase;">${title}</div>
                <div style="font-size: 1.4em; font-weight: 800;">${player.first_name} ${player.last_name}</div>
                <div style="font-size: 0.85em; color: #a5b4fc; font-weight: 600; margin-top: 4px;">
                    ${player.position} | <span style="color: ${pot.color}">${pot.label}</span>
                </div>
            </div>
        </div>
    `;
}

function renderPlayerRow(player) {
    const pot = getPotentialLabel(player.potential);
    const isRookie = player.age <= 19;

    return `
        <tr style="border-bottom: 1px solid #f8f9fa; transition: 0.2s;" onmouseover="this.style.background='#fcfdfe'" onmouseout="this.style.background='transparent'">
            <td style="padding: 20px 25px;">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 800; color: #1a237e; font-size: 1.1em;">${player.first_name} ${player.last_name}</span>
                        ${isRookie ? '<span style="background:#ef4444; color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:900;">ROOKIE</span>' : ''}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8f9fa; padding: 12px; border-radius: 12px; border: 1px solid #f0f0f0; max-width: 450px;">
                        <div>
                            <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Attack</div>
                            ${renderSkillMini('Inside', player.skill_inside_scoring)}
                            ${renderSkillMini('Mid', player.skill_mid_range)}
                            ${renderSkillMini('3PT', player.skill_three_point)}
                            ${renderSkillMini('Pass', player.skill_passing)}
                        </div>
                        <div>
                            <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Defense</div>
                            ${renderSkillMini('Int.Def', player.skill_interior_defense)}
                            ${renderSkillMini('Per.Def', player.skill_perimeter_defense)}
                            ${renderSkillMini('Steal', player.skill_steal)}
                            ${renderSkillMini('Block', player.skill_block)}
                        </div>
                        <div>
                            <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">General</div>
                            ${renderSkillMini('O.Reb', player.skill_offensive_rebound)}
                            ${renderSkillMini('D.Reb', player.skill_defensive_rebound)}
                            ${renderSkillMini('Dribble', player.skill_ball_handling)}
                            ${renderSkillMini('FT', player.skill_free_throw)}
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px;">
                <div style="font-size: 0.85em; font-weight: 600; color: #444; background: #f0f2f5; display: inline-block; padding: 4px 12px; border-radius: 20px;">
                    ${player.position}
                </div>
            </td>
            <td style="padding: 15px; color: #666; font-weight: 600;">${player.age}</td>
            <td style="padding: 15px;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 800; color: ${pot.color}; font-size: 0.85em;">${pot.label}</span>
                    <div style="width: 80px; height: 4px; background: #eee; border-radius: 2px; margin-top: 4px;">
                        <div style="width: ${player.potential}%; height: 100%; background: ${pot.color}; border-radius: 2px;"></div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #2e7d32; font-size: 0.9em;">
                $${(player.salary || 50000).toLocaleString()}
            </td>
            <td style="padding: 15px;">
                <div style="width: 45px; height: 45px; border-radius: 12px; background: #e8f5e9; color: #2e7d32; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1em; border: 2px solid #c8e6c9;">
                    ${player.overall_rating || 0}
                </div>
            </td>
            <td style="padding: 15px; text-align: center;">
                <button onclick="window.showPlayerDetails('${player.id}')" style="background: white; border: 1px solid #e0e0e0; padding: 8px 16px; border-radius: 10px; color: #1a237e; font-weight: 700; cursor: pointer; font-size: 0.75em; transition: 0.3s;" onmouseover="this.style.background='#1a237e'; this.style.color='white'; this.style.borderColor='#1a237e'">
                    DEVELOPMENT
                </button>
            </td>
        </tr>
    `;
}

function renderSkillMini(name, val) {
    let color = '#444';
    if (val >= 16) color = '#10b981'; // Green for high skills
    if (val <= 6) color = '#ef4444';  // Red for low skills

    return `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; border-bottom: 1px solid rgba(0,0,0,0.03);">
            <span style="color: #64748b; font-weight: 500;">${name}</span>
            <span style="font-weight: 800; color: ${color};">${val}</span>
        </div>
    `;
}

// Globalna funkcja do obsługi kliknięcia - Profil Rozwoju
window.showPlayerDetails = (playerId) => {
    console.log("Opening Development Hub for player:", playerId);
};
