import { supabaseClient } from '../auth.js';

// --- KONFIGURACJA I LABELE ---

const SKILL_LABELS = {
    '2pt': 'Jump Shot', '3pt': '3PT Range', 'dunk': 'Dunking', 'passing': 'Passing',
    '1on1_def': '1on1 Def', 'rebound': 'Rebound', 'block': 'Blocking', 'steal': 'Stealing',
    'dribbling': 'Handling', '1on1_off': '1on1 Off', 'stamina': 'Stamina', 'ft': 'Free Throw'
};

const AVAILABLE_DRILLS = [
    { id: 'T_OFF_FB', name: 'Fast Break Mastery' },
    { id: 'T_DEF_PL', name: 'Perimeter Lockdown' },
    { id: 'T_DEF_PP', name: 'Paint Protection' },
    { id: 'T_OFF_MO', name: 'Motion Offense' },
    { id: 'T_OFF_PR', name: 'Pick & Roll Logic' },
    { id: 'T_SHOOT', name: 'Sharp Shooter Hub' },
    { id: 'T_PHYS', name: 'Iron Defense' },
    { id: 'T_TRANS', name: 'Transition Game' }
];

// --- LOGIKA POMOCNICZA ---

function getTrainingDayInfo(dayName) {
    const days = { 'Monday': 1, 'Friday': 5 };
    const targetDay = days[dayName];
    const now = new Date();
    const trainingDate = new Date(now.getTime());
    trainingDate.setDate(now.getDate() + (7 + targetDay - now.getDay()) % 7);
    trainingDate.setHours(9, 0, 0, 0);

    const diffInMs = trainingDate - now;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const isLocked = diffInHours < 24 && diffInHours > 0;

    return {
        formattedDate: trainingDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        isLocked: isLocked,
        hoursLeft: Math.max(0, Math.floor(diffInHours))
    };
}

function calculateTotalSkills(p) {
    const skills = [
        p.skill_2pt, p.skill_3pt, p.skill_dunk, p.skill_ft, p.skill_passing, 
        p.skill_dribbling, p.skill_stamina, p.skill_rebound, p.skill_block, 
        p.skill_steal, p.skill_1on1_off, p.skill_1on1_def
    ];
    return skills.reduce((a, b) => (a || 0) + (parseInt(b) || 0), 0);
}

// --- RENDEROWANIE WIDOKU ---

