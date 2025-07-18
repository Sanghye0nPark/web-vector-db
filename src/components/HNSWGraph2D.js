import React, { useState, useEffect, useMemo } from 'react';

function HNSWGraph2D({ vectors, neighbors, highlightedNodes = [], currentNode = null, candidateNodes = [], visitedNodes = [], neighborCheckNode = null, currentNodeNeighbors = [], currentLevel = null, queryVector = null, topResult = null, isAnimationComplete = false, hnswEngine = null, levelNodes = [], levelConnections = [], isLevelStart = false }) {
    // React Hooks는 컴포넌트 최상위 레벨에서 호출되어야 함
    const [cachedPoints, setCachedPoints] = useState(null);
    const [vectorsHash, setVectorsHash] = useState(null);
    
    // 모든 노드를 포함하되, 현재 레벨 노드들을 식별
    const getAllNodes = useMemo(() => {
        return vectors ? Array.from({ length: vectors.length }, (_, i) => i) : [];
    }, [vectors]);
    
    // 현재 레벨에 포함되는 노드들 식별
    const getCurrentLevelNodes = useMemo(() => {
        if (!hnswEngine || currentLevel === null) {
            // 레벨 정보가 없으면 모든 노드가 현재 레벨에 포함된 것으로 간주
            return getAllNodes;
        }
        
        // HNSW 엔진에서 레벨 정보를 가져와서 현재 레벨 이상의 노드들만 필터링
        const levels = hnswEngine.levels || [];
        const currentLevelNodes = [];
        
        for (let i = 0; i < levels.length; i++) {
            if (levels[i] !== null && levels[i] >= currentLevel) {
                currentLevelNodes.push(i);
            }
        }
        
        // 현재 방문 노드, 이웃 확인 노드, 방문한 노드들은 항상 포함
        const nodesToAlwaysInclude = new Set();
        if (currentNode !== null) nodesToAlwaysInclude.add(currentNode);
        if (neighborCheckNode !== null) nodesToAlwaysInclude.add(neighborCheckNode);
        visitedNodes.forEach(node => nodesToAlwaysInclude.add(node));
        
        // 항상 포함해야 할 노드들을 추가
        nodesToAlwaysInclude.forEach(node => {
            if (!currentLevelNodes.includes(node)) {
                currentLevelNodes.push(node);
            }
        });
        
        console.log('🎨 현재 레벨 노드 필터링:', {
            currentLevel,
            totalNodes: vectors?.length || 0,
            currentLevelNodesCount: currentLevelNodes.length,
            currentLevelNodes: currentLevelNodes.slice(0, 10), // 처음 10개만 로그
            alwaysIncludedNodes: Array.from(nodesToAlwaysInclude),
            currentNode,
            neighborCheckNode,
            visitedNodesCount: visitedNodes.length,
            hnswLevels: hnswEngine?.levels?.slice(0, 10), // 처음 10개 레벨 정보
            levelDistribution: hnswEngine?.levels?.reduce((acc, level, idx) => {
                if (level !== null) {
                    acc[level] = (acc[level] || 0) + 1;
                }
                return acc;
            }, {})
        });
        
        return currentLevelNodes;
    }, [hnswEngine, currentLevel, vectors, currentNode, neighborCheckNode, visitedNodes, getAllNodes]);
    
    // 모든 벡터를 포함하되, 현재 레벨 벡터들을 식별
    const allVectors = useMemo(() => {
        return vectors || [];
    }, [vectors]);
    
    const currentLevelVectors = useMemo(() => {
        if (!vectors || getCurrentLevelNodes.length === 0) {
            return [];
        }
        
        return getCurrentLevelNodes.map(nodeIndex => vectors[nodeIndex]);
    }, [vectors, getCurrentLevelNodes]);
    
    // 노드 인덱스 매핑 (전체 인덱스 -> 전체 노드 인덱스)
    const nodeIndexMapping = useMemo(() => {
        const mapping = {};
        getAllNodes.forEach((originalIndex, newIndex) => {
            mapping[originalIndex] = newIndex;
        });
        return mapping;
    }, [getAllNodes]);
    
    // t-SNE 투영 계산
    useEffect(() => {
        // 모든 벡터가 없으면 실행하지 않음
        if (!allVectors || allVectors.length === 0) {
            return;
        }
        
        // 벡터 데이터의 해시 생성 (간단한 체크섬) - 레벨은 제외
        const currentHash = allVectors.length + '_' + allVectors[0]?.length + '_' + 
            allVectors.slice(0, 3).flat().join('_').substring(0, 50);
        
        // 벡터 데이터가 변경되었을 때만 재계산 (레벨 변경은 제외)
        if (vectorsHash !== currentHash) {
            console.log('🎨 MDS 레이아웃 계산 시작 (벡터 데이터 변경)', {
                currentLevel,
                vectorsCount: allVectors.length,
                level: currentLevel
            });
            
            // MDS 레이아웃 계산 (모든 벡터들) - 실제 거리 관계를 더 정확하게 보존
            const points = MDSLayout(allVectors);
            
            console.log('🎨 MDS 레이아웃 완료:', {
                pointsCount: points.length,
                samplePoints: points.slice(0, 3),
                xRange: [Math.min(...points.map(p => p.x)), Math.max(...points.map(p => p.x))],
                yRange: [Math.min(...points.map(p => p.y)), Math.max(...points.map(p => p.y))],
                allPoints: points.map((p, i) => ({ index: i, x: p.x, y: p.y }))
            });
            
            // 캐시 업데이트
            setCachedPoints(points);
            setVectorsHash(currentHash);
        } else {
            console.log('🎨 캐시된 MDS 레이아웃 사용 (벡터 데이터 동일, 레벨 변경만)');
        }
    }, [allVectors]); // currentLevel을 의존성에서 제거
    
    // 디버깅을 위한 콘솔 로그
    console.log('🎨 HNSWGraph2D render:', {
        vectorsLength: vectors?.length,
        allVectorsLength: allVectors.length,
        currentLevelVectorsLength: currentLevelVectors.length,
        getAllNodesLength: getAllNodes.length,
        getCurrentLevelNodesLength: getCurrentLevelNodes.length,
        currentLevel,
        neighborsKeys: neighbors ? Object.keys(neighbors) : [],
        highlightedNodes: highlightedNodes,
        currentNode: currentNode,
        candidateNodes: candidateNodes,
        visitedNodes: visitedNodes,
        neighborCheckNode: neighborCheckNode,
        currentNodeNeighbors: currentNodeNeighbors,
        queryVector: queryVector ? queryVector.length : null,
        topResult: topResult,
        isAnimationComplete: isAnimationComplete
    });

    // 유클리드 거리 계산 함수
    const calculateDistance = (vec1, vec2) => {
        if (vec1.length !== vec2.length) {
            throw new Error('벡터 차원이 일치하지 않습니다');
        }
        let sum = 0;
        for (let i = 0; i < vec1.length; i++) {
            sum += Math.pow(vec1[i] - vec2[i], 2);
        }
        return Math.sqrt(sum);
    };



    // MDS (Multidimensional Scaling) 구현 - 실제 거리 관계를 더 정확하게 보존
    const MDSLayout = (vectors, maxIterations = 500) => {
        const n = vectors.length;
        if (n === 0) return [];
        if (n === 1) return [{ x: 0, y: 0 }];
        if (n === 2) return [{ x: -50, y: 0 }, { x: 50, y: 0 }];
        
        // 거리 행렬 계산
        const distances = Array(n).fill().map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dist = calculateDistance(vectors[i], vectors[j]);
                distances[i][j] = dist;
                distances[j][i] = dist;
            }
        }
        
        // 더 나은 초기화: PCA 기반 초기화 또는 랜덤 초기화
        let coords = Array(n).fill().map((_, i) => {
            // 랜덤 초기화 (MDS는 초기화에 덜 민감함)
            const angle = (i / n) * 2 * Math.PI;
            const radius = 100 + Math.random() * 50;
            return { 
                x: radius * Math.cos(angle) + (Math.random() - 0.5) * 50,
                y: radius * Math.sin(angle) + (Math.random() - 0.5) * 50
            };
        });
        
        // MDS 스트레스 최소화 (더 강력한 최적화)
        let learningRate = 0.5; // 더 높은 초기 학습률
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const gradients = Array(n).fill().map(() => ({ x: 0, y: 0 }));
            
            // 학습률 감소 (annealing)
            const currentLearningRate = learningRate * (1 - iter / maxIterations);
            
            // 모든 쌍에 대해 그래디언트 계산
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const targetDist = distances[i][j];
                    const currentDist = Math.sqrt(
                        Math.pow(coords[i].x - coords[j].x, 2) + 
                        Math.pow(coords[i].y - coords[j].y, 2)
                    );
                    
                    if (currentDist > 0) {
                        const factor = (currentDist - targetDist) / currentDist;
                        const dx = (coords[i].x - coords[j].x) * factor;
                        const dy = (coords[i].y - coords[j].y) * factor;
                        
                        gradients[i].x += dx;
                        gradients[i].y += dy;
                        gradients[j].x -= dx;
                        gradients[j].y -= dy;
                    }
                }
            }
            
            // 좌표 업데이트
            for (let i = 0; i < n; i++) {
                coords[i].x -= currentLearningRate * gradients[i].x;
                coords[i].y -= currentLearningRate * gradients[i].y;
            }
            
            // 경계 제한 (더 관대하게)
            const maxCoord = 400;
            for (let i = 0; i < n; i++) {
                coords[i].x = Math.max(-maxCoord, Math.min(maxCoord, coords[i].x));
                coords[i].y = Math.max(-maxCoord, Math.min(maxCoord, coords[i].y));
            }
        }
        
        return coords;
    };

    // MDS 레이아웃 결과 사용 (useMemo로 최적화)
    const points = useMemo(() => {
        if (cachedPoints && cachedPoints.length > 0) {
            return cachedPoints;
        }
        
        if (allVectors && allVectors.length > 0) {
            return Array(allVectors.length).fill().map((_, i) => {
                // 더 나은 fallback 레이아웃 (원형 배치 + 랜덤)
                const angle = (i / allVectors.length) * 2 * Math.PI;
                const radius = 150 + Math.random() * 100;
                return { 
                    x: radius * Math.cos(angle) + (Math.random() - 0.5) * 100,
                    y: radius * Math.sin(angle) + (Math.random() - 0.5) * 100
                };
            });
        }
        
        return [];
    }, [cachedPoints, allVectors]);

    // SVG 크기 및 좌표 범위 계산
    const containerWidth = Math.min(window.innerWidth * 0.8, 800); // 최대 800px로 제한
    const width = containerWidth;
    const height = containerWidth * 0.8; // 정사각형에 가깝게 조정
    const padding = 40;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // MDS 레이아웃의 경우 좌표 범위 조정
    let adjustedMinX = minX;
    let adjustedMaxX = maxX;
    let adjustedMinY = minY;
    let adjustedMaxY = maxY;
    
    // MDS 결과가 너무 작으면 확장
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const maxRange = Math.max(xRange, yRange);
    
    if (maxRange < 10) {
        const expansion = 50;
        adjustedMinX = minX - expansion;
        adjustedMaxX = maxX + expansion;
        adjustedMinY = minY - expansion;
        adjustedMaxY = maxY + expansion;
    }
    
    const scaleX = useMemo(() => {
        return (x) => padding + ((x - adjustedMinX) / (adjustedMaxX - adjustedMinX || 1)) * (width - 2 * padding);
    }, [padding, adjustedMinX, adjustedMaxX, width]);
    
    const scaleY = useMemo(() => {
        return (y) => height - padding - ((y - adjustedMinY) / (adjustedMaxY - adjustedMinY || 1)) * (height - 2 * padding);
    }, [height, padding, adjustedMinY, adjustedMaxY]);

    console.log('🎨 SVG 좌표 계산:', {
        containerWidth,
        width,
        height,
        padding,
        originalRange: { x: [minX, maxX], y: [minY, maxY] },
        adjustedRange: { x: [adjustedMinX, adjustedMaxX], y: [adjustedMinY, adjustedMaxY] },
        scaleX: scaleX.toString().substring(0, 50) + '...',
        scaleY: scaleY.toString().substring(0, 50) + '...'
    });

    // 스케일된 좌표 계산 (useMemo로 최적화)
    const scaledPoints = useMemo(() => {
        return points.map(p => ({ x: scaleX(p.x), y: scaleY(p.y) }));
    }, [points, scaleX, scaleY]);
    
    console.log('🎨 스케일된 좌표:', {
        scaledPointsCount: scaledPoints.length,
        sampleScaledPoints: scaledPoints.slice(0, 3),
        scaledXRange: [Math.min(...scaledPoints.map(p => p.x)), Math.max(...scaledPoints.map(p => p.x))],
        scaledYRange: [Math.min(...scaledPoints.map(p => p.y)), Math.max(...scaledPoints.map(p => p.y))]
    });
    
    // 쿼리 벡터의 상대적 위치 계산 (useMemo로 최적화) - 모든 노드들 고려
    const scaledQueryPoint = useMemo(() => {
        if (!queryVector || !allVectors.length || !allVectors[0] || allVectors[0].length !== queryVector.length) {
            return null;
        }
        
        // 쿼리 벡터와 모든 벡터 간의 거리 계산
        const queryDistances = allVectors.map(vector => calculateDistance(queryVector, vector));
        
        // 가장 가까운 3개 벡터를 찾아서 삼각측량으로 위치 계산
        const sortedDistances = queryDistances.map((dist, idx) => ({ dist, idx })).sort((a, b) => a.dist - b.dist);
        const closest3 = sortedDistances.slice(0, 3);
        
        // 가중 평균으로 쿼리 벡터 위치 계산
        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;
        
        closest3.forEach(({ dist, idx }) => {
            // scaledPoints 배열 범위 체크
            if (idx >= 0 && idx < scaledPoints.length && scaledPoints[idx]) {
                const weight = 1 / (dist + 0.1); // 거리가 가까울수록 높은 가중치
                totalWeight += weight;
                weightedX += scaledPoints[idx].x * weight;
                weightedY += scaledPoints[idx].y * weight;
            }
        });
        
        if (totalWeight > 0) {
            return {
                x: weightedX / totalWeight,
                y: weightedY / totalWeight
            };
        }
        
        return null;
    }, [queryVector, allVectors, scaledPoints]);



    // 현재 노드의 이웃 정보를 직접 HNSW 엔진에서 가져오기 (useMemo로 최적화)
    const currentNeighborsFromEngine = useMemo(() => {
        // 레벨 시작 단계에서는 이웃 정보를 표시하지 않음
        if (isLevelStart) {
            return [];
        }
        
        if (currentNode !== null && hnswEngine) {
            // 현재 검색 중인 레벨에 맞는 이웃만 가져오기
            const currentSearchLevel = currentLevel !== null ? currentLevel : 0;
            return hnswEngine.getCurrentNodeNeighbors(currentNode, currentSearchLevel);
        }
        return [];
    }, [currentNode, hnswEngine, isLevelStart, currentLevel]);
    
    // 노드 색상 결정 함수
    const getNodeColor = (nodeIndex) => {
        // 현재 레벨에 포함되지 않은 노드는 매우 옅은 회색
        const isInCurrentLevel = getCurrentLevelNodes.includes(nodeIndex);
        
        // 애니메이션 완료 후 순위 1 결과 강조 (최우선)
        if (isAnimationComplete && topResult === nodeIndex) {
            console.log(`Node ${nodeIndex}: 순위 1 결과 (금색)`);
            return '#ffd700'; // 금색
        }
        
        // 이웃 확인 중인 노드
        if (neighborCheckNode === nodeIndex) {
            console.log(`Node ${nodeIndex}: 이웃 확인 (보라색)`);
            return '#9c27b0'; // 보라색
        }
        
        // 현재 방문 중인 노드
        if (currentNode === nodeIndex) {
            console.log(`Node ${nodeIndex}: 현재 방문 (빨간색)`);
            return '#dc3545'; // 빨간색
        }
        
        // 현재 노드의 이웃들 (주황색) - HNSW 엔진에서 직접 가져온 정보 사용
        if (currentNode !== null && currentNeighborsFromEngine.some(n => n.id === nodeIndex)) {
            console.log(`Node ${nodeIndex}: 현재 노드 이웃 (주황색) - currentNode: ${currentNode}, neighbors:`, currentNeighborsFromEngine.map(n => n.id));
            return '#ff5722'; // 주황색
        }
        
        // 후보 노드들
        if (candidateNodes.includes(nodeIndex)) {
            console.log(`Node ${nodeIndex}: 후보 (연한 초록색)`);
            return '#8bc34a'; // 연한 초록색
        }
        
        // 방문한 노드들
        if (visitedNodes.includes(nodeIndex)) {
            console.log(`Node ${nodeIndex}: 방문 완료 (회색)`);
            return '#6c757d'; // 회색
        }
        
        // 현재 레벨에 포함되지 않은 노드는 매우 옅은 회색
        if (!isInCurrentLevel) {
            console.log(`Node ${nodeIndex}: 현재 레벨 미포함 (매우 옅은 회색)`);
            return '#f0f0f0'; // 매우 옅은 회색
        }
        
        console.log(`Node ${nodeIndex}: 기본 (파란색)`);
        return '#1976d2'; // 기본 색상
    };

    // 노드 크기 결정 함수
    const getNodeRadius = (nodeIndex) => {
        // 현재 레벨에 포함되지 않은 노드는 작게
        const isInCurrentLevel = getCurrentLevelNodes.includes(nodeIndex);
        
        // 애니메이션 완료 후 순위 1 결과는 가장 크게
        if (isAnimationComplete && topResult === nodeIndex) return 16;
        
        // 이웃 확인 중인 노드는 크게
        if (neighborCheckNode === nodeIndex) return 14;
        
        // 현재 방문 중인 노드는 더 크게
        if (currentNode === nodeIndex) return 12;
        
        // 현재 노드의 이웃들은 중간 크기로 - HNSW 엔진에서 직접 가져온 정보 사용
        if (currentNode !== null && currentNeighborsFromEngine.some(n => n.id === nodeIndex)) return 10;
        
        // 현재 레벨에 포함되지 않은 노드는 작게
        if (!isInCurrentLevel) return 4;
        
        return 8;
    };

    return (
        <div style={{ margin: '20px 0', textAlign: 'center', width: '100%' }}>
            <h3 style={{ color: '#495057', marginBottom: '10px' }}>
                HNSW 이웃 연결 그래프 ({vectors && vectors.length > 0 && vectors[0] ? vectors[0].length : 0}차원 → 2D 투영, MDS)
                {currentLevel !== null && (
                    <span style={{ fontSize: '0.8em', color: '#6c757d' }}>
                        {' '}(전체 {getAllNodes.length}개 노드, 레벨 {currentLevel} 이상: {getCurrentLevelNodes.length}개)
                    </span>
                )}
            </h3>
            <p style={{ color: '#6c757d', fontSize: '0.9em', marginBottom: '15px' }}>
                MDS로 벡터 간 실제 거리 관계를 정확하게 보존하여 전역적 구조를 명확하게 시각화
                {currentLevel !== null && (
                    <span> - 모든 노드 표시, 레벨 {currentLevel} 미만 노드는 옅은 회색</span>
                )}
            </p>
            <div style={{ 
                width: `${containerWidth}px`, 
                maxWidth: '100%', 
                height: height,
                margin: '0 auto',
                overflow: 'hidden',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                backgroundColor: '#fff'
            }}>
                <svg 
                    width="100%" 
                    height="100%" 
                    viewBox={`0 0 ${width} ${height}`}
                    style={{ background: '#fff', minHeight: '400px' }}
                    preserveAspectRatio="xMidYMid meet"
                >
                {/* 레벨별 HNSW 이웃 연결선 */}
                {isLevelStart && levelConnections.length > 0 ? (
                    // 레벨 시작 시: 전체 레벨 연결선 표시
                    (() => {
                        console.log('🎨 레벨 시작 연결선 렌더링:', {
                            isLevelStart,
                            levelConnectionsLength: levelConnections.length,
                            levelConnections: levelConnections.slice(0, 5), // 처음 5개만
                            currentLevel,
                            getAllNodesLength: getAllNodes.length
                        });
                        
                        return levelConnections.map(([originalI, originalJ], idx) => {
                            // 현재 노드의 이웃 연결선인지 확인 - HNSW 엔진에서 직접 가져온 정보 사용
                            const isCurrentNodeNeighbor = currentNode !== null && 
                                ((originalI === currentNode && currentNeighborsFromEngine.some(n => n.id === originalJ)) ||
                                 (originalJ === currentNode && currentNeighborsFromEngine.some(n => n.id === originalI)));
                            
                            // 현재 레벨에 포함되지 않은 연결선인지 확인
                            const isInCurrentLevel = getCurrentLevelNodes.includes(originalI) && getCurrentLevelNodes.includes(originalJ);
                            
                            let strokeColor = isCurrentNodeNeighbor ? "#ff9800" : (isInCurrentLevel ? "#cccccc" : "#f0f0f0");
                            let strokeWidth = isCurrentNodeNeighbor ? 3 : (isInCurrentLevel ? 1.0 : 0.5);
                            let opacity = isCurrentNodeNeighbor ? 0.9 : (isInCurrentLevel ? 0.3 : 0.1); // 현재 레벨 미포함은 매우 옅게
                            
                            // 스케일된 좌표 가져오기
                            const mappedI = nodeIndexMapping[originalI];
                            const mappedJ = nodeIndexMapping[originalJ];
                            
                            if (mappedI === undefined || mappedJ === undefined || 
                                !scaledPoints[mappedI] || !scaledPoints[mappedJ]) return null;
                            
                            return (
                                <line
                                    key={`level-edge-${originalI}-${originalJ}-${idx}`}
                                    x1={scaledPoints[mappedI].x}
                                    y1={scaledPoints[mappedI].y}
                                    x2={scaledPoints[mappedJ].x}
                                    y2={scaledPoints[mappedJ].y}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    opacity={opacity}
                                />
                            );
                        });
                    })()
                ) : (
                    // 일반 검색 과정: 모든 이웃 연결선 표시
                    getAllNodes.map(originalI => {
                        // 모든 이웃 가져오기
                        const allNeighbors = neighbors[originalI] || [];
                        
                        if (!allNeighbors || allNeighbors.length === 0) return null;
                        
                        return allNeighbors.map(originalJ => {
                            // 현재 노드의 이웃 연결선인지 확인 - HNSW 엔진에서 직접 가져온 정보 사용
                            const isCurrentNodeNeighbor = currentNode !== null && 
                                ((originalI === currentNode && currentNeighborsFromEngine.some(n => n.id === originalJ)) ||
                                 (originalJ === currentNode && currentNeighborsFromEngine.some(n => n.id === originalI)));
                            
                            // 현재 레벨에 포함되지 않은 연결선인지 확인
                            const isInCurrentLevel = getCurrentLevelNodes.includes(originalI) && getCurrentLevelNodes.includes(originalJ);
                            
                            // 탐색 경로에 따른 연결선 표시 로직
                            let shouldShow = false;
                            let strokeColor = "#6c757d";
                            let strokeWidth = 0.5;
                            let opacity = 0.6;
                            
                            // 1. 현재 노드의 이웃 연결선 (탐색 중인 이웃) - 가장 강조
                            if (isCurrentNodeNeighbor) {
                                shouldShow = true;
                                strokeColor = "#ff9800";
                                strokeWidth = 3;
                                opacity = 0.9;
                            }
                            // 2. 방문한 노드들 간의 연결선 (탐색 경로) - 중간 강조
                            else if (visitedNodes.length > 0) {
                                const isVisitedConnection = visitedNodes.includes(originalI) && visitedNodes.includes(originalJ);
                                if (isVisitedConnection) {
                                    shouldShow = true;
                                    strokeColor = "#6c757d";
                                    strokeWidth = 1.5;
                                    opacity = 0.6;
                                }
                                // 방문한 노드가 하나라도 있으면 기본 HNSW 구조도 표시
                                else {
                                    shouldShow = true;
                                    strokeColor = isInCurrentLevel ? "#cccccc" : "#f0f0f0";
                                    strokeWidth = isInCurrentLevel ? 1.0 : 0.5;
                                    opacity = isInCurrentLevel ? 0.5 : 0.1;
                                }
                            }
                            // 3. 애니메이션 완료 후 최종 결과 경로만 표시 - 결과 경로
                            else if (isAnimationComplete && topResult !== null) {
                                // 최종 결과까지의 경로만 표시 (간단히 방문한 노드들 간의 연결)
                                const isResultPath = visitedNodes.includes(originalI) && visitedNodes.includes(originalJ);
                                if (isResultPath) {
                                    shouldShow = true;
                                    strokeColor = "#28a745";
                                    strokeWidth = 2;
                                    opacity = 0.7;
                                }
                            }
                            // 4. 기본 HNSW 구조 연결선 (탐색 전에도 표시)
                            else {
                                // 기본적으로 모든 HNSW 연결선을 표시
                                shouldShow = true;
                                strokeColor = isInCurrentLevel ? "#cccccc" : "#f0f0f0";
                                strokeWidth = isInCurrentLevel ? 1.0 : 0.5;
                                opacity = isInCurrentLevel ? 0.5 : 0.1;
                            }
                            
                            // 이웃 확인 중이거나 탐색 중일 때는 기본 HNSW 구조도 항상 표시
                            if ((neighborCheckNode !== null || currentNode !== null) && !shouldShow) {
                                shouldShow = true;
                                strokeColor = isInCurrentLevel ? "#cccccc" : "#f0f0f0";
                                strokeWidth = isInCurrentLevel ? 1.0 : 0.5;
                                opacity = isInCurrentLevel ? 0.5 : 0.1;
                            }
                            
                            // 중복 연결선 방지 (i < j 조건)
                            if (originalI >= originalJ || !shouldShow) return null;
                            
                            // 스케일된 좌표 가져오기
                            const mappedI = nodeIndexMapping[originalI];
                            const mappedJ = nodeIndexMapping[originalJ];
                            
                            if (mappedI === undefined || mappedJ === undefined || 
                                !scaledPoints[mappedI] || !scaledPoints[mappedJ]) return null;
                            
                            return (
                                <line
                                    key={`edge-${originalI}-${originalJ}`}
                                    x1={scaledPoints[mappedI].x}
                                    y1={scaledPoints[mappedI].y}
                                    x2={scaledPoints[mappedJ].x}
                                    y2={scaledPoints[mappedJ].y}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    opacity={opacity}
                                />
                            );
                        });
                    })
                )}
                
                {/* 벡터 점 - 모든 노드들 */}
                {getAllNodes.map((originalIndex, mappedIndex) => {
                    const p = scaledPoints[mappedIndex];
                    if (!p) return null;
                    
                    // 현재 노드의 이웃인지 확인 - HNSW 엔진에서 직접 가져온 정보 사용
                    const isCurrentNodeNeighbor = currentNode !== null && currentNeighborsFromEngine.some(n => n.id === originalIndex);
                    const neighborInfo = isCurrentNodeNeighbor ? currentNeighborsFromEngine.find(n => n.id === originalIndex) : null;
                    
                    // 현재 레벨에 포함되지 않은 노드는 텍스트를 옅게 표시
                    const isInCurrentLevel = getCurrentLevelNodes.includes(originalIndex);
                    const textColor = isInCurrentLevel ? "#333" : "#ccc";
                    const textSize = isInCurrentLevel ? "14" : "12";
                    
                    return (
                        <g key={`pt-${originalIndex}`}>
                            {/* 현재 방문 중인 노드는 네모로 표시 */}
                            {currentNode === originalIndex ? (
                                <rect
                                    x={p.x - getNodeRadius(originalIndex)}
                                    y={p.y - getNodeRadius(originalIndex)}
                                    width={getNodeRadius(originalIndex) * 2}
                                    height={getNodeRadius(originalIndex) * 2}
                                    fill={getNodeColor(originalIndex)}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    rx={2}
                                    ry={2}
                                />
                            ) : (
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={getNodeRadius(originalIndex)}
                                    fill={getNodeColor(originalIndex)}
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                            )}
                            <text
                                x={p.x + 10}
                                y={p.y - 10}
                                fontSize={textSize}
                                fill={textColor}
                                style={{ userSelect: 'none' }}
                            >
                                {originalIndex}
                            </text>
                            
                            {/* 이웃 확인 중인 노드에 특별한 효과 */}
                            {neighborCheckNode === originalIndex && (
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={getNodeRadius(originalIndex) + 8}
                                    fill="none"
                                    stroke="#9c27b0"
                                    strokeWidth="3"
                                    strokeDasharray="5,5"
                                    opacity="0.8"
                                >
                                    <animate
                                        attributeName="r"
                                        values={`${getNodeRadius(originalIndex) + 8};${getNodeRadius(originalIndex) + 12};${getNodeRadius(originalIndex) + 8}`}
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            )}
                            
                            {/* 현재 방문 중인 노드에 특별한 효과 (네모 모양) */}
                            {currentNode === originalIndex && (
                                <rect
                                    x={p.x - getNodeRadius(originalIndex) - 8}
                                    y={p.y - getNodeRadius(originalIndex) - 8}
                                    width={(getNodeRadius(originalIndex) + 8) * 2}
                                    height={(getNodeRadius(originalIndex) + 8) * 2}
                                    fill="none"
                                    stroke="#dc3545"
                                    strokeWidth="3"
                                    strokeDasharray="5,5"
                                    opacity="0.8"
                                    rx={4}
                                    ry={4}
                                >
                                    <animate
                                        attributeName="width"
                                        values={`${(getNodeRadius(originalIndex) + 8) * 2};${(getNodeRadius(originalIndex) + 12) * 2};${(getNodeRadius(originalIndex) + 8) * 2}`}
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                    <animate
                                        attributeName="height"
                                        values={`${(getNodeRadius(originalIndex) + 8) * 2};${(getNodeRadius(originalIndex) + 12) * 2};${(getNodeRadius(originalIndex) + 8) * 2}`}
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                    <animate
                                        attributeName="x"
                                        values={`${p.x - getNodeRadius(originalIndex) - 8};${p.x - getNodeRadius(originalIndex) - 12};${p.x - getNodeRadius(originalIndex) - 8}`}
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                    <animate
                                        attributeName="y"
                                        values={`${p.y - getNodeRadius(originalIndex) - 8};${p.y - getNodeRadius(originalIndex) - 12};${p.y - getNodeRadius(originalIndex) - 8}`}
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </rect>
                            )}
                            
                            {/* 순위 1 결과 노드에 특별한 효과 */}
                            {isAnimationComplete && topResult === originalIndex && (
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={getNodeRadius(originalIndex) + 10}
                                    fill="none"
                                    stroke="#ffd700"
                                    strokeWidth="4"
                                    strokeDasharray="8,4"
                                    opacity="0.9"
                                >
                                    <animate
                                        attributeName="r"
                                        values={`${getNodeRadius(originalIndex) + 10};${getNodeRadius(originalIndex) + 18};${getNodeRadius(originalIndex) + 10}`}
                                        dur="1.5s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            )}
                        </g>
                    );
                })}
                
                {/* 쿼리 벡터 표시 */}
                {scaledQueryPoint && (
                    <g key="query-vector">
                        {/* 쿼리 벡터 별모양 */}
                        <polygon
                            points={(() => {
                                const cx = scaledQueryPoint.x;
                                const cy = scaledQueryPoint.y;
                                const r = 12;
                                const points = [];
                                for (let i = 0; i < 10; i++) {
                                    const angle = (i * Math.PI) / 5;
                                    const radius = i % 2 === 0 ? r : r * 0.5;
                                    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
                                }
                                return points.join(' ');
                            })()}
                            fill="#ff69b4"
                            stroke="#fff"
                            strokeWidth="2"
                        />
                        {/* 쿼리 벡터 주변 애니메이션 원 */}
                        <circle
                            cx={scaledQueryPoint.x}
                            cy={scaledQueryPoint.y}
                            r="20"
                            fill="none"
                            stroke="#ff69b4"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity="0.7"
                        >
                            <animate
                                attributeName="r"
                                values="20;25;20"
                                dur="2s"
                                repeatCount="indefinite"
                            />
                        </circle>
                    </g>
                )}
                </svg>
            </div>
            <div style={{ color: '#6c757d', fontSize: '0.95em', marginTop: 8 }}>
                각 점은 벡터, 선은 HNSW 연결 구조를 의미합니다. (MDS 2D 투영 - 실제 거리 관계 보존)
                {currentLevel !== null && (
                    <span> - 모든 노드 표시, 레벨 {currentLevel} 미만 노드/연결선은 옅은 회색</span>
                )}
                {visitedNodes.length === 0 && !isAnimationComplete && (
                    <span> - 연한 회색선: 기본 HNSW 구조, 탐색 시 강조된 선: 탐색 경로</span>
                )}
                {neighborCheckNode !== null && (
                    <span> - 이웃 확인 중: 전체 HNSW 구조 표시</span>
                )}
                {visitedNodes.length > 0 && !isAnimationComplete && (
                    <span> - 노드 방문 중: 전체 HNSW 구조 표시</span>
                )}
            </div>
            

            

            

            {(currentNode !== null || candidateNodes.length > 0 || visitedNodes.length > 0 || neighborCheckNode !== null) && (
                <div style={{ 
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6',
                    fontSize: '0.9em'
                }}>
                    <div style={{ marginBottom: '5px' }}><strong>색상 의미:</strong></div>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* 연결선 색상 설명 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '20px', height: '2px', backgroundColor: '#cccccc' }}></div>
                            <span>기본 HNSW 구조</span>
                        </div>
                        {currentLevel !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '20px', height: '2px', backgroundColor: '#f0f0f0' }}></div>
                                <span>레벨 미포함 연결선</span>
                            </div>
                        )}
                        {visitedNodes.length > 0 && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <div style={{ width: '20px', height: '2px', backgroundColor: '#ff9800' }}></div>
                                    <span>탐색 중인 이웃</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <div style={{ width: '20px', height: '2px', backgroundColor: '#6c757d' }}></div>
                                    <span>탐색 경로</span>
                                </div>
                                {isAnimationComplete && topResult !== null && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{ width: '20px', height: '2px', backgroundColor: '#28a745' }}></div>
                                        <span>최종 결과 경로</span>
                                    </div>
                                )}
                            </>
                        )}
                        {/* 노드 색상 설명 */}
                        {scaledQueryPoint && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ 
                                    width: '12px', 
                                    height: '12px', 
                                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                                    backgroundColor: '#ff69b4' 
                                }}></div>
                                <span>쿼리 벡터</span>
                            </div>
                        )}
                        {isAnimationComplete && topResult !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffd700' }}></div>
                                <span>순위 1 결과</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#9c27b0' }}></div>
                            <span>이웃 확인</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
                            <span>현재 방문</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8bc34a' }}></div>
                            <span>후보</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6c757d' }}></div>
                            <span>방문 완료</span>
                        </div>
                        {currentLevel !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#f0f0f0' }}></div>
                                <span>레벨 미포함 노드</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default HNSWGraph2D; 