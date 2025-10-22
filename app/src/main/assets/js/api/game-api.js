/**
 * 하이브리드 게임 API 클라이언트
 * 안드로이드 앱 환경에서는 apiBridge를, 웹 환경에서는 fetch를 사용하여 통신합니다.
 */

import apiBridge from '../apiBridge.js';

class GameAPI {
    constructor() {
        // `window.Android`의 존재 여부로 네이티브 브릿지 사용 가능 여부를 판단합니다.
        this.useBridge = typeof window.Android !== 'undefined';
        this.baseURL = 'http://localhost:8080/api'; // 웹 환경의 fetch를 위한 기본 URL
        this.playerId = this.generatePlayerId();

        console.log(`GameAPI 초기화. 브릿지 사용: ${this.useBridge}`);
    }

    /**
     * 플레이어 ID를 생성하거나 localStorage에서 불러옵니다.
     */
    generatePlayerId() {
        let playerId = localStorage.getItem('playerId');
        if (!playerId) {
            playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('playerId', playerId);
        }
        return playerId;
    }

    /**
     * API 요청을 환경에 따라 분기하여 처리하는 중앙 라우터 함수입니다.
     * @param {string} bridgeMethod - 호출할 네이티브 브릿지의 메소드 이름.
     * @param {Array<any>} bridgeArgs - 네이티브 메소드에 전달할 인자 배열.
     * @param {string} fetchUrl - 웹에서 fetch로 호출할 URL.
     * @param {object} fetchOptions - fetch 요청에 사용할 옵션.
     */
    async request(bridgeMethod, bridgeArgs, fetchUrl, fetchOptions) {
        if (this.useBridge) {
            // 안드로이드 환경: apiBridge를 통해 네이티브 메소드 호출
            return apiBridge.request(bridgeMethod, ...bridgeArgs);
        } else {
            // 웹 환경: fetch를 통해 직접 API 서버 호출
            const url = `${this.baseURL}${fetchUrl}`;
            const options = {
                headers: { 'Content-Type': 'application/json' },
                ...fetchOptions,
            };
            if (options.body) {
                options.body = JSON.stringify(options.body);
            }

            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }
                return await response.json();
            } catch (error) {
                console.error('API 요청 실패:', error);
                throw error;
            }
        }
    }

    // --- 각 API를 호출하는 메소드들 (이제 request 라우터를 사용) ---

    getPlayerPuzzles() {
        return this.request('getPlayerPuzzles', [this.playerId], `/puzzle/player/${this.playerId}`, {});
    }

    submitPuzzleAnswer(puzzleId, answer) {
        const body = { playerId: this.playerId, puzzleId, answer };
        return this.request('submitPuzzleAnswer', [body], '/puzzle/submit', { method: 'POST', body });
    }

    completePuzzle(puzzleId) {
        const params = new URLSearchParams({ playerId: this.playerId, puzzleId });
        return this.request('completePuzzle', [this.playerId, puzzleId], `/game/complete-puzzle?${params}`, { method: 'POST' });
    }

    resetProgress() {
        return this.request('resetProgress', [this.playerId], `/game/reset/${this.playerId}`, { method: 'POST' });
    }

    unlockAll() {
        return this.request('unlockAll', [this.playerId], `/game/unlock-all/${this.playerId}`, { method: 'POST' });
    }
    
    getGameInfo() {
        return this.request('getGameInfo', [], '/game/info', {});
    }

    // --- 기존 유틸리티 메소드들 ---

    getPlayerId() {
        return this.playerId;
    }

    resetPlayerId() {
        localStorage.removeItem('playerId');
        this.playerId = this.generatePlayerId();
        return this.playerId;
    }
}

// 다른 모듈에서 이 인스턴스를 사용할 수 있도록 export 합니다.
export default new GameAPI();
