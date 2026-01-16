// js/app/roster_actions.js

// --- FUNKCJE POMOCNICZE (Global Scope dla onclick w HTML) ---

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

window.selectAuctionType = (type, el) => {
    document.querySelectorAll('.auction-type-card').forEach(c => {
        c.style.borderColor = '#f1f5f9';
        c.style.background = 'white';
    });
    el.style.borderColor = '#1a237e';
    el.style.background = '#f8fafc';
    
    const bidF = document.getElementById('bid-field');
    const buyF = document.getElementById('buy-field');
    
    if(type === 'standard') { 
        bidF.style.display = 'block'; 
        buyF.style.display = 'none'; 
    } else if(type === 'instant') { 
        bidF.style.display = 'none'; 
        buyF.style.display = 'block'; 
    } else { 
        bidF.style.display = 'block'; 
        buyF.style.display = 'block'; 
    }
    document.getElementById('price-fields-container').dataset.selectedType = type;
};

window.selectDuration = (val, el) => {
    document.querySelectorAll('.duration-card').forEach(c => {
        c.style.background = '#f1f5f9';
        c.style.color = '#64748b';
    });
    el.style.background = '#1a237e';
    el.style.color = 'white';
    el.parentElement.dataset.selectedValue = val;
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

        const skillGroups = [
            {
                name: 'Offensive Skillset',
                skills: [
                    { name: 'Inside Scoring', val: player.skill_2pt },
                    { name: 'Outside Threat', val: player.skill_3pt },
                    { name: 'Playmaking', val: player.skill_passing }
                ]
            },
            {
                name: 'Defensive Skillset',
                skills: [
                    { name: 'Perimeter Def', val: player.skill_1on1_def },
                    { name: 'Rebounding', val: player.skill_rebound },
                    { name: 'Interior Wall', val: player.skill_block }
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
                        <button onclick="document.getElementById('roster-modal-overlay').remove()" style="position:absolute; top:30px; right:30px; background:none; border:none; color:white; font-size:35px; cursor:pointer;">&times;</button>
                    </div>

                    <div style="padding:40px; display:grid; grid-template-columns: 1.2fr 0.8fr; gap:40px; overflow-y:auto;">
                        <div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:30px;">
                                ${RosterActions._renderProfileMetric("Overall Rating", player.overall_rating, "#1a237e")}
                                ${RosterActions._renderProfileMetric("Potential Class", potData.label, potData.color)}
                            </div>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                                ${skillGroups.map(group => `
                                    <div>
                                        <h3 style="color:#94a3b8; font-size:0.7em; text-transform:uppercase; border-bottom:1px solid #f0f2f5; padding-bottom:5px; margin-bottom:15px;">${group.name}</h3>
                                        ${group.skills.map(s => `
                                            <div style="display:flex; justify-content:space-between; margin-bottom:10px; background:#f8fafc; padding:8px 12px; border-radius:8px;">
                                                <span style="font-size:0.9em; font-weight:600; color:#475569;">${s.name}</span>
                                                <b style="color:#1a237e;">${s.val || '--'}</b>
                                            </div>
                                        `).join('')}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:30px;">
                            <div style="background:#f8f9fa; padding:25px; border-radius:30px; border:1px solid #e2e8f0;">
                                <h3 style="color:#1a237e; font-size:0.8em; margin-bottom:15px; text-transform:uppercase;">Contract Info</h3>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <div style="display:flex; justify-content:space-between;">
                                        <span style="color:#64748b;">Annual Salary</span>
                                        <b style="color:#2e7d32;">$${(player.salary || 0).toLocaleString()}</b>
                                    </div>
                                    <div style="display:flex; justify-content:space-between;">
                                        <span style="color:#64748b;">Status</span>
                                        <b style="color:#1a237e;">${isRookie ? 'Rookie Scale' : 'Veteran'}</b>
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

    showTraining: (player) => {
        const modalHtml = `
            <div id="roster-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,10,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(10px);">
                <div style="background:white; width:450px; border-radius:30px; padding:40px; text-align:center;">
                    <h2 style="color:#1a237e; margin-bottom:10px;">Training Focus</h2>
                    <p style="color:#64748b; margin-bottom:25px;">Set development priority for ${player.first_name}</p>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <button onclick="alert('Training set!'); RosterActions.closeModal()" style="padding:15px; background:#f8f9fa; border:1px solid #e2e8f0; border-radius:15px; cursor:pointer; font-weight:700; color:#1a237e;">🎯 Offensive Specialist</button>
                        <button onclick="alert('Training set!'); RosterActions.closeModal()" style="padding:15px; background:#f8f9fa; border:1px solid #e2e8f0; border-radius:15px; cursor:pointer; font-weight:700; color:#1a237e;">🛡️ Defensive Wall</button>
                    </div>
                    <button onclick="RosterActions.closeModal()" style="margin-top:20px; color:#94a3b8; background:none; border:none; cursor:pointer;">Cancel</button>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    showSellConfirm: (player) => {
        const marketValue = (player.salary || 0) * 12;

        const modalHtml = `
            <div id="roster-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,10,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(12px);">
                <div style="background:white; width:550px; border-radius:40px; padding:0; position:relative; overflow:hidden; box-shadow:0 30px 70px rgba(0,0,0,0.6);">
                    <button onclick="RosterActions.closeModal()" style="position:absolute; top:25px; right:25px; background:#f1f5f9; border:none; width:40px; height:40px; border-radius:50%; font-size:22px; cursor:pointer; color:#64748b; z-index:10; display:flex; align-items:center; justify-content:center;">&times;</button>

                    <div style="padding:40px 40px 20px 40px; text-align:center; background:linear-gradient(to bottom, #f8fafc, white);">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}" style="width:100px; height:100px; background:white; border-radius:50%; border:3px solid #1a237e; margin-bottom:15px;">
                        <h2 style="color:#1a237e; margin:0; font-size:1.8em;">${player.first_name} ${player.last_name}</h2>
                    </div>

                    <div style="padding:0 40px 40px 40px;">
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:25px;">
                            <div class="auction-type-card" onclick="window.selectAuctionType('standard', this)" style="cursor:pointer; padding:15px; border-radius:15px; border:2px solid #1a237e; text-align:center; background:#f8fafc;">
                                <div style="font-size:1.5em; margin-bottom:5px;">🔨</div>
                                <div style="font-size:0.8em; font-weight:800; color:#1a237e;">Bidding</div>
                            </div>
                            <div class="auction-type-card" onclick="window.selectAuctionType('instant', this)" style="cursor:pointer; padding:15px; border-radius:15px; border:2px solid #f1f5f9; text-align:center; background:white;">
                                <div style="font-size:1.5em; margin-bottom:5px;">⚡</div>
                                <div style="font-size:0.8em; font-weight:800; color:#1a237e;">Instant</div>
                            </div>
                            <div class="auction-type-card" onclick="window.selectAuctionType('hybrid', this)" style="cursor:pointer; padding:15px; border-radius:15px; border:2px solid #f1f5f9; text-align:center; background:white;">
                                <div style="font-size:1.5em; margin-bottom:5px;">⚖️</div>
                                <div style="font-size:0.8em; font-weight:800; color:#1a237e;">Hybrid</div>
                            </div>
                        </div>

                        <div id="price-fields-container" data-selected-type="standard" style="display:grid; grid-template-columns:1fr; gap:15px; margin-bottom:25px;">
                            <div id="bid-field">
                                <label style="font-weight:800; font-size:0.75em; color:#94a3b8;">STARTING BID ($)</label>
                                <input type="number" id="market-price-bid" value="${marketValue}" style="width:100%; padding:14px; border-radius:15px; border:2px solid #f1f5f9; font-weight:900; color:#1a237e; font-size:1.1em; margin-top:5px; box-sizing:border-box;">
                            </div>
                            <div id="buy-field" style="display:none;">
                                <label style="font-weight:800; font-size:0.75em; color:#94a3b8;">BUY NOW PRICE ($)</label>
                                <input type="number" id="market-price-buy" value="${Math.round(marketValue * 1.5)}" style="width:100%; padding:14px; border-radius:15px; border:2px solid #f1f5f9; font-weight:900; color:#059669; font-size:1.1em; margin-top:5px; box-sizing:border-box;">
                            </div>
                        </div>

                        <button id="final-submit-listing" style="width:100%; padding:20px; background:#1a237e; color:white; border:none; border-radius:20px; font-weight:800; font-size:1.1em; cursor:pointer;">LIST ON MARKET</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('final-submit-listing').onclick = () => {
            alert('Listed on Transfer Market!');
            RosterActions.closeModal();
        };
    }
};
