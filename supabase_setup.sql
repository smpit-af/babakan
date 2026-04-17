-- ============================================================
-- SUPABASE SETUP — SMP IT AL-FATHONAH
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. TABLE: profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'menunggu_persetujuan' CHECK (role IN (
        'admin', 'kurikulum', 'kepala_sekolah', 'kesiswaan',
        'wali_kelas', 'operator_sekolah', 'guru_mapel',
        'bendahara', 'siswa', 'menunggu_persetujuan', 'nonaktif'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE: berita
CREATE TABLE IF NOT EXISTS berita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    ringkasan TEXT,
    konten TEXT,
    gambar_url TEXT,
    tanggal DATE DEFAULT CURRENT_DATE,
    is_published BOOLEAN DEFAULT true,
    archived_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: pendaftaran_murid_baru
CREATE TABLE IF NOT EXISTS pendaftaran_murid_baru (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_lengkap TEXT NOT NULL,
    nama_orang_tua TEXT,
    nik TEXT,
    nomor_telepon TEXT,
    sekolah_asal TEXT,
    alamat_lengkap TEXT,
    status TEXT DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Diterima', 'Ditolak')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: ekstrakurikuler
CREATE TABLE IF NOT EXISTS ekstrakurikuler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    gambar_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: sarana_prasarana
CREATE TABLE IF NOT EXISTS sarana_prasarana (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    gambar_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'menunggu_persetujuan'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: auto-update updated_at on profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profiles ON profiles;
CREATE TRIGGER trigger_update_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RPC: delete user completely (from auth.users + profiles)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS: Enable Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendaftaran_murid_baru ENABLE ROW LEVEL SECURITY;
ALTER TABLE ekstrakurikuler ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarana_prasarana ENABLE ROW LEVEL SECURITY;

-- profiles: authenticated can read all, admin/kurikulum can update
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);

-- berita: public can read published, authenticated can read all, admin/kurikulum can insert/update/delete
DROP POLICY IF EXISTS "berita_select_public" ON berita;
CREATE POLICY "berita_select_public" ON berita FOR SELECT TO anon USING (is_published = true);
DROP POLICY IF EXISTS "berita_select_auth" ON berita;
CREATE POLICY "berita_select_auth" ON berita FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "berita_insert" ON berita;
CREATE POLICY "berita_insert" ON berita FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);
DROP POLICY IF EXISTS "berita_update" ON berita;
CREATE POLICY "berita_update" ON berita FOR UPDATE TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);
DROP POLICY IF EXISTS "berita_delete" ON berita;
CREATE POLICY "berita_delete" ON berita FOR DELETE TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);
DROP POLICY IF EXISTS "eskul_select_public" ON ekstrakurikuler;
CREATE POLICY "eskul_select_public" ON ekstrakurikuler FOR SELECT USING (true);
DROP POLICY IF EXISTS "eskul_all_admin" ON ekstrakurikuler;
CREATE POLICY "eskul_all_admin" ON ekstrakurikuler FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);

-- sarana_prasarana: public can read, admin/kurikulum can modify
DROP POLICY IF EXISTS "sarpras_select_public" ON sarana_prasarana;
CREATE POLICY "sarpras_select_public" ON sarana_prasarana FOR SELECT USING (true);
DROP POLICY IF EXISTS "sarpras_all_admin" ON sarana_prasarana;
CREATE POLICY "sarpras_all_admin" ON sarana_prasarana FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);

