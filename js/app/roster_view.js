// js/app/roster_view.js

function getFlagUrl(countryCode) {
    if (!countryCode) return '';
    return `https://flagsapi.com/${countryCode.toUpperCase()}/flat/64.png`;
}

function getPositionStyle(pos) {
    const styles = {
        'PG': '#1e40af', // Ciemny niebieski
        'SG': '#5b21b6', // Ciemny fiolet
        'SF': '#065f46', // Ciemna zieleń
        'PF': '#9a3412', // Ciemny pomarańcz
        'C':  '#991b1b'  // Ciemna czerwień
    };
    const color = styles[pos] || '#334155';
    return `
        background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
        background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
        background-size: 4px 4px;
        color: white;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        font-weight: 900;
        font-size: 0.8rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    `;
}

function getOvrStyle(ovr) {
    if (ovr >= 90) return { bg: '#fffbeb', border: '#f59e0b', color: '#92400e', bold: '900' };
    if (ovr >= 80) return { bg: '#f0fdf4', border: '#22c55e', color: '#166534', bold: '800' };
    if (ovr >= 70) return { bg: '#f0f9ff', border: '#3b82f6', color: '#1e3a8a', bold: '700' };
    if (ovr >= 60) return { bg: '#fff7ed', border: '#fdba74', color: '#9a3412', bold: '600' };
    return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', bold: '600' };
}

function calculateOVR(p) {
    const skills = [
        p.skill_2pt, p.skill_3pt, p.skill_dunk, p.skill_ft, p.skill_passing, 
        p.skill_dribbling, p.skill_stamina, p.skill_rebound, p.skill_block, 
        p.skill_steal, p.skill_1on1_off, p.skill_1on1_def
    ];
    const sum = skills.reduce((a, b) => (a || 0) + (b || 0), 0);
    return Math.round((sum / 240) * 100);
}

export function renderRosterView(team, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    const topStars = [...players].sort((a, b) => calculateOVR(b) - calculateOVR(a)).slice(0, 2);

    let html = `
        <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin:0; font-weight:900; color:#1a237e; font-family: system-ui;">ROSTER MANAGEMENT</h1>
            <div style="background:#1a237e; color:white; padding:10px 20px; border-radius:30px; font-weight:bold;">🏀 SQUAD: ${players.length} / 12</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 0 20px 30px 20px;">
            ${topStars.map((star, idx) => {
                const ovr = calculateOVR(star);
                return `
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); border-radius: 15px; padding: 25px; display: flex; align-items: center; gap: 20px; color: white; position: relative; overflow: hidden;">
                    <div style="position: absolute; right: -5px; top: -5px; font-size: 70px; opacity: 0.15; font-weight: 900;">${ovr}</div>
                    <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${star.last_name}" style="width: 75px; height: 75px; background: white; border-radius: 12px; border: 3px solid rgba(255,255,255,0.2);">
                    </div>
                    <div style="z-index: 2;">
                        <h2 style="margin: 0; font-size: 1.5rem;">${star.first_name} ${star.last_name}</h2>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                            <div style="${getPositionStyle(star.position)}; width:30px; height:30px; font-size:0.6rem;">${star.position}</div>
                            <img src="${getFlagUrl(star.nationality)}" style="width:20px; height:20px; border-radius:50%;">
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <div style="margin: 0 20px;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 12px;">
                <thead>
                    <tr style="text-align: left; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase;">
                        <th style="padding: 10px 25px;">Player & Full Scouting Report</th>
                        <th style="padding: 10px; text-align: center;">Pos</th>
                        <th style="padding: 10px;">HT/Age</th>
                        <th style="padding: 10px;">Salary</th>
                        <th style="padding: 10px; text-align: center;">OVR</th>
                        <th style="padding: 20px 25px; text-align: right;">Action</th>
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
    const ovr = calculateOVR(p);
    const ovrStyle = getOvrStyle(ovr);
    const posStyle = getPositionStyle(p.position);

    return `
        <tr style="background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <td style="padding: 20px 25px; border-radius: 15px 0 0 15px; border: 1px solid #f1f5f9; border-right: none;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 60px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" style="width: 60px; height: 60px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <img src="${getFlagUrl(p.nationality)}" style="width: 22px; height: 22px; border-radius: 50%; border: 1px solid #e2e8f0;">
                    </div>
                    <div style="flex: 1;">
                        <div style="margin-bottom: 8px;"><strong style="color:#1a237e; font-size:1.1rem;">${p.first_name} ${p.last_name}</strong></div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8fafc; padding: 12px; border-radius: 10px; font-size: 0.65rem; border: 1px solid #edf2f7; min-width: 480px;">
                            <div>
                                <div style="color:#1a237e; font-weight:800; border-bottom:1px solid #e2e8f0; margin-bottom:4px;">ATTACK</div>
                                <div style="display:flex; justify-content:space-between;"><span>2PT</span> <strong>${p.skill_2pt}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>3PT</span> <strong>${p.skill_3pt}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>DNK</span> <strong>${p.skill_dunk}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>1v1</span> <strong>${p.skill_1on1_off}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; font-weight:800; border-bottom:1px solid #e2e8f0; margin-bottom:4px;">DEFENSE</div>
                                <div style="display:flex; justify-content:space-between;"><span>1v1</span> <strong>${p.skill_1on1_def}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>BLK</span> <strong>${p.skill_block}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>STL</span> <strong>${p.skill_steal}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>REB</span> <strong>${p.skill_rebound}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; font-weight:800; border-bottom:1px solid #e2e8f0; margin-bottom:4px;">GENERAL</div>
                                <div style="display:flex; justify-content:space-between;"><span>PAS</span> <strong>${p.skill_passing}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>DRI</span> <strong>${p.skill_dribbling}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>STA</span> <strong>${p.skill_stamina}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>FT</span> <strong>${p.skill_ft}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 20px 10px; text-align: center;"><div style="${posStyle}">${p.position}</div></td>
            <td style="padding: 20px 10px; font-weight: 700; color: #64748b; font-size: 0.8rem;">${p.height}cm<br>${p.age}y</td>
            <td style="padding: 20px 10px; font-weight: 800; color: #059669;">$${(p.salary || 0).toLocaleString()}</td>
            <td style="padding: 20px 10px; text-align: center;">
                <div style="width: 42px; height: 42px; background: ${ovrStyle.bg}; border: 2px solid ${ovrStyle.border}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: ${ovrStyle.color}; font-size: 1.1rem;">
                    ${ovr}
                </div>
            </td>
            <td style="padding: 20px 25px; text-align: right; border-radius: 0 15px 15px 0; border: 1px solid #f1f5f9; border-left: none;">
                <button class="btn-profile-trigger" data-id="${p.id}" style="background: #1a237e; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 0.65rem;">Profile</button>
            </td>
        </tr>
    `;
}
