export class BruteForceSearch {
    constructor() {
        // 외부에서 벡터 데이터를 받아서 검색
    }

    // 유클리드 거리 계산
    static euclideanDistance(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('벡터 차원이 일치하지 않습니다.');
        }
        return Math.sqrt(
            vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0)
        );
    }

    // 코사인 유사도 계산
    static cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('벡터 차원이 일치하지 않습니다.');
        }
        
        const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
        const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        return dotProduct / (magnitude1 * magnitude2);
    }

    // Brute Force 검색 (정확한 검색)
    search(vectors, queryVector, k = 5, distanceType = 'euclidean') {
        if (vectors.length === 0) {
            return [];
        }

        const results = [];

        // 각 벡터와의 거리 계산
        for (let i = 0; i < vectors.length; i++) {
            let distance;
            let similarity;

            switch (distanceType) {
                case 'euclidean':
                    distance = BruteForceSearch.euclideanDistance(queryVector, vectors[i]);
                    break;
                case 'cosine':
                    similarity = BruteForceSearch.cosineSimilarity(queryVector, vectors[i]);
                    distance = 1 - similarity; // 코사인 유사도를 거리로 변환
                    break;
                default:
                    throw new Error('지원하지 않는 거리 측정 방법입니다. (euclidean, cosine만 지원)');
            }

            results.push({
                index: i,
                vector: vectors[i],
                distance: distance,
                similarity: similarity || (distanceType === 'cosine' ? 1 - distance : null)
            });
        }

        // 거리 기준으로 정렬
        results.sort((a, b) => a.distance - b.distance);

        // 상위 k개 반환
        return results.slice(0, k);
    }

    // 검색 통계 정보
    getSearchStats(vectors, dimensions) {
        return {
            totalVectors: vectors.length,
            dimensions: dimensions,
            supportedDistanceTypes: ['euclidean', 'cosine'],
            searchType: 'brute_force'
        };
    }
} 