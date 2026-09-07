// ACCOUNT MANAGEMENT
// ============================================================
var activeAccountTab = 'pending';
window.switchAccountTab = function (tab) {
    activeAccountTab = tab;
    document.querySelectorAll('.account-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var btn = document.querySelector('[data-tab="' + tab + '"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.account-tab-content').forEach(function (c) { c.style.display = 'none'; });
    var content = document.getElementById('tab_' + tab);
    if (content) content.style.display = 'block';
};

async function renderPendingAccounts() {
    var tbody = document.getElementById('pendingTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').eq('role', 'menunggu_persetujuan').order('created_at', { ascending: false });
        if (error) throw error;
        var badge = document.getElementById('pendingBadge');
        var badgeSidebar = document.getElementById('pendingBadgeSidebar');
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada akun menunggu persetujuan.</td></tr>';
            if (badge) badge.style.display = 'none';
            if (badgeSidebar) badgeSidebar.style.display = 'none';
            return;
        }
        if (badge) { badge.textContent = users.length; badge.style.display = 'inline-flex'; }
        if (badgeSidebar) { badgeSidebar.textContent = users.length; badgeSidebar.style.display = 'inline-flex'; }
        tbody.innerHTML = users.map(function (u) {
            var dt = u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            return '<tr><td style="font-weight:600">' + (u.full_name || '-') + '</td><td>' + (u.email || '-') + '</td><td style="font-size:.82rem;color:var(--text-light)">' + dt + '</td>' +
                '<td><select id="role_' + u.id + '" class="form-input" style="padding:.4rem .6rem;font-size:.82rem;min-width:140px">' + buildRoleOptions() + '</select></td>' +
                '<td><div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
                '<button class="btn-approve" onclick="approveUser(\'' + u.id + '\')"><i data-lucide="check" style="width:14px;height:14px"></i> Setujui</button>' +
                '<button class="btn-reject" onclick="deleteUserPermanent(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')"><i data-lucide="trash-2" style="width:14px;height:14px"></i> Hapus</button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function renderActiveAccounts() {
    var tbody = document.getElementById('activeTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').neq('role', 'menunggu_persetujuan').neq('role', 'nonaktif').order('full_name');
        if (error) throw error;
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada akun aktif.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(function (u) {
            var isMe = currentUser && u.id === currentUser.id;
            var roleOptions = ASSIGNABLE_ROLES.map(function (r) {
                return '<option value="' + r.value + '"' + (r.value === u.role ? ' selected' : '') + '>' + r.label + '</option>';
            }).join('');
            return '<tr><td style="font-weight:600">' + (u.full_name || '-') +
                (isMe ? ' <span class="badge badge-blue" style="font-size:.65rem;">Anda</span>' : '') +
                '</td><td>' + (u.email || '-') + '</td><td>' +
                (isMe ? '<span class="badge badge-blue">' + getRoleLabel(u.role) + '</span>' :
                    '<select id="activeRole_' + u.id + '" class="form-input" style="margin:0; padding:4px 8px; font-size:0.8rem; height:auto;">' + roleOptions + '</select>') +
                '</td>' +
                '<td><div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
                (isMe ? '<span style="font-size:.8rem;color:var(--text-light)">—</span>' :
                    '<button class="btn-icon btn-icon-blue" onclick="changeUserRole(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Simpan Role"><i data-lucide="save" style="width:14px;height:14px"></i></button>' +
                    (u.role === 'siswa' ? '<button class="btn-icon" style="background:rgba(139,92,246,.12);color:#7c3aed;" onclick="openLinkSiswaModal(\'' + u.id + '\',\'' + (u.email || '').replace(/'/g, "\\'") + '\')" title="Hubungkan ke Data Siswa"><i data-lucide="link" style="width:14px;height:14px"></i></button>' : '') +
                    '<button class="btn-icon btn-icon-amber" onclick="deactivateUser(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Nonaktifkan"><i data-lucide="user-x" style="width:14px;height:14px"></i></button>') +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function renderInactiveAccounts() {
    var tbody = document.getElementById('inactiveTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').eq('role', 'nonaktif').order('updated_at', { ascending: false });
        if (error) throw error;
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada akun nonaktif.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(function (u) {
            return '<tr><td style="font-weight:600">' + (u.full_name || '-') + '</td><td>' + (u.email || '-') + '</td>' +
                '<td><div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
                '<button class="btn-icon btn-icon-green" onclick="reactivateUser(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Aktifkan"><i data-lucide="user-check" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteUserPermanent(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function approveUser(userId) {
    var rs = document.getElementById('role_' + userId);
    if (!rs || !rs.value) { showToast('Pilih role terlebih dahulu!', 'warning'); return; }

    if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyetujui akun & mengaktifkan login...');

    try {
        // 1. Update role via RPC (bypass RLS)
        const { error } = await supabaseClient.rpc('approve_user_role', {
            target_user_id: userId,
            new_role: rs.value
        });
        if (error) throw error;

        // 2. Auto-confirm email user via RPC agar langsung bisa login
        var emailConfirmed = false;
        try {
            const { error: rpcError } = await supabaseClient.rpc('confirm_user_email', { target_user_id: userId });
            if (rpcError) {
                console.error('RPC confirm_user_email gagal:', rpcError);
                showToast('⚠️ Role berhasil diubah, tetapi aktivasi email GAGAL: ' + rpcError.message, 'warning');
            } else {
                emailConfirmed = true;
            }
        } catch (e) {
            console.error('Exception saat confirm_user_email:', e);
        }

        if (emailConfirmed) {
            showToast('✅ Akun berhasil disetujui & diaktifkan! Pengguna sudah bisa login.', 'success');
        } else {
            showToast('✅ Role berhasil diubah ke ' + rs.value + '!', 'success');
        }
        await renderPendingAccounts();
        await renderActiveAccounts();
        loadStats();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { if (typeof hideGlobalLoader === 'function') hideGlobalLoader(); }
}

function deactivateUser(userId, name) {
    showCustomConfirm('Nonaktifkan Akun?', 'Akun <strong>"' + name + '"</strong> akan dinonaktifkan dan tidak bisa login.', 'Ya, Nonaktifkan', async function () {
        try {
            const { error } = await supabaseClient.rpc('approve_user_role', { target_user_id: userId, new_role: 'nonaktif' });
            if (error) throw error;
            showToast('Akun "' + name + '" dinonaktifkan.', 'success');
            renderActiveAccounts(); renderInactiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

async function changeUserRole(userId, name) {
    var sel = document.getElementById('activeRole_' + userId);
    if (!sel) { showToast('Dropdown role tidak ditemukan!', 'error'); return; }
    var newRole = sel.value;
    if (!newRole) { showToast('Pilih role terlebih dahulu!', 'warning'); return; }

    showCustomConfirm('Ubah Role?', 'Role akun <strong>"' + name + '"</strong> akan diubah menjadi <strong>' + getRoleLabel(newRole) + '</strong>.', 'Ya, Ubah Role', async function () {
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengubah role...');
        try {
            const { error } = await supabaseClient.rpc('approve_user_role', { target_user_id: userId, new_role: newRole });
            if (error) throw error;
            showToast('Role "' + name + '" berhasil diubah menjadi ' + getRoleLabel(newRole) + '.', 'success');
            renderActiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal mengubah role: ' + e.message, 'error'); }
        finally { if (typeof hideGlobalLoader === 'function') hideGlobalLoader(); }
    });
}

function reactivateUser(userId, name) {
    showCustomConfirm('Aktifkan Kembali?', 'Akun <strong>"' + name + '"</strong> akan dipindahkan ke daftar menunggu persetujuan.', 'Ya, Aktifkan', async function () {
        try {
            const { error } = await supabaseClient.rpc('approve_user_role', { target_user_id: userId, new_role: 'menunggu_persetujuan' });
            if (error) throw error;
            showToast('Akun menunggu persetujuan.', 'success');
            renderPendingAccounts(); renderInactiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function deleteUserPermanent(userId, name) {
    showCustomConfirm('Hapus Akun Permanen?', 'Akun <strong>"' + name + '"</strong> akan dihapus <strong>permanen</strong> dari sistem.<br><br>Email ini dapat digunakan kembali untuk mendaftar akun baru.', 'Ya, Hapus Permanen', async function () {
        try {
            const { error } = await supabaseClient.rpc('delete_user_completely', { target_user_id: userId });
            if (error) throw error;
            showToast('Akun "' + name + '" dihapus permanen.', 'success');
            renderPendingAccounts(); renderActiveAccounts(); renderInactiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// ROLE SIMULATION (ADMIN ONLY)
// ============================================================
function openSimulasiModal() {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');

    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    iconEl.style.background = 'rgba(59,130,246,.1)';
    titleEl.textContent = 'Simulasi Tampilan Role';
    titleEl.style.color = '#3b82f6';

    msgEl.innerHTML = '<p style="margin-bottom:15px;font-size:0.95rem;color:var(--text-light)">Pilih role yang ingin disimulasikan. Selama simulasi, menu dan panel akan menyesuaikan seolah-olah Anda login dengan role tersebut.</p>' +
        '<select id="simulasiRoleSelect" class="form-input" style="width:100%">' + buildRoleOptions() + '</select>';

    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()" style="min-width:100px;">Batal</button>' +
        '<button class="btn btn-primary" onclick="startSimulasi()" style="min-width:100px;">Mulai Simulasi</button>';

    overlay.classList.add('active');
}

function startSimulasi() {
    var select = document.getElementById('simulasiRoleSelect');
    if (!select || !select.value) {
        showToast('Pilih role terlebih dahulu!', 'warning');
        return;
    }
    localStorage.setItem('simulasi_role', select.value);
    closeNotifModal();
    window.location.reload();
}

function stopSimulasi() {
    localStorage.removeItem('simulasi_role');
    window.location.reload();
}

// ============================================================
// MAINTENANCE MODE (ADMIN ONLY)
// ============================================================
async function toggleMaintenanceMode() {
    try {
        const { data: current } = await supabaseClient.from('system_settings').select('value').eq('key', 'maintenance_mode').single();
        var isMaint = current && current.value === 'true';
        var actionText = isMaint ? 'Matikan' : 'Aktifkan';
        var newVal = isMaint ? 'false' : 'true';
        var msg = isMaint ?
            '<strong>Matikan mode pemeliharaan?</strong><br><br>Sistem akan kembali normal dan semua role akan dapat melakukan login seperti biasa.' :
            '<strong>Aktifkan mode pemeliharaan?</strong><br><br>Role selain Admin & Kurikulum akan SEGERA dikeluarkan paksa (auto-logout) dari dashboard dalam 10 detik, dan tidak akan bisa login kembali sampai mode ini dimatikan.';

        showCustomConfirm(actionText + ' Pemeliharaan?', msg, 'Ya, ' + actionText, async function () {
            try {
                const { error } = await supabaseClient.from('system_settings').upsert([{ key: 'maintenance_mode', value: newVal }]);
                if (error) throw error;
                showToast('Mode Pemeliharaan ' + (newVal === 'true' ? 'AKTIF' : 'NONAKTIF'), newVal === 'true' ? 'warning' : 'success');
            } catch (e) {
                showToast('Gagal update status: ' + e.message, 'error');
            }
        });
    } catch (e) {
        showToast('Gagal memuat status: ' + e.message, 'error');
    }
}

// Global listener untuk catch redirect param + auto-login redirect
window.addEventListener('DOMContentLoaded', function () {
    // Tampilkan notif maintenance jika ada
    if (window.location.search.includes('maintenance=1')) {
        setTimeout(function () {
            if (typeof showNotifModal === 'function') {
                showNotifModal('Pemeliharaan Berlangsung', 'Anda baru saja dikeluarkan paksa secara otomatis karena server telah memasuki masa <strong>Jeda Pemeliharaan</strong> oleh pihak Sekolah.<br><br>Harap tunggu sampai proses perbaikan selesai.', 'warning');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 500);
    }

    // ========================================================
    // AUTO-REDIRECT: Jika user sudah login, langsung ke dashboard
    // Hanya berlaku di halaman LANDING PAGE (index.html)
    // ========================================================
    var isLandingPage = !document.body.classList.contains('dashboard-body');
    if (isLandingPage && supabaseClient) {
        supabaseClient.auth.getSession().then(function (result) {
            var session = result.data && result.data.session;
            if (session && session.user) {
                // Cek apakah profil valid (bukan menunggu/nonaktif)
                supabaseClient.from('profiles').select('role').eq('id', session.user.id).single().then(function (profileResult) {
                    var profile = profileResult.data;
                    if (profile && profile.role && profile.role !== 'menunggu_persetujuan' && profile.role !== 'nonaktif') {
                        // Sesi valid & role aktif — langsung ke dashboard!
                        window.location.href = 'dashboard.html';
                    }
                });
            }
        });
    }
});

// ============================================================
// TAHUN AKADEMIK & KELAS
// ============================================================
var masterKelasList = [];

async function loadActiveYear() {
    try {
        const { data } = await supabaseClient.from('system_settings').select('value').eq('key', 'active_academic_year').single();
        var lbl = document.getElementById('lblActiveYear');
        if (lbl) lbl.textContent = (data && data.value) || 'Belum diatur';

        const { data: histData } = await supabaseClient.from('system_settings').select('value').eq('key', 'academic_year_history').maybeSingle();
        var histDiv = document.getElementById('divYearHistory');
        var btnReset = document.getElementById('btnResetHistory');
        if (histDiv) {
            if (histData && histData.value) {
                try {
                    var history = JSON.parse(histData.value);
                    if (history.length > 0) {
                        histDiv.innerHTML = '<strong>Riwayat:</strong> ' + history.join(', ');
                        histDiv.style.display = 'block';
                        if (btnReset) btnReset.style.display = 'inline-flex';
                    } else {
                        histDiv.style.display = 'none';
                        if (btnReset) btnReset.style.display = 'none';
                    }
                } catch (e) {
                    histDiv.style.display = 'none';
                    if (btnReset) btnReset.style.display = 'none';
                }
            } else {
                histDiv.style.display = 'none';
                if (btnReset) btnReset.style.display = 'none';
            }
        }
    } catch (e) { }
}

async function resetYearHistory() {
    showCustomConfirm('Hapus Riwayat?', 'Riwayat tahun pelajaran sebelumnya akan dihapus dari tampilan.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('system_settings').upsert([{ key: 'academic_year_history', value: '[]' }]);
            if (error) throw error;
            showToast('Riwayat berhasil dihapus', 'success');
            loadActiveYear();
        } catch (e) { showToast('Gagal hapus riwayat: ' + e.message, 'error'); }
    });
}

function editTahunAkademik() {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
    iconEl.style.background = 'rgba(59,130,246,.1)';
    titleEl.textContent = 'Tetapkan Tahun Pelajaran';
    titleEl.style.color = '#3b82f6';
    var currentVal = document.getElementById('lblActiveYear') ? document.getElementById('lblActiveYear').textContent : '';
    if (currentVal === 'Belum diatur') currentVal = '';
    msgEl.innerHTML = '<p style="margin-bottom:10px;color:var(--text-light);font-size:0.9rem;">Masukkan tahun pelajaran aktif dengan format <strong>----/----</strong></p><input type="text" id="inputTahunAktif" class="form-input" value="' + currentVal + '" placeholder="----/----" maxlength="9" style="width:100%;text-align:center;font-size:1.2rem;font-weight:bold;letter-spacing:2px;" />';
    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()">Batal</button><button class="btn btn-primary" onclick="saveTahunAkademik()">Simpan</button>';
    overlay.classList.add('active');
}

async function saveTahunAkademik() {
    var val = document.getElementById('inputTahunAktif').value.trim();
    if (!val) { showToast('Tahun pelajaran tidak boleh kosong!', 'warning'); return; }
    try {
        const { data: current } = await supabaseClient.from('system_settings').select('value').eq('key', 'active_academic_year').single();
        var isYearChanged = current && current.value && current.value !== val;

        if (isYearChanged) {
            const { data: histData } = await supabaseClient.from('system_settings').select('value').eq('key', 'academic_year_history').single();
            var history = [];
            if (histData && histData.value) { try { history = JSON.parse(histData.value); } catch (e) { } }
            if (!history.includes(current.value)) {
                history.push(current.value);
            }
            await supabaseClient.from('system_settings').upsert([{ key: 'academic_year_history', value: JSON.stringify(history) }]);
        }

        const { error } = await supabaseClient.from('system_settings').upsert([{ key: 'active_academic_year', value: val }]);
        if (error) throw error;
        showToast('Tahun pelajaran diperbarui!', 'success');

        if (isYearChanged) {
            const { error: errJurnal } = await supabaseClient.from('jurnal_mengajar').delete().not('id', 'is', null);
            if (errJurnal) console.error('Gagal hapus jurnal lama:', errJurnal);
            else showToast('Data Jurnal Mengajar lama telah dibersihkan.', 'success');
        }

        closeNotifModal();
        loadActiveYear();
        if (document.getElementById('sectionJurnalMengajar') && document.getElementById('sectionJurnalMengajar').classList.contains('active')) {
            loadJurnalMengajar();
        }
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

var pengecualianSiswaTinggalKelas = [];

var tempKenaikanSiswaList = [];

async function gantiTahunDanNaikKelas() {
    pengecualianSiswaTinggalKelas = [];
    renderTinggalKelasList();

    var selKelas = document.getElementById('formKenaikanPilihKelas');
    selKelas.innerHTML = '<option value="">Semua Kelas</option>';
    if (typeof masterKelasList !== 'undefined') {
        masterKelasList.forEach(k => {
            var opt = document.createElement('option');
            opt.value = k.id;
            opt.textContent = k.nama_kelas;
            selKelas.appendChild(opt);
        });
    }

    try {
        const { data, error } = await supabaseClient.from('siswa').select('id, kelas_id, nama_lengkap, master_kelas(nama_kelas)').in('status', ['Aktif', 'Pindahan']).order('nama_lengkap');
        if (data) {
            tempKenaikanSiswaList = data;
        }
    } catch (e) { }

    filterKenaikanSiswaByKelas();

    document.getElementById('kenaikanKelasModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function filterKenaikanSiswaByKelas() {
    var selSiswa = document.getElementById('formKenaikanPilihSiswa');
    var kelasId = document.getElementById('formKenaikanPilihKelas').value;

    selSiswa.innerHTML = '<option value="">-- Pilih Siswa --</option>';

    var filtered = tempKenaikanSiswaList;
    if (kelasId) {
        filtered = tempKenaikanSiswaList.filter(s => s.kelas_id === kelasId);
    }

    filtered.forEach(s => {
        var opt = document.createElement('option');
        opt.value = s.id;
        var kelasText = kelasId ? '' : (' (' + (s.master_kelas ? s.master_kelas.nama_kelas : '-') + ')');
        opt.textContent = s.nama_lengkap + kelasText;
        selSiswa.appendChild(opt);
    });
}

function closeKenaikanKelasModal() {
    document.getElementById('kenaikanKelasModal').classList.remove('active');
}

function addTinggalKelas() {
    var sel = document.getElementById('formKenaikanPilihSiswa');
    var val = sel.value;
    if (!val) { showToast('Pilih siswa terlebih dahulu!', 'warning'); return; }

    if (pengecualianSiswaTinggalKelas.find(x => x.id === val)) {
        showToast('Siswa tersebut sudah ada di daftar pengecualian.', 'warning'); return;
    }

    var text = sel.options[sel.selectedIndex].text;
    pengecualianSiswaTinggalKelas.push({ id: val, nama: text });
    renderTinggalKelasList();

    sel.value = '';
}

function removeTinggalKelas(id) {
    pengecualianSiswaTinggalKelas = pengecualianSiswaTinggalKelas.filter(x => x.id !== id);
    renderTinggalKelasList();
}

function renderTinggalKelasList() {
    var container = document.getElementById('listTinggalKelas');
    container.innerHTML = '';

    if (pengecualianSiswaTinggalKelas.length === 0) {
        container.innerHTML = '<span id="noTinggalKelasLabel" style="font-size:0.85rem;color:var(--text-light);font-style:italic;">Belum ada siswa yang dikecualikan. Semua akan otomatis naik secara algoritmik.</span>';
        return;
    }

    pengecualianSiswaTinggalKelas.forEach(function (item) {
        var div = document.createElement('div');
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:white;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;';
        div.innerHTML = '<span style="font-weight:500;font-size:0.9rem;">' + item.nama + ' <span class="badge badge-red" style="margin-left:8px;font-size:0.7rem;">Tinggal Kelas</span></span>' +
            '<button type="button" onclick="removeTinggalKelas(\'' + item.id + '\')" style="background:none;border:none;color:var(--danger);cursor:pointer;" title="Hapus"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>';
        container.appendChild(div);
    });
}

function executeKenaikanKelas() {
    var idArray = pengecualianSiswaTinggalKelas.map(x => x.id);
    var excMsg = idArray.length > 0 ? ('<br><br><span style="color:#ef4444;font-weight:bold;">Pengecualian Aktif:</span> Ada ' + idArray.length + ' siswa terdaftar yang <strong>TIDAK NAIK/LULUS</strong>.') : '';

    showCustomConfirm('Yakin Proses Kenaikan?', 'Apakah Anda 100% yakin ingin mempromosikan seluruh formasi siswa secara massal sekarang?' + excMsg, 'Proses Massal!', async function () {
        showGlobalLoader('Memproses pemindahan ribuan data siswa secara algoritmik...');
        try {
            const { error } = await supabaseClient.rpc('promote_students_next_year', { excluded_siswa_ids: idArray });
            hideGlobalLoader();
            if (error) throw error;
            showToast('Kenaikan kelas & pencatatan kelulusan berhasil diproses!', 'success');
            closeKenaikanKelasModal();
            if (typeof loadSiswaData === 'function') loadSiswaData();
            if (typeof loadAlumniData === 'function') loadAlumniData();
        } catch (e) { hideGlobalLoader(); showToast('Gagal memproses: ' + e.message, 'error'); }
    });
}

async function loadMasterKelas() {
    try {
        const { data, error } = await supabaseClient.from('master_kelas').select('*').order('tingkat').order('nama_kelas');
        if (error) throw error;
        masterKelasList = data || [];
        var tbody = document.getElementById('kelasTableBody');
        if (!tbody) return;
        if (masterKelasList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data kelas.</td></tr>';
            return;
        }
        tbody.innerHTML = masterKelasList.map(function (k, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + k.nama_kelas + '</td><td>' + k.tingkat + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editKelas(\'' + k.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteKelas(\'' + k.id + '\',\'' + k.nama_kelas + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal muat kelas: ' + e.message, 'error'); }
}

function openKelasModal(id) {
    document.getElementById('formKelasId').value = '';
    document.getElementById('formKelasNama').value = '';
    document.getElementById('formKelasTingkat').value = '7';
    document.getElementById('kelasModalTitle').textContent = 'Tambah Kelas';
    document.getElementById('kelasModal').classList.add('active');
}
function closeKelasModal() { document.getElementById('kelasModal').classList.remove('active'); }

function editKelas(id) {
    var k = masterKelasList.find(function (x) { return x.id === id; });
    if (!k) return;
    document.getElementById('formKelasId').value = k.id;
    document.getElementById('formKelasNama').value = k.nama_kelas;
    document.getElementById('formKelasTingkat').value = k.tingkat;
    document.getElementById('kelasModalTitle').textContent = 'Edit Kelas';
    document.getElementById('kelasModal').classList.add('active');
}

async function saveKelas() {
    var id = document.getElementById('formKelasId').value;
    var nama = document.getElementById('formKelasNama').value.trim();
    var tingkat = parseInt(document.getElementById('formKelasTingkat').value);

    if (!nama) { showToast('Nama kelas wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('master_kelas').update({ nama_kelas: nama, tingkat: tingkat }).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('master_kelas').insert([{ nama_kelas: nama, tingkat: tingkat }]);
            if (error) throw error;
        }
        showToast('Kelas berhasil disimpan!', 'success');
        closeKelasModal();
        loadMasterKelas();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteKelas(id, nama) {
    showCustomConfirm('Hapus Kelas?', 'Kelas <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('master_kelas').delete().eq('id', id);
            if (error) throw error;
            showToast('Kelas dihapus!', 'success');
            loadMasterKelas();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================