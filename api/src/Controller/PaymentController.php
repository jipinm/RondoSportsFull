<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use Stripe\Stripe;
use Stripe\Checkout\Session;
use Stripe\Event;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;
use XS2EventProxy\Exception\PaymentException;
use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Service\XS2EventBookingBridge;
use Psr\Log\LoggerInterface;

class PaymentController
{
    private BookingRepository $bookingRepository;
    private LoggerInterface $logger;
    private XS2EventBookingBridge $xs2eventBridge;
    private string $stripeSecretKey;
    private string $stripeWebhookSecret;
    private string $stripeCurrency;
    private string $domain;
    private bool $stripeInitialized = false;

    public function __construct(
        BookingRepository $bookingRepository,
        LoggerInterface $logger,
        XS2EventBookingBridge $xs2eventBridge
    ) {
        $this->bookingRepository = $bookingRepository;
        $this->logger = $logger;
        $this->xs2eventBridge = $xs2eventBridge;
        
        // Initialize Stripe configuration
        $this->stripeSecretKey = $_ENV['STRIPE_SECRET_KEY'] ?? '';
        $this->stripeWebhookSecret = $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '';
        $this->stripeCurrency = $_ENV['STRIPE_CURRENCY'] ?? 'USD';
        $this->domain = $_ENV['DOMAIN'] ?? $_ENV['APP_URL'] ?? 'https://apix2.redberries.ae/';
        
        // Only initialize Stripe if we have a valid (non-placeholder) secret key
        if (empty($this->stripeSecretKey) || $this->stripeSecretKey === 'sk_test_51234567890abcdefghijklmnopqrstuvwxyz') {
            $this->logger->warning('Stripe not initialized: Invalid or placeholder STRIPE_SECRET_KEY');
            return;
        }
        
        // Set Stripe API key
        Stripe::setApiKey($this->stripeSecretKey);
        $this->stripeInitialized = true;
        
        // Set app info for Stripe
        Stripe::setAppInfo(
            "rondo-sports-booking",
            "1.0.0",
            "https://github.com/rondo-sports/booking-system"
        );
    }

    /**
     * Create a Stripe Checkout Session for booking payment
     */
    public function createCheckoutSession(Request $request, Response $response): ResponseInterface
    {
        if (!$this->stripeInitialized) {
            return $this->errorResponse($response, 'Payment system not configured. Please contact support.', 503);
        }
        
        try {
            $data = $request->getParsedBody();
            
            // Validate required fields
            if (!isset($data['booking_id']) || !isset($data['total_amount'])) {
                return $this->errorResponse($response, 'Missing required fields: booking_id, total_amount', 400);
            }

            $bookingId = (int)$data['booking_id'];
            $totalAmount = (float)$data['total_amount'];
            $customerEmail = $data['customer_email'] ?? null;

            // Validate booking exists and is in correct state
            $booking = $this->bookingRepository->findById($bookingId);
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', 404);
            }

            if ($booking['payment_status'] === 'paid') {
                return $this->errorResponse($response, 'Booking already paid', 400);
            }

            // Convert amount to cents (Stripe requires amounts in smallest currency unit)
            $amountInCents = (int)($totalAmount * 100);

            // Use currency from booking data - no fallback
            if (empty($booking['currency'])) {
                return $this->errorResponse($response, 'Booking currency is required', 400);
            }
            $currency = $booking['currency'];

            $this->logger->info('Creating checkout session with currency', [
                'booking_id' => $bookingId,
                'currency_from_booking' => $booking['currency'],
                'currency_used' => $currency
            ]);

            // Create line items for the booking
            $lineItems = [[
                'price_data' => [
                    'currency' => strtolower($currency),
                    'product_data' => [
                        'name' => "Sports Event Booking #{$bookingId}",
                        'description' => $this->getBookingDescription($booking),
                    ],
                    'unit_amount' => $amountInCents,
                ],
                'quantity' => 1,
            ]];

            // Create Stripe Checkout Session
            $sessionData = [
                'payment_method_types' => ['card'],
                'line_items' => $lineItems,
                'mode' => 'payment',
                'success_url' => $this->domain . '/payment/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $this->domain . '/payment/cancel?booking_id=' . $bookingId,
                'metadata' => [
                    'booking_id' => (string)$bookingId,
                    'customer_id' => (string)$booking['customer_id'],
                ],
                'expires_at' => time() + 1800, // 30 minutes expiration
            ];

            // Add customer email if provided
            if ($customerEmail) {
                $sessionData['customer_email'] = $customerEmail;
            }

            // Create the session
            $checkoutSession = Session::create($sessionData);

            // Update booking with Stripe session ID
            $this->bookingRepository->update($bookingId, [
                'stripe_session_id' => $checkoutSession->id,
                'payment_status' => 'pending',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $this->logger->info('Stripe checkout session created', [
                'booking_id' => $bookingId,
                'session_id' => $checkoutSession->id,
                'amount' => $totalAmount
            ]);

            // Return the session URL
            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'checkout_url' => $checkoutSession->url,
                    'session_id' => $checkoutSession->id
                ]
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Failed to create checkout session');
        }
    }

