// Функция за симулиране на мобилен изглед
function enableMobilePreview() {
    // Създаваме контейнер за мобилния преглед
    const mobilePreviewContainer = document.createElement('div');
    mobilePreviewContainer.id = 'mobile-preview-container';
    mobilePreviewContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    `;

    // Създаваме рамка на мобилно устройство
    const mobileFrame = document.createElement('div');
    mobileFrame.id = 'mobile-frame';
    mobileFrame.style.cssText = `
        width: 375px;
        height: 667px;
        background-color: white;
        border-radius: 30px;
        border: 10px solid #333;
        position: relative;
        overflow: hidden;
        box-shadow: 0 0 50px rgba(0, 255, 102, 0.5);
    `;

    // Създаваме iframe за съдържанието
    const contentFrame = document.createElement('iframe');
    contentFrame.id = 'mobile-content';
    contentFrame.src = window.location.href;
    contentFrame.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        transform-origin: 0 0;
        overflow-y: auto;
    `;

    // Добавяме бутон за затваряне
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Затвори';
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 5px 15px;
        background: linear-gradient(135deg, #00ff66, #00ccff);
        color: #111827;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        z-index: 10000;
    `;
    closeButton.onclick = function() {
        document.body.removeChild(mobilePreviewContainer);
    };

    // Добавяме бутони за превключване между различни размери на устройства
    const deviceButtons = document.createElement('div');
    deviceButtons.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        display: flex;
        gap: 10px;
        z-index: 10000;
    `;

    const devices = [
        { name: 'iPhone SE', width: 375, height: 667 },
        { name: 'iPhone X', width: 375, height: 812 },
        { name: 'Galaxy S9', width: 360, height: 740 }
    ];

    devices.forEach(device => {
        const button = document.createElement('button');
        button.textContent = device.name;
        button.style.cssText = `
            padding: 5px 10px;
            background: rgba(0, 255, 102, 0.2);
            color: white;
            border: 1px solid rgba(0, 255, 102, 0.5);
            border-radius: 5px;
            cursor: pointer;
        `;
        button.onclick = function() {
            mobileFrame.style.width = device.width + 'px';
            mobileFrame.style.height = device.height + 'px';
        };
        deviceButtons.appendChild(button);
    });

    // Сглобяваме всичко
    mobileFrame.appendChild(contentFrame);
    mobilePreviewContainer.appendChild(mobileFrame);
    mobilePreviewContainer.appendChild(closeButton);
    mobilePreviewContainer.appendChild(deviceButtons);
    document.body.appendChild(mobilePreviewContainer);
}

// Добавяме бутон за активиране на мобилния преглед
window.addEventListener('DOMContentLoaded', function() {
    const previewButton = document.createElement('button');
    previewButton.textContent = 'Мобилен преглед';
    previewButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background: linear-gradient(135deg, #00ff66, #00ccff);
        color: #111827;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        font-weight: bold;
        z-index: 9998;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    `;
    previewButton.onclick = enableMobilePreview;
    document.body.appendChild(previewButton);
});
