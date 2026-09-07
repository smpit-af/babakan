// ARSIP ASESMEN MODULE
// ============================================================

async function archiveAsesmen(id) {
    showCustomConfirm('Arsipkan Asesmen?', 'Asesmen ini akan dipindahkan ke <strong>Arsip</strong>.<br><br>⚠️ <strong>Link Form akan ditutup</strong> (siswa tidak bisa mengakses lagi).<br>Link Rekap Nilai tetap bisa diakses dari menu Arsip.', 'Ya, Arsipkan', async function () {
        showGlobalLoader('Menutup form dan mengarsipkan...');
        try {
            // Ambil data URL form
            const { data: asm } = await supabaseClient.from('asesmen').select('google_form_url, google_sheet_url').eq('id', id).single();

            // Tutup Google Form via GAS (setAcceptingResponses = false)
            if (asm && asm.google_form_url) {
                var gasUrl = (document.getElementById('gasUrlInput') || {}).value;
                if (gasUrl) {
                    try {
                        await fetch(gasUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({
                                action: 'close',
                                formUrl: asm.google_form_url
                            })
                        });
                    } catch (e) { console.warn('Gagal menutup form:', e); }
                }
            }

            // Update DB: arsipkan, hapus link form (siswa tidak perlu akses lagi)
            await supabaseClient.from('asesmen').update({
                archived_at: new Date().toISOString(),
                google_form_url: null,
                google_form_edit_url: null,
                updated_at: new Date().toISOString()
            }).eq('id', id);

            showToast('Asesmen berhasil diarsipkan! Form sudah ditutup.', 'success');
            loadAsesmenList();
        } catch (e) { showToast('Gagal mengarsipkan: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

async function populateArsipFilters() {
    await loadMasterKelas();
    await loadMasterMapel();

    var kelasSelect = document.getElementById('filterArsipKelas');
    if (kelasSelect && typeof masterKelasList !== 'undefined') {
        var opts = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(function (k) {
            opts += '<option value="' + k.nama_kelas + '">' + k.nama_kelas + '</option>';
        });
        kelasSelect.innerHTML = opts;
    }

    var mapelSelect = document.getElementById('filterArsipMapel');
    if (mapelSelect && typeof masterMapelList !== 'undefined') {
        var opts = '<option value="">Semua Mapel</option>';
        masterMapelList.forEach(function (m) {
            opts += '<option value="' + m.nama_mapel + '">' + m.nama_mapel + '</option>';
        });
        mapelSelect.innerHTML = opts;
    }

    try {
        const { data } = await supabaseClient.from('asesmen').select('tahun_pelajaran').not('archived_at', 'is', null);
        var tahunSelect = document.getElementById('filterArsipTahun');
        if (tahunSelect && data) {
            var uniqueTahun = [];
            data.forEach(function (d) {
                if (d.tahun_pelajaran && uniqueTahun.indexOf(d.tahun_pelajaran) === -1) {
                    uniqueTahun.push(d.tahun_pelajaran);
                }
            });
            uniqueTahun.sort().reverse();
            var opts = '<option value="">Semua Tahun</option>';
            uniqueTahun.forEach(function (t) {
                opts += '<option value="' + t + '">' + t + '</option>';
            });
            tahunSelect.innerHTML = opts;
        }
    } catch (e) { }
}

var isArsipFilterPopulated = false;

async function loadArsipAsesmen() {
    if (!isArsipFilterPopulated && typeof populateArsipFilters === 'function') {
        await populateArsipFilters();
        isArsipFilterPopulated = true;
    }
    
    var tbody = document.getElementById('arsipAsesmenTbody');
    var countEl = document.getElementById('arsipAsesmenCount');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat arsip...</td></tr>';

    try {
        var query = supabaseClient.from('asesmen').select('*').not('archived_at', 'is', null).order('archived_at', { ascending: false });

        var filterTahun = (document.getElementById('filterArsipTahun') || {}).value;
        var filterKelas = (document.getElementById('filterArsipKelas') || {}).value;
        var filterMapel = (document.getElementById('filterArsipMapel') || {}).value;
        var filterSemester = (document.getElementById('filterArsipSemester') || {}).value;

        if (filterTahun) query = query.eq('tahun_pelajaran', filterTahun);
        if (filterKelas) query = query.eq('kelas', filterKelas);
        if (filterMapel) query = query.eq('mata_pelajaran', filterMapel);
        if (filterSemester) query = query.eq('semester', filterSemester);

        const { data, error } = await query;
        if (error) throw error;

        var arsipList = data || [];
        if (countEl) countEl.textContent = arsipList.length + ' arsip';

        var isAdminKurikulum = currentRole === 'admin' || currentRole === 'kurikulum';

        if (arsipList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada arsip yang cocok dengan filter.</td></tr>';
            return;
        }

        tbody.innerHTML = arsipList.map(function (a, i) {
            var linkHtml = '<div style="display:flex;flex-direction:column;gap:.25rem;">';
            if (a.google_form_url) linkHtml += '<a href="' + a.google_form_url + '" target="_blank" style="color:var(--primary);font-size:.82rem;font-weight:600;"><i data-lucide="external-link" style="width:12px;height:12px;"></i> Form</a>';
            if (a.google_sheet_url) linkHtml += '<a href="' + a.google_sheet_url + '" target="_blank" style="color:#16a34a;font-size:.82rem;font-weight:600;"><i data-lucide="table" style="width:12px;height:12px;"></i> Rekap</a>';
            if (!a.google_form_url && !a.google_sheet_url) linkHtml += '<span style="color:var(--text-light);font-size:.82rem;">-</span>';
            linkHtml += '</div>';

            var tglArsip = a.archived_at ? new Date(a.archived_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

            var canManage = isAdminKurikulum || (currentUser && a.created_by === currentUser.id);
            var aksiHtml = '';

            if (canManage) {
                aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="previewAsesmen(\'' + a.id + '\')" title="Detail/Preview"><i data-lucide="eye" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-blue" onclick="restoreArsipAsesmen(\'' + a.id + '\')" title="Kembalikan ke Aktif"><i data-lucide="undo-2" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="deleteArsipAsesmen(\'' + a.id + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
            } else {
                aksiHtml = '<span style="color:var(--text-light);font-size:0.8rem;font-style:italic;">Hanya pemilik</span>';
            }

            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                '<td>' + (a.kelas || '-') + '</td>' +
                '<td>' + (a.tipe_ujian || '-') + '</td>' +
                '<td>' + (a.tahun_pelajaran || '-') + '</td>' +
                '<td>' + (a.semester || '-') + '</td>' +
                '<td>' + tglArsip + '</td>' +
                '<td>' + linkHtml + '</td>' +
                '<td><div style="display:flex;gap:.4rem;justify-content:center;">' + aksiHtml + '</div></td>' +
                '</tr>';
        }).join('');

        if (window.lucide) lucide.createIcons();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

async function restoreArsipAsesmen(id) {
    showCustomConfirm('Kembalikan Asesmen?', 'Asesmen ini akan dikembalikan ke daftar aktif dengan status <strong>Draft</strong>.<br><br>Anda bisa mengedit soal dan menerbitkan ulang ke Google Form baru.', 'Ya, Kembalikan', async function () {
        showGlobalLoader('Mengembalikan Asesmen...');
        try {
            await supabaseClient.from('asesmen').update({
                archived_at: null,
                status: 'draft',
                google_form_url: null,
                google_form_edit_url: null,
                google_sheet_url: null,
                published_at: null,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            showToast('Asesmen berhasil dikembalikan sebagai Draft!', 'success');
            loadArsipAsesmen();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

async function deleteArsipAsesmen(id) {
    showCustomConfirm('Hapus Arsip Permanen?', 'Asesmen ini akan <strong>dihapus permanen</strong> dari database dan Google Drive. Data tidak bisa dikembalikan!', 'Ya, Hapus Permanen', async function () {
        showGlobalLoader('Menghapus Arsip Permanen...');
        try {
            const { data: asm } = await supabaseClient.from('asesmen').select('google_form_url, google_sheet_url').eq('id', id).single();

            if (asm && (asm.google_form_url || asm.google_sheet_url)) {
                var gasUrl = (document.getElementById('gasUrlInput') || {}).value;
                if (gasUrl) {
                    try {
                        await fetch(gasUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({
                                action: 'delete',
                                formUrl: asm.google_form_url,
                                sheetUrl: asm.google_sheet_url
                            })
                        });
                    } catch (e) { console.warn('Gagal hapus drive', e); }
                }
            }

            // Hapus gambar soal dari Supabase Storage
            try {
                const { data: soalData } = await supabaseClient.from('asesmen_soal').select('gambar_url').eq('asesmen_id', id);
                if (soalData) {
                    var filesToDelete = soalData
                        .filter(function (s) { return s.gambar_url && s.gambar_url.indexOf('/soal-images/') > -1; })
                        .map(function (s) { return s.gambar_url.split('/soal-images/').pop(); });
                    if (filesToDelete.length > 0) {
                        await supabaseClient.storage.from('soal-images').remove(filesToDelete);
                    }
                }
            } catch (e) { console.warn('Gagal hapus gambar storage', e); }

            await supabaseClient.from('asesmen_soal').delete().eq('asesmen_id', id);
            await supabaseClient.from('asesmen').delete().eq('id', id);
            showToast('Arsip berhasil dihapus permanen!', 'success');
            loadArsipAsesmen();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}


// Auto wrap dashboard tables for responsive scrolling
const tableObserver = new MutationObserver((mutations) => {
    document.querySelectorAll('.dash-table').forEach(table => {
        if (!table.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            wrapper.style.overflowX = 'auto';
            wrapper.style.width = '100%';
            wrapper.style.marginBottom = '1rem';
            wrapper.style.WebkitOverflowScrolling = 'touch';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
});
tableObserver.observe(document.body, { childList: true, subtree: true });

// =========================================================
// GALERI & MOMEN SEKOLAH
// =========================================================


// Global cache for galeri data
var galeriDataAll = [];

// Fungsi membuka gambar full di Lightbox
function openGaleriLightbox(imgUrl, captionEncoded) {
    var lb = document.getElementById('galeriLightbox');
    var img = document.getElementById('galeriLightboxImg');
    var cap = document.getElementById('galeriLightboxCaption');
    if (!lb || !img) { console.error('Lightbox elements not found'); return; }

    img.src = imgUrl;
    if (cap) cap.innerText = captionEncoded ? decodeURIComponent(captionEncoded) : '';
    lb.style.display = 'flex';
}

function closeGaleriLightbox() {
    var lb = document.getElementById('galeriLightbox');
    if (lb) {
        lb.style.display = 'none';
        var img = document.getElementById('galeriLightboxImg');
        if (img) img.src = '';
    }
}

async function loadGaleriBeranda() {
    var area = document.getElementById('dashboardGaleriArea');
    var gridUrl = document.getElementById('dashboardGaleriGrid');
    if (!area || !gridUrl) return;

    try {
        const { data, error } = await supabaseClient
            .from('galeri')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) throw error;

        if (!data || data.length === 0) {
            area.style.display = 'none';
            return;
        }

        area.style.display = '';
        var html = '';

        data.forEach(function (g) {
            var dateStr = '-';
            try { if (g.tanggal) { var d = new Date(g.tanggal); dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } } catch (e) { }

            var captions = g.keterangan || g.album_nama;
            var safeUrl = encodeURIComponent(g.gambar_url);
            var safeCap = encodeURIComponent(captions);
            html += `
            <div style="flex:0 0 auto; width:220px; border-radius:8px; overflow:hidden; border:1px solid var(--border-color); cursor:pointer; position:relative; group" onclick="openGaleriLightbox('${g.gambar_url}', '${safeCap}')">
              <img src="${g.gambar_url}" style="width:100%; height:140px; object-fit:cover; display:block; transition:transform 0.3s ease;">
              <div style="padding:0.75rem; background:#fff;">
                <p style="margin:0; font-weight:600; font-size:0.85rem; color:var(--text-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${g.album_nama}</p>
                <p style="margin:0.2rem 0 0 0; font-size:0.75rem; color:var(--text-light);"><i data-lucide="calendar" style="width:12px;height:12px;vertical-align:-2px;"></i> ${dateStr}</p>
              </div>
            </div>`;
        });

        gridUrl.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('Galeri Beranda error:', e.message);
    }
}

async function loadGaleri() {
    var gridArea = document.getElementById('galeriGridArea');
    if (!gridArea) return;

    gridArea.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;"><i data-lucide="loader" class="icon-spin" style="width:32px;height:32px;color:var(--primary-light);"></i></div>';
    if (window.lucide) lucide.createIcons();

    try {
        const { data, error } = await supabaseClient
            .from('galeri')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        galeriDataAll = data || [];

        // Update Filter Album Options
        var albumSet = new Set();
        galeriDataAll.forEach(function (g) { if (g.album_nama) albumSet.add(g.album_nama); });

        var filterEl = document.getElementById('galeriFilterAlbum');
        var currentSelected = filterEl ? filterEl.value : 'Semua';

        var albumHtml = '<option value="Semua">Semua Album</option>';
        var arrAlbum = Array.from(albumSet).sort();
        arrAlbum.forEach(function (a) {
            albumHtml += '<option value="' + a + '" ' + (a === currentSelected ? 'selected' : '') + '>' + a + '</option>';
        });
        if (filterEl) filterEl.innerHTML = albumHtml;

        renderGaleri();
    } catch (e) {
        gridArea.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--danger);">Gagal memuat galeri: ' + e.message + '</div>';
    }
}

function renderGaleri() {
    var gridArea = document.getElementById('galeriGridArea');
    if (!gridArea) return;

    var filterEl = document.getElementById('galeriFilterAlbum');
    var filterValue = filterEl ? filterEl.value : 'Semua';

    var filtered = galeriDataAll;
    if (filterValue !== 'Semua') {
        filtered = galeriDataAll.filter(function (g) { return g.album_nama === filterValue; });
    }

    if (filtered.length === 0) {
        gridArea.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;color:var(--text-light);">Belum ada foto.</div>';
        return;
    }

    var html = '';
    filtered.forEach(function (g, idx) {
        var dateStr = '-';
        try { if (g.tanggal) { var d = new Date(g.tanggal); dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } } catch (e) { }

        html += '<div class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">' +
            '<div style="height:180px; position:relative; background:#eee; cursor:pointer;" data-action="lightbox" data-idx="' + idx + '">' +
            '<img src="' + g.gambar_url + '" style="width:100%; height:100%; object-fit:cover;">' +
            '<div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); color:white; padding:4px 8px; border-radius:4px; font-size:0.75rem;">' + dateStr + '</div>' +
            '</div>' +
            '<div style="padding:1rem; flex:1; display:flex; flex-direction:column;">' +
            '<h4 style="margin:0 0 0.5rem 0; font-size:1rem; color:var(--text-dark);">' + g.album_nama + '</h4>' +
            '<p style="margin:0; font-size:0.85rem; color:var(--text-light); flex:1;">' + (g.keterangan || '-') + '</p>' +
            '<div style="display:flex; justify-content:space-between; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border-color); flex-wrap:wrap; gap:0.5rem;">' +
            '<div style="display:flex; gap:0.5rem;">' +
            '<button class="btn btn-outline" style="padding:6px; height:auto; color:var(--text-light)" data-action="lightbox" data-idx="' + idx + '" title="Lihat">' +
            '<i data-lucide="maximize-2" style="width:16px;height:16px;margin:0;"></i>' +
            '</button>' +
            '<button class="btn btn-outline" style="padding:6px; height:auto; color:var(--primary)" data-action="download" data-idx="' + idx + '" title="Download">' +
            '<i data-lucide="download" style="width:16px;height:16px;margin:0;"></i>' +
            '</button>' +
            '</div>' +
            '<div style="display:flex; gap:0.5rem;">' +
            '<button class="btn btn-outline" style="padding:6px; height:auto; color:#10b981;" data-action="archive" data-idx="' + idx + '" title="Arsipkan ke Google Drive (Pindah)">' +
            '<i data-lucide="hard-drive" style="width:16px;height:16px;margin:0;"></i>' +
            '</button>' +
            '<button class="btn btn-danger" style="padding:6px; height:auto;" data-action="delete" data-idx="' + idx + '" title="Hapus Permanen">' +
            '<i data-lucide="trash-2" style="width:16px;height:16px;margin:0;"></i>' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    });

    gridArea.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Event delegation for galeri actions
    gridArea.onclick = function (e) {
        var target = e.target.closest('[data-action]');
        if (!target) return;
        var action = target.getAttribute('data-action');
        var idx = parseInt(target.getAttribute('data-idx'));

        // Use filtered list (same as what was rendered)
        var currentFiltered = galeriDataAll;
        var fEl = document.getElementById('galeriFilterAlbum');
        var fVal = fEl ? fEl.value : 'Semua';
        if (fVal !== 'Semua') {
            currentFiltered = galeriDataAll.filter(function (g) { return g.album_nama === fVal; });
        }
        var g = currentFiltered[idx];
        if (!g) return;

        var captions = g.keterangan || g.album_nama || '';

        if (action === 'lightbox') {
            openGaleriLightbox(g.gambar_url, encodeURIComponent(captions));
        } else if (action === 'download') {
            downloadGaleriImage(g.gambar_url, 'galeri_' + g.id + '.jpg');
        } else if (action === 'archive') {
            archiveGaleriToDrive(g.id, g.gambar_url, encodeURIComponent(g.album_nama));
        } else if (action === 'delete') {
            deleteGaleri(g.id, g.gambar_url);
        }
    };
}

async function handleUploadGaleri() {
    var albumEl = document.getElementById('galeriAlbum');
    var ketEl = document.getElementById('galeriKeterangan');
    var tglEl = document.getElementById('galeriTanggal');
    var fileInput = document.getElementById('galeriFiles');

    var album = (albumEl.value || '').trim();
    var keterangan = (ketEl.value || '').trim();
    var tgl = tglEl.value;

    if (!album) { showToast('Nama Album wajib diisi!', 'warning'); return; }
    if (!tgl) { showToast('Tanggal wajib dipilih!', 'warning'); return; }
    if (!fileInput.files || fileInput.files.length === 0) { showToast('Tidak ada gambar yang dipilih!', 'warning'); return; }

    var files = Array.from(fileInput.files);
    var MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    // Validate sizes
    for (var i = 0; i < files.length; i++) {
        if (files[i].size > MAX_SIZE) {
            showToast('File "' + files[i].name + '" lebih dari 5MB! Silakan kompres terlebih dahulu.', 'warning');
            return;
        }
    }

    showGlobalLoader('Mengunggah ' + files.length + ' Foto ke Google Drive... Mohon jangan tutup halaman!');

    try {
        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            // Kompres gambar terlebih dahulu
            var compressedBlob = await new Promise(function (resolve) {
                if (typeof compressImage === 'function') {
                    compressImage(file, 1920, 1920, 0.85, resolve);
                } else {
                    resolve(file); // fallback jika compressImage belum ada
                }
            });

            // Upload ke Google Drive
            var publicUrl = await uploadToGoogleDrive(compressedBlob, 'galeri');

            // Insert to database
            var rowToInsert = {
                album_nama: album,
                keterangan: keterangan,
                tanggal: tgl,
                gambar_url: publicUrl,
                ukuran_file: file.size,
                created_by: (typeof currentUser !== 'undefined' && currentUser ? currentUser.id : null)
            };

            var { error: insertErr } = await supabaseClient.from('galeri').insert(rowToInsert);
            if (insertErr) throw insertErr;
        }

        showToast(files.length + ' Foto berhasil diupload!', 'success');

        // Reset forms (keep Album name to make it easier for consecutive uploads)
        ketEl.value = '';
        fileInput.value = '';

        loadGaleri();
        loadGaleriBeranda();
    } catch (e) {
        showToast('Gagal upload: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function deleteGaleri(id, url) {
    showCustomConfirm('Hapus Foto Permanen?', 'Foto akan dihapus permanen dari Database. Lanjutkan?', 'Ya, Hapus', async function () {
        showGlobalLoader('Menghapus foto...');
        try {
            // Delete from database only (gambar di Google Drive dikelola manual via folder)
            await supabaseClient.from('galeri').delete().eq('id', id);

            showToast('Foto berhasil dihapus!', 'success');
            loadGaleri();
            loadGaleriBeranda();
        } catch (e) {
            showToast('Gagal hapus: ' + e.message, 'error');
        } finally {
            hideGlobalLoader();
        }
    });
}

function downloadGaleriImage(url, filename) {
    showToast('Memulai unduhan...', 'info');
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            var blobUrl = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename || 'download.jpg';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        })
        .catch(e => {
            showToast('Gagal mengunduh gambar: ' + e.message, 'error');
        });
}

async function archiveGaleriToDrive(id, url, albumEncoded) {
    var album = albumEncoded ? decodeURIComponent(albumEncoded) : '';
    showCustomConfirm('Pindahkan ke Google Drive?', 'Tindakan ini akan mengunduh foto ini ke Google Drive (pada folder "Arsip Galeri SMPIT"), lalu menghapusnya secara **permanen** dari sistem (Supabase) agar ruang penyimpanan Anda lega.<br><br>Gunakan fitur ini untuk foto yang sudah tidak aktif namun tetap ingin disave di Drive.', 'Ya, Pindahkan', async function () {
        showGlobalLoader('Memindahkan ke Google Drive...');
        try {
            var gasUrl = (document.getElementById('gasUrlInput') || {}).value;
            if (!gasUrl) {
                throw new Error('URL Konfigurasi Google Apps Script belum disetel! Harap setel di Buat Soal Asesmen > Konfigurasi.');
            }

            // Generate filename based on ID
            var filename = 'galeri_' + id + '.jpg';

            // Shoot POST to GAS
            var response = await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'archive_galeri',
                    url: url,
                    album_nama: album,
                    filename: filename
                })
            });

            var result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message);
            }

            // Delete from DB & supabase Storage
            if (url) {
                var sName = url.split('/galeri-images/').pop();
                if (sName) {
                    await supabaseClient.storage.from('galeri-images').remove([sName]);
                }
            }
            await supabaseClient.from('galeri').delete().eq('id', id);

            showToast('Foto berhasil diarsipkan ke Google Drive!', 'success');
            loadGaleri();
            loadGaleriBeranda();
        } catch (e) {
            showToast('Gagal memindahkan: ' + e.message, 'error');
        } finally {
            hideGlobalLoader();
        }
    });
}

// ==========================================