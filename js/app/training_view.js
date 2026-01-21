import { supabaseClient } from '../auth.js';

// --- KONFIGURACJA I LABELE ---

const SKILL_LABELS = {
    '2pt': 'Jump Shot', '3pt': '3PT Range', 'dunk': 'Dunking', 'passing': 'Passing',
    '1on1_def': '1on1 Def', 'rebound': 'Rebound', 'block': 'Blocking', 'steal': 'Stealing',
    'dribbling': 'Handling', '1on1_off': '1on1 Off', 'stamina': 'Stamina', 'ft': 'Free Throw'
};

const AVAILABLE_DRILLS = [
    { id: 'T_OFF_FB', name: 'Fast Break Mastery', icon: '🏀' },
    { id: 'T_DEF_PL', name: 'Perimeter Lockdown', icon: '🛡️' },
    { id: 'T_DEF_PP', name: 'Paint Protection', icon: '🚧' },
    { id: 'T_OFF_MO', name: 'Motion Offense', icon: '🏃' },
    { id: 'T_OFF_PR', name: 'Pick & Roll Logic', icon: '🧠' },
    { id: 'T_SHOOT', name: 'Sharp Shooter Hub', icon: '🎯' },
    { id: 'T_PHYS', name: 'Iron Defense', icon: '🏋️' },
    { id: 'T_TRANS', name: 'Transition Game', icon: '⚡' }
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
        isLocked: isLocked
    };
}

// --- RENDEROWANIE WIDOKU ---