-- pendaftaran_murid_baru: anon can insert, admin/kurikulum can read/update/delete
DROP POLICY IF EXISTS "spmb_insert_public" ON pendaftaran_murid_baru;
CREATE POLICY "spmb_insert_public" ON pendaftaran_murid_baru FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "spmb_insert_auth" ON pendaftaran_murid_baru;
CREATE POLICY "spmb_insert_auth" ON pendaftaran_murid_baru FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "spmb_select" ON pendaftaran_murid_baru;
CREATE POLICY "spmb_select" ON pendaftaran_murid_baru FOR SELECT TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);
DROP POLICY IF EXISTS "spmb_update" ON pendaftaran_murid_baru;
CREATE POLICY "spmb_update" ON pendaftaran_murid_baru FOR UPDATE TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);
DROP POLICY IF EXISTS "spmb_delete" ON pendaftaran_murid_baru;
CREATE POLICY "spmb_delete" ON pendaftaran_murid_baru FOR DELETE TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'kurikulum')
);

-- ============================================================
-- FITUR JEDA PEMELIHARAAN (MAINTENANCE)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Semua orang bisa baca pengaturan" ON public.system_settings;
CREATE POLICY "Semua orang bisa baca pengaturan" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hanya Admin yang bisa ubah pengaturan" ON public.system_settings;
CREATE POLICY "Hanya Admin yang bisa ubah pengaturan" ON public.system_settings FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
    );

DROP POLICY IF EXISTS "Hanya Admin yang bisa tambah pengaturan" ON public.system_settings;
CREATE POLICY "Hanya Admin yang bisa tambah pengaturan" ON public.system_settings FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
    );

