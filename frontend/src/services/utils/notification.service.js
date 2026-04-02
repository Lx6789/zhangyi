// noinspection CssInvalidPropertyValue, CssInvalidShorthand, CssUnknownTarget, CssInvalidHtmlTagReference, CssNoGenericFontName, CssOverwrittenProperties, CssUnresolvedCustomProperty, CssUnusedSymbol

/**
 * 美化版通知服务 - 完全修复CSS属性警告版本（Vue3兼容）
 * 使用自定义配色方案实现现代化的通知弹窗、确认对话框、选择列表和日期选择器
 */
class NotificationService {
    constructor() {
        // 配色方案
        this.colors = {
            primary: '#D5EBE1',
            secondary: '#B1D5C8',
            tertiary: '#99BCAC',
            accent: '#80A492',
            textDark: '#333333',
            textLight: '#666666',
            white: '#ffffff',
            shadow: 'rgba(0, 0, 0, 0.1)',
            overlay: 'rgba(0, 0, 0, 0.5)',
            grayBg: '#f8f9fa',
            error: '#e74c3c',
            success: '#2ecc71',
            warning: '#f39c12',
            info: '#3498db'
        };
    }

    /**
     * 应用样式到元素
     */
    applyStyles(element, styles) {
        Object.assign(element.style, styles);
    }

