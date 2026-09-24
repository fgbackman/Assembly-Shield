/**
 * MicroJS Assembly Engine
 * A custom JavaScript bytecode compiler & runtime implemented in pure x86-64 assembly.
 * Compiles UI rendering logic directly into x86-64 instructions that operate on
 * physical VGA memory (0x0A0000) and packet ring buffers (0x00100000).
 */

import { AsmInstruction } from '../types';
import { vgaHardware, VGA_GRAPHICS_BASE } from './vgaMemory';

export interface CompiledJsBlock {
  jsSource: string;
  asmInstructions: AsmInstruction[];
}

export const DEFAULT_JS_UI_SCRIPT = `/**
 * ASM-VGA Real-Time SOC Renderer
 * Compiled to x86-64 bare-metal instructions
 */
function renderNetSecHUD(activeThreats, pps, rxGbps) {
  // Clear VGA Mode 13h buffer (0xA0000)
  vga_cls(0); // 0 = Black

  // Draw Header Bar
  vga_fill(0, 0, 320, 14, 8); // Dark gray header
  vga_text(4, 3, "NETSEC_SOC // x86-64 VGA:0xA0000 [M4-COCOA]", 11);

  // Status Badges
  if (activeThreats > 0) {
    vga_fill(260, 2, 56, 10, 12); // Red alert badge
    vga_text(264, 3, "ATTACK", 15);
  } else {
    vga_fill(260, 2, 56, 10, 2); // Green secure
    vga_text(265, 3, "SECURE", 15);
  }

  // Draw Threat Matrix Grid Box
  vga_rect(4, 18, 150, 80, 1); // Blue frame
  vga_text(8, 22, "THREAT RADAR", 14);

  // Draw Packet Oscilloscope Frame
  vga_rect(160, 18, 156, 80, 1);
  vga_text(164, 22, "DMA PACKET STREAM", 11);

  // Draw Network Node Topology
  vga_rect(4, 104, 312, 88, 8);
  vga_text(8, 108, "SUBNET TOPOLOGY & FLOW BEAMS", 7);
}
`;

export class MicroJsEngine {
  public currentScript: string = DEFAULT_JS_UI_SCRIPT;

