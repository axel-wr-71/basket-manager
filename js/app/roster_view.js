// js/app/roster_view.js
import { supabaseClient } from '../auth.js';

// --- 1. TWOJE FUNKCJE RENDERUJĄCE ---

function getSkillColor(val) {
    const v = parseInt(val) || 0;
    if (v >= 19) return '#d4af37'; 
    if (v >= 17) return '#8b5cf6'; 
    if (v >= 15) return '#10b981'; 
    if (v >= 13) return '#06b6d4'; 
    if (v >= 11) return '#3b82f6'; 
    if (v >= 9)  return '#64748b'; 
    if (v >= 7)  return '#475569'; 
    if (v >= 5)  return '#f59e0b'; 
    if (v >= 3)  return '#f97316'; 
    return '#ef4444';             
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

function renderPlayerRowInternal(player, potLabel) {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}&backgroundColor=f0f2f5`;
    const currentOvr = player.overall_rating || 0;
    const maxPot = player.potential || 1;
    // Logika belki: (OVR / POT) * 100
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
            <td style="padding: 15px;"><div style="font-size: 0.85em; font-weight: 600; color: #444; background: #f0f2f5; display: inline-block; padding: 4px 12px; border-radius: 20px;">${player.position}</div></td>
            <td style="padding: 15px; color: #666; font-weight: 600;">${player.age}</td>
            <td style="padding: 15px; color: #666; font-weight: 600;">${player.height || '--'} cm</td>
            <td style="padding: 15px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #2e7d32; font-size: 0.9em;">$${(player.salary || 0).toLocaleString()}</td>
            <td style="padding: 15px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-weight: 800; color: ${potLabel.color}; font-size: 0.8em; white-space: nowrap;">${potLabel.label}</span>
                    <div style="width: 80px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                        <div style="width: ${progressWidth}%; height: 100%; background: ${potLabel.color};"></div>
                    </div>
                    <span style="font-size: 9px; font-weight: 700; color: #94a3b8;">${progressWidth}% cap</span>
                </div>
            </td>
            <td style="padding: 15px;"><div style="width: 45px; height: 45px; border-radius: 12px; background: #e8f5e9; color: #2e7d32; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1em; border: 2px solid #c8e6c9;">${player.overall_rating || 0}</div></td>
            <td style="padding: 15px; text-align: center;">
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                    <button onclick="window.sellPlayer('${player.id}')" style="width: 100px; background: #fee2e2; border: 1px solid #ef4444; padding: 6px 0; border-radius: 8px; color: #ef4444; font-weight: 700; cursor: pointer; font-size: 0.7em;">SELL</button>
                    <button onclick="window.showPlayerProfile('${player.id}')" style="width: 100px; background: white; border: 1px solid #1a237e; padding: 6px 0; border-radius: 8px; color: #1a237e; font-weight: 700; cursor: pointer; font-size: 0.7em;">PROFILE</button>
                </div>
            </td>
        </tr>
    `;
}

// --- 2. GŁÓWNA FUNKCJA WIDOKU ---

export async function renderRosterView(teamData, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    const safePlayers = Array.isArray(players) ? players : [];

    window.sellPlayer = (playerId) => {
        console.log("Sprzedaż zawodnika:", playerId);
    };

    window.showPlayerProfile = (playerId) => {
        console.log("Profil zawodnika:", playerId);
    };

    container.innerHTML = `
        <div style="padding: 30px; background: #f4f7f6; min-height: 100vh; font-family: 'Inter', sans-serif;">
            <h1 style="color: #1a237e; font-weight: 800; margin-bottom: 20px;">ROSTER MANAGEMENT</h1>
            
            <div style="background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background: #f8f9fa; color: #94a3b8; font-size: 0.75em; text-transform: uppercase;">
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
                        ${safePlayers.map(p => {
                            const potLabel = getPotentialLabel(p.potential);
                            return renderPlayerRowInternal(p, potLabel);
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
