import { supabaseClient } from '../auth.js';

let currentCalendarDate = new Date();

/**
 * Główna funkcja renderująca Training Hub
 */
export async function renderTrainingDashboard(teamData, players) {
    const appContainer = document.getElementById('app-main-view');
    if (!appContainer) return;

    try {
        // 1. Pobieramy trenera i historię (z nowej tabeli lub join)
        const [coachRes, historyRes] = await Promise.all([
            supabaseClient.from('coaches').select('*').eq('team_id', teamData.id).maybeSingle(),
            supabaseClient.from('player_training_history')
                .select('*, players(first_name, last_name)')
                .eq('team_id', teamData.id)
                .order('created_at', { ascending: false })
                .limit(10)
        ]);

        const coach = coachRes.data || { coach_name: "Assistant Coach", specialty: "GENERAL", coaching_level: 1 };
        const history = historyRes.data || [];
        const teamDisplayName = teamData.name || "My Team";

        appContainer.innerHTML = `
            <div class="training-container" style="padding: 30px; color: #333; font-family: -apple-system, sans-serif; background: #f4f7f6; min-height: 100vh;">
                
                <header style="margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="font-size: 2.5rem; font-weight: 900; color: #1a237e; margin:0; letter-spacing: -1px;">TRAINING <span style="color: #e65100;">HUB</span></h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-weight: 600;">Manage your team growth and coaching staff</p>
                    </div>
                    
                    <div style="background: white; padding: 15px 25px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 15px; border: 1px solid #e0e0e0;">
                        <div style="font-size: 2rem;">👨‍🏫</div>
                        <div>
                            <div style="font-size: 0.7rem; font-weight: 800; color: #999; text-transform: uppercase;">Head Coach</div>
                            <div style="font-weight: 800; color: #1a237e;">${coach.coach_name}</div>
                            <div style="font-size: 0.75rem; color: #e65100; font-weight: 700;">Specialty: ${coach.specialty}</div>
                        </div>
                    </div>
                </header>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 40px;">
                    ${renderFocusCard('MONDAY', teamData.monday_training_focus, coach)}
                    ${renderFocusCard('FRIDAY', teamData.friday_training_focus, coach)}
                </div>

                <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 25px;">
                    
                    <div style="background: white; border-radius: 25px; padding: 30px; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
                        <h3 style="margin-bottom: 25px; font-size: 1.1rem; font-weight: 800; color: #1a237e; text-transform: uppercase;">🚀 Individual Development</h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${players.map(p => renderPlayerTrainingRow(p)).join('')}
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 25px;">
                        <div style="background: white; border-radius: 25px; padding: 30px; border: 1px solid #e0e0e0;">
                            <div id="calendar-container">
                                ${renderCalendar(currentCalendarDate, history)}
                            </div>
                        </div>

                        <div style="background: white; border-radius: 25px; padding: 30px; border: 1px solid #e0e0e0;">
                            <h3 style="margin-bottom: 15px; font-size: 0.9rem; font-weight: 800; color: #1a237e; text-transform: uppercase;">Latest Progress</h3>
                            <div id="improved-list">
                                ${renderImprovedPlayers(players, history)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Dashboard Render Error:", err);
        appContainer.innerHTML = `<div style="padding:20px; color:red;">Error loading training hub. Check console.</div>`;
    }
}

// --- KOMPONENTY ---

function renderFocusCard(day, currentFocus, coach) {
    const focusOptions = {
        'SHARP_SHOOTER': { img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600', label: 'Sharp Shooter' },
        'PAINT_PROTECTOR': { img: 'https://images.unsplash.com/photo-1519861531473-920036214751?w=600', label: 'Paint Protector' },
        'PERIMETER_DEFENDER': { img: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600', label: 'Perimeter Def' },
        'PLAYMAKING_FOCUS': { img: 'https://images.unsplash.com/photo-1518063311540-30b8acb1d7a8?w=600', label: 'Playmaking' }
    };

    const selected = focusOptions[currentFocus] || { img: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=600', label: 'Not Set' };
    const isSynergy = coach.specialty === currentFocus;

    return `
        <div style="position: relative; height: 280px; border-radius: 25px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
            <img id="focus-img-${day}" src="${selected.img}" style="width: 100%; height: 100%; object-fit: cover;">
            <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%);"></div>
            
            <div style="position: absolute; top: 20px; left: 20px;">
                <div style="font-size: 0.75em; color: rgba(255,255,255,0.8); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">${day} SESSION</div>
                <div id="focus-label-${day}" style="font-size: 1.8em; font-weight: 900; color: white; margin-top: 5px;">${selected.label}</div>
            </div>

            ${isSynergy ? `<div style="position: absolute; top: 20px; right: 20px; background: #e65100; color: white; padding: 6px 12px; border-radius: 10px; font-weight: 900; font-size: 0.7rem;">🔥 COACH BONUS</div>` : ''}

            <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; display: flex; gap: 10px;">
                <select id="select-${day}" onchange="window.updateFocusPreview('${day}', this.value)" style="flex: 1; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 12px; border-radius: 15px; color: white; font-weight: 700; outline: none;">
                    ${Object.entries(focusOptions).map(([key, obj]) => `
                        <option value="${key}" ${currentFocus === key ? 'selected' : ''}>${obj.label}</option>
                    `).join('')}
                </select>
                <button onclick="window.saveTrainingManual('${day}')" style="background: white; color: #1a237e; border: none; padding: 0 20px; border-radius: 15px; font-weight: 900; cursor: pointer;">SAVE</button>
            </div>
        </div>
    `;
}

function renderPlayerTrainingRow(p) {
    const isRookie = p.age <= 19;
    return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background: #f8fafc; border-radius: 18px; border: 1px solid #f1f5f9;">
            <div style="width: 200px;">
                <div style="font-weight: 800; color: #1a237e;">${p.last_name.toUpperCase()} ${isRookie ? '<span style="color:#e65100; font-size:0.6rem; vertical-align:middle; margin-left:5px;">ROOKIE</span>' : ''}</div>
                <div style="font-size: 0.75rem; color: #999; font-weight: 600;">${p.position} | Potential: ${p.potential}</div>
            </div>
            
            <div style="flex: 1; display: flex; align-items: center; gap: 15px;">
                <select id="ind-select-${p.id}" style="padding: 8px 12px; border-radius: 10px; border: 1px solid #ddd; font-weight: 700; font-size: 0.8rem;">
                    <option value="skill_2pt" ${p.individual_training_skill === 'skill_2pt' ? 'selected' : ''}>Jump Shot</option>
                    <option value="skill_3pt" ${p.individual_training_skill === 'skill_3pt' ? 'selected' : ''}>3PT Range</option>
                    <option value="skill_passing" ${p.individual_training_skill === 'skill_passing' ? 'selected' : ''}>Passing</option>
                    <option value="skill_1on1_def" ${p.individual_training_skill === 'skill_1on1_def' ? 'selected' : ''}>Individual Defense</option>
                </select>
                <button onclick="window.saveIndividualTraining('${p.id}')" style="background: #1a237e; color: white; border: none; padding: 8px 15px; border-radius: 10px; font-weight: 800; font-size: 0.7rem; cursor: pointer;">APPLY</button>
            </div>

            <div style="text-align: right; font-family: monospace; font-weight: 800; color: #2ecc71;">
                +${parseFloat(p.last_training_growth || 0).toFixed(2)}
            </div>
        </div>
    `;
}

