<?php

namespace App\Services\Sanitizer;

/**
 * Builds LIKE patterns from user-typed search terms.
 *
 * This is not about injection -- patterns are always sent as bound parameters.
 * It is about the wildcards themselves: "%" and "_" typed into a search box
 * reach the engine as operators rather than characters. On the unauthenticated
 * /jobs search a term of "%%%%%" forces a leading-wildcard scan across every
 * title plus a correlated subquery on company names, which is a cheap way for
 * anyone to burn database CPU. Escaping also makes search behave: someone
 * looking for a literal "100%" should find it.
 *
 * Use both halves together -- the pattern from contains() only means anything
 * when the query also carries the ESCAPE clause from sql():
 *
 *     $query->whereRaw(LikeEscaper::sql('title'), [LikeEscaper::contains($term)]);
 */
class LikeEscaper
{
    /**
     * "!" rather than the conventional "\".
     *
     * The escape character has to appear in the SQL as a literal, and the two
     * engines disagree about backslashes: MySQL unescapes them inside string
     * literals, so it needs ESCAPE '\\', while SQLite takes literals verbatim
     * and rejects '\\' with "ESCAPE expression must be a single character".
     * One dialect's correct clause is the other's error. "!" is ordinary in
     * both, so the same SQL runs on production MySQL and the SQLite test suite
     * and means the same thing.
     */
    private const ESCAPE_CHAR = '!';

    /**
     * Wrap a term for a "contains" match, neutralising any wildcards inside it.
     */
    public static function contains(string $term): string
    {
        return '%'.self::escape($term).'%';
    }

    /**
     * Escape LIKE metacharacters without adding wildcards of our own.
     *
     * The escape character itself goes first: escaping it after the wildcards
     * would double-escape the markers just written.
     */
    public static function escape(string $term): string
    {
        return str_replace(
            [self::ESCAPE_CHAR, '%', '_'],
            [self::ESCAPE_CHAR.self::ESCAPE_CHAR, self::ESCAPE_CHAR.'%', self::ESCAPE_CHAR.'_'],
            $term,
        );
    }

    /**
     * A `column LIKE ? ESCAPE '!'` fragment for whereRaw.
     *
     * Laravel's where(..., 'like', ...) emits no ESCAPE clause, so the markers
     * added by escape() would be matched as literal "!" characters. The column
     * is interpolated, so it must always be a hardcoded name -- never request
     * input.
     */
    public static function sql(string $column): string
    {
        return sprintf("%s LIKE ? ESCAPE '%s'", $column, self::ESCAPE_CHAR);
    }
}
