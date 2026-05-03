<x-mail::message>
# Konfigurasi email berjalan dengan baik

Email ini dikirim sebagai uji coba dari panel admin untuk memverifikasi konfigurasi pengiriman email sistem.

Jika Anda menerima email ini, artinya konfigurasi **Mail Driver** dan **API token** sudah benar dan email transaksional ke kandidat maupun perekrut akan terkirim normal.

<x-mail::panel>
**Detail Pengiriman**

- Dikirim oleh: {{ $sentBy }}
- Waktu kirim: {{ $sentAt }}
- Domain pengirim: {{ parse_url(config('app.url'), PHP_URL_HOST) }}
</x-mail::panel>

Tidak perlu melakukan tindakan apa pun atas email ini. Anda bisa menutup tab pengaturan dan melanjutkan operasi normal.

<x-mail::button :url="rtrim(config('app.url'), '/').'/admin/settings/email'">
Buka Pengaturan Email
</x-mail::button>

Jika ada kendala dalam pengiriman email kepada pengguna, periksa log sistem atau hubungi tim teknis.
</x-mail::message>
