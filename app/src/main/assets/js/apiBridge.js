/**
 * Android Native와 JavaScript 간의 통신을 담당하는 브릿지입니다.
 * 모든 API 요청을 Promise 기반으로 처리하여 일관된 인터페이스를 제공합니다.
 */
const apiBridge = {
    /**
     * 네이티브 API를 호출하는 범용 요청 함수입니다.
     * @param {string} methodName - 호출할 Android Bridge의 메소드 이름 (예: 'getGameInfo').
     * @param {...any} args - 네이티브 메소드에 전달할 인자들.
     * @returns {Promise<any>} API 응답이 성공하면 resolve, 실패하면 reject되는 Promise.
     */
    request(methodName, ...args) {
        // 안드로이드 앱의 WebView에 "Android"라는 이름의 브릿지가 주입되었는지 확인합니다.
        if (!window.Android || typeof window.Android[methodName] !== 'function') {
            const errorMessage = `native 브릿지(window.Android) 또는 '${methodName}' 메소드를 찾을 수 없습니다. PC 웹 환경에서는 작동하지 않습니다.`;
            console.error(errorMessage);
            return Promise.reject(new Error(errorMessage));
        }

        return new Promise((resolve, reject) => {
            // 네이티브의 응답을 처리할 고유한 콜백 함수 이름을 만듭니다.
            const callbackName = `__native_callback_${methodName}_${Date.now()}`;

            // 네이티브에서 호출할 전역 콜백 함수를 window 객체에 정의합니다.
            window[callbackName] = (result, error) => {
                if (error) {
                    console.error(`네이티브 API 오류 (${methodName}):`, error);
                    try {
                        // 네이티브에서 받은 에러는 보통 JSON 문자열 형태일 수 있습니다.
                        reject(JSON.parse(error));
                    } catch (e) {
                        reject(error);
                    }
                } else {
                    resolve(result);
                }

                // 한 번 사용된 콜백 함수는 메모리 누수 방지를 위해 즉시 삭제합니다.
                delete window[callbackName];
            };

            try {
                // 객체 인자는 네이티브에서 처리하기 쉽도록 JSON 문자열로 변환합니다.
                const finalArgs = args.map(arg => 
                    (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg
                );
                
                // 준비된 인자들과 콜백 함수 이름을 함께 네이티브 메소드로 전달하여 호출합니다.
                window.Android[methodName](...finalArgs, callbackName);

            } catch (e) {
                console.error(`네이티브 브릿지 호출 중 예외 발생 (${methodName}):`, e);
                reject(e);
                delete window[callbackName]; // 예외 발생 시에도 콜백 함수를 정리합니다.
            }
        });
    }
};

// 다른 모듈(예: game-api.js)에서 이 브릿지를 사용할 수 있도록 export 합니다.
export default apiBridge;