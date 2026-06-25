// server.js — HTTP API for batch/paid HEIC conversion.
// Same conversion core as the browser site and the MCP server.
//
// Endpoints:
//   GET  /health
//   POST /v1/convert   multipart: file=<heic> ; query: to=jpg|png, quality=0..1   -> image bytes
//   POST /v1/batch     multipart: file=<heic> (repeat) ; query: to, quality        -> .zip
//   GET  /v1/usage     -> { calls, units } for the calling key
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import JSZip from "jszip";
import { convertHeic, resolveFormat } from "./convert.js";
import { authMiddleware, meter, getUsage } from "./billing.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.use("/v1/*", authMiddleware());

app.get("/v1/usage", (c) => c.json(getUsage(c.get("apiKey"))));

app.post("/v1/convert", async (c) => {
  const to = c.req.query("to") || "jpg";
  const quality = parseFloat(c.req.query("quality") || "0.92");
  let f;
  try { f = resolveFormat(to); } catch (e) { return c.json({ error: e.message }, 400); }

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || typeof file === "string") {
    return c.json({ error: "Send a HEIC file in multipart field 'file'" }, 400);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const out = await convertHeic(buf, to, quality);
    meter(c.get("apiKey"), 1);
    const base = (file.name || "image").replace(/\.(heic|heif)$/i, "");
    return new Response(out.buffer, {
      headers: {
        "Content-Type": out.mime,
        "Content-Disposition": `attachment; filename="${base}.${out.ext}"`,
      },
    });
  } catch (e) {
    return c.json({ error: "Conversion failed: " + e.message }, 422);
  }
});

app.post("/v1/batch", async (c) => {
  const to = c.req.query("to") || "jpg";
  const quality = parseFloat(c.req.query("quality") || "0.92");
  let f;
  try { f = resolveFormat(to); } catch (e) { return c.json({ error: e.message }, 400); }

  const body = await c.req.parseBody({ all: true });
  let files = body["file"];
  if (!files) return c.json({ error: "Send one or more files in field 'file'" }, 400);
  if (!Array.isArray(files)) files = [files];

  const zip = new JSZip();
  const used = new Set();
  let ok = 0;
  for (const file of files) {
    if (!file || typeof file === "string") continue;
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const out = await convertHeic(buf, to, quality);
      const base = (file.name || `image-${ok}`).replace(/\.(heic|heif)$/i, "");
      // dedupe collisions so same-named uploads don't overwrite each other
      let name = `${base}.${out.ext}`;
      for (let i = 1; used.has(name); i++) name = `${base}-${i}.${out.ext}`;
      used.add(name);
      zip.file(name, out.buffer);
      ok += 1;
    } catch (e) {
      // skip bad file, keep going
    }
  }
  if (ok === 0) return c.json({ error: "No valid HEIC files converted" }, 422);
  meter(c.get("apiKey"), ok); // bill per converted image
  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(zipBuf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="converted-${f.ext}.zip"`,
    },
  });
});

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`heic-tools API on http://localhost:${info.port}`);
});

export default app;
