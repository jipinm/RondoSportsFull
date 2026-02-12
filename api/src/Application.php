<?php

declare(strict_types=1);

namespace XS2EventProxy;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Slim\Psr7\Stream;
use XS2EventProxy\Middleware\AuthMiddleware;
use XS2EventProxy\Middleware\RoleMiddleware;
use XS2EventProxy\Middleware\CorsMiddleware;
use XS2EventProxy\Middleware\LoggingMiddleware;
use XS2EventProxy\Controller\ProxyController;
use XS2EventProxy\Config\AppConfig;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Psr\Log\LoggerInterface;
use GuzzleHttp\Client;
use XS2EventProxy\Controller\HealthController;
use XS2EventProxy\Controller\SportsController;
use XS2EventProxy\Controller\TournamentsController;
use XS2EventProxy\Controller\TeamsController;
use XS2EventProxy\Controller\EventsController;
use XS2EventProxy\Controller\VenuesController;
use XS2EventProxy\Controller\CategoriesController;
use XS2EventProxy\Controller\CountriesController;
use XS2EventProxy\Controller\CitiesController;
use XS2EventProxy\Controller\TicketsController;
use XS2EventProxy\Controller\ReservationsController;
use XS2EventProxy\Controller\BookingsController;
use XS2EventProxy\Controller\BookingOrdersController;
use XS2EventProxy\Controller\ETicketsController;
use XS2EventProxy\Controller\SearchController;
use XS2EventProxy\Controller\StatusController;
use XS2EventProxy\Controller\AuthController;
use XS2EventProxy\Controller\AdminUsersController;
use XS2EventProxy\Controller\RolesManagementController;
use XS2EventProxy\Controller\CustomerManagementController;
use XS2EventProxy\Controller\BookingManagementController;
use XS2EventProxy\Controller\RefundManagementController;
use XS2EventProxy\Controller\TeamCredentialsController;
use XS2EventProxy\Controller\CustomerAuthController;
use XS2EventProxy\Controller\CustomerProfileController;
use XS2EventProxy\Controller\CustomerBookingController;
use XS2EventProxy\Controller\CustomerETicketController;
use XS2EventProxy\Controller\CustomerCancellationController;
use XS2EventProxy\Controller\AdminCancellationController;
use XS2EventProxy\Controller\PaymentController;
use XS2EventProxy\Controller\PublicTicketEnhancementsController;
use XS2EventProxy\Controller\LocalBookingController;
use XS2EventProxy\Controller\CountryController;
use XS2EventProxy\Controller\StaticPagesController;
use XS2EventProxy\Controller\BannersController;
use XS2EventProxy\Controller\DashboardController;
use XS2EventProxy\Controller\ReportsController;
use XS2EventProxy\Controller\TicketMarkupController;
use XS2EventProxy\Controller\MarkupRuleController;
use XS2EventProxy\Controller\HospitalityController;
use XS2EventProxy\Controller\CurrencyController;
use XS2EventProxy\Middleware\CustomerAuthMiddleware;
use XS2EventProxy\Service\DatabaseService;
use XS2EventProxy\Service\JWTService;
use XS2EventProxy\Service\CustomerJWTService;
use XS2EventProxy\Service\ActivityLoggerService;
use XS2EventProxy\Service\CustomerValidationService;
use XS2EventProxy\Service\CancellationService;
use XS2EventProxy\Service\BookingValidationService;
use XS2EventProxy\Service\RefundValidationService;
use XS2EventProxy\Service\RefundLogService;
use XS2EventProxy\Service\StripeRefundService;
use XS2EventProxy\Service\EmailService;
use XS2EventProxy\Service\XS2EventBookingBridge;
use XS2EventProxy\Service\ETicketService;
use XS2EventProxy\Repository\AdminUserRepository;
use XS2EventProxy\Repository\CustomerRepository;
use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Repository\RefundRepository;
use XS2EventProxy\Repository\CancellationRequestRepository;
use XS2EventProxy\Repository\TeamCredentialsRepository;
use XS2EventProxy\Repository\StaticPagesRepository;
use XS2EventProxy\Repository\BannersRepository;
use XS2EventProxy\Repository\TicketMarkupRepository;
use XS2EventProxy\Repository\MarkupRuleRepository;
use XS2EventProxy\Repository\HospitalityRepository;
use XS2EventProxy\Repository\CurrencyRepository;
use XS2EventProxy\Service\TeamCredentialsService;
use XS2EventProxy\Service\BannersService;
use XS2EventProxy\Service\DashboardService;
use XS2EventProxy\Service\ReportsService;
use XS2EventProxy\Controller\RolesController;
use XS2EventProxy\Service\PermissionService;
use XS2EventProxy\Service\RoleValidationService;

class Application
{
    private \Slim\App $app;
    private AppConfig $config;
    private LoggerInterface $logger;
    private Client $httpClient;
    private DatabaseService $database;
    private JWTService $jwtService;
    private ActivityLoggerService $activityLogger;
    private AdminUserRepository $userRepository;
    private PermissionService $permissionService;
    private EmailService $emailService;
    private XS2EventBookingBridge $xs2eventBridge;
    private ETicketService $eTicketService;

    public function __construct()
    {
        // Create Slim app instance
        $this->app = AppFactory::create();
        
        // Build config from environment
        $this->config = new AppConfig($_ENV);
        
        // Create logger
        $this->logger = new Logger('xs2event-proxy');
        $logLevel = Logger::INFO;
        $this->logger->pushHandler(new StreamHandler(__DIR__ . '/../../logs/app.log', $logLevel));
        
        // Create HTTP client
        $this->httpClient = new Client([
            'timeout' => $this->config->getProxyRequestTimeoutMs() / 1000,
            'connect_timeout' => 5,
            'http_errors' => false,
            'headers' => [
                'User-Agent' => 'XS2Event-PHP-Proxy/1.0',
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'X-Api-Key' => $this->config->getApiKey(),
            ]
        ]);

        // Initialize authentication services
        $this->initializeAuthServices();

        // Parse JSON, form data and XML
        $this->app->addBodyParsingMiddleware();

        // Add routing
        $this->setupRoutes();

        // Add logging middleware (executes last in the chain)
        $this->app->add(new LoggingMiddleware($this->logger));

        // Add error middleware with custom error handler
        $errorMiddleware = $this->app->addErrorMiddleware(
            $this->config->isDebug(),
            true,
            true
        );
        
        // Set custom error handler to ensure CORS headers are included
        $errorHandler = $errorMiddleware->getDefaultErrorHandler();
        $errorHandler->forceContentType('application/json');

        // Add CORS middleware (executes first in the chain - MUST be last in code)
        // This ensures CORS headers are added to all responses, including errors
        $this->app->add(new CorsMiddleware(
            $this->logger,
            $this->config->getCorsAllowedOrigins(),
            $this->config->getCorsAllowedMethods(),
            $this->config->getCorsAllowedHeaders(),
            $this->config->isCorsSupportsCredentials(),
            $this->config->getCorsMaxAge()
        ));
    }
    
