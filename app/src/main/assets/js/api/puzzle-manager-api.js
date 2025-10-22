/**
 * API 기반 퍼즐 매니저
 * localStorage를 활용하여 오프라인 진행률을 저장하고 복원합니다.
 */

import gameAPI from './game-api.js';

class PuzzleManagerAPI {
    constructor() {
        this.puzzleModal = document.getElementById('puzzleModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.puzzleContent = document.getElementById('puzzleContent');
        this.puzzleInput = document.getElementById('puzzleInput');
        this.submitBtn = document.getElementById('submitAnswer');
        this.closeBtn = document.getElementById('closeModal');
        this.currentPuzzleId = null;
        this.playerPuzzles = [];

        this.attachEventListeners();
        this.initializePuzzles();
    }

    /**
     * 퍼즐 상태 초기화: localStorage에서 먼저 로드하고, 없으면 서버에서 가져옵니다.
     */
    initializePuzzles() {
        const savedDataJSON = localStorage.getItem('playerPuzzles');
        let shouldFetchFromServer = true;

        if (savedDataJSON) {
            try {
                const savedData = JSON.parse(savedDataJSON);
                if (savedData.playerId === gameAPI.getPlayerId() && Array.isArray(savedData.puzzles)) {
                    this.playerPuzzles = savedData.puzzles;
                    console.log('localStorage에서 진행 상황을 복원했습니다.');
                    shouldFetchFromServer = false;
                }
            } catch (e) {
                console.error('localStorage 데이터 파싱 실패:', e);
                localStorage.removeItem('playerPuzzles');
            }
        }

        if (shouldFetchFromServer) {
            console.log('서버에서 최신 퍼즐 데이터를 가져옵니다.');
            this.loadPlayerPuzzles();
        }
    }

    /**
     * 플레이어 퍼즐 데이터를 서버에서 로드하고 localStorage에 저장합니다.
     */
    async loadPlayerPuzzles() {
        try {
            const puzzles = await gameAPI.getPlayerPuzzles();
            this.playerPuzzles = puzzles;
            console.log('서버로부터 퍼즐 데이터 로드 완료:', this.playerPuzzles);

            const dataToSave = {
                playerId: gameAPI.getPlayerId(),
                puzzles: this.playerPuzzles
            };
            localStorage.setItem('playerPuzzles', JSON.stringify(dataToSave));
            console.log('최신 진행 상황을 localStorage에 저장했습니다.');

        } catch (error) {
            console.error('퍼즐 데이터 로드 실패:', error);
            this.showError('퍼즐 데이터를 불러오는데 실패했습니다.');
        }
    }

    /**
     * 퍼즐 표시
     */
    async show(puzzleId, objectName = '오브젝트') {
        try {
            if (this.playerPuzzles.length === 0) await this.loadPlayerPuzzles();

            const puzzle = this.playerPuzzles.find(p => p.id === puzzleId);
            if (!puzzle) {
                this.showError('퍼즐을 찾을 수 없습니다.');
                return;
            }

            if (puzzle.isLocked) {
                this.showLockedMessage(puzzle.lockedMessage || '아직은 열 수 없습니다.');
                return;
            }

            if (puzzle.isCompleted) {
                this.showCompletedMessage(puzzle);
                return;
            }

            this.currentPuzzleId = puzzleId;
            this.modalTitle.textContent = puzzle.title;

            if (puzzle.type === 'info') {
                this.puzzleContent.innerHTML = `<p>${puzzle.question}</p>`;
                this.puzzleInput.style.display = 'none';
                this.submitBtn.style.display = 'none';
            } else if (puzzle.type.startsWith('html-')) {
                 this.puzzleInput.style.display = 'none';
                 this.submitBtn.style.display = 'none';
                 this.loadHtmlPuzzle(puzzle.path, puzzle.selector, this.getInitCallback(puzzle.id));
            } else {
                this.puzzleContent.innerHTML = `<p>${puzzle.question}</p>`;
                this.puzzleInput.style.display = 'block';
                this.submitBtn.style.display = 'block';
                this.puzzleInput.value = '';
                this.puzzleInput.focus();
            }

            this.puzzleModal.classList.add('show');
        } catch (error) {
            console.error('퍼즐 표시 실패:', error);
            this.showError('퍼즐을 불러오는데 실패했습니다.');
        }
    }

    /**
     * 정답 확인
     */
    async checkAnswer() {
        if (!this.currentPuzzleId) return;

        try {
            const userAnswer = this.puzzleInput.value.toLowerCase().trim();
            const response = await gameAPI.submitPuzzleAnswer(this.currentPuzzleId, userAnswer);

            if (response.success) {
                this.puzzleContent.innerHTML = `<p style="color: #00ff00;">✅ ${response.message}</p>`;
                this.puzzleInput.style.display = 'none';
                this.submitBtn.textContent = '다음';

                await this.completePuzzle(this.currentPuzzleId);

                this.submitBtn.onclick = () => {
                    this.hide();
                    if (response.nextScene) {
                        this.handleNextScene(response.nextScene);
                    }
                };
            } else {
                this.showFeedback(response.message || '정답이 아닙니다.', false);
            }
        } catch (error) {
            console.error('정답 확인 실패:', error);
            this.showError('정답 확인 중 오류가 발생했습니다.');
        }
    }

    /**
     * 퍼즐 완료 처리
     */
    async completePuzzle(puzzleId) {
        try {
            await gameAPI.completePuzzle(puzzleId);
            await this.loadPlayerPuzzles();
            console.log(`퍼즐 ${puzzleId} 완료 처리 및 상태 저장됨`);
        } catch (error) {
            console.error('퍼즐 완료 처리 실패:', error);
        }
    }

    /**
     * HTML 퍼즐 로드 (복원된 함수)
     */
    loadHtmlPuzzle(url, selector, callback) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const puzzleContainer = doc.querySelector(selector);
                if (puzzleContainer) {
                    this.puzzleContent.innerHTML = '';
                    this.puzzleContent.appendChild(puzzleContainer);
                    if (callback) setTimeout(callback, 50);
                } else {
                    this.showError('퍼즐 콘텐츠를 찾을 수 없습니다.');
                }
            })
            .catch(error => {
                console.error('HTML 퍼즐 로드 실패:', error);
                this.showError('퍼즐을 불러오는 데 실패했습니다.');
            });
    }

    /**
     * 퍼즐 ID에 맞는 초기화 콜백 반환 (복원된 함수)
     */
    getInitCallback(puzzleId) {
        const callbacks = {
            'chair-puzzle': this.initChairPuzzle.bind(this),
            'cabinet-puzzle': this.initCabinetPuzzle.bind(this),
            'mirror-puzzle': this.initMirrorPuzzle.bind(this),
        };
        return callbacks[puzzleId];
    }

    // --- 각 HTML 퍼즐 초기화 함수들 (복원) ---
    initChairPuzzle() { console.log('의자 퍼즐 초기화...'); /* 의자 퍼즐 로직 */ }
    initCabinetPuzzle() { console.log('캐비닛 퍼즐 초기화...'); /* 캐비닛 퍼즐 로직 */ }
    initMirrorPuzzle() { console.log('거울 퍼즐 초기화...'); /* 거울 퍼즐 로직 */ }

    /**
     * 다음 장면 처리 (복원된 함수)
     */
    handleNextScene(sceneType) {
        console.log(`다음 장면 처리: ${sceneType}`);
        // 예시: 특정 DOM 요소를 보여주거나 숨기는 등의 처리
    }
    
    /**
     * 사용자 피드백 표시 (개선된 함수)
     */
    showFeedback(message, isSuccess) {
        const feedbackId = 'temp-feedback-message';
        let feedbackElement = document.getElementById(feedbackId);
        if (feedbackElement) feedbackElement.remove();

        feedbackElement = document.createElement('p');
        feedbackElement.id = feedbackId;
        feedbackElement.textContent = isSuccess ? `✅ ${message}` : `❌ ${message}`;
        feedbackElement.style.color = isSuccess ? '#00ff00' : '#ff6b6b';
        
        this.puzzleContent.appendChild(feedbackElement);
        this.puzzleInput.value = '';
        this.puzzleInput.focus();
    }

    // --- 이하 헬퍼 함수들 ---

    hide() {
        this.puzzleModal.classList.remove('show');
        this.currentPuzzleId = null;
    }

    attachEventListeners() {
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.hide());
        if (this.puzzleModal) this.puzzleModal.addEventListener('click', (e) => { if (e.target === this.puzzleModal) this.hide(); });
        if (this.submitBtn) this.submitBtn.addEventListener('click', () => this.checkAnswer());
        // 'click' -> 'keypress' 로 수정
        if (this.puzzleInput) this.puzzleInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.checkAnswer(); });
    }

    showLockedMessage(message) {
        this.modalTitle.textContent = '잠김';
        this.puzzleContent.innerHTML = `<p>${message}</p>`;
        this.puzzleInput.style.display = 'none';
        this.submitBtn.textContent = '닫기';
        this.submitBtn.onclick = () => this.hide();
        this.puzzleModal.classList.add('show');
    }
    
    showCompletedMessage(puzzle) {
        this.modalTitle.textContent = puzzle.title;
        this.puzzleContent.innerHTML = `<p>이미 해결한 퍼즐입니다.</p>`;
        this.puzzleInput.style.display = 'none';
        this.submitBtn.textContent = '닫기';
        this.submitBtn.onclick = () => this.hide();
        this.puzzleModal.classList.add('show');
    }
    
    showError(message) {
        this.modalTitle.textContent = '오류';
        this.puzzleContent.innerHTML = `<p>${message}</p>`;
        this.puzzleInput.style.display = 'none';
        this.submitBtn.textContent = '닫기';
        this.submitBtn.onclick = () => this.hide();
        this.puzzleModal.classList.add('show');
    }
}

export default new PuzzleManagerAPI();
