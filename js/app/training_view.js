// training_view.js
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

// Mapowanie treningów do umiejętności
const DRILL_TO_SKILLS = {
    'T_OFF_FB': ['stamina', 'dribbling', 'dunk', '2pt'],
    'T_DEF_PL': ['1on1_def', 'steal', 'passing'],
    'T_DEF_PP': ['block', 'rebound', '1on1_def'],
    'T_OFF_MO': ['passing', '2pt', 'dribbling'],
    'T_OFF_PR': ['passing', '2pt', 'dribbling', '1on1_off'],
    'T_SHOOT': ['2pt', '3pt', 'ft'],
    'T_PHYS': ['stamina', 'rebound', 'block'],
    'T_TRANS': ['stamina', 'dribbling', 'passing']
};

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
        isPast: diffInHours < 0
    };
}

function calculateSkillGains(drillId, coachLevel, playerCount) {
    const baseGain = 0.1;
    const coachBonus = coachLevel * 0.02;
    const teamSizePenalty = Math.max(0.7, 1 - (playerCount - 5) * 0.03);
    
    return (baseGain + coachBonus) * teamSizePenalty;
}

function getDrillName(drillId) {
    const drill = AVAILABLE_DRILLS.find(d => d.id === drillId);
    return drill ? drill.name : drillId;
}

