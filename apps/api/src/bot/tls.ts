import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tls from 'node:tls';
import { Agent, fetch as undiciFetch } from 'undici';
import type { ClientOptions } from '@maxhub/max-bot-api';

const bundle = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../certs/russian-trusted-ca-bundle.pem',
);

/** TLS с корневым CA Минцифры для platform-api2.max.ru */
export function maxClientOptions(): ClientOptions {
  if (!existsSync(bundle)) return {};
  const ca = [readFileSync(bundle, 'utf8'), ...tls.rootCertificates];
  const agent = new Agent({
    connect: { ca, rejectUnauthorized: true },
  });
  return {
    fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
      undiciFetch(input as string | URL, {
        ...(init as object),
        dispatcher: agent,
      })) as ClientOptions['fetch'],
  };
}
