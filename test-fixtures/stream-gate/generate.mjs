// Generates a 30s synthetic HLS stream (test pattern + tone, no third-party
// content) into ./hls. Uses ffmpeg from PATH, or the copy Apex installs.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const apexFfmpeg = join(process.env.APPDATA ?? "", "com.apex.download-manager", "tools", "ffmpeg.exe");
const ffmpeg = existsSync(apexFfmpeg) ? apexFfmpeg : "ffmpeg";
const out = join(import.meta.dirname, "hls");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

execFileSync(ffmpeg, [
  "-hide_banner", "-loglevel", "error",
  "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=30",
  "-f", "lavfi", "-i", "sine=frequency=440:duration=30",
  "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-g", "60",
  "-c:a", "aac", "-b:a", "96k",
  "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod",
  "-hls_segment_filename", join(out, "seg%03d.ts"),
  join(out, "index.m3u8"),
], { stdio: "inherit" });
console.log(`HLS written to ${out}`);
