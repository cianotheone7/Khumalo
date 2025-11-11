#!/usr/bin/env python3
"""
Extract medications from South African Primary Healthcare Standard Treatment Guidelines
and Essential Medicines List 8th Edition 2024 PDF
"""

import re
import json
import sys
from pathlib import Path

# Try importing PDF libraries
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

def extract_with_pymupdf(pdf_path):
    """Extract text using PyMuPDF (best quality)"""
    medications = []
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text:
            medications.extend(parse_medication_text(text))
    doc.close()
    return medications

def extract_with_pypdf2(pdf_path):
    """Extract text using PyPDF2"""
    medications = []
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            # Process text to find medications
            # This is a simplified parser - you may need to adjust based on PDF structure
            medications.extend(parse_medication_text(text))
    return medications

def extract_with_pdfplumber(pdf_path):
    """Extract text using pdfplumber (better for structured data)"""
    medications = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                medications.extend(parse_medication_text(text))
    return medications

def parse_medication_text(text):
    """Parse medication information from extracted text"""
    medications = []
    
    # Common patterns for medication entries
    # Adjust these regex patterns based on the actual PDF structure
    patterns = [
        # Pattern: Generic Name (Brand Name) - Strength - Form
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\(([^)]+)\)\s*-\s*(\d+\s*(?:mg|g|ml|mcg|%|units)?)\s*-\s*([a-z]+)',
        # Pattern: Generic Name - Strength mg - Form
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*-\s*(\d+\s*(?:mg|g|ml|mcg|%|units)?)\s*-\s*([a-z]+)',
    ]
    
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue
            
        # Look for medication-like patterns
        med = try_parse_medication_line(line)
        if med:
            medications.append(med)
    
    return medications

def try_parse_medication_line(line):
    """Try to parse a single line as a medication"""
    # Skip headers and non-medication lines
    skip_patterns = [
        r'^Page\s+\d+',
        r'^Table of Contents',
        r'^Chapter',
        r'^Section',
        r'^\d+\.\s+',
    ]
    
    for pattern in skip_patterns:
        if re.match(pattern, line, re.IGNORECASE):
            return None
    
    # Look for common medication indicators
    med_indicators = ['mg', 'g', 'ml', 'mcg', 'tablet', 'capsule', 'syrup', 'injection', 'cream']
    has_indicator = any(ind in line.lower() for ind in med_indicators)
    
    if not has_indicator:
        return None
    
    # Try to extract medication name
    # This is a simplified extraction - adjust based on actual PDF format
    parts = re.split(r'[–\-\(\)]', line)
    if len(parts) < 2:
        return None
    
    generic_name = parts[0].strip()
    brand_name = parts[1].strip() if len(parts) > 1 else generic_name
    
    # Extract strength
    strength_match = re.search(r'(\d+(?:\s*\.\d+)?\s*(?:mg|g|ml|mcg|%|units)?)', line, re.IGNORECASE)
    strength = strength_match.group(1) if strength_match else 'N/A'
    
    # Extract form
    forms = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch', 'suspension']
    form = 'tablet'  # default
    for f in forms:
        if f in line.lower():
            form = f
            break
    
    # Determine category (simplified - you may need to adjust)
    category = determine_category(line)
    
    # Determine schedule (simplified)
    schedule = determine_schedule(line)
    
    if not generic_name or len(generic_name) < 3:
        return None
    
    return {
        'genericName': generic_name,
        'brandName': brand_name[:50],  # Limit length
        'strength': strength,
        'form': form,
        'category': category,
        'schedule': schedule,
        'description': line[:200],  # Use line as description
        'commonDosage': strength,
        'commonFrequency': 'As prescribed'
    }

def determine_category(text):
    """Determine medication category from text"""
    text_lower = text.lower()
    
    categories = {
        'Analgesics': ['paracetamol', 'aspirin', 'ibuprofen', 'codeine', 'morphine', 'tramadol'],
        'Antibiotics': ['amoxicillin', 'penicillin', 'azithromycin', 'ciprofloxacin', 'doxycycline', 'metronidazole'],
        'Cardiovascular': ['enalapril', 'losartan', 'atenolol', 'amlodipine', 'furosemide', 'hydrochlorothiazide'],
        'Diabetes': ['metformin', 'glibenclamide', 'insulin', 'gliclazide'],
        'Respiratory': ['salbutamol', 'beclomethasone', 'fluticasone', 'ipratropium'],
        'Gastrointestinal': ['omeprazole', 'ranitidine', 'loperamide', 'metoclopramide'],
        'Mental Health': ['fluoxetine', 'sertraline', 'amitriptyline', 'diazepam'],
        'Antihistamines': ['loratadine', 'cetirizine', 'chlorpheniramine'],
    }
    
    for category, keywords in categories.items():
        if any(keyword in text_lower for keyword in keywords):
            return category
    
    return 'Other'

def determine_schedule(text):
    """Determine South African schedule from text"""
    text_lower = text.lower()
    
    # Schedule indicators
    if 'schedule 0' in text_lower or 'unscheduled' in text_lower:
        return 'Schedule 0'
    elif 'schedule 1' in text_lower:
        return 'Schedule 1'
    elif 'schedule 2' in text_lower:
        return 'Schedule 2'
    elif 'schedule 3' in text_lower:
        return 'Schedule 3'
    elif 'schedule 4' in text_lower:
        return 'Schedule 4'
    elif 'schedule 5' in text_lower:
        return 'Schedule 5'
    elif 'schedule 6' in text_lower:
        return 'Schedule 6'
    
    # Default based on medication type
    if any(word in text_lower for word in ['paracetamol', 'ibuprofen']):
        return 'Schedule 0'
    elif any(word in text_lower for word in ['antibiotic', 'amoxicillin']):
        return 'Schedule 3'
    elif any(word in text_lower for word in ['hypertension', 'diabetes']):
        return 'Schedule 4'
    
    return 'Schedule 2'  # Default

def main():
    pdf_path = Path(__file__).parent.parent / 'Primary-Healthcare-Standard-Treatment-Guidelines-and-Essential-Medicines-List-8th-Edition-2024.pdf'
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found at {pdf_path}")
        print("Please ensure the PDF file is in the project root directory")
        sys.exit(1)
    
    print(f"Extracting medications from: {pdf_path}")
    
    medications = []
    
    if HAS_PYMUPDF:
        print("Using PyMuPDF (fitz) for extraction...")
        medications = extract_with_pymupdf(pdf_path)
    elif HAS_PDFPLUMBER:
        print("Using pdfplumber for extraction...")
        medications = extract_with_pdfplumber(pdf_path)
    elif HAS_PYPDF2:
        print("Using PyPDF2 for extraction...")
        medications = extract_with_pypdf2(pdf_path)
    else:
        print("Error: No PDF library found. Please install one:")
        print("  pip install PyMuPDF  # Recommended")
        print("  OR")
        print("  pip install pdfplumber")
        print("  OR")
        print("  pip install PyPDF2")
        sys.exit(1)
    
    # Remove duplicates
    seen = set()
    unique_medications = []
    for med in medications:
        key = (med['genericName'].lower(), med['strength'])
        if key not in seen:
            seen.add(key)
            unique_medications.append(med)
    
    print(f"Extracted {len(unique_medications)} unique medications")
    
    # Save to JSON
    output_path = Path(__file__).parent.parent / 'extracted-medications.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unique_medications, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {output_path}")
    print(f"\nFirst 5 medications:")
    for med in unique_medications[:5]:
        print(f"  - {med['genericName']} ({med['brandName']}) - {med['strength']} - {med['form']}")

if __name__ == '__main__':
    main()

