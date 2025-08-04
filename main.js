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


    document.getElementById('formTiempo').addEventListener('submit', function (event) {
        event.preventDefault();

        const inicio = parseInt(document.getElementById('inicio').value);
        const fin = parseInt(document.getElementById('fin').value);
        const salto = parseInt(document.getElementById('salto').value);
        const tbody = document.querySelector('#tablaDatos tbody');

        tbody.innerHTML = ''; // Limpiar tabla

        if (inicio >= 0 && fin >= inicio && salto > 0) {
            for (let tiempo = inicio; tiempo <= fin; tiempo += salto) {
                // Generar deformaciones aleatorias entre 0.0000 y 5.0000
                const valLVDT1 = (Math.random() * 5).toFixed(4);
                const valLVDT2 = (Math.random() * 5).toFixed(4);

                // Calcular el promedio
                const promedio = ((parseFloat(valLVDT1) + parseFloat(valLVDT2)) / 2).toFixed(4);

                // Crear fila con los valores directamente dentro de las celdas
                const fila = document.createElement('tr');
                fila.innerHTML = `
        <td>${tiempo}</td>
        <td contenteditable="true" class="editable lvdt1">${valLVDT1}</td>
        <td contenteditable="true" class="editable lvdt2">${valLVDT2}</td>
        <td class="promedio">${promedio}</td>
    `;
                tbody.appendChild(fila);
            }

            // SOLO ocultar el modal
            modalTiempo.hide();

        } else {
            alert('Verifica que los valores de inicio, fin e intervalo sean válidos.');
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
                const promedio = ((val1 + val2) / 2).toFixed(4); //4 decimales
                celdaPromedio.innerText = promedio;
            } else {
                celdaPromedio.innerText = '';
            }
        }
    });

    // ======= GRAFICAR ========
    document.getElementById('btnGraficar').addEventListener('click', function () {
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
                deformacionesPromedio.push(((d1 + d2) / 2).toFixed(4));
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
                        label: 'LVDT1',
                        data: deformaciones1,
                        borderColor: 'blue',
                        fill: false,
                        tension: 0.2
                    },
                    {
                        label: 'LVDT2',
                        data: deformaciones2,
                        borderColor: 'green',
                        fill: false,
                        tension: 0.2
                    },
                    {
                        label: 'Promedio',
                        data: deformacionesPromedio,
                        borderColor: 'red',
                        borderDash: [5, 5],
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
    });


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
        window.location.href = "muretes.html";
    });

    document.getElementById('formatoPilas').addEventListener('click', function () {
        window.location.href = "pilas.html";
    });
    


});
