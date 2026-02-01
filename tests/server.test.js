const fs = require("fs/promises");
const request = require("supertest");

const mockExecFile = jest.fn();

jest.mock("child_process", () => ({
  execFile: (...args) => mockExecFile(...args)
}));

const { app } = require("../server/index");

function fakePdfBuffer() {
  return Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
}

describe("ultra-merge API", () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockExecFile.mockImplementation((command, args, options, callback) => {
      if (command === "pdfinfo") {
        callback(null, "Page size: 612 x 792 pts\n", "");
        return;
      }

      if (command === "img2pdf") {
        const outputIndex = args.indexOf("-o");
        const outputPath = args[outputIndex + 1];
        fs.writeFile(outputPath, "%PDF-1.4\n%%EOF\n")
          .then(() => callback(null, "", ""))
          .catch(callback);
        return;
      }

      if (command === "enscript") {
        const outputIndex = args.indexOf("-o");
        const outputPath = args[outputIndex + 1];
        fs.writeFile(outputPath, "%!PS\n%%EOF\n")
          .then(() => callback(null, "", ""))
          .catch(callback);
        return;
      }

      if (command === "ps2pdf") {
        const outputPath = args[1];
        fs.writeFile(outputPath, "%PDF-1.4\n%%EOF\n")
          .then(() => callback(null, "", ""))
          .catch(callback);
        return;
      }

      if (command === "gs") {
        const outputIndex = args.indexOf("-o");
        const outputPath = args[outputIndex + 1];
        fs.writeFile(outputPath, "%PDF-1.4\n%%EOF\n")
          .then(() => callback(null, "", ""))
          .catch(callback);
        return;
      }

      if (command === "pdfunite") {
        const outputPath = args[args.length - 1];
        fs.writeFile(outputPath, "%PDF-1.4\n%%EOF\n")
          .then(() => callback(null, "", ""))
          .catch(callback);
        return;
      }

      callback(new Error(`Unexpected command: ${command}`));
    });
  });

  it("returns health ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("rejects empty uploads", async () => {
    const response = await request(app)
      .post("/api/merge")
      .field("includeBlank", "false");
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/upload at least one/i);
  });

  it("rejects non-pdf files", async () => {
    const response = await request(app)
      .post("/api/merge")
      .attach("files", Buffer.from("hello"), "notes.docx");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/pdf|png|jpg|txt/i);
  });

  it("rejects uploads over 42 files", async () => {
    const req = request(app).post("/api/merge");
    for (let i = 0; i < 43; i += 1) {
      req.attach("files", fakePdfBuffer(), `doc-${i}.pdf`);
    }
    const response = await req;
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/42/i);
  });

  it("converts images to PDFs before merging", async () => {
    const response = await request(app)
      .post("/api/merge")
      .field("includeBlank", "false")
      .attach("files", Buffer.from("img"), "photo.png")
      .attach("files", fakePdfBuffer(), "one.pdf");

    expect(response.status).toBe(200);
    const commands = mockExecFile.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["img2pdf", "pdfunite"]);
  });

  it("converts text files to PDFs before merging", async () => {
    const response = await request(app)
      .post("/api/merge")
      .field("includeBlank", "false")
      .attach("files", Buffer.from("hello world"), "notes.txt")
      .attach("files", fakePdfBuffer(), "one.pdf");

    expect(response.status).toBe(200);
    const commands = mockExecFile.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["enscript", "ps2pdf", "pdfunite"]);
  });

  it("merges PDFs and returns a download", async () => {
    const response = await request(app)
      .post("/api/merge")
      .field("includeBlank", "false")
      .attach("files", fakePdfBuffer(), "one.pdf")
      .attach("files", fakePdfBuffer(), "two.pdf");

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toMatch(/merged\.pdf/);
    expect(mockExecFile).toHaveBeenCalledWith(
      "pdfunite",
      expect.arrayContaining([expect.stringContaining("merged.pdf")]),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("inserts blank pages when requested", async () => {
    const response = await request(app)
      .post("/api/merge")
      .field("includeBlank", "true")
      .attach("files", fakePdfBuffer(), "one.pdf")
      .attach("files", fakePdfBuffer(), "two.pdf");

    expect(response.status).toBe(200);
    const commands = mockExecFile.mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["pdfinfo", "gs", "pdfunite"]);
  });
});
