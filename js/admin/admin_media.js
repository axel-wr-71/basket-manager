// js/admin/admin_media.js

export async function renderMediaSettings() {
    const container = document.getElementById('admin-media-manager-container');
    if (!container) return;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h4>Grafiki Główne</h4>
                <label style="display:block; margin-bottom:5px;">URL Tła (Landing Page):</label>
                <input type="text" id="media-bg-url" style="width:100%; padding:8px; margin-bottom:15px;" placeholder="https://...">
                
                <label style="display:block; margin-bottom:5px;">URL Logo Gry:</label>
                <input type="text" id="media-logo-url" style="width:100%; padding:8px; margin-bottom:15px;" placeholder="https://...">
                
                <button class="btn" onclick="handleSaveMedia()" style="width:100%; background: #2e7d32; color:white;">Zapisz Główne</button>
            </div>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h4>Galeria Screenów (Strona Główna)</h4>
                <input type="text" id="media-gal-1" style="width:100%; padding:8px; margin-bottom:10px;" placeholder="URL Zdjęcia 1">
                <input type="text" id="media-gal-2" style="width:100%; padding:8px; margin-bottom:10px;" placeholder="URL Zdjęcia 2">
                <input type="text" id="media-gal-3" style="width:100%; padding:8px; margin-bottom:15px;" placeholder="URL Zdjęcia 3">
                
                <button class="btn" onclick="handleSaveGallery()" style="width:100%; background: #2e7d32; color:white;">Zapisz Galerię</button>
            </div>
        </div>
    `;
}

// Funkcje pomocnicze przypisane do window, aby działały z onclick w HTML
window.handleSaveMedia = () => {
    const bg = document.getElementById('media-bg-url').value;
    const logo = document.getElementById('media-logo-url').value;
    console.log("Zapisywanie mediów:", { bg, logo });
    alert("Zapisano media główne (sprawdź konsolę)");
};

window.handleSaveGallery = () => {
    const g1 = document.getElementById('media-gal-1').value;
    const g2 = document.getElementById('media-gal-2').value;
    const g3 = document.getElementById('media-gal-3').value;
    console.log("Zapisywanie galerii:", [g1, g2, g3]);
    alert("Zapisano galerię (sprawdź konsolę)");
};
