import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Matched to the actual leads_sdr table schema
export type LeadRow = {
  id: string;
  whatsapp_number: string;
  nome_cliente: string | null;
  empresa: string | null;
  setor: string | null;
  dor_identificada: string | null;
  score_qualificacao: number;
  status_funil: 'Novo' | 'Em Qualificação' | 'Interessado' | 'Agendado' | 'Desqualificado' | 'Cliente';
  resumo_historico: string | null;
  ultima_interacao: string;
};
