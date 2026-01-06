<?php

declare(strict_types=1);

namespace XS2EventProxy\Exception;

class RoleManagementException extends ApiException
{
    public const ROLE_NOT_FOUND = 'ROLE_NOT_FOUND';
    public const SYSTEM_ROLE_MODIFICATION = 'SYSTEM_ROLE_MODIFICATION';
    public const ROLE_IN_USE = 'ROLE_IN_USE';
    public const INVALID_PERMISSIONS = 'INVALID_PERMISSIONS';
    public const VALIDATION_FAILED = 'VALIDATION_FAILED';
    public const ROLE_NAME_EXISTS = 'ROLE_NAME_EXISTS';
    public const INSUFFICIENT_PRIVILEGES = 'INSUFFICIENT_PRIVILEGES';

    private array $details = [];
    private string $stringCode = 'UNKNOWN_ERROR';

    public static function roleNotFound(int $roleId): self
    {
        $exception = new self("Role with ID {$roleId} not found", 404);
        $exception->stringCode = self::ROLE_NOT_FOUND;
        return $exception;
    }

    public static function systemRoleModification(): self
    {
        $exception = new self("System roles cannot be modified or deleted", 403);
        $exception->stringCode = self::SYSTEM_ROLE_MODIFICATION;
        return $exception;
    }

    public static function roleInUse(int $userCount): self
    {
        $exception = new self("Cannot delete role. {$userCount} user(s) are assigned to this role", 400);
        $exception->stringCode = self::ROLE_IN_USE;
        return $exception;
    }

    public static function invalidPermissionIds(array $invalidIds): self
    {
        $ids = implode(', ', $invalidIds);
        return new self("Invalid permission IDs: {$ids}", 400);
    }

    public static function validationFailed(array $errors): self
    {
        $exception = new self("Validation failed", 400);
        $exception->stringCode = self::VALIDATION_FAILED;
        $exception->setDetails($errors);
        return $exception;
    }

    public static function roleNameExists(string $roleName): self
    {
        $exception = new self("Role name '{$roleName}' already exists", 400);
        $exception->stringCode = self::ROLE_NAME_EXISTS;
        return $exception;
    }

    public static function insufficientPrivileges(string $userRole, string $action): self
    {
        $exception = new self("User with role '{$userRole}' does not have sufficient privileges to {$action}", 403);
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

    public function getStringCode(): string
    {
        return $this->stringCode;
    }
}