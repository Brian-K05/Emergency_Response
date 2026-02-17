<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\MunicipalityController;
use App\Http\Controllers\Api\NotificationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public data routes
Route::get('/municipalities', [MunicipalityController::class, 'index']);
Route::get('/municipalities/{id}/barangays', [MunicipalityController::class, 'getBarangays']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    
    // Incident routes
    Route::get('/incidents', [IncidentController::class, 'index']);
    Route::post('/incidents', [IncidentController::class, 'store']);
    Route::get('/incidents/{id}', [IncidentController::class, 'show']);
    Route::post('/incidents/{id}/update-status', [IncidentController::class, 'updateStatus']);
    
    // Assignment routes (Admin/MDRRMO only)
    Route::middleware('role:admin,mdrrmo')->group(function () {
        Route::post('/incidents/{id}/assign', [IncidentController::class, 'assignResponder']);
    });
    
    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
