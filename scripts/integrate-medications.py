#!/usr/bin/env python3
"""
Integrate extracted medications into the TypeScript formulary service
"""

import json
from pathlib import Path

def convert_to_typescript_medication(med, index):
    """Convert JSON medication to TypeScript format"""
    # Generate unique ID
    med_id = f'med-2024-{index:04d}'
    
    # Format the medication object
    ts_object = f"""  {{
    id: '{med_id}',
    brandName: {json.dumps(med.get('brandName', 'Generic'))},
    genericName: {json.dumps(med.get('genericName'))},
    category: {json.dumps(med.get('category', 'Other'))},
    strength: {json.dumps(med.get('strength', 'N/A'))},
    form: '{med.get('form', 'tablet')}',
    schedule: {json.dumps(med.get('schedule', 'Schedule 2'))},
    description: {json.dumps(med.get('description', ''))},
    commonDosage: {json.dumps(med.get('commonDosage', med.get('strength', 'N/A')))},
    commonFrequency: {json.dumps(med.get('commonFrequency', 'As prescribed'))}
  }}"""
    
    return ts_object

def main():
    # Load extracted medications
    extracted_path = Path(__file__).parent.parent / 'extracted-medications-2024.json'
    
    if not extracted_path.exists():
        print(f"Error: Extracted medications file not found: {extracted_path}")
        print("Please run extract-formulary-medications.py first")
        sys.exit(1)
    
    with open(extracted_path, 'r', encoding='utf-8') as f:
        medications = json.load(f)
    
    print(f"Found {len(medications)} medications to integrate")
    
    # Filter out obviously invalid entries
    valid_medications = []
    for med in medications:
        generic = med.get('genericName', '').strip()
        # Skip if generic name is too short, contains URLs, or is clearly not a medication
        if (len(generic) >= 3 and 
            'http' not in generic.lower() and 
            'www.' not in generic.lower() and
            'health.gov' not in generic.lower() and
            not generic.lower().startswith('right to') and
            not generic.lower().startswith('usaid')):
            valid_medications.append(med)
    
    print(f"Filtered to {len(valid_medications)} valid medications")
    
    # Generate TypeScript code
    ts_medications = []
    for i, med in enumerate(valid_medications):
        ts_medications.append(convert_to_typescript_medication(med, i))
    
    # Read existing formulary file
    formulary_path = Path(__file__).parent.parent / 'src' / 'services' / 'southAfricanFormulary.ts'
    
    with open(formulary_path, 'r', encoding='utf-8') as f:
        formulary_content = f.read()
    
    # Find where SA_MEDICATIONS array ends
    # Look for the closing bracket of the array
    lines = formulary_content.split('\n')
    
    # Find the line with the closing bracket of SA_MEDICATIONS array
    array_end_idx = -1
    bracket_count = 0
    in_array = False
    
    for i, line in enumerate(lines):
        if 'export const SA_MEDICATIONS' in line:
            in_array = True
        if in_array:
            bracket_count += line.count('[') - line.count(']')
            if bracket_count == 0 and '];' in line:
                array_end_idx = i
                break
    
    if array_end_idx == -1:
        print("Error: Could not find end of SA_MEDICATIONS array")
        sys.exit(1)
    
    # Insert new medications before the closing bracket
    new_lines = lines[:array_end_idx]
    new_lines.append('')  # Empty line
    new_lines.append('  // 2024 Formulary Medications')
    new_lines.extend([ts_med + ',' for ts_med in ts_medications[:-1]])  # All but last with comma
    new_lines.append(ts_medications[-1])  # Last without comma
    new_lines.extend(lines[array_end_idx:])  # Rest of file
    
    # Write updated file
    with open(formulary_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    
    print(f"Successfully integrated {len(valid_medications)} medications into {formulary_path}")

if __name__ == '__main__':
    import sys
    main()






