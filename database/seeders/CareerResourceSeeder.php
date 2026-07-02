<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CareerResource;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Replaces the "Tips Karier" (career_resources) content with 15 realistic
 * Indonesian career articles, each with a topical thumbnail downloaded from a
 * public image service into `storage/app/public/career-resources`.
 *
 * Run standalone: php artisan db:seed --class=CareerResourceSeeder
 */
class CareerResourceSeeder extends Seeder
{
    public function run(): void
    {
        $author = User::query()->where('role', UserRole::Admin)->orderBy('id')->first();

        $this->command?->warn('Clearing existing career resources...');
        CareerResource::query()->delete();

        Storage::disk('public')->makeDirectory('career-resources');

        foreach ($this->articles() as $i => $article) {
            $slug = Str::slug($article['title']);
            $publishedAt = now()->subDays(($i * 4) + rand(0, 3));

            CareerResource::query()->create([
                'title' => $article['title'],
                'slug' => $slug,
                'excerpt' => $article['excerpt'],
                'body' => $this->body($article),
                'thumbnail_path' => $this->downloadThumbnail($slug, $i),
                'category' => $article['category'],
                'tags' => $article['tags'],
                'author_id' => $author?->id,
                'is_published' => true,
                'published_at' => $publishedAt,
                'views_count' => rand(320, 8600),
                'reading_minutes' => $article['reading_minutes'],
            ]);

            $this->command?->info('  ['.($i + 1).'/15] '.$article['title']);
        }

        $this->command?->info('Career resources seeded.');
    }

