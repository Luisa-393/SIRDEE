// FUNCIÓN PARA CALCULAR PROMEDIO EN MM
function calcularLongitudPromedioMM() {
    const l1 = parseFloat(document.getElementById('longitud1').value);
    const l2 = parseFloat(document.getElementById('longitud2').value);
    const promedioInput = document.getElementById('longitudPromedio');

    if (!isNaN(l1) && !isNaN(l2)) {
        const promedioCM = (l1 + l2) / 2;
        const promedioMM = promedioCM * 10;
        promedioInput.value = promedioMM.toFixed(3);

        // Recalcular deformación unitaria (ε) en cada fila
        const filas = document.querySelectorAll('#tablaDatos tbody tr');
        filas.forEach(fila => {
            const celdaPromedio = fila.children[1]; // Deformación Promedio (mm)
            const celdaEpsilon = fila.children[2];  // Deformación Unitaria (ε)

            const deformacionPromedio = parseFloat(celdaPromedio.innerText.trim());

            if (!isNaN(deformacionPromedio) && promedioMM !== 0) {
                const epsilon = (deformacionPromedio / promedioMM).toFixed(6);
                celdaEpsilon.innerText = epsilon;
            } else {
                celdaEpsilon.innerText = '';
            }
        });

        actualizarGrafica(); //  actualizar gráfica si ε cambia
    } else {
        promedioInput.value = '';
    }
}


// DOMContentLoaded → se ejecuta al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    calcularLongitudPromedioMM();  // Se calcula al inicio

    const datos = JSON.parse(localStorage.getItem('datosDeformaciones')) || [];
    const tbody = document.querySelector('#tablaDatos tbody');
    const longitudControl = parseFloat(document.getElementById('longitudPromedio').value);

    datos.forEach(dato => {
        const fila = document.createElement('tr');
        const promedio = parseFloat(dato.promedio);
        const deformacionUnitaria = (promedio / longitudControl).toFixed(6);

        fila.innerHTML = `
            <td>${dato.tiempo}</td>
            <td>${dato.promedio}</td>
            <td class="deformacion">${deformacionUnitaria}</td>
            <td contenteditable="true" class="editable carga"></td>
            <td class="esfuerzo"></td>
        `;
        tbody.appendChild(fila);
    });
    //recalcular al cambiar valores en longitud promedio
    document.getElementById('longitud1').addEventListener('input', calcularLongitudPromedioMM);
    document.getElementById('longitud2').addEventListener('input', calcularLongitudPromedioMM);
});

//botón para forzar actualizar gráfica 
//document.getElementById('btnGraficar').addEventListener('click', actualizarGrafica);

// Botón generar PDF
document.getElementById('btnGenerarPDF').addEventListener('click', function () {
    const contenido = document.getElementById('contenidoParaPDF');
    const canvas = document.getElementById('graficaDeformaciones');
    const imgData = canvas.toDataURL('image/png', 1.0);

    const contenidoClonado = contenido.cloneNode(true);

    // Reemplazar el canvas por imagen
    const canvasClon = contenidoClonado.querySelector('#graficaDeformaciones');
    const img = document.createElement('img');
    img.src = imgData;

    // Aquí ajustamos el tamaño de la imagen (gráfica más pequeña)
    img.style.width = '350px';   // Tamaño reducido (ajusta según necesites)
    img.style.height = 'auto';

    canvasClon.replaceWith(img);

    // Ocultar el botón en el clon para que no salga en el PDF
    const botonClonado = contenidoClonado.querySelector('#btnGenerarPDF');
    if (botonClonado) {
        botonClonado.style.display = 'none';
    }

    const opciones = {
        margin: 0,
        filename: 'formato-ensaye-cilindros.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 3,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: document.body.scrollWidth,
            windowHeight: document.body.scrollHeight
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: { mode: 'css', before: '.salto-pagina' }
    };
    //generar pdf
    html2pdf().set(opciones).from(contenidoClonado).save();
});




// Recalcular esfuerzos cuando cambia el área
document.getElementById('areaInput').addEventListener('input', function () {
    const nuevaArea = parseFloat(this.value);
    const filas = document.querySelectorAll('#tablaDatos tbody tr');

    filas.forEach(fila => {
        const carga = parseFloat(fila.querySelector('.carga')?.innerText.trim());
        const celdaEsfuerzo = fila.querySelector('.esfuerzo');

        if (!isNaN(carga) && !isNaN(nuevaArea) && nuevaArea !== 0) {
            const esfuerzo = (carga / nuevaArea).toFixed(2);
            celdaEsfuerzo.innerText = esfuerzo;
        } else {
            celdaEsfuerzo.innerText = '';
        }
    });

    actualizarGrafica();
});




//actualizar esfuerzo al editar la tabla
document.addEventListener('input', function (e) {
    if (e.target.classList.contains('editable')) {
        const fila = e.target.closest('tr');
        const deformacion = parseFloat(fila.querySelector('.deformacion').innerText.trim());
        const carga = parseFloat(fila.querySelector('.carga').innerText.trim());
        const celdaEsfuerzo = fila.querySelector('.esfuerzo');

        const area = parseFloat(document.getElementById('areaInput').value);

        if (!isNaN(carga) && !isNaN(area)) {
            const esfuerzo = (carga / area).toFixed(2);
            celdaEsfuerzo.innerText = esfuerzo;
        } else {
            celdaEsfuerzo.innerText = '';
        }
        actualizarGrafica();
    }
});

//función para actualizar la gráfica 
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

    if (window.miGrafica) {
        window.miGrafica.destroy();
    }

    window.miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: deformaciones,
            datasets: [
                {
                    label: 'Sensor LVDT 01',
                    data: esfuerzos,
                    borderColor: '#FFA500',
                    backgroundColor: 'rgba(255,165,0,0.3)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 6,
                    pointBackgroundColor: '#FFA500',
                    borderWidth: 3
                },
                {
                    label: 'Sensor LVDT 02',
                    data: esfuerzos.map(e => e - 10), // ajustado
                    borderColor: '#FFD580',
                    backgroundColor: 'rgba(255,213,128,0.3)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 6,
                    pointBackgroundColor: '#FFD580',
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'nearest', intersect: false
            },
            plugins: {
                tooltip: { enabled: true },
                legend: { display: true, position: 'top' },
                title: { display: true, text: 'Esfuerzo-deformación sensores LVDT' }
            },
            scales: {
                x: { title: { display: true, text: 'Deformación (ε)' } },
                y: { title: { display: true, text: 'Esfuerzo (σ)' } }
            }
        }
    });

    // Mostrar promedios
    if (esfuerzos.length > 0 && deformaciones.length > 0) {
        const promEsfuerzo = (esfuerzos.reduce((a, b) => a + b, 0) / esfuerzos.length).toFixed(2);
        const promDeformacion = (deformaciones.reduce((a, b) => a + b, 0) / deformaciones.length).toFixed(4);

        document.getElementById('promedios').innerHTML = `
            <h5 class="fw-bold">Promedio de datos</h5>
            <p><strong>Promd σ:</strong> ${promEsfuerzo}</p>
            <p><strong>Promd ε:</strong> ${promDeformacion}</p>
        `;
    } else {
        document.getElementById('promedios').innerHTML = '';
    }
}