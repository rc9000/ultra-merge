const express = require("express");
const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}-${safe}`);
    }
  }),
  limits: { files: 42 }
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function runCommand(command, args, options = {}) {
  const { stdout } = await execFileAsync(command, args, {
    timeout: 120000,
    ...options
  });
  return stdout;
}

async function getFirstPageSize(filePath) {
  try {
    const output = await runCommand("pdfinfo", [filePath]);
    const line = output.split("\n").find((item) => item.startsWith("Page size:"));
    if (!line) return { width: 612, height: 792 };
    const match = line.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/i);
    if (!match) return { width: 612, height: 792 };
    return {
      width: Math.round(parseFloat(match[1])),
      height: Math.round(parseFloat(match[2]))
    };
  } catch (error) {
    return { width: 612, height: 792 };
  }
}

async function createBlankPdf(destPath, width, height) {
  await runCommand("gs", [
    "-dBATCH",
    "-dNOPAUSE",
    "-dSAFER",
    "-sDEVICE=pdfwrite",
    `-g${width}x${height}`,
    "-o",
    destPath,
    "-c",
    "showpage"
  ]);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function moveFile(src, dest) {
  await fs.rename(src, dest);
}

async function removeDir(dirPath) {
  try {
    if (existsSync(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    // Best-effort cleanup.
  }
}

const uploadFiles = upload.array("files", 42);

app.post("/api/merge", (req, res) => {
  uploadFiles(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_COUNT") {
        res.status(400).json({ error: "You can upload up to 42 PDFs." });
        return;
      }
      res.status(400).json({ error: "Upload failed. Please try again." });
      return;
    }

    const jobDir = await fs.mkdtemp(path.join(os.tmpdir(), "trusted-merge-"));
    const cleanup = async () => removeDir(jobDir);

    res.on("finish", cleanup);
    res.on("close", cleanup);

    try {
      const includeBlank = req.body.includeBlank === "true";
      const files = req.files || [];

      if (files.length === 0) {
        res.status(400).json({ error: "Please upload at least one PDF." });
        return;
      }

      if (files.length > 42) {
        res.status(400).json({ error: "You can upload up to 42 PDFs." });
        return;
      }

      await ensureDir(jobDir);

      const movedFiles = [];
      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".pdf") {
          try {
            await fs.unlink(file.path);
          } catch (error) {
            // Ignore cleanup failure for invalid files.
          }
          res.status(400).json({ error: "All files must be PDFs." });
          return;
        }
        const targetPath = path.join(jobDir, path.basename(file.path));
        await moveFile(file.path, targetPath);
        movedFiles.push(targetPath);
      }

      let blankPath = null;
      if (includeBlank && movedFiles.length > 1) {
        const { width, height } = await getFirstPageSize(movedFiles[0]);
        blankPath = path.join(jobDir, "blank.pdf");
        await createBlankPdf(blankPath, width, height);
      }

      const inputs = [];
      movedFiles.forEach((filePath, index) => {
        inputs.push(filePath);
        if (blankPath && index < movedFiles.length - 1) {
          inputs.push(blankPath);
        }
      });

      const outputPath = path.join(jobDir, "merged.pdf");
      await runCommand("pdfunite", [...inputs, outputPath]);

      res.download(outputPath, "merged.pdf");
    } catch (error) {
      res.status(500).json({ error: "Merge failed. Please try again." });
    }
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`trusted-merge running on port ${port}`);
  });
}

module.exports = { app };
