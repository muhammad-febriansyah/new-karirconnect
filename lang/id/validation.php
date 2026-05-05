<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Baris Bahasa untuk Validasi
    |--------------------------------------------------------------------------
    |
    | Baris berikut berisi pesan kesalahan default yang digunakan oleh kelas
    | validator. Beberapa aturan memiliki versi ganda seperti aturan ukuran.
    | Anda bebas menyesuaikan setiap pesan ini sesuai kebutuhan aplikasi.
    |
    */

    'accepted' => 'Kolom :attribute wajib disetujui.',
    'accepted_if' => 'Kolom :attribute wajib disetujui ketika :other bernilai :value.',
    'active_url' => 'Kolom :attribute harus berupa URL yang valid.',
    'after' => 'Kolom :attribute harus berisi tanggal setelah :date.',
    'after_or_equal' => 'Kolom :attribute harus berisi tanggal setelah atau sama dengan :date.',
    'alpha' => 'Kolom :attribute hanya boleh berisi huruf.',
    'alpha_dash' => 'Kolom :attribute hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.',
    'alpha_num' => 'Kolom :attribute hanya boleh berisi huruf dan angka.',
    'any_of' => 'Kolom :attribute tidak valid.',
    'array' => 'Kolom :attribute harus berupa larik (array).',
    'ascii' => 'Kolom :attribute hanya boleh berisi karakter alfanumerik dan simbol satu byte.',
    'before' => 'Kolom :attribute harus berisi tanggal sebelum :date.',
    'before_or_equal' => 'Kolom :attribute harus berisi tanggal sebelum atau sama dengan :date.',
    'between' => [
        'array' => 'Kolom :attribute harus berisi antara :min sampai :max item.',
        'file' => 'Ukuran file :attribute harus antara :min sampai :max kilobyte.',
        'numeric' => 'Kolom :attribute harus bernilai antara :min sampai :max.',
        'string' => 'Panjang :attribute harus antara :min sampai :max karakter.',
    ],
    'boolean' => 'Kolom :attribute harus bernilai benar atau salah.',
    'can' => 'Kolom :attribute mengandung nilai yang tidak diizinkan.',
    'confirmed' => 'Konfirmasi :attribute tidak cocok.',
    'contains' => 'Kolom :attribute belum berisi nilai yang diperlukan.',
    'current_password' => 'Kata sandi salah.',
    'date' => 'Kolom :attribute harus berisi tanggal yang valid.',
    'date_equals' => 'Kolom :attribute harus berisi tanggal yang sama dengan :date.',
    'date_format' => 'Kolom :attribute harus sesuai dengan format :format.',
    'decimal' => 'Kolom :attribute harus memiliki :decimal angka di belakang koma.',
    'declined' => 'Kolom :attribute harus ditolak.',
    'declined_if' => 'Kolom :attribute harus ditolak ketika :other bernilai :value.',
    'different' => 'Kolom :attribute dan :other harus berbeda.',
    'digits' => 'Kolom :attribute harus terdiri dari :digits digit.',
    'digits_between' => 'Kolom :attribute harus terdiri dari :min sampai :max digit.',
    'dimensions' => 'Dimensi gambar :attribute tidak valid.',
    'distinct' => 'Kolom :attribute memiliki nilai yang duplikat.',
    'doesnt_contain' => 'Kolom :attribute tidak boleh berisi salah satu dari: :values.',
    'doesnt_end_with' => 'Kolom :attribute tidak boleh diakhiri dengan salah satu dari: :values.',
    'doesnt_start_with' => 'Kolom :attribute tidak boleh diawali dengan salah satu dari: :values.',
    'email' => 'Kolom :attribute harus berupa alamat email yang valid.',
    'encoding' => 'Kolom :attribute harus menggunakan encoding :encoding.',
    'ends_with' => 'Kolom :attribute harus diakhiri dengan salah satu dari: :values.',
    'enum' => 'Pilihan :attribute tidak valid.',
    'exists' => 'Pilihan :attribute tidak valid.',
    'extensions' => 'Kolom :attribute harus memiliki salah satu ekstensi berikut: :values.',
    'file' => 'Kolom :attribute harus berupa berkas.',
    'filled' => 'Kolom :attribute harus diisi.',
    'gt' => [
        'array' => 'Kolom :attribute harus berisi lebih dari :value item.',
        'file' => 'Ukuran file :attribute harus lebih besar dari :value kilobyte.',
        'numeric' => 'Kolom :attribute harus lebih besar dari :value.',
        'string' => 'Panjang :attribute harus lebih dari :value karakter.',
    ],
    'gte' => [
        'array' => 'Kolom :attribute harus berisi :value item atau lebih.',
        'file' => 'Ukuran file :attribute harus lebih besar atau sama dengan :value kilobyte.',
        'numeric' => 'Kolom :attribute harus lebih besar atau sama dengan :value.',
        'string' => 'Panjang :attribute harus lebih atau sama dengan :value karakter.',
    ],
    'hex_color' => 'Kolom :attribute harus berupa kode warna heksadesimal yang valid.',
    'image' => 'Kolom :attribute harus berupa gambar.',
    'in' => 'Pilihan :attribute tidak valid.',
    'in_array' => 'Kolom :attribute harus ada di dalam :other.',
    'in_array_keys' => 'Kolom :attribute harus berisi setidaknya salah satu kunci berikut: :values.',
    'integer' => 'Kolom :attribute harus berupa bilangan bulat.',
    'ip' => 'Kolom :attribute harus berupa alamat IP yang valid.',
    'ipv4' => 'Kolom :attribute harus berupa alamat IPv4 yang valid.',
    'ipv6' => 'Kolom :attribute harus berupa alamat IPv6 yang valid.',
    'json' => 'Kolom :attribute harus berupa string JSON yang valid.',
    'list' => 'Kolom :attribute harus berupa daftar.',
    'lowercase' => 'Kolom :attribute harus menggunakan huruf kecil semua.',
    'lt' => [
        'array' => 'Kolom :attribute harus berisi kurang dari :value item.',
        'file' => 'Ukuran file :attribute harus lebih kecil dari :value kilobyte.',
        'numeric' => 'Kolom :attribute harus lebih kecil dari :value.',
        'string' => 'Panjang :attribute harus kurang dari :value karakter.',
    ],
    'lte' => [
        'array' => 'Kolom :attribute tidak boleh lebih dari :value item.',
        'file' => 'Ukuran file :attribute harus lebih kecil atau sama dengan :value kilobyte.',
        'numeric' => 'Kolom :attribute harus lebih kecil atau sama dengan :value.',
        'string' => 'Panjang :attribute tidak boleh lebih dari :value karakter.',
    ],
    'mac_address' => 'Kolom :attribute harus berupa alamat MAC yang valid.',
    'max' => [
        'array' => 'Kolom :attribute tidak boleh lebih dari :max item.',
        'file' => 'Ukuran file :attribute tidak boleh lebih dari :max kilobyte.',
        'numeric' => 'Kolom :attribute tidak boleh lebih dari :max.',
        'string' => 'Panjang :attribute tidak boleh lebih dari :max karakter.',
    ],
    'max_digits' => 'Kolom :attribute tidak boleh lebih dari :max digit.',
    'mimes' => 'Kolom :attribute harus berupa berkas dengan tipe: :values.',
    'mimetypes' => 'Kolom :attribute harus berupa berkas dengan tipe: :values.',
    'min' => [
        'array' => 'Kolom :attribute harus berisi minimal :min item.',
        'file' => 'Ukuran file :attribute minimal :min kilobyte.',
        'numeric' => 'Kolom :attribute minimal bernilai :min.',
        'string' => 'Kolom :attribute minimal harus :min karakter.',
    ],
    'min_digits' => 'Kolom :attribute harus terdiri dari minimal :min digit.',
    'missing' => 'Kolom :attribute tidak boleh diisi.',
    'missing_if' => 'Kolom :attribute tidak boleh diisi ketika :other bernilai :value.',
    'missing_unless' => 'Kolom :attribute tidak boleh diisi kecuali :other bernilai :value.',
    'missing_with' => 'Kolom :attribute tidak boleh diisi ketika :values ada.',
    'missing_with_all' => 'Kolom :attribute tidak boleh diisi ketika :values ada.',
    'multiple_of' => 'Kolom :attribute harus kelipatan dari :value.',
    'not_in' => 'Pilihan :attribute tidak valid.',
    'not_regex' => 'Format :attribute tidak valid.',
    'numeric' => 'Kolom :attribute harus berupa angka.',
    'password' => [
        'letters' => 'Kolom :attribute harus mengandung minimal satu huruf.',
        'mixed' => 'Kolom :attribute harus mengandung minimal satu huruf besar dan satu huruf kecil.',
        'numbers' => 'Kolom :attribute harus mengandung minimal satu angka.',
        'symbols' => 'Kolom :attribute harus mengandung minimal satu simbol.',
        'uncompromised' => 'Kolom :attribute pernah muncul pada kebocoran data. Silakan gunakan :attribute yang berbeda.',
    ],
    'present' => 'Kolom :attribute harus tersedia.',
    'present_if' => 'Kolom :attribute harus tersedia ketika :other bernilai :value.',
    'present_unless' => 'Kolom :attribute harus tersedia kecuali :other bernilai :value.',
    'present_with' => 'Kolom :attribute harus tersedia ketika :values tersedia.',
    'present_with_all' => 'Kolom :attribute harus tersedia ketika :values tersedia.',
    'prohibited' => 'Kolom :attribute dilarang diisi.',
    'prohibited_if' => 'Kolom :attribute dilarang diisi ketika :other bernilai :value.',
    'prohibited_if_accepted' => 'Kolom :attribute dilarang diisi ketika :other disetujui.',
    'prohibited_if_declined' => 'Kolom :attribute dilarang diisi ketika :other ditolak.',
    'prohibited_unless' => 'Kolom :attribute dilarang diisi kecuali :other bernilai :values.',
    'prohibits' => 'Kolom :attribute melarang :other untuk diisi.',
    'regex' => 'Format :attribute tidak valid.',
    'required' => 'Kolom :attribute wajib diisi.',
    'required_array_keys' => 'Kolom :attribute harus berisi entri untuk: :values.',
    'required_if' => 'Kolom :attribute wajib diisi ketika :other bernilai :value.',
    'required_if_accepted' => 'Kolom :attribute wajib diisi ketika :other disetujui.',
    'required_if_declined' => 'Kolom :attribute wajib diisi ketika :other ditolak.',
    'required_unless' => 'Kolom :attribute wajib diisi kecuali :other bernilai :values.',
    'required_with' => 'Kolom :attribute wajib diisi ketika :values tersedia.',
    'required_with_all' => 'Kolom :attribute wajib diisi ketika :values tersedia.',
    'required_without' => 'Kolom :attribute wajib diisi ketika :values tidak tersedia.',
    'required_without_all' => 'Kolom :attribute wajib diisi ketika tidak ada satu pun dari :values yang tersedia.',
    'same' => 'Kolom :attribute dan :other harus sama.',
    'size' => [
        'array' => 'Kolom :attribute harus berisi :size item.',
        'file' => 'Ukuran file :attribute harus :size kilobyte.',
        'numeric' => 'Kolom :attribute harus bernilai :size.',
        'string' => 'Panjang :attribute harus :size karakter.',
    ],
    'starts_with' => 'Kolom :attribute harus diawali dengan salah satu dari: :values.',
    'string' => 'Kolom :attribute harus berupa teks.',
    'timezone' => 'Kolom :attribute harus berupa zona waktu yang valid.',
    'unique' => 'Kolom :attribute sudah pernah digunakan.',
    'uploaded' => 'Kolom :attribute gagal diunggah.',
    'uppercase' => 'Kolom :attribute harus menggunakan huruf besar semua.',
    'url' => 'Kolom :attribute harus berupa URL yang valid.',
    'ulid' => 'Kolom :attribute harus berupa ULID yang valid.',
    'uuid' => 'Kolom :attribute harus berupa UUID yang valid.',

    /*
    |--------------------------------------------------------------------------
    | Pesan Validasi Kustom
    |--------------------------------------------------------------------------
    |
    | Anda dapat menentukan pesan validasi kustom untuk atribut tertentu
    | menggunakan format "atribut.aturan". Hal ini memudahkan untuk
    | memberikan pesan khusus pada kombinasi atribut dan aturan tertentu.
    |
    */

    'custom' => [
        'password' => [
            'min' => 'Kata sandi minimal harus :min karakter.',
            'confirmed' => 'Konfirmasi kata sandi tidak cocok dengan kata sandi.',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Atribut Validasi Kustom
    |--------------------------------------------------------------------------
    |
    | Baris berikut digunakan untuk mengganti placeholder atribut dengan
    | sesuatu yang lebih ramah pembaca, misalnya "Alamat Email" sebagai
    | pengganti "email". Hal ini membantu pesan menjadi lebih ekspresif.
    |
    */

    'attributes' => [
        'name' => 'nama',
        'first_name' => 'nama depan',
        'last_name' => 'nama belakang',
        'username' => 'nama pengguna',
        'email' => 'email',
        'phone' => 'nomor telepon',
        'phone_number' => 'nomor telepon',
        'password' => 'kata sandi',
        'password_confirmation' => 'konfirmasi kata sandi',
        'current_password' => 'kata sandi saat ini',
        'new_password' => 'kata sandi baru',
        'new_password_confirmation' => 'konfirmasi kata sandi baru',
        'role' => 'peran',
        'company_name' => 'nama perusahaan',
        'company' => 'perusahaan',
        'address' => 'alamat',
        'city' => 'kota',
        'province' => 'provinsi',
        'country' => 'negara',
        'postal_code' => 'kode pos',
        'description' => 'deskripsi',
        'title' => 'judul',
        'subject' => 'subjek',
        'message' => 'pesan',
        'content' => 'konten',
        'image' => 'gambar',
        'photo' => 'foto',
        'avatar' => 'foto profil',
        'logo' => 'logo',
        'file' => 'berkas',
        'date' => 'tanggal',
        'time' => 'waktu',
        'date_of_birth' => 'tanggal lahir',
        'gender' => 'jenis kelamin',
        'age' => 'usia',
        'website' => 'situs web',
        'url' => 'URL',
        'category' => 'kategori',
        'status' => 'status',
        'job_title' => 'posisi pekerjaan',
        'job_description' => 'deskripsi pekerjaan',
        'salary' => 'gaji',
        'salary_min' => 'gaji minimum',
        'salary_max' => 'gaji maksimum',
        'experience' => 'pengalaman',
        'education' => 'pendidikan',
        'skills' => 'keahlian',
        'industry' => 'industri',
        'employment_type' => 'jenis pekerjaan',
        'work_location' => 'lokasi kerja',
        'terms' => 'syarat dan ketentuan',
    ],

];
