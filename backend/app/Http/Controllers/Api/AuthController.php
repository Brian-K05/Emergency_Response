<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'full_name' => 'required|string|max:255',
            'age' => 'nullable|integer|min:1|max:120',
            'gender' => 'nullable|in:male,female,other',
            'civil_status' => 'nullable|in:single,married,divorced,widowed',
            'educational_attainment' => 'nullable|string|max:255',
            'trainings_seminars_attended' => 'nullable|string',
            'role' => 'required|in:admin,mdrrmo,responder,barangay_official,resident',
            'municipality_id' => 'nullable|exists:municipalities,id',
            'barangay_id' => 'nullable|exists:barangays,id',
            'phone_number' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'full_name' => $validated['full_name'],
            'age' => $validated['age'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'civil_status' => $validated['civil_status'] ?? null,
            'educational_attainment' => $validated['educational_attainment'] ?? null,
            'trainings_seminars_attended' => $validated['trainings_seminars_attended'] ?? null,
            'role' => $validated['role'],
            'municipality_id' => $validated['municipality_id'] ?? null,
            'barangay_id' => $validated['barangay_id'] ?? null,
            'phone_number' => $validated['phone_number'] ?? null,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user->load(['municipality', 'barangay']),
            'token' => $token,
        ], 201);
    }

    /**
     * Login user and create token.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account is inactive. Please contact administrator.',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user->load(['municipality', 'barangay']),
            'token' => $token,
        ]);
    }

    /**
     * Logout user (revoke token).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get authenticated user.
     */
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load(['municipality', 'barangay']),
        ]);
    }
}

