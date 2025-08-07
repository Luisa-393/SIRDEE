// script.js

// Referencias a los elementos del DOM
const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const ctx = canvas.getContext('2d');

// Parámetros del modelo (ajustar según tu modelo ONNX)
const modelPath = 'best.onnx'; // Ruta a tu modelo
const modelWidth = 640;
const modelHeight = 640;

// Inicializar la sesión de inferencia de ONNX
const session = new onnx.InferenceSession();

// Variable para controlar el bucle de detección
let isModelLoaded = false;

// ------------------------------------------------------------------
// 1. Cargar el modelo ONNX
// ------------------------------------------------------------------
async function loadModel() {
    try {
        await session.loadModel(modelPath);
        console.log("Modelo ONNX cargado exitosamente.");
        isModelLoaded = true;
    } catch (err) {
        console.error("Error al cargar el modelo:", err);
        isModelLoaded = false;
    }
}

// ------------------------------------------------------------------
// 2. Acceder a la cámara y comenzar el bucle de detección
// ------------------------------------------------------------------
async function startDetection() {
    if (!isModelLoaded) {
        console.error("El modelo aún no ha sido cargado. Vuelve a intentarlo.");
        return;
    }

    // Configurar el canvas para que coincida con el video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Bucle de detección
    detectFrame();
}

// ------------------------------------------------------------------
// 3. Bucle principal para procesar cada fotograma
// ------------------------------------------------------------------
async function detectFrame() {
    if (video.paused || video.ended) {
        return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Pre-procesar el fotograma del canvas
    const preprocessedTensor = preprocess(canvas);

    // Ejecutar la inferencia del modelo
    const outputMap = await session.run([preprocessedTensor]);

    // Extraer la salida de la inferencia
    // (Ajusta la clave o índice según la salida de tu modelo)
    const outputTensor = outputMap.values().next().value;
    const outputData = outputTensor.data;

    // Post-procesar los resultados y dibujar en el canvas
    const boxes = postprocess(outputData);
    drawBoxes(boxes);

    // Llamar a la función nuevamente en el siguiente cuadro de animación
    requestAnimationFrame(detectFrame);
}

// ------------------------------------------------------------------
// 4. Funciones de pre-procesamiento y post-procesamiento
// ------------------------------------------------------------------
function preprocess(canvas) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;

    // Crear un nuevo canvas para redimensionar la imagen a las dimensiones del modelo
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = modelWidth;
    tempCanvas.height = modelHeight;
    tempCtx.drawImage(canvas, 0, 0, modelWidth, modelHeight);
    
    const resizedImageData = tempCtx.getImageData(0, 0, modelWidth, modelHeight);
    const resizedData = resizedImageData.data;

    // Crear un tensor de entrada de ONNX.js
    const inputTensor = new onnx.Tensor(new Float32Array(3 * modelWidth * modelHeight), 'float32', [1, 3, modelWidth, modelHeight]);
    
    // Normalizar y reorganizar los datos de la imagen (NCHW)
    for (let i = 0; i < resizedData.length; i += 4) {
        const r = resizedData[i] / 255.0;
        const g = resizedData[i + 1] / 255.0;
        const b = resizedData[i + 2] / 255.0;

        const idx = Math.floor(i / 4);
        inputTensor.data[idx] = r;
        inputTensor.data[idx + modelWidth * modelHeight] = g;
        inputTensor.data[idx + modelWidth * modelHeight * 2] = b;
    }
    
    return inputTensor;
}

function postprocess(outputData) {
    // ESTA PARTE ES MUY ESPECÍFICA DE CADA MODELO.
    // Necesitas implementar la lógica para decodificar las predicciones
    // y aplicar la supresión de no-máximos (NMS) si es necesario.
    
    // Retorna un array de objetos con el formato: 
    // { x: number, y: number, width: number, height: number, confidence: number, class: string }
    
    // Ejemplo de un resultado dummy para que veas la estructura esperada:
    return [
        { x: 100, y: 50, width: 200, height: 300, confidence: 0.9, class: 'persona' },
        // ... más objetos detectados
    ];
}

function drawBoxes(boxes) {
    // Limpiar el canvas antes de dibujar nuevos cuadros
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    boxes.forEach(box => {
        // Dibujar el cuadro delimitador
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 4;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Dibujar la etiqueta
        ctx.fillStyle = '#00FF00';
        ctx.font = '24px Arial';
        const label = `${box.class} (${(box.confidence * 100).toFixed(2)}%)`;
        ctx.fillText(label, box.x, box.y > 20 ? box.y - 10 : 20);
    });
}

// ------------------------------------------------------------------
// 5. Iniciar la aplicación
// ------------------------------------------------------------------
async function init() {
    await loadModel();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user' // 'user' para la cámara frontal, 'environment' para la trasera
            }
        });
        video.srcObject = stream;
        
        video.onloadeddata = () => {
            // Esperar a que los metadatos del video estén listos para obtener sus dimensiones
            video.play();
            startDetection();
        };
    } catch (err) {
        console.error("No se pudo acceder a la cámara:", err);
    }
}

// Iniciar todo
init();