// Analyze dominant colors + texture of each cushion cover image (primary = -1.png)
// to inform descriptive product naming. Pure Node (zero deps beyond built-ins + sharp).
// Usage: node scripts/analyze-cushion-colors.mjs
import { readdirSync } from "fs";
import path from "path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "collections", "cushion-covers");

function cname([r, g, b]) {
  if (r > 195 && g > 195 && b > 185) return "white/cream";
  if (r < 70 && g < 70 && b < 70) return "black";
  if (Math.abs(r - g) < 28 && Math.abs(g - b) < 28 && r >= 70 && r <= 195) return "grey";
  if (r > 130 && g < 105 && b < 105) return "red/maroon";
  if (r > 150 && g >= 90 && g < 130 && b < 100) return "orange/rust";
  if (r > 150 && g > 115 && b < 105) return "gold/mustard";
  if (g > 115 && r < g - 20 && b < 145) return "green";
  if (b > 115 && b > r + 15 && g < 150) return "blue";
  if (r > 130 && b > 110 && g < Math.min(r, b) - 15) return "purple/plum";
  if (r > 165 && g > 125 && g < 175 && b > 140) return "blush/pink";
  if (r > 160 && g > 120 && b < 120) return "tan/beige";
  return "mixed";
}

const result = {};
const files = readdirSync(dir).filter(f => /cushion-cover-.+-1\.png$/.test(f)).sort();

for (const f of files) {
  const key = f.replace(/-1\.png$/, "");
  try {
    // Downscale, get raw RGB pixels
    const { data, info } = await sharp(path.join(dir, f)).resize(64, 64).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 3) {
      const key3 = `${Math.floor(data[i] / 40) * 40},${Math.floor(data[i + 1] / 40) * 40},${Math.floor(data[i + 2] / 40) * 40}`;
      buckets.set(key3, (buckets.get(key3) || 0) + 1);
    }
    const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k]) => k.split(",").map(Number));
    // Texture: stddev of luminance
    const gray = await sharp(path.join(dir, f)).resize(48, 48).grayscale().raw().toBuffer();
    const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
    const variance = gray.reduce((a, b) => a + (b - mean) ** 2, 0) / gray.length;
    result[key] = { colors: top.map(cname), texture: variance > 900 ? "textured" : "smooth" };
  } catch (e) {
    result[key] = { error: e.message };
  }
}

console.log(JSON.stringify(result, null, 1));
