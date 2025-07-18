import React, { useState } from 'react';
import { useVectorDB } from '../context/VectorDBContext';
import Button from './common/Button';
import Input from './common/Input';
import Card from './common/Card';
import Message from './common/Message';
import { validateDimensions, validateHNSWParams } from '../utils/validation';
import { commonStyles, createResponsiveGrid } from '../styles/common';

function VectorDBInterface() {
    const { vectorDB, isInitialized, initializeDB, clearDB, hnswEngine } = useVectorDB();
    const [dimensions, setDimensions] = useState(2);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [activeTab, setActiveTab] = useState('main');
    
    // HNSW 파라미터 상태
    const [efSearch, setEfSearch] = useState(hnswEngine?.efSearch || 50);
    const [efConstruction, setEfConstruction] = useState(hnswEngine?.efConstruction || 100);
    const [m, setM] = useState(hnswEngine?.m || 16);

    const showMessage = (text, type = 'info') => {
        setMessage(text);
        setMessageType(type);
    };

    const handleInitialize = () => {
        const validation = validateDimensions(dimensions);
        if (!validation.isValid) {
            showMessage(validation.error, 'error');
            return;
        }
        initializeDB(validation.dimensions);
        showMessage(`VectorDB가 ${validation.dimensions}차원으로 초기화되었습니다.`, 'success');
    };

    const handleClear = () => {
        clearDB();
        showMessage('VectorDB가 초기화되었습니다.', 'success');
    };

    const handleUpdateHNSWParams = () => {
        const validation = validateHNSWParams(efSearch, efConstruction, m);
        if (!validation.isValid) {
            showMessage(validation.errors.join(', '), 'error');
            return;
        }

        if (hnswEngine && typeof hnswEngine.setEfSearch === 'function') {
            const success1 = hnswEngine.setEfSearch(efSearch);
            const success2 = hnswEngine.setEfConstruction(efConstruction);
            const success3 = hnswEngine.setM(m);
            
            if (success1 && success2 && success3) {
                showMessage(`HNSW 파라미터가 업데이트되었습니다. (efSearch: ${efSearch}, efConstruction: ${efConstruction}, M: ${m})`, 'success');
            } else {
                showMessage('일부 파라미터 업데이트에 실패했습니다.', 'error');
            }
        } else {
            showMessage('HNSW 엔진이 초기화되지 않았거나 파라미터 설정 메서드가 없습니다.', 'warning');
        }
    };



    // 초기화되지 않은 경우 - 차원 입력 페이지
    if (!isInitialized) {
        return (
            <div style={commonStyles.container}>
                <Card
                    title="VectorDB 설정"
                    subtitle="벡터 데이터베이스를 사용하기 위해 차원을 설정해주세요."
                >
                    <div style={{ marginBottom: '30px' }}>
                        <Input
                            type="number"
                            value={dimensions}
                            onChange={(e) => setDimensions(parseInt(e.target.value) || 3)}
                            min="1"
                            max="2048"
                            label="벡터 차원 선택:"
                            style={{ 
                                width: '120px',
                                textAlign: 'center',
                                margin: '0 auto',
                                display: 'block'
                            }}
                        />
                        <p style={{ 
                            fontSize: '0.9rem', 
                            color: '#6c757d',
                            marginTop: '10px',
                            textAlign: 'center'
                        }}>
                            (1-2048 사이의 값)
                        </p>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <Button variant="primary" onClick={handleInitialize}>
                            VectorDB 시작하기
                        </Button>
                    </div>

                    {message && (
                        <Message type={messageType} onClose={() => setMessage('')}>
                            {message}
                        </Message>
                    )}
                </Card>
            </div>
        );
    }

    // 초기화된 경우 - 메인 Vector DB 페이지
    return (
        <div style={commonStyles.container}>
            <Card title="VectorDB 관리자">
                {message && (
                    <Message type={messageType} onClose={() => setMessage('')}>
                        {message}
                    </Message>
                )}
                
                {/* 탭 네비게이션 */}
                <div style={{ 
                    display: 'flex', 
                    borderBottom: '2px solid #dee2e6',
                    marginBottom: '30px'
                }}>
                    <Button
                        variant={activeTab === 'main' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('main')}
                        style={{
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === 'main' ? '2px solid #007bff' : 'none'
                        }}
                    >
                        📊 메인 관리
                    </Button>
                    <Button
                        variant={activeTab === 'hnsw' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('hnsw')}
                        style={{
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === 'hnsw' ? '2px solid #007bff' : 'none'
                        }}
                    >
                        ⚙️ HNSW 설정
                    </Button>
                </div>
                
                {/* 메인 관리 탭 */}
                {activeTab === 'main' && (
                    <>
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ color: '#495057', marginBottom: '15px' }}>벡터 관리</h3>
                            <p style={{ 
                                color: '#6c757d',
                                fontSize: '1rem',
                                marginBottom: '15px'
                            }}>
                                임의 벡터를 생성하려면 상단의 "벡터 추가" 탭을 사용하세요.
                            </p>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ color: '#495057', marginBottom: '15px' }}>현재 상태</h3>
                            <div style={{ 
                                backgroundColor: 'white',
                                padding: '20px',
                                borderRadius: '8px',
                                border: '1px solid #dee2e6'
                            }}>
                                <div style={createResponsiveGrid(2, '15px')}>
                                    <div>
                                        <strong>차원:</strong> {vectorDB.getDimensions()}
                                    </div>
                                    <div>
                                        <strong>저장된 벡터 수:</strong> {vectorDB.getSize()}
                                    </div>
                                </div>
                                
                                {vectorDB.getSize() > 0 && (
                                    <div style={{ marginTop: '20px' }}>
                                        <h4 style={{ color: '#495057', marginBottom: '10px' }}>저장된 벡터들:</h4>
                                        <div style={{ 
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            border: '1px solid #dee2e6',
                                            borderRadius: '4px',
                                            padding: '10px'
                                        }}>
                                            {vectorDB.vectors.map((vector, index) => (
                                                <div key={index} style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: '#f8f9fa',
                                                    marginBottom: '5px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e9ecef'
                                                }}>
                                                    <strong>벡터 {index + 1}:</strong> [{vector.join(', ')}]
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <Button variant="danger" onClick={handleClear}>
                                모든 데이터 삭제
                            </Button>
                        </div>
                    </>
                )}

                {/* HNSW 설정 탭 */}
                {activeTab === 'hnsw' && (
                    <>
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ color: '#495057', marginBottom: '15px' }}>HNSW 파라미터 설정</h3>
                            <p style={{ 
                                color: '#6c757d',
                                fontSize: '1rem',
                                marginBottom: '20px'
                            }}>
                                HNSW 알고리즘의 성능과 정확도를 조정할 수 있는 파라미터들을 설정하세요.
                            </p>
                        </div>

                        <div style={{ 
                            backgroundColor: 'white',
                            padding: '25px',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6',
                            marginBottom: '30px'
                        }}>
                            <div style={createResponsiveGrid(3, '20px')}>
                                <Input
                                    type="number"
                                    value={efSearch}
                                    onChange={(e) => setEfSearch(parseInt(e.target.value) || 50)}
                                    min="1"
                                    max="1000"
                                    label="efSearch (검색 시 후보 수):"
                                />
                                <Input
                                    type="number"
                                    value={efConstruction}
                                    onChange={(e) => setEfConstruction(parseInt(e.target.value) || 100)}
                                    min="1"
                                    max="1000"
                                    label="efConstruction (구성 시 후보 수):"
                                />
                                <Input
                                    type="number"
                                    value={m}
                                    onChange={(e) => setM(parseInt(e.target.value) || 16)}
                                    min="1"
                                    max="100"
                                    label="M (최대 연결 수):"
                                />
                            </div>
                            
                            <div style={{ marginTop: '20px' }}>
                                <p style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#6c757d',
                                    marginBottom: '15px'
                                }}>
                                    <strong>efSearch:</strong> 높을수록 정확하지만 느림 (기본값: 50)<br/>
                                    <strong>efConstruction:</strong> 높을수록 정확한 인덱스 구성 (기본값: 100)<br/>
                                    <strong>M:</strong> 각 노드의 최대 연결 수 (기본값: 16)
                                </p>
                                
                                <Button variant="primary" onClick={handleUpdateHNSWParams}>
                                    파라미터 업데이트
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}

export default VectorDBInterface; 