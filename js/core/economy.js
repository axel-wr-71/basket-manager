// js/core/economy.js

export function calculatePlayerDynamicWage(player) {
    const { overall_rating: ovr, potential: pot, age } = player;
    let baseWage = 0;

    // 1. Wycena obecnych umiejętności (OVR)
    if (ovr >= 90) baseWage = 140000 + (ovr - 90) * 15000;
    else if (ovr >= 80) baseWage = 60000 + (ovr - 80) * 8000;
    else if (ovr >= 70) baseWage = 15000 + (ovr - 70) * 4500;
    else baseWage = 3000 + (ovr - 60) * 1200;

    // 2. Bonus za potencjał (Inwestycja w przyszłość)
    // Im młodszy gracz i wyższy potencjał, tym większy bonus rynkowy
    if (age < 25) {
        const potentialGap = Math.max(0, pot - ovr);
        if (pot >= 95) baseWage += 40000;
        else if (pot >= 85) baseWage += 20000;
        else if (potentialGap > 10) baseWage += 10000;
    }

    // 3. Mnożnik wieku (Krzywa kariery)
    let ageMultiplier = 1.0;
    if (age <= 21) ageMultiplier = 0.5;      // Rookie Scale (Taniej dla klubu)
    else if (age >= 28 && age <= 32) ageMultiplier = 1.25; // Peak & Experience
    else if (age >= 35) ageMultiplier = 0.75; // Veteran Discount

    let finalWage = baseWage * ageMultiplier;

    // 4. Limity rynkowe (Twoje 250k jako GOAT Cap)
    if (finalWage > 250000) finalWage = 250000;
    if (finalWage < 2000) finalWage = 2000;

    return Math.floor(finalWage);
}
