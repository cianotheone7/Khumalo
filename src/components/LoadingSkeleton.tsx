import React from 'react';
import './LoadingSkeleton.css';

interface LoadingSkeletonProps {
  type?: 'list' | 'card' | 'table' | 'details';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'list', count = 3 }) => {
  if (type === 'list') {
    return (
      <div className="skeleton-list">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-item">
            <div className="skeleton-avatar" />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-line-title" />
              <div className="skeleton-line skeleton-line-text" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="skeleton-cards">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton-card-header" />
            <div className="skeleton-card-body">
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line-short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton-line" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-table-row">
            {Array.from({ length: 5 }).map((_, cellIndex) => (
              <div key={cellIndex} className="skeleton-line" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'details') {
    return (
      <div className="skeleton-details">
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-details-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-details-item">
              <div className="skeleton-line skeleton-line-label" />
              <div className="skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default LoadingSkeleton;


