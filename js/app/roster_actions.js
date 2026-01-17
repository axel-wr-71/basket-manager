// js/app/roster_actions.js

// --- FUNKCJE POMOCNICZE ---

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

const getSkillColor = (val) => {
    const v = parseInt(val) || 0;
    if (v >= 19) return '#d4af37'; 
    if (v >= 17) return '#8b5cf6'; 
    if (v >= 15) return '#10b981'; 
    if (v >= 13) return '#06b6d4'; 
    if (v >= 11) return '#3b82f6'; 
    return '#64748b';             
};

export const RosterActions = {
    closeModal: () => {
        const modal = document.getElementById('roster-modal-overlay');
        if (modal) modal.remove();
    },

    _renderProfileCard: (label, val, color, extraHtml = '') => `
        <div style="background:white; padding:20px; border-radius:20px; border:1px solid #e2e8f0; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100px;">
            <small style="color:#94a3b8; font-weight:800; text-transform:uppercase; font-size:0.7em; margin-bottom:8px; display:block;">${label}</small>
            <div style="color:${color}; font-size:1.4em; font-weight:900;">${val}</div>
            ${extraHtml}
        </div>
    `,

    showProfile: (player) => {
        const potData = window.getPotentialData(player.potential);
        const isRookie = player.age <= 19;
        const progressWidth = Math.min(Math.round(((player.overall_rating || 0) / (player.potential || 1)) * 100), 100);
        
        // Flaga narodowości
        const countryCode = (player.nationality || 'pl').toLowerCase();
        const flagUrl = `https://flagcdn.com/w40/${countryCode}.png`;

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
                name: 'Physical & Ovr',
                skills: [
                    { name: 'Stamina', val: player.skill_stamina },
                    { name: 'Dribbling', val: player.skill_dribbling },
                    { name: 'Overall', val: player.overall_rating }
                ]
            }
        ];

        const modalHtml = `
            <div id="roster-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,10,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(10px);">
                <div style="background:white; width:1000px; max-height:95vh; border-radius:40px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 40px 80px rgba(0,0,0,0.4);">
                    
                    <div style="background:#1a237e; color:white; padding:40px 50px; display:flex; align-items:center; position:relative;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}" style="width:120px; height:120px; background:white; border-radius:30px; padding:5px; border:4px solid #3b82f6;">
                        
                        <div style="margin-left:30px; flex-grow:1;">
                            <div style="display:flex; align-items:center; gap:15px;">
                                <h1 style="margin:0; font-size:2.5em; font-weight:900;">${player.first_name} ${player.last_name}</h1>
                                <img src="${flagUrl}" style="width:30px; height:20px; border-radius:4px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);">
                                ${isRookie ? `<span style="background:#ef4444; color:white; font-size:10px; padding:4px 10px; border-radius:6px; font-weight:900; letter-spacing:1px; cursor:default; border:1px solid rgba(255,255,255,0.3);">ROOKIE</span>` : ''}
                            </div>
                            <p style="margin:8px 0 0 0; opacity:0.8; font-size:1.1em; font-weight:500;">
                                ${player.position} | ${player.height || '--'} cm | ${player.age} Years Old
                            </p>
                        </div>

                        <div style="text-align:center; margin-right:60px;">
                            <div style="width:80px; height:80px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 8px;">
                                <span style="color:#1a237e; font-size:2.2em; font-weight:900;">${player.overall_rating}</span>
                            </div>
                            <span style="font-size:0.7em; font-weight:800; text-transform:uppercase; letter-spacing:1px; opacity:0.9;">Overall Rating</span>
                        </div>

                        <button onclick="RosterActions.closeModal()" style="position:absolute; top:30px; right:30px; background:rgba(255,255,255,0.1); border:none; color:white; width:45px; height:45px; border-radius:50%; font-size:28px; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
                    </div>

                    <div style="padding:40px; overflow-y:auto;">
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px; margin-bottom:40px;">
                            ${RosterActions._renderProfileCard("Potential Class", potData.label, potData.color, `
                                <div style="width: 200px; height: 6px; background: #e2e8f0; border-radius: 10px; margin-top: 15px; overflow: hidden;">
                                    <div style="width: ${progressWidth}%; height: 100%; background: ${potData.color};"></div>
                                </div>
                                <span style="font-size: 11px; font-weight: 800; color: #94a3b8; margin-top: 8px;">${progressWidth}% of potential reached</span>
                            `)}
                            ${RosterActions._renderProfileCard("Annual Salary", `$${(player.salary || 0).toLocaleString()}`, "#2e7d32")}
                        </div>

                        <h3 style="color:#1a237e; font-size:0.9em; text-transform:uppercase; letter-spacing:2px; margin-bottom:20px; border-left:4px solid #1a237e; padding-left:15px;">Technical Evaluation</h3>
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:30px;">
                            ${skillGroups.map(group => `
                                <div style="background:#f8fafc; padding:20px; border-radius:25px; border:1px solid #f1f5f9;">
                                    <h4 style="color:#94a3b8; font-size:0.75em; text-transform:uppercase; margin-bottom:15px; text-align:center;">${group.name}</h4>
                                    ${group.skills.map(s => `
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:white; padding:12px 15px; border-radius:12px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                                            <span style="font-size:0.85em; font-weight:700; color:#475569;">${s.name}</span>
                                            <span style="color:${getSkillColor(s.val)}; font-weight:900; font-size:1.1em;">${s.val || '--'}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    showTraining: (player) => {
        // ... (kod treningu bez zmian)
    },

    showSellConfirm: (player) => {
        // ... (kod sprzedaży bez zmian)
    }
};