function renderImprovedPlayers(players, history) {
    if (history.length === 0) return `<div style="color:#999; font-size:0.8rem; text-align:center; padding:20px;">No logs recorded.</div>`;
    
    return history.map(log => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8f9fa; font-size: 0.85rem;">
            <span style="font-weight: 700; color: #333;">${log.players?.last_name}</span>
            <span style="color: #2ecc71; font-weight: 800;">+${log.amount} ${log.skill_increased?.replace('skill_', '')}</span>
        </div>
    `).join('');
}

function renderCalendar(date, history) {
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return `
        <div style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <button onclick="window.changeMonth(-1)" style="border: 1px solid #eee; background: white; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;">&lt;</button>
                <h4 style="margin:0; font-weight: 800; color: #1a237e; font-size: 0.85rem;">${monthNames[month].toUpperCase()} ${year}</h4>
                <button onclick="window.changeMonth(1)" style="border: 1px solid #eee; background: white; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;">&gt;</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">
                ${['M','T','W','T','F','S','S'].map(d => `<div style="font-size: 0.6rem; font-weight: 800; color: #cbd5e0;">${d}</div>`).join('')}
                ${Array(firstDay === 0 ? 6 : firstDay - 1).fill('<div></div>').join('')}
                ${Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    return `<div style="height: 25px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; border-radius: 5px; color: #777;">${day}</div>`;
                }).join('')}
            </div>
        </div>
    `;
}

// --- AKCJE GLOBALNE (WINDOW) ---

window.updateFocusPreview = (day, val) => {
    const focusOptions = {
        'SHARP_SHOOTER': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600',
        'PAINT_PROTECTOR': 'https://images.unsplash.com/photo-1519861531473-920036214751?w=600',
        'PERIMETER_DEFENDER': 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600',
        'PLAYMAKING_FOCUS': 'https://images.unsplash.com/photo-1518063311540-30b8acb1d7a8?w=600'
    };
    const imgEl = document.getElementById(`focus-img-${day}`);
    const labelEl = document.getElementById(`focus-label-${day}`);
    if (imgEl) imgEl.src = focusOptions[val].img;
    if (labelEl) labelEl.innerText = val.replace(/_/g, ' ');
};

window.saveTrainingManual = async (day) => {
    const val = document.getElementById(`select-${day}`).value;
    const column = day === 'MONDAY' ? 'monday_training_focus' : 'friday_training_focus';
    try {
        const { error } = await supabaseClient
            .from('teams')
            .update({ [column]: val })
            .eq('id', window.gameState.teamId);
        if (error) throw error;
        alert(`Team plan for ${day} saved!`);
    } catch (e) { console.error(e); }
};

window.saveIndividualTraining = async (playerId) => {
    const skill = document.getElementById(`ind-select-${playerId}`).value;
    try {
        const { error } = await supabaseClient
            .from('players')
            .update({ individual_training_skill: skill })
            .eq('id', playerId);
        if (error) throw error;
        alert("Individual focus updated!");
    } catch (e) { console.error(e); }
};

window.changeMonth = (val) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + val);
    // Tutaj najlepiej wywołać ponowny render zamiast reloadu
    const teamData = { id: window.gameState.teamId, name: "Team" }; // Uproszczone dla przykładu
    renderTrainingDashboard(teamData, []); 
};
