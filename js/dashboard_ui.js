//       D A S H B O A R D   F U N C T I O N S
//
// ============================================================
// ============================================================

// ============================================================
// DASHBOARD INIT
// ============================================================
async function initDashboard() {
    if (!supabaseClient) { showToast('Supabase belum tersedia', 'error'); return; }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { window.location.href = 'index.html'; return; }

        const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
        if (error || !profile) { await supabaseClient.auth.signOut(); window.location.href = 'index.html'; return; }

        currentUser = { id: session.user.id, email: session.user.email, name: profile.full_name, role: profile.role };
        currentRole = profile.role;

        // Cek mode simulasi (Admin Only)
        var simulasiRole = localStorage.getItem('simulasi_role');
        if (simulasiRole && profile.role === 'admin') {
            currentRole = simulasiRole;
            var banner = document.createElement('div');
            banner.style.position = 'fixed'; banner.style.top = '0'; banner.style.left = '0'; banner.style.right = '0';
            banner.style.background = '#f59e0b'; banner.style.color = '#fff'; banner.style.textAlign = 'center';
            banner.style.padding = '8px 15px'; banner.style.zIndex = '999999'; banner.style.fontSize = '14px'; banner.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            banner.innerHTML = '✨ Mode Simulasi: Tampilan sebagai <strong>' + getRoleLabel(currentRole).toUpperCase() + '</strong> ' +
                '<button onclick="stopSimulasi()" style="margin-left:15px;padding:4px 14px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,0.2);">Berhenti & Kembali ke Admin</button>';
            document.body.appendChild(banner);
            var sb = document.getElementById('sidebar');
            var tb = document.querySelector('.dash-top-bar');
            if (sb) { sb.style.top = '36px'; sb.style.height = 'calc(100vh - 36px)'; }
            if (tb) { tb.style.top = '36px'; }
            document.body.style.paddingTop = '36px';
        }

        // Show waiting screen for unapproved users
        if (currentRole === 'menunggu_persetujuan') {
            document.getElementById('waitingScreen').style.display = 'flex';
            document.getElementById('sidebar').style.display = 'none';
            document.getElementById('dashMain').style.display = 'none';
            var wn = document.getElementById('waitingName');
            var we = document.getElementById('waitingEmail');
            if (wn) wn.textContent = profile.full_name || '-';
            if (we) we.textContent = session.user.email || '-';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Nonaktif users get kicked out
        if (currentRole === 'nonaktif') {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
            return;
        }

        // Set user info
        var el = function (id) { return document.getElementById(id); };
        if (el('userName')) el('userName').textContent = profile.full_name || 'User';
        if (el('userRole')) el('userRole').textContent = getRoleLabel(currentRole);
        if (el('userAvatar')) el('userAvatar').textContent = getInitials(profile.full_name);
        if (el('currentDate')) el('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Apply role-based visibility
        applyRoleVisibility();
        loadStats();

        // Load data for admin/kurikulum
        if (['admin', 'kurikulum'].includes(currentRole)) {
            renderPendingAccounts();
            renderActiveAccounts();
            renderInactiveAccounts();
            loadBeritaAdmin();
            if (typeof loadSPMBConfigDashboard === 'function') loadSPMBConfigDashboard();
            loadSPMBData();
            loadActiveYear();
            loadMasterKelas();
            loadMasterMapel();
            loadGuruData();
            loadSiswaData();
            loadAlumniData();
            loadMutasiData();
            loadPengumumanAdmin();
            loadWaliKelasData();
            loadKontenHero();
            loadKontenVisiMisi();
            loadKontenTestimoni();
        }

        // Load essential data for bendahara (master kelas + siswa needed for keuangan)
        if (currentRole === 'bendahara') {
            loadMasterKelas();
            loadSiswaData();
        }

        // Load pengumuman, galeri, + siswa for dashboard (all roles)
        loadDashboardPengumuman();
        loadGaleriBeranda();
        loadDashGuru();
        loadDashSiswa();

        animateDashboardCards();

        // Auto-resume sesi CBT aktif jika siswa sempat keluar browser atau baterai habis saat ujian
        if (currentRole === 'siswa' && typeof cbtAutoResumeSession === 'function') {
            cbtAutoResumeSession();
        }

        // Cek dan tutup otomatis sesi CBT yang jadwalnya sudah selesai
        if (['admin', 'guru', 'kurikulum'].includes(currentRole) && typeof cbtScheduleChecker === 'function') {
            cbtScheduleChecker();
        }

        // Setup Jeda Pemeliharaan Auto Kick
        if (currentRole !== 'admin' && currentRole !== 'kurikulum') {
            setInterval(async function () {
                try {
                    const { data: maint } = await supabaseClient.from('system_settings').select('value').eq('key', 'maintenance_mode').single();
                    if (maint && maint.value === 'true') {
                        await supabaseClient.auth.signOut();
                        window.location.href = 'index.html?maintenance=1';
                    }
                } catch (e) { }
            }, 10000); // Cek status tiap 10 detik
        }
    } catch (err) {
        console.error('initDashboard error:', err);
        showToast('Gagal memuat dashboard', 'error');
    }
}

function applyRoleVisibility() {
    var role = currentRole || 'siswa'; // Default to siswa mapping

    var isAdminKurikulum = ['admin', 'kurikulum'].includes(role);
    document.querySelectorAll('.admin-kurikulum-only').forEach(function (el) {
        el.style.display = isAdminKurikulum ? '' : 'none';
    });

    // Soal Ujian (Admin, Kurikulum, Siswa)
    var isRoleUjian = ['admin', 'kurikulum', 'siswa'].includes(role);
    document.querySelectorAll('.role-ujian').forEach(function (el) {
        el.style.display = isRoleUjian ? '' : 'none';
    });

    // Akademik & Asesmen
    var isAkademik = ['admin', 'kurikulum', 'kesiswaan', 'wali_kelas', 'guru_mapel', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-akademik').forEach(function (el) {
        el.style.display = isAkademik ? '' : 'none';
    });

    // Arsip, Hasil & Analisis, Sampah Asesmen — khusus admin/kurikulum saja
    var isAdminKurikulum = ['admin', 'kurikulum'].includes(role);
    document.querySelectorAll('.role-admin-kurikulum').forEach(function (el) {
        el.style.display = isAdminKurikulum ? '' : 'none';
    });

    // Input Penilaian
    var isPenilaian = ['admin', 'kurikulum', 'kesiswaan', 'wali_kelas', 'guru_mapel', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-penilaian').forEach(function (el) {
        el.style.display = isPenilaian ? '' : 'none';
    });

    // Group Akademik (Wrapper)
    var showAkademikGroup = isAkademik || isRoleUjian;
    document.querySelectorAll('.group-akademik').forEach(function (el) {
        el.style.display = showAkademikGroup ? '' : 'none';
    });

    // Data Induk & Operasional Sekolah
    var isDataOperasional = ['admin', 'kurikulum', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-datainduk, .role-operasional').forEach(function (el) {
        el.style.display = isDataOperasional ? '' : 'none';
    });

    // Layanan Kesiswaan
    var isLayanan = ['admin', 'kurikulum', 'kesiswaan'].includes(role);
    document.querySelectorAll('.role-layanan').forEach(function (el) {
        el.style.display = isLayanan ? '' : 'none';
    });

    // Monitoring
    var isMonitoring = ['admin', 'kurikulum', 'kepala_sekolah'].includes(role);
    document.querySelectorAll('.role-monitoring').forEach(function (el) {
        el.style.display = isMonitoring ? '' : 'none';
    });

    // Kelola Konten
    var isKonten = ['admin', 'kurikulum', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-konten').forEach(function (el) {
        el.style.display = isKonten ? '' : 'none';
    });

    // Non Siswa
    var isNonSiswa = role !== 'siswa';
    document.querySelectorAll('.role-non-siswa').forEach(function (el) {
        el.style.display = isNonSiswa ? '' : 'none';
    });

    // Siswa Only (Hasil Ujian Saya)
    var isSiswaOnly = (role === 'siswa');
    document.querySelectorAll('.role-siswa-only').forEach(function (el) {
        el.style.display = isSiswaOnly ? '' : 'none';
    });

    // Manajemen Keuangan (Bendahara, Admin, Kurikulum)
    var isBendahara = ['bendahara', 'admin', 'kurikulum'].includes(role);
    document.querySelectorAll('.role-bendahara').forEach(function (el) {
        el.style.display = isBendahara ? '' : 'none';
    });

    // Laporan Bendahara untuk Kepsek ONLY (admin excluded)
    var isKepsekOnly = (role === 'kepala_sekolah');
    document.querySelectorAll('.role-kepsek-only').forEach(function (el) {
        el.style.display = isKepsekOnly ? '' : 'none';
    });

    // Welcome message
    var welcomeEl = document.getElementById('dashboardWelcome');
    if (welcomeEl) {
        var welcomeMap = {
            'admin': 'Kelola seluruh sistem informasi sekolah.',
            'kurikulum': 'Kelola kurikulum dan monitoring pembelajaran.',
            'kepala_sekolah': 'Pantau kinerja dan aktivitas sekolah.',
            'kesiswaan': 'Kelola kedisiplinan dan pembinaan siswa.',
            'operator_sekolah': 'Kelola data sekolah, guru, dan siswa.',
            'wali_kelas': 'Kelola kelas dan evaluasi siswa.',
            'guru_mapel': 'Kelola jurnal mengajar dan absensi.',
            'bendahara': 'Kelola keuangan dan pembayaran.',
            'siswa': 'Selamat datang di portal siswa.'
        };
        welcomeEl.textContent = welcomeMap[currentRole] || 'Selamat datang di Sistem Informasi Sekolah.';
    }

    if (window.lucide) lucide.createIcons();
}

// ============================================================
// SIDEBAR & NAVIGATION
// ============================================================
function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('dashOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}
window.closeSidebar = closeSidebar;

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('dashOverlay');
    if (!sidebar || !overlay) return;
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }
}
window.toggleSidebar = toggleSidebar;

window.showSection = function (sectionId, linkEl) {
    document.querySelectorAll('.dash-section').forEach(function (s) { s.classList.remove('active'); });
    var section = document.getElementById(sectionId);
    if (section) section.classList.add('active');

    // Update active link
    document.querySelectorAll('.sidebar-link').forEach(function (l) { l.classList.remove('active'); });
    if (linkEl) linkEl.classList.add('active');

    // Close sidebar on mobile ONLY if currently open (never toggle open)
    closeSidebar();

    // Lazy-load data for sections
    if (sectionId === 'sectionBerita' && typeof loadBeritaAdmin === 'function') loadBeritaAdmin();
    if (sectionId === 'sectionArsipBerita' && typeof loadArsipBerita === 'function') loadArsipBerita();
    if (sectionId === 'sectionEskul' && typeof loadEskulAdmin === 'function') loadEskulAdmin();
    if (sectionId === 'sectionSarpras' && typeof loadSarprasAdmin === 'function') loadSarprasAdmin();
    if (sectionId === 'sectionPengumuman' && typeof loadPengumumanAdmin === 'function') loadPengumumanAdmin();
    if (sectionId === 'sectionSPMB' && typeof loadSPMBData === 'function') {
        loadSPMBConfigDashboard();
        loadSPMBData();
    }
    if (sectionId === 'sectionAkun') {
        if (typeof renderPendingAccounts === 'function') renderPendingAccounts();
        if (typeof renderActiveAccounts === 'function') renderActiveAccounts();
        if (typeof renderInactiveAccounts === 'function') renderInactiveAccounts();
    }
    if (sectionId === 'sectionDashboard') {
        loadDashboardPengumuman();
        if (['admin', 'kurikulum'].includes(currentRole)) { loadDashGuru(); loadDashSiswa(); }
    }
    if (sectionId === 'sectionTahunKelas') { loadActiveYear(); loadMasterKelas(); loadMasterMapel(); loadMasterKkm(); }
    if (sectionId === 'sectionProfilGuru') {
        (async function () {
            await loadMasterMapel();
            loadProfilGuru();
        })();
    }
    if (sectionId === 'sectionGuru') { loadMasterMapel(); loadGuruData(); }
    if (sectionId === 'sectionSiswa') { loadMasterKelas(); loadSiswaData(); }
    if (sectionId === 'sectionAlumni') loadAlumniData();
    if (sectionId === 'sectionSiswaPindah') { loadMasterKelas(); loadSiswaPindahData(); }
    if (sectionId === 'sectionSiswaDikeluarkan') { loadMasterKelas(); loadSiswaDikeluarkanData(); }
    if (sectionId === 'sectionManajemenAsesmen') {
        if (typeof loadAsesmenList === 'function') loadAsesmenList();
        if (typeof loadReviewDraftList === 'function') loadReviewDraftList();
    }
    if (sectionId === 'sectionBuatSoal') {
        loadMasterKelas();
        loadActiveYear();
        loadMasterMapel();
        var bId = document.getElementById('builderAsesmenId');
        if (!bId || !bId.value) {
            var b = document.getElementById('asesmenBuilderArea');
            var p = document.getElementById('asesmenParseArea');
            var a = document.getElementById('asesmenAIGenerateArea');
            if (b && p && a && b.style.display !== 'block' && p.style.display !== 'block' && a.style.display !== 'block') {
                var ph = document.getElementById('pilihMetodePlaceholder');
                if (ph) ph.style.display = 'block';
            }
        }
        if (window.lucide) lucide.createIcons();
    }
    if (sectionId === 'sectionArsipAsesmen') { loadArsipAsesmen(); }
    if (sectionId === 'sectionSampahAsesmen') { loadSampahAsesmen(); }
    if (sectionId === 'sectionHasilAsesmen') {
        (async function () {
            await loadActiveYear();
            await loadMasterKelas();
            await loadMasterMapel();
            var lbl = document.getElementById('lblActiveYear');
            if (lbl && document.getElementById('hasilAsesmenTahun')) {
                document.getElementById('hasilAsesmenTahun').value = lbl.textContent;
            }
            populateKelasDropdown('hasilAsesmenKelas', '');
            populateMapelIdDropdown('hasilAsesmenMapel', '');
            document.getElementById('hasilAsesmenLink').value = '';
            document.getElementById('hasilAsesmenPanel').style.display = 'none';
            updateHasilAsesmenTipe();
        })();
    }
    if (sectionId === 'sectionJurnalMengajar') { loadMasterKelas(); loadMasterMapel(); loadActiveYear(); loadJurnalMengajar(); }
    if (sectionId === 'sectionLaporanJurnal') { loadLaporanJurnal(); }
    if (sectionId === 'sectionPenilaian') {
        (async function () {
            await loadActiveYear();
            await loadMasterKelas();
            await loadMasterMapel();
            await loadMasterKkm();
            var lbl = document.getElementById('lblActiveYear');
            if (lbl && document.getElementById('filterPenilaianTahun')) {
                document.getElementById('filterPenilaianTahun').value = lbl.textContent;
            }
            populateKelasDropdown('filterPenilaianKelas', '');
            populateMapelIdDropdown('filterPenilaianMapel', '');
        })();
    }
    if (sectionId === 'sectionHasilUjianSaya') { loadHasilUjianSaya(); }
    if (sectionId === 'sectionKritikSaranMasuk') { loadKritikSaran(); }
    if (sectionId === 'sectionMutasiSiswa') { loadMasterKelas(); loadMutasiData(); }
    if (sectionId === 'sectionAgendaDinas') { loadRapatData(); loadPerjadinData(); }
    if (sectionId === 'sectionInventaris') { loadInventarisData(); }
    if (sectionId === 'sectionSuratMasukKeluar') { loadSuratData(); }
    if (sectionId === 'sectionNotulensi') { loadNotulensiData(); }
    if (sectionId === 'sectionPelanggaranSiswa') { loadTataTertibData(); loadPelanggaranData(); }
    if (sectionId === 'sectionKegiatanOsis') { loadOsisData(); }
    if (sectionId === 'sectionEkstrakurikuler') { loadEkskulData(); }
    if (sectionId === 'sectionPrestasiSiswa') { loadPrestasiData(); }
    if (sectionId === 'sectionBimbinganKonseling') { loadBkData(); }
    if (sectionId === 'sectionKesehatanSiswa') { loadKesehatanData(); }
    // ================= GALERI ================= //
    if (sectionId === 'sectionGaleri') { loadGaleri(); }
    // ========================================== //
    if (sectionId === 'sectionRuangDiskusi') {
        if (currentUser) {
            var avatarStr = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
            document.getElementById('forumUserAvatar').innerText = avatarStr;
        }
        loadForumFeed();
    }
    if (sectionId === 'sectionBuatSoal') { loadAsesmenConfig(); loadMasterKelas(); loadMasterMapel(); loadActiveYear(); }
    if (sectionId === 'sectionArsipAsesmen') { loadMasterKelas(); loadMasterMapel(); loadActiveYear(); loadArsipAsesmen(); }
    if (sectionId === 'sectionSoalUjian') { loadSoalUjian(); }
    if (sectionId === 'sectionCetakKartuUjian') {
        populateKartuKelasCheckboxes();
        if (typeof loadPanitiaLocal === 'function') loadPanitiaLocal();
        loadMasterMapel();
        loadGuruData();
        renderRiwayatJadwal();
    }
    if (sectionId === 'sectionIntegrasiGoogle') {
        if (typeof loadAsesmenConfig === 'function') loadAsesmenConfig();
        if (typeof loadAIConfig === 'function') loadAIConfig();
    }
    if (sectionId === 'sectionLaporanNilai') {
        (async function () {
            await loadActiveYear();
            await loadMasterKelas();
            await loadMasterMapel();
            var lbl = document.getElementById('lblActiveYear');
            if (lbl && document.getElementById('filterLaporanTahun')) {
                document.getElementById('filterLaporanTahun').value = lbl.textContent;
            }
            populateKelasDropdown('filterLaporanKelas', '');
            populateMapelIdDropdown('filterLaporanMapel', '');
        })();
    }
};

