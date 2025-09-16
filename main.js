// === FUNCIÓN PARA TRUNCAR A 4 DECIMALES (NUMÉRICO REAL) ===
function truncar4Decimales(num) {
    if (num == null || isNaN(num)) return '';
    return (Math.trunc(num * 10000) / 10000).toFixed(4);
}

document.addEventListener('DOMContentLoaded', function () {
    // ======= CONFIGURAR TIEMPO Y GENERAR FILAS =========
    const modalTiempoEl = document.getElementById('modalTiempo');
    const modalTiempo = new bootstrap.Modal(modalTiempoEl);

    // Al ocultarse completamente el modal, mover foco al botón de graficar
    modalTiempoEl.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => {
            document.getElementById('btnGraficar').focus();
        }, 100); // Espera 100 ms para asegurar que el DOM y aria-hidden se actualicen
    });


    //generar datos al enviar formulario
    document.getElementById('formTiempo').addEventListener('submit', async function (event) {
        event.preventDefault();

        const inicio = parseInt(document.getElementById('inicio').value);
        const fin = parseInt(document.getElementById('fin').value);
        const salto = parseInt(document.getElementById('salto').value);
        const tbody = document.querySelector('#tablaDatos tbody');
        tbody.innerHTML = ''; // Limpiar tabla

        if (inicio < 0 || fin < inicio || salto <= 0) {
            alert('Verifica que los valores de inicio, fin e intervalo sean válidos.');
            return;
        }

        try {
            // 1️ Obtener el timestamp del primer registro para usar como referencia
            const { data: primerRegistro, error: errPrimer } = await supabase
                .from('Sensor_LVDT')
                .select('time')
                .order('time', { ascending: true })
                .limit(1);

            if (errPrimer || !primerRegistro || primerRegistro.length === 0) {
                console.error('No se encontró registro inicial:', errPrimer);
                alert('No se pudo obtener el tiempo inicial de la base de datos.');
                return;
            }

            // Tomamos el primer registro real de la base de datos
            const fechaPrimerRegistro = new Date(primerRegistro[0].time);

            // Ajustamos fechaInicio dependiendo del valor de inicio
            let fechaInicio;
            if (inicio === 1) {
                // Si el usuario elige inicio = 1, no desplazamos, usamos el primer dato
                fechaInicio = fechaPrimerRegistro;
            } else {
                // Si elige inicio > 1, calculamos normalmente
                fechaInicio = new Date(fechaPrimerRegistro.getTime() + (inicio - 1) * 1000);
            }


            // 2️ Traer todos los registros entre el inicio y fin relativo en segundos
            // Calculamos los timestamps absolutos
            const fechaFin = new Date(fechaInicio.getTime() + fin * 1000);

            const { data, error } = await supabase
                .from('Sensor_LVDT')
                .select('id, Lvdt1, Lvdt2, time')
                //.gte('time', fechaInicio.toISOString())
                //.lte('time', fechaFin.toISOString())
                .order('id', { ascending: true });

            if (error) {
                console.error('Error al obtener datos:', error);
                alert('No se pudieron cargar los datos de deformaciones.');
                return;
            }

            if (!data || data.length === 0) {
                alert('No se encontraron datos en el rango seleccionado.');
                return;
            }

            // 3️ Filtrar datos según el intervalo de salto
            for (let t = inicio; t <= fin; t += salto) {
                let idRegistro = t; // lectura t → id = t

                // Buscar registro con ese id 
                const lectura = data.find(reg => reg.id === idRegistro); // -1 porque array empieza en índice 0

                if (!lectura) continue; // si no existe, saltar

                const Lvdt1 = parseFloat(lectura.Lvdt1);
                const Lvdt2 = parseFloat(lectura.Lvdt2);
                const promedio = ((Lvdt1 + Lvdt2) / 2);

                const fila = document.createElement('tr');
                fila.innerHTML = `
                <td>${t}</td>
                <td contenteditable="true" class="editable lvdt1">${truncar4Decimales(lectura.Lvdt1)}</td>
                <td contenteditable="true" class="editable lvdt2">${truncar4Decimales(lectura.Lvdt2)}</td>
                <td class="promedio">${truncar4Decimales(promedio)}</td>
            `;
                tbody.appendChild(fila);
            }

            modalTiempo.hide();

            // Actualizar gráfica inmediatamente
            actualizarGrafica();

        } catch (err) {
            console.error('Error inesperado:', err);
            alert('Ocurrió un error al procesar los datos.');
        }
    });

    // ======= VALIDAR ENTRADA Y CALCULAR PROMEDIO ========
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('editable')) {
            const valor = e.target.innerText;

            // Validar número decimal
            if (!/^-?\d*\.?\d*$/.test(valor)) {
                e.target.innerText = valor.slice(0, -1);  // Elimina el último carácter inválido
                return;
            }

            // Obtener la fila actual
            const fila = e.target.closest('tr');
            const celdaLVDT1 = fila.querySelector('.lvdt1');
            const celdaLVDT2 = fila.querySelector('.lvdt2');
            const celdaPromedio = fila.querySelector('.promedio');

            const val1 = parseFloat(celdaLVDT1.innerText.trim());
            const val2 = parseFloat(celdaLVDT2.innerText.trim());

            if (!isNaN(val1) && !isNaN(val2)) {
                const promedio = ((val1 + val2) / 2);
                celdaPromedio.innerText = truncar4Decimales(promedio);
            } else {
                celdaPromedio.innerText = '';
            }
            actualizarGrafica();
        }
    });

    // ======= GRAFICAR ========
    function actualizarGrafica() {
        const tiempos = [];
        const deformaciones1 = [];
        const deformaciones2 = [];
        const deformacionesPromedio = [];

        document.querySelectorAll('#tablaDatos tbody tr').forEach(fila => {
            const tiempo = parseFloat(fila.children[0].innerText);
            const d1 = parseFloat(fila.querySelector('.lvdt1').innerText);
            const d2 = parseFloat(fila.querySelector('.lvdt2').innerText);

            if (!isNaN(tiempo) && !isNaN(d1) && !isNaN(d2)) {
                tiempos.push(tiempo);
                deformaciones1.push(d1);
                deformaciones2.push(d2);
                deformacionesPromedio.push(parseFloat(truncar4Decimales((d1 + d2) / 2)));
            }
        });

        const ctx = document.getElementById('graficaDeformaciones').getContext('2d');

        // Eliminar gráfico anterior si existe
        if (window.miGrafica) {
            window.miGrafica.destroy();
        }

        window.miGrafica = new Chart(ctx, {
            type: 'line',
            data: {
                labels: tiempos,
                datasets: [
                    {
                        label: 'LVDT1', data: deformaciones1, borderColor: 'blue', fill: false, tension: 0.2
                    },
                    {
                        label: 'LVDT2', data: deformaciones2, borderColor: 'green', fill: false, tension: 0.2
                    },
                    {
                        label: 'Promedio', data: deformacionesPromedio, borderColor: 'red', borderDash: [5, 5],
                        fill: false,
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Deformaciones LVDT1, LVDT2 y Promedio'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y != null) {
                                    label += truncar4Decimales(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Tiempo (seg)' }
                    },
                    y: {
                        title: { display: true, text: 'Deformación (mm)' }
                    }
                }
            }
        });
    }

    //botón Graficar
    document.getElementById('btnGraficar').addEventListener('click', actualizarGrafica);


    // ======= REDIRECCIONAMIENTO A FORMATOS ========

    // Acciones al seleccionar cada formato
    document.getElementById('formatoCilindros').addEventListener('click', function () {
        const datos = [];

        document.querySelectorAll('#tablaDatos tbody tr').forEach(fila => {
            const tiempo = fila.children[0].innerText.trim();
            const promedio = fila.children[3].innerText.trim();

            if (tiempo && promedio) {
                datos.push({ tiempo, promedio });
            }
        });

        localStorage.setItem('datosDeformaciones', JSON.stringify(datos));
        window.location.href = "cilindros.html";
    });


    document.getElementById('formatoMuretes').addEventListener('click', function () {
        const datos = [];

        document.querySelectorAll('#tablaDatos tbody tr').forEach(fila => {
            const tiempo = fila.children[0].innerText.trim();
            const promedio = fila.children[3].innerText.trim(); // Deformación Promedio

            if (tiempo && promedio) {
                datos.push({ tiempo, promedio });
            }
        });

        // Guardar los datos en localStorage
        localStorage.setItem('datosDeformaciones', JSON.stringify(datos));

        // Redirigir a muretes.html
        window.location.href = "muretes.html";
    });

    document.getElementById('formatoPilas').addEventListener('click', function () {
        const datos = [];

        document.querySelectorAll('#tablaDatos tbody tr').forEach(fila => {
            const tiempo = fila.children[0].innerText.trim();
            const promedio = fila.children[3].innerText.trim(); // Deformación Promedio

            if (tiempo && promedio) {
                datos.push({ tiempo, promedio });
            }
        });

        // Guardar los datos en localStorage
        localStorage.setItem('datosDeformaciones', JSON.stringify(datos))
        window.location.href = "pilas.html";
    });

    //Botón Subir vídeo
    document.getElementById("btnDatos").addEventListener("click", function () {
        window.location.href = "detector/detectorNum.html";

    });

});
