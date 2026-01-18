// js/app/roster_view.js
import { RosterActions } from './roster_actions.js';

/**
 * Funkcja pomocnicza do kolorowania statystyk (Skala 1-20)
 * Zoptymalizowana pod kątem czytelności w Safari na MacBooku
 */
function getSkillColor(val) {
    const v = parseInt(val) || 0;
    if (v >= 20) return '#ff4500'; // G.O.A.T.
    if (v === 19) return '#b8860b'; // All-Time Great
    if (v === 18) return '#d4af37'; // Elite Franchise
    if (v === 17) return '#8b5cf6'; // Star Performer
    if (v === 16) return '#10b981'; // High Prospect
    if (v === 15) return '#6366f1'; // Solid Starter
    if (v === 14) return '#64748b'; // Reliable Bench
    if (v === 13) return '#94a3b8'; // Role Player
    if (v >= 11)  return '#cbd5e1'; // Deep Bench
    return '#94a3b8';               // Project Player / Reszta
}

/**
 * Renderuje pojedynczy kafelek umiejętności
 */
function renderSkillMini(name, val) {
    return `
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;border-bottom:1px solid rgba(0,0,0,0.03);">
            <span style="color:#64748b;">${name}</span>
            <span style="font-weight:800;color:${getSkillColor(val)};">${val || '--'}</span>
        </div>`;
}

/**
 * GŁÓWNA FUNKCJA RENDERUJĄCA WIDOK ROSTERA
 */
export async function renderRosterView(teamData, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    // Przypisanie akcji do okna globalnego dla obsługi kliknięć w buttony
    window.rosterAction = (type, id) => {
        const p = players.find(x => String(x.id) === String(id));
        if (p && RosterActions[type]) RosterActions[type](p);
    };

    // Mapowanie zawodników na wiersze tabeli
    let rowsHtml = players.map(p => {
        // Obsługa relacji potencjału z bazy Supabase
        // p.potential_definitions to wynik JOINa w app.js
        const pot = p.potential_definitions || { 
            label: 'Scouting...', 
            color_hex: '#94a3b8', 
            emoji: '🔍', 
            min_value: 100 
        };
        
        // Obliczanie paska postępu względem CAP (min_value z definicji potencjału)
        const capValue = pot.min_value || 100;
        const progressWidth = Math.min(Math.round(((p.overall_rating || 0) / capValue) * 100), 100);

        // Generowanie ikony (Emoji ma najwyższy priorytet dla szybkości renderowania w Safari)
        const iconHtml = pot.emoji 
            ? `<span style="font-size:14px;margin-right:4px;">${pot.emoji}</span>`
            : `<div style="width:16px;height:16px;background:${pot.color_hex};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:900;">${pot.label[0]}</div>`;

        return `
        <tr style="border-bottom:1px solid #f8f9fa;">
            <td style="padding:20px 25px;">
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-weight:800;color:#1a237e;font-size:1.1em;">${p.first_name} ${p.last_name}</span>
                        ${p.is_rookie ? '<span style="background:#ef4444;color:white;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:900;">ROOKIE</span>' : ''}
                    </div>
                    <div style="display:flex;gap:20px;">
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:#f8f9fa;padding:12px;border-radius:12px;min-width:450px;border:1px solid #eee;">
                            <div>
                                ${renderSkillMini('2PT', p.skill_2pt)}
                                ${renderSkillMini('3PT', p.skill_3pt)}
                                ${renderSkillMini('Dunk', p.skill_dunk)}
                                ${renderSkillMini('Pass', p.skill_passing)}
                            </div>
                            <div>
                                ${renderSkillMini('Def', p.skill_1on1_def)}
                                ${renderSkillMini('Reb', p.skill_rebound)}
                                ${renderSkillMini('Blk', p.skill_block)}
                                ${renderSkillMini('Stl', p.skill_steal)}
                            </div>
                            <div>
                                ${renderSkillMini('Hnd', p.skill_dribbling)}
                                ${renderSkillMini('Off', p.skill_1on1_off)}
                                ${renderSkillMini('Sta', p.skill_stamina)}
                                ${renderSkillMini('FT', p.skill_ft)}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            
            <td style="padding:15px;font-weight:600;">${p.position}</td>
            <td style="padding:15px;">${p.age}</td>
            <td style="padding:15px;color:#2e7d32;font-weight:700;">$${(p.salary || 0).toLocaleString()}</td>
            
            <td style="padding:15px;">
                <div style="display:flex;align-items:center;gap:6px;color:${pot.color_hex};font-weight:800;font-size:0.8em;text-transform:uppercase;">
                    ${iconHtml} ${pot.label}
                </div>
                <div style="width:80px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;margin-top:4px;">
                    <div style="width:${progressWidth}%;height:100%;background:${pot.color_hex}; transition: width 0.5s ease-in-out;"></div>
                </div>
            </td>
            
            <td style="padding:15px;">
                <div style="width:42px;height:42px;border-radius:10px;background:#e8f5e9;color:#2e7d32;display:flex;align-items:center;justify-content:center;font-weight:900;border:2px solid #c8e6c9;">
                    ${p.overall_rating}
                </div>
            </td>
            
            <td style="padding:15px;text-align:center;">
                <button onclick="window.rosterAction('showProfile', '${p.id}')" 
                    style="background:white;border:1px solid #1a237e;padding:6px 12px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;transition: all 0.2s;">
                    PROFILE
                </button>
            </td>
        </tr>`;
    }).join('');

    // Renderowanie kompletnego kontenera
    container.innerHTML = `
        <div style="padding:30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f4f7f6;min-height:100vh;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h1 style="color:#1a237e;font-weight:800;margin:0;">ROSTER MANAGEMENT</h1>
                <div style="background:#1a237e;color:white;padding:8px 16px;border-radius:8px;font-weight:600;">
                    ${teamData?.name || 'Your Team'}
                </div>
            </div>
            
            <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                <table style="width:100%;border-collapse:collapse;text-align:left;">
                    <thead style="background:#f8f9fa;color:#94a3b8;font-size:0.75em;text-transform:uppercase;letter-spacing:1px;">
                        <tr>
                            <th style="padding:15px 25px;">Player & Skills</th>
                            <th style="padding:15px;">Pos</th>
                            <th style="padding:15px;">Age</th>
                            <th style="padding:15px;">Salary</th>
                            <th style="padding:15px;">Potential</th>
                            <th style="padding:15px;">OVR</th>
                            <th style="padding:15px;text-align:center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="7" style="padding:40px;text-align:center;color:#94a3b8;">Brak zawodników w kadrze. Sprawdź połączenie z bazą.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
}
