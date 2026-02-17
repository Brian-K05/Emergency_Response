<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Incident extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'reporter_id',
        'incident_type',
        'title',
        'description',
        'location_address',
        'latitude',
        'longitude',
        'barangay_id',
        'municipality_id',
        'urgency_level',
        'status',
        'contact_number',
        'resolved_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'resolved_at' => 'datetime',
    ];

    /**
     * Get the user who reported this incident.
     */
    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /**
     * Get the municipality where the incident occurred.
     */
    public function municipality()
    {
        return $this->belongsTo(Municipality::class);
    }

    /**
     * Get the barangay where the incident occurred.
     */
    public function barangay()
    {
        return $this->belongsTo(Barangay::class);
    }

    /**
     * Get the media files for this incident.
     */
    public function media()
    {
        return $this->hasMany(IncidentMedia::class);
    }

    /**
     * Get the assignments for this incident.
     */
    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }

    /**
     * Get the updates for this incident.
     */
    public function updates()
    {
        return $this->hasMany(IncidentUpdate::class);
    }

    /**
     * Get the notifications related to this incident.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }
}

