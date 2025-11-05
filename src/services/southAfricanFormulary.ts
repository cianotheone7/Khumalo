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


