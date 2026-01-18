// js/app/roster_view.js
import { RosterActions } from './roster_actions.js';

export function renderRosterView(team, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    // Wybór dwóch najlepszych zawodników do górnych kart (po OVR)
    const topStars = [...players].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0)).slice(0, 2);

    let html = `
        <div class="roster-management-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: system-ui;">ROSTER <span style="color:#e65100">MANAGEMENT</span></h1>
                <p style="margin:0; color:#64748b;">Current squad: <strong style="color:#1a237e">${team?.team_name || team?.name || 'Twoja Drużyna'}</strong> | League: <strong style="color:#1a237e">${team?.league_name || 'Super League'}</strong></p>
            </div>
            <div style="background:#1a237e; color:white; padding:10px 20px; border-radius:30px; font-weight:bold; font-size:0.85rem; display:flex; align-items:center; gap:8px;">
                🏀 SQUAD SIZE: ${players.length} / 12
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 0 20px 30px 20px;">
            ${topStars.map((star, idx) => {
                const potData = window.getPotentialData(star.potential);
                return `
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); border-radius: 15px; padding: 25px; display: flex; align-items: center; gap: 20px; color: white; box-shadow: 0 10px 20px rgba(26,35,126,0.2);">
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

        <div style="background: white; border-radius: 20px; margin: 0 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
            <div style="padding: 20px; border-bottom: 1px solid #f1f5f9;">
                <h3 style="margin:0; color:#1e293b; text-transform:uppercase; font-size:1rem; font-family: system-ui;">Full Squad List</h3>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #f1f5f9;">
                        <th style="padding: 20px;">Player & Scouting Report</th>
                        <th style="padding: 20px;">Pos</th>
                        <th style="padding: 20px;">HT</th>
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

    // Event Listenery dla przycisku Profile (korzysta z Twojego RosterActions)
    container.querySelectorAll('.btn-profile-trigger').forEach((btn) => {
        btn.onclick = () => {
            const playerId = btn.getAttribute('data-id');
            const player = players.find(pl => String(pl.id) === String(playerId));
            if (player) RosterActions.showProfile(player);
        };
    });
}

function renderPlayerRow(p) {
    const isRookie = p.is_rookie || p.age <= 19;
    const potData = window.getPotentialData(p.potential);
    
    // Konwersja wzrostu cm -> stopy/cale
    const heightCm = p.height || 0;
    const inchesTotal = heightCm * 0.393701;
    const ft = Math.floor(inchesTotal / 12);
    const inc = Math.round(inchesTotal % 12);
    const heightInFt = `${ft}'${inc}"`;

    return `
        <tr style="border-bottom: 1px solid #f8fafc; vertical-align: middle;">
            <td style="padding: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" 
                         style="width: 65px; height: 65px; background: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; object-fit: cover;">
                    
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <strong style="color: #1a237e; font-size: 1.1rem;">${p.first_name} ${p.last_name}</strong>
                            ${isRookie ? '<span style="background:#fee2e2; color:#ef4444; font-size:0.6rem; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Rookie</span>' : ''}
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8fafc; padding: 10px; border-radius: 10px; font-size: 0.65rem; border: 1px solid #edf2f7; min-width: 350px;">
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Attack</div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Inside (2PT)</span> <strong>${p.skill_2pt ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>3PT Shot</span> <strong>${p.skill_3pt ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Dunk</span> <strong>${p.skill_dunk ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Passing</span> <strong>${p.skill_passing ?? '-'}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Defense</div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>1v1 Def</span> <strong>${p.skill_1on1_def ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Steal</span> <strong>${p.skill_steal ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Block</span> <strong>${p.skill_block ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>1v1 Off</span> <strong>${p.skill_1on1_off ?? '-'}</strong></div>
                            </div>
                            <div>
                                <div style="color:#1a237e; margin-bottom:4px; font-weight:800; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">General</div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Rebound</span> <strong>${p.skill_rebound ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Dribble</span> <strong>${p.skill_dribbling ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Stamina</span> <strong>${p.skill_stamina ?? '-'}</strong></div>
                                <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Free Throw</span> <strong>${p.skill_ft ?? '-'}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            
            <td style="padding: 20px; font-weight: 700; color: #64748b;">${p.position}</td>
            <td style="padding: 20px; font-weight: 500; color: #64748b; font-size: 0.8rem;">
                ${heightCm} cm<br><span style="font-size: 0.7rem; opacity: 0.6;">${heightInFt}</span>
            </td>
            <td style="padding: 20px; font-weight: 700; color: #64748b;">${p.age}</td>
            <td style="padding: 20px;">
                <div style="border-bottom: 3px solid ${potData.color}; display: inline-block; padding-bottom: 2px;">
                    <span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;">${potData.label}</span>
                </div>
            </td>
            <td style="padding: 20px; font-weight: 800; color: #059669;">$${(p.salary || 0).toLocaleString()}</td>
            <td style="padding: 20px;">
                <div style="width: 42px; height: 42px; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #166534; font-size: 1.1rem;">
                    ${p.overall_rating || '??'}
                </div>
            </td>
            <td style="padding: 20px; text-align: right;">
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn-profile-trigger" data-id="${p.id}" style="background: #1a237e; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.65rem;">
                        Profile
                    </button>
                    <button style="background: #f1f5f9; color: #1a237e; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.65rem;">
                        Train
                    </button>
                    <button style="background: white; color: #ef4444; border: 1px solid #fee2e2; padding: 8px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.65rem;">
                        Sell
                    </button>
                </div>
            </td>
        </tr>
    `;
}
