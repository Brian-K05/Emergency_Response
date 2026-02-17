<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get user's notifications.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Notification::where('user_id', $user->id)
            ->with('incident')
            ->orderBy('created_at', 'desc');

        // Filter unread only
        if ($request->has('unread_only') && $request->unread_only) {
            $query->where('is_read', false);
        }

        $perPage = $request->get('per_page', 20);
        $notifications = $query->paginate($perPage);

        return NotificationResource::collection($notifications);
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead($id, Request $request)
    {
        $notification = Notification::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => new NotificationResource($notification),
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        
        Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Get unread notification count.
     */
    public function unreadCount(Request $request)
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }
}

