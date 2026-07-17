<?php

namespace App\Exceptions\Auth;

use RuntimeException;

/**
 * The presented refresh token is unknown, expired, or already spent.
 *
 * The controller maps this to HTTP 401 so the client drops its stored
 * credentials and sends the user back to the login screen. The message is
 * deliberately uniform across all three causes: telling a caller *why* a
 * token failed would let it probe which tokens exist.
 */
class InvalidRefreshTokenException extends RuntimeException
{
    public function __construct(string $message = 'The refresh token is invalid or has expired.')
    {
        parent::__construct($message);
    }
}