    /**
     * Download a clean, work-themed thumbnail and store it on the public disk.
     * Uses hand-picked Picsum (Unsplash) workspace photos — no watermarks —
     * indexed per article, with sensible fallbacks. Returns the path or null.
     */
    private function downloadThumbnail(string $slug, int $index): ?string
    {
        // Curated Picsum photo IDs (desk/laptop/office/people), one per article.
        $ids = [0, 2, 3, 596, 180, 42, 60, 119, 48, 24, 26, 445, 160, 20, 366];
        $id = $ids[$index] ?? null;

        $sources = array_values(array_filter([
            $id !== null ? "https://picsum.photos/id/{$id}/800/450" : null,
            "https://picsum.photos/seed/{$slug}/800/450",
            'https://loremflickr.com/800/450/office,business?lock='.($index + 101),
        ]));

        foreach ($sources as $url) {
            try {
                $response = Http::timeout(20)->retry(2, 500, throw: false)->get($url);
                if ($response->successful() && str_starts_with((string) $response->header('Content-Type'), 'image/')) {
                    $path = "career-resources/{$slug}.jpg";
                    Storage::disk('public')->put($path, $response->body());

                    return $path;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    /**
     * Render an article's HTML body from its intro and sections.
     *
     * @param  array<string, mixed>  $article
     */
    private function body(array $article): string
    {
        $html = '<p>'.$article['intro'].'</p>';

        foreach ($article['sections'] as $section) {
            $html .= '<h2>'.$section['heading'].'</h2>';
            if (! empty($section['paragraph'])) {
                $html .= '<p>'.$section['paragraph'].'</p>';
            }
            if (! empty($section['points'])) {
                $html .= '<ul>';
                foreach ($section['points'] as $point) {
                    $html .= '<li>'.$point.'</li>';
                }
                $html .= '</ul>';
            }
        }

        $html .= '<p>'.$article['closing'].'</p>';

        return $html;
    }

    /**
     * 15 curated career articles.
     *
     * @return list<array<string, mixed>>
     */
    private function articles(): array
    {
        return [
            [
                'title' => '7 Kesalahan Umum dalam Membuat CV dan Cara Menghindarinya',
                'category' => 'CV & Lamaran',
                'keywords' => 'resume,paper',
                'tags' => ['cv', 'lamaran', 'tips'],
                'reading_minutes' => 6,
                'excerpt' => 'CV Anda hanya dilihat rekruter selama 6-8 detik. Hindari 7 kesalahan fatal ini agar tidak langsung masuk tumpukan reject.',
                'intro' => 'Rekruter rata-rata hanya menghabiskan 6-8 detik untuk menyaring sebuah CV. Artinya, kesalahan kecil pun bisa membuat lamaran Anda langsung tersingkir. Berikut kesalahan yang paling sering ditemukan dan cara memperbaikinya.',
                'sections' => [
                    ['heading' => '1. CV terlalu panjang dan bertele-tele', 'paragraph' => 'Idealnya CV untuk fresh graduate cukup satu halaman, dan maksimal dua halaman untuk yang berpengalaman.', 'points' => ['Fokus pada 5-8 tahun pengalaman terakhir', 'Hapus pengalaman yang tidak relevan dengan posisi', 'Gunakan poin, bukan paragraf panjang']],
                    ['heading' => '2. Tidak menyertakan pencapaian terukur', 'paragraph' => 'Rekruter ingin melihat dampak, bukan sekadar daftar tugas.', 'points' => ['Tulis "Meningkatkan penjualan 30%", bukan "Bertanggung jawab atas penjualan"', 'Gunakan angka, persentase, dan hasil konkret']],
                    ['heading' => '3. Typo dan email tidak profesional', 'points' => ['Selalu proofread minimal dua kali', 'Gunakan email seperti nama.belakang@gmail.com', 'Hindari alamat email masa sekolah']],
                ],
                'closing' => 'Perbaiki poin-poin di atas, dan peluang CV Anda dibaca sampai selesai akan meningkat drastis.',
            ],
            [
                'title' => 'Panduan Menulis CV ATS-Friendly agar Lolos Screening Otomatis',
                'category' => 'CV & Lamaran',
                'keywords' => 'laptop,resume',
                'tags' => ['cv', 'ats', 'lamaran'],
                'reading_minutes' => 7,
                'excerpt' => 'Banyak perusahaan besar memakai sistem ATS untuk menyaring CV sebelum sampai ke manusia. Ini cara membuat CV Anda lolos.',
                'intro' => 'Applicant Tracking System (ATS) adalah software yang memindai CV berdasarkan kata kunci. Jika CV Anda tidak "terbaca" oleh mesin, lamaran bisa gugur bahkan sebelum dilihat rekruter.',
                'sections' => [
                    ['heading' => 'Gunakan format yang sederhana', 'points' => ['Hindari tabel, kolom, header/footer, dan gambar', 'Simpan dalam format .docx atau PDF standar', 'Gunakan font umum seperti Arial atau Calibri']],
                    ['heading' => 'Sisipkan kata kunci dari lowongan', 'paragraph' => 'Baca deskripsi pekerjaan, lalu masukkan istilah dan skill yang disebutkan secara alami ke dalam CV.', 'points' => ['Cocokkan job title dan skill utama', 'Tulis singkatan sekaligus kepanjangannya, misal "SEO (Search Engine Optimization)"']],
                    ['heading' => 'Struktur bagian yang jelas', 'points' => ['Gunakan judul standar: Pengalaman, Pendidikan, Keahlian', 'Urutkan pengalaman dari yang terbaru']],
                ],
                'closing' => 'Dengan CV yang ramah ATS, Anda memastikan usaha melamar tidak sia-sia hanya karena masalah teknis.',
            ],
            [
                'title' => 'Cara Menjawab "Ceritakan Tentang Diri Anda" saat Interview',
                'category' => 'Wawancara',
                'keywords' => 'interview,office',
                'tags' => ['wawancara', 'interview', 'tips'],
                'reading_minutes' => 5,
                'excerpt' => 'Pertanyaan pembuka yang terlihat mudah ini sering menjebak. Pelajari formula menjawabnya dengan percaya diri.',
                'intro' => '"Ceritakan tentang diri Anda" hampir selalu jadi pertanyaan pertama. Ini kesempatan emas untuk membingkai kesan pertama, bukan mengulang isi CV.',
                'sections' => [
                    ['heading' => 'Gunakan formula Present-Past-Future', 'points' => ['Present: posisi dan peran Anda saat ini', 'Past: pengalaman relevan yang membangun keahlian', 'Future: mengapa peran ini adalah langkah logis berikutnya']],
                    ['heading' => 'Fokus pada yang relevan', 'paragraph' => 'Sesuaikan cerita dengan kebutuhan posisi yang dilamar. Hindari cerita personal yang tidak berkaitan.'],
                    ['heading' => 'Latih tapi jangan dihafal kaku', 'points' => ['Siapkan poin utama, sampaikan dengan natural', 'Batasi durasi 1,5-2 menit']],
                ],
                'closing' => 'Jawaban yang terstruktur di 2 menit pertama akan menentukan arah keseluruhan interview.',
            ],
            [
                'title' => '10 Pertanyaan Interview Tersulit dan Contoh Jawabannya',
                'category' => 'Wawancara',
                'keywords' => 'meeting,interview',
                'tags' => ['wawancara', 'interview'],
                'reading_minutes' => 8,
                'excerpt' => 'Dari "Apa kelemahan Anda?" sampai "Kenapa resign?", ini cara menjawab pertanyaan jebakan tanpa terdengar klise.',
                'intro' => 'Beberapa pertanyaan interview dirancang untuk menguji kejujuran dan kematangan Anda. Kuncinya adalah jujur, reflektif, dan tetap positif.',
                'sections' => [
                    ['heading' => '"Apa kelemahan terbesar Anda?"', 'paragraph' => 'Sebutkan kelemahan nyata namun tunjukkan usaha memperbaikinya.', 'points' => ['Hindari jawaban klise seperti "saya perfeksionis"', 'Ceritakan langkah konkret yang sudah Anda ambil']],
                    ['heading' => '"Mengapa Anda meninggalkan pekerjaan sebelumnya?"', 'points' => ['Fokus ke masa depan dan pertumbuhan', 'Jangan menjelekkan perusahaan atau atasan lama']],
                    ['heading' => '"Di mana Anda melihat diri Anda 5 tahun ke depan?"', 'points' => ['Tunjukkan ambisi yang selaras dengan jalur karier di perusahaan', 'Hindari jawaban yang terlalu mengambang']],
                ],
                'closing' => 'Persiapan untuk pertanyaan sulit membuat Anda tampil tenang dan meyakinkan.',
            ],
            [
                'title' => 'Persiapan Interview Online: Checklist Sebelum Panggilan Video',
                'category' => 'Wawancara',
                'keywords' => 'videocall,laptop',
                'tags' => ['wawancara', 'online', 'remote'],
                'reading_minutes' => 5,
                'excerpt' => 'Koneksi putus, mikrofon mati, atau latar berantakan bisa merusak interview. Ikuti checklist ini agar tampil profesional.',
                'intro' => 'Interview online menghilangkan risiko terlambat karena macet, tapi menambah tantangan teknis. Persiapan yang matang membuat Anda tampil percaya diri di depan kamera.',
                'sections' => [
                    ['heading' => 'Cek teknis 30 menit sebelumnya', 'points' => ['Uji kamera, mikrofon, dan koneksi internet', 'Siapkan koneksi cadangan (hotspot HP)', 'Login lebih awal 5 menit']],
                    ['heading' => 'Atur latar dan pencahayaan', 'points' => ['Pilih latar rapi dan netral', 'Sumber cahaya dari depan, bukan dari belakang', 'Posisikan kamera sejajar mata']],
                    ['heading' => 'Bahasa tubuh di depan kamera', 'points' => ['Tatap lensa kamera, bukan layar', 'Duduk tegak dan tersenyum secukupnya']],
                ],
                'closing' => 'Dengan persiapan teknis dan lingkungan yang tepat, Anda bisa fokus penuh pada substansi jawaban.',
            ],
            [
                'title' => 'Strategi Negosiasi Gaji untuk Fresh Graduate',
                'category' => 'Gaji & Negosiasi',
                'keywords' => 'money,office',
                'tags' => ['gaji', 'negosiasi', 'fresh-graduate'],
                'reading_minutes' => 6,
                'excerpt' => 'Fresh graduate juga berhak bernegosiasi. Pelajari cara meminta gaji yang layak tanpa terkesan menuntut.',
                'intro' => 'Banyak fresh graduate takut menegosiasikan gaji karena merasa belum berpengalaman. Padahal, negosiasi yang sopan dan berdasar justru menunjukkan kematangan profesional.',
                'sections' => [
                    ['heading' => 'Riset dulu standar pasar', 'points' => ['Cek rentang gaji untuk posisi dan kota Anda', 'Manfaatkan fitur Riset Gaji dan laporan industri', 'Pertimbangkan skala perusahaan']],
                    ['heading' => 'Sampaikan berbasis nilai, bukan kebutuhan', 'paragraph' => 'Kaitkan angka yang Anda minta dengan keahlian, magang, proyek, atau sertifikasi yang relevan.'],
                    ['heading' => 'Lihat kompensasi secara utuh', 'points' => ['Perhitungkan BPJS, bonus, tunjangan, dan peluang belajar', 'Kadang benefit lebih bernilai daripada gaji pokok']],
                ],
                'closing' => 'Negosiasi bukan soal menang, melainkan mencapai kesepakatan yang adil bagi kedua pihak.',
            ],
            [
                'title' => 'Cara Menentukan Ekspektasi Gaji yang Realistis',
                'category' => 'Gaji & Negosiasi',
                'keywords' => 'finance,calculator',
                'tags' => ['gaji', 'karier'],
                'reading_minutes' => 5,
                'excerpt' => 'Terlalu tinggi berisiko gugur, terlalu rendah bikin rugi. Ini cara menghitung angka yang pas.',
                'intro' => 'Menentukan ekspektasi gaji adalah keseimbangan antara menghargai diri sendiri dan tetap realistis terhadap pasar. Berikut kerangka sederhana untuk menghitungnya.',
                'sections' => [
                    ['heading' => 'Kumpulkan data pembanding', 'points' => ['Bandingkan minimal 3 sumber data gaji', 'Sesuaikan dengan level pengalaman dan lokasi']],
                    ['heading' => 'Hitung kebutuhan minimum Anda', 'paragraph' => 'Ketahui angka terendah yang masih masuk akal untuk kondisi finansial Anda, lalu tetapkan rentang di atasnya.'],
                    ['heading' => 'Siapkan rentang, bukan angka pasti', 'points' => ['Berikan rentang dengan batas bawah yang tetap layak', 'Jelaskan dasar perhitungan bila ditanya']],
                ],
                'closing' => 'Angka yang berdasar data akan membuat Anda tampil percaya diri saat ditanya soal gaji.',
            ],
            [
                'title' => 'Membangun Personal Branding di LinkedIn dari Nol',
                'category' => 'Networking',
                'keywords' => 'networking,office',
                'tags' => ['linkedin', 'branding', 'networking'],
                'reading_minutes' => 7,
                'excerpt' => 'Profil LinkedIn yang kuat bisa membuat rekruter datang kepada Anda. Ini langkah membangunnya.',
                'intro' => 'LinkedIn adalah etalase profesional Anda di dunia digital. Profil yang dioptimalkan membuka pintu peluang yang tidak pernah Anda lamar secara langsung.',
                'sections' => [
                    ['heading' => 'Optimalkan bagian utama profil', 'points' => ['Gunakan foto profil profesional', 'Tulis headline yang menjelaskan value Anda', 'Isi ringkasan (About) dengan narasi yang jelas']],
                    ['heading' => 'Bangun kredibilitas', 'points' => ['Minta rekomendasi dari rekan atau atasan', 'Cantumkan pencapaian, bukan sekadar jabatan']],
                    ['heading' => 'Aktif dan konsisten', 'paragraph' => 'Bagikan wawasan, komentari topik di bidang Anda, dan bangun jaringan secara bertahap.'],
                ],
                'closing' => 'Personal branding dibangun konsisten dari waktu ke waktu, bukan dalam semalam.',
            ],
            [
                'title' => 'Tips Networking untuk Introvert yang Anti Basa-basi',
                'category' => 'Networking',
                'keywords' => 'conference,people',
                'tags' => ['networking', 'karier'],
                'reading_minutes' => 5,
                'excerpt' => 'Networking tidak harus berarti sok akrab. Introvert punya kekuatan tersendiri untuk membangun koneksi bermakna.',
                'intro' => 'Bagi banyak introvert, kata "networking" terdengar melelahkan. Namun networking yang efektif justru soal kualitas, bukan kuantitas, dan di sinilah introvert unggul.',
                'sections' => [
                    ['heading' => 'Fokus pada koneksi 1-on-1', 'points' => ['Percakapan mendalam lebih berkesan daripada basa-basi massal', 'Ajukan pertanyaan dan jadilah pendengar yang baik']],
                    ['heading' => 'Manfaatkan kekuatan online', 'paragraph' => 'Membangun relasi lewat pesan dan komentar yang bermakna terasa lebih nyaman dan tetap efektif.'],
                    ['heading' => 'Rawat relasi yang sudah ada', 'points' => ['Follow up setelah berkenalan', 'Beri bantuan sebelum meminta bantuan']],
                ],
                'closing' => 'Anda tidak perlu mengubah kepribadian untuk membangun jaringan yang kuat.',
            ],
            [
                'title' => 'Panduan Career Switch: Pindah Jalur Karier tanpa Mulai dari Nol',
                'category' => 'Pengembangan Karier',
                'keywords' => 'career,path',
                'tags' => ['karier', 'career-switch'],
                'reading_minutes' => 8,
                'excerpt' => 'Ingin banting setir ke bidang baru? Anda tidak selalu harus mulai dari bawah. Ini strateginya.',
                'intro' => 'Berpindah karier terasa menakutkan, tapi keterampilan Anda sebelumnya sering kali lebih berharga daripada yang Anda kira. Kuncinya adalah memindahkan (transfer) keahlian, bukan membuangnya.',
                'sections' => [
                    ['heading' => 'Identifikasi transferable skills', 'points' => ['Komunikasi, manajemen proyek, dan analisis berlaku lintas industri', 'Petakan skill lama ke kebutuhan bidang baru']],
                    ['heading' => 'Isi kesenjangan keahlian', 'points' => ['Ikuti kursus atau sertifikasi yang diakui', 'Bangun portofolio lewat proyek kecil']],
                    ['heading' => 'Ceritakan narasi transisi Anda', 'paragraph' => 'Susun cerita yang menjelaskan mengapa perpindahan ini masuk akal dan apa yang Anda bawa dari pengalaman sebelumnya.'],
                ],
                'closing' => 'Career switch yang direncanakan matang bisa jadi lompatan terbaik dalam karier Anda.',
            ],
            [
                'title' => 'Skill yang Paling Dicari Perusahaan di Tahun 2026',
                'category' => 'Pengembangan Karier',
                'keywords' => 'technology,office',
                'tags' => ['skill', 'karier', 'tren'],
                'reading_minutes' => 6,
                'excerpt' => 'Dunia kerja berubah cepat. Ini kombinasi hard skill dan soft skill yang paling dibutuhkan tahun ini.',
                'intro' => 'Perusahaan tidak hanya mencari keahlian teknis, tetapi juga kemampuan beradaptasi. Berikut skill yang permintaannya melonjak dan layak Anda kuasai.',
                'sections' => [
                    ['heading' => 'Hard skill yang naik daun', 'points' => ['Literasi data dan analitik', 'Pemahaman dasar AI dan otomasi', 'Digital marketing dan manajemen produk']],
                    ['heading' => 'Soft skill yang tak tergantikan', 'points' => ['Adaptabilitas dan pembelajaran cepat', 'Komunikasi lintas tim', 'Berpikir kritis dan problem solving']],
                    ['heading' => 'Cara mulai mengembangkannya', 'paragraph' => 'Pilih satu skill prioritas, tetapkan target belajar mingguan, dan praktikkan lewat proyek nyata.'],
                ],
                'closing' => 'Investasi pada skill yang tepat hari ini adalah jaminan relevansi Anda di masa depan.',
            ],
            [
                'title' => 'Cara Produktif Bekerja dari Rumah (WFH) tanpa Kehilangan Fokus',
                'category' => 'Kerja Remote',
                'keywords' => 'homeoffice,laptop',
                'tags' => ['remote', 'wfh', 'produktivitas'],
                'reading_minutes' => 6,
                'excerpt' => 'Bekerja dari rumah menawarkan kebebasan, tapi juga godaan distraksi. Ini cara tetap produktif.',
                'intro' => 'WFH bisa meningkatkan produktivitas atau justru menurunkannya, tergantung bagaimana Anda mengaturnya. Rutinitas dan batasan yang jelas adalah kuncinya.',
                'sections' => [
                    ['heading' => 'Bangun rutinitas yang konsisten', 'points' => ['Mulai dan akhiri kerja di jam yang tetap', 'Berpakaian seolah akan ke kantor', 'Buat ritual "berangkat" dan "pulang" kerja']],
                    ['heading' => 'Siapkan ruang kerja khusus', 'points' => ['Pisahkan area kerja dari area istirahat', 'Jauhkan gangguan seperti TV atau tumpukan tugas rumah']],
                    ['heading' => 'Kelola waktu dengan teknik terbukti', 'paragraph' => 'Coba teknik Pomodoro atau time-blocking untuk menjaga fokus dan mencegah kelelahan.'],
                ],
                'closing' => 'Dengan sistem yang tepat, WFH bisa menjadi cara kerja paling produktif bagi Anda.',
            ],
            [
                'title' => 'Mengelola Work-Life Balance agar Tidak Burnout',
                'category' => 'Produktivitas',
                'keywords' => 'coffee,relax',
                'tags' => ['produktivitas', 'kesehatan', 'karier'],
                'reading_minutes' => 5,
                'excerpt' => 'Ambisi karier penting, tapi jangan sampai mengorbankan kesehatan. Kenali tanda burnout dan cara mencegahnya.',
                'intro' => 'Burnout bukan sekadar lelah biasa, melainkan kelelahan kronis yang menurunkan kualitas hidup dan kinerja. Mengenalinya sejak dini adalah langkah pencegahan terbaik.',
                'sections' => [
                    ['heading' => 'Kenali tanda-tanda awal', 'points' => ['Kelelahan yang tidak hilang meski sudah istirahat', 'Kehilangan motivasi dan mudah tersinggung', 'Produktivitas menurun drastis']],
                    ['heading' => 'Tetapkan batasan yang sehat', 'points' => ['Belajar mengatakan "tidak" pada beban berlebih', 'Matikan notifikasi kerja di luar jam kantor']],
                    ['heading' => 'Isi ulang energi secara rutin', 'paragraph' => 'Sisihkan waktu untuk hobi, olahraga, dan hubungan sosial yang menyegarkan.'],
                ],
                'closing' => 'Karier adalah maraton, bukan sprint. Menjaga diri adalah bagian dari profesionalisme.',
            ],
            [
                'title' => 'Panduan Lengkap untuk Fresh Graduate Mencari Kerja Pertama',
                'category' => 'Fresh Graduate',
                'keywords' => 'graduation,student',
                'tags' => ['fresh-graduate', 'karier', 'lamaran'],
                'reading_minutes' => 8,
                'excerpt' => 'Baru lulus dan bingung mulai dari mana? Ikuti langkah demi langkah mencari pekerjaan pertama Anda.',
                'intro' => 'Transisi dari kampus ke dunia kerja bisa membingungkan. Dengan strategi yang jelas, pencarian kerja pertama Anda bisa jauh lebih terarah dan tidak melelahkan.',
                'sections' => [
                    ['heading' => 'Benahi fondasi lamaran', 'points' => ['Buat CV satu halaman yang rapi', 'Optimalkan profil LinkedIn', 'Siapkan portofolio bila relevan']],
                    ['heading' => 'Lamar dengan strategi', 'points' => ['Pilih posisi entry-level dan management trainee', 'Sesuaikan lamaran untuk tiap perusahaan', 'Manfaatkan job alert agar tidak ketinggalan']],
                    ['heading' => 'Bangun pengalaman sejak dini', 'paragraph' => 'Magang, proyek freelance, atau kegiatan organisasi bisa menjadi pembeda saat pengalaman kerja masih minim.'],
                ],
                'closing' => 'Pekerjaan pertama bukan tujuan akhir, melainkan awal dari perjalanan karier Anda.',
            ],
            [
                'title' => 'Cara Membuat Portofolio yang Menarik untuk Non-Designer',
                'category' => 'CV & Lamaran',
                'keywords' => 'portfolio,desk',
                'tags' => ['portofolio', 'lamaran', 'tips'],
                'reading_minutes' => 6,
                'excerpt' => 'Portofolio bukan hanya milik desainer. Marketer, penulis, hingga analis pun bisa membuatnya menonjol.',
                'intro' => 'Portofolio adalah bukti nyata kemampuan Anda, jauh lebih meyakinkan daripada klaim di CV. Dan Anda tidak perlu jadi desainer untuk membuatnya rapi dan profesional.',
                'sections' => [
                    ['heading' => 'Pilih karya terbaik, bukan terbanyak', 'points' => ['Tampilkan 4-6 proyek paling relevan', 'Utamakan kualitas dan hasil, bukan jumlah']],
                    ['heading' => 'Ceritakan proses dan dampak', 'points' => ['Jelaskan masalah, peran Anda, dan hasilnya', 'Sertakan angka atau testimoni bila ada']],
                    ['heading' => 'Gunakan alat yang sederhana', 'paragraph' => 'Anda bisa memakai template gratis, Notion, atau situs portofolio siap pakai tanpa perlu skill desain.'],
                ],
                'closing' => 'Portofolio yang tertata membuat Anda selangkah lebih unggul dari kandidat lain.',
            ],
        ];
    }
}
