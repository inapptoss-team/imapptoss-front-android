/**
 * THE GRADUATE ESCAPE - Main JavaScript
 * Navigation and click handling for the cover screen
 */

import puzzleManager from './puzzles/puzzle-manager.js';

window.puzzleManager = puzzleManager;

function showComingSoonModal(message) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🚧</div>
    <div style="white-space: nowrap; margin-bottom: 1rem;">${message}</div>
    <button class="confirm-btn">확인</button>
  `;
  modal.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(26, 42, 71, 0.95), rgba(16, 32, 51, 0.98));
    border: 2px solid rgba(100, 180, 255, 0.4); border-radius: 12px; padding: 1.5rem;
    color: #e6f3ff; font-size: 0.95rem; text-align: center;
    box-shadow: 0 0 30px rgba(57, 127, 255, 0.5), 0 20px 60px rgba(0, 0, 0, 0.7);
    z-index: 10000;
  `;

  const btn = modal.querySelector('.confirm-btn');
  btn.style.cssText = `
    padding: 0.5rem 1.5rem; font-size: 0.9rem; font-weight: 600; color: #e6f3ff;
    background: linear-gradient(135deg, rgba(80, 140, 255, 0.3), rgba(60, 120, 235, 0.4));
    border: 1px solid rgba(100, 180, 255, 0.5); border-radius: 50px;
    cursor: pointer; transition: all 0.2s ease;
  `;

  btn.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

window.resetProgress = () => {
  window.puzzleManager.resetProgress();
};

window.getProgress = () => {
  return window.puzzleManager.getProgress();
};

window.unlockAll = () => {
  window.puzzleManager.unlockAll();
};

document.addEventListener('DOMContentLoaded', () => {
  const lockedBtns = document.querySelectorAll('[data-locked="true"]');

  lockedBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 400);
    });
  });

  const exploreBtn = document.querySelector('.explore-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = './lab/intro.html';
    });
  }

  const progress = puzzleManager.loadProgress();
  if (progress.completedPuzzles.includes('mirror-puzzle')) {
    const stageButtons = document.querySelectorAll('.stage-item .btn');
    const justCompleted = sessionStorage.getItem('justCompletedMirror') === 'true';

    stageButtons.forEach((btn) => {
      if (btn.textContent.trim() === '학사') {
        if (justCompleted) {
          sessionStorage.removeItem('justCompletedMirror');

          btn.classList.add('unlocking');

          setTimeout(() => {
            btn.classList.remove('locked', 'unlocking');
            btn.removeAttribute('data-locked');
            btn.classList.add('active', 'explore-btn');

            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
              e.preventDefault();
              showComingSoonModal('학사 스테이지는 준비 중입니다.');
            });
          }, 2000);
        } else {
          btn.classList.remove('locked');
          btn.removeAttribute('data-locked');
          btn.classList.add('active', 'explore-btn');

          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);

          newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showComingSoonModal('학사 스테이지는 준비 중입니다.');
          });
        }
      }
    });
  }

  // General object buttons (not on the map) that trigger puzzles
  const objectBtns = document.querySelectorAll('.object-btn');
  objectBtns.forEach((btn) => {
    if (btn.closest('.map-container')) {
      return; // Skip map objects, handled by interactions.js
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const puzzleType = btn.dataset.puzzle;
      const objectName = btn.dataset.object;
      if (puzzleType) {
        window.puzzleManager.show(puzzleType, objectName);
      }
    });
  });
});
