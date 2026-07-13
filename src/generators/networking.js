'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const dir = path.join(a.targetDir, 'src/services/api');
  const isTs = a.language === 'typescript';

  await fs.writeFile(
    path.join(dir, `httpClient.${ext}`),
    `import axios${isTs ? ', { AxiosError, AxiosInstance, InternalAxiosRequestConfig }' : ''} from 'axios';
import env from '../../config/env';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../security/tokenStorage';

/**
 * Single Axios instance for the whole app. Feature-level API modules
 * (see repositoryPattern example below) should import this instead of
 * calling axios directly, so auth headers/retries/timeouts stay consistent.
 */
const httpClient${isTs ? ': AxiosInstance' : ''} = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: env.API_TIMEOUT_MS,
});

httpClient.interceptors.request.use(async (config${isTs ? ': InternalAxiosRequestConfig' : ''}) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue${isTs ? ': Array<() => void>' : ''} = [];

/**
 * On 401, attempt exactly one token refresh and replay queued requests.
 * If refresh also fails, clear tokens and let the app route back to auth.
 */
httpClient.interceptors.response.use(
  (response) => response,
  async (error${isTs ? ': AxiosError' : ''}) => {
    const originalRequest = error.config${isTs ? ' as (InternalAxiosRequestConfig & { _retry?: boolean })' : ''};

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(httpClient(originalRequest)));
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token available');

      const { data } = await axios.post(\`\${env.API_BASE_URL}/auth/refresh\`, { refreshToken });
      await setTokens(data.accessToken, data.refreshToken);

      pendingQueue.forEach((replay) => replay());
      pendingQueue = [];

      return httpClient(originalRequest);
    } catch (refreshError) {
      await clearTokens();
      pendingQueue = [];
      // Emit a global event here (e.g. via an event bus) so navigation can
      // redirect to the Auth stack. Left as an integration point.
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default httpClient;
`
  );

  await fs.writeFile(
    path.join(dir, `retry.${ext}`),
    `/**
 * Simple exponential-backoff retry wrapper for one-off calls that need
 * more resilience than the default interceptor retry (e.g. background sync).
 */
export async function withRetry${isTs ? '<T>' : ''}(
  fn${isTs ? ': () => Promise<T>' : ''},
  { retries = 3, baseDelayMs = 500 }${isTs ? ': { retries?: number; baseDelayMs?: number }' : ''} = {}
)${isTs ? ': Promise<T>' : ''} {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
`
  );

  await fs.writeFile(
    path.join(dir, `exampleRepository.${ext}`),
    `import httpClient from './httpClient';

${
  isTs
    ? 'export interface Profile {\n  id: string;\n  name: string;\n  email: string;\n}\n\nexport interface ProfileRepository {\n  getProfile(): Promise<Profile>;\n  updateProfile(patch: Partial<Profile>): Promise<Profile>;\n}\n\n'
    : ''
}/**
 * Repository Pattern: screens/viewmodels depend on this interface, never on
 * httpClient directly. Swapping the data source (REST -> GraphQL -> mock)
 * only requires changing this file.
 */
const profileRepository${isTs ? ': ProfileRepository' : ''} = {
  async getProfile() {
    const { data } = await httpClient.get('/profile/me');
    return data;
  },
  async updateProfile(patch) {
    const { data } = await httpClient.patch('/profile/me', patch);
    return data;
  },
};

export default profileRepository;
`
  );
}

module.exports = { run };
