// FUNCIÓN PARA CALCULAR PROMEDIO EN MM
function calcularLongitudPromedioMM() {
    const input1 = document.getElementById('longitud1');
    const input2 = document.getElementById('longitud2');
    const promedioInput = document.getElementById('longitudPromedio');

    // Si alguno de los elementos no existe, salimos sin hacer nada
    if (!input1 || !input2 || !promedioInput) {
        return;
    }

    const l1 = parseFloat(input1.value);
    const l2 = parseFloat(input2.value);

    if (!isNaN(l1) && !isNaN(l2)) {
        const promedioCM = (l1 + l2) / 2;
        const promedioMM = promedioCM * 10;
        promedioInput.value = promedioMM.toFixed(3);

        // Recalcular deformación unitaria (ε) en cada fila
        const filas = document.querySelectorAll('#tablaDatos tbody tr');
        filas.forEach(fila => {
            const deformacionPromedio = parseFloat(fila.children[1].innerText.trim());
            fila.children[2].innerText = (!isNaN(deformacionPromedio) && promedioMM !== 0)
                ? (deformacionPromedio / promedioMM).toFixed(6)
                : '';
        });

        actualizarGrafica(); //  actualizar gráfica si ε cambia
    } else {
        promedioInput.value = '';
    }
}


// ======== CARGA INICIAL DE DATOS ========
document.addEventListener('DOMContentLoaded', async function () {
    calcularLongitudPromedioMM();

    const datos = JSON.parse(localStorage.getItem('datosDeformaciones')) || [];
    const tbody = document.querySelector('#tablaDatos tbody');
    const longitudControl = parseFloat(document.getElementById('longitudPromedio').value);

    //crear filas con deformaciones
    datos.forEach(dato => {
        const promedio = parseFloat(dato.promedio);
        const deformacionUnitaria = longitudControl ? (promedio / longitudControl).toFixed(6) : '';

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${dato.tiempo}</td>
            <td>${dato.promedio}</td>
            <td class="deformacion">${deformacionUnitaria}</td>
            <td contenteditable="true" class="editable carga"></td> 
            <td class="esfuerzo"></td>
        `;
        tbody.appendChild(fila);
    });






    // ======== LECTURA AUTOMÁTICA DE CARGAS DESDE SUPABASE ========
    const filas = document.querySelectorAll('#tablaDatos tbody tr');

    for (let i = 0; i < filas.length; i++) {
        // Valor de la columna "Lectura de Tiempo (seg)"
        const tiempoConfig = parseInt(filas[i].children[0].innerText.trim(), 10);


        // Ajustar consulta según tu configuración de lectura de tiempo
        const { data, error } = await supabase
            .from('Weight_carga')
            .select('peso_enviado')
            .eq('id', tiempoConfig) // Coincidencia exacta con la columna Tiempo
            .order('id', { ascending: true })
            .limit(1);

        if (error) {
            console.error("Error en Supabase:", error);
            continue;
        }

        if (data && data.length > 0) {
            const pesoKg = data[0].peso_enviado;
            filas[i].querySelector('.carga').innerText = pesoKg;
        }
    }


    // ======== CALCULAR ESFUERZO AL INGRESAR ÁREA ========
    document.getElementById('areaInput').addEventListener('input', function () {
        const nuevaArea = parseFloat(this.value);
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
});


// Escuchar cambios de longitud
document.getElementById('longitud1').addEventListener('input', calcularLongitudPromedioMM);
document.getElementById('longitud2').addEventListener('input', calcularLongitudPromedioMM);



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
    img.style.width = '100%';   // Tamaño reducido 
    img.style.height = 'auto';

    canvasClon.replaceWith(img);

    // Ocultar los botones en el clon para que no salgan en el PDF
    const botonClonadoPDF = contenidoClonado.querySelector('#btnGenerarPDF');
    if (botonClonadoPDF) botonClonadoPDF.style.display = 'none';

    const botonClonadoAuto = contenidoClonado.querySelector('#btnAutoCarga');
    if (botonClonadoAuto) botonClonadoAuto.style.display = 'none';

    // 🔹 Detectar tipo de formato desde el <h2>
    const titulo = document.querySelector('h2').innerText.toLowerCase();
    let nombreArchivo = 'formato-ensaye.pdf';
    if (titulo.includes('cilindros')) {
        nombreArchivo = 'formato-ensaye-cilindros.pdf';
    } else if (titulo.includes('muretes')) {
        nombreArchivo = 'formato-ensaye-muretes.pdf';
    } else if (titulo.includes('pilas')) {
        nombreArchivo = 'formato-ensaye-pilas.pdf';
    }

    // Generar fecha y hora actual en formato YYYY-MM-DD-HH-MM
    const ahora = new Date();
    const fechaHora = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}-${String(ahora.getHours()).padStart(2, '0')}-${String(ahora.getMinutes()).padStart(2, '0')}`;


    const opciones = {
        margin: [10, 20, 10, 20], // [arriba, derecha, abajo, izquierda] en mm
        filename: `${nombreArchivo}-${fechaHora}.pdf`, // ← Nombre dinámico con fecha y hora
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
            format: 'letter', //tamaño carta 
            orientation: 'portrait'
        },
        pagebreak: {
            mode: ['css', 'legacy'],
            before: '.salto-pagina',
            avoid: '#tablaDatos tr' // Evita que corte una fila en dos páginas

        }
    };
    //generar pdf
    html2pdf().set(opciones).from(contenidoClonado).save();
});





// Recalcular esfuerzos cuando cambia el área
/*document.getElementById('areaInput').addEventListener('input', function () {
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
});*/


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
                    label: 'Esfuerzo vs Deformación',
                    data: esfuerzos,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0,123,255,0.3)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: // si hay muchos datos, puntos pequeños
                        deformaciones.length > 30 ? 1 :  //mas de 25 puntos  → muy pequeños
                            deformaciones.length > 20 ? 2 :
                                5,

                    pointBackgroundColor: '#007bff',
                    //grosor de la linea grafica
                    borderWidth:
                        deformaciones.length > 25 ? 1 : // si hay más de 25 puntos, línea más delgada
                            deformaciones.length > 15 ? 1.5 : // si hay entre 16 y 25 puntos, intermedio
                                2, // menos de 15 puntos, grosor normal
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'nearest',
                intersect: false
            },
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

