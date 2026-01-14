// js/ui.js

const UI = {
    // Definicja zakładek dla Managera
    managerTabs: [
        { id: 'm-roster', label: 'ZAWODNICY', icon: '🏀' },
        { id: 'm-schedule', label: 'TERMINARZ', icon: '📅' },
        { id: 'm-draft', label: 'DRAFT', icon: '📝' },
        { id: 'm-finances', label: 'FINANSE', icon: '💰' },
        { id: 'm-training', label: 'TRENING', icon: '👟' }
    ],

    // Definicja zakładek dla Admina
    adminTabs: [
        { id: 'tab-gen', label: 'GENEROWANIE', icon: '⚙️' },
        { id: 'tab-media', label: 'MEDIA', icon: '📻' },
        { id: 'tab-players', label: 'BAZA GRACZY', icon: '📊' }
    ],

    renderNav(role) {
        const nav = document.getElementById('nav-container');
        const tabs = role === 'admin' ? this.adminTabs : this.managerTabs;
        
        nav.innerHTML = tabs.map(tab => `
            <button class="btn" data-target="${tab.id}" onclick="UI.switchTab('${tab.id}')">
                ${tab.icon} ${tab.label}
            </button>
        `).join('');
    },

    switchTab(tabId) {
        const container = document.getElementById('content-container');
        
        // Logika ładowania odpowiedniego widoku
        switch(tabId) {
            case 'm-roster':
                renderManagerRoster(container); // Funkcja z manager.js
                break;
            case 'm-finances':
                renderManagerFinances(container); // Funkcja z manager.js
                break;
            case 'tab-gen':
                container.innerHTML = `<h3>Panel Admina</h3><button onclick="generateWorld()">Generuj</button>`;
                break;
            // Dodaj resztę przypadków...
            default:
                container.innerHTML = `<h3>Sekcja ${tabId} w budowie...</h3>`;
        }
    }
};
