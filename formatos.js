document.addEventListener('DOMContentLoaded', function () {
    const datos = JSON.parse(localStorage.getItem('datosDeformaciones')) || [];

    const tbody = document.querySelector('#tablaDatos tbody');
    datos.forEach(dato => {
        const fila = document.createElement('tr');
        const promedio = parseFloat(dato.promedio);
        const longitudControl = parseFloat(document.querySelector('input[value="82.175"]').value);
        const deformacionUnitaria = (promedio / longitudControl).toFixed(6);

        fila.innerHTML = `
            <td>${dato.tiempo}</td>
            <td>${dato.promedio}</td>
            <td contenteditable="true" class="editable deformacion">${deformacionUnitaria}</td>
            <td contenteditable="true" class="editable carga"></td>
            <td class="esfuerzo"></td>
        `;
        tbody.appendChild(fila);
    });
});

document.addEventListener('input', function (e) {
    if (e.target.classList.contains('editable')) {
        const fila = e.target.closest('tr');
        const deformacion = parseFloat(fila.querySelector('.deformacion').innerText.trim());
        const carga = parseFloat(fila.querySelector('.carga').innerText.trim());
        const celdaEsfuerzo = fila.querySelector('.esfuerzo');

        const area = parseFloat(document.querySelector('input[value="76.67"]').value);

        if (!isNaN(carga) && !isNaN(area)) {
            const esfuerzo = (carga / area).toFixed(2);
            celdaEsfuerzo.innerText = esfuerzo;
        } else {
            celdaEsfuerzo.innerText = '';
        }
    }
});


document.getElementById('btnGraficar').addEventListener('click', function () {
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

    // Destruir gráfica anterior si existe
    if (window.miGrafica) {
        window.miGrafica.destroy();
    }

    // Crear nueva gráfica
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
                    data: esfuerzos.map(e => e - 10), // ajustar
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
                tooltip: {
                    enabled: true
                },
                legend: {
                    display: true, position: 'top'
                },
                title: {
                    display: true, text: 'Esfuerzo-deformación sensores LVDT'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true, text: 'Deformación (ε)'
                    }
                },
                y: {
                    title: {
                        display: true, text: 'Esfuerzo (σ)'
                    }
                }
            }
        }

    });

    // Al final de la función del botón "Graficar"
    if (esfuerzos.length > 0 && deformaciones.length > 0) {
        const promEsfuerzo = (esfuerzos.reduce((a, b) => a + b, 0) / esfuerzos.length).toFixed(2);
        const promDeformacion = (deformaciones.reduce((a, b) => a + b, 0) / deformaciones.length).toFixed(4);

        document.getElementById('promedios').innerHTML = `
        <h5 class="fw-bold">Promedio de datos</h5>
        <p><strong>Promd σ</strong> ${promEsfuerzo}</p>
        <p><strong>Promd ε</strong> ${promDeformacion}</p>
    `;
    }
});