-- Insert default value jika belum ada
INSERT INTO public.system_settings (key, value) VALUES ('maintenance_mode', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.system_settings (key, value) VALUES ('active_academic_year', '2025/2026 Ganjil') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.system_settings (key, value) VALUES ('spmb_is_active', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.system_settings (key, value) VALUES ('spmb_academic_year', '2026/2027') ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- MASTER DATA ADMINISTRASI (TAHAP 2)
-- ============================================================

-- MASTER KELAS
CREATE TABLE IF NOT EXISTS public.master_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelas TEXT NOT NULL,
    tingkat INTEGER NOT NULL CHECK (tingkat IN (7, 8, 9)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GURU & STAFF
CREATE TABLE IF NOT EXISTS public.guru_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_lengkap TEXT NOT NULL,
    jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L', 'P')),
    jabatan TEXT,
    nik TEXT,
    nomor_hp TEXT,
    email TEXT,
    mata_pelajaran TEXT,
    alamat TEXT,
    status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SISWA & ALUMNI
CREATE TABLE IF NOT EXISTS public.siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asal_sekolah TEXT,
    nama_lengkap TEXT NOT NULL,
    jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L', 'P')),
    kelas_id UUID REFERENCES public.master_kelas(id) ON DELETE SET NULL,
    nisn TEXT,
    nama_wali_murid TEXT,
    jenis_kelamin_wm TEXT CHECK (jenis_kelamin_wm IN ('L', 'P')),
    nik_wali TEXT,
    nomor_hp TEXT,
    email TEXT,
    alamat TEXT,
    status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Lulus', 'Pindah', 'Gugur', 'Nonaktif')),
    sekolah_tujuan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.master_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kelas_select" ON public.master_kelas;
CREATE POLICY "kelas_select" ON public.master_kelas FOR SELECT USING (true);
DROP POLICY IF EXISTS "kelas_all_admin" ON public.master_kelas;
CREATE POLICY "kelas_all_admin" ON public.master_kelas FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

DROP POLICY IF EXISTS "guru_select" ON public.guru_staff;
CREATE POLICY "guru_select" ON public.guru_staff FOR SELECT USING (true);
DROP POLICY IF EXISTS "guru_all_admin" ON public.guru_staff;
CREATE POLICY "guru_all_admin" ON public.guru_staff FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

DROP POLICY IF EXISTS "siswa_select" ON public.siswa;
CREATE POLICY "siswa_select" ON public.siswa FOR SELECT USING (true);
DROP POLICY IF EXISTS "siswa_all_admin" ON public.siswa;
CREATE POLICY "siswa_all_admin" ON public.siswa FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- RPC: KENAIKAN KELAS OTOMATIS
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_students_next_year()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    target_class_id UUID;
    next_tingkat INTEGER;
    char_suffix TEXT;
BEGIN
    FOR r IN 
        SELECT s.id, s.kelas_id, k.nama_kelas, k.tingkat 
        FROM public.siswa s 
        JOIN public.master_kelas k ON s.kelas_id = k.id 
        WHERE s.status = 'Aktif'
    LOOP
        IF r.tingkat = 9 THEN
            -- Lulus
            UPDATE public.siswa SET status = 'Lulus' WHERE id = r.id;
        ELSIF r.tingkat IN (7, 8) THEN
            -- Naik Kelas (Mencari huruf abjad belakang yang sama)
            next_tingkat := r.tingkat + 1;
            char_suffix := RIGHT(r.nama_kelas, 1);
            
            SELECT id INTO target_class_id 
            FROM public.master_kelas 
            WHERE tingkat = next_tingkat 
              AND RIGHT(nama_kelas, 1) = char_suffix
            LIMIT 1;

            IF target_class_id IS NOT NULL THEN
                UPDATE public.siswa SET kelas_id = target_class_id WHERE id = r.id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AKADEMIK: BANK SOAL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bank_soal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapel TEXT NOT NULL,
    kelas_id UUID REFERENCES public.master_kelas(id) ON DELETE CASCADE,
    tipe_ujian TEXT NOT NULL CHECK (tipe_ujian IN ('STS', 'SAS', 'SAJ', 'SAT')),
    link_soal TEXT NOT NULL,
    tahun_pelajaran TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_soal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_soal_select" ON public.bank_soal;
CREATE POLICY "bank_soal_select" ON public.bank_soal FOR SELECT USING (true);
DROP POLICY IF EXISTS "bank_soal_all_admin" ON public.bank_soal;
CREATE POLICY "bank_soal_all_admin" ON public.bank_soal FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- AKADEMIK: MASTER MATA PELAJARAN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.master_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_mapel TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.master_mapel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_mapel_select" ON public.master_mapel;
CREATE POLICY "master_mapel_select" ON public.master_mapel FOR SELECT USING (true);
DROP POLICY IF EXISTS "master_mapel_all_admin" ON public.master_mapel;
CREATE POLICY "master_mapel_all_admin" ON public.master_mapel FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAINNYA: KRITIK & SARAN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kritik_saran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nama_pengirim TEXT NOT NULL,
    pesan TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kritik_saran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kritik_saran_insert" ON public.kritik_saran;
CREATE POLICY "kritik_saran_insert" ON public.kritik_saran FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "kritik_saran_select_admin" ON public.kritik_saran;
CREATE POLICY "kritik_saran_select_admin" ON public.kritik_saran FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);
DROP POLICY IF EXISTS "kritik_saran_delete_admin" ON public.kritik_saran;
CREATE POLICY "kritik_saran_delete_admin" ON public.kritik_saran FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- AKADEMIK: JURNAL MENGAJAR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jurnal_mengajar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_pelajaran TEXT NOT NULL,
    mapel TEXT NOT NULL,
    kelas_id UUID REFERENCES public.master_kelas(id) ON DELETE SET NULL,
    semester TEXT NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
    total_bab INT NOT NULL DEFAULT 1,
    tanggal DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jurnal_mengajar ADD COLUMN IF NOT EXISTS tanggal DATE;
ALTER TABLE public.jurnal_mengajar DROP COLUMN IF EXISTS halaman;

ALTER TABLE public.jurnal_mengajar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jurnal_mengajar_all_admin" ON public.jurnal_mengajar;
CREATE POLICY "jurnal_mengajar_all_admin" ON public.jurnal_mengajar FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);
DROP POLICY IF EXISTS "jurnal_mengajar_select_all" ON public.jurnal_mengajar;
CREATE POLICY "jurnal_mengajar_select_all" ON public.jurnal_mengajar FOR SELECT USING (true);

-- Progress bulanan
CREATE TABLE IF NOT EXISTS public.jurnal_mengajar_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurnal_id UUID REFERENCES public.jurnal_mengajar(id) ON DELETE CASCADE NOT NULL,
    bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INT NOT NULL,
    bab_tercapai INT NOT NULL DEFAULT 0,
    judul_bab TEXT,
    halaman TEXT,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jurnal_mengajar_progress ADD COLUMN IF NOT EXISTS halaman TEXT;

ALTER TABLE public.jurnal_mengajar_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jurnal_progress_all_admin" ON public.jurnal_mengajar_progress;
CREATE POLICY "jurnal_progress_all_admin" ON public.jurnal_mengajar_progress FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);
DROP POLICY IF EXISTS "jurnal_progress_select_all" ON public.jurnal_mengajar_progress;
CREATE POLICY "jurnal_progress_select_all" ON public.jurnal_mengajar_progress FOR SELECT USING (true);



