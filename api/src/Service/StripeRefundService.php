<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Stripe\Stripe;
use Stripe\Refund;
use Stripe\Exception\ApiErrorException;
use Psr\Log\LoggerInterface;

/**
 * Stripe Refund Service
 * Handles refund operations through Stripe API
 */
class StripeRefundService
{
    private LoggerInterface $logger;
    private string $stripeSecretKey;
    private bool $stripeInitialized = false;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
        $this->stripeSecretKey = $_ENV['STRIPE_SECRET_KEY'] ?? '';
        
        // Only initialize Stripe if we have a valid (non-placeholder) secret key
        if (!empty($this->stripeSecretKey) && 
            $this->stripeSecretKey !== 'sk_test_51234567890abcdefghijklmnopqrstuvwxyz') {
            Stripe::setApiKey($this->stripeSecretKey);
            $this->stripeInitialized = true;
            
            // Set app info for Stripe
            Stripe::setAppInfo(
                "rondo-sports-booking",
                "1.0.0",
                "https://github.com/rondo-sports/booking-system"
            );
            
            $this->logger->info('Stripe Refund Service initialized successfully');
        } else {
            $this->logger->warning('Stripe Refund Service not initialized: Invalid or placeholder STRIPE_SECRET_KEY');
        }
    }

    /**
     * Check if Stripe is properly initialized
     */
    public function isInitialized(): bool
    {
        return $this->stripeInitialized;
    }

    /**
     * Process a refund through Stripe API
     * 
     * @param string $paymentIntentId Stripe Payment Intent ID (pi_xxx)
     * @param float|null $amount Amount to refund in dollars (null for full refund)
     * @param string $reason Refund reason (requested_by_customer, duplicate, fraudulent)
     * @param array $metadata Additional metadata to attach to the refund
     * @return array Refund details including refund_id, status, amount, etc.
     * @throws \Exception If Stripe is not initialized or refund fails
     */
    public function processRefund(
        string $paymentIntentId, 
        ?float $amount = null, 
        string $reason = 'requested_by_customer',
        array $metadata = []
    ): array {
        if (!$this->stripeInitialized) {
            throw new \Exception('Stripe is not properly configured. Please contact system administrator.');
        }

        // Validate payment intent ID format
        if (!preg_match('/^pi_[a-zA-Z0-9]+$/', $paymentIntentId)) {
            throw new \Exception('Invalid payment intent ID format');
        }

        // Validate reason
        $validReasons = ['requested_by_customer', 'duplicate', 'fraudulent'];
        if (!in_array($reason, $validReasons)) {
            throw new \Exception('Invalid refund reason. Must be one of: ' . implode(', ', $validReasons));
        }

        try {
            $refundParams = [
                'payment_intent' => $paymentIntentId,
                'reason' => $reason,
            ];

            // Add amount if partial refund (convert dollars to cents)
            if ($amount !== null) {
                if ($amount <= 0) {
                    throw new \Exception('Refund amount must be greater than 0');
                }
                $refundParams['amount'] = (int)round($amount * 100);
            }

            // Add metadata if provided
            if (!empty($metadata)) {
                $refundParams['metadata'] = $metadata;
            }

            $this->logger->info('Processing Stripe refund', [
                'payment_intent_id' => $paymentIntentId,
                'amount' => $amount,
                'amount_cents' => $refundParams['amount'] ?? 'full',
                'reason' => $reason,
                'metadata' => $metadata
            ]);

            // Create refund via Stripe API
            $refund = Refund::create($refundParams);

            $this->logger->info('Stripe refund successful', [
                'refund_id' => $refund->id,
                'status' => $refund->status,
                'amount' => $refund->amount / 100,
                'currency' => $refund->currency,
                'payment_intent' => $refund->payment_intent
            ]);

            return [
                'success' => true,
                'refund_id' => $refund->id,
                'status' => $refund->status,
                'amount' => $refund->amount / 100,
                'currency' => strtoupper($refund->currency),
                'created' => $refund->created,
                'reason' => $refund->reason,
                'payment_intent' => $refund->payment_intent,
                'metadata' => $refund->metadata->toArray()
            ];

        } catch (ApiErrorException $e) {
            $errorMessage = $e->getMessage();
            $errorCode = $e->getStripeCode();
            
            $this->logger->error('Stripe refund failed', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $errorMessage,
                'error_code' => $errorCode,
                'error_type' => $e->getError()->type ?? 'unknown'
            ]);

            // Provide user-friendly error messages
            $friendlyMessage = $this->getFriendlyErrorMessage($errorCode, $errorMessage);
            throw new \Exception($friendlyMessage);
            
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error during refund processing', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage()
            ]);
            
            throw new \Exception('Failed to process refund: ' . $e->getMessage());
        }
    }

    /**
     * Retrieve refund details from Stripe
     * 
     * @param string $refundId Stripe Refund ID (re_xxx)
     * @return array Refund details
     * @throws \Exception If Stripe is not initialized or retrieval fails
     */
    public function getRefund(string $refundId): array
    {
        if (!$this->stripeInitialized) {
            throw new \Exception('Stripe is not properly configured');
        }

        // Validate refund ID format
        if (!preg_match('/^re_[a-zA-Z0-9]+$/', $refundId)) {
            throw new \Exception('Invalid refund ID format');
        }

        try {
            $this->logger->info('Retrieving Stripe refund details', ['refund_id' => $refundId]);
            
            $refund = Refund::retrieve($refundId);
            
            return [
                'id' => $refund->id,
                'amount' => $refund->amount / 100,
                'currency' => strtoupper($refund->currency),
                'status' => $refund->status,
                'reason' => $refund->reason,
                'created' => $refund->created,
                'payment_intent' => $refund->payment_intent,
                'metadata' => $refund->metadata->toArray()
            ];
            
        } catch (ApiErrorException $e) {
            $this->logger->error('Failed to retrieve Stripe refund', [
                'refund_id' => $refundId,
                'error' => $e->getMessage()
            ]);
            
            throw new \Exception('Failed to retrieve refund details: ' . $e->getMessage());
        }
    }

    /**
     * List all refunds for a payment intent
     * 
     * @param string $paymentIntentId Stripe Payment Intent ID
     * @return array List of refunds
     * @throws \Exception If Stripe is not initialized or listing fails
     */
    public function listRefunds(string $paymentIntentId, int $limit = 10): array
    {
        if (!$this->stripeInitialized) {
            throw new \Exception('Stripe is not properly configured');
        }

        try {
            $this->logger->info('Listing Stripe refunds', [
                'payment_intent_id' => $paymentIntentId,
                'limit' => $limit
            ]);
            
            $refunds = Refund::all([
                'payment_intent' => $paymentIntentId,
                'limit' => $limit
            ]);
            
            $refundList = [];
            foreach ($refunds->data as $refund) {
                $refundList[] = [
                    'id' => $refund->id,
                    'amount' => $refund->amount / 100,
                    'currency' => strtoupper($refund->currency),
                    'status' => $refund->status,
                    'reason' => $refund->reason,
                    'created' => $refund->created
                ];
            }
            
            return $refundList;
            
        } catch (ApiErrorException $e) {
            $this->logger->error('Failed to list Stripe refunds', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage()
            ]);
            
            throw new \Exception('Failed to list refunds: ' . $e->getMessage());
        }
    }

    /**
     * Cancel a pending refund
     * Note: Only refunds with status 'pending' can be canceled
     * 
     * @param string $refundId Stripe Refund ID
     * @return array Canceled refund details
     * @throws \Exception If Stripe is not initialized or cancellation fails
     */
    public function cancelRefund(string $refundId): array
    {
        if (!$this->stripeInitialized) {
            throw new \Exception('Stripe is not properly configured');
        }

        try {
            $this->logger->info('Canceling Stripe refund', ['refund_id' => $refundId]);
            
            $refund = Refund::retrieve($refundId);
            $canceledRefund = $refund->cancel();
            
            $this->logger->info('Stripe refund canceled', [
                'refund_id' => $canceledRefund->id,
                'status' => $canceledRefund->status
            ]);
            
            return [
                'id' => $canceledRefund->id,
                'status' => $canceledRefund->status,
                'amount' => $canceledRefund->amount / 100,
                'currency' => strtoupper($canceledRefund->currency)
            ];
            
        } catch (ApiErrorException $e) {
            $this->logger->error('Failed to cancel Stripe refund', [
                'refund_id' => $refundId,
                'error' => $e->getMessage()
            ]);
            
            throw new \Exception('Failed to cancel refund: ' . $e->getMessage());
        }
    }

    /**
     * Get user-friendly error message based on Stripe error code
     * 
     * @param string|null $errorCode Stripe error code
     * @param string $originalMessage Original error message
     * @return string User-friendly error message
     */
    private function getFriendlyErrorMessage(?string $errorCode, string $originalMessage): string
    {
        $errorMessages = [
            'charge_already_refunded' => 'This payment has already been fully refunded.',
            'amount_too_large' => 'The refund amount exceeds the available balance for this payment.',
            'payment_intent_unexpected_state' => 'This payment cannot be refunded in its current state.',
            'resource_missing' => 'The payment could not be found. It may have been deleted or does not exist.',
            'invalid_request_error' => 'Invalid refund request. Please check the refund details and try again.',
            'api_error' => 'A temporary error occurred with the payment processor. Please try again.',
            'rate_limit_error' => 'Too many refund requests. Please wait a moment and try again.',
        ];

        return $errorMessages[$errorCode] ?? "Refund failed: {$originalMessage}";
    }

    /**
     * Validate if a payment can be refunded
     * 
     * @param string $paymentIntentId Payment Intent ID
     * @param float|null $amount Amount to refund (null for full refund)
     * @return array Validation result with 'valid' boolean and 'message' string
     */
    public function validateRefund(string $paymentIntentId, ?float $amount = null): array
    {
        if (!$this->stripeInitialized) {
            return [
                'valid' => false,
                'message' => 'Stripe is not properly configured'
            ];
        }

        try {
            // Get existing refunds for this payment intent
            $existingRefunds = $this->listRefunds($paymentIntentId);
            
            // Calculate total already refunded
            $totalRefunded = array_reduce($existingRefunds, function($sum, $refund) {
                return $sum + ($refund['status'] !== 'canceled' ? $refund['amount'] : 0);
            }, 0);

            // If amount is specified, check if it's valid
            if ($amount !== null) {
                if ($amount <= 0) {
                    return [
                        'valid' => false,
                        'message' => 'Refund amount must be greater than 0'
                    ];
                }
            }

            return [
                'valid' => true,
                'message' => 'Refund can be processed',
                'total_refunded' => $totalRefunded,
                'existing_refunds_count' => count($existingRefunds)
            ];

        } catch (\Exception $e) {
            return [
                'valid' => false,
                'message' => $e->getMessage()
            ];
        }
    }
}
