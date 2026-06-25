// mcp.js — MCP server exposing HEIC conversion as an Agent-callable tool.
// Same conversion core as the HTTP API and the browser site.
//
// Run (stdio): node src/mcp.js
// Register in an MCP client (e.g. Claude) as a stdio server pointing here.
//
// MONETIZATION: this is the convenience/cash layer, not a moat (libheif is open,
// an agent could decode HEIC itself). Front it with a metered proxy in prod:
//   xpay.sh (per-call), x402 (USDC per request), or Stripe MPP.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { convertHeic } from "./convert.js";

const server = new McpServer({ name: "heic-tools", version: "0.1.0" });

server.tool(
  "convert_heic",
  "Convert a HEIC/HEIF image to JPG or PNG. Input and output are base64. " +
    "Use when an agent needs to turn iPhone HEIC photos into a widely-compatible format.",
  {
    image_base64: z.string().describe("Base64-encoded HEIC/HEIF image bytes"),
    to: z.enum(["jpg", "png"]).default("jpg").describe("Target format"),
    quality: z.number().min(0.1).max(1).default(0.92).describe("JPEG quality (ignored for PNG)"),
  },
  async ({ image_base64, to, quality }) => {
    try {
      const input = Buffer.from(image_base64, "base64");
      const out = await convertHeic(input, to, quality);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true, mime: out.mime, ext: out.ext, bytes: out.buffer.length }),
          },
          { type: "image", data: out.buffer.toString("base64"), mimeType: out.mime },
        ],
      };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: "Conversion failed: " + e.message }],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("heic-tools MCP server running on stdio");
