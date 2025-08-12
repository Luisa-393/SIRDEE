// ===== Calcular Promedio Longitud en mm =====
function calcularPromedioLongitudMM() {
    const longitudes = [
        parseFloat(document.getElementById('long1Lado1').value),
        parseFloat(document.getElementById('long1Lado2').value),
        parseFloat(document.getElementById('long2Lado1').value),
        parseFloat(document.getElementById('long2Lado2').value),
        parseFloat(document.getElementById('long3Lado1').value),
        parseFloat(document.getElementById('long3Lado2').value)
    ];

    const validos = longitudes.filter(v => !isNaN(v));

    if (validos.length === 6) {
        const promedioCM = validos.reduce((a, b) => a + b, 0) / 6;
        const promedioMM = promedioCM * 10;
        document.getElementById('promedioLongitud').value = promedioMM.toFixed(2);

        // Recalcular deformación unitaria
        const filas = document.querySelectorAll('#tablaDatos tbody tr');
        filas.forEach(fila => {
            const deformacionPromedio = parseFloat(fila.children[1].innerText.trim());
            fila.children[2].innerText = (!isNaN(deformacionPromedio) && promedioMM !== 0)
                ? (deformacionPromedio / promedioMM).toFixed(6)
                : '';
        });

        actualizarGrafica();
    } else {
        document.getElementById('promedioLongitud').value = '';
    }
}

// ===== Actualizar Gráfica =====
function actualizarGrafica() {
    const filas = document.querySelectorAll('#tablaDatos tbody tr');
    const deformaciones = [];
    const esfuerzos = [];

    filas.forEach(fila => {
        const deformacion = parseFloat(fila.querySelector('.deformacion')?.innerText.trim());
        const esfuerzo = parseFloat(fila.querySelector('.esfuerzo')?.innerText.trim());
        if (!isNaN(deformacion) && !isNaN(esfuerzo)) {
            deformaciones.push(deformacion);
            esfuerzos.push(esfuerzo);
        }
    });

    const ctx = document.getElementById('graficaDeformaciones').getContext('2d');
    if (window.miGrafica) window.miGrafica.destroy();

    window.miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: deformaciones,
            datasets: [{
                label: 'Esfuerzo vs Deformación',
                data: esfuerzos,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0,123,255,0.3)',
                tension: 0.4,
                fill: false,
                pointRadius: deformaciones.length > 30 ? 1 : deformaciones.length > 20 ? 2 : 5,
                pointBackgroundColor: '#007bff',
                borderWidth: deformaciones.length > 25 ? 1 : deformaciones.length > 15 ? 1.5 : 2
            }]
        },
        options: {
            responsive: true,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                tooltip: { enabled: true },
                legend: { display: true, position: 'top' },
                title: { display: true, text: 'Curva Esfuerzo - Deformación' }
            },
            scales: {
                x: { title: { display: true, text: 'Deformación Unitaria (ε)' } },
                y: { title: { display: true, text: 'Esfuerzo (σ)' } }
            }
        }
    });
}

// ===== Recalcular esfuerzos cuando cambia el área =====
document.getElementById('areaInput').addEventListener('input', function () {
    const nuevaArea = parseFloat(this.value);
    document.querySelectorAll('#tablaDatos tbody tr').forEach(fila => {
        const carga = parseFloat(fila.querySelector('.carga')?.innerText.trim());
        const celdaEsfuerzo = fila.querySelector('.esfuerzo');
        celdaEsfuerzo.innerText = (!isNaN(carga) && !isNaN(nuevaArea) && nuevaArea !== 0)
            ? (carga / nuevaArea).toFixed(2)
            : '';
    });
    actualizarGrafica();
});

// ===== Actualizar esfuerzo al editar celdas =====
document.addEventListener('input', function (e) {
    if (e.target.classList.contains('editable')) {
        const fila = e.target.closest('tr');
        const carga = parseFloat(fila.querySelector('.carga').innerText.trim());
        const area = parseFloat(document.getElementById('areaInput').value);
        const celdaEsfuerzo = fila.querySelector('.esfuerzo');
        celdaEsfuerzo.innerText = (!isNaN(carga) && !isNaN(area) && area > 0)
            ? (carga / area).toFixed(2)
            : '';
        actualizarGrafica();
    }
});

// ===== Generar PDF =====
document.getElementById('btnGenerarPDF').addEventListener('click', function () {
    const contenido = document.getElementById('contenidoParaPDF');
    const canvas = document.getElementById('graficaDeformaciones');
    const imgData = canvas.toDataURL('image/png', 1.0);

    const contenidoClonado = contenido.cloneNode(true);
    
    // Reemplazar canvas por imagen
    const canvasClon = contenidoClonado.querySelector('#graficaDeformaciones');
    const img = document.createElement('img');
    img.src = imgData;
    img.style.width = '450px';
    img.style.height = 'auto';
    canvasClon.replaceWith(img);

    ['#btnGenerarPDF', '#btnAutoCarga'].forEach(id => {
        const boton = contenidoClonado.querySelector(id);
        if (boton) boton.style.display = 'none';
    });

    let nombreArchivo = 'formato-ensaye-pilas.pdf';
    const ahora = new Date();
    const fechaHora = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}-${String(ahora.getHours()).padStart(2, '0')}-${String(ahora.getMinutes()).padStart(2, '0')}`;

    const opciones = {
        margin: [10, 20, 10, 20],
        filename: `${nombreArchivo}-${fechaHora}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 3,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: document.body.scrollWidth,
            windowHeight: document.body.scrollHeight
        },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '#tablaDatos tr' }
    };
    html2pdf().set(opciones).from(contenidoClonado).save();
});

// ===== Cargar datos al iniciar =====
document.addEventListener('DOMContentLoaded', function () {
    calcularPromedioLongitudMM();

    const datos = JSON.parse(localStorage.getItem('datosDeformaciones')) || [];
    const tbody = document.querySelector('#tablaDatos tbody');
    const area = parseFloat(document.getElementById('areaInput').value);
    const longitudControl = parseFloat(document.getElementById('promedioLongitud').value);

    datos.forEach(dato => {
        const promedio = parseFloat(dato.promedio);
        const deformacionUnitaria = (!isNaN(longitudControl) && longitudControl > 0)
            ? (promedio / longitudControl).toFixed(6)
            : '';

        const carga = parseFloat(dato.carga);
        const esfuerzo = (!isNaN(carga) && carga > 0 && !isNaN(area) && area > 0)
            ? (carga / area).toFixed(2)
            : '';

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${dato.tiempo}</td>
            <td>${dato.promedio}</td>
            <td class="deformacion">${deformacionUnitaria}</td>
            <td contenteditable="true" class="editable carga">${!isNaN(carga) && carga > 0 ? carga : ''}</td>
            <td class="esfuerzo">${esfuerzo}</td>
        `;
        tbody.appendChild(fila);
    });
});

// ===== Escuchar cambios en longitudes =====
['long1Lado1', 'long1Lado2', 'long2Lado1', 'long2Lado2', 'long3Lado1', 'long3Lado2']
    .forEach(id => {
        document.getElementById(id).addEventListener('input', calcularPromedioLongitudMM);
    });
