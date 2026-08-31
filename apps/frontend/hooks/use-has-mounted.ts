import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

// True only once the client has hydrated. Used to defer any decision that
// depends on browser-only state (localStorage, window) so the server and
// the client's first render pass produce identical output.
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
