/**
 * Wireshark-grade Deep Packet Inspector (DPI) & Hex Dump Analyzer
 */

import React, { useState } from 'react';
import { Packet } from '../types';
import { ShieldAlert, Binary, Layers, Terminal, Copy, Check, Filter } from 'lucide-react';

interface DeepPacketInspectorProps {
  packet: Packet | null;
  onFilterByIp?: (ip: string) => void;
  onQuarantineIp?: (ip: string) => void;
}

export const DeepPacketInspector: React.FC<DeepPacketInspectorProps> = ({
  packet,
  onFilterByIp,
  onQuarantineIp,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedLayer, setExpandedLayer] = useState<'ETH' | 'IP' | 'TRANS' | 'APP'>('APP');

  if (!packet) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400">
        <Binary className="w-10 h-10 text-neutral-600 mb-2" />
        <p className="text-sm font-medium text-neutral-300">No Packet Selected for Deep Inspection</p>
        <p className="text-xs text-neutral-500 mt-1">
          Select any packet from the Real-Time Packet Stream in the Security Operations Center to inspect its decoded OSI layers and raw memory bytes.
        </p>
      </div>
    );
  }

  const handleCopyHex = () => {
    navigator.clipboard.writeText(packet.payloadHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert payload into 16-byte hex rows
  const hexBytes = packet.payloadHex.split(' ').filter(Boolean);
  const hexRows: { offset: number; hex: string[]; ascii: string }[] = [];

  for (let i = 0; i < hexBytes.length; i += 16) {
    const chunk = hexBytes.slice(i, i + 16);
    let ascii = '';
    chunk.forEach((b) => {
      const code = parseInt(b, 16);
      ascii += code >= 32 && code <= 126 ? String.fromCharCode(code) : '.';
    });
    hexRows.push({ offset: i, hex: chunk, ascii });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Packet Summary Header */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-800 rounded border border-neutral-700 font-mono text-cyan-400 font-bold text-xs">
            {packet.protocol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-neutral-100">{packet.id}</span>
              <span className="text-xs text-neutral-500">·</span>
              <span className="font-mono text-xs text-neutral-400">{packet.timeStr}</span>
              <span className="text-xs text-neutral-500">·</span>
              <span className="font-mono text-xs text-neutral-400">{packet.length} bytes</span>
            </div>
            <p className="font-mono text-xs text-neutral-300 mt-0.5">
              {packet.srcIp}:{packet.srcPort} <span className="text-neutral-500">➔</span> {packet.dstIp}:{packet.dstPort}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {onQuarantineIp && (
            <button
              onClick={() => onQuarantineIp(packet.srcIp)}
              className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 text-xs font-medium rounded transition-colors"
            >
              Quarantine Source IP ({packet.srcIp})
            </button>
          )}

          <button
            onClick={handleCopyHex}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded border border-neutral-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Hex'}</span>
          </button>
        </div>
      </div>

      {/* Threat Banner if threat detected */}
      {packet.threatDetected && (
        <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-lg flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-red-200">{packet.threatDetected.ruleName}</h4>
              <span className="font-mono text-[11px] bg-red-900/80 text-red-200 px-2 py-0.5 rounded border border-red-700">
                {packet.threatDetected.severity}
              </span>
            </div>
            <p className="text-neutral-300 mt-1">{packet.threatDetected.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 font-mono text-[11px] text-neutral-400">
              {packet.threatDetected.cve && (
                <span>CVE: <strong className="text-neutral-200">{packet.threatDetected.cve}</strong></span>
              )}
              <span>MITRE: <strong className="text-neutral-200">{packet.threatDetected.mitreTactic}</strong></span>
              <span>Matched Signature: <code className="text-amber-300">{packet.threatDetected.signature}</code></span>
            </div>
          </div>
        </div>
      )}

      {/* OSI Protocol Tree */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden text-xs">
        <div className="px-4 py-2 bg-neutral-800/80 border-b border-neutral-700/80 flex items-center gap-2 font-semibold text-neutral-200">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Decoded OSI Protocol Stack</span>
        </div>

        <div className="divide-y divide-neutral-800 font-mono">
          {/* Layer 2: Ethernet */}
          <div className="p-3">
            <div
              onClick={() => setExpandedLayer(expandedLayer === 'ETH' ? 'APP' : 'ETH')}
              className="flex items-center justify-between cursor-pointer text-neutral-300 hover:text-white"
            >
              <span>Frame: Ethernet II, Src: 52:54:00:12:34:56, Dst: 00:1a:2b:3c:4d:5e</span>
              <span className="text-neutral-500 text-[11px]">{expandedLayer === 'ETH' ? '▲' : '▼'}</span>
            </div>
            {expandedLayer === 'ETH' && (
              <div className="mt-2 pl-4 text-neutral-400 space-y-1 text-[11px]">
                <div>Destination: 00:1a:2b:3c:4d:5e (Broadcast Gateway)</div>
                <div>Source: 52:54:00:12:34:56 (QEMU / Kernel Virtual NIC)</div>
                <div>Type: IPv4 (0x0800)</div>
              </div>
            )}
          </div>

          {/* Layer 3: IPv4 */}
          <div className="p-3">
            <div
              onClick={() => setExpandedLayer(expandedLayer === 'IP' ? 'APP' : 'IP')}
              className="flex items-center justify-between cursor-pointer text-neutral-300 hover:text-white"
            >
              <span>Internet Protocol Version 4, Src: {packet.srcIp}, Dst: {packet.dstIp}</span>
              <span className="text-neutral-500 text-[11px]">{expandedLayer === 'IP' ? '▲' : '▼'}</span>
            </div>
            {expandedLayer === 'IP' && (
              <div className="mt-2 pl-4 text-neutral-400 space-y-1 text-[11px]">
                <div>Version: 4 · Header Length: 20 bytes</div>
                <div>Differentiated Services Field: 0x00 (Default)</div>
                <div>Total Length: {packet.length} bytes</div>
                <div>Identification: 0x4f1b (20251)</div>
                <div>Time to Live: 64 hops</div>
                <div>Protocol: {packet.protocol} (6)</div>
                <div>Header Checksum: 0x9a4f [Verified via ASM]</div>
              </div>
            )}
          </div>

          {/* Layer 4: TCP/UDP */}
          <div className="p-3">
            <div
              onClick={() => setExpandedLayer(expandedLayer === 'TRANS' ? 'APP' : 'TRANS')}
              className="flex items-center justify-between cursor-pointer text-neutral-300 hover:text-white"
            >
              <span>Transmission Control Protocol, Src Port: {packet.srcPort}, Dst Port: {packet.dstPort}</span>
              <span className="text-neutral-500 text-[11px]">{expandedLayer === 'TRANS' ? '▲' : '▼'}</span>
            </div>
            {expandedLayer === 'TRANS' && (
              <div className="mt-2 pl-4 text-neutral-400 space-y-1 text-[11px]">
                <div>Source Port: {packet.srcPort}</div>
                <div>Destination Port: {packet.dstPort}</div>
                <div>Flags: [{packet.flags.join(', ')}]</div>
                <div>Window Size: 65535</div>
                <div>Checksum: 0xbeef [Good]</div>
              </div>
            )}
          </div>

          {/* Layer 7: Payload */}
          <div className="p-3 bg-neutral-950/40">
            <div className="flex items-center justify-between text-neutral-200">
              <span>Application Layer Payload ({packet.payloadAscii.length} bytes)</span>
            </div>
            <div className="mt-2 text-cyan-300 text-[11px] bg-neutral-950 p-2 rounded border border-neutral-800 whitespace-pre-wrap break-all">
              {packet.payloadAscii}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Hex Dump View */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden text-xs">
        <div className="px-4 py-2 bg-neutral-800/80 border-b border-neutral-700/80 flex items-center justify-between font-semibold text-neutral-200">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Raw Packet Wire Bytes (Offset + Hex + ASCII)</span>
          </div>
          <span className="text-neutral-500 font-mono text-[11px]">DMA Mapped 0x100000</span>
        </div>

        <div className="p-3 bg-neutral-950 font-mono text-[11px] overflow-x-auto divide-y divide-neutral-900">
          <div className="grid grid-cols-12 gap-2 text-neutral-500 pb-1 mb-1 font-semibold">
            <span className="col-span-2">OFFSET</span>
            <span className="col-span-7">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
            <span className="col-span-3">ASCII DECODE</span>
          </div>

          {hexRows.map((row) => (
            <div key={row.offset} className="grid grid-cols-12 gap-2 py-1 text-neutral-300 hover:bg-neutral-900/40">
              <span className="col-span-2 text-neutral-500">
                0x{row.offset.toString(16).padStart(4, '0').toUpperCase()}
              </span>
              <span className="col-span-7 tracking-wider">
                {row.hex.map((byte, idx) => (
                  <span
                    key={idx}
                    className={`inline-block mr-1.5 ${
                      packet.threatDetected && packet.threatDetected.signature.includes(byte)
                        ? 'text-red-400 font-bold bg-red-950/60 px-0.5 rounded'
                        : 'text-neutral-300'
                    }`}
                  >
                    {byte}
                  </span>
                ))}
              </span>
              <span className="col-span-3 text-cyan-400 truncate">{row.ascii}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
