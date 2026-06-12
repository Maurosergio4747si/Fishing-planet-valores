export interface Local {
  id: number;
  nome: string;
  criado_em?: string;
}

export type Raridade = 'comum' | 'jovem' | 'troféu' | 'único';

export interface Peixe {
  id: number;
  local_id: number;
  nome: string;
  valor_kg: number;
  raridade: Raridade;
  xp_kg: number;
  criado_em?: string;
}
