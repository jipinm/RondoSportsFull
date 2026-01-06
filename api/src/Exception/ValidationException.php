<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

use Exception;
use Throwable;

class ValidationException extends Exception
{
    private array $errors;

    public function __construct(
        string $message = 'Validation failed',
        array $errors = [],
        int $code = 400,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->errors = $errors;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function getFieldErrors(): array
    {
        return $this->errors;
    }

    public function hasErrors(): bool
    {
        return !empty($this->errors);
    }
}