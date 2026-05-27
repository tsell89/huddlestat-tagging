import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initDatabase } from "@/lib/db";

type DbContextValue = {
  ready: boolean;
  error: string | null;
};

const DbContext = createContext<DbContextValue>({ ready: false, error: null });

export function DbProvider({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initDatabase()
      .then(() => setReady(true))
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  if (error) {
    return null;
  }

  if (!ready) {
    return <>{fallback}</>;
  }

  return (
    <DbContext.Provider value={{ ready, error }}>{children}</DbContext.Provider>
  );
}

export function useDbReady() {
  return useContext(DbContext);
}
