const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const request = require("supertest");
const { execFile } = require("child_process");
const { promisify } = require("util");

const { app } = require("../server/index");

const execFileAsync = promisify(execFile);
const inputsRoot = path.join(__dirname, "inputs");
const inspectionDir = "/tmp";

jest.setTimeout(120000);

function binaryParser(res, callback) {
  const data = [];
  res.on("data", (chunk) => data.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(data)));
}

async function pdfToText(pdfPath) {
  const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"]);
  return stdout;
}

function loadCases() {
  if (!fs.existsSync(inputsRoot)) return [];
  return fs
    .readdirSync(inputsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .filter((caseName) =>
      fs.existsSync(path.join(inputsRoot, caseName, "expected.json"))
    );
}

describe("ultra-merge e2e pdf merges", () => {
  const cases = loadCases();

  if (cases.length === 0) {
    test("no e2e cases found", () => {
      expect(cases.length).toBeGreaterThan(0);
    });
    return;
  }

  cases.forEach((caseName) => {
    test(`merges PDFs for ${caseName} and matches expected text`, async () => {
      const caseDir = path.join(inputsRoot, caseName);
      const expectedPath = path.join(caseDir, "expected.json");
      const expected = JSON.parse(await fsp.readFile(expectedPath, "utf8"));

      const files = (await fsp.readdir(caseDir))
        .filter((file) => file.toLowerCase().endsWith(".pdf"))
        .sort((a, b) => a.localeCompare(b));

      expect(files.length).toBeGreaterThan(0);

      const req = request(app)
        .post("/api/merge")
        .field("includeBlank", "false");

      files.forEach((fileName) => {
        req.attach("files", path.join(caseDir, fileName));
      });

      const response = await req.buffer(true).parse(binaryParser);

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toMatch(/merged\.pdf/);

      const inspectionPath = path.join(inspectionDir, `${caseName}.pdf`);
      const tempDir = await fsp.mkdtemp(
        path.join(os.tmpdir(), "ultra-merge-e2e-")
      );
      const mergedPath = path.join(tempDir, "merged.pdf");

      try {
        await fsp.writeFile(mergedPath, response.body);
        await fsp.writeFile(inspectionPath, response.body);
        const text = await pdfToText(mergedPath);

        (expected.expectText || []).forEach((fragment) => {
          expect(text).toContain(fragment);
        });
      } finally {
        await fsp.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
