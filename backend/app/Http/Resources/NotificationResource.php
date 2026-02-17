<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
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
            'notification_type' => $this->notification_type,
            'title' => $this->title,
            'message' => $this->message,
            'is_read' => $this->is_read,
            'read_at' => $this->read_at,
            'incident' => $this->when($this->incident_id, function () {
                return [
                    'id' => $this->incident->id,
                    'title' => $this->incident->title,
                    'status' => $this->incident->status,
                ];
            }),
            'created_at' => $this->created_at,
        ];
    }
}

