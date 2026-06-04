// Mobile-specific functionality for Bondly

const Mobile = {
    // Touch gesture handling
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    
    // Initialize mobile features
    init: () => {
        Mobile.setupTouchGestures();
        Mobile.setupPullToRefresh();
        Mobile.setupKeyboardHandling();
        Mobile.setupViewportHandling();
        Mobile.preventZoomOnInput();
    },
    
    // Setup touch gestures
    setupTouchGestures: () => {
        document.addEventListener('touchstart', (e) => {
            Mobile.touchStartX = e.changedTouches[0].screenX;
            Mobile.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            Mobile.touchEndX = e.changedTouches[0].screenX;
            Mobile.touchEndY = e.changedTouches[0].screenY;
            Mobile.handleSwipe();
        }, { passive: true });
    },
    
    // Handle swipe gestures
    handleSwipe: () => {
        const deltaX = Mobile.touchEndX - Mobile.touchStartX;
        const deltaY = Mobile.touchEndY - Mobile.touchStartY;
        const minSwipeDistance = 50;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    Mobile.onSwipeRight();
                } else {
                    Mobile.onSwipeLeft();
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    Mobile.onSwipeDown();
                } else {
                    Mobile.onSwipeUp();
                }
            }
        }
    },
    
    // Swipe handlers (to be customized per screen)
    onSwipeLeft: () => {
        // Navigate to next screen or perform action
        console.log('Swipe left detected');
    },
    
    onSwipeRight: () => {
        // Navigate to previous screen or perform action
        console.log('Swipe right detected');
    },
    
    onSwipeUp: () => {
        // Perform action
        console.log('Swipe up detected');
    },
    
    onSwipeDown: () => {
        // Perform action
        console.log('Swipe down detected');
    },
    
    // Setup pull to refresh
    setupPullToRefresh: () => {
        let startY = 0;
        let isPulling = false;
        const pullThreshold = 100;
        
        const mainContent = document.querySelector('.content-screen.active');
        if (!mainContent) return;
        
        mainContent.addEventListener('touchstart', (e) => {
            if (mainContent.scrollTop === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        }, { passive: true });
        
        mainContent.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            const currentY = e.touches[0].pageY;
            const diff = currentY - startY;
            
            if (diff > 0 && mainContent.scrollTop === 0) {
                e.preventDefault();
                // Visual feedback could be added here
            }
        }, { passive: false });
        
        mainContent.addEventListener('touchend', (e) => {
            if (!isPulling) return;
            
            const currentY = e.changedTouches[0].pageY;
            const diff = currentY - startY;
            
            if (diff > pullThreshold) {
                Mobile.onPullToRefresh();
            }
            
            isPulling = false;
        }, { passive: true });
    },
    
    // Pull to refresh handler
    onPullToRefresh: () => {
        console.log('Pull to refresh triggered');
        // Trigger refresh action
        window.location.reload();
    },
    
    // Setup keyboard handling for mobile
    setupKeyboardHandling: () => {
        const inputs = document.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                document.body.classList.add('keyboard-open');
            });
            
            input.addEventListener('blur', () => {
                document.body.classList.remove('keyboard-open');
            });
        });
    },
    
    // Setup viewport handling
    setupViewportHandling: () => {
        // Prevent bounce scrolling on iOS
        document.body.addEventListener('touchmove', (e) => {
            if (e.target.closest('.messages-container') || 
                e.target.closest('.content-screen') ||
                e.target.closest('.screen')) {
                return;
            }
            e.preventDefault();
        }, { passive: false });
    },
    
    // Prevent zoom on input focus (iOS)
    preventZoomOnInput: () => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        
        inputs.forEach(input => {
            input.addEventListener('touchstart', () => {
                input.style.fontSize = '16px';
            });
        });
    },
    
    // Haptic feedback (if supported)
    hapticFeedback: (type = 'light') => {
        if ('vibrate' in navigator) {
            switch (type) {
                case 'light':
                    navigator.vibrate(10);
                    break;
                case 'medium':
                    navigator.vibrate(20);
                    break;
                case 'heavy':
                    navigator.vibrate(30);
                    break;
                case 'success':
                    navigator.vibrate([10, 50, 10]);
                    break;
                case 'error':
                    navigator.vibrate([30, 50, 30]);
                    break;
            }
        }
    },
    
    // Smooth scroll to element
    scrollToElement: (element, offset = 0) => {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    },
    
    // Scroll to bottom of container
    scrollToBottom: (container) => {
        if (!container) return;
        container.scrollTop = container.scrollHeight;
    },
    
    // Animate element
    animateElement: (element, animation, duration = 300) => {
        if (!element) return;
        
        element.style.animation = `${animation} ${duration}ms ease`;
        
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    },
    
    // Fade in element
    fadeIn: (element, duration = 300) => {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    },
    
    // Fade out element
    fadeOut: (element, duration = 300) => {
        if (!element) return;
        
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '1';
        
        requestAnimationFrame(() => {
            element.style.opacity = '0';
        });
        
        setTimeout(() => {
            element.style.display = 'none';
        }, duration);
    },
    
    // Slide in from right
    slideInRight: (element, duration = 300) => {
        if (!element) return;
        
        element.style.transform = 'translateX(100%)';
        element.style.transition = `transform ${duration}ms ease`;
        
        requestAnimationFrame(() => {
            element.style.transform = 'translateX(0)';
        });
    },
    
    // Slide out to right
    slideOutRight: (element, duration = 300) => {
        if (!element) return;
        
        element.style.transform = 'translateX(0)';
        element.style.transition = `transform ${duration}ms ease`;
        
        requestAnimationFrame(() => {
            element.style.transform = 'translateX(100%)';
        });
        
        setTimeout(() => {
            element.style.display = 'none';
        }, duration);
    },
    
    // Scale animation
    scale: (element, scale, duration = 200) => {
        if (!element) return;
        
        element.style.transition = `transform ${duration}ms ease`;
        element.style.transform = `scale(${scale})`;
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, duration);
    },
    
    // Add ripple effect to button
    addRipple: (button, event) => {
        if (!button) return;
        
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    },
    
    // Get safe area insets
    getSafeAreaInsets: () => {
        const style = getComputedStyle(document.documentElement);
        return {
            top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
            right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
            bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
            left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
        };
    },
    
    // Check if device has notch
    hasNotch: () => {
        const safeArea = Mobile.getSafeAreaInsets();
        return safeArea.top > 0;
    },
    
    // Handle orientation change
    setupOrientationChange: () => {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Recalculate layout after orientation change
                window.dispatchEvent(new Event('resize'));
            }, 100);
        });
    },
    
    // Setup long press gesture
    setupLongPress: (element, callback, duration = 500) => {
        if (!element) return;
        
        let timer;
        
        element.addEventListener('touchstart', (e) => {
            timer = setTimeout(() => {
                callback(e);
                Mobile.hapticFeedback('medium');
            }, duration);
        }, { passive: true });
        
        element.addEventListener('touchend', () => {
            clearTimeout(timer);
        }, { passive: true });
        
        element.addEventListener('touchmove', () => {
            clearTimeout(timer);
        }, { passive: true });
    }
};

// Initialize mobile features when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Mobile.init);
} else {
    Mobile.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Mobile;
}
