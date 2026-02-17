<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IncidentResource;
use App\Models\Incident;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class IncidentController extends Controller
{
    /**
     * Get all incidents with filters.
     */
    public function index(Request $request)
    {
        $query = Incident::with(['reporter', 'municipality', 'barangay', 'media', 'assignments.responder']);

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('incident_type')) {
            $query->where('incident_type', $request->incident_type);
        }

        if ($request->has('municipality_id')) {
            $query->where('municipality_id', $request->municipality_id);
        }

        if ($request->has('barangay_id')) {
            $query->where('barangay_id', $request->barangay_id);
        }

        if ($request->has('urgency_level')) {
            $query->where('urgency_level', $request->urgency_level);
        }

        // Date range filter
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Role-based filtering
        $user = $request->user();
        if ($user->role === 'resident') {
            $query->where('reporter_id', $user->id);
        } elseif ($user->role === 'responder') {
            $query->whereHas('assignments', function ($q) use ($user) {
                $q->where('responder_id', $user->id);
            });
        } elseif ($user->role === 'barangay_official') {
            $query->where('barangay_id', $user->barangay_id);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $incidents = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return IncidentResource::collection($incidents);
    }

    /**
     * Create a new incident report.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'incident_type' => 'required|in:fire,medical,accident,natural_disaster,crime,other',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'location_address' => 'required|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'barangay_id' => 'nullable|exists:barangays,id',
            'municipality_id' => 'nullable|exists:municipalities,id',
            'urgency_level' => 'required|in:low,medium,high,critical',
            'contact_number' => 'nullable|string|max:20',
            'media.*' => 'nullable|file|mimes:jpeg,jpg,png,gif,mp4,mov|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $incident = Incident::create([
            'reporter_id' => $user->id,
            'incident_type' => $request->incident_type,
            'title' => $request->title,
            'description' => $request->description,
            'location_address' => $request->location_address,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'barangay_id' => $request->barangay_id,
            'municipality_id' => $request->municipality_id,
            'urgency_level' => $request->urgency_level,
            'contact_number' => $request->contact_number ?? $user->phone_number,
            'status' => 'reported',
        ]);

        // Handle file uploads
        if ($request->hasFile('media')) {
            foreach ($request->file('media') as $file) {
                $path = $file->store('incidents', 'public');
                $incident->media()->create([
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => strpos($file->getMimeType(), 'image') !== false ? 'image' : 'video',
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ]);
            }
        }

        // Create incident update log
        $incident->updates()->create([
            'updated_by' => $user->id,
            'update_message' => 'Incident reported',
            'new_status' => 'reported',
        ]);

        // Notify MDRRMO staff and relevant responders
        $this->notifyRelevantUsers($incident);

        return response()->json([
            'message' => 'Incident reported successfully',
            'incident' => new IncidentResource($incident->load(['reporter', 'municipality', 'barangay', 'media'])),
        ], 201);
    }

    /**
     * Get a specific incident.
     */
    public function show($id)
    {
        $incident = Incident::with([
            'reporter',
            'municipality',
            'barangay',
            'media',
            'assignments.responder',
            'assignments.assignedBy',
            'updates.updatedBy'
        ])->findOrFail($id);

        return new IncidentResource($incident);
    }

    /**
     * Update incident status.
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:reported,assigned,in_progress,resolved,cancelled',
            'update_message' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $incident = Incident::findOrFail($id);
        $user = $request->user();

        // Check permissions
        if (!in_array($user->role, ['admin', 'mdrrmo', 'responder']) && 
            $incident->reporter_id !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized to update this incident',
            ], 403);
        }

        $previousStatus = $incident->status;
        $incident->status = $request->status;

        if ($request->status === 'resolved') {
            $incident->resolved_at = now();
        }

        $incident->save();

        // Create update log
        $incident->updates()->create([
            'updated_by' => $user->id,
            'update_message' => $request->update_message ?? "Status changed from {$previousStatus} to {$request->status}",
            'previous_status' => $previousStatus,
            'new_status' => $request->status,
        ]);

        // Notify relevant users
        $this->notifyStatusUpdate($incident, $previousStatus);

        return response()->json([
            'message' => 'Incident status updated successfully',
            'incident' => new IncidentResource($incident->load(['reporter', 'municipality', 'barangay'])),
        ]);
    }

    /**
     * Assign responder to incident.
     */
    public function assignResponder(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'responder_id' => 'required|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $incident = Incident::findOrFail($id);
        $user = $request->user();

        // Only admin and MDRRMO can assign responders
        if (!in_array($user->role, ['admin', 'mdrrmo'])) {
            return response()->json([
                'message' => 'Unauthorized to assign responders',
            ], 403);
        }

        // Check if responder has responder role
        $responder = \App\Models\User::findOrFail($request->responder_id);
        if ($responder->role !== 'responder') {
            return response()->json([
                'message' => 'Selected user is not a responder',
            ], 422);
        }

        // Create assignment
        $assignment = $incident->assignments()->create([
            'responder_id' => $request->responder_id,
            'assigned_by' => $user->id,
            'status' => 'assigned',
            'notes' => $request->notes,
        ]);

        // Update incident status
        if ($incident->status === 'reported') {
            $incident->status = 'assigned';
            $incident->save();
        }

        // Create update log
        $incident->updates()->create([
            'updated_by' => $user->id,
            'update_message' => "Responder {$responder->full_name} assigned to this incident",
            'new_status' => 'assigned',
        ]);

        // Notify assigned responder
        Notification::create([
            'user_id' => $responder->id,
            'incident_id' => $incident->id,
            'notification_type' => 'incident_assigned',
            'title' => 'New Incident Assignment',
            'message' => "You have been assigned to incident: {$incident->title}",
        ]);

        return response()->json([
            'message' => 'Responder assigned successfully',
            'assignment' => $assignment->load('responder'),
            'incident' => new IncidentResource($incident->load(['reporter', 'municipality', 'barangay'])),
        ]);
    }

    /**
     * Notify relevant users about new incident.
     */
    private function notifyRelevantUsers($incident)
    {
        // Notify MDRRMO staff
        $mdrrmoStaff = \App\Models\User::where('role', 'mdrrmo')
            ->where('municipality_id', $incident->municipality_id)
            ->get();

        foreach ($mdrrmoStaff as $staff) {
            Notification::create([
                'user_id' => $staff->id,
                'incident_id' => $incident->id,
                'notification_type' => 'new_incident',
                'title' => 'New Incident Reported',
                'message' => "New {$incident->incident_type} incident reported: {$incident->title}",
            ]);
        }

        // Notify barangay officials in the area
        if ($incident->barangay_id) {
            $barangayOfficials = \App\Models\User::where('role', 'barangay_official')
                ->where('barangay_id', $incident->barangay_id)
                ->get();

            foreach ($barangayOfficials as $official) {
                Notification::create([
                    'user_id' => $official->id,
                    'incident_id' => $incident->id,
                    'notification_type' => 'new_incident',
                    'title' => 'New Incident in Your Area',
                    'message' => "New incident reported in your barangay: {$incident->title}",
                ]);
            }
        }
    }

    /**
     * Notify users about status update.
     */
    private function notifyStatusUpdate($incident, $previousStatus)
    {
        // Notify reporter
        Notification::create([
            'user_id' => $incident->reporter_id,
            'incident_id' => $incident->id,
            'notification_type' => 'status_update',
            'title' => 'Incident Status Updated',
            'message' => "Your incident status has been updated to: {$incident->status}",
        ]);

        // Notify assigned responders
        foreach ($incident->assignments as $assignment) {
            if ($assignment->responder_id !== $incident->reporter_id) {
                Notification::create([
                    'user_id' => $assignment->responder_id,
                    'incident_id' => $incident->id,
                    'notification_type' => 'status_update',
                    'title' => 'Incident Status Updated',
                    'message' => "Incident status updated to: {$incident->status}",
                ]);
            }
        }
    }
}

