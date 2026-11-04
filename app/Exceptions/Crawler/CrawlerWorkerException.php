<?php

namespace App\Exceptions\Crawler;

use RuntimeException;

/**
 * The Python worker could not be run, timed out, or answered with output
 * that does not follow the contract.
 */
class CrawlerWorkerException extends RuntimeException
{
    public function __construct(string $message, public readonly string $category = 'unknown')
    {
        parent::__construct($message);
    }
}
