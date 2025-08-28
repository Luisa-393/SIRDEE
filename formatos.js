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

        // Limpiar deformación unitaria si no hay promedio válido
        const filas = document.querySelectorAll('#tablaDatos tbody tr');
        filas.forEach(fila => {
            fila.children[2].innerText = '';
        });
    }

    actualizarGrafica();
}


// ===== Calcular Promedio Longitud en mm para PILAS =====
function calcularPromedioLongitudMM() {
    const longitudes = [
        parseFloat(document.getElementById('long1Lado1')?.value),
        parseFloat(document.getElementById('long1Lado2')?.value),
        parseFloat(document.getElementById('long2Lado1')?.value),
        parseFloat(document.getElementById('long2Lado2')?.value),
        parseFloat(document.getElementById('long3Lado1')?.value),
        parseFloat(document.getElementById('long3Lado2')?.value)
    ];

    // Filtrar solo válidos
    const validos = longitudes.filter(v => !isNaN(v));

    const promedioInput = document.getElementById('promedioLongitud');
    const filas = document.querySelectorAll('#tablaDatos tbody tr');

    if (validos.length === 6) {
        const promedioCM = validos.reduce((a, b) => a + b, 0) / 6;
        const promedioMM = promedioCM * 10;
        promedioInput.value = promedioMM.toFixed(2);

        // Calcular deformación unitaria
        filas.forEach(fila => {
            const deformacionPromedio = parseFloat(fila.children[1].innerText.trim());
            fila.children[2].innerText = (!isNaN(deformacionPromedio) && promedioMM !== 0)
                ? (deformacionPromedio / promedioMM).toFixed(6)
                : '';
        });

    } else {
        promedioInput.value = '';
        // Limpiar la columna de Deformación Unitaria si no hay promedio válido
        filas.forEach(fila => {
            fila.children[2].innerText = '';
        });
    }

    actualizarGrafica();
}


// CILINDROS FUNCIÓN PARA CALCULAR ÁREA AUTOMÁTICA DESDE DIÁMETRO
function calcularArea() {
    const diametro = parseFloat(document.getElementById('diametro').value);
    const areaCelda = document.getElementById('areaCelda');

    if (!isNaN(diametro) && diametro > 0) {
        const radio = diametro / 2;
        const area = Math.PI * Math.pow(radio, 2);
        areaCelda.textContent = area.toFixed(2);

        // Recalcular esfuerzo en la tabla solo si hay área
        const filas = document.querySelectorAll('#tablaDatos tbody tr');
        filas.forEach(fila => {
            const carga = parseFloat(fila.querySelector('.carga')?.innerText.trim());
            const celdaEsfuerzo = fila.querySelector('.esfuerzo');

            if (!isNaN(carga)) {
                const esfuerzo = (carga / area).toFixed(2);
                celdaEsfuerzo.innerText = esfuerzo;
            } else {
                celdaEsfuerzo.innerText = '';
            }
        });

        actualizarGrafica();
    } else {
        //si no hay diámetro, limpiar área y esfuerzos
        areaCelda.textContent = '';

        const filas = document.querySelectorAll('#tablaDatos tbody tr');
        filas.forEach(fila => {
            const celdaEsfuerzo = fila.querySelector('.esfuerzo');
            if (celdaEsfuerzo) celdaEsfuerzo.innerText = '';
        });

        actualizarGrafica();
    }
}



