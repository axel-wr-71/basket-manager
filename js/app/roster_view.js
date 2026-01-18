// js/app/roster_view.js
import { RosterActions } from './roster_actions.js';

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
    return '#94a3b8';               // Project Player
}

function renderSkillMini(name, val) {
    return `<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;border-bottom:1px solid rgba(0,0,0,0.03);">
            <span style="color:#64748b;">${name}</span><span style="font-weight:800;color:${getSkillColor(val)};">${val || '--'}</span></div>`;
}

export async function renderRosterView(teamData, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    window.rosterAction = (type, id) => {
        const p = players.find(x => String(x.id) === String(id));
        if (p && RosterActions[type]) RosterActions[type](p);
    };

    let rowsHtml = players.map(p => {
        // KRYTYCZNA POPRAWKA: Mapowanie na nową strukturę z JOIN
        const pot = p.potential_definitions || { label: 'Scouting...', color_hex: '#94a3b8', emoji: '🔍' };
        
        // Logika paska postępu: jeśli pot.min_value nie istnieje, używamy p.potential jako fallback
        const maxPot = pot.min_value || 100;
        const progressWidth = Math.min(Math.round(((p.overall_rating || 0) / maxPot) * 100), 100);

        // Wyświetlanie ikony - priorytet dla Emoji z bazy (najszybsze w Safari)
        const iconHtml = pot.emoji 
            ? `<span style="font-size:14px;margin-right:4px;">${pot.emoji}</span>`
            : (pot.icon_url 
                ? `<img src="${pot.icon_url}" style="width:16px;height:16px;border-radius:2px;">`
                : `<div style="width:16px;height:16px;background:${pot.color_hex};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:900;">${pot.label[0]}</div>`);

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
                            <div>${renderSkillMini('2PT', p.skill_2pt)}${renderSkillMini('3PT', p.skill_3pt)}${renderSkillMini('Dunk', p.skill_dunk)}${renderSkillMini('Pass', p.skill_passing)}</div>
                            <div>${renderSkillMini('Def', p.skill_1on1_def)}${renderSkillMini('Reb', p.skill_rebound)}${renderSkillMini('Blk', p.skill_block)}${renderSkillMini('Stl', p.skill_steal)}</div>
                            <div>${renderSkillMini('Hnd', p.skill_dribbling)}${renderSkillMini('Off', p.skill_1on1_off)}${renderSkillMini('Sta', p.skill_stamina)}${renderSkillMini('FT', p.skill_ft)}</div>
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
                    <div style="width:${progressWidth}%;height:100%;background:${pot.color_hex};"></div>
                </div>
            </td>
            <td style="padding:15px;"><div style="width:42px;height:42px;border-radius:10px;background:#e8f5e9;color:#2e7d32;display:flex;align-items:center;justify-content:center;font-weight:900;border:2px solid #c8e6c9;">${p.overall_rating}</div></td>
            <td style="padding:15px;text-align:center;">
                <button onclick="window.rosterAction('showProfile', '${p.id}')" style="background:white;border:1px solid #1a237e;padding:6px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;">PROFILE</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="padding:30px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f4f7f6;min-height:100vh;">
            <h1 style="color:#1a237e;font-weight:800;">ROSTER MANAGEMENT</h1>
            <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                <table style="width:100%;border-collapse:collapse;text-align:left;">
                    <thead style="background:#f8f9fa;color:#94a3b8;font-size:0.75em;">
                        <tr><th style="padding:15px 25px;">Player & Skills</th><th>Pos</th><th>Age</th><th>Salary</th><th>Potential</th><th>OVR</th><th>Actions</th></tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </div>`;
}
