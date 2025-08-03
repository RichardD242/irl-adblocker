// Get references to DOM elements
const video = document.getElementById('cameraFeed');
const startButton = document.getElementById('startButton');
const status = document.getElementById('status');

let stream = null;

// Function to start the camera
async function startCamera() {
    try {
        // Update status
        status.textContent = 'Requesting camera access...';
        startButton.disabled = true;

        // Request access to the user's camera
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' // Use front camera by default
            },
            audio: false // We don't need audio for this simple app
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

// Check if the browser supports getUserMedia
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    status.textContent = 'Camera access is not supported in this browser.';
    startButton.disabled = true;
}