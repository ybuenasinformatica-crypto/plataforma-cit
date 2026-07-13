const API_URL =
  'https://script.google.com/a/macros/snaeduca.cl/s/AKfycbzs0wf3Wc_igxCT2W_bCyOVbQ71kloopOOVW1exze2NUFwfm0gpFv3o858HRrimguAGDQ/exec';

let equiposInventario = [];

document.addEventListener('DOMContentLoaded', iniciarAplicacion);

function iniciarAplicacion() {
  configurarNavegacion();
  configurarMenuMovil();
  configurarFormularioEquipo();
  configurarBusquedaEquipo();
  configurarFiltroInventario();
  probarConexion();
  cargarInventario();
}

function configurarNavegacion() {
  document
    .querySelectorAll('[data-seccion], [data-ir]')
    .forEach(elemento => {
      elemento.addEventListener('click', () => {
        const destino =
          elemento.dataset.seccion ||
          elemento.dataset.ir;

        if (destino) {
          mostrarSeccion(destino);
        }
      });
    });
}

function mostrarSeccion(id) {
  document
    .querySelectorAll('.seccion')
    .forEach(seccion => {
      seccion.classList.toggle(
        'activa',
        seccion.id === id
      );
    });

  document
    .querySelectorAll('.menu-item[data-seccion]')
    .forEach(boton => {
      boton.classList.toggle(
        'activo',
        boton.dataset.seccion === id
      );
    });

  const titulos = {
    inicio: [
      'Panel principal',
      'Resumen general de la plataforma'
    ],
    inventario: [
      'Inventario CIT',
      'Equipos y recursos tecnológicos'
    ],
    'nuevo-equipo': [
      'Nuevo equipo',
      'Registro de equipamiento tecnológico'
    ],
    'buscar-equipo': [
      'Buscar equipo',
      'Consulta mediante código QR'
    ]
  };

  const datos = titulos[id] || titulos.inicio;

  document.getElementById('tituloPagina').textContent =
    datos[0];

  document.getElementById('subtituloPagina').textContent =
    datos[1];

  cerrarMenuMovil();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function configurarMenuMovil() {
  const boton = document.getElementById('botonMenu');
  const overlay = document.getElementById('overlay');

  boton.addEventListener('click', () => {
    document
      .querySelector('.sidebar')
      .classList.toggle('abierto');

    overlay.classList.toggle('activo');
  });

  overlay.addEventListener('click', cerrarMenuMovil);
}

function cerrarMenuMovil() {
  document
    .querySelector('.sidebar')
    .classList.remove('abierto');

  document
    .getElementById('overlay')
    .classList.remove('activo');
}

async function probarConexion() {
  try {
    const respuesta = await llamarApi('estado');

    if (!respuesta.ok) {
      throw new Error(respuesta.mensaje);
    }

    document
      .getElementById('indicadorApi')
      .className = 'conectado';

    document
      .getElementById('textoApi')
      .textContent = 'API conectada';

  } catch (error) {
    document
      .getElementById('indicadorApi')
      .className = 'error';

    document
      .getElementById('textoApi')
      .textContent = 'Error de conexión';
  }
}

async function cargarInventario() {
  mostrarCargaInventario();

  try {
    const respuesta = await llamarApi('listarEquipos');

    if (!respuesta.ok) {
      throw new Error(respuesta.mensaje);
    }

    equiposInventario = respuesta.equipos || [];

    actualizarIndicadores();
    renderizarInventario(equiposInventario);
    renderizarInventarioReciente();

  } catch (error) {
    mostrarMensaje(
      'No fue posible cargar el inventario: ' +
      error.message,
      'error'
    );

    document.getElementById('listaInventario').innerHTML =
      '<div class="vacio">No se pudo cargar el inventario.</div>';

    document.getElementById('inventarioReciente').innerHTML =
      '<div class="vacio">No se pudo cargar la información.</div>';
  }
}

function mostrarCargaInventario() {
  document.getElementById('listaInventario').innerHTML =
    '<div class="cargando">Cargando inventario...</div>';

  document.getElementById('inventarioReciente').innerHTML =
    '<div class="cargando">Cargando información...</div>';
}

function actualizarIndicadores() {
  document.getElementById('totalEquipos').textContent =
    equiposInventario.length;

  document.getElementById('equiposDisponibles').textContent =
    contarPorEstado('Disponible');

  document.getElementById('equiposMantencion').textContent =
    contarPorEstado('En mantención');

  document.getElementById('equiposPrestados').textContent =
    contarPorEstado('Prestado');
}

function contarPorEstado(estado) {
  return equiposInventario.filter(equipo =>
    normalizar(equipo.estado) === normalizar(estado)
  ).length;
}

function renderizarInventario(equipos) {
  const contenedor =
    document.getElementById('listaInventario');

  if (!equipos.length) {
    contenedor.innerHTML =
      '<div class="vacio">No hay equipos registrados.</div>';

    return;
  }

  contenedor.innerHTML = equipos
    .map(crearTarjetaEquipo)
    .join('');
}

function renderizarInventarioReciente() {
  const contenedor =
    document.getElementById('inventarioReciente');

  const recientes = [...equiposInventario]
    .reverse()
    .slice(0, 5);

  if (!recientes.length) {
    contenedor.innerHTML =
      '<div class="vacio">No hay equipos registrados.</div>';

    return;
  }

  contenedor.innerHTML = recientes
    .map(crearTarjetaEquipo)
    .join('');
}

function crearTarjetaEquipo(equipo) {
  return `
    <article class="equipo">
      <div>
        <h4>${escaparHtml(equipo.nombre || 'Equipo sin nombre')}</h4>

        <div class="equipo-info">
          <span class="codigo">
            ${escaparHtml(equipo.codigo)}
          </span>

          &nbsp; · &nbsp;

          ${escaparHtml(equipo.categoria || 'Sin categoría')}

          <br>

          ${escaparHtml(equipo.marca || '')}
          ${escaparHtml(equipo.modelo || '')}

          ${
            equipo.ubicacion
              ? ' · ' + escaparHtml(equipo.ubicacion)
              : ''
          }
        </div>
      </div>

      <span class="estado ${claseEstado(equipo.estado)}">
        ${escaparHtml(equipo.estado || 'Sin estado')}
      </span>
    </article>
  `;
}

function configurarFormularioEquipo() {
  const formulario =
    document.getElementById('formularioEquipo');

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();

    const boton =
      document.getElementById('botonGuardar');

    boton.disabled = true;
    boton.textContent = 'Guardando...';

    const datos =
      Object.fromEntries(new FormData(formulario));

    try {
      const respuesta = await llamarApi(
        'registrarEquipo',
        datos
      );

      if (!respuesta.ok) {
        throw new Error(respuesta.mensaje);
      }

      formulario.reset();

      mostrarResultadoRegistro(respuesta.equipo);

      mostrarMensaje(
        respuesta.mensaje ||
        'Equipo registrado correctamente.',
        'exito'
      );

      await cargarInventario();

    } catch (error) {
      mostrarMensaje(error.message, 'error');

    } finally {
      boton.disabled = false;
      boton.textContent = 'Guardar equipo';
    }
  });
}

