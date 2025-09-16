// CARGAR EL MODELO 
let modelo;

async function cargarModelo() {
  document.getElementById('statusLabel').innerHTML = '<span class="text-info">Cargando modelo...</span>';
  modelo = await tf.loadGraphModel('../modelo/model.json');

  // Debug: mostrar salida del modelo (solo una vez al inicio)
  const dummy = tf.zeros([1, 640, 640, 3]);
  const outs = modelo.execute(dummy);
  console.log('Debug outs:', outs); // Para ver la estructura exacta
  if (Array.isArray(outs)) {
    outs.forEach((t, i) => console.log(`Salida ${i}:`, t.shape));
  } else {
    console.log('Salida única:', outs.shape);
  }
  dummy.dispose();
  tf.dispose(outs);  // dispose si es array o tensor

  document.getElementById('statusLabel').innerHTML = '<span class="text-success">Modelo cargado correctamente.</span>';
}

window.onload = cargarModelo;

// === FUNCIÓN DE DETECCIÓN (parsing YOLOv8 para 10 clases, shape [1,14,8400]) ===
async function detectarObjetos(video, ctx, canvas) {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return tf.tidy(() => {
    const input = tf.browser.fromPixels(canvas)
      .resizeBilinear([640, 640])
      .toFloat()
      .div(255.0)
      .expandDims(0);

    const outs = modelo.execute(input);
    let data;

    // Manejar salida: para YOLOv8, es [1, 14, 8400] (batch, attrs, preds)
    if (Array.isArray(outs)) {
      data = outs[0].dataSync();
    } else {
      data = outs.dataSync();
    }

    // Verificar shape correcto para [1,14,8400]
    if (data.length !== 14 * 8400) {
      console.warn('Shape inesperado, data.length:', data.length);
      tf.dispose(outs);
      return null;
    }

    const numPreds = 8400;
    const numAttrs = 14;  // 4 box + 10 clases (sin conf separada en YOLOv8)
    let digitBoxes = [];

    for (let i = 0; i < numPreds; i++) {
      // Acceso directo: conf = max de clases (data[i + j * numPreds] para j=4 a 13)
      let bestCls = -1;
      let bestProb = 0;
      for (let j = 4; j < numAttrs; j++) {  // Clases en 4-13 (10 clases: 0-9)
        const prob = data[i + j * numPreds];
        if (!isNaN(prob) && prob > bestProb) {
          bestProb = prob;
          bestCls = j - 4;  // 0 a 9
        }
      }
      const conf = bestProb;  // En YOLOv8, conf = max class prob
      if (conf > 0.25 && !isNaN(conf)) {
        // Permitir clases 0-9
        if (bestCls >= 0 && bestCls <= 9) {
          // Para posición: cx = data[i + 0 * numPreds], w = data[i + 2 * numPreds]
          const cx = data[i + 0 * numPreds];
          const w = data[i + 2 * numPreds];
          const x1 = cx - w / 2;
          if (!isNaN(x1) && !isNaN(cx) && !isNaN(w)) {
            digitBoxes.push({ x1, digit: bestCls, conf });
            console.log(`Detección: cls=${bestCls}, prob=${bestProb.toFixed(2)}, conf=${conf.toFixed(2)}, x1=${x1.toFixed(0)}`);  // Debug cada detección
          }
        }
      }
    }

    tf.dispose(outs);

    if (!digitBoxes.length) {
      console.log('No se detectaron dígitos válidos');
      return null;
    }

    // Ordenar por x1 (izquierda a derecha) y tomar top 4 (NMS simple: filtrar por conf)
    digitBoxes.sort((a, b) => a.x1 - b.x1);
    // NMS básico: eliminar detecciones con x1 muy similares (IoU approx por distancia)
    let filteredBoxes = [];
    for (let det of digitBoxes) {
      let overlap = false;
      for (let prev of filteredBoxes) {
        if (Math.abs(det.x1 - prev.x1) < 20) {  // Umbral de overlap ~20px
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        filteredBoxes.push(det);
      }
    }
    digitBoxes = filteredBoxes.slice(0, 6);  // Max 6 dígitos

    const digits = digitBoxes.map(d => d.digit.toString());
    const numberStr = digits.join("");

    // Validar: solo si 1-6 dígitos, todo dígitos
    if (numberStr.length < 1 || numberStr.length > 6 || !/^\d+$/.test(numberStr)) {
      console.log('Número inválido:', numberStr);
      return null;
    }

    const number = parseInt(numberStr);
    if (isNaN(number) || !isFinite(number)) {
      return null;
    }

    console.log('Número detectado:', number, 'Dígitos:', digits);  // Debug por frame
    return number;
  });
}

// === SUBIR VIDEO ===
function uploadVideo() {
  const video = document.getElementById('videoFile').files[0];
  if (!video) {
    document.getElementById('statusLabel').innerHTML = '<span class="text-danger">Debe seleccionar un video.</span>';
    return;
  }
  document.getElementById('statusLabel').innerHTML = '<span class="text-info">Video cargado correctamente.</span>';
}

// === PROCESAR VIDEO (por intervalo de frames, con FPS real) ===
async function processVideo(event) {
  if (event) event.preventDefault();

  const videoFile = document.getElementById('videoFile').files[0];
  const intervalo = parseInt(document.getElementById('intervalInput').value); // en ms
  const usarValidacion = true;

  if (!videoFile || !modelo) {
    document.getElementById('statusLabel').innerHTML = '<span class="text-danger">Selecciona un video y espera que cargue el modelo.</span>';
    return;
  }

  if (isNaN(intervalo) || intervalo <= 0) {
    document.getElementById('statusLabel').innerHTML = '<span class="text-danger">Ingresa un intervalo válido (ms).</span>';
    return;
  }

  document.getElementById('statusLabel').innerHTML = '<span class="text-warning">Cargando video y calculando FPS...</span>';

  const video = document.createElement('video');
  video.src = URL.createObjectURL(videoFile);
  video.muted = true;
  video.playbackRate = 16;

  await new Promise(res => video.addEventListener('loadeddata', res, { once: true }));

  let fps = 30;
  if (video.getVideoPlaybackQuality) {
    try {
      await video.play();
      await new Promise(res => video.addEventListener('ended', res, { once: true }));
      const quality = video.getVideoPlaybackQuality();
      if (quality.totalVideoFrames > 0 && video.duration > 0) {
        fps = quality.totalVideoFrames / video.duration;
        console.log(`FPS detectado: ${fps.toFixed(2)}`);
      }
    } catch (e) {
      console.warn('Error al reproducir para FPS:', e);
    }
    video.pause();
    video.currentTime = 0;
  } else {
    console.warn('getVideoPlaybackQuality no soportado; usando 30 FPS');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 640;

  const interval_frames = Math.round((intervalo / 1000.0) * fps);
  if (interval_frames < 1) {
    document.getElementById('statusLabel').innerHTML = '<span class="text-danger">Intervalo demasiado pequeño para el FPS.</span>';
    return;
  }

  document.getElementById('statusLabel').innerHTML = `<span class="text-warning">Procesando video (FPS: ${fps.toFixed(2)})...`;

  const totalFrames = Math.floor(video.duration * fps);
  const resultados = [];
  let frame_num = 0;

  while (frame_num <= totalFrames) {
    video.currentTime = frame_num / fps;
    await new Promise(res => video.addEventListener('seeked', res, { once: true }));

    const numeroDetectado = await detectarObjetos(video, ctx, canvas);

    resultados.push({
      frame: frame_num,
      resultado: numeroDetectado !== null ? numeroDetectado.toString() : "—"
    });

    frame_num += interval_frames;
  }

  // --- VALIDACIÓN POR PROMEDIO ---
  if (usarValidacion && resultados.length > 2) {
    for (let i = 1; i < resultados.length - 1; i++) {
      let anterior = Number(resultados[i - 1].resultado);
      let siguiente = Number(resultados[i + 1].resultado);
      let actual = Number(resultados[i].resultado);

      if (!isNaN(anterior) && !isNaN(siguiente) && !isNaN(actual)) {
        let promedio = (anterior + siguiente) / 2;

        // Elegir el vecino más cercano al promedio
        let candidato = Math.abs(promedio - anterior) < Math.abs(promedio - siguiente)
          ? anterior
          : siguiente;

        // Si el actual está más lejos del promedio que el vecino candidato, corregir
        if (Math.abs(actual - promedio) > Math.abs(candidato - promedio)) {
          console.log(`Corregido frame ${resultados[i].frame}: ${actual} → ${candidato}`);
          resultados[i].resultado = candidato.toString();
        }
      }
    }
  }

  // Mostrar en tabla
  let table = document.querySelector('#resultTable');
  if (!table) {
    table = document.createElement('table');
    table.id = 'resultTable';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Frame</th><th>Resultado</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    document.body.appendChild(table);  // Asume que se agrega al body
  }
  const tbody = document.querySelector('#resultTable tbody');
  tbody.innerHTML = '';
  resultados.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.frame}</td><td>${r.resultado}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('statusLabel').innerHTML =
    `<span class="text-success">Procesamiento finalizado. ${resultados.length} frames analizados (FPS: ${fps.toFixed(2)}).</span>`;
}