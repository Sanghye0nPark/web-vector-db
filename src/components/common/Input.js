import React from 'react';
import { commonStyles, applyStyles } from '../../styles/common';

const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  required = false,
  min,
  max,
  step,
  style = {},
  className = '',
  ...props
}) => {
  const inputStyle = applyStyles(commonStyles.input, {
    width: '100%',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    ...style
  });

  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e);
    }
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontWeight: 'bold',
          color: '#495057'
        }}>
          {label}
          {required && <span style={{ color: '#dc3545' }}> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        style={inputStyle}
        className={className}
        {...props}
      />
      {error && (
        <div style={{ 
          color: '#dc3545', 
          fontSize: '0.875rem', 
          marginTop: '5px' 
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Input; 