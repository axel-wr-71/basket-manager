// W miejscu gdzie wywoływany jest panel admina (np. przycisk w menu)
async function openAdminPanel() {
    console.log("[MAIN] Próba otwarcia panelu admina...");
    
    // Najpierw sprawdź czy sesja admina jest wciąż ważna
    if (isAdminSessionValid()) {
        console.log("[MAIN] Sesja admina ważna, pomijam weryfikację...");
        // Bezpośrednie renderowanie panelu
        const { renderAdminPanel } = await import('./admin_panel.js');
        await renderAdminPanel(null); // null ponieważ admin nie ma team_id
    } else {
        // Resetuj sesję i wymagaj pełnej weryfikacji
        resetAdminSession();
        
        // Importuj i wywołaj renderAdminPanel (który teraz sprawdzi uprawnienia)
        const { renderAdminPanel } = await import('./admin_panel.js');
        const panel = await renderAdminPanel(null);
        
        if (!panel) {
            console.log("[MAIN] Dostęp do panelu admina odrzucony");
        }
    }
}

// Przykład przycisku w UI
document.getElementById('admin-panel-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await openAdminPanel();
});
