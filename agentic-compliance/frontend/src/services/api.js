const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    ...options.headers,
  };

  // When sending FormData (e.g., PDF file uploads), the browser automatically
  // appends the boundary header, so we omit Content-Type in that case.
  if (!(options.body instanceof FormData)) {
    if (options.body instanceof URLSearchParams) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (options.body !== undefined && options.body !== null) {
      headers['Content-Type'] = 'application/json';
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'An error occurred during the API request.');
  }

  // Handle binary data download, otherwise parse JSON
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('text/markdown') || contentType.includes('application/pdf'))) {
    return response;
  }
  
  return response.json();
}
