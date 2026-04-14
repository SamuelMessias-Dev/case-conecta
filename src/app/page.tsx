"use client";

import React, { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import {
  Building2, Smartphone, QrCode, PlayCircle, Activity,
  CheckCircle2, Loader2, Network, Plus, X, PanelRightClose, PanelRightOpen,
  GripVertical, MessagesSquare, RefreshCw, AlertTriangle
} from "lucide-react";
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabase";
import type { LeadRow } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  name: string;   // maps to nome
  phone: string;  // maps to whatsapp
  sector: string; // maps to setor
  status: string; // maps to status_funil
  wpActive: boolean;
};

type LogType = 'info' | 'success' | 'warning' | 'error';
type Log = { id: number; text: string; type: LogType };

// ─── Constants ───────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: 'Novo', title: 'Novo' },
  { id: 'Em Qualificação', title: 'Em Qualificação' },
  { id: 'Interessado', title: 'Interessado' },
  { id: 'Agendado', title: 'Agendado' },
  { id: 'Desqualificado', title: 'Desqualificado' },
  { id: 'Cliente', title: 'Cliente' }
] as const;

type StatusFunil = typeof KANBAN_COLUMNS[number]['id'];

function mapRowToLead(row: LeadRow): Lead {
  return {
    id: String(row.id),
    name: row.nome_cliente ?? '',
    phone: row.whatsapp_number,
    sector: row.setor ?? row.empresa ?? '',
    status: row.status_funil,
    wpActive: row.status_funil !== 'Novo',
  };
}

// ─── UserIcon ────────────────────────────────────────────────────────────────

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ─── SortableLeadCard ────────────────────────────────────────────────────────

