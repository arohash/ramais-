import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ContactCard from './components/ContactCard';
import Modal from './components/Modal';
import { RAW_CONTACTS } from './constants';
import { Contact, SortOption, AppConfig } from './types';
import { Filter, Users, List, ArrowUpDown, Search, Plus, Save, Upload, Download, FileUp, AlertTriangle, HelpCircle, Share2, Monitor, Smartphone, Globe } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  title: 'Barra Mansa',
  subtitle: 'Lista de Ramais Internos',
  primaryColor: '#b91c1c',
};

const APP_VERSION = '1.4.0';

function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NAME_ASC);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setHelpModalOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentContact, setCurrentContact] = useState<Partial<Contact>>({});
  const [tempConfig, setTempConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('bm_app_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    const savedContacts = localStorage.getItem('bm_contacts_v1');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    } else {
      const processedInitial = RAW_CONTACTS.map((c, index) => ({
        ...c,
        id: `init-${index}-${Date.now()}`
      }));
      setContacts(processedInitial);
    }
  }, []);

  useEffect(() => {
    if (contacts.length > 0) localStorage.setItem('bm_contacts_v1', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('bm_app_config', JSON.stringify(config));
  }, [config]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'admin') {
      setIsAdmin(true);
      setLoginModalOpen(false);
      setLoginPassword('');
      setLoginError('');
    } else {
      setLoginError('Senha incorreta.');
    }
  };

  const handleLogout = () => setIsAdmin(false);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContact.nome || !currentContact.ramal) return;
    if (currentContact.id) {
      setContacts(prev => prev.map(c => c.id === currentContact.id ? currentContact as Contact : c));
    } else {
      const newContact: Contact = {
        id: Date.now().toString(),
        nome: currentContact.nome,
        ramal: currentContact.ramal,
        departamento: currentContact.departamento || '',
      };
      setContacts(prev => [...prev, newContact]);
    }
    setContactModalOpen(false);
    setCurrentContact({});
  };

  const handleDeleteContact = (id: string) => setContacts(prev => prev.filter(c => c.id !== id));
  const openNewContactModal = () => { setCurrentContact({ nome: '', ramal: '', departamento: '' }); setContactModalOpen(true); };
  const openEditContactModal = (contact: Contact) => { setCurrentContact({ ...contact }); setContactModalOpen(true); };
  const handleSaveConfig = (e: React.FormEvent) => { e.preventDefault(); setConfig(tempConfig); setSettingsModalOpen(false); };
  const openSettings = () => { setTempConfig(config); setSettingsModalOpen(true); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Ramal', 'Departamento'];
    const rows = contacts.map(c => [c.nome, c.ramal, c.departamento]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lista_ramais_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const startIdx = lines[0].toLowerCase().includes('nome') ? 1 : 0;
      const importedContacts: Contact[] = lines.slice(startIdx).map((line, index) => {
        const [nome, ramal, departamento] = line.split(',').map(s => s.trim());
        return { id: `imp-${Date.now()}-${index}`, nome: nome || 'Sem Nome', ramal: ramal || '0000', departamento: departamento || 'Geral' };
      });
      if (importedContacts.length > 0 && window.confirm(`Importar ${importedContacts.length} contatos?`)) setContacts(importedContacts);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link do sistema copiado! Envie para seus colegas.');
  };

  const departments = useMemo(() => {
    const depts = new Set(contacts.map(c => c.departamento).filter(Boolean));
    return Array.from(depts).sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = [...contacts];
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => c.nome.toLowerCase().includes(lowerTerm) || c.ramal.includes(lowerTerm) || (c.departamento && c.departamento.toLowerCase().includes(lowerTerm)));
    }
    if (selectedDept) result = result.filter(c => c.departamento === selectedDept);
    return result.sort((a, b) => {
      switch (sortOption) {
        case SortOption.NAME_ASC: return a.nome.localeCompare(b.nome);
        case SortOption.NAME_DESC: return b.nome.localeCompare(a.nome);
        case SortOption.RAMAL_ASC: return a.ramal.localeCompare(b.ramal, undefined, { numeric: true });
        default: return 0;
      }
    });
  }, [contacts, searchTerm, selectedDept, sortOption]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-900 text-gray-100">
      <Header config={config} isAdmin={isAdmin} onLoginClick={() => setLoginModalOpen(true)} onLogoutClick={handleLogout} onSettingsClick={openSettings} />
      
      <main className="flex-grow container mx-auto px-4 py-8 relative">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-grow">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Nome, ramal ou departamento..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setHelpModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors">
              <HelpCircle className="w-4 h-4 text-blue-400" /> <span className="hidden sm:inline">Como Instalar?</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors">
              <Share2 className="w-4 h-4 text-green-400" /> <span className="hidden sm:inline">Compartilhar</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 ml-1 flex items-center"><Filter className="w-3 h-3 mr-1" /> Departamento</label>
              <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white sm:text-sm">
                <option value="">Todos os Departamentos</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 ml-1 flex items-center"><ArrowUpDown className="w-3 h-3 mr-1" /> Ordenar</label>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="block w-full pl-3 pr-10 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white sm:text-sm">
                <option value={SortOption.NAME_ASC}>Nome (A-Z)</option>
                <option value={SortOption.NAME_DESC}>Nome (Z-A)</option>
                <option value={SortOption.RAMAL_ASC}>Ramal (Menor Primeiro)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6 px-1">
          <h2 className="text-xl font-bold text-gray-100 flex items-center">
            <List className="w-5 h-5 mr-2" style={{ color: config.primaryColor }} /> Lista de Ramais
          </h2>
          <div className="flex items-center gap-3">
             <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-1 rounded-full flex items-center h-8">
              <Users className="w-3 h-3 mr-1.5" /> {filteredContacts.length} total
            </span>
            {isAdmin && (
              <button onClick={openNewContactModal} className="flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg shadow text-sm font-semibold" style={{ backgroundColor: config.primaryColor }}>
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            )}
          </div>
        </div>

        {filteredContacts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} isAdmin={isAdmin} onEdit={openEditContactModal} onDelete={handleDeleteContact} primaryColor={config.primaryColor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-800 rounded-xl border border-dashed border-gray-700">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4"><Search className="w-8 h-8 text-gray-400" /></div>
            <h3 className="text-lg font-medium text-gray-100">Nada encontrado</h3>
            <button onClick={() => { setSearchTerm(''); setSelectedDept(''); }} className="mt-4 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-medium text-gray-300">Ver todos</button>
          </div>
        )}
      </main>
      
      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-1">
            &copy; {new Date().getFullYear()} {config.title}
          </p>
          <div className="text-xs text-gray-600">Versão {APP_VERSION}</div>
        </div>
      </footer>

      <Modal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} title="Painel Administrativo">
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Senha (padrão: admin)" autoFocus />
          {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
          <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-900 rounded-md w-full font-bold uppercase tracking-wide">Entrar</button>
        </form>
      </Modal>

      <Modal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} title={currentContact.id ? "Editar Contato" : "Novo Contato"}>
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300">Nome</label><input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md" value={currentContact.nome || ''} onChange={(e) => setCurrentContact({...currentContact, nome: e.target.value})} /></div>
          <div><label className="block text-sm font-medium text-gray-300">Ramal</label><input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md" value={currentContact.ramal || ''} onChange={(e) => setCurrentContact({...currentContact, ramal: e.target.value})} /></div>
          <div><label className="block text-sm font-medium text-gray-300">Departamento</label><input type="text" list="dept-list" className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md" value={currentContact.departamento || ''} onChange={(e) => setCurrentContact({...currentContact, departamento: e.target.value})} /><datalist id="dept-list">{departments.map(d => <option key={d} value={d} />)}</datalist></div>
          <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setContactModalOpen(false)} className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md">Cancelar</button><button type="submit" className="px-4 py-2 text-white rounded-md flex items-center gap-2" style={{ backgroundColor: config.primaryColor }}>Salvar</button></div>
        </form>
      </Modal>

      <Modal isOpen={isHelpModalOpen} onClose={() => setHelpModalOpen(false)} title="Como Instalar o App">
        <div className="space-y-6 text-gray-300">
          <div className="flex gap-4">
            <div className="bg-blue-500/10 p-3 rounded-full h-fit"><Monitor className="w-6 h-6 text-blue-400" /></div>
            <div>
              <h4 className="font-bold text-white mb-1">No Computador (Chrome/Edge)</h4>
              <p className="text-sm">Abra o link do sistema, clique no ícone <Download className="inline w-3 h-3 mx-1" /> que aparece na barra de endereços (ao lado da estrela de favoritos) e selecione <strong>Instalar</strong>.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-purple-500/10 p-3 rounded-full h-fit"><Smartphone className="w-6 h-6 text-purple-400" /></div>
            <div>
              <h4 className="font-bold text-white mb-1">No Celular</h4>
              <p className="text-sm">Acesse o link, clique nos 3 pontinhos do navegador e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela de início"</strong>.</p>
            </div>
          </div>
          <div className="flex gap-4 border-t border-gray-700 pt-4">
            <div className="bg-green-500/10 p-3 rounded-full h-fit"><Globe className="w-6 h-6 text-green-400" /></div>
            <div>
              <h4 className="font-bold text-white mb-1">Acesso Offline</h4>
              <p className="text-sm">Uma vez instalado, o sistema funcionará mesmo se você estiver sem internet, pois os dados ficam salvos no seu dispositivo.</p>
            </div>
          </div>
          <button onClick={() => setHelpModalOpen(false)} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors mt-2">Entendido!</button>
        </div>
      </Modal>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="Configurações Avançadas">
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-1">Identidade</h4>
            <div><label className="block text-sm font-medium text-gray-300">Título</label><input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md" value={tempConfig.title} onChange={(e) => setTempConfig({...tempConfig, title: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-300">Cor</label><input type="color" className="h-10 w-full border-0 rounded mt-1 bg-transparent cursor-pointer" value={tempConfig.primaryColor} onChange={(e) => setTempConfig({...tempConfig, primaryColor: e.target.value})} /></div>
          </div>
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-1">Backup de Dados</h4>
            <div className="flex gap-2">
              <button type="button" onClick={exportToCSV} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs"><Download className="w-3 h-3" /> Exportar</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs"><FileUp className="w-3 h-3" /> Importar</button>
              <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-700"><button type="button" onClick={() => setSettingsModalOpen(false)} className="px-4 py-2 text-gray-300">Cancelar</button><button type="submit" className="px-4 py-2 bg-white text-gray-900 rounded-md font-bold">Salvar Tudo</button></div>
        </form>
      </Modal>
    </div>
  );
}

export default App;