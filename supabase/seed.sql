-- Seed Data for Emergency Response Platform
-- Run this after schema.sql

-- Insert 5 Municipalities
INSERT INTO municipalities (name, code) VALUES
('San Isidro', 'SI'),
('Victoria', 'VIC'),
('Allen', 'ALL'),
('Lavezares', 'LAV'),
('Rosario', 'ROS')
ON CONFLICT (name) DO NOTHING;

-- Insert Barangays for San Isidro (14 barangays)
INSERT INTO barangays (municipality_id, name)
SELECT id, unnest(ARRAY[
    'Alegria', 'Balite', 'Buenavista', 'Caglanipao', 'Happy Valley',
    'Mabuhay', 'Palanit', 'Poblacion Norte', 'Poblacion Sur', 'Salvacion',
    'San Juan', 'San Roque', 'Seven Hills', 'Veriato'
])
FROM municipalities WHERE name = 'San Isidro';

-- Insert Barangays for Victoria (16 barangays)
INSERT INTO barangays (municipality_id, name)
SELECT id, unnest(ARRAY[
    'Acedillo', 'Buenasuerte', 'Buenos Aires', 'Colab-og', 'Erenas',
    'Libertad', 'Luisita', 'Lungib', 'Maxvilla', 'Pasabuena',
    'San Lazaro', 'San Miguel', 'San Roman', 'Zone I', 'Zone II', 'Zone III'
])
FROM municipalities WHERE name = 'Victoria';

-- Insert Barangays for Allen (20 barangays - 17 listed, 3 additional understood)
INSERT INTO barangays (municipality_id, name)
SELECT id, unnest(ARRAY[
    'Alejandro Village (Santiago)', 'Bonifacio', 'Cabacungan', 'Calarayan', 'Frederic',
    'Guin-arawayan', 'Imelda', 'Jubasan', 'Kinabranan Zone I (Poblacion)', 'Kinabranan Zone II (Poblacion)',
    'Kinaguitman', 'Lagundi', 'Lipata', 'Londres', 'Lo-oc',
    'Sabang Zone I (Poblacion)', 'Sabang Zone II (Poblacion)'
    -- Note: 3 additional barangays exist but not individually listed in source
])
FROM municipalities WHERE name = 'Allen';

-- Insert Barangays for Lavezares (26 barangays)
INSERT INTO barangays (municipality_id, name)
SELECT id, unnest(ARRAY[
    -- Inland barangays
    'Caburihan (Poblacion)', 'Caragas (Poblacion)', 'Chansvilla', 'Datag', 'Enriqueta',
    'Macarthur', 'Ocad (Poblacion)', 'Salvacion', 'San Jose', 'San Miguel',
    'To-og', 'Villahermosa',
    -- Coastal/island barangays
    'Balicuatro', 'Barobaybay', 'Cataogan (Poblacion)', 'Libas', 'Libertad',
    'Sabang-Tabok (Poblacion)', 'San Agustin', 'Villa', 'Urdaneta',
    'Bani (island)', 'Magsaysay (island)', 'Maravilla (island)', 'San Isidro (island)', 'San Juan (island)'
])
FROM municipalities WHERE name = 'Lavezares';

-- Insert Barangays for Rosario (11 barangays)
INSERT INTO barangays (municipality_id, name)
SELECT id, unnest(ARRAY[
    'Aguada', 'Buenavista', 'Jamoog', 'Ligaya', 'Poblacion (Estillero)',
    'Salhag', 'San Lorenzo', 'Bantolinao', 'Commonwealth', 'Guindaulan', 'Kailingan'
])
FROM municipalities WHERE name = 'Rosario';