function SortableLeadCard({
  lead, onStartProspeccao, qrCodeGenerated
}: {
  lead: Lead;
  onStartProspeccao: (id: string) => void;
  qrCodeGenerated: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { status: lead.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-card mb-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 group
                 hover:border-zinc-700 transition-colors flex flex-col gap-2 relative shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-100 truncate w-[130px] sm:w-[150px]">{lead.name}</span>
            <span className="text-xs text-zinc-500 font-mono">{lead.phone}</span>
          </div>
        </div>
        <button
          {...attributes} {...listeners}
          className="text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
        {lead.sector ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
            <Building2 className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-400">{lead.sector}</span>
          </div>
        ) : <div />}

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500">{lead.wpActive ? 'WP Ativo' : 'Pendente'}</span>
          <div className={`w-2 h-2 rounded-full ${lead.wpActive
            ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
            : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`}
          />
        </div>
      </div>

      {lead.status === 'Novo' && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartProspeccao(lead.id); }}
          disabled={!qrCodeGenerated}
          className="mt-2 w-full linear-button py-2 rounded-lg flex items-center justify-center
                     gap-2 text-xs font-medium text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          Iniciar Prospecção
        </button>
      )}
    </div>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl
                     border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 text-sm font-medium
                     ${type === 'error'
        ? 'bg-red-950/90 border-red-800 text-red-200'
        : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'}`}>
      {type === 'error'
        ? <AlertTriangle className="w-4 h-4 shrink-0" />
        : <CheckCircle2 className="w-4 h-4 shrink-0" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [qrCodeStatus, setQrCodeStatus] = useState<'idle' | 'loading' | 'generated'>('idle');
  const [logs, setLogs] = useState<Log[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', sector: '' });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Supabase: Fetch Leads ─────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from('leads_sdr')
        .select('*');

      if (error) {
        console.error('[Supabase SELECT error]', error);
        throw error;
      }
      setLeads((data as LeadRow[]).map(mapRowToLead));
    } catch (err: any) {
      const msg = err?.message ?? err?.details ?? JSON.stringify(err);
      showToast(`Erro ao carregar leads: ${msg}`, 'error');
    } finally {
      setIsLoadingLeads(false);
    }
  }, [showToast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // ─── Supabase: Create Lead ─────────────────────────────────────────────────

  const handleCreateLead = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setIsSaving(true);

    const payload = {
      nome_cliente: formData.name,
      whatsapp_number: formData.phone,
      setor: formData.sector || null,
      status_funil: 'Novo',
    };
    console.log('[Supabase INSERT payload]', payload);

    try {
      const { data, error } = await supabase
        .from('leads_sdr')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase INSERT error]', error);
        throw error;
      }

      setLeads(prev => [...prev, mapRowToLead(data as LeadRow)]);
      setFormData({ name: '', phone: '', sector: '' });
      setModalOpen(false);
      showToast(`Lead "${formData.name}" cadastrado com sucesso!`, 'success');
    } catch (err: any) {
      const detail = err?.details ?? err?.hint ?? err?.code ?? '';
      const msg = err?.message ?? 'Falha ao inserir no Supabase.';
      showToast(`Erro: ${msg}${detail ? ` — ${detail}` : ''}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Supabase: Update Status ───────────────────────────────────────────────

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: StatusFunil) => {
    // Optimistic UI update first
    setLeads(prev =>
      prev.map(l => l.id === leadId
        ? { ...l, status: newStatus, wpActive: newStatus !== 'Novo' }
        : l
      )
    );

    try {
      const { error } = await supabase
        .from('leads_sdr')
        .update({ status_funil: newStatus })
        .eq('id', leadId);

      if (error) throw error;
    } catch (err: any) {
      // Rollback on failure by refetching
      showToast(`Erro ao atualizar status: ${err?.message ?? 'Falha na conexão.'}`, 'error');
      fetchLeads(); // revert
    }
  }, [showToast, fetchLeads]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
    setFormData(f => ({ ...f, phone: value }));
  };

  const handleGenerateInstance = () => {
    setQrCodeStatus('loading');
    setTimeout(() => setQrCodeStatus('generated'), 2000);
  };

  const addLog = useCallback((text: string, type: LogType = 'info') => {
    setLogs(prev => [...prev, { id: Date.now(), text, type }]);
  }, []);

  const handleStartProspeccao = useCallback(async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    setSidebarOpen(true);
    setLogs([]);
    addLog(`Iniciando workflow n8n para ${lead.name}...`, 'info');

    setTimeout(() => { addLog('Verificando número de WhatsApp...', 'info'); }, 1000);
    setTimeout(async () => {
      await updateLeadStatus(leadId, 'Em Qualificação');
      addLog('Status → Em Qualificação (via Webhook).', 'warning');
      addLog(`Enviando mensagem de saudação para ${lead.name}...`, 'info');
    }, 3000);
    setTimeout(() => { addLog('Mensagem enviada. Aguardando resposta do lead...', 'warning'); }, 5000);
    setTimeout(() => { addLog('Workflow concluído com sucesso.', 'success'); }, 7000);
  }, [leads, addLog, updateLeadStatus]);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const onDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const isOverAColumn = KANBAN_COLUMNS.some(c => c.id === overId);

    setLeads(prev => {
      const items = [...prev];
      const activeIndex = items.findIndex(l => l.id === activeId);
      if (activeIndex === -1) return prev;

      let newStatus = items[activeIndex].status;
      if (isOverAColumn) {
        newStatus = overId;
      } else {
        const overIndex = items.findIndex(l => l.id === overId);
        if (overIndex !== -1) newStatus = items[overIndex].status;
      }

      if (items[activeIndex].status !== newStatus) {
        items[activeIndex] = { ...items[activeIndex], status: newStatus, wpActive: newStatus !== 'Novo' };
        return [...items];
      }
      return prev;
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const movedLead = leads.find(l => l.id === activeId);
    if (!movedLead) return;

    // Persist status change to Supabase
    updateLeadStatus(activeId, movedLead.status as StatusFunil);

    // Reorder within same column
    if (activeId !== overId) {
      setLeads(prev => {
        const activeIndex = prev.findIndex(l => l.id === activeId);
        const overIndex = prev.findIndex(l => l.id === overId);
        if (overIndex !== -1 && prev[activeIndex]?.status === prev[overIndex]?.status) {
          return arrayMove(prev, activeIndex, overIndex);
        }
        return prev;
      });
    }
  };

  const activeLead = leads.find(l => l.id === activeId);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#000000] text-zinc-300 font-sans flex flex-col overflow-hidden relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent z-0" />

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* HEADER */}
      <header className="h-[72px] shrink-0 flex items-center justify-between px-6 border-b border-zinc-800/80
                         bg-[#000000]/80 backdrop-blur-md relative z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
            <Network className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              Conecta Obras <span className="text-zinc-500 font-normal">|</span>{' '}
              <span className="animated-gradient-text font-medium hidden sm:inline-block">SDR Inteligente</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-zinc-900/50 border border-zinc-800
                          rounded-full px-3 py-1.5 text-xs backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-500 font-medium tracking-wide">SISTEMA ONLINE</span>
          </div>

          <button
            type="button"
            onClick={fetchLeads}
            disabled={isLoadingLeads}
            title="Sincronizar leads"
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400
                       hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLeads ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="linear-button-primary px-4 py-2 rounded-lg flex items-center gap-2
                       text-sm font-medium shadow-lg hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Lead</span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(v => !v)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400
                       hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {isSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* KANBAN BOARD */}
        <main className={`flex-1 overflow-x-auto overflow-y-hidden p-6 transition-all duration-300
                          ${isSidebarOpen ? 'mr-[320px] lg:mr-[400px]' : ''}`}>

          {!isMounted || isLoadingLeads ? (
            <div className="flex items-center justify-center h-full gap-3 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">
                {!isMounted ? "Carregando ambiente..." : "Carregando leads do Supabase..."}
              </span>
            </div>
          ) : (
            <DndContext
              id="kanban-dnd-context"
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              <div className="flex gap-4 h-full min-w-max items-start">
                {KANBAN_COLUMNS.map(column => {
                  const columnLeads = leads.filter(l => l.status === column.id);
                  return (
                    <div
                      key={column.id}
                      id={column.id}
                      className="flex flex-col w-[280px] sm:w-[300px] h-full bg-zinc-900/20
                                 border border-zinc-800/60 rounded-2xl overflow-hidden shrink-0 shadow-sm"
                    >
                      <div className="p-4 border-b border-zinc-800/60 bg-zinc-950/40
                                      flex items-center justify-between sticky top-0 z-10">
                        <h3 className="text-sm font-medium text-zinc-200 tracking-wide">{column.title}</h3>
                        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                          {columnLeads.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3">
                        <SortableContext items={columnLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                          {columnLeads.map(lead => (
                            <SortableLeadCard
                              key={lead.id}
                              lead={lead}
                              onStartProspeccao={handleStartProspeccao}
                              qrCodeGenerated={qrCodeStatus === 'generated'}
                            />
                          ))}
                        </SortableContext>

                        {columnLeads.length === 0 && (
                          <div className="h-[100px] flex items-center justify-center border-2
                                          border-dashed border-zinc-800/80 rounded-xl mt-2 text-zinc-600 text-xs">
                            Nenhum lead
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <DragOverlay>
                {activeLead ? (
                  <div className="opacity-80 rotate-2 scale-105 pointer-events-none">
                    <SortableLeadCard
                      lead={activeLead}
                      onStartProspeccao={() => {}}
                      qrCodeGenerated={qrCodeStatus === 'generated'}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

        </main>

        {/* SIDEBAR */}
        <aside className={`absolute right-0 top-0 bottom-0 w-[320px] lg:w-[400px] bg-[#050505]
                           border-l border-zinc-800/80 transform transition-transform duration-300
                           ease-in-out z-30 flex flex-col p-4 shadow-2xl
                           ${isSidebarOpen ? 'translate-x-0' : 'translate-x-[105%]'}`}>

          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-widest">Painel de Controle</h2>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* WhatsApp Connection Card */}
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden flex flex-col shrink-0 mb-4">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-medium text-zinc-100">Instância WP</h2>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${qrCodeStatus === 'idle'
                ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                : qrCodeStatus === 'loading'
                  ? 'bg-blue-900/20 text-blue-400 border-blue-900/30'
                  : 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30'}`}>
                {qrCodeStatus === 'idle' && 'Off'}
                {qrCodeStatus === 'loading' && <><Loader2 className="w-3 h-3 animate-spin" /> Conectando</>}
                {qrCodeStatus === 'generated' && <><CheckCircle2 className="w-3 h-3" /> Conectado</>}
              </span>
            </div>

            <div className="flex items-center justify-center border border-zinc-800/60 rounded-xl bg-zinc-950/50 mb-4 h-[100px]">
              {qrCodeStatus === 'idle' && (
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="w-6 h-6 text-zinc-600" />
                  <p className="text-[10px] text-zinc-500">Nenhuma instância</p>
                </div>
              )}
              {qrCodeStatus === 'loading' && <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />}
              {qrCodeStatus === 'generated' && (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-xs text-zinc-400">Pronto para prospecção</p>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateInstance}
              disabled={qrCodeStatus !== 'idle'}
              className="linear-button w-full py-2.5 rounded-lg flex items-center justify-center
                         gap-2 text-xs font-medium text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-400" />
              {qrCodeStatus === 'idle' ? 'Gerar QR Code' : 'Instância Ativa'}
            </button>
          </div>

          {/* Activity Log */}
          <div className="glass-card rounded-2xl relative overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-zinc-800/50 shrink-0 bg-zinc-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-100">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-medium">Log Webhook</h2>
                </div>
                <div className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md
                                flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> n8n
                </div>
              </div>
            </div>

            <div className="flex-1 bg-[#050505] p-3 overflow-y-auto font-mono text-xs min-h-0">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2 opacity-50">
                  <MessagesSquare className="w-5 h-5" />
                  <p className="text-[10px]">Aguardando rotinas...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-2 items-start animate-in fade-in duration-300">
                      <span className="text-zinc-600 text-[9px] shrink-0 mt-0.5">
                        {new Date(log.id).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <div className="flex items-start gap-1.5 flex-1">
                        <span className={`shrink-0 ${log.type === 'success' ? 'text-emerald-500'
                          : log.type === 'warning' ? 'text-amber-500'
                            : log.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>›</span>
                        <span className={`leading-relaxed ${log.type === 'success' ? 'text-emerald-400'
                          : log.type === 'warning' ? 'text-amber-200'
                            : log.type === 'error' ? 'text-red-400' : 'text-zinc-300'}`}>
                          {log.text}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL — Novo Lead */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="glass-card rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl
                          animate-in zoom-in-95 duration-200 border border-zinc-700">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
              <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                Novo Lead
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 flex flex-col gap-4 bg-zinc-950/80">
              <div className="flex flex-col gap-2">
                <label htmlFor="modal-name" className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider ml-1">
                  Nome Completo *
                </label>
                <input
                  id="modal-name"
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: João Silva Engenharia"
                  required
                  autoFocus
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-zinc-200
                             placeholder:text-zinc-600"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="modal-phone" className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider ml-1">
                  WhatsApp *
                </label>
                <input
                  id="modal-phone"
                  type="text"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  required
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-zinc-200
                             placeholder:text-zinc-600"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="modal-sector" className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider ml-1">
                  Setor Alvo
                </label>
                <div className="relative">
                  <select
                    id="modal-sector"
                    value={formData.sector}
                    onChange={e => setFormData(f => ({ ...f, sector: e.target.value }))}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-zinc-200
                               appearance-none [&>option]:bg-zinc-900"
                  >
                    <option value="">Selecione...</option>
                    <option value="Engenharia">Engenharia Civil</option>
                    <option value="Arquitetura">Arquitetura</option>
                    <option value="Empreiteira">Empreiteira</option>
                    <option value="Fornecedor">Fornecedor de Materiais</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                      <path d="M1 1L5 5L9 1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-zinc-800/50 mt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="linear-button-primary px-6 py-2 rounded-lg text-sm font-medium shadow-lg
                             disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Cadastrando...' : 'Cadastrar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
