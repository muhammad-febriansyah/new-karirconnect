<?php

namespace App\Exceptions\Crawler;

use RuntimeException;

/**
 * A crawl was requested for a source that may not run right now (not
 * active, cooling down, or already running). The message is user-facing.
 */
class CrawlNotAllowedException extends RuntimeException {}
