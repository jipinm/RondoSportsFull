<?php
// Simple CORS test script
// Access this file directly to verify CORS headers are being sent

header('Content-Type: application/json');

$origin = $_SERVER['HTTP_ORIGIN'] ?? 'not set';
$requestMethod = $_SERVER['REQUEST_METHOD'];

echo json_encode([
    'message' => 'CORS Test',
    'origin' => $origin,
    'method' => $requestMethod,
    'headers_sent' => headers_list(),
    'allowed_origins' => $_ENV['CORS_ALLOWED_ORIGINS'] ?? 'not set'
], JSON_PRETTY_PRINT);
