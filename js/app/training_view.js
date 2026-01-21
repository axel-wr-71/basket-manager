import { supabaseClient } from '../auth.js';

const SKILL_LABELS = {
    '2pt': 'Jump Shot', '3pt': '3PT Range', 'dunk': 'Dunking', 'passing': 'Passing',
    '1on1_def': '1on1 Def', 'rebound': 'Rebound', 'block': 'Blocking', 'steal': 'Stealing',
    'dribbling': 'Handling', '1on1_off': '1on1 Off', 'stamina': 'Stamina', 'ft': 'Free Throw'
};

// Mapowanie ikon dla historii treningu
const SKILL_ICONS = {
    'skill_2pt': '🎯', 'skill_3pt': '🏹', 'skill_dunk': '💥', 'skill_passing': '🔄',
    'skill_1on1_def': '🛡️', 'skill_rebound': '👐', 'skill_block': '🚫', 'skill_steal': '🧤',
    'skill_dribbling': '⚡', 'skill_1on1_off': '🔥', 'skill_stamina': '🫁', 'skill_ft': '📏'
};

export async function renderTrainingView(team, players) {
    const container = document.getElementById('training-view-container');
    if (!container) return;

    const currentSeason = team.current_season || 1;

    // Pobieramy historię wszystkich zawodników naraz dla wydajności
    const { data: historyData } = await supabaseClient
        .from('player_training_history')
        .select('*')
        .in('player_id', players.map(p => p.id))
        .order('season_number', { ascending: true });

    let html = `
        <div style="padding: 25px;">
            <h1 style="margin:0; font-weight:900; color:#1a237e; letter-spacing:-1px; font-size: 2rem;">
                TRAINING <span style="color:#e65100">CENTER</span>
            </h1>
            <p style="margin:0; color:#64748b; font-weight: 500;">Season ${currentSeason} | Individual Player Development</p>
        </div>

        <div style="margin: 0 25px 30px 25px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 24px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                <h3 style="margin: 0 0 5px 0; font-size: 1rem; color: #1e293b;">🎯 SEASONAL FOCUS</h3>
                <p style="margin: 0; font-size: 0.75rem; color: #64748b;">Set the primary development goal for this season. This choice is permanent until the next season starts.</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                ${players.map(p => {
                    const playerHistory = historyData?.filter(h => h.player_id === p.id) || [];
                    return renderPlayerCard(p, currentSeason, playerHistory);
                }).join('')}
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function renderPlayerCard(p, currentSeason, history) {
    const isLocked = p.training_locked_season >= currentSeason;
    const currentFocus = p.individual_training_skill || '';

    return `
        <div style="background: white; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
            <div style="padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 15px; border-bottom: 1px solid #f1f5f9;">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <img src="https://api.dicebear.com/7.x/open-peeps/svg?seed=${p.last_name}" style="width: 45px; height: 45px; background: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div>
                        <div style="font-weight: 800; color: #0f172a; font-size: 0.9rem;">${p.first_name} ${p.last_name}</div>
                        <div style="font-size: 0.65rem; color: ${isLocked ? '#059669' : '#64748b'}; font-weight: 700;">
                            ${isLocked ? '✅ SEASONAL FOCUS SET' : '⏳ AWAITING ASSIGNMENT'}
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select id="seasonal-choice-${p.id}" ${isLocked ? 'disabled' : ''} 
                        style="padding: 8px 12px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.75rem; font-weight: 700; background: ${isLocked ? '#f8fafc' : 'white'};">
                        ${Object.keys(SKILL_LABELS).map(key => `
                            <option value="skill_${key}" ${currentFocus === 'skill_'+key ? 'selected' : ''}>${SKILL_LABELS[key]}</option>
                        `).join('')}
                    </select>
                    <button onclick="window.saveSeasonalFocus('${p.id}', ${currentSeason})" ${isLocked ? 'disabled' : ''} 
                        style="background: ${isLocked ? '#e2e8f0' : '#1e293b'}; color: ${isLocked ? '#94a3b8' : 'white'}; padding: 8px 16px; border-radius: 10px; border: none; font-weight: 800; font-size: 0.7rem; cursor: ${isLocked ? 'default' : 'pointer'}; transition: 0.2s;">
                        ${isLocked ? 'LOCKED' : 'CONFIRM'}
                    </button>
                </div>
            </div>

            <div style="background: #fcfcfd; padding: 12px 20px;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 0.6rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">History:</span>
                    ${history.length > 0 ? history.map(h => `
                        <div title="Season ${h.season_number}: ${SKILL_LABELS[h.skill_focused?.replace('skill_', '')]}" 
                             style="display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 8px; gap: 4px;">
                            <span style="font-size: 0.7rem;">${SKILL_ICONS[h.skill_focused] || '🏀'}</span>
                            <span style="font-size: 0.6rem; font-weight: 900; color: #475569;">S${h.season_number}</span>
                        </div>
                    `).join('') : '<span style="font-size: 0.65rem; color: #cbd5e1; font-style: italic;">No previous data</span>'}
                </div>
            </div>
        </div>
    `;
}

// --- LOGIKA ZAPISU ---

window.saveSeasonalFocus = async function(playerId, currentSeason) {
    const skill = document.getElementById(`seasonal-choice-${playerId}`).value;
    const skillLabel = SKILL_LABELS[skill.replace('skill_', '')];

    const confirmBox = confirm(`Confirm: Train ${skillLabel} for the entire Season ${currentSeason}? This cannot be changed.`);
    if (!confirmBox) return;

    try {
        // 1. Update Player
        const { error: pError } = await supabaseClient
            .from('players')
            .update({
                individual_training_skill: skill,
                training_locked_season: currentSeason
            })
            .eq('id', playerId);

        if (pError) throw pError;

        // 2. Insert History Log
        await supabaseClient.from('player_training_history').insert({
            player_id: playerId,
            season_number: currentSeason,
            skill_focused: skill
        });

        alert("Training focus locked!");
        location.reload(); 
    } catch (err) {
        console.error(err);
        alert("Error saving: " + err.message);
    }
};
