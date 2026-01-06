<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

class RefundValidationService
{
    /**
     * Validate refund status update
     */
    public function validateStatusUpdate(array $data): array
    {
        $errors = [];

        // Status validation
        if (empty($data['status'])) {
            $errors['status'] = 'Status is required';
        } else {
            $allowedStatuses = ['pending', 'under_review', 'approved', 'rejected', 'processed', 'failed'];
            if (!in_array($data['status'], $allowedStatuses)) {
                $errors['status'] = 'Invalid status value. Allowed values: ' . implode(', ', $allowedStatuses);
            }
        }

        // Admin notes validation
        if (isset($data['admin_notes']) && strlen($data['admin_notes']) > 2000) {
            $errors['admin_notes'] = 'Admin notes must not exceed 2000 characters';
        }

        // Rejection reason validation for rejected status
        if (!empty($data['status']) && $data['status'] === 'rejected') {
            if (empty($data['rejection_reason'])) {
                $errors['rejection_reason'] = 'Rejection reason is required when rejecting a refund';
            } elseif (strlen($data['rejection_reason']) > 1000) {
                $errors['rejection_reason'] = 'Rejection reason must not exceed 1000 characters';
            }
        }

        // Approved amount validation for approved status
        if (!empty($data['status']) && $data['status'] === 'approved') {
            if (isset($data['approved_amount'])) {
                if (!is_numeric($data['approved_amount']) || $data['approved_amount'] < 0) {
                    $errors['approved_amount'] = 'Approved amount must be a positive number';
                } elseif ($data['approved_amount'] > 999999.99) {
                    $errors['approved_amount'] = 'Approved amount exceeds maximum allowed value';
                }
            }
        }

        return $errors;
    }

    /**
     * Validate refund filters
     */
    public function validateRefundFilters(array $filters): array
    {
        $errors = [];
        $validatedFilters = [];

        // Search term
        if (isset($filters['search'])) {
            $search = trim($filters['search']);
            if (strlen($search) > 100) {
                $errors['search'] = 'Search term must not exceed 100 characters';
            } else {
                $validatedFilters['search'] = $search;
            }
        }

        // Status filter
        if (isset($filters['status']) && !empty($filters['status'])) {
            $allowedStatuses = ['pending', 'under_review', 'approved', 'rejected', 'processed', 'failed'];
            if (!in_array($filters['status'], $allowedStatuses)) {
                $errors['status'] = 'Invalid status filter';
            } else {
                $validatedFilters['status'] = $filters['status'];
            }
        }

        // Priority filter
        if (isset($filters['priority']) && !empty($filters['priority'])) {
            $allowedPriorities = ['low', 'normal', 'high', 'urgent'];
            if (!in_array($filters['priority'], $allowedPriorities)) {
                $errors['priority'] = 'Invalid priority filter';
            } else {
                $validatedFilters['priority'] = $filters['priority'];
            }
        }

        // Date filters
        if (isset($filters['start_date'])) {
            if (!$this->isValidDate($filters['start_date'])) {
                $errors['start_date'] = 'Invalid start date format. Use YYYY-MM-DD';
            } else {
                $validatedFilters['start_date'] = $filters['start_date'];
            }
        }

        if (isset($filters['end_date'])) {
            if (!$this->isValidDate($filters['end_date'])) {
                $errors['end_date'] = 'Invalid end date format. Use YYYY-MM-DD';
            } else {
                $validatedFilters['end_date'] = $filters['end_date'];
            }
        }

        // Validate date range
        if (isset($validatedFilters['start_date']) && isset($validatedFilters['end_date'])) {
            if ($validatedFilters['start_date'] > $validatedFilters['end_date']) {
                $errors['date_range'] = 'Start date must be before or equal to end date';
            }
        }

        return [
            'errors' => $errors,
            'validated_filters' => $validatedFilters
        ];
    }

    /**
     * Validate status transition
     */
    public function validateStatusTransition(string $currentStatus, string $newStatus): array
    {
        $errors = [];

        $allowedTransitions = [
            'pending' => ['under_review', 'approved', 'rejected'],
            'under_review' => ['approved', 'rejected', 'pending'],
            'approved' => ['processed', 'failed'],
            'rejected' => [], // Final state - cannot transition
            'processed' => [], // Final state - cannot transition  
            'failed' => ['approved', 'processed'] // Can retry processing
        ];

        if (!isset($allowedTransitions[$currentStatus])) {
            $errors[] = "Invalid current status: {$currentStatus}";
        } elseif (!in_array($newStatus, $allowedTransitions[$currentStatus])) {
            $errors[] = "Cannot transition from '{$currentStatus}' to '{$newStatus}'. Allowed transitions: " . 
                       implode(', ', $allowedTransitions[$currentStatus]);
        }

        return $errors;
    }

    /**
     * Sanitize refund data for display
     */
    public function sanitizeRefundData(array $refund): array
    {
        $sanitized = [];

        // String fields that need sanitization
        $stringFields = [
            'refund_reference', 'refund_reason', 'admin_notes', 'rejection_reason',
            'payment_system_reference', 'external_status', 'booking_reference', 'event_name'
        ];

        foreach ($stringFields as $field) {
            if (isset($refund[$field])) {
                $sanitized[$field] = htmlspecialchars(trim($refund[$field]), ENT_QUOTES, 'UTF-8');
            }
        }

        // Numeric fields
        $numericFields = [
            'requested_amount', 'approved_amount', 'processing_fee', 'net_refund_amount'
        ];
        foreach ($numericFields as $field) {
            if (isset($refund[$field])) {
                $sanitized[$field] = is_numeric($refund[$field]) ? (float)$refund[$field] : 0.0;
            }
        }

        // Status and enum fields (no sanitization needed)
        $statusFields = ['status', 'priority', 'refund_type'];
        foreach ($statusFields as $field) {
            if (isset($refund[$field])) {
                $sanitized[$field] = $refund[$field];
            }
        }

        // Date fields (no sanitization needed)
        $dateFields = [
            'requested_at', 'reviewed_at', 'approved_at', 'processed_at', 'completed_at',
            'created_at', 'updated_at', 'requestDate'
        ];
        foreach ($dateFields as $field) {
            if (isset($refund[$field])) {
                $sanitized[$field] = $refund[$field];
            }
        }

        // JSON fields (already decoded by repository)
        $jsonFields = ['customer_bank_details'];
        foreach ($jsonFields as $field) {
            if (isset($refund[$field])) {
                $sanitized[$field] = $refund[$field];
            }
        }

        // Other safe fields
        $safeFields = [
            'id', 'booking_id', 'customer_user_id', 'reviewed_by', 'processed_by',
            'customer_name', 'customer_email', 'customer_phone', 'reviewed_by_name',
            'processed_by_name', 'bookingId', 'amount', 'reason'
        ];
        foreach ($safeFields as $field) {
            if (isset($refund[$field])) {
                $sanitized[$field] = $refund[$field];
            }
        }

        // Handle nested objects
        if (isset($refund['user']) && is_array($refund['user'])) {
            $sanitized['user'] = $refund['user'];
        }

        if (isset($refund['booking']) && is_array($refund['booking'])) {
            $sanitized['booking'] = $refund['booking'];
        }

        return $sanitized;
    }

    /**
     * Check if a date string is valid
     */
    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}