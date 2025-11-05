import React from 'react';
import { useNavigate } from 'react-router-dom';
import SymptomChecker from '../components/SymptomChecker';
import './SymptomCheckerPage.css';

const SymptomCheckerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="symptom-checker-page">
      <SymptomChecker />
    </div>
  );
};

export default SymptomCheckerPage;
