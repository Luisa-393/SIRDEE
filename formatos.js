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

        const area = parseFloat(document.querySelector('input[value="76.67"]').value); // usa id idealmente

        if (!isNaN(carga) && !isNaN(area)) {
            const esfuerzo = (carga / area).toFixed(2);
            celdaEsfuerzo.innerText = esfuerzo;
        } else {
            celdaEsfuerzo.innerText = '';
        }
    }
});