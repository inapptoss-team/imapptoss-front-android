export function showStageClearAnimation(imagePath, icon, message, duration = 3500, onComplete = null) {
    const sceneElement = document.querySelector('.scene');
    if (!sceneElement) {
        console.error('Scene element not found');
        if (onComplete) onComplete(); 
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'stage-clear-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
        position: relative;
        max-width: 80%;
        max-height: 80%;
    `;

    const img = document.createElement('img');
    img.src = imagePath;
    img.alt = 'stage-clear';
    img.style.cssText = `
        width: 100%;
        height: auto;
        display: block;
        animation: scaleUp 2s ease-out forwards;
        opacity: 0;
    `;

    const text = document.createElement('div');
    text.innerHTML = `
        <div style="font-size: 1.2rem; margin-bottom: 0.3rem; white-space: nowrap;">${icon}</div>
        <div style="white-space: nowrap;">${message}</div>
    `;
    text.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.8rem;
        color: #ffffff;
        font-weight: normal;
        text-shadow:
            0 0 5px rgba(0, 0, 0, 0.6),
            1px 1px 2px rgba(0, 0, 0, 0.8);
        animation: fadeIn 1s ease-out 2s forwards;
        opacity: 0;
        padding: 0.4rem 0.8rem;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 6px;
        text-align: center;
    `;

    addAnimationStyles();

    container.appendChild(img);
    container.appendChild(text);
    overlay.appendChild(container);
    sceneElement.appendChild(overlay);

    if (onComplete) {
        setTimeout(() => {
            // Fade out the overlay before calling onComplete
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                onComplete(); 
            }, 500); // Wait for fade out to complete
        }, duration);
    }
}

function addAnimationStyles() {
    if (document.getElementById('stage-clear-animations')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'stage-clear-animations';
    style.textContent = `
        @keyframes scaleUp {
            0% {
                transform: scale(0.3);
                opacity: 0;
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }

        @keyframes fadeIn {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) translateY(-20px);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) translateY(0);
            }
        }
    `;

    document.head.appendChild(style);
}
