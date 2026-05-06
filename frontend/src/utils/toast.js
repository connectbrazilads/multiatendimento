/**
 * Sistema de toast imperativo — sem Context, sem props drilling.
 * Uso: import { toast } from '../utils/toast';
 *      toast.success('Salvo!');
 *      toast.error('Erro ao salvar');
 *      toast.info('Mensagem agendada');
 *      toast.confirm('Encerrar atendimento?', onConfirm, onCancel?);
 */

let _addToast = null;
let _addConfirm = null;

export function _setHandlers(addToast, addConfirm) {
  _addToast = addToast;
  _addConfirm = addConfirm;
}

function show(message, type = 'info', duration = 4000) {
  if (_addToast) _addToast({ id: Date.now(), message, type, duration });
}

export const toast = {
  success: (msg, duration) => show(msg, 'success', duration),
  error: (msg, duration) => show(msg, 'error', duration ?? 6000),
  info: (msg, duration) => show(msg, 'info', duration),
  warning: (msg, duration) => show(msg, 'warning', duration),
  confirm: (message, onConfirm, onCancel) => {
    if (_addConfirm) {
      _addConfirm({ message, onConfirm, onCancel });
    } else {
      // Fallback para ambientes sem ToastContainer montado
      if (window.confirm(message)) onConfirm?.();
      else onCancel?.();
    }
  },
};
