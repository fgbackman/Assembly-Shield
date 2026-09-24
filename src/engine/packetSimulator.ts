/**
 * Real-Time Network Packet Generator & DMA Ring Buffer Simulator
 * Simulates wire-speed packet capture and writes raw frames to memory address 0x100000.
 */

import { Packet, ProtocolType } from '../types';
import { inspectPacketForThreats } from './threatDetector';
import { vgaHardware, PACKET_DMA_BASE } from './vgaMemory';

const INTERNAL_IPS = [
  '10.0.1.1',   // Gateway
  '10.0.1.15',  // DMZ Proxy / Nginx
  '10.0.1.50',  // Web Node 01
  '10.0.1.51',  // Web Node 02
  '10.0.2.10',  // Auth / Keycloak
  '10.0.2.80',  // Production DB (PostgreSQL)
  '10.0.3.104', // Admin Workstation
];

const EXTERNAL_IPS = [
  '198.51.100.42', // Tor Exit Node / Attacker
  '203.0.113.88',  // APT Group Command Server
  '45.33.32.156',  // Recon Scanner
  '142.250.190.46',// Cloud Provider
  '8.8.8.8',       // Upstream DNS
  '1.1.1.1',       // Cloudflare DNS
  '185.220.101.5', // Malicious Proxy
];

export class PacketSimulator {
  private packetCounter: number = 1000;
  private ringIndex: number = 0;

