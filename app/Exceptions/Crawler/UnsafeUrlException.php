<?php

namespace App\Exceptions\Crawler;

use RuntimeException;

/**
 * A URL failed the SSRF checks (scheme, host allowlist, private address).
 */
class UnsafeUrlException extends RuntimeException {}
