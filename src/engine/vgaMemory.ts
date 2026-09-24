/**
 * x86 VGA Hardware Memory Architecture Simulator
 * Addresses:
 *  0x00000 - 0x7FFFF: Conventional RAM (Kernel & Data)
 *  0xA0000 - 0xAFFFF: VGA Mode 13h Graphics Framebuffer (320x200 8-bit color)
 *  0xB8000 - 0xBFFFF: CGA/VGA Mode 03h Text Framebuffer (80x25 16-color char+attr)
 *  0xE0000 - 0xEFFFF: MicroJS Bytecode & JIT Scratchpad
 *  0x100000 - 0x17FFFF: Network DMA Packet Ring Buffer
 */

export const MEMORY_SIZE = 0x200000; // 2MB
export const VGA_GRAPHICS_BASE = 0x0A0000;
export const VGA_TEXT_BASE = 0x0B8000;
export const JS_BYTECODE_BASE = 0x0E0000;
export const PACKET_DMA_BASE = 0x100000;

export const VGA_WIDTH = 320;
export const VGA_HEIGHT = 200;
export const TEXT_COLS = 80;
export const TEXT_ROWS = 25;

// Standard IBM VGA 256-color DAC Palette (RGB tuples [r, g, b])
export const VGA_PALETTE: [number, number, number][] = [
  [0, 0, 0],       // 0: Black
  [0, 0, 170],     // 1: Blue
  [0, 170, 0],     // 2: Green
  [0, 170, 170],   // 3: Cyan
  [170, 0, 0],     // 4: Red
  [170, 0, 170],   // 5: Magenta
  [170, 85, 0],    // 6: Brown
  [170, 170, 170], // 7: Light Gray
  [85, 85, 85],    // 8: Dark Gray
  [85, 85, 255],   // 9: Light Blue
  [85, 255, 85],   // 10: Light Green
  [85, 255, 255],  // 11: Light Cyan
  [255, 85, 85],   // 12: Light Red (Threat Critical)
  [255, 85, 255],  // 13: Light Magenta
  [255, 255, 85],  // 14: Yellow (Warning)
  [255, 255, 255], // 15: Bright White
];

// Populate standard 16-255 Mode 13h DAC ramp colors (gradients of gray, blue, red, green, amber)
for (let i = 16; i < 256; i++) {
  if (i < 32) {
    // 16-31: Grayscale ramp
    const v = Math.floor(((i - 16) / 15) * 255);
    VGA_PALETTE.push([v, v, v]);
  } else if (i < 64) {
    // 32-63: Blue/Cyan telemetry ramp
    const step = (i - 32) / 31;
    VGA_PALETTE.push([0, Math.floor(step * 180), Math.floor(step * 255)]);
  } else if (i < 96) {
    // 64-95: Threat Crimson ramp
    const step = (i - 64) / 31;
    VGA_PALETTE.push([Math.floor(step * 255), Math.floor(step * 40), Math.floor(step * 40)]);
  } else if (i < 128) {
    // 96-127: Phosphor Green cyber ramp
    const step = (i - 96) / 31;
    VGA_PALETTE.push([Math.floor(step * 40), Math.floor(step * 255), Math.floor(step * 80)]);
  } else if (i < 160) {
    // 128-159: Amber radar ramp
    const step = (i - 128) / 31;
    VGA_PALETTE.push([Math.floor(step * 255), Math.floor(step * 160), 0]);
  } else {
    // 160-255: Cyber dark spectrum
    const h = ((i - 160) / 95) * 360;
    const r = Math.floor(128 + 127 * Math.sin((h * Math.PI) / 180));
    const g = Math.floor(128 + 127 * Math.sin(((h + 120) * Math.PI) / 180));
    const b = Math.floor(128 + 127 * Math.sin(((h + 240) * Math.PI) / 180));
    VGA_PALETTE.push([r, g, b]);
  }
}

