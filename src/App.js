import './App.css';
import { VectorDBProvider } from './context/VectorDBContext';
import VectorDBInterface from './components/VectorDBInterface';
import BruteForceSearch from './components/BruteForceSearch';
import HNSWSearch from './components/HNSWSearch';
import VectorAdd from './components/VectorAdd';
import Button from './components/common/Button';
import { useState } from 'react';
import { commonStyles } from './styles/common';

function App() {
  const [activeTab, setActiveTab] = useState('manage');

  const tabs = [
    { id: 'manage', label: '📊 벡터 관리', variant: 'primary' },
    { id: 'add', label: '➕ 벡터 추가', variant: 'primary' },
    { id: 'bruteforce', label: '🔍 브루트포스 검색', variant: 'danger' },
    { id: 'hnsw', label: '🚀 HNSW 검색', variant: 'success' }
  ];

  return (
    <VectorDBProvider>
      <div className="App">
        <header className="App-header">
          <h1>VectorDB 시스템</h1>
          <div style={commonStyles.tabContainer}>
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? tab.variant : 'secondary'}
                onClick={() => setActiveTab(tab.id)}
                style={commonStyles.tabButton(activeTab === tab.id, tab.variant)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </header>
        <main>
          {activeTab === 'manage' && <VectorDBInterface />}
          {activeTab === 'add' && <VectorAdd />}
          {activeTab === 'bruteforce' && <BruteForceSearch />}
          {activeTab === 'hnsw' && <HNSWSearch />}
        </main>
      </div>
    </VectorDBProvider>
  );
}

export default App;
