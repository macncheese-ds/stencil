import React, { useEffect, useState } from 'react';
import * as api from '../api';
import * as XLSX from 'xlsx';

export default function History() {
  const [registros, setRegistros] = useState([]);
  const [allRegistros, setAllRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 100;

  async function fetchLogs() {
    try {
      setLoading(true);
      const data = await api.getLogs(5000); // Get more records
      const all = data.registros || [];
      setAllRegistros(all);
      setTotalRecords(all.length);
      // Show first page
      setRegistros(all.slice(0, recordsPerPage));
      setCurrentPage(1);
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  // Calculate total pages
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  // Handle page change
  function goToPage(page) {
    const start = (page - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    setRegistros(allRegistros.slice(start, end));
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Export to Excel
  function exportToExcel() {
    // Prepare data for export
    const data = allRegistros.map(reg => ({
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

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial Stencil');

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // ID
      { wch: 8 },  // Línea
      { wch: 10 }, // Stencil
      { wch: 20 }, // Inicio
      { wch: 20 }, // Fin
      { wch: 15 }, // Duración
      { wch: 30 }, // Iniciado por
      { wch: 30 }, // Detenido por
      { wch: 12 }  // Estado
    ];

    // Generate filename with date
    const fileName = `historial_stencil_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
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
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Historial de Ciclos</h1>
            <p className="text-slate-400 mt-2">
              {totalRecords} registros totales • Página {currentPage} de {totalPages}
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
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              Cargando historial...
            </div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay registros disponibles
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {registros.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-700 transition">
                      <td className="px-4 py-3 text-sm text-slate-300">{reg.id}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        Línea {reg.linea}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {reg.stencil || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {formatDateTime(reg.fh_i)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {formatDateTime(reg.fh_d)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {calculateDuration(reg.fh_i, reg.fh_d)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-400">
                        {reg.usuario || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-400">
                        {reg.usuario1 || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {reg.fh_d ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500 bg-opacity-20 text-green-400">
                            Completado
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500 bg-opacity-20 text-blue-400 animate-pulse">
                            En curso
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ««
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ‹ Anterior
            </button>
            
            {/* Page numbers */}
            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-4 py-2 rounded-lg transition ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              »»
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
