import React, { useEffect, useState, useRef } from 'react'

const MS_PER_HOUR = 3600 * 1000;

function formatTdSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function Line({ idx, info = { running: false }, onStart, onStop, onReset, hours = 8 }) {
  const running = info.running;
  const stencil = info.stencil || '';
  const startTimeMs = info.start_time || null;

  const [now, setNow] = useState(Date.now());
  const [stencilInput, setStencilInput] = useState(stencil);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'start', 'stop', or 'reset'
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    setStencilInput(stencil);
  }, [stencil]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setNow(Date.now()), 500);
      return () => clearInterval(timerRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [running]);

  let elapsedMs = 0;
  if (running && startTimeMs) {
    elapsedMs = Math.max(0, now - startTimeMs);
  }
  const targetMs = hours * MS_PER_HOUR;
  const pct = Math.min(100, Math.round((elapsedMs / targetMs) * 100));
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const displayTime = running ? formatTdSeconds(elapsedSeconds) : '00:00:00';
  const isCompleted = running && elapsedMs >= targetMs;

  async function handleIniciar() {
    if (!stencilInput.trim()) {
      alert('Por favor ingresa el número de stencil');
      return;
    }
    setPendingAction('start');
    setShowConfirmModal(true);
  }

  async function handleDetener() {
    setPendingAction('stop');
    setShowConfirmModal(true);
  }

  async function handleReiniciar() {
    setPendingAction('reset');
    setShowConfirmModal(true);
  }

  async function handleConfirm() {
    setShowConfirmModal(false);
    setShowAuthModal(true);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    // TODO: Call backend to authenticate authUser/authPass, then pass user info to action
    setShowAuthModal(false);
    if (pendingAction === 'start') {
      await onStart(idx, stencilInput, authUser);
    } else if (pendingAction === 'stop') {
      await onStop(idx, authUser);
    } else if (pendingAction === 'reset') {
      await onReset(idx, authUser);
    }
    setPendingAction(null);
    setAuthUser('');
    setAuthPass('');
  }

  return (
    <div className={`rounded-xl shadow-lg p-6 transition ${
      running ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
      isCompleted ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
      'bg-gradient-to-br from-slate-700 to-slate-800'
    } text-white`}>
      
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold">Línea {idx + 1}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            running ? 'bg-blue-500 bg-opacity-30' :
            isCompleted ? 'bg-amber-500 bg-opacity-30' :
            'bg-slate-600 bg-opacity-30'
          }`}>
            {running ? '🔴 Ejecutando' : isCompleted ? '⏱️ Completado' : '⚪ Detenido'}
          </span>
        </div>
        {running && stencil && <p className="text-blue-100 text-sm">Stencil: {stencil}</p>}
      </div>

      {/* Stencil Input */}
      <div className="mb-4">
        <input
          type="text"
          value={stencilInput}
          onChange={(e) => setStencilInput(e.target.value)}
          placeholder="No. de Stencil"
          disabled={running}
          className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Timer Display */}
      <div className="mb-4 p-4 bg-white bg-opacity-10 rounded-lg">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold mb-2">{displayTime}</div>
          <div className="text-sm text-gray-200">
            / {String(hours).padStart(2, '0')}:00:00
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-white transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-200">
          Progreso: {pct}%
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {!running && !isCompleted && (
          <button
            onClick={handleIniciar}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
          >
            Iniciar
          </button>
        )}
        {running && (
          <button
            onClick={handleDetener}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
          >
            Detener
          </button>
        )}
        {isCompleted && (
          <button
            onClick={handleReiniciar}
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
          >
            Reiniciar
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {pendingAction === 'start' && '¿Iniciar ciclo?'}
              {pendingAction === 'stop' && '¿Pausar ciclo?'}
              {pendingAction === 'reset' && '¿Reiniciar ciclo?'}
            </h3>
            <p className="text-slate-600 mb-6">
              {pendingAction === 'start' && `Iniciarás el conteo para stencil ${stencilInput}`}
              {pendingAction === 'stop' && 'Se pausará el conteo del ciclo actual'}
              {pendingAction === 'reset' && 'Se reiniciará el ciclo completado'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingAction(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Autenticación requerida</h3>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Gafete</label>
                <input
                  type="text"
                  value={authUser}
                  onChange={e => setAuthUser(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Gafete"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={authPass}
                  onChange={e => setAuthPass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contraseña"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setPendingAction(null);
                    setAuthUser('');
                    setAuthPass('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  Autenticar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
