/**
 * Toast Notification System
 * Modern replacement for alert() dialogs
 */

class Toast {
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    static show(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Get icon based on type
        const icon = this.getIcon(type);
        
        // Set toast content
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="bi bi-${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        `;

        // Add to container
        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        // Auto remove after duration
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                toast.remove();
                // Remove container if empty
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);

        return toast;
    }

    /**
     * Show success toast
     * @param {string} message
     * @param {number} duration
     */
    static success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message
     * @param {number} duration
     */
    static error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     * @param {string} message
     * @param {number} duration
     */
    static warning(message, duration = 3500) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     * @param {string} message
     * @param {number} duration
     */
    static info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Get icon name based on toast type
     * @param {string} type
     * @returns {string}
     */
    static getIcon(type) {
        const icons = {
            success: 'check-circle-fill',
            error: 'x-circle-fill',
            warning: 'exclamation-triangle-fill',
            info: 'info-circle-fill'
        };
        return icons[type] || icons.info;
    }

    /**
     * Remove all toasts
     */
    static clearAll() {
        const container = document.getElementById('toast-container');
        if (container) {
            container.remove();
        }
    }
}

// Make Toast available globally
window.Toast = Toast;