// Mostrar promedios
/*if (esfuerzos.length > 0 && deformaciones.length > 0) {
    const promEsfuerzo = (esfuerzos.reduce((a, b) => a + b, 0) / esfuerzos.length).toFixed(2);
    const promDeformacion = (deformaciones.reduce((a, b) => a + b, 0) / deformaciones.length).toFixed(4);

    document.getElementById('promedios').innerHTML = `
        <h5 class="fw-bold">Promedios</h5>
        <p><strong>Prom σ:</strong> ${promEsfuerzo}</p>
        <p><strong>Prom ε:</strong> ${promDeformacion}</p>
    `;
} else {
    document.getElementById('promedios').innerHTML = '';
}*/







// ===== BOTÓN PARA LECTURA AUTOMÁTICA DE CARGA =====
/*document.getElementById('btnAutoCarga').addEventListener('click', function () {
    const filas = document.querySelectorAll('#tablaDatos tbody tr');
    const area = parseFloat(document.getElementById('areaInput').value);

    if (isNaN(area) || area === 0) {
        alert("Primero ingresa el área (cm²) para calcular el esfuerzo.");
        return;
    }

    let cargaActual = 0; // empieza desde 0
    let incremento = 5; // kg que aumentará cada paso
    let i = 0;

    const intervalo = setInterval(() => {
        if (i >= filas.length) {
            clearInterval(intervalo); // detener cuando no haya más filas
            return;
        }

        const fila = filas[i];
        const celdaCarga = fila.querySelector('.carga');
        const celdaEsfuerzo = fila.querySelector('.esfuerzo');

        cargaActual += incremento; // aumentar carga
        celdaCarga.innerText = cargaActual.toFixed(2); // mostrar carga con 2 decimales

        const esfuerzo = (cargaActual / area).toFixed(2);
        celdaEsfuerzo.innerText = esfuerzo;

        actualizarGrafica(); // refrescar gráfico y promedios

        i++;
    }, 500); // medio segundo entre lecturas
});*/



