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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('full_name');
            $table->integer('age')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->enum('civil_status', ['single', 'married', 'divorced', 'widowed'])->nullable();
            $table->string('educational_attainment')->nullable();
            $table->text('trainings_seminars_attended')->nullable(); // JSON or comma-separated
            $table->enum('role', ['admin', 'mdrrmo', 'responder', 'barangay_official', 'resident'])->default('resident');
            $table->foreignId('municipality_id')->nullable()->constrained('municipalities')->onDelete('set null');
            $table->foreignId('barangay_id')->nullable()->constrained('barangays')->onDelete('set null');
            $table->string('phone_number')->nullable();
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};

