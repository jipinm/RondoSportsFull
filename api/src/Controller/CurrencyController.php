<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Repository\CurrencyRepository;
use XS2EventProxy\Exception\DatabaseException;
use Psr\Log\LoggerInterface;

/**
 * Controller for currency management operations
 */
class CurrencyController
{
    private CurrencyRepository $currencyRepository;
    private LoggerInterface $logger;

    public function __construct(CurrencyRepository $currencyRepository, LoggerInterface $logger)
    {
        $this->currencyRepository = $currencyRepository;
        $this->logger = $logger;
    }

    /**
     * Get all currencies with filtering and pagination (Admin)
     * GET /admin/currencies
     */
    public function getCurrencies(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Extract pagination parameters
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int)($queryParams['per_page'] ?? 50)));

            // Extract filters
            $filters = [];
            if (isset($queryParams['is_active'])) {
                $filters['is_active'] = $queryParams['is_active'];
            }
            if (!empty($queryParams['search'])) {
                $filters['search'] = $queryParams['search'];
            }

            $result = $this->currencyRepository->findAll($filters, $page, $limit);

            $this->logger->info('Currencies retrieved successfully', [
                'admin_user_id' => $adminUser['id'],
                'total_count' => $result['pagination']['total'],
                'filters' => $filters
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['data'],
                'pagination' => $result['pagination'],
                'filters_applied' => $filters
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('Database error in getCurrencies', [
                'error' => $e->getMessage()
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getCurrencies', [
                'error' => $e->getMessage()
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get a single currency by ID (Admin)
     * GET /admin/currencies/{id}
     */
    public function getCurrency(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $currencyId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $currency = $this->currencyRepository->findById($currencyId);

            if (!$currency) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Currency not found'
                ]));

                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $this->logger->info('Currency retrieved successfully', [
                'currency_id' => $currencyId,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $currency
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in getCurrency', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Create a new currency (Admin)
     * POST /admin/currencies
     */
    public function createCurrency(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');
            $data = $request->getParsedBody();

            // Validate required fields
            $requiredFields = ['code', 'name', 'symbol'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    $response->getBody()->write(json_encode([
                        'success' => false,
                        'error' => "Field '{$field}' is required"
                    ]));
                    return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
                }
            }

            // Validate code format (3 uppercase letters)
            $code = strtoupper($data['code']);
            if (!preg_match('/^[A-Z]{3}$/', $code)) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Currency code must be exactly 3 uppercase letters'
                ]));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            // Check if code already exists
            $existingCurrency = $this->currencyRepository->findByCode($code);
            if ($existingCurrency) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'A currency with this code already exists'
                ]));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $data['created_by'] = $adminUser['id'];
            $currency = $this->currencyRepository->create($data);

            $this->logger->info('Currency created successfully', [
                'currency_id' => $currency['id'],
                'currency_code' => $currency['code'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $currency,
                'message' => 'Currency created successfully'
            ]));

            return $response->withStatus(201)->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('Database error in createCurrency', [
                'error' => $e->getMessage()
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in createCurrency', [
                'error' => $e->getMessage()
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Update a currency (Admin)
     * PUT /admin/currencies/{id}
     */
    public function updateCurrency(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $currencyId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');
            $data = $request->getParsedBody();

            // Check if currency exists
            $existingCurrency = $this->currencyRepository->findById($currencyId);
            if (!$existingCurrency) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Currency not found'
                ]));
                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            // Validate code format if provided
            if (!empty($data['code'])) {
                $code = strtoupper($data['code']);
                if (!preg_match('/^[A-Z]{3}$/', $code)) {
                    $response->getBody()->write(json_encode([
                        'success' => false,
                        'error' => 'Currency code must be exactly 3 uppercase letters'
                    ]));
                    return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
                }

                // Check for duplicate code (excluding current currency)
                $duplicateCurrency = $this->currencyRepository->findByCode($code);
                if ($duplicateCurrency && $duplicateCurrency['id'] !== $currencyId) {
                    $response->getBody()->write(json_encode([
                        'success' => false,
                        'error' => 'A currency with this code already exists'
                    ]));
                    return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
                }
            }

            $data['updated_by'] = $adminUser['id'];
            $currency = $this->currencyRepository->update($currencyId, $data);

            $this->logger->info('Currency updated successfully', [
                'currency_id' => $currencyId,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $currency,
                'message' => 'Currency updated successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('Database error in updateCurrency', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in updateCurrency', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Delete a currency (Admin)
     * DELETE /admin/currencies/{id}
     */
    public function deleteCurrency(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $currencyId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            // Check if currency exists
            $existingCurrency = $this->currencyRepository->findById($currencyId);
            if (!$existingCurrency) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Currency not found'
                ]));
                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $deleted = $this->currencyRepository->delete($currencyId);

            if (!$deleted) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Failed to delete currency'
                ]));
                return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
            }

            $this->logger->info('Currency deleted successfully', [
                'currency_id' => $currencyId,
                'currency_code' => $existingCurrency['code'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Currency deleted successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('Database error in deleteCurrency', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in deleteCurrency', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Set a currency as default (Admin)
     * PATCH /admin/currencies/{id}/set-default
     */
    public function setDefault(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $currencyId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            // Check if currency exists
            $existingCurrency = $this->currencyRepository->findById($currencyId);
            if (!$existingCurrency) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Currency not found'
                ]));
                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $currency = $this->currencyRepository->setAsDefault($currencyId);

            $this->logger->info('Currency set as default', [
                'currency_id' => $currencyId,
                'currency_code' => $currency['code'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $currency,
                'message' => 'Currency set as default successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('Database error in setDefault', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in setDefault', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Toggle currency active status (Admin)
     * PATCH /admin/currencies/{id}/toggle-active
     */
    public function toggleActive(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $currencyId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $currency = $this->currencyRepository->toggleActive($currencyId);

            $this->logger->info('Currency active status toggled', [
                'currency_id' => $currencyId,
                'currency_code' => $currency['code'],
                'new_status' => $currency['is_active'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $currency,
                'message' => $currency['is_active'] ? 'Currency activated' : 'Currency deactivated'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('Database error in toggleActive', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in toggleActive', [
                'error' => $e->getMessage(),
                'currency_id' => $args['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get currency statistics (Admin)
     * GET /admin/currencies/stats
     */
    public function getStats(Request $request, Response $response): ResponseInterface
    {
        try {
            $stats = $this->currencyRepository->getStats();

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $stats
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in getStats', [
                'error' => $e->getMessage()
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get active currencies (Public API)
     * GET /api/v1/currencies
     */
    public function getActiveCurrencies(Request $request, Response $response): ResponseInterface
    {
        try {
            $currencies = $this->currencyRepository->findActive();
            $defaultCurrency = null;

            // Find the default currency
            foreach ($currencies as $currency) {
                if ($currency['is_default']) {
                    $defaultCurrency = $currency;
                    break;
                }
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $currencies,
                'default' => $defaultCurrency
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in getActiveCurrencies', [
                'error' => $e->getMessage()
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }
}
