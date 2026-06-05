/**
 * Cívica CR — App de estudio interactiva
 * Educación Cívica, quinto año, Costa Rica
 * Vanilla JS — Sin frameworks
 */

// ===== ESTADO GLOBAL =====
let datosApp = null;
let quizActual = {
    preguntas: [],
    indiceActual: 0,
    correctas: 0,
    temaSeleccionado: null,
    tipoSeleccionado: 'todos',
    respuestas: [],
    modoRepaso: false
};
let pareoEstado = {
    seleccionA: null,
    seleccionB: null,
    emparejamientos: [],
    pareoActual: null
};

// ===== CLAVE DE LOCALSTORAGE =====
const STORAGE_KEY = 'civica_cr_progreso';

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', inicializarApp);

async function inicializarApp() {
    try {
        datosApp = await cargarDatos();
        ocultarCarga();
        mostrarApp();
        renderizarResumen();
        renderizarMapas();
        configurarEventos();
        actualizarProgreso();
    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError(error.message);
    }
}

// ===== CARGA DE DATOS =====
async function cargarDatos() {
    try {
        const respuesta = await fetch('datos_civica.json');
        if (!respuesta.ok) throw new Error('No se pudo cargar el archivo de datos');
        return await respuesta.json();
    } catch (error) {
        console.warn('Error cargando JSON, usando datos de ejemplo:', error);
        return obtenerDatosEjemplo();
    }
}

/** Datos de ejemplo como fallback si falla la carga del JSON */
function obtenerDatosEjemplo() {
    return {
        titulo: "Educación Cívica — Quinto Año",
        descripcion: "Datos de ejemplo (no se pudo cargar el archivo principal)",
        temas: [{
            id: "ejemplo",
            numero: 0,
            titulo: "Datos de ejemplo",
            emoji: "📋",
            subtemas: [{
                id: "ej1",
                titulo: "Ejemplo de tema",
                resumen: "Este es un tema de ejemplo porque no se pudo cargar el archivo datos_civica.json.",
                analisis: "Verifica que el archivo datos_civica.json esté en la misma carpeta que index.html.",
                puntosClave: ["Verifica la ubicación del archivo JSON", "Recarga la página"],
                palabrasClave: [{ termino: "JSON", definicion: "Formato de datos" }],
                porQueImporta: "Sin los datos correctos, la app no puede funcionar completamente.",
                datoCurioso: "JSON significa JavaScript Object Notation."
            }]
        }],
        conexiones: { descripcion: "", relaciones: [], fraseParaRecordar: "" },
        mapasConceptuales: [],
        guiaRapida: [],
        datosRapidos: [],
        preguntas: {}
    };
}

// ===== UI: CARGA Y ERROR =====
function ocultarCarga() {
    const pantalla = document.getElementById('pantalla-carga');
    pantalla.style.opacity = '0';
    setTimeout(() => pantalla.classList.add('oculto'), 500);
}

function mostrarApp() {
    document.getElementById('app').classList.remove('oculto');
    document.getElementById('nav-tabs').classList.remove('oculto');
}

function mostrarError(mensaje) {
    document.getElementById('pantalla-carga').classList.add('oculto');
    const pantallaError = document.getElementById('pantalla-error');
    document.getElementById('error-mensaje').textContent = mensaje;
    pantallaError.classList.remove('oculto');
    document.getElementById('btn-reintentar').addEventListener('click', () => {
        location.reload();
    });
}

// ===== NAVEGACIÓN =====
function configurarEventos() {
    // Navegación por tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => cambiarSeccion(tab.dataset.seccion));
    });

    // Buscador
    document.getElementById('buscador').addEventListener('input', filtrarTemas);

    // Quiz: tipo de preguntas
    document.querySelectorAll('.btn-tipo-quiz').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-tipo-quiz').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            quizActual.tipoSeleccionado = btn.dataset.tipo;
        });
    });

    // Quiz: botones de resultados
    document.getElementById('btn-siguiente-pregunta').addEventListener('click', siguientePregunta);
    document.getElementById('btn-repetir-quiz').addEventListener('click', repetirQuiz);
    document.getElementById('btn-nuevo-quiz').addEventListener('click', nuevoQuiz);

    // Quiz: modo repaso
    document.getElementById('btn-modo-repaso').addEventListener('click', iniciarModoRepaso);

    // Progreso: resetear
    document.getElementById('btn-resetear').addEventListener('click', () => {
        if (confirm('¿Estás segura de que quieres borrar todo tu progreso? 🗑️')) {
            localStorage.removeItem(STORAGE_KEY);
            actualizarProgreso();
        }
    });

    // Renderizar selector de temas para quiz
    renderizarQuizSelector();
}

