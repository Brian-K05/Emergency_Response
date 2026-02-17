<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Barangay extends Model
{
    use HasFactory;

    protected $fillable = [
        'municipality_id',
        'name',
        'code',
    ];

    /**
     * Get the municipality that this barangay belongs to.
     */
    public function municipality()
    {
        return $this->belongsTo(Municipality::class);
    }

    /**
     * Get the users in this barangay.
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the incidents in this barangay.
     */
    public function incidents()
    {
        return $this->hasMany(Incident::class);
    }
}