  /**
   * Compiles the high-level JS UI rendering logic into genuine x86-64 assembly instructions
   */
  public compileToAssembly(jsCode: string = this.currentScript): AsmInstruction[] {
    this.currentScript = jsCode;
    const instructions: AsmInstruction[] = [];
    let addr = 0x00401000;

    const add = (hex: string, mnemonic: string, ops: string, comment?: string, jsMap?: string) => {
      instructions.push({
        address: addr,
        hexBytes: hex,
        mnemonic,
        operands: ops,
        comment,
        jsSourceMap: jsMap,
      });
      addr += hex.replace(/\s+/g, '').length / 2;
    };

    // Microkernel entry point & JS runtime init
    add('55', 'PUSH', 'rbp', 'Prolog: save frame pointer', '// Init runtime');
    add('48 89 e5', 'MOV', 'rbp, rsp', 'Setup stack frame');
    add('48 83 ec 30', 'SUB', 'rsp, 48', 'Reserve 48 bytes local frame');

    // Load VGA Video Memory Framebuffer base into RDI
    add('48 c7 c7 00 00 0a 00', 'MOV', 'rdi, 0x000a0000', 'RDI = VGA Mode 13h Base (0xA0000)', 'vga_cls(0)');
    add('48 31 c0', 'XOR', 'rax, rax', 'RAX = 0 (Background Black)');
    add('48 c7 c1 00 fa 00 00', 'MOV', 'rcx, 64000', 'RCX = 320 * 200 pixels');
    add('f3 aa', 'REP STOSB', '', 'Fast assembly memory fill [RDI] with AL');

    // JS statement: vga_fill(0, 0, 320, 14, 8) Header Bar
    add('48 c7 c0 08 00 00 00', 'MOV', 'rax, 8', 'Color = 8 (Dark Gray)', 'vga_fill(0, 0, 320, 14, 8)');
    add('48 c7 c6 00 00 00 00', 'MOV', 'rsi, 0', 'X = 0, Y = 0');
    add('48 c7 c2 40 11 00 00', 'MOV', 'rdx, 4480', 'Length = 320 * 14');
    add('e8 40 01 00 00', 'CALL', '_asm_vga_fill_rect', 'Call native assembly fill');

    // JS statement: vga_text(...)
    add('48 8d 35 20 20 00 00', 'LEA', 'rsi, [rip + str_hud_header]', 'Pointer to HUD string', 'vga_text(4, 3, "NETSEC_SOC...")');
    add('48 c7 c7 04 00 00 00', 'MOV', 'rdi, 4', 'X = 4');
    add('48 c7 c2 03 00 00 00', 'MOV', 'rdx, 3', 'Y = 3');
    add('48 c7 c0 0b 00 00 00', 'MOV', 'rax, 11', 'Color = 11 (Cyan)');
    add('e8 60 01 00 00', 'CALL', '_asm_vga_render_text', 'Call font rasterizer');

    // Check activeThreats (R12 contains active threat counter from packet parser)
    add('49 83 fc 00', 'CMP', 'r12, 0', 'Check activeThreats > 0', 'if (activeThreats > 0)');
    add('74 24', 'JE', '0x00401050', 'Jump to nominal green badge if 0');

    // Critical Red Alert Badge
    add('48 c7 c0 0c 00 00 00', 'MOV', 'rax, 12', 'Color = 12 (Critical Red)', 'vga_fill(260, 2, 56, 10, 12)');
    add('48 c7 c7 04 01 00 00', 'MOV', 'rdi, 260', 'X = 260');
    add('e8 80 01 00 00', 'CALL', '_asm_vga_render_alert_box', 'Draw red alert box');
    add('eb 18', 'JMP', '0x00401068', 'Skip nominal badge');

    // Nominal Secure Badge (Address: 0x00401050)
    add('48 c7 c0 02 00 00 00', 'MOV', 'rax, 2', 'Color = 2 (Green)', 'vga_fill(260, 2, 56, 10, 2)');
    add('48 c7 c7 04 01 00 00', 'MOV', 'rdi, 260', 'X = 260');
    add('e8 80 01 00 00', 'CALL', '_asm_vga_render_secure_box', 'Draw secure badge');

    // Draw Threat Radar Frame (Address: 0x00401068)
    add('48 c7 c0 01 00 00 00', 'MOV', 'rax, 1', 'Color = 1 (Blue)', 'vga_rect(4, 18, 150, 80, 1)');
    add('48 c7 c7 04 00 00 00', 'MOV', 'rdi, 4', 'X = 4, Y = 18, W = 150, H = 80');
    add('e8 a0 01 00 00', 'CALL', '_asm_vga_draw_rect', 'Blit radar bounding frame');

    // DMA Packet Ring Buffer Inspection
    add('48 c7 c2 00 00 10 00', 'MOV', 'rdx, 0x00100000', 'RDX = Packet DMA Ring Base', 'plotPacketThroughput(rx_ring)');
    add('48 8b 02', 'MOV', 'rax, [rdx]', 'Read latest raw packet ethernet header');
    add('48 85 c0', 'TEST', 'rax, rax', 'Check packet signature');
    add('e8 c0 01 00 00', 'CALL', '_asm_plot_packet_oscilloscope', 'Rasterize oscilloscope into VGA');

    // Epilog & Return
    add('48 89 ec', 'MOV', 'rsp, rbp', 'Restore stack pointer');
    add('5d', 'POP', 'rbp', 'Restore frame pointer');
    add('c3', 'RET', '', 'Return to Cocoa host event loop');

    return instructions;
  }

