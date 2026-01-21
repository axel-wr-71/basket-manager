/**
 * js/app/roster_view.js
 * Zarządzanie widokiem listy zawodników (Roster)
 */

function getFlagUrl(countryCode) {
    if (!countryCode) return '';
    const code = String(countryCode).toLowerCase().trim();
    const finalCode = (code === 'el') ? 'gr' : code;
    return `assets/flags/${finalCode}.png`;
}

function getPositionStyle(pos) {
    const styles = {
        'PG': '#1e40af', 
        'SG': '#5b21b6', 
        'SF': '#065f46', 
        'PF': '#9a3412', 
        'C': '#F5AD27' 
    };
    const color = styles[pos] || '#334155';
    return `background: ${color}; color: white; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: 900; font-size: 0.8rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
}

function getOvrStyle(ovr) {
    if (ovr >= 90) return { bg: '#fffbeb', border: '#f59e0b', color: '#92400e' };
    if (ovr >= 80) return { bg: '#f0fdf4', border: '#22c55e', color: '#166534' };
    if (ovr >= 70) return { bg: '#f0f9ff', border: '#3b82f6', color: '#1e3a8a' };
    if (ovr >= 60) return { bg: '#fff7ed', border: '#fdba74', color: '#9a3412' };
    if (ovr >= 50) return { bg: '#f0fdf4', border: '#22c55e', color: '#5b21b6' };
    if (ovr >= 40) return { bg: '#f0f9ff', border: '#3b82f6', color: '#065f46' };
    if (ovr >= 30) return { bg: '#fff7ed', border: '#fdba74', color: '#1e40af' };
    return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
}

function updateGlobalHeader(teamName, leagueName) {
    const headerTeamName = document.getElementById('display-team-name');
    const headerLeagueName = document.getElementById('display-league-name');
    if (headerTeamName) headerTeamName.textContent = teamName;
    if (headerLeagueName) headerLeagueName.textContent = leagueName;
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

    // Pobieranie dynamiczne z obiektu team (zgodnie z bazą)
    const teamName = team?.team_name || team?.name || 'Twoja Drużyna';
    const leagueName = team?.league_name || 'Super League';

    updateGlobalHeader(teamName, leagueName);

    const topStars = [...players].sort((a, b) => calculateOVR(b) - calculateOVR(a)).slice(0, 2);

    let html = `
        <div class="roster-management-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: system-ui;">ROSTER <span style="color:#e65100">MANAGEMENT</span></h1>
                <p style="margin:0; color:#64748b;">Current squad: <strong style="color:#1a237e">${teamName}</strong> | League: <strong style="color:#1a237e">${leagueName}</strong></p>
            </div>
            <div style="background:#1a237e; color:white; padding:10px 20px; border-radius:30px; font-weight:bold; font-size:0.85rem; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 10px rgba(26,35,126,0.2);">
                SQUAD SIZE: ${players.length} / 12
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 0 20px 30px 20px;">
            ${topStars.map((star, idx) => {
                const potData = star.potential_definitions || { label: 'Prospect', icon: '', color: '#3b82f6' };
                const countryCode = star.country || star.nationality || "";
                const flagUrl = getFlagUrl(countryCode);
                
                return `
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); border-radius: 15px; padding: 25px; display: flex; align-items: center; gap: 20px; color: white; box-shadow: 0 10px 20px rgba(26,35,126,0.1);">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${star.last_name}" style="width: 75px; height: 75px; background: white; border-radius: 12px; border: 3px solid rgba(255,255,255,0.2); object-fit: cover;">
                    </div>
                    <div>
                        <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: #ffab40; font-weight: 800;">
                            ${idx === 0 ? 'Franchise Star' : 'Future Pillar'}
                        </span>
                        <h2 style="margin: 5px 0; font-size: 1.5rem; display: flex; align-items: center; gap: 10px;">
                            ${star.first_name} ${star.last_name}
                            ${flagUrl ? `<img src="${flagUrl}" style="width: 22px; height: auto; border-radius: 2px; border: 1px solid #e2e8f0;">` : ''}
                        </h2>
                        <span style="font-size: 0.9rem; opacity: 0.8; display: flex; align-items: center; gap: 8px;">
                            <div style="${getPositionStyle(star.position)}; width: 24px; height: 24px; font-size: 0.55rem;">${star.position}</div> | <strong>${potData.label} ${potData.icon}</strong>
                        </span>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <div style="margin: 0 20px; padding-bottom: 40px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 12px;">
                <thead>
                    <tr style="text-align: left; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">
                        <th style="padding: 10px 25px;">Player & Scouting Report</th>
                        <th style="padding: 10px; text-align: center;">Pos</th>
                        <th style="padding: 10px;">HT (cm/ft)</th>
                        <th style="padding: 10px;">Age</th>
                        <th style="padding: 10px;">Potential Class</th>
                        <th style="padding: 10px;">Salary</th>
                        <th style="padding: 10px; text-align: center;">OVR</th>
                        <th style="padding: 20px 25px; text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody id="roster-list-body">
                    ${players.map(p => renderPlayerRow(p)).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    container.onclick = (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const playerId = btn.getAttribute('data-id');
        const player = players.find(pl => String(pl.id) === String(playerId));
        if (!player || !window.RosterActions) return;

        if (btn.classList.contains('btn-profile-trigger')) window.RosterActions.showProfile(player);
        else if (btn.classList.contains('btn-train-trigger')) window.RosterActions.showTraining(player);
        else if (btn.classList.contains('btn-sell-trigger')) window.RosterActions.sellPlayer(player);
    };
}

function renderPlayerRow(p) {
    const isRookie = p.is_rookie || p.age <= 19;
    const potData = p.potential_definitions || { label: 'Prospect', icon: '', color: '#3b82f6' };
    const ovr = calculateOVR(p);
    const ovrStyle = getOvrStyle(ovr);
    
    const countryCode = p.country || p.nationality || p.country_code || "";
    const flagUrl = getFlagUrl(countryCode);

    const heightCm = p.height || 0;
    const inchesTotal = heightCm * 0.393701;
    const ft = Math.floor(inchesTotal / 12);
    const inc = Math.round(inchesTotal % 12);
    const heightInFt = heightCm > 0 ? `${ft}'${inc}"` : '--';

    return `
        <tr style="background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-radius: 15px;">
            <td style="padding: 20px 25px; border-radius: 15px 0 0 15px; border: 1px solid #f1f5f9; border-right: none;">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 60px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" style="width: 60px; height: 60px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                        ${flagUrl ? `<img src="${flagUrl}" style="width: 22px; height: auto; border-radius: 2px; border: 1px solid #e2e8f0;">` : ''}
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <strong style="color: #1a237e; font-size: 1.05rem;">${p.first_name} ${p.last_name}</strong>
                            ${isRookie ? '<span style="background:#fee2e2; color:#ef4444; font-size:0.6rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Rookie</span>' : ''}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8fafc; padding: 12px; border-radius: 10px; font-size: 0.65rem; border: 1px solid #edf2f7; min-width: 400px;">
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Attack</div>
                                <div style="display:flex; justify-content:space-between;"><span>2PT Shot</span> <strong>${p.skill_2pt ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>3PT Shot</span> <strong>${p.skill_3pt ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Dunking</span> <strong>${p.skill_dunk ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>1on1 Off</span> <strong>${p.skill_1on1_off ?? '-'}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Defense</div>
                                <div style="display:flex; justify-content:space-between;"><span>1on1 Def</span> <strong>${p.skill_1on1_def ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Blocking</span> <strong>${p.skill_block ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Stealing</span> <strong>${p.skill_steal ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Rebound</span> <strong>${p.skill_rebound ?? '-'}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">General</div>
                                <div style="display:flex; justify-content:space-between;"><span>Passing</span> <strong>${p.skill_passing ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Dribbling</span> <strong>${p.skill_dribbling ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Stamina</span> <strong>${p.skill_stamina ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Free Th.</span> <strong>${p.skill_ft ?? '-'}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 20px 10px; text-align: center;"><div style="${getPositionStyle(p.position)}">${p.position}</div></td>
            <td style="padding: 20px 10px; font-weight: 500; color: #64748b; font-size: 0.8rem;">${heightCm} cm<br><small>${heightInFt}</small></td>
            <td style="padding: 20px 10px; font-weight: 700; color: #64748b;">${p.age}</td>
            <td style="padding: 20px 10px;"><div style="border-bottom: 3px solid ${potData.color}; display: inline-block;"><span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;">${potData.label} ${potData.icon}</span></div></td>
            <td style="padding: 20px 10px; font-weight: 800; color: #059669;">$${(p.salary || 0).toLocaleString()}</td>
            <td style="padding: 20px 10px; text-align: center;">
                <div style="width: 42px; height: 42px; background: ${ovrStyle.bg}; border: 2px solid ${ovrStyle.border}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: ${ovrStyle.color}; font-size: 1.1rem;">
                    ${ovr}
                </div>
            </td>
            <td style="padding: 20px 25px; text-align: right; border-radius: 0 15px 15px 0; border: 1px solid #f1f5f9; border-left: none;">
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button class="btn-profile-trigger" data-id="${p.id}" style="background: #1a237e; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 0.65rem;">Profile</button>
                    <button class="btn-train-trigger" data-id="${p.id}" style="background: #f1f5f9; color: #1a237e; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 0.65rem;">Train</button>
                    <button class="btn-sell-trigger" data-id="${p.id}" style="background: white; color: #ef4444; border: 1px solid #fee2e2; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 0.65rem;">Sell</button>
                </div>
            </td>
        </tr>
    `;
}