// 8x8 Minimalist PC BIOS font bitmap for ASCII 32..126
// Stored as 8 bytes per character (each byte represents 8 horizontal pixels)
export const VGA_FONT_8X8: Record<number, number[]> = {
  32: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // space
  33: [0x18, 0x18, 0x18, 0x18, 0x18, 0x00, 0x18, 0x00], // !
  34: [0x66, 0x66, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00], // "
  35: [0x6c, 0x6c, 0xfe, 0x6c, 0xfe, 0x6c, 0x6c, 0x00], // #
  45: [0x00, 0x00, 0x00, 0x7e, 0x00, 0x00, 0x00, 0x00], // -
  46: [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00], // .
  47: [0x06, 0x0c, 0x18, 0x30, 0x60, 0xc0, 0x80, 0x00], // /
  48: [0x3c, 0x66, 0x6e, 0x76, 0x66, 0x66, 0x3c, 0x00], // 0
  49: [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7e, 0x00], // 1
  50: [0x3c, 0x66, 0x06, 0x0c, 0x18, 0x30, 0x7e, 0x00], // 2
  51: [0x3c, 0x66, 0x06, 0x1c, 0x06, 0x66, 0x3c, 0x00], // 3
  52: [0x0c, 0x1c, 0x34, 0x64, 0xfe, 0x04, 0x04, 0x00], // 4
  53: [0x7e, 0x60, 0x7c, 0x06, 0x06, 0x66, 0x3c, 0x00], // 5
  54: [0x3c, 0x66, 0x60, 0x7c, 0x66, 0x66, 0x3c, 0x00], // 6
  55: [0x7e, 0x06, 0x0c, 0x18, 0x30, 0x30, 0x30, 0x00], // 7
  56: [0x3c, 0x66, 0x66, 0x3c, 0x66, 0x66, 0x3c, 0x00], // 8
  57: [0x3c, 0x66, 0x66, 0x3e, 0x06, 0x66, 0x3c, 0x00], // 9
  58: [0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00, 0x00], // :
  65: [0x18, 0x3c, 0x66, 0x7e, 0x66, 0x66, 0x66, 0x00], // A
  66: [0x7c, 0x66, 0x66, 0x7c, 0x66, 0x66, 0x7c, 0x00], // B
  67: [0x3c, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3c, 0x00], // C
  68: [0x78, 0x6c, 0x66, 0x66, 0x66, 0x6c, 0x78, 0x00], // D
  69: [0x7e, 0x60, 0x60, 0x7c, 0x60, 0x60, 0x7e, 0x00], // E
  70: [0x7e, 0x60, 0x60, 0x7c, 0x60, 0x60, 0x60, 0x00], // F
  71: [0x3c, 0x66, 0x60, 0x6e, 0x66, 0x66, 0x3e, 0x00], // G
  72: [0x66, 0x66, 0x66, 0x7e, 0x66, 0x66, 0x66, 0x00], // H
  73: [0x3c, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3c, 0x00], // I
  74: [0x0e, 0x06, 0x06, 0x06, 0x66, 0x66, 0x3c, 0x00], // J
  75: [0x66, 0x6c, 0x78, 0x70, 0x78, 0x6c, 0x66, 0x00], // K
  76: [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7e, 0x00], // L
  77: [0x63, 0x77, 0x7f, 0x6b, 0x63, 0x63, 0x63, 0x00], // M
  78: [0x66, 0x76, 0x7e, 0x7e, 0x6e, 0x66, 0x66, 0x00], // N
  79: [0x3c, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x00], // O
  80: [0x7c, 0x66, 0x66, 0x7c, 0x60, 0x60, 0x60, 0x00], // P
  81: [0x3c, 0x66, 0x66, 0x66, 0x6e, 0x3c, 0x06, 0x00], // Q
  82: [0x7c, 0x66, 0x66, 0x7c, 0x78, 0x6c, 0x66, 0x00], // R
  83: [0x3c, 0x66, 0x60, 0x3c, 0x06, 0x66, 0x3c, 0x00], // S
  84: [0x7e, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00], // T
  85: [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x00], // U
  86: [0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x18, 0x00], // V
  87: [0x63, 0x63, 0x63, 0x6b, 0x7f, 0x77, 0x63, 0x00], // W
  88: [0x66, 0x66, 0x3c, 0x18, 0x3c, 0x66, 0x66, 0x00], // X
  89: [0x66, 0x66, 0x66, 0x3c, 0x18, 0x18, 0x18, 0x00], // Y
  90: [0x7e, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x7e, 0x00], // Z
  91: [0x3c, 0x30, 0x30, 0x30, 0x30, 0x30, 0x3c, 0x00], // [
  93: [0x3c, 0x0c, 0x0c, 0x0c, 0x0c, 0x0c, 0x3c, 0x00], // ]
  95: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe, 0x00], // _
  124: [0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00], // |
};

