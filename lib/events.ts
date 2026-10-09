// Aviso mínimo de "han cambiado los datos": el + de registrar es un panel encima de la pantalla actual,
// así que la pantalla no pierde el foco y no recargaría sola. Las pantallas se suscriben y recargan.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onDataChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDataChanged() {
  listeners.forEach((l) => l());
}