-- =========================================================================
-- SISTEM PENILAIAN AKADEMIK & KKM
-- =========================================================================

-- TABEL KKM MATA PELAJARAN
CREATE TABLE IF NOT EXISTS public.kkm_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapel_id UUID REFERENCES public.master_mapel(id) ON DELETE CASCADE NOT NULL,
    kelas_id UUID REFERENCES public.master_kelas(id) ON DELETE CASCADE NOT NULL,
    nilai_kkm INTEGER NOT NULL DEFAULT 75,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mapel_id, kelas_id)
);

ALTER TABLE public.kkm_mapel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kkm_all_admin" ON public.kkm_mapel;
CREATE POLICY "kkm_all_admin" ON public.kkm_mapel FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

DROP POLICY IF EXISTS "kkm_select_all" ON public.kkm_mapel;
CREATE POLICY "kkm_select_all" ON public.kkm_mapel FOR SELECT USING (true);

-- TABEL NILAI AKADEMIK
CREATE TABLE IF NOT EXISTS public.nilai_akademik (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_pelajaran TEXT NOT NULL,
    semester TEXT NOT NULL,
    mapel_id UUID REFERENCES public.master_mapel(id) ON DELETE CASCADE NOT NULL,
    kelas_id UUID REFERENCES public.master_kelas(id) ON DELETE CASCADE NOT NULL,
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    nilai_sts INTEGER DEFAULT 0,
    nilai_sas INTEGER DEFAULT 0,
    nilai_saj INTEGER DEFAULT 0,
    nilai_sat INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tahun_pelajaran, semester, mapel_id, kelas_id, siswa_id)
);

ALTER TABLE public.nilai_akademik ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nilai_all_admin" ON public.nilai_akademik;
CREATE POLICY "nilai_all_admin" ON public.nilai_akademik FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

DROP POLICY IF EXISTS "nilai_select_all" ON public.nilai_akademik;
CREATE POLICY "nilai_select_all" ON public.nilai_akademik FOR SELECT USING (true);

-- ============================================================
-- OPERASIONAL SEKOLAH: DATA MUTASI SISWA
-- ============================================================

-- Update constraint status siswa: tambah 'Pindahan' untuk siswa mutasi masuk
ALTER TABLE public.siswa DROP CONSTRAINT IF EXISTS siswa_status_check;
ALTER TABLE public.siswa ADD CONSTRAINT siswa_status_check
  CHECK (status IN ('Aktif', 'Lulus', 'Pindah', 'Pindahan', 'Gugur', 'Nonaktif'));

-- Tabel pencatatan mutasi siswa (masuk & keluar)
CREATE TABLE IF NOT EXISTS public.mutasi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE SET NULL,
    nama_lengkap TEXT NOT NULL,
    jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L', 'P')),
    kelas_id UUID REFERENCES public.master_kelas(id) ON DELETE SET NULL,
    nisn TEXT,
    tipe_mutasi TEXT NOT NULL CHECK (tipe_mutasi IN ('Masuk', 'Keluar')),
    sekolah_asal TEXT,
    sekolah_tujuan TEXT,
    tanggal_mutasi DATE DEFAULT CURRENT_DATE,
    keterangan TEXT,
    nama_wali_murid TEXT,
    nomor_hp TEXT,
    alamat TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mutasi_siswa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mutasi_siswa_select" ON public.mutasi_siswa;
