#!/usr/bin/env python3
"""
Extract medications from South African Primary Healthcare Standard Treatment Guidelines
and Essential Medicines List 8th Edition 2024 PDF
Improved version that filters out junk and extracts actual medications
"""

import re
import json
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

# Known medication names for filtering (common SA medications)
KNOWN_MEDICATIONS = {
    'paracetamol', 'acetaminophen', 'aspirin', 'ibuprofen', 'naproxen',
    'amoxicillin', 'penicillin', 'azithromycin', 'erythromycin', 'doxycycline',
    'ciprofloxacin', 'metronidazole', 'trimethoprim', 'sulfamethoxazole',
    'metformin', 'glibenclamide', 'gliclazide', 'insulin', 'glimepiride',
    'enalapril', 'captopril', 'losartan', 'atenolol', 'amlodipine',
    'furosemide', 'hydrochlorothiazide', 'spironolactone',
    'salbutamol', 'beclomethasone', 'fluticasone', 'ipratropium',
    'omeprazole', 'ranitidine', 'lansoprazole', 'loperamide', 'metoclopramide',
    'fluoxetine', 'sertraline', 'citalopram', 'amitriptyline',
    'loratadine', 'cetirizine', 'chlorpheniramine', 'fexofenadine',
    'prednisone', 'prednisolone', 'hydrocortisone',
    'diazepam', 'lorazepam', 'clobazam',
    'warfarin', 'aspirin', 'heparin',
    'ferrous', 'folic acid', 'calcium', 'vitamin d',
    'morphine', 'codeine', 'tramadol', 'oxycodone'
}

def is_likely_medication(text):
    """Check if text is likely a medication entry"""
    text_lower = text.lower()
    
    # Skip obvious non-medications
    skip_patterns = [
        r'^https?://',
        r'^www\.',
        r'^page \d+',
        r'^table of contents',
        r'^chapter \d+',
        r'^section \d+',
        r'health\.gov\.za',
        r'right to care',
        r'usaid',
        r'universal health',
        r'primary healthcare',
        r'standard treatment',
        r'essential medicines',
        r'not for profit',
        r'free of charge',
        r'^[A-Z]{2,5}$',  # Acronyms like USAID, EML
    ]
    
    for pattern in skip_patterns:
        if re.search(pattern, text_lower):
            return False
    
    # Must contain medication indicators
    med_indicators = ['mg', 'g', 'ml', 'mcg', '%', 'tablet', 'capsule', 'syrup', 
                     'injection', 'cream', 'drops', 'inhaler', 'patch', 'suspension',
                     'oral', 'topical', 'iv', 'im']
    
    has_indicator = any(ind in text_lower for ind in med_indicators)
    
    # Or contains known medication name
    has_known_med = any(med in text_lower for med in KNOWN_MEDICATIONS)
    
    # Must have some structure (not just random text)
    has_structure = bool(re.search(r'\d+\s*(?:mg|g|ml|mcg|%)', text, re.IGNORECASE))
    
    return has_indicator or (has_known_med and has_structure)

