import React, { useState, useEffect } from 'react'
import * as api from '../api'

/**
 * Modal for registering new tension measurements
 * Reuses the same authentication UX pattern from Line.jsx
 */
export default function RegisterTensionModal({ show, onClose, onSuccess }) {
  const [stencilId, setStencilId] = useState('');
  const [stencilModel, setStencilModel] = useState('');
  const [da, setDa] = useState('');
  const [db, setDb] = useState('');
  const [dc, setDc] = useState('');
  const [dd, setDd] = useState('');
  const [de, setDe] = useState('');
  
  // Auth fields (reusing existing auth UX)
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authLookedUp, setAuthLookedUp] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-lookup stencil model when id changes
  useEffect(() => {
    if (!stencilId.trim()) {
      setStencilModel('');
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        const stencil = await api.getStencil(stencilId);
        setStencilModel(stencil.model || '');
      } catch (e) {
        setStencilModel('(No encontrado)');
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [stencilId]);

  async function handleAuthLookup() {
    if (!authUser.trim()) {
      setAuthError('Por favor ingresa el gafete');
      return;
    }
    
    setAuthLoading(true);
    setAuthError('');
    setAuthLookedUp(null);
    
    try {
      const userData = await api.lookupUser(authUser.trim());
      console.log('🔍 Lookup result:', userData);
      setAuthLookedUp(userData);
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

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate required fields
    if (!stencilId.trim()) {
      setSubmitError('El número de stencil es obligatorio');
      return;
    }
    
    if (!authLookedUp) {
      setAuthError('Por favor busca tu usuario primero');
      return;
    }
    
    if (!authPass) {
      setAuthError('La contraseña es obligatoria');
      return;
    }
    
    // Validate numeric values
    const values = [da, db, dc, dd, de];
    for (const v of values) {
      if (v && isNaN(parseFloat(v))) {
        setSubmitError('Los valores da..de deben ser numéricos');
        return;
      }
    }
    
    setSubmitting(true);
    setSubmitError('');
    
    try {
      // Helper to parse numeric values
      // - empty -> null (backend will treat as NULL)
      // - accepts '60' meaning 0.60 (divide by 100 for large magnitudes)
      const parseValue = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        // Accept comma as decimal separator
        const raw = String(val).trim().replace(',', '.');
        const num = parseFloat(raw);
        if (Number.isNaN(num)) return null;
        const abs = Math.abs(num);
        // If the user typed a whole number like 60, interpret as 0.60
        const normalized = abs > 10 ? (num / 100) : num;
        // Round to 2 decimals
        return Math.round(normalized * 100) / 100;
      };

      const data = {
        numero: parseInt(stencilId),
        da: parseValue(da),
        db: parseValue(db),
        dc: parseValue(dc),
        dd: parseValue(dd),
        de: parseValue(de),
        num_empleado: authUser.trim(),
        password: authPass
      };
      
      console.log('📤 Enviando datos:', { ...data, password: '***' });
      
      await api.postTension(data);
      
      // Success - reset and notify parent
      resetForm();
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error('Error completo:', error.response);
      console.error('Error data:', error.response?.data);
      const errMsg = error.response?.data?.error || 'Error al registrar tensión';
      if (errMsg.includes('credentials') || errMsg.includes('password')) {
        setAuthError('Contraseña incorrecta');
      } else {
        setSubmitError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setStencilId('');
    setStencilModel('');
    setDa('');
    setDb('');
    setDc('');
    setDd('');
    setDe('');
    handleAuthReset();
    setSubmitError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Registrar Nueva Tensión</h3>
            <p className="text-slate-500 text-sm mt-1">Ingresa las mediciones del stencil</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stencil ID and Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número Stencil <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={stencilId}
                onChange={e => setStencilId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900"
                placeholder="Número"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Modelo</label>
              <input
                type="text"
                value={stencilModel}
                readOnly
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                placeholder="Se autocompleta"
              />
            </div>
          </div>

          {/* Tension Measurements (da..de) */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Mediciones (kg/cm²)</h4>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Da</label>
                <input
                  type="number"
                  step="0.01"
                  value={da}
                  onChange={e => setDa(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Db</label>
                <input
                  type="number"
                  step="0.01"
                  value={db}
                  onChange={e => setDb(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dc</label>
                <input
                  type="number"
                  step="0.01"
                  value={dc}
                  onChange={e => setDc(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dd</label>
                <input
                  type="number"
                  step="0.01"
                  value={dd}
                  onChange={e => setDd(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">De</label>
                <input
                  type="number"
                  step="0.01"
                  value={de}
                  onChange={e => setDe(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Authentication Section (reused UX from Line.jsx) */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Autenticación</h4>
            
            {/* Gafete Input */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Gafete / Usuario <span className="text-red-500">*</span>
              </label>
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
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200 mb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">Usuario encontrado</span>
                    </div>
                    <div className="font-bold text-slate-900 text-lg">{authLookedUp.nombre}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      Gafete: {authLookedUp.num_empleado} • Usuario: {authLookedUp.usuario}
                    </div>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={authPass}
                  onChange={e => setAuthPass(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-900 placeholder-slate-400"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            )}

            {/* Auth Error */}
            {authError && (
              <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3 mt-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {authError}
              </div>
            )}
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {submitError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
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
                {authLoading ? 'Buscando...' : 'Buscar Usuario'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !authPass}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Registrando...' : 'Registrar Tensión'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
