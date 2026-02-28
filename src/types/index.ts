export interface User {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
}

export interface Vault {
  id: string;
  name: string;
  description: string | null;
  keyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  vaultId: string;
  name: string;
  service: string;
  description: string | null;
  maskedValue: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevealedKey {
  id: string;
  value: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  keyId: string | null;
  keyName: string | null;
  vaultId: string | null;
  vaultName: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface VaultWithKeys extends Vault {
  keys: ApiKey[];
}

export interface CacheData {
  vaults: Vault[];
  keys: Record<string, ApiKey[]>;
  lastFetched: number;
}

export type ServiceIcon = {
  name: string;
  color: string;
  letter: string;
};

export const SERVICE_ICONS: Record<string, ServiceIcon> = {
  openai: { name: "OpenAI", color: "#10a37f", letter: "O" },
  stripe: { name: "Stripe", color: "#635bff", letter: "S" },
  aws: { name: "AWS", color: "#ff9900", letter: "A" },
  github: { name: "GitHub", color: "#f0f6fc", letter: "G" },
  anthropic: { name: "Anthropic", color: "#d4a574", letter: "A" },
  clerk: { name: "Clerk", color: "#6c47ff", letter: "C" },
  vercel: { name: "Vercel", color: "#ffffff", letter: "V" },
  supabase: { name: "Supabase", color: "#3ecf8e", letter: "S" },
  firebase: { name: "Firebase", color: "#ffca28", letter: "F" },
  twilio: { name: "Twilio", color: "#f22f46", letter: "T" },
  sendgrid: { name: "SendGrid", color: "#1a82e2", letter: "S" },
  cloudflare: { name: "Cloudflare", color: "#f48120", letter: "C" },
  digitalocean: { name: "DigitalOcean", color: "#0080ff", letter: "D" },
  heroku: { name: "Heroku", color: "#430098", letter: "H" },
  mongodb: { name: "MongoDB", color: "#47a248", letter: "M" },
  redis: { name: "Redis", color: "#dc382d", letter: "R" },
  default: { name: "API Key", color: "#22c55e", letter: "K" },
};

export function getServiceIcon(service: string): ServiceIcon {
  const key = service.toLowerCase().replace(/[\s\-_]/g, "");
  for (const [pattern, icon] of Object.entries(SERVICE_ICONS)) {
    if (key.includes(pattern)) {
      return icon;
    }
  }
  return {
    name: service,
    color: "#22c55e",
    letter: service.charAt(0).toUpperCase() || "K",
  };
}
