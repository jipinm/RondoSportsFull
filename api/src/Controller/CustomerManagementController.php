<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\CustomerRepository;
use XS2EventProxy\Service\ActivityLoggerService;
use XS2EventProxy\Service\CustomerValidationService;
use XS2EventProxy\Exception\CustomerException;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class CustomerManagementController
{
    private CustomerRepository $customerRepository;
    private ActivityLoggerService $activityLogger;
    private CustomerValidationService $validator;
    private LoggerInterface $logger;

    public function __construct(
        CustomerRepository $customerRepository,
        ActivityLoggerService $activityLogger,
        CustomerValidationService $validator,
        LoggerInterface $logger
    ) {
        $this->customerRepository = $customerRepository;
        $this->activityLogger = $activityLogger;
        $this->validator = $validator;
        $this->logger = $logger;
    }

    /**
     * Get customers list with pagination and filters
     */
    public function getCustomers(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Extract filters and pagination parameters
            $filters = [
                'search' => $queryParams['search'] ?? '',
                'status' => $queryParams['status'] ?? '',
                'email_verified' => $queryParams['email_verified'] ?? '',
                'created_from' => $queryParams['created_from'] ?? '',
                'created_to' => $queryParams['created_to'] ?? '',
                'sort_by' => $queryParams['sort_by'] ?? 'created_at',
                'sort_direction' => $queryParams['sort_direction'] ?? 'desc'
            ];

            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(100, max(10, (int)($queryParams['limit'] ?? 20)));

            // Get customers data
            $result = $this->customerRepository->getCustomers($filters, $page, $limit);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'customers.view',
                'Viewed customer list',
                ['filters' => $filters, 'page' => $page, 'limit' => $limit]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'filters' => $filters,
                'pagination' => [
                    'current_page' => $result['page'],
                    'total_pages' => $result['total_pages'],
                    'total_items' => $result['total'],
                    'items_per_page' => $result['limit']
                ]
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error fetching customers');
        }
    }

    /**
     * Get single customer details
     */
    public function getCustomer(Request $request, Response $response): ResponseInterface
    {
        try {
            $customerId = (int)$request->getAttribute('id');
            $adminUser = $request->getAttribute('user');

            $customer = $this->customerRepository->findById($customerId);
            
            if (!$customer) {
                throw CustomerException::customerNotFound("ID: {$customerId}");
            }

            // Remove sensitive information
            unset($customer['password_hash'], $customer['email_verification_token'], 
                  $customer['password_reset_token'], $customer['two_factor_secret']);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'customers.view',
                "Viewed customer details for {$customer['email']}",
                ['customer_id' => $customerId]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $customer
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error fetching customer');
        }
    }

    /**
     * Update customer status (enable/disable/block)
     */
    public function updateCustomerStatus(Request $request, Response $response): ResponseInterface
    {
        try {
            $customerId = (int)$request->getAttribute('id');
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validation
            $errors = $this->validator->validateStatusUpdate($data);
            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            // Get customer
            $customer = $this->customerRepository->findById($customerId);
            if (!$customer) {
                throw CustomerException::customerNotFound("ID: {$customerId}");
            }

            $oldStatus = $customer['status'];
            $newStatus = $data['status'];
            $reason = $data['reason'] ?? null;

            // Update status
            $success = $this->customerRepository->updateStatus(
                $customerId, 
                $newStatus, 
                (int)$adminUser['id'], 
                $reason
            );

            if (!$success) {
                throw CustomerException::profileUpdateFailed('Failed to update customer status');
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'customers.manage',
                "Changed customer status from '{$oldStatus}' to '{$newStatus}' for {$customer['email']}",
                [
                    'customer_id' => $customerId,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'reason' => $reason
                ]
            );

            // Log customer activity
            $this->logCustomerActivity(
                $customerId,
                'status_changed',
                "Account status changed from '{$oldStatus}' to '{$newStatus}' by admin",
                [
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'admin_id' => $adminUser['id'],
                    'reason' => $reason
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Customer status updated successfully',
                'data' => [
                    'customer_id' => $customerId,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus
                ]
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error updating customer status');
        }
    }

    /**
     * Get customer statistics for dashboard
     */
    public function getCustomerStats(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');

            $stats = $this->customerRepository->getCustomerStats();

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'customers.view',
                'Viewed customer statistics',
                []
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $stats
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error fetching customer statistics');
        }
    }

    /**
     * Export customers data
     */
    public function exportCustomers(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');
            $format = $queryParams['format'] ?? 'csv';

            if (!in_array($format, ['csv', 'json'])) {
                throw new \InvalidArgumentException('Invalid export format. Supported formats: csv, json');
            }

            // Get all customers (without pagination for export)
            $filters = [
                'search' => $queryParams['search'] ?? '',
                'status' => $queryParams['status'] ?? '',
                'email_verified' => $queryParams['email_verified'] ?? '',
                'created_from' => $queryParams['created_from'] ?? '',
                'created_to' => $queryParams['created_to'] ?? ''
            ];

            $result = $this->customerRepository->getCustomers($filters, 1, 10000); // Large limit for export
            $customers = $result['customers'];

            // Remove sensitive information
            foreach ($customers as &$customer) {
                unset($customer['password_hash'], $customer['email_verification_token'], 
                      $customer['password_reset_token'], $customer['two_factor_secret']);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'customers.export',
                "Exported {$result['total']} customers in {$format} format",
                ['format' => $format, 'total_customers' => $result['total']]
            );

            if ($format === 'csv') {
                return $this->exportToCsv($response, $customers);
            } else {
                return $this->exportToJson($response, $customers);
            }

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error exporting customers');
        }
    }

    /**
     * Update customer notes (admin only)
     */
    public function updateCustomerNotes(Request $request, Response $response): ResponseInterface
    {
        try {
            $customerId = (int)$request->getAttribute('id');
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Get customer
            $customer = $this->customerRepository->findById($customerId);
            if (!$customer) {
                throw CustomerException::customerNotFound("ID: {$customerId}");
            }

            $notes = $data['notes'] ?? '';
            if (strlen($notes) > 2000) {
                throw CustomerException::validationFailed(['notes' => 'Notes must not exceed 2000 characters']);
            }

            // Update notes
            $success = $this->customerRepository->update($customerId, ['notes' => $notes]);

            if (!$success) {
                throw CustomerException::profileUpdateFailed('Failed to update customer notes');
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'customers.notes',
                "Updated notes for customer {$customer['email']}",
                ['customer_id' => $customerId]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Customer notes updated successfully'
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error updating customer notes');
        }
    }

    /**
     * Export customers to CSV
     */
    private function exportToCsv(Response $response, array $customers): ResponseInterface
    {
        $csv = "ID,Customer ID,Name,Email,Phone,Status,Total Bookings,Total Spent,Email Verified,Created At,Last Login\n";
        
        foreach ($customers as $customer) {
            $csv .= sprintf(
                "%d,%s,%s,%s,%s,%s,%d,%.2f,%s,%s,%s\n",
                $customer['id'],
                $customer['customer_id'],
                '"' . str_replace('"', '""', $customer['name']) . '"',
                $customer['email'],
                $customer['phone'] ?? '',
                $customer['status'],
                $customer['total_bookings'],
                $customer['total_spent'],
                $customer['email_verified'] ? 'Yes' : 'No',
                $customer['created_at'],
                $customer['last_login'] ?? ''
            );
        }

        $response->getBody()->write($csv);
        
        return $response
            ->withHeader('Content-Type', 'text/csv')
            ->withHeader('Content-Disposition', 'attachment; filename="customers_' . date('Y-m-d_H-i-s') . '.csv"');
    }

    /**
     * Export customers to JSON
     */
    private function exportToJson(Response $response, array $customers): ResponseInterface
    {
        $data = [
            'export_date' => date('Y-m-d H:i:s'),
            'total_customers' => count($customers),
            'customers' => $customers
        ];

        $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT));
        
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Content-Disposition', 'attachment; filename="customers_' . date('Y-m-d_H-i-s') . '.json"');
    }

    /**
     * Log admin activity
     */
    private function logAdminActivity(int $adminId, string $action, string $description, array $metadata = []): void
    {
        try {
            $this->activityLogger->logActivity(
                $adminId,
                $action,
                $description,
                $metadata
            );
        } catch (\Exception $e) {
            $this->logger->error('Failed to log admin activity', [
                'admin_id' => $adminId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Log customer activity
     */
    private function logCustomerActivity(int $customerId, string $action, string $description, array $metadata = []): void
    {
        try {
            // This would typically use a separate customer activity logger
            // For now, we'll use the existing activity logger with customer context
            $this->activityLogger->logActivity(
                $customerId,
                "customer.{$action}",
                $description,
                array_merge($metadata, ['context' => 'customer'])
            );
        } catch (\Exception $e) {
            $this->logger->error('Failed to log customer activity', [
                'customer_id' => $customerId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle CustomerException
     */
    private function handleCustomerException(Response $response, CustomerException $e): ResponseInterface
    {
        $this->logger->warning('Customer management error', [
            'error' => $e->getMessage(),
            'code' => $e->getCode(),
            'details' => $e->getDetails()
        ]);

        $response->getBody()->write(json_encode($e->toArray(), JSON_PRETTY_PRINT));
        return $response
            ->withStatus($e->getCode())
            ->withHeader('Content-Type', 'application/json');
    }

    /**
     * Handle general exceptions
     */
    private function handleException(Response $response, \Exception $e, string $context): ResponseInterface
    {
        $this->logger->error($context, [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => 'Internal server error',
            'code' => 500,
            'error_type' => 'INTERNAL_ERROR'
        ], JSON_PRETTY_PRINT));

        return $response
            ->withStatus(500)
            ->withHeader('Content-Type', 'application/json');
    }
}