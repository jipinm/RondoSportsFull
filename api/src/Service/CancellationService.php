<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use XS2EventProxy\Repository\CancellationRequestRepository;
use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Exception\ApiException;
use Psr\Log\LoggerInterface;
use DateTime;

class CancellationService
{
    private CancellationRequestRepository $cancellationRepository;
    private BookingRepository $bookingRepository;
    private LoggerInterface $logger;

    // Configurable cancellation policy (days before event)
    private const FULL_REFUND_DAYS = 30;
    private const PARTIAL_REFUND_DAYS = 15;
    private const PARTIAL_REFUND_PERCENTAGE = 50;

    public function __construct(
        CancellationRequestRepository $cancellationRepository,
        BookingRepository $bookingRepository,
        LoggerInterface $logger
    ) {
        $this->cancellationRepository = $cancellationRepository;
        $this->bookingRepository = $bookingRepository;
        $this->logger = $logger;
    }

    /**
     * Request cancellation for a booking
     * 
     * @param int $bookingId Booking ID
     * @param int $customerUserId Customer user ID
     * @param string $cancellationReason Reason for cancellation
     * @param string|null $customerNotes Additional notes
     * @return array Created cancellation request
     */
    public function requestCancellation(
        int $bookingId,
        int $customerUserId,
        string $cancellationReason,
        ?string $customerNotes = null
    ): array {
        try {
            $this->logger->info('Processing cancellation request', [
                'booking_id' => $bookingId,
                'customer_user_id' => $customerUserId
            ]);

            // Check if booking exists and belongs to customer
            $booking = $this->bookingRepository->getBookingById($bookingId);
            if (!$booking) {
                throw new ApiException('Booking not found', 404);
            }

            if ((int)$booking['customer_user_id'] !== $customerUserId) {
                throw new ApiException('Unauthorized: Booking does not belong to this customer', 403);
            }

            // Check eligibility
            $eligibility = $this->validateCancellationEligibility($bookingId);
            if (!$eligibility['eligible']) {
                throw new ApiException($eligibility['reason'], 400);
            }

            // Check for existing active cancellation request
            if ($this->cancellationRepository->hasActiveCancellationRequest($bookingId)) {
                throw new ApiException('An active cancellation request already exists for this booking', 400);
            }

            // Create cancellation request
            $requestId = $this->cancellationRepository->create([
                'booking_id' => $bookingId,
                'customer_user_id' => $customerUserId,
                'cancellation_reason' => $cancellationReason,
                'customer_notes' => $customerNotes,
                'status' => 'pending'
            ]);

            // Update booking cancellation status
            $this->bookingRepository->updateCancellationStatus($bookingId, 'requested', null);

            // Get the created request
            $request = $this->cancellationRepository->getById($requestId);

            $this->logger->info('Cancellation request created successfully', [
                'request_id' => $requestId,
                'booking_id' => $bookingId
            ]);

            // TODO: Send email notifications
            // $this->sendCustomerConfirmationEmail($request);
            // $this->sendAdminNotificationEmail($request);

            return [
                'success' => true,
                'message' => 'Cancellation request submitted successfully',
                'data' => [
                    'request_id' => $requestId,
                    'booking_id' => $bookingId,
                    'status' => 'pending',
                    'request_date' => $request['request_date'],
                    'cancellation_reason' => $cancellationReason
                ]
            ];

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Failed to create cancellation request', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId
            ]);
            throw new ApiException('Failed to create cancellation request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get cancellation request for a booking
     * 
     * @param int $bookingId Booking ID
     * @param int $customerUserId Customer user ID (for authorization)
     * @return array|null Cancellation request data
     */
    public function getCancellationRequest(int $bookingId, int $customerUserId): ?array
    {
        try {
            // Verify booking ownership
            $booking = $this->bookingRepository->getBookingById($bookingId);
            if (!$booking) {
                throw new ApiException('Booking not found', 404);
            }

            if ((int)$booking['customer_user_id'] !== $customerUserId) {
                throw new ApiException('Unauthorized: Booking does not belong to this customer', 403);
            }

            $request = $this->cancellationRepository->getByBookingId($bookingId);

            if (!$request) {
                return null;
            }

            return [
                'request_id' => (int)$request['id'],
                'booking_id' => (int)$request['booking_id'],
                'status' => $request['status'],
                'request_date' => $request['request_date'],
                'cancellation_reason' => $request['cancellation_reason'],
                'customer_notes' => $request['customer_notes'],
                'admin_notes' => $request['admin_notes'],
                'reviewed_date' => $request['reviewed_date'],
                'refund_amount' => $request['refund_amount'] ? (float)$request['refund_amount'] : null,
                'refund_status' => $request['refund_status']
            ];

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Failed to get cancellation request', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId
            ]);
            throw new ApiException('Failed to get cancellation request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel a cancellation request (customer cancels their own request)
     * 
     * @param int $bookingId Booking ID
     * @param int $customerUserId Customer user ID
     * @return array Success response
     */
    public function cancelRequest(int $bookingId, int $customerUserId): array
    {
        try {
            // Verify booking ownership
            $booking = $this->bookingRepository->getBookingById($bookingId);
            if (!$booking) {
                throw new ApiException('Booking not found', 404);
            }

            if ((int)$booking['customer_user_id'] !== $customerUserId) {
                throw new ApiException('Unauthorized: Booking does not belong to this customer', 403);
            }

            $request = $this->cancellationRepository->getByBookingId($bookingId);
            if (!$request) {
                throw new ApiException('Cancellation request not found', 404);
            }

            if ($request['status'] !== 'pending') {
                throw new ApiException('Can only cancel pending requests', 400);
            }

            // Update request status to cancelled
            $this->cancellationRepository->updateStatus((int)$request['id'], 'cancelled');

            // Update booking cancellation status back to none
            $this->bookingRepository->updateCancellationStatus($bookingId, 'none', null);

            $this->logger->info('Cancellation request cancelled by customer', [
                'request_id' => $request['id'],
                'booking_id' => $bookingId
            ]);

            return [
                'success' => true,
                'message' => 'Cancellation request cancelled successfully'
            ];

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Failed to cancel cancellation request', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId
            ]);
            throw new ApiException('Failed to cancel cancellation request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve a cancellation request (admin action)
     * 
     * @param int $requestId Request ID
     * @param int $adminUserId Admin user ID
     * @param float|null $refundAmount Refund amount
     * @param string|null $adminNotes Admin notes
     * @return array Success response
     */
    public function approveCancellation(
        int $requestId,
        int $adminUserId,
        ?float $refundAmount = null,
        ?string $adminNotes = null
    ): array {
        try {
            $request = $this->cancellationRepository->getById($requestId);
            if (!$request) {
                throw new ApiException('Cancellation request not found', 404);
            }

            if ($request['status'] !== 'pending') {
                throw new ApiException('Can only approve pending requests', 400);
            }

            $bookingId = (int)$request['booking_id'];

            // Calculate refund amount if not provided
            if ($refundAmount === null) {
                $refundAmount = $this->calculateRefundAmount($bookingId);
            }

            // Update cancellation request
            $this->cancellationRepository->update($requestId, [
                'status' => 'approved',
                'admin_user_id' => $adminUserId,
                'admin_notes' => $adminNotes,
                'reviewed_date' => date('Y-m-d H:i:s'),
                'refund_amount' => $refundAmount,
                'refund_status' => $refundAmount > 0 ? 'pending' : 'not_applicable'
            ]);

            // Update booking cancellation status
            $this->bookingRepository->updateCancellationStatus($bookingId, 'approved', null);

            $this->logger->info('Cancellation request approved', [
                'request_id' => $requestId,
                'booking_id' => $bookingId,
                'admin_user_id' => $adminUserId,
                'refund_amount' => $refundAmount
            ]);

            // TODO: Send email notification to customer
            // $this->sendApprovalEmail($request);

            return [
                'success' => true,
                'message' => 'Cancellation request approved successfully',
                'data' => [
                    'request_id' => $requestId,
                    'status' => 'approved',
                    'refund_amount' => $refundAmount
                ]
            ];

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Failed to approve cancellation request', [
                'error' => $e->getMessage(),
                'request_id' => $requestId
            ]);
            throw new ApiException('Failed to approve cancellation request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Decline a cancellation request (admin action)
     * 
     * @param int $requestId Request ID
     * @param int $adminUserId Admin user ID
     * @param string $adminNotes Reason for declining
     * @return array Success response
     */
    public function rejectCancellation(
        int $requestId,
        int $adminUserId,
        string $adminNotes
    ): array {
        try {
            $request = $this->cancellationRepository->getById($requestId);
            if (!$request) {
                throw new ApiException('Cancellation request not found', 404);
            }

            if ($request['status'] !== 'pending') {
                throw new ApiException('Can only decline pending requests', 400);
            }

            $bookingId = (int)$request['booking_id'];

            // Update cancellation request
            $this->cancellationRepository->update($requestId, [
                'status' => 'declined',
                'admin_user_id' => $adminUserId,
                'admin_notes' => $adminNotes,
                'reviewed_date' => date('Y-m-d H:i:s')
            ]);

            // Update booking cancellation status to declined
            $this->bookingRepository->updateCancellationStatus($bookingId, 'declined', date('Y-m-d H:i:s'));

            $this->logger->info('Cancellation request declined', [
                'request_id' => $requestId,
                'booking_id' => $bookingId,
                'admin_user_id' => $adminUserId
            ]);

            // TODO: Send email notification to customer
            // $this->sendDeclineEmail($request);

            return [
                'success' => true,
                'message' => 'Cancellation request declined',
                'data' => [
                    'request_id' => $requestId,
                    'status' => 'declined'
                ]
            ];

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Failed to decline cancellation request', [
                'error' => $e->getMessage(),
                'request_id' => $requestId
            ]);
            throw new ApiException('Failed to decline cancellation request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Mark cancellation as completed (admin action)
     * 
     * @param int $requestId Request ID
     * @param int $adminUserId Admin user ID
     * @param string|null $refundReference Refund reference number
     * @param string|null $adminNotes Additional notes
     * @return array Success response
     */
    public function completeCancellation(
        int $requestId,
        int $adminUserId,
        ?string $refundReference = null,
        ?string $adminNotes = null
    ): array {
        try {
            $request = $this->cancellationRepository->getById($requestId);
            if (!$request) {
                throw new ApiException('Cancellation request not found', 404);
            }

            if ($request['status'] !== 'approved') {
                throw new ApiException('Can only complete approved requests', 400);
            }

            $bookingId = (int)$request['booking_id'];

            // Update cancellation request
            $updateData = [
                'status' => 'completed',
                'completed_date' => date('Y-m-d H:i:s')
            ];

            if ($refundReference) {
                $updateData['refund_reference'] = $refundReference;
                $updateData['refund_status'] = 'processed';
                $updateData['refund_date'] = date('Y-m-d H:i:s');
            }

            if ($adminNotes) {
                $updateData['admin_notes'] = $request['admin_notes'] 
                    ? $request['admin_notes'] . "\n\n" . $adminNotes 
                    : $adminNotes;
            }

            $this->cancellationRepository->update($requestId, $updateData);

            // Update booking status to cancelled
            $this->bookingRepository->updateCancellationStatus($bookingId, 'cancelled', date('Y-m-d H:i:s'));
            $this->bookingRepository->update($bookingId, ['status' => 'cancelled']);

            $this->logger->info('Cancellation completed', [
                'request_id' => $requestId,
                'booking_id' => $bookingId,
                'admin_user_id' => $adminUserId,
                'refund_reference' => $refundReference
            ]);

            // TODO: Send email notification to customer
            // $this->sendCompletionEmail($request);

            return [
                'success' => true,
                'message' => 'Cancellation completed successfully',
                'data' => [
                    'request_id' => $requestId,
                    'status' => 'completed',
                    'booking_id' => $bookingId
                ]
            ];

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Failed to complete cancellation', [
                'error' => $e->getMessage(),
                'request_id' => $requestId
            ]);
            throw new ApiException('Failed to complete cancellation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Validate if booking is eligible for cancellation
     * 
     * @param int $bookingId Booking ID
     * @return array Eligibility status
     */
    public function validateCancellationEligibility(int $bookingId): array
    {
        return $this->bookingRepository->checkCancellationEligibility($bookingId);
    }

    /**
     * Calculate refund amount based on cancellation policy
     * 
     * @param int $bookingId Booking ID
     * @return float Refund amount
     */
    public function calculateRefundAmount(int $bookingId): float
    {
        try {
            $booking = $this->bookingRepository->getBookingById($bookingId);
            if (!$booking) {
                return 0.0;
            }

            $totalAmount = (float)$booking['total_amount'];
            
            // If no event date, return full refund
            if (empty($booking['event_date'])) {
                return $totalAmount;
            }

            $eventDate = new DateTime($booking['event_date']);
            $now = new DateTime();
            $daysUntilEvent = $now->diff($eventDate)->days;

            // Full refund if more than FULL_REFUND_DAYS before event
            if ($daysUntilEvent >= self::FULL_REFUND_DAYS) {
                return $totalAmount;
            }

            // Partial refund if between PARTIAL_REFUND_DAYS and FULL_REFUND_DAYS
            if ($daysUntilEvent >= self::PARTIAL_REFUND_DAYS) {
                return $totalAmount * (self::PARTIAL_REFUND_PERCENTAGE / 100);
            }

            // No refund if less than PARTIAL_REFUND_DAYS
            return 0.0;

        } catch (\Exception $e) {
            $this->logger->error('Failed to calculate refund amount', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId
            ]);
            return 0.0;
        }
    }

    /**
     * Get cancellation statistics
     * 
     * @return array Statistics
     */
    public function getStatistics(): array
    {
        try {
            return $this->cancellationRepository->getStatistics();
        } catch (\Exception $e) {
            $this->logger->error('Failed to get cancellation statistics', [
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to get statistics: ' . $e->getMessage(), 500);
        }
    }
}
