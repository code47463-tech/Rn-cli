'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const tsx = a.language === 'typescript' ? 'tsx' : 'js';
  const dir = path.join(a.targetDir, 'src/store');

  if (a.stateManagement.includes('redux-toolkit')) {
    await fs.writeFile(
      path.join(dir, `authSlice.${ext}`),
      `import { createSlice, PayloadAction } from '@reduxjs/toolkit';

${a.language === 'typescript' ? "export interface AuthState {\n  user: { id: string; email: string } | null;\n  accessToken: string | null;\n  refreshToken: string | null;\n  status: 'idle' | 'authenticating' | 'authenticated' | 'error';\n}\n\n" : ''}const initialState${a.language === 'typescript' ? ': AuthState' : ''} = {
  user: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signInStart(state) {
      state.status = 'authenticating';
    },
    signInSuccess(state, action${a.language === 'typescript' ? ": PayloadAction<{ user: AuthState['user']; accessToken: string; refreshToken: string }>" : ''}) {
      state.status = 'authenticated';
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    tokensRefreshed(state, action${a.language === 'typescript' ? ": PayloadAction<{ accessToken: string; refreshToken: string }>" : ''}) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    signOut(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
    },
    authError(state) {
      state.status = 'error';
    },
  },
});

export const { signInStart, signInSuccess, tokensRefreshed, signOut, authError } = authSlice.actions;
export default authSlice.reducer;
`
    );

    const persistImport = a.stateManagement.includes('redux-persist')
      ? `import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorageAdapter from './persistStorageAdapter';
`
      : '';

    await fs.writeFile(
      path.join(dir, `store.${ext}`),
      `import { configureStore, combineReducers } from '@reduxjs/toolkit';
${persistImport}import authReducer from './authSlice';

const rootReducer = combineReducers({
  auth: authReducer,
});

${
  a.stateManagement.includes('redux-persist')
    ? `const persistConfig = {
  key: 'root',
  storage: AsyncStorageAdapter,
  whitelist: ['auth'], // only persist auth slice; keep transient UI state out of storage
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);
`
    : `export const store = configureStore({
  reducer: rootReducer,
});
`
}
${a.language === 'typescript' ? '\nexport type RootState = ReturnType<typeof rootReducer>;\nexport type AppDispatch = typeof store.dispatch;\n' : ''}`
    );

    if (a.stateManagement.includes('redux-persist')) {
      await fs.writeFile(
        path.join(dir, `persistStorageAdapter.${ext}`),
        `/**
 * Adapts MMKV (sync, fast) to the async Storage interface redux-persist expects.
 * Using MMKV instead of AsyncStorage for persistence: much faster reads/writes.
 */
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'redux-persist-storage' });

const persistStorageAdapter = {
  setItem(key${a.language === 'typescript' ? ': string' : ''}, value${a.language === 'typescript' ? ': string' : ''}) {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  getItem(key${a.language === 'typescript' ? ': string' : ''}) {
    const value = storage.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem(key${a.language === 'typescript' ? ': string' : ''}) {
    storage.delete(key);
    return Promise.resolve();
  },
};

export default persistStorageAdapter;
`
      );
    }
  }

  if (a.stateManagement.includes('zustand')) {
    await fs.writeFile(
      path.join(dir, `useAppStore.${ext}`),
      `import { create } from 'zustand';

${a.language === 'typescript' ? "interface AppState {\n  isOnline: boolean;\n  setOnline: (online: boolean) => void;\n}\n\n" : ''}const useAppStore = create${a.language === 'typescript' ? '<AppState>' : ''}((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),
}));

export default useAppStore;
`
    );
  }

  if (a.stateManagement.includes('react-query')) {
    await fs.writeFile(
      path.join(dir, `queryClient.${ext}`),
      `import { QueryClient } from '@tanstack/react-query';

/**
 * Central React Query client. Server state (API data) lives here;
 * client/app state lives in Redux/Zustand/Context above. Keeping the two
 * separated avoids duplicating cache invalidation logic.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default queryClient;
`
    );
  }

  if (a.stateManagement.includes('context')) {
    await fs.writeFile(
      path.join(dir, `AppContext.${tsx}`),
      `import React, { createContext, useContext, useMemo, useState } from 'react';

${
  a.language === 'typescript'
    ? "interface AppContextValue {\n  theme: 'light' | 'dark';\n  toggleTheme: () => void;\n}\n\nconst AppContext = createContext<AppContextValue | undefined>(undefined);\n\nexport function AppProvider({ children }: { children: React.ReactNode }) {\n"
    : "const AppContext = createContext(undefined);\n\nexport function AppProvider({ children }) {\n"
}  const [theme, setTheme] = useState${a.language === 'typescript' ? "<'light' | 'dark'>" : ''}('light');

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
`
    );
  }
}

module.exports = { run };
