import React, { useState } from 'react';
import { useVectorDB } from '../context/VectorDBContext';
import Button from './common/Button';
import Input from './common/Input';
import Card from './common/Card';
import Message from './common/Message';
import { validateVectorInput, validateSearchParams } from '../utils/validation';
import { commonStyles, createResponsiveGrid } from '../styles/common';
import { measureSearchPerformance } from '../utils/performance';

function BruteForceSearch() {
    const { vectorDB, searchEngine, search, getSearchStats } = useVectorDB();
    const [queryVector, setQueryVector] = useState('');
    const [distanceType, setDistanceType] = useState('euclidean');
    const [k, setK] = useState(5);
    const [searchResults, setSearchResults] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [searchTime, setSearchTime] = useState(0);

    const showMessage = (text, type = 'info') => {
        setMessage(text);
        setMessageType(type);
    };

    const handleSearch = () => {
        try {
            const validation = validateVectorInput(queryVector, vectorDB.getDimensions());
            if (!validation.isValid) {
                showMessage(validation.error, 'error');
                return;
            }

            const searchValidation = validateSearchParams(k, distanceType);
            if (!searchValidation.isValid) {
                showMessage(searchValidation.errors.join(', '), 'error');
                return;
            }

            const performance = measureSearchPerformance(
                (vectors, query, k, distanceType) => search(query, k, distanceType, 'bruteforce'),
                vectorDB.getAllVectors(),
                validation.vector,
                k
            );

            setSearchResults(performance.results);
            setSearchTime(performance.executionTime);
            showMessage(
                `브루트포스 검색 완료: ${performance.results.length}개의 결과를 찾았습니다. (${performance.executionTime.toFixed(2)}ms)`,
                'success'
            );
        } catch (error) {
            showMessage(`검색 오류: ${error.message}`, 'error');
        }
    };

    // 임의 쿼리 벡터 생성 함수
    const generateRandomQueryVector = () => {
        const dimensions = vectorDB.getDimensions();
        const randomVector = [];
        
        for (let i = 0; i < dimensions; i++) {
            const randomValue = (Math.random() - 0.5) * 20;
            randomVector.push(parseFloat(randomValue.toFixed(3)));
        }
        
        setQueryVector(randomVector.join(', '));
    };

    const stats = getSearchStats();

    return (
        <div style={commonStyles.container}>
            <Card title="🔍 브루트포스 벡터 검색">
                {message && (
                    <Message type={messageType} onClose={() => setMessage('')}>
                        {message}
                    </Message>
                )}

                {/* 검색 통계 */}
                <div style={{ 
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #dee2e6'
                }}>
                    <h3 style={{ color: '#495057', marginBottom: '15px' }}>데이터베이스 통계</h3>
                    <div style={createResponsiveGrid(2, '15px')}>
                        <div><strong>총 벡터 수:</strong> {stats.totalVectors}</div>
                        <div><strong>차원:</strong> {stats.dimensions}</div>
                        <div><strong>검색 타입:</strong> {stats.searchType}</div>
                        <div><strong>지원 거리 측정:</strong> {stats.supportedDistanceTypes.join(', ')}</div>
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
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <Input
                                type="text"
                                value={queryVector}
                                onChange={(e) => setQueryVector(e.target.value)}
                                placeholder={`${vectorDB.getDimensions()}차원 벡터 (예: 1, 2, 3)`}
                                label="쿼리 벡터:"
                                style={{ flex: 1 }}
                            />
                            <Button
                                variant="secondary"
                                onClick={generateRandomQueryVector}
                                style={{
                                    padding: '12px 16px',
                                    fontSize: '0.9rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                🎲 임의 생성
                            </Button>
                        </div>
                    </div>

                    <div style={createResponsiveGrid(2, '15px')}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                거리 측정:
                            </label>
                            <select
                                value={distanceType}
                                onChange={(e) => setDistanceType(e.target.value)}
                                style={{ 
                                    width: '100%',
                                    padding: '10px',
                                    border: '2px solid #dee2e6',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="euclidean">유클리드 거리</option>
                                <option value="cosine">코사인 유사도</option>
                            </select>
                        </div>

                        <Input
                            type="number"
                            value={k}
                            onChange={(e) => setK(parseInt(e.target.value) || 5)}
                            min="1"
                            max={vectorDB.getSize() || 10}
                            label="K (결과 개수):"
                        />
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <Button variant="danger" onClick={handleSearch}>
                            🔍 브루트포스 검색 실행
                        </Button>
                    </div>
                </div>

                {/* 검색 결과 */}
                {searchResults.length > 0 && (
                    <div style={{ 
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid #dee2e6'
                    }}>
                        <h3 style={{ color: '#495057', marginBottom: '15px' }}>
                            검색 결과 (실행 시간: {searchTime.toFixed(2)}ms)
                        </h3>
                        
                        <div style={{ 
                            maxHeight: '400px',
                            overflowY: 'auto',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            padding: '10px'
                        }}>
                            {searchResults.map((result, index) => (
                                <div key={index} style={{
                                    padding: '12px',
                                    backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                                    marginBottom: '8px',
                                    borderRadius: '6px',
                                    border: '1px solid #e9ecef'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>순위 {index + 1}:</strong> 벡터 {result.index + 1}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                                            거리: {result.distance.toFixed(4)}
                                            {result.similarity !== null && (
                                                <span style={{ marginLeft: '10px' }}>
                                                    유사도: {(result.similarity * 100).toFixed(2)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        marginTop: '8px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        color: '#495057',
                                        backgroundColor: '#e9ecef',
                                        padding: '6px',
                                        borderRadius: '4px'
                                    }}>
                                        [{result.vector.join(', ')}]
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default BruteForceSearch; 