    /**
     * Initialize authentication services
     */
    private function initializeAuthServices(): void
    {
        // Database service
        $this->database = new DatabaseService($this->logger);
        
        // JWT service with configuration
        $jwtSecret = $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-this';
        $accessTokenExpiry = (int)($_ENV['JWT_ACCESS_EXPIRY'] ?? 3600); // 1 hour
        $refreshTokenExpiry = (int)($_ENV['JWT_REFRESH_EXPIRY'] ?? 86400); // 24 hours
        
        $this->jwtService = new JWTService($this->logger, $jwtSecret);
        
        // Activity logger
        $this->activityLogger = new ActivityLoggerService($this->database, $this->logger);
        
        // User repository
        $this->userRepository = new AdminUserRepository($this->database, $this->logger);
        
        // Permission service for role-based access control with database integration
        $this->permissionService = new PermissionService($this->logger, $this->database);
        
        // Email service for sending notifications
        $this->emailService = new EmailService($this->logger);
        
        // XS2Event integration services
        $xs2eventBaseUrl = $_ENV['XS2EVENT_BASE_URL'] ?? 'https://testapi.xs2event.com';
        $xs2eventApiKey = $_ENV['XS2EVENT_API_KEY'] ?? '';
        
        $bookingRepository = new BookingRepository($this->database);
        
        $this->xs2eventBridge = new XS2EventBookingBridge(
            $this->logger,
            $bookingRepository,
            $this->httpClient,
            $xs2eventBaseUrl,
            $xs2eventApiKey
        );
        
        $this->eTicketService = new ETicketService(
            $this->logger,
            $bookingRepository,
            $this->httpClient,
            $xs2eventBaseUrl,
            $xs2eventApiKey
        );
    }
    
    private function setupRoutes(): void
    {
        // Health check endpoint
        $healthController = new HealthController(
            $this->logger,
            $this->httpClient,
            $this->config->getBaseUrl(),
            $this->config->getApiKey()
        );
        $this->app->get('/healthz', [$healthController, 'healthCheck']);
        
        // Authentication routes (no middleware needed)
        $authController = new AuthController(
            $this->jwtService,
            $this->userRepository,
            $this->activityLogger,
            $this->logger
        );
        
        // Capture services for use in closures
        $jwtService = $this->jwtService;
        $userRepository = $this->userRepository;
        $logger = $this->logger;
        
        $this->app->group('/auth', function ($group) use ($authController, $jwtService, $userRepository, $logger) {
            $group->post('/login', [$authController, 'login']);
            $group->post('/refresh', [$authController, 'refresh']);
            $group->post('/logout', [$authController, 'logout'])->add(new AuthMiddleware(
                $jwtService,
                $userRepository,
                $logger
            ));
            $group->get('/me', [$authController, 'me'])->add(new AuthMiddleware(
                $jwtService,
                $userRepository,
                $logger
            ));
            $group->post('/change-password', [$authController, 'changePassword'])->add(new AuthMiddleware(
                $jwtService,
                $userRepository,
                $logger
            ));
            $group->get('/permissions', [$authController, 'permissions'])->add(new AuthMiddleware(
                $jwtService,
                $userRepository,
                $logger
            ));
        });

        // Role-based access control routes (protected)
        $rolesController = new RolesController(
            $this->permissionService,
            $this->userRepository,
            $this->logger
        );

        $this->app->group('/roles', function ($group) use ($rolesController) {
            $group->get('', [$rolesController, 'getRoles'])->add(new AuthMiddleware(
                $this->jwtService,
                $this->userRepository,
                $this->logger
            ))->add(new RoleMiddleware(['admin', 'super_admin'], $this->logger));

            $group->get('/{role}', [$rolesController, 'getRolePermissions'])->add(new AuthMiddleware(
                $this->jwtService,
                $this->userRepository,
                $this->logger
            ))->add(new RoleMiddleware(['admin', 'super_admin'], $this->logger));

            $group->get('/me/permissions', [$rolesController, 'getCurrentUserPermissions'])->add(new AuthMiddleware(
                $this->jwtService,
                $this->userRepository,
                $this->logger
            ));

            $group->post('/check-permission', [$rolesController, 'checkPermission'])->add(new AuthMiddleware(
                $this->jwtService,
                $this->userRepository,
                $this->logger
            ));

            $group->get('/users/{role}', [$rolesController, 'getUsersByRole'])->add(new AuthMiddleware(
                $this->jwtService,
                $this->userRepository,
                $this->logger
            ))->add(new RoleMiddleware(['admin'], $this->logger));

            $group->put('/users/{userId}/role', [$rolesController, 'updateUserRole'])->add(new AuthMiddleware(
                $this->jwtService,
                $this->userRepository,
                $this->logger
            ))->add(new RoleMiddleware(['admin'], $this->logger));
        });

        // Initialize cancellation controllers for admin routes
        $cancellationRequestRepository = new CancellationRequestRepository($this->database, $this->logger);
        $cancellationService = new CancellationService(
            $cancellationRequestRepository,
            new BookingRepository($this->database),
            $this->logger
        );
        $adminCancellationController = new AdminCancellationController(
            $cancellationService,
            $cancellationRequestRepository,
            $this->logger
        );

        // Admin routes (protected)
        $this->app->group('/admin', function ($group) use ($adminCancellationController) {
            // Dashboard
            $bookingRepository = new BookingRepository($this->database);
            $dashboardService = new DashboardService($bookingRepository, $this->logger);
            $dashboardController = new DashboardController($dashboardService, $this->logger);
            $group->get('/dashboard', [$dashboardController, 'getDashboard']);
            $group->get('/dashboard/stats', [$dashboardController, 'getStatisticsForDateRange']);

            // Reports
            $customerRepository = new CustomerRepository($this->database, $this->logger);
            $reportsService = new ReportsService($bookingRepository, $customerRepository, $this->logger);
            $reportsController = new ReportsController($reportsService, $this->logger);
            $group->get('/reports/revenue', [$reportsController, 'getRevenueReport']);
            $group->get('/reports/bookings', [$reportsController, 'getBookingsReport']);
            $group->get('/reports/users', [$reportsController, 'getUserActivityReport']);
            $group->get('/reports/export', [$reportsController, 'exportReport']);

            // Activity logs
            $group->get('/activities', function ($request, $response) {
                $userId = $request->getAttribute('user')['id'];
                $activities = $this->activityLogger->getUserActivities($userId);
                
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'data' => $activities
                ], JSON_PRETTY_PRINT));
                
                return $response->withHeader('Content-Type', 'application/json');
            });
            
