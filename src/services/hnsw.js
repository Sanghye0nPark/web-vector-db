export class HNSW {
    constructor(vectorsRef) {
        this.vectorsRef = vectorsRef; // 외부 벡터 배열 참조
        this.neighbors = []; // 각 벡터의 이웃 정보 (레벨별로 구분되지 않음)
        this.levelNeighbors = []; // 각 벡터의 레벨별 이웃 정보
        this.efSearch = 10; // 검색 시 고려할 후보 수
        this.efConstruction = 100; // 구축 시 고려할 후보 수
        this.m = 4; // 각 레벨에서의 최대 이웃 수
        this.maxLevel = 0; // 최대 레벨
        this.levels = []; // 각 벡터의 레벨 정보
        this.entryPoint = null; // 진입점
        this.searchHistory = []; // 검색 과정 기록
    }

    // 유클리드 거리 계산
    calculateDistance(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('벡터 차원이 일치하지 않습니다');
        }
        let sum = 0;
        for (let i = 0; i < vec1.length; i++) {
            sum += Math.pow(vec1[i] - vec2[i], 2);
        }
        return Math.sqrt(sum);
    }

    // 코사인 유사도 계산
    calculateCosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('벡터 차원이 일치하지 않습니다');
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        
        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);
        
        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (norm1 * norm2);
    }

    // 랜덤 레벨 생성 (기하분포)
    getRandomLevel() {
        let level = 0;
        while (Math.random() < 0.5 && level < 10) {
            level++;
        }
        return level;
    }

    // 벡터 추가 (그래프 정보만 관리)
    addVector(vector, id = null) {
        if (!Array.isArray(vector) || vector.length === 0) {
            throw new Error('유효한 벡터를 입력해주세요');
        }

        const vectors = this.vectorsRef;
        const vectorId = id !== null ? id : vectors.length - 1;
        const level = this.getRandomLevel();
        
        // 레벨 정보 업데이트
        this.levels[vectorId] = level;
        this.maxLevel = Math.max(this.maxLevel, level);
        
        // entryPoint 갱신: 새로 추가된 벡터의 레벨이 더 높으면 entryPoint를 갱신
        if (this.entryPoint === null || level > this.levels[this.entryPoint]) {
            this.entryPoint = vectorId;
        }
        
        // 이웃 배열 초기화
        if (!this.neighbors[vectorId]) {
            this.neighbors[vectorId] = [];
        }
        
        // 첫 번째 벡터인 경우 진입점으로 설정 (위에서 이미 처리됨)
        if (this.entryPoint === vectorId && vectors.length === 1) {
            // 아무것도 하지 않음
        } else {
            // 기존 벡터들과 연결
            this.connectVector(vectorId, vector);
        }
        
        return vectorId;
    }

    // 벡터 연결 (이웃 찾기 및 연결)
    connectVector(vectorId, vector) {
        const level = this.levels[vectorId];
        
        // 각 레벨에서 이웃 찾기
        for (let currentLevel = Math.min(level, this.maxLevel); currentLevel >= 0; currentLevel--) {
            const candidates = this.searchLevel(vector, this.entryPoint, currentLevel, this.efConstruction);
            const neighbors = this.selectNeighbors(candidates, this.m);
            
            // 양방향 연결 (레벨 정보 포함)
            for (const neighbor of neighbors) {
                this.addNeighbor(vectorId, neighbor.id, currentLevel);
                this.addNeighbor(neighbor.id, vectorId, currentLevel);
            }
        }
    }

    // 레벨별 검색 (검색 과정 기록 추가)
    searchLevel(queryVector, entryPoint, level, ef) {
        const candidates = new Set();
        const visited = new Set();
        const vectors = this.vectorsRef;
        const stepHistory = []; // 현재 레벨의 단계별 기록
        
        // 초기 후보들
        candidates.add(entryPoint);
        visited.add(entryPoint);
        
        let step = 0;
        while (candidates.size > 0) {
            step++;
            const current = this.getClosestCandidate(candidates, queryVector);
            candidates.delete(current);
            
            // 현재 단계 정보 기록
            const stepInfo = {
                step: step,
                currentNode: current,
                currentDistance: this.calculateDistance(queryVector, vectors[current]),
                candidates: Array.from(candidates),
                visited: Array.from(visited)
            };
            
            // 현재 벡터의 이웃들 확인 및 처리
            const neighbors = this.getNeighbors(current, level);
            const checkedNeighbors = [];
            
            for (const neighborId of neighbors) {
                if (visited.has(neighborId)) continue;
                
                const distance = this.calculateDistance(queryVector, vectors[neighborId]);
                checkedNeighbors.push({
                    id: neighborId,
                    distance: distance
                });
                
                visited.add(neighborId);
                candidates.add(neighborId);
                
                // ef 개수 제한
                if (candidates.size > ef) {
                    const removed = this.removeFarthestCandidate(candidates, queryVector);
                }
            }
            
            // 이웃 확인 정보를 현재 단계에 포함
            stepInfo.checkedNeighbors = checkedNeighbors;
            
            stepHistory.push(stepInfo);
        }
        
        // 레벨별 검색 기록 저장
        this.searchHistory.push({
            level: level,
            entryPoint: entryPoint,
            ef: ef,
            steps: stepHistory,
            finalResults: Array.from(visited).map(id => ({
                id: id,
                distance: this.calculateDistance(queryVector, vectors[id])
            })).sort((a, b) => a.distance - b.distance)
        });
        
        return Array.from(visited).map(id => ({
            id: id,
            distance: this.calculateDistance(queryVector, vectors[id])
        })).sort((a, b) => a.distance - b.distance);
    }

    // 가장 가까운 후보 찾기
    getClosestCandidate(candidates, queryVector) {
        let closest = null;
        let minDistance = Infinity;
        const vectors = this.vectorsRef;
        
        for (const candidateId of candidates) {
            const distance = this.calculateDistance(queryVector, vectors[candidateId]);
            if (distance < minDistance) {
                minDistance = distance;
                closest = candidateId;
            }
        }
        
        return closest;
    }

    // 가장 먼 후보 제거 (제거된 후보 반환)
    removeFarthestCandidate(candidates, queryVector) {
        let farthest = null;
        let maxDistance = -Infinity;
        const vectors = this.vectorsRef;
        
        for (const candidateId of candidates) {
            const distance = this.calculateDistance(queryVector, vectors[candidateId]);
            if (distance > maxDistance) {
                maxDistance = distance;
                farthest = candidateId;
            }
        }
        
        if (farthest !== null) {
            candidates.delete(farthest);
            return farthest;
        }
        return null;
    }

    // 이웃 선택 (M개)
    selectNeighbors(candidates, m) {
        return candidates.slice(0, m);
    }

    // 이웃 추가
    addNeighbor(vectorId, neighborId, level = null) {
        if (!this.neighbors[vectorId]) {
            this.neighbors[vectorId] = [];
        }
        
        // 레벨별 이웃 정보 초기화
        if (!this.levelNeighbors[vectorId]) {
            this.levelNeighbors[vectorId] = {};
        }
        
        // 중복 방지
        if (!this.neighbors[vectorId].includes(neighborId)) {
            this.neighbors[vectorId].push(neighborId);
        }
        
        // 레벨별 이웃 정보 저장
        if (level !== null) {
            if (!this.levelNeighbors[vectorId][level]) {
                this.levelNeighbors[vectorId][level] = [];
            }
            if (!this.levelNeighbors[vectorId][level].includes(neighborId)) {
                this.levelNeighbors[vectorId][level].push(neighborId);
            }
        }
    }

    // 특정 레벨의 이웃 가져오기
    getNeighbors(vectorId, level) {
        if (!this.neighbors[vectorId]) return [];
        
        console.log('🔍 getNeighbors 호출:', {
            vectorId,
            requestedLevel: level,
            nodeLevel: this.levels[vectorId],
            totalNeighbors: this.neighbors[vectorId].length,
            hasLevelNeighbors: this.levelNeighbors[vectorId] ? true : false
        });
        
        // 현재 노드의 레벨이 검색 레벨 이상일 때만 이웃 반환
        if (this.levels[vectorId] < level) {
            console.log('🔍 노드 레벨이 검색 레벨보다 낮음:', {
                vectorId,
                nodeLevel: this.levels[vectorId],
                requestedLevel: level
            });
            return [];
        }
        
        // 레벨별 이웃 정보가 있으면 우선 사용
        if (this.levelNeighbors[vectorId] && this.levelNeighbors[vectorId][level]) {
            const levelNeighbors = this.levelNeighbors[vectorId][level];
            console.log('🔍 레벨별 이웃 정보 사용:', {
                vectorId,
                level,
                neighborCount: levelNeighbors.length,
                neighbors: levelNeighbors
            });
            return levelNeighbors;
        }
        
        // 레벨별 이웃 정보가 없으면 기존 방식으로 필터링
        const filteredNeighbors = this.neighbors[vectorId].filter(neighborId => 
            this.levels[neighborId] >= level
        );
        
        console.log('🔍 필터링된 이웃 정보:', {
            vectorId,
            level,
            originalCount: this.neighbors[vectorId].length,
            filteredCount: filteredNeighbors.length,
            neighbors: filteredNeighbors
        });
        
        return filteredNeighbors;
    }
    
    // 시각화를 위한 레벨별 이웃 정보 가져오기 (현재 레벨에서만)
    getLevelNeighborsForVisualization(vectorId, level) {
        if (!this.neighbors[vectorId]) return [];
        
        // 현재 노드의 레벨이 검색 레벨 이상일 때만 이웃 반환
        if (this.levels[vectorId] < level) {
            return [];
        }
        
        // 레벨별 이웃 정보가 있으면 사용
        if (this.levelNeighbors[vectorId] && this.levelNeighbors[vectorId][level]) {
            return this.levelNeighbors[vectorId][level];
        }
        
        // 레벨별 이웃 정보가 없으면 기존 방식으로 필터링
        return this.neighbors[vectorId].filter(neighborId => 
            this.levels[neighborId] >= level
        );
    }

    // 벡터 검색 (검색 과정 기록 포함)
    search(queryVector, k = 1) {
        if (this.entryPoint === null) {
            return [];
        }
        
        // 검색 기록 초기화
        this.searchHistory = [];
        
        const vectors = this.vectorsRef;
        const queryLevel = this.maxLevel;
        let currentEntry = this.entryPoint;
        
        // 최상위 레벨부터 검색
        for (let level = queryLevel; level > 0; level--) {
            const candidates = this.searchLevel(queryVector, currentEntry, level, this.efSearch);
            if (candidates.length > 0) {
                currentEntry = candidates[0].id;
            }
        }
        
        // 최하위 레벨에서 최종 검색
        const results = this.searchLevel(queryVector, currentEntry, 0, this.efSearch);
        
        return results.slice(0, k).map(result => ({
            id: result.id,
            vector: vectors[result.id],
            distance: result.distance
        }));
    }

    // 벡터 삭제
    removeVector(vectorId) {
        // 그래프 정보만 관리 (실제 벡터 삭제는 VectorDB에서)
        this.neighbors[vectorId] = null;
        this.levels[vectorId] = null;
        this.levelNeighbors[vectorId] = null; // 레벨별 이웃 정보도 정리
        if (this.entryPoint === vectorId) {
            this.entryPoint = this.findNewEntryPoint();
        }
    }

    // 새로운 진입점 찾기
    findNewEntryPoint() {
        for (let i = 0; i < this.levels.length; i++) {
            if (this.levels[i] === this.maxLevel) {
                return i;
            }
        }
        return null;
    }

    // 통계 정보
    getStats() {
        const activeLevels = this.levels.filter(l => l !== null).length;
        const totalNeighbors = this.neighbors.reduce((sum, neighbors) => 
            sum + (neighbors ? neighbors.length : 0), 0
        );
        
        return {
            totalVectors: activeLevels,
            maxLevel: this.maxLevel,
            averageNeighbors: activeLevels > 0 ? totalNeighbors / activeLevels : 0,
            entryPoint: this.entryPoint
        };
    }

    // 벡터 업데이트
    updateVector(vectorId, newVector) {
        // 실제 벡터 업데이트는 VectorDB에서
        this.removeVector(vectorId);
        return this.addVector(newVector, vectorId);
    }

    // 검색 과정 기록 가져오기
    getSearchHistory() {
        return this.searchHistory;
    }

    // 마지막 검색의 최종 레벨(0레벨) 과정만 가져오기
    getLastSearchLevelHistory() {
        if (this.searchHistory.length === 0) {
            return null;
        }
        return this.searchHistory[this.searchHistory.length - 1];
    }

    // 검색 과정 통계
    getSearchStats() {
        if (this.searchHistory.length === 0) {
            return null;
        }
        
        const lastSearch = this.searchHistory[this.searchHistory.length - 1];
        const totalSteps = lastSearch.steps.length;
        const totalVisited = lastSearch.finalResults.length;
        
        return {
            totalLevels: this.searchHistory.length,
            finalLevelSteps: totalSteps,
            totalVisitedNodes: totalVisited
        };
    }

    // 현재 노드의 이웃 정보를 가져오는 메서드
    getCurrentNodeNeighbors(nodeId, level = 0) {
        if (nodeId === null || nodeId === undefined) return [];
        
        console.log('🔍 getCurrentNodeNeighbors 호출:', {
            nodeId,
            requestedLevel: level,
            nodeLevel: this.levels[nodeId],
            hasLevelNeighbors: this.levelNeighbors[nodeId] ? true : false
        });
        
        const neighbors = this.getNeighbors(nodeId, level);
        const vectors = this.vectorsRef;
        
        const result = neighbors.map(neighborId => ({
            id: neighborId,
            distance: this.calculateDistance(vectors[nodeId], vectors[neighborId])
        }));
        
        console.log('🔍 getCurrentNodeNeighbors 결과:', {
            nodeId,
            level,
            neighborCount: result.length,
            neighbors: result.map(n => ({ id: n.id, distance: n.distance }))
        });
        
        return result;
    }

    // 레벨별 이웃 정보 디버깅 메서드
    getLevelNeighborsDebug(vectorId) {
        if (!this.levelNeighbors[vectorId]) {
            return {
                vectorId,
                hasLevelNeighbors: false,
                totalNeighbors: this.neighbors[vectorId]?.length || 0,
                level: this.levels[vectorId]
            };
        }
        
        const levelInfo = {};
        for (const level in this.levelNeighbors[vectorId]) {
            levelInfo[level] = this.levelNeighbors[vectorId][level];
        }
        
        return {
            vectorId,
            hasLevelNeighbors: true,
            levelNeighbors: levelInfo,
            totalNeighbors: this.neighbors[vectorId]?.length || 0,
            level: this.levels[vectorId]
        };
    }
    
    // 전체 레벨별 이웃 정보 통계
    getLevelNeighborsStats() {
        const stats = {
            totalVectors: 0,
            vectorsWithLevelNeighbors: 0,
            levelDistribution: {},
            sampleVectors: []
        };
        
        for (let i = 0; i < this.levels.length; i++) {
            if (this.levels[i] !== null) {
                stats.totalVectors++;
                
                if (this.levelNeighbors[i]) {
                    stats.vectorsWithLevelNeighbors++;
                    
                    // 레벨별 분포 계산
                    for (const level in this.levelNeighbors[i]) {
                        if (!stats.levelDistribution[level]) {
                            stats.levelDistribution[level] = 0;
                        }
                        stats.levelDistribution[level]++;
                    }
                    
                    // 처음 5개 벡터의 샘플 정보
                    if (stats.sampleVectors.length < 5) {
                        stats.sampleVectors.push(this.getLevelNeighborsDebug(i));
                    }
                }
            }
        }
        
        return stats;
    }
    
    // 레벨별 이웃 정보 재구성 (전체 이웃 정보에서 추출)
    reconstructLevelNeighbors() {
        console.log('🔧 레벨별 이웃 정보 재구성 시작');
        
        // 기존 levelNeighbors 초기화
        this.levelNeighbors = [];
        
        for (let i = 0; i < this.levels.length; i++) {
            if (this.levels[i] === null || !this.neighbors[i]) continue;
            
            // 각 벡터의 레벨별 이웃 정보 초기화
            this.levelNeighbors[i] = {};
            
            // 각 레벨에서의 이웃 정보 추출
            for (let level = 0; level <= this.maxLevel; level++) {
                // 현재 노드의 레벨이 검색 레벨 이상일 때만 이웃 정보 생성
                if (this.levels[i] >= level) {
                    this.levelNeighbors[i][level] = [];
                    
                    // 전체 이웃에서 현재 레벨에 해당하는 이웃만 필터링
                    for (const neighborId of this.neighbors[i]) {
                        if (this.levels[neighborId] >= level) {
                            this.levelNeighbors[i][level].push(neighborId);
                        }
                    }
                }
            }
        }
        
        console.log('🔧 레벨별 이웃 정보 재구성 완료:', {
            totalVectors: this.levels.filter(l => l !== null).length,
            maxLevel: this.maxLevel,
            sampleLevelNeighbors: this.levelNeighbors.slice(0, 3).map((nodeNeighbors, idx) => ({
                nodeId: idx,
                levelNeighbors: nodeNeighbors
            }))
        });
    }
    
    // 특정 레벨의 모든 노드 가져오기
    getLevelNodes(level) {
        const levelNodes = [];
        for (let i = 0; i < this.levels.length; i++) {
            if (this.levels[i] !== null && this.levels[i] >= level) {
                levelNodes.push(i);
            }
        }
        return levelNodes;
    }
    
    // 특정 레벨의 모든 이웃 연결 가져오기
    getLevelConnections(level) {
        const connections = [];
        const levelNodes = this.getLevelNodes(level);
        
        console.log('🔍 getLevelConnections 호출:', {
            level,
            levelNodesCount: levelNodes.length,
            levelNodes: levelNodes.slice(0, 10) // 처음 10개만
        });
        
        for (const nodeId of levelNodes) {
            const neighbors = this.getLevelNeighborsForVisualization(nodeId, level);
            console.log(`🔍 노드 ${nodeId}의 레벨 ${level} 이웃:`, neighbors);
            
            for (const neighborId of neighbors) {
                // 중복 방지를 위해 nodeId < neighborId 조건 사용
                if (nodeId < neighborId) {
                    connections.push([nodeId, neighborId]);
                }
            }
        }
        
        console.log('🔍 최종 연결선:', {
            totalConnections: connections.length,
            connections: connections.slice(0, 10) // 처음 10개만
        });
        
        return connections;
    }

    // HNSW 파라미터 설정 메서드들
    setEfSearch(value) {
        if (value >= 1 && value <= 1000) {
            this.efSearch = value;
            return true;
        }
        return false;
    }

    setEfConstruction(value) {
        if (value >= 1 && value <= 1000) {
            this.efConstruction = value;
            return true;
        }
        return false;
    }

    setM(value) {
        if (value >= 1 && value <= 100) {
            this.m = value;
            return true;
        }
        return false;
    }
}