<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_id',
        'responder_id',
        'assigned_by',
        'status',
        'notes',
    ];

    /**
     * Get the incident for this assignment.
     */
    public function incident()
    {
        return $this->belongsTo(Incident::class);
    }

    /**
     * Get the responder (user) assigned to this incident.
     */
    public function responder()
    {
        return $this->belongsTo(User::class, 'responder_id');
    }

    /**
     * Get the user who made this assignment.
     */
    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}

