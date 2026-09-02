<?php

namespace Database\Seeders;

use App\Models\AssessmentQuestion;
use App\Models\Skill;
use Illuminate\Database\Seeder;

/**
 * Seeds a starter set of skill-assessment questions so "Tes Skill" is
 * actually usable. Every skill needs at least 5 active questions
 * (SkillAssessmentService::QUESTIONS_PER_ASSESSMENT) or a candidate can never
 * start an assessment for it — this covers the skills most commonly required
 * by job posts / listed on candidate profiles first. Idempotent: skips any
 * skill that already has questions, so re-running never duplicates.
 */
class AssessmentQuestionSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->dataset() as $skillName => $questions) {
            $skill = Skill::query()->where('name', $skillName)->first();

            if (! $skill || AssessmentQuestion::query()->where('skill_id', $skill->id)->exists()) {
                continue;
            }

            foreach ($questions as $question) {
                AssessmentQuestion::query()->create([
                    'skill_id' => $skill->id,
                    'type' => 'multiple_choice',
                    'question' => $question['question'],
                    'options' => $question['options'],
                    'correct_answer' => ['value' => $question['answer']],
                    'difficulty' => $question['difficulty'],
                    'time_limit_seconds' => 60,
                    'is_active' => true,
                ]);
            }
        }
    }

    /**
     * @return array<string, array<int, array{question: string, options: array<int, string>, answer: string, difficulty: string}>>
     */
    private function dataset(): array
    {
        return [
            'Adaptabilitas' => [
                [
                    'question' => 'Tim Anda tiba-tiba pindah dari tools lama ke sistem baru minggu depan. Respons paling adaptif adalah...',
                    'options' => ['Menolak sampai alasan perubahan dijelaskan tuntas', 'Mempelajari sistem baru sambil tetap produktif dengan cara lama', 'Menunggu rekan lain mahir dulu baru ikut belajar', 'Mengeluh ke atasan agar perubahan dibatalkan'],
                    'answer' => 'Mempelajari sistem baru sambil tetap produktif dengan cara lama',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Tanda seseorang punya adaptabilitas tinggi di tempat kerja adalah...',
                    'options' => ['Selalu ingin semua proses tetap sama', 'Cepat menyesuaikan cara kerja saat prioritas berubah', 'Menghindari tugas di luar deskripsi kerja', 'Butuh waktu lama untuk menerima ide baru'],
                    'answer' => 'Cepat menyesuaikan cara kerja saat prioritas berubah',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Proyek yang Anda kerjakan berubah scope drastis di tengah jalan karena permintaan klien. Langkah pertama yang tepat adalah...',
                    'options' => ['Melanjutkan rencana lama agar tidak buang waktu', 'Memahami perubahan kebutuhan lalu menyesuaikan rencana kerja', 'Menolak perubahan karena sudah disepakati di awal', 'Berhenti bekerja sampai ada instruksi baru tertulis'],
                    'answer' => 'Memahami perubahan kebutuhan lalu menyesuaikan rencana kerja',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Perusahaan Anda mengubah struktur tim sehingga Anda kini melapor ke atasan baru dengan gaya kerja berbeda. Sikap paling adaptif adalah...',
                    'options' => ['Membandingkan terus-menerus dengan atasan lama', 'Mengamati gaya kerja atasan baru dan menyesuaikan cara komunikasi', 'Meminta pindah tim secepatnya', 'Bekerja seperti biasa tanpa memperhatikan preferensi atasan baru'],
                    'answer' => 'Mengamati gaya kerja atasan baru dan menyesuaikan cara komunikasi',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Industri tempat Anda bekerja terdisrupsi teknologi baru dan sebagian skill Anda mulai usang. Strategi paling adaptif jangka panjang adalah...',
                    'options' => ['Bertahan di skill lama karena sudah paling dikuasai', 'Terus belajar skill baru yang relevan sambil transfer pengalaman lama', 'Menunggu perusahaan menyediakan training tanpa inisiatif sendiri', 'Pindah industri sepenuhnya tanpa evaluasi lebih dulu'],
                    'answer' => 'Terus belajar skill baru yang relevan sambil transfer pengalaman lama',
                    'difficulty' => 'hard',
                ],
            ],

            'Kerja Sama Tim (Teamwork)' => [
                [
                    'question' => 'Contoh kerja sama tim yang baik adalah...',
                    'options' => ['Menyelesaikan tugas sendiri tanpa koordinasi', 'Saling membantu dan berbagi informasi demi tujuan bersama', 'Menunggu instruksi detail untuk setiap langkah', 'Bersaing dengan rekan agar terlihat paling menonjol'],
                    'answer' => 'Saling membantu dan berbagi informasi demi tujuan bersama',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Saat rekan satu tim kewalahan mendekati deadline, sikap yang mencerminkan teamwork adalah...',
                    'options' => ['Fokus hanya pada tugas sendiri karena bukan tanggung jawab Anda', 'Menawarkan bantuan atau berbagi beban kerja jika memungkinkan', 'Melaporkan ke atasan tanpa menawarkan solusi', 'Mengabaikan karena bukan urusan Anda'],
                    'answer' => 'Menawarkan bantuan atau berbagi beban kerja jika memungkinkan',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Dua rekan satu tim berbeda pendapat soal pendekatan proyek. Cara terbaik menjaga kerja sama tim adalah...',
                    'options' => ['Memaksakan pendapat sendiri agar cepat selesai', 'Mendiskusikan kelebihan-kekurangan tiap opsi lalu sepakati bersama', 'Membiarkan konflik berlarut tanpa dibahas', 'Melapor ke atasan tanpa mencoba diskusi dulu'],
                    'answer' => 'Mendiskusikan kelebihan-kekurangan tiap opsi lalu sepakati bersama',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Anda menyadari rencana tim akan gagal memenuhi target karena satu asumsi keliru. Tindakan paling tepat adalah...',
                    'options' => ['Diam saja karena bukan bagian tugas Anda', 'Menyampaikan temuan ke tim secepatnya agar bisa diantisipasi bersama', 'Menunggu rencana gagal dulu baru bicara', 'Memperbaiki sendiri diam-diam tanpa memberi tahu tim'],
                    'answer' => 'Menyampaikan temuan ke tim secepatnya agar bisa diantisipasi bersama',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Dalam tim lintas divisi dengan prioritas berbeda-beda, cara paling efektif menjaga kerja sama adalah...',
                    'options' => ['Memaksakan prioritas divisi sendiri ke semua pihak', 'Menyelaraskan tujuan bersama lalu bernegosiasi soal prioritas masing-masing', 'Bekerja terpisah tanpa koordinasi lintas divisi', 'Menghindari rapat lintas divisi agar tidak ada gesekan'],
                    'answer' => 'Menyelaraskan tujuan bersama lalu bernegosiasi soal prioritas masing-masing',
                    'difficulty' => 'hard',
                ],
            ],

            'Komunikasi Lisan' => [
                [
                    'question' => 'Saat presentasi ke atasan, cara komunikasi lisan yang efektif adalah...',
                    'options' => ['Berbicara secepat mungkin agar tidak menyita waktu', 'Menyampaikan poin utama dengan jelas dan runtut', 'Menghindari kontak mata agar tidak gugup', 'Membaca slide kata per kata tanpa jeda'],
                    'answer' => 'Menyampaikan poin utama dengan jelas dan runtut',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Lawan bicara terlihat bingung dengan penjelasan Anda. Respons komunikasi lisan yang tepat adalah...',
                    'options' => ['Melanjutkan tanpa memeriksa pemahamannya', 'Bertanya bagian mana yang kurang jelas lalu menjelaskan ulang dengan cara berbeda', 'Berbicara lebih cepat agar cepat selesai', 'Mengabaikan ekspresi bingungnya'],
                    'answer' => 'Bertanya bagian mana yang kurang jelas lalu menjelaskan ulang dengan cara berbeda',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Saat menyampaikan kabar kurang menyenangkan ke klien secara lisan, pendekatan paling tepat adalah...',
                    'options' => ['Menyampaikan fakta dengan jelas, empati, dan solusi ke depan', 'Menunda menyampaikannya selama mungkin', 'Menyalahkan pihak lain agar terlihat bukan kesalahan Anda', 'Menyampaikan lewat pesan singkat tanpa penjelasan'],
                    'answer' => 'Menyampaikan fakta dengan jelas, empati, dan solusi ke depan',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Dalam rapat dengan banyak peserta yang saling menyela, cara menjaga komunikasi lisan tetap efektif adalah...',
                    'options' => ['Ikut menyela agar pendapat Anda terdengar', 'Menunggu giliran lalu menyampaikan poin secara ringkas dan terstruktur', 'Diam sepenuhnya sampai rapat selesai', 'Berbicara lebih keras dari yang lain'],
                    'answer' => 'Menunggu giliran lalu menyampaikan poin secara ringkas dan terstruktur',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Anda harus menyampaikan ide teknis kompleks ke audiens non-teknis secara lisan. Pendekatan paling efektif adalah...',
                    'options' => ['Menggunakan istilah teknis lengkap agar terlihat kredibel', 'Menerjemahkan ide ke analogi dan bahasa yang familiar bagi audiens', 'Mempercepat penjelasan agar audiens tidak sempat bertanya', 'Membiarkan audiens mencari tahu sendiri istilahnya'],
                    'answer' => 'Menerjemahkan ide ke analogi dan bahasa yang familiar bagi audiens',
                    'difficulty' => 'hard',
                ],
            ],

            'Disiplin' => [
                [
                    'question' => 'Contoh sikap disiplin kerja yang baik adalah...',
                    'options' => ['Datang dan menyelesaikan tugas sesuai waktu yang disepakati', 'Mengerjakan tugas kapan pun sesuai mood', 'Menunda pekerjaan sampai mendekati deadline', 'Mengikuti aturan hanya saat diawasi atasan'],
                    'answer' => 'Datang dan menyelesaikan tugas sesuai waktu yang disepakati',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Anda berkomitmen mengumpulkan laporan tiap Jumat. Sikap disiplin berarti...',
                    'options' => ['Mengumpulkan tepat waktu meski tidak ada yang menagih', 'Mengumpulkan hanya saat diingatkan atasan', 'Mengumpulkan kapan saja asal dalam seminggu', 'Melewatkannya jika sedang sibuk'],
                    'answer' => 'Mengumpulkan tepat waktu meski tidak ada yang menagih',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Anda merasa lelah dan malas mengerjakan tugas rutin harian. Sikap disiplin yang tepat adalah...',
                    'options' => ['Melewatkan tugas hari itu karena kondisi kurang fit', 'Tetap menyelesaikan sesuai standar meski tidak sedang bersemangat', 'Mengerjakan asal-asalan agar cepat selesai', 'Menunda ke hari lain tanpa memberi tahu siapa pun'],
                    'answer' => 'Tetap menyelesaikan sesuai standar meski tidak sedang bersemangat',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Rekan kerja mengajak Anda melanggar prosedur demi mempercepat proses. Sikap disiplin yang tepat adalah...',
                    'options' => ['Ikut karena ingin dianggap kooperatif', 'Menolak dan tetap mengikuti prosedur yang berlaku', 'Melapor tanpa menjelaskan alasan menolak', 'Mengikuti asal tidak ketahuan atasan'],
                    'answer' => 'Menolak dan tetap mengikuti prosedur yang berlaku',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Sebagai atasan, cara membangun budaya disiplin di tim tanpa membuat suasana kaku adalah...',
                    'options' => ['Menghukum keras setiap keterlambatan kecil', 'Menetapkan standar jelas, konsisten menegakkannya, dan memberi contoh langsung', 'Membiarkan setiap orang menentukan standarnya sendiri', 'Hanya menegur di depan umum agar jadi contoh'],
                    'answer' => 'Menetapkan standar jelas, konsisten menegakkannya, dan memberi contoh langsung',
                    'difficulty' => 'hard',
                ],
            ],

            'Manajemen Waktu' => [
                [
                    'question' => 'Langkah pertama manajemen waktu yang baik saat menerima banyak tugas adalah...',
                    'options' => ['Mengerjakan tugas yang paling mudah dulu', 'Membuat daftar tugas dan menentukan prioritas', 'Mengerjakan semuanya bersamaan', 'Menunggu diingatkan atasan tugas mana dulu'],
                    'answer' => 'Membuat daftar tugas dan menentukan prioritas',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Teknik yang umum dipakai untuk mengelola waktu kerja dengan sesi fokus dan jeda singkat disebut...',
                    'options' => ['Teknik Pomodoro', 'Metode SWOT', 'Analisis Pareto', 'Brainstorming'],
                    'answer' => 'Teknik Pomodoro',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Anda punya 5 tugas dengan deadline sama hari ini. Cara mengelola waktu paling tepat adalah...',
                    'options' => ['Mengerjakan sesuai urutan diterima', 'Mengevaluasi dampak dan urgensi tiap tugas lalu kerjakan yang paling kritis dulu', 'Meminta perpanjangan semua deadline sekaligus', 'Mengerjakan tugas favorit dulu'],
                    'answer' => 'Mengevaluasi dampak dan urgensi tiap tugas lalu kerjakan yang paling kritis dulu',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Rapat rutin mingguan sering molor dan menyita waktu kerja Anda. Langkah manajemen waktu yang tepat adalah...',
                    'options' => ['Tetap hadir penuh tanpa mengusulkan perubahan', 'Mengusulkan agenda dan batas waktu jelas agar rapat lebih efisien', 'Berhenti menghadiri rapat sama sekali', 'Mengerjakan tugas lain sambil rapat berlangsung'],
                    'answer' => 'Mengusulkan agenda dan batas waktu jelas agar rapat lebih efisien',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Matriks yang membagi tugas berdasarkan penting/tidak penting dan mendesak/tidak mendesak untuk membantu prioritas dikenal sebagai...',
                    'options' => ['Matriks Eisenhower', 'Matriks BCG', 'Diagram Fishbone', 'Analisis SWOT'],
                    'answer' => 'Matriks Eisenhower',
                    'difficulty' => 'hard',
                ],
            ],

            'Time Management' => [
                [
                    'question' => 'Manfaat utama membuat to-do list harian adalah...',
                    'options' => ['Membuat pekerjaan terlihat lebih banyak', 'Membantu fokus dan memastikan tugas penting tidak terlewat', 'Menghabiskan waktu untuk hal administratif', 'Mengurangi tanggung jawab pekerjaan'],
                    'answer' => 'Membantu fokus dan memastikan tugas penting tidak terlewat',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Aktivitas yang menyita waktu tanpa memberi nilai tambah pada pekerjaan disebut...',
                    'options' => ['Time waster / pemborosan waktu', 'Deep work', 'Milestone', 'Deliverable'],
                    'answer' => 'Time waster / pemborosan waktu',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Anda sering terganggu notifikasi saat mengerjakan tugas penting. Strategi time management yang tepat adalah...',
                    'options' => ['Membiarkan semua notifikasi menyala agar tidak ketinggalan info', 'Menonaktifkan notifikasi selama sesi fokus dan mengecek berkala', 'Mengerjakan tugas sambil terus membalas semua notifikasi', 'Berhenti bekerja setiap kali ada notifikasi masuk'],
                    'answer' => 'Menonaktifkan notifikasi selama sesi fokus dan mengecek berkala',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Estimasi waktu Anda untuk tugas rutin sering meleset jauh dari kenyataan. Cara memperbaikinya adalah...',
                    'options' => ['Tidak perlu estimasi, kerjakan saja', 'Mencatat waktu aktual yang terpakai lalu gunakan sebagai acuan estimasi berikutnya', 'Selalu menambah estimasi dua kali lipat tanpa data', 'Meminta orang lain yang menentukan estimasi'],
                    'answer' => 'Mencatat waktu aktual yang terpakai lalu gunakan sebagai acuan estimasi berikutnya',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Prinsip yang menyatakan sekitar 80% hasil berasal dari 20% aktivitas paling berpengaruh dikenal sebagai...',
                    'options' => ['Prinsip Pareto', 'Hukum Parkinson', 'Teknik Pomodoro', 'Prinsip Peter'],
                    'answer' => 'Prinsip Pareto',
                    'difficulty' => 'hard',
                ],
            ],

            'Active Listening' => [
                [
                    'question' => 'Contoh perilaku active listening saat rekan kerja berbicara adalah...',
                    'options' => ['Memikirkan jawaban sendiri sambil ia bicara', 'Memberi perhatian penuh dan merespons sesuai isi pembicaraannya', 'Menyela untuk mempercepat pembicaraan', 'Melihat ponsel sambil sesekali mengangguk'],
                    'answer' => 'Memberi perhatian penuh dan merespons sesuai isi pembicaraannya',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Salah satu teknik active listening adalah merangkum ulang apa yang baru saja disampaikan lawan bicara. Teknik ini disebut...',
                    'options' => ['Parafrase / paraphrasing', 'Interupsi', 'Asumsi', 'Generalisasi'],
                    'answer' => 'Parafrase / paraphrasing',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Klien menyampaikan keluhan panjang dengan nada emosional. Respons active listening yang tepat adalah...',
                    'options' => ['Langsung membela diri sebelum ia selesai bicara', 'Mendengarkan sampai selesai, akui perasaannya, lalu klarifikasi inti masalah', 'Memotong pembicaraan untuk memberi solusi cepat', 'Mengalihkan topik ke hal lain'],
                    'answer' => 'Mendengarkan sampai selesai, akui perasaannya, lalu klarifikasi inti masalah',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Anda tidak yakin memahami maksud instruksi atasan dengan tepat. Sikap active listening yang benar adalah...',
                    'options' => ['Mengangguk saja agar terlihat paham', 'Bertanya klarifikasi atau mengulang pemahaman Anda untuk dikonfirmasi', 'Mengerjakan sesuai tebakan sendiri', 'Bertanya ke rekan lain tanpa konfirmasi ke atasan'],
                    'answer' => 'Bertanya klarifikasi atau mengulang pemahaman Anda untuk dikonfirmasi',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Dalam negosiasi alot, active listening membantu karena...',
                    'options' => ['Membuat lawan bicara berbicara lebih lama sehingga membuang waktu', 'Mengungkap kepentingan sebenarnya di balik posisi yang disampaikan lawan bicara', 'Tidak berpengaruh terhadap hasil negosiasi', 'Hanya berguna untuk terlihat sopan'],
                    'answer' => 'Mengungkap kepentingan sebenarnya di balik posisi yang disampaikan lawan bicara',
                    'difficulty' => 'hard',
                ],
            ],

            'Pemecahan Masalah (Problem Solving)' => [
                [
                    'question' => 'Langkah pertama dalam proses pemecahan masalah yang baik adalah...',
                    'options' => ['Langsung mencari solusi tercepat', 'Mendefinisikan dan memahami akar masalah dengan jelas', 'Menyalahkan pihak yang dianggap bertanggung jawab', 'Mengabaikan masalah sampai hilang sendiri'],
                    'answer' => 'Mendefinisikan dan memahami akar masalah dengan jelas',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Teknik "5 Why" dalam pemecahan masalah digunakan untuk...',
                    'options' => ['Menemukan akar penyebab masalah dengan bertanya "mengapa" berulang kali', 'Menentukan anggaran proyek', 'Membuat jadwal kerja', 'Menilai kinerja karyawan'],
                    'answer' => 'Menemukan akar penyebab masalah dengan bertanya "mengapa" berulang kali',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Sistem produksi tiba-tiba error dan menghambat operasional. Pendekatan pemecahan masalah yang tepat adalah...',
                    'options' => ['Menunggu error hilang sendiri', 'Mengidentifikasi penyebab, mencari solusi sementara, lalu perbaikan permanen', 'Mematikan seluruh sistem tanpa investigasi', 'Menyalahkan tim IT tanpa mencari solusi'],
                    'answer' => 'Mengidentifikasi penyebab, mencari solusi sementara, lalu perbaikan permanen',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Saat menghadapi masalah dengan banyak kemungkinan penyebab, langkah yang efektif adalah...',
                    'options' => ['Memperbaiki semua kemungkinan sekaligus tanpa data', 'Mengumpulkan data untuk mempersempit penyebab paling mungkin sebelum bertindak', 'Memilih penyebab yang paling mudah diperbaiki meski belum tentu akar masalah', 'Mengabaikan data dan mengandalkan asumsi'],
                    'answer' => 'Mengumpulkan data untuk mempersempit penyebab paling mungkin sebelum bertindak',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Diagram tulang ikan (fishbone diagram) dalam pemecahan masalah digunakan untuk...',
                    'options' => ['Memvisualisasikan berbagai kategori penyebab suatu masalah', 'Menjadwalkan proyek secara linear', 'Menghitung anggaran biaya', 'Mengukur kepuasan pelanggan'],
                    'answer' => 'Memvisualisasikan berbagai kategori penyebab suatu masalah',
                    'difficulty' => 'hard',
                ],
            ],

            'Microsoft Office' => [
                [
                    'question' => 'Aplikasi Microsoft Office yang paling umum dipakai untuk mengolah data dalam bentuk tabel dan rumus adalah...',
                    'options' => ['Excel', 'Word', 'PowerPoint', 'Outlook'],
                    'answer' => 'Excel',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Fungsi Excel untuk menjumlahkan angka dalam suatu rentang sel adalah...',
                    'options' => ['=SUM()', '=COUNT()', '=AVERAGE()', '=MAX()'],
                    'answer' => '=SUM()',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Untuk mencari nilai dari tabel lain berdasarkan kata kunci tertentu di Excel, fungsi yang umum dipakai adalah...',
                    'options' => ['VLOOKUP', 'PRINT', 'SAVE', 'CTRL+C'],
                    'answer' => 'VLOOKUP',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Fitur PowerPoint untuk menampilkan catatan tambahan bagi presenter tanpa terlihat audiens disebut...',
                    'options' => ['Speaker Notes', 'Slide Master', 'Transition', 'Animation Pane'],
                    'answer' => 'Speaker Notes',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Untuk membuat surat massal ke banyak penerima dengan data nama/alamat berbeda di Word, fitur yang digunakan adalah...',
                    'options' => ['Mail Merge', 'Track Changes', 'Table of Contents', 'Footnote'],
                    'answer' => 'Mail Merge',
                    'difficulty' => 'hard',
                ],
            ],

            'Komunikasi Tulisan' => [
                [
                    'question' => 'Ciri email profesional yang baik adalah...',
                    'options' => ['Subjek jelas, bahasa sopan, dan poin tersampaikan ringkas', 'Menggunakan huruf kapital semua agar tegas', 'Tanpa salam pembuka atau penutup', 'Sepanjang mungkin agar terlihat lengkap'],
                    'answer' => 'Subjek jelas, bahasa sopan, dan poin tersampaikan ringkas',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Saat menulis laporan kerja, struktur yang membantu pembaca memahami dengan cepat adalah...',
                    'options' => ['Menulis satu paragraf panjang tanpa poin', 'Menggunakan judul, poin-poin, dan kesimpulan yang jelas', 'Menghindari data pendukung agar ringkas', 'Menulis tanpa urutan tertentu'],
                    'answer' => 'Menggunakan judul, poin-poin, dan kesimpulan yang jelas',
                    'difficulty' => 'easy',
                ],
                [
                    'question' => 'Anda harus menyampaikan kritik lewat pesan tertulis ke rekan kerja. Cara yang tepat adalah...',
                    'options' => ['Menulis dengan nada menyalahkan agar pesan tegas', 'Fokus pada fakta dan dampak, gunakan bahasa yang membangun', 'Menghindari menulisnya dan biarkan masalah berlalu', 'Mengirim ke banyak orang sekaligus agar ia malu'],
                    'answer' => 'Fokus pada fakta dan dampak, gunakan bahasa yang membangun',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Pesan tertulis ke klien perlu disesuaikan formalitasnya. Faktor utama yang menentukan tingkat formalitas adalah...',
                    'options' => ['Panjang pesan yang dikirim', 'Hubungan dan konteks komunikasi dengan penerima', 'Waktu pengiriman pesan', 'Jumlah emoji yang digunakan'],
                    'answer' => 'Hubungan dan konteks komunikasi dengan penerima',
                    'difficulty' => 'medium',
                ],
                [
                    'question' => 'Teknik piramida terbalik dalam menulis (inti informasi di awal, detail belakangan) paling berguna untuk...',
                    'options' => ['Menulis puisi', 'Memastikan pembaca sibuk cepat menangkap poin utama', 'Menyembunyikan informasi penting', 'Memperpanjang tulisan'],
                    'answer' => 'Memastikan pembaca sibuk cepat menangkap poin utama',
                    'difficulty' => 'hard',
                ],
            ],
        ];
    }
}