// ======== Cargar datos al iniciar  ========
document.addEventListener('DOMContentLoaded', async function () {

    // ======== Establecer fecha actual en "Fecha de ruptura" ========
    const hoy = new Date();
    const fechaActual = hoy.getFullYear() + "-" +
        String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
        String(hoy.getDate()).padStart(2, "0");


    const inputsFecha = document.querySelectorAll('input[type="date"]');
    inputsFecha.forEach(input => {
        const th = input.closest('td')?.previousElementSibling;
        if (th && th.textContent.trim().toLowerCase().includes('fecha de ruptura')) {
            input.value = fechaActual;
        }
    });

    calcularLongitudPromedioMM();

    const datos = JSON.parse(localStorage.getItem('datosDeformaciones')) || [];
    const tbody = document.querySelector('#tablaDatos tbody');

    //const longitudControl = parseFloat(document.getElementById('longitudPromedio').value);
    const longitudInput = document.getElementById('longitudPromedio') || document.getElementById('promedioLongitud');
    const longitudControl = longitudInput ? parseFloat(longitudInput.value) : null;

    // Si no hay promedio al inicio, limpiar deformación unitaria
    if (!longitudControl || isNaN(longitudControl) || longitudControl <= 0) {
        document.querySelectorAll('#tablaDatos tbody tr').forEach(fila => {
            fila.children[2].innerText = '';
        });
    }

    //crear filas con deformaciones
    datos.forEach(dato => {
        const promedio = parseFloat(dato.promedio);
        const deformacionUnitaria = (!isNaN(longitudControl) && longitudControl > 0)
            ? (promedio / longitudControl).toFixed(6)
            : '';

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${dato.tiempo}</td>
            <td>${dato.promedio}</td>
            <td class="deformacion">${deformacionUnitaria}</td>
            <td class="carga"></td> 
            <td class="esfuerzo"></td>
        `;
        tbody.appendChild(fila);
    });


    // ======== LECTURA AUTOMÁTICA DE CARGA KG DESDE SUPABASE ========
    const filas = document.querySelectorAll('#tablaDatos tbody tr');

    for (let i = 0; i < filas.length; i++) {
        // Valor de la columna "Lectura de Tiempo (seg)"
        const tiempoConfig = parseInt(filas[i].children[0].innerText.trim(), 10);

        // Ajustar consulta según la configuración de lectura de tiempo
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


    // ======== CALCULAR ESFUERZO AL INGRESAR ÁREA PARA MURETES Y PILAS========
    const areaInput = document.getElementById('areaInput'); // <-- solo existe en muretes y pilas
    if (areaInput) {
        areaInput.addEventListener('input', function () {
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
    }

    // Detectar si estoy en la página de pilas (IDs exclusivos de pilas)
    if (document.getElementById('long1Lado1')) {
        ['long1Lado1', 'long1Lado2', 'long2Lado1', 'long2Lado2', 'long3Lado1', 'long3Lado2']
            .forEach(id => {
                document.getElementById(id).addEventListener('input', calcularPromedioLongitudMM);
            });

        // Calcular al inicio también
        calcularPromedioLongitudMM();
    }
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


// Escuchar cambios de longitud para cilindros y muretes
const inputLong1 = document.getElementById('longitud1');
if (inputLong1) inputLong1.addEventListener('input', calcularLongitudPromedioMM);

const inputLong2 = document.getElementById('longitud2');
if (inputLong2) inputLong2.addEventListener('input', calcularLongitudPromedioMM);


// Escuchar cambios en diámetro (solo si existe, o sea en cilindros.html)
const inputDiametro = document.getElementById('diametro');
if (inputDiametro) {
    inputDiametro.addEventListener('input', calcularArea);
}


// ===== FUNCIÓN DE VALIDACIÓN GENERAR PDF=====
function validarDatosParaPDF() {
    // Validar tabla de datos generales
    const inputsGenerales = document.querySelectorAll('.tabla-datos-generales input');
    for (let input of inputsGenerales) {
        if (input.type !== 'readonly' && input.value.trim() === '') {
            alert("Debes ingresar los datos faltantes.");
            return false;
        }
    }

    // Validar tabla de mediciones
    const filas = document.querySelectorAll('#tablaDatos tbody tr');
    if (filas.length === 0) {
        alert("La tabla está vacía.");
        return false;
    }

    for (let fila of filas) {
        let celdas = fila.querySelectorAll('td');
        for (let celda of celdas) {
            if (celda.innerText.trim() === '' || celda.innerText.trim() === '-') {
                alert("Debes ingresar los datos faltantes.");
                return false;
            }
        }
    }

    return true; // Todo correcto
}


// Botón generar PDF
document.getElementById('btnGenerarPDF').addEventListener('click', async function () {
    if (!validarDatosParaPDF()) return; // Si falla validación, no sigue

    const contenido = document.getElementById('contenidoParaPDF');
    const canvas = document.getElementById('graficaDeformaciones');
    const imgData = canvas.toDataURL('image/png', 1.0);

    const contenidoClonado = contenido.cloneNode(true);

    // Reemplazar el canvas por imagen
    const canvasClon = contenidoClonado.querySelector('#graficaDeformaciones');
    const img = document.createElement('img');
    img.src = imgData;
    img.style.width = '100%';
    img.style.height = 'auto';
    canvasClon.replaceWith(img);

    // Ocultar los botones en el clon
    const botonClonadoPDF = contenidoClonado.querySelector('#btnGenerarPDF');
    if (botonClonadoPDF) botonClonadoPDF.style.display = 'none';
    const botonClonadoAuto = contenidoClonado.querySelector('#btnAutoCarga');
    if (botonClonadoAuto) botonClonadoAuto.style.display = 'none';

    // Nombre dinámico
    const titulo = document.querySelector('h2').innerText.toLowerCase();
    let nombreArchivo = 'formato-ensaye.pdf';
    if (titulo.includes('cilindros')) nombreArchivo = 'formato-ensaye-cilindros.pdf';
    else if (titulo.includes('muretes')) nombreArchivo = 'formato-ensaye-muretes.pdf';
    else if (titulo.includes('pilas')) nombreArchivo = 'formato-ensaye-pilas.pdf';

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
        pagebreak: { mode: ['css', 'legacy'], before: '.salto-pagina', avoid: '#tablaDatos tr' }
    };

    // Generar PDF y luego eliminar datos
    await html2pdf().set(opciones).from(contenidoClonado).save();

    // ELIMINAR DATOS DESPUÉS DE GENERAR EL PDF

    // 1. Vaciar tabla en el HTML
    document.querySelector('#tablaDatos tbody').innerHTML = "";

    // 2. Eliminar del LocalStorage
    localStorage.removeItem('datosDeformaciones');

    // 3. Eliminar datos de Supabase
    try {
        // Borrar todos los registros de Weight_carga
        await supabase.from('Weight_carga').delete();

        // Borrar todos los registros de Sensor_LDVT
        await supabase.from('Sensor_LDVT').delete().neq('id', 0);

        console.log("Datos eliminados correctamente de Supabase");
    } catch (error) {
        console.error("Error al eliminar en Supabase:", error);
    }

    // 4. Limpiar campo Responsable del ensayo
    const responsableInput = document.querySelector('input[value="Ing. Yazmin Osiris Linares González"]');
    if (responsableInput) responsableInput.value = "";

    // 5. Recargar la página para actualizar gráfica y tabla
    setTimeout(() => {
        location.reload();
    }, 800); // pequeño retraso para asegurar que borra antes de recargar
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