export async function renderTrainingView(team, players) {
    const container = document.getElementById('training-view-container');
    if (!container) return;

    const monInfo = getTrainingDayInfo('Monday');
    const friInfo = getTrainingDayInfo('Friday');
    const staffEff = ((team.coach_general_lvl || 0) * 2.5).toFixed(1);
    const currentSeason = team.current_season || 1;

    // Pobieranie ROZBUDOWANEJ historii treningów
    const { data: teamHistory } = await supabaseClient
        .from('team_training_history')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
        .limit(6);

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

        <div style="margin: 0 25px 25px 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            ${renderDayColumn('Monday', monInfo, team.monday_training_focus, team.id)}
            ${renderDayColumn('Friday', friInfo, team.friday_training_focus, team.id)}
        </div>

        <div style="margin: 0 25px 30px 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            
            <div style="background: white; border-radius: 24px; padding: 25px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="margin:0; font-size:0.9rem; color:#1e293b; font-weight:800;">TEAM LOGS</h3>
                    <span style="font-size:0.65rem; color:#64748b; font-weight:600; background:#f1f5f9; padding:4px 8px; border-radius:6px;">LAST 6 SESSIONS</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${teamHistory && teamHistory.length > 0 ? teamHistory.map(h => {
                        const drill = AVAILABLE_DRILLS.find(d => d.id === h.drill_id);
                        const dateObj = new Date(h.created_at);
                        const formattedDate = dateObj.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
                        return `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 14px; border: 1px solid #f1f5f9;">
                            <div style="font-size: 1.2rem; background: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #e2e8f0;">
                                ${drill?.icon || '🏀'}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b;">${drill?.name || h.drill_id}</div>
                                <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 600;">Week ${h.week_number} • Season ${h.season_number || currentSeason}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.7rem; font-weight: 800; color: #475569;">${formattedDate}</div>
                                <div style="font-size: 0.6rem; color: #059669; font-weight: 700;">COMPLETED</div>
                            </div>
                        </div>
                        `;
                    }).join('') : '<p style="color:#94a3b8; font-size:0.75rem; text-align:center; padding:20px;">No training history available yet.</p>'}
                </div>
            </div>

            <div style="background: white; border-radius: 24px; padding: 25px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="margin:0; font-size:0.9rem; color:#1e293b; font-weight:800;">${new Date().toLocaleString('default', { month: 'long' }).toUpperCase()}</h3>
                    <div style="display:flex; gap:10px;">
                        <span style="font-size:0.6rem; color:#64748b; display:flex; align-items:center; gap:4px;"><small style="color:#3b82f6;">●</small> MON</span>
                        <span style="font-size:0.6rem; color:#64748b; display:flex; align-items:center; gap:4px;"><small style="color:#1e293b;">●</small> FRI</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center;">
                    ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div style="font-size:0.6rem; font-weight:900; color:#cbd5e1; padding-bottom:5px;">${d}</div>`).join('')}
                    ${renderRealCalendar(team)}
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                   <span style="font-size: 0.65rem; color: #64748b; font-weight: 600;">Status Legend:</span>
                   <div style="display: flex; gap: 15px;">
                       <span style="font-size: 0.6rem; color: #059669; font-weight: 700;">✅ SET</span>
                       <span style="font-size: 0.6rem; color: #ef4444; font-weight: 700;">❌ EMPTY</span>
                   </div>
                </div>
            </div>
        </div>

        <div style="margin: 0 25px 50px 25px;">
            <h3 style="color: #1e293b; font-size: 0.9rem; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">🎯 Seasonal Skill Specialization</h3>
            <p style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 20px;">Individual permanent focus for this season.</p>
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
                ${info.isLocked ? '<span style="font-size: 0.6rem; background: #ef4444; padding: 4px 8px; border-radius: 6px; font-weight:900;">LOCKED</span>' : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${AVAILABLE_DRILLS.map(d => `
                    <button onclick="window.selectDrill('${teamId}', '${day.toLowerCase()}', '${d.id}')"
                        ${info.isLocked ? 'disabled' : ''}
                        style="padding: 10px; border-radius: 12px; border: 1px solid ${currentFocus === d.id ? accentColor : 'rgba(255,255,255,0.1)'}; 
                        background: ${currentFocus === d.id ? accentColor : 'rgba(255,255,255,0.05)'}; 
                        color: white; font-size: 0.65rem; font-weight: 700; cursor: pointer; transition: 0.2s;">
                        ${d.icon} ${d.name}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderRealCalendar(team) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Konwersja na format poniedziałek-pierwszy (1=Pon, 0=Nie -> 6)
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    let daysHtml = '';
    
    // Puste komórki przed pierwszym dniem
    for (let x = 0; x < startOffset; x++) {
        daysHtml += `<div></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(now.getFullYear(), now.getMonth(), i);
        const dayOfWeek = date.getDay(); // 1 = Mon, 5 = Fri
        const isToday = now.getDate() === i;
        
        let content = i;
        let bg = 'transparent';
        let color = '#94a3b8';
        let border = '1px solid transparent';

        if (dayOfWeek === 1 || dayOfWeek === 5) {
            const isSet = (dayOfWeek === 1 && team.monday_training_focus) || (dayOfWeek === 5 && team.friday_training_focus);
            content = isSet ? '✅' : '❌';
            bg = isSet ? '#f0fdf4' : '#fef2f2';
            color = '#1e293b';
            border = isSet ? '1px solid #bbf7d0' : '1px solid #fecaca';
        }

        if (isToday) border = '1px solid #3b82f6';

        daysHtml += `
            <div style="font-size: 0.7rem; padding: 8px 0; border-radius: 8px; background: ${bg}; color: ${color}; border: ${border}; font-weight: 800; display:flex; flex-direction:column; align-items:center; gap:2px;">
                ${content}
                <span style="font-size:0.5rem; font-weight:400; opacity:0.6;">${i}</span>
            </div>`;
    }
    return daysHtml;
}

function renderSeasonalCard(p, currentSeason) {
    const isLocked = p.training_locked_season >= currentSeason;
    const currentFocus = p.individual_training_skill || '';
    
    return `
        <div style="background: white; padding: 20px; border-radius: 20px; border: 1px solid ${isLocked ? '#e2e8f0' : '#3b82f6'}; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <img src="https://api.dicebear.com/7.x/open-peeps/svg?seed=${p.last_name}" style="width: 40px; height: 40px; background: #f8fafc; border-radius: 10px;">
                <div>
                    <div style="font-weight: 800; color: #0f172a; font-size: 0.8rem;">${p.last_name}</div>
                    <div style="font-size: 0.6rem; color: ${isLocked ? '#059669' : '#64748b'}; font-weight: 700;">${isLocked ? '● LOCKED' : '○ READY'}</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; align-items: center; flex: 2;">
                <select id="seasonal-choice-${p.id}" ${isLocked ? 'disabled' : ''} style="flex: 1; padding: 8px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.7rem; font-weight: 700;">
                    ${Object.keys(SKILL_LABELS).map(key => `
                        <option value="skill_${key}" ${currentFocus === 'skill_'+key ? 'selected' : ''}>${SKILL_LABELS[key]}</option>
                    `).join('')}
                </select>
                <button onclick="window.saveSeasonalFocus('${p.id}', ${currentSeason})" ${isLocked ? 'disabled' : ''} 
                    style="background: ${isLocked ? '#f1f5f9' : '#1e293b'}; color: ${isLocked ? '#94a3b8' : 'white'}; padding: 8px 12px; border-radius: 10px; border: none; font-weight: 800; font-size: 0.65rem; cursor: pointer;">
                    ${isLocked ? 'DONE' : 'SET'}
                </button>
            </div>
        </div>
    `;
}

// --- AKCJE I WINDOW FUNCTIONS ---

window.saveSeasonalFocus = async function(playerId, currentSeason) {
    const skill = document.getElementById(`seasonal-choice-${playerId}`).value;
    const skillLabel = SKILL_LABELS[skill.replace('skill_', '')];

    if(!confirm(`Assign ${skillLabel} for Season ${currentSeason}?`)) return;

    try {
        const { error } = await supabaseClient.from('players').update({
            individual_training_skill: skill,
            training_locked_season: currentSeason
        }).eq('id', playerId);

        if (error) throw error;

        await supabaseClient.from('player_training_history').insert({
            player_id: playerId,
            season_number: currentSeason,
            skill_focused: skill
        });

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
