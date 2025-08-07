// Get references to DOM elements
const video = document.getElementById('cameraFeed');
const canvas = document.getElementById('adBlockCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const status = document.getElementById('status');
const cameraSelect = document.getElementById('cameraSelect');
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');

let stream = null;
let videoProcessor = {
    brightness: 100,
    contrast: 100
};
let isProcessing = false;
let adDetectionInterval = null;

// Function to draw X symbol
function drawX(x, y, width, height) {
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Draw first line of X
    ctx.moveTo(x + width * 0.2, y + height * 0.2);
    ctx.lineTo(x + width * 0.8, y + height * 0.8);
    // Draw second line of X
    ctx.moveTo(x + width * 0.8, y + height * 0.2);
    ctx.lineTo(x + width * 0.2, y + height * 0.8);
    ctx.stroke();
    ctx.restore();
}

// Function to block an ad
function blockAd(x, y, width, height) {
    ctx.save();
    // Draw red rectangle
    ctx.fillStyle = 'rgba(255, 0, 0, 0.85)';
    ctx.fillRect(x, y, width, height);
    // Draw white X
    drawX(x, y, width, height);
    ctx.restore();
}

// Function to detect ads in video frame
async function detectAds() {
    if (!isProcessing) {
        isProcessing = true;
        
        // Create temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set canvas sizes
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        
        // Draw current video frame
        tempCtx.drawImage(video, 0, 0);
        
        try {
            // Get image data for processing
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            // Clear previous blocks
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Simple algorithm to detect bright/high-contrast areas that might be ads
            const blockSize = 32;
            const threshold = 200; // Brightness threshold
            
            for (let y = 0; y < tempCanvas.height; y += blockSize) {
                for (let x = 0; x < tempCanvas.width; x += blockSize) {
                    let brightPixels = 0;
                    let totalPixels = 0;
                    
                    // Sample pixels in this block
                    for (let by = 0; by < blockSize && y + by < tempCanvas.height; by++) {
                        for (let bx = 0; bx < blockSize && x + bx < tempCanvas.width; bx++) {
                            const i = ((y + by) * tempCanvas.width + (x + bx)) * 4;
                            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                            if (brightness > threshold) brightPixels++;
                            totalPixels++;
                        }
                    }
                    
                    // If block has high concentration of bright pixels, consider it an ad
                    if (brightPixels / totalPixels > 0.6) {
                        blockAd(x, y, blockSize, blockSize);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing video frame:', error);
        }
        
        isProcessing = false;
    }
}

// Function to start the camera
async function startCamera() {
    try {
        // Update status
        status.textContent = 'Requesting camera access...';
        startButton.disabled = true;

        // Request access to the user's camera
        const constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: cameraSelect.value,
                exposureMode: 'continuous',
                whiteBalanceMode: 'continuous',
                focusMode: 'continuous'
            },
            audio: false
        };

        // Get user media (camera access)
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set the video element's source to the camera stream
        video.srcObject = stream;
        
        // Update UI
        status.textContent = 'Ad blocking is active';
        startButton.textContent = 'Stop Blocking Ads';
        startButton.disabled = false;
        video.style.display = 'block';
        
        // Start ad detection
        adDetectionInterval = setInterval(detectAds, 100); // Check for ads every 100ms

    } catch (error) {
        console.error('Error accessing camera:', error);
        
        // Handle different types of errors
        let errorMessage = 'Failed to access camera. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage += 'Camera access is not supported in this browser.';
        } else {
            errorMessage += error.message;
        }
        
        status.textContent = errorMessage;
        startButton.disabled = false;
    }
}

// Function to stop the camera
function stopCamera() {
    if (stream) {
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    // Stop ad detection
    if (adDetectionInterval) {
        clearInterval(adDetectionInterval);
        adDetectionInterval = null;
    }
    
    // Clear the canvas
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Reset UI
    video.srcObject = null;
    video.style.display = 'none';
    status.textContent = 'Ready to start blocking ads';
    startButton.textContent = 'Start Blocking Ads';
}

// Add click event listener to the start button
startButton.addEventListener('click', () => {
    if (stream) {
        stopCamera();
    } else {
        startCamera();
    }
});

// Apply video filters
function applyVideoFilters() {
    const filters = [
        `brightness(${videoProcessor.brightness}%)`,
        `contrast(${videoProcessor.contrast}%)`,
        'saturate(120%)'  // Slightly increase color saturation
    ].join(' ');
    
    video.style.filter = filters;
}

// Event listeners for settings
brightnessSlider.addEventListener('input', (e) => {
    videoProcessor.brightness = e.target.value;
    applyVideoFilters();
});

contrastSlider.addEventListener('input', (e) => {
    videoProcessor.contrast = e.target.value;
    applyVideoFilters();
});

// Camera switch handler
cameraSelect.addEventListener('change', () => {
    if (stream) {
        stopCamera();
        startCamera();
    }
});

// Initialize the app
function initializeApp() {
    // Check if the browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = 'Camera access is not supported in this browser.';
        startButton.disabled = true;
        return;
    }

    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('pwa-mode');
    }

    // Set initial video filters
    applyVideoFilters();
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && stream) {
        stopCamera();
    }
});

// Initialize the app
initializeApp();