// ============================================================
// LOGOUT & NAVIGATION PREVENTION
// ============================================================
// Mencegah navigasi kembali (back button) ke halaman sebelumnya
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
};

function handleLogout() {
    if (typeof showCustomConfirm === 'function') {
        showCustomConfirm('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari sistem?', 'Ya, Keluar', async function () {
            if (!supabaseClient) { window.location.replace('index.html'); return; }
            try {
                await supabaseClient.auth.signOut();
            } catch (e) { console.warn(e); }
            window.location.replace('index.html');
        });
    } else {
        if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
            if (!supabaseClient) { window.location.replace('index.html'); return; }
            supabaseClient.auth.signOut().then(() => {
                window.location.replace('index.html');
            }).catch(() => {
                window.location.replace('index.html');
            });
        }
    }
}

// ============================================================
// UBAH NAMA PROFIL (SIDEBAR)
// ============================================================
function openEditNamaModal() {
    if (!currentUser) return;
    var nameEl = document.getElementById('userName');
    document.getElementById('formEditNamaInput').value = nameEl ? nameEl.textContent : currentUser.name;
    document.getElementById('editNamaModal').classList.add('active');
}

function closeEditNamaModal() {
    document.getElementById('editNamaModal').classList.remove('active');
}

async function saveEditNama() {
    if (!currentUser) return;
    var newName = document.getElementById('formEditNamaInput').value.trim();
    if (!newName) {
        showToast('Nama tidak boleh kosong!', 'warning');
        return;
    }

    if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan nama...');
    try {
        // Update in profiles
        var { error: errProfile } = await supabaseClient
            .from('profiles')
            .update({ full_name: newName })
            .eq('id', currentUser.id);

        if (errProfile) throw errProfile;

        // Update in memory UI
        currentUser.name = newName;
        var nameEl = document.getElementById('userName');
        if (nameEl) nameEl.textContent = newName;

        var avatarEl = document.getElementById('userAvatar');
        if (avatarEl && typeof getInitials === 'function') {
            avatarEl.textContent = getInitials(newName);
        }

        showToast('Nama berhasil diperbarui!', 'success');
        closeEditNamaModal();

    } catch (e) {
        showToast('Gagal menyimpan nama: ' + e.message, 'error');
    } finally {
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
    }
}

