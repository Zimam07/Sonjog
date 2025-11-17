let _socket = null;

export function setSocketInstance(socket) {
  _socket = socket;
}

export function getSocketInstance() {
  return _socket;
}

export function clearSocketInstance() {
  if (_socket && typeof _socket.close === 'function') {
    try { _socket.close(); } catch (e) { /* ignore */ }
  }
  _socket = null;
}

export default {
  setSocketInstance,
  getSocketInstance,
  clearSocketInstance,
};
