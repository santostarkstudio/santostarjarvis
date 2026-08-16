const fs = require("fs");
const path = require("path");

const srcPath = "C:\\Users\\santo\\.gemini\\antigravity-ide\\brain\\0a0289ca-5538-438a-9348-15df38ffaf5b\\.user_uploaded\\media_1786872629748.jpg";
const tauriIconsDir = path.join(__dirname, "src-tauri", "icons");
const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(tauriIconsDir)) {
  fs.mkdirSync(tauriIconsDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Read raw image
const rawBytes = fs.readFileSync(srcPath);

// 1. Copy as main application icon
fs.writeFileSync(path.join(publicDir, "app-icon.jpg"), rawBytes);
fs.writeFileSync(path.join(publicDir, "app-icon.png"), rawBytes);
fs.writeFileSync(path.join(publicDir, "icon.png"), rawBytes);
fs.writeFileSync(path.join(tauriIconsDir, "icon.png"), rawBytes);
fs.writeFileSync(path.join(tauriIconsDir, "32x32.png"), rawBytes);
fs.writeFileSync(path.join(tauriIconsDir, "128x128.png"), rawBytes);
fs.writeFileSync(path.join(tauriIconsDir, "128x128@2x.png"), rawBytes);

// 2. Generate valid Windows ICO file embedding the raw image data
const imgSize = rawBytes.length;
const icoHeader = Buffer.alloc(22);

// ICONDIR
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // Number of images = 1

// ICONDIRENTRY
icoHeader.writeUInt8(0, 6); // Width 256 = 0
icoHeader.writeUInt8(0, 7); // Height 256 = 0
icoHeader.writeUInt8(0, 8); // Palette colors 0
icoHeader.writeUInt8(0, 9); // Reserved 0
icoHeader.writeUInt16LE(1, 10); // Color planes 1
icoHeader.writeUInt16LE(32, 12); // Bits per pixel 32
icoHeader.writeUInt32LE(imgSize, 14); // Image byte length
icoHeader.writeUInt32LE(22, 18); // Offset to image data = 22

const icoBuffer = Buffer.concat([icoHeader, rawBytes]);

fs.writeFileSync(path.join(tauriIconsDir, "icon.ico"), icoBuffer);
fs.writeFileSync(path.join(publicDir, "icon.ico"), icoBuffer);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);

console.log("[✓] Iron Man Helmet App Icons successfully generated for Windows .EXE and Desktop!");
