<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'username',
        'email',
        'password',
        'full_name',
        'age',
        'gender',
        'civil_status',
        'educational_attainment',
        'trainings_seminars_attended',
        'role',
        'municipality_id',
        'barangay_id',
        'phone_number',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'trainings_seminars_attended' => 'array', // If storing as JSON
    ];

    /**
     * Get the municipality that the user belongs to.
     */
    public function municipality()
    {
        return $this->belongsTo(Municipality::class);
    }

    /**
     * Get the barangay that the user belongs to.
     */
    public function barangay()
    {
        return $this->belongsTo(Barangay::class);
    }

    /**
     * Get the incidents reported by this user.
     */
    public function reportedIncidents()
    {
        return $this->hasMany(Incident::class, 'reporter_id');
    }

    /**
     * Get the assignments for this user (as responder).
     */
    public function assignments()
    {
        return $this->hasMany(Assignment::class, 'responder_id');
    }

    /**
     * Get the notifications for this user.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Check if user is admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is MDRRMO staff.
     */
    public function isMDRRMO(): bool
    {
        return $this->role === 'mdrrmo';
    }

    /**
     * Check if user is responder.
     */
    public function isResponder(): bool
    {
        return $this->role === 'responder';
    }

    /**
     * Check if user is barangay official.
     */
    public function isBarangayOfficial(): bool
    {
        return $this->role === 'barangay_official';
    }
}

