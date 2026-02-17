<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncidentMedia extends Model
{
    use HasFactory;

    protected $table = 'incident_media';

    protected $fillable = [
        'incident_id',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'mime_type',
    ];

    /**
     * Get the incident that owns this media.
     */
    public function incident()
    {
        return $this->belongsTo(Incident::class);
    }
}

