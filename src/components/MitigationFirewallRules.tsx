/**
 * Active Mitigation & Assembly-Compiled Firewall Rule Manager
 */

import React, { useState } from 'react';
import { FirewallRule } from '../types';
import { Shield, Plus, Trash2, Ban, RefreshCw, Terminal, Check } from 'lucide-react';

interface MitigationFirewallRulesProps {
  quarantinedIps: string[];
  onUnquarantineIp: (ip: string) => void;
  onAddRule: (rule: Omit<FirewallRule, 'id' | 'hits'>) => void;
  rules: FirewallRule[];
  onDeleteRule: (id: string) => void;
}

export const MitigationFirewallRules: React.FC<MitigationFirewallRulesProps> = ({
  quarantinedIps,
  onUnquarantineIp,
  onAddRule,
  rules,
  onDeleteRule,
}) => {
  const [newIp, setNewIp] = useState('');
  const [newPort, setNewPort] = useState('*');
  const [newProtocol, setNewProtocol] = useState('TCP');
  const [newAction, setNewAction] = useState<'DROP' | 'REJECT'>('DROP');
  const [newReason, setNewReason] = useState('Manual Operator Enforcement');
  const [copiedScript, setCopiedScript] = useState(false);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    // Generate x86-64 assembly opcode representation for the rule
    const asmOpcode = `mov rax, 0x1337 ; SYS_NET_DROP\nmov rdi, ${newIp.trim()}\nmov rsi, ${newPort === '*' ? 0 : newPort}\nsyscall`;

    onAddRule({
      priority: rules.length + 10,
      action: newAction,
      srcIp: newIp.trim(),
      dstPort: newPort.trim(),
      protocol: newProtocol,
      reason: newReason,
      asmOpcode,
    });

    setNewIp('');
  };

  const handleExportIptables = () => {
    let script = '#!/bin/bash\n# ASM-VGA Bare-Metal Network Firewall Rules\n';
    rules.forEach((r) => {
      script += `iptables -A INPUT -s ${r.srcIp} -p ${r.protocol.toLowerCase()} ${r.dstPort !== '*' ? '--dport ' + r.dstPort : ''} -j ${r.action}\n`;
    });
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Quarantined Host Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-semibold text-neutral-200">Active Host Quarantines (Zero-Trust Isolation)</h3>
          </div>
          <span className="text-xs font-mono text-red-400 font-medium">
            {quarantinedIps.length} Quarantined
          </span>
        </div>

        {quarantinedIps.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">No hosts currently quarantined. Threat isolation standing by.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {quarantinedIps.map((ip) => (
              <div
                key={ip}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-950/60 border border-red-800/80 rounded font-mono text-xs text-red-200"
              >
                <span>{ip}</span>
                <button
                  onClick={() => onUnquarantineIp(ip)}
                  className="text-neutral-400 hover:text-white ml-1 p-0.5 rounded hover:bg-red-900/60"
                  title="Release Quarantine"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Rule Form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-neutral-800">
          <Plus className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-neutral-200">Inject x86-64 Microkernel Firewall Rule</h3>
        </div>

        <form onSubmit={handleCreateRule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-neutral-400 mb-1 font-mono">Source IP / CIDR</label>
            <input
              type="text"
              placeholder="e.g. 198.51.100.42"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1 font-mono">Target Port</label>
            <input
              type="text"
              placeholder="* or 22, 443"
              value={newPort}
              onChange={(e) => setNewPort(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1 font-mono">Protocol</label>
            <select
              value={newProtocol}
              onChange={(e) => setNewProtocol(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP</option>
              <option value="ALL">ALL</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-400 mb-1 font-mono">Action</label>
            <select
              value={newAction}
              onChange={(e) => setNewAction(e.target.value as any)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="DROP">DROP (Silent Discard)</option>
              <option value="REJECT">REJECT (TCP RST)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition-colors"
            >
              Inject ASM Rule
            </button>
          </div>
        </form>
      </div>

      {/* Active Rules Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden text-xs">
        <div className="px-4 py-2.5 bg-neutral-800/80 border-b border-neutral-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Active Microkernel Firewall Rules Table</span>
          </div>

          <button
            onClick={handleExportIptables}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded font-mono text-[11px] transition-colors"
          >
            {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
            <span>{copiedScript ? 'Copied iptables' : 'Export iptables'}</span>
          </button>
        </div>

        <div className="overflow-x-auto font-mono">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/80 text-neutral-400 text-[11px] border-b border-neutral-800">
                <th className="py-2 px-3">PRIORITY</th>
                <th className="py-2 px-3">ACTION</th>
                <th className="py-2 px-3">SOURCE IP</th>
                <th className="py-2 px-3">PORT</th>
                <th className="py-2 px-3">PROTOCOL</th>
                <th className="py-2 px-3">MATCH REASON</th>
                <th className="py-2 px-3 text-right">PACKET HITS</th>
                <th className="py-2 px-3 text-right">REMOVE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-[11px]">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-neutral-800/40 text-neutral-300">
                  <td className="py-2 px-3 text-neutral-500">#{rule.priority}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        rule.action === 'DROP' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {rule.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-cyan-300">{rule.srcIp}</td>
                  <td className="py-2 px-3">{rule.dstPort}</td>
                  <td className="py-2 px-3">{rule.protocol}</td>
                  <td className="py-2 px-3 text-neutral-400 truncate max-w-xs">{rule.reason}</td>
                  <td className="py-2 px-3 text-right text-emerald-400 tabular-nums font-bold">
                    {rule.hits.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
