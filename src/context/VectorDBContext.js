import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { VectorDB } from '../services/db';
import { BruteForceSearch } from '../services/bruteforce';
import { HNSW } from '../services/hnsw';

// VectorDB Context 생성
const VectorDBContext = createContext();

// 초기 상태
const initialState = {
    vectorDB: new VectorDB(2), // 기본 2차원으로 설정
    searchEngine: new BruteForceSearch(),
    hnswEngine: new HNSW(),
    isInitialized: false
};

// 액션 타입
const ACTIONS = {
    INITIALIZE_DB: 'INITIALIZE_DB',
    ADD_VECTOR: 'ADD_VECTOR',
    CLEAR_DB: 'CLEAR_DB',
    REMOVE_VECTOR: 'REMOVE_VECTOR',
    UPDATE_VECTOR: 'UPDATE_VECTOR'
};

// 리듀서
function vectorDBReducer(state, action) {
    switch (action.type) {
        case ACTIONS.INITIALIZE_DB:
            const newDBInit = new VectorDB(action.payload.dimensions);
            return {
                ...state,
                vectorDB: newDBInit,
                searchEngine: new BruteForceSearch(),
                hnswEngine: new HNSW(newDBInit.vectors),
                isInitialized: true
            };
        case ACTIONS.ADD_VECTOR:
            const newVectorDB = new VectorDB(state.vectorDB.getDimensions());
            // 기존 벡터들을 복사
            const existingVectors = state.vectorDB.getAllVectors();
            existingVectors.forEach(vector => newVectorDB.addVector([...vector]));
            // 새 벡터 추가
            newVectorDB.addVector([...action.payload.vector]);
            // HNSW 엔진 재구성
            const newHnswEngine = new HNSW(newVectorDB.vectors);
            for (let i = 0; i < newVectorDB.getSize(); i++) {
                newHnswEngine.addVector(newVectorDB.getVector(i), i);
            }
            return {
                ...state,
                vectorDB: newVectorDB,
                hnswEngine: newHnswEngine
            };
        case ACTIONS.CLEAR_DB:
            const clearedDB = new VectorDB(state.vectorDB.getDimensions());
            return {
                ...state,
                vectorDB: clearedDB,
                searchEngine: new BruteForceSearch(),
                hnswEngine: new HNSW(clearedDB.vectors),
                isInitialized: true
            };
        case ACTIONS.REMOVE_VECTOR:
            const newVectorDBRemove = new VectorDB(state.vectorDB.getDimensions());
            const vectorsAfterRemove = state.vectorDB.getAllVectors();
            vectorsAfterRemove.forEach((vector, index) => {
                if (index !== action.payload.index) {
                    newVectorDBRemove.addVector([...vector]);
                }
            });
            // HNSW 엔진 재구성
            const newHnswEngineRemove = new HNSW(newVectorDBRemove.vectors);
            for (let i = 0; i < newVectorDBRemove.getSize(); i++) {
                newHnswEngineRemove.addVector(newVectorDBRemove.getVector(i), i);
            }
            return {
                ...state,
                vectorDB: newVectorDBRemove,
                hnswEngine: newHnswEngineRemove
            };
        case ACTIONS.UPDATE_VECTOR:
            const newVectorDBUpdate = new VectorDB(state.vectorDB.getDimensions());
            const vectorsForUpdate = state.vectorDB.getAllVectors();
            vectorsForUpdate.forEach((vector, index) => {
                if (index === action.payload.index) {
                    newVectorDBUpdate.addVector([...action.payload.vector]);
                } else {
                    newVectorDBUpdate.addVector([...vector]);
                }
            });
            // HNSW 엔진 재구성
            const newHnswEngineUpdate = new HNSW(newVectorDBUpdate.vectors);
            for (let i = 0; i < newVectorDBUpdate.getSize(); i++) {
                newHnswEngineUpdate.addVector(newVectorDBUpdate.getVector(i), i);
            }
            return {
                ...state,
                vectorDB: newVectorDBUpdate,
                hnswEngine: newHnswEngineUpdate
            };
        default:
            return state;
    }
}

// Provider 컴포넌트
export function VectorDBProvider({ children }) {
    const [state, dispatch] = useReducer(vectorDBReducer, initialState);

    // Hook들을 최상위 레벨에서 정의
    const initializeDB = useCallback((dimensions) => {
        dispatch({ type: ACTIONS.INITIALIZE_DB, payload: { dimensions } });
    }, []);

    const addVector = useCallback((vector) => {
        dispatch({ type: ACTIONS.ADD_VECTOR, payload: { vector } });
    }, []);

    const clearDB = useCallback(() => {
        dispatch({ type: ACTIONS.CLEAR_DB });
    }, []);

    const removeVector = useCallback((index) => {
        dispatch({ type: ACTIONS.REMOVE_VECTOR, payload: { index } });
    }, []);

    const updateVector = useCallback((index, vector) => {
        dispatch({ type: ACTIONS.UPDATE_VECTOR, payload: { index, vector } });
    }, []);

    const search = useCallback((queryVector, k = 5, distanceType = 'euclidean', searchType = 'bruteforce') => {
        if (searchType === 'hnsw') {
            // HNSW 검색
            const results = state.hnswEngine.search(queryVector, k);
            return results.map(result => ({
                id: result.id,
                index: result.id,
                vector: result.vector,
                distance: result.distance,
                similarity: null
            }));
        } else {
            // 브루트포스 검색
            const vectors = state.vectorDB.getAllVectors();
            return state.searchEngine.search(vectors, queryVector, k, distanceType);
        }
    }, [state.hnswEngine, state.vectorDB, state.searchEngine]);

    const getSearchStats = useCallback((searchType = 'bruteforce') => {
        const vectors = state.vectorDB.getAllVectors();
        if (searchType === 'hnsw') {
            return {
                totalVectors: vectors.length,
                dimensions: state.vectorDB.getDimensions(),
                searchType: 'HNSW',
                supportedDistanceTypes: ['euclidean']
            };
        } else {
            return state.searchEngine.getSearchStats(vectors, state.vectorDB.getDimensions());
        }
    }, [state.vectorDB, state.searchEngine]);

    const value = useMemo(() => ({
        vectorDB: state.vectorDB,
        searchEngine: state.searchEngine,
        hnswEngine: state.hnswEngine,
        isInitialized: state.isInitialized,
        initializeDB,
        addVector,
        clearDB,
        removeVector,
        updateVector,
        search,
        getSearchStats
    }), [state, initializeDB, addVector, clearDB, removeVector, updateVector, search, getSearchStats]);

    return (
        <VectorDBContext.Provider value={value}>
            {children}
        </VectorDBContext.Provider>
    );
}

// Custom Hook
export function useVectorDB() {
    const context = useContext(VectorDBContext);
    if (!context) {
        throw new Error('useVectorDB must be used within a VectorDBProvider');
    }
    return context;
} 