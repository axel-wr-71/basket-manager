// js/admin.js

export function initAdminPanel() {
    console.log('[ADMIN] Initializing admin panel...');
    
    // Sprawdź czy użytkownik ma uprawnienia admina
    const currentUser = JSON.parse(localStorage.getItem('supabase.auth.token'))?.currentSession?.user;
    const userEmail = currentUser?.email;
    
    // Lista adminów (tutaj możesz dodać swoje emaile)
    const adminEmails = [
        'strubbe23@gmai.com',
        
    ];
    
    if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
        console.log('[ADMIN] User is admin:', userEmail);
        addAdminTab();
        setupAdminPanel();
    } else {
        console.log('[ADMIN] User is NOT admin:', userEmail);
        // Ukryj panel admina jeśli użytkownik nie jest adminem
        const adminTab = document.getElementById('tab-m-admin');
        if (adminTab) {
            adminTab.style.display = 'none';
        }
    }
}

function addAdminTab() {
    // Dodaj zakładkę Admin do nawigacji
    const navContainer = document.getElementById('main-nav-container');
    if (!navContainer) return;
    
    // Sprawdź czy zakładka już istnieje
    if (!document.getElementById('tab-m-admin')) {
        const adminTab = document.createElement('button');
        adminTab.className = 'btn-tab';
        adminTab.id = 'tab-m-admin';
        adminTab.innerHTML = '🔧 Admin';
        adminTab.onclick = () => window.switchTab('m-admin');
        
        // Wstaw przed przyciskiem wylogowania lub na końcu
        navContainer.appendChild(adminTab);
    }
}

function setupAdminPanel() {
    // Funkcja do ładowania zawartości panelu admina
    const adminContent = document.getElementById('admin-stats');
    if (!adminContent) return;
    
    // Pobierz dane użytkowników itp.
    loadAdminData();
}

async function loadAdminData() {
    try {
        const adminContent = document.getElementById('admin-stats');
        if (!adminContent) return;
        
        // Symulacja danych (w prawdziwej aplikacji pobierasz z API)
        const adminData = {
            totalUsers: 1250,
            totalTeams: 980,
            totalTransactions: 5432
        };
        
        displayAdminData(adminData);
    } catch (error) {
        console.error('[ADMIN] Error loading data:', error);
        document.getElementById('admin-stats').innerHTML = `
            <p style="color: #f44336;">Błąd ładowania danych administracyjnych</p>
            <p>${error.message}</p>
        `;
    }
}

function displayAdminData(data) {
    const adminContent = document.getElementById('admin-stats');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
            <div class="stat-card" style="background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h3>👥 Użytkownicy</h3>
                <p style="font-size: 2rem; font-weight: bold; color: #1a237e;">${data?.totalUsers || 0}</p>
            </div>
            <div class="stat-card" style="background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h3>🏀 Drużyny</h3>
                <p style="font-size: 2rem; font-weight: bold; color: #e65100;">${data?.totalTeams || 0}</p>
            </div>
            <div class="stat-card" style="background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h3>💰 Transakcje</h3>
                <p style="font-size: 2rem; font-weight: bold; color: #4caf50;">${data?.totalTransactions || 0}</p>
            </div>
        </div>
        
        <div style="margin-top: 30px;">
            <h3>📋 Akcje administracyjne</h3>
            <button onclick="adminAction('reset')" style="background: #f44336; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px; cursor: pointer;">
                Resetuj dane testowe
            </button>
            <button onclick="adminAction('backup')" style="background: #2196f3; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px; cursor: pointer;">
                Utwórz backup
            </button>
            <button onclick="adminAction('users')" style="background: #4caf50; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px; cursor: pointer;">
                Zarządzaj użytkownikami
            </button>
        </div>
    `;
}

// Funkcje globalne
window.adminAction = function(action) {
    alert(`Akcja administracyjna: ${action}\nTa funkcja wymaga implementacji backendu.`);
};
