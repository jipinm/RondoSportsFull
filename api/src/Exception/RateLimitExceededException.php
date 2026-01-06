<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

class RateLimitExceededException extends ApiException
{
    public function __construct(
        string $message = 'Rate limit exceeded',
        int $code = 429,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }
}
