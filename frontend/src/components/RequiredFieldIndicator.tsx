import React from 'react';

interface RequiredFieldIndicatorProps {
  children: React.ReactNode;
}

const RequiredFieldIndicator: React.FC<RequiredFieldIndicatorProps> = ({ children }) => {
  return (
    <>
      {children}
      <span style={{ 
        color: '#ef4444', 
        marginLeft: '0.25rem', 
        fontSize: '1rem',
        fontWeight: '600'
      }}>
        *
      </span>
    </>
  );
};

export default RequiredFieldIndicator;