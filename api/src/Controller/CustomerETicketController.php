<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use XS2EventProxy\Service\ETicketService;
use XS2EventProxy\Repository\BookingRepository;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Customer E-Ticket Controller
 * 
 * Provides authenticated endpoints for customers to:
 * - Check ticket availability
 * - Download individual tickets
 * - Download all tickets as ZIP
 * - Force check ticket availability
 */
class CustomerETicketController
{
    private ETicketService $eTicketService;
    private BookingRepository $bookingRepository;
    private LoggerInterface $logger;

    public function __construct(
        ETicketService $eTicketService,
        BookingRepository $bookingRepository,
        LoggerInterface $logger
    ) {
        $this->eTicketService = $eTicketService;
        $this->bookingRepository = $bookingRepository;
        $this->logger = $logger;
    }

    /**
     * Get ticket status for a booking
     * GET /api/v1/customers/bookings/{id}/tickets/status
     */
    public function getTicketStatus(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            
            // Get customer from JWT middleware (set in request attributes)
            $customerId = $request->getAttribute('customer_id');
            
            if (!$customerId) {
                return $this->errorResponse($response, 'Customer authentication required', 401);
            }

            // Verify booking belongs to customer
            $booking = $this->bookingRepository->getBookingById($bookingId);
            
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', 404);
            }

            if ((int)$booking['customer_user_id'] !== (int)$customerId) {
                return $this->errorResponse($response, 'Access denied to this booking', 403);
            }

            // Check ticket availability
            $ticketStatus = $this->eTicketService->checkTicketAvailability($bookingId);

            $this->logger->info('Customer checked ticket status', [
                'customer_id' => $customerId,
                'booking_id' => $bookingId,
                'status' => $ticketStatus['status'] ?? 'unknown'
            ]);

            $responseData = [
                'success' => true,
                'data' => $ticketStatus
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to get ticket status', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Download single ticket
     * GET /api/v1/customers/bookings/{id}/tickets/download
     * Query params: order_item_id, download_url
     */
    public function downloadTicket(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            $queryParams = $request->getQueryParams();
            $orderItemId = $queryParams['order_item_id'] ?? null;
            $downloadUrl = $queryParams['download_url'] ?? null;
            
            // Get customer from JWT middleware
            $customerId = $request->getAttribute('customer_id');
            
            if (!$customerId) {
                return $this->errorResponse($response, 'Customer authentication required', 401);
            }

            if (!$orderItemId || !$downloadUrl) {
                return $this->errorResponse($response, 'Missing required parameters: order_item_id, download_url', 400);
            }

            // Verify booking belongs to customer
            $booking = $this->bookingRepository->getBookingById($bookingId);
            
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', 404);
            }

            if ((int)$booking['customer_user_id'] !== (int)$customerId) {
                return $this->errorResponse($response, 'Access denied to this booking', 403);
            }

            // Download ticket
            $fileData = $this->eTicketService->downloadSingleTicket($bookingId, $orderItemId, $downloadUrl);

            $this->logger->info('Customer downloaded ticket', [
                'customer_id' => $customerId,
                'booking_id' => $bookingId,
                'order_item_id' => $orderItemId,
                'file_size' => $fileData['size']
            ]);

            // Stream file to customer
            $response->getBody()->write($fileData['content']);
            
            return $response
                ->withHeader('Content-Type', $fileData['mime_type'])
                ->withHeader('Content-Disposition', 'attachment; filename="' . $fileData['filename'] . '"')
                ->withHeader('Content-Length', (string)$fileData['size'])
                ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to download ticket', [
                'booking_id' => $bookingId ?? null,
                'order_item_id' => $orderItemId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Download all tickets as ZIP
     * GET /api/v1/customers/bookings/{id}/tickets/zip
     */
    public function downloadZip(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            
            // Get customer from JWT middleware
            $customerId = $request->getAttribute('customer_id');
            
            if (!$customerId) {
                return $this->errorResponse($response, 'Customer authentication required', 401);
            }

            // Verify booking belongs to customer
            $booking = $this->bookingRepository->getBookingById($bookingId);
            
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', 404);
            }

            if ((int)$booking['customer_user_id'] !== (int)$customerId) {
                return $this->errorResponse($response, 'Access denied to this booking', 403);
            }

            // Download ZIP file
            $fileData = $this->eTicketService->downloadTicketZip($bookingId);

            $this->logger->info('Customer downloaded ticket ZIP', [
                'customer_id' => $customerId,
                'booking_id' => $bookingId,
                'file_size' => $fileData['size']
            ]);

            // Stream ZIP file to customer
            $response->getBody()->write($fileData['content']);
            
            return $response
                ->withHeader('Content-Type', $fileData['mime_type'])
                ->withHeader('Content-Disposition', 'attachment; filename="' . $fileData['filename'] . '"')
                ->withHeader('Content-Length', (string)$fileData['size'])
                ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to download ticket ZIP', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Force check ticket availability (refresh from XS2Event)
     * POST /api/v1/customers/bookings/{id}/tickets/check-availability
     */
    public function checkAvailability(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            
            // Get customer from JWT middleware
            $customerId = $request->getAttribute('customer_id');
            
            $this->logger->info('Check availability request received', [
                'booking_id' => $bookingId,
                'customer_id' => $customerId,
                'has_auth_header' => !empty($request->getHeaderLine('Authorization')),
                'request_attributes' => array_keys($request->getAttributes())
            ]);
            
            if (!$customerId) {
                $this->logger->warning('Customer authentication failed - customer_id not found in request', [
                    'booking_id' => $bookingId,
                    'request_attributes' => array_keys($request->getAttributes())
                ]);
                return $this->errorResponse($response, 'Customer authentication required', 401);
            }

            // Verify booking belongs to customer
            $booking = $this->bookingRepository->getBookingById($bookingId);
            
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', 404);
            }

            if ((int)$booking['customer_user_id'] !== (int)$customerId) {
                return $this->errorResponse($response, 'Access denied to this booking', 403);
            }

            // Force check ticket availability (bypasses cache)
            $ticketStatus = $this->eTicketService->checkTicketAvailability($bookingId);

            $this->logger->info('Customer forced ticket availability check', [
                'customer_id' => $customerId,
                'booking_id' => $bookingId,
                'status' => $ticketStatus['status'] ?? 'unknown',
                'available' => $ticketStatus['available'] ?? false
            ]);

            $responseData = [
                'success' => true,
                'data' => $ticketStatus,
                'message' => $ticketStatus['available'] 
                    ? 'Tickets are available for download' 
                    : 'Tickets are not yet available. Please check back later.'
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to check ticket availability', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get all tickets for logged-in customer
     * GET /api/v1/customers/tickets
     */
    public function getMyTickets(Request $request, Response $response): ResponseInterface
    {
        try {
            // Get customer from JWT middleware
            $customerId = $request->getAttribute('customer_id');
            
            if (!$customerId) {
                return $this->errorResponse($response, 'Customer authentication required', 401);
            }

            // Get all tickets for customer
            $tickets = $this->eTicketService->getCustomerTickets((int)$customerId);

            $this->logger->info('Customer retrieved all tickets', [
                'customer_id' => $customerId,
                'ticket_count' => count($tickets)
            ]);

            $responseData = [
                'success' => true,
                'data' => $tickets,
                'count' => count($tickets)
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to get customer tickets', [
                'customer_id' => $customerId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Error response helper
     */
    private function errorResponse(Response $response, string $message, int $statusCode = 400): ResponseInterface
    {
        $errorData = [
            'success' => false,
            'error' => $message
        ];

        $response->getBody()->write(json_encode($errorData));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }
}
