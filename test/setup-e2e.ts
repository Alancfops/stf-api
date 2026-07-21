import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const E2E_DB_NAME = 'senior_test_e2e';

function loadEnvFile() {
  const envPath = resolve(__dirname, '../.env');
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

process.env.MAIL_PROVIDER = 'console';
process.env.RESEND_API_KEY = '';
process.env.MAIL_FROM = 'Senior Teste Funcional <no-reply@localhost>';

const devDatabaseUrl = process.env.DATABASE_URL;
if (!devDatabaseUrl) {
  throw new Error('Defina DATABASE_URL em backend/.env antes de rodar npm run test:e2e.');
}

const e2eDatabaseUrl = devDatabaseUrl.includes(`/${E2E_DB_NAME}`)
  ? devDatabaseUrl
  : devDatabaseUrl.replace(/\/senior_test(\?|$)/, `/${E2E_DB_NAME}$1`);

if (!e2eDatabaseUrl.includes(`/${E2E_DB_NAME}`)) {
  throw new Error(
    `test:e2e bloqueado: DATABASE_URL deve apontar para ${E2E_DB_NAME} (banco isolado).`,
  );
}

if (e2eDatabaseUrl === devDatabaseUrl && !devDatabaseUrl.includes(`/${E2E_DB_NAME}`)) {
  throw new Error(
    'test:e2e bloqueado: não use o banco de desenvolvimento (senior_test). Rode npm run test:e2e:prepare.',
  );
}

process.env.DATABASE_URL = e2eDatabaseUrl;
