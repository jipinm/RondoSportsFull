<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

class InvalidOriginException extends ApiException
{
    public function __construct(
        string $message = 'The request origin is not allowed',
        int $code = 403,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }
}
