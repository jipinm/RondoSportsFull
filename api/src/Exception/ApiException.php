<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

use Exception;
use Psr\Http\Message\ResponseInterface;
use Throwable;

class ApiException extends Exception
{
    private ?ResponseInterface $response;

    public function __construct(
        string $message = '',
        int $code = 500,
        ?Throwable $previous = null,
        ?ResponseInterface $response = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->response = $response;
    }

    public function getResponse(): ?ResponseInterface
    {
        return $this->response;
    }
}
