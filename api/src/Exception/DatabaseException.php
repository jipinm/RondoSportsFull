<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

use Exception;
use Throwable;

/**
 * Exception for database-related errors
 */
class DatabaseException extends Exception
{
    public function __construct(
        string $message = 'Database error occurred',
        int $code = 500,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }
}
