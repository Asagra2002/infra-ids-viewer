/**
 * Diagnóstico barra de visualización – ejecutar en la consola del navegador
 * (con el viewer de un proyecto abierto y, en dev, window.worldComponents / window.world expuestos).
 *
 * Cargar: copy(await (await fetch('/diagnose-viz-toolbar.js')).text()) y pegar en consola,
 * o pegar el contenido de este archivo en la consola.
 */
(function () {
  var OBC = window.OBC;
  var components = window.worldComponents;
  var world = window.world;

  if (!OBC) {
    console.warn('[VizDiagnose] window.OBC no definido. En dev debería exponerse desde IntegratedViewer.');
  }

  function getWorld() {
    if (world) return world;
    if (!components || !OBC) return null;
    try {
      var worlds = components.get(OBC.Worlds);
      var list = worlds && worlds.list;
      if (!list || !list.size) return null;
      return Array.from(list.values())[0] || null;
    } catch (e) {
      console.warn('[VizDiagnose] getWorld error', e);
      return null;
    }
  }

  var w = getWorld();

  function logSelection() {
    var sel = window.__viewerSelectionModelIdMap ?? null;
    console.log('[VizDiagnose] Selección actual (__viewerSelectionModelIdMap):', sel);
    if (sel) {
      for (var modelId in sel) {
        if (!Object.prototype.hasOwnProperty.call(sel, modelId)) continue;
        var ids = sel[modelId];
        var arr = ids instanceof Set ? Array.from(ids) : (Array.isArray(ids) ? ids : [ids]);
        console.log('  modelId:', modelId, 'localIds:', arr);
      }
    } else {
      console.log('  (sin selección – haz click en el modelo para seleccionar)');
    }
    return sel;
  }

  async function fitAll() {
    console.log('[VizDiagnose] fitAll()');
    var ww = getWorld();
    if (!ww || !ww.camera) {
      console.warn('  Sin world o cámara. world=', !!ww, 'camera=', !!(ww && ww.camera));
      return;
    }
    try {
      await ww.camera.fit();
      console.log('  listo');
    } catch (e) {
      console.warn('  error', e);
    }
  }

  async function showAll() {
    console.log('[VizDiagnose] showAll()');
    if (!components || !OBC) {
      console.warn('  Sin worldComponents u OBC');
      return;
    }
    try {
      var hider = components.get(OBC.Hider);
      await hider.set(true);
      console.log('  listo');
    } catch (e) {
      console.warn('  error', e);
    }
  }

  async function zoomToSelection() {
    var sel = logSelection();
    if (!sel) {
      console.warn('[VizDiagnose] zoomToSelection: sin selección');
      return;
    }
    var ww = getWorld();
    if (!ww || !ww.camera) {
      console.warn('  Sin world o cámara');
      return;
    }
    try {
      await ww.camera.fitToItems(sel);
      console.log('  listo');
    } catch (e) {
      console.warn('  error', e);
    }
  }

  async function hideSelected() {
    var sel = logSelection();
    if (!sel) {
      console.warn('[VizDiagnose] hideSelected: sin selección');
      return;
    }
    if (!components || !OBC) {
      console.warn('  Sin worldComponents u OBC');
      return;
    }
    try {
      var hider = components.get(OBC.Hider);
      await hider.set(false, sel);
      console.log('  listo');
    } catch (e) {
      console.warn('  error', e);
    }
  }

  async function showSelected() {
    var sel = logSelection();
    if (!sel) {
      console.warn('[VizDiagnose] showSelected: sin selección');
      return;
    }
    if (!components || !OBC) {
      console.warn('  Sin worldComponents u OBC');
      return;
    }
    try {
      var hider = components.get(OBC.Hider);
      await hider.set(true, sel);
      console.log('  listo');
    } catch (e) {
      console.warn('  error', e);
    }
  }

  async function isolateSelection() {
    var sel = logSelection();
    if (!sel) {
      console.warn('[VizDiagnose] isolateSelection: sin selección');
      return;
    }
    if (!components || !OBC) {
      console.warn('  Sin worldComponents u OBC');
      return;
    }
    try {
      var hider = components.get(OBC.Hider);
      await hider.isolate(sel);
      console.log('  listo');
    } catch (e) {
      console.warn('  error', e);
    }
  }

  /** Poner una selección de prueba: primer modelo y un localId (p. ej. 1). Si falla, haz click en el modelo. */
  function setTestSelection() {
    if (!components || !OBC) {
      console.warn('[VizDiagnose] Sin worldComponents u OBC');
      return null;
    }
    try {
      var fragments = components.get(OBC.FragmentsManager);
      var list = fragments && fragments.list;
      if (!list || !list.size) {
        console.warn('[VizDiagnose] No hay fragmentos cargados');
        return null;
      }
      var firstKey = list.keys().next().value;
      if (firstKey == null) {
        console.warn('[VizDiagnose] No hay modelos en list');
        return null;
      }
      var model = list.get(firstKey);
      var modelId = (model && (model.uuid || model.modelId)) || firstKey;
      var localId = 1;
      if (model && typeof model.getAllLocalIds === 'function') {
        var ids = model.getAllLocalIds();
        if (ids && ids.length) localId = ids[0];
      }
      var sel = {};
      sel[modelId] = new Set([localId]);
      window.__viewerSelectionModelIdMap = sel;
      console.log('[VizDiagnose] Selección de prueba:', sel);
      return sel;
    } catch (e) {
      console.warn('[VizDiagnose] setTestSelection error', e);
      return null;
    }
  }

  var api = {
    logSelection: logSelection,
    fitAll: fitAll,
    showAll: showAll,
    zoomToSelection: zoomToSelection,
    hideSelected: hideSelected,
    showSelected: showSelected,
    isolateSelection: isolateSelection,
    setTestSelection: setTestSelection,
    get world() { return getWorld(); },
    get components() { return components; }
  };

  window.vizDiagnose = api;
  console.log('[VizDiagnose] API en window.vizDiagnose:');
  console.log('  vizDiagnose.logSelection()');
  console.log('  vizDiagnose.fitAll()');
  console.log('  vizDiagnose.showAll()');
  console.log('  vizDiagnose.zoomToSelection()');
  console.log('  vizDiagnose.hideSelected()');
  console.log('  vizDiagnose.showSelected()');
  console.log('  vizDiagnose.isolateSelection()');
  console.log('  vizDiagnose.setTestSelection()');
  console.log('  vizDiagnose.world / .components');
  logSelection();
  console.log('[VizDiagnose] Para recargar: fetch("/diagnose-viz-toolbar.js").then(r=>r.text()).then(eval);');
})();
