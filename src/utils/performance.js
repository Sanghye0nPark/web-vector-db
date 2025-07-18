// 성능 최적화 유틸리티 함수들

// 디바운스 함수
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 쓰로틀 함수
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 메모이제이션 함수
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
};

// 벡터 거리 계산 최적화 (메모이제이션 적용)
export const memoizedEuclideanDistance = memoize((vec1, vec2) => {
  if (vec1.length !== vec2.length) {
    throw new Error('벡터 차원이 일치하지 않습니다.');
  }
  return Math.sqrt(
    vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0)
  );
});

// 벡터 정규화 (메모이제이션 적용)
export const memoizedNormalize = memoize((vector) => {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
});

// 벡터 배열 배치 처리
export const processBatch = (items, batchSize, processor) => {
  return new Promise((resolve) => {
    const results = [];
    let index = 0;

    const processNextBatch = () => {
      const batch = items.slice(index, index + batchSize);
      if (batch.length === 0) {
        resolve(results);
        return;
      }

      // 비동기 처리
      setTimeout(() => {
        batch.forEach(item => {
          results.push(processor(item));
        });
        index += batchSize;
        processNextBatch();
      }, 0);
    };

    processNextBatch();
  });
};

// 벡터 검색 성능 측정
export const measureSearchPerformance = (searchFunction, vectors, queryVector, k) => {
  const startTime = performance.now();
  const results = searchFunction(vectors, queryVector, k);
  const endTime = performance.now();
  
  return {
    results,
    executionTime: endTime - startTime,
    vectorsProcessed: vectors.length
  };
};

// 벡터 데이터 압축 (간단한 형태)
export const compressVectorData = (vectors) => {
  return vectors.map(vector => 
    vector.map(val => Math.round(val * 1000) / 1000) // 소수점 3자리로 반올림
  );
};

// 벡터 데이터 복원
export const decompressVectorData = (compressedVectors) => {
  return compressedVectors; // 현재는 단순 반올림이므로 그대로 반환
};

// 메모리 사용량 추정
export const estimateMemoryUsage = (vectors, dimensions) => {
  const vectorCount = vectors.length;
  const bytesPerNumber = 8; // 64비트 부동소수점
  const totalBytes = vectorCount * dimensions * bytesPerNumber;
  
  return {
    bytes: totalBytes,
    kilobytes: Math.round(totalBytes / 1024 * 100) / 100,
    megabytes: Math.round(totalBytes / (1024 * 1024) * 100) / 100
  };
};

// 벡터 품질 검사
export const validateVectorQuality = (vectors) => {
  const issues = [];
  
  vectors.forEach((vector, index) => {
    // NaN 체크
    if (vector.some(val => isNaN(val))) {
      issues.push(`벡터 ${index}: NaN 값 포함`);
    }
    
    // 무한대 값 체크
    if (vector.some(val => !isFinite(val))) {
      issues.push(`벡터 ${index}: 무한대 값 포함`);
    }
    
    // 모든 값이 0인 벡터 체크
    if (vector.every(val => val === 0)) {
      issues.push(`벡터 ${index}: 모든 값이 0`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}; 