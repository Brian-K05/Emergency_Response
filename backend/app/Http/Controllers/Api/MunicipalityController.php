<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Municipality;
use Illuminate\Http\Request;

class MunicipalityController extends Controller
{
    /**
     * Get all municipalities.
     */
    public function index()
    {
        $municipalities = Municipality::orderBy('name')->get();
        
        return response()->json($municipalities);
    }

    /**
     * Get barangays for a specific municipality.
     */
    public function getBarangays($municipalityId)
    {
        $municipality = Municipality::findOrFail($municipalityId);
        $barangays = $municipality->barangays()->orderBy('name')->get();
        
        return response()->json($barangays);
    }
}

