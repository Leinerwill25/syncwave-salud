/**
 * Cliente OAuth2 para Bancaribe API Manager (WSO2)
 * Maneja obtención y caché de tokens Bearer
 */

interface BancaribeToken {
  access_token: string;
  expires_in: number;
  obtained_at: number;
}

let cachedToken: BancaribeToken | null = null;

function isTokenValid(token: BancaribeToken): boolean {
  const elapsed = (Date.now() - token.obtained_at) / 1000;
  return elapsed < token.expires_in - 60; // margen de 60 seg
}

export async function getBancaribeToken(): Promise<string> {
  if (cachedToken && isTokenValid(cachedToken)) {
    return cachedToken.access_token;
  }

  const consumerKey = process.env.BANCARIBE_CONSUMER_KEY!;
  const consumerSecret = process.env.BANCARIBE_CONSUMER_SECRET!;
  const tokenUrl = process.env.BANCARIBE_TOKEN_URL!;

  if (!consumerKey || !consumerSecret || !tokenUrl) {
    throw new Error('Faltan variables de entorno de Bancaribe (BANCARIBE_CONSUMER_KEY, BANCARIBE_CONSUMER_SECRET o BANCARIBE_TOKEN_URL)');
  }

  // Las credenciales viajan en Base64 según especificación Bancaribe
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Bancaribe auth error: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    access_token: data.access_token,
    expires_in: data.expires_in,
    obtained_at: Date.now(),
  };

  return cachedToken.access_token;
}

export async function bancaribeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getBancaribeToken();
  const baseUrl = process.env.BANCARIBE_API_BASE_URL!;

  if (!baseUrl) {
    throw new Error('Falta la variable de entorno BANCARIBE_API_BASE_URL');
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bancaribe API error ${response.status}: ${error}`);
  }

  return response.json();
}