CREATE POLICY "mutasi_siswa_select" ON public.mutasi_siswa FOR SELECT USING (true);

DROP POLICY IF EXISTS "mutasi_siswa_all_admin" ON public.mutasi_siswa;
CREATE POLICY "mutasi_siswa_all_admin" ON public.mutasi_siswa FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- KELOLA KONTEN: PENGUMUMAN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pengumuman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    isi TEXT NOT NULL,
    prioritas TEXT DEFAULT 'Normal' CHECK (prioritas IN ('Normal', 'Penting', 'Urgent')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pengumuman_select" ON public.pengumuman;
CREATE POLICY "pengumuman_select" ON public.pengumuman FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pengumuman_all_admin" ON public.pengumuman;
CREATE POLICY "pengumuman_all_admin" ON public.pengumuman FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- OPERASIONAL SEKOLAH: AGENDA DINAS
-- ============================================================

-- Tabel Rapat & Pertemuan
CREATE TABLE IF NOT EXISTS public.rapat_pertemuan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    tempat TEXT,
    tanggal DATE DEFAULT CURRENT_DATE,
    waktu_mulai TIME,
    waktu_selesai TIME,
    penyelenggara TEXT,
    status_kehadiran TEXT DEFAULT 'Belum Dikonfirmasi' CHECK (status_kehadiran IN ('Hadir', 'Tidak Hadir', 'Izin', 'Belum Dikonfirmasi')),
    ringkasan_hasil TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rapat_pertemuan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rapat_select" ON public.rapat_pertemuan;
CREATE POLICY "rapat_select" ON public.rapat_pertemuan FOR SELECT USING (true);
DROP POLICY IF EXISTS "rapat_all_admin" ON public.rapat_pertemuan;
CREATE POLICY "rapat_all_admin" ON public.rapat_pertemuan FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- Tabel Perjalanan Dinas
CREATE TABLE IF NOT EXISTS public.perjalanan_dinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tujuan TEXT NOT NULL,
    instansi_tujuan TEXT,
    keperluan TEXT NOT NULL,
    tanggal_berangkat DATE DEFAULT CURRENT_DATE,
    tanggal_kembali DATE,
    petugas TEXT,
    status TEXT DEFAULT 'Direncanakan' CHECK (status IN ('Direncanakan', 'Berlangsung', 'Berhasil', 'Gagal', 'Dibatalkan')),
    hasil_keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.perjalanan_dinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perjadin_select" ON public.perjalanan_dinas;
CREATE POLICY "perjadin_select" ON public.perjalanan_dinas FOR SELECT USING (true);
DROP POLICY IF EXISTS "perjadin_all_admin" ON public.perjalanan_dinas;
CREATE POLICY "perjadin_all_admin" ON public.perjalanan_dinas FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- OPERASIONAL SEKOLAH: INVENTARIS & SARANA PRASARANA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventaris_sekolah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_barang TEXT NOT NULL,
    kode_barang TEXT,
    kategori TEXT DEFAULT 'Lainnya' CHECK (kategori IN ('Elektronik', 'Mebel', 'Alat Tulis', 'Olahraga', 'Laboratorium', 'Bangunan', 'Lainnya')),
    jumlah INTEGER DEFAULT 1,
    kondisi TEXT DEFAULT 'Baik' CHECK (kondisi IN ('Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang')),
    lokasi TEXT,
    tahun_pengadaan INTEGER,
    status_perbaikan TEXT CHECK (status_perbaikan IN ('Dilaporkan', 'Dalam Perbaikan', 'Selesai Diperbaiki', 'Tidak Bisa Diperbaiki')),
    catatan_perbaikan TEXT,
    tanggal_laporan_kerusakan DATE,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventaris_sekolah ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventaris_select" ON public.inventaris_sekolah;
CREATE POLICY "inventaris_select" ON public.inventaris_sekolah FOR SELECT USING (true);
DROP POLICY IF EXISTS "inventaris_all_admin" ON public.inventaris_sekolah;
CREATE POLICY "inventaris_all_admin" ON public.inventaris_sekolah FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- OPERASIONAL SEKOLAH: SURAT MASUK & KELUAR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.surat_masuk_keluar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_surat TEXT,
    tanggal_surat DATE DEFAULT CURRENT_DATE,
    jenis TEXT NOT NULL CHECK (jenis IN ('Masuk', 'Keluar')),
    pengirim TEXT,
    tujuan TEXT,
    perihal TEXT NOT NULL,
    status TEXT DEFAULT 'Diproses' CHECK (status IN ('Diproses', 'Selesai', 'Diarsipkan')),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.surat_masuk_keluar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "surat_select" ON public.surat_masuk_keluar;
CREATE POLICY "surat_select" ON public.surat_masuk_keluar FOR SELECT USING (true);
DROP POLICY IF EXISTS "surat_all_admin" ON public.surat_masuk_keluar;
CREATE POLICY "surat_all_admin" ON public.surat_masuk_keluar FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- OPERASIONAL SEKOLAH: NOTULENSI & DOKUMEN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notulensi_dokumen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    jenis TEXT DEFAULT 'Notulensi' CHECK (jenis IN ('Notulensi', 'SK', 'Surat Keputusan', 'Laporan', 'Dokumen Lain')),
    tanggal DATE DEFAULT CURRENT_DATE,
    penulis TEXT,
    isi_ringkasan TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notulensi_dokumen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notulensi_select" ON public.notulensi_dokumen;
CREATE POLICY "notulensi_select" ON public.notulensi_dokumen FOR SELECT USING (true);
DROP POLICY IF EXISTS "notulensi_all_admin" ON public.notulensi_dokumen;
CREATE POLICY "notulensi_all_admin" ON public.notulensi_dokumen FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAYANAN KESISWAAN: TATA TERTIB & POIN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tata_tertib (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori TEXT NOT NULL CHECK (kategori IN ('Ringan', 'Sedang', 'Berat')),
    deskripsi TEXT NOT NULL,
    poin INTEGER NOT NULL DEFAULT 5,
    sanksi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tata_tertib ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tata_tertib_select" ON public.tata_tertib;
CREATE POLICY "tata_tertib_select" ON public.tata_tertib FOR SELECT USING (true);
DROP POLICY IF EXISTS "tata_tertib_all_admin" ON public.tata_tertib;
CREATE POLICY "tata_tertib_all_admin" ON public.tata_tertib FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAYANAN KESISWAAN: CATATAN PELANGGARAN SISWA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pelanggaran_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    tata_tertib_id UUID REFERENCES public.tata_tertib(id) ON DELETE SET NULL,
    tanggal DATE DEFAULT CURRENT_DATE,
    keterangan TEXT,
    tindak_lanjut TEXT,
    status TEXT DEFAULT 'Dicatat' CHECK (status IN ('Dicatat', 'Proses', 'Selesai')),
    dilaporkan_oleh TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pelanggaran_siswa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pelanggaran_select" ON public.pelanggaran_siswa;
CREATE POLICY "pelanggaran_select" ON public.pelanggaran_siswa FOR SELECT USING (true);
DROP POLICY IF EXISTS "pelanggaran_all_admin" ON public.pelanggaran_siswa;
CREATE POLICY "pelanggaran_all_admin" ON public.pelanggaran_siswa FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAYANAN KESISWAAN: KEGIATAN OSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kegiatan_osis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kegiatan TEXT NOT NULL,
    jenis TEXT DEFAULT 'Kegiatan Rutin' CHECK (jenis IN ('Kegiatan Rutin', 'Event Khusus', 'Bakti Sosial', 'Lomba', 'Pelatihan', 'Lainnya')),
    tanggal_mulai DATE DEFAULT CURRENT_DATE,
    tanggal_selesai DATE,
    tempat TEXT,
    penanggung_jawab TEXT,
    jumlah_peserta INTEGER,
    anggaran TEXT,
    deskripsi TEXT,
    status TEXT DEFAULT 'Direncanakan' CHECK (status IN ('Direncanakan', 'Berlangsung', 'Selesai', 'Dibatalkan')),
    hasil_keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kegiatan_osis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "osis_select" ON public.kegiatan_osis;
CREATE POLICY "osis_select" ON public.kegiatan_osis FOR SELECT USING (true);
DROP POLICY IF EXISTS "osis_all_admin" ON public.kegiatan_osis;
CREATE POLICY "osis_all_admin" ON public.kegiatan_osis FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAYANAN KESISWAAN: EKSTRAKURIKULER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ekstrakurikuler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_ekskul TEXT NOT NULL,
    pembina TEXT,
    jadwal_hari TEXT,
    jadwal_waktu TEXT,
    tempat TEXT,
    deskripsi TEXT,
    status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ekstrakurikuler ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ekskul_select" ON public.ekstrakurikuler;
CREATE POLICY "ekskul_select" ON public.ekstrakurikuler FOR SELECT USING (true);
DROP POLICY IF EXISTS "ekskul_all_admin" ON public.ekstrakurikuler;
CREATE POLICY "ekskul_all_admin" ON public.ekstrakurikuler FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAYANAN KESISWAAN: PRESTASI SISWA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prestasi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    nama_prestasi TEXT NOT NULL,
    tingkat TEXT DEFAULT 'Sekolah' CHECK (tingkat IN ('Sekolah', 'Kecamatan', 'Kabupaten/Kota', 'Provinsi', 'Nasional', 'Internasional')),
    kategori TEXT DEFAULT 'Akademik' CHECK (kategori IN ('Akademik', 'Non-Akademik')),
    peringkat TEXT,
    tanggal DATE DEFAULT CURRENT_DATE,
    penyelenggara TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prestasi_siswa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prestasi_select" ON public.prestasi_siswa;
CREATE POLICY "prestasi_select" ON public.prestasi_siswa FOR SELECT USING (true);
DROP POLICY IF EXISTS "prestasi_all_admin" ON public.prestasi_siswa;
CREATE POLICY "prestasi_all_admin" ON public.prestasi_siswa FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAYANAN KESISWAAN: BIMBINGAN KONSELING (BK)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bimbingan_konseling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE,
    jenis_layanan TEXT DEFAULT 'Konseling Individu' CHECK (jenis_layanan IN ('Konseling Individu', 'Konseling Kelompok', 'Bimbingan Karir', 'Bimbingan Akademik', 'Lainnya')),
    permasalahan TEXT NOT NULL,
    penyelesaian_tindak_lanjut TEXT,
    konselor TEXT,
    status TEXT DEFAULT 'Proses' CHECK (status IN ('Terjadwal', 'Proses', 'Selesai', 'Dirujuk')),
    catatan_rahasia TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bimbingan_konseling ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bk_select" ON public.bimbingan_konseling;
CREATE POLICY "bk_select" ON public.bimbingan_konseling FOR SELECT USING (true);
DROP POLICY IF EXISTS "bk_all_admin" ON public.bimbingan_konseling;
CREATE POLICY "bk_all_admin" ON public.bimbingan_konseling FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- LAYANAN KESISWAAN: KESEHATAN SISWA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kesehatan_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE,
    keluhan_penyakit TEXT NOT NULL,
    tindakan_obat TEXT,
    petugas_uks TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kesehatan_siswa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kesehatan_select" ON public.kesehatan_siswa;
CREATE POLICY "kesehatan_select" ON public.kesehatan_siswa FOR SELECT USING (true);
DROP POLICY IF EXISTS "kesehatan_all_admin" ON public.kesehatan_siswa;
CREATE POLICY "kesehatan_all_admin" ON public.kesehatan_siswa FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ============================================================
-- AKADEMIK: BUAT SOAL ASESMEN (Google Forms Integration)
-- ============================================================

-- Header asesmen (info umum: mapel, kelas, tipe ujian)
CREATE TABLE IF NOT EXISTS public.asesmen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    mata_pelajaran TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tipe_ujian TEXT NOT NULL DEFAULT 'STS' CHECK (tipe_ujian IN ('STS', 'SAS', 'SAJ', 'SAT')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'terbit')),
    waktu_menit INTEGER,
    tanggal_pelaksanaan DATE,
    bobot_pg INTEGER DEFAULT 2,
    bobot_essay INTEGER DEFAULT 0,
    google_form_url TEXT,
    google_sheet_url TEXT,
    google_form_edit_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    tahun_pelajaran TEXT,
    semester TEXT CHECK (semester IN ('Ganjil', 'Genap')),
    archived_at TIMESTAMPTZ
);

