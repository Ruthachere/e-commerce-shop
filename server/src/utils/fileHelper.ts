import fs from "fs";
import path from "path";

/**
 * Uploads folder path inside src/uploads
 */
export const uploadDir = path.join(__dirname, "../uploads");

/**
 * Normalize image filename by stripping prefixes (/uploads/, /images/, etc.)
 */
export function cleanImageFilename(
  filename: string | null | undefined
): string | null {
  if (!filename) return null;
  return filename
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/^uploads\//, "") // Remove 'uploads/' prefix
    .replace(/^images\//, ""); // Remove 'images/' prefix
}

/**
 * Get absolute path of the image inside uploads folder.
 */
export function getImagePath(filename: string): string {
  return path.join(uploadDir, cleanImageFilename(filename) || "");
}

/**
 * Delete an image file from uploads folder, if it exists.
 */
export function deleteImage(filename: string | null | undefined): void {
  if (!filename) {
    console.log("⚠️ No filename provided for deletion");
    return;
  }

  try {
    const filePath = getImagePath(filename);
    console.log("🗑️ Attempting to delete:", filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ Old image deleted successfully");
    } else {
      console.log("⚠️ Image file not found (already deleted or never existed)");
    }
  } catch (error) {
    console.error("⚠️ Could not delete image (non-critical):", error);
  }
}

/**
 * Build the public image URL for serving through Express.
 * Example: http://localhost:5000/uploads/filename.jpg
 */
export function buildImageUrl(
  req: any,
  filename: string | null
): string | null {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/${cleanImageFilename(
    filename
  )}`;
}
