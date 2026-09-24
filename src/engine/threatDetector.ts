/**
 * Intrusion Detection & Threat Engine
 * Evaluates network packets against Snort/Suricata rules in simulated x86-64 logic.
 */

import { Packet, ThreatAlert, ThreatSeverity } from '../types';

export interface ThreatRule {
  id: string;
  name: string;
  cve?: string;
  mitreTactic: string;
  severity: ThreatSeverity;
  protocol: string;
  targetPort?: number;
  pattern: RegExp | string;
  description: string;
  suggestedAction: 'DROP' | 'QUARANTINED' | 'BLOCKED';
}

export const SIGNATURE_RULES: ThreatRule[] = [
  {
    id: 'RULE-101',
    name: 'CVE-2024-3094 XZ-Utils Pre-Auth SSH Backdoor Probe',
    cve: 'CVE-2024-3094',
    mitreTactic: 'T1190 - Exploit Public-Facing Application',
    severity: 'CRITICAL',
    protocol: 'SSH',
    targetPort: 22,
    pattern: /00\s*00\s*00\s*07\s*73\s*73\s*68|x86_64_patch_rsa/i,
    description: 'Suspicious opcode sequence attempting to trigger liblzma RSA decryption hook during SSH handshake.',
    suggestedAction: 'QUARANTINED',
  },
  {
    id: 'RULE-102',
    name: 'Cobalt Strike C2 Beaconing Malleable Profile',
    cve: 'C2-BEACON',
    mitreTactic: 'T1071 - Application Layer Protocol C2',
    severity: 'HIGH',
    protocol: 'HTTP',
    targetPort: 80,
    pattern: /Cookie:.*(__cfduid|USERID=eyJhbGciOi|beacon_sleep=)/i,
    description: 'High-entropy malleable C2 heartbeat packet detected attempting staging beacon callback.',
    suggestedAction: 'BLOCKED',
  },
  {
    id: 'RULE-103',
    name: 'SQL Injection: Blind / UNION Data Exfiltration',
    cve: 'CWE-89',
    mitreTactic: 'T1190 - Exploit Public-Facing Application',
    severity: 'CRITICAL',
    protocol: 'HTTP',
    targetPort: 443,
    pattern: /(UNION.*SELECT|OR\s+1=1|WAITFOR\s+DELAY|SLEEP\(\d+\))/i,
    description: 'SQL injection payload attempting illicit database schema extraction via web edge proxy.',
    suggestedAction: 'DROP',
  },
  {
    id: 'RULE-104',
    name: 'DNS Tunneling & Base64 Data Exfiltration',
    cve: 'DNS-EXFIL',
    mitreTactic: 'T1048 - Exfiltration Over Alternative Protocol',
    severity: 'HIGH',
    protocol: 'DNS',
    targetPort: 53,
    pattern: /([a-f0-9]{32,}\.exfil|\.tunneling|v=spf1\s*redirect=)/i,
    description: 'Abnormally high entropy TXT/A query subdomains detected transmitting encoded enterprise data.',
    suggestedAction: 'BLOCKED',
  },
  {
    id: 'RULE-105',
    name: 'TCP SYN Flood Volumetric DoS Pattern',
    cve: 'DOS-SYN-01',
    mitreTactic: 'T1498 - Network Denial of Service',
    severity: 'MEDIUM',
    protocol: 'TCP',
    pattern: /SYN_FLOOD_BURST/,
    description: 'Anomalous burst of unacknowledged TCP SYN packets targeting edge load balancer.',
    suggestedAction: 'DROP',
  },
  {
    id: 'RULE-106',
    name: 'Mirai / Recon Port Sweep Scan',
    cve: 'RECON-SWEEP',
    mitreTactic: 'T1046 - Network Service Discovery',
    severity: 'LOW',
    protocol: 'TCP',
    pattern: /PORT_SCAN/,
    description: 'Sequential rapid port sweep probes targeting ports 22, 23, 80, 443, 3389.',
    suggestedAction: 'BLOCKED',
  },
];

export function inspectPacketForThreats(packet: Packet): ThreatAlert | undefined {
  for (const rule of SIGNATURE_RULES) {
    let matched = false;

    if (rule.targetPort && packet.dstPort !== rule.targetPort) {
      // Continue check if generic payload match
    }

    if (rule.pattern instanceof RegExp) {
      if (rule.pattern.test(packet.payloadAscii) || rule.pattern.test(packet.payloadHex)) {
        matched = true;
      }
    } else {
      if (
        packet.payloadAscii.includes(rule.pattern) ||
        packet.payloadHex.includes(rule.pattern) ||
        packet.summary.includes(rule.pattern)
      ) {
        matched = true;
      }
    }

    if (matched) {
      return {
        id: `ALERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: packet.timestamp,
        timeStr: packet.timeStr,
        severity: rule.severity,
        ruleName: rule.name,
        cve: rule.cve,
        mitreTactic: rule.mitreTactic,
        srcIp: packet.srcIp,
        dstIp: packet.dstIp,
        targetService: `${packet.protocol}/${packet.dstPort}`,
        description: rule.description,
        signature: typeof rule.pattern === 'string' ? rule.pattern : rule.pattern.source,
        actionTaken: 'MONITORING',
      };
    }
  }
  return undefined;
}
