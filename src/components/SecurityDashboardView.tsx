/**
 * Security Operations Center (SOC) Main Dashboard
 * Real-time packet telemetry, interactive subnet topology, threat alert stream, and attack simulation tools.
 */

import React, { useState } from 'react';
import { Packet, ThreatAlert, NetworkNode } from '../types';
import { VgaCanvasDisplay } from './VgaCanvasDisplay';
import {
  ShieldAlert,
  Activity,
  Zap,
  Radio,
  Server,
  Network,
  ArrowUpRight,
  AlertTriangle,
  Play,
  Crosshair,
  Lock,
  Search,
} from 'lucide-react';

interface SecurityDashboardViewProps {
  packets: Packet[];
  threats: ThreatAlert[];
  pps: number;
  rxGbps: number;
  droppedCount: number;
  onSelectPacket: (packet: Packet) => void;
  onQuarantineIp: (ip: string) => void;
  onSimulateAttack: (type: string) => void;
  selectedPacketId?: string;
}

export const SecurityDashboardView: React.FC<SecurityDashboardViewProps> = ({
  packets,
  threats,
  pps,
  rxGbps,
  droppedCount,
  onSelectPacket,
  onQuarantineIp,
  onSimulateAttack,
  selectedPacketId,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');

  // Network Topology Nodes
  const [nodes] = useState<NetworkNode[]>([
    { id: 'gw', name: 'Edge Gateway', ip: '10.0.1.1', type: 'GATEWAY', x: 10, y: 50, status: 'NOMINAL', activeConnections: 1240 },
    { id: 'dmz', name: 'DMZ Nginx Proxy', ip: '10.0.1.15', type: 'DMZ', x: 30, y: 50, status: threats.length > 0 ? 'UNDER_ATTACK' : 'NOMINAL', activeConnections: 860 },
    { id: 'web', name: 'Web Cluster (k8s)', ip: '10.0.1.50', type: 'WEB', x: 55, y: 30, status: 'NOMINAL', activeConnections: 430 },
    { id: 'auth', name: 'Auth / Keycloak', ip: '10.0.2.10', type: 'AUTH', x: 55, y: 70, status: 'NOMINAL', activeConnections: 180 },
    { id: 'db', name: 'PostgreSQL DB', ip: '10.0.2.80', type: 'DATABASE', x: 85, y: 50, status: threats.some(t => t.ruleName.includes('SQL')) ? 'UNDER_ATTACK' : 'NOMINAL', activeConnections: 95 },
  ]);

  const filteredPackets = packets.filter((pkt) => {
    if (protocolFilter !== 'ALL' && pkt.protocol !== protocolFilter) return false;
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      return (
        pkt.srcIp.includes(q) ||
        pkt.dstIp.includes(q) ||
        pkt.summary.toLowerCase().includes(q) ||
        pkt.protocol.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Top 4 Telemetry Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>PACKETS / SECOND</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-100">
              {pps.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-emerald-400">wire-speed</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">DMA Ring: 0x100000</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>NETWORK THROUGHPUT</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-100">
              {rxGbps.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-neutral-400">Gbps</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">Host: 10GbE SFP+</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>ACTIVE THREAT ALERTS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${threats.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {threats.length}
            </span>
            <span className="text-xs font-mono text-neutral-400">events logged</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">ASM Snort Engine v2.4</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>DROPPED / MITIGATED</span>
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-100">
              {droppedCount.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-neutral-400">frames</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">Direct Microkernel Drop</div>
        </div>
      </div>

      {/* Main Grid: Interactive Topology & Live Attack Simulation Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Subnet Topology Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-neutral-200">Internal Subnet Topology & Flow Graph</h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">10.0.0.0/16 Virtual Mesh</span>
          </div>

          {/* Interactive Node Graph Canvas */}
          <div className="relative h-56 bg-neutral-950 rounded border border-neutral-800/80 p-3 overflow-hidden flex items-center justify-between">
            {/* Background Grid Lines */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Connecting Links */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="14%" y1="50%" x2="32%" y2="50%" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="36%" y1="50%" x2="55%" y2="30%" stroke="#334155" strokeWidth="2" />
              <line x1="36%" y1="50%" x2="55%" y2="70%" stroke="#334155" strokeWidth="2" />
              <line x1="62%" y1="30%" x2="82%" y2="50%" stroke="#334155" strokeWidth="2" />
              <line x1="62%" y1="70%" x2="82%" y2="50%" stroke="#334155" strokeWidth="2" />

              {/* Animated threat link pulse if active */}
              {threats.length > 0 && (
                <line x1="32%" y1="50%" x2="82%" y2="50%" stroke="#ef4444" strokeWidth="2" opacity="0.6" strokeDasharray="6 3" />
              )}
            </svg>

            {/* Render Nodes */}
            {nodes.map((node) => {
              const isUnderAttack = node.status === 'UNDER_ATTACK';
              return (
                <div
                  key={node.id}
                  className={`relative z-10 flex flex-col items-center p-2 rounded-lg border transition-all ${
                    isUnderAttack
                      ? 'bg-red-950/80 border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                      : 'bg-neutral-900/90 border-neutral-700 hover:border-cyan-500'
                  }`}
                  style={{
                    alignSelf: node.y < 40 ? 'flex-start' : node.y > 60 ? 'flex-end' : 'center',
                  }}
                >
                  <Server className={`w-5 h-5 mb-1 ${isUnderAttack ? 'text-red-400' : 'text-cyan-400'}`} />
                  <span className="text-[11px] font-semibold text-neutral-100 whitespace-nowrap">{node.name}</span>
                  <span className="text-[10px] font-mono text-neutral-400">{node.ip}</span>
                  <span className={`text-[9px] font-mono mt-0.5 px-1 rounded ${isUnderAttack ? 'text-red-300 bg-red-900/60' : 'text-neutral-400'}`}>
                    {isUnderAttack ? 'ATTACK TARGET' : `${node.activeConnections} conns`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2.5 mt-2 text-[11px] font-mono text-neutral-400">
            <span>Link Latency: &lt; 0.12 ms</span>
            <span className="text-emerald-400">ASM Microkernel Packet Filtering Active</span>
          </div>
        </div>

        {/* Attack Simulator & Direct VGA Mini-View (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Attack Injector Panel */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-semibold text-neutral-200">Threat Simulation Workbench</h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">Inject Wire Scenario</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <button
                onClick={() => onSimulateAttack('XZ_BACKDOOR')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-red-950 hover:border-red-600 border border-neutral-700 text-neutral-200 rounded text-left transition-colors flex items-center justify-between"
              >
                <span>CVE-2024-3094 SSH</span>
                <Play className="w-3 h-3 text-red-400" />
              </button>

              <button
                onClick={() => onSimulateAttack('SQLI')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-red-950 hover:border-red-600 border border-neutral-700 text-neutral-200 rounded text-left transition-colors flex items-center justify-between"
              >
                <span>SQLi UNION Probe</span>
                <Play className="w-3 h-3 text-red-400" />
              </button>

              <button
                onClick={() => onSimulateAttack('COBALT_STRIKE')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-amber-950 hover:border-amber-600 border border-neutral-700 text-neutral-200 rounded text-left transition-colors flex items-center justify-between"
              >
                <span>Cobalt Strike C2</span>
                <Play className="w-3 h-3 text-amber-400" />
              </button>

              <button
                onClick={() => onSimulateAttack('DNS_TUNNEL')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-amber-950 hover:border-amber-600 border border-neutral-700 text-neutral-200 rounded text-left transition-colors flex items-center justify-between"
              >
                <span>DNS Exfiltration</span>
                <Play className="w-3 h-3 text-amber-400" />
              </button>

              <button
                onClick={() => onSimulateAttack('SYN_FLOOD')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-cyan-950 hover:border-cyan-600 border border-neutral-700 text-neutral-200 rounded text-left transition-colors flex items-center justify-between"
              >
                <span>TCP SYN Flood</span>
                <Play className="w-3 h-3 text-cyan-400" />
              </button>

              <button
                onClick={() => onSimulateAttack('PORT_SCAN')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-cyan-950 hover:border-cyan-600 border border-neutral-700 text-neutral-200 rounded text-left transition-colors flex items-center justify-between"
              >
                <span>Port Sweep Scan</span>
                <Play className="w-3 h-3 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Embedded Mini VGA CRT Screen */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-200">Hardware VGA Memory Stream</span>
              <span className="text-[10px] font-mono text-emerald-400">0xA0000 Bare-Metal Blit</span>
            </div>
            <VgaCanvasDisplay crtEffect={true} colorScheme="COLOR_DAC" />
          </div>
        </div>
      </div>

      {/* Live Threat Alert Feed (Snort / Suricata Events) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-semibold text-neutral-200">Real-Time Threat Detection Log</h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">{threats.length} Active Detections</span>
        </div>

        {threats.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500 font-mono">
            No threats currently detected on monitored interface. Network telemetry within nominal thresholds.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800 font-mono text-xs max-h-56 overflow-y-auto">
            {threats.map((threat) => (
              <div key={threat.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-800/30">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      threat.severity === 'CRITICAL'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {threat.severity}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100">{threat.ruleName}</span>
                      {threat.cve && <span className="text-cyan-400 text-[11px]">[{threat.cve}]</span>}
                    </div>
                    <p className="text-neutral-400 text-[11px] mt-0.5">{threat.description}</p>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      Src: <span className="text-red-300">{threat.srcIp}</span> ➔ Dst: <span className="text-neutral-300">{threat.dstIp}</span> ({threat.targetService})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuarantineIp(threat.srcIp)}
                    className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-[11px] rounded transition-colors"
                  >
                    Quarantine Host
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-Time Packet Stream & Flow Analyzer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-neutral-200">Live Wire Packet Capture Stream</h3>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1">
              <Search className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Filter IP, payload, or port..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-transparent text-xs font-mono text-neutral-200 focus:outline-none w-36 sm:w-48"
              />
            </div>

            {/* Protocol Tabs */}
            <div className="flex items-center bg-neutral-800 p-0.5 rounded font-mono text-[11px]">
              {['ALL', 'TCP', 'TLS1.3', 'HTTP', 'DNS', 'SSH'].map((proto) => (
                <button
                  key={proto}
                  onClick={() => setProtocolFilter(proto)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    protocolFilter === proto ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {proto}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Packet Stream Table */}
        <div className="overflow-x-auto font-mono text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/80 text-neutral-400 text-[10px] border-b border-neutral-800">
                <th className="py-2 px-3">TIME</th>
                <th className="py-2 px-3">PROTO</th>
                <th className="py-2 px-3">SOURCE</th>
                <th className="py-2 px-3">DESTINATION</th>
                <th className="py-2 px-3">FLAGS</th>
                <th className="py-2 px-3 text-right">LEN</th>
                <th className="py-2 px-3">SUMMARY / SIGNATURE</th>
                <th className="py-2 px-3 text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filteredPackets.slice(0, 15).map((pkt) => {
                const isSelected = pkt.id === selectedPacketId;
                const isThreat = Boolean(pkt.threatDetected);

                return (
                  <tr
                    key={pkt.id}
                    onClick={() => onSelectPacket(pkt)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-neutral-800 text-white'
                        : isThreat
                        ? 'bg-red-950/30 text-red-200 hover:bg-red-950/50'
                        : 'text-neutral-300 hover:bg-neutral-800/40'
                    }`}
                  >
                    <td className="py-2 px-3 text-neutral-400 tabular-nums">{pkt.timeStr}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pkt.protocol === 'TLS1.3'
                            ? 'bg-purple-950 text-purple-300'
                            : pkt.protocol === 'HTTP'
                            ? 'bg-cyan-950 text-cyan-300'
                            : pkt.protocol === 'DNS'
                            ? 'bg-emerald-950 text-emerald-300'
                            : pkt.protocol === 'SSH'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {pkt.srcIp}:{pkt.srcPort}
                    </td>
                    <td className="py-2 px-3">
                      {pkt.dstIp}:{pkt.dstPort}
                    </td>
                    <td className="py-2 px-3 text-neutral-400">[{pkt.flags.join(',')}]</td>
                    <td className="py-2 px-3 text-right text-neutral-400 tabular-nums">{pkt.length}B</td>
                    <td className="py-2 px-3 truncate max-w-xs">
                      {isThreat && <span className="text-red-400 font-bold mr-1">⚠️ [THREAT]</span>}
                      {pkt.summary}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPacket(pkt);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 p-0.5 rounded"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
