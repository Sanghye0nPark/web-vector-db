import React, { useState } from 'react';
import { useVectorDB } from '../context/VectorDBContext';
import Button from './common/Button';
import Input from './common/Input';
import Card from './common/Card';
import Message from './common/Message';
import { validateDimensions } from '../utils/validation';
import { commonStyles, createResponsiveGrid } from '../styles/common';

function VectorAdd() {
    const { vectorDB, isInitialized, addVector } = useVectorDB();

    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [randomCount, setRandomCount] = useState(100);
    const [randomRange, setRandomRange] = useState(10);
    const [previewVector, setPreviewVector] = useState(null);

    const showMessage = (text, type = 'info') => {
        setMessage(text);
        setMessageType(type);
    };



    // 임의의 벡터 생성 함수
    const generateRandomVector = () => {
        const vector = [];
        for (let i = 0; i < vectorDB.getDimensions(); i++) {
            const randomValue = (Math.random() - 0.5) * 2 * randomRange;
            vector.push(parseFloat(randomValue.toFixed(3)));
        }
        return vector;
    };

    const handleAddRandomVectors = () => {
        const validation = validateDimensions(randomCount);
        if (!validation.isValid) {
            showMessage(validation.error, 'error');
            return;
        }

        const addedVectors = [];
        
        for (let i = 0; i < randomCount; i++) {
            const randomVector = generateRandomVector();
            addVector(randomVector);
            addedVectors.push(randomVector);
        }
        
        showMessage(`${randomCount}개의 임의 벡터가 생성되어 추가되었습니다.`, 'success');
    };

    const handlePreviewRandomVector = () => {
        if (!isInitialized) {
            showMessage('먼저 VectorDB를 초기화해주세요.', 'warning');
            return;
        }
        const randomVector = generateRandomVector();
        setPreviewVector(randomVector);
    };

    // 초기화되지 않은 경우
    if (!isInitialized) {
        return (
            <div style={commonStyles.container}>
                <Card
                    title="VectorDB 초기화 필요"
                    subtitle="벡터를 추가하기 전에 먼저 벡터 관리 페이지에서 VectorDB를 초기화해주세요."
                >
                    <div style={{ 
                        padding: '20px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <p style={{ margin: 0, color: '#495057' }}>
                            <strong>현재 상태:</strong> VectorDB가 초기화되지 않음
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div style={commonStyles.container}>
            <Card title="벡터 추가">
                {message && (
                    <Message type={messageType} onClose={() => setMessage('')}>
                        {message}
                    </Message>
                )}
                


                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#495057', marginBottom: '15px' }}>임의 벡터 생성</h3>
                    <div style={{ 
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                    }}>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '15px',
                            marginBottom: '15px'
                        }}>
                            <Input
                                type="number"
                                value={randomCount === '' ? '' : randomCount}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || val === undefined) {
                                        setRandomCount('');
                                    } else {
                                        setRandomCount(parseInt(val) || '');
                                    }
                                }}
                                min="1"
                                max="100"
                                label="생성할 벡터 수:"
                                placeholder="예: 5"
                            />
                            <Input
                                type="number"
                                value={randomRange}
                                onChange={(e) => setRandomRange(parseFloat(e.target.value) || 10)}
                                min="0.1"
                                max="100"
                                step="0.1"
                                label="값 범위:"
                            />
                        </div>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '10px', 
                            marginTop: '15px' 
                        }}>
                            <Button variant="primary" onClick={handleAddRandomVectors}>
                                임의 벡터 생성 및 추가
                            </Button>
                            <Button variant="secondary" onClick={handlePreviewRandomVector}>
                                미리보기
                            </Button>
                        </div>
                        
                        {previewVector && (
                            <div style={{ 
                                marginTop: '15px',
                                padding: '10px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <strong>미리보기:</strong> [{previewVector.join(', ')}]
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#495057', marginBottom: '15px' }}>벡터 통계</h3>
                    <div style={{ 
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                    }}>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '15px'
                        }}>
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <strong>총 벡터 수:</strong> {vectorDB.getSize()}
                            </div>
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <strong>차원:</strong> {vectorDB.getDimensions()}
                            </div>
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <strong>메모리 사용량:</strong> {Math.round(vectorDB.getSize() * vectorDB.getDimensions() * 8 / 1024 * 100) / 100} KB
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default VectorAdd; 