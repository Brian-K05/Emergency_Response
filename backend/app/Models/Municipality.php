<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Municipality extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
    ];

    /**
     * Get the barangays in this municipality.
     */
    public function barangays()
    {
        return $this->hasMany(Barangay::class);
    }

    /**
     * Get the users in this municipality.
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the incidents in this municipality.
     */
    public function incidents()
    {
        return $this->hasMany(Incident::class);
    }
}

