// js/core/economy.js
import { supabaseClient } from '../auth.js';

/**
 * Główny algorytm wyceny zawodnika.
 * Uwzględnia OVR (Umiejętności), POT (Potencjał) oraz Wiek.
 */
export function calculatePlayerDynamicWage(player) {
    const { overall_rating: ovr, potential: pot, age } = player;
    let baseWage = 0;

    // 1. WYCENA UMIEJĘTNOŚCI (OVR)
    // Skala nieliniowa - im wyższy OVR, tym drastyczniej rośnie cena
    if (ovr >= 95) baseWage = 200000 + (ovr - 95) * 10000;
    else if (ovr >= 90) baseWage = 130000 + (ovr - 90) * 14000;
    else if (ovr >= 80) baseWage = 50000 + (ovr - 80) * 8000;
    else if (ovr >= 70) baseWage = 15000 + (ovr - 70) * 3500;
    else baseWage = 3000 + (ovr - 60) * 1200;

    // 2. BONUS ZA POTENCJAŁ (Inwestycja w przyszłość)
    if (age < 26) {
        if (pot >= 95) baseWage += 40000;      // "Next GOAT" Tax
        else if (pot >= 88) baseWage += 15000; // "Future Star" Tax
        
        const ceilingGap = pot - ovr;
        if (ceilingGap > 15) baseWage += 5000;
    }

    // 3. MNOŻNIK WIEKU (Krzywa kariery)
    let ageMultiplier = 1.0;
    if (age <= 21) ageMultiplier = 0.45;     // Rookie Scale
    else if (age >= 28 && age <= 32) ageMultiplier = 1.25; // Peak Years
    else if (age >= 35) ageMultiplier = 0.8;  // Veteran Discount

    let finalWage = baseWage * ageMultiplier;

    // 4. LIMITY FINANSOWE
    if (finalWage > 250000) finalWage = 250000; // Max dla GOAT
    if (finalWage < 2000) finalWage = 2000;     // Min pensja ligowa

    return Math.floor(finalWage);
}

/**
 * Oblicza ile pieniędzy faktycznie otrzyma sprzedający po potrąceniu prowizji.
 * Uwzględnia wpływ Dyrektora Sportowego na obniżenie opłat.
 */
export function calculateSellerProceeds(amount, type, sportsDirectorLevel = 0) {
    // Podstawowa prowizja: 7% dla licytacji, 10% dla Kup Teraz
    let commission = type === 'auction' ? 0.07 : 0.10; 
    
    // Dyrektor sportowy zmniejsza prowizję o 0.5% za każdy poziom (max level 10 = -5%)
    const reduction = sportsDirectorLevel * 0.005; 
    commission = Math.max(0.01, commission - reduction); // Prowizja nigdy nie spadnie poniżej 1%

    const feeAmount = Math.floor(amount * commission);
    const netAmount = Math.floor(amount - feeAmount);

    return {
        netAmount,
        feeAmount,
        commissionPercent: (commission * 100).toFixed(1)
    };
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

        // 1. Aktualizacja pensji wszystkich zawodników wg algorytmu
        let totalSalaries = 0;
        for (const player of players) {
            const currentWage = calculatePlayerDynamicWage(player);
            totalSalaries += currentWage;
            
            await supabaseClient.from('players').update({ salary: currentWage }).eq('id', player.id);
        }

        // 2. Obliczamy przychody tygodniowe
        const attendance = Math.floor(team.arena_capacity * 0.8);
        const ticketIncome = attendance * team.ticket_price;
        const merchIncome = attendance * 15; 
        const tvRights = 150000; 
        
        const totalIncome = ticketIncome + merchIncome + tvRights;

        // 3. Bilans i aktualizacja konta
        const weeklyProfit = totalIncome - totalSalaries;
        const newBalance = team.balance + weeklyProfit;

        await supabaseClient.from('teams').update({ balance: newBalance }).eq('id', teamId);

        // 4. Rejestracja logów dla widoku finansów
        await supabaseClient.from('financial_logs').insert([
            { team_id: teamId, category: 'salaries', amount: -totalSalaries, description: 'Tygodniowe płace zespołu' },
            { team_id: teamId, category: 'revenue', amount: totalIncome, description: 'Suma przychodów (Bilety, TV, Merch)' }
        ]);

        console.log(`[ECONOMY] Zakończono: +$${totalIncome} | -$${totalSalaries} | Netto: $${weeklyProfit}`);
        return { success: true, profit: weeklyProfit };

    } catch (err) {
        console.error("[ECONOMY ERROR]", err);
        return { success: false, error: err.message };
    }
}