            // All activities (admin only)
            $group->get('/activities/all', function ($request, $response) {
                $activities = $this->activityLogger->getAllActivities();
                
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'data' => $activities
                ], JSON_PRETTY_PRINT));
                
                return $response->withHeader('Content-Type', 'application/json');
            })->add(new RoleMiddleware(['admin'], $this->logger));
            
            // Auth statistics (admin only)
            $group->get('/auth-stats', function ($request, $response) {
                $stats = $this->activityLogger->getAuthStats();
                
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'data' => $stats
                ], JSON_PRETTY_PRINT));
                
                return $response->withHeader('Content-Type', 'application/json');
            })->add(new RoleMiddleware(['admin'], $this->logger));
            
            // Admin Users Management
            $adminUsersController = new AdminUsersController($this->database, $this->logger);
            $group->get('/users', [$adminUsersController, 'getUsers']);
            $group->get('/users/{id}', [$adminUsersController, 'getUser']);
            $group->post('/users', [$adminUsersController, 'createUser']);
            $group->put('/users/{id}', [$adminUsersController, 'updateUser']);
            $group->delete('/users/{id}', [$adminUsersController, 'deleteUser']);
            
            // Roles Management with enhanced services
            $roleValidationService = new RoleValidationService($this->database, $this->logger);
            $rolesManagementController = new RolesManagementController(
                $this->database, 
                $this->logger, 
                $this->activityLogger,
                $roleValidationService
            );
            $group->get('/roles-management', [$rolesManagementController, 'getRoles']);
            $group->get('/roles-management/{id}', [$rolesManagementController, 'getRole']);
            $group->get('/roles-management/{id}/validate-delete', [$rolesManagementController, 'validateRoleDeletion']);
            $group->post('/roles-management', [$rolesManagementController, 'createRole']);
            $group->put('/roles-management/{id}', [$rolesManagementController, 'updateRole']);
            $group->delete('/roles-management/{id}', [$rolesManagementController, 'deleteRole']);
            $group->get('/permissions', [$rolesManagementController, 'getPermissions']);

            // Customer Management (Admin)
            $customerRepository = new CustomerRepository($this->database, $this->logger);
            $customerValidationService = new CustomerValidationService($customerRepository, $this->logger);
            $customerManagementController = new CustomerManagementController(
                $customerRepository,
                $this->activityLogger,
                $customerValidationService,
                $this->logger
            );
            $group->get('/customers/stats', [$customerManagementController, 'getCustomerStats']);
            $group->get('/customers/export', [$customerManagementController, 'exportCustomers']);
            $group->get('/customers', [$customerManagementController, 'getCustomers']);
            $group->get('/customers/{id}', [$customerManagementController, 'getCustomer']);
            $group->put('/customers/{id}/status', [$customerManagementController, 'updateCustomerStatus']);
            $group->put('/customers/{id}/notes', [$customerManagementController, 'updateCustomerNotes']);

            // Booking Management (Admin)
            $bookingRepository = new BookingRepository($this->database);
            $bookingValidationService = new BookingValidationService();
            $stripeRefundService = new StripeRefundService($this->logger);
            
            // Refund Log Service
            $refundRepository = new RefundRepository($this->database);
            $refundLogService = new RefundLogService(
                $refundRepository,
                $bookingRepository,
                $this->logger
            );
            
            $bookingManagementController = new BookingManagementController(
                $bookingRepository,
                $bookingValidationService,
                $this->activityLogger,
                $stripeRefundService,
                $this->xs2eventBridge,
                $refundLogService,
                $this->logger
            );
            $group->get('/bookings/stats', [$bookingManagementController, 'getBookingStats']);
            $group->get('/bookings/sport-types', [$bookingManagementController, 'getSportTypes']);
            $group->get('/bookings/export', [$bookingManagementController, 'exportBookings']);
            $group->get('/bookings/without-api-id', [$bookingManagementController, 'getUnsyncedBookings']);
            $group->get('/bookings', [$bookingManagementController, 'getBookings']);
            $group->get('/bookings/{id}', [$bookingManagementController, 'getBookingById']);
            $group->put('/bookings/{id}/status', [$bookingManagementController, 'updateBookingStatus']);
            $group->post('/bookings/{id}/sync-xs2event', [$bookingManagementController, 'syncBookingWithXS2Event']);
            $group->post('/bookings/{id}/check-tickets', [$bookingManagementController, 'checkTicketStatus']);
            $group->post('/bookings/{id}/refund', [$bookingManagementController, 'processRefund']);

            // Refund Management (Admin)
            $refundRepository = new RefundRepository($this->database);
            $refundValidationService = new RefundValidationService();
            $refundManagementController = new RefundManagementController(
                $refundRepository,
                $refundValidationService,
                $this->activityLogger,
                $this->logger
            );
            $group->get('/refunds/stats', [$refundManagementController, 'getRefundStats']);
            $group->get('/refunds/export', [$refundManagementController, 'exportRefunds']);
            $group->get('/refunds', [$refundManagementController, 'getRefundRequests']);
            $group->get('/refunds/{id}', [$refundManagementController, 'getRefundRequestById']);
            $group->put('/refunds/{id}/status', [$refundManagementController, 'updateRefundStatus']);

            // Team Credentials Management (Admin)
            $teamCredentialsRepository = new TeamCredentialsRepository($this->database);
            $teamCredentialsService = new TeamCredentialsService(
                $teamCredentialsRepository,
                $this->activityLogger,
                $this->httpClient,
                $this->config->getBaseUrl(),
                $this->config->getApiKey(),
                __DIR__ . '/../public/images/team', // Absolute upload path
                '/images/team' // Public URL path
            );
            $teamCredentialsController = new TeamCredentialsController(
                $teamCredentialsRepository,
                $teamCredentialsService,
                $this->activityLogger,
                $this->logger
            );
            $group->get('/team-credentials', [$teamCredentialsController, 'getTeamCredentials']);
            $group->get('/team-credentials/stats', [$teamCredentialsController, 'getTeamCredentialsStats']);
            $group->get('/team-credentials/tournament/{tournament_id}/teams', [$teamCredentialsController, 'getTournamentTeams']);
            $group->get('/team-credentials/tournament/{tournament_id}/team/{team_id}', [$teamCredentialsController, 'getTeamCredentialByTeam']);
            $group->get('/team-credentials/{id}', [$teamCredentialsController, 'getTeamCredentialById']);
            $group->post('/team-credentials', [$teamCredentialsController, 'createTeamCredential']);
            $group->put('/team-credentials/{id}', [$teamCredentialsController, 'updateTeamCredential']);
            $group->delete('/team-credentials/{id}', [$teamCredentialsController, 'deleteTeamCredential']);
            $group->patch('/team-credentials/{id}/featured', [$teamCredentialsController, 'toggleFeaturedStatus']);
            $group->post('/team-credentials/{id}/files', [$teamCredentialsController, 'updateTeamCredentialFiles']);
            $group->delete('/team-credentials/{id}/image/{type}', [$teamCredentialsController, 'deleteTeamCredentialImage']);
            $group->get('/team-credentials/api/tournament/{tournament_id}/team/{team_id}', [$teamCredentialsController, 'getTeamFromApi']);
            
            // Static Pages Management (Admin)
            $staticPagesRepository = new StaticPagesRepository($this->database, $this->logger);
            $staticPagesController = new StaticPagesController($staticPagesRepository, $this->logger);
            $group->get('/static-pages', [$staticPagesController, 'getAllPages']);
            $group->get('/static-pages/{id}', [$staticPagesController, 'getPageById']);
            $group->put('/static-pages/{id}', [$staticPagesController, 'updatePage']);
            $group->post('/static-pages', [$staticPagesController, 'createPage']);
            $group->delete('/static-pages/{id}', [$staticPagesController, 'deletePage']);

            // Banners Management (Admin)
            $bannersRepository = new BannersRepository($this->database->getConnection(), $this->logger);
            $bannersService = new BannersService(
                $bannersRepository,
                $this->logger,
                __DIR__ . '/../public/images/banners', // Absolute upload path
                $this->config->getAppUrl() . '/images/banners' // Public URL base
            );
            $bannersController = new BannersController($bannersService, $this->logger);
            $group->get('/banners', [$bannersController, 'getBanners']);
            $group->put('/banners/positions', [$bannersController, 'updateBannerPositions']);
            $group->get('/banners/{id}', [$bannersController, 'getBanner']);
            $group->post('/banners', [$bannersController, 'createBanner']);
            $group->put('/banners/{id}', [$bannersController, 'updateBanner']);
            $group->delete('/banners/{id}', [$bannersController, 'deleteBanner']);
            $group->post('/banners/{id}/upload', [$bannersController, 'uploadBannerImage']);

            // Ticket Markup Management (Admin)
            $markupRepository = new TicketMarkupRepository($this->database);
            $markupController = new TicketMarkupController($markupRepository, $this->logger);
            $group->post('/ticket-markups/batch', [$markupController, 'batchUpsertMarkups']);
            $group->get('/ticket-markups', [$markupController, 'getAllMarkups']);
            $group->get('/ticket-markups/event/{eventId}', [$markupController, 'getMarkupsByEvent']);
            $group->get('/ticket-markups/ticket/{ticketId}', [$markupController, 'getMarkupByTicket']);
            $group->get('/ticket-markups/{id:[0-9]+}', [$markupController, 'getMarkupById']);
            $group->put('/ticket-markups/{id:[0-9]+}', [$markupController, 'updateMarkup']);
            $group->delete('/ticket-markups/{id:[0-9]+}', [$markupController, 'deleteMarkupById']);
            $group->delete('/ticket-markups/ticket/{ticketId}', [$markupController, 'deleteMarkupByTicket']);
            $group->delete('/ticket-markups/event/{eventId}', [$markupController, 'deleteMarkupsByEvent']);

            // Hierarchical Markup Rules Management (Admin)
            $markupRuleRepository = new MarkupRuleRepository($this->database);
            $markupRuleController = new MarkupRuleController($markupRuleRepository, $this->logger);
            $group->post('/markup-rules', [$markupRuleController, 'createOrUpdateRule']);
            $group->get('/markup-rules', [$markupRuleController, 'getAllRules']);
            $group->get('/markup-rules/{id:[0-9]+}', [$markupRuleController, 'getRuleById']);
            $group->put('/markup-rules/{id:[0-9]+}', [$markupRuleController, 'updateRule']);
            $group->delete('/markup-rules/{id:[0-9]+}', [$markupRuleController, 'deleteRule']);
            $group->get('/markup-rules/sport/{sportType}', [$markupRuleController, 'getRulesBySport']);
            $group->post('/markup-rules/resolve', [$markupRuleController, 'resolveMarkup']);

            // Hospitality Management (Admin)
            $hospitalityRepository = new HospitalityRepository($this->database);
            $hospitalityController = new HospitalityController($hospitalityRepository, $this->logger);
            // CRUD for hospitality services
            $group->get('/hospitalities/stats', [$hospitalityController, 'getHospitalityStats']);
            $group->get('/hospitalities', [$hospitalityController, 'getAllHospitalities']);
            $group->get('/hospitalities/{id:[0-9]+}', [$hospitalityController, 'getHospitalityById']);
            $group->post('/hospitalities', [$hospitalityController, 'createHospitality']);
            $group->put('/hospitalities/{id:[0-9]+}', [$hospitalityController, 'updateHospitality']);
            $group->delete('/hospitalities/{id:[0-9]+}', [$hospitalityController, 'deleteHospitality']);
            // Ticket-Hospitality assignments (legacy)
            $group->get('/hospitalities/event/{eventId}', [$hospitalityController, 'getEventHospitalities']);
            $group->get('/hospitalities/ticket/{eventId}/{ticketId}', [$hospitalityController, 'getTicketHospitalities']);
            $group->post('/hospitalities/ticket/{eventId}/{ticketId}', [$hospitalityController, 'assignTicketHospitalities']);
            $group->post('/hospitalities/batch', [$hospitalityController, 'batchAssignHospitalities']);
            $group->delete('/hospitalities/ticket/{eventId}/{ticketId}', [$hospitalityController, 'removeTicketHospitalities']);
            $group->delete('/hospitalities/event/{eventId}', [$hospitalityController, 'removeEventHospitalities']);

            // Hierarchical Hospitality Assignments (NEW)
            $group->get('/hospitality-assignments', [$hospitalityController, 'getAllAssignments']);
            $group->get('/hospitality-assignments/scope', [$hospitalityController, 'getAssignmentsAtScope']);
            $group->post('/hospitality-assignments', [$hospitalityController, 'createAssignment']);
            $group->post('/hospitality-assignments/batch', [$hospitalityController, 'batchCreateAssignments']);
            $group->put('/hospitality-assignments/scope', [$hospitalityController, 'replaceAssignmentsAtScope']);
            $group->delete('/hospitality-assignments/scope', [$hospitalityController, 'removeAssignmentsAtScope']);
            $group->get('/hospitality-assignments/{id:[0-9]+}', [$hospitalityController, 'getAssignmentById']);
            $group->delete('/hospitality-assignments/{id:[0-9]+}', [$hospitalityController, 'deleteAssignment']);
            $group->post('/hospitality-assignments/resolve', [$hospitalityController, 'resolveForTicket']);
            
            // Cancellation Management (Admin) - using controllers from outer scope
            $group->get('/cancellation-requests/stats', [$adminCancellationController, 'getStatistics']);
            $group->get('/cancellation-requests', [$adminCancellationController, 'getAllRequests']);
            $group->get('/cancellation-requests/{id:[0-9]+}', [$adminCancellationController, 'getRequest']);
            $group->patch('/cancellation-requests/{id:[0-9]+}/approve', [$adminCancellationController, 'approveRequest']);
            $group->patch('/cancellation-requests/{id:[0-9]+}/reject', [$adminCancellationController, 'rejectRequest']);
            $group->patch('/cancellation-requests/{id:[0-9]+}/complete', [$adminCancellationController, 'completeRequest']);

            // Currency Management (Admin)
            $currencyRepository = new CurrencyRepository($this->database->getConnection(), $this->logger);
            $currencyController = new CurrencyController($currencyRepository, $this->logger);
            $group->get('/currencies/stats', [$currencyController, 'getStats']);
            $group->get('/currencies', [$currencyController, 'getCurrencies']);
            $group->get('/currencies/{id:[0-9]+}', [$currencyController, 'getCurrency']);
            $group->post('/currencies', [$currencyController, 'createCurrency']);
            $group->put('/currencies/{id:[0-9]+}', [$currencyController, 'updateCurrency']);
            $group->delete('/currencies/{id:[0-9]+}', [$currencyController, 'deleteCurrency']);
            $group->patch('/currencies/{id:[0-9]+}/set-default', [$currencyController, 'setDefault']);
            $group->patch('/currencies/{id:[0-9]+}/toggle-active', [$currencyController, 'toggleActive']);
            
        })->add(new AuthMiddleware(
            $this->jwtService,
            $this->userRepository,
            $this->logger
        ));

        // Initialize repositories needed for public controllers
        $bookingRepository = new BookingRepository($this->database);

        // Customer Authentication Routes (public)
        $customerRepository = new CustomerRepository($this->database, $this->logger);
        $customerValidationService = new CustomerValidationService($customerRepository, $this->logger);
        $customerJWTService = new CustomerJWTService($customerRepository, $this->database, $this->logger);
        $customerAuthController = new CustomerAuthController(
            $customerRepository,
            $customerJWTService,
            $customerValidationService,
            $this->logger
        );

        $this->app->group('/api/v1/customers/auth', function (\Slim\Routing\RouteCollectorProxy $group) use ($customerAuthController) {
            $group->post('/register', [$customerAuthController, 'register']);
            $group->post('/login', [$customerAuthController, 'login']);
            $group->post('/refresh', [$customerAuthController, 'refreshToken']);
            $group->post('/forgot-password', [$customerAuthController, 'forgotPassword']);
            $group->post('/reset-password', [$customerAuthController, 'resetPassword']);
            $group->post('/verify-email', [$customerAuthController, 'verifyEmail']);
        });

        // Country Routes (public - for registration forms)
        $countryController = new CountryController($this->database, $this->logger);
        $this->app->group('/api/v1/countries', function (\Slim\Routing\RouteCollectorProxy $group) use ($countryController) {
            $group->get('', [$countryController, 'getActiveCountries']);
            $group->get('/search', [$countryController, 'searchCountries']);
        });

        // Currency Routes (public - for currency selection)
        $publicCurrencyRepository = new CurrencyRepository($this->database->getConnection(), $this->logger);
        $publicCurrencyController = new CurrencyController($publicCurrencyRepository, $this->logger);
        $this->app->get('/api/v1/currencies', [$publicCurrencyController, 'getActiveCurrencies']);

        // Payment Routes (public and authenticated)
        $paymentController = new PaymentController(
            $bookingRepository,
            $this->logger,
            $this->xs2eventBridge
        );
        
        // Public payment routes
        $this->app->group('/api/v1/payments', function (\Slim\Routing\RouteCollectorProxy $group) use ($paymentController) {
            $group->post('/create-checkout-session', [$paymentController, 'createCheckoutSession']);
            $group->post('/create-payment-intent', [$paymentController, 'createPaymentIntent']);
            $group->get('/session/{session_id}', [$paymentController, 'getCheckoutSession']);
            $group->post('/webhook', [$paymentController, 'handleWebhook']);
        });

        // Local Booking Routes (public)
        $localBookingController = new LocalBookingController(
            $bookingRepository,
            $customerRepository,
            $this->emailService,
            $this->xs2eventBridge,
            $this->logger
        );
        
        $this->app->group('/api/v1/local-bookings', function (\Slim\Routing\RouteCollectorProxy $group) use ($localBookingController) {
            $group->post('', [$localBookingController, 'createBooking']);
            $group->get('/{id}', [$localBookingController, 'getBooking']);
            $group->put('/{id}/payment-status', [$localBookingController, 'updatePaymentStatus']);
            $group->get('/customer/{customer_email}', [$localBookingController, 'getCustomerBookings']);
        });

        // Public Banner Routes (for frontend display)
        $bannersRepository = new BannersRepository($this->database->getConnection(), $this->logger);
        $bannersService = new BannersService(
            $bannersRepository,
            $this->logger,
            __DIR__ . '/../public/images/banners',
            $this->config->getAppUrl() . '/images/banners'
        );
        $bannersController = new BannersController($bannersService, $this->logger);
        
        $this->app->group('/api/v1/banners', function (\Slim\Routing\RouteCollectorProxy $group) use ($bannersController) {
            $group->get('/{location}', [$bannersController, 'getPublicBanners']);
            $group->post('/{id}/click', [$bannersController, 'trackBannerClick']);
            $group->post('/{id}/impression', [$bannersController, 'trackBannerImpression']);
        });

        // Static Pages public API endpoints
        $publicStaticPagesRepository = new StaticPagesRepository($this->database, $this->logger);
        $publicStaticPagesController = new StaticPagesController($publicStaticPagesRepository, $this->logger);
        $this->app->group('/api/v1/static-pages', function (\Slim\Routing\RouteCollectorProxy $group) use ($publicStaticPagesController) {
            $group->get('', [$publicStaticPagesController, 'getPublishedPages']);
            $group->get('/{key}', [$publicStaticPagesController, 'getPageByKey']);
        });

        // Customer Profile Routes (authenticated)
        $customerAuthMiddleware = new CustomerAuthMiddleware(
            $customerJWTService,
            $customerRepository,
            $this->logger
        );
        $customerProfileController = new CustomerProfileController(
            $customerRepository,
            $customerJWTService,
            $customerValidationService,
            $this->logger
        );
        $customerBookingController = new CustomerBookingController(
            $customerRepository,
            $customerJWTService,
            $this->logger,
            $this->httpClient,
            $this->config->getBaseUrl(),
            $this->config->getApiKey()
        );
        
        $customerETicketController = new CustomerETicketController(
            $this->eTicketService,
            new BookingRepository($this->database),
            $this->logger
        );
        
        // Customer cancellation controller (reuse service from admin section)
        $customerCancellationController = new CustomerCancellationController(
            $cancellationService,
            $this->logger
        );

        $this->app->group('/api/v1/customers', function (\Slim\Routing\RouteCollectorProxy $group) use ($customerAuthController, $customerProfileController, $customerBookingController, $customerETicketController, $customerCancellationController) {
            // Authentication routes that require token
            $group->post('/logout', [$customerAuthController, 'logout']);
            
            // Profile management
            $group->get('/profile', [$customerProfileController, 'getProfile']);
            $group->put('/profile', [$customerProfileController, 'updateProfile']);
            $group->put('/profile/address', [$customerProfileController, 'updateAddress']);
            $group->put('/profile/password', [$customerProfileController, 'changePassword']);
            $group->delete('/profile', [$customerProfileController, 'deleteAccount']);
            
            // Session management
            $group->get('/sessions', [$customerProfileController, 'getSessions']);
            $group->delete('/sessions', [$customerProfileController, 'revokeOtherSessions']);
            
            // Booking management
            $group->get('/bookings', [$customerBookingController, 'getCustomerBookings']);
            $group->post('/bookings', [$customerBookingController, 'createBooking']);
            $group->get('/bookings/{booking_id:[a-zA-Z0-9_-]+}', [$customerBookingController, 'getBooking']);
            
            // E-Ticket management (new routes)
            $group->get('/tickets', [$customerETicketController, 'getMyTickets']);
            $group->get('/bookings/{id:[0-9]+}/tickets/status', [$customerETicketController, 'getTicketStatus']);
            $group->get('/bookings/{id:[0-9]+}/tickets/download', [$customerETicketController, 'downloadTicket']);
            $group->get('/bookings/{id:[0-9]+}/tickets/zip', [$customerETicketController, 'downloadZip']);
            $group->post('/bookings/{id:[0-9]+}/tickets/check-availability', [$customerETicketController, 'checkAvailability']);
            
            // Cancellation management
            $group->post('/bookings/{id:[0-9]+}/cancel-request', [$customerCancellationController, 'requestCancellation']);
            $group->get('/bookings/{id:[0-9]+}/cancel-request', [$customerCancellationController, 'getCancellationStatus']);
            $group->delete('/bookings/{id:[0-9]+}/cancel-request', [$customerCancellationController, 'cancelCancellationRequest']);
            
            // Reservation management
            $group->get('/reservations', [$customerBookingController, 'getCustomerReservations']);
            $group->post('/reservations', [$customerBookingController, 'createReservation']);
        })->add($customerAuthMiddleware);
        
        // API documentation endpoint
        $this->app->get('/openapi.json', function (Request $request, Response $response) {
            $openApiFile = __DIR__ . '/../../docs/openapi.json';
            if (file_exists($openApiFile)) {
                $response->getBody()->write(file_get_contents($openApiFile));
                return $response->withHeader('Content-Type', 'application/json');
            }
            return $response->withStatus(404);
        });
        
        // Instantiate controllers
        $sportsController = new SportsController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $tournamentsController = new TournamentsController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $teamsController = new TeamsController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $eventsController = new EventsController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $venuesController = new VenuesController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $categoriesController = new CategoriesController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $countriesController = new CountriesController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $citiesController = new CitiesController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $ticketsController = new TicketsController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $reservationsController = new ReservationsController($this->httpClient, $this->logger);
        $bookingsController = new BookingsController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $bookingOrdersController = new BookingOrdersController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $eTicketsController = new ETicketsController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $searchController = new SearchController($this->logger, $this->httpClient, $this->config->getBaseUrl(), $this->config->getApiKey());
        $statusController = new StatusController($this->logger, $this->httpClient, $this->config, $this->config->getBaseUrl(), $this->config->getApiKey());
        
        // Public team credentials controller
        $publicTeamCredentialsRepository = new TeamCredentialsRepository($this->database);
        $publicTeamCredentialsService = new TeamCredentialsService(
            $publicTeamCredentialsRepository,
            $this->activityLogger,
            $this->httpClient,
            $this->config->getBaseUrl(),
            $this->config->getApiKey(),
            __DIR__ . '/../public/images/team', // Absolute upload path
            '/images/team' // Public URL path
        );
        $publicTeamCredentialsController = new TeamCredentialsController(
            $publicTeamCredentialsRepository,
            $publicTeamCredentialsService,
            $this->activityLogger,
            $this->logger
        );
        
        // Sports endpoints
        $this->app->get('/v1/sports', [$sportsController, 'getAllSports']);
        
        // Tournaments endpoints
        $this->app->get('/v1/tournaments', [$tournamentsController, 'listTournaments']);
        $this->app->get('/v1/tournaments/{sport_type}', [$tournamentsController, 'listTournaments']);
        $this->app->get('/v1/tournaments/{tournament_id:[a-f0-9-]+}', [$tournamentsController, 'getTournament']);
        $this->app->get('/v1/tournament/{id:[a-f0-9-]+}/events', [$tournamentsController, 'getTournamentEvents']);
        
        // Teams endpoints
        $this->app->get('/v1/teams', [$teamsController, 'listTeams']);
        $this->app->get('/v1/teams/{team_id:[a-zA-Z0-9_-]+}', [$teamsController, 'getTeam']);
        
        // Team credentials endpoints
        $this->app->get('/v1/team-credentials/featured', [$publicTeamCredentialsController, 'getFeaturedTeamCredentials']);
        $this->app->get('/v1/team-credentials/tournament/{tournament_id}/team/{team_id}', [$publicTeamCredentialsController, 'getPublicTeamCredential']);
        
        // Events endpoints
        $this->app->get('/v1/events', [$eventsController, 'listEvents']);
        $this->app->get('/v1/events/{id:[a-zA-Z0-9_-]+}', [$eventsController, 'getEvent']);
        $this->app->get('/v1/events/{event_id:[a-zA-Z0-9_-]+}/guestdata', [$eventsController, 'getEventGuestDataRequirements']);
        
        // Venues endpoints
        $this->app->get('/v1/venues', [$venuesController, 'listVenues']);
        $this->app->get('/v1/venues/{id:[a-f0-9-]+}', [$venuesController, 'getVenue']);
        
        // Categories endpoints
        $this->app->get('/v1/categories', [$categoriesController, 'listCategories']);
        $this->app->get('/v1/categories/{id:[a-f0-9-]+}', [$categoriesController, 'getCategory']);
        
        // Countries endpoints
        $this->app->get('/v1/countries', [$countriesController, 'listCountries']);
        
        // Cities endpoints
        $this->app->get('/v1/cities', [$citiesController, 'listCities']);
        
        // Tickets endpoints
        $this->app->get('/v1/tickets', [$ticketsController, 'listTickets']);
        $this->app->get('/v1/tickets/{id:[a-zA-Z0-9_-]+}', [$ticketsController, 'getTicket']);
        $this->app->get('/v1/tickets/{id:[a-zA-Z0-9_-]+}/guestdata', [$ticketsController, 'getTicketGuestDataRequirements']);
        
        // Public Ticket Enhancements (Markup Pricing & Hospitality)
        $markupRepository = new TicketMarkupRepository($this->database);
        $markupRuleRepository2 = new MarkupRuleRepository($this->database);
        $hospitalityRepository = new HospitalityRepository($this->database);
        $publicEnhancementsController = new PublicTicketEnhancementsController(
            $this->logger,
            $markupRepository,
            $markupRuleRepository2,
            $hospitalityRepository
        );
        $this->app->get('/v1/events/{eventId}/markups', [$publicEnhancementsController, 'getEventMarkups']);
        $this->app->get('/v1/tickets/{ticketId}/markup', [$publicEnhancementsController, 'getTicketMarkup']);
        $this->app->get('/v1/events/{eventId}/effective-markups', [$publicEnhancementsController, 'getEventEffectiveMarkups']);
        $this->app->get('/v1/events/{eventId}/tickets/{ticketId}/effective-markup', [$publicEnhancementsController, 'getEffectiveMarkup']);
        $this->app->get('/v1/events/{eventId}/hospitalities', [$publicEnhancementsController, 'getEventHospitalities']);
        $this->app->get('/v1/tickets/{ticketId}/hospitalities', [$publicEnhancementsController, 'getTicketHospitalities']);
        $this->app->get('/v1/hospitalities', [$publicEnhancementsController, 'getActiveHospitalities']);
        $this->app->get('/v1/events/{eventId}/effective-hospitalities', [$publicEnhancementsController, 'getEventEffectiveHospitalities']);
        $this->app->get('/v1/events/{eventId}/tickets/{ticketId}/effective-hospitalities', [$publicEnhancementsController, 'getTicketEffectiveHospitalities']);
        
        // Reservations endpoints
        $this->app->get('/v1/reservations', [$reservationsController, 'getReservations']);
        $this->app->post('/v1/reservations', [$reservationsController, 'createReservation']);
        $this->app->get('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}', [$reservationsController, 'getReservation']);
        $this->app->put('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}', [$reservationsController, 'updateReservation']);
        $this->app->delete('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}', [$reservationsController, 'deleteReservation']);
        $this->app->patch('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}', [$reservationsController, 'patchReservation']);
        $this->app->get('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}/guestdata', [$reservationsController, 'getReservationGuestData']);
        $this->app->post('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}/guests', [$reservationsController, 'addReservationGuests']);
        $this->app->get('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}/guestdata/{guest_id:[a-zA-Z0-9_-]+}', [$reservationsController, 'getReservationGuestDetail']);
        $this->app->put('/v1/reservations/{reservation_id:[a-zA-Z0-9_-]+}/guestdata/{guest_id:[a-zA-Z0-9_-]+}', [$reservationsController, 'updateReservationGuestDetail']);
        
        // Booking endpoints
        $this->app->get('/v1/bookings', [$bookingsController, 'getBookings']);
        $this->app->post('/v1/bookings', [$bookingsController, 'createBooking']);
        $this->app->get('/v1/bookings/{booking_id:[a-zA-Z0-9_-]+}', [$bookingsController, 'getBooking']);
        $this->app->get('/v1/bookings/reservation/{reservation_id:[a-zA-Z0-9_-]+}', [$bookingsController, 'getBookingsByReservation']);
        
        // Booking Orders endpoints
        $this->app->get('/v1/bookingorders/list', [$bookingOrdersController, 'getBookingOrders']);
        $this->app->get('/v1/bookingorders/{bookingorder_id:[a-zA-Z0-9_-]+}', [$bookingOrdersController, 'getBookingOrder']);
        $this->app->get('/v1/bookingorders/{bookingorder_id:[a-zA-Z0-9_-]+}/guestdata', [$bookingOrdersController, 'getBookingOrderGuestData']);
        $this->app->put('/v1/bookingorders/{bookingorder_id:[a-zA-Z0-9_-]+}/guestdata', [$bookingOrdersController, 'updateBookingOrderGuestData']);
        $this->app->get('/v1/bookingorders/{bookingorder_id:[a-zA-Z0-9_-]+}/guestdata/{guest_id:[a-zA-Z0-9_-]+}', [$bookingOrdersController, 'getBookingOrderGuestDetail']);
        $this->app->put('/v1/bookingorders/{bookingorder_id:[a-zA-Z0-9_-]+}/guestdata/{guest_id:[a-zA-Z0-9_-]+}', [$bookingOrdersController, 'updateBookingOrderGuestDetail']);
        
        // ETickets endpoints
        $this->app->get('/v1/etickets', [$eTicketsController, 'listETickets']);
        $this->app->get('/v1/etickets/download/zip/{bookingorder_id:[a-zA-Z0-9_-]+}', [$eTicketsController, 'getETicketsZipUrl']);
        $this->app->get('/v1/etickets/download/{bookingorder_id:[a-zA-Z0-9_-]+}/{orderitem_id:[a-zA-Z0-9_-]+}/url/{url:.+}', [$eTicketsController, 'downloadETicket']);
        
        // Search endpoint
        $this->app->get('/v1/search', [$searchController, 'search']);
        
        // Status endpoint
        $this->app->get('/v1/status', [$statusController, 'getStatus']);
        
        // Proxy all other requests to XS2Event API
        $proxyController = new ProxyController(
            $this->httpClient,
            $this->logger,
            [
                'base_url' => $this->config->getBaseUrl(),
                'api_key' => $this->config->getApiKey(),
                'timeout' => $this->config->getProxyRequestTimeoutMs(),
                'max_retries' => $this->config->getProxyMaxRetries(),
                'backoff_ms' => $this->config->getProxyBackoffMs(),
            ]
        );
        $this->app->map(
            ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            '/v1/[{params:.*}]',
            [$proxyController, 'handleRequest']
        );
        
        // Add a nice message for the root path
        $this->app->get('/', function (Request $request, Response $response) {
            $response->getBody()->write(json_encode([
                'service' => 'XS2Event Proxy API',
                'version' => '1.0.0',
                'endpoints' => [
                    'GET /healthz' => 'Health check endpoint',
                    'GET /openapi.json' => 'OpenAPI specification',
                    'POST /auth/login' => 'Admin login endpoint',
                    'POST /auth/refresh' => 'Refresh JWT token',
                    'POST /auth/logout' => 'Admin logout (protected)',
                    'GET /auth/me' => 'Get current admin user (protected)',
                    'GET /admin/activities' => 'Get user activities (protected)',
                    'GET /admin/activities/all' => 'Get all activities (admin only)',
                    'GET /admin/auth-stats' => 'Get authentication statistics (admin only)',
                    'GET /admin/static-pages' => 'Get all static pages (admin only)',
                    'GET /admin/static-pages/{id}' => 'Get static page by ID (admin only)',
                    'PUT /admin/static-pages/{id}' => 'Update static page (admin only)',
                    'POST /admin/static-pages' => 'Create new static page (admin only)',
                    'DELETE /admin/static-pages/{id}' => 'Delete static page (admin only)',
                    'GET /v1/sports' => 'Get all supported sports',
                    'GET /v1/tournaments' => 'Get tournaments (with optional sport_type filter)',
                    'GET /v1/events' => 'Get events (with various filters)',
                    'GET /v1/venues' => 'Get venues information',
                    'GET /v1/countries' => 'Get countries list (ISO-3 format)',
                    'GET /api/v1/static-pages' => 'Get published static pages (public)',
                    'GET /api/v1/static-pages/{key}' => 'Get published page by key (public)',
                    'GET /v1/cities' => 'Get cities list with filtering options',
                    'GET /v1/reservations' => 'Get, create, update, delete reservations with guest data management',
                    'GET /v1/bookings' => 'Get, create bookings with comprehensive filtering and reservation tracking',
                    'GET /v1/bookingorders' => 'Get booking orders with advanced filtering and guest data management',
                    'GET /v1/etickets' => 'Get, download e-tickets with zip archives and individual PDF downloads',
                    'ALL /v1/*' => 'XS2Event API proxy'
                ]
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return $response->withHeader('Content-Type', 'application/json');
        });
    }
    
    public function run(): void
    {
        $this->app->run();
    }
}
