const { execSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');

const E2E_DB_NAME = 'senior_test_e2e';

function loadEnvFile() {
  const envPath = resolve(__dirname, '../.env');
  if (!existsSync(envPath)) {
    throw new Error('backend/.env não encontrado. Rode make setup.');
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

    process.env[key] = value;
  }
}

loadEnvFile();

const devDatabaseUrl = process.env.DATABASE_URL;
if (!devDatabaseUrl) {
  throw new Error('DATABASE_URL ausente em backend/.env');
}

const e2eDatabaseUrl = devDatabaseUrl.replace(/\/senior_test(\?|$)/, `/${E2E_DB_NAME}$1`);
if (!e2eDatabaseUrl.includes(`/${E2E_DB_NAME}`)) {
  throw new Error(`Não foi possível derivar DATABASE_URL para ${E2E_DB_NAME}.`);
}

try {
  execSync('docker exec senior-test-postgres psql -U senior -d postgres -tc "SELECT 1"', {
    stdio: 'ignore',
  });
  execSync(
    `docker exec senior-test-postgres psql -U senior -d postgres -c "CREATE DATABASE ${E2E_DB_NAME};"`,
    { stdio: 'ignore' },
  );
} catch {
  console.log(`>> Banco ${E2E_DB_NAME} já existe ou Docker indisponível — seguindo com migrate.`);
}

execSync('npx prisma migrate deploy', {
  cwd: resolve(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: e2eDatabaseUrl,
  },
});

console.log(`>> Banco E2E pronto: ${E2E_DB_NAME}`);
