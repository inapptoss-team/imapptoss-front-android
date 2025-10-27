import { puzzles } from './puzzle-data.js';
import { showStageClearAnimation } from '../map/stage-clear.js';
import { makeDraggable } from '../map/drag-and-drop.js';

class PuzzleManager {
    constructor() {
        this.puzzleModal = document.getElementById('puzzleModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.puzzleContent = document.getElementById('puzzleContent');
        this.puzzleInput = document.getElementById('puzzleInput');
        this.submitBtn = document.getElementById('submitAnswer');
        this.closeBtn = document.getElementById('closeModal');
        this.currentPuzzleId = null;
        this.mapUpdateCallback = null; // 맵 업데이트 콜백 저장

        this.puzzleOrder = [
            'chair-puzzle',
            'storage-clue',
            'cabinet-puzzle',
            'paper-clue',
            'mirror-puzzle'
        ];

        this.currentProgress = this.loadProgress();

        this.attachEventListeners();
    }

    // 외부에서 맵 업데이트 콜백을 등록하는 함수
    registerMapUpdateCallback(callback) {
        this.mapUpdateCallback = callback;
    }

    showConfirmation(options) {
        const {
            title = '확인',
            message,
            confirmText = '예',
            cancelText = '아니오',
            onConfirm,
            onCancel
        } = options;

        this.modalTitle.textContent = title;
        this.puzzleContent.innerHTML = `<p style="text-align: center;">${message}</p>`;
        this.puzzleInput.style.display = 'none';
        this.submitBtn.style.display = 'inline-block';
        this.submitBtn.textContent = confirmText;

        const puzzleActions = this.submitBtn.parentElement;

        let cancelBtn = puzzleActions.querySelector('.cancel-btn-dynamic');
        if (cancelBtn) {
            cancelBtn.remove();
        }

        cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.className = 'submit-btn cancel-btn-dynamic';
        puzzleActions.appendChild(cancelBtn);

        const cleanup = () => {
            this.submitBtn.onclick = null;
            if(cancelBtn.parentNode) {
                cancelBtn.remove();
            }
            document.removeEventListener('keydown', keydownHandler);
            this.attachEventListeners();
        };

        const confirmHandler = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };

        const cancelHandler = () => {
            cleanup();
            this.hide();
            if (onCancel) onCancel();
        };

        const keydownHandler = (e) => {
            if (e.key === 'Enter') {
                confirmHandler();
            } else if (e.key === 'Escape') {
                cancelHandler();
            }
        };

        this.submitBtn.onclick = confirmHandler;
        cancelBtn.onclick = cancelHandler;
        document.addEventListener('keydown', keydownHandler);

        if (!this.puzzleModal.classList.contains('show')) {
            this.puzzleModal.classList.add('show');
        }
    }