// --- GŁÓWNA FUNKCJA WYKONANIA TRENINGU ---
async function executeTraining(teamId, day) {
    try {
        console.log(`🚀 Starting training execution for team ${teamId} on ${day}`);
        
        // 1. Pobierz dane zespołu
        const { data: team, error: teamError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();
            
        if (teamError) throw new Error(`Team fetch error: ${teamError.message}`);
        
        // 2. Sprawdź zaplanowany trening
        const drillId = day === 'monday' 
            ? team.monday_training_focus 
            : team.friday_training_focus;
            
        if (!drillId) {
            throw new Error(`No training scheduled for ${day}`);
        }
        
        // 3. Pobierz aktywnych graczy zespołu
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', teamId)
            .eq('status', 'active')
            .limit(12);
        
        if (playersError) throw new Error(`Players fetch error: ${playersError.message}`);
        
        if (!players || players.length === 0) {
            throw new Error('No active players in the team');
        }
        
        // 4. Oblicz parametry treningu
        const skillGain = calculateSkillGains(drillId, team.coach_general_lvl || 1, players.length);
        const targetSkills = DRILL_TO_SKILLS[drillId] || [];
        const drillName = getDrillName(drillId);
        
        console.log(`📊 Training params: gain=${skillGain}, skills=${targetSkills.join(',')}`);
        
        // 5. Zapisz historię treningu
        const { error: historyError } = await supabaseClient
            .from('team_training_history')
            .insert({
                team_id: teamId,
                drill_id: drillId,
                drill_name: drillName,
                season_number: team.current_season || 1,
                week_number: team.current_week || 1,
                executed_at: new Date().toISOString(),
                player_count: players.length,
                average_gain: skillGain,
                created_at: new Date().toISOString()
            });
            
        if (historyError) throw new Error(`History save error: ${historyError.message}`);
        
        // 6. Aktualizuj umiejętności każdego gracza
        const updates = players.map(async (player) => {
            const updateData = {};
            
            // Dodaj wzrost do umiejętności docelowych
            targetSkills.forEach(skill => {
                const currentValue = player[`skill_${skill}`] || 50;
                updateData[`skill_${skill}`] = Math.min(99, currentValue + skillGain);
            });
            
            // Dodaj bonus za indywidualny trening sezonowy
            if (player.individual_training_skill && 
                player.training_locked_season === team.current_season) {
                const individualSkill = player.individual_training_skill.replace('skill_', '');
                if (targetSkills.includes(individualSkill)) {
                    // Dodatkowy bonus 20% jeśli trening drużynowy pasuje do indywidualnego
                    updateData[`skill_${individualSkill}`] += skillGain * 0.2;
                }
            }
            
            // Zapisz historię treningu gracza
            await supabaseClient
                .from('player_training_history')
                .insert({
                    player_id: player.id,
                    team_id: teamId,
                    drill_id: drillId,
                    gains: updateData,
                    season: team.current_season,
                    week: team.current_week,
                    training_day: day,
                    executed_at: new Date().toISOString()
                });
            
            // Aktualizuj statystyki gracza
            return supabaseClient
                .from('players')
                .update(updateData)
                .eq('id', player.id);
        });
        
        await Promise.all(updates);
        
        console.log(`✅ Training completed for team ${teamId}`);
        return {
            success: true,
            message: `Training "${drillName}" completed! ${players.length} players trained.`,
            drill: drillName,
            playerCount: players.length,
            averageGain: skillGain
        };
        
    } catch (error) {
        console.error('❌ Training execution failed:', error);
        return {
            success: false,
            message: `Training failed: ${error.message}`
        };
    }
}

// --- GŁÓWNA FUNKCJA RENDERUJĄCA ---

export async function renderTrainingView(team, players) {
    const container = document.getElementById('training-view-container');
    if (!container) {
        console.error("Training container not found!");
        return;
    }

    const monInfo = getTrainingDayInfo('Monday');
    const friInfo = getTrainingDayInfo('Friday');
    const staffEff = ((team.coach_general_lvl || 0) * 2.5).toFixed(1);
    const currentSeason = team.current_season || 1;

    // Pobieranie historii dla sekcji LOGS i dla KALENDARZA (cały miesiąc)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const { data: monthHistory } = await supabaseClient
        .from('team_training_history')
        .select('*')
        .eq('team_id', team.id)
        .gte('created_at', startOfMonth)
        .order('created_at', { ascending: false });

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
                    <span style="font-size:0.65rem; color:#64748b; font-weight:600; background:#f1f5f9; padding:4px 8px; border-radius:6px;">THIS MONTH</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${monthHistory && monthHistory.length > 0 ? monthHistory.slice(0, 6).map(h => {
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
                                <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 600;">Week ${h.week_number} • S${h.season_number || currentSeason}</div>
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
                    <h3 style="margin:0; font-size:0.9rem; color:#1e293b; font-weight:800;">${new Date().toLocaleString('pl-PL', { month: 'long' }).toUpperCase()}</h3>
                    <div style="display:flex; gap:10px;">
                        <span style="font-size:0.6rem; color:#64748b; display:flex; align-items:center; gap:4px;"><small style="color:#3b82f6;">●</small> MON</span>
                        <span style="font-size:0.6rem; color:#64748b; display:flex; align-items:center; gap:4px;"><small style="color:#1e293b;">●</small> FRI</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center;">
                    ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div style="font-size:0.6rem; font-weight:900; color:#cbd5e1; padding-bottom:5px;">${d}</div>`).join('')}
                    ${renderRealCalendar(team, monthHistory)}
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                   <span style="font-size: 0.65rem; color: #64748b; font-weight: 600;">System: History-Verified</span>
                   <div style="display: flex; gap: 15px;">
                       <span style="font-size: 0.6rem; color: #059669; font-weight: 700;">✅ DONE</span>
                       <span style="font-size: 0.6rem; color: #3b82f6; font-weight: 700;">📅 PLANNED</span>
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
    
    // Rejestrujemy funkcję refresh dla globalnego dostępu
    window.refreshTrainingView = async () => {
        // Ponownie pobierz zaktualizowane dane
        const { data: updatedTeam } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('id', team.id)
            .single();
            
        const { data: updatedPlayers } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', team.id);
            
        // Zaktualizuj gameState jeśli istnieje
        if (window.gameState) {
            window.gameState.team = updatedTeam;
            window.gameState.players = updatedPlayers || [];
        }
        
        // Ponownie renderuj widok
        await renderTrainingView(updatedTeam, updatedPlayers || []);
    };
}

function renderDayColumn(day, info, currentFocus, teamId) {
    const bgColor = day === 'Monday' ? '#1a237e' : '#1e293b';
    const accentColor = day === 'Monday' ? '#ffab40' : '#38bdf8';
    const dayLower = day.toLowerCase();
    const hasFocus = currentFocus && currentFocus !== 'none';
    
    return `
        <div style="background: ${bgColor}; border-radius: 24px; padding: 25px; color: white; ${info.isLocked ? 'opacity: 0.8;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0; text-transform: uppercase; color: ${accentColor}; font-size: 0.8rem;">${day} (${info.formattedDate})</h3>
                ${info.isLocked ? '<span style="font-size: 0.6rem; background: #ef4444; padding: 4px 8px; border-radius: 6px; font-weight:900;">LOCKED</span>' : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px;">
                ${AVAILABLE_DRILLS.map(d => `
                    <button onclick="handleSelectDrill('${teamId}', '${dayLower}', '${d.id}')"
                        ${info.isLocked ? 'disabled' : ''}
                        style="padding: 10px; border-radius: 12px; border: 1px solid ${currentFocus === d.id ? accentColor : 'rgba(255,255,255,0.1)'}; 
                        background: ${currentFocus === d.id ? accentColor : 'rgba(255,255,255,0.05)'}; 
                        color: white; font-size: 0.65rem; font-weight: 700; cursor: pointer;">
                        ${d.icon} ${d.name}
                    </button>
                `).join('')}
            </div>
            
            ${hasFocus && !info.isLocked && !info.isPast ? `
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 10px;">
                    <button onclick="handleRunTraining('${teamId}', '${dayLower}')"
                        style="width: 100%; padding: 12px; background: #059669; color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        🏀 EXECUTE TODAY'S TRAINING
                    </button>
                    <p style="font-size: 0.6rem; color: rgba(255,255,255,0.6); margin-top: 8px; text-align: center;">
                        Apply skill gains to all active players
                    </p>
                </div>
            ` : ''}
            
            ${hasFocus && info.isPast ? `
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 10px;">
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 12px;">
                        <p style="font-size: 0.65rem; color: rgba(255,255,255,0.8); margin: 0; text-align: center;">
                            ⚠️ Training day has passed. Update focus for next week.
                        </p>
                    </div>
                </div>
            ` : ''}
            
            ${!hasFocus && !info.isLocked ? `
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 10px;">
                    <div style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 12px; padding: 12px;">
                        <p style="font-size: 0.65rem; color: rgba(255,255,255,0.8); margin: 0; text-align: center;">
                            📝 Select a drill above to plan training
                        </p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderRealCalendar(team, history) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    let daysHtml = '';
    for (let x = 0; x < startOffset; x++) daysHtml += `<div></div>`;

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(now.getFullYear(), now.getMonth(), i);
        const dayOfWeek = date.getDay();
        const isPast = date < new Date(now.setHours(0,0,0,0));
        
        // Sprawdzamy czy w historii istnieje wpis dla tego konkretnego dnia
        const hasHistory = history?.some(h => {
            const hDate = new Date(h.created_at);
            return hDate.getDate() === i && hDate.getMonth() === now.getMonth();
        });

        let content = i;
        let bg = 'transparent';
        let color = '#94a3b8';
        let border = '1px solid transparent';

        if (dayOfWeek === 1 || dayOfWeek === 5) {
            if (isPast) {
                // Dla przeszłości: ✅ jeśli był w historii, ❌ jeśli nie było
                content = hasHistory ? '✅' : '❌';
                bg = hasHistory ? '#f0fdf4' : '#fef2f2';
                border = hasHistory ? '1px solid #bbf7d0' : '1px solid #fecaca';
            } else {
                // Dla przyszłości: Ikona kalendarza jeśli zaplanowano
                const isSet = (dayOfWeek === 1 && team.monday_training_focus) || (dayOfWeek === 5 && team.friday_training_focus);
                content = isSet ? '📅' : '○';
                bg = isSet ? '#eff6ff' : '#f8fafc';
                border = isSet ? '1px solid #bfdbfe' : '1px solid #e2e8f0';
                color = isSet ? '#3b82f6' : '#94a3b8';
            }
        }

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
        <div style="background: white; padding: 20px; border-radius: 20px; border: 1px solid ${isLocked ? '#e2e8f0' : '#3b82f6'}; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <img src="https://api.dicebear.com/7.x/open-peeps/svg?seed=${p.last_name}" style="width: 40px; height: 40px; background: #f8fafc; border-radius: 10px;">
                <div>
                    <div style="font-weight: 800; color: #0f172a; font-size: 0.8rem;">${p.last_name}</div>
                    <div style="font-size: 0.6rem; color: ${isLocked ? '#059669' : '#64748b'}; font-weight: 700;">${isLocked ? '● LOCKED' : '○ READY'}</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex: 2;">
                <select id="seasonal-choice-${p.id}" ${isLocked ? 'disabled' : ''} style="flex: 1; padding: 8px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.7rem; font-weight: 700;">
                    ${Object.keys(SKILL_LABELS).map(key => `<option value="skill_${key}" ${currentFocus === 'skill_'+key ? 'selected' : ''}>${SKILL_LABELS[key]}</option>`).join('')}
                </select>
                <button onclick="handleSaveSeasonalFocus('${p.id}', ${currentSeason})" ${isLocked ? 'disabled' : ''} 
                    style="background: ${isLocked ? '#f1f5f9' : '#1e293b'}; color: ${isLocked ? '#94a3b8' : 'white'}; padding: 8px 12px; border-radius: 10px; border: none; font-weight: 800; font-size: 0.65rem; cursor: pointer;">
                    ${isLocked ? 'DONE' : 'SET'}
                </button>
            </div>
        </div>
    `;
}

// --- FUNKCJE OBSŁUGI EVENTÓW ---

async function handleSaveSeasonalFocus(playerId, currentSeason) {
    const skill = document.getElementById(`seasonal-choice-${playerId}`).value;
    if(!confirm(`Assign this focus for Season ${currentSeason}?`)) return;
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
        
        // Zamiast location.reload(), używamy refreshTrainingView
        if (window.refreshTrainingView) {
            await window.refreshTrainingView();
        } else {
            alert("Changes saved! Manually refresh to see updates.");
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

async function handleSelectDrill(teamId, day, drillId) {
    const dbColumn = day === 'monday' ? 'monday_training_focus' : 'friday_training_focus';
    const { error } = await supabaseClient.from('teams').update({ [dbColumn]: drillId }).eq('id', teamId);
    if (!error) {
        // Zamiast location.reload(), używamy refreshTrainingView
        if (window.refreshTrainingView) {
            await window.refreshTrainingView();
        } else {
            alert("Training focus updated! Manually refresh to see changes.");
        }
    } else {
        alert("Error: " + error.message);
    }
}

async function handleRunTraining(teamId, day) {
    const dayName = day === 'monday' ? 'Monday' : 'Friday';
    
    if (!confirm(`Execute ${dayName} training?\n\nThis will apply skill gains to all active players and cannot be undone.`)) {
        return;
    }
    
    // Pokaż loader
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Processing...';
    button.disabled = true;
    
    try {
        // Uruchom trening (funkcja jest w tym samym pliku)
        const result = await executeTraining(teamId, day);
        
        if (result.success) {
            alert(`✅ ${result.message}\n\n• Drill: ${result.drill}\n• Players trained: ${result.playerCount}\n• Average skill gain: +${result.averageGain.toFixed(2)}`);
            
            // Odśwież widok treningu po 1 sekundzie
            setTimeout(() => {
                if (window.refreshTrainingView) {
                    window.refreshTrainingView();
                } else {
                    alert("Training completed! Please manually refresh to see changes.");
                }
            }, 1000);
        } else {
            alert(`❌ ${result.message}`);
            button.innerHTML = originalText;
            button.disabled = false;
        }
    } catch (error) {
        console.error("Training execution error:", error);
        alert(`❌ Error executing training: ${error.message}`);
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// --- REJESTRACJA FUNKCJI GLOBALNYCH ---

window.handleSaveSeasonalFocus = handleSaveSeasonalFocus;
window.handleSelectDrill = handleSelectDrill;
window.handleRunTraining = handleRunTraining;

// Eksport funkcji executeTraining jeśli potrzebna w innych miejscach
export { executeTraining };
