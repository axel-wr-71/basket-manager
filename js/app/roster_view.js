// js/app/roster_view.js
import { RosterActions } from './roster_actions.js';

function getSkillColor(val) {
    const v = parseInt(val) || 0;
    if (v >= 18) return '#d4af37';
    if (v >= 15) return '#10b981';
    return '#94a3b8';
}

function renderSkillMini(name, val) {
    return `<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;border-bottom:1px solid rgba(0,0,0,0.03);">
                <span style="color:#64748b;">${name}</span>
                <span style="font-weight:800;color:${getSkillColor(val)};">${val || '--'}</span>
            </div>`;
}

export function renderRosterView(teamData, players) {
    console.log("[ROSTER] Renderowanie dla", players.length, "zawodników");
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    window.rosterAction = (type, id) => {
        const p = players.find(x => String(x.id) === String(id));
        if (p && RosterActions[type]) RosterActions[type](p);
    };

    const rowsHtml = players.map(p => {
        const pot = p.potential_definitions;
        const progressWidth = Math.min(Math.round(((p.overall_rating || 0) / (p.potential || 100)) * 100), 100);

        return `
        <tr style="border-bottom:1px solid #f8f9fa;">
            <td style="padding:15px 25px;">
                <div style="font-weight:800;color:#1a237e;">${p.first_name} ${p.last_name} ${p.is_rookie ? '⭐' : ''}</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;font-size:9px;margin-top:5px;width:300px;">
                    ${renderSkillMini('2PT', p.skill_2pt)} ${renderSkillMini('3PT', p.skill_3pt)} ${renderSkillMini('DEF', p.skill_1on1_def)}
                </div>
            </td>
            <td style="padding:15px;">${p.position}</td>
            <td style="padding:15px;">${p.age}</td>
            <td style="padding:15px;font-weight:700;">$${(p.salary || 0).toLocaleString()}</td>
            <td style="padding:15px;">
                <div style="font-size:10px;font-weight:800;color:${pot.color_hex}">${pot.emoji} ${pot.label}</div>
                <div style="width:60px;height:4px;background:#eee;border-radius:2px;margin-top:2px;">
                    <div style="width:${progressWidth}%;height:100%;background:${pot.color_hex}"></div>
                </div>
            </td>
            <td style="padding:15px;"><div style="background:#e8f5e9;padding:5px;border-radius:6px;text-align:center;font-weight:900;">${p.overall_rating}</div></td>
            <td style="padding:15px;"><button onclick="window.rosterAction('showProfile', '${p.id}')">PROFILE</button></td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="padding:20px;">
            <table style="width:100%;background:white;border-radius:15px;overflow:hidden;border-collapse:collapse;">
                <thead style="background:#f8f9fa;text-align:left;font-size:12px;color:#94a3b8;">
                    <tr>
                        <th style="padding:15px;">PLAYER</th><th style="padding:15px;">POS</th>
                        <th style="padding:15px;">AGE</th><th style="padding:15px;">SALARY</th>
                        <th style="padding:15px;">POTENTIAL</th><th style="padding:15px;">OVR</th>
                        <th style="padding:15px;">ACTION</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>`;
}
