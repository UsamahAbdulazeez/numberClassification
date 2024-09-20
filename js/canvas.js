const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const eraserBtn = document.getElementById('eraserBtn');
const drawBtn = document.getElementById('drawBtn');
const submitBtn = document.getElementById('submitBtn');
const resultDiv = document.getElementById('result');

// Function to clear active state from all buttons
function clearActiveState() {
    eraserBtn.classList.remove('active');
    drawBtn.classList.remove('active');
}

// Set initial drawing mode
let isDrawing = false;
let isEraser = false;

// Set up drawing parameters
function setDrawingMode() {
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round'; // Smoother lines
    ctx.strokeStyle = '#000'; // Black for drawing
}

function setEraserMode() {
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#fff'; // White for erasing
}

// Initialize drawing mode
setDrawingMode();

// Resize the canvas based on screen size
function resizeCanvas() {
    const canvasSize = Math.min(window.innerWidth - 40, 280); // Scale down for smaller screens
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx.fillStyle = '#fff'; // Fill background with white
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Call resize function on window load and resize
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// Clear the canvas and reset button states
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff'; // Re-fill canvas with white after clearing
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    resultDiv.textContent = ''; // Clear result text
    clearActiveState(); // Reset the active state of all buttons
    clearBtn.blur(); // Remove focus on mobile devices
});

// Set to eraser mode
eraserBtn.addEventListener('click', () => {
    isEraser = true;
    setEraserMode();
    clearActiveState(); // Reset active state
    eraserBtn.classList.add('active'); // Set eraser as active
    eraserBtn.blur(); // Remove focus on mobile devices
});

// Set to drawing mode
drawBtn.addEventListener('click', () => {
    isEraser = false;
    setDrawingMode();
    clearActiveState(); // Reset active state
    drawBtn.classList.add('active'); // Set draw as active
    drawBtn.blur(); // Remove focus on mobile devices
});

// Load TensorFlow.js model
let model;
async function loadModel() {
    try {
        // Try loading EMNIST model first, fall back to MNIST if not available
        try {
            model = await tf.loadLayersModel('./tfjs_emnist_model/model.json');
        } catch {
            model = await tf.loadLayersModel('./tfjs_mnist_model/model.json');
        }
        console.log("Model loaded successfully");
    } catch (error) {
        console.error("Error loading model: ", error);
        resultDiv.textContent = "Failed to load the model";
    }
}

// Call this function when the page loads
loadModel();

// Preprocess the canvas image to match model input
function preprocessCanvas(canvas) {
    // Resize the image to 28x28
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = 28;
    resizedCanvas.height = 28;
    const resizedCtx = resizedCanvas.getContext('2d');
    resizedCtx.drawImage(canvas, 0, 0, 28, 28);
    
    // Get image data
    const imageData = resizedCtx.getImageData(0, 0, 28, 28);
    const data = imageData.data;
    
    // Create a Float32Array to hold the grayscale values
    const grayscaleData = new Float32Array(28 * 28);
    
    // Convert to grayscale and normalize
    for (let i = 0; i < data.length; i += 4) {
        // Calculate average of RGB channels
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Normalize pixel value to [0, 1]
        grayscaleData[i / 4] = avg / 255.0;
    }
    
    // Invert colors if necessary (MNIST digits are white on black background)
    for (let i = 0; i < grayscaleData.length; i++) {
        grayscaleData[i] = 1 - grayscaleData[i];
    }
    
    // Reshape to match the model's input shape [1, 28, 28, 1]
    const tensor = tf.tensor4d(grayscaleData, [1, 28, 28, 1]);
    return tensor;
}

// Function to make predictions
async function predictImage() {
    if (!model) {
        console.error("Model not loaded yet");
        resultDiv.textContent = "Model not loaded yet";
        return;
    }
    
    // Preprocess the image
    const tensor = preprocessCanvas(canvas);
    
    // Make predictions
    const prediction = model.predict(tensor);
    const probabilities = prediction.dataSync();
    const predictedDigit = probabilities.indexOf(Math.max(...probabilities));
    const confidence = Math.max(...probabilities) * 100;
    
    // Display the result
    resultDiv.textContent = `Predicted digit: ${predictedDigit} (Confidence: ${confidence.toFixed(2)}%)`;
    
    // Dispose tensors to free memory
    tensor.dispose();
    prediction.dispose();
}

// Bind the submit button to the prediction logic
submitBtn.addEventListener('click', predictImage);

// Drawing logic
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Touch events for mobile, preventing default to avoid scrolling
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draw({ clientX: touch.clientX, clientY: touch.clientY });
});
canvas.addEventListener('touchend', stopDrawing);

// Function definitions for drawing
function startDrawing(event) {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(
        event.clientX - canvas.getBoundingClientRect().left,
        event.clientY - canvas.getBoundingClientRect().top
    );
}

function draw(event) {
    if (!isDrawing) return;
    ctx.lineTo(
        event.clientX - canvas.getBoundingClientRect().left,
        event.clientY - canvas.getBoundingClientRect().top
    );
    ctx.stroke();
}

function stopDrawing() {
    isDrawing = false;
    ctx.closePath();
}
