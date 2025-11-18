import React, { useState } from 'react';
import './FatigueFactoryProgram.css';

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
  // New post-meal questions
  postPrandialBloating: string;
  postPrandialLooseStools: string;
  postPrandialFatigue: string;
  // New caffeine questions
  caffeineEffect: string;
  lateCaffeineEffect: string;
}

interface PSQIQuestionnaireProps {
  onComplete: (data: PSQIData) => void;
  onSkip?: () => void;
  isMandatory?: boolean;
}

const PSQIQuestionnaire: React.FC<PSQIQuestionnaireProps> = ({ 
  onComplete, 
  onSkip, 
  isMandatory = true 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PSQIData>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    bedtime: '22:00',
    fallAsleepMinutes: '15',
    wakeTime: '06:00',
    actualSleepHours: '7',
    sleepProblems: {},
    sleepMedication: 'not',
    troubleStayingAwake: 'not',
    enthusiasmProblem: 'none',
    overallSleepQuality: 'fairlyGood',
    otherReasons: '',
    // New post-meal questions (0-3 severity scale)
    postPrandialBloating: '0',
    postPrandialLooseStools: '0',
    postPrandialFatigue: '0',
    // New caffeine questions
    caffeineEffect: 'little',
    lateCaffeineEffect: 'no',
  });

  const sleepProblemOptions = [
    { key: 'cannotGetToSleep', label: 'Cannot get to sleep within 30 minutes' },
    { key: 'wakeUpMiddle', label: 'Wake up in the middle of the night or early morning' },
    { key: 'useBathroom', label: 'Have to get up to use the bathroom' },
    { key: 'cannotBreathe', label: 'Cannot breathe comfortably' },
    { key: 'coughSnore', label: 'Cough or snore loudly' },
    { key: 'feelCold', label: 'Feel too cold' },
    { key: 'feelHot', label: 'Feel too hot' },
    { key: 'badDreams', label: 'Have bad dreams' },
    { key: 'havePain', label: 'Have pain' }
  ];

  const frequencyOptions = [
    { value: 'not', label: 'Not during the past month' },
    { value: 'less', label: 'Less than once a week' },
    { value: 'once', label: 'Once or twice a week' },
    { value: 'three', label: 'Three or more times a week' }
  ];

  const problemOptions = [
    { value: 'none', label: 'No problem at all' },
    { value: 'slight', label: 'Only a very slight problem' },
    { value: 'somewhat', label: 'Somewhat of a problem' },
    { value: 'big', label: 'A very big problem' }
  ];

  const qualityOptions = [
    { value: 'veryGood', label: 'Very good' },
    { value: 'fairlyGood', label: 'Fairly good' },
    { value: 'fairlyBad', label: 'Fairly bad' },
    { value: 'veryBad', label: 'Very bad' }
  ];

  const severityOptions = [
    { value: '0', label: '0 - Not at all' },
    { value: '1', label: '1 - Mild' },
    { value: '2', label: '2 - Moderate' },
    { value: '3', label: '3 - Severe' }
  ];

  const caffeineEffectOptions = [
    { value: 'anxiety', label: 'Small amounts of caffeine trigger anxiety, palpitations, or insomnia' },
    { value: 'alert', label: 'Caffeine makes you alert without palpitations or anxiety' },
    { value: 'little', label: 'Caffeine has little/no effect on you' }
  ];

  const lateCaffeineOptions = [
    { value: 'yes', label: 'Late caffeine delays your sleep' },
    { value: 'no', label: 'Late caffeine does not delay your sleep' }
  ];

  const steps = [
    'Sleep Timing',
    'Sleep Problems',
    'Sleep Medication & Alertness',
    'Overall Assessment',
    'Post-Meal & Caffeine Effects'
  ];

  const handleInputChange = (field: keyof PSQIData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSleepProblemChange = (problemKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      sleepProblems: { ...prev.sleepProblems, [problemKey]: value }
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.bedtime !== '' && formData.fallAsleepMinutes !== '' && 
               formData.wakeTime !== '' && formData.actualSleepHours !== '';
      case 1:
        return true; // Sleep problems are optional
      case 2:
        return formData.sleepMedication !== '' && formData.troubleStayingAwake !== '';
      case 3:
        return formData.enthusiasmProblem !== '' && formData.overallSleepQuality !== '';
      case 4:
        return formData.postPrandialBloating !== '' && formData.postPrandialLooseStools !== '' && 
               formData.postPrandialFatigue !== '' && formData.caffeineEffect !== '' && 
               formData.lateCaffeineEffect !== '';
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="psqi-step">
            <h3>Sleep Timing (Past Month)</h3>
            <div className="form-group">
              <label htmlFor="bedtime">What time do you usually go to bed at night? *</label>
              <input
                type="time"
                id="bedtime"
                value={formData.bedtime}
                onChange={(e) => handleInputChange('bedtime', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="fallAsleepMinutes">How long does it take you to fall asleep? (minutes) *</label>
              <input
                type="number"
                id="fallAsleepMinutes"
                value={formData.fallAsleepMinutes}
                onChange={(e) => handleInputChange('fallAsleepMinutes', e.target.value)}
                placeholder="e.g., 15"
                min="0"
                max="300"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="wakeTime">What time do you usually get up in the morning? *</label>
              <input
                type="time"
                id="wakeTime"
                value={formData.wakeTime}
                onChange={(e) => handleInputChange('wakeTime', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="actualSleepHours">How many hours of actual sleep do you get at night? *</label>
              <input
                type="number"
                id="actualSleepHours"
                value={formData.actualSleepHours}
                onChange={(e) => handleInputChange('actualSleepHours', e.target.value)}
                placeholder="e.g., 7.5"
                min="0"
                max="24"
                step="0.5"
                required
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="psqi-step">
            <h3>Sleep Problems (Past Month)</h3>
            <p>How often have you had trouble sleeping because you...</p>
            <div className="sleep-problems">
              {sleepProblemOptions.map((problem) => (
                <div key={problem.key} className="problem-item">
                  <label>{problem.label}</label>
                  <div className="frequency-options">
                    {frequencyOptions.map((option) => (
                      <label key={option.value} className="radio-option">
                        <input
                          type="radio"
                          name={problem.key}
                          value={option.value}
                          checked={formData.sleepProblems[problem.key] === option.value}
                          onChange={(e) => handleSleepProblemChange(problem.key, e.target.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="problem-item">
                <label>Other reason(s), please describe:</label>
                <textarea
                  value={formData.otherReasons}
                  onChange={(e) => handleInputChange('otherReasons', e.target.value)}
                  placeholder="Describe any other sleep problems..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="psqi-step">
            <h3>Sleep Medication & Alertness (Past Month)</h3>
            <div className="form-group">
              <label>How often have you taken medicine to help you sleep? *</label>
              <div className="frequency-options">
                {frequencyOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="sleepMedication"
                      value={option.value}
                      checked={formData.sleepMedication === option.value}
                      onChange={(e) => handleInputChange('sleepMedication', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>How often have you had trouble staying awake while driving, eating meals, or engaging in social activity? *</label>
              <div className="frequency-options">
                {frequencyOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="troubleStayingAwake"
                      value={option.value}
                      checked={formData.troubleStayingAwake === option.value}
                      onChange={(e) => handleInputChange('troubleStayingAwake', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="psqi-step">
            <h3>Overall Assessment (Past Month)</h3>
            <div className="form-group">
              <label>How much of a problem has it been for you to keep up enough enthusiasm to get things done? *</label>
              <div className="frequency-options">
                {problemOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="enthusiasmProblem"
                      value={option.value}
                      checked={formData.enthusiasmProblem === option.value}
                      onChange={(e) => handleInputChange('enthusiasmProblem', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>How would you rate your sleep quality overall? *</label>
              <div className="frequency-options">
                {qualityOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="overallSleepQuality"
                      value={option.value}
                      checked={formData.overallSleepQuality === option.value}
                      onChange={(e) => handleInputChange('overallSleepQuality', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="psqi-step">
            <h3>Post-Meal & Caffeine Effects (Past Month)</h3>
            <p className="section-description">Please rate the severity of these symptoms after meals:</p>
            
            <div className="form-group">
              <label>Post-prandial bloating *</label>
              <div className="frequency-options">
                {severityOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="postPrandialBloating"
                      value={option.value}
                      checked={formData.postPrandialBloating === option.value}
                      onChange={(e) => handleInputChange('postPrandialBloating', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Post-prandial loose stools or urgency *</label>
              <div className="frequency-options">
                {severityOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="postPrandialLooseStools"
                      value={option.value}
                      checked={formData.postPrandialLooseStools === option.value}
                      onChange={(e) => handleInputChange('postPrandialLooseStools', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Post-prandial fatigue or sleepiness *</label>
              <div className="frequency-options">
                {severityOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="postPrandialFatigue"
                      value={option.value}
                      checked={formData.postPrandialFatigue === option.value}
                      onChange={(e) => handleInputChange('postPrandialFatigue', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>How does caffeine affect you? *</label>
              <div className="frequency-options">
                {caffeineEffectOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="caffeineEffect"
                      value={option.value}
                      checked={formData.caffeineEffect === option.value}
                      onChange={(e) => handleInputChange('caffeineEffect', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Does late caffeine affect your sleep? *</label>
              <div className="frequency-options">
                {lateCaffeineOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="lateCaffeineEffect"
                      value={option.value}
                      checked={formData.lateCaffeineEffect === option.value}
                      onChange={(e) => handleInputChange('lateCaffeineEffect', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="psqi-questionnaire">
      <div className="psqi-header">
        <h2>The Fatigue Factory program</h2>
        <p className="psqi-instructions">
          The following questions relate to your usual sleep habits during the <strong>past month only</strong>. 
          Your answers should indicate the most accurate reply for the <strong>majority</strong> of days and nights in the past month. 
          <strong> Please answer all questions.</strong>
        </p>
        {isMandatory && (
          <div className="mandatory-notice">
            <strong>⚠️ This questionnaire is mandatory before proceeding with symptom checking.</strong>
          </div>
        )}
      </div>

      <div className="psqi-progress">
        <div className="step-indicator">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`step ${index === currentStep ? 'active' : index < currentStep ? 'completed' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-label">{step}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="psqi-content">
        {renderStep()}
      </div>

      <div className="psqi-actions">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={handlePrevious}
            className="btn btn-secondary"
          >
            Previous
          </button>
        )}
        
        <div className="action-right">
          {!isMandatory && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="btn btn-outline"
            >
              Skip
            </button>
          )}
          
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="btn btn-primary"
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PSQIQuestionnaire;

