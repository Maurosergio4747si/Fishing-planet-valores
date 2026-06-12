import { useEffect, useState, FormEvent } from 'react';
import { supabase } from './lib/supabase';
import { Local, Peixe } from './types';
import { MapPin, Fish, DollarSign, Plus, Anchor, Trash2, Loader2, Info } from 'lucide-react';

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
  
  const [viewMode, setViewMode] = useState<'locais' | 'top_valor' | 'top_xp'>('locais');
  const [submittingLocal, setSubmittingLocal] = useState(false);
  const [submittingPeixe, setSubmittingPeixe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

          <div className="flex gap-2 border-b border-teal-100 mb-6">
            <button 
              onClick={() => setViewMode('locais')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'locais' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Por Local
            </button>
            <button 
              onClick={() => setViewMode('top_valor')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'top_valor' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Top Valor (Global)
            </button>
            <button 
              onClick={() => setViewMode('top_xp')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'top_xp' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Top XP (Global)
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
