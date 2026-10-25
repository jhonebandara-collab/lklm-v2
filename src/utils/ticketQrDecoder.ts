import { readBarcodesFromImageData } from 'zxing-wasm';
import jsQR from 'jsqr';

/**
 * Advanced Sri Lankan Lottery Ticket QR Decoder
 * Incorporates the techniques proven in decode-qr.mjs:
 * 1. ZXing WASM (strong C++ barcode engine)
 * 2. Ticket Region of Interest (ROI): DLB & NLB ticket QRs sit in bottom-right corner (~55%-62% x/y)
 * 3. Swept upscale factors (2x, 3x, 4x) for small micro-QRs
 * 4. Unsharp masking (1.6 * px - 0.6 * blur) to sharpen blurry physical ticket photos
 */

export interface DecodeOptions {
  barcodeDetector?: any;
  tryHarder?: boolean;
}

/**
 * Fast 3x3 unsharp mask on RGBA buffer:
 * out = 1.6 * px - 0.6 * blur(px)
 */
export function applyUnsharpMask(imageData: ImageData, amount = 1.6): ImageData {
  const { width: w, height: h, data: d } = imageData;
  const out = new ImageData(w, h);
  const o = out.data;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      let rB = 0, gB = 0, bB = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const s = ((y + dy) * w + (x + dx)) * 4;
          rB += d[s];
          gB += d[s + 1];
          bB += d[s + 2];
        }
      }
      rB /= 9; gB /= 9; bB /= 9;

      o[idx] = Math.max(0, Math.min(255, Math.round(amount * d[idx] - (amount - 1) * rB)));
      o[idx + 1] = Math.max(0, Math.min(255, Math.round(amount * d[idx + 1] - (amount - 1) * gB)));
      o[idx + 2] = Math.max(0, Math.min(255, Math.round(amount * d[idx + 2] - (amount - 1) * bB)));
      o[idx + 3] = 255;
    }
  }

  // Copy border pixels
  for (let x = 0; x < w; x++) {
    const top = x * 4;
    const bot = ((h - 1) * w + x) * 4;
    o[top] = d[top]; o[top + 1] = d[top + 1]; o[top + 2] = d[top + 2]; o[top + 3] = d[top + 3];
    o[bot] = d[bot]; o[bot + 1] = d[bot + 1]; o[bot + 2] = d[bot + 2]; o[bot + 3] = d[bot + 3];
  }
  for (let y = 0; y < h; y++) {
    const left = (y * w) * 4;
    const right = (y * w + (w - 1)) * 4;
    o[left] = d[left]; o[left + 1] = d[left + 1]; o[left + 2] = d[left + 2]; o[left + 3] = d[left + 3];
    o[right] = d[right]; o[right + 1] = d[right + 1]; o[right + 2] = d[right + 2]; o[right + 3] = d[right + 3];
  }

  return out;
}

/**
 * Attempt to decode ImageData using zxing-wasm, falling back to jsQR
 */
async function decodeSingleImageData(imgData: ImageData): Promise<string | null> {
  // 1. Try zxing-wasm C++ engine
  try {
    const wasmResults = await readBarcodesFromImageData(imgData, {
      formats: ['QRCode'],
      tryHarder: true,
    });
    if (wasmResults && wasmResults.length > 0) {
      const hit = wasmResults.find(r => r.text && r.text.trim());
      if (hit?.text) return hit.text.trim();
    }
  } catch {
    // fallback
  }

  // 2. Try jsQR
  try {
    const qr = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (qr?.data && qr.data.trim()) {
      return qr.data.trim();
    }
  } catch {
    // fallback
  }

  return null;
}

/**
 * Decode ticket photo using multi-pass strategies:
 * 1. Hardware BarcodeDetector on full image (instant if supported)
 * 2. zxing-wasm on full image
 * 3. Sweeping bottom-right corner ticket regions (0.50 - 0.62) with upscale & unsharp mask
 * 4. Downscaled full image pass for massive 12-48MP smartphone photos
 */
export async function decodeTicketImage(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: DecodeOptions = {}
): Promise<string | null> {
  const { barcodeDetector } = options;

  // 1. Hardware BarcodeDetector
  if (barcodeDetector) {
    try {
      const barcodes = await barcodeDetector.detect(imageSource);
      if (barcodes && barcodes.length > 0) {
        const qr = barcodes.find((b: any) => b.format === 'qr_code') || barcodes[0];
        if (qr?.rawValue && qr.rawValue.trim()) {
          return qr.rawValue.trim();
        }
      }
    } catch {
      // ignore
    }
  }

  const origW = imageSource.width;
  const origH = imageSource.height;
  if (!origW || !origH) return null;

  // Working canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Pass A: Full image at clamped resolution (max 1600px for speed & memory)
  const maxDim = 1400;
  const scale = Math.min(1, maxDim / Math.max(origW, origH));
  const fullW = Math.round(origW * scale);
  const fullH = Math.round(origH * scale);

  canvas.width = fullW;
  canvas.height = fullH;
  ctx.drawImage(imageSource, 0, 0, fullW, fullH);

  let fullImgData = ctx.getImageData(0, 0, fullW, fullH);
  let result = await decodeSingleImageData(fullImgData);
  if (result) return result;

  // Pass B: Unsharp mask on full image
  const unsharpFull = applyUnsharpMask(fullImgData, 1.6);
  result = await decodeSingleImageData(unsharpFull);
  if (result) return result;

  // Pass C: Ticket QR Region of Interest (ROI) Sweep
  // DLB and NLB ticket QRs are consistently situated in the bottom-right quadrant:
  // [fx, fy] = [0.60, 0.62], [0.55, 0.58], [0.50, 0.55]
  const roiFractions = [
    { fx: 0.60, fy: 0.62 },
    { fx: 0.55, fy: 0.58 },
    { fx: 0.50, fy: 0.55 },
  ];

  for (const { fx, fy } of roiFractions) {
    const rx = Math.round(origW * fx);
    const ry = Math.round(origH * fy);
    const rw = Math.round(origW * (1 - fx));
    const rh = Math.round(origH * (1 - fy));

    if (rw < 30 || rh < 30) continue;

    // Try scales [2x, 3.5x] if the crop is small
    const upscaleFactors = rw < 300 ? [2.5, 4] : [1, 2];

    for (const factor of upscaleFactors) {
      const targetW = Math.round(rw * factor);
      const targetH = Math.round(rh * factor);

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(imageSource, rx, ry, rw, rh, 0, 0, targetW, targetH);

      const roiData = ctx.getImageData(0, 0, targetW, targetH);
      result = await decodeSingleImageData(roiData);
      if (result) return result;

      // With unsharp mask (enhances edge gradients on faded printed dots)
      const roiUnsharp = applyUnsharpMask(roiData, 1.6);
      result = await decodeSingleImageData(roiUnsharp);
      if (result) return result;
    }
  }

  // Pass D: Scaled down pass (800px) for very noisy high-res photos
  if (fullW > 900) {
    const lowScale = 800 / Math.max(origW, origH);
    const lw = Math.round(origW * lowScale);
    const lh = Math.round(origH * lowScale);
    canvas.width = lw;
    canvas.height = lh;
    ctx.drawImage(imageSource, 0, 0, lw, lh);
    const lowData = ctx.getImageData(0, 0, lw, lh);
    result = await decodeSingleImageData(lowData);
    if (result) return result;
  }

  return null;
}
