/**
 * js/app/media_view.js
 * STATUS: PLACEHOLDER (Do dostosowania na końcu projektu)
 * Zgodnie z wytycznymi: Sekcja media jako osobny komponent.
 */

export function renderMediaView(team, players) {
    const container = document.getElementById('media-view-container');
    
    // Zabezpieczenie przed brakiem kontenera w index.html
    if (!container) {
        console.warn("[MEDIA] Kontener media-view-container nie został znaleziony.");
        return;
    }

    // Prosty szkielet, który nie obciąża systemu i pozwala aplikacji działać
    container.innerHTML = `
        <div style="padding: 40px; text-align: center; font-family: system-ui;">
            <div style="font-size: 3rem; margin-bottom: 20px;">📰</div>
            <h2 style="color: #1a237e; font-weight: 900; text-transform: uppercase;">Moduł Media</h2>
            <p style="color: #64748b; max-width: 500px; margin: 0 auto; line-height: 1.6;">
                Ten moduł jest zarezerwowany dla sekcji mediów, bazy zawodników i struktur lig. 
                Zostanie dostosowany w późniejszym etapie prac.
            </p>
            <div style="margin-top: 30px; display: inline-block; padding: 10px 20px; background: #f1f5f9; border-radius: 8px; color: #475569; font-size: 0.8rem; font-weight: 600;">
                Status: Oczekiwanie na implementację końcową
            </div>
        </div>
    `;
}
