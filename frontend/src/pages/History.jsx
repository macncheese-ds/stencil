

import React, { useState, useEffect } from 'react';
import * as api from '../api';
import * as XLSX from 'xlsx';

const LINE_OPTIONS = [1, 2, 3, 4];
const RECORDS_PER_PAGE = 100;

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [applied, setApplied] = useState(false);

  async function fetchHistory(params = {}) {
    setLoading(true);
    try {
      const data = await api.getHistory(params);
      // Ordenar por fecha/hora de inicio descendente, luego por id descendente
      const sorted = (data.history || []).sort((a, b) => {
        const da = new Date(a.fh_i || a.fh_d || 0);
        const db = new Date(b.fh_i || b.fh_d || 0);
        if (db - da !== 0) return db - da;
        return b.id - a.id;
      });
      setHistory(sorted);
      setTotal(sorted.length);
    } catch (e) {
      setHistory([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Inicial: historial general
  useEffect(() => {
    fetchHistory({ limit: 5000 });
    setApplied(false);
    setPage(1);
  }, []);

  // Cuando se aplica filtro
  function onApplyFilters(e) {
    e && e.preventDefault();
    const params = {};
    if (line) params.line = line;
    if (from) params.from = from;
    if (to) params.to = to;
    fetchHistory(params);
    setApplied(!!(line || from || to));
    setPage(1);
  }

  // Paginación
  const totalPages = Math.ceil(total / RECORDS_PER_PAGE);
  const paginated = history.slice((page - 1) * RECORDS_PER_PAGE, page * RECORDS_PER_PAGE);

  // Agrupar por línea solo si hay filtro de línea
  const grouped = line
    ? paginated.reduce((acc, reg) => {
        acc[reg.linea] = acc[reg.linea] || [];
        acc[reg.linea].push(reg);
        return acc;
      }, {})
    : null;

  function exportToExcel() {
    const data = history.map(reg => ({
      'ID': reg.id,
      'Línea': reg.linea,
      'Stencil': reg.stencil || '',
      'Inicio': formatDateTime(reg.fh_i),
      'Fin': formatDateTime(reg.fh_d),
      'Duración': calculateDuration(reg.fh_i, reg.fh_d),
      'Iniciado por': reg.usuario || '',
      'Detenido por': reg.usuario1 || '',
      'Estado': reg.fh_d ? 'Completado' : 'En curso'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial Stencil');
    ws['!cols'] = [
      { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 12 }
    ];
    const fileName = `historial_stencil_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  function calculateDuration(fh_i, fh_d) {
    if (!fh_i || !fh_d) return '-';
    const start = new Date(fh_i);
    const end = new Date(fh_d);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Historial de Ciclos</h1>
            <p className="text-slate-400 mt-2">
              {total} registros encontrados
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Excel
            </button>
            <a
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              ← Regresar
            </a>
          </div>
        </div>
        {/* Filtros minimalistas */}
        <form className="mt-6 flex flex-wrap gap-4 items-end" onSubmit={onApplyFilters}>
          <div>
            <label className="block text-slate-300 text-xs mb-1">Línea</label>
            <select value={line} onChange={e => setLine(e.target.value)} className="bg-slate-800 text-white rounded px-3 py-2">
              <option value="">Todas</option>
              {LINE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-300 text-xs mb-1">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-slate-800 text-white rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-slate-300 text-xs mb-1">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-slate-800 text-white rounded px-3 py-2" />
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">Buscar</button>
        </form>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden mt-4">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              Cargando historial...
            </div>
          ) : total === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay registros disponibles
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Si hay filtro de línea, mostrar agrupado, si no, tabla general paginada */}
              {line ? (
                Object.keys(grouped).sort().map(linea => (
                  <div key={linea} className="mb-8">
                    <h2 className="text-lg font-bold text-white mb-2">Línea {linea}</h2>
                    <table className="w-full mb-2">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Stencil</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Inicio</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fin</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Duración</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Iniciado por</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Detenido por</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {grouped[linea].map(reg => (
                          <tr key={reg.id} className="hover:bg-slate-700 transition">
                            <td className="px-4 py-3 text-sm text-slate-300">{reg.id}</td>
                            <td className="px-4 py-3 text-sm text-white font-mono">{reg.stencil || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-300">{formatDateTime(reg.fh_i)}</td>
                            <td className="px-4 py-3 text-sm text-slate-300">{formatDateTime(reg.fh_d)}</td>
                            <td className="px-4 py-3 text-sm text-slate-300 font-mono">{calculateDuration(reg.fh_i, reg.fh_d)}</td>
                            <td className="px-4 py-3 text-sm text-green-400">{reg.usuario || '-'}</td>
                            <td className="px-4 py-3 text-sm text-red-400">{reg.usuario1 || '-'}</td>
                            <td className="px-4 py-3">
                              {reg.fh_d ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500 bg-opacity-20 text-green-400">Completado</span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500 bg-opacity-20 text-blue-400 animate-pulse">En curso</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Línea</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Stencil</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Inicio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Duración</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Iniciado por</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Detenido por</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {paginated.map(reg => (
                      <tr key={reg.id} className="hover:bg-slate-700 transition">
                        <td className="px-4 py-3 text-sm text-slate-300">{reg.id}</td>
                        <td className="px-4 py-3 text-sm text-white font-medium">Línea {reg.linea}</td>
                        <td className="px-4 py-3 text-sm text-white font-mono">{reg.stencil || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{formatDateTime(reg.fh_i)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{formatDateTime(reg.fh_d)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 font-mono">{calculateDuration(reg.fh_i, reg.fh_d)}</td>
                        <td className="px-4 py-3 text-sm text-green-400">{reg.usuario || '-'}</td>
                        <td className="px-4 py-3 text-sm text-red-400">{reg.usuario1 || '-'}</td>
                        <td className="px-4 py-3">
                          {reg.fh_d ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500 bg-opacity-20 text-green-400">Completado</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500 bg-opacity-20 text-blue-400 animate-pulse">En curso</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* Paginación */}
              {!line && totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">««</button>
                  <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">‹ Anterior</button>
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button key={pageNum} onClick={() => setPage(pageNum)} className={`px-4 py-2 rounded-lg transition ${page === pageNum ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>{pageNum}</button>
                      );
                    })}
                  </div>
                  <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">Siguiente ›</button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">»»</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
