<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarangaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get municipality IDs
        $municipalities = DB::table('municipalities')->get()->keyBy('name');
        
        // San Isidro barangays (14 barangays)
        $sanIsidroBarangays = [
            'Alegria', 'Balite', 'Buenavista', 'Caglanipao', 'Happy Valley',
            'Mabuhay', 'Palanit', 'Poblacion Norte', 'Salvacion', 'San Juan',
            'San Isidro', 'San Roque', 'Seven Hills', 'Veriato'
        ];
        
        // Victoria barangays (16 barangays)
        $victoriaBarangays = [
            'Acedillo', 'Buenasuerte', 'Buenos Aires', 'Colab-og', 'Erenas',
            'Libertad', 'Luisita', 'Lungib', 'Maxvilla', 'Pasabuena',
            'San Lazaro', 'San Miguel', 'San Roman', 'Zone I', 'Zone II', 'Zone III'
        ];
        
        // Allen barangays (20 barangays - sample, add all as needed)
        $allenBarangays = [
            'Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Poblacion 4', 'Poblacion 5',
            // Add remaining barangays as per actual data
        ];
        
        // Lavezares barangays (26 barangays - sample)
        $lavezaresBarangays = [
            'Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Poblacion 4', 'Poblacion 5',
            // Add remaining barangays as per actual data
        ];
        
        // Rosario barangays (11 barangays)
        $rosarioBarangays = [
            'Aguada', 'Bantolinao', 'Buenavista', 'Commonwealth', 'Guindaulan',
            'Jamoog', 'Kailingan', 'Ligaya', 'Poblacion (Estillero)', 'Salhag', 'San Lorenzo'
        ];
        
        // Insert San Isidro barangays
        if (isset($municipalities['San Isidro'])) {
            foreach ($sanIsidroBarangays as $barangay) {
                DB::table('barangays')->insert([
                    'municipality_id' => $municipalities['San Isidro']->id,
                    'name' => $barangay,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        
        // Insert Victoria barangays
        if (isset($municipalities['Victoria'])) {
            foreach ($victoriaBarangays as $barangay) {
                DB::table('barangays')->insert([
                    'municipality_id' => $municipalities['Victoria']->id,
                    'name' => $barangay,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        
        // Insert Rosario barangays
        if (isset($municipalities['Rosario'])) {
            foreach ($rosarioBarangays as $barangay) {
                DB::table('barangays')->insert([
                    'municipality_id' => $municipalities['Rosario']->id,
                    'name' => $barangay,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        
        // Note: Add complete barangay lists for Allen and Lavezares as needed
    }
}

