import { fetchSubtitleFile, readSubtitleFile, searchSubtitles, subtitleDownload, vidRiftOrigin, vidRiftPosition, vidSparkPosition } from './subtitles.js';

export function setupSubtitleControls(player) {
  const $ = (id) => document.getElementById(id);
  const panel = $('subtitle-panel');
  const stage = $('player-stage');
  const layer = $('subtitle-layer');
  const status = $('subtitle-status');
  const results = $('subtitle-results');
  const native = $('subtitle-native');
  const search = $('subtitle-search');
  const searchButton = search.querySelector('button[type="submit"]');
  const canSync = () => ['vidspark', 'vidrift'].includes(provider);
  const position = $('subtitle-position');
  let target;
  let provider;
  let cues = [];
  let seconds = 0;
  let startedAt = null;
  let automatic = true;
  let timer;
  let operation;
  let fileRevision = 0;

  const currentTime = () => seconds + (startedAt === null ? 0 : (performance.now() - startedAt) / 1000);


  function render() {
    const time = currentTime() - (Number($('subtitle-delay').value) || 0);
    const text = cues.filter((cue) => cue.start <= time && time < cue.end).map(({ caption }) => caption).join('\n');
    if (layer.textContent !== text) layer.textContent = text;
    layer.hidden = !text;
  }

  function clock(time, running) {
    seconds = time;
    startedAt = running ? performance.now() : null;
    clearInterval(timer);
    if (running && cues.length) timer = setInterval(render, 100);
    $('subtitle-clock').textContent = running ? 'Pausar subtítulos' : 'Iniciar subtítulos';
    render();
  }

  function requestPosition() {
    if (provider === 'vidspark') player.contentWindow.postMessage({ action: 'getStatus' }, 'https://vidspark.to');
    if (provider === 'vidrift') player.contentWindow.postMessage({ type: 'vidrift:get-state' }, vidRiftOrigin);
  }

  player.addEventListener('load', () => {
    if (provider === 'vidrift' && target?.media_type === 'tv') {
      player.contentWindow.postMessage({ type: 'vidrift:nextup-info', next: null }, vidRiftOrigin);
    }
    if (provider === 'vidrift' || (automatic && cues.length)) requestPosition();
  });

  function loadTrack(track, label) {
    cues = track;
    $('subtitle-timing').hidden = false;
    $('subtitle-track').textContent = label;
    status.textContent = canSync()
      ? 'Subtítulos activados. Si el texto se adelanta o retrasa, ajusta el desfase.'
      : 'Subtítulos cargados. Pulsa Iniciar subtítulos al reanudar el video y ajusta la posición si hace falta.';
    if (native.value && native.value !== 'off' && [...native.options].some(({ value }) => value === 'off')) {
      player.contentWindow.postMessage({ type: 'vidrift:set', subtitle: 'off' }, vidRiftOrigin);
    }
    clock(currentTime(), startedAt !== null);
    if (automatic) requestPosition();
  }

  function clearTrack() {
    fileRevision++;
    operation?.abort();
    searchButton.disabled = false;
    cues = [];
    $('subtitle-file').value = '';
    $('subtitle-delay').value = '0';
    $('subtitle-timing').hidden = true;
    $('subtitle-track').textContent = '';
    status.textContent = '';
    clock(currentTime(), startedAt !== null);
  }

  function resetTrack() {
    clearTrack();
    results.replaceChildren();
    searchButton.disabled = false;
  }

  function update(nextTarget, nextProvider, reload = true) {
    const changed = nextTarget?.key !== target?.key;
    if (changed || !nextTarget) resetTrack();
    target = nextTarget;
    provider = nextProvider;
    if (reload || changed) {
      native.replaceChildren();
      $('subtitle-native-field').hidden = true;
    }
    panel.hidden = !target;
    $('subtitle-auto').hidden = !['vidspark', 'vidrift'].includes(provider);
    $('subtitle-fullscreen').hidden = !provider || !stage.requestFullscreen;
    if (reload || changed) {
      automatic = true;
      position.value = '0';
      clock(0, false);
    }
  }

  $('subtitle-clock').addEventListener('click', () => {
    automatic = false;
    if (startedAt !== null) {
      position.value = currentTime().toFixed(1);
      clock(currentTime(), false);
    } else clock(Math.max(0, Number(position.value) || 0), true);
  });

  position.addEventListener('change', () => {
    automatic = false;
    clock(Math.max(0, Number(position.value) || 0), startedAt !== null);
  });
  $('subtitle-delay').addEventListener('input', render);
  $('subtitle-clear').addEventListener('click', () => {
    clearTrack();
    panel.open = true;
    $('subtitle-language').focus();
  });
  $('subtitle-auto').addEventListener('click', () => {
    automatic = true;
    clock(currentTime(), false);
    requestPosition();
  });

  native.addEventListener('change', () => {
    if (provider !== 'vidrift') return;
    if (native.value !== 'off') clearTrack();
    player.contentWindow.postMessage({ type: 'vidrift:set', subtitle: native.value }, vidRiftOrigin);
  });
  window.addEventListener('message', (event) => {
    if (!target) return;
    if (provider === 'vidrift') {
      const state = vidRiftPosition(event, player.contentWindow, target);
      if (!state) return;
      if (event.data.type === 'vidrift:state' && Array.isArray(event.data.subtitles)) {
        const tracks = event.data.subtitles.filter((track) => typeof track?.value === 'string' && typeof track.label === 'string');
        const options = tracks.map(({ value, label }) => new Option(value === 'off' ? 'Desactivados' : label, value));
        if (options.length !== native.length || options.some((option, index) =>
          option.value !== native.options[index].value || option.text !== native.options[index].text)) {
          native.replaceChildren(...options);
        }
        native.value = event.data.subtitle;
        $('subtitle-native-field').hidden = !tracks.some(({ value }) => value !== 'off');
      }
      if (automatic) clock(state.currentTime, state.running);
      return;
    }
    if (!automatic) return;
    if (provider !== 'vidspark') return;
    const data = vidSparkPosition(event, player.contentWindow);
    if (!data) return;
    const paused = ['pause', 'ended'].includes(data.event) || data.paused === true;
    const running = !paused && (['play', 'timeupdate'].includes(data.event) || data.paused === false || startedAt !== null);
    clock(data.currentTime, running);
  });

  $('subtitle-fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === stage) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch { status.textContent = 'El navegador no permitió abrir la pantalla completa de Fotograma.'; }
  });
  document.addEventListener('fullscreenchange', () => {
    $('subtitle-fullscreen').textContent = document.fullscreenElement === stage
      ? 'Salir de pantalla completa' : 'Pantalla completa con subtítulos';
  });

  $('subtitle-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file || !target) return;
    operation?.abort();
    const revision = ++fileRevision;
    try {
      const track = await readSubtitleFile(file);
      if (revision === fileRevision) loadTrack(track, file.name);
    } catch (error) {
      if (revision === fileRevision) status.textContent = error.message;
    }
  });

  function beginRequest() {
    fileRevision++;
    operation?.abort();
    operation = new AbortController();

    return operation.signal;
  }

  function showRequestError(error, signal) {
    if (signal.aborted) return;
    status.textContent = /HTTP (406|429)\b/.test(error.message)
      ? 'Se alcanzó el límite temporal de subtítulos. Prueba más tarde o elige una pista del reproductor.'
      : 'No se pudieron obtener los subtítulos. Prueba más tarde o elige una pista del reproductor si está disponible.';
  }

  search.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!target) return;
    const signal = beginRequest();
    results.replaceChildren();
    searchButton.disabled = true;
    status.textContent = 'Buscando subtítulos…';
    try {
      const tracks = await searchSubtitles(target, $('subtitle-language').value, '', signal);
      if (signal.aborted) return;
      status.textContent = tracks.length ? 'Elige una pista para activarla.' : 'No hay pistas en este idioma. Prueba otro idioma.';
      for (const track of tracks) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button secondary';
        button.textContent = `Activar ${track.name}`;
        button.addEventListener('click', () => fetchTrack(track));
        item.append(button);
        results.append(item);
      }
    } catch (error) { showRequestError(error, signal); }
    finally { if (!signal.aborted) searchButton.disabled = false; }
  });

  async function fetchTrack(track) {
    const signal = beginRequest();
    status.textContent = 'Solicitando subtítulo…';
    try {
      const { url } = await subtitleDownload(track.id, '', signal);
      if (signal.aborted) return;
      const cues = await fetchSubtitleFile(url, signal);
      if (!signal.aborted) loadTrack(cues, track.name);
    } catch (error) { showRequestError(error, signal); }
  }

  return update;
}
