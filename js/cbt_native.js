// ==========================================
// CBT NATIVE MODULE (GURU & SISWA)
// Fully featured: Timer, Auto-save, Grading,
// Navigation, Anti-Cheat, Fullscreen UI
// ==========================================

var cbtInterval = null;
var cbtAutoSaveInterval = null;
var cbtTokenInterval = null;
var cbtSoalListCache = [];
var cbtJawabanMap = {};
var cbtCurrentSoalIndex = 0;
var cbtSesiId = '';
var cbtAsesmenId = '';
var cbtJawabanId = '';
var cbtWaktuMenit = 0;
var cbtDeadline = null;
var cbtTabSwitchCount = 0;
var cbtSiswaId = '';

// ================= GURU: MONITOR CBT =================
async function openMonitorCbt(asesmenId) {
    showGlobalLoader('Memuat data CBT...');
    try {
        // Cek apakah ada sesi aktif (ambil yang terbaru)
        const { data: sesiList, error } = await supabaseClient.from('cbt_sesi_ujian')
            .select('*').eq('asesmen_id', asesmenId).order('created_at', { ascending: false }).limit(1);

        var sesi = (sesiList && sesiList.length > 0) ? sesiList[0] : null;

        // Cek info asesmen lengkap dengan waktu selesai ujian
        const { data: asm } = await supabaseClient.from('asesmen')
            .select('id, judul, mata_pelajaran, kelas, waktu_menit, waktu_mulai_ujian, waktu_selesai_ujian, ujian_aktif')
            .eq('id', asesmenId).single();

        window._cbtMonitorAsesmenId = asesmenId;
        window._cbtMonitorAsm = asm;
        window._cbtMonitorSesi = sesi;

        // Jika sesi masih berstatus 'berjalan' tapi waktu_selesai_ujian sudah lewat, otomatis akhiri langsung
        // KECUALI jika masih ada siswa yang sedang mengerjakan dan memiliki tambahan waktu (kompensasi teknis)
        if (sesi && sesi.status === 'berjalan' && asm && asm.waktu_selesai_ujian) {
            if (new Date() >= new Date(asm.waktu_selesai_ujian)) {
                var hasActiveCompensated = false;
                try {
                    const { data: actJwb } = await supabaseClient.from('cbt_jawaban_siswa')
                        .select('id, tambahan_waktu_menit, waktu_mulai_mengerjakan')
                        .eq('sesi_id', sesi.id)
                        .eq('status', 'mengerjakan')
                        .gt('tambahan_waktu_menit', 0);
                    if (actJwb && actJwb.length > 0) {
                        var nowT = Date.now();
                        for (var aj of actJwb) {
                            var extMs = (parseInt(aj.tambahan_waktu_menit) || 0) * 60000;
                            var sMulai = aj.waktu_mulai_mengerjakan ? new Date(aj.waktu_mulai_mengerjakan).getTime() : new Date(asm.waktu_selesai_ujian).getTime();
                            var baseLim = Math.min(sMulai + (parseInt(asm.waktu_menit || 60) * 60000), new Date(asm.waktu_selesai_ujian).getTime());
                            if (nowT < (baseLim + extMs)) {
                                hasActiveCompensated = true;
                                break;
                            }
                        }
                    }
                } catch (eCek) { }

                if (!hasActiveCompensated) {
                    await cbtAutoEndSesiImmediate(sesi.id, asesmenId);
                    sesi.status = 'selesai';
                }
            }
        }

        var infoHtml = '';
        if (asm) {
            var jadwalTutupInfo = '';
            if (asm.waktu_selesai_ujian) {
                var dtTutup = new Date(asm.waktu_selesai_ujian);
                jadwalTutupInfo = ' • <span style="color:#b45309;font-weight:700;">⏰ Ditutup Pukul ' + dtTutup.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB</span>';
            }
            infoHtml = '<div style="margin-bottom:1rem;padding:1rem;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;border:1px solid #bae6fd;">' +
                '<div style="font-weight:700;color:#0369a1;font-size:1rem;">' + asm.judul + '</div>' +
                '<div style="font-size:.85rem;color:#0c4a6e;margin-top:.3rem;">' + asm.mata_pelajaran + ' — ' + asm.kelas + ' — ' + asm.waktu_menit + ' menit' + jadwalTutupInfo + '</div>' +
                '</div>';
        }

        var tokenHtml = '';
        if (sesi && sesi.status === 'berjalan') {
            tokenHtml = '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7); padding:1.2rem; border-radius:14px; text-align:center; margin-bottom:1rem; border:1px solid #86efac;">' +
                '<p style="margin:0; font-size:0.85rem; color:#166534;">Token Ujian Aktif:</p>' +
                '<h2 id="monitorCbtTokenDisplay" style="margin:.4rem 0; color:#15803d; letter-spacing:6px; font-size:2.2rem; font-family:monospace; font-weight:900;">' + sesi.token + '</h2>' +
                '<div id="monitorCbtTokenCountdown" style="font-size:0.85rem; color:#166534; margin-bottom:.5rem; font-weight:600;">Memeriksa jadwal sesi...</div>' +
                '<div style="display:flex; gap:.5rem; justify-content:center; margin-top:.8rem;">' +
                '<button class="btn btn-sm" onclick="copyTokenCbt(document.getElementById(\'monitorCbtTokenDisplay\').innerText)" style="background:#16a34a;color:white;border:none;font-size:.8rem;padding:.4rem .8rem;border-radius:8px;"><i data-lucide="copy" style="width:13px;height:13px"></i> Salin Token</button>' +
                '<button class="btn btn-sm" onclick="stopSesiCbt(\'' + sesi.id + '\',\'' + asesmenId + '\')" style="background:#dc2626;color:white;border:none;font-size:.8rem;padding:.4rem .8rem;border-radius:8px;"><i data-lucide="square" style="width:13px;height:13px"></i> Akhiri Sesi</button>' +
                '</div></div>';
        } else if (sesi && sesi.status === 'selesai') {
            tokenHtml = '<div style="background:#f1f5f9; padding:1rem; border-radius:12px; text-align:center; margin-bottom:1rem; border:1px solid #cbd5e1;">' +
                '<p style="margin:0; font-size:.85rem; color:#64748b;">Sesi sebelumnya: <strong>' + sesi.token + '</strong> (Selesai/Ditutup)</p>' +
                '<button class="btn btn-sm btn-primary" onclick="generateSesiCbt(\'' + asesmenId + '\')" style="margin-top:.5rem;font-size:.8rem;padding:.4rem 1rem;border-radius:8px;"><i data-lucide="plus" style="width:13px;height:13px"></i> Buat Sesi Baru</button>' +
                '</div>';
        } else {
            tokenHtml = '<div style="text-align:center; margin-bottom:1rem; padding:1.5rem; background:#fef3c7; border-radius:12px; border:1px solid #fcd34d;">' +
                '<p style="margin:0 0 .5rem 0; color:#92400e; font-size:.9rem; font-weight:600;">Belum ada sesi ujian aktif</p>' +
                '<button class="btn btn-primary" onclick="generateSesiCbt(\'' + asesmenId + '\')" style="padding:.5rem 1.5rem; font-size:.9rem; border-radius:10px;"><i data-lucide="zap" style="width:15px;height:15px"></i> Mulai Sesi & Buat Token</button>' +
                '</div>';
        }

        var monitorSesiId = (sesi && sesi.status === 'berjalan') ? sesi.id : '';
        var latestSesiId = sesi ? sesi.id : '';

        // Tampilkan Modal Monitor CBT
        var topGrid = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:1.5rem;">' + infoHtml + tokenHtml + '</div>';
        var content = topGrid +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:.75rem;">' +
            '<div><h4 style="margin:0; font-size:1.05rem; font-weight:700; color:#1e293b;">Daftar Peserta & Progres Pengerjaan</h4><p style="margin:0.2rem 0 0; font-size:0.8rem; color:#64748b;">Pantau live status pengerjaan, deteksi kecurangan (pindah tab), dan skor siswa</p></div>' +
            '<div style="display:flex; gap:.5rem; flex-wrap:wrap;">' +
            '<button class="btn btn-sm" onclick="openAnalisisButirSoalCbt(\'' + asesmenId + '\')" style="font-size:.82rem; padding:.4rem .9rem; border-radius:8px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; border:none; font-weight:700; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(99,102,241,.25);"><i data-lucide="bar-chart-2" style="width:14px;height:14px"></i> Analisis Butir Soal</button>' +
            '<button class="btn btn-sm btn-outline" onclick="refreshMonitorCbt(\'' + latestSesiId + '\')" style="font-size:.82rem; padding:.4rem .8rem; border-radius:8px;"><i data-lucide="refresh-cw" style="width:14px;height:14px"></i> Refresh Data</button>' +
            '<button class="btn btn-sm" onclick="kirimSemuaNilaiCbt(\'' + asesmenId + '\',\'' + latestSesiId + '\')" style="font-size:.82rem; padding:.4rem 1rem; border-radius:8px; background:#059669; color:white; border:none; font-weight:600;"><i data-lucide="send" style="width:14px;height:14px"></i> Kirim Semua Nilai</button>' +
            '</div></div>' +
            '<div style="overflow-x:auto; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);">' +
            '<table class="dash-table" style="margin:0; width:100%;">' +
            '<thead><tr><th style="width:40px;text-align:center;">No</th><th>Nama Siswa</th><th>Waktu Mulai</th><th style="width:120px;">Status</th><th style="width:110px;">Pelanggaran</th><th style="width:90px;text-align:center;">Nilai</th><th style="width:110px;text-align:center;">Aksi</th></tr></thead>' +
            '<tbody id="cbtMonitorTbody"><tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">Klik Refresh untuk memuat data peserta</td></tr></tbody>' +
            '</table></div>';

        // Store asesmenId for kirim nilai
        window._cbtMonitorAsesmenId = asesmenId;

        var modal = document.getElementById('monitorCbtModal');
        var body = document.getElementById('monitorCbtModalBody');
        if (modal && body) {
            body.innerHTML = content;
            modal.style.display = 'flex';
            modal.classList.add('active');
        } else {
            showNotifModal('Monitor CBT', content, 'info');
        }
        if (window.lucide) lucide.createIcons();

        if (cbtTokenInterval) clearInterval(cbtTokenInterval);

        if (monitorSesiId) {
            refreshMonitorCbt(monitorSesiId);
            // Jalankan cek countdown & jadwal langsung lalu interval tiap 1 detik
            checkAndRotateToken(monitorSesiId);
            cbtTokenInterval = setInterval(function() {
                checkAndRotateToken(monitorSesiId);
            }, 1000);
        } else if (latestSesiId) {
            refreshMonitorCbt(latestSesiId);
        }

    } catch (e) {
        showToast('Gagal memuat CBT: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

// Cek sisa waktu sesi dan otomatis tutup jika waktu berakhir
function checkAndRotateToken(sesiId) {
    var countdownEl = document.getElementById('monitorCbtTokenCountdown');
    if (!countdownEl || !window._cbtMonitorAsm) return;

    var asm = window._cbtMonitorAsm;
    var selesaiStr = asm.waktu_selesai_ujian;

    if (selesaiStr) {
        var selesaiTime = new Date(selesaiStr).getTime();
        var now = Date.now();
        var diff = selesaiTime - now;

        if (diff <= 0) {
            countdownEl.innerHTML = '<span style="color:#dc2626;font-weight:800;background:#fee2e2;padding:3px 8px;border-radius:6px;">⚠️ WAKTU SESI UJIAN HABIS! Menutup sesi...</span>';
            if (cbtTokenInterval) {
                clearInterval(cbtTokenInterval);
                cbtTokenInterval = null;
            }
            cbtAutoEndSesiImmediate(sesiId, asm.id).then(function() {
                showToast('Waktu sesi ujian telah berakhir. Sesi otomatis ditutup.', 'info');
                openMonitorCbt(asm.id);
            });
            return;
        }

        var hours = Math.floor(diff / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);
        var timeFormatted = (hours > 0 ? hours + 'j ' : '') + minutes + 'm ' + String(seconds).padStart(2, '0') + 'd';

        var jamSelesaiDisplay = new Date(selesaiStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        var color = diff < 300000 ? '#dc2626' : (diff < 900000 ? '#b45309' : '#15803d');
        countdownEl.innerHTML = '⏰ Selesai Pukul <strong>' + jamSelesaiDisplay + ' WIB</strong> (Sisa: <strong style="color:' + color + ';">' + timeFormatted + '</strong>)';
    } else {
        countdownEl.innerHTML = '<span style="color:#64748b;">Mode Manual (Sesi aktif sampai ditutup manual)</span>';
    }
}

function closeMonitorCbtModal() {
    var modal = document.getElementById('monitorCbtModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    if (cbtTokenInterval) {
        clearInterval(cbtTokenInterval);
        cbtTokenInterval = null;
    }
}

if (!window._escListenerAttached) {
    window._escListenerAttached = true;
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var modal = document.getElementById('monitorCbtModal');
            if (modal && modal.style.display !== 'none' && modal.classList.contains('active')) {
                closeMonitorCbtModal();
            }
        }
    });
}

function copyTokenCbt(token) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(token);
        showToast('Token ' + token + ' berhasil disalin!', 'success');
    } else {
        prompt('Salin token ini:', token);
    }
}

