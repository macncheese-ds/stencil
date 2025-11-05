import React, { useEffect, useState, useRef } from 'react'
import * as api from '../api'

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
  const [authLookedUp, setAuthLookedUp] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
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
    // No auth needed for start, just call onStart directly
    await onStart(idx, stencilInput);
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
    setShowAuthModal(false);
    if (pendingAction === 'stop') {
      await onStop(idx, authUser, authPass);
    } else if (pendingAction === 'reset') {
      await onReset(idx, authUser, authPass);
    }
    setPendingAction(null);
    setAuthUser('');
    setAuthPass('');
    setAuthLookedUp(null);
    setAuthError('');
  }

  async function handleAuthLookup() {
    if (!authUser.trim()) {
      setAuthError('Por favor ingresa el gafete');
      return;
    }
    
    setAuthLoading(true);
    setAuthError('');
    setAuthLookedUp(null);
    
    try {
      // Mock lookup - in real implementation, call backend
      // For now, just store the usuario and ask for password
      setAuthLookedUp({ usuario: authUser });
    } catch (e) {
      setAuthError('Usuario no encontrado');
      setAuthLookedUp(null);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleAuthReset() {
    setAuthUser('');
    setAuthPass('');
    setAuthLookedUp(null);
    setAuthError('');
  }

  function handleAuthUserKeyPress(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAuthLookup();
    }
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
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Autenticación</h3>
            <p className="text-slate-500 text-sm mb-6">Confirma tu identidad</p>
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Gafete Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gafete / Usuario</label>
                <div className="relative">
                  <input
                    type="text"
                    value={authUser}
                    onChange={e => setAuthUser(e.target.value)}
                    onBlur={!authLookedUp ? handleAuthLookup : undefined}
                    onKeyPress={handleAuthUserKeyPress}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900 placeholder-slate-400"
                    placeholder="Ingresa tu gafete"
                    disabled={!!authLookedUp || authLoading}
                    autoFocus
                    required
                  />
                  {authLoading && (
                    <div className="absolute right-3 top-2.5">
                      <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* User Found Info */}
              {authLookedUp && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-green-700 font-medium">Usuario encontrado</span>
                      </div>
                      <div className="font-bold text-slate-900">{authLookedUp.usuario}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAuthReset}
                      className="text-slate-500 hover:text-slate-700 text-sm underline transition-colors"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              )}

              {/* Password Input (only if user found) */}
              {authLookedUp && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                  <input
                    type="password"
                    value={authPass}
                    onChange={e => setAuthPass(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900 placeholder-slate-400"
                    placeholder="••••••••"
                    required
                    autoFocus
                  />
                </div>
              )}

              {/* Error Message */}
              {authError && (
                <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {authError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setPendingAction(null);
                    handleAuthReset();
                  }}
                  className="flex-1 px-4 py-2 border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                {!authLookedUp ? (
                  <button
                    type="button"
                    onClick={handleAuthLookup}
                    disabled={authLoading || !authUser.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? 'Buscando...' : 'Buscar'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!authPass}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