  public generateRandomPacket(forceThreatType?: string): Packet {
    this.packetCounter++;
    const now = Date.now();
    const date = new Date(now);
    const timeStr = date.toTimeString().split(' ')[0] + '.' + String(date.getMilliseconds()).padStart(3, '0');

    let isThreat = forceThreatType !== undefined || Math.random() < 0.14;
    let threatScenario = forceThreatType;

    if (isThreat && !threatScenario) {
      const scenarios = ['XZ_BACKDOOR', 'SQLI', 'COBALT_STRIKE', 'DNS_TUNNEL', 'SYN_FLOOD', 'PORT_SCAN'];
      threatScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    }

    let protocol: ProtocolType = 'TCP';
    let srcIp = EXTERNAL_IPS[Math.floor(Math.random() * EXTERNAL_IPS.length)];
    let dstIp = INTERNAL_IPS[Math.floor(Math.random() * INTERNAL_IPS.length)];
    let srcPort = 1024 + Math.floor(Math.random() * 60000);
    let dstPort = 443;
    let flags = ['ACK'];
    let payloadAscii = '';
    let summary = '';

    if (threatScenario === 'XZ_BACKDOOR') {
      protocol = 'SSH';
      srcPort = 44120;
      dstPort = 22;
      dstIp = '10.0.1.15';
      flags = ['PSH', 'ACK'];
      payloadAscii = 'SSH-2.0-OpenSSH_8.9p1\r\nx86_64_patch_rsa_decrypt_hook_00_00_00_07_ssh';
      summary = 'SSH-2.0 probe with liblzma backdoor signature hook';
    } else if (threatScenario === 'SQLI') {
      protocol = 'HTTP';
      srcPort = 51230;
      dstPort = 443;
      dstIp = '10.0.1.50';
      flags = ['PSH', 'ACK'];
      payloadAscii = "POST /api/v1/query HTTP/1.1\r\nHost: internal.corp\r\n\r\nid=102' UNION SELECT 1,username,password_hash FROM users--";
      summary = "POST /api/v1/query - SQL Injection UNION probe";
    } else if (threatScenario === 'COBALT_STRIKE') {
      protocol = 'HTTP';
      srcPort = 49200;
      dstPort = 80;
      dstIp = '10.0.1.15';
      flags = ['PSH', 'ACK'];
      payloadAscii = 'GET /pixel.gif HTTP/1.1\r\nCookie: USERID=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.beacon_sleep=60';
      summary = 'Malleable C2 HTTP GET beacon heartbeat';
    } else if (threatScenario === 'DNS_TUNNEL') {
      protocol = 'DNS';
      srcPort = 53321;
      dstPort = 53;
      dstIp = '10.0.1.1';
      flags = ['UDP'];
      payloadAscii = '789a2b5efc1901a08432.exfil.corp-internal.net IN TXT';
      summary = 'Standard query 0x4f12 TXT 789a2b...exfil';
    } else if (threatScenario === 'SYN_FLOOD') {
      protocol = 'TCP';
      srcPort = Math.floor(Math.random() * 60000);
      dstPort = 443;
      dstIp = '10.0.1.1';
      flags = ['SYN'];
      payloadAscii = 'SYN_FLOOD_BURST_RAW_HEADER_TCP_FLOOD_PAYLOAD';
      summary = `TCP SYN Flood ${srcPort} -> 443 [SYN] Seq=0 Win=1024 Len=0`;
    } else if (threatScenario === 'PORT_SCAN') {
      protocol = 'TCP';
      srcPort = 33810;
      const targetPorts = [21, 22, 23, 80, 443, 3389, 8080];
      dstPort = targetPorts[Math.floor(Math.random() * targetPorts.length)];
      dstIp = '10.0.1.15';
      flags = ['SYN'];
      payloadAscii = 'PORT_SCAN_RECON_PROBE';
      summary = `TCP Port Recon Scan -> ${dstPort} [SYN]`;
    } else {
      // Nominal legitimate traffic
      const normalTypes: ProtocolType[] = ['TLS1.3', 'TCP', 'DNS', 'HTTP', 'SSH', 'ICMP'];
      protocol = normalTypes[Math.floor(Math.random() * normalTypes.length)];

      if (protocol === 'TLS1.3') {
        srcPort = 50000 + Math.floor(Math.random() * 10000);
        dstPort = 443;
        flags = ['ACK', 'PSH'];
        payloadAscii = 'TLSv1.3 Handshake: Client Hello (SNI: api.internal.corp, TLS_AES_256_GCM_SHA384)';
        summary = `TLSv1.3 Application Data [Len=1420]`;
      } else if (protocol === 'DNS') {
        srcPort = 54000 + Math.floor(Math.random() * 5000);
        dstPort = 53;
        flags = ['UDP'];
        payloadAscii = 'api.internal.corp. IN A 10.0.1.50';
        summary = 'DNS Standard query response 0x8a1b A 10.0.1.50';
      } else if (protocol === 'SSH') {
        srcPort = 52140;
        dstPort = 22;
        dstIp = '10.0.3.104';
        flags = ['PSH', 'ACK'];
        payloadAscii = 'SSH-2.0-OpenSSH_9.0 Encrypted Packet [AES-256-CTR]';
        summary = 'SSH Client Payload Data exchange';
      } else if (protocol === 'ICMP') {
        srcPort = 0;
        dstPort = 0;
        flags = ['ECHO_REQ'];
        payloadAscii = 'abcdefghijklmnopqrstuvwabcdefghi';
        summary = `Echo (ping) request id=0x0001 seq=${this.packetCounter % 256}`;
      } else {
        srcPort = 49152 + Math.floor(Math.random() * 10000);
        dstPort = 443;
        flags = ['ACK'];
        payloadAscii = 'GET /healthz HTTP/1.1\r\nHost: 10.0.1.50\r\nAccept: */*';
        summary = 'HTTP/1.1 200 OK [Content-Type: application/json]';
      }
    }

    // Convert payload to hex
    let payloadHex = '';
    for (let i = 0; i < payloadAscii.length; i++) {
      payloadHex += payloadAscii.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
    }
    payloadHex = payloadHex.trim();

    const packetLength = Math.max(64, payloadAscii.length + 54);

    const packet: Packet = {
      id: `PKT-${this.packetCounter}`,
      timestamp: now,
      timeStr,
      srcIp,
      srcPort,
      dstIp,
      dstPort,
      protocol,
      length: packetLength,
      flags,
      payloadHex,
      payloadAscii,
      summary,
    };

    // Inspect packet through threat engine
    const detectedThreat = inspectPacketForThreats(packet);
    if (detectedThreat) {
      packet.threatDetected = detectedThreat;
    }

    // Write packet descriptor into DMA ring buffer (0x100000)
    this.writePacketToDmaMemory(packet);

    return packet;
  }

  private writePacketToDmaMemory(packet: Packet) {
    const slotOffset = PACKET_DMA_BASE + (this.ringIndex % 16) * 64;
    this.ringIndex++;

    // DMA Slot format:
    // +0: 32-bit ID
    // +4: 16-bit Length
    // +6: 8-bit Protocol
    // +7: 8-bit ThreatFlag
    // +8: 4 bytes SrcIP
    // +12: 4 bytes DstIP
    // +16: 2 bytes SrcPort
    // +18: 2 bytes DstPort
    vgaHardware.poke32(slotOffset, Number(BigInt(packet.timestamp) & 0xffffffffn));
    vgaHardware.poke16(slotOffset + 4, packet.length);
    vgaHardware.poke(slotOffset + 6, packet.protocol === 'TCP' ? 6 : packet.protocol === 'UDP' ? 17 : 1);
    vgaHardware.poke(slotOffset + 7, packet.threatDetected ? 0xff : 0x00);
  }
}

export const packetSimulator = new PacketSimulator();
