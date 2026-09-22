document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 模組 1: Dropdown 下拉選單邏輯
    // ==========================================
    const initDropdown = () => {
        const btn = document.getElementById('nav-dropdown-btn');
        const menu = document.getElementById('nav-dropdown-menu');
        const icon = document.getElementById('nav-dropdown-icon');
        if (!btn || !menu || !icon) return;

        let isOpen = false;

        const toggleMenu = () => {
            isOpen = !isOpen;
            if (isOpen) {
                menu.classList.remove('hidden');
                setTimeout(() => {
                    menu.classList.remove('opacity-0', 'scale-95');
                    menu.classList.add('opacity-100', 'scale-100');
                    icon.classList.add('rotate-180');
                }, 10);
            } else {
                menu.classList.remove('opacity-100', 'scale-100');
                menu.classList.add('opacity-0', 'scale-95');
                icon.classList.remove('rotate-180');
                setTimeout(() => {
                    if (!isOpen) menu.classList.add('hidden');
                }, 200);
            }
        };

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        document.addEventListener('click', (e) => {
            if (isOpen && !btn.contains(e.target) && !menu.contains(e.target)) {
                toggleMenu();
            }
        });
    };

    // ==========================================
    // 模組 2: Modal 彈窗控制邏輯
    // 取代原有的全域 window.toggleModal[cite: 2]
    // ==========================================
    const initModals = () => {
        const triggers = document.querySelectorAll('[data-modal-target]');
        const closeButtons = document.querySelectorAll('[data-modal-close]');
        const overlays = document.querySelectorAll('.modal-overlay');

        const toggleModal = (modalId, show) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            
            if (show) {
                modal.classList.remove('modal-hidden');
                document.body.style.overflow = 'hidden';
            } else {
                modal.classList.add('modal-hidden');
                document.body.style.overflow = '';
            }
        };

        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = trigger.getAttribute('data-modal-target');
                toggleModal(targetId, true);
            });
        });

        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.closest('.modal-overlay').id;
                toggleModal(targetId, false);
            });
        });

        overlays.forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                // 確保只點擊到背景才關閉，非內部容器
                if (e.target === overlay) {
                    toggleModal(overlay.id, false);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay:not(.modal-hidden)').forEach(modal => {
                    toggleModal(modal.id, false);
                });
            }
        });
    };

    // 初始化所有前端行為模組
    initDropdown();
    initModals();
});