def parse_medication_line(line):
    """Parse a line that likely contains medication information"""
    if not is_likely_medication(line):
        return None
    
    line = line.strip()
    if len(line) < 10:  # Too short
        return None
    
    # Extract strength
    strength_match = re.search(r'(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|%|units?)\b', line, re.IGNORECASE)
    strength = strength_match.group(0) if strength_match else None
    
    if not strength:
        # Try to find any number
        num_match = re.search(r'\d+', line)
        if num_match:
            strength = num_match.group(0) + 'mg'  # Default to mg
        else:
            strength = 'N/A'
    
    # Extract form
    forms = {
        'tablet': ['tablet', 'tab', 'tabs'],
        'capsule': ['capsule', 'cap', 'caps'],
        'syrup': ['syrup', 'suspension', 'oral liquid'],
        'injection': ['injection', 'injectable', 'iv', 'im', 'sc'],
        'cream': ['cream', 'ointment', 'gel', 'topical'],
        'drops': ['drops', 'eye drops', 'ear drops'],
        'inhaler': ['inhaler', 'inhalation', 'puff'],
        'patch': ['patch', 'transdermal'],
    }
    
    form = 'tablet'  # default
    for f, keywords in forms.items():
        if any(kw in line.lower() for kw in keywords):
            form = f
            break
    
    # Extract generic name (first capitalized word/phrase)
    # Look for common medication name patterns
    generic_match = re.search(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', line)
    generic_name = generic_match.group(1) if generic_match else None
    
    # Try to find brand name in parentheses
    brand_match = re.search(r'\(([^)]+)\)', line)
    brand_name = brand_match.group(1) if brand_match else generic_name or 'Generic'
    
    if not generic_name:
        # Try to extract from beginning of line
        parts = line.split()
        if parts:
            # Take first capitalized word/phrase
            generic_name = ' '.join(parts[:3])[:50]  # Limit length
    
    if not generic_name or len(generic_name) < 3:
        return None
    
    # Determine category
    category = determine_category(line)
    
    # Determine schedule
    schedule = determine_schedule(line)
    
    return {
        'genericName': generic_name,
        'brandName': brand_name[:50],
        'strength': strength,
        'form': form,
        'category': category,
        'schedule': schedule,
        'description': f'{generic_name} {strength} {form}',
        'commonDosage': strength,
        'commonFrequency': 'As prescribed'
    }

def determine_category(text):
    """Determine medication category"""
    text_lower = text.lower()
    
    categories = {
        'Analgesics': ['paracetamol', 'acetaminophen', 'aspirin', 'ibuprofen', 'naproxen', 
                      'diclofenac', 'codeine', 'morphine', 'tramadol', 'oxycodone'],
        'Antibiotics': ['amoxicillin', 'penicillin', 'azithromycin', 'erythromycin', 
                       'doxycycline', 'ciprofloxacin', 'metronidazole', 'trimethoprim',
                       'sulfamethoxazole', 'cephalexin', 'clindamycin'],
        'Cardiovascular': ['enalapril', 'captopril', 'losartan', 'atenolol', 'propranolol',
                          'amlodipine', 'nifedipine', 'furosemide', 'hydrochlorothiazide',
                          'spironolactone', 'digoxin'],
        'Diabetes': ['metformin', 'glibenclamide', 'gliclazide', 'glimepiride', 'insulin',
                    'pioglitazone'],
        'Respiratory': ['salbutamol', 'beclomethasone', 'fluticasone', 'budesonide',
                       'ipratropium', 'theophylline'],
        'Gastrointestinal': ['omeprazole', 'lansoprazole', 'ranitidine', 'loperamide',
                            'metoclopramide', 'domperidone'],
        'Mental Health': ['fluoxetine', 'sertraline', 'citalopram', 'amitriptyline',
                         'diazepam', 'lorazepam', 'clobazam'],
        'Allergy': ['loratadine', 'cetirizine', 'chlorpheniramine', 'fexofenadine'],
        'Dermatology': ['betamethasone', 'mometasone', 'hydrocortisone', 'clotrimazole'],
        'Vitamins': ['ferrous', 'folic acid', 'calcium', 'vitamin', 'thiamine', 'cyanocobalamin'],
    }
    
    for category, keywords in categories.items():
        if any(keyword in text_lower for keyword in keywords):
            return category
    
    return 'Other'

def determine_schedule(text):
    """Determine South African schedule"""
    text_lower = text.lower()
    
    # Direct schedule mentions
    for i in range(7):
        if f'schedule {i}' in text_lower:
            return f'Schedule {i}'
    
    # Schedule based on medication type
    unscheduled = ['paracetamol', 'ibuprofen', 'aspirin']  # When at low doses
    schedule_1 = ['simple analgesics']
    schedule_2 = ['ibuprofen', 'codeine combinations']
    schedule_3 = ['antibiotics', 'amoxicillin', 'penicillin']
    schedule_4 = ['prescription only', 'hypertension', 'diabetes', 'metformin']
    schedule_5 = ['controlled substances', 'diazepam']
    
    if any(med in text_lower for med in schedule_5):
        return 'Schedule 5'
    elif any(med in text_lower for med in schedule_4):
        return 'Schedule 4'
    elif any(med in text_lower for med in schedule_3):
        return 'Schedule 3'
    elif any(med in text_lower for med in schedule_2):
        return 'Schedule 2'
    elif any(med in text_lower for med in schedule_1):
        return 'Schedule 1'
    elif any(med in text_lower for med in unscheduled):
        return 'Schedule 0'
    
    return 'Schedule 2'  # Default

def extract_medications_from_pdf(pdf_path):
    """Extract medications from PDF"""
    if not HAS_PYMUPDF:
        print("Error: PyMuPDF not found. Install with: pip install PyMuPDF")
        sys.exit(1)
    
    medications = []
    doc = fitz.open(pdf_path)
    
    print(f"Processing {len(doc)} pages...")
    
    for page_num in range(len(doc)):
        if (page_num + 1) % 50 == 0:
            print(f"  Processed {page_num + 1}/{len(doc)} pages...")
        
        page = doc[page_num]
        text = page.get_text()
        
        if not text:
            continue
        
        # Split into lines and process each
        lines = text.split('\n')
        for line in lines:
            med = parse_medication_line(line)
            if med:
                medications.append(med)
    
    doc.close()
    
    # Remove duplicates based on generic name + strength
    seen = set()
    unique_medications = []
    for med in medications:
        key = (med['genericName'].lower().strip(), med['strength'].lower())
        if key not in seen and len(med['genericName']) > 3:
            seen.add(key)
            unique_medications.append(med)
    
    return unique_medications

def main():
    # Try to find the PDF file
    project_root = Path(__file__).parent.parent
    pdf_path = None
    
    # Try exact name first
    exact_path = project_root / 'Primary-Healthcare-Standard-Treatment-Guidelines-and-Essential-Medicines-List-8th-Edition-2024.pdf'
    if exact_path.exists():
        pdf_path = exact_path
    else:
        # Search for PDF files containing "formulary" or "2024" or "Primary Healthcare"
        for pdf_file in project_root.glob('*.pdf'):
            if any(word in pdf_file.name.lower() for word in ['formulary', '2024', 'primary', 'healthcare', 'essential']):
                pdf_path = pdf_file
                break
    
    if not pdf_path or not pdf_path.exists():
        print(f"Error: PDF file not found.")
        print(f"Looking for: Primary-Healthcare-Standard-Treatment-Guidelines-and-Essential-Medicines-List-8th-Edition-2024.pdf")
        print(f"Please ensure the PDF file is in: {project_root}")
        sys.exit(1)
    
    print("Extracting medications from 2024 Formulary PDF...")
    medications = extract_medications_from_pdf(pdf_path)
    
    print(f"\nExtracted {len(medications)} unique medications")
    
    # Save to JSON
    output_path = Path(__file__).parent.parent / 'extracted-medications-2024.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(medications, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {output_path}")
    
    # Show sample
    print("\nSample medications:")
    for med in medications[:10]:
        print(f"  - {med['genericName']} ({med['brandName']}) - {med['strength']} - {med['form']} - {med['category']}")

if __name__ == '__main__':
    main()

