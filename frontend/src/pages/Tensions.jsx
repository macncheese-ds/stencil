import React, { useState, useEffect } from 'react'
import * as api from '../api'
import RegisterTensionModal from '../components/RegisterTensionModal'

export default function Tensions() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterNumero, setFilterNumero] = useState('');
  const [viewMode, setViewMode] = useState('latest'); // 'latest' or 'history'
  const [historyId, setHistoryId] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Fetch latest tensions on mount
  useEffect(() => {
    fetchLatest();
  }, []);

  async function fetchLatest() {
    setLoading(true);
    setViewMode('latest');
    setHistoryId(null);
    try {
      const data = await api.getLatestTensions();
      setRecords(data.records || []);
    } catch (e) {
      console.error('Error fetching tensions:', e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory(numero) {
    setLoading(true);
    setViewMode('history');
    setHistoryId(numero);
    try {
      const data = await api.getTensionHistory(numero);
      setRecords(data.records || []);
    } catch (e) {
      console.error('Error fetching history:', e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    try {
      const blob = await api.exportTensionsCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tensions_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error al exportar CSV');
      console.error(e);
    }
  }

  function handleRegisterSuccess() {
    // Refresh the list to show the new record
    fetchLatest();
  }

  // Apply filter by numero
  const filtered = filterNumero.trim()
    ? records.filter(r => String(r.numero).includes(filterNumero))
    : records;

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function inRange(val, min, max) {
    if (val === null || val === undefined) return null;
    const n = Number(val);
    const a = Number(min);
    const b = Number(max);
    if (Number.isNaN(n) || Number.isNaN(a) || Number.isNaN(b)) return null;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return n >= lo && n <= hi;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Registro de Tensiones</h1>
            <p className="text-slate-400 mt-2">
              {viewMode === 'latest' 
                ? `${filtered.length} stencils con registros` 
                : `Historial completo del stencil ${historyId}`
              }
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Nueva Tensión
            </button>
            <button
              onClick={handleExportCSV}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </button>
            <a
              href="/"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
            >
              ← Regresar
            </a>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={filterNumero}
              onChange={e => setFilterNumero(e.target.value)}
              placeholder="Filtrar por número de stencil..."
              className="w-full px-4 py-2 bg-slate-800 text-white border-2 border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          {viewMode === 'history' && (
            <button
              onClick={fetchLatest}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              ← Ver Registros Actuales
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              Cargando registros...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {filterNumero.trim() ? 'No se encontraron registros con ese número' : 'No hay registros disponibles'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Modelo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Da</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Db</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Dc</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Dd</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">De</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Min</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Max</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Operador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Supervisor</th>
                    {viewMode === 'latest' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filtered.map((record, idx) => (
                    <tr key={`${record.id}-${record.fecha}-${idx}`} className="hover:bg-slate-700 transition">
                      <td className="px-4 py-3 text-sm text-slate-300">{formatDate(record.fecha)}</td>
                      <td className="px-4 py-3 text-sm text-white font-bold">{record.numero}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{record.model || '-'}</td>
                      <td className={`px-4 py-3 text-sm font-mono ${inRange(record.da, record.min, record.max) ? 'text-green-400' : (record.da != null ? 'text-red-400' : 'text-slate-300')}`}>{record.da != null ? Number(record.da).toFixed(2) : '-'}</td>
                      <td className={`px-4 py-3 text-sm font-mono ${inRange(record.db, record.min, record.max) ? 'text-green-400' : (record.db != null ? 'text-red-400' : 'text-slate-300')}`}>{record.db != null ? Number(record.db).toFixed(2) : '-'}</td>
                      <td className={`px-4 py-3 text-sm font-mono ${inRange(record.dc, record.min, record.max) ? 'text-green-400' : (record.dc != null ? 'text-red-400' : 'text-slate-300')}`}>{record.dc != null ? Number(record.dc).toFixed(2) : '-'}</td>
                      <td className={`px-4 py-3 text-sm font-mono ${inRange(record.dd, record.min, record.max) ? 'text-green-400' : (record.dd != null ? 'text-red-400' : 'text-slate-300')}`}>{record.dd != null ? Number(record.dd).toFixed(2) : '-'}</td>
                      <td className={`px-4 py-3 text-sm font-mono ${inRange(record.de, record.min, record.max) ? 'text-green-400' : (record.de != null ? 'text-red-400' : 'text-slate-300')}`}>{record.de != null ? Number(record.de).toFixed(2) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-blue-400 font-mono">{record.min != null ? Number(record.min).toFixed(2) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-red-400 font-mono">{record.max != null ? Number(record.max).toFixed(2) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-green-400">{record.operador || '-'}</td>
                      <td className="px-4 py-3 text-sm text-purple-400">{record.supervisor || '-'}</td>
                      {viewMode === 'latest' && (
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => fetchHistory(record.numero)}
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            Ver Historial
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Register Modal */}
      <RegisterTensionModal
        show={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegisterSuccess}
      />
    </div>
  )
}
