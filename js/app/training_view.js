import { supabaseClient } from '../auth.js';

// --- LOGIKA OBLICZEŃ ---
function calculateTotalSkills(p) {
    const skills = [
        p.skill_2pt, p.skill_3pt, p.skill_dunk, p.skill_ft, p.skill_passing, 
        p.skill_dribbling, p.skill_stamina, p.skill_rebound, p.skill_block, 
        p.skill_steal, p.skill_1on1_off, p.skill_1on1_def
    ];
    return skills.reduce((a, b) => (a || 0) + (parseInt(b) || 0), 0);
}

function getFlagUrl(countryCode) {
    if (!countryCode) return '';
    const code = String(countryCode).toLowerCase().trim();
    const finalCode = (code === 'el') ? 'gr' : code;
    return `assets/flags/${finalCode}.png`;
}

const TEAM_DRILLS = [
    { id: 'T_OFF_FB', name: 'Fast Break Mastery', skills: ['Dribbling', 'Passing', 'Dunking'] },
    { id: 'T_DEF_PL', name: 'Perimeter Lockdown', skills: ['1on1 Def', 'Stealing', 'Stamina'] },
    { id: 'T_DEF_PP', name: 'Paint Protection', skills: ['Blocking', 'Rebound', '1on1 Def'] },
    { id: 'T_OFF_MO', name: 'Motion Offense', skills: ['Passing', '2pt Shot', '3pt Shot'] },
    { id: 'T_OFF_PR', name: 'Pick & Roll Logic', skills: ['Passing', 'Dribbling', '2pt Shot'] },
    { id: 'T_SHOOT', name: 'Sharp Shooter Hub', skills: ['3pt Shot', 'Free Th.', '1on1 Off'] },
    { id: 'T_POST', name: 'Post Dominance', skills: ['Dunking', 'Rebound', '1on1 Off'] },
    { id: 'T_PHYS', name: 'Iron Defense', skills: ['Stealing', 'Blocking', 'Stamina'] },
    { id: 'T_TRANS', name: 'Transition Game', skills: ['Dribbling', 'Stamina', 'Passing'] },
    { id: 'T_ISO', name: 'Iso-Scoring Focus', skills: ['1on1 Off', '2pt Shot', 'Dunking'] }
];

