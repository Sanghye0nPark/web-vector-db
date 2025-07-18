# Web Vector Database

웹 기반 벡터 데이터베이스 시스템으로, 브루트포스 검색과 HNSW(Hierarchical Navigable Small World) 알고리즘을 지원하는 React 애플리케이션입니다.

## 🚀 주요 기능

### 📊 벡터 관리
- 다차원 벡터 데이터 저장 및 관리
- 벡터 추가, 삭제, 수정 기능
- 실시간 벡터 통계 및 메모리 사용량 모니터링

### ➕ 벡터 추가
- 수동 벡터 입력 (쉼표로 구분된 숫자)
- 임의 벡터 자동 생성
- 벡터 미리보기 기능

### 🔍 브루트포스 검색
- 정확한 벡터 유사도 검색
- 유클리드 거리 및 코사인 유사도 지원
- 실시간 검색 성능 측정

### 🚀 HNSW 검색
- 고성능 근사 벡터 검색
- HNSW 알고리즘 파라미터 조정
- 2D 시각화 그래프 지원

## 🏗️ 프로젝트 구조

```
web-vector-db/
├── src/
│   ├── components/
│   │   ├── common/           # 재사용 가능한 공통 컴포넌트
│   │   │   ├── Button.js     # 버튼 컴포넌트
│   │   │   ├── Input.js      # 입력 필드 컴포넌트
│   │   │   ├── Card.js       # 카드 레이아웃 컴포넌트
│   │   │   └── Message.js    # 메시지 표시 컴포넌트
│   │   ├── VectorDBInterface.js  # 벡터 DB 관리 인터페이스
│   │   ├── VectorAdd.js      # 벡터 추가 컴포넌트
│   │   ├── BruteForceSearch.js   # 브루트포스 검색 컴포넌트
│   │   ├── HNSWSearch.js     # HNSW 검색 컴포넌트
│   │   └── HNSWGraph2D.js    # HNSW 2D 시각화 컴포넌트
│   ├── context/
│   │   └── VectorDBContext.js    # 전역 상태 관리
│   ├── services/
│   │   ├── db.js            # 벡터 데이터베이스 서비스
│   │   ├── bruteforce.js    # 브루트포스 검색 서비스
│   │   └── hnsw.js          # HNSW 검색 서비스
│   ├── styles/
│   │   └── common.js        # 공통 스타일 시스템
│   ├── utils/
│   │   ├── validation.js    # 입력 검증 유틸리티
│   │   ├── performance.js   # 성능 최적화 유틸리티
│   │   └── accessibility.js # 접근성 개선 유틸리티
│   └── App.js               # 메인 애플리케이션 컴포넌트
```

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: #007bff (파란색)
- **Success**: #28a745 (초록색)
- **Danger**: #dc3545 (빨간색)
- **Warning**: #ffc107 (노란색)
- **Info**: #17a2b8 (청록색)
- **Gray Scale**: 100-900 단계별 회색

### 스페이싱
- **xs**: 5px
- **sm**: 10px
- **md**: 15px
- **lg**: 20px
- **xl**: 30px
- **xxl**: 40px

### 컴포넌트 스타일
- 일관된 버튼, 입력 필드, 카드 디자인
- 반응형 그리드 시스템
- 접근성을 고려한 색상 대비

## 🔧 기술 스택

- **Frontend**: React 19.1.0
- **State Management**: React Context API + useReducer
- **Styling**: CSS-in-JS (인라인 스타일)
- **Vector Algorithms**: 
  - Brute Force Search
  - HNSW (Hierarchical Navigable Small World)
- **Performance**: 메모이제이션, 디바운싱, 배치 처리

## 🚀 시작하기

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm start
```

### 빌드
```bash
npm run build
```

## 📋 사용법

### 1. VectorDB 초기화
1. "📊 벡터 관리" 탭으로 이동
2. 원하는 차원 수 입력 (1-2048)
3. "VectorDB 시작하기" 클릭

### 2. 벡터 추가
1. "➕ 벡터 추가" 탭으로 이동
2. 수동 입력 또는 임의 생성 선택
3. 벡터 데이터 입력 후 추가

### 3. 벡터 검색
1. "🔍 브루트포스 검색" 또는 "🚀 HNSW 검색" 탭 선택
2. 쿼리 벡터 입력
3. 검색 파라미터 설정
4. 검색 실행

## 🔍 검색 알고리즘

### 브루트포스 검색
- **장점**: 100% 정확한 결과
- **단점**: O(n) 시간 복잡도
- **사용 시기**: 작은 데이터셋, 정확도가 중요한 경우

### HNSW 검색
- **장점**: O(log n) 시간 복잡도, 빠른 검색
- **단점**: 근사 결과 (99%+ 정확도)
- **사용 시기**: 큰 데이터셋, 속도가 중요한 경우

## ⚡ 성능 최적화

### 메모이제이션
- 벡터 거리 계산 결과 캐싱
- 컴포넌트 리렌더링 최적화
- Context API 성능 개선

### 배치 처리
- 대량 벡터 처리 시 비동기 배치 처리
- UI 블로킹 방지

### 메모리 관리
- 벡터 데이터 압축
- 메모리 사용량 모니터링
- 가비지 컬렉션 최적화

## ♿ 접근성

### WCAG 2.1 AA 준수
- 키보드 네비게이션 지원
- 스크린 리더 호환성
- 색상 대비 검증
- ARIA 속성 적용

### 사용자 경험
- 직관적인 인터페이스
- 명확한 에러 메시지
- 로딩 상태 표시
- 반응형 디자인

## 🧪 검증 시스템

### 입력 검증
- 벡터 차원 검증
- 숫자 형식 검증
- 범위 검증 (1-2048 차원)

### 데이터 품질 검사
- NaN 값 검사
- 무한대 값 검사
- 제로 벡터 검사

## 🔮 향후 계획

- [ ] TypeScript 마이그레이션
- [ ] 더 많은 벡터 알고리즘 추가 (LSH, IVF 등)
- [ ] 3D 시각화 지원
- [ ] 벡터 데이터 내보내기/가져오기
- [ ] 실시간 협업 기능
- [ ] 클라우드 저장소 연동

## 📝 라이선스

MIT License

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 생성해주세요.
