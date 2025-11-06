// South African Medication Formulary Service
// Based on South African Essential Medicines List (EML) and common prescriptions

export interface SAMedication {
  id: string;
  brandName: string;
  genericName: string;
  category: string;
  strength: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'inhaler' | 'patch' | 'suspension';
  schedule: string; // Schedule 0-6 for SA
  manufacturer?: string;
  description: string;
  commonDosage: string;
  commonFrequency: string;
  nappiCode?: string; // South African product identifier
}

// Comprehensive South African Medication Database
export const SA_MEDICATIONS: SAMedication[] = [
  // Analgesics & Anti-inflammatory
  {
    id: 'med-001',
    brandName: 'Panado',
    genericName: 'Paracetamol',
    category: 'Analgesics',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 0',
    nappiCode: '690171',
    manufacturer: 'Adcock Ingram',
    description: 'Pain relief and fever reducer',
    commonDosage: '500mg-1000mg',
    commonFrequency: 'Every 6 hours as needed'
  },
  {
    id: 'med-002',
    brandName: 'Disprin',
    genericName: 'Aspirin',
    category: 'Analgesics',
    strength: '300mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    nappiCode: '777439',
    manufacturer: 'Reckitt Benckiser',
    description: 'Pain relief, anti-inflammatory, blood thinner',
    commonDosage: '300mg-600mg',
    commonFrequency: 'Every 4-6 hours'
  },
  {
    id: 'med-003',
    brandName: 'Brufen',
    genericName: 'Ibuprofen',
    category: 'Analgesics',
    strength: '200mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    nappiCode: '703188',
    manufacturer: 'Abbott',
    description: 'Anti-inflammatory pain relief',
    commonDosage: '200mg-400mg',
    commonFrequency: 'Every 6-8 hours with food'
  },
  {
    id: 'med-004',
    brandName: 'Myprodol',
    genericName: 'Ibuprofen/Paracetamol',
    category: 'Analgesics',
    strength: '200mg/250mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    nappiCode: '711234',
    description: 'Combination pain relief',
    commonDosage: '1-2 tablets',
    commonFrequency: 'Every 6 hours'
  },

  // Antibiotics
  {
    id: 'med-005',
    brandName: 'Amoxil',
    genericName: 'Amoxicillin',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'capsule',
    schedule: 'Schedule 3',
    nappiCode: '793647',
    manufacturer: 'GSK',
    description: 'Broad-spectrum antibiotic',
    commonDosage: '500mg',
    commonFrequency: 'Three times daily for 5-7 days'
  },
  {
    id: 'med-006',
    brandName: 'Augmentin',
    genericName: 'Amoxicillin/Clavulanic Acid',
    category: 'Antibiotics',
    strength: '875mg/125mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    nappiCode: '793825',
    manufacturer: 'GSK',
    description: 'Enhanced broad-spectrum antibiotic',
    commonDosage: '875mg/125mg',
    commonFrequency: 'Twice daily for 7 days'
  },
  {
    id: 'med-007',
    brandName: 'Ciprobay',
    genericName: 'Ciprofloxacin',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    nappiCode: '701363',
    manufacturer: 'Bayer',
    description: 'Fluoroquinolone antibiotic',
    commonDosage: '500mg',
    commonFrequency: 'Twice daily for 7-14 days'
  },
  {
    id: 'med-008',
    brandName: 'Zithromax',
    genericName: 'Azithromycin',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    nappiCode: '703287',
    manufacturer: 'Pfizer',
    description: 'Macrolide antibiotic',
    commonDosage: '500mg',
    commonFrequency: 'Once daily for 3 days'
  },

  // Cardiovascular
  {
    id: 'med-009',
    brandName: 'Pharmapress',
    genericName: 'Enalapril',
    category: 'Cardiovascular',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    nappiCode: '708812',
    description: 'ACE inhibitor for hypertension',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-010',
    brandName: 'Cozaar',
    genericName: 'Losartan',
    category: 'Cardiovascular',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    nappiCode: '707468',
    manufacturer: 'MSD',
    description: 'ARB for hypertension',
    commonDosage: '50mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-011',
    brandName: 'Lipitor',
    genericName: 'Atorvastatin',
    category: 'Cardiovascular',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    nappiCode: '709469',
    manufacturer: 'Pfizer',
    description: 'Statin for cholesterol',
    commonDosage: '20mg',
    commonFrequency: 'Once daily at night'
  },

  // Diabetes
  {
    id: 'med-012',
    brandName: 'Glucophage',
    genericName: 'Metformin',
    category: 'Diabetes',
    strength: '850mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    nappiCode: '711234',
    manufacturer: 'Merck',
    description: 'Type 2 diabetes medication',
    commonDosage: '850mg',
    commonFrequency: 'Twice daily with meals'
  },
  {
    id: 'med-013',
    brandName: 'Amaryl',
    genericName: 'Glimepiride',
    category: 'Diabetes',
    strength: '2mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    nappiCode: '702856',
    manufacturer: 'Sanofi',
    description: 'Sulfonylurea for type 2 diabetes',
    commonDosage: '2mg',
    commonFrequency: 'Once daily with breakfast'
  },

  // Respiratory
  {
    id: 'med-014',
    brandName: 'Venteze',
    genericName: 'Salbutamol',
    category: 'Respiratory',
    strength: '100mcg',
    form: 'inhaler',
    schedule: 'Schedule 2',
    nappiCode: '708123',
    manufacturer: 'Adcock Ingram',
    description: 'Bronchodilator for asthma',
    commonDosage: '1-2 puffs',
    commonFrequency: 'As needed for symptoms'
  },
  {
    id: 'med-015',
    brandName: 'Flixotide',
    genericName: 'Fluticasone',
    category: 'Respiratory',
    strength: '125mcg',
    form: 'inhaler',
    schedule: 'Schedule 4',
    nappiCode: '701234',
    manufacturer: 'GSK',
    description: 'Corticosteroid for asthma prevention',
    commonDosage: '2 puffs',
    commonFrequency: 'Twice daily'
  },

  // Gastrointestinal
  {
    id: 'med-016',
    brandName: 'Nexiam',
    genericName: 'Esomeprazole',
    category: 'Gastrointestinal',
    strength: '40mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    nappiCode: '709876',
    manufacturer: 'Aspen',
    description: 'Proton pump inhibitor for reflux',
    commonDosage: '40mg',
    commonFrequency: 'Once daily before breakfast'
  },
  {
    id: 'med-017',
    brandName: 'Imodium',
    genericName: 'Loperamide',
    category: 'Gastrointestinal',
    strength: '2mg',
    form: 'capsule',
    schedule: 'Schedule 2',
    nappiCode: '777234',
    manufacturer: 'Janssen',
    description: 'Anti-diarrheal',
    commonDosage: '2mg',
    commonFrequency: 'After each loose stool (max 8mg/day)'
  },

  // Mental Health
  {
    id: 'med-018',
    brandName: 'Cipramil',
    genericName: 'Citalopram',
    category: 'Mental Health',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    nappiCode: '707123',
    manufacturer: 'Lundbeck',
    description: 'SSRI for depression and anxiety',
    commonDosage: '20mg',
    commonFrequency: 'Once daily in the morning'
  },
  {
    id: 'med-019',
    brandName: 'Urbanol',
    genericName: 'Clobazam',
    category: 'Mental Health',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 5',
    nappiCode: '708456',
    manufacturer: 'Sanofi',
    description: 'Benzodiazepine for anxiety',
    commonDosage: '10mg',
    commonFrequency: 'Once or twice daily'
  },

  // Allergy
  {
    id: 'med-020',
    brandName: 'Allergex',
    genericName: 'Chlorphenamine',
    category: 'Allergy',
    strength: '4mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    nappiCode: '693456',
    manufacturer: 'Aspen',
    description: 'Antihistamine for allergies',
    commonDosage: '4mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-021',
    brandName: 'Telfast',
    genericName: 'Fexofenadine',
    category: 'Allergy',
    strength: '120mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    nappiCode: '708234',
    manufacturer: 'Sanofi',
    description: 'Non-drowsy antihistamine',
    commonDosage: '120mg',
    commonFrequency: 'Once daily'
  },

  // Dermatology
  {
    id: 'med-022',
    brandName: 'Elocon',
    genericName: 'Mometasone',
    category: 'Dermatology',
    strength: '0.1%',
    form: 'cream',
    schedule: 'Schedule 4',
    nappiCode: '701567',
    manufacturer: 'Merck',
    description: 'Topical corticosteroid',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-023',
    brandName: 'Betaderm',
    genericName: 'Betamethasone',
    category: 'Dermatology',
    strength: '0.05%',
    form: 'cream',
    schedule: 'Schedule 3',
    nappiCode: '698765',
    manufacturer: 'Aspen',
    description: 'Topical corticosteroid for skin inflammation',
    commonDosage: 'Thin layer',
    commonFrequency: 'Twice daily'
  },

  // Vitamins & Supplements
  {
    id: 'med-024',
    brandName: 'Vitamin B Complex',
    genericName: 'B-Complex Vitamins',
    category: 'Vitamins',
    strength: 'Standard',
    form: 'tablet',
    schedule: 'Schedule 0',
    nappiCode: '685432',
    description: 'B vitamin supplement',
    commonDosage: '1 tablet',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-025',
    brandName: 'Ferro-Gradumet',
    genericName: 'Ferrous Sulfate',
    category: 'Vitamins',
    strength: '105mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    nappiCode: '701234',
    manufacturer: 'Abbott',
    description: 'Iron supplement for anemia',
    commonDosage: '105mg',
    commonFrequency: 'Once daily on empty stomach'
  },

  // Additional Common Medications
  {
    id: 'med-026',
    brandName: 'Adco-Dol',
    genericName: 'Paracetamol/Codeine',
    category: 'Analgesics',
    strength: '500mg/8mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    nappiCode: '695678',
    manufacturer: 'Adcock Ingram',
    description: 'Pain relief with codeine',
    commonDosage: '1-2 tablets',
    commonFrequency: 'Every 6 hours'
  },
  {
    id: 'med-027',
    brandName: 'Stopayne',
    genericName: 'Ibuprofen/Paracetamol/Codeine',
    category: 'Analgesics',
    strength: '200mg/250mg/10mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    nappiCode: '707890',
    manufacturer: 'Aspen',
    description: 'Triple combination pain relief',
    commonDosage: '1-2 tablets',
    commonFrequency: 'Every 6 hours'
  },
  {
    id: 'med-028',
    brandName: 'Prexum',
    genericName: 'Perindopril',
    category: 'Cardiovascular',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    nappiCode: '708123',
    manufacturer: 'Servier',
    description: 'ACE inhibitor for hypertension',
    commonDosage: '5mg',
    commonFrequency: 'Once daily in the morning'
  },
  {
    id: 'med-029',
    brandName: 'Adco-Napamol',
    genericName: 'Paracetamol',
    category: 'Analgesics',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 0',
    nappiCode: '691234',
    manufacturer: 'Adcock Ingram',
    description: 'Pain and fever relief',
    commonDosage: '500mg-1000mg',
    commonFrequency: 'Every 6 hours'
  },
  {
    id: 'med-030',
    brandName: 'Doxitar',
    genericName: 'Doxycycline',
    category: 'Antibiotics',
    strength: '100mg',
    form: 'capsule',
    schedule: 'Schedule 3',
    nappiCode: '703456',
    manufacturer: 'Aspen',
    description: 'Tetracycline antibiotic',
    commonDosage: '100mg',
    commonFrequency: 'Once or twice daily'
  },

  // 2024 Essential Medicines List - Additional Comprehensive Medications
  {
    id: 'med-2024-001',
    brandName: 'Panado',
    genericName: 'Paracetamol',
    category: 'Analgesics',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 0',
    manufacturer: 'Adcock Ingram',
    description: 'Pain relief and fever reducer',
    commonDosage: '500mg-1000mg',
    commonFrequency: 'Every 4-6 hours as needed'
  },
  {
    id: 'med-2024-002',
    brandName: 'Aspirin',
    genericName: 'Acetylsalicylic Acid',
    category: 'Analgesics',
    strength: '300mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Pain relief, anti-inflammatory, blood thinner',
    commonDosage: '300mg-600mg',
    commonFrequency: 'Every 4-6 hours'
  },
  {
    id: 'med-2024-003',
    brandName: 'Amoxicillin',
    genericName: 'Amoxicillin',
    category: 'Antibiotics',
    strength: '250mg',
    form: 'capsule',
    schedule: 'Schedule 3',
    description: 'Broad-spectrum penicillin antibiotic',
    commonDosage: '250mg-500mg',
    commonFrequency: 'Three times daily for 5-7 days'
  },
  {
    id: 'med-2024-004',
    brandName: 'Amoxicillin',
    genericName: 'Amoxicillin',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'capsule',
    schedule: 'Schedule 3',
    description: 'Broad-spectrum penicillin antibiotic',
    commonDosage: '500mg',
    commonFrequency: 'Three times daily for 5-7 days'
  },
  {
    id: 'med-2024-005',
    brandName: 'Penicillin V',
    genericName: 'Phenoxymethylpenicillin',
    category: 'Antibiotics',
    strength: '250mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Penicillin antibiotic for bacterial infections',
    commonDosage: '250mg-500mg',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-2024-006',
    brandName: 'Erythromycin',
    genericName: 'Erythromycin',
    category: 'Antibiotics',
    strength: '250mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Macrolide antibiotic',
    commonDosage: '250mg',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-2024-007',
    brandName: 'Cephalexin',
    genericName: 'Cephalexin',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'capsule',
    schedule: 'Schedule 3',
    description: 'Cephalosporin antibiotic',
    commonDosage: '500mg',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-2024-008',
    brandName: 'Metronidazole',
    genericName: 'Metronidazole',
    category: 'Antibiotics',
    strength: '400mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Antibiotic for anaerobic infections',
    commonDosage: '400mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-2024-009',
    brandName: 'Co-trimoxazole',
    genericName: 'Trimethoprim/Sulfamethoxazole',
    category: 'Antibiotics',
    strength: '480mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Combination antibiotic',
    commonDosage: '480mg-960mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-2024-010',
    brandName: 'Metformin',
    genericName: 'Metformin',
    category: 'Diabetes',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Type 2 diabetes medication',
    commonDosage: '500mg',
    commonFrequency: 'Twice daily with meals'
  },
  {
    id: 'med-2024-011',
    brandName: 'Metformin',
    genericName: 'Metformin',
    category: 'Diabetes',
    strength: '850mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Type 2 diabetes medication',
    commonDosage: '850mg',
    commonFrequency: 'Twice daily with meals'
  },
  {
    id: 'med-2024-012',
    brandName: 'Glibenclamide',
    genericName: 'Glibenclamide',
    category: 'Diabetes',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Sulfonylurea for type 2 diabetes',
    commonDosage: '5mg',
    commonFrequency: 'Once daily with breakfast'
  },
  {
    id: 'med-2024-013',
    brandName: 'Gliclazide',
    genericName: 'Gliclazide',
    category: 'Diabetes',
    strength: '80mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Sulfonylurea for type 2 diabetes',
    commonDosage: '80mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-2024-014',
    brandName: 'Enalapril',
    genericName: 'Enalapril',
    category: 'Cardiovascular',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'ACE inhibitor for hypertension',
    commonDosage: '5mg-20mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-2024-015',
    brandName: 'Enalapril',
    genericName: 'Enalapril',
    category: 'Cardiovascular',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'ACE inhibitor for hypertension',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-016',
    brandName: 'Losartan',
    genericName: 'Losartan',
    category: 'Cardiovascular',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'ARB for hypertension',
    commonDosage: '50mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-017',
    brandName: 'Atenolol',
    genericName: 'Atenolol',
    category: 'Cardiovascular',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Beta-blocker for hypertension',
    commonDosage: '50mg-100mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-018',
    brandName: 'Amlodipine',
    genericName: 'Amlodipine',
    category: 'Cardiovascular',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Calcium channel blocker for hypertension',
    commonDosage: '5mg-10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-019',
    brandName: 'Furosemide',
    genericName: 'Furosemide',
    category: 'Cardiovascular',
    strength: '40mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Loop diuretic',
    commonDosage: '40mg',
    commonFrequency: 'Once daily in morning'
  },
  {
    id: 'med-2024-020',
    brandName: 'Hydrochlorothiazide',
    genericName: 'Hydrochlorothiazide',
    category: 'Cardiovascular',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Thiazide diuretic',
    commonDosage: '25mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-021',
    brandName: 'Salbutamol',
    genericName: 'Salbutamol',
    category: 'Respiratory',
    strength: '100mcg',
    form: 'inhaler',
    schedule: 'Schedule 2',
    description: 'Bronchodilator for asthma',
    commonDosage: '1-2 puffs',
    commonFrequency: 'As needed for symptoms'
  },
  {
    id: 'med-2024-022',
    brandName: 'Beclomethasone',
    genericName: 'Beclomethasone',
    category: 'Respiratory',
    strength: '100mcg',
    form: 'inhaler',
    schedule: 'Schedule 4',
    description: 'Corticosteroid inhaler for asthma',
    commonDosage: '2 puffs',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-2024-023',
    brandName: 'Omeprazole',
    genericName: 'Omeprazole',
    category: 'Gastrointestinal',
    strength: '20mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'Proton pump inhibitor for reflux',
    commonDosage: '20mg',
    commonFrequency: 'Once daily before breakfast'
  },
  {
    id: 'med-2024-024',
    brandName: 'Ranitidine',
    genericName: 'Ranitidine',
    category: 'Gastrointestinal',
    strength: '150mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'H2 receptor antagonist',
    commonDosage: '150mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-2024-025',
    brandName: 'Loperamide',
    genericName: 'Loperamide',
    category: 'Gastrointestinal',
    strength: '2mg',
    form: 'capsule',
    schedule: 'Schedule 2',
    description: 'Anti-diarrheal',
    commonDosage: '2mg',
    commonFrequency: 'After each loose stool (max 8mg/day)'
  },
  {
    id: 'med-2024-026',
    brandName: 'Metoclopramide',
    genericName: 'Metoclopramide',
    category: 'Gastrointestinal',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anti-emetic and prokinetic',
    commonDosage: '10mg',
    commonFrequency: 'Three times daily before meals'
  },
  {
    id: 'med-2024-027',
    brandName: 'Fluoxetine',
    genericName: 'Fluoxetine',
    category: 'Mental Health',
    strength: '20mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'SSRI for depression',
    commonDosage: '20mg',
    commonFrequency: 'Once daily in the morning'
  },
  {
    id: 'med-2024-028',
    brandName: 'Sertraline',
    genericName: 'Sertraline',
    category: 'Mental Health',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'SSRI for depression and anxiety',
    commonDosage: '50mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-029',
    brandName: 'Amitriptyline',
    genericName: 'Amitriptyline',
    category: 'Mental Health',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Tricyclic antidepressant',
    commonDosage: '25mg',
    commonFrequency: 'Once daily at bedtime'
  },
  {
    id: 'med-2024-030',
    brandName: 'Diazepam',
    genericName: 'Diazepam',
    category: 'Mental Health',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 5',
    description: 'Benzodiazepine for anxiety',
    commonDosage: '5mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-2024-031',
    brandName: 'Loratadine',
    genericName: 'Loratadine',
    category: 'Allergy',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Non-drowsy antihistamine',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-032',
    brandName: 'Cetirizine',
    genericName: 'Cetirizine',
    category: 'Allergy',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Antihistamine for allergies',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-033',
    brandName: 'Chlorpheniramine',
    genericName: 'Chlorpheniramine',
    category: 'Allergy',
    strength: '4mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Antihistamine for allergies',
    commonDosage: '4mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-2024-034',
    brandName: 'Prednisone',
    genericName: 'Prednisone',
    category: 'Other',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Corticosteroid',
    commonDosage: '5mg-20mg',
    commonFrequency: 'As prescribed'
  },
  {
    id: 'med-2024-035',
    brandName: 'Ferrous Sulfate',
    genericName: 'Ferrous Sulfate',
    category: 'Vitamins',
    strength: '200mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Iron supplement for anemia',
    commonDosage: '200mg',
    commonFrequency: 'Once daily on empty stomach'
  },
  {
    id: 'med-2024-036',
    brandName: 'Folic Acid',
    genericName: 'Folic Acid',
    category: 'Vitamins',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Folate supplement',
    commonDosage: '5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-037',
    brandName: 'Warfarin',
    genericName: 'Warfarin',
    category: 'Cardiovascular',
    strength: '1mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anticoagulant',
    commonDosage: 'As prescribed based on INR',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-038',
    brandName: 'Warfarin',
    genericName: 'Warfarin',
    category: 'Cardiovascular',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anticoagulant',
    commonDosage: 'As prescribed based on INR',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-039',
    brandName: 'Digoxin',
    genericName: 'Digoxin',
    category: 'Cardiovascular',
    strength: '0.25mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Cardiac glycoside',
    commonDosage: '0.25mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-2024-040',
    brandName: 'Morphine',
    genericName: 'Morphine',
    category: 'Analgesics',
    strength: '10mg',
    form: 'injection',
    schedule: 'Schedule 6',
    description: 'Opioid analgesic',
    commonDosage: '5mg-10mg',
    commonFrequency: 'As prescribed'
  },
  {
    id: 'med-2024-041',
    brandName: 'Codeine',
    genericName: 'Codeine',
    category: 'Analgesics',
    strength: '30mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Opioid analgesic',
    commonDosage: '30mg',
    commonFrequency: 'Every 4-6 hours'
  },
  {
    id: 'med-2024-042',
    brandName: 'Tramadol',
    genericName: 'Tramadol',
    category: 'Analgesics',
    strength: '50mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'Opioid analgesic',
    commonDosage: '50mg-100mg',
    commonFrequency: 'Every 6-8 hours'
  },
  {
    id: 'med-2024-043',
    brandName: 'Betamethasone',
    genericName: 'Betamethasone',
    category: 'Dermatology',
    strength: '0.05%',
    form: 'cream',
    schedule: 'Schedule 3',
    description: 'Topical corticosteroid',
    commonDosage: 'Thin layer',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-2024-044',
    brandName: 'Hydrocortisone',
    genericName: 'Hydrocortisone',
    category: 'Dermatology',
    strength: '1%',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Topical corticosteroid',
    commonDosage: 'Thin layer',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-2024-045',
    brandName: 'Clotrimazole',
    genericName: 'Clotrimazole',
    category: 'Dermatology',
    strength: '1%',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Antifungal cream',
    commonDosage: 'Thin layer',
    commonFrequency: 'Twice daily'
  },

  // Comprehensive Essential Medicines List - Extended Medications
  // Additional Antibiotics
  {
    id: 'med-eml-001',
    brandName: 'Cloxacillin',
    genericName: 'Cloxacillin',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'capsule',
    schedule: 'Schedule 3',
    description: 'Penicillinase-resistant penicillin',
    commonDosage: '500mg',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-eml-002',
    brandName: 'Benzylpenicillin',
    genericName: 'Benzylpenicillin',
    category: 'Antibiotics',
    strength: '1MU',
    form: 'injection',
    schedule: 'Schedule 3',
    description: 'Penicillin injection',
    commonDosage: '1MU-5MU',
    commonFrequency: 'Every 6 hours'
  },
  {
    id: 'med-eml-003',
    brandName: 'Ceftriaxone',
    genericName: 'Ceftriaxone',
    category: 'Antibiotics',
    strength: '1g',
    form: 'injection',
    schedule: 'Schedule 4',
    description: 'Third-generation cephalosporin',
    commonDosage: '1g-2g',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-004',
    brandName: 'Cefuroxime',
    genericName: 'Cefuroxime',
    category: 'Antibiotics',
    strength: '250mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Second-generation cephalosporin',
    commonDosage: '250mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-005',
    brandName: 'Clindamycin',
    genericName: 'Clindamycin',
    category: 'Antibiotics',
    strength: '300mg',
    form: 'capsule',
    schedule: 'Schedule 3',
    description: 'Lincosamide antibiotic',
    commonDosage: '300mg',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-eml-006',
    brandName: 'Gentamicin',
    genericName: 'Gentamicin',
    category: 'Antibiotics',
    strength: '80mg',
    form: 'injection',
    schedule: 'Schedule 4',
    description: 'Aminoglycoside antibiotic',
    commonDosage: '80mg',
    commonFrequency: 'Every 8 hours'
  },
  {
    id: 'med-eml-007',
    brandName: 'Vancomycin',
    genericName: 'Vancomycin',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'injection',
    schedule: 'Schedule 4',
    description: 'Glycopeptide antibiotic',
    commonDosage: '500mg-1g',
    commonFrequency: 'Every 12 hours'
  },
  {
    id: 'med-eml-008',
    brandName: 'Rifampicin',
    genericName: 'Rifampicin',
    category: 'Antibiotics',
    strength: '150mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'Antituberculosis medication',
    commonDosage: '150mg-300mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-009',
    brandName: 'Isoniazid',
    genericName: 'Isoniazid',
    category: 'Antibiotics',
    strength: '300mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Antituberculosis medication',
    commonDosage: '300mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-010',
    brandName: 'Ethambutol',
    genericName: 'Ethambutol',
    category: 'Antibiotics',
    strength: '400mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Antituberculosis medication',
    commonDosage: '400mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-011',
    brandName: 'Pyrazinamide',
    genericName: 'Pyrazinamide',
    category: 'Antibiotics',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Antituberculosis medication',
    commonDosage: '500mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-012',
    brandName: 'Nitrofurantoin',
    genericName: 'Nitrofurantoin',
    category: 'Antibiotics',
    strength: '100mg',
    form: 'capsule',
    schedule: 'Schedule 2',
    description: 'Urinary tract antibiotic',
    commonDosage: '100mg',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-eml-013',
    brandName: 'Trimethoprim',
    genericName: 'Trimethoprim',
    category: 'Antibiotics',
    strength: '200mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Antibiotic for UTI',
    commonDosage: '200mg',
    commonFrequency: 'Twice daily'
  },

  // Additional Cardiovascular Medications
  {
    id: 'med-eml-014',
    brandName: 'Captopril',
    genericName: 'Captopril',
    category: 'Cardiovascular',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'ACE inhibitor',
    commonDosage: '25mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-015',
    brandName: 'Lisinopril',
    genericName: 'Lisinopril',
    category: 'Cardiovascular',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'ACE inhibitor',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-016',
    brandName: 'Ramipril',
    genericName: 'Ramipril',
    category: 'Cardiovascular',
    strength: '5mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'ACE inhibitor',
    commonDosage: '5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-017',
    brandName: 'Valsartan',
    genericName: 'Valsartan',
    category: 'Cardiovascular',
    strength: '80mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'ARB for hypertension',
    commonDosage: '80mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-018',
    brandName: 'Irbesartan',
    genericName: 'Irbesartan',
    category: 'Cardiovascular',
    strength: '150mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'ARB for hypertension',
    commonDosage: '150mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-019',
    brandName: 'Propranolol',
    genericName: 'Propranolol',
    category: 'Cardiovascular',
    strength: '40mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Beta-blocker',
    commonDosage: '40mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-020',
    brandName: 'Metoprolol',
    genericName: 'Metoprolol',
    category: 'Cardiovascular',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Beta-blocker',
    commonDosage: '50mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-021',
    brandName: 'Bisoprolol',
    genericName: 'Bisoprolol',
    category: 'Cardiovascular',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Beta-blocker',
    commonDosage: '5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-022',
    brandName: 'Nifedipine',
    genericName: 'Nifedipine',
    category: 'Cardiovascular',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Calcium channel blocker',
    commonDosage: '20mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-023',
    brandName: 'Verapamil',
    genericName: 'Verapamil',
    category: 'Cardiovascular',
    strength: '80mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Calcium channel blocker',
    commonDosage: '80mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-024',
    brandName: 'Diltiazem',
    genericName: 'Diltiazem',
    category: 'Cardiovascular',
    strength: '60mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Calcium channel blocker',
    commonDosage: '60mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-025',
    brandName: 'Spironolactone',
    genericName: 'Spironolactone',
    category: 'Cardiovascular',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Potassium-sparing diuretic',
    commonDosage: '25mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-026',
    brandName: 'Amiloride',
    genericName: 'Amiloride',
    category: 'Cardiovascular',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Potassium-sparing diuretic',
    commonDosage: '5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-027',
    brandName: 'Simvastatin',
    genericName: 'Simvastatin',
    category: 'Cardiovascular',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Statin for cholesterol',
    commonDosage: '20mg',
    commonFrequency: 'Once daily at night'
  },
  {
    id: 'med-eml-028',
    brandName: 'Rosuvastatin',
    genericName: 'Rosuvastatin',
    category: 'Cardiovascular',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Statin for cholesterol',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-029',
    brandName: 'Pravastatin',
    genericName: 'Pravastatin',
    category: 'Cardiovascular',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Statin for cholesterol',
    commonDosage: '20mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-030',
    brandName: 'Clopidogrel',
    genericName: 'Clopidogrel',
    category: 'Cardiovascular',
    strength: '75mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Antiplatelet agent',
    commonDosage: '75mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-031',
    brandName: 'Aspirin',
    genericName: 'Acetylsalicylic Acid',
    category: 'Cardiovascular',
    strength: '75mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Antiplatelet agent',
    commonDosage: '75mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-032',
    brandName: 'Atenolol',
    genericName: 'Atenolol',
    category: 'Cardiovascular',
    strength: '100mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Beta-blocker',
    commonDosage: '100mg',
    commonFrequency: 'Once daily'
  },

  // Additional Diabetes Medications
  {
    id: 'med-eml-033',
    brandName: 'Glibenclamide',
    genericName: 'Glibenclamide',
    category: 'Diabetes',
    strength: '2.5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Sulfonylurea',
    commonDosage: '2.5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-034',
    brandName: 'Gliclazide',
    genericName: 'Gliclazide',
    category: 'Diabetes',
    strength: '40mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Sulfonylurea',
    commonDosage: '40mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-035',
    brandName: 'Glipizide',
    genericName: 'Glipizide',
    category: 'Diabetes',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Sulfonylurea',
    commonDosage: '5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-036',
    brandName: 'Insulin Glargine',
    genericName: 'Insulin Glargine',
    category: 'Diabetes',
    strength: '100 units/ml',
    form: 'injection',
    schedule: 'Schedule 4',
    description: 'Long-acting insulin',
    commonDosage: 'As prescribed',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-037',
    brandName: 'Insulin Lispro',
    genericName: 'Insulin Lispro',
    category: 'Diabetes',
    strength: '100 units/ml',
    form: 'injection',
    schedule: 'Schedule 4',
    description: 'Rapid-acting insulin',
    commonDosage: 'As prescribed',
    commonFrequency: 'Before meals'
  },
  {
    id: 'med-eml-038',
    brandName: 'Insulin Regular',
    genericName: 'Insulin Regular',
    category: 'Diabetes',
    strength: '100 units/ml',
    form: 'injection',
    schedule: 'Schedule 4',
    description: 'Short-acting insulin',
    commonDosage: 'As prescribed',
    commonFrequency: 'Before meals'
  },
  {
    id: 'med-eml-039',
    brandName: 'Insulin NPH',
    genericName: 'Insulin NPH',
    category: 'Diabetes',
    strength: '100 units/ml',
    form: 'injection',
    schedule: 'Schedule 4',
    description: 'Intermediate-acting insulin',
    commonDosage: 'As prescribed',
    commonFrequency: 'Once or twice daily'
  },

  // Additional Respiratory Medications
  {
    id: 'med-eml-040',
    brandName: 'Ipratropium',
    genericName: 'Ipratropium',
    category: 'Respiratory',
    strength: '20mcg',
    form: 'inhaler',
    schedule: 'Schedule 2',
    description: 'Anticholinergic bronchodilator',
    commonDosage: '2 puffs',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-eml-041',
    brandName: 'Salbutamol/Ipratropium',
    genericName: 'Salbutamol/Ipratropium',
    category: 'Respiratory',
    strength: '100mcg/20mcg',
    form: 'inhaler',
    schedule: 'Schedule 2',
    description: 'Combination bronchodilator',
    commonDosage: '2 puffs',
    commonFrequency: 'Four times daily'
  },
  {
    id: 'med-eml-042',
    brandName: 'Budesonide',
    genericName: 'Budesonide',
    category: 'Respiratory',
    strength: '200mcg',
    form: 'inhaler',
    schedule: 'Schedule 4',
    description: 'Corticosteroid inhaler',
    commonDosage: '2 puffs',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-043',
    brandName: 'Montelukast',
    genericName: 'Montelukast',
    category: 'Respiratory',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Leukotriene receptor antagonist',
    commonDosage: '10mg',
    commonFrequency: 'Once daily at bedtime'
  },
  {
    id: 'med-eml-044',
    brandName: 'Theophylline',
    genericName: 'Theophylline',
    category: 'Respiratory',
    strength: '200mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Bronchodilator',
    commonDosage: '200mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-045',
    brandName: 'Aminophylline',
    genericName: 'Aminophylline',
    category: 'Respiratory',
    strength: '225mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Bronchodilator',
    commonDosage: '225mg',
    commonFrequency: 'Three times daily'
  },

  // Additional Gastrointestinal Medications
  {
    id: 'med-eml-046',
    brandName: 'Pantoprazole',
    genericName: 'Pantoprazole',
    category: 'Gastrointestinal',
    strength: '40mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Proton pump inhibitor',
    commonDosage: '40mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-047',
    brandName: 'Lansoprazole',
    genericName: 'Lansoprazole',
    category: 'Gastrointestinal',
    strength: '30mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'Proton pump inhibitor',
    commonDosage: '30mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-048',
    brandName: 'Cimetidine',
    genericName: 'Cimetidine',
    category: 'Gastrointestinal',
    strength: '400mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'H2 receptor antagonist',
    commonDosage: '400mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-049',
    brandName: 'Famotidine',
    genericName: 'Famotidine',
    category: 'Gastrointestinal',
    strength: '40mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'H2 receptor antagonist',
    commonDosage: '40mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-050',
    brandName: 'Domperidone',
    genericName: 'Domperidone',
    category: 'Gastrointestinal',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anti-emetic and prokinetic',
    commonDosage: '10mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-051',
    brandName: 'Ondansetron',
    genericName: 'Ondansetron',
    category: 'Gastrointestinal',
    strength: '4mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anti-emetic',
    commonDosage: '4mg-8mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-052',
    brandName: 'Hyoscine',
    genericName: 'Hyoscine',
    category: 'Gastrointestinal',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Antispasmodic',
    commonDosage: '10mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-053',
    brandName: 'Dicyclomine',
    genericName: 'Dicyclomine',
    category: 'Gastrointestinal',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Antispasmodic',
    commonDosage: '10mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-054',
    brandName: 'Senna',
    genericName: 'Senna',
    category: 'Gastrointestinal',
    strength: '15mg',
    form: 'tablet',
    schedule: 'Schedule 0',
    description: 'Laxative',
    commonDosage: '15mg',
    commonFrequency: 'Once daily at bedtime'
  },
  {
    id: 'med-eml-055',
    brandName: 'Lactulose',
    genericName: 'Lactulose',
    category: 'Gastrointestinal',
    strength: '10g/15ml',
    form: 'syrup',
    schedule: 'Schedule 0',
    description: 'Laxative',
    commonDosage: '15ml-30ml',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-056',
    brandName: 'Bisacodyl',
    genericName: 'Bisacodyl',
    category: 'Gastrointestinal',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 0',
    description: 'Laxative',
    commonDosage: '5mg-10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-057',
    brandName: 'Psyllium',
    genericName: 'Psyllium',
    category: 'Gastrointestinal',
    strength: '3.5g',
    form: 'powder',
    schedule: 'Schedule 0',
    description: 'Bulk-forming laxative',
    commonDosage: '3.5g',
    commonFrequency: 'One to three times daily'
  },

  // Additional Mental Health Medications
  {
    id: 'med-eml-058',
    brandName: 'Paroxetine',
    genericName: 'Paroxetine',
    category: 'Mental Health',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'SSRI for depression',
    commonDosage: '20mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-059',
    brandName: 'Escitalopram',
    genericName: 'Escitalopram',
    category: 'Mental Health',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'SSRI for depression',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-060',
    brandName: 'Venlafaxine',
    genericName: 'Venlafaxine',
    category: 'Mental Health',
    strength: '75mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'SNRI for depression',
    commonDosage: '75mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-061',
    brandName: 'Duloxetine',
    genericName: 'Duloxetine',
    category: 'Mental Health',
    strength: '60mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'SNRI for depression',
    commonDosage: '60mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-062',
    brandName: 'Mirtazapine',
    genericName: 'Mirtazapine',
    category: 'Mental Health',
    strength: '15mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Atypical antidepressant',
    commonDosage: '15mg',
    commonFrequency: 'Once daily at bedtime'
  },
  {
    id: 'med-eml-063',
    brandName: 'Trazodone',
    genericName: 'Trazodone',
    category: 'Mental Health',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Antidepressant',
    commonDosage: '50mg',
    commonFrequency: 'Once daily at bedtime'
  },
  {
    id: 'med-eml-064',
    brandName: 'Haloperidol',
    genericName: 'Haloperidol',
    category: 'Mental Health',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 6',
    description: 'Antipsychotic',
    commonDosage: '5mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-065',
    brandName: 'Risperidone',
    genericName: 'Risperidone',
    category: 'Mental Health',
    strength: '2mg',
    form: 'tablet',
    schedule: 'Schedule 6',
    description: 'Atypical antipsychotic',
    commonDosage: '2mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-066',
    brandName: 'Olanzapine',
    genericName: 'Olanzapine',
    category: 'Mental Health',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 6',
    description: 'Atypical antipsychotic',
    commonDosage: '10mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-067',
    brandName: 'Quetiapine',
    genericName: 'Quetiapine',
    category: 'Mental Health',
    strength: '100mg',
    form: 'tablet',
    schedule: 'Schedule 6',
    description: 'Atypical antipsychotic',
    commonDosage: '100mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-068',
    brandName: 'Lithium',
    genericName: 'Lithium Carbonate',
    category: 'Mental Health',
    strength: '300mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Mood stabilizer',
    commonDosage: '300mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-069',
    brandName: 'Carbamazepine',
    genericName: 'Carbamazepine',
    category: 'Mental Health',
    strength: '200mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Mood stabilizer and anticonvulsant',
    commonDosage: '200mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-070',
    brandName: 'Valproic Acid',
    genericName: 'Sodium Valproate',
    category: 'Mental Health',
    strength: '200mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Mood stabilizer and anticonvulsant',
    commonDosage: '200mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-071',
    brandName: 'Lorazepam',
    genericName: 'Lorazepam',
    category: 'Mental Health',
    strength: '1mg',
    form: 'tablet',
    schedule: 'Schedule 5',
    description: 'Benzodiazepine for anxiety',
    commonDosage: '1mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-072',
    brandName: 'Alprazolam',
    genericName: 'Alprazolam',
    category: 'Mental Health',
    strength: '0.5mg',
    form: 'tablet',
    schedule: 'Schedule 5',
    description: 'Benzodiazepine for anxiety',
    commonDosage: '0.5mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-073',
    brandName: 'Clonazepam',
    genericName: 'Clonazepam',
    category: 'Mental Health',
    strength: '0.5mg',
    form: 'tablet',
    schedule: 'Schedule 5',
    description: 'Benzodiazepine for anxiety and seizures',
    commonDosage: '0.5mg',
    commonFrequency: 'Two to three times daily'
  },

  // Additional Analgesics
  {
    id: 'med-eml-074',
    brandName: 'Naproxen',
    genericName: 'Naproxen',
    category: 'Analgesics',
    strength: '250mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'NSAID for pain and inflammation',
    commonDosage: '250mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-075',
    brandName: 'Diclofenac',
    genericName: 'Diclofenac',
    category: 'Analgesics',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'NSAID for pain and inflammation',
    commonDosage: '50mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-076',
    brandName: 'Indomethacin',
    genericName: 'Indomethacin',
    category: 'Analgesics',
    strength: '25mg',
    form: 'capsule',
    schedule: 'Schedule 2',
    description: 'NSAID for pain and inflammation',
    commonDosage: '25mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-077',
    brandName: 'Celecoxib',
    genericName: 'Celecoxib',
    category: 'Analgesics',
    strength: '200mg',
    form: 'capsule',
    schedule: 'Schedule 2',
    description: 'COX-2 inhibitor',
    commonDosage: '200mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-078',
    brandName: 'Pethidine',
    genericName: 'Pethidine',
    category: 'Analgesics',
    strength: '50mg',
    form: 'injection',
    schedule: 'Schedule 6',
    description: 'Opioid analgesic',
    commonDosage: '50mg',
    commonFrequency: 'As prescribed'
  },
  {
    id: 'med-eml-079',
    brandName: 'Fentanyl',
    genericName: 'Fentanyl',
    category: 'Analgesics',
    strength: '25mcg',
    form: 'patch',
    schedule: 'Schedule 6',
    description: 'Opioid analgesic patch',
    commonDosage: '25mcg',
    commonFrequency: 'Every 72 hours'
  },
  {
    id: 'med-eml-080',
    brandName: 'Oxycodone',
    genericName: 'Oxycodone',
    category: 'Analgesics',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 6',
    description: 'Opioid analgesic',
    commonDosage: '10mg',
    commonFrequency: 'Every 4-6 hours'
  },
  {
    id: 'med-eml-081',
    brandName: 'Gabapentin',
    genericName: 'Gabapentin',
    category: 'Analgesics',
    strength: '300mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'Neuropathic pain medication',
    commonDosage: '300mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-082',
    brandName: 'Pregabalin',
    genericName: 'Pregabalin',
    category: 'Analgesics',
    strength: '75mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'Neuropathic pain medication',
    commonDosage: '75mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-083',
    brandName: 'Amitriptyline',
    genericName: 'Amitriptyline',
    category: 'Analgesics',
    strength: '10mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Neuropathic pain medication',
    commonDosage: '10mg',
    commonFrequency: 'Once daily at bedtime'
  },

  // Additional Allergy Medications
  {
    id: 'med-eml-084',
    brandName: 'Fexofenadine',
    genericName: 'Fexofenadine',
    category: 'Allergy',
    strength: '180mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Non-drowsy antihistamine',
    commonDosage: '180mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-085',
    brandName: 'Desloratadine',
    genericName: 'Desloratadine',
    category: 'Allergy',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Non-drowsy antihistamine',
    commonDosage: '5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-086',
    brandName: 'Promethazine',
    genericName: 'Promethazine',
    category: 'Allergy',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Antihistamine',
    commonDosage: '25mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-087',
    brandName: 'Diphenhydramine',
    genericName: 'Diphenhydramine',
    category: 'Allergy',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Antihistamine',
    commonDosage: '25mg',
    commonFrequency: 'Every 6 hours'
  },
  {
    id: 'med-eml-088',
    brandName: 'Hydroxyzine',
    genericName: 'Hydroxyzine',
    category: 'Allergy',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 3',
    description: 'Antihistamine',
    commonDosage: '25mg',
    commonFrequency: 'Three to four times daily'
  },

  // Additional Dermatology Medications
  {
    id: 'med-eml-089',
    brandName: 'Mometasone',
    genericName: 'Mometasone',
    category: 'Dermatology',
    strength: '0.1%',
    form: 'cream',
    schedule: 'Schedule 4',
    description: 'Topical corticosteroid',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-090',
    brandName: 'Triamcinolone',
    genericName: 'Triamcinolone',
    category: 'Dermatology',
    strength: '0.1%',
    form: 'cream',
    schedule: 'Schedule 3',
    description: 'Topical corticosteroid',
    commonDosage: 'Thin layer',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-091',
    brandName: 'Clobetasol',
    genericName: 'Clobetasol',
    category: 'Dermatology',
    strength: '0.05%',
    form: 'cream',
    schedule: 'Schedule 4',
    description: 'Potent topical corticosteroid',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-092',
    brandName: 'Miconazole',
    genericName: 'Miconazole',
    category: 'Dermatology',
    strength: '2%',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Antifungal cream',
    commonDosage: 'Thin layer',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-093',
    brandName: 'Ketoconazole',
    genericName: 'Ketoconazole',
    category: 'Dermatology',
    strength: '2%',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Antifungal cream',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-094',
    brandName: 'Terbinafine',
    genericName: 'Terbinafine',
    category: 'Dermatology',
    strength: '1%',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Antifungal cream',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-095',
    brandName: 'Nystatin',
    genericName: 'Nystatin',
    category: 'Dermatology',
    strength: '100,000 units/g',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Antifungal cream',
    commonDosage: 'Thin layer',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-096',
    brandName: 'Benzoyl Peroxide',
    genericName: 'Benzoyl Peroxide',
    category: 'Dermatology',
    strength: '5%',
    form: 'cream',
    schedule: 'Schedule 0',
    description: 'Acne treatment',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-097',
    brandName: 'Tretinoin',
    genericName: 'Tretinoin',
    category: 'Dermatology',
    strength: '0.05%',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Acne treatment',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once daily at bedtime'
  },
  {
    id: 'med-eml-098',
    brandName: 'Adapalene',
    genericName: 'Adapalene',
    category: 'Dermatology',
    strength: '0.1%',
    form: 'cream',
    schedule: 'Schedule 2',
    description: 'Acne treatment',
    commonDosage: 'Thin layer',
    commonFrequency: 'Once daily at bedtime'
  },
  {
    id: 'med-eml-099',
    brandName: 'Calamine',
    genericName: 'Calamine',
    category: 'Dermatology',
    strength: 'Standard',
    form: 'lotion',
    schedule: 'Schedule 0',
    description: 'Soothing lotion for skin irritation',
    commonDosage: 'Apply as needed',
    commonFrequency: 'As needed'
  },

  // Additional Vitamins and Supplements
  {
    id: 'med-eml-100',
    brandName: 'Calcium Carbonate',
    genericName: 'Calcium Carbonate',
    category: 'Vitamins',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 0',
    description: 'Calcium supplement',
    commonDosage: '500mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-101',
    brandName: 'Vitamin D3',
    genericName: 'Cholecalciferol',
    category: 'Vitamins',
    strength: '1000 IU',
    form: 'tablet',
    schedule: 'Schedule 0',
    description: 'Vitamin D supplement',
    commonDosage: '1000 IU',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-102',
    brandName: 'Multivitamin',
    genericName: 'Multivitamin',
    category: 'Vitamins',
    strength: 'Standard',
    form: 'tablet',
    schedule: 'Schedule 0',
    description: 'Multivitamin supplement',
    commonDosage: '1 tablet',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-103',
    brandName: 'Zinc Sulfate',
    genericName: 'Zinc Sulfate',
    category: 'Vitamins',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Zinc supplement',
    commonDosage: '20mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-104',
    brandName: 'Vitamin B12',
    genericName: 'Cyanocobalamin',
    category: 'Vitamins',
    strength: '1000mcg',
    form: 'tablet',
    schedule: 'Schedule 1',
    description: 'Vitamin B12 supplement',
    commonDosage: '1000mcg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-105',
    brandName: 'Vitamin C',
    genericName: 'Ascorbic Acid',
    category: 'Vitamins',
    strength: '1000mg',
    form: 'tablet',
    schedule: 'Schedule 0',
    description: 'Vitamin C supplement',
    commonDosage: '1000mg',
    commonFrequency: 'Once daily'
  },

  // Additional Corticosteroids
  {
    id: 'med-eml-106',
    brandName: 'Hydrocortisone',
    genericName: 'Hydrocortisone',
    category: 'Other',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Oral corticosteroid',
    commonDosage: '20mg',
    commonFrequency: 'As prescribed'
  },
  {
    id: 'med-eml-107',
    brandName: 'Methylprednisolone',
    genericName: 'Methylprednisolone',
    category: 'Other',
    strength: '4mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Corticosteroid',
    commonDosage: '4mg',
    commonFrequency: 'As prescribed'
  },
  {
    id: 'med-eml-108',
    brandName: 'Dexamethasone',
    genericName: 'Dexamethasone',
    category: 'Other',
    strength: '0.5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Corticosteroid',
    commonDosage: '0.5mg',
    commonFrequency: 'As prescribed'
  },
  {
    id: 'med-eml-109',
    brandName: 'Betamethasone',
    genericName: 'Betamethasone',
    category: 'Other',
    strength: '0.5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Corticosteroid',
    commonDosage: '0.5mg',
    commonFrequency: 'As prescribed'
  },

  // Additional Anticonvulsants
  {
    id: 'med-eml-110',
    brandName: 'Phenytoin',
    genericName: 'Phenytoin',
    category: 'Other',
    strength: '100mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anticonvulsant',
    commonDosage: '100mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-111',
    brandName: 'Phenobarbital',
    genericName: 'Phenobarbital',
    category: 'Other',
    strength: '30mg',
    form: 'tablet',
    schedule: 'Schedule 5',
    description: 'Anticonvulsant',
    commonDosage: '30mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-112',
    brandName: 'Lamotrigine',
    genericName: 'Lamotrigine',
    category: 'Other',
    strength: '25mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anticonvulsant',
    commonDosage: '25mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-113',
    brandName: 'Levetiracetam',
    genericName: 'Levetiracetam',
    category: 'Other',
    strength: '500mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anticonvulsant',
    commonDosage: '500mg',
    commonFrequency: 'Twice daily'
  },
  {
    id: 'med-eml-114',
    brandName: 'Topiramate',
    genericName: 'Topiramate',
    category: 'Other',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Anticonvulsant',
    commonDosage: '50mg',
    commonFrequency: 'Twice daily'
  },

  // Additional Medications
  {
    id: 'med-eml-115',
    brandName: 'Allopurinol',
    genericName: 'Allopurinol',
    category: 'Other',
    strength: '100mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Gout medication',
    commonDosage: '100mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-116',
    brandName: 'Colchicine',
    genericName: 'Colchicine',
    category: 'Other',
    strength: '0.5mg',
    form: 'tablet',
    schedule: 'Schedule 2',
    description: 'Gout medication',
    commonDosage: '0.5mg',
    commonFrequency: 'Two to three times daily'
  },
  {
    id: 'med-eml-117',
    brandName: 'Methotrexate',
    genericName: 'Methotrexate',
    category: 'Other',
    strength: '2.5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Immunosuppressant',
    commonDosage: '2.5mg',
    commonFrequency: 'Once weekly'
  },
  {
    id: 'med-eml-118',
    brandName: 'Azathioprine',
    genericName: 'Azathioprine',
    category: 'Other',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Immunosuppressant',
    commonDosage: '50mg',
    commonFrequency: 'Once or twice daily'
  },
  {
    id: 'med-eml-119',
    brandName: 'Cyclophosphamide',
    genericName: 'Cyclophosphamide',
    category: 'Other',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Immunosuppressant',
    commonDosage: '50mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-120',
    brandName: 'Levothyroxine',
    genericName: 'Levothyroxine',
    category: 'Other',
    strength: '50mcg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Thyroid hormone replacement',
    commonDosage: '50mcg',
    commonFrequency: 'Once daily on empty stomach'
  },
  {
    id: 'med-eml-121',
    brandName: 'Propylthiouracil',
    genericName: 'Propylthiouracil',
    category: 'Other',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Antithyroid medication',
    commonDosage: '50mg',
    commonFrequency: 'Three times daily'
  },
  {
    id: 'med-eml-122',
    brandName: 'Finasteride',
    genericName: 'Finasteride',
    category: 'Other',
    strength: '5mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Treatment for BPH',
    commonDosage: '5mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-123',
    brandName: 'Tamsulosin',
    genericName: 'Tamsulosin',
    category: 'Other',
    strength: '0.4mg',
    form: 'capsule',
    schedule: 'Schedule 4',
    description: 'Alpha-blocker for BPH',
    commonDosage: '0.4mg',
    commonFrequency: 'Once daily'
  },
  {
    id: 'med-eml-124',
    brandName: 'Sildenafil',
    genericName: 'Sildenafil',
    category: 'Other',
    strength: '50mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Treatment for ED',
    commonDosage: '50mg',
    commonFrequency: 'As needed'
  },
  {
    id: 'med-eml-125',
    brandName: 'Tadalafil',
    genericName: 'Tadalafil',
    category: 'Other',
    strength: '20mg',
    form: 'tablet',
    schedule: 'Schedule 4',
    description: 'Treatment for ED',
    commonDosage: '20mg',
    commonFrequency: 'As needed'
  }
];

