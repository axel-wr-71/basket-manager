// js/app/roster_view.js

export function renderRosterView(team, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    // Pobieramy dwóch najlepszych zawodników do górnych kart (np. po OVR)
    const topStars = [...players].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0)).slice(0, 2);

    let html = `
        <div class="roster-management-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase;">ROSTER <span style="color:#e65100">MANAGEMENT</span></h1>
                <p style="margin:0; color:#64748b;">Current squad: <strong>${team?.name || 'Bruges Hoops'}</strong></p>
            </div>
            <div style="background:#1a237e; color:white; padding:10px 20px; border-radius:30px; font-weight:bold; font-size:0.9rem;">
                🏀 SQUAD SIZE: ${players.length} / 12
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 0 20px 30px 20px;">
            ${topStars.map((star, idx) => `
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); border-radius: 15px; padding: 25px; display: flex; align-items: center; gap: 20px; color: white; box-shadow: 0 10px 20px rgba(26,35,126,0.2);">
                    <div style="width: 80px; height: 80px; background: #fff; border-radius: 50%; overflow: hidden; border: 4px solid rgba(255,255,255,0.2);">
                         <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${star.last_name}" alt="avatar">
                    </div>
                    <div>
                        <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: #ffab40; font-weight: 800;">
                            ${idx === 0 ? 'Franchise Star' : 'Future Pillar'}
                        </span>
                        <h2 style="margin: 5px 0; font-size: 1.6rem;">${star.first_name} ${star.last_name}</h2>
                        <span style="font-size: 0.9rem; opacity: 0.8;">${star.position} | <strong>${star.potential_definitions?.label || 'G.O.A.T'}</strong></span>
                    </div>
                </div>
            `).join('')}
        </div>

        <div style="background: white; border-radius: 20px; margin: 0 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9;">
                <h3 style="margin:0; color:#1e293b; text-transform:uppercase; font-size:1rem;">Full Squad List</h3>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #f1f5f9;">
                        <th style="padding: 20px;">Player & Scouting Report</th>
                        <th style="padding: 20px;">Pos</th>
                        <th style="padding: 20px;">Age</th>
                        <th style="padding: 20px;">Potential Class</th>
                        <th style="padding: 20px;">Salary</th>
                        <th style="padding: 20px;">OVR</th>
                        <th style="padding: 20px; text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map(p => renderPlayerRow(p)).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

function renderPlayerRow(p) {
    // Mapowanie skilli z bazy danych (image_7d9fa4.png)
    const skills = {
        attack: {
            inside: p.skill_2pt ?? '-',
            mid: p.skill_ft ?? '-',
            three: p.skill_3pt ?? '-',
            pass: p.skill_passing ?? '-'
        },
        defense: {
            int: p.skill_block ?? '-',
            per: p.skill_steal ?? '-',
            steal: p.skill_steal ?? '-',
            block: p.skill_block ?? '-'
        },
        general: {
            oreb: p.skill_rebound ?? '-',
            dreb: p.skill_rebound ?? '-',
            dribble: p.skill_dribbling ?? '-',
            ft: p.skill_ft ?? '-'
        }
    };

    const isRookie = p.is_rookie || p.age <= 19;

    return `
        <tr style="border-bottom: 1px solid #f8fafc; vertical-align: middle;">
            <td style="padding: 20px;">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong style="color: #1a237e; font-size: 1rem;">${p.first_name} ${p.last_name}</strong>
                        ${isRookie ? '<span style="background:#fee2e2; color:#ef4444; font-size:0.6rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Rookie</span>' : ''}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 0.65rem; border: 1px solid #edf2f7;">
                        <div>
                            <div style="color:#94a3b8; margin-bottom:4px; font-weight:700; text-transform:uppercase;">Attack</div>
                            <div style="display:flex; justify-content:space-between;"><span>Inside</span> <strong>${skills.attack.inside}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>3PT</span> <strong>${skills.attack.three}</strong></div>
                        </div>
                        <div>
                            <div style="color:#94a3b8; margin-bottom:4px; font-weight:700; text-transform:uppercase;">Defense</div>
                            <div style="display:flex; justify-content:space-between;"><span>Per.Def</span> <strong>${skills.defense.per}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Block</span> <strong>${skills.defense.block}</strong></div>
                        </div>
                        <div>
                            <div style="color:#94a3b8; margin-bottom:4px; font-weight:700; text-transform:uppercase;">General</div>
                            <div style="display:flex; justify-content:space-between;"><span>Dribble</span> <strong>${skills.general.dribble}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Pass</span> <strong>${p.skill_passing ?? '-'}</strong></div>
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 20px; font-weight: 700; color: #64748b;">${p.position}</td>
            <td style="padding: 20px; font-weight: 700; color: #64748b;">${p.age}</td>
            <td style="padding: 20px;">
                <div style="border-bottom: 3px solid ${p.potential_definitions?.color_hex || '#3b82f6'}; display: inline-block; padding-bottom: 2px;">
                    <span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;">${p.potential_definitions?.label || 'Solid Starter'}</span>
                </div>
            </td>
            <td style="padding: 20px; font-weight: 800; color: #059669;">$${(p.salary || 0).toLocaleString()}</td>
            <td style="padding: 20px;">
                <div style="width: 40px; height: 40px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #166534;">
                    ${p.overall_rating || '??'}
                </div>
            </td>
            <td style="padding: 20px; text-align: right;">
                <button style="background: white; border: 1px solid #e2e8f0; padding: 8px 15px; border-radius: 8px; font-weight: 800; color: #1a237e; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                    Development
                </button>
            </td>
        </tr>
    `;
}
