<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IncidentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'incident_type' => $this->incident_type,
            'title' => $this->title,
            'description' => $this->description,
            'location_address' => $this->location_address,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'urgency_level' => $this->urgency_level,
            'status' => $this->status,
            'contact_number' => $this->contact_number,
            'reporter' => [
                'id' => $this->reporter->id,
                'full_name' => $this->reporter->full_name,
                'phone_number' => $this->reporter->phone_number,
            ],
            'municipality' => $this->municipality ? [
                'id' => $this->municipality->id,
                'name' => $this->municipality->name,
            ] : null,
            'barangay' => $this->barangay ? [
                'id' => $this->barangay->id,
                'name' => $this->barangay->name,
            ] : null,
            'media' => $this->whenLoaded('media', function () {
                return $this->media->map(function ($media) {
                    return [
                        'id' => $media->id,
                        'file_path' => asset('storage/' . $media->file_path),
                        'file_name' => $media->file_name,
                        'file_type' => $media->file_type,
                    ];
                });
            }),
            'assignments' => $this->whenLoaded('assignments', function () {
                return $this->assignments->map(function ($assignment) {
                    return [
                        'id' => $assignment->id,
                        'responder' => [
                            'id' => $assignment->responder->id,
                            'full_name' => $assignment->responder->full_name,
                        ],
                        'status' => $assignment->status,
                        'assigned_at' => $assignment->created_at,
                    ];
                });
            }),
            'updates' => $this->whenLoaded('updates', function () {
                return $this->updates->map(function ($update) {
                    return [
                        'id' => $update->id,
                        'message' => $update->update_message,
                        'previous_status' => $update->previous_status,
                        'new_status' => $update->new_status,
                        'updated_by' => $update->updatedBy->full_name,
                        'updated_at' => $update->created_at,
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'resolved_at' => $this->resolved_at,
        ];
    }
}

