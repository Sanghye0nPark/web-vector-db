// 접근성 개선 유틸리티 함수들

// ARIA 라벨 생성
export const generateAriaLabel = (action, context = '') => {
    const labels = {
        'add-vector': '벡터 추가',
        'remove-vector': '벡터 삭제',
        'search': '벡터 검색',
        'clear-db': '데이터베이스 초기화',
        'initialize-db': '데이터베이스 초기화',
        'update-hnsw': 'HNSW 파라미터 업데이트',
        'generate-random': '임의 벡터 생성',
        'preview-vector': '벡터 미리보기'
    };
    
    const baseLabel = labels[action] || action;
    return context ? `${baseLabel} - ${context}` : baseLabel;
};

// 키보드 단축키 처리
export const handleKeyboardShortcut = (event, shortcuts) => {
    const { key, ctrlKey, altKey, shiftKey } = event;
    
    for (const [shortcut, handler] of Object.entries(shortcuts)) {
        const [shortcutKey, ...modifiers] = shortcut.split('+');
        
        const hasCtrl = modifiers.includes('ctrl') === ctrlKey;
        const hasAlt = modifiers.includes('alt') === altKey;
        const hasShift = modifiers.includes('shift') === shiftKey;
        const keyMatch = key.toLowerCase() === shortcutKey.toLowerCase();
        
        if (keyMatch && hasCtrl && hasAlt && hasShift) {
            event.preventDefault();
            handler();
            return true;
        }
    }
    
    return false;
};

// 포커스 관리
export const focusManager = {
    focusFirstInteractive: (container) => {
        const focusableElements = container.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    },
    
    focusLastInteractive: (container) => {
        const focusableElements = container.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
            focusableElements[focusableElements.length - 1].focus();
        }
    },
    
    trapFocus: (container) => {
        const focusableElements = container.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        
        container.addEventListener('keydown', handleTabKey);
        
        return () => {
            container.removeEventListener('keydown', handleTabKey);
        };
    }
};

// 스크린 리더 지원
export const screenReaderAnnounce = (message, priority = 'polite') => {
    // 기존 알림 제거
    const existingAnnouncement = document.getElementById('sr-announcement');
    if (existingAnnouncement) {
        existingAnnouncement.remove();
    }
    
    // 새 알림 생성
    const announcement = document.createElement('div');
    announcement.id = 'sr-announcement';
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    `;
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // 일정 시간 후 제거
    setTimeout(() => {
        if (announcement.parentNode) {
            announcement.parentNode.removeChild(announcement);
        }
    }, 1000);
};

// 색상 대비 검사
export const checkColorContrast = (foreground, background) => {
    // 간단한 대비 계산 (실제로는 더 복잡한 공식 사용)
    const getLuminance = (color) => {
        const rgb = color.match(/\d+/g).map(Number);
        const [r, g, b] = rgb.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    
    return {
        ratio: ratio.toFixed(2),
        passes: ratio >= 4.5, // WCAG AA 기준
        passesLarge: ratio >= 3.0 // 큰 텍스트용 기준
    };
};

// 접근성 검증
export const validateAccessibility = (element) => {
    const issues = [];
    
    // 이미지 alt 텍스트 검사
    const images = element.querySelectorAll('img');
    images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-label')) {
            issues.push(`이미지 ${index + 1}: alt 텍스트 또는 aria-label이 없습니다.`);
        }
    });
    
    // 버튼 텍스트 검사
    const buttons = element.querySelectorAll('button');
    buttons.forEach((button, index) => {
        if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
            issues.push(`버튼 ${index + 1}: 텍스트 또는 aria-label이 없습니다.`);
        }
    });
    
    // 폼 라벨 검사
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
        const hasLabel = input.labels && input.labels.length > 0;
        const hasAriaLabel = input.getAttribute('aria-label');
        const hasTitle = input.getAttribute('title');
        
        if (!hasLabel && !hasAriaLabel && !hasTitle) {
            issues.push(`입력 필드 ${index + 1}: 라벨이 없습니다.`);
        }
    });
    
    return {
        isValid: issues.length === 0,
        issues
    };
};

// 접근성 속성 헬퍼
export const accessibilityProps = {
    button: (label, description = '') => ({
        'aria-label': label,
        'aria-describedby': description ? `${label}-desc` : undefined,
        role: 'button',
        tabIndex: 0
    }),
    
    input: (label, required = false, error = '') => ({
        'aria-label': label,
        'aria-required': required,
        'aria-invalid': error ? 'true' : 'false',
        'aria-describedby': error ? `${label}-error` : undefined
    }),
    
    card: (title, description = '') => ({
        role: 'region',
        'aria-label': title,
        'aria-describedby': description ? `${title}-desc` : undefined
    })
}; 