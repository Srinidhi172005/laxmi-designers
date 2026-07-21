// Reusable, UI-agnostic image optimization utility.
//
// Every image uploaded through the admin panel is passed through `optimizeImage`
// before it ever leaves the browser: it is decoded, resized (never upscaled),
// converted to WebP and compressed. Only the optimized WebP is uploaded — the
// original file is never sent anywhere.
//
// This module must stay free of React / DOM-component code so it can be reused
// for product, category, banner, collection, logo and any future upload.

export type ImagePresetKey =
  | "category"
  | "product"
  | "banner"
  | "collection"
  | "logo";

export interface ImagePreset {
  /** Human label, shown in previews / logs. */
  label: string;
  /** Maximum output width in pixels (aspect ratio preserved). */
  maxWidth: number;
  /** Maximum output height in pixels (aspect ratio preserved). */
  maxHeight: number;
  /** WebP quality, 0..1. */
  quality: number;
}

// Central source of truth for the optimization rules. Tweak here and every
// upload site across the app follows automatically.
export const IMAGE_PRESETS: Record<ImagePresetKey, ImagePreset> = {
  category: { label: "Category", maxWidth: 800, maxHeight: 800, quality: 0.8 },
  product: { label: "Product", maxWidth: 1200, maxHeight: 1200, quality: 0.85 },
  banner: { label: "Banner", maxWidth: 1920, maxHeight: 900, quality: 0.9 },
  collection: { label: "Collection", maxWidth: 1200, maxHeight: 1200, quality: 0.85 },
  // Logos are small UI marks — keep them crisp and lightweight.
  logo: { label: "Logo", maxWidth: 512, maxHeight: 512, quality: 0.9 },
};

// Accepted input formats. HEIC/HEIF carry inconsistent MIME types across
// browsers, so we validate by extension as well as MIME.
export const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"] as const;
export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.heic,.heif,image/*";

export interface OptimizedImage {
  /** Optimized WebP file, ready to upload. */
  file: File;
  /** Object URL for previewing the optimized image. Revoke when done. */
  previewUrl: string;
  originalName: string;
  /** e.g. "PNG", "HEIC". */
  originalFormat: string;
  optimizedFormat: "WEBP";
  originalSize: number;
  optimizedSize: number;
  /** Whole-number percentage of bytes saved (>= 0). */
  compressionPercent: number;
  width: number;
  height: number;
}

export class UnsupportedImageError extends Error {}
export class ImageOptimizeError extends Error {}

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function formatLabelFromFile(file: File): string {
  const ext = getExtension(file.name);
  if (ext) return ext.toUpperCase();
  const sub = file.type.split("/")[1];
  return sub ? sub.toUpperCase() : "UNKNOWN";
}

/** Human-readable byte size, e.g. "4.2 MB". */
export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** True if the file looks like a format we can optimize. */
export function isSupportedImage(file: File): boolean {
  const ext = getExtension(file.name);
  if ((ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) return true;
  // Some browsers report HEIC as "image/heic"/"image/heif", others leave it blank.
  return /^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type);
}

function isHeic(file: File): boolean {
  const ext = getExtension(file.name);
  return ext === "heic" || ext === "heif" || /heic|heif/i.test(file.type);
}

// HEIC/HEIF can't be decoded by <canvas>/createImageBitmap in most browsers,
// so we first transcode to a canvas-decodable JPEG using heic2any (loaded
// lazily so it never weighs down non-HEIC uploads).
async function decodeToBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  let source: Blob = file;

  if (isHeic(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
      source = Array.isArray(converted) ? converted[0] : (converted as Blob);
    } catch (err) {
      throw new ImageOptimizeError(
        "This HEIC/HEIF image could not be read. Please try a JPG or PNG instead."
      );
    }
  }

  // Prefer createImageBitmap (fast, off-main-thread), fall back to <img>.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(source);
    } catch {
      /* fall through to <img> decoding */
    }
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageOptimizeError("The image could not be decoded."));
    };
    img.src = url;
  });
}

function computeTargetSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Only ever downscale — never enlarge a smaller source.
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ImageOptimizeError("Failed to convert the image to WebP."));
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Read → resize → convert to WebP → compress. Returns the optimized WebP file
 * plus metadata for a before/after preview. Throws `UnsupportedImageError` for
 * rejected file types and `ImageOptimizeError` for conversion failures.
 */
export async function optimizeImage(
  file: File,
  presetOrKey: ImagePresetKey | ImagePreset
): Promise<OptimizedImage> {
  if (!isSupportedImage(file)) {
    throw new UnsupportedImageError(
      `Unsupported file type "${file.name}". Please upload a JPG, PNG, WebP or HEIC image.`
    );
  }

  const preset =
    typeof presetOrKey === "string" ? IMAGE_PRESETS[presetOrKey] : presetOrKey;
  const originalFormat = formatLabelFromFile(file);

  const bitmap = await decodeToBitmap(file);
  const srcWidth = bitmap.width;
  const srcHeight = bitmap.height;
  const { width, height } = computeTargetSize(
    srcWidth,
    srcHeight,
    preset.maxWidth,
    preset.maxHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageOptimizeError("Canvas is not supported in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Release the decoded bitmap's memory where possible.
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  const webpBlob = await canvasToWebp(canvas, preset.quality);

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const optimizedFile = new File([webpBlob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });

  const compressionPercent =
    file.size > 0
      ? Math.max(0, Math.round((1 - optimizedFile.size / file.size) * 100))
      : 0;

  return {
    file: optimizedFile,
    previewUrl: URL.createObjectURL(webpBlob),
    originalName: file.name,
    originalFormat,
    optimizedFormat: "WEBP",
    originalSize: file.size,
    optimizedSize: optimizedFile.size,
    compressionPercent,
    width,
    height,
  };
}