// Fallback font generator for characters not explicitly mapped
for (let c = 32; c <= 126; c++) {
  if (!VGA_FONT_8X8[c]) {
    // Generate derived glyph or map lowercase to uppercase
    const upper = c >= 97 && c <= 122 ? c - 32 : 32;
    VGA_FONT_8X8[c] = VGA_FONT_8X8[upper] || [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  }
}

export class VgaMemoryEngine {
  public memory: Uint8Array;
  public dacPalette: [number, number, number][];
  public lastVgaWriteTimestamp: number = 0;
  public dirty: boolean = true;

  constructor() {
    this.memory = new Uint8Array(MEMORY_SIZE);
    this.dacPalette = [...VGA_PALETTE];
    this.initTextBuffer();
  }

  public resetMemory() {
    this.memory.fill(0);
    this.initTextBuffer();
    this.dirty = true;
  }

  public peek(address: number): number {
    if (address < 0 || address >= MEMORY_SIZE) return 0;
    return this.memory[address];
  }

  public poke(address: number, value: number) {
    if (address < 0 || address >= MEMORY_SIZE) return;
    this.memory[address] = value & 0xff;
    if (address >= VGA_GRAPHICS_BASE && address < VGA_GRAPHICS_BASE + 64000) {
      this.dirty = true;
      this.lastVgaWriteTimestamp = performance.now();
    }
  }

  public poke16(address: number, value: number) {
    this.poke(address, value & 0xff);
    this.poke(address + 1, (value >> 8) & 0xff);
  }

  public poke32(address: number, value: number) {
    this.poke(address, value & 0xff);
    this.poke(address + 1, (value >> 8) & 0xff);
    this.poke(address + 2, (value >> 16) & 0xff);
    this.poke(address + 3, (value >> 24) & 0xff);
  }

  public peek16(address: number): number {
    return this.peek(address) | (this.peek(address + 1) << 8);
  }

  public peek32(address: number): number {
    return (
      this.peek(address) |
      (this.peek(address + 1) << 8) |
      (this.peek(address + 2) << 16) |
      (this.peek(address + 3) << 24)
    );
  }

  // --- Direct VGA Mode 13h Hardware Memory Routines ---

  public vgaCls(colorIndex: number = 0) {
    const end = VGA_GRAPHICS_BASE + VGA_WIDTH * VGA_HEIGHT;
    this.memory.fill(colorIndex & 0xff, VGA_GRAPHICS_BASE, end);
    this.dirty = true;
  }

  public vgaPutPixel(x: number, y: number, colorIndex: number) {
    if (x < 0 || x >= VGA_WIDTH || y < 0 || y >= VGA_HEIGHT) return;
    const offset = VGA_GRAPHICS_BASE + y * VGA_WIDTH + x;
    this.memory[offset] = colorIndex & 0xff;
    this.dirty = true;
  }

  public vgaDrawHLine(x1: number, x2: number, y: number, colorIndex: number) {
    if (y < 0 || y >= VGA_HEIGHT) return;
    const startX = Math.max(0, Math.min(x1, x2));
    const endX = Math.min(VGA_WIDTH - 1, Math.max(x1, x2));
    const base = VGA_GRAPHICS_BASE + y * VGA_WIDTH;
    for (let x = startX; x <= endX; x++) {
      this.memory[base + x] = colorIndex;
    }
    this.dirty = true;
  }

  public vgaDrawVLine(x: number, y1: number, y2: number, colorIndex: number) {
    if (x < 0 || x >= VGA_WIDTH) return;
    const startY = Math.max(0, Math.min(y1, y2));
    const endY = Math.min(VGA_HEIGHT - 1, Math.max(y1, y2));
    for (let y = startY; y <= endY; y++) {
      this.memory[VGA_GRAPHICS_BASE + y * VGA_WIDTH + x] = colorIndex;
    }
    this.dirty = true;
  }

  public vgaDrawRect(x: number, y: number, w: number, h: number, colorIndex: number) {
    this.vgaDrawHLine(x, x + w - 1, y, colorIndex);
    this.vgaDrawHLine(x, x + w - 1, y + h - 1, colorIndex);
    this.vgaDrawVLine(x, y, y + h - 1, colorIndex);
    this.vgaDrawVLine(x + w - 1, y, y + h - 1, colorIndex);
  }

  public vgaFillRect(x: number, y: number, w: number, h: number, colorIndex: number) {
    const x1 = Math.max(0, x);
    const x2 = Math.min(VGA_WIDTH - 1, x + w - 1);
    const y1 = Math.max(0, y);
    const y2 = Math.min(VGA_HEIGHT - 1, y + h - 1);
    for (let cy = y1; cy <= y2; cy++) {
      const base = VGA_GRAPHICS_BASE + cy * VGA_WIDTH;
      for (let cx = x1; cx <= x2; cx++) {
        this.memory[base + cx] = colorIndex;
      }
    }
    this.dirty = true;
  }

  public vgaDrawChar(x: number, y: number, charCode: number, colorIndex: number) {
    const glyph = VGA_FONT_8X8[charCode] || VGA_FONT_8X8[32];
    for (let row = 0; row < 8; row++) {
      const cy = y + row;
      if (cy < 0 || cy >= VGA_HEIGHT) continue;
      const bits = glyph[row];
      for (let col = 0; col < 8; col++) {
        const cx = x + col;
        if (cx < 0 || cx >= VGA_WIDTH) continue;
        if (bits & (0x80 >> col)) {
          this.memory[VGA_GRAPHICS_BASE + cy * VGA_WIDTH + cx] = colorIndex;
        }
      }
    }
    this.dirty = true;
  }

  public vgaDrawString(x: number, y: number, text: string, colorIndex: number) {
    let curX = x;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      this.vgaDrawChar(curX, y, charCode, colorIndex);
      curX += 8;
      if (curX >= VGA_WIDTH) break;
    }
  }

  // --- Text Mode 03h (80x25 character & attribute cells) ---

  public initTextBuffer() {
    const totalBytes = TEXT_COLS * TEXT_ROWS * 2;
    for (let i = 0; i < totalBytes; i += 2) {
      this.memory[VGA_TEXT_BASE + i] = 0x20;     // Space character
      this.memory[VGA_TEXT_BASE + i + 1] = 0x07; // Light gray on black
    }
  }

  public textPrint(col: number, row: number, str: string, attr: number = 0x0a) {
    if (row < 0 || row >= TEXT_ROWS) return;
    for (let i = 0; i < str.length; i++) {
      const targetCol = col + i;
      if (targetCol >= TEXT_COLS) break;
      const offset = VGA_TEXT_BASE + (row * TEXT_COLS + targetCol) * 2;
      this.memory[offset] = str.charCodeAt(i);
      this.memory[offset + 1] = attr;
    }
    this.dirty = true;
  }

  /**
   * Blit VGA memory to an HTML5 canvas ImageData (RGBA)
   */
  public renderToImageData(imageData: ImageData, phosphorGreenOnly: boolean = false) {
    const data = imageData.data;
    let pixelOffset = 0;
    const vgaBase = VGA_GRAPHICS_BASE;

    for (let i = 0; i < VGA_WIDTH * VGA_HEIGHT; i++) {
      const colorIdx = this.memory[vgaBase + i];
      const [r, g, b] = this.dacPalette[colorIdx] || [0, 0, 0];

      if (phosphorGreenOnly) {
        // Authentic P1 monochrome green CRT phosphor
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        data[pixelOffset] = Math.floor(lum * 30);
        data[pixelOffset + 1] = Math.floor(lum * 255);
        data[pixelOffset + 2] = Math.floor(lum * 50);
        data[pixelOffset + 3] = 255;
      } else {
        data[pixelOffset] = r;
        data[pixelOffset + 1] = g;
        data[pixelOffset + 2] = b;
        data[pixelOffset + 3] = 255;
      }
      pixelOffset += 4;
    }
  }
}

// Global Singleton for the VGA Memory & Hardware Controller
export const vgaHardware = new VgaMemoryEngine();
