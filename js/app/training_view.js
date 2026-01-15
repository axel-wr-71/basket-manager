// js/app/training_view.js
import { supabaseClient } from '../auth.js';

/**
 * Renders the complete Training Center interface
 */
export function renderTrainingDashboard(teamData, players) {
    const appContainer = document.getElementById('app-main-view');
    if (!appContainer) return;

    appContainer.innerHTML = `
        <div class="training-container" style="padding: 30px; color: white; font-family: 'Inter', sans-serif; background: #000;">
            <header style="margin-bottom: 40px;">
                <h1 style="font-size: 2.5em; letter-spacing: -1px; font-weight: 800; margin:0;">TRAINING <span style="color: #1DA1F2;">CENTER</span></h1>
                <p style="color: #666;">Manage team development and weekly session focus</p>
            </header>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 50px;">
                ${renderScheduleCard('MONDAY', teamData.monday_training_focus)}
                ${renderScheduleCard('FRIDAY', teamData.friday_training_focus)}
            </div>

            <div style="background: #111; border-radius: 20px; padding: 25px; border: 1px solid #222;">
                <h3 style="margin-bottom: 20px; font-size: 1.2em; display: flex; align-items: center; gap: 10px;">
                    <span style="color: #2ecc71;">●</span> ROSTER DEVELOPMENT (PROGRESS)
                </h3>
                <div id="player-training-list">
                    ${players && players.length > 0 
                        ? players.map(player => renderPlayerProgressRow(player)).join('') 
                        : '<p style="color: #555;">No players found in roster.</p>'}
                </div>
            </div>
        </div>
    `;
}

function renderScheduleCard(day, currentFocus) {
    const options = [
        'SHARP_SHOOTER', 
        'PAINT_PROTECTOR', 
        'PERIMETER_DEFENDER', 
        'PLAYMAKING_FOCUS', 
        'BIG_MAN_INSIDE', 
        'ISOLATION_SCORER'
    ];
    
    const displayFocus = currentFocus ? currentFocus.replace(/_/g, ' ') : 'NOT SET';
    const dayDisplay = day === 'MONDAY' ? 'MONDAY' : 'FRIDAY';

    return `
        <div style="background: linear-gradient(145deg, #1a1a1a, #111); padding: 30px; border-radius: 25px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 0.8em; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">SESSION: ${dayDisplay}</div>
            <div id="focus-display-${day}" style="font-size: 1.5em; font-weight: bold; margin-bottom: 20px; color: #1DA1F2;">${displayFocus}</div>
            
            <select onchange="window.updateTrainingFocus('${day}', this.value)" style="width: 100%; background: #000; color: white; border: 1px solid #444; padding: 12px; border-radius: 12px; cursor: pointer; outline: none;">
                <option value="" disabled ${!currentFocus ? 'selected' : ''}>Select training focus...</option>
                ${options.map(opt => `
                    <option value="${opt}" ${currentFocus === opt ? 'selected' : ''}>${opt.replace(/_/g, ' ')}</option>
                `).join('')}
            </select>
        </div>
    `;
}

function renderPlayerProgressRow(player) {
    // Calculates fractional progress of skill (e.g., from 14.40 we get 40%)
    const skillProgress = (val) => {
        const p = (parseFloat(val) % 1) * 100;
        return p > 0 ? p : 5; // Minimum 5% width for visual bar
    };

    return `
        <div style="display: grid; grid-template-columns: 2fr 3fr 1fr; align-items: center; padding: 15px 0; border-bottom: 1px solid #222;">
            <div>
                <div style="font-weight: bold; color: #fff;">${player.last_name}</div>
                <div style="font-size: 0.75em; color: #555;">Age: ${player.age} | Pot: ${player.potential}</div>
            </div>
            
            <div style="padding: 0 20px;">
                <div style="width: 100%; height: 6px; background: #222; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${skillProgress(player.skill_2pt)}%; height: 100%; background: #1DA1F2; box-shadow: 0 0 10px #1DA1F2;"></div>
                </div>
            </div>

            <div style="text-align: right; font-family: 'Courier New', monospace; color: #2ecc71;">
                +${(Math.random() * 0.04).toFixed(3)}
            </div>
        </div>
    `;
}

/**
 * Global function for training focus update (Autosave)
 */
window.updateTrainingFocus = async (day, focusValue) => {
    const column = day === 'MONDAY' ? 'monday_training_focus' : 'friday_training_focus';
    const teamId = window.userTeamId;

    if (!teamId) return alert("Error: Team ID not found!");

    try {
        const { error } = await supabaseClient
            .from('teams')
            .update({ [column]: focusValue })
            .eq('id', teamId);

        if (error) throw error;

        // Immediate UI update
        const display = document.getElementById(`focus-display-${day}`);
        if (display) display.innerText = focusValue.replace(/_/g, ' ');
        
        console.log(`Training focus updated for ${day}: ${focusValue}`);
    } catch (err) {
        console.error('Update failed:', err);
        alert('Error saving training plan.');
    }
};
