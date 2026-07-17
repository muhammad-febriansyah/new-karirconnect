<?php

namespace App\Exceptions\Auth;

use RuntimeException;

/**
 * A refresh token that was already rotated has been presented a second time.
 *
 * Under rotation a token is redeemed exactly once, so a replay means two
 * parties hold the same token -- the legitimate client and someone who copied
 * it. There is no way to tell which one is presenting it now, so the entire
 * rotation chain is revoked and both are forced to re-authenticate. This is
 * the trade rotation makes: a stolen token buys an attacker one refresh, and
 * the theft becomes visible the moment either side uses it again.
 *
 * Surfaced to the client as a plain 401, same as any invalid token.
 */
class RefreshTokenReusedException extends RuntimeException
{
    public function __construct(public readonly int $userId)
    {
        parent::__construct('The refresh token has already been used; the session chain was revoked.');
    }
}
