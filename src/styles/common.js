// 공통 스타일 시스템
export const colors = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  white: '#ffffff',
  black: '#000000',
  gray: {
    100: '#f8f9fa',
    200: '#e9ecef',
    300: '#dee2e6',
    400: '#ced4da',
    500: '#adb5bd',
    600: '#6c757d',
    700: '#495057',
    800: '#343a40',
    900: '#212529'
  }
};

export const spacing = {
  xs: '5px',
  sm: '10px',
  md: '15px',
  lg: '20px',
  xl: '30px',
  xxl: '40px'
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px'
};

export const shadows = {
  sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.1)'
};

export const typography = {
  h1: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.xl
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.lg
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: colors.gray[700],
    marginBottom: spacing.md
  },
  body: {
    fontSize: '1rem',
    color: colors.gray[600],
    lineHeight: '1.6'
  },
  small: {
    fontSize: '0.9rem',
    color: colors.gray[500]
  }
};

// 공통 컴포넌트 스타일
export const commonStyles = {
  container: {
    padding: spacing.xl,
    maxWidth: '1200px',
    margin: '0 auto'
  },
  card: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
    border: `1px solid ${colors.gray[200]}`
  },
  button: {
    primary: {
      padding: `${spacing.md} ${spacing.xl}`,
      backgroundColor: colors.primary,
      color: colors.white,
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '1rem',
      transition: 'background-color 0.2s, transform 0.1s',
      '&:hover': {
        backgroundColor: '#0056b3',
        transform: 'translateY(-1px)'
      },
      '&:active': {
        transform: 'translateY(0)'
      }
    },
    secondary: {
      padding: `${spacing.md} ${spacing.xl}`,
      backgroundColor: colors.gray[200],
      color: colors.gray[700],
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '1rem',
      transition: 'background-color 0.2s'
    },
    success: {
      padding: `${spacing.md} ${spacing.xl}`,
      backgroundColor: colors.success,
      color: colors.white,
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '1rem',
      transition: 'background-color 0.2s'
    },
    danger: {
      padding: `${spacing.md} ${spacing.xl}`,
      backgroundColor: colors.danger,
      color: colors.white,
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '1rem',
      transition: 'background-color 0.2s'
    }
  },
  input: {
    padding: spacing.md,
    border: `2px solid ${colors.gray[300]}`,
    borderRadius: borderRadius.md,
    fontSize: '1rem',
    transition: 'border-color 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: colors.primary
    }
  },
  message: {
    success: {
      padding: spacing.md,
      backgroundColor: '#d4edda',
      border: `1px solid #c3e6cb`,
      borderRadius: borderRadius.md,
      color: '#155724',
      marginTop: spacing.md
    },
    error: {
      padding: spacing.md,
      backgroundColor: '#f8d7da',
      border: `1px solid #f5c6cb`,
      borderRadius: borderRadius.md,
      color: '#721c24',
      marginTop: spacing.md
    },
    warning: {
      padding: spacing.md,
      backgroundColor: '#fff3cd',
      border: `1px solid #ffeaa7`,
      borderRadius: borderRadius.md,
      color: '#856404',
      marginTop: spacing.md
    },
    info: {
      padding: spacing.md,
      backgroundColor: '#d1ecf1',
      border: `1px solid #bee5eb`,
      borderRadius: borderRadius.md,
      color: '#0c5460',
      marginTop: spacing.md
    }
  },
  tabContainer: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  tabButton: (isActive, variant = 'primary') => ({
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: isActive ? colors[variant] : colors.gray[100],
    color: isActive ? colors.white : colors.gray[700],
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s'
  })
};

// 유틸리티 함수
export const applyStyles = (baseStyles, additionalStyles = {}) => ({
  ...baseStyles,
  ...additionalStyles
});

export const createResponsiveGrid = (columns = 1, gap = spacing.md) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${300 / columns}px, 1fr))`,
  gap: gap
}); 