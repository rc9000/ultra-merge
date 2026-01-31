const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const includeBlank = document.getElementById("includeBlank");
const mergeButton = document.getElementById("mergeButton");
const statusText = document.getElementById("status");

const MAX_FILES = 42;
let selectedFiles = [];
let draggedIndex = null;

function renderFiles() {
  fileList.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-row";
    row.dataset.index = index;
    row.draggable = true;
    row.innerHTML = `
      <span class="drag-handle" aria-hidden="true">↕</span>
      <span class="file-name">${file.name}</span>
      <button class="remove" data-index="${index}">Remove</button>
    `;
    fileList.appendChild(row);
  });

  fileCount.textContent = `${selectedFiles.length} / ${MAX_FILES} files`;
}

function setStatus(message, type = "") {
  statusText.textContent = message;
  statusText.dataset.type = type;
}

function moveFile(from, to) {
  if (from === to || Number.isNaN(from) || Number.isNaN(to)) return;
  const [moved] = selectedFiles.splice(from, 1);
  const target = Math.max(0, Math.min(to, selectedFiles.length));
  selectedFiles.splice(target, 0, moved);
}

function addFiles(files) {
  const fileArray = Array.from(files);
  const remaining = MAX_FILES - selectedFiles.length;

  if (remaining <= 0) {
    setStatus("You already added 42 files.", "error");
    return;
  }

  const sliced = fileArray.slice(0, remaining);
  selectedFiles = selectedFiles.concat(sliced);

  if (fileArray.length > remaining) {
    setStatus("Some files were skipped because the limit is 42.", "warning");
  } else {
    setStatus("", "");
  }

  renderFiles();
}

function clearSelection() {
  selectedFiles = [];
  renderFiles();
}

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  fileInput.value = "";
});

fileList.addEventListener("click", (event) => {
  const button = event.target.closest("button.remove");
  if (!button) return;
  const index = Number(button.dataset.index);
  selectedFiles.splice(index, 1);
  renderFiles();
});

fileList.addEventListener("dragstart", (event) => {
  const row = event.target.closest(".file-row");
  if (!row) return;
  draggedIndex = Number(row.dataset.index);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(draggedIndex));
  row.classList.add("dragging-row");
});

fileList.addEventListener("dragend", () => {
  draggedIndex = null;
  fileList.querySelectorAll(".dragging-row").forEach((row) => {
    row.classList.remove("dragging-row");
  });
  fileList.querySelectorAll(".drag-over").forEach((row) => {
    row.classList.remove("drag-over");
  });
});

fileList.addEventListener("dragover", (event) => {
  const row = event.target.closest(".file-row");
  if (!row) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  row.classList.add("drag-over");
});

fileList.addEventListener("dragleave", (event) => {
  const row = event.target.closest(".file-row");
  if (!row) return;
  row.classList.remove("drag-over");
});

fileList.addEventListener("drop", (event) => {
  event.preventDefault();
  const row = event.target.closest(".file-row");
  const from =
    draggedIndex ?? Number(event.dataTransfer.getData("text/plain"));
  if (Number.isNaN(from)) return;
  const to = row ? Number(row.dataset.index) : selectedFiles.length - 1;
  moveFile(from, to);
  renderFiles();
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
});

dropzone.addEventListener("drop", (event) => {
  addFiles(event.dataTransfer.files);
});

dropzone.addEventListener("click", () => {
  fileInput.click();
});

mergeButton.addEventListener("click", async () => {
  if (selectedFiles.length === 0) {
    setStatus("Please add at least one PDF.", "error");
    return;
  }

  mergeButton.disabled = true;
  setStatus("Merging your PDFs…", "info");

  try {
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    formData.append("includeBlank", includeBlank.checked);

    const response = await fetch("/api/merge", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Merge failed.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "merged.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    setStatus("Merged PDF ready!", "success");
    clearSelection();
  } catch (error) {
    setStatus(error.message || "Merge failed.", "error");
  } finally {
    mergeButton.disabled = false;
  }
});

renderFiles();
