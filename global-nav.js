function updateLocalTime() {
    const timeElements = document.querySelectorAll('.nav-time');
    if (!timeElements.length) return;
    
    // Format: e.g., "7:23 PM"
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    const strTime = hours + ':' + minutes + ' ' + ampm;
    
    timeElements.forEach(el => {
        el.textContent = strTime;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateLocalTime();
    // Update time every second
    setInterval(updateLocalTime, 1000);
});
