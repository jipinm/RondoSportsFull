<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use XS2EventProxy\Repository\RefundRepository;
use XS2EventProxy\Repository\BookingRepository;
use Psr\Log\LoggerInterface;

/**
 * Service for managing refund log entries
 * Handles creation, updates, and retrieval of refund logs
 */
class RefundLogService
{
    private RefundRepository $refundRepository;
    private BookingRepository $bookingRepository;
    private LoggerInterface $logger;

    public function __construct(
        RefundRepository $refundRepository,
        BookingRepository $bookingRepository,
        LoggerInterface $logger
    ) {
        $this->refundRepository = $refundRepository;
        $this->bookingRepository = $bookingRepository;
        $this->logger = $logger;
    }

    /**
     * Create a refund log entry from a processed refund
     *
     * @param array $refundData Refund data including booking_id, amount, reason, etc.
     * @return array Created refund log entry with ID
     * @throws \Exception If creation fails
     */
    public function createRefundLog(array $refundData): array
    {
        try {
            // Validate required fields
            $this->validateRefundData($refundData);

            // Get booking details
            $booking = $this->bookingRepository->getBookingById($refundData['booking_id']);
            if (!$booking) {
                throw new \Exception('Booking not found');
            }

            // Generate unique refund reference
            $refundReference = $this->generateRefundReference();

            // Determine refund type
            $refundType = $this->determineRefundType(
                $refundData['refund_amount'],
                $booking['total_amount']
            );

            // Prepare refund log data
            $logData = [
                'refund_reference' => $refundReference,
                'booking_id' => $refundData['booking_id'],
                'customer_user_id' => $booking['customer_user_id'],
                'requested_amount' => $refundData['refund_amount'],
                'approved_amount' => $refundData['refund_amount'],
                'processing_fee' => $refundData['processing_fee'] ?? 0.00,
                'net_refund_amount' => $refundData['refund_amount'],
                'refund_reason' => $refundData['refund_reason'],
                'refund_type' => $refundType,
                'status' => 'processed',
                'priority' => $refundData['priority'] ?? 'normal',
                'processed_by' => $refundData['admin_user_id'] ?? null,
                'admin_notes' => $refundData['admin_notes'] ?? null,
                'payment_system_reference' => $refundData['stripe_refund_id'] ?? null,
                'external_status' => $refundData['stripe_status'] ?? 'succeeded',
                'requested_at' => date('Y-m-d H:i:s'),
                'reviewed_at' => date('Y-m-d H:i:s'),
                'approved_at' => date('Y-m-d H:i:s'),
                'processed_at' => date('Y-m-d H:i:s'),
                'completed_at' => null, // Will be updated by webhook
            ];

            // Create refund log entry
            $refundLogId = $this->refundRepository->create($logData);

            $this->logger->info('Refund log created', [
                'refund_log_id' => $refundLogId,
                'refund_reference' => $refundReference,
                'booking_id' => $refundData['booking_id'],
                'amount' => $refundData['refund_amount']
            ]);

            // Return created entry
            return [
                'id' => $refundLogId,
                'refund_reference' => $refundReference,
                'status' => 'processed',
                'created_at' => date('Y-m-d H:i:s')
            ];

        } catch (\Exception $e) {
            $this->logger->error('Failed to create refund log', [
                'error' => $e->getMessage(),
                'booking_id' => $refundData['booking_id'] ?? null
            ]);
            throw $e;
        }
    }

    /**
     * Update refund log status
     *
     * @param int $refundLogId Refund log ID
     * @param string $status New status
     * @param array $additionalData Additional data to update
     * @return bool Success status
     */
    public function updateRefundStatus(int $refundLogId, string $status, array $additionalData = []): bool
    {
        try {
            $updateData = ['status' => $status];

            // Add timestamp based on status
            switch ($status) {
                case 'completed':
                    $updateData['completed_at'] = date('Y-m-d H:i:s');
                    break;
                case 'failed':
                    // Keep processed_at but don't set completed_at
                    break;
            }

            // Merge additional data
            $updateData = array_merge($updateData, $additionalData);

            $success = $this->refundRepository->update($refundLogId, $updateData);

            if ($success) {
                $this->logger->info('Refund log status updated', [
                    'refund_log_id' => $refundLogId,
                    'new_status' => $status
                ]);
            }

            return $success;

        } catch (\Exception $e) {
            $this->logger->error('Failed to update refund log status', [
                'refund_log_id' => $refundLogId,
                'status' => $status,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get refund logs with filtering and pagination
     *
     * @param array $filters Filter criteria
     * @param int $page Page number
     * @param int $perPage Items per page
     * @return array Refund logs and pagination info
     */
    public function getRefundLogs(array $filters, int $page = 1, int $perPage = 10): array
    {
        try {
            return $this->refundRepository->findWithFilters($filters, $page, $perPage);
        } catch (\Exception $e) {
            $this->logger->error('Failed to get refund logs', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            throw $e;
        }
    }

    /**
     * Get refund log by ID with all related data
     *
     * @param int $refundLogId Refund log ID
     * @return array|null Refund log with related data
     */
    public function getRefundById(int $refundLogId): ?array
    {
        try {
            return $this->refundRepository->findById($refundLogId);
        } catch (\Exception $e) {
            $this->logger->error('Failed to get refund log by ID', [
                'refund_log_id' => $refundLogId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get refund statistics
     *
     * @return array Statistics data
     */
    public function getRefundStatistics(): array
    {
        try {
            return $this->refundRepository->getStatistics();
        } catch (\Exception $e) {
            $this->logger->error('Failed to get refund statistics', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Generate unique refund reference
     *
     * @return string Unique refund reference
     */
    private function generateRefundReference(): string
    {
        $year = date('Y');
        $timestamp = time();
        $random = str_pad((string)rand(0, 9999), 4, '0', STR_PAD_LEFT);
        
        return "REF-{$year}-{$timestamp}{$random}";
    }

    /**
     * Determine refund type based on amounts
     *
     * @param float $refundAmount Refund amount
     * @param float $totalAmount Total booking amount
     * @return string Refund type (full, partial, processing_fee_only)
     */
    private function determineRefundType(float $refundAmount, float $totalAmount): string
    {
        if ($refundAmount >= $totalAmount) {
            return 'full';
        } elseif ($refundAmount > 0 && $refundAmount < $totalAmount) {
            return 'partial';
        }
        return 'full';
    }

    /**
     * Validate refund data
     *
     * @param array $refundData Refund data to validate
     * @throws \Exception If validation fails
     */
    private function validateRefundData(array $refundData): void
    {
        $required = ['booking_id', 'refund_amount', 'refund_reason'];
        
        foreach ($required as $field) {
            if (!isset($refundData[$field])) {
                throw new \Exception("Missing required field: {$field}");
            }
        }

        if ($refundData['refund_amount'] <= 0) {
            throw new \Exception('Refund amount must be greater than 0');
        }

        if (empty(trim($refundData['refund_reason']))) {
            throw new \Exception('Refund reason cannot be empty');
        }
    }
}