function cambiarSeccion(nombre) {
    // Ocultar todas las secciones
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('activa'));

    // Mostrar la seleccionada
    document.getElementById(`seccion-${nombre}`).classList.add('activa');
    document.querySelector(`[data-seccion="${nombre}"]`).classList.add('activa');

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Si es progreso, actualizar
    if (nombre === 'progreso') actualizarProgreso();
    // Si es quiz, verificar modo repaso
    if (nombre === 'quiz') verificarModoRepaso();
}

// ===== RESUMEN =====
function renderizarResumen() {
    const contenedor = document.getElementById('lista-temas');
    contenedor.innerHTML = '';

    datosApp.temas.forEach(tema => {
        tema.subtemas.forEach(subtema => {
            const card = crearTarjetaTema(tema, subtema);
            contenedor.appendChild(card);
        });
    });
}

function crearTarjetaTema(tema, subtema) {
    const card = document.createElement('div');
    card.className = 'tema-card';
    card.dataset.temaId = subtema.id;
    card.dataset.busqueda = `${tema.titulo} ${subtema.titulo} ${subtema.resumen} ${subtema.palabrasClave.map(p => p.termino).join(' ')}`.toLowerCase();

    const badgeClass = `tema${tema.numero}`;

    card.innerHTML = `
        <div class="tema-header" role="button" tabindex="0" aria-expanded="false">
            <span class="tema-emoji">${tema.emoji}</span>
            <div class="tema-info">
                <div class="tema-titulo">${subtema.titulo}</div>
                <span class="tema-badge ${badgeClass}">Tema ${tema.numero}</span>
            </div>
            <span class="tema-flecha">▼</span>
        </div>
        <div class="tema-contenido">
            <div class="tema-contenido-inner">
                <div class="subtema-seccion">
                    <h4>📖 ¿De qué se trata?</h4>
                    <p>${subtema.resumen}</p>
                </div>
                <div class="subtema-seccion">
                    <h4>🔍 Análisis del tema</h4>
                    <p>${subtema.analisis}</p>
                </div>
                <div class="subtema-seccion">
                    <h4>📌 Puntos clave</h4>
                    <ul>${subtema.puntosClave.map(p => `<li>${p}</li>`).join('')}</ul>
                </div>
                <div class="subtema-seccion">
                    <h4>🔑 Palabras clave</h4>
                    <div class="palabras-clave-lista">
                        ${subtema.palabrasClave.map(pc => `
                            <span class="palabra-clave" tabindex="0" role="button">
                                <span class="termino">${pc.termino}</span>
                                <span class="definicion"> — ${pc.definicion}</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="subtema-seccion">
                    <h4>💡 ¿Por qué importa esto?</h4>
                    <div class="importa-box">${subtema.porQueImporta}</div>
                </div>
                <div class="subtema-seccion">
                    <h4>🌟 Dato curioso</h4>
                    <div class="dato-box">${subtema.datoCurioso}</div>
                </div>
            </div>
        </div>
    `;

    // Evento para expandir/colapsar
    const header = card.querySelector('.tema-header');
    header.addEventListener('click', () => toggleTema(card, subtema.id));
    header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTema(card, subtema.id);
        }
    });

    // Evento para palabras clave expandibles
    card.querySelectorAll('.palabra-clave').forEach(pc => {
        pc.addEventListener('click', () => pc.classList.toggle('expandida'));
        pc.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pc.classList.toggle('expandida');
            }
        });
    });

    return card;
}

function toggleTema(card, subtemaId) {
    const estaExpandido = card.classList.contains('expandido');
    card.classList.toggle('expandido');
    card.querySelector('.tema-header').setAttribute('aria-expanded', !estaExpandido);

    // Registrar como revisado
    if (!estaExpandido) {
        marcarTemaRevisado(subtemaId);
    }
}

function filtrarTemas(e) {
    const texto = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.tema-card').forEach(card => {
        const coincide = !texto || card.dataset.busqueda.includes(texto);
        card.style.display = coincide ? '' : 'none';
    });
}

// ===== QUIZ =====
function renderizarQuizSelector() {
    const contenedor = document.getElementById('quiz-temas-lista');
    contenedor.innerHTML = '';

    datosApp.temas.forEach(tema => {
        const btn = document.createElement('button');
        btn.className = 'btn-quiz-tema';
        btn.dataset.tema = tema.id;
        btn.textContent = `${tema.emoji} Tema ${tema.numero}: ${tema.titulo}`;
        btn.addEventListener('click', () => iniciarQuiz(tema.id));
        contenedor.appendChild(btn);
    });

    // Botón de quiz general
    document.querySelector('.btn-quiz-general').addEventListener('click', () => iniciarQuiz('todos'));
}

function iniciarQuiz(temaId) {
    quizActual.temaSeleccionado = temaId;
    quizActual.indiceActual = 0;
    quizActual.correctas = 0;
    quizActual.respuestas = [];
    quizActual.modoRepaso = false;

    // Recopilar preguntas
    quizActual.preguntas = obtenerPreguntas(temaId, quizActual.tipoSeleccionado);

    if (quizActual.preguntas.length === 0) {
        alert('No hay preguntas disponibles para esta selección. 😅');
        return;
    }

    // Mezclar preguntas
    quizActual.preguntas = mezclarArray(quizActual.preguntas);

    // Mostrar área de quiz
    document.getElementById('quiz-selector').classList.add('oculto');
    document.getElementById('quiz-activo').classList.remove('oculto');
    document.getElementById('quiz-resultados').classList.add('oculto');

    mostrarPregunta();
}

function obtenerPreguntas(temaId, tipo) {
    const preguntas = [];
    const temasKeys = temaId === 'todos'
        ? Object.keys(datosApp.preguntas)
        : [temaId];

    temasKeys.forEach(key => {
        const pregsTema = datosApp.preguntas[key];
        if (!pregsTema) return;

        if (tipo === 'todos' || tipo === 'seleccionUnica') {
            (pregsTema.seleccionUnica || []).forEach((p, i) => {
                preguntas.push({ ...p, tipo: 'seleccionUnica', temaKey: key, indiceOriginal: i });
            });
        }
        if (tipo === 'todos' || tipo === 'verdaderoFalso') {
            (pregsTema.verdaderoFalso || []).forEach((p, i) => {
                preguntas.push({ ...p, tipo: 'verdaderoFalso', temaKey: key, indiceOriginal: i });
            });
        }
        if (tipo === 'todos' || tipo === 'pareos') {
            (pregsTema.pareos || []).forEach((p, i) => {
                preguntas.push({ ...p, tipo: 'pareos', temaKey: key, indiceOriginal: i });
            });
        }
    });

    return preguntas;
}

function mostrarPregunta() {
    const pregunta = quizActual.preguntas[quizActual.indiceActual];
    const area = document.getElementById('quiz-pregunta-area');
    const btnSiguiente = document.getElementById('btn-siguiente-pregunta');
    btnSiguiente.classList.add('oculto');

    // Actualizar barra de progreso
    const progreso = ((quizActual.indiceActual) / quizActual.preguntas.length) * 100;
    document.getElementById('quiz-progreso-fill').style.width = `${progreso}%`;
    document.getElementById('quiz-contador').textContent =
        `Pregunta ${quizActual.indiceActual + 1} de ${quizActual.preguntas.length}`;

    if (pregunta.tipo === 'seleccionUnica') {
        renderizarSeleccionUnica(area, pregunta);
    } else if (pregunta.tipo === 'verdaderoFalso') {
        renderizarVerdaderoFalso(area, pregunta);
    } else if (pregunta.tipo === 'pareos') {
        renderizarPareo(area, pregunta);
    }
}

function renderizarSeleccionUnica(area, pregunta) {
    const letras = ['A', 'B', 'C', 'D'];
    // Crear mapeo de opciones mezcladas
    const indices = pregunta.opciones.map((_, i) => i);
    const indicesMezclados = mezclarArray([...indices]);
    const respuestaOriginal = pregunta.respuestaCorrecta;

    area.innerHTML = `
        <div class="quiz-pregunta-card">
            <span class="quiz-tipo-badge">🔘 Selección única</span>
            <div class="quiz-pregunta-texto">${pregunta.pregunta}</div>
            <div class="quiz-opciones">
                ${indicesMezclados.map((origIdx, displayIdx) => `
                    <button class="quiz-opcion" data-indice="${origIdx}">
                        <span class="opcion-letra">${letras[displayIdx]}</span>
                        <span>${pregunta.opciones[origIdx]}</span>
                    </button>
                `).join('')}
            </div>
            <div id="quiz-explicacion-area"></div>
        </div>
    `;

    // Eventos
    area.querySelectorAll('.quiz-opcion').forEach(btn => {
        btn.addEventListener('click', () => {
            if (area.querySelector('.quiz-opcion.correcta, .quiz-opcion.incorrecta')) return;

            const indice = parseInt(btn.dataset.indice);
            const esCorrecta = indice === respuestaOriginal;

            if (esCorrecta) {
                btn.classList.add('correcta');
                quizActual.correctas++;
            } else {
                btn.classList.add('incorrecta');
                // Mostrar la correcta
                area.querySelector(`[data-indice="${respuestaOriginal}"]`).classList.add('correcta');
            }

            // Registrar respuesta
            quizActual.respuestas.push({
                pregunta: pregunta.pregunta,
                correcta: esCorrecta,
                temaKey: pregunta.temaKey,
                tipo: pregunta.tipo,
                indiceOriginal: pregunta.indiceOriginal
            });

            // Mostrar explicación
            mostrarExplicacion(pregunta.explicacion);
            document.getElementById('btn-siguiente-pregunta').classList.remove('oculto');
        });
    });
}

function renderizarVerdaderoFalso(area, pregunta) {
    area.innerHTML = `
        <div class="quiz-pregunta-card">
            <span class="quiz-tipo-badge">✅ Verdadero / Falso</span>
            <div class="quiz-pregunta-texto">${pregunta.afirmacion}</div>
            <div class="quiz-vf-btns">
                <button class="btn-vf" data-valor="true">✅ Verdadero</button>
                <button class="btn-vf" data-valor="false">❌ Falso</button>
            </div>
            <div id="quiz-explicacion-area"></div>
        </div>
    `;

    area.querySelectorAll('.btn-vf').forEach(btn => {
        btn.addEventListener('click', () => {
            if (area.querySelector('.btn-vf.correcta, .btn-vf.incorrecta')) return;

            const seleccion = btn.dataset.valor === 'true';
            const esCorrecta = seleccion === pregunta.respuesta;

            if (esCorrecta) {
                btn.classList.add('correcta');
                quizActual.correctas++;
            } else {
                btn.classList.add('incorrecta');
                // Mostrar la correcta
                const valorCorrecto = pregunta.respuesta.toString();
                area.querySelector(`[data-valor="${valorCorrecto}"]`).classList.add('correcta');
            }

            quizActual.respuestas.push({
                pregunta: pregunta.afirmacion,
                correcta: esCorrecta,
                temaKey: pregunta.temaKey,
                tipo: pregunta.tipo,
                indiceOriginal: pregunta.indiceOriginal
            });

            mostrarExplicacion(pregunta.explicacion);
            document.getElementById('btn-siguiente-pregunta').classList.remove('oculto');
        });
    });
}

function renderizarPareo(area, pregunta) {
    // Mezclar columna B
    const indicesB = pregunta.columnaB.map((_, i) => i);
    const indicesBMezclados = mezclarArray([...indicesB]);

    pareoEstado = {
        seleccionA: null,
        seleccionB: null,
        emparejamientos: [],
        pareoActual: pregunta,
        indicesBMezclados: indicesBMezclados
    };

    area.innerHTML = `
        <div class="quiz-pregunta-card">
            <span class="quiz-tipo-badge">🔗 Pareo: ${pregunta.titulo}</span>
            <div class="quiz-pregunta-texto">Toca un elemento de cada columna para emparejarlos:</div>
            <div class="pareo-contenedor">
                <div class="pareo-columnas">
                    <div class="pareo-columna">
                        <h5>Columna A</h5>
                        ${pregunta.columnaA.map((item, i) => `
                            <div class="pareo-item pareo-a" data-indice="${i}" tabindex="0">${item}</div>
                        `).join('')}
                    </div>
                    <div class="pareo-columna">
                        <h5>Columna B</h5>
                        ${indicesBMezclados.map((origIdx) => `
                            <div class="pareo-item pareo-b" data-indice="${origIdx}" tabindex="0">${pregunta.columnaB[origIdx]}</div>
                        `).join('')}
                    </div>
                </div>
                <button class="btn-primario btn-verificar-pareo oculto" id="btn-verificar-pareo">Verificar ✅</button>
            </div>
            <div id="quiz-explicacion-area"></div>
        </div>
    `;

    // Eventos para pareo
    area.querySelectorAll('.pareo-a').forEach(item => {
        item.addEventListener('click', () => seleccionarPareo('A', item));
    });
    area.querySelectorAll('.pareo-b').forEach(item => {
        item.addEventListener('click', () => seleccionarPareo('B', item));
    });

    document.getElementById('btn-verificar-pareo').addEventListener('click', verificarPareo);
}

function seleccionarPareo(columna, elemento) {
    if (elemento.classList.contains('emparejado')) return;

    if (columna === 'A') {
        // Deseleccionar anterior
        document.querySelectorAll('.pareo-a.seleccionado').forEach(el => el.classList.remove('seleccionado'));
        elemento.classList.add('seleccionado');
        pareoEstado.seleccionA = parseInt(elemento.dataset.indice);
    } else {
        document.querySelectorAll('.pareo-b.seleccionado').forEach(el => el.classList.remove('seleccionado'));
        elemento.classList.add('seleccionado');
        pareoEstado.seleccionB = parseInt(elemento.dataset.indice);
    }

    // Si ambas están seleccionadas, emparejar
    if (pareoEstado.seleccionA !== null && pareoEstado.seleccionB !== null) {
        pareoEstado.emparejamientos.push({
            a: pareoEstado.seleccionA,
            b: pareoEstado.seleccionB
        });

        // Marcar como emparejados
        const elemA = document.querySelector(`.pareo-a[data-indice="${pareoEstado.seleccionA}"]`);
        const elemB = document.querySelector(`.pareo-b[data-indice="${pareoEstado.seleccionB}"]`);
        elemA.classList.add('emparejado');
        elemA.classList.remove('seleccionado');
        elemB.classList.add('emparejado');
        elemB.classList.remove('seleccionado');

        pareoEstado.seleccionA = null;
        pareoEstado.seleccionB = null;

        // Si se emparejaron todos, mostrar botón verificar
        if (pareoEstado.emparejamientos.length === pareoEstado.pareoActual.columnaA.length) {
            document.getElementById('btn-verificar-pareo').classList.remove('oculto');
        }
    }
}

function verificarPareo() {
    const pregunta = pareoEstado.pareoActual;
    let todosCorrectos = true;

    pareoEstado.emparejamientos.forEach(par => {
        const esCorrecto = pregunta.respuestas[par.a] === par.b;
        const elemA = document.querySelector(`.pareo-a[data-indice="${par.a}"]`);
        const elemB = document.querySelector(`.pareo-b[data-indice="${par.b}"]`);

        if (esCorrecto) {
            elemA.classList.add('correcto');
            elemB.classList.add('correcto');
        } else {
            elemA.classList.add('incorrecto');
            elemB.classList.add('incorrecto');
            todosCorrectos = false;
        }
    });

    if (todosCorrectos) {
        quizActual.correctas++;
    }

    quizActual.respuestas.push({
        pregunta: `Pareo: ${pregunta.titulo}`,
        correcta: todosCorrectos,
        temaKey: pregunta.temaKey,
        tipo: pregunta.tipo,
        indiceOriginal: pregunta.indiceOriginal
    });

    document.getElementById('btn-verificar-pareo').classList.add('oculto');
    mostrarExplicacion(todosCorrectos
        ? '¡Todos los emparejamientos son correctos! 🎉'
        : 'Algunos emparejamientos no son correctos. Revisa las respuestas marcadas en rojo. 📖');
    document.getElementById('btn-siguiente-pregunta').classList.remove('oculto');
}

function mostrarExplicacion(texto) {
    const area = document.getElementById('quiz-explicacion-area');
    area.innerHTML = `<div class="quiz-explicacion">💡 ${texto}</div>`;
}

function siguientePregunta() {
    quizActual.indiceActual++;

    if (quizActual.indiceActual >= quizActual.preguntas.length) {
        mostrarResultados();
    } else {
        mostrarPregunta();
    }
}

function mostrarResultados() {
    document.getElementById('quiz-activo').classList.add('oculto');
    document.getElementById('quiz-resultados').classList.remove('oculto');

    // Actualizar barra de progreso al 100%
    document.getElementById('quiz-progreso-fill').style.width = '100%';

    const total = quizActual.preguntas.length;
    const correctas = quizActual.correctas;
    const porcentaje = Math.round((correctas / total) * 100);

    document.getElementById('resultado-correctas').textContent = correctas;
    document.getElementById('resultado-total').textContent = total;
    document.getElementById('resultado-porcentaje').textContent = `${porcentaje}%`;

    let emoji, mensaje;
    if (porcentaje >= 90) {
        emoji = '🌟';
        mensaje = '¡Increíble! ¡Lo dominás!';
    } else if (porcentaje >= 70) {
        emoji = '💪';
        mensaje = '¡Vas muy bien! Casi perfecto';
    } else if (porcentaje >= 50) {
        emoji = '📖';
        mensaje = '¡Sigue practicando! Vas por buen camino';
    } else {
        emoji = '🔥';
        mensaje = '¡No te rindás! Cada intento cuenta';
    }

    document.getElementById('resultado-emoji').textContent = emoji;
    document.getElementById('resultado-mensaje').textContent = mensaje;

    // Guardar progreso
    guardarResultadoQuiz();
}

function repetirQuiz() {
    quizActual.indiceActual = 0;
    quizActual.correctas = 0;
    quizActual.respuestas = [];
    quizActual.preguntas = mezclarArray(quizActual.preguntas);

    document.getElementById('quiz-resultados').classList.add('oculto');
    document.getElementById('quiz-activo').classList.remove('oculto');
    document.getElementById('quiz-progreso-fill').style.width = '0%';

    mostrarPregunta();
}

function nuevoQuiz() {
    document.getElementById('quiz-resultados').classList.add('oculto');
    document.getElementById('quiz-activo').classList.add('oculto');
    document.getElementById('quiz-selector').classList.remove('oculto');
    document.getElementById('quiz-progreso-fill').style.width = '0%';
}

// ===== MODO REPASO =====
function verificarModoRepaso() {
    const progreso = obtenerProgreso();
    const preguntasFalladas = progreso.preguntasFalladas || [];
    const contenedor = document.getElementById('modo-repaso-contenedor');

    if (preguntasFalladas.length > 0) {
        contenedor.classList.remove('oculto');
        document.getElementById('btn-modo-repaso').textContent =
            `🔄 Modo Repaso (${preguntasFalladas.length} preguntas falladas)`;
    } else {
        contenedor.classList.add('oculto');
    }
}

function iniciarModoRepaso() {
    const progreso = obtenerProgreso();
    const falladas = progreso.preguntasFalladas || [];

    if (falladas.length === 0) {
        alert('¡No tenés preguntas falladas! 🎉');
        return;
    }

    // Reconstruir las preguntas falladas
    quizActual.preguntas = [];
    quizActual.modoRepaso = true;

    falladas.forEach(ref => {
        const pregsTema = datosApp.preguntas[ref.temaKey];
        if (!pregsTema) return;

        const lista = pregsTema[ref.tipo];
        if (!lista || !lista[ref.indiceOriginal]) return;

        quizActual.preguntas.push({
            ...lista[ref.indiceOriginal],
            tipo: ref.tipo,
            temaKey: ref.temaKey,
            indiceOriginal: ref.indiceOriginal
        });
    });

    if (quizActual.preguntas.length === 0) {
        alert('No se pudieron cargar las preguntas de repaso. 😅');
        return;
    }

    quizActual.preguntas = mezclarArray(quizActual.preguntas);
    quizActual.indiceActual = 0;
    quizActual.correctas = 0;
    quizActual.respuestas = [];

    document.getElementById('quiz-selector').classList.add('oculto');
    document.getElementById('quiz-activo').classList.remove('oculto');
    document.getElementById('quiz-resultados').classList.add('oculto');

    mostrarPregunta();
}

// ===== MAPAS CONCEPTUALES =====
// ===== MAPAS CONCEPTUALES (HTML visual) =====
const COLORES_MAPA = {
    tema4: { raiz: 'linear-gradient(135deg, #27ae60, #2ecc71)', rama: '#e8f8f0', borde: '#2ecc71', hoja: '#d5f5e3', texto: '#1e8449', hojaTexto: '#145a32' },
    tema5: { raiz: 'linear-gradient(135deg, #2980b9, #3498db)', rama: '#eaf2f8', borde: '#3498db', hoja: '#d6eaf8', texto: '#1a5276', hojaTexto: '#154360' },
    tema6: { raiz: 'linear-gradient(135deg, #d35400, #e67e22)', rama: '#fef5e7', borde: '#f39c12', hoja: '#fdebd0', texto: '#af601a', hojaTexto: '#7e5109' },
    general: { raiz: 'linear-gradient(135deg, #7d3c98, #a569bd)', rama: '#f4ecf7', borde: '#9b59b6', hoja: '#e8daef', texto: '#6c3483', hojaTexto: '#4a235a' }
};

/** Parsea código Mermaid graph TD a un árbol de nodos */
function parseMermaidToTree(mermaidCode) {
    const nodes = {};
    const childrenMap = {};
    const hasParent = new Set();

    const lines = mermaidCode.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('graph') || !trimmed) continue;

        const match = trimmed.match(/(\w+)(?:\[([^\]]+)\])?\s*-->\s*(\w+)(?:\[([^\]]+)\])?/);
        if (match) {
            const [, fromId, fromLabel, toId, toLabel] = match;
            if (fromLabel) nodes[fromId] = fromLabel;
            if (toLabel) nodes[toId] = toLabel;

            if (!childrenMap[fromId]) childrenMap[fromId] = [];
            // Evitar duplicar un nodo si ya tiene padre (DAG → árbol)
            if (!hasParent.has(toId)) {
                childrenMap[fromId].push(toId);
                hasParent.add(toId);
            }
        }
    }

    const rootId = Object.keys(nodes).find(id => !hasParent.has(id));

    function build(id) {
        return {
            label: nodes[id] || id,
            children: (childrenMap[id] || []).map(cid => build(cid))
        };
    }

    return rootId ? build(rootId) : null;
}

/** Genera HTML visual para un árbol de mapa conceptual */
function generarHTMLMapa(tree, color) {
    if (!tree) return '<p style="text-align:center;color:var(--color-texto-secundario)">No se pudo generar el mapa.</p>';

    let html = '<div class="mapa-visual">';

    // Nodo raíz
    html += `<div class="mapa-raiz" style="background:${color.raiz}">${tree.label}</div>`;
    html += `<div class="mapa-conector" style="background:${color.borde}"></div>`;

    // Ramas (hijos directos del root)
    if (tree.children.length > 0) {
        html += '<div class="mapa-ramas">';
        for (const rama of tree.children) {
            html += `<div class="mapa-rama" style="border-left-color:${color.borde};background:${color.rama}">`;
            html += `<div class="mapa-rama-titulo" style="color:${color.texto}">`;
            html += `<span class="mapa-punto" style="background:${color.borde}"></span>`;
            html += rama.label;
            html += '</div>';

            // Hojas (hijos de cada rama)
            if (rama.children.length > 0) {
                html += '<div class="mapa-hojas">';
                for (const hoja of rama.children) {
                    html += `<div class="mapa-hoja" style="background:${color.hoja};border-color:${color.borde};color:${color.hojaTexto}">`;
                    html += `<span class="mapa-hoja-texto">${hoja.label}</span>`;

                    // Sub-hojas (nivel 3)
                    if (hoja.children && hoja.children.length > 0) {
                        for (const sub of hoja.children) {
                            html += `<span class="mapa-sub-hoja" style="color:${color.texto}">↳ ${sub.label}</span>`;
                        }
                    }
                    html += '</div>';
                }
                html += '</div>';
            }

            html += '</div>';
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function renderizarMapas() {
    const contenedor = document.getElementById('lista-mapas');
    contenedor.innerHTML = '';

    if (!datosApp.mapasConceptuales || datosApp.mapasConceptuales.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center;color:var(--color-texto-secundario)">No hay mapas conceptuales disponibles.</p>';
        return;
    }

    datosApp.mapasConceptuales.forEach((mapa) => {
        const color = COLORES_MAPA[mapa.temaId] || COLORES_MAPA.general;
        const tree = parseMermaidToTree(mapa.mermaid);

        const card = document.createElement('div');
        card.className = 'mapa-card';
        card.innerHTML = `
            <div class="mapa-header" role="button" tabindex="0" aria-expanded="false">
                🗺️ ${mapa.titulo}
                <span class="mapa-flecha">▼</span>
            </div>
            <div class="mapa-contenido">
                ${generarHTMLMapa(tree, color)}
            </div>
        `;

        const header = card.querySelector('.mapa-header');
        header.addEventListener('click', () => {
            const expandido = card.classList.toggle('expandido');
            header.setAttribute('aria-expanded', expandido);
        });
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const expandido = card.classList.toggle('expandido');
                header.setAttribute('aria-expanded', expandido);
            }
        });

        contenedor.appendChild(card);
    });
}

// ===== PROGRESO (LOCALSTORAGE) =====
function obtenerProgreso() {
    try {
        const datos = localStorage.getItem(STORAGE_KEY);
        return datos ? JSON.parse(datos) : {
            temasRevisados: [],
            quizzes: [],
            preguntasFalladas: []
        };
    } catch {
        return { temasRevisados: [], quizzes: [], preguntasFalladas: [] };
    }
}

function guardarProgreso(progreso) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progreso));
    } catch (e) {
        console.warn('No se pudo guardar el progreso:', e);
    }
}

function marcarTemaRevisado(subtemaId) {
    const progreso = obtenerProgreso();
    if (!progreso.temasRevisados.includes(subtemaId)) {
        progreso.temasRevisados.push(subtemaId);
        guardarProgreso(progreso);
    }
}

function guardarResultadoQuiz() {
    const progreso = obtenerProgreso();
    const total = quizActual.preguntas.length;
    const correctas = quizActual.correctas;
    const porcentaje = Math.round((correctas / total) * 100);

    progreso.quizzes.push({
        fecha: new Date().toISOString(),
        tema: quizActual.temaSeleccionado,
        total: total,
        correctas: correctas,
        porcentaje: porcentaje,
        modoRepaso: quizActual.modoRepaso
    });

    // Actualizar preguntas falladas
    if (!quizActual.modoRepaso) {
        // Agregar nuevas falladas
        quizActual.respuestas.forEach(r => {
            if (!r.correcta) {
                const yaExiste = progreso.preguntasFalladas.some(
                    f => f.temaKey === r.temaKey && f.tipo === r.tipo && f.indiceOriginal === r.indiceOriginal
                );
                if (!yaExiste) {
                    progreso.preguntasFalladas.push({
                        temaKey: r.temaKey,
                        tipo: r.tipo,
                        indiceOriginal: r.indiceOriginal
                    });
                }
            } else {
                // Remover si la acertó
                progreso.preguntasFalladas = progreso.preguntasFalladas.filter(
                    f => !(f.temaKey === r.temaKey && f.tipo === r.tipo && f.indiceOriginal === r.indiceOriginal)
                );
            }
        });
    } else {
        // En modo repaso, quitar las que acertó
        quizActual.respuestas.forEach(r => {
            if (r.correcta) {
                progreso.preguntasFalladas = progreso.preguntasFalladas.filter(
                    f => !(f.temaKey === r.temaKey && f.tipo === r.tipo && f.indiceOriginal === r.indiceOriginal)
                );
            }
        });
    }

    guardarProgreso(progreso);
}

function actualizarProgreso() {
    const progreso = obtenerProgreso();

    // Total de subtemas
    const totalSubtemas = datosApp.temas.reduce((acc, t) => acc + t.subtemas.length, 0);
    const revisados = progreso.temasRevisados.length;
    const porcentajeRevisados = totalSubtemas > 0 ? Math.round((revisados / totalSubtemas) * 100) : 0;

    document.getElementById('prog-temas-revisados').textContent = `${porcentajeRevisados}%`;
    document.getElementById('prog-quizzes-completados').textContent = progreso.quizzes.length;

    // Promedio
    const quizzes = progreso.quizzes;
    const promedio = quizzes.length > 0
        ? Math.round(quizzes.reduce((acc, q) => acc + q.porcentaje, 0) / quizzes.length)
        : 0;
    document.getElementById('prog-promedio').textContent = `${promedio}%`;

    // Progreso por tema
    renderizarProgresoPorTema(progreso);

    // Temas fuertes y débiles
    renderizarTemasRanking(progreso);
}

function renderizarProgresoPorTema(progreso) {
    const contenedor = document.getElementById('progreso-por-tema');
    contenedor.innerHTML = '';

    datosApp.temas.forEach(tema => {
        const totalSubtemas = tema.subtemas.length;
        const revisados = tema.subtemas.filter(s => progreso.temasRevisados.includes(s.id)).length;
        const porcentaje = Math.round((revisados / totalSubtemas) * 100);

        // Promedio de quizzes del tema
        const quizzesTema = progreso.quizzes.filter(q => q.tema === tema.id);
        const promedioQuiz = quizzesTema.length > 0
            ? Math.round(quizzesTema.reduce((a, q) => a + q.porcentaje, 0) / quizzesTema.length)
            : 0;

        contenedor.innerHTML += `
            <div class="progreso-tema-item">
                <div class="progreso-tema-nombre">
                    <span>${tema.emoji} Tema ${tema.numero}</span>
                    <span>${porcentaje}% revisado · ${promedioQuiz}% quiz</span>
                </div>
                <div class="progreso-tema-barra">
                    <div class="progreso-tema-fill" style="width: ${porcentaje}%"></div>
                </div>
            </div>
        `;
    });
}

function renderizarTemasRanking(progreso) {
    const fuertes = document.getElementById('temas-fuertes');
    const debiles = document.getElementById('temas-debiles');

    // Calcular promedio por tema
    const promedios = datosApp.temas.map(tema => {
        const quizzes = progreso.quizzes.filter(q => q.tema === tema.id);
        const promedio = quizzes.length > 0
            ? Math.round(quizzes.reduce((a, q) => a + q.porcentaje, 0) / quizzes.length)
            : -1;
        return { tema, promedio, quizzes: quizzes.length };
    }).filter(t => t.promedio >= 0);

    if (promedios.length === 0) {
        fuertes.innerHTML = '<p style="color:var(--color-texto-secundario);font-size:0.9rem;">Completa quizzes para ver tus fortalezas 💪</p>';
        debiles.innerHTML = '<p style="color:var(--color-texto-secundario);font-size:0.9rem;">Completa quizzes para ver áreas de mejora 📖</p>';
        return;
    }

    const ordenados = [...promedios].sort((a, b) => b.promedio - a.promedio);

    fuertes.innerHTML = ordenados
        .filter(t => t.promedio >= 50)
        .slice(0, 3)
        .map(t => `
            <div class="ranking-item">
                <span class="ranking-porcentaje">${t.promedio}%</span>
                <span>${t.tema.emoji} ${t.tema.titulo}</span>
            </div>
        `).join('') || '<p style="color:var(--color-texto-secundario);font-size:0.9rem;">Sigue practicando 💪</p>';

    debiles.innerHTML = ordenados
        .filter(t => t.promedio < 70)
        .reverse()
        .slice(0, 3)
        .map(t => `
            <div class="ranking-item">
                <span class="ranking-porcentaje bajo">${t.promedio}%</span>
                <span>${t.tema.emoji} ${t.tema.titulo}</span>
            </div>
        `).join('') || '<p style="color:var(--color-texto-secundario);font-size:0.9rem;">¡Todo bien! 🌟</p>';
}

// ===== UTILIDADES =====
/** Mezcla aleatoria de un array (Fisher-Yates) */
function mezclarArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
