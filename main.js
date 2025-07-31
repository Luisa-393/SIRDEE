document.getElementById('formTiempo').addEventListener('submit', function (event) {
    event.preventDefault(); // Evitar recarga del formulario

    const inicio = parseInt(document.getElementById('inicio').value);
    const fin = parseInt(document.getElementById('fin').value);
    const salto = parseInt(document.getElementById('salto').value);
    const tbody = document.querySelector('#tablaDatos tbody');

    tbody.innerHTML = ''; // Limpiar tabla

    if (inicio >= 0 && fin >= inicio && salto > 0) {
        for (let tiempo = inicio; tiempo <= fin; tiempo += salto) {
            const fila = document.createElement('tr');
            fila.innerHTML = `
          <td>${tiempo}</td>
          <td contenteditable="true" class="editable lvdt3"></td>
          <td contenteditable="true" class="editable lvdt4"></td>
          <td class="promedio"></td>
        `;
            tbody.appendChild(fila);
        }

        // Cerrar el modal después de generar
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalTiempo'));

        // Mover el foco al botón de graficar antes de cerrar el modal
        document.getElementById('btnGraficar').focus();

        modal.hide();

    } else {
        alert('Verifica que los valores de inicio, fin e intervalo sean válidos.');
    }
});

//validar entrada y calcular promedio
document.addEventListener('input', function (e) {
    if (e.target.classList.contains('editable')) {
        const valor = e.target.innerText;

        // Validar número decimal
        if (!/^-?\d*\.?\d*$/.test(valor)) {
            e.target.innerText = valor.slice(0, -1);  // Elimina el último carácter inválido
            return;
        }

        // Obtener la fila actual
        const fila = e.target.parentElement;
        const celdaLVDT3 = fila.querySelector('.lvdt3');
        const celdaLVDT4 = fila.querySelector('.lvdt4');
        const celdaPromedio = fila.querySelector('.promedio');

        const val1 = parseFloat(celdaLVDT3.innerText);
        const val2 = parseFloat(celdaLVDT4.innerText);

        if (!isNaN(val1) && !isNaN(val2)) {
            const promedio = ((val1 + val2) / 2).toFixed(3);
            celdaPromedio.innerText = promedio;
        } else {
            celdaPromedio.innerText = '';
        }
    }
});




// graficar datos de la tabla
document.getElementById('btnGraficar').addEventListener('click', function () {
    const tiempos = [];
    const deformaciones3 = [];
    const deformaciones4 = [];

    document.querySelectorAll('#tablaDatos tbody tr').forEach(fila => {
        const tiempo = parseFloat(fila.children[0].innerText);
        const d3 = parseFloat(fila.querySelector('.lvdt3').innerText);
        const d4 = parseFloat(fila.querySelector('.lvdt4').innerText);

        if (!isNaN(tiempo) && !isNaN(d3) && !isNaN(d4)) {
            tiempos.push(tiempo);
            deformaciones3.push(d3);
            deformaciones4.push(d4);
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
                    label: 'LVDT3',
                    data: deformaciones3,
                    borderColor: 'blue',
                    fill: false,
                    tension: 0.2
                },
                {
                    label: 'LVDT4',
                    data: deformaciones4,
                    borderColor: 'green',
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
                    text: 'Deformaciones LVDT3 y LVDT4'
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
