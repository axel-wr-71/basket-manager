// js/app/roster_actions.js

// --- FUNKCJE POMOCNICZE (Global Scope) ---

window.getPotentialData = (val) => {
    const p = parseInt(val) || 0;
    if (p >= 96) return { label: 'G.O.A.T.', color: '#ff4500', icon: '👑' };
    if (p >= 92) return { label: 'All-Time Great', color: '#b8860b', icon: '🏆' };
    if (p >= 88) return { label: 'Elite Franchise', color: '#d4af37', icon: '⭐' };
    if (p >= 84) return { label: 'Star Performer', color: '#8b5cf6', icon: '🌟' };
    if (p >= 79) return { label: 'High Prospect', color: '#10b981', icon: '🚀' };
    if (p >= 74) return { label: 'Solid Starter', color: '#6366f1', icon: '🏀' };
    if (p >= 68) return { label: 'Reliable Bench', color: '#64748b', icon: '📋' };
    if (p >= 60) return { label: 'Role Player', color: '#94a3b8', icon: '👤' };
    if (p >= 50) return { label: 'Deep Bench', color: '#cbd5e1', icon: '🪑' };
    return { label: 'Project Player', color: '#94a3b8', icon: '🛠️' };
};

// Pomocnik do kolorowania skilli w profilu (spójny z roster_view)
const getSkillColor = (val) => {
    const v = parseInt(val) || 0;
    if (v >= 19) return '#d4af37'; 
    if (v >= 17) return '#8b5cf6'; 
    if (v >= 15) return '#10b981'; 
    if (v >= 13) return '#06b6d4'; 
    if (v >= 11) return '#3b82f6'; 
    return '#64748b';             
};

window.selectAuctionType = (type, el) => {
    document.querySelectorAll('.auction-type-card').forEach(c => {
        c.style.borderColor = '#f1f5f9';
        c.style.background = 'white';
    });
    el.style.borderColor = '#1a237e';
    el.style.background = '#f8fafc';
    document.getElementById('bid-field').style.display = (type === 'instant') ? 'none' : 'block';
    document.getElementById('buy-field').style.display = (type === 'standard') ? 'none' : 'block';
    document.getElementById('price-fields-container').dataset.selectedType = type;
};

export const RosterActions = {
    closeModal: () => {
        const modal = document.getElementById('roster-modal-overlay');
        if (modal) modal.remove();
    },

    _renderProfileMetric: (label, val, color) => `
        <div style="background:white; padding:15px; border-radius:15px; border:1px solid #e2e8f0; text-align:center;">
            <small style="color:#94a3b8; font-weight:800; text-transform:uppercase; font-size:0.65em;">${label}</small>
            <div style="color:${color}; font-size:1.3em; font-weight:900; margin-top:5px;">${val}</div>
        </div>
    `,

    showProfile: (player) => {
        const potData = window.getPotentialData(player.potential);
        const isRookie = player.age <= 19;

        // DOKŁADNE MAPOWANIE UMIEJĘTNOŚCI Z BAZY (9 skilli)
        const skillGroups = [
            {
                name: 'Attack',
                skills: [
                    { name: '2PT Scoring', val: player.skill_2pt },
                    { name: '3PT Scoring', val: player.skill_3pt },
                    { name: 'Passing', val: player.skill_passing }
                ]
            },
            {
                name: 'Defense',
                skills: [
                    { name: '1v1 Defense', val: player.skill_1on1_def },
                    { name: 'Rebounding', val: player.skill_rebound },
                    { name: 'Shot Blocking', val: player.skill_block }
                ]
            },
            {
                name: 'Physical',
                skills: [
                    { name: 'Stamina', val: player.skill_stamina },
                    { name: 'Dribbling', val: player.skill_dribbling },
                    { name: 'Ovr Skill', val: player.overall_rating }
                ]
            }
        ];

        const modalHtml = `
            <div id="roster-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,10,0.9); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(15px);">
                <div style="background:white; width:950px; max-height:90vh; border-radius:35px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 30px 60px rgba(0,0,0,0.5);">
                    <div style="background:#1a237e; color:white; padding:40px; display:flex; align-items:center; gap:30px; position:relative;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}" style="width:130px; height:130px; background:white; border-radius:25px; padding:5px; border:4px solid #3b82f6;">
                        <div style="text-align:left;">
                            <h1 style="margin:0; font-size:2.8em; font-weight:900;">${player.first_name} ${player.last_name}</h1>
                            <p style="margin:5px 0; opacity:0.8; font-size:1.1em;">${player.position} | ${player.height || '--'} cm | ${player.age} Years Old ${isRookie ? '<b style="color:#00f2ff; margin-left:10px;">[ROOKIE]</b>' : ''}</p>
                            <div style="display:inline-block; background:${potData.color}; padding:6px 16px; border-radius:12px; font-weight:900; font-size:0.85em; margin-top:10px;">${potData.icon} ${potData.label}</div>
                        </div>
                        <button onclick="RosterActions.closeModal()" style="position:absolute; top:30px; right:30px; background:none; border:none; color:white; font-size:35px; cursor:pointer;">&times;</button>
                    </div>

                    <div style="padding:40px; display:grid; grid-template-columns: 1.3fr 0.7fr; gap:40px; overflow-y:auto;">
                        <div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:30px;">
                                ${RosterActions._renderProfileMetric("Overall Rating", player.overall_rating, "#1a237e")}
                                ${RosterActions._renderProfileMetric("Potential Class", potData.label, potData.color)}
                            </div>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
                                ${skillGroups.map(group => `
                                    <div style="margin-bottom:10px;">
                                        <h3 style="color:#94a3b8; font-size:0.75em; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid #f0f2f5; padding-bottom:5px; margin-bottom:12px;">${group.name}</h3>
                                        ${group.skills.map(s => `
                                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; background:#f8fafc; padding:10px 14px; border-radius:10px;">
                                                <span style="font-size:0.85em; font-weight:600; color:#475569;">${s.name}</span>
                                                <b style="color:${getSkillColor(s.val)}; font-weight:900;">${s.val || '--'}</b>
                                            </div>
                                        `).join('')}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:25px;">
                            <div style="background:#f8f9fa; padding:25px; border-radius:30px; border:1px solid #e2e8f0;">
                                <h3 style="color:#1a237e; font-size:0.8em; margin-bottom:15px; text-transform:uppercase;">Contract Details</h3>
                                <div style="display:flex; flex-direction:column; gap:12px;">
                                    <div style="display:flex; justify-content:space-between; font-size:0.95em;">
                                        <span style="color:#64748b;">Salary</span>
                                        <b style="color:#2e7d32;">$${(player.salary || 0).toLocaleString()}</b>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; font-size:0.95em;">
                                        <span style="color:#64748b;">Nationality</span>
                                        <b style="color:#1a237e;">${player.nationality || 'Poland'}</b>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    showTraining: (player) => { /* Jak wcześniej */ },
    showSellConfirm: (player) => { /* Jak wcześniej */ }
};
