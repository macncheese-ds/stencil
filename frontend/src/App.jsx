import React, { useEffect, useState } from 'react'
import * as api from './api'
import Line from './components/Line'


export default function App() {
  const [lines, setLines] = useState([]);
  const [hours, setHours] = useState(8);
  // No login required



  async function fetchLines() {
    try {
      const data = await api.getLines();
      const serverLines = data.lines || [];
      const filled = [];
      for (let i = 0; i < 4; i++) {
        filled.push(serverLines[i] || { running: false });
      }
      setLines(filled);
      setHours(data.hours || 8);
    } catch (e) {
      console.error('fetchLines error:', e);
    }
  }

  useEffect(() => { fetchLines(); const t = setInterval(fetchLines, 3000); return () => clearInterval(t); }, []);



  async function onStart(idx, stencil, usuario, nombre, password) {
    try {
      await api.startLine(idx, stencil, usuario, nombre, password);
      fetchLines();
    } catch (e) {
      throw e; // Let the component handle the error
    }
  }

  async function onStop(idx, usuario, nombre, password) {
    try {
      await api.stopLine(idx, usuario, nombre, password);
      fetchLines();
    } catch (e) {
      alert(e.response?.data?.error || 'Error stopping line');
    }
  }

  return (
    <>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Control de Stencil</h1>
              <p className="text-slate-400 mt-2">Gestión de líneas de producción</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a
                href="/tensions"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Tensiones
              </a>
              <a
                href="/history"
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ver Historial
              </a>
            </div>
          </div>
        </div>

        {/* Lines Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Line
                key={i}
                idx={i}
                info={lines[i] || { running: false }}
                onStart={onStart}
                onStop={onStop}
                hours={hours}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
