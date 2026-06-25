/* converter.js — 100% in-browser HEIC conversion engine.
 * Files NEVER leave the browser. No network upload.
 * Config-driven: each tool page sets window.CONVERT_CONFIG.
 *
 * Deps (loaded via CDN in the page, but conversion runs locally):
 *   - heic2any : decode HEIC -> JPEG/PNG blob (libheif wasm)
 *   - JSZip    : bundle batch output into one .zip download
 */
(function () {
  "use strict";

  var cfg = window.CONVERT_CONFIG || {
    to: "jpg",
    mime: "image/jpeg",
    ext: "jpg",
    quality: 0.92,
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var dz = $("#dropzone");
  var input = $("#fileInput");
  var fileList = $("#fileList");
  var convertBtn = $("#convertBtn");
  var downloadAllBtn = $("#downloadAllBtn");
  var clearBtn = $("#clearBtn");
  var qualityRange = $("#quality");
  var qualityVal = $("#qualityVal");

  // queue of { file, row, statusEl, blob, outName }
  var queue = [];

  function isHeic(file) {
    var n = (file.name || "").toLowerCase();
    return (
      n.endsWith(".heic") ||
      n.endsWith(".heif") ||
      file.type === "image/heic" ||
      file.type === "image/heif"
    );
  }

  function outName(name) {
    return name.replace(/\.(heic|heif)$/i, "") + "." + cfg.ext;
  }

  function addFiles(files) {
    Array.prototype.forEach.call(files, function (file) {
      if (!isHeic(file)) return; // skip non-HEIC silently in MVP
      var row = document.createElement("div");
      row.className = "file";
      var name = document.createElement("div");
      name.className = "name";
      name.textContent = file.name;
      var status = document.createElement("div");
      status.className = "status";
      status.textContent = "ready";
      row.appendChild(name);
      row.appendChild(status);
      fileList.appendChild(row);
      queue.push({ file: file, row: row, statusEl: status, blob: null, outName: outName(file.name) });
    });
    refreshButtons();
  }

  function refreshButtons() {
    convertBtn.disabled = queue.length === 0;
    var anyDone = queue.some(function (q) { return q.blob; });
    downloadAllBtn.disabled = !anyDone;
    clearBtn.disabled = queue.length === 0;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  async function convertOne(item) {
    item.statusEl.className = "status";
    item.statusEl.textContent = "converting…";
    try {
      var quality = qualityRange ? parseFloat(qualityRange.value) : cfg.quality;
      var out = await window.heic2any({
        blob: item.file,
        toType: cfg.mime,
        quality: cfg.mime === "image/png" ? undefined : quality,
      });
      // heic2any may return an array for multi-image HEIC; take first.
      var blob = Array.isArray(out) ? out[0] : out;
      item.blob = blob;
      item.statusEl.className = "status done";
      item.statusEl.textContent = "done · click to save";
      item.row.style.cursor = "pointer";
      item.row.onclick = function () { downloadBlob(item.blob, item.outName); };
    } catch (e) {
      item.statusEl.className = "status err";
      item.statusEl.textContent = "failed (not a valid HEIC?)";
      console.error(e);
    }
  }

  async function convertAll() {
    convertBtn.disabled = true;
    for (var i = 0; i < queue.length; i++) {
      if (!queue[i].blob) await convertOne(queue[i]);
    }
    refreshButtons();
    // auto-download single file for convenience
    var done = queue.filter(function (q) { return q.blob; });
    if (done.length === 1) downloadBlob(done[0].blob, done[0].outName);
  }

  async function downloadAll() {
    var done = queue.filter(function (q) { return q.blob; });
    if (done.length === 1) { downloadBlob(done[0].blob, done[0].outName); return; }
    var zip = new window.JSZip();
    done.forEach(function (q) { zip.file(q.outName, q.blob); });
    var content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "converted-" + cfg.ext + ".zip");
  }

  function clearAll() {
    queue = [];
    fileList.innerHTML = "";
    refreshButtons();
  }

  // ---- wire events ----
  if (dz) {
    dz.addEventListener("click", function () { input.click(); });
    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("drag"); });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
  }
  if (input) input.addEventListener("change", function () { addFiles(input.files); input.value = ""; });
  if (convertBtn) convertBtn.addEventListener("click", convertAll);
  if (downloadAllBtn) downloadAllBtn.addEventListener("click", downloadAll);
  if (clearBtn) clearBtn.addEventListener("click", clearAll);
  if (qualityRange && qualityVal) {
    qualityVal.textContent = Math.round(qualityRange.value * 100) + "%";
    qualityRange.addEventListener("input", function () {
      qualityVal.textContent = Math.round(qualityRange.value * 100) + "%";
    });
  }

  refreshButtons();
})();
