import React from 'react';
import { commonStyles, applyStyles } from '../../styles/common';

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false, 
  type = 'button',
  style = {},
  className = '',
  ...props 
}) => {
  const baseStyle = commonStyles.button[variant] || commonStyles.button.primary;
  
  const buttonStyle = applyStyles(baseStyle, {
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...style
  });

  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      style={buttonStyle}
      onClick={handleClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 