function generateRandomToken() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var token = '';
    for (var i = 0; i < 6; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

async function generateSesiCbt(asesmenId) {
    // Popup untuk input Jam Selesai sebelum mulai sesi
    var overlay = document.createElement('div');
    overlay.id = 'cbtStartOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:fadeIn .3s ease;';
    overlay.innerHTML = '<div style="background:white;border-radius:20px;padding:2rem;width:90%;max-width:420px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.25);">' +
        '<div style="width:60px;height:60px;background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto .8rem;"><i data-lucide="timer" style="width:28px;height:28px;color:white;"></i></div>' +
        '<h3 style="margin:0 0 .3rem;font-size:1.2rem;color:#1e293b;">Mulai Sesi Ujian CBT</h3>' +
        '<p style="margin:0 0 1.2rem;font-size:.85rem;color:#64748b;">Token acak akan dibuat otomatis. Atur jam berhenti agar ujian otomatis ditutup.</p>' +
        '<div style="text-align:left;margin-bottom:1rem;">' +
        '<label style="font-size:.82rem;font-weight:700;color:#475569;display:block;margin-bottom:.4rem;">⏰ Jam Ujian Ditutup Otomatis (Opsional)</label>' +
        '<input type="time" id="cbtJamSelesaiInput" class="form-input" style="width:100%;height:44px;border-radius:10px;font-weight:600;font-size:1rem;text-align:center;" />' +
        '<p style="font-size:.75rem;color:#94a3b8;margin:.4rem 0 0;">Kosongkan jika ingin mengakhiri sesi secara manual.</p>' +
        '</div>' +
        '<div style="display:flex;gap:.8rem;margin-top:1.5rem;">' +
        '<button onclick="document.getElementById(\'cbtStartOverlay\').remove();" class="btn btn-outline" style="flex:1;padding:.6rem;border-radius:10px;">Batal</button>' +
        '<button onclick="konfirmasiMulaiSesiCbt(\'' + asesmenId + '\')" class="btn btn-primary" style="flex:1;padding:.6rem;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);border:none;font-weight:700;">🚀 Mulai Sesi</button>' +
        '</div></div>';
    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();
}

async function konfirmasiMulaiSesiCbt(asesmenId) {
    var jamSelesaiEl = document.getElementById('cbtJamSelesaiInput');
    var jamSelesai = jamSelesaiEl ? jamSelesaiEl.value : '';
    var ov = document.getElementById('cbtStartOverlay');
    if (ov) ov.remove();

    var token = generateRandomToken();
    try {
        showGlobalLoader('Membuat sesi ujian...');

        // Hitung waktu_selesai_ujian dari jam input
        var waktuSelesai = null;
        if (jamSelesai) {
            var today = new Date();
            var parts = jamSelesai.split(':');
            today.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
            // Jika jam sudah lewat, anggap besok
            if (today <= new Date()) {
                today.setDate(today.getDate() + 1);
            }
            waktuSelesai = today.toISOString();
        }

        // 1. Insert sesi CBT
        const { error } = await supabaseClient.from('cbt_sesi_ujian').insert({
            asesmen_id: asesmenId,
            token: token,
            status: 'berjalan',
            waktu_mulai: new Date().toISOString(),
            token_rotated_at: new Date().toISOString(),
            token_rotation_interval: 10
        });
        if (error) throw error;

        // 2. Set ujian_aktif = true + simpan waktu
        var updatePayload = {
            ujian_aktif: true,
            waktu_mulai_ujian: new Date().toISOString()
        };
        if (waktuSelesai) updatePayload.waktu_selesai_ujian = waktuSelesai;
        
        await supabaseClient.from('asesmen').update(updatePayload).eq('id', asesmenId);

        closeNotifModal();
        openMonitorCbt(asesmenId);
    } catch (e) {
        showToast('Gagal membuat sesi: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function stopSesiCbt(sesiId, asesmenId) {
    showCustomConfirm(
        'Akhiri Sesi Ujian?',
        'Semua siswa yang <strong>masih mengerjakan</strong> akan otomatis dikumpulkan dan nilainya dihitung. Pastikan semua siswa sudah selesai sebelum menutup sesi.',
        'Ya, Akhiri',
        async function () {
            try {
                showGlobalLoader('Menutup sesi ujian...');
                await supabaseClient.from('cbt_sesi_ujian').update({
                    status: 'selesai',
                    waktu_selesai: new Date().toISOString()
                }).eq('id', sesiId);

                // Auto kumpul & grading siswa yg belum selesai
                const { data: pending } = await supabaseClient.from('cbt_jawaban_siswa')
                    .select('*').eq('sesi_id', sesiId).eq('status', 'mengerjakan');

                if (pending && pending.length > 0) {
                    // Get asesmen info for grading
                    const { data: asm } = await supabaseClient.from('asesmen').select('id, bobot_pg, bobot_essay')
                        .eq('id', asesmenId).single();
                    const { data: soalList } = await supabaseClient.from('asesmen_soal').select('*')
                        .eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });

                    for (var p = 0; p < pending.length; p++) {
                        var nilai = hitungNilaiCbt(pending[p].jawaban_json || {}, soalList || [], asm);
                        await supabaseClient.from('cbt_jawaban_siswa').update({
                            status: 'selesai',
                            nilai: nilai,
                            waktu_kumpul: new Date().toISOString()
                        }).eq('id', pending[p].id);
                        if (typeof _syncSingleCbtNilai === 'function') {
                            try { await _syncSingleCbtNilai(pending[p].id); } catch(errSync) { console.warn('Auto sync nilai cbt error:', errSync); }
                        }
                    }
                }

                // Set ujian_aktif = false pada asesmen
                await supabaseClient.from('asesmen').update({
                    ujian_aktif: false
                }).eq('id', asesmenId);

                closeNotifModal();
                showToast('Sesi CBT ditutup! Semua jawaban dikumpulkan.', 'success');
                if (typeof loadAsesmenList === 'function') loadAsesmenList();
            } catch (e) {
                showToast('Gagal menutup sesi: ' + e.message, 'error');
            } finally {
                hideGlobalLoader();
            }
        }
    );
}

async function refreshMonitorCbt(sesiId) {
    if (!sesiId) return;
    var tbody = document.getElementById('cbtMonitorTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1rem;color:var(--text-light);">Memuat data peserta...</td></tr>';
    try {
        // Get sesi info for tanggal_pelaksanaan comparison and kelas
        const { data: sesiInfo } = await supabaseClient.from('cbt_sesi_ujian')
            .select('asesmen_id, created_at').eq('id', sesiId).single();
        var sesiDate = sesiInfo ? new Date(sesiInfo.created_at).toDateString() : null;
        var kelasName = null;
        if (sesiInfo && sesiInfo.asesmen_id) {
            const { data: asmK } = await supabaseClient.from('asesmen')
                .select('kelas').eq('id', sesiInfo.asesmen_id).maybeSingle();
            if (asmK) kelasName = asmK.kelas;
        }

        const { data: allSiswa } = await supabaseClient.from('siswa')
            .select('id, nama_lengkap, master_kelas(nama_kelas)')
            .in('status', ['Aktif', 'Pindahan']);

        const { data: jawaban, error } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('*')
            .eq('sesi_id', sesiId);
        if (error) throw error;

        var classStudents = [];
        if (kelasName && allSiswa) {
            classStudents = allSiswa.filter(s => s.master_kelas && s.master_kelas.nama_kelas === kelasName);
        } else if (allSiswa) {
            classStudents = allSiswa;
        }

        // Susun ulang data: gabungkan classStudents dengan jawaban
        var data = classStudents.map(function(siswa) {
            var jaw = (jawaban || []).find(j => j.siswa_id === siswa.id);
            if (jaw) {
                jaw.siswa = { nama_lengkap: siswa.nama_lengkap };
                return jaw;
            } else {
                return {
                    id: null,
                    siswa_id: siswa.id,
                    siswa: { nama_lengkap: siswa.nama_lengkap },
                    status: 'belum_mulai',
                    tab_switch_count: 0,
                    nilai: null
                };
            }
        });

        // Masukkan juga siswa yang sudah ada di tabel jawaban tapi mungkin beda kelas di master data
        if (jawaban && jawaban.length > 0) {
            jawaban.forEach(function(j) {
                var exists = data.find(function(d) { return d.siswa_id === j.siswa_id; });
                if (!exists) {
                    var sObj = (allSiswa || []).find(function(s) { return s.id === j.siswa_id; });
                    j.siswa = { nama_lengkap: sObj ? sObj.nama_lengkap : 'Siswa' };
                    data.push(j);
                }
            });
        }

        // Sort: Mengerjakan, Belum Mulai, Selesai, Diblokir
        data.sort(function(a, b) {
            var order = { 'mengerjakan': 1, 'belum_mulai': 2, 'selesai': 3, 'diblokir': 4 };
            var oa = order[a.status] || 5;
            var ob = order[b.status] || 5;
            if (oa === ob) {
                var na = a.siswa ? a.siswa.nama_lengkap : '';
                var nb = b.siswa ? b.siswa.nama_lengkap : '';
                return na.localeCompare(nb);
            }
            return oa - ob;
        });

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-light);"><i data-lucide="users" style="width:20px;height:20px;margin-right:6px;vertical-align:middle;"></i>Tidak ada siswa di kelas ini.</td></tr>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Detect susulan: students who joined in a different session date
        tbody.innerHTML = data.map(function (d, idx) {
            var nama = d.siswa ? d.siswa.nama_lengkap : 'Unknown';
            var mulai = d.waktu_mulai_mengerjakan ? new Date(d.waktu_mulai_mengerjakan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            var tabSwitch = d.tab_switch_count || 0;
            var isCheatLocked = (tabSwitch > 3) || (d.is_cheat_submitted === true) || (d.jawaban_json && d.jawaban_json._is_cheat_submitted === true);
            var pelanggaran = tabSwitch > 0
                ? '<span style="color:#dc2626;font-weight:700;">' + tabSwitch + 'x' + (isCheatLocked ? ' ⚠️' : '') + '</span>'
                : '<span style="color:#10b981;">0</span>';

            // Check susulan: if student started on a different date than sesi created
            var isSusulan = false;
            if (sesiDate && d.waktu_mulai_mengerjakan) {
                var studentDate = new Date(d.waktu_mulai_mengerjakan).toDateString();
                if (studentDate !== sesiDate) isSusulan = true;
            }
            var susulanBadge = isSusulan ? ' <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:700;margin-left:4px;">SUSULAN</span>' : '';
            var extraTimeBadge = (d.tambahan_waktu_menit && d.tambahan_waktu_menit > 0)
                ? ' <span style="background:#fef9c3;color:#854d0e;border:1px solid #fde047;font-size:.65rem;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:4px;" title="Mendapat kompensasi waktu kendala teknis ' + d.tambahan_waktu_menit + ' menit">⏱️ +' + d.tambahan_waktu_menit + 'm</span>'
                : '';
            var nilaiSyncBadge = d.nilai_synced ? ' <span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:700;">✓ Buku Nilai</span>' : '';

            var stat, nilaiHtml, aksiHtml;
            if (d.status === 'selesai') {
                if (isCheatLocked) {
                    stat = '<span style="background:rgba(220,38,38,.12);color:#dc2626;padding:3px 8px;border-radius:6px;font-weight:700;font-size:.8rem;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="shield-alert" style="width:12px;height:12px;"></i> Pelanggaran (&gt;3x)</span>';
                } else {
                    stat = '<span style="background:rgba(16,185,129,.1);color:#10b981;padding:3px 8px;border-radius:6px;font-weight:700;font-size:.8rem;">Selesai</span>';
                }
                nilaiHtml = '<span style="font-weight:800;color:#0369a1;font-size:1.05rem;">' + (d.nilai != null ? d.nilai : '-') + '</span>' + nilaiSyncBadge;
                aksiHtml = '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">' +
                    '<button onclick="showDetailJawabanSiswaCbt(\'' + d.id + '\')" class="btn btn-sm btn-outline" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="eye" style="width:12px;height:12px;"></i> Detail</button>' +
                    (!d.nilai_synced ? '<button onclick="kirimNilaiCbtSatuan(\'' + d.id + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#059669;color:white;border:none;"><i data-lucide="send" style="width:12px;height:12px;"></i> Kirim</button>' : '') +
                    '<button onclick="izinkanLanjutUjianCbt(\'' + d.id + '\', \'' + sesiId + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#8b5cf6;color:white;border:none;" title="Izinkan siswa melanjutkan ujian (reset pelanggaran)"><i data-lucide="rotate-ccw" style="width:12px;height:12px;"></i> Izinkan Lanjut</button>' +
                    '<button onclick="tambahWaktuSiswaCbt(\'' + d.id + '\', \'' + sesiId + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#eab308;color:white;border:none;" title="Buka akses & tambah waktu"><i data-lucide="clock" style="width:12px;height:12px;"></i> +Waktu</button>' +
                    '</div>';
            } else if (d.status === 'mengerjakan') {
                if (isCheatLocked) {
                    stat = '<span style="background:rgba(220,38,38,.12);color:#dc2626;padding:3px 8px;border-radius:6px;font-weight:700;font-size:.8rem;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="shield-alert" style="width:12px;height:12px;"></i> Pelanggaran (&gt;3x)</span>';
                    nilaiHtml = '<span style="font-weight:800;color:#dc2626;font-size:1.05rem;">' + (d.nilai != null ? d.nilai : '-') + '</span>';
                    aksiHtml = '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">' +
                        '<button onclick="showDetailJawabanSiswaCbt(\'' + d.id + '\')" class="btn btn-sm btn-outline" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="eye" style="width:12px;height:12px;"></i> Detail</button>' +
                        '<button onclick="izinkanLanjutUjianCbt(\'' + d.id + '\', \'' + sesiId + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#8b5cf6;color:white;border:none;" title="Izinkan siswa melanjutkan ujian (reset pelanggaran)"><i data-lucide="rotate-ccw" style="width:12px;height:12px;"></i> Izinkan Lanjut</button>' +
                        '</div>';
                } else {
                    stat = '<span style="background:rgba(245,158,11,.1);color:#f59e0b;padding:3px 8px;border-radius:6px;font-weight:700;font-size:.8rem;">Mengerjakan</span>';
                    nilaiHtml = '<span style="color:var(--text-light);">-</span>';
                    aksiHtml = '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">' +
                        '<button onclick="showDetailJawabanSiswaCbt(\'' + d.id + '\')" class="btn btn-sm btn-outline" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="eye" style="width:12px;height:12px;"></i> Intip</button>' +
                        '<button onclick="tambahWaktuSiswaCbt(\'' + d.id + '\', \'' + sesiId + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#eab308;color:white;border:none;" title="Kompensasi kendala teknis (tambah waktu)"><i data-lucide="clock" style="width:12px;height:12px;"></i> +Waktu</button>' +
                        '</div>';
                }
            } else if (d.status === 'diblokir') {
                stat = '<span style="background:rgba(220,38,38,.1);color:#dc2626;padding:3px 8px;border-radius:6px;font-weight:700;font-size:.8rem;">Diblokir</span>';
                nilaiHtml = '<span style="color:var(--text-light);">-</span>';
                aksiHtml = '<div style="display:flex;gap:4px;justify-content:center;">' +
                    '<button onclick="bukaBlokirSiswaCbt(\'' + d.id + '\', \'' + sesiId + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#3b82f6;color:white;border:none;"><i data-lucide="unlock" style="width:12px;height:12px;"></i> Buka Blokir</button>' +
                    '</div>';
            } else {
                stat = '<span style="color:var(--text-light);font-size:.8rem;">Belum Mulai</span>';
                nilaiHtml = '<span style="color:var(--text-light);">-</span>';
                aksiHtml = '<div style="display:flex;gap:4px;justify-content:center;">' +
                    '<button onclick="blokirSiswaCbt(\'' + sesiId + '\', \'' + d.siswa_id + '\')" class="btn btn-sm btn-outline" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;color:#dc2626;border-color:#dc2626;"><i data-lucide="lock" style="width:12px;height:12px;"></i> Blokir</button>' +
                    '</div>';
            }
            return '<tr><td style="text-align:center;">' + (idx + 1) + '</td><td style="font-weight:600;">' + nama + susulanBadge + extraTimeBadge + '</td><td>' + mulai + '</td><td>' + stat + '</td><td style="text-align:center;">' + pelanggaran + '</td><td style="text-align:center;">' + nilaiHtml + '</td><td style="text-align:center;">' + aksiHtml + '</td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();

        // Update summary
        var selesai = jawaban.filter(function (d) { return d.status === 'selesai'; }).length;
        var total = classStudents.length;
        var summaryEl = document.querySelector('#notifMessage h4');
        if (summaryEl) summaryEl.textContent = 'Monitoring Peserta Ujian (' + selesai + '/' + total + ' selesai)';

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:1rem;">Error: ' + e.message + '</td></tr>';
    }
}

async function blokirSiswaCbt(sesiId, siswaId) {
    if(!confirm("Blokir siswa ini agar tidak dapat mengakses ujian hari ini?")) return;
    showGlobalLoader('Memblokir siswa...');
    try {
        var today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { error } = await supabaseClient.from('cbt_jawaban_siswa').insert([{
            sesi_id: sesiId,
            siswa_id: siswaId,
            status: 'diblokir',
            blocked_date: today
        }]);
        if(error) throw error;
        showToast('Siswa berhasil diblokir.', 'success');
        refreshMonitorCbt(sesiId);
    } catch (e) {
        showToast('Gagal memblokir: ' + e.message, 'error');
    } finally { hideGlobalLoader(); }
}

async function bukaBlokirSiswaCbt(jawabanId, sesiId) {
    showGlobalLoader('Membuka blokir...');
    try {
        const { error } = await supabaseClient.from('cbt_jawaban_siswa').delete().eq('id', jawabanId);
        if(error) throw error;
        showToast('Blokir berhasil dibuka.', 'success');
        refreshMonitorCbt(sesiId);
    } catch (e) {
        showToast('Gagal buka blokir: ' + e.message, 'error');
    } finally { hideGlobalLoader(); }
}

// ================= MODAL TAMBAH WAKTU CBT (KOMPENSASI KENDALA TEKNIS) =================
function tambahWaktuSiswaCbt(jawabanId, sesiId) {
    openModalTambahWaktuCbt(jawabanId, sesiId);
}

async function openModalTambahWaktuCbt(jawabanId, sesiId) {
    if (!jawabanId) return;
    showGlobalLoader('Memuat data peserta...');
    try {
        const { data: curr, error: errC } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('id, tambahan_waktu_menit, status, tab_switch_count, siswa:siswa_id(nama_lengkap, nisn)')
            .eq('id', jawabanId).single();
        if (errC) throw errC;

        var existingExtra = parseInt(curr.tambahan_waktu_menit) || 0;
        var namaSiswa = (curr.siswa && curr.siswa.nama_lengkap) ? curr.siswa.nama_lengkap : 'Siswa';
        var nisn = (curr.siswa && curr.siswa.nisn) ? ' (NISN: ' + curr.siswa.nisn + ')' : '';

        // Tutup modal lama jika ada
        var old = document.getElementById('modalTambahWaktuCbt');
        if (old) old.remove();

        var modalHtml = '<div id="modalTambahWaktuCbt" style="position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:9999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);padding:1rem;animation:fadeIn .2s ease;">' +
            '<div style="background:white;border-radius:18px;width:100%;max-width:520px;box-shadow:0 25px 60px rgba(0,0,0,.25);overflow:hidden;border:1px solid #e2e8f0;animation:slideUp .25s ease;">' +
            '  <!-- Header -->' +
            '  <div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">' +
            '    <div style="display:flex;align-items:center;gap:.75rem;">' +
            '      <div style="background:rgba(255,255,255,.2);width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;">⏱️</div>' +
            '      <div>' +
            '        <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:white;">Tambah Waktu Ujian</h3>' +
            '        <p style="margin:2px 0 0;font-size:.8rem;color:#fef3c7;">Kompensasi kendala teknis / jaringan</p>' +
            '      </div>' +
            '    </div>' +
            '    <button onclick="document.getElementById(\'modalTambahWaktuCbt\').remove()" style="background:transparent;border:none;color:white;cursor:pointer;font-size:1.3rem;padding:.2rem .4rem;line-height:1;border-radius:6px;">✕</button>' +
            '  </div>' +
            '  <!-- Body -->' +
            '  <div style="padding:1.5rem;">' +
            '    <!-- Info Siswa -->' +
            '    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:.9rem 1.1rem;margin-bottom:1.25rem;">' +
            '      <div style="font-size:.82rem;color:#64748b;margin-bottom:.2rem;">Peserta Ujian:</div>' +
            '      <div style="font-size:1rem;font-weight:700;color:#0f172a;">' + namaSiswa + '<span style="font-size:.85rem;font-weight:400;color:#64748b;">' + nisn + '</span></div>' +
            '      <div style="margin-top:.4rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;font-size:.8rem;">' +
            '        <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-weight:600;">Status: ' + curr.status.toUpperCase() + '</span>' +
            '        <span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:6px;font-weight:600;">Kompensasi Berjalan: +' + existingExtra + ' Menit</span>' +
            '      </div>' +
            '    </div>' +
            '    <!-- Preset Buttons -->' +
            '    <div style="margin-bottom:1rem;">' +
            '      <label style="display:block;font-size:.85rem;font-weight:700;color:#334155;margin-bottom:.5rem;">Pilih Cepat Tambahan Waktu:</label>' +
            '      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;">' +
            '        <button type="button" class="btn-preset-waktu" onclick="setPresetTambahWaktu(5)" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:.6rem .3rem;border-radius:8px;font-weight:700;color:#334155;cursor:pointer;font-size:.85rem;transition:all .15s;">+5 Menit</button>' +
            '        <button type="button" class="btn-preset-waktu" onclick="setPresetTambahWaktu(10)" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:.6rem .3rem;border-radius:8px;font-weight:700;color:#334155;cursor:pointer;font-size:.85rem;transition:all .15s;">+10 Menit</button>' +
            '        <button type="button" class="btn-preset-waktu" onclick="setPresetTambahWaktu(15)" style="background:#fef3c7;border:1px solid #f59e0b;color:#b45309;padding:.6rem .3rem;border-radius:8px;font-weight:800;cursor:pointer;font-size:.85rem;transition:all .15s;">+15 Menit</button>' +
            '        <button type="button" class="btn-preset-waktu" onclick="setPresetTambahWaktu(30)" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:.6rem .3rem;border-radius:8px;font-weight:700;color:#334155;cursor:pointer;font-size:.85rem;transition:all .15s;">+30 Menit</button>' +
            '      </div>' +
            '    </div>' +
            '    <!-- Input Manual -->' +
            '    <div style="margin-bottom:1.25rem;">' +
            '      <label for="inputTambahWaktuMenit" style="display:block;font-size:.85rem;font-weight:700;color:#334155;margin-bottom:.4rem;">Atau Masukkan Jumlah Menit:</label>' +
            '      <div style="display:flex;align-items:center;gap:.6rem;">' +
            '        <input id="inputTambahWaktuMenit" type="number" min="1" max="180" value="15" style="width:100%;height:46px;padding:.5rem 1rem;border:2px solid #cbd5e1;border-radius:10px;font-size:1.1rem;font-weight:700;color:#0f172a;outline:none;" oninput="updatePresetHighlight(this.value)" />' +
            '        <span style="font-weight:700;color:#64748b;font-size:1rem;white-space:nowrap;">Menit</span>' +
            '      </div>' +
            '    </div>' +
            '    <!-- Auto-unlock Option -->' +
            '    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:.85rem 1rem;margin-bottom:1.25rem;">' +
            '      <label style="display:flex;align-items:flex-start;gap:.6rem;cursor:pointer;margin:0;">' +
            '        <input id="checkResetLockCbt" type="checkbox" checked style="width:18px;height:18px;margin-top:2px;accent-color:#10b981;cursor:pointer;" />' +
            '        <span style="font-size:.82rem;color:#065f46;line-height:1.4;">' +
            '          <strong>Reset pelanggaran & buka akses ujian</strong> jika siswa sebelumnya terkunci akibat indikasi kecurangan / waktu habis.' +
            '        </span>' +
            '      </label>' +
            '    </div>' +
            '    <div style="font-size:.78rem;color:#64748b;line-height:1.4;margin-bottom:1.5rem;background:#f8fafc;padding:.7rem;border-radius:8px;">' +
            '      💡 <strong>Live-Sync:</strong> Tambahan waktu akan langsung disinkronkan ke layar HP/laptop siswa secara otomatis dalam 1–3 detik tanpa perlu login ulang.' +
            '    </div>' +
            '    <!-- Action Buttons -->' +
            '    <div style="display:flex;gap:.75rem;justify-content:flex-end;">' +
            '      <button type="button" class="btn btn-outline" onclick="document.getElementById(\'modalTambahWaktuCbt\').remove()" style="padding:.65rem 1.4rem;border-radius:10px;font-weight:600;min-height:44px;">Batal</button>' +
            '      <button type="button" class="btn btn-primary" onclick="submitTambahWaktuCbt(\'' + jawabanId + '\', \'' + sesiId + '\', ' + existingExtra + ')" style="background:linear-gradient(135deg,#f59e0b,#d97706);border:none;padding:.65rem 1.6rem;border-radius:10px;font-weight:700;color:white;min-height:44px;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 12px rgba(217,119,6,.25);">' +
            '        <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> Simpan & Tambah Waktu' +
            '      </button>' +
            '    </div>' +
            '  </div>' +
            '</div></div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        showToast('Gagal membuka form kompensasi: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

function setPresetTambahWaktu(menit) {
    var inp = document.getElementById('inputTambahWaktuMenit');
    if (inp) {
        inp.value = menit;
        updatePresetHighlight(menit);
    }
}

function updatePresetHighlight(val) {
    val = parseInt(val);
    var btns = document.querySelectorAll('.btn-preset-waktu');
    btns.forEach(function(btn) {
        var num = parseInt(btn.textContent.replace(/[^0-9]/g, ''));
        if (num === val) {
            btn.style.background = '#fef3c7';
            btn.style.borderColor = '#f59e0b';
            btn.style.color = '#b45309';
            btn.style.fontWeight = '800';
        } else {
            btn.style.background = '#f1f5f9';
            btn.style.borderColor = '#cbd5e1';
            btn.style.color = '#334155';
            btn.style.fontWeight = '700';
        }
    });
}

async function submitTambahWaktuCbt(jawabanId, sesiId, existingExtra) {
    var inp = document.getElementById('inputTambahWaktuMenit');
    var tambahan = parseInt(inp ? inp.value : 0);
    if (isNaN(tambahan) || tambahan <= 0) {
        showToast('Masukkan jumlah menit yang valid (minimal 1 menit).', 'warning');
        return;
    }

    var doReset = document.getElementById('checkResetLockCbt') ? document.getElementById('checkResetLockCbt').checked : true;
    showGlobalLoader('Menyimpan kompensasi waktu & menyinkronkan...');

    try {
        const { data: curr, error: errC } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('tambahan_waktu_menit, jawaban_json, waktu_mulai_mengerjakan').eq('id', jawabanId).single();
        if (errC) throw errC;

        var currentTotalExtra = parseInt(curr.tambahan_waktu_menit) || 0;
        var newTotalExtra = currentTotalExtra + tambahan;
        var jwbJson = curr.jawaban_json || {};

        var stMulai = curr.waktu_mulai_mengerjakan ? new Date(curr.waktu_mulai_mengerjakan).getTime() : Date.now();
        var baseLimitMs = stMulai + ((parseInt(window.cbtWaktuMenit) || 60) * 60 * 1000);

        if (window._cbtAsmCurrent && window._cbtAsmCurrent.waktu_selesai_ujian) {
            var tSelesai = new Date(window._cbtAsmCurrent.waktu_selesai_ujian).getTime();
            if (!isNaN(tSelesai)) baseLimitMs = Math.min(baseLimitMs, tSelesai);
        }

        // Cek target deadline sebelumnya
        var existingTargetMs = jwbJson._target_deadline ? new Date(jwbJson._target_deadline).getTime() : 0;
        var targetDeadlineMs;

        if (existingTargetMs && existingTargetMs > Date.now()) {
            // Masih ada sisa waktu berjalan, tambahkan kompensasi ke deadline saat ini
            targetDeadlineMs = existingTargetMs + (tambahan * 60 * 1000);
        } else if (baseLimitMs > Date.now()) {
            // Waktu normal pengerjaan masih berlangsung
            targetDeadlineMs = baseLimitMs + (newTotalExtra * 60 * 1000);
        } else {
            // Waktu normal sudah habis, kompensasi kendala teknis dihitung mulai dari saat tombol ditekan
            targetDeadlineMs = Date.now() + (tambahan * 60 * 1000);
        }

        jwbJson._target_deadline = new Date(targetDeadlineMs).toISOString();

        if (doReset) {
            delete jwbJson._is_cheat_submitted;
            if (jwbJson._tabSwitchCount) jwbJson._tabSwitchCount = 0;
        }

        var updatePayload = {
            status: 'mengerjakan',
            tambahan_waktu_menit: newTotalExtra,
            jawaban_json: jwbJson,
            updated_at: new Date().toISOString()
        };

        if (doReset) {
            updatePayload.tab_switch_count = 0;
            updatePayload.waktu_kumpul = null;
            updatePayload.is_cheat_submitted = false;
        }

        if (!curr.waktu_mulai_mengerjakan) {
            updatePayload.waktu_mulai_mengerjakan = new Date().toISOString();
        }

        var { error } = await supabaseClient.from('cbt_jawaban_siswa').update(updatePayload).eq('id', jawabanId);
        // Fallback jika is_cheat_submitted belum ada di skema
        if (error) {
            delete updatePayload.is_cheat_submitted;
            var { error: errRetry } = await supabaseClient.from('cbt_jawaban_siswa').update(updatePayload).eq('id', jawabanId);
            if (errRetry) throw errRetry;
        }

        var modal = document.getElementById('modalTambahWaktuCbt');
        if (modal) modal.remove();

        showToast('Kompensasi +' + tambahan + ' menit berhasil ditambahkan! Waktu live langsung tersinkron.', 'success');
        if (sesiId) refreshMonitorCbt(sesiId);
    } catch (e) {
        showToast('Gagal menambah waktu: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function izinkanLanjutUjianCbt(jawabanId, sesiId) {
    if (!jawabanId) return;
    showCustomConfirm(
        'Izinkan Siswa Lanjut Ujian?',
        'Status ujian siswa akan dikembalikan ke <strong>mengerjakan</strong> dan catatan pelanggaran kecurangan akan <strong>direset ke 0</strong>.<br><br>Siswa dapat masuk kembali menggunakan token sesi untuk melanjutkan pengerjaan dari jawaban terakhir.',
        'Ya, Izinkan Lanjut',
        async function() {
            showGlobalLoader('Membuka kembali akses ujian siswa...');
            try {
                var updatePayload = {
                    status: 'mengerjakan',
                    tab_switch_count: 0,
                    waktu_kumpul: null
                };

                // Bersihkan flag pelanggaran dari jawaban_json & pastikan _target_deadline aktif
                try {
                    const { data: curJwb } = await supabaseClient.from('cbt_jawaban_siswa')
                        .select('jawaban_json, tambahan_waktu_menit, waktu_mulai_mengerjakan').eq('id', jawabanId).single();
                    var cleanedJwb = (curJwb && curJwb.jawaban_json) ? Object.assign({}, curJwb.jawaban_json) : {};
                    delete cleanedJwb._is_cheat_submitted;
                    delete cleanedJwb._tabSwitchCount;

                    var curExt = (curJwb && curJwb.tambahan_waktu_menit) ? parseInt(curJwb.tambahan_waktu_menit) : 0;
                    var prevTargetMs = cleanedJwb._target_deadline ? new Date(cleanedJwb._target_deadline).getTime() : 0;

                    // Jika siswa memiliki tambahan kompensasi waktu tetapi waktu target sudah kedaluwarsa saat terkunci:
                    // perbarui _target_deadline agar siswa dapat menghabiskan sisa menit kompensasinya dari waktu sekarang
                    if (curExt > 0 && (!prevTargetMs || prevTargetMs <= Date.now())) {
                        var newDeadlineMs = Date.now() + (curExt * 60 * 1000);
                        cleanedJwb._target_deadline = new Date(newDeadlineMs).toISOString();
                    }

                    updatePayload.jawaban_json = cleanedJwb;
                } catch (eJson) {
                    console.warn('Gagal membaca jawaban_json:', eJson);
                }

                // Coba update dengan is_cheat_submitted: false jika kolom tersedia
                var { error } = await supabaseClient.from('cbt_jawaban_siswa')
                    .update(Object.assign({}, updatePayload, { is_cheat_submitted: false }))
                    .eq('id', jawabanId);

                // Fallback jika kolom is_cheat_submitted belum dibuat di DB
                if (error) {
                    var { error: errRetry } = await supabaseClient.from('cbt_jawaban_siswa')
                        .update(updatePayload)
                        .eq('id', jawabanId);
                    if (errRetry) throw errRetry;
                }

                showToast('Akses ujian siswa berhasil dibuka kembali! Pelanggaran telah direset ke 0.', 'success');
                if (sesiId) refreshMonitorCbt(sesiId);
            } catch(e) {
                showToast('Gagal membuka akses: ' + e.message, 'error');
            } finally {
                hideGlobalLoader();
            }
        }
    );
}

async function showDetailJawabanSiswaCbt(jawabanId) {
    showGlobalLoader('Memuat detail jawaban...');
    try {
        const { data: jawabData } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('jawaban_json, nilai, status, waktu_mulai_mengerjakan, tambahan_waktu_menit, siswa:siswa_id(nama_lengkap), sesi_ujian:sesi_id(asesmen_id)')
            .eq('id', jawabanId).single();
            
        if (!jawabData) throw new Error('Data jawaban tidak ditemukan');
        
        var asesmenId = jawabData.sesi_ujian ? jawabData.sesi_ujian.asesmen_id : null;
        if (!asesmenId) throw new Error('Data sesi ujian tidak valid');

        const { data: soalList } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });
            
        var jawaban = jawabData.jawaban_json || {};
        var totalSoal = soalList ? soalList.length : 0;
        var answeredCount = 0;

        if (soalList && soalList.length > 0) {
            soalList.forEach(function(s) {
                var key = 'soal_' + s.nomor_soal;
                var val = jawaban[key];
                if (val !== undefined && val !== null && String(val).trim().length > 0) {
                    answeredCount++;
                }
            });
        }

        var percent = totalSoal > 0 ? Math.round((answeredCount / totalSoal) * 100) : 0;
        var html = '<div style="text-align:left; max-height:55vh; overflow-y:auto; padding-right:.5rem;">';
        
        if (soalList && soalList.length > 0) {
            soalList.forEach(function(s) {
                var key = 'soal_' + s.nomor_soal;
                var jwb = jawaban[key] || '';
                var isAnswered = String(jwb).trim().length > 0;
                
                html += '<div style="background:#f8fafc; border:1px solid ' + (isAnswered ? '#cbd5e1' : '#fecaca') + '; border-radius:10px; padding:1rem; margin-bottom:1rem;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">' +
                        '  <div style="font-weight:700;">Soal ' + s.nomor_soal + ' <span style="font-weight:400;color:#64748b;font-size:.8rem;">(' + (s.tipe_soal==='pg'?'Pilihan Ganda':'Essay') + ')</span></div>' +
                        '  <div>' + (isAnswered 
                            ? '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">✓ Terjawab</span>' 
                            : '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">✕ Belum Dijawab</span>') + '</div>' +
                        '</div>';
                html += '<div style="font-size:.9rem; color:#1e293b; margin-bottom:1rem; line-height:1.4;">' + (s.naskah_soal||'') + '</div>';
                
                if (s.tipe_soal === 'pg') {
                    var isCorrect = (String(jwb).trim().toUpperCase() === String(s.kunci_jawaban || '').trim().toUpperCase().charAt(0));
                    html += '<div style="display:flex; gap:1.5rem; font-size:.85rem; background:white; padding:.6rem .8rem; border-radius:8px; border:1px solid #e2e8f0; align-items:center; flex-wrap:wrap;">';
                    html += '<div>Jawaban Siswa: ' + (isAnswered ? '<strong style="color:' + (isCorrect ? '#10b981' : '#dc2626') + '; font-size:1.05rem;">' + escHtml(jwb) + '</strong>' : '<span style="color:#ef4444;font-style:italic;">Belum memilih</span>') + '</div>';
                    html += '<div>Kunci: <strong style="color:#10b981; font-size:1.05rem;">' + escHtml(s.kunci_jawaban || '-') + '</strong></div>';
                    html += '</div>';
                } else {
                    html += '<div style="font-size:.85rem; color:#334155; background:white; padding:.8rem; border-radius:8px; border:1px solid #e2e8f0;">';
                    html += '<div style="margin-bottom:.8rem;"><strong style="color:#0f172a;">Jawaban Siswa:</strong><div style="margin-top:.3rem;color:' + (isAnswered ? '#1e293b' : '#ef4444') + ';line-height:1.5;">' + (isAnswered ? escHtml(jwb) : '<em>Belum diisi oleh siswa</em>') + '</div></div>';
                    html += '<div style="border-top:1px dashed #cbd5e1; padding-top:.8rem;"><strong style="color:#0f172a;">Kunci/Keyword:</strong><div style="margin-top:.3rem;color:#10b981;line-height:1.5;">' + escHtml(s.kunci_jawaban || '-') + '</div></div>';
                    html += '</div>';
                }
                
                html += '</div>';
            });
        } else {
            html += '<div style="padding:2rem; text-align:center; color:#64748b;">Tidak ada data soal yang tersimpan.</div>';
        }
        
        html += '</div>';
        
        var modalContent = '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid #e2e8f0; gap:1rem;">' +
                           '  <div style="text-align:left;">' +
                           '    <h3 style="margin:0 0 .3rem 0;font-size:1.2rem;color:#0f172a;">Pantau / Intip Jawaban Siswa</h3>' +
                           '    <div style="font-size:.88rem; color:#64748b;">Siswa: <strong style="color:#334155;">' + (jawabData.siswa ? jawabData.siswa.nama_lengkap : 'Siswa') + '</strong> &nbsp;•&nbsp; Status: <strong style="color:#0369a1;">' + (jawabData.status || '-').toUpperCase() + '</strong></div>' +
                           '    <div style="margin-top:.4rem;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;">' +
                           '      <span style="background:' + (answeredCount === totalSoal ? '#dcfce7' : '#fef3c7') + ';color:' + (answeredCount === totalSoal ? '#15803d' : '#b45309') + ';padding:2px 8px;border-radius:6px;font-weight:700;font-size:.8rem;">' + answeredCount + ' / ' + totalSoal + ' Soal Selesai (' + percent + '%)</span>' +
                           '      ' + (jawabData.nilai != null ? '<span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-weight:700;font-size:.8rem;">Nilai Sementara: ' + jawabData.nilai + '</span>' : '') +
                           '    </div>' +
                           '  </div>' +
                           '  <button onclick="document.getElementById(\'detailJwbModal\').remove(); showDetailJawabanSiswaCbt(\'' + jawabanId + '\');" class="btn btn-sm btn-outline" style="white-space:nowrap;display:flex;align-items:center;gap:4px;padding:.35rem .7rem;font-size:.8rem;" title="Muat ulang jawaban terbaru siswa"><i data-lucide="refresh-cw" style="width:13px;height:13px;"></i> Refresh</button>' +
                           '</div>' + html +
                           '<div style="text-align:center; margin-top:1.25rem; padding-top:1rem; border-top:1px solid #e2e8f0;"><button class="btn btn-primary" onclick="document.getElementById(\'detailJwbModal\').remove()" style="padding:.6rem 2.5rem; border-radius:10px; min-height:44px; font-weight:700;">Tutup</button></div>';
                           
        var old = document.getElementById('detailJwbModal');
        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = 'detailJwbModal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:1rem;animation:fadeIn .2s ease;';
        overlay.innerHTML = '<div style="background:white; border-radius:16px; padding:1.5rem; width:100%; max-width:650px; box-shadow:0 25px 60px rgba(0,0,0,.25);">' + modalContent + '</div>';
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();
        
    } catch(e) {
        showToast('Gagal memuat detail: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}


// ================= SISWA: KERJAKAN CBT =================

async function mulaiUjianCbtSiswa(asesmenId) {
    showGlobalLoader('Memeriksa kesesuaian ujian...');
    try {
        const { data: asm, error: asmErr } = await supabaseClient
            .from('asesmen')
            .select('id, judul, kelas, waktu_selesai_ujian, ujian_aktif')
            .eq('id', asesmenId)
            .single();
        if (asmErr || !asm) throw new Error('Data ujian tidak ditemukan.');

        // Cek apakah waktu sesi ujian sudah berakhir
        if (asm.waktu_selesai_ujian && new Date() >= new Date(asm.waktu_selesai_ujian)) {
            // Cek apakah siswa ini memiliki kompensasi tambahan waktu aktif
            var hasCompensatedStudent = false;
            try {
                if (currentUser && currentUser.id) {
                    const { data: sD } = await supabaseClient.from('siswa').select('id').eq('user_id', currentUser.id).maybeSingle();
                    if (sD) {
                        const { data: jwEx } = await supabaseClient.from('cbt_jawaban_siswa')
                            .select('id, tambahan_waktu_menit, status')
                            .eq('siswa_id', sD.id)
                            .gt('tambahan_waktu_menit', 0)
                            .order('created_at', { ascending: false })
                            .limit(1);
                        if (jwEx && jwEx.length > 0 && jwEx[0].status === 'mengerjakan') {
                            hasCompensatedStudent = true;
                        }
                    }
                }
            } catch (eC) { }

            if (!hasCompensatedStudent) {
                if (typeof cbtAutoEndSesiImmediate === 'function') cbtAutoEndSesiImmediate(null, asesmenId);
                hideGlobalLoader();
                showNotifModal('Ujian Telah Berakhir',
                    '<div style="text-align:center;padding:1rem 0;">' +
                    '<div style="background:#fee2e2;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                    '<i data-lucide="clock" style="width:34px;height:34px;color:#dc2626;"></i></div>' +
                    '<h3 style="margin-bottom:.5rem;color:#991b1b;font-size:1.2rem;">Waktu Sesi Telah Berakhir</h3>' +
                    '<p style="color:#64748b;font-size:.9rem;line-height:1.6;margin-bottom:1rem;">' +
                    'Sesi ujian <strong>"' + escHtml(asm.judul) + '"</strong> telah berakhir pada pukul ' +
                    new Date(asm.waktu_selesai_ujian).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB.<br>' +
                    'Anda tidak dapat lagi mengikuti atau mengerjakan ujian ini.' +
                    '</p></div>', 'error');
                if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                return;
            }
        }

        // Jika user adalah siswa, cek apakah jenjang/kelasnya sesuai
        if (currentRole === 'siswa' && currentUser) {
            var siswaData = null;
            try {
                if (typeof getLoggedStudentInfo === 'function') {
                    siswaData = await getLoggedStudentInfo();
                } else {
                    const { data: sD } = await supabaseClient
                        .from('siswa')
                        .select('id, nama_lengkap, kelas_id, master_kelas(nama_kelas, tingkat)')
                        .eq('user_id', currentUser.id)
                        .maybeSingle();
                    siswaData = sD;
                }
            } catch (errS) {}

            if (!siswaData) {
                hideGlobalLoader();
                showNotifModal('Akses Ujian Ditolak',
                    '<div style="text-align:center;padding:1rem 0;">' +
                    '<div style="background:#fee2e2;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                    '<i data-lucide="shield-alert" style="width:34px;height:34px;color:#dc2626;"></i></div>' +
                    '<h3 style="margin-bottom:.5rem;color:#991b1b;font-size:1.2rem;">Akun Belum Ditautkan</h3>' +
                    '<p style="color:#64748b;font-size:.9rem;line-height:1.6;margin-bottom:1rem;">' +
                    'Akun Anda belum ditautkan dengan data Siswa aktif.<br>' +
                    'Silakan hubungi Administrator atau Wali Kelas Anda untuk menautkan akun.' +
                    '</p></div>', 'error');
                if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                return;
            }

            var sKelas = siswaData.master_kelas ? siswaData.master_kelas.nama_kelas : '';
            var sTingkat = siswaData.master_kelas ? siswaData.master_kelas.tingkat : '';
            if (!sKelas && siswaData.kelas_id && typeof masterKelasList !== 'undefined' && masterKelasList) {
                var mk = masterKelasList.find(function(k) { return k.id === siswaData.kelas_id; });
                if (mk) {
                    sKelas = mk.nama_kelas || '';
                    sTingkat = mk.tingkat || '';
                }
            }

            var aKelas = asm.kelas || '';

            if (typeof isKelasMatch === 'function' && !isKelasMatch(sKelas, sTingkat, aKelas)) {
                hideGlobalLoader();
                showNotifModal('Akses Ujian Ditolak',
                    '<div style="text-align:center;padding:1rem 0;">' +
                    '<div style="background:#fee2e2;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                    '<i data-lucide="shield-alert" style="width:34px;height:34px;color:#dc2626;"></i></div>' +
                    '<h3 style="margin-bottom:.5rem;color:#991b1b;font-size:1.2rem;">Jenjang Kelas Tidak Sesuai</h3>' +
                    '<p style="color:#64748b;font-size:.9rem;line-height:1.6;margin-bottom:1rem;">' +
                    'Ujian <strong>"' + escHtml(asm.judul) + '"</strong> dikhususkan bagi jenjang/kelas <strong>' + escHtml(aKelas || 'Lain') + '</strong>.<br>' +
                    'Sedangkan Anda terdaftar di kelas <strong>' + escHtml(sKelas || 'Lain') + '</strong>.<br><br>' +
                    '<span style="color:#dc2626;font-weight:700;">Sistem otomatis menolak akses agar Anda tidak salah mengerjakan ujian tingkat lain.</span>' +
                    '</p></div>', 'error');
                if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                return;
            }

            // Validasi riwayat pengerjaan siswa untuk asesmen ini (terutama diskualifikasi pelanggaran > 3x)
            var cSiswaId = siswaData.id;
            const { data: allSesiList } = await supabaseClient.from('cbt_sesi_ujian')
                .select('id').eq('asesmen_id', asesmenId);
            var checkSesiIds = (allSesiList || []).map(function(s) { return s.id; });
            if (checkSesiIds.length > 0) {
                const { data: exJwbList } = await supabaseClient.from('cbt_jawaban_siswa')
                    .select('*').in('sesi_id', checkSesiIds).eq('siswa_id', cSiswaId).order('created_at', { ascending: false });
                var exJwb = (exJwbList && exJwbList.length > 0) ? exJwbList[0] : null;
                if (exJwb) {
                    var isCheatLocked = (exJwb.tab_switch_count && exJwb.tab_switch_count > 3) || 
                                        (exJwb.is_cheat_submitted === true) || 
                                        (exJwb.jawaban_json && exJwb.jawaban_json._is_cheat_submitted === true);
                    if (isCheatLocked) {
                        hideGlobalLoader();
                        showNotifModal('Akses Ujian Ditolak (Pelanggaran > 3x)',
                            '<div style="text-align:center;padding:1rem 0;">' +
                            '<div style="background:#fee2e2;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                            '<i data-lucide="shield-alert" style="width:34px;height:34px;color:#dc2626;"></i></div>' +
                            '<h3 style="margin-bottom:.5rem;color:#991b1b;font-size:1.2rem;">Ujian Dihentikan Sistem</h3>' +
                            '<p style="color:#475569;font-size:.9rem;line-height:1.6;margin-bottom:1rem;">' +
                            'Anda terdeteksi melakukan pelanggaran meninggalkan layar ujian lebih dari 3 kali sehingga ujian Anda telah otomatis dikumpulkan.<br><br>' +
                            '<strong style="color:#dc2626;">Anda belum diizinkan oleh Guru Pengawas / Administrator untuk melanjutkan ujian ini.</strong>' +
                            '</p>' +
                            '<div style="background:#fef2f2;border:1px solid #fca5a5;padding:.8rem 1rem;border-radius:10px;font-size:.82rem;color:#b91c1c;line-height:1.5;">' +
                            'Silakan hubungi Guru Pengawas CBT atau Administrator di sekolah untuk meminta izin melanjutkan pengerjaan.' +
                            '</div>' +
                            '</div>', 'error');
                        if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                        return;
                    }

                    if (exJwb.status === 'selesai') {
                        hideGlobalLoader();
                        showNotifModal('Ujian Telah Diselesaikan',
                            '<div style="text-align:center;padding:1rem 0;">' +
                            '<div style="background:#dcfce7;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                            '<i data-lucide="check-circle-2" style="width:32px;height:32px;color:#10b981;"></i></div>' +
                            '<h3 style="margin-bottom:.5rem;color:#1e293b;font-size:1.2rem;">Anda Sudah Mengerjakan!</h3>' +
                            '<p style="color:#64748b;font-size:.9rem;line-height:1.5;">Anda sudah mengerjakan dan mengumpulkan ujian ini sebelumnya. Jawaban Anda telah tersimpan dengan aman di sistem.</p></div>', 'info');
                        if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                        return;
                    }

                    if (exJwb.status === 'diblokir') {
                        var today = new Date().toISOString().split('T')[0];
                        if (exJwb.blocked_date === today) {
                            hideGlobalLoader();
                            showNotifModal('Akses Ditolak',
                                '<div style="text-align:center;padding:1rem 0;">' +
                                '<div style="background:#fee2e2;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                                '<i data-lucide="lock" style="width:32px;height:32px;color:#dc2626;"></i></div>' +
                                '<h3 style="margin-bottom:.5rem;color:#1e293b;font-size:1.2rem;">Anda Diblokir</h3><p style="color:#64748b;font-size:.9rem;line-height:1.5;">Anda diblokir dari ujian ini untuk hari ini. Silakan hubungi guru yang bersangkutan.</p></div>', 'error');
                            if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                            return;
                        }
                    }
                }
            }
        }
    } catch (e) {
        hideGlobalLoader();
        showToast(e.message, 'error');
        return;
    } finally {
        hideGlobalLoader();
    }

    // Tampilkan modal input token yang lebih baik dari prompt()
    var overlay = document.createElement('div');
    overlay.id = 'cbtTokenOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:fadeIn .3s ease;';
    overlay.innerHTML = '<div style="background:white;border-radius:20px;padding:2rem;width:90%;max-width:420px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.25);">' +
        '<div style="width:60px;height:60px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto .8rem;"><i data-lucide="key-round" style="width:28px;height:28px;color:white;"></i></div>' +
        '<h3 style="margin:0 0 .3rem;font-size:1.2rem;color:#1e293b;">Masukkan Token Ujian</h3>' +
        '<p style="margin:0 0 1.2rem;font-size:.85rem;color:#64748b;">Token diberikan oleh guru Anda saat sesi ujian dimulai.</p>' +
        '<input id="cbtTokenInput" type="text" maxlength="6" autocomplete="off" style="width:100%;text-align:center;letter-spacing:8px;font-size:1.8rem;font-weight:900;font-family:monospace;padding:.8rem;border:2px solid #e2e8f0;border-radius:12px;outline:none;text-transform:uppercase;transition:border-color .2s;" placeholder="______" onfocus="this.style.borderColor=\'#3b82f6\'" onblur="this.style.borderColor=\'#e2e8f0\'">' +
        '<div style="display:flex;gap:.8rem;margin-top:1.5rem;">' +
        '<button onclick="document.getElementById(\'cbtTokenOverlay\').remove();" class="btn btn-outline" style="flex:1;padding:.6rem;border-radius:10px;">Batal</button>' +
        '<button onclick="verifikasiTokenCbt(\'' + asesmenId + '\')" class="btn btn-primary" style="flex:1;padding:.6rem;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);">Masuk Ujian</button>' +
        '</div></div>';
    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();
    setTimeout(function () { document.getElementById('cbtTokenInput').focus(); }, 200);

    // Enter key submit
    document.getElementById('cbtTokenInput').addEventListener('keyup', function (e) {
        if (e.key === 'Enter') verifikasiTokenCbt(asesmenId);
    });
}

async function verifikasiTokenCbt(asesmenId) {
    var tokenInput = document.getElementById('cbtTokenInput');
    if (!tokenInput) return;
    var token = tokenInput.value.trim().toUpperCase();
    if (!token || token.length < 4) {
        showToast('Masukkan token yang valid!', 'warning');
        tokenInput.focus();
        return;
    }

    showGlobalLoader('Memverifikasi Token...');
    try {
        const { data: sesi, error } = await supabaseClient.from('cbt_sesi_ujian')
            .select('*').eq('asesmen_id', asesmenId).eq('token', token).eq('status', 'berjalan').single();

        if (error || !sesi) throw new Error('Token tidak valid atau sesi ujian belum dimulai / sudah selesai.');

        // Get actual siswa.id and check class match again
        var siswaData = null;
        if (typeof getLoggedStudentInfo === 'function') {
            siswaData = await getLoggedStudentInfo();
        } else {
            const { data: sD } = await supabaseClient.from('siswa')
                .select('id, master_kelas(nama_kelas, tingkat)').eq('user_id', currentUser.id).maybeSingle();
            siswaData = sD;
        }
        if (!siswaData) throw new Error('Akun Anda belum ditautkan dengan data Siswa. Silakan hubungi Admin.');
        cbtSiswaId = siswaData.id;

        // Double check kesesuaian kelas dan waktu ujian
        const { data: asmCheck } = await supabaseClient.from('asesmen').select('judul, kelas, waktu_selesai_ujian').eq('id', asesmenId).single();
        if (asmCheck && asmCheck.waktu_selesai_ujian && new Date() >= new Date(asmCheck.waktu_selesai_ujian)) {
            // Cek apakah siswa ini memiliki kompensasi tambahan waktu aktif
            var studentHasExtraTime = false;
            try {
                const { data: jwbExtra } = await supabaseClient.from('cbt_jawaban_siswa')
                    .select('id, tambahan_waktu_menit, status')
                    .eq('siswa_id', cbtSiswaId)
                    .gt('tambahan_waktu_menit', 0)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (jwbExtra && jwbExtra.length > 0 && jwbExtra[0].status === 'mengerjakan') {
                    studentHasExtraTime = true;
                }
            } catch (eExtra) { }

            if (!studentHasExtraTime) {
                if (typeof cbtAutoEndSesiImmediate === 'function') cbtAutoEndSesiImmediate(sesi.id, asesmenId);
                var ovExpired = document.getElementById('cbtTokenOverlay');
                if (ovExpired) ovExpired.remove();
                throw new Error('Sesi ujian telah berakhir pada pukul ' + new Date(asmCheck.waktu_selesai_ujian).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB.');
            }
        }

        if (asmCheck && typeof isKelasMatch === 'function') {
            var sKelas = siswaData.master_kelas ? siswaData.master_kelas.nama_kelas : '';
            var sTingkat = siswaData.master_kelas ? siswaData.master_kelas.tingkat : '';
            if (!isKelasMatch(sKelas, sTingkat, asmCheck.kelas)) {
                var ov = document.getElementById('cbtTokenOverlay');
                if (ov) ov.remove();
                throw new Error('Akses ditolak: Jenjang kelas Anda (' + sKelas + ') tidak sesuai dengan kelas ujian ini (' + asmCheck.kelas + ').');
            }
        }

        // Cek apakah siswa sudah mengerjakan di sesi manapun untuk asesmen ini
        const { data: allSesi, error: allSesiErr } = await supabaseClient.from('cbt_sesi_ujian')
            .select('id').eq('asesmen_id', asesmenId);
        if (allSesiErr) throw allSesiErr;
        
        var sesiIds = (allSesi || []).map(function(s) { return s.id; });
        var cekJawaban = null;
        if (sesiIds.length > 0) {
            const { data: listJawaban } = await supabaseClient.from('cbt_jawaban_siswa')
                .select('*').in('sesi_id', sesiIds).eq('siswa_id', cbtSiswaId).order('created_at', {ascending: false});
            if (listJawaban && listJawaban.length > 0) {
                cekJawaban = listJawaban[0]; // ambil yang terbaru
            }
        }

        // VALIDASI DISKUALIFIKASI PELANGGARAN (>3x)
        if (cekJawaban) {
            var isCheatLocked = (cekJawaban.tab_switch_count && cekJawaban.tab_switch_count > 3) || 
                                (cekJawaban.is_cheat_submitted === true) || 
                                (cekJawaban.jawaban_json && cekJawaban.jawaban_json._is_cheat_submitted === true);
            if (isCheatLocked) {
                var ov = document.getElementById('cbtTokenOverlay');
                if (ov) ov.remove();
                hideGlobalLoader();
                showNotifModal('Akses Ujian Ditolak (Pelanggaran > 3x)',
                    '<div style="text-align:center;padding:1rem 0;">' +
                    '<div style="background:#fee2e2;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
                    '<i data-lucide="shield-alert" style="width:34px;height:34px;color:#dc2626;"></i></div>' +
                    '<h3 style="margin-bottom:.5rem;color:#991b1b;font-size:1.2rem;">Ujian Dihentikan Sistem</h3>' +
                    '<p style="color:#475569;font-size:.9rem;line-height:1.6;margin-bottom:1rem;">' +
                    'Anda telah melakukan pelanggaran meninggalkan layar ujian lebih dari 3 kali sehingga ujian otomatis dikumpulkan.<br><br>' +
                    '<strong style="color:#dc2626;">Anda belum diizinkan oleh Guru Pengawas / Administrator untuk melanjutkan ujian ini.</strong>' +
                    '</p>' +
                    '<div style="background:#fef2f2;border:1px solid #fca5a5;padding:.8rem 1rem;border-radius:10px;font-size:.82rem;color:#b91c1c;line-height:1.5;">' +
                    'Silakan hubungi Guru Pengawas CBT atau Administrator untuk meminta izin melanjutkan pengerjaan.' +
                    '</div>' +
                    '</div>', 'error');
                if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                return;
            }
        }

        if (cekJawaban && cekJawaban.status === 'selesai') {
            var ov = document.getElementById('cbtTokenOverlay');
            if (ov) ov.remove();
            hideGlobalLoader();
            showNotifModal('Ujian Telah Diselesaikan', '<div style="text-align:center;padding:1rem 0;"><div style="background:#dcfce7;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;"><i data-lucide="check-circle-2" style="width:32px;height:32px;color:#10b981;"></i></div><h3 style="margin-bottom:.5rem;color:#1e293b;font-size:1.2rem;">Anda Sudah Mengerjakan!</h3><p style="color:#64748b;font-size:.9rem;line-height:1.5;">Anda sudah mengerjakan dan mengumpulkan ujian ini sebelumnya. Jawaban Anda telah tersimpan dengan aman di sistem.</p></div>', 'info');
            if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
            return;
        }

        if (cekJawaban && cekJawaban.status === 'diblokir') {
            var today = new Date().toISOString().split('T')[0];
            if (cekJawaban.blocked_date === today) {
                var ov = document.getElementById('cbtTokenOverlay');
                if (ov) ov.remove();
                hideGlobalLoader();
                showNotifModal('Akses Ditolak', '<div style="text-align:center;padding:1rem 0;"><div style="background:#fee2e2;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;"><i data-lucide="lock" style="width:32px;height:32px;color:#dc2626;"></i></div><h3 style="margin-bottom:.5rem;color:#1e293b;font-size:1.2rem;">Anda Diblokir</h3><p style="color:#64748b;font-size:.9rem;line-height:1.5;">Anda diblokir dari ujian ini untuk hari ini. Silakan hubungi guru yang bersangkutan.</p></div>', 'error');
                if (window.lucide) setTimeout(function() { lucide.createIcons(); }, 50);
                return;
            } else {
                // Auto unblock for susulan
                await supabaseClient.from('cbt_jawaban_siswa').update({ status: 'mengerjakan', blocked_date: null, waktu_mulai_mengerjakan: new Date().toISOString(), sesi_id: sesi.id }).eq('id', cekJawaban.id);
                cekJawaban.status = 'mengerjakan';
                cekJawaban.sesi_id = sesi.id;
            }
        }
        
        // Migrasi ke sesi baru jika admin me-restart sesi (waktu masih mengerjakan)
        if (cekJawaban && cekJawaban.status === 'mengerjakan' && cekJawaban.sesi_id !== sesi.id) {
            await supabaseClient.from('cbt_jawaban_siswa').update({ sesi_id: sesi.id }).eq('id', cekJawaban.id);
            cekJawaban.sesi_id = sesi.id;
        }

        var jawabanId;
        if (!cekJawaban) {
            const { data: newJawaban, error: insertErr } = await supabaseClient.from('cbt_jawaban_siswa').insert({
                sesi_id: sesi.id,
                siswa_id: cbtSiswaId,
                jawaban_json: {},
                status: 'mengerjakan',
                tab_switch_count: 0,
                waktu_mulai_mengerjakan: new Date().toISOString()
            }).select('id').single();
            if (insertErr) throw insertErr;
            jawabanId = newJawaban.id;
        } else {
            jawabanId = cekJawaban.id;
        }

        // Hapus overlay token
        var ov = document.getElementById('cbtTokenOverlay');
        if (ov) ov.remove();

        // Mulai ujian
        renderUiUjianCbt(asesmenId, sesi.id, jawabanId, cekJawaban ? cekJawaban.jawaban_json : {});

    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

// Helper hitung deadline absolut secara deterministik
function calculateCbtDeadlineMs(mulaiVal, waktuMenitVal, selesaiUjianStr, tambahanMenitVal, jwbJson, updatedAtVal) {
    // 1. Jika ada target deadline spesifik yang sudah pernah ditetapkan dan disimpan di jawaban_json, gunakan itu
    if (jwbJson && jwbJson._target_deadline) {
        var savedTarget = new Date(jwbJson._target_deadline).getTime();
        if (!isNaN(savedTarget) && savedTarget > 0) {
            return savedTarget;
        }
    }

    var stMulai = mulaiVal ? new Date(mulaiVal) : new Date();
    var baseLimitMs = stMulai.getTime() + ((parseInt(waktuMenitVal) || 60) * 60 * 1000);
    if (selesaiUjianStr) {
        var tSelesai = new Date(selesaiUjianStr).getTime();
        if (!isNaN(tSelesai)) {
            baseLimitMs = Math.min(baseLimitMs, tSelesai);
        }
    }
    var extraMs = (parseInt(tambahanMenitVal) || 0) * 60 * 1000;

    // Jika ada kompensasi kendala teknis dan waktu dasar sudah terlampaui saat kompensasi diberikan,
    // patok deadline secara tetap terhadap waktu update terakhir (updatedAtVal) atau stMulai, BUKAN Date.now() dinamis
    if (extraMs > 0 && baseLimitMs < Date.now()) {
        var anchorMs = updatedAtVal ? new Date(updatedAtVal).getTime() : stMulai.getTime();
        if (!isNaN(anchorMs) && anchorMs > 0) {
            return anchorMs + extraMs;
        }
    }

    return baseLimitMs + extraMs;
}

async function renderUiUjianCbt(asesmenId, sesiId, jawabanId, existingJawaban) {
    showGlobalLoader('Menyiapkan soal ujian...');
    try {
        // Load soal
        const { data: soalList, error: soalErr } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });
        if (soalErr) throw soalErr;

        // Load asesmen info (untuk waktu)
        const { data: asm, error: asmErr } = await supabaseClient.from('asesmen')
            .select('*').eq('id', asesmenId).single();
        if (asmErr) throw asmErr;

        // ================= PENGACAKAN NOMOR SOAL KHUSUS PG =================
        // Pisahkan soal PG dan Non-PG (Essay)
        var allSoalRaw = (soalList || []).slice();
        var pgSoal = allSoalRaw.filter(function (s) { return s.tipe_soal === 'pg'; });
        var nonPgSoal = allSoalRaw.filter(function (s) { return s.tipe_soal !== 'pg'; });

        var finalSoalList = [];
        var savedOrder = (existingJawaban && Array.isArray(existingJawaban._soal_order)) ? existingJawaban._soal_order : null;

        // Periksa juga di localStorage jika ada sesi aktif tersimpan
        if (!savedOrder) {
            try {
                var localSes = JSON.parse(localStorage.getItem('cbt_active_session') || '{}');
                if (localSes && localSes.jawabanId === jawabanId && Array.isArray(localSes.soalOrder)) {
                    savedOrder = localSes.soalOrder;
                }
            } catch (eSes) { }
        }

        if (savedOrder && savedOrder.length > 0) {
            // Pulihkan urutan acak yang sudah ditetapkan untuk siswa ini agar nomor soal tidak berubah saat refresh/resume
            var posMap = {};
            savedOrder.forEach(function (nomor, idx) { posMap[nomor] = idx; });
            finalSoalList = allSoalRaw.sort(function (a, b) {
                var posA = posMap[a.nomor_soal] !== undefined ? posMap[a.nomor_soal] : 9999;
                var posB = posMap[b.nomor_soal] !== undefined ? posMap[b.nomor_soal] : 9999;
                return posA - posB;
            });
        } else {
            // Acak urutan nomor soal khusus PG menggunakan Fisher-Yates shuffle
            var shuffledPg = pgSoal.slice();
            for (var i = shuffledPg.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = shuffledPg[i];
                shuffledPg[i] = shuffledPg[j];
                shuffledPg[j] = temp;
            }
            // Gabungkan: Soal PG yang telah diacak di bagian depan, lalu Essay tersusun teratur di belakang
            finalSoalList = shuffledPg.concat(nonPgSoal);

            // Simpan urutan nomor soal agar persisten selama pengerjaan
            var newOrder = finalSoalList.map(function (s) { return s.nomor_soal; });
            if (!existingJawaban) existingJawaban = {};
            existingJawaban._soal_order = newOrder;

            // Simpan ke localStorage sesi aktif
            try {
                var curSess = JSON.parse(localStorage.getItem('cbt_active_session') || '{}');
                curSess.soalOrder = newOrder;
                localStorage.setItem('cbt_active_session', JSON.stringify(curSess));
            } catch (eSav) { }
        }

        cbtSoalListCache = finalSoalList;
        cbtJawabanMap = existingJawaban || {};
        cbtCurrentSoalIndex = 0;
        cbtSesiId = sesiId;
        cbtAsesmenId = asesmenId;
        cbtJawabanId = jawabanId;
        cbtWaktuMenit = parseInt(asm.waktu_menit) || 60;
        cbtTabSwitchCount = 0;

        // Simpan urutan soal ke DB jika belum ada
        if (!savedOrder && cbtJawabanMap._soal_order) {
            triggerCbtImmediateSave(150);
        }

        window._cbtAsmCurrent = asm;

        // Hitung deadline dari waktu mulai mengerjakan & kompensasi teknis
        const { data: myJawaban } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('waktu_mulai_mengerjakan, tambahan_waktu_menit, jawaban_json, updated_at').eq('id', jawabanId).single();
        var mulaiVal = (myJawaban && myJawaban.waktu_mulai_mengerjakan) ? myJawaban.waktu_mulai_mengerjakan : new Date().toISOString();
        var tambahanVal = (myJawaban && myJawaban.tambahan_waktu_menit) ? parseInt(myJawaban.tambahan_waktu_menit) : 0;
        var jwbJson = (myJawaban && myJawaban.jawaban_json) ? myJawaban.jawaban_json : (existingJawaban || {});

        var targetDeadlineMs = calculateCbtDeadlineMs(mulaiVal, cbtWaktuMenit, asm.waktu_selesai_ujian, tambahanVal, jwbJson, myJawaban ? myJawaban.updated_at : null);

        // Jika waktu pengerjaan normal sudah habis tetapi ada tambahan_waktu_menit dan targetDeadlineMs di masa lalu:
        if (tambahanVal > 0 && targetDeadlineMs <= Date.now()) {
            targetDeadlineMs = Date.now() + (tambahanVal * 60 * 1000);
            jwbJson._target_deadline = new Date(targetDeadlineMs).toISOString();
            cbtJawabanMap._target_deadline = jwbJson._target_deadline;
            triggerCbtImmediateSave(150);
        } else if (targetDeadlineMs > Date.now()) {
            if (!jwbJson._target_deadline) {
                jwbJson._target_deadline = new Date(targetDeadlineMs).toISOString();
            }
            cbtJawabanMap._target_deadline = jwbJson._target_deadline;
        }

        cbtDeadline = new Date(targetDeadlineMs);
        window._cbtLastAppliedExtraMenit = tambahanVal;
        window._cbtLastAppliedDeadlineMs = targetDeadlineMs;

        // Cek apakah waktu sudah habis
        if (new Date() >= cbtDeadline) {
            showToast('Waktu pengerjaan ujian sudah habis!', 'error');
            hideGlobalLoader();
            return;
        }

        // Build fullscreen UI
        buildCbtFullscreenUI(asm, jawabanId);

        // Start timer
        startCbtTimer(jawabanId);

        // Start auto-save every 30 seconds
        startCbtAutoSave(jawabanId);

        // Anti-cheat: detect tab switch
        setupAntiCheat(jawabanId);

        // === PERSISTENSI SESI CBT ===
        // Simpan sesi ke localStorage agar bisa di-resume jika browser ditutup/refresh
        try {
            localStorage.setItem('cbt_active_session', JSON.stringify({
                asesmenId: asesmenId,
                sesiId: sesiId,
                jawabanId: jawabanId,
                timestamp: Date.now()
            }));
        } catch(e2) { console.warn('Gagal simpan sesi CBT:', e2); }

        // Cegah tombol kembali (back button) pada HP
        setupCbtBackButtonGuard();

    } catch (e) {
        showToast('Gagal memuat soal CBT: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

function buildCbtFullscreenUI(asm, jawabanId) {
    // Bersihkan sesi UI CBT lama jika ada agar tidak terjadi duplikasi elemen DOM
    var existingContainer = document.getElementById('cbtFullscreen');
    if (existingContainer) {
        existingContainer.remove();
    }
    if (cbtInterval) { clearInterval(cbtInterval); cbtInterval = null; }
    if (cbtAutoSaveInterval) { clearInterval(cbtAutoSaveInterval); cbtAutoSaveInterval = null; }

    var cbtContainer = document.createElement('div');
    cbtContainer.id = 'cbtFullscreen';
    cbtContainer.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f1f5f9;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif;';

    var cbtStyle = '<style>' +
        '@media (max-width: 768px) {' +
        '  #cbtBodyContainer { flex-direction: column !important; }' +
        '  #cbtNavPanel { width: 100% !important; border-left: none !important; border-top: 1px solid #e2e8f0 !important; height: auto !important; max-height: none !important; flex-shrink: 0 !important; overflow: hidden !important; padding: .4rem .8rem !important; }' +
        '  #cbtNavContent { display: none !important; }' +
        '  #cbtNavContent.mobile-open { display: flex !important; max-height: 250px; overflow-y: auto; }' +
        '  #cbtNavToggleIconWrap { display: inline-block !important; }' +
        '  #cbtHeader { padding: .8rem 1rem !important; }' +
        '  #cbtHeaderTitle { display: none !important; }' +
        '  #cbtSoalArea { padding: 1rem 1rem !important; }' +
        '  #cbtTimerBox { padding: .3rem .6rem !important; }' +
        '  #cbtTimerDisplay { font-size: 1.2rem !important; }' +
        '  #cbtFooter { padding: 0.6rem 0.5rem !important; gap: 0.3rem !important; flex-wrap: wrap !important; }' +
        '  #cbtBtnPrev, #cbtBtnNext { padding: 0.5rem 0.6rem !important; font-size: 0.8rem !important; flex: 1; justify-content: center; }' +
        '  #cbtSoalCounter { font-size: 0.75rem !important; text-align: center; width: 100%; order: -1; margin-bottom: 0.3rem; }' +
        '}' +
        '</style>';

    // Header
    var headerHtml = cbtStyle + '<div id="cbtHeader" style="background:linear-gradient(135deg,#1e3a5f,#0f172a);color:white;padding:.8rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">' +
        '<div id="cbtHeaderTitle" style="display:flex;align-items:center;gap:1rem;">' +
        '<div style="background:rgba(255,255,255,.1);padding:8px;border-radius:10px;"><i data-lucide="monitor" style="width:22px;height:22px;color:#93c5fd;"></i></div>' +
        '<div><div style="font-weight:800;font-size:1rem;line-height:1.2;">' + (asm.judul || 'Ujian CBT') + '</div>' +
        '<div style="font-size:.78rem;color:#93c5fd;">' + (asm.mata_pelajaran || '') + ' — ' + (asm.kelas || '') + '</div></div></div>' +
        '<div style="display:flex;align-items:center;gap:1.2rem;margin-left:auto;">' +
        '<div id="cbtTimerBox" style="background:rgba(255,255,255,.1);padding:.5rem 1rem;border-radius:10px;text-align:center;">' +
        '<div style="font-size:.65rem;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;">Sisa Waktu</div>' +
        '<div id="cbtTimerDisplay" style="font-size:1.5rem;font-weight:900;font-family:monospace;color:#fbbf24;">--:--</div></div>' +
        '<button id="cbtTopKumpulkanBtn" onclick="konfirmasiKumpulCbt(\'' + jawabanId + '\')" style="display:none;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;border:none;padding:.6rem 1.2rem;border-radius:10px;font-weight:700;font-size:.85rem;cursor:pointer;align-items:center;gap:.4rem;"><i data-lucide="send" style="width:15px;height:15px;"></i> Kumpulkan</button>' +
        '</div></div>';

    // Body (soal area + navigation panel)
    var bodyHtml = '<div id="cbtBodyContainer" style="flex:1;display:flex;overflow:hidden;flex-direction:row;">';

    // Main soal area
    bodyHtml += '<div id="cbtSoalArea" style="flex:1;overflow-y:auto;padding:1.5rem 2rem;"></div>';

    // Side navigation panel
    bodyHtml += '<div id="cbtNavPanel" style="width:220px;background:white;border-left:1px solid #e2e8f0;padding:1rem;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;">' +
        '<div onclick="if(window.toggleCbtNavContent) window.toggleCbtNavContent()" style="font-weight:700;font-size:.9rem;color:#334155;margin-bottom:.8rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">' +
        '  <span>Navigasi Soal</span>' +
        '  <span id="cbtNavToggleIconWrap" style="display:none;"><i data-lucide="chevron-down" style="width:16px;height:16px;"></i></span>' +
        '</div>' +
        '<div id="cbtNavContent" style="flex:1;display:flex;flex-direction:column;">' +
        '<div id="cbtNavGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem;"></div>' +
        '<div style="margin-top:auto;border-top:1px solid #e2e8f0;padding-top:.8rem;">' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;font-size:.7rem;color:#64748b;">' +
        '<span style="display:flex;align-items:center;gap:3px;"><span style="width:12px;height:12px;border-radius:4px;background:#e2e8f0;"></span>Belum</span>' +
        '<span style="display:flex;align-items:center;gap:3px;"><span style="width:12px;height:12px;border-radius:4px;background:#3b82f6;"></span>Dijawab</span>' +
        '<span style="display:flex;align-items:center;gap:3px;"><span style="width:12px;height:12px;border-radius:4px;background:#fef3c7;border:2px solid #f59e0b;"></span>Ragu</span>' +
        '</div></div></div></div>';

    bodyHtml += '</div>';

    // Footer (prev/next)
    var footerHtml = '<div id="cbtFooter" style="background:white;border-top:1px solid #e2e8f0;padding:.6rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
        '<button id="cbtBtnPrev" onclick="navigasiSoalCbt(-1)" style="background:#f1f5f9;border:1px solid #e2e8f0;padding:.5rem 1rem;border-radius:10px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:.3rem;color:#475569;"><i data-lucide="chevron-left" style="width:16px;height:16px;"></i> Sebelumnya</button>' +
        '<div id="cbtSoalCounter" style="font-size:.85rem;font-weight:600;color:#64748b;">Soal 1 dari ' + cbtSoalListCache.length + '</div>' +
        '<button id="cbtBtnNext" onclick="navigasiSoalCbt(1)" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;padding:.5rem 1rem;border-radius:10px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:.3rem;">Selanjutnya <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button>' +
        '</div>';

    cbtContainer.innerHTML = headerHtml + bodyHtml + footerHtml;
    document.body.appendChild(cbtContainer);

    window.toggleCbtNavContent = function() {
        var wrap = document.getElementById('cbtNavToggleIconWrap');
        if (!wrap || window.getComputedStyle(wrap).display === 'none') return;
        var content = document.getElementById('cbtNavContent');
        if (content.classList.contains('mobile-open')) {
            content.classList.remove('mobile-open');
            wrap.innerHTML = '<i data-lucide="chevron-down" style="width:16px;height:16px;"></i>';
        } else {
            content.classList.add('mobile-open');
            wrap.innerHTML = '<i data-lucide="chevron-up" style="width:16px;height:16px;"></i>';
        }
        if (window.lucide) window.lucide.createIcons();
    };

    if (window.lucide) lucide.createIcons();

    // Render soal pertama
    renderSoalCbt(0);
    updateNavGridCbt();
}

function renderSoalCbt(index) {
    cbtCurrentSoalIndex = index;
    var area = document.getElementById('cbtSoalArea');
    if (!area || !cbtSoalListCache.length) return;

    var s = cbtSoalListCache[index];
    var key = 'soal_' + s.nomor_soal;
    var jawaban = cbtJawabanMap[key] || '';
    var raguKey = 'ragu_' + s.nomor_soal;
    var isRagu = cbtJawabanMap[raguKey] === true;

    var html = '<div style="max-width:700px;margin:0 auto;">';

    // Soal card
    html += '<div style="background:white;border-radius:16px;padding:1.5rem 2rem;box-shadow:0 2px 12px rgba(0,0,0,.05);border:1px solid #e2e8f0;">';

    // Soal header
    var tipeBadge = s.tipe_soal === 'pg'
        ? '<span style="background:rgba(59,130,246,.1);color:#3b82f6;padding:3px 10px;border-radius:6px;font-size:.75rem;font-weight:700;">Pilihan Ganda</span>'
        : '<span style="background:rgba(139,92,246,.1);color:#8b5cf6;padding:3px 10px;border-radius:6px;font-size:.75rem;font-weight:700;">Essay</span>';

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
        '<div style="display:flex;align-items:center;gap:.8rem;">' +
        '<span style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.95rem;">' + (index + 1) + '</span>' +
        tipeBadge + '</div>' +
        '<label style="display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:#f59e0b;cursor:pointer;padding:.3rem .6rem;border-radius:8px;border:1px solid ' + (isRagu ? '#f59e0b' : '#e2e8f0') + ';background:' + (isRagu ? 'rgba(245,158,11,.08)' : 'transparent') + ';">' +
        '<input type="checkbox" ' + (isRagu ? 'checked' : '') + ' onchange="toggleRaguCbt(' + s.nomor_soal + ',this.checked)" style="accent-color:#f59e0b;"> Ragu-ragu</label></div>';

    // Naskah soal
    html += '<div style="font-size:1rem;line-height:1.7;color:#1e293b;margin-bottom:1.2rem;">' + (s.naskah_soal || '').replace(/\n/g, '<br>') + '</div>';

    // Gambar soal (jika ada)
    if (s.gambar_url) {
        var directImg = typeof getDirectImageUrl === 'function' ? getDirectImageUrl(s.gambar_url) : s.gambar_url;
        html += '<div style="margin-bottom:1.2rem;text-align:center;"><img src="' + escAttr(directImg) + '" referrerpolicy="no-referrer" onerror="if(!this._hasRetried){this._hasRetried=1;var m=this.src.match(/\\/d\\/([a-zA-Z0-9_-]+)/);if(m){this.src=\'https://lh3.googleusercontent.com/d/\'+m[1];}else{this.style.opacity=\'0.3\';}}" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;"/></div>';
    }

    // Opsi jawaban
    if (s.tipe_soal === 'pg') {
        var opsiArr = [
            { huruf: 'A', text: s.opsi_a || '' },
            { huruf: 'B', text: s.opsi_b || '' },
            { huruf: 'C', text: s.opsi_c || '' },
            { huruf: 'D', text: s.opsi_d || '' }
        ];
        // Jika ada opsi_e
        if (s.opsi_e) opsiArr.push({ huruf: 'E', text: s.opsi_e });

        html += '<div style="display:flex;flex-direction:column;gap:.6rem;">';
        opsiArr.forEach(function (opsi) {
            if (!opsi.text) return;
            var isSelected = jawaban.toUpperCase() === opsi.huruf;
            var borderColor = isSelected ? '#3b82f6' : '#e2e8f0';
            var bg = isSelected ? 'rgba(59,130,246,.06)' : 'white';
            html += '<label onclick="pilihJawabanPgCbt(' + s.nomor_soal + ',\'' + opsi.huruf + '\')" style="display:flex;align-items:flex-start;gap:.8rem;padding:.8rem 1rem;border:2px solid ' + borderColor + ';background:' + bg + ';border-radius:12px;cursor:pointer;transition:all .2s;">' +
                '<span style="min-width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;flex-shrink:0;' +
                (isSelected ? 'background:#3b82f6;color:white;' : 'background:#f1f5f9;color:#64748b;') + '">' + opsi.huruf + '</span>' +
                '<span style="padding-top:5px;line-height:1.5;color:#334155;">' + opsi.text + '</span></label>';
        });
        html += '</div>';
    } else {
        // Essay
        html += '<textarea id="cbtEssayInput" oninput="simpanJawabanEssayCbt(' + s.nomor_soal + ',this.value)" style="width:100%;min-height:150px;padding:1rem;border:2px solid #e2e8f0;border-radius:12px;font-size:.95rem;line-height:1.6;resize:vertical;outline:none;font-family:inherit;transition:border-color .2s;" onfocus="this.style.borderColor=\'#3b82f6\'" onblur="this.style.borderColor=\'#e2e8f0\'" placeholder="Tulis jawaban Anda di sini...">' + (jawaban || '') + '</textarea>';
    }

    html += '</div></div>';

    area.innerHTML = html;
    area.scrollTop = 0;

    // Update counter
    var counter = document.getElementById('cbtSoalCounter');
    if (counter) counter.textContent = 'Soal ' + (index + 1) + ' dari ' + cbtSoalListCache.length;

    // Update prev/next buttons
    var btnPrev = document.getElementById('cbtBtnPrev');
    var btnNext = document.getElementById('cbtBtnNext');
    if (btnPrev) btnPrev.style.visibility = index === 0 ? 'hidden' : 'visible';
    if (btnNext) {
        if (index === cbtSoalListCache.length - 1) {
            btnNext.innerHTML = '<i data-lucide="flag" style="width:15px;height:15px;"></i> Selesai';
            btnNext.onclick = function () { konfirmasiKumpulCbt(); };
        } else {
            btnNext.innerHTML = 'Selanjutnya <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>';
            btnNext.onclick = function () { navigasiSoalCbt(1); };
        }
        if (window.lucide) lucide.createIcons();
    }

    updateNavGridCbt();
}

// Debounce auto-save seketika (instant save) saat siswa memilih jawaban / mengetik essay
var _cbtSaveDebounceTimer = null;
function triggerCbtImmediateSave(delay) {
    if (!cbtJawabanId) return;
    if (_cbtSaveDebounceTimer) clearTimeout(_cbtSaveDebounceTimer);
    _cbtSaveDebounceTimer = setTimeout(function() {
        saveCbtJawabanToDb(cbtJawabanId, true);
    }, delay != null ? delay : 250);
}

function flushCbtImmediateSave() {
    if (_cbtSaveDebounceTimer) {
        clearTimeout(_cbtSaveDebounceTimer);
        _cbtSaveDebounceTimer = null;
        if (cbtJawabanId) {
            saveCbtJawabanToDb(cbtJawabanId, true);
        }
    }
}

function pilihJawabanPgCbt(nomorSoal, huruf) {
    var key = 'soal_' + nomorSoal;
    cbtJawabanMap[key] = huruf;
    renderSoalCbt(cbtCurrentSoalIndex);
    // Simpan instan ke database agar langsung terbaca di menu Intip Pengawas
    triggerCbtImmediateSave(200);
}

function simpanJawabanEssayCbt(nomorSoal, text) {
    var key = 'soal_' + nomorSoal;
    cbtJawabanMap[key] = text;
    updateNavGridCbt();
    // Simpan essay dengan debounce 400ms saat mengetik
    triggerCbtImmediateSave(400);
}

function toggleRaguCbt(nomorSoal, isRagu) {
    var key = 'ragu_' + nomorSoal;
    cbtJawabanMap[key] = isRagu;
    updateNavGridCbt();
    triggerCbtImmediateSave(200);
}

function navigasiSoalCbt(direction) {
    flushCbtImmediateSave();
    var newIndex = cbtCurrentSoalIndex + direction;
    if (newIndex < 0 || newIndex >= cbtSoalListCache.length) return;
    renderSoalCbt(newIndex);
}

function goToSoalCbt(index) {
    flushCbtImmediateSave();
    if (index < 0 || index >= cbtSoalListCache.length) return;
    renderSoalCbt(index);
}

function updateNavGridCbt() {
    var grid = document.getElementById('cbtNavGrid');
    if (!grid) return;
    
    var totalSoal = cbtSoalListCache.length;
    var countFilled = 0;
    
    grid.innerHTML = cbtSoalListCache.map(function (s, i) {
        var key = 'soal_' + s.nomor_soal;
        var raguKey = 'ragu_' + s.nomor_soal;
        var hasAnswer = cbtJawabanMap[key] && String(cbtJawabanMap[key]).trim().length > 0;
        var isRagu = cbtJawabanMap[raguKey] === true;
        var isCurrent = i === cbtCurrentSoalIndex;

        if (hasAnswer || isRagu) countFilled++;

        var bg = '#e2e8f0'; var color = '#475569'; var border = 'transparent';
        if (isCurrent) { bg = '#1e3a5f'; color = 'white'; border = '#1e3a5f'; }
        else if (isRagu) { bg = '#fef3c7'; color = '#92400e'; border = '#f59e0b'; }
        else if (hasAnswer) { bg = '#3b82f6'; color = 'white'; border = '#3b82f6'; }

        return '<button onclick="goToSoalCbt(' + i + ')" style="width:45px;height:45px;border-radius:8px;border:2px solid ' + border + ';background:' + bg + ';color:' + color + ';font-weight:700;font-size:.9rem;cursor:pointer;transition:all .15s;flex-shrink:0;">' + (i + 1) + '</button>';
    }).join('');
    
    var btnKumpul = document.getElementById('cbtTopKumpulkanBtn');
    if (btnKumpul) {
        if (countFilled === totalSoal) btnKumpul.style.display = 'flex';
        else btnKumpul.style.display = 'none';
    }
}

// ================= TIMER =================
function startCbtTimer(jawabanId) {
    if (cbtInterval) { clearInterval(cbtInterval); cbtInterval = null; }

    var timerTickCount = 0;
    async function checkLiveCompensation() {
        if (!jawabanId) return;
        try {
            const { data: curJwb } = await supabaseClient
                .from('cbt_jawaban_siswa')
                .select('tambahan_waktu_menit, jawaban_json, waktu_mulai_mengerjakan, status')
                .eq('id', jawabanId)
                .maybeSingle();

            if (curJwb) {
                var curExt = parseInt(curJwb.tambahan_waktu_menit) || 0;
                var curJwbJson = curJwb.jawaban_json || {};
                var serverTargetMs = curJwbJson._target_deadline ? new Date(curJwbJson._target_deadline).getTime() : 0;

                if (typeof window._cbtLastAppliedExtraMenit === 'undefined') {
                    window._cbtLastAppliedExtraMenit = curExt;
                }

                // Skenario A: Pengawas menambah kompensasi menit baru via tombol '+ Waktu'
                if (curExt > window._cbtLastAppliedExtraMenit) {
                    var addedMin = curExt - window._cbtLastAppliedExtraMenit;
                    window._cbtLastAppliedExtraMenit = curExt;
                    var addedMs = addedMin * 60 * 1000;

                    if (!cbtDeadline || cbtDeadline.getTime() < Date.now()) {
                        cbtDeadline = new Date(Date.now() + addedMs);
                    } else {
                        cbtDeadline = new Date(cbtDeadline.getTime() + addedMs);
                    }

                    window._cbtLastAppliedDeadlineMs = cbtDeadline.getTime();
                    if (cbtJawabanMap) {
                        cbtJawabanMap._target_deadline = cbtDeadline.toISOString();
                    }
                    tickTimer();
                    if (typeof showToast === 'function') {
                        showToast('⏰ Pengawas menambahkan kompensasi waktu +' + addedMin + ' menit!', 'success');
                    }
                    triggerCbtImmediateSave(200);
                }
                // Skenario B: Target deadline diperbarui secara eksplisit di database (misal admin klik izinkan lanjut)
                else if (serverTargetMs && serverTargetMs > Date.now()) {
                    var curDeadlineMs = cbtDeadline ? cbtDeadline.getTime() : 0;
                    if (Math.abs(serverTargetMs - curDeadlineMs) >= 4000 && Math.abs(serverTargetMs - (window._cbtLastAppliedDeadlineMs || 0)) >= 4000) {
                        window._cbtLastAppliedDeadlineMs = serverTargetMs;
                        window._cbtLastAppliedExtraMenit = curExt;
                        cbtDeadline = new Date(serverTargetMs);
                        if (cbtJawabanMap) {
                            cbtJawabanMap._target_deadline = curJwbJson._target_deadline;
                        }
                        tickTimer();
                    }
                }
            }
        } catch (eLive) { }
    }

    function tickTimer() {
        if (!cbtDeadline) return;
        var now = new Date();
        var diff = cbtDeadline - now;
        var display = document.getElementById('cbtTimerDisplay');
        var box = document.getElementById('cbtTimerBox');

        if (diff <= 0) {
            if (cbtInterval) { clearInterval(cbtInterval); cbtInterval = null; }
            if (display) display.textContent = '00:00';
            // Auto submit
            autoKumpulCbt(jawabanId);
            return;
        }

        var minutes = Math.floor(diff / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);
        var timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        if (display) display.textContent = timeStr;

        // Warning colors
        if (box) {
            if (minutes < 5) {
                box.style.background = 'rgba(239,68,68,.2)';
                if (display) display.style.color = '#fca5a5';
            } else if (minutes < 10) {
                box.style.background = 'rgba(245,158,11,.15)';
                if (display) display.style.color = '#fcd34d';
            } else {
                box.style.background = 'rgba(255,255,255,.1)';
                if (display) display.style.color = 'white';
            }
        }

        // Cek kompensasi waktu live setiap 3 detik
        timerTickCount++;
        if (timerTickCount % 3 === 0) {
            checkLiveCompensation();
        }
    }

    // Jalankan segera
    tickTimer();
    checkLiveCompensation(); // Cek langsung saat timer dinyalakan!
    cbtInterval = setInterval(tickTimer, 1000);

    // Sync juga saat tab/layar HP dinyalakan kembali
    window.addEventListener('focus', function() {
        checkLiveCompensation();
        tickTimer();
    });
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            checkLiveCompensation();
            tickTimer();
        }
    });
}

// ================= AUTO-SAVE =================
function startCbtAutoSave(jawabanId) {
    if (cbtAutoSaveInterval) clearInterval(cbtAutoSaveInterval);
    cbtAutoSaveInterval = setInterval(function () {
        saveCbtJawabanToDb(jawabanId, false);
    }, 30000); // Every 30 seconds
}

async function saveCbtJawabanToDb(jawabanId, silent) {
    try {
        // Filter out ragu keys for actual jawaban saving
        var jawabanClean = {};
        Object.keys(cbtJawabanMap).forEach(function (k) {
            jawabanClean[k] = cbtJawabanMap[k];
        });

        await supabaseClient.from('cbt_jawaban_siswa').update({
            jawaban_json: jawabanClean,
            tab_switch_count: cbtTabSwitchCount,
            updated_at: new Date().toISOString()
        }).eq('id', jawabanId);

        // Periksa live jika pengawas memberikan kompensasi tambahan waktu
        try {
            const { data: curJwb } = await supabaseClient
                .from('cbt_jawaban_siswa')
                .select('tambahan_waktu_menit, jawaban_json')
                .eq('id', jawabanId)
                .maybeSingle();

            if (curJwb) {
                var curExt = parseInt(curJwb.tambahan_waktu_menit) || 0;
                var curJwbJson = curJwb.jawaban_json || {};
                var serverTargetMs = curJwbJson._target_deadline ? new Date(curJwbJson._target_deadline).getTime() : 0;

                if (typeof window._cbtLastAppliedExtraMenit !== 'undefined' && curExt > window._cbtLastAppliedExtraMenit) {
                    var diffM = curExt - window._cbtLastAppliedExtraMenit;
                    window._cbtLastAppliedExtraMenit = curExt;
                    var addedMs = diffM * 60 * 1000;
                    if (!cbtDeadline || cbtDeadline.getTime() < Date.now()) {
                        cbtDeadline = new Date(Date.now() + addedMs);
                    } else {
                        cbtDeadline = new Date(cbtDeadline.getTime() + addedMs);
                    }
                    window._cbtLastAppliedDeadlineMs = cbtDeadline.getTime();
                    if (cbtJawabanMap) cbtJawabanMap._target_deadline = cbtDeadline.toISOString();
                    if (typeof showToast === 'function') {
                        showToast('⏰ Anda mendapatkan kompensasi waktu +' + diffM + ' menit dari pengawas!', 'success');
                    }
                } else if (serverTargetMs && serverTargetMs > Date.now()) {
                    var curDeadlineMs = cbtDeadline ? cbtDeadline.getTime() : 0;
                    if (Math.abs(serverTargetMs - curDeadlineMs) >= 4000 && Math.abs(serverTargetMs - (window._cbtLastAppliedDeadlineMs || 0)) >= 4000) {
                        window._cbtLastAppliedDeadlineMs = serverTargetMs;
                        window._cbtLastAppliedExtraMenit = curExt;
                        cbtDeadline = new Date(serverTargetMs);
                        if (cbtJawabanMap) cbtJawabanMap._target_deadline = curJwbJson._target_deadline;
                    }
                }
            }
        } catch (errTime) { }

        if (!silent) {
            // Show subtle save indicator
            var indicator = document.createElement('div');
            indicator.style.cssText = 'position:fixed;bottom:70px;right:20px;background:#10b981;color:white;padding:6px 14px;border-radius:8px;font-size:.78rem;font-weight:600;z-index:999999;animation:fadeIn .3s ease;';
            indicator.textContent = '✓ Tersimpan otomatis';
            document.body.appendChild(indicator);
            setTimeout(function () { indicator.remove(); }, 2000);
        }
    } catch (e) {
        console.warn('CBT auto-save failed:', e);
    }
}

// ================= ANTI-CHEAT (MAKSIMAL 3X PERINGATAN) =================
async function handleCheatDisqualification(jawabanId) {
    try {
        var jawabanClean = {};
        Object.keys(cbtJawabanMap).forEach(function (k) {
            if (!k.startsWith('_')) jawabanClean[k] = cbtJawabanMap[k];
        });

        // Load soal dan asesmen untuk grading nilai pengerjaan terakhir
        const { data: soalList } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', cbtAsesmenId).order('nomor_soal', { ascending: true });

        const { data: asm } = await supabaseClient.from('asesmen')
            .select('bobot_pg, bobot_essay, judul').eq('id', cbtAsesmenId).single();

        var nilai = hitungNilaiCbt(jawabanClean, soalList || [], asm);

        // Tandai flag pelanggaran di dalam jawaban_json
        jawabanClean._is_cheat_submitted = true;
        jawabanClean._tabSwitchCount = cbtTabSwitchCount;

        var updatePayload = {
            jawaban_json: jawabanClean,
            nilai: nilai,
            status: 'selesai',
            tab_switch_count: cbtTabSwitchCount,
            waktu_kumpul: new Date().toISOString()
        };

        // Coba update dengan is_cheat_submitted jika kolom tersedia di tabel
        var { error: errCheatCol } = await supabaseClient.from('cbt_jawaban_siswa')
            .update(Object.assign({}, updatePayload, { is_cheat_submitted: true }))
            .eq('id', jawabanId);
        
        // Fallback jika kolom is_cheat_submitted belum dibuat di DB
        if (errCheatCol) {
            console.warn('Update dengan kolom is_cheat_submitted gagal, menggunakan fallback update:', errCheatCol.message);
            var { error: errFallback } = await supabaseClient.from('cbt_jawaban_siswa')
                .update(updatePayload)
                .eq('id', jawabanId);
            if (errFallback) console.error('Fallback handleCheatDisqualification gagal:', errFallback);
        }

        // Otomatis kirim nilai ke Input Penilaian (nilai_akademik)
        if (typeof _syncSingleCbtNilai === 'function') {
            try { await _syncSingleCbtNilai(jawabanId); } catch(errSync) { console.warn('Auto sync nilai cbt error:', errSync); }
        }

        cleanupCbtSession();

        // Tampilkan modal diskualifikasi & penyelesaian ujian otomatis
        showNotifModal('Ujian Selesai Otomatis (Pelanggaran > 3x)',
            '<div style="text-align:center;padding:1rem 0;">' +
            '<div style="background:#fee2e2;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">' +
            '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>' +
            '<h3 style="margin-bottom:.5rem;color:#991b1b;font-size:1.2rem;">Ujian Dihentikan & Diselesaikan</h3>' +
            '<p style="color:#475569;font-size:.9rem;line-height:1.6;margin-bottom:1rem;">' +
            'Anda terdeteksi meninggalkan layar ujian lebih dari 3 kali (pelanggaran ke-<strong>' + cbtTabSwitchCount + '</strong>).<br>' +
            'Sesuai ketentuan integritas CBT, ujian Anda otomatis <strong>dikumpulkan dan diselesaikan</strong>.<br><br>' +
            'Nilai Akhir: <strong style="color:#0369a1;font-size:1.3rem;">' + nilai + '</strong> (dihitung dari nomor yang sudah dikerjakan).' +
            '</p>' +
            '<div style="background:#fef2f2;border:1px solid #fca5a5;padding:.8rem 1rem;border-radius:10px;font-size:.82rem;color:#b91c1c;margin-bottom:1rem;line-height:1.5;">' +
            '🔒 Anda <strong>tidak dapat masuk kembali</strong> ke ujian ini dengan token kecuali telah mendapatkan izin khusus dari Guru Pengawas / Administrator CBT.' +
            '</div>' +
            '</div>', 'error');

    } catch (e) {
        console.error('handleCheatDisqualification error:', e);
        cleanupCbtSession();
    }
}

var _cbtVisHandler = null;
var _cbtCtxHandler = null;

function setupAntiCheat(jawabanId) {
    // Bersihkan listener sebelumnya agar tidak double-count pelanggaran
    if (_cbtVisHandler) {
        document.removeEventListener('visibilitychange', _cbtVisHandler);
        _cbtVisHandler = null;
    }
    if (_cbtCtxHandler) {
        document.removeEventListener('contextmenu', _cbtCtxHandler);
        _cbtCtxHandler = null;
    }

    // Detect tab switching / visibility change
    _cbtVisHandler = function () {
        if (document.hidden && document.getElementById('cbtFullscreen')) {
            cbtTabSwitchCount++;
            cbtJawabanMap._tabSwitchCount = cbtTabSwitchCount;
            saveCbtJawabanToDb(jawabanId, true);

            // Jika mengulangi lebih dari 3 kali (> 3), ujian langsung selesai & dinilai apa adanya
            if (cbtTabSwitchCount > 3) {
                var oldWarn = document.getElementById('cbtTabWarn');
                if (oldWarn) oldWarn.remove();
                handleCheatDisqualification(jawabanId);
                return;
            }

            // Pesan peringatan bertingkat (1 s/d 3 kali)
            var warnTitle, warnDesc, warnColor;
            if (cbtTabSwitchCount === 1) {
                warnTitle = 'Peringatan Pelanggaran (1 dari 3)';
                warnDesc = 'Anda terdeteksi meninggalkan layar ujian CBT (membuka tab atau aplikasi lain). Pelanggaran ini tercatat di sistem pengawas.<br><br><span style="color:#b45309;font-weight:600;">Peringatan maksimal 3 kali. Jika lebih dari 3 kali, ujian Anda akan otomatis dikumpulkan & diselesaikan.</span>';
                warnColor = '#f59e0b';
            } else if (cbtTabSwitchCount === 2) {
                warnTitle = 'Peringatan Pelanggaran (2 dari 3)';
                warnDesc = 'Anda kembali terdeteksi meninggalkan layar ujian untuk yang <strong>kedua kalinya</strong>!<br><br><span style="color:#dc2626;font-weight:700;">Hati-hati! Tersisa 1 kesempatan lagi sebelum ujian Anda otomatis dihentikan secara permanen.</span>';
                warnColor = '#ea580c';
            } else {
                warnTitle = 'PERINGATAN TERAKHIR! (3 dari 3)';
                warnDesc = '<strong style="color:#dc2626;font-size:1rem;">INI ADALAH KESEMPATAN TERAKHIR ANDA!</strong><br><br>Jika Anda meninggalkan layar ujian satu kali lagi (pelanggaran ke-4), ujian Anda akan <strong>LANGSUNG SELESAI OTOMATIS</strong> dan nilai dikunci!';
                warnColor = '#dc2626';
            }

            // Show warning modal when user returns
            var warn = document.createElement('div');
            warn.id = 'cbtTabWarn';
            warn.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
            warn.innerHTML = '<div style="background:white;border-radius:20px;padding:2rem;text-align:center;max-width:440px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,.3);">' +
                '<div style="width:64px;height:64px;background:' + (cbtTabSwitchCount === 3 ? '#fee2e2' : '#fef3c7') + ';border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="' + warnColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>' +
                '<h3 style="margin:0 0 .5rem;color:' + warnColor + ';font-size:1.15rem;">' + warnTitle + '</h3>' +
                '<div style="color:#475569;font-size:.88rem;line-height:1.6;margin-bottom:1.2rem;">' + warnDesc + '</div>' +
                '<button onclick="document.getElementById(\'cbtTabWarn\').remove();" style="width:100%;background:' + warnColor + ';color:white;border:none;padding:.75rem 2rem;border-radius:12px;font-weight:700;font-size:.95rem;cursor:pointer;">Saya Mengerti, Kembali ke Soal</button></div>';

            var showWarn = function () {
                if (!document.hidden && document.getElementById('cbtFullscreen')) {
                    var exWarn = document.getElementById('cbtTabWarn');
                    if (exWarn) exWarn.remove();
                    document.body.appendChild(warn);
                    document.removeEventListener('visibilitychange', showWarn);
                }
            };
            document.addEventListener('visibilitychange', showWarn);
        }
    };
    document.addEventListener('visibilitychange', _cbtVisHandler);

    // Disable right-click
    _cbtCtxHandler = function (e) {
        if (document.getElementById('cbtFullscreen')) {
            e.preventDefault();
        }
    };
    document.addEventListener('contextmenu', _cbtCtxHandler);
}

// ================= KUMPULKAN UJIAN =================
function konfirmasiKumpulCbt(jawabanId) {
    // Count unanswered
    var totalSoal = cbtSoalListCache.length;
    var dijawab = 0;
    cbtSoalListCache.forEach(function (s) {
        var key = 'soal_' + s.nomor_soal;
        if (cbtJawabanMap[key] && String(cbtJawabanMap[key]).trim().length > 0) dijawab++;
    });
    var belumDijawab = totalSoal - dijawab;

    var msg = '<div style="text-align:left;font-size:.9rem;">' +
        '<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #e2e8f0;"><span>Total Soal</span><strong>' + totalSoal + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #e2e8f0;"><span style="color:#10b981;">✓ Dijawab</span><strong style="color:#10b981;">' + dijawab + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:.4rem 0;"><span style="color:#dc2626;">✗ Belum dijawab</span><strong style="color:#dc2626;">' + belumDijawab + '</strong></div>' +
        '</div>';

    if (belumDijawab > 0) {
        msg += '<div style="background:#fef3c7;padding:.6rem 1rem;border-radius:8px;margin-top:.8rem;font-size:.85rem;color:#92400e;">⚠ Masih ada <strong>' + belumDijawab + ' soal</strong> yang belum dijawab!</div>';
    }

    showCustomConfirm(
        'Kumpulkan Ujian?',
        msg + '<p style="margin-top:1rem;font-size:.85rem;color:#64748b;">Setelah dikumpulkan, Anda <strong>tidak dapat</strong> mengubah jawaban lagi.</p>',
        'Ya, Kumpulkan',
        function () { submitCbtFinal(); }
    );
}

async function submitCbtFinal() {
    showGlobalLoader('Mengumpulkan jawaban & menghitung nilai...');
    try {
        // Save jawaban terakhir
        var jawabanClean = {};
        Object.keys(cbtJawabanMap).forEach(function (k) {
            if (!k.startsWith('_')) jawabanClean[k] = cbtJawabanMap[k];
        });

        // Load soal untuk grading
        const { data: soalList } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', cbtAsesmenId).order('nomor_soal', { ascending: true });

        const { data: asm } = await supabaseClient.from('asesmen')
            .select('bobot_pg, bobot_essay').eq('id', cbtAsesmenId).single();

        var nilai = hitungNilaiCbt(jawabanClean, soalList || [], asm);

        await supabaseClient.from('cbt_jawaban_siswa').update({
            jawaban_json: jawabanClean,
            nilai: nilai,
            status: 'selesai',
            tab_switch_count: cbtTabSwitchCount,
            waktu_kumpul: new Date().toISOString()
        }).eq('id', cbtJawabanId);

        // Otomatis sinkronisasi nilai ke menu Input Penilaian (nilai_akademik)
        if (typeof _syncSingleCbtNilai === 'function') {
            try { await _syncSingleCbtNilai(cbtJawabanId); } catch(errSync) { console.warn('Auto sync nilai cbt error:', errSync); }
        }

        // Cleanup
        cleanupCbtSession();

        // Show result
        showHasilUjianCbt(nilai, asm);

    } catch (e) {
        showToast('Gagal mengumpulkan jawaban: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function autoKumpulCbt(jawabanId) {
    showGlobalLoader('Waktu habis! Mengumpulkan jawaban otomatis...');
    try {
        // Gunakan jawabanId parameter jika tersedia, fallback ke cbtJawabanId global
        var jId = jawabanId || cbtJawabanId;
        var jawabanClean = {};
        Object.keys(cbtJawabanMap).forEach(function (k) {
            if (!k.startsWith('_')) jawabanClean[k] = cbtJawabanMap[k];
        });

        const { data: soalList } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', cbtAsesmenId).order('nomor_soal', { ascending: true });

        const { data: asm } = await supabaseClient.from('asesmen')
            .select('bobot_pg, bobot_essay').eq('id', cbtAsesmenId).single();

        var nilai = hitungNilaiCbt(jawabanClean, soalList || [], asm);

        await supabaseClient.from('cbt_jawaban_siswa').update({
            jawaban_json: jawabanClean,
            nilai: nilai,
            status: 'selesai',
            tab_switch_count: cbtTabSwitchCount,
            waktu_kumpul: new Date().toISOString()
        }).eq('id', jId);

        // Otomatis sinkronisasi nilai ke menu Input Penilaian (nilai_akademik)
        if (typeof _syncSingleCbtNilai === 'function') {
            try { await _syncSingleCbtNilai(jId); } catch(errSync) { console.warn('Auto sync nilai cbt error:', errSync); }
        }

        cleanupCbtSession();
        showHasilUjianCbt(nilai, asm);

    } catch (e) {
        showToast('Gagal submit otomatis: ' + e.message, 'error');
        cleanupCbtSession();
        window.location.reload();
    } finally {
        hideGlobalLoader();
    }
}

// ================= GRADING =================
function hitungNilaiCbt(jawaban, soalList, asm) {
    if (!soalList || soalList.length === 0) return 0;
    jawaban = jawaban || {};

    var bobotPG = (asm && asm.bobot_pg !== null && asm.bobot_pg !== undefined && !isNaN(Number(asm.bobot_pg)))
        ? parseFloat(asm.bobot_pg) : 0;
    var bobotEssay = (asm && asm.bobot_essay !== null && asm.bobot_essay !== undefined && !isNaN(Number(asm.bobot_essay)))
        ? parseFloat(asm.bobot_essay) : 0;

    var pgSoal = soalList.filter(function (s) { return s.tipe_soal === 'pg'; });
    var essaySoal = soalList.filter(function (s) { return s.tipe_soal === 'essay'; });

    // Grade PG (auto) — bandingkan huruf pertama (charAt(0)) agar "A. Opsi" tetap match "A"
    var pgBenar = 0;
    pgSoal.forEach(function (s) {
        var key = 'soal_' + s.nomor_soal;
        var jawabanSiswa = String(jawaban[key] || '').trim().toUpperCase();
        var kunci = String(s.kunci_jawaban || '').trim().toUpperCase();
        var userChar = jawabanSiswa ? jawabanSiswa.charAt(0) : '';
        var kunciChar = kunci ? kunci.charAt(0) : '';
        if (userChar && kunciChar && userChar === kunciChar) pgBenar++;
    });

    var nilaiPG = pgBenar * bobotPG;

    // Essay: Cek keyword matching (sederhana)
    var essayBenar = 0;
    if (essaySoal.length > 0) {
        essaySoal.forEach(function (s) {
            var key = 'soal_' + s.nomor_soal;
            var jawabanSiswa = String(jawaban[key] || '').trim().toLowerCase();
            var rawKunci = String(s.kunci_jawaban || '').trim();
            var kunciLow = rawKunci.toLowerCase();

            if (!kunciLow || !jawabanSiswa) return;

            var isOrLogic = false;
            var keywordString = kunciLow;

            // Deteksi penanda [OR] di awal kunci jawaban
            if (kunciLow.startsWith('[or]')) {
                isOrLogic = true;
                keywordString = kunciLow.substring(4).trim();
            } else if (kunciLow.indexOf('|') !== -1) {
                isOrLogic = true;
            }

            var keywords = keywordString.split(/[;|,]/).map(function (k) { return k.trim(); }).filter(Boolean);

            if (keywords.length === 0) return;

            if (isOrLogic) {
                // OR logic: salah satu keyword cocok = benar (poin penuh)
                var found = keywords.some(function (kw) { return jawabanSiswa.indexOf(kw) !== -1; });
                if (found) essayBenar++;
            } else {
                // AND logic: parsial, berikan poin berdasarkan jumlah keyword yang cocok
                var matchCount = 0;
                keywords.forEach(function (kw) {
                    if (jawabanSiswa.indexOf(kw) !== -1) matchCount++;
                });
                essayBenar += matchCount / keywords.length;
            }
        });
    }
    var essayNilai = essayBenar * bobotEssay;

    // Hitung total bobot keseluruhan ujian
    var totalBobot = (pgSoal.length * bobotPG) + (essaySoal.length * bobotEssay);
    var finalScore = 0;

    if (totalBobot > 0) {
        if (totalBobot === 100) {
            // Bobot sudah terkalibrasi sempurna ke skala 100
            finalScore = nilaiPG + essayNilai;
        } else {
            // Auto-scale ke 100 jika totalBobot bukan 100
            finalScore = ((nilaiPG + essayNilai) / totalBobot) * 100;
        }
    } else {
        // Fallback: bobot 0 atau tidak diset — hitung persentase benar
        if (pgSoal.length > 0 && essaySoal.length === 0) {
            finalScore = (pgBenar / pgSoal.length) * 100;
        } else if (soalList.length > 0) {
            finalScore = ((pgBenar + essayBenar) / soalList.length) * 100;
        }
    }

    finalScore = Math.round(finalScore * 100) / 100;
    return Math.max(0, Math.min(finalScore, 100));
}

// ================= HASIL =================
function showHasilUjianCbt(nilai, asm) {
    var grade = '';
    var gradeColor = '';
    var emoji = '';
    
    // Find KKM based on mapel and kelas
    var kkm = 75; // Default KKM
    if (asm && window.masterKkmList && window.masterKelasList && window.masterMapelList) {
        var kelasId = null;
        var mapelId = null;
        
        // Find mapelId
        for (var m=0; m < masterMapelList.length; m++) {
            if (masterMapelList[m].nama_mapel === asm.mata_pelajaran) {
                mapelId = masterMapelList[m].id;
                break;
            }
        }
        
        // Find kelasId (tingkat)
        var tingkat = 0;
        for (var k=0; k < masterKelasList.length; k++) {
            if (masterKelasList[k].nama_kelas === asm.kelas) {
                kelasId = masterKelasList[k].id;
                tingkat = masterKelasList[k].tingkat;
                break;
            }
        }
        
        // Find KKM
        if (mapelId) {
            for (var i=0; i < masterKkmList.length; i++) {
                if (masterKkmList[i].mapel_id === mapelId) {
                    if (kelasId && masterKkmList[i].kelas_id === kelasId) {
                        kkm = masterKkmList[i].nilai_kkm;
                        break;
                    } else if (tingkat && masterKkmList[i].tingkat === tingkat) {
                        kkm = masterKkmList[i].nilai_kkm;
                        break;
                    } else if (!masterKkmList[i].kelas_id && !masterKkmList[i].tingkat) {
                        kkm = masterKkmList[i].nilai_kkm;
                    }
                }
            }
        }
    }

    if (nilai >= kkm) { grade = 'Lulus'; gradeColor = '#10b981'; emoji = '🌟'; }
    else { grade = 'Tidak Lulus'; gradeColor = '#ef4444'; emoji = '💪'; }

    var content = '<div style="text-align:center;">' +
        '<div style="font-size:3rem;margin-bottom:.5rem;">' + emoji + '</div>' +
        '<div style="font-size:3.5rem;font-weight:900;color:' + gradeColor + ';margin-bottom:.3rem;">' + nilai + '</div>' +
        '<div style="font-size:1.1rem;font-weight:700;color:' + gradeColor + ';margin-bottom:1rem;">' + grade + '</div>' +
        '<p style="color:#64748b;font-size:.9rem;margin-bottom:1.5rem;">Ujian telah selesai. Jawaban Anda berhasil dikumpulkan.</p>' +
        (cbtTabSwitchCount > 0 ? '<div style="background:#fef2f2;padding:.6rem;border-radius:8px;font-size:.82rem;color:#dc2626;margin-bottom:1rem;">⚠ Pelanggaran berpindah tab: <strong>' + cbtTabSwitchCount + 'x</strong></div>' : '') +
        '</div>';

    showNotifModal('Ujian Selesai!', content, 'success');

    // Ganti fungsi tombol OK agar me-reload halaman (kembali ke dashboard)
    setTimeout(function() {
        var btnOk = document.querySelector('#notifActions button');
        if (btnOk) {
            btnOk.onclick = function() {
                closeNotifModal();
                window.location.reload();
            };
        }
    }, 100);
}

// ================= CLEANUP =================
function cleanupCbtSession() {
    if (cbtInterval) { clearInterval(cbtInterval); cbtInterval = null; }
    if (cbtAutoSaveInterval) { clearInterval(cbtAutoSaveInterval); cbtAutoSaveInterval = null; }

    // Bersihkan anti-cheat listeners agar tidak double-fire di sesi berikutnya
    if (_cbtVisHandler) {
        document.removeEventListener('visibilitychange', _cbtVisHandler);
        _cbtVisHandler = null;
    }
    if (_cbtCtxHandler) {
        document.removeEventListener('contextmenu', _cbtCtxHandler);
        _cbtCtxHandler = null;
    }

    var fs = document.getElementById('cbtFullscreen');
    if (fs) fs.remove();
    cbtSoalListCache = [];
    cbtJawabanMap = {};
    cbtCurrentSoalIndex = 0;
    cbtTabSwitchCount = 0;
    cbtJawabanId = '';

    // Hapus sesi CBT dari localStorage
    try { localStorage.removeItem('cbt_active_session'); } catch(e) {}

    // Hapus back button guard
    removeCbtBackButtonGuard();
}

// ================= KIRIM NILAI KE BUKU NILAI =================

async function kirimNilaiCbtSatuan(jawabanId) {
    showGlobalLoader('Mengirim nilai ke buku nilai...');
    try {
        var result = await _syncSingleCbtNilai(jawabanId);
        if (result.success) {
            showToast('Nilai ' + result.nama + (result.nilai !== undefined ? ' (' + result.nilai + ')' : '') + ' berhasil dikirim ke buku nilai!', 'success');
            // Refresh monitor table
            var sesiId = result.sesiId;
            if (sesiId) refreshMonitorCbt(sesiId);
        } else {
            showToast('Gagal: ' + result.error, 'error');
        }
    } catch (e) {
        showToast('Gagal mengirim nilai: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function kirimSemuaNilaiCbt(asesmenId, sesiId) {
    showCustomConfirm('Kirim Semua Nilai?',
        'Semua nilai siswa yang statusnya <strong>Selesai</strong> dan belum terkirim akan dikirim ke menu <strong>Input Penilaian</strong>.',
        'Ya, Kirim Semua',
        async function() {
            showGlobalLoader('Mengirim semua nilai ke buku nilai...');
            try {
                const { data: jawabanList } = await supabaseClient.from('cbt_jawaban_siswa')
                    .select('id').eq('sesi_id', sesiId).eq('status', 'selesai').is('nilai_synced', null);

                if (!jawabanList || jawabanList.length === 0) {
                    showToast('Semua nilai sudah terkirim atau belum ada yang selesai.', 'info');
                    hideGlobalLoader();
                    return;
                }

                var successCount = 0;
                var failCount = 0;
                for (var i = 0; i < jawabanList.length; i++) {
                    try {
                        var r = await _syncSingleCbtNilai(jawabanList[i].id);
                        if (r.success) successCount++;
                        else failCount++;
                    } catch(e) { failCount++; }
                }

                showToast(successCount + ' nilai berhasil dikirim' + (failCount > 0 ? ', ' + failCount + ' gagal' : '') + '!', successCount > 0 ? 'success' : 'warning');
                if (sesiId) refreshMonitorCbt(sesiId);
            } catch(e) {
                showToast('Gagal: ' + e.message, 'error');
            } finally {
                hideGlobalLoader();
            }
        }
    );
}

async function _syncSingleCbtNilai(jawabanId) {
    // 1. Get jawaban data with asesmen info (termasuk jawaban_json untuk recalculate)
    const { data: jwb } = await supabaseClient.from('cbt_jawaban_siswa')
        .select('id, siswa_id, nilai, jawaban_json, sesi_id, siswa:siswa_id(nama_lengkap, kelas_id), sesi_ujian:sesi_id(asesmen_id)')
        .eq('id', jawabanId).single();

    if (!jwb) return { success: false, error: 'Data jawaban tidak valid' };

    var asesmenId = jwb.sesi_ujian ? jwb.sesi_ujian.asesmen_id : null;
    if (!asesmenId) return { success: false, error: 'Asesmen ID tidak ditemukan' };

    // 2. Get asesmen info (termasuk bobot untuk recalculate)
    const { data: asm } = await supabaseClient.from('asesmen')
        .select('tipe_ujian, mata_pelajaran, kelas, tahun_pelajaran, semester, bobot_pg, bobot_essay')
        .eq('id', asesmenId).single();
    if (!asm) return { success: false, error: 'Data asesmen tidak ditemukan' };

    // 3. RECALCULATE nilai dari jawaban_json + asesmen_soal (JANGAN percaya jwb.nilai yang bisa 0/stale)
    var verifiedNilai = jwb.nilai || 0;
    try {
        const { data: soalList } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });

        if (soalList && soalList.length > 0 && jwb.jawaban_json) {
            // Bersihkan jawaban dari internal flags
            var cleanJawaban = {};
            Object.keys(jwb.jawaban_json).forEach(function(k) {
                if (!k.startsWith('_')) cleanJawaban[k] = jwb.jawaban_json[k];
            });
            var recalculated = hitungNilaiCbt(cleanJawaban, soalList, asm);
            if (recalculated !== null && !isNaN(recalculated)) {
                verifiedNilai = recalculated;
            }
        }
    } catch (calcErr) {
        console.warn('[CBT Sync] Gagal recalculate nilai, gunakan nilai tersimpan:', calcErr);
    }

    verifiedNilai = Math.round(verifiedNilai * 100) / 100;

    // 4. Update nilai di cbt_jawaban_siswa jika berbeda dari yang tersimpan
    if (verifiedNilai !== jwb.nilai) {
        await supabaseClient.from('cbt_jawaban_siswa')
            .update({ nilai: verifiedNilai }).eq('id', jawabanId);
        console.log('[CBT Sync] Nilai dikoreksi dari', jwb.nilai, 'menjadi', verifiedNilai, 'untuk jawaban', jawabanId);
    }

    // 5. Map tipe_ujian to nilai_akademik column
    var tipe = (asm.tipe_ujian || '').toUpperCase();
    var updateObj = {};
    if (tipe === 'STS' || tipe === 'PENILAIAN HARIAN') {
        updateObj.nilai_sts = verifiedNilai;
    } else if (tipe === 'SAS') {
        updateObj.nilai_sas = verifiedNilai;
    } else if (tipe === 'SAJ') {
        updateObj.nilai_saj = verifiedNilai;
    } else if (tipe === 'SAT') {
        updateObj.nilai_sat = verifiedNilai;
    } else {
        updateObj.nilai_sts = verifiedNilai;
    }

    // 6. Find mapel_id and kelas_id from master data
    var siswaKelasId = jwb.siswa ? jwb.siswa.kelas_id : null;
    if (!siswaKelasId) return { success: false, error: 'Kelas siswa tidak ditemukan' };

    // Find mapel_id by name matching
    const { data: mapelMatch } = await supabaseClient.from('master_mapel')
        .select('id').ilike('nama_mapel', asm.mata_pelajaran).limit(1);
    var mapelId = (mapelMatch && mapelMatch.length > 0) ? mapelMatch[0].id : null;
    if (!mapelId) return { success: false, error: 'Mata pelajaran "' + asm.mata_pelajaran + '" tidak ditemukan di master data' };

    // 7. Upsert to nilai_akademik
    var tahun = asm.tahun_pelajaran || '';
    var semester = asm.semester || 'Ganjil';
    // If tahun not set in asesmen, try from active year
    if (!tahun) {
        var lblYear = document.getElementById('lblActiveYear');
        tahun = lblYear ? lblYear.textContent : '';
    }

    var payload = Object.assign({
        tahun_pelajaran: tahun,
        semester: semester,
        kelas_id: siswaKelasId,
        mapel_id: mapelId,
        siswa_id: jwb.siswa_id
    });

    // Check if row already exists
    const { data: exRow } = await supabaseClient.from('nilai_akademik')
        .select('*')
        .eq('tahun_pelajaran', tahun)
        .eq('semester', semester)
        .eq('kelas_id', siswaKelasId)
        .eq('mapel_id', mapelId)
        .eq('siswa_id', jwb.siswa_id)
        .single();
        
    // If it's a new row, we must pass null for missing grades to override the default 0 in the DB schema
    if (!exRow) {
        payload.nilai_sts = null;
        payload.nilai_sas = null;
        payload.nilai_saj = null;
        payload.nilai_sat = null;
    } else {
        payload.nilai_sts = exRow.nilai_sts;
        payload.nilai_sas = exRow.nilai_sas;
        payload.nilai_saj = exRow.nilai_saj;
        payload.nilai_sat = exRow.nilai_sat;
    }
    
    // Apply the actual update
    Object.assign(payload, updateObj);

    const { error: upsertErr } = await supabaseClient.from('nilai_akademik')
        .upsert(payload, { onConflict: 'tahun_pelajaran, semester, kelas_id, mapel_id, siswa_id' });
    if (upsertErr) return { success: false, error: upsertErr.message };

    // 8. Mark as synced
    await supabaseClient.from('cbt_jawaban_siswa').update({ nilai_synced: true }).eq('id', jawabanId);

    return { success: true, nama: jwb.siswa ? jwb.siswa.nama_lengkap : '', sesiId: jwb.sesi_id, nilai: verifiedNilai };
}

// ================= AUTO END SESI CBT & SCHEDULE CHECKER =================

// Mengakhiri sesi CBT secara otomatis, menghitung nilai siswa yang masih mengerjakan, dan menonaktifkan ujian
async function cbtAutoEndSesiImmediate(sesiId, asesmenId) {
    try {
        var now = new Date();

        // 1. Dapatkan asesmenId jika belum ada
        if (!asesmenId && sesiId) {
            const { data: sData } = await supabaseClient.from('cbt_sesi_ujian')
                .select('asesmen_id').eq('id', sesiId).single();
            if (sData) asesmenId = sData.asesmen_id;
        }

        // 2. Nonaktifkan asesmen
        if (asesmenId) {
            await supabaseClient.from('asesmen').update({ ujian_aktif: false }).eq('id', asesmenId);
        }

        // 3. Dapatkan daftar sesi yang masih 'berjalan'
        var sesiList = [];
        if (sesiId) {
            sesiList = [{ id: sesiId }];
        } else if (asesmenId) {
            const { data } = await supabaseClient.from('cbt_sesi_ujian')
                .select('id').eq('asesmen_id', asesmenId).eq('status', 'berjalan');
            sesiList = data || [];
        }

        if (sesiList.length === 0) return;

        // Ambil data asesmen & soal untuk grading otomatis
        var asm = null;
        var soalList = null;
        if (asesmenId) {
            const { data: asmData } = await supabaseClient.from('asesmen')
                .select('id, bobot_pg, bobot_essay').eq('id', asesmenId).single();
            asm = asmData;
            const { data: sList } = await supabaseClient.from('asesmen_soal')
                .select('*').eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });
            soalList = sList;
        }

        for (var s = 0; s < sesiList.length; s++) {
            var currSesiId = sesiList[s].id;

            // Update status CBT sesi = selesai
            await supabaseClient.from('cbt_sesi_ujian').update({
                status: 'selesai',
                waktu_selesai: now.toISOString()
            }).eq('id', currSesiId);

            // Auto kumpul & grading siswa yang masih mengerjakan
            const { data: pending } = await supabaseClient.from('cbt_jawaban_siswa')
                .select('*').eq('sesi_id', currSesiId).eq('status', 'mengerjakan');

            if (pending && pending.length > 0) {
                for (var p = 0; p < pending.length; p++) {
                    var nilai = (typeof hitungNilaiCbt === 'function' && soalList && asm)
                        ? hitungNilaiCbt(pending[p].jawaban_json || {}, soalList, asm)
                        : (pending[p].nilai || 0);

                    await supabaseClient.from('cbt_jawaban_siswa').update({
                        status: 'selesai',
                        nilai: nilai,
                        waktu_kumpul: now.toISOString()
                    }).eq('id', pending[p].id);

                    if (typeof _syncSingleCbtNilai === 'function') {
                        try { await _syncSingleCbtNilai(pending[p].id); } catch(errSync) { console.warn('Auto sync nilai cbt error:', errSync); }
                    }
                }
            }
        }

        console.log('[CBT] Sesi ujian otomatis diakhiri karena waktu pengerjaan telah berakhir.');
    } catch (e) {
        console.error('[CBT] Gagal auto-end sesi:', e);
    }
}

// Menjalankan pengecekan jadwal tutup ujian secara otomatis
async function cbtScheduleChecker() {
    // Jalankan untuk admin, guru, dan kurikulum (case-insensitive)
    var role = (currentUser && currentUser.role ? currentUser.role : currentRole || '').toLowerCase();
    if (!['admin', 'guru', 'kurikulum'].includes(role)) return;

    try {
        var now = new Date();
        var isChanged = false;

        // Cari asesmen CBT aktif yang memiliki jadwal waktu selesai
        const { data: toCheck } = await supabaseClient.from('asesmen')
            .select('id, is_cbt_native, waktu_selesai_ujian, status_aktif:ujian_aktif')
            .eq('ujian_aktif', true)
            .eq('is_cbt_native', true)
            .is('deleted_at', null);

        if (toCheck && toCheck.length > 0) {
            for (var i = 0; i < toCheck.length; i++) {
                var a = toCheck[i];
                var selesai = a.waktu_selesai_ujian ? new Date(a.waktu_selesai_ujian) : null;

                // Jika waktu selesai ujian sudah tercapai atau terlewati
                if (selesai && now >= selesai) {
                    await cbtAutoEndSesiImmediate(null, a.id);
                    isChanged = true;
                }
            }
        }

        // Refresh UI jika ada sesi yang otomatis ditutup
        if (isChanged) {
            if (typeof loadSoalUjian === 'function') loadSoalUjian();
            if (typeof loadAsesmenList === 'function') loadAsesmenList();
        }

    } catch (e) {
        console.error('Schedule checker error:', e);
    }
}

// Jalankan checker setiap 10 detik
setInterval(cbtScheduleChecker, 10000);
// Jalankan langsung saat script siap
setTimeout(cbtScheduleChecker, 2000);

// ================= BACK BUTTON GUARD =================
var _cbtPopstateHandler = null;

function setupCbtBackButtonGuard() {
    // Push dummy state agar back button tidak keluar dari halaman
    history.pushState({ cbt: true }, '', window.location.href);
    history.pushState({ cbt: true }, '', window.location.href);

    _cbtPopstateHandler = function(e) {
        if (document.getElementById('cbtFullscreen')) {
            // Siswa masih di CBT → cegah navigasi, push state kembali
            history.pushState({ cbt: true }, '', window.location.href);
        }
    };
    window.addEventListener('popstate', _cbtPopstateHandler);
}

function removeCbtBackButtonGuard() {
    if (_cbtPopstateHandler) {
        window.removeEventListener('popstate', _cbtPopstateHandler);
        _cbtPopstateHandler = null;
    }
}

// ================= AUTO-RESUME CBT SESSION =================
// Dipanggil saat halaman dashboard dimuat.
// Jika ada sesi CBT aktif di localStorage, cek ke database apakah masih valid,
// lalu langsung masuk kembali ke CBT tanpa perlu token.
var _cbtResumeRunning = false; // Guard agar tidak double-fire
async function cbtAutoResumeSession() {
    // Cegah pemanggilan ganda (dari dashboard_ui.js + DOMContentLoaded)
    if (_cbtResumeRunning) return;
    _cbtResumeRunning = true;

    try {
        var raw = localStorage.getItem('cbt_active_session');
        if (!raw) return;
        var session = JSON.parse(raw);
        if (!session || !session.asesmenId || !session.jawabanId) {
            localStorage.removeItem('cbt_active_session');
            return;
        }

        // Hanya untuk siswa
        if (!currentUser || currentRole !== 'siswa') {
            localStorage.removeItem('cbt_active_session');
            return;
        }

        // Jika UI CBT sudah terbuka (sudah di-resume), lewati
        if (document.getElementById('cbtFullscreen')) {
            return;
        }

        // Cek apakah jawaban masih berstatus 'mengerjakan' di database dan bukan terkena diskualifikasi
        var { data: jwb, error: jwbErr } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('id, status, jawaban_json, sesi_id, tab_switch_count, tambahan_waktu_menit')
            .eq('id', session.jawabanId)
            .single();

        var isCheatResumeLocked = jwb && ((jwb.tab_switch_count && jwb.tab_switch_count > 3) || 
                                          (jwb.is_cheat_submitted === true) || 
                                          (jwb.jawaban_json && jwb.jawaban_json._is_cheat_submitted === true));

        // Jika siswa mendapat kompensasi tambahan waktu dari pengawas (tambahan_waktu_menit > 0), abaikan lock lama
        if (jwb && jwb.tambahan_waktu_menit > 0) {
            isCheatResumeLocked = false;
        }

        if (jwbErr || !jwb || jwb.status !== 'mengerjakan' || isCheatResumeLocked) {
            // Sesi sudah selesai/diblokir/diskualifikasi pelanggaran/tidak valid → hapus
            localStorage.removeItem('cbt_active_session');
            return;
        }

        // Cek apakah sesi ujian masih berjalan
        var { data: sesi, error: sesiErr } = await supabaseClient.from('cbt_sesi_ujian')
            .select('id, status')
            .eq('id', jwb.sesi_id)
            .single();

        // Jika sesi berstatus selesai, tapi siswa memiliki tambahan waktu kompensasi aktif, tetap izinkan lanjut
        var hasCompensation = jwb && jwb.tambahan_waktu_menit > 0;
        if (sesiErr || !sesi || (sesi.status !== 'berjalan' && !hasCompensation)) {
            // Sesi sudah ditutup guru & tidak ada kompensasi → hapus
            localStorage.removeItem('cbt_active_session');
            return;
        }

        // Semua valid → langsung masuk kembali ke CBT!
        console.log('[CBT] Auto-resume: Melanjutkan sesi aktif...');
        showGlobalLoader('Melanjutkan ujian CBT Anda...');

        // Set cbtSiswaId
        var { data: siswaData } = await supabaseClient.from('siswa')
            .select('id').eq('user_id', currentUser.id).single();
        if (siswaData) cbtSiswaId = siswaData.id;

        // Langsung render UI ujian
        await renderUiUjianCbt(session.asesmenId, jwb.sesi_id, session.jawabanId, jwb.jawaban_json || {});

        // Pulihkan tab_switch_count dari database agar pelanggaran tetap terdeteksi pada resume
        if (jwb.tab_switch_count && jwb.tab_switch_count > 0) {
            cbtTabSwitchCount = jwb.tab_switch_count;
        }

        hideGlobalLoader();

    } catch (e) {
        console.error('[CBT] Auto-resume gagal:', e);
        localStorage.removeItem('cbt_active_session');
    } finally {
        _cbtResumeRunning = false;
    }
}

// Panggil auto-resume saat DOM ready (jika di dashboard)
document.addEventListener('DOMContentLoaded', function() {
    // Tunggu inisialisasi dashboard selesai (supabase + auth), lalu cek
    setTimeout(function() {
        if (typeof cbtAutoResumeSession === 'function' && typeof supabaseClient !== 'undefined' && typeof currentUser !== 'undefined' && currentUser) {
            cbtAutoResumeSession();
        }
    }, 2500); // Delay 2.5 detik agar dashboard sudah fully loaded
});

// ============================================================
// FITUR ANALISIS BUTIR SOAL OTOMATIS (ITEM ANALYSIS)
// Khusus Guru / Admin / Pengawas (Dilarang untuk Role Siswa)
// ============================================================

function closeAnalisisButirSoalModal() {
    var m = document.getElementById('modalAnalisisButirSoal');
    if (m) {
        m.style.display = 'none';
        m.classList.remove('active');
    }
}

async function openAnalisisButirSoalCbt(asesmenId) {
    if (typeof currentRole !== 'undefined' && currentRole === 'siswa') {
        showToast('Akses ditolak: Fitur Analisis Butir Soal hanya untuk Guru dan Administrator.', 'error');
        return;
    }

    if (!asesmenId) {
        showToast('ID Asesmen tidak valid.', 'warning');
        return;
    }

    showGlobalLoader('Menganalisis butir soal...');
    try {
        // 1. Ambil data asesmen
        const { data: asm, error: errAsm } = await supabaseClient.from('asesmen')
            .select('*').eq('id', asesmenId).single();
        if (errAsm || !asm) throw new Error('Data asesmen tidak ditemukan.');

        // 2. Ambil seluruh butir soal
        const { data: soalList, error: errSoal } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });
        if (errSoal) throw errSoal;
        if (!soalList || soalList.length === 0) {
            throw new Error('Asesmen ini belum memiliki data butir soal.');
        }

        // 3. Ambil seluruh sesi ujian untuk asesmen ini
        const { data: sesiList, error: errSesi } = await supabaseClient.from('cbt_sesi_ujian')
            .select('id, token, status').eq('asesmen_id', asesmenId);
        if (errSesi) throw errSesi;

        var sesiIds = (sesiList || []).map(function(s) { return s.id; });
        var rawSubmissions = [];
        if (sesiIds.length > 0) {
            const { data: jwbData, error: errJwb } = await supabaseClient.from('cbt_jawaban_siswa')
                .select('id, siswa_id, status, nilai, jawaban_json, waktu_mulai_mengerjakan, waktu_kumpul, siswa:siswa_id(nama_lengkap, nisn)')
                .in('sesi_id', sesiIds);
            if (errJwb) throw errJwb;
            rawSubmissions = jwbData || [];
        }

        // Saring siswa yang benar-benar mengerjakan (ada jawaban_json atau status selesai)
        var validSubmissions = rawSubmissions.filter(function(sub) {
            var jwb = sub.jawaban_json || {};
            var keys = Object.keys(jwb).filter(function(k) { return !k.startsWith('_'); });
            return keys.length > 0 || sub.status === 'selesai' || sub.nilai != null;
        });

        var modal = document.getElementById('modalAnalisisButirSoal');
        var body = document.getElementById('analisisModalBody');
        if (!modal || !body) {
            throw new Error('Elemen modal analisis tidak ditemukan.');
        }

        if (validSubmissions.length === 0) {
            body.innerHTML = '<div style="text-align:center;padding:3.5rem 1.5rem;color:#64748b;">' +
                '<div style="width:64px;height:64px;border-radius:50%;background:#e0e7ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:1.8rem;">📊</div>' +
                '<h3 style="margin:0 0 .5rem 0;font-size:1.2rem;color:#1e293b;font-weight:700;">Belum Ada Data Peserta</h3>' +
                '<p style="max-width:520px;margin:0 auto 1.5rem;line-height:1.5;font-size:.9rem;">Analisis butir soal (Tingkat Kesukaran P, Daya Pembeda D, dan Efektivitas Pengecoh) akan dihitung otomatis setelah ada siswa yang mengerjakan atau mengumpulkan ujian ini.</p>' +
                '<button onclick="closeAnalisisButirSoalModal()" class="btn btn-outline" style="min-height:44px;padding:.5rem 2rem;border-radius:10px;">Tutup</button>' +
                '</div>';
            modal.style.display = 'flex';
            modal.classList.add('active');
            if (window.lucide) lucide.createIcons();
            hideGlobalLoader();
            return;
        }

        // 4. Hitung Skor Tiap Siswa jika belum terisi
        validSubmissions.forEach(function(sub) {
            if (sub.nilai == null && typeof hitungNilaiCbt === 'function') {
                sub.nilai = hitungNilaiCbt(sub.jawaban_json || {}, soalList, asm);
            }
        });

        // Urutkan siswa dari nilai tertinggi ke terendah
        validSubmissions.sort(function(a, b) {
            return (b.nilai || 0) - (a.nilai || 0);
        });

        var N = validSubmissions.length;
        var scores = validSubmissions.map(function(s) { return s.nilai || 0; });
        var sumScore = scores.reduce(function(a, b) { return a + b; }, 0);
        var avgScore = Math.round((sumScore / N) * 10) / 10;
        var maxScore = Math.max.apply(null, scores);
        var minScore = Math.min.apply(null, scores);

        // Tentukan Kelompok Atas (Upper Group) dan Kelompok Bawah (Lower Group)
        // Standar psikometrik pendidikan: 27% teratas dan 27% terbawah (atau separuh jika peserta sedikit)
        var groupSize = N >= 6 ? Math.max(1, Math.round(N * 0.27)) : Math.max(1, Math.floor(N / 2));
        var upperGroup = validSubmissions.slice(0, groupSize);
        var lowerGroup = validSubmissions.slice(validSubmissions.length - groupSize);

        // 5. Analisis Per Butir Soal
        var statsList = [];
        var countMudah = 0, countSedang = 0, countSukar = 0;
        var countBaik = 0, countRevisi = 0;

        soalList.forEach(function(s, idx) {
            var key = 'soal_' + s.nomor_soal;
            var kunciRaw = String(s.kunci_jawaban || '').trim().toUpperCase();
            var kunciChar = kunciRaw ? kunciRaw.charAt(0) : '';

            var dist = { A: 0, B: 0, C: 0, D: 0, E: 0, kosong: 0 };
            var correctTotal = 0;
            var correctUpper = 0;
            var correctLower = 0;

            // Total hitung
            validSubmissions.forEach(function(sub) {
                var jwbVal = String((sub.jawaban_json && sub.jawaban_json[key]) || '').trim().toUpperCase();
                var charAns = jwbVal ? jwbVal.charAt(0) : '';
                if (s.tipe_soal === 'pg') {
                    if (['A', 'B', 'C', 'D', 'E'].indexOf(charAns) !== -1) {
                        dist[charAns]++;
                    } else {
                        dist.kosong++;
                    }
                    if (charAns && charAns === kunciChar) {
                        correctTotal++;
                    }
                } else {
                    // Essay: jika diisi
                    if (jwbVal.length > 0) correctTotal++;
                }
            });

            // Upper group
            upperGroup.forEach(function(sub) {
                var jwbVal = String((sub.jawaban_json && sub.jawaban_json[key]) || '').trim().toUpperCase();
                var charAns = jwbVal ? jwbVal.charAt(0) : '';
                if (charAns && charAns === kunciChar) correctUpper++;
            });

            // Lower group
            lowerGroup.forEach(function(sub) {
                var jwbVal = String((sub.jawaban_json && sub.jawaban_json[key]) || '').trim().toUpperCase();
                var charAns = jwbVal ? jwbVal.charAt(0) : '';
                if (charAns && charAns === kunciChar) correctLower++;
            });

            // Tingkat Kesukaran (P = Correct / Total)
            var P = Math.round((correctTotal / N) * 100) / 100;
            var katP = 'Sedang';
            var katColorP = '#0369a1';
            var katBgP = '#e0f2fe';
            if (P > 0.70) {
                katP = 'Mudah';
                katColorP = '#15803d';
                katBgP = '#dcfce7';
                countMudah++;
            } else if (P < 0.30) {
                katP = 'Sukar';
                katColorP = '#b45309';
                katBgP = '#fef3c7';
                countSukar++;
            } else {
                countSedang++;
            }

            // Daya Pembeda (D = (BA/JA) - (BB/JB))
            var pUpper = groupSize > 0 ? (correctUpper / groupSize) : 0;
            var pLower = groupSize > 0 ? (correctLower / groupSize) : 0;
            var D = Math.round((pUpper - pLower) * 100) / 100;

            var katD = 'Baik';
            var katColorD = '#0369a1';
            var katBgD = '#e0f2fe';
            var isRevisi = false;

            if (D >= 0.40) {
                katD = 'Sangat Baik';
                katColorD = '#15803d';
                katBgD = '#dcfce7';
                countBaik++;
            } else if (D >= 0.30) {
                katD = 'Baik';
                katColorD = '#0369a1';
                katBgD = '#e0f2fe';
                countBaik++;
            } else if (D >= 0.20) {
                katD = 'Cukup';
                katColorD = '#b45309';
                katBgD = '#fef3c7';
                countBaik++;
            } else if (D >= 0) {
                katD = 'Kurang';
                katColorD = '#c2410c';
                katBgD = '#ffedd5';
                countRevisi++;
                isRevisi = true;
            } else {
                katD = 'Negatif';
                katColorD = '#dc2626';
                katBgD = '#fee2e2';
                countRevisi++;
                isRevisi = true;
            }

            // Status Rekomendasi
            var rekomendasi = '';
            var statusBadge = '';
            if (D >= 0.30 && P >= 0.25 && P <= 0.75) {
                rekomendasi = 'Soal ideal & bermutu tinggi (Diterima)';
                statusBadge = '<span style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">✓ Diterima</span>';
            } else if (D < 0) {
                rekomendasi = 'Kunci jawaban atau soal membingungkan siswa pintar (Revisi Total)';
                statusBadge = '<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">✕ Revisi Kunci</span>';
            } else if (P > 0.85) {
                rekomendasi = 'Terlalu mudah; perbaiki opsi pengecoh agar lebih mengecoh';
                statusBadge = '<span style="background:#fef3c7;color:#b45309;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">⚠️ Terlalu Mudah</span>';
            } else if (P < 0.15) {
                rekomendasi = 'Terlalu sukar; periksa redaksi kalimat atau materi pembelajaran';
                statusBadge = '<span style="background:#fef3c7;color:#b45309;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">⚠️ Terlalu Sukar</span>';
            } else if (D < 0.20) {
                rekomendasi = 'Daya pembeda rendah; perbaiki pengecoh atau redaksi soal';
                statusBadge = '<span style="background:#ffedd5;color:#c2410c;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">⚠️ Daya Pembeda Rendah</span>';
            } else {
                rekomendasi = 'Soal cukup baik (Diterima dengan revisi minor)';
                statusBadge = '<span style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:6px;font-size:.75rem;font-weight:700;">✓ Cukup Baik</span>';
            }

            statsList.push({
                soal: s,
                nomor: s.nomor_soal,
                indexDisplay: idx + 1,
                tipe: s.tipe_soal,
                kunci: kunciChar || s.kunci_jawaban || '-',
                dist: dist,
                correctTotal: correctTotal,
                P: P,
                katP: katP,
                katColorP: katColorP,
                katBgP: katBgP,
                D: D,
                katD: katD,
                katColorD: katColorD,
                katBgD: katBgD,
                isRevisi: isRevisi,
                statusBadge: statusBadge,
                rekomendasi: rekomendasi
            });
        });

        // Simpan cache hasil untuk Cetak / Ekspor
        window._lastAnalisisCbt = {
            asm: asm,
            statsList: statsList,
            totalPeserta: N,
            avgScore: avgScore,
            maxScore: maxScore,
            minScore: minScore,
            groupSize: groupSize
        };

        // Render UI Modal
        var infoCardHtml = '<div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #c7d2fe;border-radius:14px;padding:1.1rem 1.4rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">' +
            '<div>' +
            '  <h4 style="margin:0 0 .25rem 0;font-size:1.15rem;font-weight:800;color:#312e81;">' + escHtml(asm.judul || '-') + '</h4>' +
            '  <div style="font-size:.85rem;color:#4338ca;display:flex;gap:1rem;flex-wrap:wrap;">' +
            '    <span>Mapel: <strong>' + escHtml(asm.mata_pelajaran || '-') + '</strong></span>' +
            '    <span>Kelas: <strong>' + escHtml(asm.kelas || '-') + '</strong></span>' +
            '    <span>Durasi: <strong>' + (asm.waktu_menit || 60) + ' Menit</strong></span>' +
            '    <span>Total Soal: <strong>' + soalList.length + ' Butir</strong></span>' +
            '  </div>' +
            '</div>' +
            '<div style="display:flex;gap:.5rem;flex-wrap:wrap;">' +
            '  <button onclick="cetakLaporanAnalisisButir()" class="btn btn-sm btn-outline" style="min-height:38px;padding:.35rem .9rem;font-size:.82rem;display:inline-flex;align-items:center;gap:4px;border-color:#6366f1;color:#4338ca;"><i data-lucide="printer" style="width:14px;height:14px;"></i> Cetak Laporan</button>' +
            '  <button onclick="eksporCsvAnalisisButir()" class="btn btn-sm" style="min-height:38px;padding:.35rem .9rem;font-size:.82rem;background:#4338ca;color:white;border:none;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="download" style="width:14px;height:14px;"></i> Unduh CSV</button>' +
            '</div>' +
            '</div>';

        // KPI Grid Cards (Stack 1 kolom di layar mobile <= 992px)
        var kpiHtml = '<div class="analisis-kpi-grid">' +
            '<div class="analisis-kpi-card blue">' +
            '  <div class="analisis-kpi-lbl">Total Peserta</div>' +
            '  <div class="analisis-kpi-val">' + N + ' Siswa</div>' +
            '  <div class="analisis-kpi-sub">Kelompok Uji: ' + groupSize + ' atas / ' + groupSize + ' bawah</div>' +
            '</div>' +
            '<div class="analisis-kpi-card indigo">' +
            '  <div class="analisis-kpi-lbl">Rata-Rata Nilai</div>' +
            '  <div class="analisis-kpi-val">' + avgScore + '</div>' +
            '  <div class="analisis-kpi-sub">Tertinggi: ' + maxScore + ' • Terendah: ' + minScore + '</div>' +
            '</div>' +
            '<div class="analisis-kpi-card green">' +
            '  <div class="analisis-kpi-lbl">Kategori Kesukaran</div>' +
            '  <div class="analisis-kpi-val" style="font-size:1.2rem;">' + countSedang + ' <span style="font-size:.8rem;font-weight:600;color:#0369a1;">Sedang</span> • ' + countMudah + ' <span style="font-size:.8rem;font-weight:600;color:#15803d;">Mudah</span></div>' +
            '  <div class="analisis-kpi-sub">' + countSukar + ' butir kategori sukar</div>' +
            '</div>' +
            '<div class="analisis-kpi-card ' + (countRevisi > 0 ? 'amber' : 'green') + '">' +
            '  <div class="analisis-kpi-lbl">Kualitas Butir Soal</div>' +
            '  <div class="analisis-kpi-val" style="font-size:1.2rem;">' + countBaik + ' <span style="font-size:.8rem;font-weight:600;color:#15803d;">Diterima</span> • ' + countRevisi + ' <span style="font-size:.8rem;font-weight:600;color:#dc2626;">Revisi</span></div>' +
            '  <div class="analisis-kpi-sub">' + (countRevisi > 0 ? '⚠️ Ada soal dengan daya pembeda rendah' : '✓ Seluruh butir soal memenuhi standar') + '</div>' +
            '</div>' +
            '</div>';

        // Filter Bar
        var filterBarHtml = '<div class="analisis-filter-bar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.75rem;">' +
            '<div style="display:flex;gap:.4rem;flex-wrap:wrap;">' +
            '  <button type="button" class="btn btn-sm btn-filter-analisis active" onclick="filterAnalisisButirTable(\'all\', this)" style="background:#4338ca;color:white;border:none;padding:.35rem .8rem;border-radius:8px;font-size:.8rem;font-weight:600;">Semua Soal (' + statsList.length + ')</button>' +
            '  <button type="button" class="btn btn-sm btn-filter-analisis" onclick="filterAnalisisButirTable(\'revisi\', this)" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:.35rem .8rem;border-radius:8px;font-size:.8rem;font-weight:600;">⚠️ Perlu Revisi (' + countRevisi + ')</button>' +
            '  <button type="button" class="btn btn-sm btn-filter-analisis" onclick="filterAnalisisButirTable(\'sukar\', this)" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:.35rem .8rem;border-radius:8px;font-size:.8rem;font-weight:600;">Sukar (' + countSukar + ')</button>' +
            '  <button type="button" class="btn btn-sm btn-filter-analisis" onclick="filterAnalisisButirTable(\'sedang\', this)" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:.35rem .8rem;border-radius:8px;font-size:.8rem;font-weight:600;">Sedang (' + countSedang + ')</button>' +
            '  <button type="button" class="btn btn-sm btn-filter-analisis" onclick="filterAnalisisButirTable(\'mudah\', this)" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:.35rem .8rem;border-radius:8px;font-size:.8rem;font-weight:600;">Mudah (' + countMudah + ')</button>' +
            '</div>' +
            '<div style="font-size:.8rem;color:#64748b;">' +
            '  Standar Evaluasi: <strong>P</strong> (Tingkat Kesukaran) & <strong>D</strong> (Daya Pembeda)' +
            '</div>' +
            '</div>';

        // Table Rows
        var rowsHtml = statsList.map(function(st) {
            var rowFilterClass = 'analisis-row';
            if (st.isRevisi) rowFilterClass += ' filter-revisi';
            if (st.katP === 'Sukar') rowFilterClass += ' filter-sukar';
            if (st.katP === 'Sedang') rowFilterClass += ' filter-sedang';
            if (st.katP === 'Mudah') rowFilterClass += ' filter-mudah';

            // Distribusi Pilihan Ganda (A, B, C, D)
            var distHtml = '-';
            if (st.tipe === 'pg') {
                distHtml = '<div style="display:flex;gap:4px;justify-content:center;font-size:.78rem;font-family:monospace;">';
                ['A', 'B', 'C', 'D'].forEach(function(huruf) {
                    var isKunci = huruf === st.kunci;
                    var count = st.dist[huruf] || 0;
                    var pct = N > 0 ? Math.round((count / N) * 100) : 0;
                    var styleBg = isKunci ? 'background:#dcfce7;color:#15803d;border:1px solid #86efac;font-weight:800;' : 'background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;';
                    distHtml += '<span title="' + huruf + ': ' + count + ' siswa (' + pct + '%)' + (isKunci ? ' [KUNCI]' : '') + '" style="padding:2px 5px;border-radius:4px;' + styleBg + '">' + huruf + ':' + count + '</span>';
                });
                distHtml += '</div>';
            }

            var dSign = st.D >= 0 ? '+' : '';

            return '<tr class="' + rowFilterClass + '" style="' + (st.isRevisi ? 'background:rgba(254,242,242,0.5);' : '') + '">' +
                '<td style="text-align:center;font-weight:700;">' + st.nomor + '</td>' +
                '<td style="text-align:center;"><span style="font-size:.75rem;font-weight:600;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:#475569;">' + (st.tipe === 'pg' ? 'PG' : 'Essay') + '</span></td>' +
                '<td style="text-align:center;"><strong style="color:#15803d;font-size:.95rem;">' + escHtml(st.kunci) + '</strong></td>' +
                '<td style="text-align:center;">' + distHtml + '</td>' +
                '<td style="text-align:center;">' +
                '  <div style="font-weight:800;color:' + st.katColorP + ';font-size:.95rem;">' + st.P.toFixed(2) + '</div>' +
                '  <span style="background:' + st.katBgP + ';color:' + st.katColorP + ';padding:1px 6px;border-radius:4px;font-size:.7rem;font-weight:700;">' + st.katP + '</span>' +
                '</td>' +
                '<td style="text-align:center;">' +
                '  <div style="font-weight:800;color:' + st.katColorD + ';font-size:.95rem;">' + dSign + st.D.toFixed(2) + '</div>' +
                '  <span style="background:' + st.katBgD + ';color:' + st.katColorD + ';padding:1px 6px;border-radius:4px;font-size:.7rem;font-weight:700;">' + st.katD + '</span>' +
                '</td>' +
                '<td>' +
                '  <div style="margin-bottom:2px;">' + st.statusBadge + '</div>' +
                '  <div style="font-size:.76rem;color:#475569;line-height:1.3;">' + st.rekomendasi + '</div>' +
                '</td>' +
                '<td style="text-align:center;">' +
                '  <button onclick="toggleDetailNaskahSoalAnalisis(' + st.nomor + ')" class="btn btn-sm btn-outline" style="font-size:.72rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;border-radius:6px;" title="Lihat naskah butir soal"><i data-lucide="eye" style="width:12px;height:12px;"></i> Naskah</button>' +
                '</td>' +
                '</tr>' +
                '<tr id="naskahRow_' + st.nomor + '" style="display:none;background:#f8fafc;">' +
                '<td colspan="8" style="padding:1rem 1.5rem;border-left:4px solid #6366f1;">' +
                '  <div style="font-weight:700;margin-bottom:.4rem;color:#1e293b;font-size:.9rem;">Naskah Soal Nomor ' + st.nomor + ':</div>' +
                '  <div style="font-size:.88rem;color:#334155;line-height:1.6;margin-bottom:.8rem;">' + (st.soal.naskah_soal || '').replace(/\n/g, '<br>') + '</div>' +
                '  <div style="font-size:.82rem;color:#64748b;display:flex;gap:1.5rem;flex-wrap:wrap;background:white;padding:.6rem 1rem;border-radius:8px;border:1px solid #e2e8f0;">' +
                '    <span>Kunci Jawaban: <strong style="color:#15803d;">' + escHtml(st.soal.kunci_jawaban || '-') + '</strong></span>' +
                '    <span>Benar Menjawab: <strong>' + st.correctTotal + ' dari ' + N + ' Siswa (' + Math.round(st.P * 100) + '%)</strong></span>' +
                '  </div>' +
                '</td>' +
                '</tr>';
        }).join('');

        var tableHtml = '<div class="analisis-table-wrapper" style="border:1px solid #e2e8f0;border-radius:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);">' +
            '<table id="tabelAnalisisButirSoal" class="dash-table" style="width:100%;margin:0;">' +
            '<thead><tr>' +
            '  <th style="width:45px;text-align:center;">No</th>' +
            '  <th style="width:65px;text-align:center;">Tipe</th>' +
            '  <th style="width:65px;text-align:center;">Kunci</th>' +
            '  <th style="width:180px;text-align:center;">Distribusi Jawaban</th>' +
            '  <th style="width:130px;text-align:center;">Tingkat Kesukaran (P)</th>' +
            '  <th style="width:130px;text-align:center;">Daya Pembeda (D)</th>' +
            '  <th>Evaluasi & Rekomendasi Guru</th>' +
            '  <th style="width:90px;text-align:center;">Aksi</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
            '</div>';

        // Panduan Interpretasi Singkat
        var guideHtml = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem 1.25rem;font-size:.8rem;color:#475569;line-height:1.5;margin-bottom:1.5rem;">' +
            '<div style="font-weight:700;color:#1e293b;margin-bottom:.4rem;display:flex;align-items:center;gap:6px;"><i data-lucide="info" style="width:14px;height:14px;color:#6366f1;"></i> Panduan Parameter Standar Evaluasi Pendidikan:</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.75rem;">' +
            '  <div><strong>Tingkat Kesukaran (P):</strong><br>• P &gt; 0.70 : Kategori Mudah<br>• 0.30 ≤ P ≤ 0.70 : Kategori Sedang (Ideal)<br>• P &lt; 0.30 : Kategori Sukar</div>' +
            '  <div><strong>Daya Pembeda (D):</strong><br>• D ≥ 0.40 : Sangat Baik<br>• 0.30 ≤ D &lt; 0.40 : Baik<br>• 0.20 ≤ D &lt; 0.30 : Cukup<br>• D &lt; 0.20 : Kurang / Revisi (Pengecoh Kurang Berfungsi)</div>' +
            '</div>' +
            '</div>';

        // Footer buttons
        var footerHtml = '<div style="display:flex;justify-content:flex-end;gap:.75rem;padding-top:1rem;border-top:1px solid #e2e8f0;">' +
            '<button onclick="closeAnalisisButirSoalModal()" class="btn btn-primary" style="padding:.6rem 2rem;border-radius:10px;min-height:44px;font-weight:700;">Tutup</button>' +
            '</div>';

        body.innerHTML = infoCardHtml + kpiHtml + filterBarHtml + tableHtml + guideHtml + footerHtml;

        modal.style.display = 'flex';
        modal.classList.add('active');
        if (window.lucide) lucide.createIcons();

    } catch (e) {
        showToast('Gagal memuat analisis: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

function toggleDetailNaskahSoalAnalisis(nomor) {
    var row = document.getElementById('naskahRow_' + nomor);
    if (!row) return;
    if (row.style.display === 'none' || !row.style.display) {
        row.style.display = 'table-row';
    } else {
        row.style.display = 'none';
    }
}

function filterAnalisisButirTable(kategori, btn) {
    var btns = document.querySelectorAll('.btn-filter-analisis');
    btns.forEach(function(b) {
        b.style.background = '#f1f5f9';
        b.style.color = '#334155';
        b.style.border = '1px solid #cbd5e1';
    });
    if (btn) {
        btn.style.background = '#4338ca';
        btn.style.color = 'white';
        btn.style.border = 'none';
    }

    var rows = document.querySelectorAll('.analisis-row');
    rows.forEach(function(r) {
        if (kategori === 'all') {
            r.style.display = 'table-row';
        } else if (kategori === 'revisi') {
            r.style.display = r.classList.contains('filter-revisi') ? 'table-row' : 'none';
        } else if (kategori === 'sukar') {
            r.style.display = r.classList.contains('filter-sukar') ? 'table-row' : 'none';
        } else if (kategori === 'sedang') {
            r.style.display = r.classList.contains('filter-sedang') ? 'table-row' : 'none';
        } else if (kategori === 'mudah') {
            r.style.display = r.classList.contains('filter-mudah') ? 'table-row' : 'none';
        }
    });
}

function cetakLaporanAnalisisButir() {
    var data = window._lastAnalisisCbt;
    if (!data) {
        showToast('Data analisis belum siap dicetak.', 'warning');
        return;
    }

    var asm = data.asm;
    var stats = data.statsList;
    var printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Popup terblokir oleh browser. Izinkan popup untuk mencetak.', 'error');
        return;
    }

    var tableRows = stats.map(function(st) {
        var dSign = st.D >= 0 ? '+' : '';
        return '<tr>' +
            '<td style="text-align:center;padding:6px;border:1px solid #000;">' + st.nomor + '</td>' +
            '<td style="text-align:center;padding:6px;border:1px solid #000;">' + (st.tipe === 'pg' ? 'PG' : 'Essay') + '</td>' +
            '<td style="text-align:center;padding:6px;border:1px solid #000;font-weight:bold;">' + st.kunci + '</td>' +
            '<td style="text-align:center;padding:6px;border:1px solid #000;">A:' + (st.dist.A||0) + ' B:' + (st.dist.B||0) + ' C:' + (st.dist.C||0) + ' D:' + (st.dist.D||0) + '</td>' +
            '<td style="text-align:center;padding:6px;border:1px solid #000;">' + st.P.toFixed(2) + ' (' + st.katP + ')</td>' +
            '<td style="text-align:center;padding:6px;border:1px solid #000;">' + dSign + st.D.toFixed(2) + ' (' + st.katD + ')</td>' +
            '<td style="padding:6px;border:1px solid #000;">' + st.rekomendasi + '</td>' +
            '</tr>';
    }).join('');

    var html = '<!DOCTYPE html><html><head><title>Laporan Analisis Butir Soal - ' + escHtml(asm.judul) + '</title>' +
        '<style>' +
        '@page { size: A4 landscape; margin: 15mm; }' +
        'body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; margin: 0; padding: 15px; }' +
        'h2, h3, h4 { margin: 2px 0; text-align: center; }' +
        'table { width: 100%; border-collapse: collapse; margin-top: 15px; }' +
        'th { background: #e2e8f0; font-weight: bold; border: 1px solid #000; padding: 6px; }' +
        '.meta-table { width: 100%; border: none; margin-bottom: 10px; }' +
        '.meta-table td { border: none; padding: 3px 0; }' +
        '</style></head><body>' +
        '<div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px;">' +
        '  <h2>SMPIT AL-FATHONAH</h2>' +
        '  <h3>LAPORAN ANALISIS BUTIR SOAL CBT</h3>' +
        '</div>' +
        '<table class="meta-table">' +
        '  <tr><td style="width:160px;"><strong>Judul Asesmen</strong></td><td>: ' + escHtml(asm.judul) + '</td><td style="width:160px;"><strong>Total Peserta Uji</strong></td><td>: ' + data.totalPeserta + ' Siswa</td></tr>' +
        '  <tr><td><strong>Mata Pelajaran</strong></td><td>: ' + escHtml(asm.mata_pelajaran || '-') + '</td><td><strong>Rata-Rata Nilai</strong></td><td>: ' + data.avgScore + ' (Max: ' + data.maxScore + ', Min: ' + data.minScore + ')</td></tr>' +
        '  <tr><td><strong>Kelas / Tingkat</strong></td><td>: ' + escHtml(asm.kelas || '-') + '</td><td><strong>Tanggal Analisis</strong></td><td>: ' + new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + '</td></tr>' +
        '</table>' +
        '<table>' +
        '  <thead><tr>' +
        '    <th style="width:40px;">No</th><th style="width:60px;">Tipe</th><th style="width:60px;">Kunci</th><th>Distribusi Opsi (A/B/C/D)</th><th style="width:140px;">Tingkat Kesukaran (P)</th><th style="width:140px;">Daya Pembeda (D)</th><th>Rekomendasi / Evaluasi</th>' +
        '  </tr></thead>' +
        '  <tbody>' + tableRows + '</tbody>' +
        '</table>' +
        '<div style="margin-top:30px;display:flex;justify-content:space-between;page-break-inside:avoid;">' +
        '  <div style="text-align:center;width:200px;">Mengetahui,<br>Kepala SMPIT AL-FATHONAH<br><br><br><br><strong>........................................</strong></div>' +
        '  <div style="text-align:center;width:200px;">Guru Mata Pelajaran,<br><br><br><br><br><strong>........................................</strong></div>' +
        '</div>' +
        '</body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(function() {
        printWindow.focus();
        printWindow.print();
    }, 400);
}

function eksporCsvAnalisisButir() {
    var data = window._lastAnalisisCbt;
    if (!data) {
        showToast('Data analisis belum tersedia.', 'warning');
        return;
    }

    var lines = ['No,Tipe,Kunci,A,B,C,D,Kosong,Tingkat_Kesukaran_P,Kategori_Kesukaran,Daya_Pembeda_D,Kategori_Pembeda,Rekomendasi'];
    data.statsList.forEach(function(st) {
        var row = [
            st.nomor,
            st.tipe,
            st.kunci,
            st.dist.A || 0,
            st.dist.B || 0,
            st.dist.C || 0,
            st.dist.D || 0,
            st.dist.kosong || 0,
            st.P.toFixed(2),
            st.katP,
            st.D.toFixed(2),
            st.katD,
            '"' + st.rekomendasi.replace(/"/g, '""') + '"'
        ];
        lines.push(row.join(','));
    });

    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var filename = 'Analisis_Butir_Soal_' + (data.asm.judul || 'CBT').replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('File CSV analisis berhasil diunduh.', 'success');
}
