<?php
declare(strict_types=1);

// Suppress HTML error output for API
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/../vendor/autoload.php';

use XS2EventProxy\Application;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Create application
$app = new Application();

// Run application
$app->run();
