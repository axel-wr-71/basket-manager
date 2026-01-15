// js/app/training_view.js
import { supabaseClient } from '../auth.js';

let currentCalendarDate = new Date();

/**
 * Main function to render the refreshed Training Center
 */
export async function renderTrainingDashboard(teamData, players) {
    const appContainer = document.getElementById('app-main-view');
    if (!appContainer) return;

    // Fetch training history for the calendar
    const { data: history } = await supabaseClient
        .from('training_history')
        .select('*')
        .eq('team_id', teamData.id)
        .order('training_date', { ascending: false });

    appContainer.innerHTML = `
        <div class="training-container" style="padding: 30px; color: #333; font-family: 'Segoe UI', sans-serif; background: #f4f7f6; min-height: 100vh;">
            <header style="margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="font-size: 2.2em; font-weight: 800; color: #1a237e; margin:0; letter-spacing: -1px;">TRAINING <span style="color: #e65100;">HUB</span></h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Optimize your team performance and development</p>
                </div>
                <div style="background: white; padding: 10px 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e0e0e0;">
                    <span style="font-size: 0.8em; color: #999; text-transform: uppercase;">Team ID:</span>
                    <span style="font-weight: bold; color: #1a237e;">#${teamData.id.slice(0, 8)}</span>
                </div>
            </header>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 40px;">
                ${renderFocusCard('MONDAY', teamData.monday_training_focus)}
                ${renderFocusCard('FRIDAY', teamData.friday_training_focus)}
            </div>

            <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 25px;">
                <div style="background: white; border-radius: 20px; padding: 30px; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
                    <h3 style="margin-bottom: 25px; font-size: 1.2em; font-weight: 700; color: #1a237e; display: flex; align-items: center; gap: 10px;">
                        <span style="color: #2ecc71;">📈</span> LATEST TRAINING IMPACT
                    </h3>
                    <div id="player-training-list">
                        ${renderImprovedPlayers(players)}
                    </div>
                </div>

                <div style="background: white; border-radius: 20px; padding: 30px; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
                    <div id="calendar-container">
                        ${renderCalendar(currentCalendarDate, history || [])}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderFocusCard(day, currentFocus) {
    const focusOptions = {
        'SHARP_SHOOTER': { icon: '🏹', label: 'Sharp Shooter' },
        'PAINT_PROTECTOR': { icon: '🛡️', label: 'Paint Protector' },
        'PERIMETER_DEFENDER': { icon: '🔒', label: 'Perimeter Def' },
        'PLAYMAKING_FOCUS': { icon: '🪄', label: 'Playmaking' },
        'BIG_MAN_INSIDE': { icon: '💪', label: 'Big Man Inside' },
        'ISOLATION_SCORER': { icon: '🏀', label: 'ISO Scorer' }
    };

    const selected = focusOptions[currentFocus] || { icon: '⚙️', label: 'Not Set' };

    return `
        <div style="background: white; padding: 25px; border-radius: 20px; border: 1px solid #e0e0e0; box-shadow: 0 10px 20px rgba(0,0,0,0.02); transition: 0.3s;">
            <div style="font-size: 0.75em; color: #999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; font-weight: bold;">
                ${day === 'MONDAY' ? 'Monday Session' : 'Friday Session'}
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div id="focus-icon-${day}" style="font-size: 2.5em; background: #f0f2f5; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; border-radius: 15px;">
                    ${selected.icon}
                </div>
                <div>
                    <div id="focus-label-${day}" style="font-size: 1.3em; font-weight: 800; color: #333;">${selected.label}</div>
                    <div style="font-size: 0.85em; color: #2ecc71; font-weight: 600;">System Active</div>
                </div>
            </div>
            
            <select onchange="window.updateTrainingFocus('${day}', this.value)" style="width: 100%; background: #f8f9fa; color: #333; border: 1px solid #ddd; padding: 12px; border-radius: 12px; cursor: pointer; font-weight: 600; outline: none; appearance: none;">
                <option value="" disabled ${!currentFocus ? 'selected' : ''}>Change Training Focus...</option>
                ${Object.entries(focusOptions).map(([key, obj]) => `
                    <option value="${key}" ${currentFocus === key ? 'selected' : ''}>${obj.icon} ${obj.label}</option>
                `).join('')}
            </select>
        </div>
    `;
}

function renderImprovedPlayers(players) {
    const improved = players.filter(p => parseFloat(p.last_training_growth) > 0);

    if (improved.length === 0) {
        return `<div style="text-align: center; color: #999; padding: 40px;">No growth recorded in the last session.</div>`;
    }

    return improved.map(player => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
            <div>
                <div style="font-weight: 700; color: #1a237e;">${player.last_name.toUpperCase()}</div>
                <div style="font-size: 0.8em; color: #888;">Potential: ${player.potential}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 100px; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(parseFloat(player.skill_2pt) % 1) * 100}%; height: 100%; background: #e65100;"></div>
                </div>
                <div style="font-family: monospace; font-weight: bold; color: #2ecc71; background: #e8f5e9; padding: 4px 8px; border-radius: 6px;">
                    +${parseFloat(player.last_training_growth).toFixed(3)}
                </div>
            </div>
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
                <button onclick="window.changeMonth(-1)" style="background: none; border: 1px solid #ddd; border-radius: 50%; width: 35px; height: 35px; cursor: pointer;">←</button>
                <h4 style="margin:0; font-weight: 800; color: #1a237e;">${monthNames[month]} ${year}</h4>
                <button onclick="window.changeMonth(1)" style="background: none; border: 1px solid #ddd; border-radius: 50%; width: 35px; height: 35px; cursor: pointer;">→</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; font-size: 0.8em; font-weight: bold; color: #bbb; margin-bottom: 10px;">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">
                ${Array(firstDay).fill('<div></div>').join('')}
                ${Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const session = history.find(h => h.training_date === dateStr);
                    return `
                        <div style="height: 35px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border-radius: 8px; ${session ? 'background: #fff3e0; border: 1px solid #ffcc80;' : ''}">
                            <span style="font-size: 0.9em; font-weight: ${session ? 'bold' : 'normal'}">${day}</span>
                            ${session ? '<div style="width: 4px; height: 4px; background: #e65100; border-radius: 50%; margin-top: 2px;"></div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// WINDOW FUNCTIONS
window.updateTrainingFocus = async (day, focusValue) => {
    const focusOptions = {
        'SHARP_SHOOTER': { icon: '🏹', label: 'Sharp Shooter' },
        'PAINT_PROTECTOR': { icon: '🛡️', label: 'Paint Protector' },
        'PERIMETER_DEFENDER': { icon: '🔒', label: 'Perimeter Def' },
        'PLAYMAKING_FOCUS': { icon: '🪄', label: 'Playmaking' },
        'BIG_MAN_INSIDE': { icon: '💪', label: 'Big Man Inside' },
        'ISOLATION_SCORER': { icon: '🏀', label: 'ISO Scorer' }
    };

    try {
        const column = day === 'MONDAY' ? 'monday_training_focus' : 'friday_training_focus';
        const { error } = await supabaseClient.from('teams').update({ [column]: focusValue }).eq('id', window.userTeamId);
        if (error) throw error;

        // Update UI Icons and Labels
        document.getElementById(`focus-icon-${day}`).innerText = focusOptions[focusValue].icon;
        document.getElementById(`focus-label-${day}`).innerText = focusOptions[focusValue].label;
        console.log(`Updated ${day} focus to ${focusValue}`);
    } catch (e) {
        alert("Error updating training focus.");
    }
};

window.changeMonth = (val) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + val);
    // In a real app, you'd re-fetch data or re-render part of the UI.
    // For now, we refresh the whole dashboard to keep it simple.
    location.reload(); 
};