export async function renderTrainingView(team, players) {
    const container = document.getElementById('training-view-container');
    if (!container) return;

    const monInfo = getTrainingDayInfo('Monday');
    const friInfo = getTrainingDayInfo('Friday');
    const staffEff = ((team.coach_general_lvl || 0) * 2.5).toFixed(1);
    const currentSeason = team.current_season || 1;

    let html = `
        <div style="padding: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
                <h1 style="margin:0; font-weight:900; color:#1a237e; letter-spacing:-1px; font-size: 2rem;">TRAINING <span style="color:#e65100">CENTER</span></h1>
                <p style="margin:0; color:#64748b; font-weight: 500;">Season ${currentSeason} | Week ${team.current_week} | Management</p>
            </div>
            <div style="text-align: right;">
                <span style="background:#f1f5f9; padding: 8px 15px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color:#1e293b; border: 1px solid #e2e8f0;">
                    STAFF EFFICIENCY: <span style="color:#059669">+${staffEff}%</span>
                </span>
            </div>
        </div>

        <div style="margin: 0 25px 30px 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            ${renderDayColumn('Monday', monInfo, team.monday_training_focus, team.id)}
            ${renderDayColumn('Friday', friInfo, team.friday_training_focus, team.id)}
        </div>

        <div style="margin: 0 25px 40px 25px;">
            <h3 style="color: #1e293b; font-size: 0.9rem; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Weekly Growth & Base Focus</h3>
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
                <tbody>
                    ${players.map(p => renderWeeklyRow(p)).join('')}
                </tbody>
            </table>
        </div>

        <hr style="margin: 40px 25px; border: none; border-top: 2px dashed #e2e8f0;">

        <div style="margin: 0 25px 50px 25px;">
            <h3 style="color: #1e293b; font-size: 0.9rem; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">🎯 Seasonal Skill Specialization</h3>
            <p style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 20px;">You can set one major skill focus per player every season. This action is permanent for the duration of the season.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                ${players.map(p => renderSeasonalCard(p, currentSeason)).join('')}
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function renderDayColumn(day, info, currentFocus, teamId) {
    const bgColor = day === 'Monday' ? '#1a237e' : '#1e293b';
    const accentColor = day === 'Monday' ? '#ffab40' : '#38bdf8';
    return `
        <div style="background: ${bgColor}; border-radius: 24px; padding: 25px; color: white; ${info.isLocked ? 'opacity: 0.8;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0; text-transform: uppercase; color: ${accentColor}; font-size: 0.8rem;">${day} (${info.formattedDate})</h3>
                ${info.isLocked ? '<span style="font-size: 0.6rem; background: #ef4444; padding: 4px 8px; border-radius: 6px;">LOCKED</span>' : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${AVAILABLE_DRILLS.map(d => `
                    <button onclick="window.selectDrill('${teamId}', '${day.toLowerCase()}', '${d.id}')"
                        ${info.isLocked ? 'disabled' : ''}
                        style="padding: 10px; border-radius: 10px; border: 1px solid ${currentFocus === d.id ? accentColor : 'rgba(255,255,255,0.1)'}; 
                        background: ${currentFocus === d.id ? accentColor : 'rgba(255,255,255,0.05)'}; 
                        color: white; font-size: 0.65rem; font-weight: 700; cursor: pointer;">
                        ${d.name}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderWeeklyRow(p) {
    const currentTotal = calculateTotalSkills(p);
    return `
        <tr style="background: white; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
            <td style="padding: 12px 20px; border-radius: 12px 0 0 12px; width: 30%;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" style="width: 30px; height: 30px; border-radius: 6px;">
                    <span style="font-weight: 700; color: #1a237e; font-size: 0.85rem;">${p.first_name} ${p.last_name}</span>
                </div>
            </td>
            <td style="text-align: center; color: #64748b; font-size: 0.75rem; font-weight: 600;">Points: ${currentTotal} / ${p.max_total_cap || 240}</td>
            <td style="padding: 10px;">
                <select onchange="window.updateWeeklyFocus('${p.id}', this.value)" style="width: 100%; padding: 5px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.7rem;">
                    <option value="GENERAL" ${p.individual_training_skill === 'GENERAL' ? 'selected' : ''}>General Focus</option>
                    <option value="OFFENSE" ${p.individual_training_skill === 'OFFENSE' ? 'selected' : ''}>Offense Focus</option>
                    <option value="DEFENSE" ${p.individual_training_skill === 'DEFENSE' ? 'selected' : ''}>Defense Focus</option>
                </select>
            </td>
            <td style="padding-right: 20px; text-align: right; border-radius: 0 12px 12px 0;">
                <span style="font-weight: 900; color: #059669; font-size: 0.8rem;">+${(p.last_training_growth || 0).toFixed(3)}</span>
            </td>
        </tr>
    `;
}

function renderSeasonalCard(p, currentSeason) {
    const isLocked = p.training_locked_season >= currentSeason;
    const currentFocus = p.individual_training_skill || '';
    
    return `
        <div style="background: white; padding: 20px; border-radius: 20px; border: 2px solid ${isLocked ? '#e2e8f0' : '#3b82f6'}; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <img src="https://api.dicebear.com/7.x/open-peeps/svg?seed=${p.last_name}" style="width: 45px; height: 45px; background: #f8fafc; border-radius: 12px;">
                <div>
                    <div style="font-weight: 800; color: #0f172a; font-size: 0.85rem;">${p.last_name}</div>
                    <div style="font-size: 0.65rem; color: #64748b; font-weight: 600;">${isLocked ? '✅ Focus Locked' : '🎯 Awaiting Focus'}</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; align-items: center; flex: 2;">
                <select id="seasonal-choice-${p.id}" ${isLocked ? 'disabled' : ''} style="flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.75rem; font-weight: 700;">
                    ${Object.keys(SKILL_LABELS).map(key => `
                        <option value="skill_${key}" ${currentFocus === 'skill_'+key ? 'selected' : ''}>${SKILL_LABELS[key]}</option>
                    `).join('')}
                </select>
                <button onclick="window.saveSeasonalFocus('${p.id}', ${currentSeason})" ${isLocked ? 'disabled' : ''} 
                    style="background: ${isLocked ? '#f1f5f9' : '#1e293b'}; color: ${isLocked ? '#94a3b8' : 'white'}; padding: 10px 15px; border-radius: 10px; border: none; font-weight: 800; font-size: 0.7rem; cursor: ${isLocked ? 'default' : 'pointer'};">
                    ${isLocked ? 'LOCKED' : 'SET'}
                </button>
            </div>
        </div>
    `;
}

// --- AKCJE I WINDOW FUNCTIONS ---

window.saveSeasonalFocus = async function(playerId, currentSeason) {
    const skill = document.getElementById(`seasonal-choice-${playerId}`).value;
    const skillLabel = SKILL_LABELS[skill.replace('skill_', '')];

    // System Confirm
    const confirmBox = confirm(`Confirm: Set ${skillLabel} as Season ${currentSeason} focus? This cannot be changed later.`);
    if (!confirmBox) return;

    try {
        const { error } = await supabaseClient
            .from('players')
            .update({
                individual_training_skill: skill,
                training_locked_season: currentSeason
            })
            .eq('id', playerId);

        if (error) throw error;

        // Log to history
        await supabaseClient.from('player_training_history').insert({
            player_id: playerId,
            season_number: currentSeason,
            skill_focused: skill
        });

        alert("Focus saved successfully!");
        location.reload(); 
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.selectDrill = async (teamId, day, drillId) => {
    const dbColumn = day === 'monday' ? 'monday_training_focus' : 'friday_training_focus';
    const { error } = await supabaseClient.from('teams').update({ [dbColumn]: drillId }).eq('id', teamId);
    if (!error) location.reload();
};

window.updateWeeklyFocus = async (playerId, focusValue) => {
    await supabaseClient.from('players').update({ individual_training_skill: focusValue }).eq('id', playerId);
};
