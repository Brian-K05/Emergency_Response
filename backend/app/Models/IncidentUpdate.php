<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncidentUpdate extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_id',
        'updated_by',
        'update_message',
        'previous_status',
        'new_status',
    ];

    /**
     * Get the incident that this update belongs to.
     */
    public function incident()
    {
        return $this->belongsTo(Incident::class);
    }

    /**
     * Get the user who made this update.
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

