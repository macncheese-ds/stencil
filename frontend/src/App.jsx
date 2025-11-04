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



  async function onStart(idx, stencil) {
    try {
      await api.startLine(idx, stencil);
      fetchLines();
    } catch (e) {
      alert(e.response?.data?.error || 'Error starting line');
    }
  }

  async function onStop(idx) {
    try {
      await api.stopLine(idx);
      fetchLines();
    } catch (e) {
      alert(e.response?.data?.error || 'Error stopping line');
    }
  }

  async function onReset(idx) {
    try {
      await api.resetLine(idx);
      fetchLines();
    } catch (e) {
      alert(e.response?.data?.error || 'Error resetting line');
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
                onReset={onReset}
                hours={hours}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
