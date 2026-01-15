// js/core/training_engine.js
import { supabaseClient } from '../auth.js';

export async function runGlobalTrainingSession(day) {
    console.log(`[TRAINING ENGINE] Starting ${day} session...`);

    // 1. Pobierz ustawienia treningowe wszystkich drużyn
    const { data: teams, error: tError } = await supabaseClient
        .from('teams')
        .select('id, monday_training_focus, friday_training_focus');

    if (tError) return console.error("Error fetching teams:", tError);

    // 2. Pobierz wszystkich aktywnych zawodników
    const { data: players, error: pError } = await supabaseClient
        .from('players')
        .select('*')
        .eq('is_retired', false);

    if (pError) return console.error("Error fetching players:", pError);

    const updates = [];
    const focusField = day === 'MONDAY' ? 'monday_training_focus' : 'friday_training_focus';

    // Mapowanie Focusu na konkretne umiejętności (zgodnie z naszym ustaleniem)
    const focusMap = {
        'SHARP_SHOOTER': ['skill_2pt', 'skill_3pt', 'skill_ft'],
        'PAINT_PROTECTOR': ['skill_blk', 'skill_1v1d'],
        'PERIMETER_DEFENDER': ['skill_stl', 'skill_1v1d'],
        'PLAYMAKING_FOCUS': ['skill_pas', 'skill_dri'],
        'BIG_MAN_INSIDE': ['skill_dnk', 'skill_reb'],
        'ISOLATION_SCORER': ['skill_1v1o', 'skill_sta']
    };

    // 3. Obliczanie rozwoju dla każdego gracza
    players.forEach(player => {
        const team = teams.find(t => t.id === player.team_id);
        if (!team) return;

        const currentFocus = team[focusField];
        const targetSkills = focusMap[currentFocus];

        if (!targetSkills) return;

        let playerUpdates = { id: player.id };
        let hasChanges = false;

        targetSkills.forEach(skill => {
            // --- LOGIKA ROZWOJU (The Formula) ---
            
            // A. Bazowa szansa zależna od Dynamicznego Potencjału
            const potentialFactor = player.potential / 100; 

            // B. Modyfikator Wieku
            // 18-22: 1.5x | 23-27: 0.8x | 28-32: 0.4x | 33+: 0.05x
            let ageMod = 0.8;
            if (player.age <= 22) ageMod = 1.5;
            else if (player.age >= 33) ageMod = 0.05;
            else if (player.age >= 28) ageMod = 0.4;

            // C. Losowy przyrost (ułamki)
            const baseGain = (Math.random() * 0.08) + 0.01; // od 0.01 do 0.09
            
            const totalGain = baseGain * potentialFactor * ageMod;

            // Aktualizujemy skill o wyliczony ułamek
            const currentVal = parseFloat(player[skill]) || 0;
            playerUpdates[skill] = parseFloat((currentVal + totalGain).toFixed(3));
            hasChanges = true;
        });

        if (hasChanges) updates.push(playerUpdates);
    });

    // 4. Batch Update w Supabase (Aktualizacja wszystkich graczy naraz)
    if (updates.length > 0) {
        const { error: uError } = await supabaseClient
            .from('players')
            .upsert(updates);

        if (uError) console.error("Training update error:", uError);
        else console.log(`[TRAINING ENGINE] Successfully updated ${updates.length} players.`);
    }
}