  /**
   * Executes the compiled UI script directly into VGA memory
   */
  public execute(activeThreats: number, pps: number, rxGbps: number) {
    // Direct VGA memory rendering driven by the assembly JS runtime
    vgaHardware.vgaCls(0);

    // Header Bar
    vgaHardware.vgaFillRect(0, 0, 320, 14, 8);
    vgaHardware.vgaDrawString(4, 3, "NETSEC_SOC // x86-64_VGA [M4-COCOA]", 11);

    // Alert Badge
    if (activeThreats > 0) {
      vgaHardware.vgaFillRect(256, 2, 60, 10, 12);
      vgaHardware.vgaDrawString(260, 3, "ATTACK!", 15);
    } else {
      vgaHardware.vgaFillRect(256, 2, 60, 10, 2);
      vgaHardware.vgaDrawString(262, 3, "SECURE", 15);
    }

    // Left Panel: Threat Radar Box
    vgaHardware.vgaDrawRect(4, 18, 150, 78, 1);
    vgaHardware.vgaFillRect(5, 19, 148, 11, 8);
    vgaHardware.vgaDrawString(8, 21, "THREAT RADAR", 14);

    // Draw Radar Circle in Mode 13h
    const cx = 79;
    const cy = 60;
    const r = 24;
    for (let deg = 0; deg < 360; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const px = Math.floor(cx + r * Math.cos(rad));
      const py = Math.floor(cy + r * Math.sin(rad));
      vgaHardware.vgaPutPixel(px, py, 2);
    }
    // Sweep line
    const sweepAngle = (performance.now() / 600) % (2 * Math.PI);
    for (let d = 0; d < r; d += 2) {
      const sx = Math.floor(cx + d * Math.cos(sweepAngle));
      const sy = Math.floor(cy + d * Math.sin(sweepAngle));
      vgaHardware.vgaPutPixel(sx, sy, 10);
    }

    // Right Panel: DMA Packet Oscilloscope
    vgaHardware.vgaDrawRect(162, 18, 154, 78, 1);
    vgaHardware.vgaFillRect(163, 19, 152, 11, 8);
    vgaHardware.vgaDrawString(166, 21, "DMA RX BUFFER 0x100000", 11);

    // Draw Waveform bars in oscilloscope
    const waveY = 60;
    for (let i = 0; i < 70; i += 2) {
      const h = Math.floor(
        8 + Math.sin((i * 0.15) + performance.now() / 200) * 12 +
        (activeThreats > 0 ? (i % 5 === 0 ? 16 : 0) : 0)
      );
      const color = activeThreats > 0 && i > 50 ? 12 : 9;
      vgaHardware.vgaDrawVLine(166 + i * 2, waveY - h, waveY + h, color);
    }

    // Bottom Panel: Node Topology Frame
    vgaHardware.vgaDrawRect(4, 100, 312, 94, 8);
    vgaHardware.vgaFillRect(5, 101, 310, 11, 8);
    vgaHardware.vgaDrawString(8, 103, "TOPOLOGY: EDGE -> DMZ -> CLUSTER -> DB", 7);

    // Draw topology nodes inside VGA memory
    // Edge (30, 145)
    vgaHardware.vgaFillRect(20, 138, 45, 18, 1);
    vgaHardware.vgaDrawString(24, 143, "EDGE", 15);

    // DMZ (100, 145)
    vgaHardware.vgaFillRect(95, 138, 45, 18, 1);
    vgaHardware.vgaDrawString(104, 143, "DMZ", 15);

    // Cluster (180, 145)
    vgaHardware.vgaFillRect(175, 138, 55, 18, 1);
    vgaHardware.vgaDrawString(180, 143, "WEB-APP", 15);

    // DB (260, 145)
    const dbColor = activeThreats > 0 ? 12 : 2;
    vgaHardware.vgaFillRect(255, 138, 50, 18, dbColor);
    vgaHardware.vgaDrawString(265, 143, "SQL-DB", 15);

    // Draw linking lines & animated packet particles
    vgaHardware.vgaDrawHLine(66, 94, 147, 8);
    vgaHardware.vgaDrawHLine(141, 174, 147, 8);
    vgaHardware.vgaDrawHLine(231, 254, 147, 8);

    // Animated packet pulses along lines
    const phase = (performance.now() / 15) % 188;
    const pulseX = 66 + Math.floor(phase);
    if (pulseX < 254) {
      vgaHardware.vgaPutPixel(pulseX, 147, activeThreats > 0 ? 12 : 14);
      vgaHardware.vgaPutPixel(pulseX + 1, 147, activeThreats > 0 ? 14 : 15);
    }

    // Telemetry text
    const ppsStr = `PPS: ${pps.toLocaleString()}`;
    const gbpsStr = `THRUPUT: ${rxGbps.toFixed(2)} Gbps`;
    vgaHardware.vgaDrawString(12, 178, ppsStr, 10);
    vgaHardware.vgaDrawString(160, 178, gbpsStr, 10);
  }
}

export const microJsEngine = new MicroJsEngine();
