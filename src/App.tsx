import { useEffect, useState, FormEvent, Fragment } from 'react';
import { supabase } from './lib/supabase';
import { Local, Peixe } from './types';
import { MapPin, Fish, DollarSign, Plus, Anchor, Trash2, Loader2, Info, Calculator, ArrowRight, Sparkles, TrendingUp, Search, Scale, Award, Zap, RotateCcw } from 'lucide-react';

export default function App() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [peixes, setPeixes] = useState<Peixe[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [novoLocalForm, setNovoLocalForm] = useState('');
  const [novoPeixeForm, setNovoPeixeForm] = useState({
    local_id: '',
    nome: '',
    valor_kg: '',
    raridade: 'comum' as import('./types').Raridade,
    xp_kg: ''
  });
  
  const [editingLocal, setEditingLocal] = useState<{id: number, nome: string} | null>(null);
  const [editingPeixeId, setEditingPeixeId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, message: string, onConfirm: () => void } | null>(null);
  
  const [calcLocalId, setCalcLocalId] = useState<string>(() => localStorage.getItem('fp_calc_local_id') || '');
  const [calcPeixeId, setCalcPeixeId] = useState<string>('');
  const [calcPeso, setCalcPeso] = useState<string>('');
  const [calcViagem, setCalcViagem] = useState<string>(() => localStorage.getItem('fp_calc_viagem') || '');
  const [calcDiaria, setCalcDiaria] = useState<string>(() => localStorage.getItem('fp_calc_diaria') || '');
  const [calcDias, setCalcDias] = useState<string>(() => localStorage.getItem('fp_calc_dias') || '1');
  const [calcBagCapacity, setCalcBagCapacity] = useState<string>(() => localStorage.getItem('fp_calc_bag_capacity') || '100');
  const [capturasLive, setCapturasLive] = useState<{id: string, peixeId: string, nome: string, peso: number, valor: number, xp: number}[]>(() => {
    try {
      const saved = localStorage.getItem('fp_capturas_live');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Persist calculator states in localStorage
  useEffect(() => {
    localStorage.setItem('fp_calc_local_id', calcLocalId);
  }, [calcLocalId]);

  useEffect(() => {
    localStorage.setItem('fp_calc_viagem', calcViagem);
  }, [calcViagem]);

  useEffect(() => {
    localStorage.setItem('fp_calc_diaria', calcDiaria);
  }, [calcDiaria]);

  useEffect(() => {
    localStorage.setItem('fp_calc_dias', calcDias);
  }, [calcDias]);

  useEffect(() => {
    localStorage.setItem('fp_calc_bag_capacity', calcBagCapacity);
  }, [calcBagCapacity]);

  useEffect(() => {
    localStorage.setItem('fp_capturas_live', JSON.stringify(capturasLive));
  }, [capturasLive]);
  
  const [viewMode, setViewMode] = useState<'locais' | 'top_valor' | 'top_xp' | 'calculadora' | 'analise_eficiencia' | 'farming_assist'>('locais');
  
  const [historicoPesos, setHistoricoPesos] = useState<Record<number, number[]>>(() => {
    try {
      const saved = localStorage.getItem('fp_historico_pesos');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [pesosEstimados, setPesosEstimados] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('fp_pesos_estimados');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [filtroLocalAnalise, setFiltroLocalAnalise] = useState<string>('');
  const [searchAnalise, setSearchAnalise] = useState<string>('');
  const [sortByAnalise, setSortByAnalise] = useState<'valor_tempo' | 'xp_tempo' | 'valor_kg' | 'xp_kg' | 'esforco' | 'nome'>('valor_tempo');
  const [sortOrderAnalise, setSortOrderAnalise] = useState<'asc' | 'desc'>('desc');
  const [submittingLocal, setSubmittingLocal] = useState(false);
  const [submittingPeixe, setSubmittingPeixe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [assistObjective, setAssistObjective] = useState<'money' | 'xp' | 'balanced'>('money');
  const [sacosPorDia, setSacosPorDia] = useState<number>(2);
  const [considerarCustos, setConsiderarCustos] = useState<boolean>(true);
  const [custosLocais, setCustosLocais] = useState<Record<number, { viagem: number; diaria: number }>>(() => {
    try {
      const saved = localStorage.getItem('fp_custos_locais');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    if (supabase) {
      fetchData();
      
      // Set up real-time subscriptions
      const publicLocais = supabase
        .channel('locais-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locais_pesca' }, () => {
          fetchLocais();
        })
        .subscribe();

      const publicPeixes = supabase
        .channel('peixes-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'peixes' }, () => {
          fetchPeixes();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(publicLocais);
        supabase.removeChannel(publicPeixes);
      };
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchLocais(), fetchPeixes()]);
    setLoading(false);
  };

  const fetchLocais = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('locais_pesca').select('*').order('nome');
      if (error) setErrorMessage(`Falha ao buscar locais: ${error.message} (Is RLS blocking?)`);
      else if (data) setLocais(data);
    } catch (err: any) {
      setErrorMessage(`Exceção buscar locais: ${err.message}`);
    }
  };

  const fetchPeixes = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('peixes').select('*').order('nome');
      if (error) setErrorMessage(`Falha ao buscar peixes: ${error.message}`);
      else if (data) setPeixes(data);
    } catch (err: any) {
      setErrorMessage(`Exceção buscar peixes: ${err.message}`);
    }
  };

  const handleCreateLocal = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !novoLocalForm.trim()) return;
    setErrorMessage('');
    
    setSubmittingLocal(true);
    try {
      if (editingLocal) {
        const { data, error } = await supabase.from('locais_pesca').update({ nome: novoLocalForm }).eq('id', editingLocal.id).select();
        if (error) {
          setErrorMessage('Erro ao atualizar local: ' + error.message);
        } else if (!data || data.length === 0) {
          setErrorMessage('Aviso: Nenhuma linha alterada. O RLS do Supabase pode estar bloqueando atualizações (Update).');
        } else {
          setNovoLocalForm('');
          setEditingLocal(null);
          fetchLocais();
        }
      } else {
        const { error } = await supabase.from('locais_pesca').insert([{ nome: novoLocalForm }]);
        if (!error) {
          setNovoLocalForm('');
          fetchLocais();
        } else {
          setErrorMessage('Erro ao cadastrar local: ' + error.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(`Exceção: ${err.message}`);
    }
    setSubmittingLocal(false);
  };

  const handleDeleteLocal = async (id: number) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('locais_pesca').delete().eq('id', id).select();
      if (error) setErrorMessage('Erro ao excluir local: ' + error.message);
      else if (!data || data.length === 0) setErrorMessage('Aviso: Nenhuma linha excluída. O RLS do Supabase pode estar bloqueando exclusões (Delete).');
      else fetchLocais();
    } catch (err: any) {
      setErrorMessage(`Exceção: ${err.message}`);
    }
  };

  const handleCreatePeixe = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !novoPeixeForm.local_id || !novoPeixeForm.nome.trim() || !novoPeixeForm.valor_kg) return;
    setErrorMessage('');
    
    setSubmittingPeixe(true);
    try {
      const payload = {
        local_id: parseInt(novoPeixeForm.local_id),
        nome: novoPeixeForm.nome,
        valor_kg: parseFloat(novoPeixeForm.valor_kg),
        raridade: novoPeixeForm.raridade,
        xp_kg: parseFloat(novoPeixeForm.xp_kg) || 0
      };

      if (editingPeixeId) {
        const { data, error } = await supabase.from('peixes').update(payload).eq('id', editingPeixeId).select();
        if (error) {
          setErrorMessage('Erro ao atualizar peixe: ' + error.message);
        } else if (!data || data.length === 0) {
          setErrorMessage('Aviso: Nenhum peixe alterado. O RLS do Supabase pode estar bloqueando atualizações.');
        } else {
          setNovoPeixeForm({ local_id: '', nome: '', valor_kg: '', raridade: 'comum', xp_kg: '' });
          setEditingPeixeId(null);
          fetchPeixes();
        }
      } else {
        const { error } = await supabase.from('peixes').insert([payload]);
        if (!error) {
          setNovoPeixeForm({ local_id: '', nome: '', valor_kg: '', raridade: 'comum', xp_kg: '' });
          fetchPeixes();
        } else {
          setErrorMessage('Erro ao cadastrar peixe: ' + error.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(`Exceção: ${err.message}`);
    }
    setSubmittingPeixe(false);
  };

  const handleDeletePeixe = async (id: number) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('peixes').delete().eq('id', id).select();
      if (error) setErrorMessage('Erro ao excluir peixe: ' + error.message);
      else if (!data || data.length === 0) setErrorMessage('Aviso: Nenhum peixe excluído. O RLS do Supabase pode estar bloqueando exclusões.');
      else fetchPeixes();
    } catch (err: any) {
      setErrorMessage(`Exceção: ${err.message}`);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-cyan-600 p-6 text-white text-center">
            <Anchor className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <h1 className="text-2xl font-semibold">Configuração Necessária</h1>
          </div>
          <div className="p-8 text-slate-600 space-y-4">
            <p className="text-center">
              Para o aplicativo funcionar, você precisa configurar suas credenciais do Supabase.
            </p>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 flex gap-3">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                Vá até as configurações de ambiente (Settings {'>'} Secrets) e adicione:
                <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-xs">
                  <li>VITE_SUPABASE_URL</li>
                  <li>VITE_SUPABASE_ANON_KEY</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-center text-slate-400 mt-6 pt-4 border-t border-slate-100">
              Caso você queira rodar o HTML puro, nós fornecemos as instruções detalhadas na resposta do agente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-teal-50 font-sans text-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-teal-700 text-white p-4 shadow-md flex items-center justify-between shrink-0 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-500 rounded-lg">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            PescaMaster <span className="font-light opacity-80 uppercase text-xs tracking-widest ml-2 hidden sm:inline">Gestão Pro</span>
          </h1>
        </div>
        <div className="text-xs bg-teal-800 px-3 py-1 rounded-full border border-teal-600 flex items-center gap-2">
          Supabase Connected
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-y-auto md:overflow-hidden flex-col md:flex-row relative">
        
        {confirmModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-teal-100 flex flex-col gap-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-teal-600 shrink-0" />
                <p className="text-slate-800 flex-1">{confirmModal.message}</p>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
                >
                  Sim, prosseguir
                </button>
              </div>
            </div>
          </div>
        )}
        
        {errorMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4">
            <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-lg border border-red-200 flex justify-between items-start">
              <div>
                <p className="font-bold text-sm">Aviso do Sistema</p>
                <p className="text-sm mt-1">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-100 rounded">
                <span className="sr-only">Fechar</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>
        )}

        {/* Left Column: Forms */}
        <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-teal-100 p-6 flex flex-col gap-8 md:overflow-y-auto shrink-0 transition-all">
          
          {/* Section: Register Spot */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                {editingLocal ? 'Editar Local' : 'Cadastrar Local'}
              </h2>
              {editingLocal && (
                <button 
                  onClick={() => { setEditingLocal(null); setNovoLocalForm(''); }}
                  className="text-[10px] text-slate-500 hover:text-slate-700 underline"
                >Cancelar</button>
              )}
            </div>
            <form onSubmit={handleCreateLocal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="nomeLocal">Nome do Local</label>
                <input
                  id="nomeLocal"
                  required
                  type="text"
                  placeholder="Ex: Represa de Itupararanga"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={novoLocalForm}
                  onChange={(e) => setNovoLocalForm(e.target.value)}
                  disabled={submittingLocal}
                />
              </div>
              <button 
                disabled={submittingLocal}
                type="submit" 
                className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium py-2 rounded-md text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submittingLocal ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingLocal ? 'Atualizar Local' : 'Salvar Local'}
              </button>
            </form>
          </section>

          <div className="h-px bg-slate-100 shrink-0"></div>

          {/* Section: Register Fish */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                {editingPeixeId ? 'Editar Peixe' : 'Cadastrar Peixe'}
              </h2>
              {editingPeixeId && (
                <button 
                  onClick={() => { 
                    setEditingPeixeId(null); 
                    setNovoPeixeForm({ local_id: '', nome: '', valor_kg: '', raridade: 'comum', xp_kg: '' }); 
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-700 underline"
                >Cancelar</button>
              )}
            </div>
            <form onSubmit={handleCreatePeixe} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="localPeixe">Local de Pesca</label>
                <select
                  id="localPeixe"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                  value={novoPeixeForm.local_id}
                  onChange={(e) => setNovoPeixeForm({...novoPeixeForm, local_id: e.target.value})}
                  disabled={submittingPeixe || locais.length === 0}
                >
                  <option value="" disabled>Selecione um local...</option>
                  {locais.map(local => (
                    <option key={local.id} value={local.id}>{local.nome}</option>
                  ))}
                </select>
                {locais.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">Cadastre um local primeiro.</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="nomePeixe">Espécie do Peixe</label>
                <input
                  id="nomePeixe"
                  required
                  type="text"
                  placeholder="Ex: Tucunaré"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={novoPeixeForm.nome}
                  onChange={(e) => setNovoPeixeForm({...novoPeixeForm, nome: e.target.value})}
                  disabled={submittingPeixe}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="valorPeixe">Valor do Quilo (R$/kg)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">R$</span>
                  <input
                    id="valorPeixe"
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={novoPeixeForm.valor_kg}
                    onChange={(e) => setNovoPeixeForm({...novoPeixeForm, valor_kg: e.target.value})}
                    disabled={submittingPeixe}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="raridadePeixe">Raridade</label>
                <select
                  id="raridadePeixe"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                  value={novoPeixeForm.raridade}
                  onChange={(e) => setNovoPeixeForm({...novoPeixeForm, raridade: e.target.value as import('./types').Raridade})}
                  disabled={submittingPeixe}
                >
                  <option value="comum">Comum</option>
                  <option value="único">Único</option>
                  <option value="jovem">Jovem</option>
                  <option value="troféu">Troféu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="xpPeixe">XP por Quilo</label>
                <input
                  id="xpPeixe"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 50"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={novoPeixeForm.xp_kg}
                  onChange={(e) => setNovoPeixeForm({...novoPeixeForm, xp_kg: e.target.value})}
                  disabled={submittingPeixe}
                />
              </div>

              <button 
                disabled={submittingPeixe || locais.length === 0}
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium py-2 rounded-md text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submittingPeixe ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingPeixeId ? 'Atualizar Peixe' : 'Adicionar Peixe'}
              </button>
            </form>
          </section>
        </aside>

        {/* Main Dashboard Area */}
        <section className="flex-1 p-6 md:p-8 md:overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-light text-slate-900">Dashboard de Locais</h2>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span> {locais.length} {locais.length === 1 ? 'Local' : 'Locais'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {peixes.length} {peixes.length === 1 ? 'Peixe' : 'Peixes'}</span>
            </div>
          </div>

          <div className="flex gap-2 border-b border-teal-100 mb-6 overflow-x-auto pb-1 hide-scrollbar">
            <button 
              onClick={() => setViewMode('locais')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'locais' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Por Local
            </button>
            <button 
              onClick={() => setViewMode('top_valor')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'top_valor' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Top Valor (Global)
            </button>
            <button 
              onClick={() => setViewMode('top_xp')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'top_xp' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Top XP (Global)
            </button>
            <button 
              onClick={() => setViewMode('calculadora')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'calculadora' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Calculadora de Viagem
            </button>
            <button 
              onClick={() => setViewMode('analise_eficiencia')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'analise_eficiencia' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              📈 Análise de Eficiência (Velocidade)
            </button>
            <button 
              onClick={() => setViewMode('farming_assist')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'farming_assist' ? 'border-teal-600 text-teal-850' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              🧭 Rotas de Farm & Progresso
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-teal-600" />
              <p>Carregando dados das águas...</p>
            </div>
          ) : locais.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 border-dashed p-12 flex flex-col items-center justify-center text-slate-400">
              <MapPin className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-center max-w-sm">Nenhum local de pesca cadastrado. Comece adicionando um novo local ao lado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {viewMode === 'locais' && locais.map(local => {
                const peixesLocais = peixes
                  .filter(p => p.local_id === local.id)
                  .sort((a, b) => b.valor_kg - a.valor_kg);
                
                return (
                  <div key={local.id} className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
                    <div className="bg-teal-50 px-6 py-4 border-b border-teal-100 flex justify-between items-center">
                      <h3 className="font-bold text-teal-800">{local.nome}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium px-2 py-1 bg-teal-100 text-teal-700 rounded">
                          {peixesLocais.length} {peixesLocais.length === 1 ? 'espécie' : 'espécies'}
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { 
                              setConfirmModal({
                                isOpen: true,
                                message: "Você realmente deseja editar este local?",
                                onConfirm: () => {
                                  setEditingLocal({id: local.id, nome: local.nome}); 
                                  setNovoLocalForm(local.nome); 
                                  setConfirmModal(null);
                                }
                              });
                            }} 
                            className="text-teal-600 hover:text-teal-800 text-xs font-medium cursor-pointer"
                          >Editar</button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                message: "Você realmente deseja excluir este local? Isso excluirá todos os peixes dele também.",
                                onConfirm: () => {
                                  handleDeleteLocal(local.id);
                                  setConfirmModal(null);
                                }
                              });
                            }} 
                            className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer"
                          >Excluir</button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-0">
                      {peixesLocais.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm italic border-t border-slate-100">
                          Nenhum peixe cadastrado neste local.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                              <tr>
                                <th scope="col" className="px-6 py-3">Espécie</th>
                                <th scope="col" className="px-6 py-3">Raridade</th>
                                <th scope="col" className="px-6 py-3">Preço (kg)</th>
                                <th scope="col" className="px-6 py-3">XP (kg)</th>
                                <th scope="col" className="px-6 py-3 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {peixesLocais.map(peixe => (
                                <tr key={peixe.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-3 font-medium text-slate-700">
                                    {peixe.nome}
                                  </td>
                                  <td className="px-6 py-3 text-slate-600 capitalize">
                                    {peixe.raridade || 'Comum'}
                                  </td>
                                  <td className="px-6 py-3 font-mono text-slate-600">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(peixe.valor_kg)}
                                  </td>
                                  <td className="px-6 py-3 font-mono text-slate-600">
                                    {peixe.xp_kg || 0} XP
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <div className="flex gap-3 justify-end">
                                      <button 
                                        onClick={() => {
                                          setConfirmModal({
                                            isOpen: true,
                                            message: "Você realmente deseja editar este peixe?",
                                            onConfirm: () => {
                                              setEditingPeixeId(peixe.id);
                                              setNovoPeixeForm({
                                                local_id: peixe.local_id.toString(),
                                                nome: peixe.nome,
                                                valor_kg: peixe.valor_kg.toString(),
                                                raridade: peixe.raridade as import('./types').Raridade,
                                                xp_kg: (peixe.xp_kg || 0).toString()
                                              });
                                              setViewMode('locais');
                                              setConfirmModal(null);
                                            }
                                          });
                                        }}
                                        className="text-teal-600 hover:text-teal-800 transition-colors text-xs font-medium cursor-pointer"
                                      >
                                        Editar
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setConfirmModal({
                                            isOpen: true,
                                            message: "Você realmente deseja excluir este peixe?",
                                            onConfirm: () => {
                                              handleDeletePeixe(peixe.id);
                                              setConfirmModal(null);
                                            }
                                          });
                                        }}
                                        className="text-red-500 hover:text-red-700 transition-colors text-xs font-medium cursor-pointer"
                                      >
                                        Excluir
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {(viewMode === 'top_valor' || viewMode === 'top_xp') && (
                <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
                  <div className="bg-teal-50 px-6 py-4 border-b border-teal-100 flex justify-between items-center">
                    <h3 className="font-bold text-teal-800">
                      {viewMode === 'top_valor' ? 'Ranking Global (Valor/kg)' : 'Ranking Global (XP/kg)'}
                    </h3>
                  </div>
                  
                  <div className="p-0">
                    {peixes.length === 0 ? (
                       <div className="p-6 text-center text-slate-400 text-sm italic border-t border-slate-100">
                         Nenhum peixe cadastrado.
                       </div>
                    ) : (
                       <div className="overflow-x-auto">
                         <table className="w-full text-left text-sm whitespace-nowrap">
                           <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                             <tr>
                               <th scope="col" className="px-6 py-3">Posição</th>
                               <th scope="col" className="px-6 py-3">Espécie</th>
                               <th scope="col" className="px-6 py-3">Local</th>
                               <th scope="col" className="px-6 py-3">Raridade</th>
                               <th scope="col" className="px-6 py-3">Preço (kg)</th>
                               <th scope="col" className="px-6 py-3">XP (kg)</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                             {[...peixes]
                               .sort((a, b) => viewMode === 'top_valor' ? b.valor_kg - a.valor_kg : (b.xp_kg || 0) - (a.xp_kg || 0))
                               .map((peixe, index) => {
                                 const localName = locais.find(l => l.id === peixe.local_id)?.nome || 'Local Desconhecido';
                                 return (
                                   <tr key={peixe.id} className="hover:bg-slate-50/50 transition-colors">
                                     <td className="px-6 py-3 font-mono font-medium text-slate-500">
                                       #{index + 1}
                                     </td>
                                     <td className="px-6 py-3 font-medium text-slate-700">
                                       {peixe.nome}
                                     </td>
                                     <td className="px-6 py-3 text-slate-600">
                                       {localName}
                                     </td>
                                     <td className="px-6 py-3 text-slate-600 capitalize">
                                       {peixe.raridade || 'Comum'}
                                     </td>
                                     <td className="px-6 py-3 font-mono text-teal-600 font-medium">
                                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(peixe.valor_kg)}
                                     </td>
                                     <td className="px-6 py-3 font-mono text-emerald-600 font-medium">
                                       {peixe.xp_kg || 0} XP
                                     </td>
                                   </tr>
                                 );
                               })}
                           </tbody>
                         </table>
                       </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'calculadora' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-light text-slate-800 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-teal-600" />
                        Sessão de Pesca Ao Vivo
                      </h3>
                      {capturasLive.length > 0 && (
                        <button 
                          onClick={() => setCapturasLive([])}
                          className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
                        >
                          Limpar Sessão
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Form Area - 5 cols */}
                      <div className="lg:col-span-5 space-y-6">
                        <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                          <h4 className="font-medium text-slate-700 text-sm uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between">
                            <span>Parâmetros da Viagem</span>
                            <span className="text-[10px] text-slate-400 capitalize normal-case font-normal">(Fishing Planet Helper)</span>
                          </h4>
                          
                          <div>
                            <label className="block text-sm text-slate-500 mb-1">Local da Viagem</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                              value={calcLocalId}
                              onChange={(e) => {
                                setCalcLocalId(e.target.value);
                                setCalcPeixeId('');
                              }}
                            >
                              <option value="">Selecione o local</option>
                              {locais.map(l => (
                                <option key={l.id} value={l.id}>{l.nome}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1" title="Custo inicial para viajar até o local (Passagem)">Custo de Ida/Volta</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  value={calcViagem}
                                  onChange={(e) => setCalcViagem(e.target.value)}
                                  placeholder="Passagem"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-slate-500 mb-1" title="Capacidade máxima de carga do seu Saco de Pesca ou Rede (Keepnet)">Saco de Pesca (Máx)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  value={calcBagCapacity}
                                  onChange={(e) => setCalcBagCapacity(e.target.value)}
                                  placeholder="Sem limite"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">kg</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1" title="Custo de estadia cobrado por cada dia de permanência">Valor da Diária</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  value={calcDiaria}
                                  onChange={(e) => setCalcDiaria(e.target.value)}
                                  placeholder="Diária"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-slate-500 mb-1" title="Quantidade total de dias que você permanecerá neste local de pesca">Quantidade de Dias</label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={calcDias}
                                onChange={(e) => setCalcDias(e.target.value)}
                                placeholder="1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-5 bg-teal-50/50 rounded-xl border border-teal-100 space-y-4 shadow-sm">
                          <h4 className="font-medium text-teal-800 text-sm uppercase tracking-wide">Registrar Nova Captura</h4>
                          
                          <div>
                            <label className="block text-sm text-teal-700 mb-1">Espécie Capturada</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-teal-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                              value={calcPeixeId}
                              onChange={(e) => setCalcPeixeId(e.target.value)}
                              disabled={!calcLocalId}
                            >
                              <option value="">Selecione o peixe</option>
                              {peixes.filter(p => p.local_id.toString() === calcLocalId).map(p => (
                                <option key={p.id} value={p.id}>{p.nome} ({p.raridade})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm text-teal-700 mb-1">Peso da Captura (kg)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 bg-white border border-teal-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                              value={calcPeso}
                              onChange={(e) => setCalcPeso(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const p = peixes.find(x => x.id.toString() === calcPeixeId);
                                  const pesoNum = parseFloat(calcPeso);
                                  if (p && pesoNum > 0) {
                                    setCapturasLive(prev => [...prev, {
                                      id: Date.now().toString(),
                                      peixeId: p.id.toString(),
                                      nome: p.nome,
                                      peso: pesoNum,
                                      valor: p.valor_kg * pesoNum,
                                      xp: (p.xp_kg || 0) * pesoNum
                                    }]);

                                    setHistoricoPesos(prev => {
                                      const listaAtual = prev[p.id] || [];
                                      const novoHistorico = {
                                        ...prev,
                                        [p.id]: [...listaAtual, pesoNum]
                                      };
                                      localStorage.setItem('fp_historico_pesos', JSON.stringify(novoHistorico));
                                      return novoHistorico;
                                    });

                                    setCalcPeso('');
                                  }
                                }
                              }}
                              placeholder="Ex: 5.5"
                              disabled={!calcPeixeId}
                            />
                          </div>

                          {(() => {
                             const bagCapacityNum = parseFloat(calcBagCapacity) || 0;
                             const totalPeso = capturasLive.reduce((acc, curr) => acc + curr.peso, 0);
                             const pesoInput = parseFloat(calcPeso) || 0;
                             if (bagCapacityNum > 0) {
                               const spaceLeft = Math.max(0, bagCapacityNum - totalPeso);
                               if (pesoInput > spaceLeft) {
                                 return (
                                   <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-700 flex flex-col gap-1">
                                     <span className="font-bold">⚠️ Atenção à Capacidade</span>
                                     <span>O peso inserido ({pesoInput.toFixed(2)} kg) excede o espaço restante do saco ({spaceLeft.toFixed(2)} kg).</span>
                                   </div>
                                 );
                               }
                             }
                             return null;
                          })()}
                          
                          <button
                            disabled={!calcPeixeId || !calcPeso || parseFloat(calcPeso) <= 0}
                            className="w-full py-2.5 mt-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            onClick={() => {
                               const p = peixes.find(x => x.id.toString() === calcPeixeId);
                               const pesoNum = parseFloat(calcPeso);
                               if (p && pesoNum > 0) {
                                 setCapturasLive(prev => [...prev, {
                                   id: Date.now().toString(),
                                   peixeId: p.id.toString(),
                                   nome: p.nome,
                                   peso: pesoNum,
                                   valor: p.valor_kg * pesoNum,
                                   xp: (p.xp_kg || 0) * pesoNum
                                 }]);
                                 
                                 setHistoricoPesos(prev => {
                                   const listaAtual = prev[p.id] || [];
                                   const novoHistorico = {
                                     ...prev,
                                     [p.id]: [...listaAtual, pesoNum]
                                   };
                                   localStorage.setItem('fp_historico_pesos', JSON.stringify(novoHistorico));
                                   return novoHistorico;
                                 });

                                 setCalcPeso('');
                               }
                            }}
                          >
                            <Plus className="w-4 h-4" /> Adicionar à Rede
                          </button>
                        </div>
                      </div>
                      
                      {/* Results Area - 7 cols */}
                      <div className="lg:col-span-7 flex flex-col gap-5">
                        {(() => {
                           const custoPassagem = parseFloat(calcViagem) || 0;
                           const custoDiaria = parseFloat(calcDiaria) || 0;
                           const qtdDias = parseInt(calcDias) || 1;
                           const custoNum = custoPassagem + (custoDiaria * qtdDias);

                           const totalValor = capturasLive.reduce((acc, curr) => acc + curr.valor, 0);
                           const totalXp = capturasLive.reduce((acc, curr) => acc + curr.xp, 0);
                           const totalPeso = capturasLive.reduce((acc, curr) => acc + curr.peso, 0);
                           
                           const lucroReais = totalValor - custoNum;
                           const isLucro = lucroReais >= 0;
                           const porcentagem = custoNum > 0 ? Math.min(100, Math.round((totalValor / custoNum) * 100)) : (totalValor > 0 ? 100 : 0);

                           const bagCapacityNum = parseFloat(calcBagCapacity) || 0;
                           const isBagExceeded = bagCapacityNum > 0 && totalPeso > bagCapacityNum;
                           const percentBag = bagCapacityNum > 0 ? Math.min(100, (totalPeso / bagCapacityNum) * 100) : 0;
                           const spaceRemaining = bagCapacityNum > 0 ? Math.max(0, bagCapacityNum - totalPeso) : null;

                           return (
                             <>
                             {/* Top Stats */}
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                               <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center shadow-sm">
                                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Rendimento Total</p>
                                 <p className="text-xl lg:text-2xl font-mono text-teal-600 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor)}</p>
                               </div>
                               <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center shadow-sm">
                                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">XP Total</p>
                                 <p className="text-xl lg:text-2xl font-mono text-emerald-600 font-bold">{Math.round(totalXp)} XP</p>
                               </div>
                               <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center shadow-sm">
                                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Carga no Saco</p>
                                 <p className="text-xl lg:text-2xl font-mono text-blue-600 font-bold">
                                   {totalPeso.toFixed(2)}<span className="text-xs text-slate-400 font-normal">/{bagCapacityNum > 0 ? `${bagCapacityNum}` : '∞'} kg</span>
                                 </p>
                               </div>
                             </div>

                             {/* Trackers Panel */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                               {/* Travel Cost Status */}
                               <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                                 <div>
                                   <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Financeiro da Viagem</p>
                                   <p className={`text-lg font-bold mt-1 ${isLucro && custoNum > 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                     {custoNum === 0 ? 'Defina os custos da viagem' : (isLucro 
                                       ? `Lucro de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucroReais)}` 
                                       : `Faltam ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(lucroReais))}`)
                                     }
                                   </p>
                                 </div>
                                 
                                 <div className="mt-4">
                                   <div className="flex justify-between text-xs text-slate-500 mb-1">
                                     <span>Amortização dos Custos</span>
                                     <span className="font-bold">{porcentagem}%</span>
                                   </div>
                                   <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden pointer-events-none">
                                     <div 
                                       className={`h-2.5 rounded-full transition-all duration-500 ${isLucro ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                                       style={{ width: `${Math.max(0, porcentagem)}%` }}
                                     ></div>
                                   </div>
                                   <div className="flex flex-col gap-1 mt-2.5 text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
                                     <div className="flex justify-between">
                                       <span>Custo Total:</span>
                                       <span className="font-mono text-slate-600 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoNum)}</span>
                                     </div>
                                     {custoNum > 0 && (
                                       <div className="text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded text-left leading-relaxed">
                                         • Passagem: R$ {custoPassagem.toFixed(2)}<br/>
                                         • Diárias: {qtdDias} dia(s) × R$ {custoDiaria.toFixed(2)}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               </div>

                               {/* Bag Capacity Status */}
                               <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                                 <div>
                                   <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Capacidade do Saco de Pesca</p>
                                   <p className={`text-lg font-bold mt-1 ${isBagExceeded ? 'text-red-500' : percentBag > 85 ? 'text-amber-500' : 'text-blue-500'}`}>
                                     {bagCapacityNum === 0 
                                       ? `${totalPeso.toFixed(2)} kg na rede` 
                                       : isBagExceeded 
                                         ? `Excedido em ${(totalPeso - bagCapacityNum).toFixed(2)} kg!` 
                                         : `Restam ${spaceRemaining?.toFixed(2)} kg livres`
                                     }
                                   </p>
                                 </div>

                                 <div className="mt-4">
                                   <div className="flex justify-between text-xs text-slate-500 mb-1">
                                     <span>Ocupação do Saco</span>
                                     <span className="font-bold">{bagCapacityNum > 0 ? `${percentBag.toFixed(0)}%` : 'Sem limite'}</span>
                                   </div>
                                   <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden pointer-events-none">
                                     <div 
                                       className={`h-2.5 rounded-full transition-all duration-500 ${isBagExceeded ? 'bg-red-500' : percentBag > 85 ? 'bg-amber-400' : 'bg-blue-500'}`} 
                                       style={{ width: `${bagCapacityNum > 0 ? Math.min(100, Math.max(0, percentBag)) : 100}%` }}
                                     ></div>
                                   </div>
                                   <div className="flex flex-col gap-1 mt-2.5 text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
                                     <div className="flex justify-between">
                                       <span>Peso Atual do Saco:</span>
                                       <span className="font-mono text-slate-600 font-medium">{totalPeso.toFixed(2)} kg</span>
                                     </div>
                                     <div className="flex justify-between text-[10px]">
                                       <span>Limite do Equipamento:</span>
                                       <span className="text-slate-500">{bagCapacityNum > 0 ? `${bagCapacityNum.toFixed(2)} kg` : 'Sem Limites'}</span>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>

                             {/* List of Catches */}
                             <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[350px]">
                               <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                 <p className="text-xs text-slate-600 uppercase tracking-wider font-bold">Histórico da Rede ({capturasLive.length})</p>
                               </div>
                               <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
                                 {capturasLive.length === 0 ? (
                                   <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 pb-8 mt-12">
                                     <Fish className="w-10 h-10 opacity-30" />
                                     <p className="text-sm font-medium">Nenhum peixe na rede ainda.</p>
                                     <p className="text-xs text-slate-400 text-center max-w-xs">Adicione os peixes capturados usando o painel ao lado para acompanhar o progresso da sua viagem.</p>
                                   </div>
                                 ) : (
                                   <ul className="space-y-3">
                                     {[...capturasLive].reverse().map(cap => (
                                       <li key={cap.id} className="bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-slate-300">
                                         <div className="flex-1 min-w-0">
                                           <p className="text-sm font-medium text-slate-800 truncate">{cap.nome}</p>
                                           <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-xs text-slate-500 mt-1">
                                             <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{cap.peso.toFixed(2)} kg</span>
                                             <span className="hidden sm:inline">•</span>
                                             <span className="text-teal-600 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cap.valor)}</span>
                                             <span className="hidden sm:inline">•</span>
                                             <span className="text-emerald-600 font-medium">{Math.round(cap.xp)} XP</span>
                                           </div>
                                         </div>
                                         <button 
                                           onClick={() => setCapturasLive(prev => prev.filter(p => p.id !== cap.id))}
                                           className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                                           title="Remover Captura"
                                         >
                                           <Trash2 className="w-5 h-5" />
                                         </button>
                                       </li>
                                     ))}
                                   </ul>
                                 )}
                               </div>
                             </div>
                             </>
                           );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'analise_eficiencia' && (
                <div className="space-y-6">
                  {/* Info / Header */}
                  <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-xl font-light text-slate-800 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
                          Análise de Aproveitamento e Velocidade de Progresso
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Descubra quais peixes dão o retorno mais veloz em dinheiro e XP, considerando o peso médio real que você de fato pesca na calculadora de viagem.
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => {
                            if (window.confirm("Deseja realmente apagar o histórico de pesos reais capturados?")) {
                              setHistoricoPesos({});
                              localStorage.removeItem('fp_historico_pesos');
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                          title="Limpar o histórico de pesagens registradas"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Limpar Histórico de Pesos
                        </button>
                      </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1 font-bold">Buscar por Nome</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-700"
                            placeholder="Ex: Tucunaré, Lambari..."
                            value={searchAnalise}
                            onChange={e => setSearchAnalise(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1 font-bold">Filtrar por Local</label>
                        <select 
                          value={filtroLocalAnalise}
                          onChange={e => setFiltroLocalAnalise(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-700 font-medium"
                        >
                          <option value="">Todos os Locais</option>
                          {locais.map(loc => (
                            <option key={loc.id} value={loc.id.toString()}>{loc.nome}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1 font-bold text-teal-800">Ordenar por</label>
                        <select 
                          value={sortByAnalise}
                          onChange={e => setSortByAnalise(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-700 font-semibold text-teal-600"
                        >
                          <option value="valor_tempo">💰 Dinheiro / Tempo (R$ por peixe)</option>
                          <option value="xp_tempo">💡 XP / Tempo (XP por peixe)</option>
                          <option value="valor_kg">💵 Valor por kg (R$/kg)</option>
                          <option value="xp_kg">🎖️ XP por kg (XP/kg)</option>
                          <option value="esforco">⏳ Esforço (Nº de peixes p/ saco)</option>
                          <option value="nome">🐟 Nome da espécie</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1 font-bold">Ordem</label>
                        <select 
                          value={sortOrderAnalise}
                          onChange={e => setSortOrderAnalise(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 text-slate-700 font-medium"
                        >
                          <option value="desc">Decrescente (Maior ➔ Menor)</option>
                          <option value="asc">Crescente (Menor ➔ Maior)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-500 mb-1 font-bold" title="Defina o tamanho do Saco de Pesca na aba Calculadora de Viagem">Capacidade Saco (kg)</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-1.5 bg-slate-100 border border-slate-250 rounded-lg text-sm text-slate-700 font-bold pointer-events-none"
                          value={calcBagCapacity}
                          disabled
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5 block font-medium">Sincronizado c/ Calculadora</span>
                      </div>
                    </div>

                    {/* Main Analytics Logic */}
                    {(() => {
                       const bagCap = parseFloat(calcBagCapacity) || 100;
                       
                       // Filter & sort peixes
                       const fishAnalise = peixes
                         .filter(p => {
                           if (filtroLocalAnalise && p.local_id.toString() !== filtroLocalAnalise) return false;
                           if (searchAnalise && !p.nome.toLowerCase().includes(searchAnalise.toLowerCase())) return false;
                           return true;
                         })
                         .map(p => {
                           const localObj = locais.find(l => l.id === p.local_id);
                           
                           // Combined recorded captures (history + live session catches)
                           const weightsHistory = historicoPesos[p.id] || [];
                           const liveWeightsForFish = capturasLive.filter(c => c.peixeId === p.id.toString()).map(c => c.peso);
                           const combinedWeights = [...weightsHistory, ...liveWeightsForFish];
                           
                           const count = combinedWeights.length;
                           const realAvg = count > 0 
                             ? combinedWeights.reduce((acc, w) => acc + w, 0) / count 
                             : null;
                           
                           const customWeightStr = pesosEstimados[p.id] || '';
                           const customWeight = parseFloat(customWeightStr);
                           
                           const finalAvg = !isNaN(customWeight) && customWeight > 0 
                             ? customWeight 
                             : (realAvg !== null ? realAvg : 1.0);
                           
                           const sourceLabel = !isNaN(customWeight) && customWeight > 0
                             ? 'estimated'
                             : (realAvg !== null ? 'real' : 'fallback');
                           
                           const valorPerCatch = finalAvg * p.valor_kg;
                           const xpPerCatch = finalAvg * (p.xp_kg || 0);
                           const catchesToFill = finalAvg > 0 ? Math.ceil(bagCap / finalAvg) : 0;
                           const valorFullBag = bagCap * p.valor_kg;
                           const xpFullBag = bagCap * (p.xp_kg || 0);

                           return {
                             ...p,
                             localNome: localObj?.nome || 'Desconhecido',
                             realAvg,
                             count,
                             finalAvg,
                             sourceLabel,
                             valorPerCatch,
                             xpPerCatch,
                             catchesToFill,
                             valorFullBag,
                             xpFullBag
                           };
                         });

                       if (fishAnalise.length === 0) {
                         return (
                           <div className="text-center p-12 text-slate-400">
                             <Fish className="w-12 h-12 mx-auto opacity-30 mb-2 animate-bounce" />
                             <p className="text-sm">Nenhum peixe atende aos critérios de busca ou filtros selecionados.</p>
                           </div>
                         );
                       }

                       // Sort options for top 5 lists
                       const topMoney = [...fishAnalise]
                         .sort((a, b) => b.valorPerCatch - a.valorPerCatch)
                         .slice(0, 5);

                       const topXp = [...fishAnalise]
                         .sort((a, b) => b.xpPerCatch - a.xpPerCatch)
                         .slice(0, 5);

                       // Sorting active fish items for the table main body
                       const sortedFishAnalise = [...fishAnalise].sort((a, b) => {
                         let compare = 0;
                         if (sortByAnalise === 'valor_tempo') {
                           compare = a.valorPerCatch - b.valorPerCatch;
                         } else if (sortByAnalise === 'xp_tempo') {
                           compare = a.xpPerCatch - b.xpPerCatch;
                         } else if (sortByAnalise === 'valor_kg') {
                           compare = a.valor_kg - b.valor_kg;
                         } else if (sortByAnalise === 'xp_kg') {
                           compare = (a.xp_kg || 0) - (b.xp_kg || 0);
                         } else if (sortByAnalise === 'esforco') {
                           compare = a.catchesToFill - b.catchesToFill;
                         } else {
                           compare = a.nome.localeCompare(b.nome);
                         }
                         return sortOrderAnalise === 'desc' ? -compare : compare;
                       });

                       const renderSortIcon = (field: typeof sortByAnalise) => {
                         if (sortByAnalise !== field) return " ↕️";
                         return sortOrderAnalise === 'desc' ? " ⬇️" : " ⬆️";
                       };

                       const toggleSort = (field: typeof sortByAnalise) => {
                         if (sortByAnalise === field) {
                           setSortOrderAnalise(prev => prev === 'desc' ? 'asc' : 'desc');
                         } else {
                           setSortByAnalise(field);
                           setSortOrderAnalise('desc');
                         }
                       };

                       return (
                         <div className="space-y-8">
                           {/* Speed Leaderboards */}
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             {/* Money Leaderboard */}
                             <div className="bg-gradient-to-br from-teal-50/50 to-emerald-50/20 p-5 rounded-xl border border-teal-100 shadow-sm">
                               <h4 className="text-sm font-bold text-teal-850 uppercase tracking-wider mb-4 flex items-center gap-2">
                                 <Plus className="w-4 h-4 text-emerald-500" />
                                 Top 5: Maior Ganho Financeiro p/ Captura (Foque nesses!)
                               </h4>
                               <div className="space-y-3">
                                 {topMoney.map((p, idx) => (
                                   <div key={p.id} className="bg-white p-3 py-2.5 rounded-lg border border-slate-100 shadow-xs flex items-center justify-between gap-3">
                                     <div className="flex items-center gap-3">
                                       <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 font-extrabold text-xs flex items-center justify-center">
                                         #{idx + 1}
                                       </span>
                                       <div>
                                         <p className="text-sm font-bold text-slate-800">{p.nome}</p>
                                         <p className="text-[10px] text-slate-500">{p.localNome} • Peso Estimado: {p.finalAvg.toFixed(2)} kg</p>
                                       </div>
                                     </div>
                                     <div className="text-right">
                                       <p className="text-sm font-extrabold text-emerald-600 font-mono">
                                         +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorPerCatch)}
                                       </p>
                                       <p className="text-[10px] text-slate-400 font-medium">Lota Saco c/ {p.catchesToFill} uni</p>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>

                             {/* XP Leaderboard */}
                             <div className="bg-gradient-to-br from-indigo-50/40 to-blue-50/20 p-5 rounded-xl border border-indigo-100 shadow-sm">
                               <h4 className="text-sm font-bold text-indigo-850 uppercase tracking-wider mb-4 flex items-center gap-2">
                                 <Award className="w-4 h-4 text-indigo-500" />
                                 Top 5: Maior Ganho de Experiência p/ Captura (Up Rápido!)
                               </h4>
                               <div className="space-y-3">
                                 {topXp.map((p, idx) => (
                                   <div key={p.id} className="bg-white p-3 py-2.5 rounded-lg border border-slate-100 shadow-xs flex items-center justify-between gap-3">
                                     <div className="flex items-center gap-3">
                                       <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center">
                                         #{idx + 1}
                                       </span>
                                       <div>
                                         <p className="text-sm font-bold text-slate-800">{p.nome}</p>
                                         <p className="text-[10px] text-slate-500">{p.localNome} • Peso Estimado: {p.finalAvg.toFixed(2)} kg</p>
                                       </div>
                                     </div>
                                     <div className="text-right">
                                       <p className="text-sm font-extrabold text-indigo-600 font-mono">
                                         +{Math.round(p.xpPerCatch)} XP
                                       </p>
                                       <p className="text-[10px] text-slate-400 font-medium">Lota Saco c/ {p.catchesToFill} uni</p>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           </div>

                           {/* Comparative Analysis Table */}
                           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                             <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                               <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                 Tabela de Rendimento Comparado por Saco vs Esforço de Captura
                               </h4>
                               <span className="text-xs text-slate-400 font-normal">Edite livremente o peso médio de cada peixe para recalcular a viabilidade</span>
                             </div>

                             <div className="overflow-x-auto">
                               <table className="w-full text-left border-collapse">
                                 <thead>
                                   <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 select-none">
                                     <th 
                                        onClick={() => toggleSort('nome')}
                                        className="px-6 py-3 cursor-pointer hover:bg-slate-150 hover:text-slate-900 transition-colors"
                                      >
                                        Espécie de Peixe / Local {renderSortIcon('nome')}
                                      </th>
                                     <th className="px-6 py-3 w-40">Peso Médio Ativo (kg)</th>
                                     <th 
                                        onClick={() => {
                                          if (sortByAnalise === 'valor_kg') toggleSort('xp_kg');
                                          else toggleSort('valor_kg');
                                        }}
                                        className="px-6 py-3 cursor-pointer hover:bg-slate-150 hover:text-slate-900 transition-colors"
                                        title="Clique para alternar ordenação por R$/kg ou XP/kg"
                                      >
                                        Rendimento Base / kg {renderSortIcon(sortByAnalise === 'xp_kg' ? 'xp_kg' : 'valor_kg')}
                                      </th>
                                     <th 
                                        onClick={() => toggleSort('esforco')}
                                        className="px-6 py-3 cursor-pointer hover:bg-slate-150 hover:text-slate-900 transition-colors"
                                      >
                                        Esforço para Lotação {renderSortIcon('esforco')}
                                      </th>
                                     <th 
                                        onClick={() => {
                                          if (sortByAnalise === 'valor_tempo') toggleSort('xp_tempo');
                                          else toggleSort('valor_tempo');
                                        }}
                                        className="px-6 py-3 cursor-pointer hover:bg-slate-150 hover:text-slate-900 transition-colors"
                                        title="Clique para alternar ordenação por R$/Captura ou XP/Captura"
                                      >
                                        Unidade R$ e XP (Rápido) {renderSortIcon(sortByAnalise === 'xp_tempo' ? 'xp_tempo' : 'valor_tempo')}
                                      </th>
                                     <th className="px-6 py-3 text-right">Potencial Saco Cheio</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 text-sm">
                                   {sortedFishAnalise.map(p => {
                                     return (
                                       <tr key={p.id} className="hover:bg-slate-50/35 transition-colors">
                                         {/* Local / Nome */}
                                         <td className="px-6 py-4">
                                           <p className="font-semibold text-slate-800">{p.nome}</p>
                                           <span className="text-xs text-slate-400">{p.localNome}</span>
                                         </td>

                                         {/* Editable Weight Weight details */}
                                         <td className="px-6 py-4">
                                           <div className="space-y-1">
                                             <div className="relative flex items-center w-28">
                                               <input 
                                                 type="number"
                                                 step="any"
                                                 min="0.01"
                                                 placeholder={p.realAvg ? p.realAvg.toFixed(2) : "1.00"}
                                                 value={pesosEstimados[p.id] || ''}
                                                 onChange={e => {
                                                   const val = e.target.value;
                                                   setPesosEstimados(prev => {
                                                     const updated = { ...prev, [p.id]: val };
                                                     localStorage.setItem('fp_pesos_estimados', JSON.stringify(updated));
                                                     return updated;
                                                   });
                                                 }}
                                                 className="w-full px-2 py-1 pr-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-705 focus:outline-none focus:bg-white focus:border-teal-500"
                                               />
                                               <span className="absolute right-2 text-[10px] text-slate-400 font-semibold">kg</span>
                                             </div>
                                             <div>
                                               {p.sourceLabel === 'real' && (
                                                 <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-teal-700 bg-teal-50 rounded">
                                                   Média Calc ({p.count} cap)
                                                 </span>
                                               )}
                                               {p.sourceLabel === 'estimated' && (
                                                 <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 rounded">
                                                   Est. Manual
                                                 </span>
                                               )}
                                               {p.sourceLabel === 'fallback' && (
                                                 <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 rounded" title="Sem capturas registradas. Simule um peso digitando no campo.">
                                                   Padrão (1.0 kg)
                                                 </span>
                                               )}
                                             </div>
                                           </div>
                                         </td>

                                         {/* Rendimento / kg */}
                                         <td className="px-6 py-4">
                                           <div className="text-xs space-y-0.5">
                                             <p className="text-slate-600 font-medium">
                                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_kg)}/kg
                                             </p>
                                             <p className="text-slate-500 font-mono">
                                               {p.xp_kg} XP/kg
                                             </p>
                                           </div>
                                         </td>

                                         {/* Saco cheios */}
                                         <td className="px-6 py-4">
                                           <div className="text-xs">
                                             <span className="font-bold text-slate-800">{p.catchesToFill}</span> capturas necessárias
                                             <div className="w-24 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden pointer-events-none">
                                               <div 
                                                 className="bg-indigo-500 h-1 rounded-full transition-all duration-300" 
                                                 style={{ width: `${Math.max(2, Math.min(100, (p.finalAvg / bagCap) * 100))}%` }}
                                               ></div>
                                              </div>
                                           </div>
                                         </td>

                                         {/* Single fish average rewards */}
                                         <td className="px-6 py-4">
                                           <div className="space-y-1">
                                             <div className="text-xs font-mono">
                                               <span className="text-emerald-600 font-extrabold">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorPerCatch)}</span> <span className="text-[9px] text-slate-400 font-normal">R$</span>
                                             </div>
                                             <div className="text-xs font-mono">
                                               <span className="text-indigo-650 font-bold">+{Math.round(p.xpPerCatch)}</span> <span className="text-[9px] text-slate-400 font-normal">XP</span>
                                             </div>
                                           </div>
                                         </td>

                                         {/* Full sack potential */}
                                         <td className="px-6 py-4 text-right">
                                           <div className="inline-block text-left bg-slate-50 border border-slate-100 p-2 rounded-lg">
                                             <div className="text-xs font-mono">
                                               <span className="text-[9px] text-slate-400 font-bold block leading-none mb-0.5 uppercase">Cheio R$</span>
                                               <span className="font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorFullBag)}</span>
                                             </div>
                                             <div className="text-xs font-mono mt-1">
                                               <span className="text-[9px] text-slate-400 font-bold block leading-none mb-0.5 uppercase">Cheio XP</span>
                                               <span className="font-bold text-indigo-600">{Math.round(p.xpFullBag)} XP</span>
                                             </div>
                                             <div className="mt-1.5 text-center">
                                                {p.finalAvg < 0.25 ? (
                                                  <span className="inline-block px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide text-red-700 bg-red-50 rounded select-none">⏳ Lento / Pequeno</span>
                                                ) : p.finalAvg > 3.0 ? (
                                                  <span className="inline-block px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide text-emerald-700 bg-emerald-50 rounded select-none">⚡ Eficiente / Rápido</span>
                                                ) : (
                                                  <span className="inline-block px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide text-blue-700 bg-blue-50 rounded select-none">✓ Moderado</span>
                                                )}
                                             </div>
                                           </div>
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
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Sub-footer */}
      <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex justify-between shrink-0">
        <div>Supabase Instance: <span className="text-teal-400">fishing-spots-db-v1</span></div>
        <div className="flex gap-4 hidden sm:flex">
          <span className="text-slate-500">// SUPABASE_URL: "https://your-id.supabase.co"</span>
          <span className="text-slate-500">// SUPABASE_ANON_KEY: "eyJhbG..."</span>
        </div>
      </footer>
    </div>
  );
}
