<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Exception\ApiException;

/**
 * XS2Event Booking Bridge Service
 * 
 * Bridges local bookings with XS2Event API system.
 * Handles the complete flow: Reservation → Guest Data → Booking → Tickets
 */
class XS2EventBookingBridge
{
    private const MAX_SYNC_ATTEMPTS = 3;
    private const SYNC_RETRY_DELAY = 5; // seconds

    public function __construct(
        private LoggerInterface $logger,
        private BookingRepository $bookingRepository,
        private Client $httpClient,
        private string $xs2eventBaseUrl,
        private string $xs2eventApiKey
    ) {
        $this->xs2eventBaseUrl = rtrim($xs2eventBaseUrl, '/');
    }

    /**
     * Main entry point: Process booking after successful payment
     * 
     * @param int $localBookingId Local database booking ID
     * @return array XS2Event booking data
     * @throws ApiException
     */
    public function processBookingAfterPayment(int $localBookingId): array
    {
        $this->logger->info('Starting XS2Event booking process', [
            'booking_id' => $localBookingId
        ]);

        try {
            // Get local booking data
            $booking = $this->bookingRepository->getBookingById($localBookingId);
            
            if (!$booking) {
                throw new ApiException('Booking not found', 404);
            }

            // Check if already synced
            if (!empty($booking['api_booking_id'])) {
                $this->logger->warning('Booking already synced with XS2Event', [
                    'booking_id' => $localBookingId,
                    'api_booking_id' => $booking['api_booking_id']
                ]);
                return ['api_booking_id' => $booking['api_booking_id'], 'status' => 'already_synced'];
            }

            // Update sync attempts
            $syncAttempts = (int)($booking['xs2event_sync_attempts'] ?? 0) + 1;
            $this->bookingRepository->updateXS2EventSyncAttempt($localBookingId, $syncAttempts);

            // Check if reservation was already created during checkout
            $reservationId = $booking['api_reservation_id'] ?? null;
            
            if (!$reservationId) {
                // Fallback: Create XS2Event Reservation (old flow - shouldn't happen normally)
                $this->logger->warning('No reservation ID found, creating new reservation', [
                    'booking_id' => $localBookingId
                ]);
                $reservationData = $this->createXS2EventReservation($booking);
                $reservationId = $reservationData['reservation_id'] ?? null;

                if (!$reservationId) {
                    throw new ApiException('Failed to create XS2Event reservation', 500);
                }

                $this->logger->info('XS2Event reservation created', [
                    'booking_id' => $localBookingId,
                    'reservation_id' => $reservationId
                ]);

                // Submit guest data to XS2Event
                $guestDataResult = $this->submitGuestDataToXS2Event($reservationId, $booking);

                $this->logger->info('Guest data submitted to XS2Event', [
                    'booking_id' => $localBookingId,
                    'reservation_id' => $reservationId
                ]);
            } else {
                $this->logger->info('Using existing reservation ID from checkout', [
                    'booking_id' => $localBookingId,
                    'reservation_id' => $reservationId
                ]);
            }

            // Create XS2Event Booking from reservation
            $xs2eventBooking = $this->createXS2EventBooking($reservationId, $booking);
            $apiBookingId = $xs2eventBooking['booking_id'] ?? null;

            if (!$apiBookingId) {
                throw new ApiException('Failed to create XS2Event booking', 500);
            }

            $this->logger->info('XS2Event booking created successfully', [
                'booking_id' => $localBookingId,
                'api_booking_id' => $apiBookingId
            ]);

            // Step 4: Update local booking with XS2Event data
            $this->updateLocalBookingWithXS2EventData($localBookingId, $xs2eventBooking);

            return [
                'success' => true,
                'api_booking_id' => $apiBookingId,
                'reservation_id' => $reservationId,
                'xs2event_data' => $xs2eventBooking
            ];

        } catch (ApiException $e) {
            $this->logger->error('XS2Event booking process failed', [
                'booking_id' => $localBookingId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Store error in database
            $this->bookingRepository->updateXS2EventError($localBookingId, $e->getMessage());

            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in XS2Event booking process', [
                'booking_id' => $localBookingId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->bookingRepository->updateXS2EventError($localBookingId, $e->getMessage());

            throw new ApiException('XS2Event booking process failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create XS2Event reservation
     * 
     * @param array $bookingData Local booking data
     * @return array Reservation response from XS2Event
     */
    public function createXS2EventReservation(array $bookingData): array
    {
        try {
            $reservationPayload = $this->buildReservationPayload($bookingData);

            $this->logger->debug('Creating XS2Event reservation', [
                'payload' => $reservationPayload
            ]);

            $response = $this->httpClient->post(
                $this->xs2eventBaseUrl . '/v1/reservations',
                [
                    'headers' => $this->getXS2EventHeaders(),
                    'json' => $reservationPayload,
                    'timeout' => 30
                ]
            );

            $responseData = json_decode($response->getBody()->getContents(), true);

            $this->logger->info('XS2Event reservation created', [
                'reservation_id' => $responseData['reservation_id'] ?? 'unknown',
                'response' => $responseData
            ]);

            return $responseData;

        } catch (RequestException $e) {
            $errorBody = $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : '';
            
            $this->logger->error('Failed to create XS2Event reservation', [
                'error' => $e->getMessage(),
                'response_body' => $errorBody
            ]);

            throw new ApiException('XS2Event reservation creation failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Submit guest data to XS2Event
     * 
     * @param string $reservationId XS2Event reservation ID
     * @param array $bookingData Local booking data
     * @return array Guest data submission response
     */
    public function submitGuestDataToXS2Event(string $reservationId, array $bookingData): array
    {
        try {
            $guestPayload = $this->buildGuestDataPayload($bookingData);

            $this->logger->debug('Submitting guest data to XS2Event', [
                'reservation_id' => $reservationId,
                'payload' => $guestPayload
            ]);

            $response = $this->httpClient->post(
                $this->xs2eventBaseUrl . '/v1/reservations/' . urlencode($reservationId) . '/guests',
                [
                    'headers' => $this->getXS2EventHeaders(),
                    'json' => $guestPayload,
                    'timeout' => 30
                ]
            );

            $responseData = json_decode($response->getBody()->getContents(), true);

            $this->logger->info('Guest data submitted successfully', [
                'reservation_id' => $reservationId
            ]);

            return $responseData;

        } catch (RequestException $e) {
            $errorBody = $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : '';
            
            $this->logger->error('Failed to submit guest data', [
                'reservation_id' => $reservationId,
                'error' => $e->getMessage(),
                'response_body' => $errorBody
            ]);

            throw new ApiException('Guest data submission failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create XS2Event booking from reservation
     * 
     * @param string $reservationId XS2Event reservation ID
     * @param array $bookingData Local booking data
     * @return array Booking response from XS2Event
     */
    public function createXS2EventBooking(string $reservationId, array $bookingData): array
    {
        try {
            $bookingPayload = $this->buildBookingPayload($reservationId, $bookingData);

            $this->logger->info('Creating XS2Event booking', [
                'reservation_id' => $reservationId,
                'payload' => $bookingPayload
            ]);

            $response = $this->httpClient->post(
                $this->xs2eventBaseUrl . '/v1/bookings',
                [
                    'headers' => $this->getXS2EventHeaders(),
                    'json' => $bookingPayload,
                    'timeout' => 30
                ]
            );

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();
            $responseData = json_decode($responseBody, true);

            $this->logger->info('XS2Event booking API response', [
                'status_code' => $statusCode,
                'booking_id' => $responseData['booking_id'] ?? 'NOT_FOUND',
                'booking_code' => $responseData['booking_code'] ?? 'NOT_FOUND',
                'reservation_id' => $reservationId,
                'full_response' => $responseData
            ]);

            return $responseData;

        } catch (RequestException $e) {
            $statusCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 'NO_RESPONSE';
            $errorBody = $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : 'No response body';
            
            $this->logger->error('XS2Event booking creation failed', [
                'reservation_id' => $reservationId,
                'status_code' => $statusCode,
                'error_message' => $e->getMessage(),
                'error_response' => $errorBody,
                'request_payload' => $bookingPayload ?? 'Not available'
            ]);

            throw new ApiException('XS2Event booking creation failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update local booking with XS2Event data
     * 
     * @param int $localBookingId Local booking ID
     * @param array $xs2eventData XS2Event booking response data
     */
    public function updateLocalBookingWithXS2EventData(int $localBookingId, array $xs2eventData): void
    {
        try {
            // Extract fields from XS2Event response (based on official documentation)
            $apiBookingId = $xs2eventData['booking_id'] ?? null;
            $bookingCode = $xs2eventData['booking_code'] ?? null;
            $financialStatus = $xs2eventData['financial_status'] ?? 'OPEN';
            $logisticStatus = $xs2eventData['logistic_status'] ?? 'COMPLETED';
            
            // Note: distribution_channel is NOT in XS2Event response
            // We default to 'eticket' as that's what we always use
            $distributionChannel = 'eticket';

            // Update api_booking_id
            if ($apiBookingId) {
                $this->bookingRepository->updateApiBookingId($localBookingId, $apiBookingId);
            }

            // Update XS2Event status fields
            // Note: Using financial_status as booking_status for compatibility
            $this->bookingRepository->updateXS2EventStatus(
                $localBookingId,
                $financialStatus,  // financial_status from XS2Event (e.g., "OPEN")
                $logisticStatus,   // logistic_status from XS2Event (e.g., "COMPLETED")
                $distributionChannel,
                $bookingCode
            );

            // Store full response for debugging
            $this->bookingRepository->updateXS2EventResponseData(
                $localBookingId,
                json_encode($xs2eventData)
            );

            // Mark as synced
            $this->bookingRepository->updateXS2EventSyncedAt($localBookingId);

            $this->logger->info('Local booking updated with XS2Event data', [
                'booking_id' => $localBookingId,
                'api_booking_id' => $apiBookingId,
                'booking_code' => $bookingCode,
                'financial_status' => $financialStatus,
                'logistic_status' => $logisticStatus
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Failed to update local booking', [
                'booking_id' => $localBookingId,
                'error' => $e->getMessage()
            ]);

            throw new ApiException('Failed to update local booking: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Check if tickets are available for a booking
     * 
     * @param string $apiBookingId XS2Event booking ID
     * @return array Ticket availability data
     */
    public function checkTicketAvailability(string $apiBookingId): array
    {
        try {
            $this->logger->debug('Checking ticket availability', [
                'api_booking_id' => $apiBookingId
            ]);

            $response = $this->httpClient->get(
                $this->xs2eventBaseUrl . '/v1/bookings/' . urlencode($apiBookingId) . '/etickets',
                [
                    'headers' => $this->getXS2EventHeaders(),
                    'timeout' => 15
                ]
            );

            $responseData = json_decode($response->getBody()->getContents(), true);
            $tickets = $responseData['tickets'] ?? [];

            return [
                'available' => !empty($tickets),
                'ticket_count' => count($tickets),
                'tickets' => $tickets
            ];

        } catch (RequestException $e) {
            $this->logger->warning('Ticket availability check failed', [
                'api_booking_id' => $apiBookingId,
                'error' => $e->getMessage()
            ]);

            return [
                'available' => false,
                'ticket_count' => 0,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Sync booking status from XS2Event
     * 
     * @param int $localBookingId Local booking ID
     * @return array Updated booking status
     */
    public function syncBookingStatus(int $localBookingId): array
    {
        try {
            $booking = $this->bookingRepository->getBookingById($localBookingId);

            if (!$booking || empty($booking['api_booking_id'])) {
                throw new ApiException('Booking not found or not synced with XS2Event', 404);
            }

            $apiBookingId = $booking['api_booking_id'];

            $this->logger->debug('Syncing booking status', [
                'booking_id' => $localBookingId,
                'api_booking_id' => $apiBookingId
            ]);

            $response = $this->httpClient->get(
                $this->xs2eventBaseUrl . '/v1/bookings/' . urlencode($apiBookingId),
                [
                    'headers' => $this->getXS2EventHeaders(),
                    'timeout' => 15
                ]
            );

            $xs2eventData = json_decode($response->getBody()->getContents(), true);

            // Update local booking with latest data
            $this->updateLocalBookingWithXS2EventData($localBookingId, $xs2eventData);

            return [
                'success' => true,
                'status' => $xs2eventData['status'] ?? 'unknown',
                'logistic_status' => $xs2eventData['logistic_status'] ?? 'unknown'
            ];

        } catch (RequestException $e) {
            $this->logger->error('Booking status sync failed', [
                'booking_id' => $localBookingId,
                'error' => $e->getMessage()
            ]);

            throw new ApiException('Booking status sync failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Build reservation payload for XS2Event API
     */
    private function buildReservationPayload(array $bookingData): array
    {
        return [
            'event_id' => $bookingData['event_id'],
            'ticket_type_id' => $bookingData['ticket_type_id'],
            'quantity' => (int)$bookingData['quantity'],
            'customer_reference' => $bookingData['booking_reference'],
            'metadata' => [
                'local_booking_id' => $bookingData['id'],
                'customer_email' => $bookingData['customer_email'] ?? $bookingData['email']
            ]
        ];
    }

    /**
     * Build guest data payload for XS2Event API
     */
    private function buildGuestDataPayload(array $bookingData): array
    {
        $guests = [];
        
        // Main guest (customer)
        $guests[] = [
            'first_name' => $bookingData['customer_name'] ?? $bookingData['name'],
            'last_name' => $bookingData['customer_lastname'] ?? '',
            'email' => $bookingData['customer_email'] ?? $bookingData['email'],
            'phone' => $bookingData['customer_phone'] ?? $bookingData['phone'] ?? '',
            'is_primary' => true
        ];

        // Add additional guests if available
        if (!empty($bookingData['guest_details'])) {
            $guestDetails = is_string($bookingData['guest_details']) 
                ? json_decode($bookingData['guest_details'], true) 
                : $bookingData['guest_details'];

            foreach ($guestDetails as $guest) {
                $guests[] = [
                    'first_name' => $guest['first_name'] ?? '',
                    'last_name' => $guest['last_name'] ?? '',
                    'email' => $guest['email'] ?? '',
                    'phone' => $guest['phone'] ?? '',
                    'is_primary' => false
                ];
            }
        }

        return ['guests' => $guests];
    }

    /**
     * Build booking payload for XS2Event API
     * 
     * @see https://docs.xs2event.com/operations/bookings_post.html
     */
    private function buildBookingPayload(string $reservationId, array $bookingData): array
    {
        // Use payment_intent_id as payment_reference (Stripe PI is the reference)
        $paymentReference = $bookingData['payment_intent_id'] 
                         ?? $bookingData['payment_reference'] 
                         ?? '';
        
        return [
            // REQUIRED FIELDS per XS2Event API spec
            'reservation_id' => $reservationId,
            'booking_email' => $bookingData['customer_email'] ?? $bookingData['email'] ?? '',
            'payment_method' => 'invoice',  // Using 'invoice' as shown in XS2Event documentation demo
            
            // OPTIONAL FIELDS
            'payment_reference' => $paymentReference,
            'booking_reference' => $bookingData['booking_reference'] ?? null,
            'invoice_reference' => $bookingData['booking_reference'] ?? null,
            'is_test_booking' => false
        ];
    }

    /**
     * Get headers for XS2Event API requests
     */
    private function getXS2EventHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->xs2eventApiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ];
    }
}
