// ==========================================
// TAB LOGIC MANAJEMEN ASESMEN
// ==========================================

function switchAsesmenTab(tabId, btnElement) {
    var tabs = document.querySelectorAll('.asesmen-tab');
    tabs.forEach(function(t) {
        t.classList.remove('active');
        t.style.borderBottomColor = 'transparent';
        t.style.color = 'var(--text-light)';
    });
    
    if(btnElement) {
        btnElement.classList.add('active');
        btnElement.style.borderBottomColor = 'var(--primary-color)';
        btnElement.style.color = 'var(--primary-color)';
    }

    var contentArea = document.getElementById('asesmenTabContentArea');
    if(!contentArea) return;

    // 2. Hide all related sections and move them to contentArea if not already
    var sections = ['sectionDaftarUjianAktif', 'sectionArsipAsesmen', 'sectionBankSoal', 'sectionSampahAsesmen'];
    sections.forEach(function(id) {
        var el = document.getElementById(id);
        if(el) {
            el.style.display = 'none';
            // hilangkan dash-section style agar tidak ada margin/padding ganda
            el.classList.remove('dash-section'); 
        }
    });

    // 3. Tampilkan section sesuai tab
    var activeEl = null;
    if(tabId === 'aktif') {
        activeEl = document.getElementById('sectionDaftarUjianAktif');
        if(typeof loadAsesmenList === 'function') loadAsesmenList();
    }
    if(tabId === 'riwayat') {
        activeEl = document.getElementById('sectionArsipAsesmen');
        if(typeof loadArsipAsesmen === 'function') loadArsipAsesmen();
    }
    if(tabId === 'referensi') {
        activeEl = document.getElementById('sectionBankSoal');
        if(typeof loadBankSoal === 'function') loadBankSoal();
    }
    if(tabId === 'sampah') {
        activeEl = document.getElementById('sectionSampahAsesmen');
        if(typeof loadSampahAsesmen === 'function') loadSampahAsesmen();
    }

    if(activeEl) {
        activeEl.style.display = 'block';
        contentArea.appendChild(activeEl);
    }
}

// Intercept showSection if it's Manajemen Asesmen to trigger the first tab
var originalShowSection = window.showSection;
window.showSection = function(sectionId, element) {
    if (originalShowSection) {
        originalShowSection(sectionId, element);
    }
    
    if (sectionId === 'sectionManajemenAsesmen') {
        var firstTab = document.querySelector('.asesmen-tab');
        if (firstTab) {
            switchAsesmenTab('aktif', firstTab);
        }
    }
    
    // Khusus Buat Soal (sebagai Wizard), sembunyikan header bawaannya jika perlu
    if (sectionId === 'sectionBuatSoal') {
        var el = document.getElementById('sectionBuatSoal');
        if (el) el.classList.add('dash-section'); // kembalikan classnya
    }
};
