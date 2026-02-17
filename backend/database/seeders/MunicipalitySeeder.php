<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MunicipalitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $municipalities = [
            ['name' => 'San Isidro', 'code' => 'SI'],
            ['name' => 'Victoria', 'code' => 'VIC'],
            ['name' => 'Allen', 'code' => 'ALL'],
            ['name' => 'Lavezares', 'code' => 'LAV'],
            ['name' => 'Rosario', 'code' => 'ROS'],
        ];

        foreach ($municipalities as $municipality) {
            DB::table('municipalities')->insert([
                'name' => $municipality['name'],
                'code' => $municipality['code'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}