    attachEventListeners() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        if (this.puzzleModal) {
            this.puzzleModal.addEventListener('click', (e) => {
                if (e.target === this.puzzleModal) {
                    this.hide();
                }
            });
        }
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', () => this.checkAnswer());
        }
        if (this.puzzleInput) {
            this.puzzleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.checkAnswer();
                }
            });
        }
    }

    show(puzzleId, objectName = '오브젝트', options = {}) {
        // 동적으로 추가된 '아니오' 버튼이 남아있을 경우를 대비해 제거
        const puzzleActions = this.submitBtn.parentElement;
        if (puzzleActions) {
            const existingCancelBtn = puzzleActions.querySelector('.cancel-btn-dynamic');
            if (existingCancelBtn) {
                existingCancelBtn.remove();
            }
        }

        const isLocked = this.isPuzzleLocked(puzzleId);

        if (isLocked) {
            this.showLockedWithHandler(puzzleId);
            return;
        }

        const puzzle = puzzles[puzzleId];
        if (!puzzle) {
            console.error(`Puzzle with id "${puzzleId}" not found.`);
            return;
        }

        if (puzzleId === 'mirror-puzzle' && !options.forceShow) {
            const isPaperAvailable = this.currentProgress.completedPuzzles.includes('cabinet-puzzle');
            const isSolved = this.currentProgress.completedPuzzles.includes(puzzleId);
            const paperUsed = localStorage.getItem('mirror-paper-used') === 'true';

            if (options.fromDrop) {
                if (!isPaperAvailable) {
                    this.showLockedWithHandler(puzzleId);
                    return;
                }
                if(isSolved){
                    this.show(puzzleId, objectName, { forceShow: true });
                    return;
                }

                this.showConfirmation({
                    title: '거울',
                    message: '종이를 거울에 비추시겠습니까?',
                    confirmText: '확인',
                    cancelText: '취소',
                    onConfirm: () => {
                        localStorage.setItem('mirror-paper-used', 'true');
                        this.show(puzzleId, objectName, { forceShow: true, usePaper: true });
                    }
                });
                return;
            }

            this.show(puzzleId, objectName, { forceShow: true, usePaper: paperUsed });
            return;
        }

        const isSolved = this.currentProgress.completedPuzzles.includes(puzzleId);

        const showContent = () => {
            this.currentPuzzleId = puzzleId;
            this.modalTitle.textContent = puzzle.title;

            const modalContent = document.querySelector('.modal-content');
            modalContent.classList.remove('image-clue-modal-style');
            if (puzzle.type === 'drag-drop' || puzzle.type === 'cabinet-lock' || puzzle.type === 'mirror-code') {
                modalContent.classList.add('has-puzzle');
            } else {
                modalContent.classList.remove('has-puzzle');
            }

            if (puzzle.type === 'clue') {
                this.puzzleContent.innerHTML = `<p style="font-size: 1.1rem; color: #a6d8ff;">${puzzle.question}</p>`;
                this.puzzleInput.style.display = 'none';
                this.submitBtn.style.display = 'none';
            } else if (puzzle.type === 'drag-drop') {
                 this.puzzleInput.style.display = 'none';
                 this.submitBtn.style.display = 'none';
                 this.loadHtmlPuzzle('../puzzles/puzzle01.html', '.chair-puzzle-container', objectName, () => this.initChairPuzzle(isSolved), false);
            } else if (puzzle.type === 'cabinet-lock') {
                 this.puzzleInput.style.display = 'none';
                 this.submitBtn.style.display = 'none';
                 this.loadHtmlPuzzle('../puzzles/puzzle02.html', '.cabinet-puzzle-container', objectName, () => this.initCabinetPuzzle(isSolved), false);
            } else if (puzzle.type === 'mirror-code') {
                 this.puzzleInput.style.display = 'none';
                 this.submitBtn.style.display = 'none';
                 this.loadHtmlPuzzle('../puzzles/puzzle03.html', '.mirror-puzzle-container', objectName, () => this.initMirrorPuzzle(isSolved, options), false);
            } else if (puzzle.type === 'storage-clue') {
                 this.puzzleInput.style.display = 'none';
                 this.submitBtn.style.display = 'none';
                 this.loadHtmlPuzzle('../puzzles/clue01.html', '.storage-clue-container', objectName, () => {
                     this.completePuzzle('storage-clue');
                 }, false);
            } else if (puzzle.type === 'paper-clue') {
                 this.puzzleInput.style.display = 'none';
                 this.submitBtn.style.display = 'none';
                 this.loadHtmlPuzzle('../puzzles/clue02.html', '.paper-clue-container', objectName, () => {
                     this.completePuzzle('paper-clue');
                 }, false);
            } else if (puzzle.type === 'periodic-table-clue') {
                 this.puzzleInput.style.display = 'none';
                 this.submitBtn.style.display = 'none';
                 this.loadHtmlPuzzle('../puzzles/clue03.html', '.periodic-table-clue-container', objectName, () => {
                     this.completePuzzle('periodic-table-clue');
                 }, false);
            } else {
                this.puzzleContent.innerHTML = `
                    <p>${puzzle.question}</p>`;
                this.puzzleInput.style.display = 'block';
                this.submitBtn.style.display = 'block';
                this.puzzleInput.value = '';
                this.submitBtn.textContent = '확인';
                this.submitBtn.onclick = null;
                this.puzzleInput.focus();
            }
            this.puzzleContent.style.opacity = '1';
        }

        if (this.puzzleModal.classList.contains('show')) {
            this.puzzleContent.style.opacity = '0';
            setTimeout(showContent, 300);
        } else {
            this.puzzleContent.style.opacity = '0';
            this.puzzleModal.classList.add('show');
            showContent();
        }
    }

    hide() {
        this.puzzleModal.classList.remove('show');
        this.currentPuzzleId = null;
    }

    checkAnswer() {
        if (!this.currentPuzzleId) return;

        const puzzle = puzzles[this.currentPuzzleId];
        const userAnswer = this.puzzleInput.value.toLowerCase().trim();
        const correctAnswer = puzzle.answer.toLowerCase();

        if (userAnswer === correctAnswer) {
            this.puzzleContent.innerHTML = `<p style="color: #00ff00; font-weight: bold;">✅ ${puzzle.successMessage}</p>`;
            this.puzzleInput.style.display = 'none';
            this.submitBtn.textContent = '다음으로';

            this.completePuzzle(this.currentPuzzleId);

            this.submitBtn.onclick = () => {
                this.hide();
                if (puzzle.nextScene) {
                    this.handleNextScene(puzzle.nextScene);
                }
            };
        } else {
            this.puzzleContent.innerHTML += `<p style="color: #ff6b6b; font-weight: bold;">❌ 틀렸습니다. 다시 시도해보세요.</p>`;
            this.puzzleInput.value = '';
            this.puzzleInput.focus();
        }
    }

    handleNextScene(sceneType) {
        console.log(`다음 장면: ${sceneType}`);

        if (sceneType === 'mirror-unlocked') {
            this.hide();

            sessionStorage.setItem('justCompletedMirror', 'true');

            showStageClearAnimation(
                '../img/학사복도.png',
                '🔓',
                '학사로 가는 길을 발견했습니다.',
                5000,
                () => {
                    window.location.href = '../index.html';
                }
            );
        }
    }

    loadHtmlPuzzle(url, selector, objectName, callback, transition = true) {
        const doLoad = () => {
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
                        if (callback) {
                            setTimeout(callback, 100);
                        }
                    } else {
                         this.puzzleContent.innerHTML = '<p>퍼즐 콘텐츠를 찾을 수 없습니다.</p>';
                    }
                    if (transition) {
                        this.puzzleContent.style.opacity = '1';
                    }
                })
                .catch(error => {
                    console.error('퍼즐 파일을 불러오는 데 실패했습니다:', error);
                    this.puzzleContent.innerHTML = '<p>퍼즐을 불러오는 데 실패했습니다.</p>';
                    if (transition) {
                        this.puzzleContent.style.opacity = '1';
                    }
                });
        }

        if (transition) {
            this.puzzleContent.style.opacity = '0';
            setTimeout(doLoad, 300);
        } else {
            doLoad();
        }
    }

    initChairPuzzle(isSolved = false) {
        const chairItems = document.querySelectorAll('.chair-item');
        const feedback = document.getElementById('puzzleFeedback');
        const tableCenter = document.querySelector('.table-center');
        const arrangementArea = document.querySelector('.arrangement-area');
        if (!chairItems.length || !feedback || !tableCenter || !arrangementArea) {
            console.error("Chair puzzle elements not found");
            return;
        }

        const puzzle = puzzles['chair-puzzle'];
        let chairStates = isSolved ? puzzle.answer.split('').map(Number) : [0, 0, 0, 0, 0, 0, 0, 0];

        const tableSize = 140;
        const R_INNER = tableSize * 0.22;
        const EJECT_DELTA = tableSize * 0.25;
        const R_OUTER = R_INNER + EJECT_DELTA;

        const tableCenterRect = tableCenter.getBoundingClientRect();
        const tableCenterX = tableCenterRect.left + tableCenterRect.width / 2;
        const tableCenterY = tableCenterRect.top + tableCenterRect.height / 2;

        const drawPixelCircles = () => {
            const canvas = document.getElementById('pixelCircle');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const canvasSize = 250;
            canvas.width = canvasSize;
            canvas.height = canvasSize;

            const centerX = canvasSize / 2;
            const centerY = canvasSize / 2;

            console.log('R_INNER:', R_INNER, 'R_OUTER:', R_OUTER);
            console.log('tableSize:', tableSize, 'canvasSize:', canvasSize);

            const drawPixelCircle = (radius, color) => {
                ctx.fillStyle = color;
                const pixelSize = 2;

                for (let angle = 0; angle < 2 * Math.PI; angle += 0.01) {
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;

                    ctx.fillRect(
                        Math.floor(x - pixelSize/2),
                        Math.floor(y - pixelSize/2),
                        pixelSize,
                        pixelSize
                    );
                }
            };

            const chairBaseRadius = (R_INNER / tableSize) * canvasSize * 0.9;
            const chairMoveRadius = (R_OUTER / tableSize) * canvasSize * 0.75;
            const chairThirdRadius = (R_OUTER / tableSize) * canvasSize * 0.85;

            console.log('Canvas radii:', chairBaseRadius, chairMoveRadius, chairThirdRadius);
            console.log('R_INNER:', R_INNER, 'R_OUTER:', R_OUTER);

            drawPixelCircle(chairBaseRadius, '#c4eaeb');

            drawPixelCircle(chairMoveRadius, '#c4eaeb');

            drawPixelCircle(chairThirdRadius, '#c4eaeb');
        };

        const dropZones = document.querySelectorAll('.drop-zone');
        dropZones.forEach((dropZone, index) => {
            const angle = (index * 2 * Math.PI) / 8;
            const x = Math.cos(angle) * R_INNER;
            const y = Math.sin(angle) * R_INNER;

            const leftPercent = 50 + (x / (tableSize * 0.625)) * 100;
            const topPercent = 50 + (y / (tableSize * 0.625)) * 100;

            dropZone.style.left = `${leftPercent}%`;
            dropZone.style.top = `${topPercent}%`;
            dropZone.style.transform = 'translate(-50%, -50%)';

            if (index === 0) {
                console.log('Drop-zone 0 position:', leftPercent, topPercent);
                console.log('Calculated from:', x, y, 'angle:', angle);
            }
        });

        const updateUI = () => {
            if (isSolved) {
                feedback.innerHTML = `CODE: ${chairStates.join('')}<br><br>이미 완료된 퍼즐입니다`;
                feedback.className = 'puzzle-feedback success show';
            } else {
                feedback.textContent = `CODE: ${chairStates.join('')}`;
            }

            chairItems.forEach((chair) => {
                const chairNum = parseInt(chair.dataset.chair);
                const state = chairStates[chairNum - 1];
                const targetZone = document.querySelector(`.drop-zone[data-position="${chairNum}"]`);

                if (targetZone && !targetZone.contains(chair)) {
                    targetZone.appendChild(chair);
                }

                if (state === 1) {
                    const chairIndex = chairNum - 1;
                    const angle = (chairIndex * 2 * Math.PI) / 8;

                    const translateX = Math.cos(angle) * EJECT_DELTA;
                    const translateY = Math.sin(angle) * EJECT_DELTA;

                    chair.style.transform = `translate(${translateX}px, ${translateY}px)`;
                } else {
                    chair.style.transform = 'translate(0px, 0px)';
                }
            });
        };

        const checkCompletion = () => {
            const puzzle = puzzles['chair-puzzle'];
            if (chairStates.join('') === puzzle.answer) {
                this.completePuzzle('chair-puzzle');

                this.showNotification('창고에서 무슨 소리가 난 것 같다.');

                setTimeout(() => {
                    this.hide();
                    if (puzzle.nextScene) {
                        this.handleNextScene(puzzle.nextScene);
                    }
                }, 1500);
            }
        };

        chairItems.forEach(chair => {
            chair.addEventListener('click', () => {
                if (isSolved) return;
                const chairNum = parseInt(chair.dataset.chair);
                chairStates[chairNum - 1] = 1 - chairStates[chairNum - 1];
                updateUI();
            });
        });

        const confirmBtn = document.getElementById('confirmChairPuzzle');
        if (confirmBtn) {
            if (isSolved) {
                confirmBtn.style.display = 'none';
            } else {
                confirmBtn.addEventListener('click', checkCompletion);
            }
        }

        if (tableCenter) {
            tableCenter.style.cursor = 'pointer';

            setTimeout(() => {
                tableCenter.classList.add('shining-effect');
                setTimeout(() => {
                    tableCenter.classList.remove('shining-effect');
                }, 3000);
            }, 2000);

            tableCenter.addEventListener('click', () => {
                const existingOverlay = document.querySelector('.hint-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                    return;
                }

                const overlay = document.createElement('div');
                overlay.className = 'hint-overlay';
                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease-out;
                `;

                const hintBox = document.createElement('div');
                hintBox.className = 'hint-box';
                hintBox.style.cssText = `
                    position: relative;
                    background: linear-gradient(135deg, rgba(26, 42, 71, 0.9), rgba(16, 32, 51, 0.95));
                    border: 2px solid rgba(100, 180, 255, 0.4);
                    border-radius: 15px;
                    padding: 2.5rem 1.5rem 1.5rem 1.5rem;
                    max-width: 85%;
                    width: auto;
                    text-align: center;
                    color: #e6f3ff;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    box-shadow:
                        0 0 20px rgba(57, 127, 255, 0.5),
                        0 20px 60px rgba(0, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    animation: scaleIn 0.3s ease-out;
                    backdrop-filter: blur(5px);
                `;

                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '×';
                closeBtn.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: #a0b0c0;
                    font-size: 1.8rem;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.7;
                    transition: opacity 0.2s, color 0.2s;
                    line-height: 1;
                `;

                closeBtn.addEventListener('mouseenter', () => {
                    closeBtn.style.opacity = '1';
                    closeBtn.style.color = '#e0e8f0';
                });

                closeBtn.addEventListener('mouseleave', () => {
                    closeBtn.style.opacity = '0.7';
                    closeBtn.style.color = '#a0b0c0';
                });

                const closeHint = () => {
                    overlay.style.opacity = '0';
                    overlay.style.transition = 'opacity 0.2s ease-out';
                    setTimeout(() => {
                        overlay.remove();
                    }, 200);
                };

                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeHint();
                });

                const hintText = document.createElement('p');
                hintText.textContent = '책상 위에는 ‘시계의 두 손이 가리키는 곳, 9시와 3시는 비워두어야 한다…’ 라고 적힌 메모가 놓여 있다.';
                hintText.style.cssText = `
                    margin: 0;
                    word-break: keep-all;
                    word-wrap: break-word;
                `;

                hintBox.appendChild(closeBtn);
                hintBox.appendChild(hintText);
                overlay.appendChild(hintBox);

                const modalBody = this.puzzleContent.closest('.modal-body');
                if (modalBody) {
                    modalBody.style.position = 'relative';
                    modalBody.appendChild(overlay);
                } else {
                    this.puzzleContent.style.position = 'relative';
                    this.puzzleContent.appendChild(overlay);
                }

                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        closeHint();
                    }
                });
            });
        }

        drawPixelCircles();

        updateUI();
    }

    showNotification(message, duration = 3000) {
        const existingToast = document.querySelector('.notification-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = message.replace(/\n/g, '<br>');
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    initCabinetPuzzle(isSolved = false) {
        const elementButtons = document.querySelectorAll('.element-btn');
        const feedback = document.getElementById('puzzleFeedback');
        const elementChoices = document.getElementById('elementChoices');
        const lockImage = document.getElementById('lockImage');

        if (!elementButtons.length || !feedback || !elementChoices) {
            console.error("Cabinet puzzle elements not found");
            return;
        }

        const puzzle = puzzles['cabinet-puzzle'];
        let isAnswered = isSolved;

        if (isSolved) {
            elementButtons.forEach(btn => {
                if (btn.dataset.element === puzzle.answer) {
                    btn.classList.add('selected');
                }
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.7';
            });
            feedback.textContent = '이미 완료된 퍼즐입니다';
            feedback.className = 'puzzle-feedback success show';
            return;
        }

        elementButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (isAnswered) return;

                const selectedElement = button.dataset.element;

                elementButtons.forEach(btn => {
                    btn.classList.remove('selected', 'wrong');
                });

                button.classList.add('selected');

                if (selectedElement === puzzle.answer) {
                    isAnswered = true;

                    elementChoices.style.display = 'none';

                    feedback.textContent = '';
                    feedback.className = 'puzzle-feedback success';

                    setTimeout(() => {
                        if (lockImage) {
                            lockImage.style.opacity = '0';
                            lockImage.style.transition = 'opacity 0.5s ease';

                            setTimeout(() => {
                                lockImage.src = '../img/부식된자물쇠.png';
                                lockImage.style.opacity = '1';
                                feedback.textContent = ` ${puzzle.successMessage}`;
                                feedback.classList.add('show', 'hint-message');

                                this.completePuzzle('cabinet-puzzle');
                            }, 500);
                        }
                    }, 1000);

                    setTimeout(() => {
                        this.hide();
                        if (puzzle.nextScene) {
                            this.handleNextScene(puzzle.nextScene);
                        }
                    }, 3500);
                } else {
                    button.classList.remove('selected');
                    button.classList.add('wrong');

                    setTimeout(() => {
                        button.classList.remove('wrong');
                    }, 500);
                }
            });
        });
    }

    initMirrorPuzzle(isSolved = false, options = {}) {
        const feedback = document.getElementById('puzzleFeedback');
        const codeInput = document.getElementById('mirrorCodeInput');
        const confirmBtn = document.getElementById('confirmMirrorPuzzle');

        if (!feedback || !codeInput || !confirmBtn) {
            console.error("Mirror puzzle elements not found");
            return;
        }

        if (isSolved) {
            options.usePaper = true;
        }

        if (options.usePaper) {
            const mirrorTitle = document.querySelector('.mirror-puzzle-container h3');
            const mirrorDescription = document.querySelector('.mirror-puzzle-container p');

            if (mirrorTitle) mirrorTitle.textContent = '거울에 비친 종이';
            if (mirrorDescription) mirrorDescription.textContent = '거울에 비친 종이에는 다음과 같이 적혀있다.';

            const hint = document.getElementById('flippedPaperHint');
            if (hint) {
                hint.style.display = 'block';
            }
            const mirrorImageContainer = document.querySelector('.mirror-image-container');
            if (mirrorImageContainer) {
                mirrorImageContainer.style.display = 'none';
            }
        } else if (options.usePaper === false) {
            codeInput.style.display = 'none';
            confirmBtn.style.display = 'none';
        }

        const puzzle = puzzles['mirror-puzzle'];
        let isAnswered = isSolved;

        if (isSolved) {
            const answer = puzzle.answer;
            let formattedAnswer = '';
            for (let i = 0; i < answer.length; i++) {
                if (i > 0) {
                    formattedAnswer += ' ';
                }
                formattedAnswer += answer[i];
            }
            codeInput.value = formattedAnswer;
            codeInput.disabled = true;
            confirmBtn.style.display = 'none';
            feedback.innerHTML = 'STAGE 1 CLEAR<br>실험실을 탈출했습니다!';
            feedback.className = 'puzzle-feedback success show';
            feedback.style.whiteSpace = 'nowrap';
            return;
        }

        codeInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');

            if (value.length > 0) {
                let formattedValue = '';
                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i < value.length) {
                        formattedValue += ' ';
                    }
                    formattedValue += value[i];
                }
                e.target.value = formattedValue;
            } else {
                e.target.value = '';
            }
        });

        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const numericValue = codeInput.value.replace(/\s/g, '');
                if (numericValue.length === 4) {
                    confirmBtn.click();
                }
            }
        });

        confirmBtn.addEventListener('click', () => {
            if (isAnswered) return;

            const userAnswer = codeInput.value.replace(/\s/g, '');

            if (userAnswer.length !== 4) {
                codeInput.classList.add('wrong');
                setTimeout(() => {
                    codeInput.classList.remove('wrong');
                }, 500);
                return;
            }

            if (userAnswer === puzzle.answer) {
                isAnswered = true;
                feedback.innerHTML = 'STAGE 1 CLEAR<br>실험실을 탈출했습니다!';
                feedback.className = 'puzzle-feedback success show';
                feedback.style.whiteSpace = 'nowrap';
                codeInput.disabled = true;
                confirmBtn.style.display = 'none';

                this.completePuzzle('mirror-puzzle');

                setTimeout(() => {
                    if (puzzle.nextScene) {
                        this.handleNextScene(puzzle.nextScene);
                    }
                }, 1500);
            } else {
                codeInput.classList.add('wrong');
                codeInput.value = '';
                codeInput.focus();

                setTimeout(() => {
                    codeInput.classList.remove('wrong');
                }, 500);
            }
        });

        codeInput.focus();
    }

    loadProgress() {
        const saved = localStorage.getItem('puzzle-progress');
        const progress = saved ? JSON.parse(saved) : {
            completedPuzzles: [],
            currentStep: 0,
            draggablePositions: {}
        };
        if (!progress.draggablePositions) {
            progress.draggablePositions = {};
        }
        return progress;
    }

    saveProgress() {
        localStorage.setItem('puzzle-progress', JSON.stringify(this.currentProgress));
    }

    completePuzzle(puzzleId) {
        if (!this.currentProgress.completedPuzzles.includes(puzzleId)) {
            this.currentProgress.completedPuzzles.push(puzzleId);
            this.currentProgress.currentStep = Math.max(
                this.currentProgress.currentStep,
                this.puzzleOrder.indexOf(puzzleId) + 1
            );
            this.saveProgress();

            // 맵 업데이트 콜백 호출
            if (this.mapUpdateCallback) {
                this.mapUpdateCallback();
            }
        }
    }

    isPuzzleLocked(puzzleId) {
        const puzzleIndex = this.puzzleOrder.indexOf(puzzleId);
        return puzzleIndex > this.currentProgress.currentStep;
    }

    showLockedWithHandler(puzzleId) {
        import('../stage01/mirror.js').then(module => {
            if (puzzleId === 'mirror-puzzle') {
                module.handleMirror(this.modalTitle, this.puzzleContent, this.puzzleInput, this.submitBtn);
                this.puzzleModal.classList.add('show');
            }
        }).catch(error => {
            console.error('mirror.js import 실패:', error);
        });

        import('../stage01/cabinet.js').then(module => {
            if (puzzleId === 'cabinet-puzzle') {
                module.handleCabinet(this.modalTitle, this.puzzleContent, this.puzzleInput, this.submitBtn);
                this.puzzleModal.classList.add('show');
            }
        }).catch(error => {
            console.error('cabinet.js import 실패:', error);
        });

        import('../stage01/storage.js').then(module => {
            if (puzzleId === 'storage-clue') {
                module.handleStorage(this.modalTitle, this.puzzleContent, this.puzzleInput, this.submitBtn);
                this.puzzleModal.classList.add('show');
            }
        }).catch(error => {
            console.error('storage.js import 실패:', error);
        });

        import('../stage01/paper.js').then(module => {
            if (puzzleId === 'paper-clue') {
                module.handlePaper(this.modalTitle, this.puzzleContent, this.puzzleInput, this.submitBtn);
                this.puzzleModal.classList.add('show');
            }
        }).catch(error => {
            console.error('paper.js import 실패:', error);
        });
    }

    resetProgress() {
        this.currentProgress = {
            completedPuzzles: [],
            currentStep: 0,
            draggablePositions: {}
        };
        this.saveProgress();
        localStorage.removeItem('mirror-paper-used');
        console.log('진행 상태가 리셋되었습니다.');
    }

    // 배포 시 삭제
    skipToMirrorPuzzle() {
        this.currentProgress = {
            completedPuzzles: ['chair-puzzle', 'cabinet-puzzle'],
            currentStep: 4,
            draggablePositions: {}
        };
        this.saveProgress();
        localStorage.setItem('mirror-paper-used', 'true');
        console.log('거울 퍼즐 테스트 상태로 설정되었습니다.');
    }
    // 배포 시 삭제


    getProgress() {
        console.log('현재 진행 상태:', this.currentProgress);
        return this.currentProgress;
    }

    unlockAll() {
        this.currentProgress = {
            completedPuzzles: this.puzzleOrder,
            currentStep: this.puzzleOrder.length,
            draggablePositions: this.currentProgress.draggablePositions || {}
        };
        this.saveProgress();
        console.log('모든 퍼즐이 잠금 해제되었습니다.');
    }

    saveDraggablePosition(id, position) {
        this.currentProgress.draggablePositions[id] = position;
        this.saveProgress();
    }

    getDraggablePosition(id) {
        return this.currentProgress.draggablePositions[id];
    }
}

export default new PuzzleManager();