export async function renderTrainingView(team, players, currentWeek) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    const currentDrillId = team?.current_team_drill || 'T_OFF_FB';

    let html = `
        <div class="training-header" style="padding: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
                <h1 style="margin:0; font-weight:900; color:#1a237e; letter-spacing:-1px; font-size: 2rem;">TRAINING <span style="color:#e65100">CENTER</span></h1>
                <p style="margin:0; color:#64748b; font-weight: 500;">Season 1 | Week ${currentWeek} | Team Practice Management</p>
            </div>
            <div style="text-align: right;">
                <span style="background:#f1f5f9; padding: 8px 15px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color:#1e293b; border: 1px solid #e2e8f0;">
                    STAFF EFFICIENCY: <span style="color:#059669">+${((team.coach_general_lvl || 1) * 2.5).toFixed(1)}%</span>
                </span>
            </div>
        </div>

        <div style="margin: 0 25px 30px 25px; background: #1a237e; border-radius: 20px; padding: 25px; color: white; box-shadow: 0 15px 30px rgba(26,35,126,0.2);">
            <div style="margin-bottom: 20px;">
                <h3 style="margin:0; text-transform: uppercase; letter-spacing: 1px; color: #ffab40; font-size: 0.9rem;">Global Team Focus (Mon/Fri)</h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
                ${TEAM_DRILLS.map(drill => {
                    const isSelected = currentDrillId === drill.id;
                    return `
                    <div onclick="window.updateTeamDrill('${team.id}', '${drill.id}')" 
                         style="background: ${isSelected ? '#ffab40' : 'rgba(255,255,255,0.05)'}; 
                                color: ${isSelected ? '#1a237e' : 'white'};
                                padding: 15px 10px; border-radius: 12px; cursor: pointer; text-align:center; transition: 0.3s;
                                border: 1px solid ${isSelected ? '#ffab40' : 'rgba(255,255,255,0.1)'};">
                        <div style="font-weight: 900; font-size: 0.75rem; margin-bottom: 4px;">${drill.name}</div>
                        <div style="font-size: 0.55rem; opacity: ${isSelected ? '0.9' : '0.5'}; font-weight: 700;">${drill.skills.join(' • ')}</div>
                    </div>`}).join('')}
            </div>
        </div>

        <div style="margin: 0 25px;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 12px;">
                <thead>
                    <tr style="text-align: left; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">
                        <th style="padding: 10px 25px;">Player & Potential</th>
                        <th style="padding: 10px; text-align: center;">Skill Points (Max 240)</th>
                        <th style="padding: 10px;">Individual Drill (Thu)</th>
                        <th style="padding: 10px; text-align: right;">Last Growth</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map(p => {
                        const currentTotal = calculateTotalSkills(p);
                        const maxCap = p.max_total_cap || 240;
                        const pot = p.potential_definitions || { label: 'Prospect', color_hex: '#94a3b8', emoji: '👤' };
                        const progressPercent = (currentTotal / maxCap) * 100;
                        const flagUrl = getFlagUrl(p.country);
                        
                        return `
                        <tr style="background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border-radius: 16px;">
                            <td style="padding: 18px 25px; border-radius: 16px 0 0 16px; border: 1px solid #f1f5f9; border-right: none;">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" style="width: 45px; height: 45px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
                                    <div>
                                        <div style="font-weight: 800; color: #1a237e; font-size: 0.95rem; display:flex; align-items:center; gap:6px;">
                                            ${p.first_name} ${p.last_name} ${flagUrl ? `<img src="${flagUrl}" style="width:14px;">` : ''}
                                        </div>
                                        <div style="font-size: 0.65rem; font-weight: 800; color: ${pot.color_hex}; text-transform: uppercase;">
                                            ${pot.emoji} ${pot.label}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 18px 10px; text-align: center;">
                                <div style="font-size: 0.9rem; font-weight: 900; color: #1e293b; margin-bottom:6px;">${currentTotal} / ${maxCap}</div>
                                <div style="width: 100px; height: 6px; background: #f1f5f9; border-radius: 10px; margin: 0 auto; overflow: hidden;">
                                    <div style="width: ${progressPercent}%; height: 100%; background: ${pot.color_hex};"></div>
                                </div>
                            </td>
                            <td style="padding: 18px 10px;">
                                <select onchange="window.updatePlayerFocus('${p.id}', this.value)" 
                                        style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.75rem; font-weight: 700; color: #1a237e; background: #f8fafc;">
                                    <option value="GENERAL" ${p.individual_training_skill === 'GENERAL' ? 'selected' : ''}>General</option>
                                    <option value="OFFENSE" ${p.individual_training_skill === 'OFFENSE' ? 'selected' : ''}>Offense</option>
                                    <option value="DEFENSE" ${p.individual_training_skill === 'DEFENSE' ? 'selected' : ''}>Defense</option>
                                    <option value="PHYSICAL" ${p.individual_training_skill === 'PHYSICAL' ? 'selected' : ''}>Physical</option>
                                </select>
                            </td>
                            <td style="padding: 18px 25px; text-align: right; border-radius: 0 16px 16px 0; border: 1px solid #f1f5f9; border-left: none;">
                                <div style="font-weight: 900; color: #059669; font-family: monospace;">+${(p.last_training_growth || 0).toFixed(3)}</div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

window.updateTeamDrill = async (teamId, drillId) => {
    await supabaseClient.from('teams').update({ current_team_drill: drillId }).eq('id', teamId);
    console.log("Team Drill Updated:", drillId);
};

window.updatePlayerFocus = async (playerId, focusValue) => {
    await supabaseClient.from('players').update({ individual_training_skill: focusValue }).eq('id', playerId);
    console.log("Player Focus Updated:", focusValue);
};