function mostrarResultadoRegistro(equipo) {
  const contenedor =
    document.getElementById('resultadoRegistro');

  contenedor.classList.remove('oculto');

  contenedor.innerHTML = `
    <div class="resultado-equipo">
      <div>
        <h3>Equipo registrado</h3>

        <p>
          Código asignado:
          <strong>${escaparHtml(equipo.codigo)}</strong>
        </p>

        <p>
          Estado:
          <strong>${escaparHtml(equipo.estado)}</strong>
        </p>

        <br>

        <a
          class="boton secundario"
          href="${equipo.urlQR}"
          target="_blank"
          rel="noopener"
        >
          Abrir código QR
        </a>
      </div>

      <img
        src="${equipo.urlQR}"
        alt="Código QR del equipo"
      >
    </div>
  `;
}

function configurarBusquedaEquipo() {
  const formulario =
    document.getElementById('formularioBusqueda');

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();

    const codigo =
      document.getElementById('codigoBusqueda')
        .value
        .trim();

    const contenedor =
      document.getElementById('resultadoBusqueda');

    contenedor.innerHTML =
      '<div class="cargando">Buscando equipo...</div>';

    try {
      const respuesta = await llamarApi(
        'buscarEquipo',
        { codigo }
      );

      if (!respuesta.ok || !respuesta.encontrado) {
        throw new Error(
          respuesta.mensaje ||
          'Equipo no encontrado.'
        );
      }

      renderizarFichaEquipo(respuesta.equipo);

    } catch (error) {
      contenedor.innerHTML = `
        <div class="vacio">
          ${escaparHtml(error.message)}
        </div>
      `;
    }
  });
}

