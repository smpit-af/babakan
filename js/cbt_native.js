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

        // Cek info asesmen
        const { data: asm } = await supabaseClient.from('asesmen').select('judul, mata_pelajaran, kelas, waktu_menit')
            .eq('id', asesmenId).single();

        var infoHtml = '';
        if (asm) {
            infoHtml = '<div style="margin-bottom:1rem;padding:1rem;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;border:1px solid #bae6fd;">' +
                '<div style="font-weight:700;color:#0369a1;font-size:1rem;">' + asm.judul + '</div>' +
                '<div style="font-size:.85rem;color:#0c4a6e;margin-top:.3rem;">' + asm.mata_pelajaran + ' — ' + asm.kelas + ' — ' + asm.waktu_menit + ' menit</div>' +
                '</div>';
        }

        var tokenHtml = '';
        if (sesi && sesi.status === 'berjalan') {
            tokenHtml = '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7); padding:1.2rem; border-radius:14px; text-align:center; margin-bottom:1rem; border:1px solid #86efac;">' +
                '<p style="margin:0; font-size:0.85rem; color:#166534;">Token Ujian Aktif:</p>' +
                '<h2 id="monitorCbtTokenDisplay" style="margin:.4rem 0; color:#15803d; letter-spacing:6px; font-size:2.2rem; font-family:monospace; font-weight:900;">' + sesi.token + '</h2>' +
                '<div id="monitorCbtTokenCountdown" style="font-size:0.8rem; color:#166534; margin-bottom:.5rem;">Memeriksa token...</div>' +
                '<div style="display:flex; gap:.5rem; justify-content:center; margin-top:.8rem;">' +
                '<button class="btn btn-sm" onclick="copyTokenCbt(document.getElementById(\'monitorCbtTokenDisplay\').innerText)" style="background:#16a34a;color:white;border:none;font-size:.8rem;padding:.4rem .8rem;border-radius:8px;"><i data-lucide="copy" style="width:13px;height:13px"></i> Salin Token</button>' +
                '<button class="btn btn-sm" onclick="stopSesiCbt(\'' + sesi.id + '\',\'' + asesmenId + '\')" style="background:#dc2626;color:white;border:none;font-size:.8rem;padding:.4rem .8rem;border-radius:8px;"><i data-lucide="square" style="width:13px;height:13px"></i> Akhiri Sesi</button>' +
                '</div></div>';
        } else if (sesi && sesi.status === 'selesai') {
            tokenHtml = '<div style="background:#f1f5f9; padding:1rem; border-radius:12px; text-align:center; margin-bottom:1rem; border:1px solid #cbd5e1;">' +
                '<p style="margin:0; font-size:.85rem; color:#64748b;">Sesi sebelumnya: <strong>' + sesi.token + '</strong> (Selesai)</p>' +
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

        // Tampilkan Modal Monitor
        var content = infoHtml + tokenHtml +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; flex-wrap:wrap; gap:.5rem;">' +
            '<h4 style="margin:0; font-size:1rem;">Monitoring Peserta Ujian</h4>' +
            '<div style="display:flex; gap:.5rem; flex-wrap:wrap;">' +
            '<button class="btn btn-sm btn-outline" onclick="refreshMonitorCbt(\'' + latestSesiId + '\')" style="font-size:.8rem; padding:.3rem .6rem; border-radius:8px;"><i data-lucide="refresh-cw" style="width:13px;height:13px"></i> Refresh</button>' +
            '<button class="btn btn-sm" onclick="kirimSemuaNilaiCbt(\'' + asesmenId + '\',\'' + latestSesiId + '\')" style="font-size:.8rem; padding:.3rem .8rem; border-radius:8px; background:#059669; color:white; border:none;"><i data-lucide="send" style="width:13px;height:13px"></i> Kirim Semua Nilai</button>' +
            '</div></div>' +
            '<div style="overflow-x:auto; border-radius:10px; border:1px solid #e2e8f0;">' +
            '<table class="dash-table" style="margin:0;">' +
            '<thead><tr><th style="width:40px">No</th><th>Nama Siswa</th><th>Mulai</th><th>Status</th><th>Pelanggaran</th><th>Nilai</th><th>Aksi</th></tr></thead>' +
            '<tbody id="cbtMonitorTbody"><tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-light);">Klik Refresh untuk memuat data</td></tr></tbody>' +
            '</table></div>';
        // Store asesmenId for kirim nilai
        window._cbtMonitorAsesmenId = asesmenId;

        showNotifModal('Monitor CBT', content, 'info');
        if (window.lucide) lucide.createIcons();

        if (cbtTokenInterval) clearInterval(cbtTokenInterval);

        if (monitorSesiId) {
            refreshMonitorCbt(monitorSesiId);
            cbtTokenInterval = setInterval(function() {
                checkAndRotateToken(monitorSesiId);
            }, 1000); // periksa setiap detik untuk update UI
        }

    } catch (e) {
        showToast('Gagal memuat CBT: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
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
            .select('asesmen_id(kelas), created_at').eq('id', sesiId).single();
        var sesiDate = sesiInfo ? new Date(sesiInfo.created_at).toDateString() : null;
        var kelasName = sesiInfo && sesiInfo.asesmen_id ? sesiInfo.asesmen_id.kelas : null;

        const { data: allSiswa } = await supabaseClient.from('siswa')
            .select('id, nama_lengkap, master_kelas(nama_kelas)')
            .eq('status', 'Aktif');

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
            var jaw = jawaban.find(j => j.siswa_id === siswa.id);
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
            var pelanggaran = tabSwitch > 0
                ? '<span style="color:#dc2626;font-weight:700;">' + tabSwitch + 'x</span>'
                : '<span style="color:#10b981;">0</span>';

            // Check susulan: if student started on a different date than sesi created
            var isSusulan = false;
            if (sesiDate && d.waktu_mulai_mengerjakan) {
                var studentDate = new Date(d.waktu_mulai_mengerjakan).toDateString();
                if (studentDate !== sesiDate) isSusulan = true;
            }
            var susulanBadge = isSusulan ? ' <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:700;margin-left:4px;">SUSULAN</span>' : '';
            var nilaiSyncBadge = d.nilai_synced ? ' <span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:700;">✓ Terkirim</span>' : '';

            var stat, nilaiHtml, aksiHtml;
            if (d.status === 'selesai') {
                stat = '<span style="background:rgba(16,185,129,.1);color:#10b981;padding:3px 8px;border-radius:6px;font-weight:700;font-size:.8rem;">Selesai</span>';
                nilaiHtml = '<span style="font-weight:800;color:#0369a1;font-size:1.05rem;">' + (d.nilai != null ? d.nilai : '-') + '</span>' + nilaiSyncBadge;
                aksiHtml = '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">' +
                    '<button onclick="showDetailJawabanSiswaCbt(\'' + d.id + '\')" class="btn btn-sm btn-outline" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;"><i data-lucide="eye" style="width:12px;height:12px;"></i> Detail</button>' +
                    (!d.nilai_synced ? '<button onclick="kirimNilaiCbtSatuan(\'' + d.id + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#059669;color:white;border:none;"><i data-lucide="send" style="width:12px;height:12px;"></i> Kirim</button>' : '') +
                    '<button onclick="tambahWaktuSiswaCbt(\'' + d.id + '\', \'' + sesiId + '\')" class="btn btn-sm" style="font-size:.7rem;padding:.2rem .5rem;display:inline-flex;align-items:center;gap:3px;background:#eab308;color:white;border:none;" title="Buka akses & tambah waktu"><i data-lucide="clock" style="width:12px;height:12px;"></i> +Waktu</button>' +
                    '</div>';
            } else if (d.status === 'mengerjakan') {
                stat = '<span style="background:rgba(245,158,11,.1);color:#f59e0b;padding:3px 8px;border-radius:6px;font-weight:700;font-size:.8rem;">Mengerjakan</span>';
                nilaiHtml = '<span style="color:var(--text-light);">-</span>';
                aksiHtml = '-';
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
            return '<tr><td style="text-align:center;">' + (idx + 1) + '</td><td style="font-weight:600;">' + nama + susulanBadge + '</td><td>' + mulai + '</td><td>' + stat + '</td><td style="text-align:center;">' + pelanggaran + '</td><td style="text-align:center;">' + nilaiHtml + '</td><td style="text-align:center;">' + aksiHtml + '</td></tr>';
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

async function tambahWaktuSiswaCbt(jawabanId, sesiId) {
    var min = prompt("Berapa menit tambahan waktu untuk siswa ini?", "15");
    if(min === null) return;
    var tambahan = parseInt(min);
    if(isNaN(tambahan) || tambahan <= 0) {
        showToast("Masukkan angka menit yang valid.", "warning");
        return;
    }
    
    showGlobalLoader('Membuka akses dan menambah waktu...');
    try {
        // Ambil data jawaban saat ini untuk mengetahui tambahan_waktu_menit yang sudah ada
        const { data: curr, error: errC } = await supabaseClient.from('cbt_jawaban_siswa').select('tambahan_waktu_menit').eq('id', jawabanId).single();
        if(errC) throw errC;
        var existingTambahan = curr.tambahan_waktu_menit || 0;

        const { error } = await supabaseClient.from('cbt_jawaban_siswa').update({
            status: 'mengerjakan',
            tambahan_waktu_menit: existingTambahan + tambahan,
            waktu_kumpul: null // reset waktu kumpul
        }).eq('id', jawabanId);
        if(error) throw error;
        
        showToast('Waktu berhasil ditambah ' + tambahan + ' menit. Siswa bisa melanjutkan.', 'success');
        refreshMonitorCbt(sesiId);
    } catch (e) {
        showToast('Gagal tambah waktu: ' + e.message, 'error');
    } finally { hideGlobalLoader(); }
}

async function showDetailJawabanSiswaCbt(jawabanId) {
    showGlobalLoader('Memuat detail jawaban...');
    try {
        const { data: jawabData } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('jawaban_json, nilai, siswa:siswa_id(nama_lengkap), sesi_ujian:sesi_id(asesmen_id)')
            .eq('id', jawabanId).single();
            
        if (!jawabData) throw new Error('Data jawaban tidak ditemukan');
        
        var asesmenId = jawabData.sesi_ujian ? jawabData.sesi_ujian.asesmen_id : null;
        if (!asesmenId) throw new Error('Data sesi ujian tidak valid');

        const { data: soalList } = await supabaseClient.from('asesmen_soal')
            .select('*').eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });
            
        var jawaban = jawabData.jawaban_json || {};
        var html = '<div style="text-align:left; max-height:60vh; overflow-y:auto; padding-right:.5rem;">';
        
        if (soalList && soalList.length > 0) {
            soalList.forEach(function(s) {
                var key = 'soal_' + s.nomor_soal;
                var jwb = jawaban[key] || '';
                
                html += '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1rem; margin-bottom:1rem;">';
                html += '<div style="font-weight:700; margin-bottom:.5rem;">Soal ' + s.nomor_soal + ' <span style="font-weight:400;color:#64748b;font-size:.8rem;">(' + (s.tipe_soal==='pg'?'Pilihan Ganda':'Essay') + ')</span></div>';
                html += '<div style="font-size:.9rem; color:#1e293b; margin-bottom:1rem;">' + (s.naskah_soal||'') + '</div>';
                
                if (s.tipe_soal === 'pg') {
                    var isCorrect = (String(jwb).trim().toUpperCase() === String(s.kunci_jawaban || '').trim().toUpperCase().charAt(0));
                    html += '<div style="display:flex; gap:1.5rem; font-size:.85rem; background:white; padding:.6rem; border-radius:8px; border:1px solid #e2e8f0;">';
                    html += '<div>Jawaban Siswa: <strong style="color:' + (isCorrect ? '#10b981' : '#dc2626') + '; font-size:1rem;">' + (jwb || '-') + '</strong></div>';
                    html += '<div>Kunci: <strong style="color:#10b981; font-size:1rem;">' + (s.kunci_jawaban || '-') + '</strong></div>';
                    html += '</div>';
                } else {
                    html += '<div style="font-size:.85rem; color:#334155; background:white; padding:.8rem; border-radius:8px; border:1px solid #e2e8f0;">';
                    html += '<div style="margin-bottom:.8rem;"><strong style="color:#0f172a;">Jawaban Siswa:</strong><div style="margin-top:.3rem;color:#475569;line-height:1.5;">' + (jwb || '<em>Tidak dijawab</em>') + '</div></div>';
                    html += '<div style="border-top:1px dashed #cbd5e1; padding-top:.8rem;"><strong style="color:#0f172a;">Kunci/Keyword:</strong><div style="margin-top:.3rem;color:#10b981;line-height:1.5;">' + (s.kunci_jawaban || '-') + '</div></div>';
                    html += '</div>';
                }
                
                html += '</div>';
            });
        } else {
            html += '<div style="padding:2rem; text-align:center; color:#64748b;">Tidak ada data soal yang tersimpan.</div>';
        }
        
        html += '</div>';
        
        var modalContent = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid #e2e8f0;">' +
                           '  <div style="text-align:left;"><h3 style="margin:0 0 .3rem 0;font-size:1.2rem;color:#0f172a;">Detail Jawaban Siswa</h3><div style="font-size:.9rem; color:#64748b;">Siswa: <strong style="color:#334155;">' + (jawabData.siswa ? jawabData.siswa.nama_lengkap : '') + '</strong> &nbsp;•&nbsp; Nilai Akhir: <strong style="color:#0369a1;">' + (jawabData.nilai != null ? jawabData.nilai : '-') + '</strong></div></div>' +
                           '</div>' + html +
                           '<div style="text-align:center; margin-top:1.5rem; padding-top:1rem; border-top:1px solid #e2e8f0;"><button class="btn btn-primary" onclick="document.getElementById(\'detailJwbModal\').remove()" style="padding:.6rem 2rem; border-radius:10px;">Tutup</button></div>';
                           
        var overlay = document.createElement('div');
        overlay.id = 'detailJwbModal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:1rem;animation:fadeIn .2s ease;';
        overlay.innerHTML = '<div style="background:white; border-radius:16px; padding:1.5rem 2rem; width:100%; max-width:650px; box-shadow:0 25px 60px rgba(0,0,0,.2);">' + modalContent + '</div>';
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

        // Get actual siswa.id
        const { data: siswaData, error: siswaErr } = await supabaseClient.from('siswa').select('id').eq('user_id', currentUser.id).single();
        if (siswaErr || !siswaData) throw new Error('Akun Anda belum ditautkan dengan data Siswa. Silakan hubungi Admin.');
        cbtSiswaId = siswaData.id;

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

        cbtSoalListCache = soalList || [];
        cbtJawabanMap = existingJawaban || {};
        cbtCurrentSoalIndex = 0;
        cbtSesiId = sesiId;
        cbtAsesmenId = asesmenId;
        cbtJawabanId = jawabanId;
        cbtWaktuMenit = parseInt(asm.waktu_menit) || 60;
        cbtTabSwitchCount = 0;

        // Hitung deadline dari waktu mulai mengerjakan
        const { data: myJawaban } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('waktu_mulai_mengerjakan, tambahan_waktu_menit').eq('id', jawabanId).single();
        var mulai = myJawaban ? new Date(myJawaban.waktu_mulai_mengerjakan) : new Date();
        var tambahanMs = myJawaban && myJawaban.tambahan_waktu_menit ? myJawaban.tambahan_waktu_menit * 60 * 1000 : 0;
        cbtDeadline = new Date(mulai.getTime() + (cbtWaktuMenit * 60 * 1000) + tambahanMs);

        // Limit deadline to waktu_selesai_ujian jika ada
        if (asm.waktu_selesai_ujian) {
            var limitTutup = new Date(asm.waktu_selesai_ujian);
            if (cbtDeadline > limitTutup) {
                cbtDeadline = limitTutup;
            }
        }

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

    } catch (e) {
        showToast('Gagal memuat soal CBT: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

function buildCbtFullscreenUI(asm, jawabanId) {
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
        html += '<div style="margin-bottom:1.2rem;text-align:center;"><img src="' + s.gambar_url + '" style="max-width:100%;max-height:300px;border-radius:12px;border:1px solid #e2e8f0;"/></div>';
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

function pilihJawabanPgCbt(nomorSoal, huruf) {
    var key = 'soal_' + nomorSoal;
    cbtJawabanMap[key] = huruf;
    renderSoalCbt(cbtCurrentSoalIndex);
}

function simpanJawabanEssayCbt(nomorSoal, text) {
    var key = 'soal_' + nomorSoal;
    cbtJawabanMap[key] = text;
    updateNavGridCbt();
}

function toggleRaguCbt(nomorSoal, isRagu) {
    var key = 'ragu_' + nomorSoal;
    cbtJawabanMap[key] = isRagu;
    updateNavGridCbt();
}

function navigasiSoalCbt(direction) {
    var newIndex = cbtCurrentSoalIndex + direction;
    if (newIndex < 0 || newIndex >= cbtSoalListCache.length) return;
    renderSoalCbt(newIndex);
}

function goToSoalCbt(index) {
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
    if (cbtInterval) clearInterval(cbtInterval);
    cbtInterval = setInterval(function () {
        var now = new Date();
        var diff = cbtDeadline - now;
        var display = document.getElementById('cbtTimerDisplay');
        var box = document.getElementById('cbtTimerBox');

        if (diff <= 0) {
            clearInterval(cbtInterval);
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
            }
        }
    }, 1000);
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

// ================= ANTI-CHEAT =================
function setupAntiCheat(jawabanId) {
    // Detect tab switching / visibility change
    document.addEventListener('visibilitychange', function cbtVisHandler() {
        if (document.hidden && document.getElementById('cbtFullscreen')) {
            cbtTabSwitchCount++;
            cbtJawabanMap._tabSwitchCount = cbtTabSwitchCount;
            saveCbtJawabanToDb(jawabanId, true);

            // Show warning when back
            var warn = document.createElement('div');
            warn.id = 'cbtTabWarn';
            warn.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;';
            warn.innerHTML = '<div style="background:white;border-radius:20px;padding:2rem;text-align:center;max-width:400px;width:90%;">' +
                '<div style="width:60px;height:60px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto .8rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>' +
                '<h3 style="margin:0 0 .5rem;color:#dc2626;">Peringatan!</h3>' +
                '<p style="color:#64748b;font-size:.9rem;">Anda terdeteksi meninggalkan halaman ujian. Pelanggaran ini tercatat (<strong>' + cbtTabSwitchCount + 'x</strong>).</p>' +
                '<button onclick="document.getElementById(\'cbtTabWarn\').remove();" style="margin-top:1rem;background:#dc2626;color:white;border:none;padding:.6rem 2rem;border-radius:10px;font-weight:700;cursor:pointer;">Kembali ke Ujian</button></div>';

            // Show when user returns
            var showWarn = function () {
                if (!document.hidden && document.getElementById('cbtFullscreen')) {
                    document.body.appendChild(warn);
                    document.removeEventListener('visibilitychange', showWarn);
                }
            };
            document.addEventListener('visibilitychange', showWarn);
        }
    });

    // Disable right-click
    document.addEventListener('contextmenu', function cbtCtxHandler(e) {
        if (document.getElementById('cbtFullscreen')) {
            e.preventDefault();
        }
    });
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
            jawabanClean[k] = cbtJawabanMap[k];
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
        var jawabanClean = {};
        Object.keys(cbtJawabanMap).forEach(function (k) {
            jawabanClean[k] = cbtJawabanMap[k];
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
        }).eq('id', cbtJawabanId);

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

    var bobotPG = (asm && asm.bobot_pg) ? parseInt(asm.bobot_pg) : 100;
    var bobotEssay = (asm && asm.bobot_essay) ? parseInt(asm.bobot_essay) : 0;

    var pgSoal = soalList.filter(function (s) { return s.tipe_soal === 'pg'; });
    var essaySoal = soalList.filter(function (s) { return s.tipe_soal === 'essay'; });

    // Grade PG (auto)
    var pgBenar = 0;
    pgSoal.forEach(function (s) {
        var key = 'soal_' + s.nomor_soal;
        var jawabanSiswa = String(jawaban[key] || '').trim().toUpperCase();
        var kunci = String(s.kunci_jawaban || '').trim().toUpperCase().charAt(0);
        if (jawabanSiswa && kunci && jawabanSiswa === kunci) pgBenar++;
    });

    var nilaiPG = pgBenar * bobotPG;

    // Essay: Cek keyword matching (sederhana)
    var essayNilai = 0;
    if (essaySoal.length > 0 && bobotEssay > 0) {
        var essayBenar = 0;
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
        essayNilai = essayBenar * bobotEssay;
    }

    var total = Math.round((nilaiPG + essayNilai) * 100) / 100;
    return Math.min(total, 100);
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
    var fs = document.getElementById('cbtFullscreen');
    if (fs) fs.remove();
    cbtSoalListCache = [];
    cbtJawabanMap = {};
    cbtCurrentSoalIndex = 0;
    cbtTabSwitchCount = 0;
    cbtJawabanId = '';
}

// ================= KIRIM NILAI KE BUKU NILAI =================

async function kirimNilaiCbtSatuan(jawabanId) {
    showGlobalLoader('Mengirim nilai ke buku nilai...');
    try {
        var result = await _syncSingleCbtNilai(jawabanId);
        if (result.success) {
            showToast('Nilai ' + result.nama + ' berhasil dikirim ke buku nilai!', 'success');
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
    // 1. Get jawaban data with asesmen info
    const { data: jwb } = await supabaseClient.from('cbt_jawaban_siswa')
        .select('id, siswa_id, nilai, sesi_id, siswa:siswa_id(nama_lengkap, kelas_id), sesi_ujian:sesi_id(asesmen_id)')
        .eq('id', jawabanId).single();

    if (!jwb || jwb.nilai == null) return { success: false, error: 'Data jawaban tidak valid' };

    var asesmenId = jwb.sesi_ujian ? jwb.sesi_ujian.asesmen_id : null;
    if (!asesmenId) return { success: false, error: 'Asesmen ID tidak ditemukan' };

    // 2. Get asesmen info
    const { data: asm } = await supabaseClient.from('asesmen')
        .select('tipe_ujian, mata_pelajaran, kelas, tahun_pelajaran, semester')
        .eq('id', asesmenId).single();
    if (!asm) return { success: false, error: 'Data asesmen tidak ditemukan' };

    // 3. Map tipe_ujian to nilai_akademik column
    var tipe = (asm.tipe_ujian || '').toUpperCase();
    var updateObj = {};
    if (tipe === 'STS' || tipe === 'PENILAIAN HARIAN') {
        updateObj.nilai_sts = Math.round(jwb.nilai * 100) / 100;
    } else if (tipe === 'SAS') {
        updateObj.nilai_sas = Math.round(jwb.nilai * 100) / 100;
    } else if (tipe === 'SAJ') {
        updateObj.nilai_saj = Math.round(jwb.nilai * 100) / 100;
    } else if (tipe === 'SAT') {
        updateObj.nilai_sat = Math.round(jwb.nilai * 100) / 100;
    } else {
        updateObj.nilai_sts = Math.round(jwb.nilai * 100) / 100;
    }

    // 4. Find mapel_id and kelas_id from master data
    var siswaKelasId = jwb.siswa ? jwb.siswa.kelas_id : null;
    if (!siswaKelasId) return { success: false, error: 'Kelas siswa tidak ditemukan' };

    // Find mapel_id by name matching
    const { data: mapelMatch } = await supabaseClient.from('master_mapel')
        .select('id').ilike('nama_mapel', asm.mata_pelajaran).limit(1);
    var mapelId = (mapelMatch && mapelMatch.length > 0) ? mapelMatch[0].id : null;
    if (!mapelId) return { success: false, error: 'Mata pelajaran "' + asm.mata_pelajaran + '" tidak ditemukan di master data' };

    // 5. Upsert to nilai_akademik
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

    // 6. Mark as synced
    await supabaseClient.from('cbt_jawaban_siswa').update({ nilai_synced: true }).eq('id', jawabanId);

    return { success: true, nama: jwb.siswa ? jwb.siswa.nama_lengkap : '', sesiId: jwb.sesi_id };
}

// ================= ADMIN SCHEDULE CHECKER =================
// Menjalankan pengecekan jadwal tutup ujian secara otomatis
async function cbtScheduleChecker() {
    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Guru')) return;

    try {
        var now = new Date();
        var isChanged = false;
        
        // Hanya cari asesmen yang berstatus aktif dan CBT
        const { data: toCheck } = await supabaseClient.from('asesmen')
            .select('id, is_cbt_native, waktu_selesai_ujian, status_aktif:ujian_aktif')
            .eq('ujian_aktif', true)
            .eq('is_cbt_native', true)
            .is('deleted_at', null);

        if (toCheck && toCheck.length > 0) {
            for (var i = 0; i < toCheck.length; i++) {
                var a = toCheck[i];
                var selesai = a.waktu_selesai_ujian ? new Date(a.waktu_selesai_ujian) : null;
                
                // Kondisi Auto-Stop
                if (selesai && now >= selesai) {
                    // 1. Update asesmen jadi nonaktif
                    await supabaseClient.from('asesmen').update({ ujian_aktif: false }).eq('id', a.id);
                    
                    // 2. Ambil sesi aktif
                    const { data: activeSesi } = await supabaseClient.from('cbt_sesi_ujian')
                        .select('id').eq('asesmen_id', a.id).eq('status', 'berjalan');
                        
                    if (activeSesi && activeSesi.length > 0) {
                        for (var s = 0; s < activeSesi.length; s++) {
                            var sesiId = activeSesi[s].id;
                            
                            // 3. Set status CBT sesi = selesai
                            await supabaseClient.from('cbt_sesi_ujian').update({
                                status: 'selesai',
                                waktu_selesai: now.toISOString()
                            }).eq('id', sesiId);
                            
                            // 4. Auto kumpul & grading siswa yg belum selesai
                            const { data: pending } = await supabaseClient.from('cbt_jawaban_siswa')
                                .select('*').eq('sesi_id', sesiId).eq('status', 'mengerjakan');

                            if (pending && pending.length > 0) {
                                // Get asesmen info for grading
                                const { data: asm } = await supabaseClient.from('asesmen').select('id, bobot_pg, bobot_essay').eq('id', a.id).single();
                                const { data: soalList } = await supabaseClient.from('asesmen_soal').select('*').eq('asesmen_id', a.id).order('nomor_soal', { ascending: true });

                                for (var p = 0; p < pending.length; p++) {
                                    var nilai = typeof hitungNilaiCbt === 'function' ? hitungNilaiCbt(pending[p].jawaban_json || {}, soalList || [], asm) : 0;
                                    await supabaseClient.from('cbt_jawaban_siswa').update({
                                        status: 'selesai',
                                        nilai: nilai,
                                        waktu_kumpul: now.toISOString()
                                    }).eq('id', pending[p].id);
                                }
                            }
                        }
                    }
                    isChanged = true;
                }
            }
        }
        
        // Refresh UI jika ada yang ditutup otomatis
        if (isChanged) {
            if (typeof loadSoalUjian === 'function') loadSoalUjian();
            if (typeof loadAsesmenList === 'function') loadAsesmenList();
        }
        
    } catch (e) {
        console.error("Schedule checker error:", e);
    }
}

// Mulai checker 1 menit sekali (hanya jika Admin/Guru)
setInterval(cbtScheduleChecker, 60000);
