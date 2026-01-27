// js/app/staff_view.js
import { supabaseClient } from '../auth.js';

let currentStaff = [];
let availableStaff = [];
let currentTeam = null;

/**
 * Renderuje widok personelu
 */
export async function renderStaffView(team, players) {
    currentTeam = team;
    const container = document.getElementById('m-staff');
    if (!container) return;

    // Pobierz aktualny personel drużyny
    await fetchTeamStaff(team.id);

    container.innerHTML = `
        <div class="view-header">
            <h1>👥 Personel Drużyny</h1>
            <p>Zarządzaj personelem: trenerami, fizjoterapeutami i dyrektorami sportowymi.</p>
        </div>

        <div class="staff-dashboard">
            <!-- Statystyki personelu -->
            <div class="staff-stats">
                <div class="stat-card">
                    <div class="stat-value">${currentStaff.filter(s => s.role === 'Trener').length}</div>
                    <div class="stat-label">Trenerzy</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentStaff.filter(s => s.role === 'Fizjoterapeuta').length}</div>
                    <div class="stat-label">Fizjoterapeuci</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentStaff.filter(s => s.role === 'Dyrektor sportowy').length}</div>
                    <div class="stat-label">Dyrektorzy sportowi</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${calculateTotalSalary()} $</div>
                    <div class="stat-label">Koszt tygodniowy</div>
                </div>
            </div>

            <!-- Aktualny personel -->
            <div class="current-staff-section">
                <div class="section-header">
                    <h2>Twój Personel</h2>
                    <div class="section-actions">
                        <button id="open-market-btn" class="btn btn-primary">
                            <span class="btn-icon">🛒</span> Rynek Transferowy
                        </button>
                    </div>
                </div>
                
                <div class="staff-roles">
                    <!-- Trenerzy -->
                    <div class="role-section">
                        <h3 class="role-title">🏀 Trenerzy <span class="badge">${currentStaff.filter(s => s.role === 'Trener').length}</span></h3>
                        <div id="coaches-list" class="staff-grid">
                            <!-- Dynamicznie wypełniane -->
                        </div>
                    </div>
                    
                    <!-- Fizjoterapeuci -->
                    <div class="role-section">
                        <h3 class="role-title">💊 Fizjoterapeuci <span class="badge">${currentStaff.filter(s => s.role === 'Fizjoterapeuta').length}</span></h3>
                        <div id="physios-list" class="staff-grid">
                            <!-- Dynamicznie wypełniane -->
                        </div>
                    </div>
                    
                    <!-- Dyrektorzy sportowi -->
                    <div class="role-section">
                        <h3 class="role-title">📊 Dyrektorzy Sportowi <span class="badge">${currentStaff.filter(s => s.role === 'Dyrektor sportowy').length}</span></h3>
                        <div id="directors-list" class="staff-grid">
                            <!-- Dynamicznie wypełniane -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal rynku transferowego -->
        <div id="staff-market-modal" class="modal">
            <div class="modal-content wide-modal">
                <div class="modal-header">
                    <h2>🛒 Rynek Transferowy Personelu</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <!-- Filtry -->
                    <div class="market-filters">
                        <div class="filter-group">
                            <label for="filter-role">Rola:</label>
                            <select id="filter-role" class="form-select">
                                <option value="">Wszyscy</option>
                                <option value="Trener">Trener</option>
                                <option value="Fizjoterapeuta">Fizjoterapeuta</option>
                                <option value="Dyrektor sportowy">Dyrektor sportowy</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="filter-level">Poziom:</label>
                            <select id="filter-level" class="form-select">
                                <option value="">Wszystkie</option>
                                <option value="1">⭐</option>
                                <option value="2">⭐⭐</option>
                                <option value="3">⭐⭐⭐</option>
                                <option value="4">⭐⭐⭐⭐</option>
                                <option value="5">⭐⭐⭐⭐⭐</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="filter-nationality">Narodowość:</label>
                            <select id="filter-nationality" class="form-select">
                                <option value="">Wszystkie</option>
                                <!-- Dynamicznie wypełniane -->
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="filter-salary">Maks. pensja:</label>
                            <input type="number" id="filter-salary" class="form-input" placeholder="np. 10000" min="0">
                        </div>
                        <button id="apply-filters" class="btn btn-secondary">
                            <span class="btn-icon">🔍</span> Filtruj
                        </button>
                    </div>

                    <!-- Lista dostępnego personelu -->
                    <div class="market-list-header">
                        <h3>Dostępny Personel</h3>
                        <div class="team-finances">
                            <span class="budget-label">Budżet drużyny:</span>
                            <span class="budget-value">$${currentTeam?.budget || 0}</span>
                        </div>
                    </div>
                    <div id="market-staff-list" class="market-staff-grid">
                        <!-- Dynamicznie wypełniane -->
                    </div>

                    <!-- Informacje o efektach -->
                    <div class="staff-effects-info">
                        <h4>📈 Efekty Personelu:</h4>
                        <div class="effects-grid">
                            <div class="effect-item">
                                <strong>Trenerzy:</strong> Zwiększają rozwój umiejętności zawodników (+5% do +25% w zależności od poziomu)
                            </div>
                            <div class="effect-item">
                                <strong>Fizjoterapeuci:</strong> Zmniejszają ryzyko kontuzji (-5% do -25%) i skracają czas rekonwalescencji
                            </div>
                            <div class="effect-item">
                                <strong>Dyrektorzy sportowi:</strong> Zwiększają atrakcyjność transferową (-5% do -25% na koszty transferów)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Renderuj aktualny personel
    renderCurrentStaff();

    // Inicjalizacja modalu
    initMarketModal();

    // Dodaj event listener do przycisku
    const openMarketBtn = document.getElementById('open-market-btn');
    if (openMarketBtn) {
        openMarketBtn.addEventListener('click', () => {
            openMarketModal();
        });
    }
}

/**
 * Pobiera personel drużyny
 */
async function fetchTeamStaff(teamId) {
    try {
        const { data, error } = await supabaseClient
            .from('staff')
            .select('*')
            .eq('team_id', teamId)
            .order('role', { ascending: true })
            .order('level', { ascending: false });

        if (error) throw error;
        currentStaff = data || [];
        console.log(`Pobrano ${currentStaff.length} członków personelu`);
    } catch (err) {
        console.error("[STAFF] Błąd pobierania personelu:", err);
        currentStaff = [];
    }
}

/**
 * Renderuje listę aktualnego personelu
 */
function renderCurrentStaff() {
    const coachesList = document.getElementById('coaches-list');
    const physiosList = document.getElementById('physios-list');
    const directorsList = document.getElementById('directors-list');

    const coaches = currentStaff.filter(s => s.role === 'Trener');
    const physios = currentStaff.filter(s => s.role === 'Fizjoterapeuta');
    const directors = currentStaff.filter(s => s.role === 'Dyrektor sportowy');

    // Renderuj trenerów
    coachesList.innerHTML = coaches.length > 0 ? coaches.map(staff => renderStaffCard(staff, true)).join('') : 
        '<div class="empty-state">Brak trenerów w drużynie</div>';

    // Renderuj fizjoterapeutów
    physiosList.innerHTML = physios.length > 0 ? physios.map(staff => renderStaffCard(staff, true)).join('') : 
        '<div class="empty-state">Brak fizjoterapeutów w drużynie</div>';

    // Renderuj dyrektorów sportowych
    directorsList.innerHTML = directors.length > 0 ? directors.map(staff => renderStaffCard(staff, true)).join('') : 
        '<div class="empty-state">Brak dyrektorów sportowych w drużynie</div>';
}

/**
 * Renderuje kartę personelu
 */
function renderStaffCard(staff, isCurrent = false) {
    const levelStars = '⭐'.repeat(staff.level);
    const contractInfo = staff.contract_weeks ? 
        `<div class="staff-contract">Kontrakt: ${staff.contract_weeks} tygodni</div>` : '';
    
    // Upewnij się, że ID jest prawidłowo przekazane jako string
    const staffId = staff.id || '';
    const hireCost = staff.hire_cost || 0;
    const releaseCost = staff.release_cost || staff.salary * 2;

    return `
        <div class="staff-card ${isCurrent ? 'current-staff' : 'available-staff'}" data-id="${staffId}">
            <div class="staff-card-header">
                <div class="staff-name">
                    <strong>${staff.first_name} ${staff.last_name}</strong>
                    <span class="staff-nationality">${getFlagEmoji(staff.nationality)}</span>
                </div>
                <div class="staff-level">${levelStars}</div>
            </div>
            
            <div class="staff-card-details">
                <div class="staff-speciality">${staff.speciality || 'Specjalista'}</div>
                <div class="staff-experience">Doświadczenie: ${staff.experience_years || 0} lat</div>
                ${contractInfo}
            </div>
            
            <div class="staff-card-footer">
                <div class="staff-salary">$${staff.salary}/tydzień</div>
                ${isCurrent ? 
                    `<button class="btn btn-small btn-danger release-staff-btn" data-id="${staffId}" data-cost="${releaseCost}" data-name="${staff.first_name} ${staff.last_name}">
                        Zwolnij ($${releaseCost})
                    </button>` :
                    `<button class="btn btn-small btn-success hire-staff-btn" data-id="${staffId}" data-cost="${hireCost}" data-name="${staff.first_name} ${staff.last_name}">
                        Zatrudnij ($${hireCost})
                    </button>`
                }
            </div>
        </div>
    `;
}

/**
 * Inicjalizuje modal rynku transferowego
 */
function initMarketModal() {
    const modal = document.getElementById('staff-market-modal');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Wypełnij narodowości
    const nationalitySelect = document.getElementById('filter-nationality');
    if (nationalitySelect) {
        const nationalities = [
            'Polska', 'Niemcy', 'Francja', 'Hiszpania', 'Włochy', 
            'USA', 'Rosja', 'Turcja', 'Litwa', 'Grecja'
        ];
        
        nationalities.forEach(nat => {
            const option = document.createElement('option');
            option.value = nat;
            option.textContent = `${getFlagEmoji(nat)} ${nat}`;
            nationalitySelect.appendChild(option);
        });
    }

    // Event listener dla filtrów
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            loadMarketStaff();
        });
    }
}

/**
 * Otwiera modal rynku transferowego
 */
async function openMarketModal() {
    const modal = document.getElementById('staff-market-modal');
    if (modal) {
        modal.style.display = 'block';
        await loadMarketStaff();
    }
}

/**
 * Ładuje dostępny personel z filtrami
 */
async function loadMarketStaff() {
    try {
        const roleFilter = document.getElementById('filter-role')?.value || '';
        const levelFilter = document.getElementById('filter-level')?.value || '';
        const nationalityFilter = document.getElementById('filter-nationality')?.value || '';
        const salaryFilter = document.getElementById('filter-salary')?.value || '';

        let query = supabaseClient
            .from('staff')
            .select('*')
            .is('team_id', null);

        if (roleFilter) query = query.eq('role', roleFilter);
        if (levelFilter) query = query.eq('level', parseInt(levelFilter));
        if (nationalityFilter) query = query.eq('nationality', nationalityFilter);
        if (salaryFilter && !isNaN(salaryFilter) && salaryFilter > 0) {
            query = query.lte('salary', parseInt(salaryFilter));
        }

        const { data, error } = await query;
        if (error) throw error;

        availableStaff = data || [];
        renderMarketStaff();
        
        // Dodaj event listenery do przycisków po renderowaniu
        setTimeout(() => {
            attachStaffButtonListeners();
        }, 100);
    } catch (err) {
        console.error("[STAFF] Błąd pobierania rynku:", err);
        alert('Błąd podczas ładowania rynku transferowego');
    }
}

/**
 * Renderuje listę dostępnego personelu
 */
function renderMarketStaff() {
    const container = document.getElementById('market-staff-list');
    if (!container) return;

    if (availableStaff.length === 0) {
        container.innerHTML = '<div class="empty-state">Brak dostępnego personelu dla wybranych filtrów</div>';
        return;
    }

    container.innerHTML = availableStaff.map(staff => renderStaffCard(staff, false)).join('');
    
    // Dodaj event listenery po renderowaniu
    attachStaffButtonListeners();
}

/**
 * Dodaje event listenery do przycisków zatrudniania/zwalniania
 */
function attachStaffButtonListeners() {
    // Przyciski zatrudniania w modalu
    document.querySelectorAll('.hire-staff-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const staffId = e.target.getAttribute('data-id');
            const hireCost = parseInt(e.target.getAttribute('data-cost'));
            const staffName = e.target.getAttribute('data-name');
            
            if (staffId) {
                await hireStaff(staffId, hireCost, staffName);
            }
        });
    });
    
    // Przyciski zwalniania w aktualnym personelu
    document.querySelectorAll('.release-staff-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const staffId = e.target.getAttribute('data-id');
            const releaseCost = parseInt(e.target.getAttribute('data-cost'));
            const staffName = e.target.getAttribute('data-name');
            
            if (staffId) {
                await releaseStaff(staffId, releaseCost, staffName);
            }
        });
    });
}

/**
 * Zatrudnia personel
 */
async function hireStaff(staffId, hireCost, staffName) {
    if (!currentTeam) {
        alert('Brak danych drużyny');
        return;
    }

    if (currentTeam.budget < hireCost) {
        alert(`Nie masz wystarczających środków na zatrudnienie!\nWymagane: $${hireCost}\nPosiadasz: $${currentTeam.budget}`);
        return;
    }

    if (!confirm(`Zatrudnić ${staffName} za $${hireCost}?`)) return;

    try {
        // Pobierz aktualny budżet drużyny
        const { data: teamData, error: teamError } = await supabaseClient
            .from('teams')
            .select('budget')
            .eq('id', currentTeam.id)
            .single();
            
        if (teamError) throw teamError;
        
        const newBudget = teamData.budget - hireCost;
        
        const [updateRes, budgetRes] = await Promise.all([
            supabaseClient
                .from('staff')
                .update({ 
                    team_id: currentTeam.id,
                    contract_weeks: 52,
                    updated_at: new Date().toISOString()
                })
                .eq('id', staffId),
            supabaseClient
                .from('teams')
                .update({ 
                    budget: newBudget,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentTeam.id)
        ]);

        if (updateRes.error) throw updateRes.error;
        if (budgetRes.error) throw budgetRes.error;

        // Aktualizuj stan gry
        currentTeam.budget = newBudget;
        
        alert(`${staffName} zatrudniony pomyślnie!`);
        
        // Odśwież widoki
        await fetchTeamStaff(currentTeam.id);
        renderCurrentStaff();
        await loadMarketStaff();
        
        // Odśwież statystyki budżetu
        const budgetElement = document.querySelector('.budget-value');
        if (budgetElement) {
            budgetElement.textContent = `$${currentTeam.budget}`;
        }
        
        // Dodaj event listenery do nowych przycisków
        setTimeout(() => {
            attachStaffButtonListeners();
        }, 100);
        
    } catch (err) {
        console.error("[STAFF] Błąd zatrudniania:", err);
        alert('Błąd podczas zatrudniania personelu');
    }
}

/**
 * Zwolnienie personelu
 */
async function releaseStaff(staffId, releaseCost, staffName) {
    if (!currentTeam) {
        alert('Brak danych drużyny');
        return;
    }

    if (currentTeam.budget < releaseCost) {
        alert(`Nie masz wystarczających środków na zwolnienie!\nWymagane: $${releaseCost}\nPosiadasz: $${currentTeam.budget}`);
        return;
    }

    if (!confirm(`Zwolnić ${staffName}?\nKoszt zwolnienia: $${releaseCost}`)) return;

    try {
        // Pobierz aktualny budżet drużyny
        const { data: teamData, error: teamError } = await supabaseClient
            .from('teams')
            .select('budget')
            .eq('id', currentTeam.id)
            .single();
            
        if (teamError) throw teamError;
        
        const newBudget = teamData.budget - releaseCost;
        
        const [updateRes, budgetRes] = await Promise.all([
            supabaseClient
                .from('staff')
                .update({ 
                    team_id: null,
                    contract_weeks: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', staffId),
            supabaseClient
                .from('teams')
                .update({ 
                    budget: newBudget,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentTeam.id)
        ]);

        if (updateRes.error) throw updateRes.error;
        if (budgetRes.error) throw budgetRes.error;

        // Aktualizuj stan gry
        currentTeam.budget = newBudget;
        alert(`${staffName} zwolniony pomyślnie`);
        
        await fetchTeamStaff(currentTeam.id);
        renderCurrentStaff();
        
        // Odśwież statystyki budżetu
        const budgetElement = document.querySelector('.budget-value');
        if (budgetElement) {
            budgetElement.textContent = `$${currentTeam.budget}`;
        }
        
        // Dodaj event listenery do nowych przycisków
        setTimeout(() => {
            attachStaffButtonListeners();
        }, 100);
        
    } catch (err) {
        console.error("[STAFF] Błąd zwalniania:", err);
        alert('Błąd podczas zwalniania personelu');
    }
}

/**
 * Pomocnicza funkcja do emoji flag
 */
function getFlagEmoji(country) {
    const flagEmojis = {
        'Polska': '🇵🇱',
        'Niemcy': '🇩🇪',
        'Francja': '🇫🇷',
        'Hiszpania': '🇪🇸',
        'Włochy': '🇮🇹',
        'USA': '🇺🇸',
        'Rosja': '🇷🇺',
        'Turcja': '🇹🇷',
        'Litwa': '🇱🇹',
        'Grecja': '🇬🇷'
    };
    return flagEmojis[country] || '🏳️';
}

/**
 * Oblicza całkowity koszt pensji
 */
function calculateTotalSalary() {
    return currentStaff.reduce((sum, staff) => sum + (staff.salary || 0), 0);
}

// Eksport funkcji dla przycisków w HTML (jeśli nadal potrzebne)
window.hireStaff = async function(staffId) {
    const staff = availableStaff.find(s => s.id === staffId);
    if (!staff) {
        alert('Nie znaleziono personelu');
        return;
    }
    await hireStaff(staffId, staff.hire_cost, `${staff.first_name} ${staff.last_name}`);
};

window.releaseStaff = async function(staffId) {
    const staff = currentStaff.find(s => s.id === staffId);
    if (!staff) {
        alert('Nie znaleziono personelu');
        return;
    }
    const releaseCost = staff.release_cost || staff.salary * 2;
    await releaseStaff(staffId, releaseCost, `${staff.first_name} ${staff.last_name}`);
};
