const request = require("supertest");
const { app } = require("../server/index");

function fakePdfBuffer() {
  return Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
}

describe("trusted-merge API", () => {
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
      .attach("files", Buffer.from("hello"), "notes.txt");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/pdfs/i);
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
});
