import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

import type { Category } from "@/types";

// Mirrors category_for_type in src-tauri/src/models.rs.
export function categoryForType(type: string): Category {
  const t = type.toUpperCase();
  if (["MP4", "MKV", "AVI", "MOV", "WEBM", "WMV", "FLV", "M4V"].includes(t)) return "Video";
  if (["MP3", "FLAC", "WAV", "M4A", "AAC", "OGG", "WMA"].includes(t)) return "Music";
  if (["EXE", "MSI", "DMG", "PKG", "DEB", "RPM", "APK", "ISO", "IMG", "MSU"].includes(t)) return "Programs";
  if (["ZIP", "RAR", "7Z", "TAR", "GZ", "BZ2", "XZ", "CAB"].includes(t)) return "Archives";
  if (["PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "TXT", "EPUB", "CSV", "MD"].includes(t)) return "Documents";
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP", "SVG", "BMP", "TIFF"].includes(t)) return "Images";
  return "Other";
}

export function formatETA(seconds: number): string {
  if (seconds <= 0) return "--";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
