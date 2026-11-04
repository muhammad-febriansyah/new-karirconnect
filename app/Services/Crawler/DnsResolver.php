<?php

namespace App\Services\Crawler;

/**
 * Resolves a host to its IP addresses. Bound in the container so tests can
 * swap in a fake without touching the network.
 */
class DnsResolver
{
    /**
     * @return list<string>
     */
    public function resolve(string $host): array
    {
        $records = @dns_get_record($host, DNS_A | DNS_AAAA) ?: [];

        $addresses = [];
        foreach ($records as $record) {
            $address = $record['ip'] ?? $record['ipv6'] ?? null;
            if (is_string($address)) {
                $addresses[] = $address;
            }
        }

        if ($addresses === []) {
            $addresses = @gethostbynamel($host) ?: [];
        }

        return array_values(array_unique($addresses));
    }

    /**
     * Whether the domain has a mail server (MX, or an A record as the SMTP
     * fallback), i.e. an address on it can receive email at all.
     */
    public function acceptsMail(string $domain): bool
    {
        return @checkdnsrr($domain, 'MX') || @checkdnsrr($domain, 'A');
    }
}
