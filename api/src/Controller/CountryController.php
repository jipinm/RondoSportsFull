<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;
use Exception;

class CountryController
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger = $logger;
    }

    /**
     * Get all active countries
     */
    public function getActiveCountries(Request $request, Response $response): ResponseInterface
    {
        try {
            $conn = $this->database->getConnection();
            
            // Get all active countries ordered by country name
            $stmt = $conn->prepare(
                "SELECT country_code, country_name 
                 FROM countries 
                 WHERE country_status = 1 
                 ORDER BY country_name ASC"
            );
            
            $stmt->execute();
            $countries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $this->logger->info('Countries fetched successfully', [
                'count' => count($countries)
            ]);

            $responseData = [
                'success' => true,
                'data' => $countries,
                'message' => 'Countries retrieved successfully'
            ];

            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Error fetching countries', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $errorResponse = [
                'success' => false,
                'message' => 'Failed to fetch countries',
                'error' => $e->getMessage()
            ];

            $response->getBody()->write(json_encode($errorResponse, JSON_PRETTY_PRINT));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Search countries by name (for typeahead functionality)
     */
    public function searchCountries(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $searchTerm = $queryParams['q'] ?? '';
            
            if (empty($searchTerm)) {
                // Return all active countries if no search term
                return $this->getActiveCountries($request, $response);
            }

            $conn = $this->database->getConnection();
            
            // Search countries by name (case-insensitive)
            $stmt = $conn->prepare(
                "SELECT country_code, country_name 
                 FROM countries 
                 WHERE country_status = 1 
                 AND country_name LIKE :search_term
                 ORDER BY country_name ASC
                 LIMIT 20"
            );
            
            $searchPattern = '%' . $searchTerm . '%';
            $stmt->bindParam(':search_term', $searchPattern);
            $stmt->execute();
            
            $countries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $this->logger->info('Countries searched successfully', [
                'search_term' => $searchTerm,
                'count' => count($countries)
            ]);

            $responseData = [
                'success' => true,
                'data' => $countries,
                'message' => 'Countries searched successfully'
            ];

            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Error searching countries', [
                'error' => $e->getMessage(),
                'search_term' => $queryParams['q'] ?? '',
                'trace' => $e->getTraceAsString()
            ]);

            $errorResponse = [
                'success' => false,
                'message' => 'Failed to search countries',
                'error' => $e->getMessage()
            ];

            $response->getBody()->write(json_encode($errorResponse, JSON_PRETTY_PRINT));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }
}