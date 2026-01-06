<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

use Exception;

class BookingException extends Exception
{
    public static function bookingNotFound(string $identifier): self
    {
        return new self("Booking not found: {$identifier}", 404);
    }

    public static function invalidStatus(string $status): self
    {
        return new self("Invalid booking status: {$status}", 400);
    }

    public static function statusTransitionNotAllowed(string $from, string $to): self
    {
        return new self("Status transition from '{$from}' to '{$to}' is not allowed", 400);
    }

    public static function validationFailed(array $errors): self
    {
        $message = 'Booking validation failed: ' . implode(', ', array_keys($errors));
        $exception = new self($message, 400);
        $exception->errors = $errors;
        return $exception;
    }

    public static function updateFailed(string $reason): self
    {
        return new self("Failed to update booking: {$reason}", 500);
    }

    public static function accessDenied(string $reason = 'Insufficient permissions'): self
    {
        return new self("Access denied: {$reason}", 403);
    }

    public array $errors = [];
}