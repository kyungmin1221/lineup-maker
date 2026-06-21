import { useState, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg, duration = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(""), duration);
  }, []);

  return { toast, showToast };
}