// Search and filter functions
export function searchMedications(query: string): SAMedication[] {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return SA_MEDICATIONS;
  }
  
  return SA_MEDICATIONS.filter(med => 
    med.brandName.toLowerCase().includes(lowerQuery) ||
    med.genericName.toLowerCase().includes(lowerQuery) ||
    med.category.toLowerCase().includes(lowerQuery) ||
    med.description.toLowerCase().includes(lowerQuery) ||
    (med.nappiCode && med.nappiCode.includes(lowerQuery))
  );
}

export function getMedicationsByCategory(category: string): SAMedication[] {
  if (!category || category === 'all') {
    return SA_MEDICATIONS;
  }
  
  return SA_MEDICATIONS.filter(med => med.category === category);
}

export function getAllCategories(): string[] {
  const categories = new Set(SA_MEDICATIONS.map(med => med.category));
  return Array.from(categories).sort();
}

export function getMedicationById(id: string): SAMedication | undefined {
  return SA_MEDICATIONS.find(med => med.id === id);
}

export function getMedicationByName(name: string): SAMedication | undefined {
  const lowerName = name.toLowerCase();
  return SA_MEDICATIONS.find(med => 
    med.brandName.toLowerCase() === lowerName || 
    med.genericName.toLowerCase() === lowerName
  );
}


