<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

class BookingValidationService
{
    /**
     * Validate booking status update
     */
    public function validateStatusUpdate(array $data): array
    {
        $errors = [];

        // Status validation
        if (empty($data['status'])) {
            $errors['status'] = 'Status is required';
        } else {
            $allowedStatuses = ['pending', 'confirmed', 'cancelled', 'refunded', 'expired'];
            if (!in_array($data['status'], $allowedStatuses)) {
                $errors['status'] = 'Invalid status value. Allowed values: ' . implode(', ', $allowedStatuses);
            }
        }

        // Reason validation for cancelled/refunded status
        if (!empty($data['status']) && in_array($data['status'], ['cancelled', 'refunded'])) {
            if (empty($data['reason'])) {
                $errors['reason'] = 'Reason is required when cancelling or refunding a booking';
            } elseif (strlen($data['reason']) > 1000) {
                $errors['reason'] = 'Reason must not exceed 1000 characters';
            }
        }

        return $errors;
    }

    /**
     * Validate booking filters
     */
    public function validateBookingFilters(array $filters): array
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
        if (isset($filters['status'])) {
            $allowedStatuses = ['pending', 'confirmed', 'cancelled', 'refunded', 'expired'];
            if (!in_array($filters['status'], $allowedStatuses)) {
                $errors['status'] = 'Invalid status filter';
            } else {
                $validatedFilters['status'] = $filters['status'];
            }
        }

        // Payment status filter
        if (isset($filters['payment_status'])) {
            $allowedPaymentStatuses = ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'];
            if (!in_array($filters['payment_status'], $allowedPaymentStatuses)) {
                $errors['payment_status'] = 'Invalid payment status filter';
            } else {
                $validatedFilters['payment_status'] = $filters['payment_status'];
            }
        }

        // Cancellation status filter
        if (isset($filters['cancellation_status'])) {
            $allowedCancellationStatuses = ['none', 'requested', 'approved', 'declined', 'cancelled'];
            if (!in_array($filters['cancellation_status'], $allowedCancellationStatuses)) {
                $errors['cancellation_status'] = 'Invalid cancellation status filter';
            } else {
                $validatedFilters['cancellation_status'] = $filters['cancellation_status'];
            }
        }

        // Date filters
        $dateFilters = ['event_date_from', 'event_date_to', 'booking_date_from', 'booking_date_to'];
        foreach ($dateFilters as $filter) {
            if (isset($filters[$filter])) {
                if (!$this->isValidDate($filters[$filter])) {
                    $errors[$filter] = 'Invalid date format. Use YYYY-MM-DD';
                } else {
                    $validatedFilters[$filter] = $filters[$filter];
                }
            }
        }

        // Date range validation
        if (isset($validatedFilters['event_date_from']) && isset($validatedFilters['event_date_to'])) {
            if (strtotime($validatedFilters['event_date_from']) > strtotime($validatedFilters['event_date_to'])) {
                $errors['event_date_range'] = 'Event date from must be before event date to';
            }
        }

        if (isset($validatedFilters['booking_date_from']) && isset($validatedFilters['booking_date_to'])) {
            if (strtotime($validatedFilters['booking_date_from']) > strtotime($validatedFilters['booking_date_to'])) {
                $errors['booking_date_range'] = 'Booking date from must be before booking date to';
            }
        }

        // Sport type filter
        if (isset($filters['sport_type'])) {
            $sportType = trim($filters['sport_type']);
            if (strlen($sportType) > 50) {
                $errors['sport_type'] = 'Sport type must not exceed 50 characters';
            } else {
                $validatedFilters['sport_type'] = $sportType;
            }
        }

