import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'var(--primary-color)',
  text,
  overlay = false
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div 
        className={`loading-spinner ${sizeClasses[size]}`}
        style={{ borderTopColor: color }}
      />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;