    /**
     * 显示通知消息（美化版）
     */
    showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.custom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const colorMap = {
            success: this.colors.success,
            error: this.colors.error,
            warning: this.colors.warning,
            info: this.colors.info
        };
        const bgColor = colorMap[type] || this.colors.info;

        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-progress"></div>
        `;

        this.applyStyles(notification, {
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-20px)',
            backgroundColor: bgColor,
            color: this.colors.white,
            padding: '0',
            borderRadius: '16px',
            boxShadow: `0 8px 24px ${this.colors.shadow}`,
            zIndex: '10000',
            fontSize: '14px',
            opacity: '0',
            transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            minWidth: '280px',
            maxWidth: '90%',
            overflow: 'hidden'
        });

        const content = notification.querySelector('.notification-content');
        this.applyStyles(content, {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            position: 'relative'
        });

        const iconSpan = notification.querySelector('.notification-icon');
        this.applyStyles(iconSpan, {
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center'
        });

        const messageSpan = notification.querySelector('.notification-message');
        this.applyStyles(messageSpan, {
            flex: '1',
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.4'
        });

        const closeBtn = notification.querySelector('.notification-close');
        this.applyStyles(closeBtn, {
            background: 'none',
            border: 'none',
            color: this.colors.white,
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s',
            opacity: '0.7'
        });

        closeBtn.onmouseenter = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseleave = () => closeBtn.style.opacity = '0.7';

        const progressBar = notification.querySelector('.notification-progress');
        this.applyStyles(progressBar, {
            height: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            width: '100%',
            transformOrigin: 'left',
            transition: 'transform 3s linear'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
            progressBar.style.transform = 'scaleX(0)';
        }, 10);

        let timeoutId = setTimeout(() => {
            this.closeNotification(notification);
        }, 3000);

        closeBtn.onclick = () => {
            clearTimeout(timeoutId);
            this.closeNotification(notification);
        };

        return notification;
    }

    closeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || 'ℹ';
    }

    /**
     * 自定义确认弹窗（美化版）
     * @returns {Promise<boolean>} 用户确认结果
     */
    confirm(options) {
        return new Promise((resolve) => {
            const {
                title = '提示',
                message = '确定要执行此操作吗？',
                confirmText = '确定',
                cancelText = '取消',
                type = 'info'
            } = typeof options === 'string' ? { message: options } : options;

            const existingModal = document.querySelector('.custom-modal');
            if (existingModal) existingModal.remove();

            const overlay = document.createElement('div');
            overlay.className = 'custom-modal-overlay';
            this.applyStyles(overlay, {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundColor: this.colors.overlay,
                zIndex: '10001',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            });

            const typeConfig = {
                success: { color: this.colors.success, icon: '✓', bgLight: '#e8f5e9' },
                error: { color: this.colors.error, icon: '✕', bgLight: '#ffebee' },
                warning: { color: this.colors.warning, icon: '⚠', bgLight: '#fff3e0' },
                info: { color: this.colors.info, icon: 'ℹ', bgLight: '#e3f2fd' }
            };
            const config = typeConfig[type] || typeConfig.info;

            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            this.applyStyles(modal, {
                backgroundColor: this.colors.white,
                borderRadius: '24px',
                width: '90%',
                maxWidth: '420px',
                boxShadow: `0 20px 40px ${this.colors.shadow}`,
                transform: 'scale(0.9)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)',
                overflow: 'hidden'
            });

            modal.innerHTML = `
                <div style="padding: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${config.bgLight}; display: flex; align-items: center; justify-content: center; color: ${config.color}; font-size: 22px; font-weight: bold;">${config.icon}</div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: ${this.colors.textDark};">${title}</h3>
                    </div>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${this.colors.textLight}; line-height: 1.5;">${message}</p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="modal-cancel" style="padding: 10px 20px; border-radius: 40px; background: ${this.colors.white}; color: ${this.colors.textLight}; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 0 1px ${this.colors.secondary} inset;">${cancelText}</button>
                        <button class="modal-confirm" style="padding: 10px 24px; border-radius: 40px; background: ${config.color}; color: white; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none;">${confirmText}</button>
                    </div>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            }, 10);

            const confirmBtn = modal.querySelector('.modal-confirm');
            const cancelBtn = modal.querySelector('.modal-cancel');

            const close = (result) => {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 300);
            };

            confirmBtn.onclick = () => close(true);
            cancelBtn.onclick = () => close(false);

            overlay.onclick = (e) => {
                if (e.target === overlay) close(false);
            };

            confirmBtn.onmouseenter = () => confirmBtn.style.opacity = '0.9';
            confirmBtn.onmouseleave = () => confirmBtn.style.opacity = '1';
            cancelBtn.onmouseenter = () => {
                cancelBtn.style.backgroundColor = this.colors.grayBg;
                cancelBtn.style.boxShadow = `0 0 0 1px ${this.colors.tertiary} inset`;
            };
            cancelBtn.onmouseleave = () => {
                cancelBtn.style.backgroundColor = this.colors.white;
                cancelBtn.style.boxShadow = `0 0 0 1px ${this.colors.secondary} inset`;
            };
        });
    }

    /**
     * 自定义选择列表（美化版）
     */
    selectList(options) {
        return new Promise((resolve) => {
            const {
                title = '请选择',
                items = [],
                cancelText = '取消'
            } = options;

            const existingModal = document.querySelector('.custom-select-modal');
            if (existingModal) existingModal.remove();

            const overlay = document.createElement('div');
            this.applyStyles(overlay, {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundColor: this.colors.overlay,
                zIndex: '10001',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            });

            const modal = document.createElement('div');
            this.applyStyles(modal, {
                backgroundColor: this.colors.white,
                borderRadius: '24px',
                width: '90%',
                maxWidth: '380px',
                maxHeight: '80vh',
                boxShadow: `0 20px 40px ${this.colors.shadow}`,
                transform: 'scale(0.9)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            });

            const itemsHtml = items.map((item, index) => `
                <div class="select-item" data-value="${item.value}" style="display: flex; align-items: center; gap: 14px; padding: 14px 20px; cursor: pointer; transition: background 0.2s; ${index !== items.length - 1 ? 'border-bottom: 1px solid ' + this.colors.secondary + '40;' : ''}">
                    ${item.icon ? `<span style="font-size: 20px;">${item.icon}</span>` : ''}
                    <span style="flex: 1; font-size: 15px; color: ${this.colors.textDark};">${item.label}</span>
                    <span class="select-check" style="color: ${this.colors.accent}; font-weight: bold; opacity: 0;">✓</span>
                </div>
            `).join('');

            modal.innerHTML = `
                <div style="padding: 20px; border-bottom: 1px solid ${this.colors.secondary}40;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: ${this.colors.textDark};">${title}</h3>
                </div>
                <div style="overflow-y: auto; flex: 1;">
                    ${itemsHtml}
                </div>
                <div style="padding: 16px; border-top: 1px solid ${this.colors.secondary}40;">
                    <button class="select-cancel" style="width: 100%; padding: 12px; border-radius: 40px; background: ${this.colors.white}; color: ${this.colors.textLight}; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 0 1px ${this.colors.secondary} inset;">${cancelText}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            }, 10);

            const close = (result) => {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => overlay.remove(), 300);
                resolve(result);
            };

            const selectItems = modal.querySelectorAll('.select-item');
            selectItems.forEach(item => {
                const checkSpan = item.querySelector('.select-check');
                item.onmouseenter = () => item.style.backgroundColor = this.colors.grayBg;
                item.onmouseleave = () => item.style.backgroundColor = 'transparent';
                item.onclick = () => {
                    const value = item.dataset.value;
                    if (checkSpan) checkSpan.style.opacity = '1';
                    setTimeout(() => close(value), 150);
                };
            });

            const cancelBtn = modal.querySelector('.select-cancel');
            cancelBtn.onmouseenter = () => {
                cancelBtn.style.backgroundColor = this.colors.grayBg;
                cancelBtn.style.boxShadow = `0 0 0 1px ${this.colors.tertiary} inset`;
            };
            cancelBtn.onmouseleave = () => {
                cancelBtn.style.backgroundColor = this.colors.white;
                cancelBtn.style.boxShadow = `0 0 0 1px ${this.colors.secondary} inset`;
            };
            cancelBtn.onclick = () => close(null);

            overlay.onclick = (e) => {
                if (e.target === overlay) close(null);
            };
        });
    }

    /**
     * 自定义日期选择器（美化版）
     */
    datePicker(options = {}) {
        return new Promise((resolve) => {
            const {
                title = '选择日期',
                defaultDate = new Date(),
                minDate = null,
                maxDate = null,
                confirmText = '确定',
                cancelText = '取消'
            } = options;

            let currentDate = defaultDate instanceof Date ? defaultDate : new Date(defaultDate);
            if (isNaN(currentDate.getTime())) currentDate = new Date();

            let selectedDate = new Date(currentDate);
            let currentYear = currentDate.getFullYear();
            let currentMonth = currentDate.getMonth();

            const existingModal = document.querySelector('.custom-date-modal');
            if (existingModal) existingModal.remove();

            const overlay = document.createElement('div');
            this.applyStyles(overlay, {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundColor: this.colors.overlay,
                zIndex: '10001',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            });

            const modal = document.createElement('div');
            this.applyStyles(modal, {
                backgroundColor: this.colors.white,
                borderRadius: '24px',
                width: '90%',
                maxWidth: '360px',
                boxShadow: `0 20px 40px ${this.colors.shadow}`,
                transform: 'scale(0.9)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)',
                overflow: 'hidden'
            });

            const renderCalendar = () => {
                const firstDay = new Date(currentYear, currentMonth, 1);
                const lastDay = new Date(currentYear, currentMonth + 1, 0);
                const startWeekday = firstDay.getDay();
                const daysInMonth = lastDay.getDate();
                const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

                const days = [];
                for (let i = startWeekday - 1; i >= 0; i--) {
                    days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i) });
                }
                for (let i = 1; i <= daysInMonth; i++) {
                    days.push({ day: i, isCurrentMonth: true, date: new Date(currentYear, currentMonth, i) });
                }
                const remaining = 42 - days.length;
                for (let i = 1; i <= remaining; i++) {
                    days.push({ day: i, isCurrentMonth: false, date: new Date(currentYear, currentMonth + 1, i) });
                }

                const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

                let calendarHtml = `
                    <div style="padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <button class="prev-month" style="width: 32px; height: 32px; border-radius: 50%; background: ${this.colors.grayBg}; color: ${this.colors.textDark}; cursor: pointer; font-size: 18px; border: none;">‹</button>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${this.colors.textDark};">${currentYear}年 ${currentMonth + 1}月</h3>
                            <button class="next-month" style="width: 32px; height: 32px; border-radius: 50%; background: ${this.colors.grayBg}; color: ${this.colors.textDark}; cursor: pointer; font-size: 18px; border: none;">›</button>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px;">
                            ${weekdays.map(day => `<div style="text-align: center; font-size: 12px; color: ${this.colors.textLight}; padding: 8px 0;">${day}</div>`).join('')}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                `;

                days.forEach((day) => {
                    const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                    const isSelected = selectedDate &&
                        selectedDate.getFullYear() === day.date.getFullYear() &&
                        selectedDate.getMonth() === day.date.getMonth() &&
                        selectedDate.getDate() === day.date.getDate();
                    const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);

                    const bgColor = isSelected ? this.colors.primary : 'transparent';
                    const textColor = isSelected ? this.colors.textDark : (day.isCurrentMonth ? this.colors.textDark : this.colors.textLight);

                    calendarHtml += `<div class="calendar-day" data-date="${dateStr}" data-year="${day.date.getFullYear()}" data-month="${day.date.getMonth()}" data-day="${day.day}" data-disabled="${isDisabled}" style="text-align: center; padding: 10px 0; font-size: 14px; border-radius: 40px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; background: ${bgColor}; color: ${textColor}; opacity: ${isDisabled ? 0.4 : 1}; transition: all 0.2s;">${day.day}</div>`;
                });

                calendarHtml += `
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; padding: 16px 20px 20px; border-top: 1px solid ${this.colors.secondary}40;">
                        <button class="date-cancel" style="flex: 1; padding: 12px; border-radius: 40px; background: ${this.colors.white}; color: ${this.colors.textLight}; font-size: 14px; font-weight: 500; cursor: pointer; box-shadow: 0 0 0 1px ${this.colors.secondary} inset;">${cancelText}</button>
                        <button class="date-confirm" style="flex: 1; padding: 12px; border-radius: 40px; background: ${this.colors.accent}; color: white; font-size: 14px; font-weight: 500; cursor: pointer; border: none;">${confirmText}</button>
                    </div>
                `;

                modal.innerHTML = calendarHtml;

                const prevBtn = modal.querySelector('.prev-month');
                const nextBtn = modal.querySelector('.next-month');
                const daysEl = modal.querySelectorAll('.calendar-day');
                const cancelBtn = modal.querySelector('.date-cancel');
                const confirmBtn = modal.querySelector('.date-confirm');

                prevBtn.onclick = () => {
                    if (currentMonth === 0) {
                        currentMonth = 11;
                        currentYear--;
                    } else {
                        currentMonth--;
                    }
                    renderCalendar();
                };

                nextBtn.onclick = () => {
                    if (currentMonth === 11) {
                        currentMonth = 0;
                        currentYear++;
                    } else {
                        currentMonth++;
                    }
                    renderCalendar();
                };

                daysEl.forEach(dayEl => {
                    const isDisabled = dayEl.dataset.disabled === 'true';
                    if (!isDisabled) {
                        dayEl.onclick = () => {
                            const year = parseInt(dayEl.dataset.year);
                            const month = parseInt(dayEl.dataset.month);
                            const day = parseInt(dayEl.dataset.day);
                            selectedDate = new Date(year, month, day);
                            renderCalendar();
                        };
                        dayEl.onmouseenter = () => {
                            if (!isDisabled && dayEl.style.backgroundColor !== this.colors.primary) {
                                dayEl.style.backgroundColor = this.colors.secondary;
                            }
                        };
                        dayEl.onmouseleave = () => {
                            if (!isDisabled && dayEl.style.backgroundColor !== this.colors.primary) {
                                dayEl.style.backgroundColor = 'transparent';
                            }
                        };
                    }
                });

                cancelBtn.onclick = () => close(null);
                confirmBtn.onclick = () => {
                    const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                    close(formattedDate);
                };

                cancelBtn.onmouseenter = () => {
                    cancelBtn.style.backgroundColor = this.colors.grayBg;
                    cancelBtn.style.boxShadow = `0 0 0 1px ${this.colors.tertiary} inset`;
                };
                cancelBtn.onmouseleave = () => {
                    cancelBtn.style.backgroundColor = this.colors.white;
                    cancelBtn.style.boxShadow = `0 0 0 1px ${this.colors.secondary} inset`;
                };
                confirmBtn.onmouseenter = () => confirmBtn.style.opacity = '0.9';
                confirmBtn.onmouseleave = () => confirmBtn.style.opacity = '1';
            };

            const close = (result) => {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => overlay.remove(), 300);
                resolve(result);
            };

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            }, 10);

            renderCalendar();

            overlay.onclick = (e) => {
                if (e.target === overlay) close(null);
            };
        });
    }

    /**
     * 显示加载提示
     */
    showLoading(message = '加载中...') {
        const existing = document.querySelector('.custom-loading');
        if (existing) existing.remove();

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'custom-loading';
        this.applyStyles(loadingDiv, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: this.colors.overlay,
            zIndex: '10002',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px'
        });

        loadingDiv.innerHTML = `
            <div style="width: 48px; height: 48px; border: 3px solid ${this.colors.secondary}; border-top-color: ${this.colors.accent}; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <div style="color: ${this.colors.white}; font-size: 14px; background: ${this.colors.textDark}80; padding: 8px 16px; border-radius: 40px;">${message}</div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;

        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    hideLoading(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.remove();
        } else {
            const existing = document.querySelector('.custom-loading');
            if (existing) existing.remove();
        }
    }
}

export default new NotificationService();