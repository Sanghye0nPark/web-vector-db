import React from 'react';
import { commonStyles } from '../../styles/common';

const Message = ({ 
  type = 'info', 
  children, 
  style = {}, 
  className = '',
  onClose,
  ...props 
}) => {
  const messageStyle = {
    ...commonStyles.message[type],
    ...style
  };

  return (
    <div style={messageStyle} className={className} {...props}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              marginLeft: '10px',
              color: 'inherit',
              opacity: 0.7
            }}
            aria-label="메시지 닫기"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Message; 