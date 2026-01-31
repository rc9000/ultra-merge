const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const includeBlank = document.getElementById("includeBlank");
const mergeButton = document.getElementById("mergeButton");
const statusText = document.getElementById("status");

const MAX_FILES = 42;
let selectedFiles = [];

function renderFiles() {
  fileList.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
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
