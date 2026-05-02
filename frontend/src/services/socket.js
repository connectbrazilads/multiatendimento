// Helper centralizado para Socket.IO
// Em produção conecta diretamente ao backend
// Em desenvolvimento usa o proxy do Vite

export const SOCKET_URL = import.meta.env.VITE_API_URL || undefined;
// undefined = conecta no mesmo host (proxy do Vite funciona no dev)
