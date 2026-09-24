/**
 * Network Security Monitoring Dashboard
 * Bare-Metal x86-64 Assembly & Direct VGA Memory Access (0xA0000)
 * MicroJS In-Assembly Rendering Engine on Apple Silicon M4 Cocoa Architecture
 */

import React, { useState, useEffect, useRef } from 'react';
import { Packet, ThreatAlert, FirewallRule } from './types';
import { packetSimulator } from './engine/packetSimulator';
import { microJsEngine } from './engine/microJsEngine';
import { cpuInstance } from './engine/asmCpu';
import { vgaHardware } from './engine/vgaMemory';
import { CocoaWindowFrame } from './components/CocoaWindowFrame';
import { SecurityDashboardView } from './components/SecurityDashboardView';
import { VgaCanvasDisplay } from './components/VgaCanvasDisplay';
import { AsmJsEngineDebugger } from './components/AsmJsEngineDebugger';
import { DeepPacketInspector } from './components/DeepPacketInspector';
import { MitigationFirewallRules } from './components/MitigationFirewallRules';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'VGA_MONITOR' | 'ASM_JS_ENGINE' | 'PACKET_INSPECTOR' | 'MITIGATION'
  >('DASHBOARD');

  const [packets, setPackets] = useState<Packet[]>([]);
  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [quarantinedIps, setQuarantinedIps] = useState<string[]>(['198.51.100.42']);
  const [pps, setPps] = useState<number>(14250);
  const [rxGbps, setRxGbps] = useState<number>(8.42);
  const [droppedCount, setDroppedCount] = useState<number>(318);

  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([
    {
      id: 'FW-1',
      priority: 10,
      action: 'DROP',
      srcIp: '198.51.100.42',
      dstPort: '*',
      protocol: 'TCP',
      reason: 'Known malicious C2 staging IP address',
      hits: 4210,
      asmOpcode: 'mov rax, 0x1337 ; SYS_NET_DROP\nmov rdi, 0xc633642a\nsyscall',
    },
    {
      id: 'FW-2',
      priority: 20,
      action: 'DROP',
      srcIp: '185.220.101.5',
      dstPort: '22',
      protocol: 'SSH',
      reason: 'Automated brute-force & backdoor scanner',
      hits: 1890,
      asmOpcode: 'mov rax, 0x1337 ; SYS_NET_DROP\nmov rdi, 0xb9dc6505\nsyscall',
    },
  ]);

  // Initial packet batch seed
  useEffect(() => {
    const initial: Packet[] = [];
    const initThreats: ThreatAlert[] = [];

    // Pre-populate with typical traffic
    for (let i = 0; i < 20; i++) {
      const pkt = packetSimulator.generateRandomPacket();
      initial.unshift(pkt);
      if (pkt.threatDetected) {
        initThreats.unshift(pkt.threatDetected);
      }
    }

    setPackets(initial);
    setThreats(initThreats);
    if (initial.length > 0) {
      setSelectedPacket(initial[0]);
    }
  }, []);

  // Real-time packet generator & VGA rendering loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Generate 1-3 packets per tick
      const count = Math.floor(Math.random() * 2) + 1;
      const newBatch: Packet[] = [];
      const newThreats: ThreatAlert[] = [];

      for (let i = 0; i < count; i++) {
        const pkt = packetSimulator.generateRandomPacket();
        newBatch.push(pkt);
        if (pkt.threatDetected) {
          newThreats.push(pkt.threatDetected);
        }
      }

      setPackets((prev) => [...newBatch, ...prev].slice(0, 150));

      if (newThreats.length > 0) {
        setThreats((prev) => [...newThreats, ...prev].slice(0, 50));
        // Update CPU register R12 with active threat count for ASM logic
        cpuInstance.registers.r12 = BigInt(newThreats.length);
      }

      // Slightly fluctuate PPS and throughput for realistic network activity
      setPps((prev) => Math.max(8000, Math.min(25000, prev + Math.floor((Math.random() - 0.48) * 600))));
      setRxGbps((prev) => Math.max(4.2, Math.min(9.9, prev + (Math.random() - 0.49) * 0.15)));
    }, 280);

    return () => clearInterval(interval);
  }, []);

  // Update VGA Memory Framebuffer directly via MicroJS Engine
  useEffect(() => {
    let animId: number;
    const updateVga = () => {
      microJsEngine.execute(threats.length, pps, rxGbps);
      animId = requestAnimationFrame(updateVga);
    };
    animId = requestAnimationFrame(updateVga);

    return () => cancelAnimationFrame(animId);
  }, [threats.length, pps, rxGbps]);

  const handleSelectPacket = (packet: Packet) => {
    setSelectedPacket(packet);
    setActiveTab('PACKET_INSPECTOR');
  };

  const handleQuarantineIp = (ip: string) => {
    if (!quarantinedIps.includes(ip)) {
      setQuarantinedIps((prev) => [...prev, ip]);
      setDroppedCount((prev) => prev + 120);

      // Add to firewall rules table
      setFirewallRules((prev) => [
        {
          id: `FW-${Date.now()}`,
          priority: prev.length + 10,
          action: 'DROP',
          srcIp: ip,
          dstPort: '*',
          protocol: 'ALL',
          reason: `Zero-Trust Quarantine: Malicious threat signature match`,
          hits: 1,
          asmOpcode: `mov rax, 0x1337 ; SYS_NET_DROP\nmov rdi, ${ip}\nsyscall`,
        },
        ...prev,
      ]);
    }
  };

  const handleUnquarantineIp = (ip: string) => {
    setQuarantinedIps((prev) => prev.filter((item) => item !== ip));
  };

  const handleSimulateAttack = (type: string) => {
    const attackPacket = packetSimulator.generateRandomPacket(type);
    setPackets((prev) => [attackPacket, ...prev]);

    if (attackPacket.threatDetected) {
      setThreats((prev) => [attackPacket.threatDetected!, ...prev]);
      cpuInstance.registers.r12 += 1n;
    }

    setSelectedPacket(attackPacket);
  };

  const handleAddRule = (rule: Omit<FirewallRule, 'id' | 'hits'>) => {
    setFirewallRules((prev) => [
      {
        ...rule,
        id: `FW-${Date.now()}`,
        hits: 0,
      },
      ...prev,
    ]);
  };

  const handleDeleteRule = (id: string) => {
    setFirewallRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <CocoaWindowFrame
      activeTab={activeTab}
      onTabChange={setActiveTab}
      activeThreatCount={threats.length}
    >
      {activeTab === 'DASHBOARD' && (
        <SecurityDashboardView
          packets={packets}
          threats={threats}
          pps={pps}
          rxGbps={rxGbps}
          droppedCount={droppedCount}
          onSelectPacket={handleSelectPacket}
          onQuarantineIp={handleQuarantineIp}
          onSimulateAttack={handleSimulateAttack}
          selectedPacketId={selectedPacket?.id}
        />
      )}

      {activeTab === 'VGA_MONITOR' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Direct VGA Hardware Framebuffer (Mode 13h / 0x0A0000)
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Physical 64KB video memory rasterizer blitting 320×200 pixels at 8-bit DAC color depth with simulated CRT scanlines.
              </p>
            </div>
          </div>
          <VgaCanvasDisplay crtEffect={true} colorScheme="COLOR_DAC" />
        </div>
      )}

      {activeTab === 'ASM_JS_ENGINE' && <AsmJsEngineDebugger />}

      {activeTab === 'PACKET_INSPECTOR' && (
        <DeepPacketInspector
          packet={selectedPacket}
          onQuarantineIp={handleQuarantineIp}
        />
      )}

      {activeTab === 'MITIGATION' && (
        <MitigationFirewallRules
          quarantinedIps={quarantinedIps}
          onUnquarantineIp={handleUnquarantineIp}
          onAddRule={handleAddRule}
          rules={firewallRules}
          onDeleteRule={handleDeleteRule}
        />
      )}
    </CocoaWindowFrame>
  );
}