function renderizarFichaEquipo(equipo) {
  const contenedor =
    document.getElementById('resultadoBusqueda');

  contenedor.innerHTML = `
    <div class="ficha-equipo">
      <h3>${escaparHtml(equipo.nombre)}</h3>

      <p>
        <span class="estado ${claseEstado(equipo.estado)}">
          ${escaparHtml(equipo.estado)}
        </span>
      </p>

      <div class="ficha-grid">
        ${crearDatoFicha('Código QR', equipo.codigo)}
        ${crearDatoFicha('Categoría', equipo.categoria)}
        ${crearDatoFicha('Marca', equipo.marca)}
        ${crearDatoFicha('Modelo', equipo.modelo)}
        ${crearDatoFicha('Número de serie', equipo.serie)}
        ${crearDatoFicha('Ubicación', equipo.ubicacion)}
        ${crearDatoFicha('Responsable', equipo.responsable)}
        ${crearDatoFicha(
          'Fecha de adquisición',
          equipo.fechaAdquisicion
        )}
      </div>
    </div>
  `;
}

function crearDatoFicha(etiqueta, valor) {
  return `
    <div class="ficha-dato">
      <span>${escaparHtml(etiqueta)}</span>
      <strong>${escaparHtml(valor || 'Sin información')}</strong>
    </div>
  `;
}

function configurarFiltroInventario() {
  document
    .getElementById('filtroInventario')
    .addEventListener('input', evento => {
      const texto = normalizar(evento.target.value);

      const filtrados = equiposInventario.filter(equipo => {
        const contenido = normalizar([
          equipo.codigo,
          equipo.nombre,
          equipo.categoria,
          equipo.marca,
          equipo.modelo,
          equipo.ubicacion,
          equipo.estado
        ].join(' '));

        return contenido.includes(texto);
      });

      renderizarInventario(filtrados);
    });
}

function llamarApi(operacion, parametros = {}) {
  return new Promise((resolver, rechazar) => {
    const callback =
      'jsonp_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    const script = document.createElement('script');

    const consulta = new URLSearchParams({
      api: operacion,
      callback,
      ...parametros
    });

    const temporizador = setTimeout(() => {
      limpiar();
      rechazar(
        new Error('La API tardó demasiado en responder.')
      );
    }, 15000);

    window[callback] = respuesta => {
      limpiar();
      resolver(respuesta);
    };

    script.onerror = () => {
      limpiar();
      rechazar(
        new Error('No se pudo conectar con Apps Script.')
      );
    };

    function limpiar() {
      clearTimeout(temporizador);
      delete window[callback];
      script.remove();
    }

    script.src = `${API_URL}?${consulta.toString()}`;

    document.body.appendChild(script);
  });
}

function mostrarMensaje(texto, tipo) {
  const mensaje =
    document.getElementById('mensajeGlobal');

  mensaje.textContent = texto;
  mensaje.className =
    `mensaje-global ${tipo}`;

  clearTimeout(mensaje.temporizador);

  mensaje.temporizador = setTimeout(() => {
    mensaje.classList.add('oculto');
  }, 5000);
}

function claseEstado(estado) {
  const valor = normalizar(estado);

  if (valor === 'disponible') {
    return 'disponible';
  }

  if (valor === 'prestado') {
    return 'prestado';
  }

  if (valor.includes('mantencion')) {
    return 'mantencion';
  }

  if (valor === 'danado') {
    return 'danado';
  }

  return '';
}

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escaparHtml(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
