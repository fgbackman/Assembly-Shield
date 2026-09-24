/**
 * Network Security & Assembly VGA Engine Types
 */

export type ProtocolType = 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'TLS1.3' | 'SSH' | 'HTTP';

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Packet {
  id: string;
  timestamp: number;
  timeStr: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: ProtocolType;
  length: number;
  flags: string[];
  payloadHex: string;
  payloadAscii: string;
  summary: string;
  threatDetected?: ThreatAlert;
}

export interface ThreatAlert {
  id: string;
  timestamp: number;
  timeStr: string;
  severity: ThreatSeverity;
  ruleName: string;
  cve?: string;
  mitreTactic: string;
  srcIp: string;
  dstIp: string;
  targetService: string;
  description: string;
  signature: string;
  actionTaken: 'MONITORING' | 'BLOCKED' | 'QUARANTINED' | 'DROPPED';
}

export interface NetworkNode {
  id: string;
  name: string;
  ip: string;
  type: 'GATEWAY' | 'DMZ' | 'WEB' | 'AUTH' | 'DATABASE' | 'CLIENT';
  x: number;
  y: number;
  status: 'NOMINAL' | 'ELEVATED' | 'UNDER_ATTACK' | 'QUARANTINED';
  activeConnections: number;
}

export interface CPURegisters {
  rax: bigint;
  rbx: bigint;
  rcx: bigint;
  rdx: bigint;
  rsi: bigint;
  rdi: bigint;
  rbp: bigint;
  rsp: bigint;
  r8: bigint;
  r9: bigint;
  r10: bigint;
  r11: bigint;
  r12: bigint;
  r13: bigint;
  r14: bigint;
  r15: bigint;
  rip: bigint;
  rflags: {
    cf: boolean; // Carry
    zf: boolean; // Zero
    sf: boolean; // Sign
    of: boolean; // Overflow
    if: boolean; // Interrupt
  };
  cr0: bigint;
  cr3: bigint;
}

export interface AsmInstruction {
  address: number;
  hexBytes: string;
  mnemonic: string;
  operands: string;
  comment?: string;
  jsSourceMap?: string;
}

export type VGADisplayMode = 'MODE_13H' | 'MODE_TEXT_03H' | 'VESA_640' | 'RETINA_COCOA';

export interface FirewallRule {
  id: string;
  priority: number;
  action: 'DROP' | 'REJECT' | 'ACCEPT' | 'LOG';
  srcIp: string;
  dstPort: string;
  protocol: string;
  reason: string;
  hits: number;
  asmOpcode: string;
}
