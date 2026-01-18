// js/app/roster_view.js

/**
 * Funkcja pomocnicza do aktualizacji górnego paska nawigacji (prawy róg)
 */
function updateGlobalHeader(teamName, leagueName) {
    const headerTeamName = document.querySelector('.team-info b, #global-team-name');
    const headerLeagueName = document.querySelector('.team-info span[style*="color: #ff4500"], #global-league-name');

    if (headerTeamName) headerTeamName.textContent = teamName;
    if (headerLeagueName) headerLeagueName.textContent = leagueName;
}

export function renderRosterView(team, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    // Pobieranie danych zespołu
    const teamName = team?.team_name || team?.name || 'Twoja Drużyna';
    const leagueName = team?.league_name || 'Super League';

    // Aktualizacja nagłówka globalnego
    updateGlobalHeader(teamName, leagueName);

    // Wybór dwóch najlepszych zawodników (Gwiazdy)
    const topStars = [...players].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0)).slice(0, 2);

    let html = `
        <div class="roster-management-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: system-ui;">ROSTER <span style="color:#e65100">MANAGEMENT</span></h1>
                <p style="margin:0; color:#64748b;">Current squad: <strong style="color:#1a237e">${teamName}</strong> | League: <strong style="color:#1a237e">${leagueName}</strong></p>
            </div>
            <div style="background:#1a237e; color:white; padding:10px 20px; border-radius:30px; font-weight:bold; font-size:0.85rem; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 10px rgba(26,35,126,0.2);">
                🏀 SQUAD SIZE: ${players.length} / 12
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 0 20px 30px 20px;">
            ${topStars.map((star, idx) => {
                const potData = window.getPotentialData ? window.getPotentialData(star.potential) : { label: 'Prospect', icon: '', color: '#3b82f6' };
                return `
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); border-radius: 15px; padding: 25px; display: flex; align-items: center; gap: 20px; color: white; box-shadow: 0 10px 20px rgba(26,35,126,0.1);">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${star.last_name}" 
                         style="width: 75px; height: 75px; background: white; border-radius: 12px; border: 3px solid rgba(255,255,255,0.2); object-fit: cover;">
                    <div>
                        <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: #ffab40; font-weight: 800;">
                            ${idx === 0 ? 'Franchise Star' : 'Future Pillar'}
                        </span>
                        <h2 style="margin: 5px 0; font-size: 1.5rem;">${star.first_name} ${star.last_name}</h2>
                        <span style="font-size: 0.9rem; opacity: 0.8;">${star.position} | <strong>${potData.label} ${potData.icon}</strong></span>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <div style="margin: 0 20px; padding-bottom: 40px;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 12px;">
                <thead>
                    <tr style="text-align: left; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">
                        <th style="padding: 10px 25px;">Player & Scouting Report</th>
                        <th style="padding: 10px;">Pos</th>
                        <th style="padding: 10px;">HT (cm/ft)</th>
                        <th style="padding: 10px;">Age</th>
                        <th style="padding: 10px;">Potential Class</th>
                        <th style="padding: 10px;">Salary</th>
                        <th style="padding: 10px;">OVR</th>
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

    // --- DELEGACJA ZDARZEŃ (Naprawa Safari / MacBook) ---
    // Zamiast pętli, jeden słuchacz na cały kontener
    container.onclick = (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const playerId = btn.getAttribute('data-id');
        const player = players.find(pl => String(pl.id) === String(playerId));
        
        if (!player || !window.RosterActions) return;

        if (btn.classList.contains('btn-profile-trigger')) {
            window.RosterActions.showProfile(player);
        } else if (btn.classList.contains('btn-train-trigger')) {
            window.RosterActions.showTraining(player);
        } else if (btn.classList.contains('btn-sell-trigger')) {
            window.RosterActions.sellPlayer(player);
        }
    };
}

function renderPlayerRow(p) {
    const isRookie = p.is_rookie || p.age <= 19;
    const potData = window.getPotentialData ? window.getPotentialData(p.potential) : { label: 'Prospect', color: '#3b82f6' };
    
    // Konwersja wzrostu
    const heightCm = p.height || 0;
    const inchesTotal = heightCm * 0.393701;
    const ft = Math.floor(inchesTotal / 12);
    const inc = Math.round(inchesTotal % 12);
    const heightInFt = heightCm > 0 ? `${ft}'${inc}"` : '--';

    return `
        <tr style="background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-radius: 15px;">
            <td style="padding: 20px 25px; border-radius: 15px 0 0 15px; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; border-left: 1px solid #f1f5f9;">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" 
                         style="width: 60px; height: 60px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <strong style="color: #1a237e; font-size: 1.05rem;">${p.first_name} ${p.last_name}</strong>
                            ${isRookie ? '<span style="background:#fee2e2; color:#ef4444; font-size:0.6rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Rookie</span>' : ''}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8fafc; padding: 10px; border-radius: 10px; font-size: 0.65rem; border: 1px solid #edf2f7; min-width: 320px;">
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Attack</div>
                                <div style="display:flex; justify-content:space-between;"><span>2PT Shot</span> <strong>${p.skill_2pt ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>3PT Shot</span> <strong>${p.skill_3pt ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Dunk</span> <strong>${p.skill_dunk ?? '-'}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Defense</div>
                                <div style="display:flex; justify-content:space-between;"><span>1v1 D</span> <strong>${p.skill_1on1_def ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Block</span> <strong>${p.skill_block ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Steal</span> <strong>${p.skill_steal ?? '-'}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">General</div>
                                <div style="display:flex; justify-content:space-between;"><span>Reb</span> <strong>${p.skill_rebound ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>Stam</span> <strong>${p.skill_stamina ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span>FT</span> <strong>${p.skill_ft ?? '-'}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 20px 10px; font-weight: 700; color: #64748b;">${p.position}</td>
            <td style="padding: 20px 10px; font-weight: 500; color: #64748b; font-size: 0.8rem;">
                ${heightCm} cm<br><span style="font-size: 0.7rem; opacity: 0.6;">${heightInFt}</span>
            </td>
            <td style="padding: 20px 10px; font-weight: 700; color: #64748b;">${p.age}</td>
            <td style="padding: 20px 10px;">
                <div style="border-bottom: 3px solid ${potData.color}; display: inline-block;">
                    <span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;">${potData.label}</span>
                </div>
            </td>
            <td style="padding: 20px 10px; font-weight: 800; color: #059669;">$${(p.salary || 0).toLocaleString()}</td>
            <td style="padding: 20px 10px;">
                <div style="width: 40px; height: 40px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #166534; font-size: 1.1rem;">
                    ${p.overall_rating || '??'}
                </div>
            </td>
            <td style="padding: 20px 25px; text-align: right; border-radius: 0 15px 15px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button class="btn-profile-trigger" data-id="${p.id}" style="background: #1a237e; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.65rem;">Profile</button>
                    <button class="btn-train-trigger" data-id="${p.id}" style="background: #f1f5f9; color: #1a237e; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.65rem;">Train</button>
                    <button class="btn-sell-trigger" data-id="${p.id}" style="background: white; color: #ef4444; border: 1px solid #fee2e2; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.65rem;">Sell</button>
                </div>
            </td>
        </tr>
    `;
}