        return [
            'errors' => $errors,
            'validated_filters' => $validatedFilters
        ];
    }

    /**
     * Validate pagination parameters
     */
    public function validatePagination(array $params): array
    {
        $errors = [];
        $validated = [];

        // Page validation
        $page = $params['page'] ?? 1;
        if (!is_numeric($page) || (int)$page < 1) {
            $errors['page'] = 'Page must be a positive integer';
        } else {
            $validated['page'] = (int)$page;
        }

        // Limit validation
        $limit = $params['limit'] ?? 20;
        if (!is_numeric($limit) || (int)$limit < 1 || (int)$limit > 100) {
            $errors['limit'] = 'Limit must be between 1 and 100';
        } else {
            $validated['limit'] = (int)$limit;
        }

        return [
            'errors' => $errors,
            'validated_params' => $validated
        ];
    }

    /**
     * Validate status transition
     */
    public function validateStatusTransition(string $currentStatus, string $newStatus): array
    {
        $errors = [];

        // Define allowed transitions
        $allowedTransitions = [
            'pending' => ['confirmed', 'cancelled', 'expired'],
            'confirmed' => ['cancelled', 'refunded'],
            'cancelled' => [], // Cannot change from cancelled
            'refunded' => [], // Cannot change from refunded
            'expired' => [] // Cannot change from expired
        ];

        if (!isset($allowedTransitions[$currentStatus])) {
            $errors['current_status'] = 'Invalid current status';
            return $errors;
        }

        if (!in_array($newStatus, $allowedTransitions[$currentStatus])) {
            $errors['status_transition'] = "Cannot change status from '{$currentStatus}' to '{$newStatus}'";
        }

        return $errors;
    }

    /**
     * Sanitize booking data for display
     */
    public function sanitizeBookingData(array $booking): array
    {
        $sanitized = [];

        // String fields that need sanitization
        $stringFields = [
            'booking_reference', 'event_name', 'venue_name', 'sport_type', 
            'tournament_name', 'category_name', 'customer_notes', 'admin_notes',
            'cancellation_reason', 'cancellation_customer_notes', 'cancellation_admin_notes',
            'refund_reason'
        ];

        foreach ($stringFields as $field) {
            if (isset($booking[$field])) {
                $sanitized[$field] = htmlspecialchars(trim($booking[$field]), ENT_QUOTES, 'UTF-8');
            }
        }

        // Numeric fields
        $numericFields = ['total_amount', 'commission_amount', 'ticket_count', 'refund_amount', 'cancellation_refund_amount', 'payment_gateway_fee'];
        foreach ($numericFields as $field) {
            if (isset($booking[$field])) {
                $sanitized[$field] = is_numeric($booking[$field]) ? $booking[$field] : 0;
            }
        }

        // Status fields (no sanitization needed, just pass through)
        $statusFields = ['status', 'payment_status', 'cancellation_status', 'cancellation_request_status', 'cancellation_refund_status', 'eticket_status'];
        foreach ($statusFields as $field) {
            if (isset($booking[$field])) {
                $sanitized[$field] = $booking[$field];
            }
        }

        // Date fields (no sanitization needed for dates)
        $dateFields = [
            'event_date', 'booking_date', 'confirmed_at', 'cancelled_at', 
            'event_start_time', 'created_at', 'updated_at', 'refunded_at',
            'cancellation_date', 'cancellation_request_date', 'cancellation_reviewed_date',
            'payment_completed_at', 'eticket_available_date', 'first_downloaded_at',
            'last_download_attempt', 'ticket_expiry_date', 'xs2event_synced_at'
        ];
        foreach ($dateFields as $field) {
            if (isset($booking[$field])) {
                $sanitized[$field] = $booking[$field];
            }
        }

        // JSON fields (already decoded by repository)
        $jsonFields = ['seat_info', 'ticket_info', 'api_data'];
        foreach ($jsonFields as $field) {
            if (isset($booking[$field])) {
                $sanitized[$field] = $booking[$field];
            }
        }

        // Other safe fields
        $safeFields = [
            'id', 'api_booking_id', 'api_reservation_id', 'customer_user_id', 'customer_name', 
            'customer_email', 'customer_phone', 'currency', 'source', 'modified_by_name',
            'number_of_tickets', 'ticket_price', 'payment_method', 'payment_reference',
            'payment_intent_id', 'stripe_session_id', 'stripe_customer_id', 'stripe_payment_method_id',
            'stripe_charge_id', 'refund_id', 'cancellation_request_id',
            'xs2event_booking_status', 'xs2event_logistic_status', 'xs2event_distribution_channel',
            'xs2event_booking_code', 'xs2event_sync_attempts', 'xs2event_last_error',
            'eticket_urls', 'zip_download_url', 'download_count', 'download_error_message',
            'event_id', 'venue_id', 'last_sync_at', 'modified_by', 'customer_country',
            'xs2event_response_data'
        ];
        foreach ($safeFields as $field) {
            if (isset($booking[$field])) {
                $sanitized[$field] = $booking[$field];
            }
        }

        // Handle nested objects
        if (isset($booking['user']) && is_array($booking['user'])) {
            $sanitized['user'] = $booking['user'];
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