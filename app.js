// General App Functions
function setAppHeight() {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
window.addEventListener('resize', setAppHeight);
setAppHeight();

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        const header = document.querySelector('header');
        if (header) header.style.top = window.visualViewport.offsetTop + 'px';
    });
    window.visualViewport.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (header) header.style.top = window.visualViewport.offsetTop + 'px';
    });
}

// Pull to Refresh
let startY = 0;
let pulling = false;
document.addEventListener("DOMContentLoaded", () => {
    const indicator = document.getElementById("pullRefresh");
    if (!indicator) return;
    window.addEventListener("touchstart", (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    });
    window.addEventListener("touchmove", (e) => {
        if (!pulling) return;
        let diff = e.touches[0].clientY - startY;
        if (diff > 0) indicator.style.top = Math.min(diff - 50, 20) + "px";
        indicator.innerText = diff > 120 ? "↻ سيتم التحديث..." : "⟳ اسحب للتحديث";
    });
    window.addEventListener("touchend", (e) => {
        if (!pulling) return;
        let diff = e.changedTouches[0].clientY - startY;
        indicator.style.top = "-50px";
        pulling = false;
        if (diff > 120) location.reload();
    });
});
