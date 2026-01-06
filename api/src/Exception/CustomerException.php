<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

class CustomerException extends ApiException
{
    public const CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND';
    public const EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS';
    public const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';
    public const ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED';
    public const ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE';
    public const ACCOUNT_LOCKED = 'ACCOUNT_LOCKED';
    public const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';
    public const VALIDATION_FAILED = 'VALIDATION_FAILED';
    public const REGISTRATION_FAILED = 'REGISTRATION_FAILED';
    public const PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED';
    public const PASSWORD_CHANGE_FAILED = 'PASSWORD_CHANGE_FAILED';
    public const INVALID_TOKEN = 'INVALID_TOKEN';
    public const TOKEN_EXPIRED = 'TOKEN_EXPIRED';
    public const INSUFFICIENT_PRIVILEGES = 'INSUFFICIENT_PRIVILEGES';

    private array $details = [];
    private string $stringCode = 'UNKNOWN_ERROR';

    public static function customerNotFound(string $identifier): self
    {
        $exception = new self("Customer not found: {$identifier}", 404);
        $exception->stringCode = self::CUSTOMER_NOT_FOUND;
        return $exception;
    }

    public static function emailAlreadyExists(string $email): self
    {
        $exception = new self("Email address is already registered: {$email}", 400);
        $exception->stringCode = self::EMAIL_ALREADY_EXISTS;
        return $exception;
    }

    public static function invalidCredentials(): self
    {
        $exception = new self("Invalid email or password", 401);
        $exception->stringCode = self::INVALID_CREDENTIALS;
        return $exception;
    }

    public static function accountBlocked(?string $reason = null): self
    {
        $message = "Account is blocked";
        if ($reason) {
            $message .= ": {$reason}";
        }
        $exception = new self($message, 403);
        $exception->stringCode = self::ACCOUNT_BLOCKED;
        return $exception;
    }

    public static function accountInactive(): self
    {
        $exception = new self("Account is inactive", 403);
        $exception->stringCode = self::ACCOUNT_INACTIVE;
        return $exception;
    }

    public static function accountLocked(\DateTime $unlockTime): self
    {
        $unlockTimeStr = $unlockTime->format('Y-m-d H:i:s');
        $exception = new self("Account is temporarily locked until {$unlockTimeStr}", 403);
        $exception->stringCode = self::ACCOUNT_LOCKED;
        return $exception;
    }

    public static function emailNotVerified(): self
    {
        $exception = new self("Email address has not been verified", 403);
        $exception->stringCode = self::EMAIL_NOT_VERIFIED;
        return $exception;
    }

    public static function validationFailed(array $errors): self
    {
        $exception = new self("Validation failed", 400);
        $exception->stringCode = self::VALIDATION_FAILED;
        $exception->setDetails($errors);
        return $exception;
    }

    public static function registrationFailed(string $reason): self
    {
        $exception = new self("Registration failed: {$reason}", 400);
        $exception->stringCode = self::REGISTRATION_FAILED;
        return $exception;
    }

    public static function profileUpdateFailed(string $reason): self
    {
        $exception = new self("Profile update failed: {$reason}", 400);
        $exception->stringCode = self::PROFILE_UPDATE_FAILED;
        return $exception;
    }

    public static function passwordChangeFailed(string $reason): self
    {
        $exception = new self("Password change failed: {$reason}", 400);
        $exception->stringCode = self::PASSWORD_CHANGE_FAILED;
        return $exception;
    }

    public static function invalidToken(string $tokenType = 'token'): self
    {
        $exception = new self("Invalid or expired {$tokenType}", 401);
        $exception->stringCode = self::INVALID_TOKEN;
        return $exception;
    }

    public static function tokenExpired(string $tokenType = 'token'): self
    {
        $exception = new self("{$tokenType} has expired", 401);
        $exception->stringCode = self::TOKEN_EXPIRED;
        return $exception;
    }

    public static function insufficientPrivileges(string $action): self
    {
        $exception = new self("Insufficient privileges to {$action}", 403);
        $exception->stringCode = self::INSUFFICIENT_PRIVILEGES;
        return $exception;
    }

    public function setDetails(array $details): void
    {
        $this->details = $details;
    }

    public function getDetails(): array
    {
        return $this->details;
    }

    public function getStringCode(): string
    {
        return $this->stringCode;
    }

    public function toArray(): array
    {
        $result = [
            'success' => false,
            'error' => $this->getMessage(),
            'code' => $this->getCode(),
            'error_type' => $this->getStringCode()
        ];

        if (!empty($this->details)) {
            $result['details'] = $this->details;
        }

        return $result;
    }
}