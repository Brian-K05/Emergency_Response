<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->onDelete('cascade');
            $table->enum('incident_type', ['fire', 'medical', 'accident', 'natural_disaster', 'crime', 'other']);
            $table->string('title');
            $table->text('description');
            $table->string('location_address');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->foreignId('barangay_id')->nullable()->constrained('barangays')->onDelete('set null');
            $table->foreignId('municipality_id')->nullable()->constrained('municipalities')->onDelete('set null');
            $table->enum('urgency_level', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['reported', 'assigned', 'in_progress', 'resolved', 'cancelled'])->default('reported');
            $table->string('contact_number')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};

