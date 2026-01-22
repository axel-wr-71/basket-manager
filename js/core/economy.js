// js/core/economy.js
import { supabaseClient } from '../auth.js';

/**
 * Główny algorytm wyceny tygodniowej pensji zawodnika.
 * Uwzględnia OVR, POT oraz Wiek.
 */
export function calculatePlayerDynamicWage(player) {
    const { overall_rating: ovr, potential: pot, age } = player;
    let baseWage = 0;

    // 1. WYCENA UMIEJĘTNOŚCI (OVR)
    if (ovr >= 95) baseWage = 20000 + (ovr - 95) * 10000;
    else if (ovr >= 90) baseWage = 13000 + (ovr - 90) * 14000;
    else if (ovr >= 80) baseWage = 5000 + (ovr - 80) * 8000;
    else if (ovr >= 70) baseWage = 1500 + (ovr - 70) * 3500;
    else baseWage = 800 + (ovr - 60) * 1200;

    // 2. BONUS ZA POTENCJAŁ
    if (age < 26) {
        if (pot >= 95) baseWage += 40000;
        else if (pot >= 88) baseWage += 15000;
        
        const ceilingGap = pot - ovr;
        if (ceilingGap > 15) baseWage += 5000;
    }

    // 3. MNOŻNIK WIEKU
    let ageMultiplier = 1.0;
    if (age <= 21) ageMultiplier = 0.45;
    else if (age >= 28 && age <= 32) ageMultiplier = 1.25;
    else if (age >= 35) ageMultiplier = 0.8;

    let finalWage = baseWage * ageMultiplier;

    // 4. LIMITY
    if (finalWage > 250000) finalWage = 250000;
    if (finalWage < 2000) finalWage = 2000;

    return Math.floor(finalWage);
}

/**
 * NOWOŚĆ: Oblicza sugerowaną wartość rynkową (cenę zakupu/licytacji).
 * Bazuje na OVR, Potencjale i Wieku. Używane dla Wolnych Agentów i w profilu gracza.
 */
export function calculateMarketValue(player) {
    const { overall_rating: ovr, potential: pot, age } = player;
    
    // Progresywna baza wartości (potęga 3 zapewnia gwałtowny wzrost ceny dla topowych graczy)
    let baseValue = Math.pow(Math.max(0, ovr - 55), 3) * 12;

    // Młodzi gracze z ogromnym potencjałem są warci fortunę
    if (age < 25) {
        const potentialBonus = Math.pow(Math.max(0, pot - ovr), 2) * 600;
        baseValue += potentialBonus;
        
        // Dodatkowy mnożnik dla "Generational Talents"
        if (pot >= 95) baseValue *= 1.4;
    }

    // Mnożnik wieku dla ceny transferowej
    let ageMlt = 1.0;
    if (age <= 22) ageMlt = 1.6;        // Najdrożsi (perspektywiczni)
    else if (age <= 27) ageMlt = 1.3;   // Prime (drożsi)
    else if (age >= 34) ageMlt = 0.5;   // Weterani (tani transfer)

    let finalValue = baseValue * ageMlt;

    // Zaokrąglenie do pełnych kwot (np. co 1000$)
    return Math.max(5000, Math.round(finalValue / 1000) * 1000);
}

/**
 * Oblicza ile pieniędzy faktycznie otrzyma sprzedający po potrąceniu prowizji.
 */
export function calculateSellerProceeds(amount, type, sportsDirectorLevel = 0) {
    let commission = type === 'auction' ? 0.07 : 0.10; 
    const reduction = sportsDirectorLevel * 0.005; 
    commission = Math.max(0.01, commission - reduction);

    const feeAmount = Math.floor(amount * commission);
    const netAmount = Math.floor(amount - feeAmount);

    return { netAmount, feeAmount, commissionPercent: (commission * 100).toFixed(1) };
}

/**
 * Proces rozliczania tygodnia (Poniedziałek 08:00)
 */
export async function processWeeklyFinances(teamId) {
    console.log("[ECONOMY] Rozpoczynanie rozliczenia tygodniowego...");

    try {
        const { data: team } = await supabaseClient.from('teams').select('*').eq('id', teamId).single();
        const { data: players } = await supabaseClient.from('players').select('*').eq('team_id', teamId);

        if (!team || !players) return;

        let totalSalaries = 0;
        for (const player of players) {
            const currentWage = calculatePlayerDynamicWage(player);
            totalSalaries += currentWage;
            await supabaseClient.from('players').update({ salary: currentWage }).eq('id', player.id);
        }

        const attendance = Math.floor(team.arena_capacity * 0.8);
        const ticketIncome = attendance * team.ticket_price;
        const merchIncome = attendance * 15; 
        const tvRights = 150000; 
        const totalIncome = ticketIncome + merchIncome + tvRights;

        const weeklyProfit = totalIncome - totalSalaries;
        const newBalance = team.balance + weeklyProfit;

        await supabaseClient.from('teams').update({ balance: newBalance }).eq('id', teamId);

        await supabaseClient.from('financial_logs').insert([
            { team_id: teamId, category: 'salaries', amount: -totalSalaries, description: 'Tygodniowe płace zespołu' },
            { team_id: teamId, category: 'revenue', amount: totalIncome, description: 'Suma przychodów (Bilety, TV, Merch)' }
        ]);

        return { success: true, profit: weeklyProfit };
    } catch (err) {
        console.error("[ECONOMY ERROR]", err);
        return { success: false, error: err.message };
    }
}
