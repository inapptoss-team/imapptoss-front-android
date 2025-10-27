function isOverlapping(elem1, elem2) {
    if (!elem1 || !elem2) return false;

    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();

    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}

export function makeDraggable(element, puzzleManager, options = {}) {
    let isDragging = false;
    let offsetX, offsetY;
    let hasDragged = false;
    let startX, startY;
    let startClientX, startClientY;

    const savedPos = puzzleManager.getDraggablePosition(element.dataset.puzzle);
    if (savedPos) {
        element.style.left = savedPos.x;
        element.style.top = savedPos.y;
    }

    function onDragStart(e) {
        isDragging = true;
        hasDragged = false;

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        offsetX = clientX - element.offsetLeft;
        offsetY = clientY - element.offsetTop;

        startClientX = clientX;
        startClientY = clientY;
        startX = element.style.left;
        startY = element.style.top;

        element.style.cursor = 'grabbing';

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
    }

    function onDragMove(e) {
        if (!isDragging) return;

        // 터치 기기에서 스크롤 방지
        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        if (!hasDragged) {
            const dx = Math.abs(clientX - startClientX);
            const dy = Math.abs(clientY - startClientY);
            if (dx > 5 || dy > 5) {
                hasDragged = true;
            }
        }

        if (hasDragged) {
            let newX = clientX - offsetX;
            let newY = clientY - offsetY;

            const mapContainer = document.querySelector('.map-container');
            const mapRect = mapContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + elementRect.width > mapRect.width) newX = mapRect.width - elementRect.width;
            if (newY + elementRect.height > mapRect.height) newY = mapRect.height - elementRect.height;

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        }
    }

    function onDragEnd(e) {
        if (!isDragging) return;

        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);

        if (hasDragged) {
            const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
            const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;

            const dropTarget = options.dropTarget ? document.querySelector(options.dropTarget) : null;
            let isDroppedOnTarget = false;

            if (dropTarget && dropTarget.tagName === 'path') {
                const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
                isDroppedOnTarget = elementsAtPoint.includes(dropTarget);
            } else if (dropTarget) {
                isDroppedOnTarget = isOverlapping(element, dropTarget);
            }

            if (isDroppedOnTarget) {
                puzzleManager.show(options.dropPuzzleId, '거울', { fromDrop: true });
                element.style.left = startX;
                element.style.top = startY;
            } else {
                puzzleManager.saveDraggablePosition(element.dataset.puzzle, {
                    x: element.style.left,
                    y: element.style.top
                });
            }
        }

        isDragging = false;
        element.style.cursor = 'grab';
    }

    element.addEventListener('mousedown', onDragStart);
    element.addEventListener('touchstart', onDragStart);

    element.addEventListener('click', (e) => {
        if (hasDragged) {
            e.preventDefault();
            e.stopPropagation();
        } else if (options.onClick) {
            e.stopPropagation();
            options.onClick();
        }
    }, true);
}