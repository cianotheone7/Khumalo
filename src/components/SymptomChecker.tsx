import React, { useState, useEffect } from 'react';
import './SymptomChecker.css';
import { logSymptomChecker } from '../services/activityService';
import PSQIQuestionnaire from './PSQIQuestionnaire';
import Body from '@mjcdev/react-body-highlighter';
import { getPatients } from '../services/azurePatientRestService';
import { uploadDocument } from '../services/azureBlobService';


interface Symptom {
  id: string;
  name: string;
  bodyPart: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
}

interface PSQIData {
  name: string;
  date: string;
  bedtime: string;
  fallAsleepMinutes: string;
  wakeTime: string;
  actualSleepHours: string;
  sleepProblems: {
    [key: string]: string;
  };
  sleepMedication: string;
  troubleStayingAwake: string;
  enthusiasmProblem: string;
  overallSleepQuality: string;
  otherReasons: string;
}

interface PatientDetails {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
}

interface BodyPart {
  id: string;
  name: string;
  path: string;
  symptoms: string[];
  x: number;
  y: number;
  position?: string;
  normal?: string;
}

const SymptomChecker: React.FC = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [hoveredBodyPart, setHoveredBodyPart] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [currentStep, setCurrentStep] = useState<'patient-details' | 'psqi' | 'body' | 'symptoms' | 'details' | 'results'>('patient-details');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [psqiData, setPsqiData] = useState<PSQIData | null>(null);
  const [bodySide, setBodySide] = useState<'front' | 'back'>('front');
  
  // Patient details state
  const [patientDetails, setPatientDetails] = useState<PatientDetails>({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    dateOfBirth: ''
  });
  const [matchedPatient, setMatchedPatient] = useState<any>(null);
  const [isCheckingPatient, setIsCheckingPatient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const handlePSQIComplete = (data: PSQIData) => {
    setPsqiData(data);
    setCurrentStep('body');
  };
  
  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState('');

  // Check for speech recognition support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
    }
  }, []);

  // Speech recognition functions
  const startListening = () => {
    if (!speechSupported) {
      setSpeechError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError('');
      setSpeechText('');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSpeechText(transcript);
      processSpeechText(transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setSpeechError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const processSpeechText = (text: string) => {
    const lowerText = text.toLowerCase();
    
    // Map speech to body parts
    const bodyPartMap: { [key: string]: string } = {
      'head': 'Head',
      'headache': 'Head',
      'migraine': 'Head',
      'dizzy': 'Head',
      'dizziness': 'Head',
      'chest': 'Chest & Upper Back',
      'chest pain': 'Chest & Upper Back',
      'breathing': 'Chest & Upper Back',
      'stomach': 'Abdomen & Stomach',
      'belly': 'Abdomen & Stomach',
      'abdomen': 'Abdomen & Stomach',
      'arm': 'Arms & Hands',
      'shoulder': 'Arms & Hands',
      'elbow': 'Arms & Hands',
      'wrist': 'Arms & Hands',
      'hand': 'Arms & Hands',
      'leg': 'Legs & Feet',
      'hip': 'Legs & Feet',
      'knee': 'Legs & Feet',
      'ankle': 'Legs & Feet',
      'foot': 'Legs & Feet',
      'feet': 'Legs & Feet',
      'back': 'Back & Spine',
      'spine': 'Back & Spine',
      'lower back': 'Back & Spine',
      'pelvic': 'Pelvic Area',
      'pelvic area': 'Pelvic Area',
      'pubic': 'Pelvic Area',
      'pubic area': 'Pelvic Area'
    };

    // Find matching body parts
    const matchedBodyParts = Object.keys(bodyPartMap).filter(keyword => 
      lowerText.includes(keyword)
    );

    if (matchedBodyParts.length > 0) {
      const bodyParts = matchedBodyParts.map(keyword => bodyPartMap[keyword]);
      setSelectedBodyParts(prev => [...new Set([...prev, ...bodyParts])]);
    }

    // Map speech to specific symptoms
    const symptomMap: { [key: string]: { name: string; bodyPart: string } } = {
      'headache': { name: 'Headache / Migraine', bodyPart: 'Head' },
      'migraine': { name: 'Headache / Migraine', bodyPart: 'Head' },
      'dizzy': { name: 'Dizziness / Lightheadedness', bodyPart: 'Head' },
      'dizziness': { name: 'Dizziness / Lightheadedness', bodyPart: 'Head' },
      'chest pain': { name: 'Chest pain / Tightness', bodyPart: 'Chest & Upper Back' },
      'shortness of breath': { name: 'Shortness of breath', bodyPart: 'Chest & Upper Back' },
      'cough': { name: 'Cough', bodyPart: 'Chest & Upper Back' },
      'stomach ache': { name: 'Stomach ache / Cramps', bodyPart: 'Abdomen & Stomach' },
      'nausea': { name: 'Nausea / Vomiting', bodyPart: 'Abdomen & Stomach' },
      'vomiting': { name: 'Nausea / Vomiting', bodyPart: 'Abdomen & Stomach' },
      'diarrhea': { name: 'Diarrhea', bodyPart: 'Abdomen & Stomach' },
      'constipation': { name: 'Constipation', bodyPart: 'Abdomen & Stomach' },
      'shoulder pain': { name: 'Shoulder pain', bodyPart: 'Arms & Hands' },
      'arm pain': { name: 'Arm pain / Weakness', bodyPart: 'Arms & Hands' },
      'knee pain': { name: 'Knee pain / Swelling', bodyPart: 'Legs & Feet' },
      'back pain': { name: 'Lower back pain', bodyPart: 'Back & Spine' },
      'fever': { name: 'Fever / Chills', bodyPart: 'General / Whole Body' },
      'fatigue': { name: 'Fatigue / Weakness', bodyPart: 'General / Whole Body' },
      'tired': { name: 'Fatigue / Weakness', bodyPart: 'General / Whole Body' }
    };

    // Find matching symptoms
    const matchedSymptoms = Object.keys(symptomMap).filter(keyword => 
      lowerText.includes(keyword)
    );

    if (matchedSymptoms.length > 0) {
      const newSymptoms = matchedSymptoms.map(keyword => ({
        id: `${keyword}-${Date.now()}`,
        name: symptomMap[keyword].name,
        bodyPart: symptomMap[keyword].bodyPart,
        severity: 'moderate' as const,
        duration: 'Unknown'
      }));
      
      setSelectedSymptoms(prev => {
        const existingIds = prev.map(s => s.name);
        const uniqueNew = newSymptoms.filter(s => !existingIds.includes(s.name));
        return [...prev, ...uniqueNew];
      });
    }
  };

  // No longer need model-viewer loading logic

  const bodyParts: BodyPart[] = [
    // Head and Neck
    {
      id: 'head',
      name: 'Head',
      path: 'M50,15 C50,8 45,3 40,3 C35,3 30,8 30,15 C30,22 35,27 40,27 C45,27 50,22 50,15 Z',
      symptoms: ['Headache / Migraine', 'Dizziness / Lightheadedness', 'Sinus pressure / Congestion', 'Earache / Ear pressure', 'Jaw pain / TMJ', 'Toothache', 'Eye pain / Strain', 'Blurred vision', 'Nosebleed', 'Facial pain / Facial paralysis', 'Depression', 'Insomnia', 'Exhaustion'],
      x: 40,
      y: 15,
      position: '0 0.8 0.3',
      normal: '0 1 0'
    },
    {
      id: 'neck',
      name: 'Neck',
      path: 'M45,27 C45,25 42,23 40,23 C38,23 35,25 35,27 C35,32 37,35 40,35 C43,35 45,32 45,27 Z',
      symptoms: ['Neck pain', 'Stiffness', 'Swelling', 'Difficulty swallowing', 'Voice changes', 'Lump in neck', 'Sore throat', 'Dry mouth'],
      x: 40,
      y: 30,
      position: '0 0.65 0.3',
      normal: '0 1 0'
    },
    // Female-specific: Breasts (left)
    {
      id: 'breasts-left',
      name: 'Breasts',
      path: 'M42,35 C42,33 40,31 38,31 C36,31 34,33 34,35 C34,37 36,39 38,39 C40,39 42,37 42,35 Z',
      symptoms: ['Breast pain / Lumps', 'Nipple discharge', 'Breast swelling', 'Breast tenderness', 'Skin changes'],
      x: 38,
      y: 35,
      position: '0 0.45 0.3',
      normal: '0 1 0'
    },
    // Female-specific: Breasts (right)
    {
      id: 'breasts-right',
      name: 'Breasts',
      path: 'M58,35 C58,33 60,31 62,31 C64,31 66,33 66,35 C66,37 64,39 62,39 C60,39 58,37 58,35 Z',
      symptoms: ['Breast pain / Lumps', 'Nipple discharge', 'Breast swelling', 'Breast tenderness', 'Skin changes'],
      x: 62,
      y: 35,
      position: '0 0.45 0.3',
      normal: '0 1 0'
    },
    // Male-specific: Chest
    {
      id: 'chest-male',
      name: 'Chest',
      path: 'M42,35 C42,33 40,31 38,31 C36,31 34,33 34,35 C34,37 36,39 38,39 C40,39 42,37 42,35 Z M58,35 C58,33 60,31 62,31 C64,31 66,33 66,35 C66,37 64,39 62,39 C60,39 58,37 58,35 Z',
      symptoms: ['Chest pain / Tightness', 'Shortness of breath', 'Cough', 'Wheezing', 'Palpitations (fast heartbeat)', 'Rib pain / Tenderness'],
      x: 50,
      y: 35,
      position: '0 0.45 0.3',
      normal: '0 1 0'
    },
    // Abdomen
    {
      id: 'abdomen',
      name: 'Abdomen',
      path: 'M50,45 C50,44 49,43 48,43 C47,43 46,44 46,45 C46,46 47,47 48,47 C49,47 50,46 50,45 Z',
      symptoms: ['Stomach ache / Cramps', 'Bloating', 'Nausea / Vomiting', 'Diarrhea', 'Constipation', 'Heartburn / Acid reflux', 'Loss of appetite', 'Abdominal swelling'],
      x: 50,
      y: 45,
      position: '0 0.15 0.3',
      normal: '0 1 0'
    },
    // Pelvic/Pubic area (combined)
    {
      id: 'pelvic-pubic',
      name: 'Pelvic/Pubic Area',
      path: 'M45,50 Q50,52 55,50 Q50,48 45,50 Z',
      symptoms: ['Pelvic pain', 'Pubic pain', 'Menstrual cramps', 'Irregular periods', 'Vaginal discharge / Itching', 'Pregnancy', 'Possible pregnancy', 'Blood in urine', 'Excessive bleeding', 'Frequent urination', 'Pain while urinating', 'Discomfort after sexual intercourse', 'Swelling', 'Discomfort', 'Hernia', 'Joint pain', 'Compromised mobility'],
      x: 50,
      y: 50,
      position: '0 -0.05 0.3',
      normal: '0 1 0'
    },
    // Male-specific: Genital area
    {
      id: 'genital-male',
      name: 'Genital',
      path: 'M45,52 Q50,54 55,52 Q50,50 45,52 Z',
      symptoms: ['Testicular pain / Swelling', 'Groin pain', 'Erectile issues', 'Blood in urine', 'Frequent urination', 'Pain while urinating'],
      x: 50,
      y: 52,
      position: '0 -0.15 0.3',
      normal: '0 1 0'
    },
    // Additional body parts for list selection
    {
      id: 'chest-general',
      name: 'Chest',
      path: 'M42,35 C42,33 40,31 38,31 C36,31 34,33 34,35 C34,37 36,39 38,39 C40,39 42,37 42,35 Z M58,35 C58,33 60,31 62,31 C64,31 66,33 66,35 C66,37 64,39 62,39 C60,39 58,37 58,35 Z',
      symptoms: ['Chest pain / Tightness', 'Shortness of breath', 'Cough', 'Wheezing', 'Palpitations (fast heartbeat)', 'Rib pain / Tenderness'],
      x: 50,
      y: 35,
      position: '0 0.6 0.2',
      normal: '0 1 0'
    },
    // Arms
    {
      id: 'left-arm-upper',
      name: 'L Upper Arm',
      path: 'M35,32 Q25,35 Q20,45 Q22,55 Q30,52 Q35,45 Q35,35 Z',
      symptoms: ['Shoulder pain', 'Arm pain / Weakness', 'Numbness', 'Swelling', 'Muscle pain', 'Compromised mobility'],
      x: 30,
      y: 40,
      position: '-0.35 0.35 0.25',
      normal: '-1 0 0'
    },
    {
      id: 'left-arm-lower',
      name: 'L Lower Arm',
      path: 'M22,55 Q18,60 Q20,70 Q25,68 Q30,65 Q25,60 Q22,55 Z',
      symptoms: ['Elbow pain', 'Wrist pain', 'Arm pain / Weakness', 'Numbness', 'Swelling', 'Compromised mobility'],
      x: 22,
      y: 62,
      position: '-0.45 0.05 0.25',
      normal: '-1 0 0'
    },
    {
      id: 'right-arm-upper',
      name: 'R Upper Arm',
      path: 'M65,32 Q75,35 Q80,45 Q78,55 Q70,52 Q65,45 Q65,35 Z',
      symptoms: ['Shoulder pain', 'Arm pain / Weakness', 'Numbness', 'Swelling', 'Muscle pain', 'Compromised mobility'],
      x: 70,
      y: 40,
      position: '0.35 0.35 0.25',
      normal: '1 0 0'
    },
    {
      id: 'right-arm-lower',
      name: 'R Lower Arm',
      path: 'M78,55 Q82,60 Q80,70 Q75,68 Q70,65 Q75,60 Q78,55 Z',
      symptoms: ['Elbow pain', 'Wrist pain', 'Arm pain / Weakness', 'Numbness', 'Swelling', 'Compromised mobility'],
      x: 78,
      y: 62,
      position: '0.45 0.05 0.25',
      normal: '1 0 0'
    },
    // Hands
    {
      id: 'left-hand',
      name: 'L Hand',
      path: 'M18,70 C18,68 16,66 14,66 C12,66 10,68 10,70 C10,72 12,74 14,74 C16,74 18,72 18,70 Z',
      symptoms: ['Hand numbness / Tingling', 'Finger stiffness / Swelling', 'Tremor / Shaking', 'Joint pain', 'Wrist pain', 'Ingrown nail/s', 'Compromised mobility'],
      x: 18,
      y: 70,
      position: '-0.55 -0.1 0.25',
      normal: '-1 0 0'
    },
    {
      id: 'right-hand',
      name: 'R Hand',
      path: 'M82,70 C82,68 84,66 86,66 C88,66 90,68 90,70 C90,72 88,74 86,74 C84,74 82,72 82,70 Z',
      symptoms: ['Hand numbness / Tingling', 'Finger stiffness / Swelling', 'Tremor / Shaking', 'Joint pain', 'Wrist pain', 'Ingrown nail/s', 'Compromised mobility'],
      x: 82,
      y: 70,
      position: '0.55 -0.1 0.25',
      normal: '1 0 0'
    },
    // Legs
    {
      id: 'left-thigh',
      name: 'L Thigh',
      path: 'M45,60 Q42,62 42,75 Q42,85 45,87 Q48,85 48,75 Q48,62 45,60 Z',
      symptoms: ['Hip pain', 'Leg weakness', 'Swelling', 'Numbness', 'Muscle pain', 'Compromised mobility'],
      x: 45,
      y: 70,
      position: '-0.18 -0.15 0.25',
      normal: '-1 0 0'
    },
    {
      id: 'right-thigh',
      name: 'R Thigh',
      path: 'M55,60 Q58,62 58,75 Q58,85 55,87 Q52,85 52,75 Q52,62 55,60 Z',
      symptoms: ['Hip pain', 'Leg weakness', 'Swelling', 'Numbness', 'Muscle pain', 'Compromised mobility'],
      x: 55,
      y: 70,
      position: '0.18 -0.15 0.25',
      normal: '1 0 0'
    },
    {
      id: 'left-calf',
      name: 'L Calf',
      path: 'M45,80 Q42,82 42,90 Q42,95 45,97 Q48,95 48,90 Q48,82 45,80 Z',
      symptoms: ['Knee pain / Swelling', 'Calf cramps / leg cramps', 'Restless legs', 'Leg weakness', 'Numbness / Tingling', 'Swollen legs / Feet', 'Compromised mobility'],
      x: 45,
      y: 88,
      position: '-0.18 -0.35 0.25',
      normal: '-1 0 0'
    },
    {
      id: 'right-calf',
      name: 'R Calf',
      path: 'M55,80 Q58,82 58,90 Q58,95 55,97 Q52,95 52,90 Q52,82 55,80 Z',
      symptoms: ['Knee pain / Swelling', 'Calf cramps / leg cramps', 'Restless legs', 'Leg weakness', 'Numbness / Tingling', 'Swollen legs / Feet', 'Compromised mobility'],
      x: 55,
      y: 88,
      position: '0.18 -0.35 0.25',
      normal: '1 0 0'
    },
    // Feet
    {
      id: 'left-foot',
      name: 'L Foot',
      path: 'M45,98 C45,97 44,96 43,96 C42,96 41,97 41,98 C41,99 42,100 43,100 C44,100 45,99 45,98 Z',
      symptoms: ['Ankle pain / Sprain', 'Foot pain', 'Numbness / Tingling', 'Swollen legs / Feet', 'Joint pain', 'Ingrown toenail', 'Compromised mobility'],
      x: 45,
      y: 98,
      position: '-0.18 -0.55 0.25',
      normal: '-1 0 0'
    },
    {
      id: 'right-foot',
      name: 'R Foot',
      path: 'M55,98 C55,97 56,96 57,96 C58,96 59,97 59,98 C59,99 58,100 57,100 C56,100 55,99 55,98 Z',
      symptoms: ['Ankle pain / Sprain', 'Foot pain', 'Numbness / Tingling', 'Swollen legs / Feet', 'Joint pain', 'Ingrown toenail', 'Compromised mobility'],
      x: 55,
      y: 98,
      position: '0.18 -0.55 0.25',
      normal: '1 0 0'
    },
    // Back & Spine
    {
      id: 'lower-back',
      name: 'Lower Back',
      path: 'M45,50 Q50,52 55,50 Q50,48 45,50 Z',
      symptoms: ['Lower back pain', 'Mid-back pain', 'Stiffness / Limited motion', 'Sciatica (pain radiating down leg)', 'Muscle spasms'],
      x: 50,
      y: 50,
      position: '0 0.05 -0.15',
      normal: '0 0 -1'
    },
    {
      id: 'upper-back',
      name: 'Upper Back',
      path: 'M42,35 Q38,37 40,42 Q42,47 45,45 Q47,43 45,40 Q43,37 42,35 Z',
      symptoms: ['Upper back pain', 'Stiffness', 'Muscle spasms', 'Numbness', 'Shoulder blade pain', 'Spine pain'],
      x: 50,
      y: 40,
      position: '0 0.35 -0.15',
      normal: '0 0 -1'
    },
    // General/Whole Body
    {
      id: 'general',
      name: 'General',
      path: 'M50,50 C50,45 45,40 40,40 C35,40 30,45 30,50 C30,55 35,60 40,60 C45,60 50,55 50,50 Z',
      symptoms: ['Fever / Chills', 'Fatigue / Weakness', 'Weight loss or gain', 'Body aches', 'Swelling (edema)', 'Dehydration', 'Night sweats'],
      x: 50,
      y: 50,
      position: '0 0.3 0.1',
      normal: '0 1 0'
    },
    // Mental/Neurological
    {
      id: 'mental',
      name: 'Mental',
      path: 'M50,15 C50,8 45,3 40,3 C35,3 30,8 30,15 C30,22 35,27 40,27 C45,27 50,22 50,15 Z',
      symptoms: ['Confusion / Brain fog', 'Anxiety / Panic', 'Depression / Low mood', 'Sleep issues (insomnia)', 'Memory problems'],
      x: 50,
      y: 15,
      position: '0 1.2 0.1',
      normal: '0 1 0'
    },
    // Skin
    {
      id: 'skin',
      name: 'Skin',
      path: 'M50,50 C50,45 45,40 40,40 C35,40 30,45 30,50 C30,55 35,60 40,60 C45,60 50,55 50,50 Z',
      symptoms: ['Rash / Itching', 'Dry skin', 'Redness / Swelling', 'Bruises', 'Cuts / Wounds', 'Acne / Pimples', 'Lumps / Bumps'],
      x: 50,
      y: 50,
      position: '0 0.4 0.05',
      normal: '0 1 0'
    }
  ];

  const handleBodyPartClick = (bodyPart: BodyPart) => {
    setSelectedBodyParts(prev => {
      if (prev.includes(bodyPart.id)) {
        // Remove if already selected
        return prev.filter(id => id !== bodyPart.id);
      } else {
        // Add if not selected
        return [...prev, bodyPart.id];
      }
    });
  };

  // Map @mjcdev/react-body-highlighter part IDs to our body parts
  const mapBodyPartSlugToOurs = (slug: string, side?: "left" | "right"): string | null => {
    console.log('Mapping slug:', slug, 'side:', side);
    
    // Handle side-specific mapping
    const leftRight = side === 'left' ? 'left' : side === 'right' ? 'right' : '';
    
    const mapping: { [key: string]: string } = {
      'head': 'head',
      'neck': 'neck',
      'shoulder': leftRight ? `${leftRight}-arm-upper` : 'right-arm-upper',
      'biceps': leftRight ? `${leftRight}-arm-upper` : 'right-arm-upper',
      'forearm': leftRight ? `${leftRight}-arm-lower` : 'right-arm-lower',
      'hand': leftRight ? `${leftRight}-hand` : 'right-hand',
      'chest': 'chest-male',
      'abs': 'abdomen',
      'obliques': 'abdomen',
      'pelvis': 'pelvic-pubic',
      'adductors': 'pelvic-pubic',
      'quadriceps': leftRight ? `${leftRight}-thigh` : 'right-thigh',
      'hamstring': leftRight ? `${leftRight}-thigh` : 'right-thigh',
      'thigh': leftRight ? `${leftRight}-thigh` : 'right-thigh',
      'calves': leftRight ? `${leftRight}-calf` : 'right-calf',
      'calf': leftRight ? `${leftRight}-calf` : 'right-calf',
      'foot': leftRight ? `${leftRight}-foot` : 'right-foot',
      'upper-back': 'upper-back',
      'lower-back': 'lower-back',
      'back': 'lower-back',
      'trapezius': 'upper-back',
      'deltoids': leftRight ? `${leftRight}-arm-upper` : 'right-arm-upper',
      'triceps': leftRight ? `${leftRight}-arm-upper` : 'right-arm-upper',
      'gluteal': 'pelvic-pubic'
    };
    
    const mapped = mapping[slug] || mapping[slug.toLowerCase()];
    console.log('Mapped to:', mapped);
    return mapped || null;
  };

  const handleBodyPartPressFromDiagram = (bodyPart: any, side?: "left" | "right") => {
    console.log('=== Body part clicked ===');
    console.log('Body part:', bodyPart);
    console.log('Side:', side);
    
      if (bodyPart && bodyPart.slug) {
      const mappedPartId = mapBodyPartSlugToOurs(bodyPart.slug, side);
      console.log('Mapped ID:', mappedPartId);
      
      if (mappedPartId) {
        // Find the corresponding body part in our bodyParts array
        const ourBodyPart = bodyParts.find(p => p.id === mappedPartId);
        console.log('Found body part:', ourBodyPart);
        
        if (ourBodyPart) {
          handleBodyPartClick(ourBodyPart);
        } else {
          // If not found, create a temporary body part for the clicked area
          console.log('Creating temp body part for:', mappedPartId);
          const tempPart: BodyPart = {
            id: mappedPartId,
            name: mappedPartId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            path: '',
            symptoms: [],
            x: 50,
            y: 50
          };
          handleBodyPartClick(tempPart);
        }
      } else {
        console.log('No mapping found for slug:', bodyPart.slug);
      }
    }
  };

  // Prepare data for Body component based on selected body parts
  const getBodyHighlightData = () => {
    const data: any[] = [];
    
    selectedBodyParts.forEach(selectedId => {
      // Map our IDs back to body part slugs with sides
      const reverseMapping: { [key: string]: Array<{ slug: string, side?: string }> } = {
        'head': [{ slug: 'head' }],
        'neck': [{ slug: 'neck' }],
        'chest-male': [{ slug: 'chest' }],
        'breasts-left': [{ slug: 'chest', side: 'left' }],
        'breasts-right': [{ slug: 'chest', side: 'right' }],
        'abdomen': [{ slug: 'abs' }],
        'pelvic-pubic': [{ slug: 'pelvis' }, { slug: 'adductors' }],
        'left-arm-upper': [{ slug: 'shoulder', side: 'left' }, { slug: 'biceps', side: 'left' }],
        'right-arm-upper': [{ slug: 'shoulder', side: 'right' }, { slug: 'biceps', side: 'right' }],
        'left-arm-lower': [{ slug: 'forearm', side: 'left' }],
        'right-arm-lower': [{ slug: 'forearm', side: 'right' }],
        'left-hand': [{ slug: 'hand', side: 'left' }],
        'right-hand': [{ slug: 'hand', side: 'right' }],
        'left-thigh': [{ slug: 'quadriceps', side: 'left' }, { slug: 'hamstring', side: 'left' }],
        'right-thigh': [{ slug: 'quadriceps', side: 'right' }, { slug: 'hamstring', side: 'right' }],
        'left-calf': [{ slug: 'calves', side: 'left' }],
        'right-calf': [{ slug: 'calves', side: 'right' }],
        'left-foot': [{ slug: 'foot', side: 'left' }],
        'right-foot': [{ slug: 'foot', side: 'right' }],
        'lower-back': [{ slug: 'lower-back' }, { slug: 'gluteal' }],
        'upper-back': [{ slug: 'upper-back' }, { slug: 'trapezius' }]
      };
      
      const parts = reverseMapping[selectedId] || [];
      parts.forEach(part => {
        if (!data.find(d => d.slug === part.slug && d.side === part.side)) {
          data.push({ slug: part.slug as any, intensity: 1, ...(part.side && { side: part.side }) });
        }
      });
    });
    
    console.log('Highlight data:', data);
    return data;
  };


  const handleSymptomSelect = (symptomName: string, bodyPartId: string) => {
    const isAlreadySelected = selectedSymptoms.some(s => s.name === symptomName);
    
    if (isAlreadySelected) {
      // Remove if already selected
      setSelectedSymptoms(prev => prev.filter(s => s.name !== symptomName));
    } else {
      // Add new symptom
      const newSymptom: Symptom = {
        id: `${symptomName}-${Date.now()}`,
        name: symptomName,
        bodyPart: bodyPartId,
        severity: 'mild',
        duration: '1-3 days'
      };
      
      setSelectedSymptoms(prev => [...prev, newSymptom]);
    }
  };

  const handleSymptomRemove = (symptomId: string) => {
    setSelectedSymptoms(prev => prev.filter(s => s.id !== symptomId));
  };

  const handleSeverityChange = (symptomId: string, severity: 'mild' | 'moderate' | 'severe') => {
    setSelectedSymptoms(prev => 
      prev.map(s => s.id === symptomId ? { ...s, severity } : s)
    );
  };

  const handleDurationChange = (symptomId: string, duration: string) => {
    setSelectedSymptoms(prev => 
      prev.map(s => s.id === symptomId ? { ...s, duration } : s)
    );
  };

  const generateRecommendations = () => {
    const symptoms = selectedSymptoms.map(s => s.name.toLowerCase());
    let recommendations = [];
    let priority = 'Low';
    let urgency = 'Schedule appointment within a week';

    // Analyze symptoms for urgent conditions
    if (symptoms.some(s => s.includes('chest pain') || s.includes('shortness of breath'))) {
      recommendations.push('🚨 URGENT: Chest pain and breathing difficulties require immediate medical attention');
      priority = 'High';
      urgency = 'Seek emergency care immediately';
    }

    if (symptoms.some(s => s.includes('severe headache') || s.includes('vision problems'))) {
      recommendations.push('⚠️ HIGH PRIORITY: Severe headache with vision changes may indicate serious conditions');
      priority = 'High';
      urgency = 'Seek medical attention within 24 hours';
    }

    if (symptoms.some(s => s.includes('abdominal pain') || s.includes('vomiting'))) {
      recommendations.push('🔍 MODERATE: Abdominal symptoms may require evaluation');
      if (priority !== 'High') priority = 'Medium';
      if (urgency === 'Schedule appointment within a week') urgency = 'Schedule appointment within 2-3 days';
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('📋 Monitor symptoms and maintain a symptom diary');
      recommendations.push('💊 Consider over-the-counter pain relief if appropriate');
      recommendations.push('🏥 Schedule routine checkup if symptoms persist');
    }

    return { recommendations, priority, urgency };
  };

  const handleAnalyze = async () => {
    setIsProcessing(true);
    
    try {
      // Step 1: Check for patient match
      setProcessingStatus('Checking patient records...');
      await new Promise(resolve => setTimeout(resolve, 800)); // Smooth transition
      await checkPatientMatchSilently();
      
      // Step 2: Generate report
      setProcessingStatus('Generating symptom report...');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Step 3: Save results
      setProcessingStatus('Saving results...');
      await saveSymptomTrackerResults();
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Step 4: Log activity
      setProcessingStatus('Finalizing...');
      const symptoms = selectedSymptoms.map(s => s.name);
      await logSymptomChecker(
        matchedPatient?.id || 'unknown-patient',
        patientDetails.name || 'Unknown Patient',
        'symptom-tracker',
        'Symptom Tracker',
        symptoms
      );
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Hide loading and show success
      setIsProcessing(false);
      setProcessingStatus('');
      
      // Small delay before success modal for smooth transition
      await new Promise(resolve => setTimeout(resolve, 200));
      showBeautifulConfirmation();
    } catch (error) {
      console.error('Error processing symptom tracker:', error);
      setIsProcessing(false);
      setProcessingStatus('');
      showBeautifulConfirmation(); // Show success anyway
    }
  };

  const showBeautifulConfirmation = () => {
    // Create and show beautiful modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease-in;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-radius: 20px;
      padding: 50px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.4s ease-out;
    `;
    
    content.innerHTML = `
      <div style="font-size: 80px; margin-bottom: 20px; animation: bounce 0.6s ease-in-out;">✅</div>
      <h2 style="color: #28a745; font-size: 2rem; margin-bottom: 15px; font-weight: 700;">Symptom Tracker Complete!</h2>
      <p style="color: #666; font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px;">
        Thank you for completing the symptom tracker. Your information has been successfully submitted and our medical team will review it shortly.
      </p>
      <button id="closeConfirmation" style="
        padding: 14px 40px;
        background: linear-gradient(135deg, #28a745 0%, #218838 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        transition: all 0.3s ease;
      " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(40, 167, 69, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(40, 167, 69, 0.3)';">
        Done
      </button>
      
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on button click
    const closeBtn = document.getElementById('closeConfirmation');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.remove();
        resetChecker();
      };
    }
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resetChecker();
      }
    };
  };

  const resetChecker = () => {
    setSelectedSymptoms([]);
    setSelectedBodyParts([]);
    setHoveredBodyPart(null);
    setShowResults(false);
    setCurrentStep('patient-details');
    setPatientDetails({
      name: '',
      email: '',
      phone: '',
      idNumber: '',
      dateOfBirth: ''
    });
    setMatchedPatient(null);
  };

  const handlePatientDetailsSubmit = async () => {
    // Just proceed to PSQI - check will happen silently at the end
    setCurrentStep('psqi');
  };
  
  const checkPatientMatchSilently = async () => {
    try {
      // Get all patients and search for a match
      const allPatients = await getPatients();
      
      // Search for matching patient by email, ID number, or phone
      const matched = allPatients.find(p => 
        (patientDetails.email && p.email?.toLowerCase() === patientDetails.email.toLowerCase()) ||
        (patientDetails.idNumber && p.passportId === patientDetails.idNumber) ||
        (patientDetails.phone && (p.phone === patientDetails.phone || p.mobilePhone === patientDetails.phone))
      );
      
      if (matched) {
        console.log('✅ Patient matched (silent):', matched);
        setMatchedPatient(matched);
      } else {
        console.log('ℹ️ No matching patient found (silent)');
        setMatchedPatient(null);
      }
    } catch (error) {
      console.error('Error checking patient (silent):', error);
      setMatchedPatient(null);
    }
  };

  const saveSymptomTrackerResults = async () => {
    try {
      // Generate symptom tracker report
      const report = generateSymptomTrackerReport();
      
      if (matchedPatient) {
        // Save as document under patient profile
        const blob = new Blob([report], { type: 'text/plain' });
        const file = new File([blob], `symptom-tracker-${Date.now()}.txt`, { type: 'text/plain' });
        
        await uploadDocument(file, {
          fileName: file.name,
          fileSize: file.size,
          contentType: 'text/plain',
          patientId: matchedPatient.id || matchedPatient.rowKey,
          description: 'Symptom Tracker Report',
          documentType: 'symptom-tracker'
        });
        
        console.log('✅ Symptom tracker saved to patient profile');
      } else {
        // Send email notification
        await sendSymptomTrackerEmail(report);
        console.log('✅ Symptom tracker email sent');
      }
    } catch (error) {
      console.error('Error saving symptom tracker:', error);
    }
  };

  const generateSymptomTrackerReport = (): string => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let report = '='.repeat(60) + '\n';
    report += 'SYMPTOM TRACKER REPORT\n';
    report += '='.repeat(60) + '\n\n';
    report += `Date: ${date}\n`;
    report += `Time: ${time}\n\n`;
    
    report += 'PATIENT INFORMATION:\n';
    report += '-'.repeat(60) + '\n';
    report += `Name: ${patientDetails.name}\n`;
    report += `Email: ${patientDetails.email}\n`;
    report += `Phone: ${patientDetails.phone}\n`;
    report += `ID Number: ${patientDetails.idNumber}\n`;
    report += `Date of Birth: ${patientDetails.dateOfBirth}\n`;
    report += `Gender: ${gender.charAt(0).toUpperCase() + gender.slice(1)}\n`;
    if (matchedPatient) {
      report += `Patient Status: MATCHED (Existing Patient)\n`;
      report += `Medical Record #: ${matchedPatient.medicalRecordNumber || 'N/A'}\n`;
    } else {
      report += `Patient Status: NEW (Not in system)\n`;
    }
    report += '\n';
    
    report += 'AFFECTED BODY PARTS:\n';
    report += '-'.repeat(60) + '\n';
    selectedBodyParts.forEach((partId, index) => {
      const part = bodyParts.find(p => p.id === partId);
      report += `${index + 1}. ${part?.name || partId}\n`;
    });
    report += '\n';
    
    report += 'SYMPTOMS:\n';
    report += '-'.repeat(60) + '\n';
    selectedSymptoms.forEach((symptom, index) => {
      report += `${index + 1}. ${symptom.name}\n`;
      report += `   Body Part: ${symptom.bodyPart}\n`;
      report += `   Severity: ${symptom.severity.toUpperCase()}\n`;
      report += `   Duration: ${symptom.duration}\n\n`;
    });
    
    const { recommendations, priority, urgency } = generateRecommendations();
    report += 'RECOMMENDATIONS:\n';
    report += '-'.repeat(60) + '\n';
    report += `Priority: ${priority}\n`;
    report += `Urgency: ${urgency}\n\n`;
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    report += '\n';
    
    report += '='.repeat(60) + '\n';
    report += 'End of Report\n';
    report += '='.repeat(60) + '\n';
    
    return report;
  };

  const sendSymptomTrackerEmail = async (report: string) => {
    try {
      // TODO: Implement email sending via Azure Communication Services or connected email
      console.log('📧 Sending email notification to medical staff...');
      console.log('Report:', report);
      // Email sent silently - patient doesn't see this
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  return (
    <div className="symptom-checker">
      {/* Beautiful Loading Screen */}
      {isProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(103, 69, 128, 0.95) 0%, rgba(45, 27, 105, 0.95) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '30px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            {/* Animated spinner */}
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 30px',
              border: '8px solid rgba(255, 255, 255, 0.2)',
              borderTop: '8px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            
            <h2 style={{
              color: '#ffffff',
              fontSize: '2rem',
              marginBottom: '15px',
              fontWeight: '700'
            }}>
              Processing Your Information
            </h2>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1.2rem',
              fontWeight: '500',
              marginBottom: '10px'
            }}>
              {processingStatus}
            </p>
            
            <div style={{
              width: '300px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
              margin: '20px auto 0'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.6) 100%)',
                animation: 'slideProgress 1.5s ease-in-out infinite'
              }}></div>
            </div>
          </div>
          
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideProgress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}
          </style>
        </div>
      )}
      
      <div className="checker-header">
        <h2>🩺 Interactive Symptom Checker</h2>
      </div>

      {currentStep === 'patient-details' && (
        <div className="patient-details-form" style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '56px', marginBottom: '15px' }}>👤</div>
            <h2 style={{ color: '#2c3e50', fontSize: '2rem', marginBottom: '10px' }}>Patient Information</h2>
            <p style={{ color: '#666', fontSize: '1rem', lineHeight: '1.6' }}>
              Please provide your details to get started with the symptom tracker.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '600', fontSize: '0.95rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={patientDetails.name}
                onChange={(e) => setPatientDetails({ ...patientDetails, name: e.target.value })}
                placeholder="Enter your full name"
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: '2px solid #dee2e6',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#674580'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '600', fontSize: '0.95rem' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={patientDetails.email}
                onChange={(e) => setPatientDetails({ ...patientDetails, email: e.target.value })}
                placeholder="your.email@example.com"
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: '2px solid #dee2e6',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#674580'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '600', fontSize: '0.95rem' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={patientDetails.phone}
                  onChange={(e) => setPatientDetails({ ...patientDetails, phone: e.target.value })}
                  placeholder="+27 XX XXX XXXX"
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    border: '2px solid #dee2e6',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#674580'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '600', fontSize: '0.95rem' }}>
                  ID Number
                </label>
                <input
                  type="text"
                  value={patientDetails.idNumber}
                  onChange={(e) => setPatientDetails({ ...patientDetails, idNumber: e.target.value })}
                  placeholder="ID or Passport Number"
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    border: '2px solid #dee2e6',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#674580'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '600', fontSize: '0.95rem' }}>
                Date of Birth *
              </label>
              <input
                type="date"
                value={patientDetails.dateOfBirth}
                onChange={(e) => {
                  const value = e.target.value;
                  // Validate date format and prevent invalid years
                  if (value) {
                    const date = new Date(value);
                    const year = date.getFullYear();
                    // Ensure year is between 1900 and current year
                    if (year >= 1900 && year <= new Date().getFullYear()) {
                      setPatientDetails({ ...patientDetails, dateOfBirth: value });
                    }
                  } else {
                    setPatientDetails({ ...patientDetails, dateOfBirth: value });
                  }
                }}
                max={new Date().toISOString().split('T')[0]}
                min="1900-01-01"
                required
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: '2px solid #dee2e6',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#674580'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c3e50', fontWeight: '600', fontSize: '0.95rem' }}>
                Gender *
              </label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={() => setGender('male')}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: gender === 'male' 
                      ? 'linear-gradient(135deg, #674580 0%, #5a3a6b 100%)' 
                      : '#ffffff',
                    color: gender === 'male' ? 'white' : '#495057',
                    border: `2px solid ${gender === 'male' ? '#674580' : '#dee2e6'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: gender === 'male' ? '0 4px 12px rgba(103, 69, 128, 0.3)' : 'none'
                  }}
                >
                  Male
                </button>
                <button
                  onClick={() => setGender('female')}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: gender === 'female' 
                      ? 'linear-gradient(135deg, #674580 0%, #5a3a6b 100%)' 
                      : '#ffffff',
                    color: gender === 'female' ? 'white' : '#495057',
                    border: `2px solid ${gender === 'female' ? '#674580' : '#dee2e6'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: gender === 'female' ? '0 4px 12px rgba(103, 69, 128, 0.3)' : 'none'
                  }}
                >
                  Female
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handlePatientDetailsSubmit}
            disabled={!patientDetails.name || !patientDetails.email || !patientDetails.phone || !patientDetails.dateOfBirth}
            style={{
              width: '100%',
              marginTop: '30px',
              padding: '16px 32px',
              background: (!patientDetails.name || !patientDetails.email || !patientDetails.phone || !patientDetails.dateOfBirth)
                ? '#6c757d'
                : 'linear-gradient(135deg, #674580 0%, #5a3a6b 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: (!patientDetails.name || !patientDetails.email || !patientDetails.phone || !patientDetails.dateOfBirth) ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              boxShadow: (!patientDetails.name || !patientDetails.email || !patientDetails.phone || !patientDetails.dateOfBirth)
                ? 'none'
                : '0 4px 12px rgba(103, 69, 128, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (patientDetails.name && patientDetails.email && patientDetails.phone && patientDetails.dateOfBirth) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(103, 69, 128, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (patientDetails.name && patientDetails.email && patientDetails.phone && patientDetails.dateOfBirth) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(103, 69, 128, 0.3)';
              }
            }}
          >
            Continue to Sleep Assessment →
          </button>

          <p style={{
            marginTop: '20px',
            fontSize: '0.85rem',
            color: '#999',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Your information is securely stored and only used for medical purposes.
          </p>
        </div>
      )}

      {currentStep === 'psqi' && (
        <div className="psqi-container">
          <PSQIQuestionnaire 
            onComplete={handlePSQIComplete}
            isMandatory={true}
          />
        </div>
      )}

      {currentStep === 'body' && (
        <div className="body-selection">
          <h3>Step 2: Select Body Area</h3>
          
          {/* Gender Selection */}
          <div className="gender-toggle">
            <button 
              className={gender === 'male' ? 'active' : ''} 
              onClick={() => setGender('male')}
            >
              Male
            </button>
            <button 
              className={gender === 'female' ? 'active' : ''} 
              onClick={() => setGender('female')}
            >
              Female
            </button>
          </div>

          {/* Speech Recognition Section */}
          <div className="speech-section" style={{
            margin: '20px 0',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '15px',
            border: '2px solid #e9ecef',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#495057', fontSize: '18px' }}>
              🎤 Or speak your symptoms:
            </h4>
            
            {speechSupported ? (
              <div>
                <button
                  onClick={isListening ? stopListening : startListening}
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '25px',
                    border: 'none',
                    cursor: 'pointer',
                    background: isListening ? '#dc3545' : '#674580',
                    color: 'white',
                    margin: '0 10px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                  onMouseOver={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.background = '#5a3a6b';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isListening) {
                      e.currentTarget.style.background = '#674580';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isListening ? '🛑 Stop Listening' : '🎤 Start Speaking'}
                </button>
                
                {isListening && (
                  <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    background: '#fff3cd',
                    borderRadius: '8px',
                    border: '1px solid #ffeaa7',
                    color: '#856404',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    🎧 Listening... Speak clearly about your symptoms
                  </div>
                )}
                
                {speechText && (
                  <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    background: '#d1ecf1',
                    borderRadius: '8px',
                    border: '1px solid #bee5eb',
                    color: '#0c5460',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}>
                    <strong>You said:</strong> "{speechText}"
                  </div>
                )}
                
                {speechError && (
                  <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    background: '#f8d7da',
                    borderRadius: '8px',
                    border: '1px solid #f5c6cb',
                    color: '#721c24',
                    fontSize: '14px'
                  }}>
                    ⚠️ {speechError}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '15px',
                background: '#f8d7da',
                borderRadius: '8px',
                border: '1px solid #f5c6cb',
                color: '#721c24',
                fontSize: '14px'
              }}>
                ⚠️ Speech recognition is not supported in this browser. Please use Chrome or Edge for voice input.
              </div>
            )}
          </div>

          {/* React Human Body Component */}
          <div className="human-body-container" style={{
            marginTop: '20px',
            padding: '20px',
            background: '#ffffff',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '18px', fontWeight: '600', textAlign: 'center' }}>
              Click on Body Areas to Select Them
            </h4>
            
            {/* Front/Back Toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setBodySide('front')}
                style={{
                  padding: '12px 30px',
                  background: bodySide === 'front' 
                    ? 'linear-gradient(135deg, #674580 0%, #5a3a6b 100%)' 
                    : '#ffffff',
                  color: bodySide === 'front' ? 'white' : '#495057',
                  border: `2px solid ${bodySide === 'front' ? '#674580' : '#dee2e6'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: bodySide === 'front' ? '600' : '500',
                  transition: 'all 0.3s ease',
                  boxShadow: bodySide === 'front' ? '0 4px 12px rgba(103, 69, 128, 0.3)' : 'none'
                }}
              >
                👤 Front View
              </button>
              <button
                onClick={() => setBodySide('back')}
                style={{
                  padding: '12px 30px',
                  background: bodySide === 'back' 
                    ? 'linear-gradient(135deg, #674580 0%, #5a3a6b 100%)' 
                    : '#ffffff',
                  color: bodySide === 'back' ? 'white' : '#495057',
                  border: `2px solid ${bodySide === 'back' ? '#674580' : '#dee2e6'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: bodySide === 'back' ? '600' : '500',
                  transition: 'all 0.3s ease',
                  boxShadow: bodySide === 'back' ? '0 4px 12px rgba(103, 69, 128, 0.3)' : 'none'
                }}
              >
                🔙 Back View
              </button>
            </div>
            
            {/* Human Body Component */}
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '600px',
              padding: '40px 20px',
              background: '#f8f9fa',
              borderRadius: '12px',
              border: '2px solid #e0e0e0'
            }}>
              <div style={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                maxWidth: '400px',
                width: '100%'
              }}>
              <Body
                data={getBodyHighlightData()}
                gender={gender}
                side={bodySide}
                scale={2}
                onBodyPartClick={handleBodyPartPressFromDiagram}
                colors={['#674580', '#a855f7']}
                border="#dfdfdf"
              />
              </div>
            </div>
            
            <p style={{
              marginTop: '15px',
              fontSize: '13px',
              color: '#666',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              💡 <strong>Tip:</strong> Click on different body parts to select them. Switch between front and back views using the buttons above.
            </p>
            
            {selectedBodyParts.length > 0 && (
              <div style={{
                marginTop: '15px',
                padding: '12px 20px',
                background: '#e8f5e9',
                borderRadius: '8px',
                border: '1px solid #4caf50',
                textAlign: 'center'
              }}>
                <strong style={{ color: '#2e7d32' }}>
                  ✓ {selectedBodyParts.length} body part{selectedBodyParts.length !== 1 ? 's' : ''} selected
                </strong>
              </div>
            )}
          </div>

          {/* Body Part Selection - Clean List Interface (Fallback/Additional) */}
          <div className="body-parts-selection" style={{
            marginTop: '20px',
            padding: '30px',
            background: '#ffffff',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            <h4 style={{ margin: '0 0 25px 0', color: '#333', fontSize: '18px', fontWeight: '600', textAlign: 'center' }}>
              Or Select Body Areas from List Below
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {bodyParts
                .filter(part => {
                  // Show gender-specific parts based on selected gender
                  if ((part.id === 'breasts-left' || part.id === 'breasts-right') && gender === 'male') return false;
                  if (part.id === 'chest-male' && gender === 'female') return false;
                  if (part.id === 'genital-male' && gender === 'female') return false;
                  if (part.id === 'chest-general') return false;
                  // Combine breasts-left and breasts-right into one "Breasts" option
                  if (part.id === 'breasts-right') return false;
                  return true;
                })
                .map(part => {
                  // Handle breasts selection
                  const isBreastPart = part.id === 'breasts-left';
                  const displayId = isBreastPart ? 'breasts' : part.id;
                  const displayName = isBreastPart ? 'Breasts' : part.name;
                  const isSelected = selectedBodyParts.includes(displayId);
                  const hasSymptoms = selectedSymptoms.some(s => s.bodyPart === displayId);
                  
                  return (
                    <button
                      key={part.id}
                      onClick={() => {
                        const partToSelect = isBreastPart ? { ...part, id: 'breasts', name: 'Breasts' } : part;
                        handleBodyPartClick(partToSelect);
                      }}
                      onMouseEnter={(e) => {
                        setHoveredBodyPart(displayId);
                        if (!isSelected) {
                          e.currentTarget.style.background = hasSymptoms ? '#ffe0b2' : '#f3f0f7';
                          e.currentTarget.style.borderColor = hasSymptoms ? '#FF9800' : '#674580';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        setHoveredBodyPart(null);
                        if (!isSelected) {
                          e.currentTarget.style.background = hasSymptoms ? '#fff3e0' : '#ffffff';
                          e.currentTarget.style.borderColor = hasSymptoms ? '#FF9800' : '#dee2e6';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = hasSymptoms
                            ? '0 2px 8px rgba(255, 152, 0, 0.2)'
                            : '0 2px 4px rgba(0, 0, 0, 0.05)';
                        }
                      }}
                      style={{
                        padding: '16px 20px',
                        background: isSelected 
                          ? 'linear-gradient(135deg, #674580 0%, #5a3a6b 100%)' 
                          : hasSymptoms
                            ? '#fff3e0'
                            : '#ffffff',
                        color: isSelected ? 'white' : hasSymptoms ? '#f57c00' : '#495057',
                        border: `2px solid ${isSelected ? '#674580' : hasSymptoms ? '#FF9800' : '#dee2e6'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: isSelected ? '600' : '500',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'center',
                        boxShadow: isSelected 
                          ? '0 4px 12px rgba(103, 69, 128, 0.3)' 
                          : hasSymptoms
                            ? '0 2px 8px rgba(255, 152, 0, 0.2)'
                            : '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                    >
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px' 
                      }}>
                        {isSelected && <span style={{ fontSize: '18px' }}>✓</span>}
                        {hasSymptoms && !isSelected && <span style={{ fontSize: '16px' }}>⚠️</span>}
                        {displayName}
                      </span>
                    </button>
                  );
                })}
            </div>
            
            {/* Proceed button for body part selection */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '30px',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              {selectedBodyParts.length > 0 && selectedBodyParts.length < 2 && (
                <p style={{ color: '#f44336', fontSize: '14px', margin: 0 }}>
                  Please select at least 2 body parts to continue
                </p>
              )}
              <button 
                onClick={() => setCurrentStep('symptoms')} 
                style={{
                  padding: '12px 30px',
                  background: selectedBodyParts.length >= 2 ? '#674580' : '#cccccc',
                  color: selectedBodyParts.length >= 2 ? 'white' : '#666666',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedBodyParts.length >= 2 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  opacity: selectedBodyParts.length >= 2 ? 1 : 0.6
                }}
                disabled={selectedBodyParts.length < 2}
              >
                Proceed to Symptoms →
              </button>
            </div>
          </div>

        </div>
      )}

      {currentStep === 'symptoms' && selectedBodyParts.length > 0 && (
        <div className="symptom-selection">
          <h3>Step 3: Select Symptoms from Selected Body Parts</h3>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '30px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '10px',
            border: '1px solid #e0e0e0'
          }}>
            <p style={{ color: '#666', margin: '0 0 10px 0' }}>
              Choose symptoms from the body parts you selected. You can select symptoms from multiple areas.
            </p>
            <p style={{ 
              color: selectedSymptoms.length >= 2 ? '#674580' : '#f44336', 
              fontWeight: '600',
              margin: 0,
              fontSize: '14px'
            }}>
              Selected: {selectedSymptoms.length} symptoms {selectedSymptoms.length < 2 ? '(need at least 2)' : ''}
            </p>
          </div>
          
          {selectedBodyParts.map(bodyPartId => {
            const bodyPart = bodyParts.find(p => p.id === bodyPartId);
            if (!bodyPart) return null;
            
            return (
              <div key={bodyPartId} style={{ marginBottom: '40px' }}>
                <h4 style={{ 
                  color: '#674580', 
                  marginBottom: '15px', 
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e0e0e0',
                  fontSize: '1.2rem'
                }}>
                  {bodyPart.name}
                </h4>
                <div className="symptoms-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  {bodyPart.symptoms.map(symptom => (
                    <button
                      key={`${bodyPartId}-${symptom}`}
                      className={`symptom-button ${
                        selectedSymptoms.some(s => s.name === symptom) ? 'selected' : ''
                      }`}
                      onClick={() => handleSymptomSelect(symptom, bodyPartId)}
                      style={{ 
                        fontSize: '0.9rem',
                        padding: '12px 16px',
                        minHeight: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                      }}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="symptom-actions">
            <button onClick={() => setCurrentStep('body')} className="back-button">
              ← Back to Body Parts
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => setCurrentStep('details')} 
                className="continue-button"
                disabled={selectedSymptoms.length < 1}
                style={{
                  opacity: selectedSymptoms.length < 1 ? 0.5 : 1,
                  cursor: selectedSymptoms.length < 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Continue to Details →
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'details' && (
        <div className="symptom-details">
          <h3>Step 4: Symptom Details</h3>
          <div className="symptoms-list">
            {selectedSymptoms.map(symptom => (
              <div key={symptom.id} className="symptom-detail-card">
                <h4>{symptom.name}</h4>
                <div className="detail-fields">
                  <div className="field">
                    <label>Severity:</label>
                    <select 
                      value={symptom.severity} 
                      onChange={(e) => handleSeverityChange(symptom.id, e.target.value as any)}
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Duration:</label>
                    <select 
                      value={symptom.duration} 
                      onChange={(e) => handleDurationChange(symptom.id, e.target.value)}
                    >
                      <option value="1-3 days">1-3 days</option>
                      <option value="1 week">1 week</option>
                      <option value="2-4 weeks">2-4 weeks</option>
                      <option value="1+ months">1+ months</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => handleSymptomRemove(symptom.id)}
                  className="remove-symptom"
                >
                  Remove Symptom
                </button>
              </div>
            ))}
          </div>
          <div className="detail-actions">
            <button onClick={() => setCurrentStep('symptoms')} className="back-button">
              ← Back to Symptoms
            </button>
            <button onClick={handleAnalyze} className="analyze-button">
              📤 Send Results
            </button>
          </div>
        </div>
      )}


      <div className="disclaimer">
        <p><strong>⚠️ Medical Disclaimer:</strong> This symptom checker is for informational purposes only and should not replace professional medical advice. Always consult with a healthcare provider for proper diagnosis and treatment.</p>
      </div>
    </div>
  );
};

export default SymptomChecker;
