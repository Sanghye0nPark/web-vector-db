import React from 'react';
import { commonStyles, applyStyles } from '../../styles/common';

const Card = ({ 
  children, 
  title,
  subtitle,
  style = {}, 
  className = '',
  padding = 'xl',
  ...props 
}) => {
  const cardStyle = applyStyles(commonStyles.card, {
    padding: padding === 'xl' ? '30px' : padding === 'lg' ? '20px' : '15px',
    ...style
  });

  return (
    <div style={cardStyle} className={className} {...props}>
      {title && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#2c3e50',
            margin: 0,
            marginBottom: subtitle ? '5px' : 0
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ 
              fontSize: '1rem',
              color: '#6c757d',
              margin: 0
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card; 