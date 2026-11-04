<?php

namespace App\Services\Crawler;

use App\Exceptions\Crawler\UnsafeUrlException;

/**
 * SSRF guard for every URL Laravel itself fetches or hands to the worker:
 * https only, no credentials or odd ports, no IP literals, host inside the
 * allowlist (when one is given), and every resolved address public.
 *
 * The Python worker repeats these checks for each request and redirect.
 */
class UrlSafetyGuard
{
    public function __construct(private readonly DnsResolver $resolver) {}

    /**
     * @param  list<string>|null  $allowedDomains  null = any public host
     * @return array{host: string, addresses: list<string>}
     *
     * @throws UnsafeUrlException
     */
    public function check(string $url, ?array $allowedDomains = null): array
    {
        $parts = parse_url($url);

        if ($parts === false || ($parts['scheme'] ?? null) !== 'https') {
            throw new UnsafeUrlException('Hanya URL https yang diizinkan.');
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new UnsafeUrlException('URL tidak boleh berisi kredensial.');
        }
        if (isset($parts['port']) && $parts['port'] !== 443) {
            throw new UnsafeUrlException('Port selain 443 tidak diizinkan.');
        }

        $host = strtolower(rtrim($parts['host'] ?? '', '.'));
        if ($host === '') {
            throw new UnsafeUrlException('URL tidak memiliki host.');
        }
        if (filter_var(trim($host, '[]'), FILTER_VALIDATE_IP) !== false) {
            throw new UnsafeUrlException('Alamat IP langsung tidak diizinkan; gunakan nama domain.');
        }
        if ($allowedDomains !== null && ! self::hostAllowed($host, $allowedDomains)) {
            throw new UnsafeUrlException("Host {$host} tidak ada di daftar domain yang diizinkan.");
        }

        $addresses = $this->resolver->resolve($host);
        if ($addresses === []) {
            throw new UnsafeUrlException("Host {$host} tidak dapat di-resolve.");
        }
        foreach ($addresses as $address) {
            if (! self::isPublicIp($address)) {
                throw new UnsafeUrlException("Host {$host} mengarah ke alamat non-publik.");
            }
        }

        return ['host' => $host, 'addresses' => $addresses];
    }

    /**
     * @param  list<string>  $allowedDomains
     */
    public static function hostAllowed(string $host, array $allowedDomains): bool
    {
        $host = strtolower(rtrim($host, '.'));

        foreach ($allowedDomains as $domain) {
            $domain = strtolower(rtrim(trim($domain), '.'));
            if ($domain !== '' && ($host === $domain || str_ends_with($host, '.'.$domain))) {
                return true;
            }
        }

        return false;
    }

    public static function isPublicIp(string $address): bool
    {
        $address = trim($address, '[]');

        // IPv4-mapped IPv6 (::ffff:10.0.0.1) must be judged as the IPv4 inside.
        if (preg_match('/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i', $address, $matches) === 1) {
            $address = $matches[1];
        }

        $public = filter_var(
            $address,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        ) !== false;

        if (! $public) {
            return false;
        }

        // Ranges PHP's flags do not cover: carrier-grade NAT, benchmarking,
        // IPv6 unique-local and link-local.
        foreach (['100.64.0.0/10', '198.18.0.0/15', '192.0.0.0/24'] as $cidr) {
            if (self::ipv4InCidr($address, $cidr)) {
                return false;
            }
        }

        return ! preg_match('/^(fc|fd|fe8|fe9|fea|feb)/i', $address);
    }

    private static function ipv4InCidr(string $address, string $cidr): bool
    {
        if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) === false) {
            return false;
        }

        [$subnet, $bits] = explode('/', $cidr);
        $mask = -1 << (32 - (int) $bits);

        return (ip2long($address) & $mask) === (ip2long($subnet) & $mask);
    }
}
