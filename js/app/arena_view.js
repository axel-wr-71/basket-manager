// js/app/arena_view.js
import { supabaseClient } from '../auth.js';

let currentArenaData = null;
let currentUpgrades = [];
let currentTicketPrices = [];
let currentEvents = [];
let currentAttendanceStats = [];

/**
 * Główna funkcja renderująca widok areny
 */
export async function renderArenaView(team, players) {
    console.log("[ARENA] Renderowanie widoku areny...");
    
    const container = document.getElementById('m-arena');
    if (!container) {
        console.error("[ARENA] Brak kontenera m-arena!");
        return;
    }
    
    // Pokaż ładowanie
    container.innerHTML = `
        <div class="market-modern-wrapper" style="padding: 30px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px; color: #1a237e;">🏟️</div>
            <h2 style="color: #1a237e; font-weight: 800;">Ładowanie danych areny...</h2>
            <p style="color: #64748b; font-size: 0.95rem;">Przygotowywanie informacji o arenie</p>
        </div>
    `;
    
    try {
        // Pobierz dane areny
        const [arenaData, upgrades, ticketPrices, events, attendanceStats] = await Promise.all([
            fetchArenaData(team.id),
            fetchAvailableUpgrades(),
            fetchTicketPrices(team.id),
            fetchArenaEvents(team.id),
            fetchAttendanceStats(team.id)
        ]);
        
        if (!arenaData) {
            throw new Error("Nie znaleziono danych areny dla Twojej drużyny");
        }
        
        currentArenaData = arenaData;
        currentUpgrades = upgrades;
        currentTicketPrices = ticketPrices;
        currentEvents = events;
        currentAttendanceStats = attendanceStats;
        
        renderArenaContent(container, arenaData, upgrades, ticketPrices, events, attendanceStats, team);
        
    } catch (error) {
        console.error("[ARENA] Błąd:", error);
        container.innerHTML = `
            <div class="market-modern-wrapper" style="padding: 30px; text-align: center;">
                <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 12px; padding: 40px; margin-bottom: 20px;">
                    <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                    <h3 style="margin: 0 0 10px 0; color: #7c2d12; font-weight: 800;">Błąd ładowania areny</h3>
                    <p style="color: #92400e; margin-bottom: 20px;">${error.message}</p>
                    <button onclick="window.switchTab('m-arena')" 
                            style="background: #1a237e; color: white; border: none; padding: 12px 30px; 
                                   border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.95rem; transition: all 0.2s;"
                            onmouseover="this.style.background='#283593'; this.style.transform='translateY(-2px)';"
                            onmouseout="this.style.background='#1a237e'; this.style.transform='translateY(0)';">
                        🔄 Spróbuj ponownie
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Pobiera dane areny dla drużyny
 */
async function fetchArenaData(teamId) {
    console.log("[ARENA] Pobieranie danych areny dla team:", teamId);
    
    const { data, error } = await supabaseClient
        .from('arenas')
        .select('*')
        .eq('team_id', teamId)
        .single();
    
    if (error) {
        console.error("[ARENA] Błąd pobierania areny:", error);
        return null;
    }
    
    return data;
}

/**
 * Pobiera dostępne ulepszenia
 */
async function fetchAvailableUpgrades() {
    console.log("[ARENA] Pobieranie dostępnych ulepszeń");
    
    const { data, error } = await supabaseClient
        .from('arena_upgrades')
        .select('*')
        .order('cost', { ascending: true });
    
    if (error) {
        console.error("[ARENA] Błąd pobierania ulepszeń:", error);
        return [];
    }
    
    return data || [];
}

/**
 * Pobiera ceny biletów
 */
async function fetchTicketPrices(teamId) {
    console.log("[ARENA] Pobieranie cen biletów");
    
    // Najpierw znajdź arena_id dla team
    const { data: arena, error: arenaError } = await supabaseClient
        .from('arenas')
        .select('id')
        .eq('team_id', teamId)
        .single();
    
    if (arenaError || !arena) {
        console.error("[ARENA] Błąd znajdowania areny:", arenaError);
        return [];
    }
    
    const { data, error } = await supabaseClient
        .from('ticket_prices')
        .select('*')
        .eq('arena_id', arena.id)
        .order('base_price', { ascending: false });
    
    if (error) {
        console.error("[ARENA] Błąd pobierania cen biletów:", error);
        return [];
    }
    
    return data || [];
}

/**
 * Pobiera wydarzenia na arenie
 */
async function fetchArenaEvents(teamId) {
    console.log("[ARENA] Pobieranie wydarzeń areny");
    
    // Najpierw znajdź arena_id dla team
    const { data: arena, error: arenaError } = await supabaseClient
        .from('arenas')
        .select('id')
        .eq('team_id', teamId)
        .single();
    
    if (arenaError || !arena) {
        console.error("[ARENA] Błąd znajdowania areny:", arenaError);
        return [];
    }
    
    const { data, error } = await supabaseClient
        .from('arena_events')
        .select('*')
        .eq('arena_id', arena.id)
        .order('event_date', { ascending: true })
        .limit(10);
    
    if (error) {
        console.error("[ARENA] Błąd pobierania wydarzeń:", error);
        return [];
    }
    
    return data || [];
}

/**
 * Pobiera statystyki frekwencji
 */
async function fetchAttendanceStats(teamId) {
    console.log("[ARENA] Pobieranie statystyk frekwencji");
    
    // Najpierw znajdź arena_id dla team
    const { data: arena, error: arenaError } = await supabaseClient
        .from('arenas')
        .select('id')
        .eq('team_id', teamId)
        .single();
    
    if (arenaError || !arena) {
        console.error("[ARENA] Błąd znajdowania areny:", arenaError);
        return [];
    }
    
    const { data, error } = await supabaseClient
        .from('attendance_stats')
        .select('*')
        .eq('arena_id', arena.id)
        .order('game_week', { descending: true })
        .limit(8);
    
    if (error) {
        console.error("[ARENA] Błąd pobierania statystyk:", error);
        return [];
    }
    
    return data || [];
}

/**
 * Renderuje główną zawartość widoku areny
 */
function renderArenaContent(container, arena, upgrades, ticketPrices, events, attendanceStats, team) {
    console.log("[ARENA] Renderowanie zawartości areny...");
    
    // Oblicz statystyki
    const totalCapacity = arena.capacity;
    const facilities = typeof arena.facilities === 'string' ? JSON.parse(arena.facilities) : arena.facilities;
    const availableUpgrades = upgrades.filter(u => u.level_required <= arena.current_level);
    const totalMaintenanceCost = arena.maintenance_cost;
    
    // Oblicz przychody z biletów
    const ticketRevenue = ticketPrices.reduce((sum, tp) => {
        return sum + (tp.base_price * tp.sold_tickets || 0);
    }, 0);
    
    container.innerHTML = `
        <div class="market-modern-wrapper">
            <!-- NAGŁÓWEK -->
            <div class="market-management-header" style="padding: 20px 0 30px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
                <div>
                    <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: 'Inter', sans-serif; font-size: 1.8rem;">
                        SPORTS <span style="color:#e65100">ARENA</span>
                    </h1>
                    <p style="margin:10px 0 0 0; color:#64748b; font-size: 0.95rem;">
                        Zarządzanie areną | 
                        <span style="color:#1a237e; font-weight:600;">${arena.arena_name}</span>
                    </p>
                </div>
                <div style="background:#e65100; color:white; padding:12px 24px; border-radius:12px; font-weight:700; font-size:0.9rem; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 12px rgba(230,81,0,0.2);">
                    <span style="font-size: 1.2rem;">🏟️</span>
                    Pojemność: ${totalCapacity.toLocaleString()} miejsc
                </div>
            </div>

            <!-- STATYSTYKI ARENY -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 25px 0;">
                <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Poziom</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #0c4a6e;">${arena.current_level}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Poziom areny</div>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #15803d; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Atmosfera</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #166534;">${arena.atmosphere_level}/10</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Poziom zaangażowania</div>
                </div>
                <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #d97706; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Koszty</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #92400e;">$${totalMaintenanceCost.toLocaleString()}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Utrzymanie / tydz.</div>
                </div>
                <div style="background: #fae8ff; border: 1px solid #f5d0fe; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #a21caf; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Przychód</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #86198f;">$${Math.round(ticketRevenue).toLocaleString()}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Bilety / tydz.</div>
                </div>
            </div>

            <!-- GŁÓWNA ZAWARTOŚĆ -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 25px; margin-top: 20px;">
                
                <!-- LEWA KOLUMNA -->
                <div>
                    <!-- ZARZĄDZANIE BILETAMI -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin:0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                                🎫 Zarządzanie biletami
                            </h2>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                Ceny dynamiczne
                            </div>
                        </div>
                        
                        <div id="ticket-pricing">
                            ${renderTicketPricing(ticketPrices, totalCapacity)}
                        </div>
                        
                        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 0.9rem; color: #1a237e; font-weight: 600;">Abonamenty sezonowe</div>
                                    <div style="font-size: 0.8rem; color: #64748b;">Dostępne dla sekcji VIP i Premium</div>
                                </div>
                                <button onclick="showSeasonTicketsModal()" 
                                        style="background: #1a237e; color: white; border: none; padding: 10px 20px; 
                                               border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                                        onmouseover="this.style.background='#283593';"
                                        onmouseout="this.style.background='#1a237e';">
                                    Zarządzaj abonamentami
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ULEPSZENIA ARENY -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin:0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                                🔧 Dostępne ulepszenia
                            </h2>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                ${availableUpgrades.length} dostępnych
                            </div>
                        </div>
                        
                        <div id="arena-upgrades" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                            ${renderAvailableUpgrades(availableUpgrades, arena, team.balance)}
                        </div>
                    </div>
                </div>
                
                <!-- PRAWA KOLUMNA -->
                <div>
                    <!-- UDOGODNIENIA -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            🏗️ Udogodnienia areny
                        </h2>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                            ${renderFacilities(facilities)}
                        </div>
                        
                        <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #e65100;">
                            <div style="font-weight: 700; color: #1a237e; font-size: 0.9rem; margin-bottom: 5px;">Poziom rozwoju</div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${(arena.current_level / 5) * 100}%; height: 100%; background: linear-gradient(90deg, #e65100, #f97316);"></div>
                                </div>
                                <div style="font-weight: 700; color: #e65100;">${arena.current_level}/5</div>
                            </div>
                            <div style="font-size: 0.75rem; color: #64748b; margin-top: 5px;">
                                Do następnego poziomu: ${Math.max(0, arena.experience_points || 0)}/${arena.current_level * 1000} EXP
                            </div>
                        </div>
                    </div>
                    
                    <!-- NADCHODZĄCE WYDARZENIA -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            📅 Nadchodzące wydarzenia
                        </h2>
                        
                        <div id="arena-events">
                            ${renderArenaEvents(events)}
                        </div>
                        
                        ${events.length > 0 ? `
                            <div style="text-align: center; margin-top: 20px;">
                                <button onclick="showAllEvents()" 
                                        style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 10px 20px; 
                                               border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                                        onmouseover="this.style.background='#e2e8f0';"
                                        onmouseout="this.style.background='#f1f5f9';">
                                    Pokaż wszystkie wydarzenia
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- STATYSTYKI FREKWENCJI -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            📊 Frekwencja
                        </h2>
                        
                        <div id="attendance-stats">
                            ${renderAttendanceStats(attendanceStats)}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ANALIZA FINANSOWA ARENY -->
            <div style="background: #fff; border-radius: 12px; padding: 25px; margin-top: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                    📈 Analiza finansowa areny
                </h2>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 8px;">ROI (Zwrot z inwestycji)</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #059669;">${calculateROI(ticketRevenue, totalMaintenanceCost, arena.upgrade_cost)}%</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 8px;">Śr. frekwencja</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #3b82f6;">${calculateAverageAttendance(attendanceStats)}%</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 8px;">Marża zysku</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #8b5cf6;">${calculateProfitMargin(ticketRevenue, totalMaintenanceCost)}%</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 8px;">Wartość areny</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">$${calculateArenaValue(arena).toLocaleString()}</div>
                    </div>
                </div>
                
                <div style="margin-top: 25px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 700; color: #0c4a6e; font-size: 0.9rem;">Następne duże ulepszenie</div>
                            <div style="font-size: 0.85rem; color: #64748b;">Rozbudowa areny do ${totalCapacity + 5000} miejsc</div>
                        </div>
                        <div style="font-weight: 900; color: #e65100; font-size: 1.2rem;">$${arena.upgrade_cost.toLocaleString()}</div>
                    </div>
                    <button onclick="upgradeArenaCapacity('${arena.id}')" 
                            style="width: 100%; background: #e65100; color: white; border: none; padding: 12px; border-radius: 8px; margin-top: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='#ea580c'; this.style.transform='translateY(-2px)';"
                            onmouseout="this.style.background='#e65100'; this.style.transform='translateY(0)';"
                            ${team.balance < arena.upgrade_cost ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        🚀 Rozbuduj arenę
                    </button>
                </div>
            </div>
            
            <!-- STOPKA -->
            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 700; color: #1a237e; font-size: 0.9rem;">Sports Arena • ${arena.arena_name}</div>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">Poziom ${arena.current_level} • ${totalCapacity.toLocaleString()} miejsc • Zaktualizowano: ${new Date().toLocaleDateString()}</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="showArenaHistory('${arena.id}')" 
                                style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 10px 20px; 
                                       border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;"
                                onmouseover="this.style.background='#e2e8f0';"
                                onmouseout="this.style.background='#f1f5f9';">
                            📜 Historia areny
                        </button>
                        <button onclick="window.switchTab('m-arena')" 
                                style="background: #1a237e; color: white; border: none; padding: 10px 20px; 
                                       border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;"
                                onmouseover="this.style.background='#283593'; this.style.transform='translateY(-2px)';"
                                onmouseout="this.style.background='#1a237e'; this.style.transform='translateY(0)';">
                            🔄 Odśwież dane
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- MODALE -->
        <div id="modal-season-tickets" style="display: none;"></div>
        <div id="modal-all-events" style="display: none;"></div>
        <div id="modal-arena-history" style="display: none;"></div>
    `;
    
    // Dodaj event listeners
    initArenaEventListeners();
}

/**
 * Renderuje ceny biletów
 */
function renderTicketPricing(ticketPrices, totalCapacity) {
    if (!ticketPrices || ticketPrices.length === 0) {
        return `
            <div style="text-align: center; padding: 30px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🎫</div>
                <p>Brak danych o cenach biletów</p>
            </div>
        `;
    }
    
    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">Sekcja</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">Cena</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">Pojemność</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">Sprzedane</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">Dostępne</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">Mnożnik</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${ticketPrices.map(tp => {
                    const available = tp.max_capacity - (tp.sold_tickets || 0);
                    const percentage = (tp.sold_tickets || 0) / tp.max_capacity * 100;
                    const sectionColors = {
                        'vip': '#8b5cf6',
                        'premium': '#3b82f6',
                        'standard': '#10b981',
                        'standing': '#f59e0b'
                    };
                    
                    return `
                        <tr style="border-bottom: 1px solid #f1f5f9;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <td style="padding: 12px 15px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 12px; height: 12px; background: ${sectionColors[tp.section_type] || '#64748b'}; border-radius: 50%;"></div>
                                    <div style="font-weight: 700; color: #1a237e; text-transform: capitalize;">${tp.section_type}</div>
                                </div>
                            </td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 800; color: #e65100;">$${tp.base_price}</td>
                            <td style="padding: 12px 15px; text-align: center; color: #475569;">${tp.max_capacity.toLocaleString()}</td>
                            <td style="padding: 12px 15px; text-align: center; color: #475569;">${(tp.sold_tickets || 0).toLocaleString()}</td>
                            <td style="padding: 12px 15px; text-align: center;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                                        <div style="width: ${percentage}%; height: 100%; background: ${percentage > 80 ? '#10b981' : percentage > 50 ? '#f59e0b' : '#ef4444'};"></div>
                                    </div>
                                    <div style="font-weight: 600; color: ${percentage > 80 ? '#10b981' : percentage > 50 ? '#f59e0b' : '#ef4444'};">${available.toLocaleString()}</div>
                                </div>
                            </td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: #8b5cf6;">${tp.dynamic_multiplier}x</td>
                            <td style="padding: 12px 15px; text-align: center;">
                                <button onclick="adjustTicketPrice('${tp.id}', '${tp.section_type}')" 
                                        style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 6px 12px; 
                                               border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.75rem; transition: all 0.2s;"
                                        onmouseover="this.style.background='#e2e8f0';"
                                        onmouseout="this.style.background='#f1f5f9';">
                                    Dostosuj
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Renderuje dostępne ulepszenia
 */
function renderAvailableUpgrades(upgrades, arena, teamBalance) {
    if (!upgrades || upgrades.length === 0) {
        return `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🏆</div>
                <p>Brak dostępnych ulepszeń</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">Podnieś poziom areny aby odblokować więcej opcji</p>
            </div>
        `;
    }
    
    return upgrades.map(upgrade => {
        const canAfford = teamBalance >= upgrade.cost;
        const upgradeTypeColors = {
            'capacity': '#3b82f6',
            'facility': '#10b981',
            'atmosphere': '#8b5cf6'
        };
        
        return `
            <div style="background: white; border: 1px solid ${canAfford ? '#e2e8f0' : '#fecaca'}; border-radius: 10px; padding: 20px; transition: all 0.3s;"
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 1.5rem; margin-bottom: 10px;">${upgrade.icon || '🔧'}</div>
                        <div style="font-weight: 800; color: #1a237e; margin-bottom: 5px; font-size: 1rem;">${upgrade.upgrade_name}</div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 8px;">
                            <div style="padding: 2px 8px; background: ${upgradeTypeColors[upgrade.upgrade_type]}; color: white; border-radius: 12px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">
                                ${upgrade.upgrade_type}
                            </div>
                            <div style="font-size: 0.75rem; color: #64748b;">Poziom ${upgrade.level_required}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 900; color: ${canAfford ? '#e65100' : '#ef4444'}; font-size: 1.2rem;">$${upgrade.cost.toLocaleString()}</div>
                        ${upgrade.maintenance_increase > 0 ? `
                            <div style="font-size: 0.75rem; color: #64748b;">+$${upgrade.maintenance_increase}/tydz.</div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="font-size: 0.85rem; color: #475569; line-height: 1.4; margin-bottom: 10px;">${upgrade.description}</div>
                    ${upgrade.effect_description ? `
                        <div style="font-size: 0.8rem; color: #059669; padding: 8px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #10b981;">
                            <strong>Efekt:</strong> ${upgrade.effect_description}
                        </div>
                    ` : ''}
                    ${upgrade.capacity_increase ? `
                        <div style="margin-top: 10px; font-size: 0.8rem; color: #3b82f6; font-weight: 600;">
                            📈 +${upgrade.capacity_increase} miejsc
                        </div>
                    ` : ''}
                </div>
                
                <button onclick="purchaseUpgrade('${upgrade.id}', '${arena.id}')" 
                        style="width: 100%; ${canAfford ? 'background: #1a237e;' : 'background: #94a3b8; cursor: not-allowed;'} 
                               color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; 
                               transition: all 0.2s;"
                        ${!canAfford ? 'disabled' : ''}
                        onmouseover="${canAfford ? 'this.style.background=\'#283593\'; this.style.transform=\'translateY(-2px)\';' : ''}"
                        onmouseout="${canAfford ? 'this.style.background=\'#1a237e\'; this.style.transform=\'translateY(0)\';' : ''}">
                    ${canAfford ? '🏗️ Kup ulepszenie' : '💰 Za mało środków'}
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Renderuje udogodnienia areny
 */
function renderFacilities(facilities) {
    const facilityIcons = {
        'vip_seats': '👑',
        'led_screens': '📺',
        'pyrotechnics': '🎆',
        'sound_system': '🔊',
        'lighting': '💡',
        'merch_store': '🛍️',
        'food_courts': '🍔',
        'parking_spots': '🅿️',
        'training_facilities': '🏋️'
    };
    
    const facilityNames = {
        'vip_seats': 'Miejsca VIP',
        'led_screens': 'Ekrany LED',
        'pyrotechnics': 'Pyrotechnika',
        'sound_system': 'System nagłośnienia',
        'lighting': 'Oświetlenie',
        'merch_store': 'Sklep klubowy',
        'food_courts': 'Gastronomia',
        'parking_spots': 'Parking',
        'training_facilities': 'Centrum treningowe'
    };
    
    return Object.entries(facilities).map(([key, value]) => {
        const isBoolean = typeof value === 'boolean';
        const hasFacility = isBoolean ? value : (value > 0);
        const level = !isBoolean ? value : 1;
        
        return `
            <div style="display: flex; align-items: center; padding: 12px; background: ${hasFacility ? '#f0f9ff' : '#f8fafc'}; 
                        border-radius: 8px; border: 1px solid ${hasFacility ? '#e0f2fe' : '#e2e8f0'};">
                <div style="font-size: 1.5rem; margin-right: 12px; color: ${hasFacility ? '#0369a1' : '#94a3b8'};">${facilityIcons[key] || '🏟️'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: ${hasFacility ? '#1a237e' : '#64748b'}; font-size: 0.85rem;">${facilityNames[key] || key}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">
                        ${isBoolean ? (hasFacility ? 'Dostępne' : 'Niedostępne') : `Poziom ${level}`}
                    </div>
                </div>
                ${hasFacility ? '<div style="color: #10b981; font-weight: 700;">✓</div>' : '<div style="color: #ef4444; font-weight: 700;">✗</div>'}
            </div>
        `;
    }).join('');
}

/**
 * Renderuje wydarzenia areny
 */
function renderArenaEvents(events) {
    if (!events || events.length === 0) {
        return `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📅</div>
                <p>Brak nadchodzących wydarzeń</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">Zaplanuj nowe wydarzenie aby zwiększyć przychody</p>
            </div>
        `;
    }
    
    const now = new Date();
    
    return events.filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate >= now || event.status === 'scheduled';
    }).slice(0, 5).map(event => {
        const eventDate = new Date(event.event_date);
        const isUpcoming = eventDate > now;
        const eventTypeColors = {
            'concert': '#8b5cf6',
            'special': '#f59e0b',
            'other': '#64748b',
            'charity': '#10b981'
        };
        
        return `
            <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9; 
                        ${isUpcoming ? 'background: #f8fafc;' : ''}"
                 onmouseover="this.style.background='#f1f5f9'" 
                 onmouseout="this.style.background='${isUpcoming ? '#f8fafc' : 'white'}'">
                <div style="width: 40px; height: 40px; background: ${eventTypeColors[event.event_type]}; color: white; 
                            border-radius: 8px; display: flex; align-items: center; justify-content: center; 
                            font-weight: 700; font-size: 0.9rem; margin-right: 12px;">
                    ${event.event_type === 'concert' ? '🎵' : 
                      event.event_type === 'special' ? '⭐' : 
                      event.event_type === 'charity' ? '❤️' : '📅'}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1a237e; font-size: 0.9rem; margin-bottom: 2px;">${event.event_name}</div>
                    <div style="display: flex; gap: 8px; font-size: 0.75rem; color: #64748b;">
                        <span>${eventDate.toLocaleDateString('pl-PL')}</span>
                        <span>•</span>
                        <span style="text-transform: capitalize;">${event.event_type}</span>
                        ${event.expected_attendance ? `
                            <span>•</span>
                            <span>👥 ${event.expected_attendance.toLocaleString()}</span>
                        ` : ''}
                    </div>
                </div>
                ${event.ticket_price ? `
                    <div style="text-align: right;">
                        <div style="font-weight: 700; color: #e65100;">$${event.ticket_price}</div>
                        <div style="font-size: 0.7rem; color: #64748b;">bilety</div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Renderuje statystyki frekwencji
 */
function renderAttendanceStats(attendanceStats) {
    if (!attendanceStats || attendanceStats.length === 0) {
        return `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                <p>Brak danych o frekwencji</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">Statystyki pojawią się po rozegraniu meczów</p>
            </div>
        `;
    }
    
    // Oblicz średnią frekwencję
    const avgAttendance = attendanceStats.reduce((sum, stat) => sum + stat.capacity_percentage, 0) / attendanceStats.length;
    const highest = Math.max(...attendanceStats.map(s => s.capacity_percentage));
    const lowest = Math.min(...attendanceStats.map(s => s.capacity_percentage));
    
    return `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div>
                    <div style="font-weight: 700; color: #1a237e; font-size: 0.9rem;">Średnia frekwencja</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: ${avgAttendance > 80 ? '#10b981' : avgAttendance > 60 ? '#f59e0b' : '#ef4444'};">${avgAttendance.toFixed(1)}%</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: #64748b;">Najwyższa: <span style="color: #10b981; font-weight: 600;">${highest.toFixed(1)}%</span></div>
                    <div style="font-size: 0.8rem; color: #64748b;">Najniższa: <span style="color: #ef4444; font-weight: 600;">${lowest.toFixed(1)}%</span></div>
                </div>
            </div>
            
            <div style="display: flex; align-items: flex-end; height: 100px; gap: 8px; margin-top: 20px;">
                ${attendanceStats.slice(0, 8).map(stat => {
                    const height = (stat.capacity_percentage / 100) * 80;
                    return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                            <div style="width: 100%; height: ${height}px; background: ${stat.capacity_percentage > 80 ? '#10b981' : stat.capacity_percentage > 60 ? '#f59e0b' : '#ef4444'}; 
                                    border-radius: 4px 4px 0 0; position: relative; transition: all 0.3s;"
                                 onmouseover="this.style.opacity='0.8'">
                                <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); 
                                            font-size: 0.7rem; font-weight: 700; color: #1a237e; white-space: nowrap;">
                                    ${stat.capacity_percentage.toFixed(0)}%
                                </div>
                            </div>
                            <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Tydz. ${stat.game_week}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Funkcje pomocnicze do obliczeń
 */
function calculateROI(revenue, maintenanceCost, upgradeCost) {
    if (upgradeCost <= 0) return 0;
    const weeklyProfit = revenue - maintenanceCost;
    const roi = (weeklyProfit * 52 / upgradeCost) * 100; // ROI roczny
    return Math.min(roi, 500).toFixed(1); // Ogranicz do 500% dla czytelności
}

function calculateAverageAttendance(stats) {
    if (!stats || stats.length === 0) return 0;
    const sum = stats.reduce((total, stat) => total + stat.capacity_percentage, 0);
    return (sum / stats.length).toFixed(1);
}

function calculateProfitMargin(revenue, costs) {
    if (revenue <= 0) return 0;
    const margin = ((revenue - costs) / revenue) * 100;
    return Math.max(margin, 0).toFixed(1);
}

function calculateArenaValue(arena) {
    const baseValue = 1000000;
    const capacityValue = arena.capacity * 500;
    const levelValue = arena.current_level * 250000;
    const facilityValue = arena.facilities ? Object.values(typeof arena.facilities === 'string' ? JSON.parse(arena.facilities) : arena.facilities)
        .filter(v => v === true || v > 0).length * 50000 : 0;
    
    return baseValue + capacityValue + levelValue + facilityValue;
}

/**
 * Inicjalizuje event listeners
 */
function initArenaEventListeners() {
    console.log("[ARENA] Inicjalizacja event listeners");
}

/**
 * Globalne funkcje dla akcji użytkownika
 */
window.showSeasonTicketsModal = function() {
    alert("Modal z abonamentami sezonowymi - w budowie!");
};

window.showAllEvents = function() {
    alert("Lista wszystkich wydarzeń - w budowie!");
};

window.showArenaHistory = function(arenaId) {
    alert(`Historia areny ${arenaId} - w budowie!`);
};

window.adjustTicketPrice = function(ticketPriceId, sectionType) {
    const newPrice = prompt(`Dostosuj cenę dla sekcji ${sectionType.toUpperCase()}:`, "40");
    if (newPrice && !isNaN(newPrice)) {
        const price = parseFloat(newPrice);
        if (price >= 5 && price <= 500) {
            alert(`Cena dla ${sectionType} zmieniona na $${price}!`);
            // Tutaj dodaj logikę aktualizacji w bazie danych
        } else {
            alert("Cena musi być w zakresie $5 - $500");
        }
    }
};

window.purchaseUpgrade = async function(upgradeId, arenaId) {
    if (confirm("Czy na pewno chcesz kupić to ulepszenie?\nKoszt zostanie odjęty z budżetu drużyny.")) {
        alert("Ulepszenie zakupione pomyślnie!");
        // Tutaj dodaj logikę zakupu i aktualizacji bazy danych
    }
};

window.upgradeArenaCapacity = async function(arenaId) {
    if (confirm("Rozbudowa areny zajmie 4 tygodnie i kosztuje znaczną kwotę.\nCzy chcesz kontynuować?")) {
        alert("Rozpoczęto rozbudowę areny! Ukończenie za 4 tygodnie.");
        // Tutaj dodaj logikę rozbudowy areny
    }
};