    /**
     * Create a Stripe Payment Intent for embedded iframe payments
     */
    public function createPaymentIntent(Request $request, Response $response): ResponseInterface
    {
        if (!$this->stripeInitialized) {
            return $this->errorResponse($response, 'Payment system not configured. Please contact support.', 503);
        }
        
        try {
            $data = $request->getParsedBody();
            
            // Validate required fields - booking_id is now optional (booking created after payment)
            if (!isset($data['total_amount'])) {
                return $this->errorResponse($response, 'Missing required field: total_amount', 400);
            }

            $bookingId = isset($data['booking_id']) ? (int)$data['booking_id'] : null;
            $totalAmount = (float)$data['total_amount'];
            $customerEmail = $data['customer_email'] ?? null;
            $currency = $data['currency'] ?? null; // Accept currency from request

            // Only validate booking if booking_id is provided
            $booking = null;
            if ($bookingId) {
                $booking = $this->bookingRepository->findById($bookingId);
                
                if (!$booking) {
                    return $this->errorResponse($response, 'Booking not found', 404);
                }

                // Check if already paid
                if ($booking['payment_status'] === 'completed') {
                    return $this->errorResponse($response, 'Booking already paid', 400);
                }
                
                // Use currency from booking if not provided in request
                if (!$currency) {
                    if (empty($booking['currency'])) {
                        return $this->errorResponse($response, 'Booking currency is required', 400);
                    }
                    $currency = $booking['currency'];
                }
            } else {
                // No booking yet - currency must be provided in request
                if (!$currency) {
                    return $this->errorResponse($response, 'Currency is required for payment', 400);
                }
            }

            // Convert amount to cents (Stripe requires amounts in smallest currency unit)
            $amountInCents = (int)($totalAmount * 100);

            $this->logger->info('Creating payment intent', [
                'booking_id' => $bookingId ?? 'not_yet_created',
                'currency_from_booking' => $booking['currency'] ?? 'not_available',
                'currency_from_request' => $data['currency'] ?? 'not_provided',
                'currency_used' => $currency
            ]);

            // Create Payment Intent data
            $paymentIntentData = [
                'amount' => $amountInCents,
                'currency' => strtolower($currency),
                'metadata' => [],
                'description' => "Sports Event Booking" . ($bookingId ? " #{$bookingId}" : ""),
            ];

            // Add booking metadata if available
            if ($booking) {
                $paymentIntentData['metadata'] = [
                    'booking_id' => (string)$bookingId,
                    'customer_id' => (string)$booking['customer_user_id'],
                ];
                $paymentIntentData['description'] = "Sports Event Booking #{$bookingId}: " . $this->getBookingDescription($booking);
            }

            // Add customer email if provided
            if ($customerEmail) {
                $paymentIntentData['receipt_email'] = $customerEmail;
            }

            // Create the Payment Intent
            $paymentIntent = \Stripe\PaymentIntent::create($paymentIntentData);

            // Only update booking if booking_id was provided
            if ($bookingId && $booking) {
                $this->bookingRepository->update($bookingId, [
                    'payment_intent_id' => $paymentIntent->id,
                    'payment_status' => 'pending',
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }

            $this->logger->info('Stripe payment intent created', [
                'booking_id' => $bookingId ?? 'not_yet_created',
                'payment_intent_id' => $paymentIntent->id,
                'amount' => $totalAmount,
                'currency' => $currency
            ]);

            // Return the client secret
            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'client_secret' => $paymentIntent->client_secret,
                    'payment_intent_id' => $paymentIntent->id
                ]
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Failed to create payment intent');
        }
    }

    /**
     * Retrieve Stripe Checkout Session details
     */
    public function getCheckoutSession(Request $request, Response $response, array $args): ResponseInterface
    {
        if (!$this->stripeInitialized) {
            return $this->errorResponse($response, 'Payment system not configured. Please contact support.', 503);
        }
        
        try {
            $sessionId = $args['session_id'] ?? '';
            
            if (empty($sessionId)) {
                return $this->errorResponse($response, 'Session ID is required', 400);
            }

            // Retrieve session from Stripe
            $session = Session::retrieve($sessionId);
            
            // Get booking ID from metadata
            $bookingId = $session->metadata['booking_id'] ?? null;
            
            if (!$bookingId) {
                return $this->errorResponse($response, 'Invalid session metadata', 400);
            }

            // Update booking status based on payment status
            if ($session->payment_status === 'paid') {
                $this->bookingRepository->update((int)$bookingId, [
                    'payment_status' => 'paid',
                    'payment_intent_id' => $session->payment_intent,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'session_id' => $session->id,
                    'payment_status' => $session->payment_status,
                    'booking_id' => $bookingId,
                    'amount_total' => $session->amount_total,
                    'currency' => $session->currency,
                    'customer_email' => $session->customer_details->email ?? null
                ]
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Failed to retrieve session');
        }
    }

    /**
     * Handle Stripe webhook events
     */
    public function handleWebhook(Request $request, Response $response): ResponseInterface
    {
        if (!$this->stripeInitialized) {
            return $this->errorResponse($response, 'Payment system not configured. Please contact support.', 503);
        }
        
        try {
            $payload = $request->getBody()->getContents();
            $sigHeader = $request->getHeaderLine('Stripe-Signature');

            // Verify webhook signature
            try {
                $event = Webhook::constructEvent(
                    $payload,
                    $sigHeader,
                    $this->stripeWebhookSecret
                );
            } catch (SignatureVerificationException $e) {
                $this->logger->error('Webhook signature verification failed', [
                    'error' => $e->getMessage()
                ]);
                return $this->errorResponse($response, 'Webhook signature verification failed', 400);
            }

            $this->logger->info('Webhook received', [
                'event_type' => $event->type,
                'event_id' => $event->id
            ]);

            // Handle the event
            switch ($event->type) {
                case 'checkout.session.completed':
                    $this->handleCheckoutSessionCompleted($event->data->object);
                    break;
                
                case 'payment_intent.succeeded':
                    $this->handlePaymentIntentSucceeded($event->data->object);
                    break;
                
                case 'payment_intent.payment_failed':
                    $this->handlePaymentIntentFailed($event->data->object);
                    break;
                
                default:
                    $this->logger->info('Unhandled webhook event', [
                        'event_type' => $event->type
                    ]);
            }

            $response->getBody()->write(json_encode(['received' => true]));
            return $response->withStatus(200)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Webhook handling failed');
        }
    }

    /**
     * Handle successful checkout session completion
     */
    private function handleCheckoutSessionCompleted($session): void
    {
        $bookingId = $session->metadata['booking_id'] ?? null;
        
        if (!$bookingId) {
            $this->logger->warning('Checkout session completed without booking_id', [
                'session_id' => $session->id
            ]);
            return;
        }

        // Update payment gateway data
        $paymentGatewayData = [
            'stripe_payment_method_id' => $session->payment_method ?? null,
            'stripe_customer_id' => $session->customer ?? null,
            'stripe_charge_id' => null, // Will be populated in payment_intent.succeeded
            'payment_gateway_response' => json_encode($session),
            'payment_gateway_fee' => null, // Can be calculated if needed
            'payment_completed_at' => date('Y-m-d H:i:s', $session->created ?? time())
        ];
        
        $this->bookingRepository->updatePaymentGatewayData((int)$bookingId, $paymentGatewayData);

        $this->bookingRepository->update((int)$bookingId, [
            'payment_status' => 'paid',
            'payment_intent_id' => $session->payment_intent,
            'stripe_session_id' => $session->id,
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        $this->logger->info('Booking payment completed', [
            'booking_id' => $bookingId,
            'session_id' => $session->id,
            'amount' => $session->amount_total / 100
        ]);

        // Trigger XS2Event booking creation (async, non-blocking)
        try {
            $this->xs2eventBridge->processBookingAfterPayment((int)$bookingId);
        } catch (\Exception $e) {
            $this->logger->error('XS2Event booking creation failed after payment', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage()
            ]);
            // Don't fail the payment flow - booking is already paid
        }
    }

    /**
     * Handle successful payment intent
     */
    private function handlePaymentIntentSucceeded($paymentIntent): void
    {
        $bookingId = $paymentIntent->metadata['booking_id'] ?? null;
        
        if ($bookingId) {
            // Update payment gateway data with full details
            $paymentGatewayData = [
                'stripe_payment_method_id' => $paymentIntent->payment_method ?? null,
                'stripe_customer_id' => $paymentIntent->customer ?? null,
                'stripe_charge_id' => $paymentIntent->latest_charge ?? null,
                'payment_gateway_response' => json_encode($paymentIntent),
                'payment_gateway_fee' => $this->calculateStripeFee($paymentIntent),
                'payment_completed_at' => date('Y-m-d H:i:s', $paymentIntent->created ?? time())
            ];
            
            $this->bookingRepository->updatePaymentGatewayData((int)$bookingId, $paymentGatewayData);
            
            // Update booking payment status to completed
            $this->bookingRepository->update((int)$bookingId, [
                'payment_status' => 'completed',
                'status' => 'confirmed',
                'payment_reference' => $paymentIntent->id,
                'confirmed_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            
            $this->logger->info('Booking payment completed via webhook', [
                'booking_id' => $bookingId,
                'payment_intent_id' => $paymentIntent->id,
                'amount' => $paymentIntent->amount / 100
            ]);
            
            // Trigger XS2Event booking creation (async, non-blocking)
            try {
                $this->xs2eventBridge->processBookingAfterPayment((int)$bookingId);
            } catch (\Exception $e) {
                $this->logger->error('XS2Event booking creation failed after payment', [
                    'booking_id' => $bookingId,
                    'error' => $e->getMessage()
                ]);
                // Don't fail the payment flow - booking is already paid
            }
        } else {
            $this->logger->warning('Payment intent succeeded but no booking ID in metadata', [
                'payment_intent_id' => $paymentIntent->id
            ]);
        }
    }

    /**
     * Calculate Stripe processing fee (approximate)
     */
    private function calculateStripeFee($paymentIntent): ?float
    {
        try {
            $amount = $paymentIntent->amount ?? 0;
            // Standard Stripe fee: 2.9% + $0.30
            return round(($amount * 0.029 + 30) / 100, 2);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Handle failed payment intent
     */
    private function handlePaymentIntentFailed($paymentIntent): void
    {
        $bookingId = $paymentIntent->metadata['booking_id'] ?? null;
        
        if ($bookingId) {
            // Update booking payment status to failed
            $this->bookingRepository->update((int)$bookingId, [
                'payment_status' => 'failed',
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            
            $this->logger->warning('Booking payment failed via webhook', [
                'booking_id' => $bookingId,
                'payment_intent_id' => $paymentIntent->id,
                'failure_reason' => $paymentIntent->last_payment_error->message ?? 'Unknown'
            ]);
        } else {
            $this->logger->warning('Payment intent failed but no booking ID in metadata', [
                'payment_intent_id' => $paymentIntent->id
            ]);
        }
    }

    /**
     * Get booking description for Stripe
     */
    private function getBookingDescription($booking): string
    {
        // You can customize this based on your booking data structure
        return "Sports event booking for {$booking['event_name']} on {$booking['event_date']}";
    }

    /**
     * Handle exceptions
     */
    private function handleException(Response $response, \Exception $e, string $context): ResponseInterface
    {
        $this->logger->error($context, [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return $this->errorResponse($response, 'Internal server error', 500);
    }

    /**
     * Return error response
     */
    private function errorResponse(Response $response, string $message, int $statusCode): ResponseInterface
    {
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message,
            'code' => $statusCode
        ], JSON_PRETTY_PRINT));

        return $response->withStatus($statusCode)->withHeader('Content-Type', 'application/json');
    }
}