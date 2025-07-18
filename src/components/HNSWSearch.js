import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useVectorDB } from '../context/VectorDBContext';
import HNSWGraph2D from './HNSWGraph2D';

function HNSWSearch() {
    const { vectorDB, hnswEngine, search, getSearchStats } = useVectorDB();
    const [queryVector, setQueryVector] = useState('');
    const [k, setK] = useState(5);
    const [searchResults, setSearchResults] = useState([]);
    const [message, setMessage] = useState('');
    const [searchTime, setSearchTime] = useState(0);
    const [hnswStats, setHnswStats] = useState(null);
    
    // 애니메이션 관련 상태
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [searchSteps, setSearchSteps] = useState([]);
    const [highlightedNodes, setHighlightedNodes] = useState([]);
    const [currentNode, setCurrentNode] = useState(null);
    const [candidateNodes, setCandidateNodes] = useState([]);
    const [visitedNodes, setVisitedNodes] = useState([]);
    const [neighborCheckNode, setNeighborCheckNode] = useState(null);
    const [currentNodeNeighbors, setCurrentNodeNeighbors] = useState([]);
    const [searchHistory, setSearchHistory] = useState(null);
    const [currentLevel, setCurrentLevel] = useState(null);
    const animationRef = useRef(null);
    const currentStepRef = useRef(0); // currentStep을 ref로도 관리

    const handleSearch = () => {
        try {
            const vector = queryVector.split(',').map(v => parseFloat(v.trim()));
            
            if (vector.length !== vectorDB.getDimensions()) {
                setMessage(`쿼리 벡터는 ${vectorDB.getDimensions()}차원이어야 합니다.`);
                return;
            }
            
            if (vector.some(isNaN)) {
                setMessage('올바른 숫자를 입력해주세요.');
                return;
            }

            const startTime = performance.now();
            const results = search(vector, k, 'euclidean', 'hnsw');
            const endTime = performance.now();
            const searchDuration = endTime - startTime;

            setSearchResults(results);
            setSearchTime(searchDuration);
            setMessage(`HNSW 검색 완료: ${results.length}개의 결과를 찾았습니다. (${searchDuration.toFixed(2)}ms)`);
            
            // HNSW 통계 업데이트
            if (hnswEngine && hnswEngine.getStats) {
                setHnswStats(hnswEngine.getStats());
            }
        } catch (error) {
            setMessage(`검색 오류: ${error.message}`);
        }
    };

    // HNSW 검색을 먼저 실행하고 기록을 재생하는 함수
    const startAnimatedSearchWithHistory = () => {
        try {
            // 이미 애니메이션이 실행 중이면 중단
            if (isAnimating) {
                stopAnimation();
                return;
            }

            const vector = queryVector.split(',').map(v => parseFloat(v.trim()));
            
            if (vector.length !== vectorDB.getDimensions()) {
                setMessage(`쿼리 벡터는 ${vectorDB.getDimensions()}차원이어야 합니다.`);
                return;
            }
            
            if (vector.some(isNaN)) {
                setMessage('올바른 숫자를 입력해주세요.');
                return;
            }

            setMessage('HNSW 검색을 실행하고 기록을 생성합니다...');

            // 0. 검색 시작 전에 레벨별 이웃 정보 재구성
            if (hnswEngine) {
                console.log('🔧 검색 시작 전 레벨별 이웃 정보 재구성');
                hnswEngine.reconstructLevelNeighbors();
            }

            // 1. 먼저 실제 HNSW 검색 실행
            const startTime = performance.now();
            const results = search(vector, k, 'euclidean', 'hnsw');
            const endTime = performance.now();
            const searchDuration = endTime - startTime;

            setSearchResults(results);
            setSearchTime(searchDuration);

            // 2. HNSW 엔진에서 검색 기록 가져오기
            if (hnswEngine && hnswEngine.getSearchHistory) {
                const history = hnswEngine.getSearchHistory();
                console.log('🔍 HNSW 검색 기록:', history);
                setSearchHistory(history);
                
                // 3. 검색 기록을 애니메이션 단계로 변환
                const animationSteps = convertSearchHistoryToSteps(history, vector);
                console.log('🎬 애니메이션 단계 생성:', {
                    totalSteps: animationSteps.length,
                    stepTypes: animationSteps.map(s => s.type),
                    firstStep: animationSteps[0],
                    lastStep: animationSteps[animationSteps.length - 1]
                });
                
                setSearchSteps(animationSteps);
                setCurrentStep(0);
                currentStepRef.current = 0; // ref도 초기화
                setHighlightedNodes([]);
                setCurrentNode(null);
                setCandidateNodes([]);
                setVisitedNodes([]);
                setNeighborCheckNode(null);
                setCurrentNodeNeighbors([]);
                setCurrentLevel(null);
                
                setMessage(`HNSW 검색 완료: ${results.length}개의 결과를 찾았습니다. (${searchDuration.toFixed(2)}ms) 애니메이션을 시작합니다...`);
                
                // 상태 설정이 완료된 후 애니메이션 활성화
                setTimeout(() => {
                    console.log('🎬 애니메이션 활성화 시작');
                    setIsAnimating(true);
                }, 100);
            } else {
                setMessage('HNSW 엔진에서 검색 기록을 가져올 수 없습니다.');
            }
        } catch (error) {
            console.error('애니메이션 검색 오류:', error);
            setMessage(`검색 오류: ${error.message}`);
        }
    };

    // 검색 기록을 애니메이션 단계로 변환
    const convertSearchHistoryToSteps = (history, queryVector) => {
        const steps = [];
        
        if (!history || history.length === 0) {
            return steps;
        }

        // 각 레벨별 검색 과정을 단계로 변환
        history.forEach((levelData, levelIndex) => {
            // 해당 레벨의 모든 노드 정보 가져오기
            const levelNodes = hnswEngine ? hnswEngine.getLevelNodes(levelData.level) : [];
            const levelConnections = hnswEngine ? hnswEngine.getLevelConnections(levelData.level) : [];
            
            steps.push({
                type: 'level_start',
                level: levelData.level,
                message: `레벨 ${levelData.level} 검색 시작 (진입점: ${levelData.entryPoint}, 전체 노드: ${levelNodes.length}개)`,
                entryPoint: levelData.entryPoint,
                ef: levelData.ef,
                candidates: [levelData.entryPoint],
                visited: [levelData.entryPoint],
                node: levelData.entryPoint,
                levelNodes: levelNodes, // 해당 레벨의 모든 노드
                levelConnections: levelConnections // 해당 레벨의 모든 연결
            });

            // 각 단계별 상세 정보
            levelData.steps.forEach((stepData, stepIndex) => {
                // 노드 방문 시작 단계
                const checkedNeighborsCount = stepData.checkedNeighbors ? stepData.checkedNeighbors.length : 0;
                const visitMessage = checkedNeighborsCount > 0 
                    ? `레벨 ${levelData.level} - 단계 ${stepData.step}: 벡터 ${stepData.currentNode} 방문 (거리: ${stepData.currentDistance.toFixed(3)}, ${checkedNeighborsCount}개 이웃 확인 예정)`
                    : `레벨 ${levelData.level} - 단계 ${stepData.step}: 벡터 ${stepData.currentNode} 방문 (거리: ${stepData.currentDistance.toFixed(3)})`;
                
                steps.push({
                    type: 'visit_node',
                    level: levelData.level,
                    step: stepData.step,
                    node: stepData.currentNode,
                    message: visitMessage,
                    currentDistance: stepData.currentDistance,
                    candidates: stepData.candidates,
                    visited: stepData.visited,
                    checkedNeighbors: stepData.checkedNeighbors || []
                });

                // 이웃 확인 단계들을 추가
                if (stepData.checkedNeighbors && stepData.checkedNeighbors.length > 0) {
                    stepData.checkedNeighbors.forEach((neighbor, neighborIndex) => {
                        steps.push({
                            type: 'check_neighbor',
                            level: levelData.level,
                            step: stepData.step,
                            parentNode: stepData.currentNode,
                            node: neighbor.id,
                            message: `이웃 ${neighbor.id} 확인 (거리: ${neighbor.distance.toFixed(3)})`,
                            distance: neighbor.distance,
                            candidates: stepData.candidates,
                            visited: stepData.visited,
                            neighborIndex: neighborIndex,
                            totalNeighbors: stepData.checkedNeighbors.length
                        });
                    });
                }
            });

            const levelEndStep = {
                type: 'level_end',
                level: levelData.level,
                message: `레벨 ${levelData.level} 검색 완료 (${levelData.finalResults.length}개 노드 방문)`,
                finalResults: levelData.finalResults,
                candidates: [],
                visited: levelData.finalResults.map(r => r.id)
            };
            steps.push(levelEndStep);
            console.log(`🟢 레벨 ${levelData.level} 종료 단계 생성:`, levelEndStep);
        });

        console.log('📊 전체 단계 생성 완료:', {
            totalSteps: steps.length,
            stepTypes: steps.map(s => s.type),
            levelEndSteps: steps.filter(s => s.type === 'level_end').length,
            neighborCheckSteps: steps.filter(s => s.type === 'check_neighbor').length
        });
        return steps;
    };



    const playAnimation = useCallback(() => {
        const currentStepValue = currentStepRef.current;
        console.log('🎬 playAnimation 호출됨:', { 
            currentStep: currentStepValue, 
            totalSteps: searchSteps.length, 
            isAnimating,
            searchStepsExists: !!searchSteps.length
        });
        
        // searchSteps가 비어있거나 currentStep이 범위를 벗어나면 종료
        if (!searchSteps.length || currentStepValue >= searchSteps.length) {
            console.log('🎬 애니메이션 종료:', { 
                currentStep: currentStepValue, 
                totalSteps: searchSteps.length,
                reason: !searchSteps.length ? '검색 단계 없음' : '모든 단계 완료'
            });
            setIsAnimating(false);
            setMessage('애니메이션 검색이 완료되었습니다.');
            return;
        }

        const step = searchSteps[currentStepValue];
        console.log(`🎬 Step ${currentStepValue} 처리:`, {
            type: step.type,
            message: step.message,
            node: step.node,
            candidates: step.candidates?.length || 0,
            visited: step.visited?.length || 0
        });
        
        // 단계 타입에 따른 하이라이트 노드 설정
        let currentHighlightedNodes = [];
        
        switch (step.type) {
            case 'level_start':
                // 레벨 시작: 진입점과 후보들 하이라이트
                currentHighlightedNodes = [step.entryPoint, ...step.candidates].filter(n => n !== null);
                break;
                
            case 'visit_node':
                // 노드 방문: 현재 노드, 후보들, 방문한 노드들 하이라이트
                currentHighlightedNodes = [step.node, ...step.candidates, ...step.visited].filter(n => n !== null);
                break;
                
            case 'check_neighbor':
                // 이웃 확인: 부모 노드, 확인 중인 이웃, 후보들 하이라이트
                currentHighlightedNodes = [step.parentNode, step.node, ...step.candidates].filter(n => n !== null);
                break;
                
            case 'add_neighbor':
                // 이웃 추가: 부모 노드, 새로 추가된 이웃, 후보들 하이라이트
                currentHighlightedNodes = [step.parentNode, step.node, ...step.candidates].filter(n => n !== null);
                break;
                
            case 'remove_neighbor':
                // 이웃 제거: 부모 노드, 제거된 이웃, 후보들 하이라이트
                currentHighlightedNodes = [step.parentNode, step.node, ...step.candidates].filter(n => n !== null);
                break;
                
            case 'level_end':
                // 레벨 종료: 최종 결과 노드들 하이라이트
                currentHighlightedNodes = step.visited.filter(n => n !== null);
                break;
        }
        
        // 기본 단계는 건너뛰기
        if (!step.type || !['level_start', 'visit_node', 'check_neighbor', 'add_neighbor', 'remove_neighbor', 'level_end'].includes(step.type)) {
            console.log(`🎬 기본 단계 건너뛰기: ${currentStepValue} (${step.type})`);
            const nextStep = currentStepValue + 1;
            if (nextStep >= searchSteps.length) {
                setIsAnimating(false);
                setMessage('애니메이션 검색이 완료되었습니다.');
            } else {
                currentStepRef.current = nextStep;
                setCurrentStep(nextStep);
                setTimeout(() => {
                    playAnimation();
                }, 50);
            }
            return;
        }
        
        // 노드 상태별로 분리하여 설정
        let currentVisitingNode = null;
        let currentCandidateNodes = [];
        let currentVisitedNodes = [];
        let currentNeighborCheckNode = null;
        
        switch (step.type) {
            case 'level_start':
                currentVisitingNode = step.entryPoint;
                currentCandidateNodes = step.candidates || [];
                currentVisitedNodes = step.visited || [];
                console.log('🎬 레벨 시작:', { 
                    entryPoint: step.entryPoint, 
                    candidates: currentCandidateNodes,
                    levelNodes: step.levelNodes,
                    levelConnections: step.levelConnections
                });
                break;
                
            case 'visit_node':
                currentVisitingNode = step.node;
                currentCandidateNodes = step.candidates || [];
                currentVisitedNodes = step.visited || [];
                console.log('🎬 노드 방문:', { node: step.node, candidates: currentCandidateNodes.length, visited: currentVisitedNodes.length });
                break;
                
            case 'check_neighbor':
                currentVisitingNode = step.parentNode;
                currentNeighborCheckNode = step.node; // 현재 확인 중인 이웃
                currentCandidateNodes = step.candidates || [];
                currentVisitedNodes = step.visited || [];
                console.log('🔍 이웃 확인 단계:', { parentNode: step.parentNode, neighborNode: step.node, distance: step.distance });
                break;
                
            case 'add_neighbor':
                currentVisitingNode = step.parentNode;
                currentNeighborCheckNode = step.node; // 새로 추가되는 이웃
                currentCandidateNodes = step.candidates || [];
                currentVisitedNodes = step.visited || [];
                console.log('➕ 이웃 추가 단계:', { parentNode: step.parentNode, neighborNode: step.node });
                break;
                
            case 'remove_neighbor':
                currentVisitingNode = step.parentNode;
                currentNeighborCheckNode = step.node; // 제거되는 이웃
                currentCandidateNodes = step.candidates || [];
                currentVisitedNodes = step.visited || [];
                console.log('➖ 이웃 제거 단계:', { parentNode: step.parentNode, neighborNode: step.node });
                break;
                
            case 'level_end':
                currentVisitingNode = null;
                currentCandidateNodes = [];
                currentVisitedNodes = step.visited || [];
                console.log('🔵 레벨 종료:', { level: step.level, visited: currentVisitedNodes.length });
                break;
        }
        
        // 현재 노드의 이웃 정보 업데이트 - HNSW 엔진에서 직접 가져오기
        let currentNeighbors = [];
        if (currentVisitingNode !== null && hnswEngine) {
            // 현재 검색 중인 레벨에 맞는 이웃만 가져오기
            const currentSearchLevel = step.level !== undefined ? step.level : 0;
            currentNeighbors = hnswEngine.getCurrentNodeNeighbors(currentVisitingNode, currentSearchLevel);
            console.log('🔍 HNSW 엔진에서 현재 노드 이웃 가져오기:', {
                currentNode: currentVisitingNode,
                currentLevel: currentSearchLevel,
                neighbors: currentNeighbors.map(n => ({ id: n.id, distance: n.distance }))
            });
        }
        
        // 현재 레벨 업데이트
        setCurrentLevel(step.level);
        
        // 상태 업데이트
        setCurrentNode(currentVisitingNode);
        setCandidateNodes(currentCandidateNodes);
        setVisitedNodes(currentVisitedNodes);
        setNeighborCheckNode(currentNeighborCheckNode);
        setCurrentNodeNeighbors(currentNeighbors);
        setHighlightedNodes([...currentHighlightedNodes]); // 기존 호환성 유지
        
        console.log('🎬 상태 업데이트 완료:', {
            currentNode: currentVisitingNode,
            candidateNodes: currentCandidateNodes.length,
            visitedNodes: currentVisitedNodes.length,
            neighborCheckNode: currentNeighborCheckNode,
            currentNodeNeighbors: currentNeighbors.length,
            highlightedNodes: currentHighlightedNodes.length
        });
        
        // 다음 단계로 진행
        const nextStep = currentStepValue + 1;
        
        // 단계 타입에 따른 애니메이션 속도 조절
        let animationDelay = 300;
        if (step.type === 'level_start' || step.type === 'level_end') {
            animationDelay = 1000; // 레벨 시작/종료는 더 오래 보여줌
        } else if (step.type === 'check_neighbor') {
            animationDelay = 150; // 이웃 확인은 빠르게
        } else if (step.type === 'add_neighbor' || step.type === 'remove_neighbor') {
            animationDelay = 200; // 이웃 추가/제거는 빠르게
        }
        
        console.log(`🎬 다음 단계 예약: ${nextStep}/${searchSteps.length} (${animationDelay}ms 후)`);
        
        animationRef.current = setTimeout(() => {
            console.log(`🎬 타이머 실행: nextStep=${nextStep}, totalSteps=${searchSteps.length}`);
            if (nextStep >= searchSteps.length) {
                // 마지막 단계인 경우 종료
                console.log('🎬 마지막 단계 완료');
                setIsAnimating(false);
                setMessage('애니메이션 검색이 완료되었습니다.');
            } else {
                // 다음 단계로 진행 - ref와 state 모두 업데이트
                console.log(`🎬 다음 단계로 진행: ${nextStep}`);
                currentStepRef.current = nextStep;
                setCurrentStep(nextStep);
                // 약간의 지연 후 다음 단계 실행 (상태 업데이트 완료 대기)
                setTimeout(() => {
                    playAnimation();
                }, 50);
            }
        }, animationDelay);
    }, [searchSteps, isAnimating, hnswEngine]);

    // searchSteps가 설정되고 애니메이션이 활성화되면 자동으로 시작
    useEffect(() => {
        console.log('🎬 useEffect 트리거:', { 
            isAnimating, 
            searchStepsLength: searchSteps.length, 
            currentStep,
            hasSearchSteps: searchSteps.length > 0
        });
        
        if (isAnimating && searchSteps.length > 0 && currentStep === 0) {
            console.log('🎬 애니메이션 시작 조건 만족:', { 
                steps: searchSteps.length, 
                currentStep,
                firstStep: searchSteps[0]
            });
            
            // 약간의 지연 후 애니메이션 시작
            setTimeout(() => {
                console.log('🎬 playAnimation 호출 시작');
                playAnimation();
            }, 200);
        }
    }, [isAnimating, searchSteps.length, currentStep, playAnimation]);

    const stopAnimation = () => {
        setIsAnimating(false);
        if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
        }
    };

    const resetAnimation = () => {
        stopAnimation();
        setCurrentStep(0);
        currentStepRef.current = 0; // ref도 초기화
        setHighlightedNodes([]);
        setCurrentNode(null);
        setCandidateNodes([]);
        setVisitedNodes([]);
        setNeighborCheckNode(null);
        setCurrentNodeNeighbors([]);
        setCurrentLevel(null);
        setSearchSteps([]);
        setMessage('');
    };

    // stats를 useMemo로 최적화하여 렌더링 중 직접 호출 방지
    const stats = useMemo(() => getSearchStats('hnsw'), [getSearchStats]);

    // HNSW 엔진 통계를 useMemo로 최적화
    const engineStats = useMemo(() => {
        if (searchHistory && hnswEngine && hnswEngine.getSearchStats) {
            return hnswEngine.getSearchStats();
        }
        return null;
    }, [searchHistory, hnswEngine]);

    // 임의 쿼리 벡터 생성 함수
    const generateRandomQueryVector = () => {
        const dimensions = vectorDB.getDimensions();
        const randomVector = [];
        
        for (let i = 0; i < dimensions; i++) {
            // -10부터 +10까지의 임의 값 생성
            const randomValue = (Math.random() - 0.5) * 20;
            randomVector.push(parseFloat(randomValue.toFixed(3)));
        }
        
        setQueryVector(randomVector.join(', '));
    };

    return (
        <div style={{ 
            padding: '20px', 
            maxWidth: '1200px', 
            margin: '0 auto',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e9ecef'
        }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '30px', textAlign: 'center' }}>
                🚀 HNSW 벡터 검색
            </h2>

            {/* HNSW 통계 */}
            {hnswStats && (
                <div style={{ 
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #dee2e6'
                }}>
                    <h3 style={{ color: '#495057', marginBottom: '15px' }}>HNSW 구조 통계</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <div><strong>총 벡터 수:</strong> {hnswStats.totalVectors}</div>
                        <div><strong>최대 레벨:</strong> {hnswStats.maxLevel}</div>
                        <div><strong>평균 이웃 수:</strong> {hnswStats.averageNeighbors.toFixed(2)}</div>
                        <div><strong>진입점:</strong> {hnswStats.entryPoint}</div>
                    </div>
                    
                    {/* 레벨별 이웃 정보 통계 */}
                    {hnswEngine && (
                        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                            <h4 style={{ color: '#495057', marginBottom: '10px' }}>레벨별 이웃 정보 통계</h4>
                            {(() => {
                                const levelStats = hnswEngine.getLevelNeighborsStats();
                                return (
                                    <div style={{ fontSize: '0.9em' }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <strong>레벨별 이웃 정보 보유 벡터:</strong> {levelStats.vectorsWithLevelNeighbors} / {levelStats.totalVectors}
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <strong>레벨별 분포:</strong>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                                {Object.entries(levelStats.levelDistribution).map(([level, count]) => (
                                                    <span key={level} style={{ 
                                                        backgroundColor: '#007bff', 
                                                        color: 'white', 
                                                        padding: '2px 8px', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.8em'
                                                    }}>
                                                        레벨 {level}: {count}개
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {levelStats.sampleVectors.length > 0 && (
                                            <details style={{ marginTop: '10px' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                                    샘플 벡터 레벨별 이웃 정보 (처음 5개)
                                                </summary>
                                                <div style={{ marginTop: '10px', fontFamily: 'monospace', fontSize: '0.8em' }}>
                                                    {levelStats.sampleVectors.map((sample, idx) => (
                                                        <div key={idx} style={{ marginBottom: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                                                            <div><strong>벡터 {sample.vectorId}</strong> (레벨 {sample.level})</div>
                                                            <div>레벨별 이웃: {sample.hasLevelNeighbors ? '있음' : '없음'}</div>
                                                            {sample.hasLevelNeighbors && (
                                                                <div>레벨별 이웃: {JSON.stringify(sample.levelNeighbors)}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* 데이터베이스 통계 */}
            <div style={{ 
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #dee2e6'
            }}>
                <h3 style={{ color: '#495057', marginBottom: '15px' }}>데이터베이스 통계</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div><strong>총 벡터 수:</strong> {stats.totalVectors}</div>
                    <div><strong>차원:</strong> {stats.dimensions}</div>
                    <div><strong>검색 타입:</strong> {stats.searchType}</div>
                    <div><strong>지원 거리 측정:</strong> 유클리드 거리</div>
                </div>
            </div>

            {/* 검색 설정 */}
            <div style={{ 
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #dee2e6'
            }}>
                <h3 style={{ color: '#495057', marginBottom: '15px' }}>검색 설정</h3>
                
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        쿼리 벡터:
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <input
                            type="text"
                            value={queryVector}
                            onChange={(e) => setQueryVector(e.target.value)}
                            placeholder={`${vectorDB.getDimensions()}차원 벡터 (예: 1, 2, 3)`}
                            style={{ 
                                flex: 1,
                                padding: '12px',
                                border: '2px solid #dee2e6',
                                borderRadius: '8px',
                                fontSize: '1rem'
                            }}
                        />
                        <button
                            onClick={generateRandomQueryVector}
                            style={{
                                padding: '12px 16px',
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            🎲 임의 생성
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        K (결과 개수):
                    </label>
                    <input
                        type="number"
                        value={k}
                        onChange={(e) => setK(parseInt(e.target.value) || 5)}
                        min="1"
                        max={vectorDB.getSize() || 10}
                        style={{ 
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #dee2e6',
                            borderRadius: '8px',
                            fontSize: '1rem'
                        }}
                    />
                </div>



                <div style={{ 
                    backgroundColor: '#fff3cd',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    border: '1px solid #ffeaa7'
                }}>
                    <strong>💡 참고:</strong> HNSW는 유클리드 거리만 지원합니다. 코사인 유사도가 필요한 경우 브루트포스 검색을 사용하세요.
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={handleSearch}
                        style={{ 
                            padding: '12px 24px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        🚀 HNSW 검색 실행
                    </button>
                    
                    <button 
                        onClick={startAnimatedSearchWithHistory}
                        disabled={isAnimating}
                        style={{ 
                            padding: '12px 24px',
                            backgroundColor: isAnimating ? '#6c757d' : '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isAnimating ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        🎬 검색 + 애니메이션
                    </button>
                    
                    {isAnimating && (
                        <button 
                            onClick={stopAnimation}
                            style={{ 
                                padding: '12px 24px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                            }}
                        >
                            ⏸️ 일시정지
                        </button>
                    )}
                    
                    <button 
                        onClick={resetAnimation}
                        style={{ 
                            padding: '12px 24px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        🔄 초기화
                    </button>
                </div>
            </div>

            {/* 애니메이션 상태 */}
            {isAnimating && searchSteps.length > 0 && (
                <div style={{ 
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #dee2e6'
                }}>
                    <h3 style={{ color: '#495057', marginBottom: '15px' }}>🔍 검색 진행 상황</h3>
                    
                    {/* 진행률 바 */}
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <strong>진행률:</strong>
                            <span>{Math.min(currentStep, searchSteps.length)} / {searchSteps.length}</span>
                        </div>
                        <div style={{ 
                            width: '100%',
                            height: '12px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <div style={{
                                width: `${Math.min((currentStep / searchSteps.length) * 100, 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #28a745, #20c997)',
                                transition: 'width 0.3s ease',
                                borderRadius: '6px'
                            }} />
                            <div style={{
                                position: 'absolute',
                                top: '0',
                                left: `${Math.min((currentStep / searchSteps.length) * 100, 100)}%`,
                                width: '4px',
                                height: '100%',
                                backgroundColor: '#fff',
                                borderRadius: '2px',
                                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                transform: 'translateX(-50%)'
                            }} />
                        </div>
                    </div>

                    {/* 현재 단계 정보 */}
                    {searchSteps[currentStep] && currentStep < searchSteps.length && (
                        <div style={{ 
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6',
                            position: 'relative'
                        }}>
                            {/* 단계 타입별 아이콘 */}
                            <div style={{ 
                                position: 'absolute',
                                top: '10px',
                                right: '15px',
                                fontSize: '24px'
                            }}>
                                {(() => {
                                    const step = searchSteps[currentStep];
                                    switch (step.type) {
                                        case 'level_start':
                                            return '🚀';
                                        case 'visit_node':
                                            return '📍';
                                        case 'check_neighbor':
                                            return '🔍';
                                        case 'add_neighbor':
                                            return '➕';
                                        case 'remove_neighbor':
                                            return '➖';
                                        case 'level_end':
                                            return '✅';
                                        default:
                                            return '🔍';
                                    }
                                })()}
                            </div>

                            {/* 단계 타입별 색상 테두리 */}
                            <div style={{
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                right: '0',
                                height: '4px',
                                backgroundColor: (() => {
                                    const step = searchSteps[currentStep];
                                    switch (step.type) {
                                        case 'level_start':
                                            return '#007bff';
                                        case 'visit_node':
                                            return '#28a745';
                                        case 'check_neighbor':
                                            return '#17a2b8';
                                        case 'add_neighbor':
                                            return '#ffc107';
                                        case 'remove_neighbor':
                                            return '#dc3545';
                                        case 'level_end':
                                            return '#6f42c1';
                                        default:
                                            return '#6c757d';
                                    }
                                })(),
                                borderTopLeftRadius: '8px',
                                borderTopRightRadius: '8px'
                            }} />

                            <div style={{ paddingRight: '40px' }}>
                                <div style={{ 
                                    fontSize: '1.1em', 
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    color: '#495057'
                                }}>
                                    {searchSteps[currentStep].message}
                                </div>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '15px',
                                    fontSize: '0.9em',
                                    marginBottom: '15px'
                                }}>
                                    {/* 현재 처리 중인 노드 */}
                                    <div style={{ 
                                        padding: '10px',
                                        backgroundColor: '#fff3cd',
                                        borderRadius: '6px',
                                        border: '1px solid #ffeaa7'
                                    }}>
                                        <div style={{ 
                                            fontWeight: 'bold', 
                                            color: '#856404',
                                            marginBottom: '5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            🎯 현재 처리 중인 노드
                                        </div>
                                        <div style={{ 
                                            backgroundColor: '#fff',
                                            padding: '5px 8px',
                                            borderRadius: '4px',
                                            fontFamily: 'monospace',
                                            fontWeight: 'bold',
                                            color: '#856404',
                                            border: '1px solid #ffeaa7',
                                            marginBottom: '8px'
                                        }}>
                                            {(() => {
                                                const step = searchSteps[currentStep];
                                                switch (step.type) {
                                                    case 'level_start':
                                                        return `진입점: ${step.entryPoint}`;
                                                    case 'visit_node':
                                                        return `노드 ${step.node}`;
                                                    case 'check_neighbor':
                                                        return `노드 ${step.parentNode} → 이웃 ${step.node}`;
                                                    case 'add_neighbor':
                                                    case 'remove_neighbor':
                                                        return `노드 ${step.parentNode} → ${step.node}`;
                                                    case 'level_end':
                                                        return `레벨 ${step.level} 완료`;
                                                    default:
                                                        return '없음';
                                                }
                                            })()}
                                        </div>
                                        

                                    </div>

                                    {/* 후보 노드 목록 */}
                                    <div style={{ 
                                        padding: '10px',
                                        backgroundColor: '#d1ecf1',
                                        borderRadius: '6px',
                                        border: '1px solid #bee5eb'
                                    }}>
                                        <div style={{ 
                                            fontWeight: 'bold', 
                                            color: '#0c5460',
                                            marginBottom: '5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            📋 후보 노드 목록
                                        </div>
                                        <div style={{ 
                                            backgroundColor: '#fff',
                                            padding: '5px 8px',
                                            borderRadius: '4px',
                                            fontFamily: 'monospace',
                                            color: '#0c5460',
                                            border: '1px solid #bee5eb',
                                            minHeight: '20px'
                                        }}>
                                            {(() => {
                                                const step = searchSteps[currentStep];
                                                const candidates = step.candidates || [];
                                                return candidates.length > 0 ? 
                                                    candidates.join(', ') : 
                                                    '후보 없음';
                                            })()}
                                        </div>
                                    </div>

                                    {/* 방문한 노드 목록 */}
                                    <div style={{ 
                                        padding: '10px',
                                        backgroundColor: '#d4edda',
                                        borderRadius: '6px',
                                        border: '1px solid #c3e6cb'
                                    }}>
                                        <div style={{ 
                                            fontWeight: 'bold', 
                                            color: '#155724',
                                            marginBottom: '5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            ✅ 방문한 노드 목록
                                        </div>
                                        <div style={{ 
                                            backgroundColor: '#fff',
                                            padding: '5px 8px',
                                            borderRadius: '4px',
                                            fontFamily: 'monospace',
                                            color: '#155724',
                                            border: '1px solid #c3e6cb',
                                            minHeight: '20px',
                                            maxHeight: '60px',
                                            overflowY: 'auto'
                                        }}>
                                            {(() => {
                                                const step = searchSteps[currentStep];
                                                const visited = step.visited || [];
                                                return visited.length > 0 ? 
                                                    visited.join(', ') : 
                                                    '방문한 노드 없음';
                                            })()}
                                        </div>
                                    </div>




                                </div>



                                {/* 추가 정보 */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '10px',
                                    fontSize: '0.9em'
                                }}>
                                    {searchSteps[currentStep].level !== undefined && (
                                        <div style={{ color: '#6c757d' }}>
                                            <strong>현재 레벨:</strong> 
                                            <span style={{ 
                                                backgroundColor: '#007bff', 
                                                color: 'white',
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                marginLeft: '5px',
                                                fontWeight: 'bold'
                                            }}>
                                                {searchSteps[currentStep].level}
                                            </span>
                                        </div>
                                    )}
                                    



                                </div>



                                {/* 단계별 시각적 표현 */}
                                <div style={{ 
                                    marginTop: '15px',
                                    padding: '10px',
                                    backgroundColor: 'white',
                                    borderRadius: '6px',
                                    border: '1px solid #dee2e6'
                                }}>
                                    {(() => {
                                        const step = searchSteps[currentStep];
                                        switch (step.type) {
                                            case 'level_start':
                                                return (
                                                    <div style={{ textAlign: 'center', color: '#007bff' }}>
                                                        <div style={{ fontSize: '2em', marginBottom: '5px' }}>🚀</div>
                                                        <div>레벨 {step.level} 검색 시작</div>
                                                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                                                            진입점: {step.entryPoint} | EF: {step.ef}
                                                        </div>
                                                    </div>
                                                );
                                            case 'visit_node':
                                                return (
                                                    <div style={{ textAlign: 'center', color: '#28a745' }}>
                                                        <div style={{ fontSize: '2em', marginBottom: '5px' }}>📍</div>
                                                        <div>노드 {step.node} 방문</div>
                                                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                                                            거리: {step.currentDistance?.toFixed(4)}
                                                            {step.checkedNeighbors && step.checkedNeighbors.length > 0 && (
                                                                <span> | {step.checkedNeighbors.length}개 이웃 확인 예정</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            case 'check_neighbor':
                                                return (
                                                    <div style={{ textAlign: 'center', color: '#17a2b8' }}>
                                                        <div style={{ fontSize: '2em', marginBottom: '5px' }}>🔍</div>
                                                        <div>이웃 {step.node} 확인</div>
                                                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                                                            거리: {step.distance?.toFixed(4)} | {step.neighborIndex + 1}/{step.totalNeighbors}
                                                        </div>
                                                    </div>
                                                );
                                            case 'add_neighbor':
                                                return (
                                                    <div style={{ textAlign: 'center', color: '#ffc107' }}>
                                                        <div style={{ fontSize: '2em', marginBottom: '5px' }}>➕</div>
                                                        <div>이웃 {step.node} 추가</div>
                                                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                                                            부모: {step.parentNode} | 거리: {step.distance?.toFixed(4)}
                                                        </div>
                                                    </div>
                                                );
                                            case 'remove_neighbor':
                                                return (
                                                    <div style={{ textAlign: 'center', color: '#dc3545' }}>
                                                        <div style={{ fontSize: '2em', marginBottom: '5px' }}>➖</div>
                                                        <div>이웃 {step.node} 제거</div>
                                                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                                                            부모: {step.parentNode} | 이유: {step.reason || 'EF 제한'}
                                                        </div>
                                                    </div>
                                                );
                                            case 'level_end':
                                                return (
                                                    <div style={{ textAlign: 'center', color: '#6f42c1' }}>
                                                        <div style={{ fontSize: '2em', marginBottom: '5px' }}>✅</div>
                                                        <div>레벨 {step.level} 검색 완료</div>
                                                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                                                            {step.finalResults?.length || 0}개 노드 방문
                                                        </div>
                                                    </div>
                                                );
                                            default:
                                                return null;
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}



            {/* 메시지 */}
            {message && (
                <div style={{ 
                    padding: '15px', 
                    backgroundColor: message.includes('오류') ? '#f8d7da' : '#d4edda',
                    border: message.includes('오류') ? '1px solid #f5c6cb' : '1px solid #c3e6cb',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    color: message.includes('오류') ? '#721c24' : '#155724'
                }}>
                    {message}
                </div>
            )}

            {/* 2D HNSW 그래프 시각화 */}
            <HNSWGraph2D 
                key="hnsw-graph-fixed"
                vectors={vectorDB.getAllVectors()} 
                neighbors={hnswEngine.neighbors}
                highlightedNodes={highlightedNodes}
                currentNode={currentNode}
                candidateNodes={candidateNodes}
                visitedNodes={visitedNodes}
                neighborCheckNode={neighborCheckNode}
                currentNodeNeighbors={currentNodeNeighbors}
                currentLevel={currentLevel}
                queryVector={queryVector ? queryVector.split(',').map(v => parseFloat(v.trim())) : null}
                topResult={searchResults.length > 0 ? searchResults[0].id : null}
                isAnimationComplete={!isAnimating && searchSteps.length > 0 && currentStep >= searchSteps.length - 1}
                hnswEngine={hnswEngine}
                levelNodes={(() => {
                    const currentStepData = searchSteps[currentStep];
                    return currentStepData?.type === 'level_start' ? currentStepData.levelNodes : [];
                })()}
                levelConnections={(() => {
                    const currentStepData = searchSteps[currentStep];
                    const connections = currentStepData?.type === 'level_start' ? currentStepData.levelConnections : [];
                    console.log('🎨 HNSWGraph2D에 전달되는 levelConnections:', {
                        stepType: currentStepData?.type,
                        connectionsLength: connections.length,
                        connections: connections.slice(0, 5) // 처음 5개만
                    });
                    return connections;
                })()}
                isLevelStart={(() => {
                    const currentStepData = searchSteps[currentStep];
                    return currentStepData?.type === 'level_start';
                })()}
            />

            {/* 검색 과정 통계 */}
            {searchHistory && hnswEngine && hnswEngine.getSearchStats && (
                <div style={{ 
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #dee2e6',
                    marginTop: '20px'
                }}>
                    <h3 style={{ color: '#495057', marginBottom: '15px' }}>📊 검색 과정 통계</h3>
                    {engineStats ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <div><strong>검색 레벨 수:</strong> {engineStats.totalLevels}</div>
                            <div><strong>최종 레벨 단계 수:</strong> {engineStats.finalLevelSteps}</div>
                            <div><strong>총 방문 노드:</strong> {engineStats.totalVisitedNodes}</div>
                        </div>
                    ) : (
                        <div style={{ color: '#6c757d' }}>통계 정보를 가져올 수 없습니다.</div>
                    )}
                </div>
            )}

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
                <div style={{ 
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    marginTop: '20px'
                }}>
                    <h3 style={{ color: '#495057', marginBottom: '15px' }}>
                        🔍 검색 결과 ({searchResults.length}개, {searchTime.toFixed(2)}ms)
                    </h3>
                    <div style={{ 
                        maxHeight: '500px',
                        overflowY: 'auto'
                    }}>
                        {searchResults.map((result, index) => (
                            <div key={index} style={{
                                padding: '15px',
                                backgroundColor: index === 0 ? '#e8f5e8' : '#f8f9fa',
                                marginBottom: '10px',
                                borderRadius: '8px',
                                border: index === 0 ? '2px solid #4caf50' : '1px solid #e9ecef'
                            }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <strong>순위 {index + 1}</strong> | 
                                    <strong> ID:</strong> {result.id} | 
                                    <strong> 거리:</strong> {result.distance.toFixed(4)}
                                </div>
                                <div style={{ 
                                    fontFamily: 'monospace',
                                    backgroundColor: 'white',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    fontSize: '0.9em',
                                    overflowX: 'auto'
                                }}>
                                    [{result.vector.join(', ')}]
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default HNSWSearch; 