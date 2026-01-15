// js/app/training_view.js
import { supabaseClient } from '../auth.js'; // Upewnij się, że ścieżka do klienta Supabase jest poprawna

/**
 * Główna funkcja renderująca dashboard treningowy
 */
export function renderTrainingDashboard(teamData, players) {
    const appContainer = document.getElementById('app-main-view');
    
    appContainer.innerHTML = `
        <div class="training-container" style="padding: 30px; color: white; font-family: 'Inter', sans-serif;">
            <header style="margin-bottom: 40px;">
                <h1 style="font-size: 2.5em; letter-spacing: -1px; font-weight: 800;">TRAINING <span style="color: #1DA1F2;">CENTER</span></h1>
                <p style="color: #666;">Manage your team development and weekly focus</p>
            </header>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 50px;">
                ${renderScheduleCard('MONDAY', teamData.monday_training_focus)}
                ${renderScheduleCard('FRIDAY', teamData.friday_training_focus)}
            </div>

            <div style="background: #111; border-radius: 20px; padding: 25px; border: 1px solid #222;">
                <h3 style="margin-bottom: 20px; font-size: 1.2em; display: flex; align-items: center; gap: 10px;">
                    <span style="color: #2ecc71;">●</span> ROSTER DEVELOPMENT
                </h3>
                <div id="player-training-list">
                    ${players.map(player => renderPlayerProgressRow(player)).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderuje kartę dnia treningowego z dropdownem
 */
function renderScheduleCard(day, currentFocus) {
    const options = [
        'SHARP_SHOOTER', 
        'PAINT_PROTECTOR', 
        'PERIMETER_DEFENDER', 
        'PLAYMAKING_FOCUS', 
        'BIG_MAN_INSIDE', 
        'ISOLATION_SCORER'
    ];

    return `
        <div style="background: linear-gradient(145deg, #1a1a1a, #111); padding: 30px; border-radius: 25px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 0.8em; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">${day} SESSION</div>
            <div id="focus-display-${day}" style="font-size: 1.5em; font-weight: bold; margin-bottom: 20px; color: #1DA1F2;">
                ${currentFocus ? currentFocus.replace('_', ' ') : 'NOT SET'}
            </div>
            
            <select onchange="window.updateTrainingFocus('${day}', this.value)" style="width: 100%; background: #000; color: white; border: 1px solid #444; padding: 12px; border-radius: 12px; cursor: pointer; outline: none;">
                ${options.map(opt => `
                    <option value="${opt}" ${currentFocus === opt ? 'selected' : ''}>${opt.replace('_', ' ')}</option>
                `).join('')}
            </select>
        </div>
    `;
}

/**
 * Renderuje wiersz zawodnika z paskiem postępu (oparty na 2PT jako przykładzie rozwoju)
 */
function renderPlayerProgressRow(player) {
    // Obliczamy procent postępu do pełnego punktu (ułamek dziesiętny)
    const skillProgress = (val) => (val % 1) * 100;

    return `
        <div style="display: grid; grid-template-columns: 2fr 3fr 1fr; align-items: center; padding: 15px 0; border-bottom: 1px solid #222;">
            <div>
                <div style="font-weight: bold;">${player.last_name}</div>
                <div style="font-size: 0.75em; color: #555;">Age: ${player.age} | Pot: ${player.potential}</div>
            </div>
            
            <div style="padding: 0 20px;">
                <div style="font-size: 0.7em; color: #888; margin-bottom: 5px; text-transform: uppercase;">Overall Growth Progress</div>
                <div style="width: 100%; height: 6px; background: #222; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${skillProgress(player.skill_2pt)}%; height: 100%; background: #1DA1F2; box-shadow: 0 0 10px #1DA1F2;"></div>
                </div>
            </div>

            <div style="text-align: right; font-family: 'Courier New', monospace; color: #2ecc71;">
                +${(Math.random() * 0.05).toFixed(2)}
            </div>
        </div>
    `;
}

/**
 * Globalna funkcja aktualizacji (przypięta do window, aby onchange w HTML ją widziało)
 */
window.updateTrainingFocus = async (day, focusValue) => {
    const column = day === 'MONDAY' ? 'monday_training_focus' : 'friday_training_focus';
    const teamId = window.userTeamId; // Pobieramy ID drużyny z globalnej zmiennej sesji

    try {
        const { error } = await supabaseClient
            .from('teams')
            .update({ [column]: focusValue })
            .eq('id', teamId);

        if (error) throw error;

        // Aktualizacja nagłówka w karcie bez przeładowania całej strony
        document.getElementById(`focus-display-${day}`).innerText = focusValue.replace('_', ' ');
        
        console.log(`Successfully updated ${day} to ${focusValue}`);
    } catch (err) {
        console.error('Update failed:', err);
        alert('Error saving training focus. Please try again.');
    }
};
