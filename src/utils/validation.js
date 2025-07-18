// 벡터 검증 유틸리티 함수들

export const validateVector = (vector, expectedDimensions) => {
  if (!Array.isArray(vector)) {
    throw new Error('벡터는 배열이어야 합니다.');
  }

  if (vector.length !== expectedDimensions) {
    throw new Error(`벡터는 ${expectedDimensions}차원이어야 합니다. 현재: ${vector.length}차원`);
  }

  if (vector.some(val => typeof val !== 'number' || isNaN(val))) {
    throw new Error('벡터의 모든 요소는 유효한 숫자여야 합니다.');
  }

  return true;
};

export const validateVectorInput = (input, dimensions) => {
  try {
    const vector = input.split(',').map(v => parseFloat(v.trim()));
    
    if (vector.length !== dimensions) {
      return {
        isValid: false,
        error: `벡터는 ${dimensions}차원이어야 합니다. (입력: ${vector.length}차원)`
      };
    }
    
    if (vector.some(isNaN)) {
      return {
        isValid: false,
        error: '올바른 숫자를 입력해주세요. (예: 1, 2, 3)'
      };
    }
    
    return {
      isValid: true,
      vector: vector
    };
  } catch (error) {
    return {
      isValid: false,
      error: '벡터 입력 형식이 올바르지 않습니다. (예: 1, 2, 3)'
    };
  }
};

export const validateDimensions = (dimensions) => {
  const dim = parseInt(dimensions);
  
  if (isNaN(dim)) {
    return {
      isValid: false,
      error: '차원은 숫자여야 합니다.'
    };
  }
  
  if (dim < 1 || dim > 2048) {
    return {
      isValid: false,
      error: '차원은 1에서 2048 사이의 값이어야 합니다.'
    };
  }
  
  return {
    isValid: true,
    dimensions: dim
  };
};

export const validateSearchParams = (k, distanceType) => {
  const errors = [];
  
  if (k < 1 || k > 100) {
    errors.push('검색 결과 수(k)는 1에서 100 사이의 값이어야 합니다.');
  }
  
  const validDistanceTypes = ['euclidean', 'cosine'];
  if (!validDistanceTypes.includes(distanceType)) {
    errors.push('지원하지 않는 거리 측정 방법입니다. (euclidean, cosine만 지원)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

export const validateHNSWParams = (efSearch, efConstruction, m) => {
  const errors = [];
  
  if (efSearch < 1 || efSearch > 1000) {
    errors.push('efSearch는 1에서 1000 사이의 값이어야 합니다.');
  }
  
  if (efConstruction < 1 || efConstruction > 1000) {
    errors.push('efConstruction은 1에서 1000 사이의 값이어야 합니다.');
  }
  
  if (m < 1 || m > 100) {
    errors.push('M은 1에서 100 사이의 값이어야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// 에러 메시지 포맷팅
export const formatError = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return '알 수 없는 오류가 발생했습니다.';
};

// 성공 메시지 포맷팅
export const formatSuccess = (message, data = null) => {
  if (data) {
    return `${message} (${JSON.stringify(data)})`;
  }
  return message;
}; 