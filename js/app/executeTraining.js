// executeTraining.js
import { supabaseClient } from '../auth.js';

// Mapowanie treningów do umiejętności
const DRILL_TO_SKILLS = {
    'T_OFF_FB': ['stamina', 'dribbling', 'dunk', '2pt'], // Fast Break
    'T_DEF_PL': ['1on1_def', 'steal', 'passing'],        // Perimeter Lockdown
    'T_DEF_PP': ['block', 'rebound', '1on1_def'],        // Paint Protection
    'T_OFF_MO': ['passing', '2pt', 'dribbling'],         // Motion Offense
    'T_OFF_PR': ['passing', '2pt', 'dribbling', '1on1_off'], // Pick & Roll
    'T_SHOOT': ['2pt', '3pt', 'ft'],                     // Shooting
    'T_PHYS': ['stamina', 'rebound', 'block'],           // Iron Defense
    'T_TRANS': ['stamina', 'dribbling', 'passing']       // Transition
};

// Oblicz wzrost umiejętności
function calculateSkillGains(drillId, coachLevel, playerCount) {
    const baseGain = 0.1; // Bazowy wzrost
    const coachBonus = coachLevel * 0.02; // 2% na poziom trenera
    const teamSizePenalty = Math.max(0.7, 1 - (playerCount - 5) * 0.03); // Kara za dużą drużynę
    
    return (baseGain + coachBonus) * teamSizePenalty;
}

// Główna funkcja wykonania treningu
export async function executeTraining(teamId, day) {
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
        
        // 3. Pobierz aktywnych graczy zespołu (tylko aktywnych zawodników)
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', teamId)
            .eq('status', 'active') // Ważne: tylko aktywni gracze
            .limit(12); // Maksymalnie 12 graczy na trening
        
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
                const currentValue = player[`skill_${skill}`] || 50; // Domyślna wartość
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
        
        // 7. Zwiększ licznik tygodnia (opcjonalnie, jeśli chcesz automatycznie)
        // const { error: weekError } = await supabaseClient
        //     .from('teams')
        //     .update({ current_week: team.current_week + 1 })
        //     .eq('id', teamId);
        
        // if (weekError) console.warn('Could not increment week:', weekError);
        
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

// Helper function
function getDrillName(drillId) {
    const drills = {
        'T_OFF_FB': 'Fast Break Mastery',
        'T_DEF_PL': 'Perimeter Lockdown',
        'T_DEF_PP': 'Paint Protection',
        'T_OFF_MO': 'Motion Offense',
        'T_OFF_PR': 'Pick & Roll Logic',
        'T_SHOOT': 'Sharp Shooter Hub',
        'T_PHYS': 'Iron Defense',
        'T_TRANS': 'Transition Game'
    };
    return drills[drillId] || drillId;
}

// Funkcja do ręcznego wykonania treningu (dla przycisku w UI)
window.executeTraining = async function(teamId, day) {
    const result = await executeTraining(teamId, day);
    
    if (result.success) {
        alert(`✅ ${result.message}\n\nDrill: ${result.drill}\nPlayers: ${result.playerCount}\nAvg Gain: +${result.averageGain.toFixed(2)}`);
        location.reload();
    } else {
        alert(`❌ ${result.message}`);
    }
};
