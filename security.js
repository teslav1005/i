// Security Script: URL Masking (73 characters)
function maskURL() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-';
    let randomID = '';
    for (let i = 0; i < 73; i++) {
        randomID += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Use history.replaceState to change the URL in the address bar ONLY
    // This does NOT change the actual file being served, so no 404 error occurs.
    const currentPath = window.location.pathname;
    const newURL = window.location.origin + currentPath + '?' + randomID;
    window.history.replaceState(null, '', newURL);
}

// Execute masking when the page loads
window.addEventListener('load', maskURL);