-- Detail soal per asesmen
CREATE TABLE IF NOT EXISTS public.asesmen_soal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asesmen_id UUID NOT NULL REFERENCES public.asesmen(id) ON DELETE CASCADE,
    nomor_soal INTEGER NOT NULL,
    tipe_soal TEXT NOT NULL DEFAULT 'pg' CHECK (tipe_soal IN ('pg', 'essay')),
    naskah_soal TEXT NOT NULL,
    opsi_a TEXT,
    opsi_b TEXT,
    opsi_c TEXT,
    opsi_d TEXT,
    kunci_jawaban TEXT,
    gambar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.asesmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asesmen_soal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asesmen_select" ON public.asesmen;
CREATE POLICY "asesmen_select" ON public.asesmen FOR SELECT USING (true);
DROP POLICY IF EXISTS "asesmen_all_admin" ON public.asesmen;
CREATE POLICY "asesmen_all_admin" ON public.asesmen FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

DROP POLICY IF EXISTS "asesmen_soal_select" ON public.asesmen_soal;
CREATE POLICY "asesmen_soal_select" ON public.asesmen_soal FOR SELECT USING (true);

DROP POLICY IF EXISTS "asesmen_soal_all_admin" ON public.asesmen_soal;
CREATE POLICY "asesmen_soal_all_admin" ON public.asesmen_soal FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- ========================================================================================
-- GALERI: Manajemen Foto dan Momen Sekolah
-- ========================================================================================

CREATE TABLE IF NOT EXISTS public.galeri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_nama TEXT NOT NULL,
    keterangan TEXT,
    tanggal DATE NOT NULL,
    gambar_url TEXT NOT NULL,
    ukuran_file BIGINT, -- dalam bytes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.galeri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "galeri_select_all" ON public.galeri;
CREATE POLICY "galeri_select_all" ON public.galeri FOR SELECT USING (true); -- Bisa dibaca semua orang (siswa & admin)

DROP POLICY IF EXISTS "galeri_all_admin" ON public.galeri;
CREATE POLICY "galeri_all_admin" ON public.galeri FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'menunggu_persetujuan')
);

-- Buat bucket untuk gambar galeri
INSERT INTO storage.buckets (id, name, public) 
VALUES ('galeri-images', 'galeri-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: Buka akses baca publik
CREATE POLICY "galeri_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'galeri-images');

-- Policy Storage: Upload dan Delete khusus staf login
CREATE POLICY "galeri_images_auth_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'galeri-images' AND auth.role() = 'authenticated'
);
CREATE POLICY "galeri_images_auth_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'galeri-images' AND auth.role() = 'authenticated'
);