// ============================================================
// STATS
// ============================================================
function animateCountUp(element, target) {
    if (!element || isNaN(target)) return;
    var dur = 800, start = null;
    function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        element.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

async function loadStats() {
    if (!supabaseClient) return;
    try {
        const { data: pending } = await supabaseClient.from('profiles').select('id').eq('role', 'menunggu_persetujuan');
        var sp = document.getElementById('statPending');
        if (sp && pending) animateCountUp(sp, pending.length);

        const { data: active } = await supabaseClient.from('profiles').select('id').neq('role', 'menunggu_persetujuan').neq('role', 'nonaktif');
        var sa = document.getElementById('statApproved');
        if (sa && active) animateCountUp(sa, active.length);

        const { data: berita } = await supabaseClient.from('berita').select('id');
        var sb = document.getElementById('statBerita');
        if (sb && berita) animateCountUp(sb, berita.length);

        const { data: spmb } = await supabaseClient.from('pendaftaran_murid_baru').select('id');
        var ss = document.getElementById('statSpmb');
        if (ss && spmb) animateCountUp(ss, spmb.length);
    } catch (e) { console.warn('Stats error:', e); }
}

function animateDashboardCards() {
    document.querySelectorAll('.stat-card').forEach(function (card, i) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(function () {
            card.style.transition = 'opacity .5s ease, transform .5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 80 * i);
    });
}

// ============================================================
// BERITA ADMIN (CRUD)
// ============================================================
async function loadBeritaAdmin() {
    var tbody = document.getElementById('beritaTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('berita').select('*')
            .is('archived_at', null)
            .order('tanggal', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada berita aktif.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var dt = b.tanggal ? new Date(b.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var statusBadge = b.is_published
                ? '<span class="badge badge-green">Publik</span>'
                : '<span class="badge badge-gray">Draft</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (b.judul || '-') + '</td>' +
                '<td style="color:var(--text-light);font-size:.85rem;">' + (b.ringkasan || '-').substring(0, 80) + '</td>' +
                '<td>' + dt + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon" style="background:rgba(245,158,11,.1);color:var(--amber)" onclick="archiveBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Arsipkan"><i data-lucide="archive" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-blue" onclick="editBerita(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openBeritaModal(data) {
    document.getElementById('beritaId').value = data ? data.id : '';
    document.getElementById('beritaJudul').value = data ? data.judul : '';
    document.getElementById('beritaRingkasan').value = data ? data.ringkasan : '';
    document.getElementById('beritaGambarFile').value = '';
    var previewEl = document.getElementById('beritaGambarPreview');
    if (previewEl) {
        if (data && data.gambar_url) {
            previewEl.innerHTML = '<img src="' + (getDirectImageUrl(data.gambar_url) || data.gambar_url) + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" /> <span style="font-size:0.8rem;color:var(--text-light);">Gambar saat ini (upload baru untuk mengganti)</span>';
        } else { previewEl.innerHTML = ''; }
    }
    document.getElementById('beritaTanggal').value = data ? data.tanggal : new Date().toISOString().split('T')[0];
    document.getElementById('beritaPublished').value = data ? String(data.is_published) : 'true';
    document.getElementById('beritaModalTitle').textContent = data ? 'Edit Berita' : 'Tambah Berita';
    document.getElementById('beritaSaveBtnText').textContent = data ? 'Update Berita' : 'Simpan Berita';
    document.getElementById('beritaModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeBeritaModal() {
    document.getElementById('beritaModal').classList.remove('active');
    document.getElementById('beritaForm').reset();
}

async function saveBerita() {
    var id = document.getElementById('beritaId').value;
    var payload = {
        judul: document.getElementById('beritaJudul').value.trim(),
        ringkasan: document.getElementById('beritaRingkasan').value.trim(),
        tanggal: document.getElementById('beritaTanggal').value || new Date().toISOString().split('T')[0],
        is_published: document.getElementById('beritaPublished').value === 'true'
    };
    if (!payload.judul) { showToast('Judul wajib diisi!', 'warning'); return; }

    // Upload gambar jika ada file baru
    var fileInput = document.getElementById('beritaGambarFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        showGlobalLoader('Mengupload gambar berita...');
        try {
            var file = fileInput.files[0];
            payload.gambar_url = await uploadToGoogleDrive(file, 'berita');
        } catch (e) { hideGlobalLoader(); showToast('Gagal upload gambar: ' + e.message, 'error'); return; }
    }

    try {
        if (id) {
            const { error } = await supabaseClient.from('berita').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Berita berhasil diupdate!', 'success');
        } else {
            payload.created_by = currentUser ? currentUser.id : null;
            const { error } = await supabaseClient.from('berita').insert([payload]);
            if (error) throw error;
            showToast('Berita berhasil ditambahkan!', 'success');

            // Auto-archive oldest if count > 6
            const { data: activeBerita, error: countErr } = await supabaseClient.from('berita')
                .select('id')
                .is('archived_at', null)
                .order('tanggal', { ascending: true }); // Oldest first

            if (!countErr && activeBerita && activeBerita.length > 6) {
                var overflowCount = activeBerita.length - 6;
                // Archive the oldest `overflowCount` items
                for (var j = 0; j < overflowCount; j++) {
                    await supabaseClient.from('berita').update({ archived_at: new Date().toISOString() }).eq('id', activeBerita[j].id);
                }
                setTimeout(() => showToast('Berita lama otomatis diarsipkan karena sudah melampaui 6.', 'info'), 1000);
            }
        }
        closeBeritaModal();
        loadBeritaAdmin();
        loadArsipBerita(); // update list arsip
        loadStats();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function editBerita(id) {
    try {
        const { data, error } = await supabaseClient.from('berita').select('*').eq('id', id).single();
        if (error) throw error;
        openBeritaModal(data);
    } catch (e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deleteBerita(id, judul) {
    showCustomConfirm('Hapus Berita?', 'Berita <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('berita').delete().eq('id', id);
            if (error) throw error;
            showToast('Berita berhasil dihapus!', 'success');
            loadBeritaAdmin();
            loadArsipBerita();
            loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function archiveBerita(id, judul) {
    showCustomConfirm('Arsipkan Berita?', 'Berita <strong>"' + judul + '"</strong> akan dipindah ke Arsip dan tidak tampil di halaman utama.', 'Ya, Arsipkan', async function () {
        try {
            await supabaseClient.from('berita').update({ archived_at: new Date().toISOString() }).eq('id', id);
            showToast('Berita berhasil diarsipkan!', 'success');
            loadBeritaAdmin();
            loadArsipBerita();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

async function loadArsipBerita() {
    var tbody = document.getElementById('arsipBeritaTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat arsip...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('berita').select('*')
            .not('archived_at', 'is', null)
            .order('archived_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Arsip berita kosong.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var dt = b.archived_at ? new Date(b.archived_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (b.judul || '-') + '</td>' +
                '<td style="color:var(--text-light);font-size:.85rem;">' + (b.ringkasan || '-').substring(0, 80) + '</td>' +
                '<td>' + dt + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="restoreBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Kembalikan ke Aktif"><i data-lucide="undo-2" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function restoreBerita(id, judul) {
    showCustomConfirm('Kembalikan Berita?', 'Berita <strong>"' + judul + '"</strong> akan ditampilkan kembali di halaman utama.', 'Ya, Kembalikan', async function () {
        try {
            await supabaseClient.from('berita').update({ archived_at: null }).eq('id', id);
            showToast('Berita berhasil dikembalikan!', 'success');
            loadBeritaAdmin();
            loadArsipBerita();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// PENGUMUMAN (CRUD + DASHBOARD DISPLAY)
// ============================================================
var pengumumanList = [];

async function loadPengumumanAdmin() {
    var tbody = document.getElementById('pengumumanTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('pengumuman').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        pengumumanList = data || [];
        if (pengumumanList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada pengumuman.</td></tr>';
            return;
        }
        tbody.innerHTML = pengumumanList.map(function (p, i) {
            var dt = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var prioBadge = p.prioritas === 'Urgent' ? '<span class="badge badge-red">Urgent</span>' :
                p.prioritas === 'Penting' ? '<span class="badge badge-amber">Penting</span>' :
                    '<span class="badge badge-blue">Normal</span>';
            var statusBadge = p.is_active ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-gray">Nonaktif</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (p.judul || '-') + '</td>' +
                '<td style="color:var(--text-light);font-size:.85rem;">' + (p.isi || '-').substring(0, 80) + (p.isi && p.isi.length > 80 ? '...' : '') + '</td>' +
                '<td>' + prioBadge + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + dt + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editPengumuman(\'' + p.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deletePengumuman(\'' + p.id + '\',\'' + (p.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openPengumumanModal(data) {
    document.getElementById('pengumumanId').value = data ? data.id : '';
    document.getElementById('pengumumanJudul').value = data ? data.judul : '';
    document.getElementById('pengumumanIsi').value = data ? data.isi : '';
    document.getElementById('pengumumanPrioritas').value = data ? data.prioritas : 'Normal';
    document.getElementById('pengumumanStatus').value = data ? String(data.is_active) : 'true';
    document.getElementById('pengumumanModalTitle').textContent = data ? 'Edit Pengumuman' : 'Tambah Pengumuman';
    document.getElementById('pengumumanSaveBtnText').textContent = data ? 'Update Pengumuman' : 'Simpan Pengumuman';
    document.getElementById('pengumumanModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closePengumumanModal() {
    document.getElementById('pengumumanModal').classList.remove('active');
    document.getElementById('pengumumanForm').reset();
}

async function savePengumuman() {
    var id = document.getElementById('pengumumanId').value;
    var payload = {
        judul: document.getElementById('pengumumanJudul').value.trim(),
        isi: document.getElementById('pengumumanIsi').value.trim(),
        prioritas: document.getElementById('pengumumanPrioritas').value,
        is_active: document.getElementById('pengumumanStatus').value === 'true'
    };
    if (!payload.judul || !payload.isi) { showToast('Judul dan isi pengumuman wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('pengumuman').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Pengumuman berhasil diupdate!', 'success');
        } else {
            payload.created_by = currentUser ? currentUser.id : null;
            const { error } = await supabaseClient.from('pengumuman').insert([payload]);
            if (error) throw error;
            showToast('Pengumuman berhasil ditambahkan!', 'success');
        }
        closePengumumanModal();
        loadPengumumanAdmin();
        loadDashboardPengumuman();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function editPengumuman(id) {
    try {
        const { data, error } = await supabaseClient.from('pengumuman').select('*').eq('id', id).single();
        if (error) throw error;
        openPengumumanModal(data);
    } catch (e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deletePengumuman(id, judul) {
    showCustomConfirm('Hapus Pengumuman?', 'Pengumuman <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('pengumuman').delete().eq('id', id);
            if (error) throw error;
            showToast('Pengumuman berhasil dihapus!', 'success');
            loadPengumumanAdmin();
            loadDashboardPengumuman();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// Display active pengumuman as banners on dashboard
async function loadDashboardPengumuman() {
    var container = document.getElementById('dashboardPengumumanArea');
    if (!container || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('pengumuman').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';
        container.innerHTML = data.map(function (p) {
            var colorMap = {
                'Urgent': { bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '#ef4444', icon: '#ef4444', title: '#dc2626' },
                'Penting': { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#3b82f6', icon: '#3b82f6', title: '#2563eb' },
                'Normal': { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#22c55e', icon: '#22c55e', title: '#16a34a' }
            };
            var c = colorMap[p.prioritas] || colorMap['Normal'];
            var dt = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            var prioLabel = p.prioritas === 'Urgent' ? '⚠️ URGENT' : p.prioritas === 'Penting' ? '📢 PENTING' : '📣 PENGUMUMAN';
            return '<div style="background:' + c.bg + ';border-left:4px solid ' + c.border + ';border-radius:12px;padding:1rem 1.25rem;margin-bottom:.75rem;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
                '<span style="font-size:.75rem;font-weight:700;color:' + c.icon + ';letter-spacing:.5px;">' + prioLabel + '</span>' +
                '<span style="font-size:.75rem;color:#94a3b8;">' + dt + '</span>' +
                '</div>' +
                '<h4 style="margin:0 0 4px 0;font-size:1rem;color:' + c.title + ';">' + (p.judul || '') + '</h4>' +
                '<p style="margin:0;font-size:.9rem;color:#475569;line-height:1.5;">' + (p.isi || '') + '</p>' +
                '</div>';
        }).join('');
    } catch (e) { console.warn('loadDashboardPengumuman error:', e.message); }
}

// ============================================================
// EKSTRAKURIKULER (CRUD)
// ============================================================
async function loadEskulAdmin() {
    var tbody = document.getElementById('eskulTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('ekstrakurikuler').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data Ekstrakurikuler.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var imgURL = getDirectImageUrl(b.gambar_url) || b.gambar_url;
            var nama = b.nama_ekskul || b.nama || ''; // fallback untuk support legacy table
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (nama || '-') + '</td>' +
                '<td>' + (imgURL ? '<img src="' + imgURL + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--border);" />' : '<span style="color:var(--text-light);">-</span>') + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editEskul(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteEskul(\'' + b.id + '\',\'' + nama.replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openEskulModal(data) {
    document.getElementById('eskulId').value = data ? data.id : '';
    document.getElementById('eskulNama').value = data ? (data.nama_ekskul || data.nama || '') : '';
    document.getElementById('eskulGambarFile').value = '';
    var previewEl = document.getElementById('eskulGambarPreview');
    if (previewEl) {
        if (data && data.gambar_url) {
            previewEl.innerHTML = '<img src="' + (getDirectImageUrl(data.gambar_url) || data.gambar_url) + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" /> <span style="font-size:0.8rem;color:var(--text-light);">Gambar saat ini</span>';
        } else { previewEl.innerHTML = ''; }
    }
    document.getElementById('eskulModalTitle').textContent = data ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler';
    document.getElementById('eskulSaveBtnText').textContent = data ? 'Update Data' : 'Simpan Data';
    document.getElementById('eskulModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeEskulModal() {
    document.getElementById('eskulModal').classList.remove('active');
    document.getElementById('eskulForm').reset();
}

async function saveEskul() {
    var id = document.getElementById('eskulId').value;
    var payload = {
        nama_ekskul: document.getElementById('eskulNama').value.trim(),
        updated_at: new Date().toISOString()
    };
    if (!payload.nama_ekskul) { showToast('Nama wajib diisi!', 'warning'); return; }

    // Upload gambar jika ada file baru
    var fileInput = document.getElementById('eskulGambarFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        showGlobalLoader('Mengupload gambar eskul...');
        try {
            var file = fileInput.files[0];
            payload.gambar_url = await uploadToGoogleDrive(file, 'eskul');
        } catch (e) { hideGlobalLoader(); showToast('Gagal upload gambar: ' + e.message, 'error'); return; }
    } else if (!id) {
        showToast('Gambar wajib diupload!', 'warning'); return;
    }

    try {
        if (id) {
            const { error } = await supabaseClient.from('ekstrakurikuler').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Data berhasil diupdate!', 'success');
        } else {
            const { error } = await supabaseClient.from('ekstrakurikuler').insert([payload]);
            if (error) throw error;
            showToast('Data berhasil ditambahkan!', 'success');
        }
        closeEskulModal();
        loadEskulAdmin();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function editEskul(id) {
    try {
        const { data, error } = await supabaseClient.from('ekstrakurikuler').select('*').eq('id', id).single();
        if (error) throw error;
        openEskulModal(data);
    } catch (e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deleteEskul(id, nama) {
    showCustomConfirm('Hapus Ekstrakurikuler?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('ekstrakurikuler').delete().eq('id', id);
            if (error) throw error;
            showToast('Data berhasil dihapus!', 'success');
            loadEskulAdmin();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// SARANA PRASARANA (CRUD)
// ============================================================
async function loadSarprasAdmin() {
    var tbody = document.getElementById('sarprasTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('sarana_prasarana').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data Sarpras.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var imgURL = getDirectImageUrl(b.gambar_url) || b.gambar_url;
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (b.nama || '-') + '</td>' +
                '<td>' + (imgURL ? '<img src="' + imgURL + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--border);" />' : '<span style="color:var(--text-light);">-</span>') + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editSarpras(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteSarpras(\'' + b.id + '\',\'' + (b.nama || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openSarprasModal(data) {
    document.getElementById('sarprasId').value = data ? data.id : '';
    document.getElementById('sarprasNama').value = data ? data.nama : '';
    document.getElementById('sarprasGambarFile').value = '';
    var previewEl = document.getElementById('sarprasGambarPreview');
    if (previewEl) {
        if (data && data.gambar_url) {
            previewEl.innerHTML = '<img src="' + (getDirectImageUrl(data.gambar_url) || data.gambar_url) + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" /> <span style="font-size:0.8rem;color:var(--text-light);">Gambar saat ini</span>';
        } else { previewEl.innerHTML = ''; }
    }
    document.getElementById('sarprasModalTitle').textContent = data ? 'Edit Sarpras' : 'Tambah Sarpras';
    document.getElementById('sarprasSaveBtnText').textContent = data ? 'Update Data' : 'Simpan Data';
    document.getElementById('sarprasModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeSarprasModal() {
    document.getElementById('sarprasModal').classList.remove('active');
    document.getElementById('sarprasForm').reset();
}

async function saveSarpras() {
    var id = document.getElementById('sarprasId').value;
    var payload = {
        nama: document.getElementById('sarprasNama').value.trim(),
        updated_at: new Date().toISOString()
    };
    if (!payload.nama) { showToast('Nama wajib diisi!', 'warning'); return; }

    // Upload gambar jika ada file baru
    var fileInput = document.getElementById('sarprasGambarFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        showGlobalLoader('Mengupload gambar sarpras...');
        try {
            var file = fileInput.files[0];
            payload.gambar_url = await uploadToGoogleDrive(file, 'sarpras');
        } catch (e) { hideGlobalLoader(); showToast('Gagal upload gambar: ' + e.message, 'error'); return; }
    } else if (!id) {
        showToast('Gambar wajib diupload!', 'warning'); return;
    }

    try {
        if (id) {
            const { error } = await supabaseClient.from('sarana_prasarana').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Data berhasil diupdate!', 'success');
        } else {
            const { error } = await supabaseClient.from('sarana_prasarana').insert([payload]);
            if (error) throw error;
            showToast('Data berhasil ditambahkan!', 'success');
        }
        closeSarprasModal();
        loadSarprasAdmin();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function editSarpras(id) {
    try {
        const { data, error } = await supabaseClient.from('sarana_prasarana').select('*').eq('id', id).single();
        if (error) throw error;
        openSarprasModal(data);
    } catch (e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deleteSarpras(id, nama) {
    showCustomConfirm('Hapus Sarpras?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('sarana_prasarana').delete().eq('id', id);
            if (error) throw error;
            showToast('Data berhasil dihapus!', 'success');
            loadSarprasAdmin();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// Display guru & staff list on dashboard
async function loadDashGuru() {
    var tbody = document.getElementById('dashGuruTableBody');
    var countEl = document.getElementById('dashGuruCount');
    if (!tbody || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('guru_staff').select('*').eq('status', 'Aktif').order('nama_lengkap');
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-light)">Belum ada data guru.</td></tr>';
            if (countEl) countEl.textContent = '0 guru/staff';
            return;
        }
        if (countEl) countEl.textContent = data.length + ' guru/staff';
        tbody.innerHTML = data.map(function (g, i) {
            var fotoHtml = g.foto_url ? '<img src="' + g.foto_url + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;font-weight:bold;">' + (g.nama_lengkap ? g.nama_lengkap.charAt(0).toUpperCase() : '?') + '</div>';
            var allMapel = [g.mata_pelajaran, g.mata_pelajaran_2, g.mata_pelajaran_3].filter(Boolean).join(', ');
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td><div style="display:flex;justify-content:center;">' + fotoHtml + '</div></td>' +
                '<td style="font-weight:500;">' + (g.nama_lengkap || '-') + '</td>' +
                '<td>' + (g.jenis_kelamin || '-') + '</td>' +
                '<td>' + (g.jabatan || '-') + '</td>' +
                '<td>' + (g.jabatan_tambahan || '-') + '</td>' +
                '<td>' + (allMapel || '-') + '</td>' +
                '</tr>';
        }).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

// Display student list on dashboard
async function loadDashSiswa() {
    var tbody = document.getElementById('dashSiswaTableBody');
    var countEl = document.getElementById('dashSiswaCount');
    if (!tbody || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas, tingkat)').not('status', 'in', '("Lulus","Pindah")');
        if (error) throw error;

        var list = data || [];
        list.sort(function (a, b) {
            var tkA = a.master_kelas ? parseInt(a.master_kelas.tingkat) || 0 : 0;
            var tkB = b.master_kelas ? parseInt(b.master_kelas.tingkat) || 0 : 0;
            if (tkA !== tkB) return tkA - tkB;

            var kelasA = a.master_kelas ? (a.master_kelas.nama_kelas || '').toLowerCase() : '';
            var kelasB = b.master_kelas ? (b.master_kelas.nama_kelas || '').toLowerCase() : '';
            if (kelasA !== kelasB) {
                if (kelasA < kelasB) return -1;
                if (kelasA > kelasB) return 1;
            }

            var nameA = (a.nama_lengkap || '').toLowerCase();
            var nameB = (b.nama_lengkap || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-light)">Belum ada data siswa.</td></tr>';
            if (countEl) countEl.textContent = '0 siswa';
            return;
        }
        if (countEl) countEl.textContent = list.length + ' siswa';
        tbody.innerHTML = list.map(function (s, i) {
            var fotoHtml = s.foto ? '<img src="' + s.foto + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' : '<div style="width:32px;height:32px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:11px;font-weight:bold;">' + (s.nama_lengkap ? s.nama_lengkap.charAt(0).toUpperCase() : '?') + '</div>';
            var kelas = s.master_kelas ? s.master_kelas.nama_kelas : '-';
            var mondokBadge = s.mondok === 'Iya' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;">Iya</span>' : '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;font-size:.75rem;">Tidak</span>';
            var statusBadge = s.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;font-size:.75rem;">Aktif</span>' :
                s.status === 'Tidak Aktif' ? '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;font-size:.75rem;">Tidak Aktif</span>' :
                    s.status === 'Pindahan' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;">Pindahan</span>' :
                        '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;font-size:.75rem;">' + (s.status || '-') + '</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;justify-content:center;">' + fotoHtml + '</div></td>' +
                '<td>' + (s.nisn || '-') + '</td>' +
                '<td style="font-weight:500;">' + (s.nama_lengkap || '-') + '</td>' +
                '<td>' + (s.jenis_kelamin || '-') + '</td>' +
                '<td>' + kelas + '</td>' +
                '<td>' + mondokBadge + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '</tr>';
        }).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

// ============================================================
// SPMB MANAGEMENT (Dashboard)
// ============================================================
async function loadSPMBConfigDashboard() {
    try {
        const { data: statusData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_is_active').single();
        const { data: yearData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_academic_year').single();
        if (statusData && document.getElementById('confSpmbStatus')) {
            document.getElementById('confSpmbStatus').value = statusData.value;
        }
        if (yearData && document.getElementById('confSpmbYear')) {
            document.getElementById('confSpmbYear').value = yearData.value;
        }
    } catch (e) { console.error('Error load spmb config:', e); }
}

async function saveSPMBConfig() {
    var status = document.getElementById('confSpmbStatus').value;
    var year = document.getElementById('confSpmbYear').value;
    if (!year) return showToast('Tahun Ajaran tidak boleh kosong!', 'error');

    try {
        await supabaseClient.from('system_settings').upsert([
            { key: 'spmb_is_active', value: status },
            { key: 'spmb_academic_year', value: year }
        ]);
        showToast('Pengaturan SPMB berhasil disimpan!', 'success');

        // Panggil render public lagi jika sedang di landing page? Hanya berlaku kalau reload.
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function loadSPMBData() {
    var tbody = document.getElementById('spmbTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('pendaftaran_murid_baru').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada pendaftar.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (p, i) {
            var dt = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var statusBadge = p.status === 'Diterima' ? '<span class="badge badge-green">Diterima</span>' :
                p.status === 'Ditolak' ? '<span class="badge badge-red">Ditolak</span>' :
                    '<span class="badge badge-amber">Menunggu</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (p.nama_lengkap || '-') + '</td>' +
                '<td>' + (p.nama_orang_tua || '-') + '</td>' +
                '<td>' + (p.nomor_telepon || '-') + '</td>' +
                '<td>' + (p.sekolah_asal || '-') + '</td>' +
                '<td style="font-size:.85rem;">' + (p.alamat_lengkap || '-') + '</td>' +
                '<td>' + dt + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td><div style="display:flex;gap:.3rem;flex-wrap:wrap;">' +
                (p.status === 'Menunggu' ? '<button class="btn-icon btn-icon-green" onclick="updateSPMBStatus(\'' + p.id + '\',\'Diterima\')" title="Terima"><i data-lucide="check" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="updateSPMBStatus(\'' + p.id + '\',\'Ditolak\')" title="Tolak"><i data-lucide="x" style="width:14px;height:14px"></i></button>' : '') +
                '<button class="btn-icon btn-icon-blue" onclick="printSPMB(\'' + p.id + '\')" title="Cetak Formulir"><i data-lucide="printer" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteSPMB(\'' + p.id + '\',\'' + (p.nama_lengkap || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function updateSPMBStatus(id, status) {
    try {
        const { error } = await supabaseClient.from('pendaftaran_murid_baru').update({ status: status }).eq('id', id);
        if (error) throw error;
        showToast('Status berhasil diupdate!', 'success');
        loadSPMBData();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteSPMB(id, nama) {
    showCustomConfirm('Hapus Data SPMB?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('pendaftaran_murid_baru').delete().eq('id', id);
            if (error) throw error;
            showToast('Data dihapus!', 'success');
            loadSPMBData();
            loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

async function printSPMB(id) {
    try {
        const { data: spmb, error } = await supabaseClient.from('pendaftaran_murid_baru').select('*').eq('id', id).single();
        if (error || !spmb) throw new Error('Data tidak ditemukan');

        const printWin = window.open('', '_blank');
        if (!printWin) { showToast('Popup diblokir oleh browser', 'error'); return; }

        const logoUrl = window.location.href.split('dashboard.html')[0] + 'img/logo.png';
        const tglDaftar = new Date(spmb.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Data SPMB - ${spmb.nama_lengkap}</title>
            <style>
                body { font-family: "Times New Roman", Times, serif; color: #000; padding: 0 40px; line-height: 1.5; font-size: 14pt; }
                .kop { position: relative; width: 100%; text-align: center; margin-bottom: 5px; min-height: 110px; }
                .kop img { position: absolute; left: 0; top: 0; width: 110px; height: auto; }
                .kop-text { width: 100%; text-align: center; line-height: 1.15; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .kop-text h2 { margin: 0 0 5px 0; font-size: 26px; font-weight: bold; letter-spacing: 0.5px; font-family: "Times New Roman", serif; }
                .kop-text .bold-line { font-weight: bold; font-size: 14.5px; margin: 2px 0; font-family: "Times New Roman", serif; }
                .kop-text .normal-line { font-size: 13.5px; margin: 2px 0; font-family: "Times New Roman", serif; }
                .kop-border-sub { border-top: 3px solid #000; border-bottom: 1px solid #000; height: 1.5px; margin-top: 5px; margin-bottom: 30px; }
                
                h3.form-title { text-align: center; text-decoration: underline; text-transform: uppercase; margin: 30px 0; font-size: 18px; font-weight: bold; }
                
                table.data-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14pt; }
                table.data-table td { padding: 10px 5px; vertical-align: top; }
                table.data-table td:first-child { width: 220px; font-weight: bold; }
                table.data-table td:nth-child(2) { width: 20px; text-align: center; }
                
                .footer { margin-top: 80px; display: flex; justify-content: flex-end; font-size: 14pt;}
                .signature { text-align: center; width: 300px; }
                
                @media print {
                    @page { margin: 1.5cm; size: A4 portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
                }
            </style>
        </head>
        <body onload="window.print(); window.setTimeout(function(){window.close();}, 500);">
            <div class="kop">
                <img src="${logoUrl}" alt="Logo SMP IT Al-Fathonah" />
                <div class="kop-text">
                    <h2>SMP IT AL-FATHONAH BABAKAN</h2>
                    <div class="bold-line">STATUS : "TERAKREDITASI"</div>
                    <div class="bold-line">SK BAP S/M No : 02.00/322/BAP-SM/XI/2013</div>
                    <div class="bold-line">NSS: 202 021 704 006 NPSN: 20 25 38 92</div>
                    <div class="normal-line">Jalan H. Mastra (Ponpes Al-Fathonah) No. 04 Desa Kudukeras Kec. Babakan Kab. Cirebon 45191</div>
                    <div class="normal-line">Tlp./ Fax. (0231) 641960 Hp. 085 323 056 221</div>
                </div>
            </div>
            <div class="kop-border-sub"></div>

            <h3 class="form-title">Formulir Pendaftaran Murid Baru</h3>
            
            <table class="data-table">
                <tr><td>Tanggal Pendaftaran</td><td>:</td><td>${tglDaftar}</td></tr>
                <tr><td>Nama Lengkap Siswa</td><td>:</td><td>${spmb.nama_lengkap || '-'}</td></tr>
                <tr><td>Alamat Lengkap</td><td>:</td><td>${spmb.alamat_lengkap || '-'}</td></tr>
                <tr><td>Asal Sekolah</td><td>:</td><td>${spmb.sekolah_asal || '-'}</td></tr>
                <tr><td>Nama Orang Tua/Wali</td><td>:</td><td>${spmb.nama_orang_tua || '-'}</td></tr>
                <tr><td>Nomor Telepon/WA</td><td>:</td><td>${spmb.nomor_telepon || '-'}</td></tr>
                <tr><td>Status Pendaftaran</td><td>:</td><td><strong>${(spmb.status || '').toUpperCase()}</strong></td></tr>
            </table>
            
            <div class="footer">
                <div class="signature">
                    <p>Babakan, ............................ ${new Date().getFullYear()}</p>
                    <p>Panitia Penerimaan Murid Baru,</p>
                    <br><br><br><br>
                    <p>___________________________</p>
                </div>
            </div>
        </body>
        </html>
        `;
        printWin.document.write(html);
        printWin.document.close();
    } catch (e) {
        showNotifModal('Gagal Mencetak', e.message, 'error');
    }
}

// ============================================================
// LANDING PAGE ENHANCEMENTS JS
// ==========================================

// ==========================================
// LANDING PAGE ENHANCEMENTS JS
// ==========================================

// 2. Typewriter Effect
document.addEventListener('DOMContentLoaded', function () {
    var textEl = document.getElementById('typewriterText');
    if (!textEl) return;

    var prefix = "Generasi yang ";
    var words = ["Cerdas", "Berprestasi", "Amanah", "Kreatif", "Berakhlaqul Karimah"];
    var wordIndex = 0;
    var charIndex = 0;
    var isDeleting = false;

    function typeEffect() {
        var currentWord = words[wordIndex];

        if (isDeleting) {
            textEl.textContent = prefix + currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            textEl.textContent = prefix + currentWord.substring(0, charIndex + 1);
            charIndex++;
        }

        var typingSpeed = isDeleting ? 40 : 100;

        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typingSpeed = 500; // Pause before new word
        }

        setTimeout(typeEffect, typingSpeed);
    }

    setTimeout(typeEffect, 1000);
});

// 3. Simple Vanilla Tilt
document.addEventListener('mousemove', function (e) {
    var cards = document.querySelectorAll('.tilt-element, .berita-card, .eskul-card, .sarana-card');
    cards.forEach(function (card) {
        var rect = card.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var maxDeg = 6; // soft tilt
            var rotateY = (x / rect.width * 2 - 1) * maxDeg;
            var rotateX = (1 - y / rect.height * 2) * maxDeg;
            card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.02, 1.02, 1.02)';
            card.style.transition = 'none';
        }
    });
});
document.addEventListener('mouseout', function (e) {
    var cards = document.querySelectorAll('.tilt-element, .berita-card, .eskul-card, .sarana-card');
    cards.forEach(function (card) {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.5s ease-out';
    });
});

// 4. Testimonial Slider JS
var currentTestimonialIndex = 0;
var testimonialInterval;

function initTestimonial() {
    var track = document.getElementById('testimonialTrack');
    if (!track) return;
    showTestimonial(currentTestimonialIndex);
    testimonialInterval = setInterval(function () { moveTestimonial(1); }, 6000);
}

function moveTestimonial(n) {
    clearInterval(testimonialInterval);
    var track = document.getElementById('testimonialTrack');
    if (!track) return;
    var slides = track.querySelectorAll('.testimonial-slide');
    currentTestimonialIndex += n;
    if (currentTestimonialIndex >= slides.length) currentTestimonialIndex = 0;
    if (currentTestimonialIndex < 0) currentTestimonialIndex = slides.length - 1;
    showTestimonial(currentTestimonialIndex);
    testimonialInterval = setInterval(function () { moveTestimonial(1); }, 6000);
}

window.moveTestimonial = moveTestimonial; // Expose to global for onclick

function setTestimonial(n) {
    clearInterval(testimonialInterval);
    currentTestimonialIndex = n;
    showTestimonial(currentTestimonialIndex);
    testimonialInterval = setInterval(function () { moveTestimonial(1); }, 6000);
}
window.setTestimonial = setTestimonial; // Expose to global

function showTestimonial(index) {
    var track = document.getElementById('testimonialTrack');
    if (!track) return;
    var dots = document.querySelectorAll('#testimonialDots .dot');
    track.style.transform = 'translateX(-' + (index * 100) + '%)';
    dots.forEach(function (d, i) {
        if (i === index) {
            d.classList.add('active');
            d.style.background = 'var(--primary)';
        } else {
            d.classList.remove('active');
            d.style.background = 'rgba(30,58,138,0.2)';
        }
    });
}
document.addEventListener('DOMContentLoaded', initTestimonial);

// ==============================================================================
// MODUL RUANG DISKUSI (FORUM) & AI CHAT
// ==============================================================================

// Upload gambar sekarang menggunakan Google Drive via Google Apps Script

// Konfigurasi Google Apps Script URL untuk AI Chat (Gemini Proxy)
const GAS_AI_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyJYNNxg_m89JVoJcnMHJRhyBnZsbpWxugeP8R0M_ahrbF7Iys1DWkhM_XsoyUUkCL_/exec";

var selectedForumImageFile = null;

// --- Kompresi Gambar menggunakan Canvas ---
function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height *= maxWidth / width));
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width *= maxHeight / height));
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Output as Blob (JPEG)
            canvas.toBlob(function (blob) {
                callback(blob);
            }, 'image/jpeg', quality);
        };
    };
}

// --- Preview Gambar di Input Form ---
function handleForumImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validasi ukuran awal (opsional)
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showToast("Ukuran gambar terlalu besar. Maksimal 5MB.", "warning");
        return;
    }

    selectedForumImageFile = file;
    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById('forumImagePreview').src = e.target.result;
        document.getElementById('forumImagePreviewContainer').style.display = 'block';
    }
    reader.readAsDataURL(file);
}

function removeForumImage() {
    selectedForumImageFile = null;
    document.getElementById('forumInputImage').value = '';
    document.getElementById('forumImagePreviewContainer').style.display = 'none';
}

// --- Submit Status ke Forum ---
async function submitForumPost() {
    if (!currentUser) {
        showToast("Sesi habis. Silakan login kembali.", "error");
        return;
    }

    const text = document.getElementById('forumInputText').value.trim();
    if (!text && !selectedForumImageFile) {
        showToast("Tulis sesuatu atau unggah gambar untuk dibagikan.", "warning");
        return;
    }

    document.getElementById('globalLoaderText').innerText = "Memposting ke ruang diskusi...";
    document.getElementById('globalLoader').style.display = 'flex';

    try {
        let imageUrl = null;

        // 1. Upload Gambar ke Google Drive jika ada
        if (selectedForumImageFile) {
            // Kompres gambar terlebih dahulu (ditingkatkan resolusi dan kualitasnya)
            const compressedBlob = await new Promise((resolve) => {
                compressImage(selectedForumImageFile, 1920, 1920, 0.85, resolve);
            });

            // Upload ke Google Drive
            imageUrl = await uploadToGoogleDrive(compressedBlob, 'forum');
        }

        // 2. Simpan Data ke Supabase
        const { data, error } = await supabaseClient.from('forum_posts').insert([
            {
                user_id: currentUser.id,
                role: currentRole,
                nama_pengguna: currentUser.name || currentUser.email,
                konten: text,
                image_url: imageUrl
            }
        ]);

        if (error) throw error;

        // 3. Simpan ke Galeri jika diceklis
        const saveToGallery = document.getElementById('forumSaveToGallery')?.checked;
        if (imageUrl && saveToGallery) {
            await supabaseClient.from('galeri').insert([{
                gambar_url: imageUrl,
                album_nama: 'Share',
                keterangan: 'Dibagikan dari Ruang Diskusi oleh ' + (currentUser.name || currentUser.email),
                tanggal: new Date().toISOString().split('T')[0]
            }]);

            // Refresh galeri di background
            if (typeof loadGaleri === 'function') loadGaleri();
            if (typeof loadGaleriBeranda === 'function') loadGaleriBeranda();
        }

        // Bersihkan Form
        document.getElementById('forumInputText').value = '';
        removeForumImage();
        showToast("Berhasil membagikan postingan!", "success");

        // Muat ulang feed
        loadForumFeed();

    } catch (e) {
        console.error(e);
        showToast(e.message || "Terjadi kesalahan saat memposting.", "error");
    } finally {
        document.getElementById('globalLoader').style.display = 'none';
    }
}

// --- Load Forum Feed ---
async function loadForumFeed() {
    const container = document.getElementById('forumFeedContainer');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;"><i data-lucide="loader" class="icon-spin"></i> Memuat...</p>';
    if (window.lucide) lucide.createIcons();

    try {
        // Ambil data postingan, terurut dari yang terbaru
        const { data: posts, error } = await supabaseClient
            .from('forum_posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Belum ada diskusi. Jadilah yang pertama membagikan cerita!</p>';
            return;
        }

        // Ambil likes dan comments
        const { data: allLikes } = await supabaseClient.from('forum_likes').select('post_id, user_id');
        const { data: allComments } = await supabaseClient.from('forum_comments').select('*').order('created_at', { ascending: true });

        let html = '';
        const myUserId = currentUser ? currentUser.id : null;

        posts.forEach(post => {
            const postLikes = (allLikes || []).filter(l => l.post_id === post.id);
            const myLike = postLikes.find(l => l.user_id === myUserId);
            const postComments = (allComments || []).filter(c => c.post_id === post.id);

            const avatarLetter = (post.nama_pengguna || 'U').charAt(0).toUpperCase();
            const timeStr = new Date(post.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

            html += `
            <div class="forum-post" id="post-${post.id}">
                <div class="forum-post-header">
                    <div class="forum-avatar">${avatarLetter}</div>
                    <div class="forum-user-info">
                        <h4>${escHtml(post.nama_pengguna)}</h4>
                        <div class="forum-user-meta">
                            <span class="forum-role-badge">${escHtml(post.role)}</span>
                            <span>•</span>
                            <span>${timeStr}</span>
                        </div>
                    </div>
                </div>
                <div class="forum-content">${escHtml(post.konten)}</div>
                ${post.image_url ? `<img src="${post.image_url}" class="forum-image" alt="Post Image" onclick="openGaleriLightbox('${post.image_url}', 'Gambar dari ${escAttr(post.nama_pengguna)}')" />` : ''}
                
                <div class="forum-actions">
                    <button class="forum-action-btn ${myLike ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
                        <i data-lucide="heart"></i> <span id="like-count-${post.id}">${postLikes.length}</span> Suka
                    </button>
                    <button class="forum-action-btn" onclick="document.getElementById('comment-input-${post.id}').focus()">
                        <i data-lucide="message-square"></i> <span id="comment-count-${post.id}">${postComments.length}</span> Komentar
                    </button>
                    ${post.user_id === myUserId ? `
                    <button class="forum-action-btn" onclick="deleteForumPost('${post.id}')" style="color: #ef4444; margin-left: auto;" title="Hapus Postingan">
                        <i data-lucide="trash-2"></i> Hapus
                    </button>
                    ` : ''}
                </div>

                <div class="forum-comments-section">
                    <div class="forum-comment-list" id="comment-list-${post.id}">
            `;

            // Tampilkan Komentar
            postComments.forEach(comment => {
                const cAvatar = (comment.nama_pengguna || 'U').charAt(0).toUpperCase();
                html += `
                <div class="forum-comment-item">
                    <div class="forum-comment-avatar">${cAvatar}</div>
                    <div class="forum-comment-body">
                        <h5>${escHtml(comment.nama_pengguna)}</h5>
                        <p>${escHtml(comment.konten)}</p>
                    </div>
                </div>
                `;
            });

            html += `
                    </div>
                    <div class="forum-comment-input-wrap">
                        <input type="text" class="forum-comment-input" id="comment-input-${post.id}" placeholder="Tulis komentar..." onkeypress="if(event.key === 'Enter') submitComment('${post.id}')" />
                        <button class="btn btn-primary" style="border-radius: 20px; padding: 0.5rem 1rem;" onclick="submitComment('${post.id}')"><i data-lucide="send" style="width:14px;height:14px;"></i></button>
                    </div>
                </div>
            </div>
            `;
        });

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Gagal memuat feed diskusi.</p>';
    }
}

// --- Like / Unlike ---
async function toggleLike(postId, btnEl) {
    if (!currentUser) return;

    const isLiked = btnEl.classList.contains('liked');
    const countSpan = document.getElementById(`like-count-${postId}`);
    let count = parseInt(countSpan.innerText) || 0;

    try {
        // Optimistic UI update (Langsung ubah tampilan tanpa refresh)
        if (isLiked) {
            btnEl.classList.remove('liked');
            countSpan.innerText = Math.max(0, count - 1);
            // Eksekusi background
            supabaseClient.from('forum_likes').delete().match({ post_id: postId, user_id: currentUser.id }).then();
        } else {
            btnEl.classList.add('liked');
            countSpan.innerText = count + 1;
            // Eksekusi background
            supabaseClient.from('forum_likes').insert([{ post_id: postId, user_id: currentUser.id }]).then();
        }
    } catch (e) {
        console.error(e);
    }
}

// --- Submit Komentar ---
async function submitComment(postId) {
    if (!currentUser) return;
    const inputEl = document.getElementById(`comment-input-${postId}`);
    const text = inputEl.value.trim();
    if (!text) return;

    // Optimistic UI update
    const listEl = document.getElementById(`comment-list-${postId}`);
    const cAvatar = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
    const newHtml = `
        <div class="forum-comment-item">
            <div class="forum-comment-avatar">${cAvatar}</div>
            <div class="forum-comment-body">
                <h5>${escHtml(currentUser.name || currentUser.email)}</h5>
                <p>${escHtml(text)}</p>
            </div>
        </div>
    `;
    listEl.insertAdjacentHTML('beforeend', newHtml);
    inputEl.value = '';

    const countSpan = document.getElementById(`comment-count-${postId}`);
    if (countSpan) countSpan.innerText = (parseInt(countSpan.innerText) || 0) + 1;

    try {
        // Eksekusi background
        supabaseClient.from('forum_comments').insert([{
            post_id: postId,
            user_id: currentUser.id,
            nama_pengguna: currentUser.name || currentUser.email,
            konten: text
        }]).then();
    } catch (e) {
        console.error(e);
    }
}

// --- Hapus Postingan ---
async function deleteForumPost(postId) {
    if (typeof showCustomConfirm === 'function') {
        showCustomConfirm(
            'Hapus Postingan?',
            'Apakah Anda yakin ingin menghapus postingan ini secara permanen?',
            'Ya, Hapus',
            async function () {
                executeDeletePost(postId);
            }
        );
    } else {
        if (!confirm("Apakah Anda yakin ingin menghapus postingan ini secara permanen?")) return;
        executeDeletePost(postId);
    }
}

async function executeDeletePost(postId) {
    // Hapus dari UI langsung
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) postEl.remove();

    try {
        // Hapus postingan utama (likes dan comments akan otomatis terhapus karena ON DELETE CASCADE di database)
        // Kita tidak bisa menghapus likes/comments secara manual dari frontend karena akan terbentur RLS (akses ditolak jika mencoba menghapus milik orang lain).
        const { error } = await supabaseClient.from('forum_posts').delete().eq('id', postId);

        if (error) throw error;

        showToast("Postingan dihapus.", "success");
    } catch (e) {
        console.error(e);
        showToast("Gagal menghapus postingan.", "error");
    }
}

// Hook loadForumFeed dipanggil dari showSection yang sudah ada di atas (baris ~891)

// ==============================================================================
// AI CHATBOT (GEMINI PROXY)
// ==============================================================================

// Reset posisi FAB dan modal chatbox ke default (kanan bawah)
function resetAiChatPosition() {
    var fab = document.getElementById('aiChatFab');
    var modal = document.getElementById('aiChatModal');
    if (fab) {
        fab.style.left = '';
        fab.style.top = '';
        fab.style.right = '';
        fab.style.bottom = '';
        fab.style.transition = '';
    }
    if (modal) {
        modal.style.left = '';
        modal.style.top = '';
        modal.style.right = '';
        modal.style.bottom = '';
        modal.style.transition = '';
    }
}

// Posisikan modal chatbox relatif terhadap posisi FAB saat ini
function positionModalNearFab() {
    var fab = document.getElementById('aiChatFab');
    var modal = document.getElementById('aiChatModal');
    if (!fab || !modal) return;

    var fabRect = fab.getBoundingClientRect();
    var modalW = modal.offsetWidth || 380;
    var modalH = modal.offsetHeight || 500;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Cek apakah FAB sudah dipindahkan (ada inline left/top)
    if (!fab.style.left && !fab.style.top) {
        // FAB masih di posisi default, gunakan CSS default modal
        modal.style.left = '';
        modal.style.top = '';
        modal.style.right = '';
        modal.style.bottom = '';
        return;
    }

    // FAB sudah dipindahkan — posisikan modal relatif terhadap FAB
    var fabCenterX = fabRect.left + fabRect.width / 2;
    var fabTopY = fabRect.top;

    // Modal muncul di atas FAB
    var modalLeft = fabCenterX - modalW / 2;
    var modalTop = fabTopY - modalH - 10;

    // Jika tidak muat di atas, tampilkan di bawah FAB
    if (modalTop < 0) {
        modalTop = fabRect.bottom + 10;
    }

    // Batasi agar tidak keluar viewport horizontal
    modalLeft = Math.max(8, Math.min(modalLeft, vw - modalW - 8));
    // Batasi vertikal
    modalTop = Math.max(8, Math.min(modalTop, vh - modalH - 8));

    modal.style.left = modalLeft + 'px';
    modal.style.top = modalTop + 'px';
    modal.style.right = 'auto';
    modal.style.bottom = 'auto';
}

function toggleAiChat() {
    var modal = document.getElementById('aiChatModal');
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
        positionModalNearFab();
        document.getElementById('aiChatInput').focus();
    }
}

// Tutup AI otomatis jika klik di luar area chat box
document.addEventListener('click', function (e) {
    var aiModal = document.getElementById('aiChatModal');
    var aiFab = document.getElementById('aiChatFab');
    if (aiModal && aiModal.classList.contains('active')) {
        if (!aiModal.contains(e.target) && (!aiFab || !aiFab.contains(e.target))) {
            aiModal.classList.remove('active');
        }
    }
});

// ============ DRAGGABLE AI FAB ICON ============
(function () {
    var isDragging = false;
    var hasDragged = false;
    var dragOffsetX = 0;
    var dragOffsetY = 0;
    var startX = 0;
    var startY = 0;
    var DRAG_THRESHOLD = 5; // piksel minimal sebelum dianggap drag

    function onFabDown(e) {
        var fab = document.getElementById('aiChatFab');
        if (!fab) return;

        var clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        var clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;
        hasDragged = false;

        var rect = fab.getBoundingClientRect();
        dragOffsetX = clientX - rect.left;
        dragOffsetY = clientY - rect.top;

        isDragging = true;

        // Matikan transition dan hover transform selama drag
        fab.style.transition = 'none';
        fab.style.transform = 'none';

        // Konversi posisi dari bottom/right ke left/top
        fab.style.left = rect.left + 'px';
        fab.style.top = rect.top + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';

        e.preventDefault();
    }

    function onFabMove(e) {
        if (!isDragging) return;

        var fab = document.getElementById('aiChatFab');
        if (!fab) return;

        var clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        var clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        // Cek apakah sudah melewati threshold drag
        var dx = clientX - startX;
        var dy = clientY - startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            hasDragged = true;
            fab.style.cursor = 'grabbing';
        }

        if (!hasDragged) return;

        var newLeft = clientX - dragOffsetX;
        var newTop = clientY - dragOffsetY;

        // Batasi agar tidak keluar viewport
        var fabW = fab.offsetWidth;
        var fabH = fab.offsetHeight;
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        newLeft = Math.max(0, Math.min(newLeft, vw - fabW));
        newTop = Math.max(0, Math.min(newTop, vh - fabH));

        fab.style.left = newLeft + 'px';
        fab.style.top = newTop + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';

        // Jika modal sedang terbuka, ikut pindahkan
        var modal = document.getElementById('aiChatModal');
        if (modal && modal.classList.contains('active')) {
            positionModalNearFab();
        }

        e.preventDefault();
    }

    function onFabUp(e) {
        if (!isDragging) return;
        isDragging = false;

        var fab = document.getElementById('aiChatFab');
        if (fab) {
            fab.style.transition = '';
            fab.style.transform = '';
            fab.style.cursor = '';
        }

        // Jika tidak di-drag (hanya klik), toggle chatbox
        if (!hasDragged) {
            toggleAiChat();
        }

        hasDragged = false;
    }

    function initFabDrag() {
        var fab = document.getElementById('aiChatFab');
        if (!fab) return;

        // Hapus onclick bawaan agar tidak konflik dengan drag
        fab.removeAttribute('onclick');

        fab.addEventListener('mousedown', onFabDown);
        fab.addEventListener('touchstart', onFabDown, { passive: false });

        document.addEventListener('mousemove', onFabMove);
        document.addEventListener('touchmove', onFabMove, { passive: false });
        document.addEventListener('mouseup', onFabUp);
        document.addEventListener('touchend', onFabUp);
    }

    // Pasang event listener
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFabDrag);
    } else {
        initFabDrag();
    }

    // Reset posisi FAB saat klik menu sidebar (navigasi antar halaman)
    document.addEventListener('click', function (e) {
        var navLink = e.target.closest('.dash-sidebar a, .dash-sidebar button, .dash-sidebar .nav-link, .dash-sidebar [onclick], .sidebar a, .sidebar button, .mobile-nav a, .mobile-nav button');
        if (navLink) {
            resetAiChatPosition();
        }
    });
})();

async function sendAiMessage() {
    const inputEl = document.getElementById('aiChatInput');
    const text = inputEl.value.trim();
    if (!text) return;

    const chatBody = document.getElementById('aiChatBody');

    // 1. Tampilkan pesan user
    chatBody.innerHTML += `
      <div class="ai-msg-wrapper user">
        <div class="ai-avatar user-avatar" style="background:#6366f1;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <div class="ai-msg user">${escHtml(text)}</div>
      </div>
    `;
    inputEl.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // 2. Tampilkan indikator mengetik
    const typingId = 'typing-' + Date.now();
    const typingWrapperId = 'wrapper-' + typingId;
    chatBody.innerHTML += `
        <div class="ai-msg-wrapper bot" id="${typingWrapperId}">
          <div class="ai-avatar bot-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
          </div>
          <div class="ai-msg bot" id="${typingId}">
            <div class="ai-typing"><span></span><span></span><span></span></div>
          </div>
        </div>
    `;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        // Ambil konfigurasi AI tersinkronisasi
        let dbKey = null;
        let dbModel = null;
        let dbProvider = null;
        try {
            if (supabaseClient) {
                const { data: pData } = await supabaseClient.from('system_settings').select('value').eq('key', 'ai_provider').maybeSingle();
                if (pData && pData.value) dbProvider = pData.value;
                const { data: kData } = await supabaseClient.from('system_settings').select('value').eq('key', 'ai_api_key').maybeSingle();
                if (kData && kData.value) dbKey = kData.value;
                if (!dbKey) {
                    const { data: gKeyData } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_api_key').maybeSingle();
                    if (gKeyData && gKeyData.value) dbKey = gKeyData.value;
                }
                const { data: mData } = await supabaseClient.from('system_settings').select('value').eq('key', 'ai_model').maybeSingle();
                if (mData && mData.value) dbModel = mData.value;
                if (!dbModel) {
                    const { data: gModelData } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_model').maybeSingle();
                    if (gModelData && gModelData.value) dbModel = gModelData.value;
                }
            }
        } catch (e) { }

        let currentProvider = dbProvider || localStorage.getItem('AI_PROVIDER') || 'gemini';
        let rawModel = dbModel || localStorage.getItem('AI_MODEL') || localStorage.getItem('GROQ_MODEL') || (currentProvider === 'gemini' ? "gemini-3.5-flash-lite" : "qwen/qwen3.8-27b");
        let GROQ_MODEL = typeof sanitizeGroqModel === 'function' ? sanitizeGroqModel(rawModel, currentProvider) : rawModel;
        let GROQ_API_KEY = dbKey || localStorage.getItem('AI_API_KEY') || localStorage.getItem('GROQ_API_KEY') || "";

        const systemPrompt = `Kamu adalah 'Asfa' (Asisten Pintar Al-Fathonah), asisten virtual cerdas, ramah, dan solutif untuk platform Sistem Informasi & Dashboard Pendidikan Terpadu SMP IT Al-Fathonah.

=======================================================
PANDUAN ETIKA & ATURAN BERBICARA:
=======================================================
1. BAHASA & NADA BICARA:
   - Gunakan Bahasa Indonesia yang ramah, sopan, santun, hangat, dan sangat manusiawi layaknya asisten pribadi sungguhan.
   - Hindari gaya bahasa kaku seperti robot. Gunakan panggilan yang menghormati seperti "Bapak/Ibu Guru", "Kakak", atau "Bapak/Ibu".
2. JIKA HANYA MENYAPA (misal: "hi", "halo", "selamat pagi", "assalamu'alaikum"):
   - JANGAN LANGSUNG memuntahkan seluruh daftar fitur!
   - Cukup balas sapaan dengan hangat, tanyakan kabar, dan tawarkan bantuan singkat (maksimal 2-3 kalimat).
3. JIKA DITANYA CARA / FITUR:
   - Jelaskan langkah-langkahnya (how-to) secara SISTEMATIS (1, 2, 3...), sebutkan nama menu di sidebar, letak tombol, dan tips penting yang memudahkan pengguna.
4. SPESIALISASI APLIKASI:
   - Kamu adalah asisten KHUSUS platform aplikasi SMP IT Al-Fathonah.
   - JIKA pengguna bertanya di luar konteks sekolah/aplikasi (misal resep masakan, politik, coding umum, gosip), TOLAK DENGAN SANGAT SOPAN dan arahkan kembali pembicaraan ke fitur aplikasi sekolah.

=======================================================
KNOWLEDGE BASE FITUR APLIKASI SMP IT AL-FATHONAH & CARA PENGGUNAANNYA:
=======================================================

1. MANAJEMEN ASESMEN & SOAL UJIAN (CBT NATIVE)
   Platform ini memiliki sistem ujian CBT mandiri terintegrasi penuh tanpa pihak ketiga.
   A. Tab Manajemen Asesmen (Menu "Manajemen Asesmen"):
      - Tab "Ujian Siap Uji": Menampilkan ujian yang sudah terbit. Di sini Guru/Admin bisa:
        * Klik "Mulai Ujian" untuk membuka sesi ujian bagi siswa.
        * Pantau Live Monitor: Siapa saja siswa yang sedang mengerjakan, berapa soal sudah dijawab, siapa yang selesai, dan siapa yang terkena penalti/blokir anti-curang.
        * Bagikan Token/Link Ujian kepada siswa.
        * Rekapitulasi nilai dan ekspor ke nilai akademik.
      - Tab "Review & Draft Soal": Antrean soal guru yang menunggu QC/persetujuan Kurikulum/Admin.
        * Guru: Membuat naskah draft, mengedit, lalu klik "Ajukan ke Admin".
        * Admin: Memeriksa naskah, memastikan bobot total bernilai 100, memberi catatan revisi jika belum pas, atau klik "Terbitkan ke CBT".
      - Tab "Salinan Terbit": Wadah arsip khusus untuk soal hasil kloning otomatis (Copy) saat sebuah soal diterbitkan.
        * Soal di tab ini tidak mengotori antrean draft review.
        * Guru/Admin dapat mengedit salinan ini untuk keperluan ujian susulan, remedial, atau diadaptasi untuk tahun ajaran berikutnya tanpa mengganggu ujian utama yang sedang aktif.
        * Terdapat tombol "Gunakan / Ajukan Ujian" untuk memasukkannya kembali ke antrean siap terbit.
      - Tab "Riwayat (Arsip)": Kumpulan arsip ujian yang telah selesai diujikan di masa lalu.
      - Tab "Bank Soal": Repositori kumpulan butir soal per mata pelajaran untuk bahan referensi penyusunan soal baru.
      - Tab "Tong Sampah": Menampung soal yang dihapus. Soal dapat dipulihkan (Restore) dalam 30 hari sebelum dihapus permanen.

   B. Cara Membuat Soal Asesmen (3 Metode Fleksibel):
      Buka menu "Manajemen Asesmen" > klik tombol "+ Buat Ujian Baru":
      1. Metode Buat Manual:
         - Langkah: Masukkan Judul Ujian, Mata Pelajaran, Kelas, Waktu Pengerjaan (menit), Tanggal, Bobot Nilai PG, dan Bobot Essay.
         - Tambahkan butir soal satu per satu (pilihan ganda opsi A-D atau essay).
         - Bisa upload gambar pada soal maupun pembahasan.
         - Simpan sebagai draft atau ajukan ke Admin.
      2. Metode Paste Naskah Jadi:
         - Sangat cocok jika naskah soal sudah diketik di Microsoft Word / Google Docs / PDF.
         - Copy naskah dengan format standar:
           1. Pertanyaan...
           A. Pilihan...
           B. Pilihan...
           C. Pilihan...
           D. Pilihan...
           Kunci: A
         - Paste ke dalam kotak naskah, sistem otomatis membaca (parse regex) seluruh butir soal dan kunci jawabannya secara instan.
      3. Metode Bikin Pakai AI (Groq / Gemini):
         - Cukup ketik topik materi (misal: "35 PG dan 5 Essay tentang Tata Surya kelas 7").
         - Pilih Tingkat Kesulitan: LOTS (dasar/hafalan), MOTS (menengah/pemahaman), atau HOTS (analisis tingkat tinggi).
         - Klik "Generate AI", maka sistem akan menyusun seluruh naskah soal secara utuh dan lengkap tanpa terpotong (didukung kuota hingga 65.000 token).

   C. Fitur CBT Native Bagi Siswa (Ujian Mandiri):
      - Siswa login ke portal ujian mandiri.
      - Sistem Keamanan Anti-Curang (Anti-Cheat): Jika siswa mencoba berpindah tab browser, membuka aplikasi lain, atau membagi layar, sistem akan mendeteksi pelanggaran, mencatat frekuensi pelanggaran, dan otomatis memblokir ujian siswa jika melebihi batas toleransi.
      - Fitur Auto-Save per detik: Jawaban tersimpan real-time ke Supabase cloud sehingga siswa tidak perlu takut kehilangan jawaban jika perangkat restart atau koneksi terputus.
      - Auto-Grade: Nilai PG langsung dihitung otomatis seketika siswa menekan tombol "Selesai Ujian" dan langsung terhubung ke database rekap nilai.

2. AKADEMIK & PEMBELAJARAN
   A. E-Jurnal Mengajar Harian:
      - Tempat guru mencatat agenda KBM harian secara transparan.
      - Cara Mengisi: Buka menu "Jurnal Mengajar" > Klik "+ Tambah Jurnal" > Pilih Tanggal, Jam Pelajaran (jam ke-), Kelas, dan Mata Pelajaran > Ketik Kompetensi Dasar (KD) dan Uraian Materi > Centang/pilih siswa yang tidak hadir (Sakit/Izin/Alpa) > Unggah foto dokumentasi kelas > Klik "Simpan".
      - Fitur "Kembangkan Materi AI": Guru bisa mengetik poin singkat materi lalu klik bantuan AI untuk mengembangkan uraian pembelajaran yang lebih terstruktur.
   B. Jurnal Guru Inval (Guru Pengganti):
      - Digunakan ketika seorang guru berhalangan hadir (sakit/dinas luar). Guru piket/inval dapat mencatat penugasan kelas yang digantikan agar kegiatan belajar tetap terpantau.
   C. Input Penilaian (STS / SAS / SAJ / SAT):
      - Guru memasukkan nilai harian, nilai tugas, STS (Sumatif Tengah Semester), dan SAS/SAT (Sumatif Akhir Semester/Tahun).
      - Hasil ujian dari CBT Native dapat langsung disinkronkan ke rekap nilai akademik hanya dengan satu klik.
      - Fitur Cetak Leger Nilai dan Rapor Siswa.
   D. Cetak Kartu Ujian Siswa:
      - Buka menu "Cetak Kartu Ujian" > Pilih Kelas dan Jenis Ujian > Sistem otomatis menghasilkan kartu ujian resmi lengkap dengan logo sekolah, foto siswa, QR Code/Barcode, dan jadwal sesi ujian, siap dicetak dalam format lembar A4/F4.

3. KESISWAAN, DATABASE & KEDISIPLINAN
   A. Manajemen Data Siswa:
      - Siswa Aktif: Pendataan NIS, NISN, nama lengkap, kelas, jenis kelamin, nama orang tua/wali, kontak, dan alamat. Dilengkapi fitur Ekspor & Impor Excel.
      - Kenaikan Kelas Otomatis: Di akhir tahun pelajaran, admin/wali kelas bisa menaikkan seluruh siswa satu angkatan ke tingkat berikutnya secara otomatis (dengan opsi khusus bagi siswa yang tinggal kelas).
      - Data Siswa Pindah (Mutasi Keluar), Data Siswa Dikeluarkan (DO), dan Data Alumni tersimpan dalam menu terpisah yang rapi agar riwayat tidak hilang.
   B. Data Guru & Staff:
      - Manajemen database pendidik dan tenaga kependidikan: NIP/NUPTK, jabatan, mapel yang diampu, riwayat pendidikan, dan status kepegawaian.
   C. Buku Penghubung & Pembinaan Karakter (Wali Kelas):
      - Buku Penghubung: Media komunikasi dan catatan perkembangan adab serta belajar siswa dari wali kelas ke orang tua.
      - Tatib & Karakter: Monitoring kedisiplinan dan pembiasaan ibadah (sholat dhuha, tadarus Al-Qur'an, puasa sunnah, adab harian).
   D. Catatan Pelanggaran & Poin:
      - Catatan pelanggaran tata tertib sekolah dengan sistem akumulasi bobot poin pelanggaran dan tindak lanjut (peringatan lisan, tertulis, SP1/SP2/SP3, hingga panggilan orang tua).
   E. Prestasi Siswa:
      - Pendataan sertifikat dan penghargaan prestasi siswa di bidang akademik, sains, olahraga, seni, dan keagamaan (tingkat Kecamatan, Kab/Kota, Provinsi, Nasional, hingga Internasional).
   F. Bimbingan Konseling (BK):
      - Modul khusus guru BK untuk mencatat konseling pribadi, catatan kasus, home visit, dan pemantauan perkembangan psikologis serta sosial siswa.
   G. Catatan Kesehatan (UKS):
      - Pencatatan riwayat kesehatan siswa, keluhan sakit saat di sekolah, penanganan P3K, dan data alergi siswa.

4. KEUANGAN & ADMINISTRASI SEKOLAH (BENDAHARA)
   A. Buku Kas Sekolah:
      - Pencatatan arus kas masuk dan kas keluar operasional sekolah secara real-time dengan saldo akhir otomatis.
   B. Transaksi Universal (Keuangan Insidental / Non-SPP):
      - Mengelola berbagai jenis iuran fleksibel: Pembelian Seragam, Outing Class, Renang, Field Trip, Peringatan Hari Besar Islam (PHBI), Formulir SPMB, dan Wisuda.
      - Fitur Cicilan: Mendukung pembayaran bertahap ("Belum Lunas" dan "Lunas").
      - Cetak Kwitansi Resmi: Menghasilkan cetak tanda bukti pembayaran berstandar F4 dengan stempel dan tanda tangan bendahara otomatis.
      - Riwayat pembayaran siswa tetap utuh dan tersimpan permanen di cloud meskipun siswa telah naik kelas.
   C. Dokumen Arkas & Stempel Digital:
      - Manajemen berkas digital pembukuan dan stempel resmi sekolah untuk validasi laporan keuangan.

5. TATA USAHA, PERSURATAN & SARPRAS
   A. Agenda Dinas:
      - Jadwal kalender dinas kepala sekolah, kegiatan yayasan, dan agenda pelatihan guru.
   B. Inventaris & Sarpras:
      - Pendataan aset barang sekolah (elektronik, meja kursi, buku perpustakaan, laboratorium) dengan status kondisi (Baik, Rusak Ringan, Rusak Berat) serta inventaris ruangan kelas.
   C. Surat Masuk & Surat Keluar:
      - Pengarsipan surat resmi dengan nomor surat, perihal, instansi pengirim/tujuan, dan upload file scan PDF.
      - Fitur "Draft Surat AI": Membantu membuat draft naskah surat undangan dinas, surat edaran wali murid, atau surat keterangan secara otomatis dan rapi.
   D. Notulensi Rapat:
      - Pencatatan hasil rapat dewan guru dan rapat koordinasi sekolah lengkap dengan daftar hadir dan kesimpulan rapat.

6. PUBLIK, KONTEN & SPMB (WEBSITE SEKOLAH)
   A. Berita & Kegiatan:
      - Menulis dan mempublikasikan artikel kegiatan sekolah ke website utama.
      - Dilengkapi "Auto-Tulis Berita AI": Cukup masukkan poin-poin kegiatan (misal: "Upacara Hari Santri, pembina Pak Maulana, paduan suara membawakan Mars Santri"), AI akan menuliskan artikel berita utuh dengan gaya jurnalistik profesional.
   B. Pengumuman Running Text:
      - Mengatur teks berjalan dan pop-up pengumuman penting di halaman depan website.
      - Tombol "Perbagus Pengumuman AI": Memperbaiki tata bahasa dan ejaan pengumuman agar formal dan menarik.
   C. SPMB (Sistem Penerimaan Murid Baru Online):
      - Mengaktifkan/menonaktifkan gelombang pendaftaran siswa baru, verifikasi berkas pendaftar, dan pengumuman seleksi.
   D. Galeri & Tampilan Depan:
      - Kelola foto slider hero utama, album galeri kegiatan, visi-misi sekolah, serta testimoni orang tua/alumni.

7. SOSIAL & FORUM KOMUNITAS
   A. Ruang Diskusi (Forum):
      - Media sosial internal warga SMP IT Al-Fathonah untuk bertukar gagasan, membagikan inspirasi, materi pembelajaran, berdiskusi, menyukai (like), dan berkomentar.
   B. Kritik & Saran Masuk:
      - Menampung masukan dari siswa, guru, maupun masyarakat dengan privasi terjaga, serta fitur bagi admin untuk memberikan tanggapan resmi (bisa dibantu AI).

8. PUSAT PENGATURAN & KONFIGURASI AI
   A. Pengaturan Sekolah:
      - Mengatur Tahun Ajaran Aktif (misal: 2026/2027), Semester (Ganjil/Genap), Data Rombel Kelas, Mata Pelajaran, dan Batas KKM.
   B. Pengaturan AI (Dual Provider: Google Gemini & Groq Cloud):
      - Aplikasi mendukung integrasi dua provider AI unggulan:
        1. Google Gemini: Kuota gratis besar hingga 1.000.000 token/menit dan kapasitas output hingga 65.536 token. Sangat direkomendasikan untuk pembuatan soal banyak (100 soal) dan chat cerdas.
        2. Groq Cloud: Menggunakan model LLaMA / Qwen dengan kecepatan tinggi.
      - Cara Mengganti / Update API Key:
        1. Klik menu "Pusat Pengaturan" atau buka ikon kunci/pengaturan di pojok.
        2. Pilih Provider AI ("Google Gemini" atau "Groq Cloud").
        3. Masukkan API Key baru (Untuk Gemini dapatkan di aistudio.google.com/app/apikey).
        4. Pilih Model yang diinginkan (misal: gemini-3.5-flash-lite).
        5. Klik "Simpan Konfigurasi AI". Sistem otomatis memperbarui data di Supabase dan browser Anda.

=======================================================
RINGKASAN TUGASMU:
Bantu setiap pengguna SMP IT Al-Fathonah memahami, memanfaatkan, dan mengoperasikan semua fitur di atas dengan penuh keramahan, kejelasan petunjuk langkah demi langkah, dan ketepatan informasi!`;

        let isGeminiDirect = currentProvider === 'gemini' || GROQ_MODEL.toLowerCase().includes('gemini') || (GROQ_API_KEY && (GROQ_API_KEY.startsWith('AIza') || GROQ_API_KEY.startsWith('AQ.')));
        let fullText = "";

        if (isGeminiDirect) {
            let primaryM = (GROQ_MODEL.includes('gemini-3.5') || GROQ_MODEL.includes('gemini-3.1') || GROQ_MODEL.includes('gemini-3.6')) ? GROQ_MODEL : 'gemini-3.5-flash-lite';
            const modelsToTry = [primaryM, 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'].filter((v, i, a) => a.indexOf(v) === i);
            let lastErr = null;
            let successData = null;

            for (let i = 0; i < modelsToTry.length; i++) {
                let gModel = modelsToTry[i];
                let gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${GROQ_API_KEY}`;
                let gBody = {
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: text }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 16384 }
                };

                let res = await fetch(gUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gBody)
                });

                if (res.ok) {
                    successData = await res.json();
                    lastErr = null;
                    break;
                }

                const gErr = await res.json().catch(() => ({}));
                const gErrMsg = gErr.error?.message || "Gagal menghubungi Gemini AI";
                lastErr = gErrMsg;
                const isBusy = res.status === 503 || res.status === 429 || gErrMsg.toLowerCase().includes('high demand') || gErrMsg.toLowerCase().includes('temporar');
                if (isBusy && i < modelsToTry.length - 1) {
                    console.warn(`Model chat ${gModel} padat, mencoba alternatif ${modelsToTry[i+1]}...`);
                    continue;
                }
                throw new Error(gErrMsg);
            }

            if (lastErr && !successData) throw new Error(lastErr);

            // Ekstrak teks utuh dari kandidat respon (termasuk penanganan parts terpisah / thinking)
            const candidate = successData?.candidates?.[0];
            let gText = "";
            if (candidate?.content?.parts) {
                gText = candidate.content.parts
                    .filter(p => !p.thought && p.text)
                    .map(p => p.text)
                    .join("\n") || candidate.content.parts.map(p => p.text || '').join('\n');
            }
            fullText = gText.trim() || "Halo! Ada yang bisa saya bantu terkait informasi dan kegiatan sekolah SMP IT Al-Fathonah?";
        } else {
            const url = "https://api.groq.com/openai/v1/chat/completions";
            let payload = {
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.7,
                stream: false,
                max_tokens: 4096
            };
            let res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + GROQ_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error?.message || "";
                throw new Error(errMsg || "Gagal menghubungi server Groq AI");
            }
            const data = await res.json();
            fullText = data.choices?.[0]?.message?.content || "Halo! Ada yang bisa saya bantu terkait sekolah?";
        }

        // 3. Ganti bubble typing dengan bubble teks balasan
        const typingWrapper = document.getElementById(typingWrapperId);
        let msgEl;
        if (typingWrapper) {
            typingWrapper.innerHTML = `
              <div class="ai-avatar bot-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
              </div>
              <div class="ai-msg bot" id="msg-${typingId}"></div>
            `;
            msgEl = document.getElementById(`msg-${typingId}`);
        } else {
            chatBody.innerHTML += `
              <div class="ai-msg-wrapper bot">
                <div class="ai-avatar bot-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
                </div>
                <div class="ai-msg bot" id="msg-${typingId}"></div>
              </div>
            `;
            msgEl = document.getElementById(`msg-${typingId}`);
        }

        // 4. Efek Typewriter respons alami
        let cursorIndex = 0;
        let typingInterval = setInterval(() => {
            if (!msgEl) {
                clearInterval(typingInterval);
                return;
            }
            if (cursorIndex < fullText.length) {
                let charsToAdd = 2;
                let backlog = fullText.length - cursorIndex;
                if (backlog > 40) charsToAdd = 5;
                if (backlog > 100) charsToAdd = 12;
                if (backlog > 300) charsToAdd = 25;
                cursorIndex += charsToAdd;
                if (cursorIndex > fullText.length) cursorIndex = fullText.length;

                let currentRaw = fullText.substring(0, cursorIndex);
                let renderedText = currentRaw.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/\n/g, '<br>');
                msgEl.innerHTML = renderedText + (cursorIndex < fullText.length ? '<span style="border-right: 2px solid var(--primary); margin-left:2px; animation: blink 1s step-end infinite;">&nbsp;</span>' : '');
                chatBody.scrollTop = chatBody.scrollHeight;
            } else {
                clearInterval(typingInterval);
                let renderedText = fullText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/\n/g, '<br>');
                msgEl.innerHTML = renderedText;
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }, 20);

    } catch (e) {
        console.error("AI Chat error:", e);
        const typingWrapper = document.getElementById('wrapper-' + typingId) || document.getElementById(typingId);
        if (typingWrapper) typingWrapper.remove();

        let errorMsg = e.message || "Terjadi kesalahan saat memproses respon.";
        chatBody.innerHTML += `
          <div class="ai-msg-wrapper bot">
            <div class="ai-avatar bot-avatar" style="background:#ef4444;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div class="ai-msg bot" style="color:#ef4444; border-color:#fca5a5;">⚠️ ${escHtml(errorMsg)}</div>
          </div>
        `;
    }

    chatBody.scrollTop = chatBody.scrollHeight;
}

// ==============================================================================

async function fetchGroqAI(prompt, systemMsg, customMaxTokens) {
    let dbKey = null;
    let dbModel = null;
    let dbProvider = null;
    try {
        if (supabaseClient) {
            const { data: pData } = await supabaseClient.from('system_settings').select('value').eq('key', 'ai_provider').maybeSingle();
            if (pData && pData.value) dbProvider = pData.value;
            const { data: kData } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_api_key').maybeSingle();
            if (kData && kData.value) dbKey = kData.value;
            const { data: mData } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_model').maybeSingle();
            if (mData && mData.value) dbModel = mData.value;
        }
    } catch (e) { }

    let API_KEY = dbKey || localStorage.getItem('GROQ_API_KEY') || "";
    let rawModel = dbModel || localStorage.getItem('GROQ_MODEL') || "gemini-3.5-flash-lite";
    let provider = dbProvider || localStorage.getItem('AI_PROVIDER') || ((API_KEY.startsWith('AIza') || API_KEY.startsWith('AQ.')) ? 'gemini' : (API_KEY.startsWith('gsk_') ? 'groq' : 'gemini'));

    // AUTO DETEKSI: Jika API Key Google Gemini (dimulai AIzaSy...)
    const isGemini = (provider === 'gemini') || API_KEY.startsWith('AIza') || API_KEY.startsWith('AQ.') || rawModel.toLowerCase().includes('gemini');

    // ============================================================
    // ENGINE 1: GOOGLE GEMINI (Kuota 1.000.000 Token/Menit Gratis)
    // ============================================================
    if (isGemini) {
        let primaryModel = (rawModel.includes('gemini-3.5') || rawModel.includes('gemini-3.1') || rawModel.includes('gemini-3.6')) ? rawModel : 'gemini-3.5-flash-lite';
        const modelsToTry = [primaryModel, 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'].filter((v, i, a) => a.indexOf(v) === i);

        for (let i = 0; i < modelsToTry.length; i++) {
            let geminiModel = modelsToTry[i];
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${API_KEY}`;

            const requestBody = {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: customMaxTokens ? Math.min(Math.max(customMaxTokens, 8192), 65536) : 32768
                }
            };
            if (systemMsg) {
                requestBody.systemInstruction = {
                    parts: [{ text: systemMsg }]
                };
            }

            try {
                let res = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    const errMsg = errData.error?.message || `Gemini API error (${res.status})`;
                    const isBusy = res.status === 503 || res.status === 429 || errMsg.toLowerCase().includes('high demand') || errMsg.toLowerCase().includes('temporar') || errMsg.toLowerCase().includes('overloaded');
                    if (isBusy && i < modelsToTry.length - 1) {
                        console.warn(`Model ${geminiModel} sedang padat, mencoba alternatif ${modelsToTry[i+1]}...`);
                        continue;
                    }
                    if (res.status === 400 || res.status === 401 || errMsg.toLowerCase().includes('api_key') || errMsg.toLowerCase().includes('key not valid')) {
                        if (currentRole === 'admin' || currentRole === 'kurikulum') {
                            const modal = document.getElementById('apiKeyModal');
                            if (modal) modal.classList.add('active');
                        } else {
                            if (typeof showToast === 'function') showToast("API Key Google Gemini belum valid. Hubungi Admin/Kurikulum.", "error");
                        }
                    }
                    throw new Error(errMsg);
                }
                const data = await res.json();
                const candidate = data.candidates && data.candidates[0];
                const outText = candidate?.content?.parts?.[0]?.text;
                return outText ? outText.trim() : null;
            } catch (e) {
                if (i === modelsToTry.length - 1) {
                    console.error("Gemini fetch error:", e);
                    if (typeof showToast === 'function') showToast(e.message || "Gagal memproses AI Gemini. Coba lagi.", "error");
                    return null;
                }
            }
        }
        return null;
    }

    // ============================================================
    // ENGINE 2: GROQ CLOUD (Fallback / Provider Groq)
    // ============================================================
    let GROQ_MODEL = typeof sanitizeGroqModel === 'function' ? sanitizeGroqModel(rawModel, 'groq') : 'qwen/qwen3.8-27b';
    let GROQ_API_KEY = API_KEY || "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";
    const url = "https://api.groq.com/openai/v1/chat/completions";
    let tokenLimit = customMaxTokens ? Math.min(customMaxTokens, 950) : 900;

    function _isGroqRateLimit(msg, status) {
        if (status === 429) return true;
        const lower = (msg || '').toLowerCase();
        return lower.includes('rate limit') || lower.includes('otpm') || lower.includes('tokens per minute') || lower.includes('too large');
    }

    async function _callGroq(model, maxTok) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + GROQ_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemMsg },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: maxTok
            })
        });
    }

    try {
        let res = await _callGroq(GROQ_MODEL, tokenLimit);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error?.message || "";
            if (_isGroqRateLimit(errMsg, res.status)) {
                if (typeof showToast === 'function') showToast("⏳ Kuota Groq per menit padat. Menunggu 20 detik...", "warning", 8000);
                await new Promise(r => setTimeout(r, 20000));
                res = await _callGroq(GROQ_MODEL, Math.min(tokenLimit, 600));
                if (!res.ok) throw new Error("Batas kuota AI per menit tercapai. Beralih ke Google Gemini di Pengaturan Sekolah untuk kuota 1 Juta token gratis!");
            } else if (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('model')) {
                GROQ_MODEL = 'qwen/qwen3.8-27b';
                res = await _callGroq(GROQ_MODEL, tokenLimit);
                if (!res.ok) throw new Error("Gagal memanggil API Groq");
            } else {
                throw new Error(errMsg || "Gagal memanggil API Groq");
            }
        }
        const data = await res.json();
        return data.choices && data.choices[0] ? data.choices[0].message.content.trim() : null;
    } catch (e) {
        console.error("fetchGroqAI error:", e);
        if (typeof showToast === 'function') showToast(e.message || "Gagal memproses AI. Coba lagi.", "error");
        return null;
    }
}


async function generateDraftSuratAI() {
    const perihal = document.getElementById('formSuratPerihal').value.trim();
    if (!perihal) {
        if (typeof showToast === 'function') showToast("Isi bagian 'Perihal' surat terlebih dahulu sebagai topik utama!", "error");
        else alert("Isi bagian 'Perihal' surat terlebih dahulu sebagai topik utama!");
        return;
    }

    const btn = document.querySelector('#btnDraftSuratAI');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Memproses AI...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah staf tata usaha (TU) di Sekolah Menengah Pertama Islam Terpadu (SMP IT) Al-Fathonah yang sangat ahli membuat draf Surat Resmi. Tugasmu membuat isi/badan surat yang baku, rapi, dan terstruktur berdasarkan topik/perihal yang diberikan pengguna.";
    const prompt = `Buatkan draf isi surat resmi sekolah (tidak perlu KOP Surat, cukup bagian paragraf pembuka, isi, dan penutup) berdasarkan Perihal berikut:\n\nPerihal: ${perihal}\n\nTulis dengan gaya bahasa formal, resmi, baku, dan profesional.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        document.getElementById('formSuratKeterangan').value = result;
        if (typeof showToast === 'function') showToast("Draf isi surat berhasil dibuat oleh AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateJurnalAI() {
    const judulMateri = document.getElementById('formProgressJudul').value.trim();
    if (!judulMateri) {
        if (typeof showToast === 'function') showToast("Silakan isi 'Judul Bab / Materi' terlebih dahulu!", "error");
        else alert("Silakan isi 'Judul Bab / Materi' terlebih dahulu!");
        return;
    }

    const btn = document.querySelector('#btnJurnalAI');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Memproses AI...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah guru profesional di SMP IT Al-Fathonah yang berpengalaman. Tugasmu adalah merancang deskripsi singkat Kegiatan Belajar Mengajar (KBM) untuk diisi ke dalam Jurnal Mengajar. Buatlah deskripsi yang rapi, mencakup pendahuluan, inti, dan penutup (seperti RPP singkat).";
    const prompt = `Buatkan catatan Jurnal Mengajar (1 paragraf padat atau beberapa poin singkat) berdasarkan materi/judul berikut:\n\nMateri: ${judulMateri}\n\nTuliskan HANYA isi catatannya saja, tanpa salam atau basa-basi.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        document.getElementById('formProgressCatatan').value = result;
        if (typeof showToast === 'function') showToast("Deskripsi Jurnal berhasil dikembangkan oleh AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function enhancePengumumanAI() {
    const isiEl = document.getElementById('pengumumanIsi');
    const text = isiEl.value.trim();
    if (!text) {
        if (typeof showToast === 'function') showToast("Ketikkan ide kasar pengumuman terlebih dahulu!", "error");
        else alert("Ketikkan ide kasar pengumuman terlebih dahulu!");
        return;
    }

    const btn = document.querySelector('button[onclick="enhancePengumumanAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Memproses...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah staf Tata Usaha Sekolah yang sangat profesional. Tugasmu merombak/memperbaiki kalimat mentah menjadi PENGUMUMAN SEKOLAH RESMI yang baku, sopan, jelas, dan profesional.";
    const prompt = `Tulis ulang teks berikut menjadi paragraf pengumuman sekolah yang sangat rapi:\n\n"${text}"\n\nTuliskan HANYA isi pengumumannya saja, tanpa salam pembuka surat atau basa-basi.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        isiEl.value = result;
        if (typeof showToast === 'function') showToast("Teks pengumuman berhasil diperbagus AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateBeritaAI() {
    const ringkasanEl = document.getElementById('beritaRingkasan');
    const text = ringkasanEl.value.trim();
    const judul = document.getElementById('beritaJudul').value.trim();

    if (!text && !judul) {
        if (typeof showToast === 'function') showToast("Ketikkan judul atau poin berita terlebih dahulu!", "error");
        return;
    }

    const btn = document.querySelector('button[onclick="generateBeritaAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Auto-Tulis...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah jurnalis dan humas sekolah yang ahli. Tugasmu merangkai poin-poin menjadi satu atau dua paragraf berita kegiatan sekolah yang bergaya jurnalistik, menarik, positif, dan siap rilis di website.";
    const prompt = `Buatkan paragraf berita sekolah (maksimal 2 paragraf).\nJudul: ${judul}\nPoin/Draft: ${text}\n\nBerikan HANYA teks beritanya saja tanpa judul atau basa-basi.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        ringkasanEl.value = result;
        if (typeof showToast === 'function') showToast("Berita berhasil dirangkai AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateSoalAI() {
    var promptInput = document.getElementById('aiPromptInput');
    var resultArea = document.getElementById('aiTextarea');
    var text = promptInput ? promptInput.value.trim() : '';
    if (!text) {
        if (typeof showToast === 'function') showToast("Ketikkan perintah/topik di kotak 'Perintah untuk AI' terlebih dahulu!", "error");
        return;
    }

    const tingkatKesulitanEl = document.getElementById('aiKesulitan');
    const tingkatKesulitan = tingkatKesulitanEl ? tingkatKesulitanEl.value : "MOTS";
    let instruksiKesulitan = "";

    if (tingkatKesulitan === "HOTS") {
        instruksiKesulitan = "SANGAT PENTING: Buat soal dengan tingkat kesulitan HOTS (High Order Thinking Skills). Soal harus berupa analisis, evaluasi, sintesis kasus, atau problem solving. Hindari pertanyaan hafalan dasar (apa, siapa, kapan).";
    } else if (tingkatKesulitan === "LOTS") {
        instruksiKesulitan = "SANGAT PENTING: Buat soal dengan tingkat kesulitan LOTS (Low Order Thinking Skills). Fokus pada hafalan dasar, ingatan, pemahaman dasar (pertanyaan apa, siapa, kapan, di mana, sebutkan).";
    } else {
        instruksiKesulitan = "SANGAT PENTING: Buat soal dengan tingkat kesulitan MOTS (Medium Order Thinking Skills). Campur antara ingatan dan pemahaman konsep yang wajar.";
    }

    const btn = document.querySelector('button[onclick="generateSoalAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:14px;height:14px;"></i> Menyusun...`;
    btn.disabled = true;

    // Hitung nomor soal terakhir dari naskah yang sudah ada
    var existingText = resultArea ? resultArea.value.trim() : '';
    var lastNum = 0;
    if (existingText) {
        var numMatches = existingText.match(/^\s*(\d+)\s*\./gm);
        if (numMatches) {
            numMatches.forEach(function (m) {
                var n = parseInt(m);
                if (n > lastNum) lastNum = n;
            });
        }
    }
    var startNum = lastNum + 1;

    const systemMsg = `Kamu adalah Guru Ahli yang mahir membuat instrumen soal ujian standar sekolah (SMP/SMA).
Tugasmu adalah membuatkan soal berdasarkan Topik/Materi yang diketik oleh pengguna.
${instruksiKesulitan}

PENTING: Nomor soal HARUS DIMULAI DARI NOMOR ${startNum}. Jangan mulai dari 1 jika diminta mulai dari nomor lain.

Kamu HARUS menuliskan soal dengan FORMAT YANG SANGAT KETAT di bawah ini, karena outputmu akan dibaca secara otomatis oleh program parser (Regex).

ATURAN FORMAT PILIHAN GANDA (Wajib pakai A, B, C, D bertingkat):
1. [Pertanyaan]
A. [Opsi A]
B. [Opsi B]
C. [Opsi C]
D. [Opsi D]
Kunci: [A/B/C/D]

ATURAN FORMAT ESSAY (Tanpa A,B,C,D sama sekali):
1. [Pertanyaan Essay]
Kunci Jawaban: [kata kunci 1], [kata kunci 2], [kata kunci 3]

ATURAN KUNCI JAWABAN ESSAY (SANGAT PENTING):
- Kunci jawaban essay HARUS berupa daftar kata kunci yang dipisahkan KOMA.
- Jika ada kata-kata yang memiliki sinonim atau variasi jawaban yang sama-sama benar, pisahkan dengan tanda [OR].
- Contoh format benar: "fotosintesis, klorofil, sinar matahari [OR] cahaya matahari, karbon dioksida [OR] CO2"
- Contoh lain: "Soekarno [OR] Ir. Soekarno, proklamasi, 17 Agustus 1945"
- Jangan tulis kunci jawaban dalam bentuk kalimat panjang. Harus berupa kata kunci pendek yang terpisah koma.

Jangan tambahkan teks pengantar apapun selain soal dan jawaban. Pastikan setiap pilihan jawaban salah (distraktor) pada Pilihan Ganda cukup mengecoh dan logis.

ATURAN BAHASA ARAB / AL-QUR'AN (JIKA DIMINTA):
- Jika pengguna meminta soal PAI, Bahasa Arab, Tahsin, atau mencantumkan ayat Al-Qur'an/Hadits, kamu WAJIB menuliskan teks Arabnya dengan BENAR, LENGKAP dengan HARAKAT.
- Tuliskan teks Arab dengan rapi, misalnya: بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ.
- Pertahankan struktur arah teks agar tidak rusak saat di-parse.`;

    const prompt = `Buatkan naskah soal ujian LENGKAP tanpa terpotong berdasarkan materi/topik/perintah berikut:\n\n"${text}"\n\nSANGAT PENTING (ATURAN JUMLAH & KELENGKAPAN SOAL):\n- Nomor soal WAJIB dimulai dari nomor ${startNum}.\n- SANGAT PENTING: Jika pengguna meminta jumlah soal tertentu (misal: "35 PG dan 5 essay", "50 soal PG", "100 soal", dsb.), kamu WAJIB MEMBUAT SEMUA SOAL SEJUMLAH YANG DIMINTA LENGKAP TANPA TERLEWAT SATU NOMOR PUN HINGGA NOMOR TERAKHIR (misal 35 PG lengkap nomor 1 s/d 35, lalu 5 essay lengkap nomor 36 s/d 40).\n- DILARANG KERAS MEMOTONG, HANYA MEMBERI CONTOH SEBAGIAN, ATAU BERHENTI DI TENGAH JALAN! Kuota token sangat besar (65.000+ token), jadi tuliskan seluruh butir soal sampai tuntas. Buat setiap soal lengkap dengan opsi A, B, C, D dan baris Kunci: X untuk PG, serta pertanyaan dan Kunci Jawaban: untuk Essay.\n- Jika pengguna TIDAK menyebutkan jumlahnya secara spesifik, maka buatkan standar: 10 soal Pilihan Ganda dan 3 soal Essay.\n\nGunakan format yang sudah saya instruksikan dengan sangat ketat!`;

    const result = await fetchGroqAI(prompt, systemMsg, 65536);
    if (result) {
        // Append ke naskah yang sudah ada
        if (existingText) {
            resultArea.value = existingText + '\n\n' + result;
        } else {
            resultArea.value = result;
        }
        if (typeof showToast === 'function') showToast(`Soal (${tingkatKesulitan}) berhasil ditambahkan! Total naskah bertambah. Silakan cek pratinjau.`, "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateCeritaAI() {
    var promptInput = document.getElementById('aiPromptInput');
    var resultArea = document.getElementById('aiTextarea');
    var text = promptInput ? promptInput.value.trim() : '';
    if (!text) {
        if (typeof showToast === 'function') showToast("Ketikkan ide atau tema cerita terlebih dahulu di kotak 'Perintah untuk AI'!", "error");
        return;
    }

    const btn = document.querySelector('button[onclick="generateCeritaAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:14px;height:14px;"></i> Membuat Teks...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah penulis cerita, literasi, atau artikel pendidikan yang andal. Tugasmu membuat satu teks bacaan (panjang sekitar 2-3 paragraf) berdasarkan tema yang diminta guru. Teks ini nantinya akan digunakan sebagai bahan soal Reading Comprehension/Literasi siswa SMP/SMA.";
    const prompt = `Buatkan teks bacaan yang menarik berdasarkan tema/ide berikut:\n\n"${text}"\n\nTuliskan HANYA teks ceritanya saja, tanpa teks awalan/akhiran.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        var existing = resultArea ? resultArea.value.trim() : '';
        if (existing) {
            resultArea.value = existing + '\n\n' + result;
        } else {
            resultArea.value = result;
        }
        if (typeof showToast === 'function') showToast("Teks bacaan berhasil dibuat! Sekarang Anda bisa klik 'Generate Pakai AI' untuk membuat soal dari teks ini.", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function rapikanEjaanAI() {
    // Deteksi panel mana yang aktif: parse atau ai
    var parseArea = document.getElementById('asesmenParseArea');
    var aiArea = document.getElementById('asesmenAIGenerateArea');
    var textareaId = 'parseTextarea'; // default
    if (aiArea && aiArea.style.display === 'block') {
        textareaId = 'aiTextarea';
    }

    const area = document.getElementById(textareaId);
    const text = area.value.trim();
    if (!text) {
        if (typeof showToast === 'function') showToast("Kotak teks masih kosong!", "error");
        return;
    }

    const btn = event ? event.target.closest('button') : document.querySelector('button[onclick="rapikanEjaanAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:14px;height:14px;"></i> Merapikan...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah Editor Naskah Profesional. Tugasmu memperbaiki ejaan (EYD/PUEBI), typo, dan format teks soal ujian, TANPA mengubah makna pertanyaannya sedikit pun. SANGAT PENTING: JANGAN ADA SOAL YANG DIHAPUS ATAU DILEWATI. Tulis ulang SEMUA soal (baik Pilihan Ganda beserta opsi A,B,C,D maupun Essay) secara LENGKAP dari awal hingga akhir tanpa merangkum. Pastikan hasil akhir menggunakan ejaan Bahasa Indonesia yang benar dan formatnya rapi.";
    const prompt = `Rapikan ejaan dan tata letak keseluruhan teks naskah ujian berikut. PENTING: JANGAN MEMOTONG, MENGHAPUS, ATAU MELEWATI SOAL APAPUN. Semua nomor soal harus utuh!\n\n${text}\n\nBerikan HANYA teks naskah utuh hasil perbaikannya saja.`;

    const estTokens = Math.max(4096, Math.ceil(text.length * 2));
    const result = await fetchGroqAI(prompt, systemMsg, estTokens);
    if (result) {
        area.value = result;
        if (typeof showToast === 'function') showToast("Ejaan teks berhasil dirapikan!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

function resetAINaskah() {
    showCustomConfirm('Reset Naskah?', 'Semua naskah soal di kotak hasil akan dihapus. Anda harus generate ulang dari awal. Lanjutkan?', 'Ya, Reset', function () {
        var area = document.getElementById('aiTextarea');
        if (area) area.value = '';
        showToast('Naskah soal berhasil direset.', 'success');
    });
}


/* ============================================================
   MODUL MANAJEMEN KEUANGAN BENDAHARA
   ============================================================ */

let dKeuanganInsidental = [];
let dPembayaranSiswa = [];

async function fetchKeuanganData() {
    try {
        // Fetch kategori insidental
        const resKat = await supabaseClient.from('keuangan_kategori').select('*').order('created_at', { ascending: false });
        if (resKat.data) {
            dKeuanganInsidental = resKat.data;
        }

        // Fetch pembayaran
        const resPem = await supabaseClient.from('keuangan_pembayaran').select('*').order('created_at', { ascending: true });
        if (resPem.data) {
            // Rebuild dPembayaranSiswa structure
            let grouped = {};
            resPem.data.forEach(p => {
                let key = p.id_siswa + '_' + p.jenis;
                if (!grouped[key]) {
                    grouped[key] = { idSiswa: p.id_siswa, jenis: p.jenis, riwayat: [] };
                }
                grouped[key].riwayat.push({
                    id_pembayaran: p.id,
                    tanggal: p.tanggal,
                    nominal: parseInt(p.nominal),
                    ket: p.keterangan || ''
                });
            });
            dPembayaranSiswa = Object.values(grouped);
        }
    } catch (e) {
        console.error('Failed to fetch keuangan data:', e);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient !== 'undefined') fetchKeuanganData();
});

function getSiswaForKeuangan(filterKelas = '') {
    if (typeof siswaList === 'undefined') return [];

    // Convert DB structure to what the financial module expects
    let list = siswaList.filter(s => s.status === 'Aktif').map(s => {
        return {
            id: s.id,
            namaLengkap: s.nama_lengkap || '-',
            kelas: s.master_kelas ? s.master_kelas.nama_kelas : (s.kelas_id || '-'),
            statusSiswa: s.status
        };
    });

    if (filterKelas && filterKelas !== 'Semua Kelas') {
        list = list.filter(s => s.kelas === filterKelas);
    }
    return list;
}

function hitungTotalTerbayar(idSiswa, jenis) {
    let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
    if (!rec) return 0;
    return rec.riwayat.reduce((sum, item) => sum + parseInt(item.nominal), 0);
}

function hitungTotalTagihan(jenis) {
    if (jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
        let parts = jenis.split('_');
        let idKat = parts.slice(1).join('_');
        let cat = dKeuanganInsidental.find(c => c.id === idKat);
        return cat ? cat.nominal : 0;
    }
    return 0;
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(angka);
}

