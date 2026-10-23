# Modelo de dados (conceitual e ER inicial)

Este documento **não substitui** migrations geradas pela ORM; serve para **alinhar o modelo conceitual à futura API** (ver [../backend/README.md](../backend/README.md)) e aos requisitos **RF001–RF013**.

Versão inicial pensada como **PostgreSQL normalizado**, com payloads de avaliações **semi-estruturados** até consolidar todas as restrições de instrumento por tabela física opcional posterior.

---

## 1. Princípio de segregação (`therapist_id`)

Toda leitura/escrita de paciente ou avaliação deve ser sempre **consistente com o usuário profissional autenticado** — no modelo relacionado pelo campo `Therapist`. O backend **injeta filtro obrigatório** (nunca confiar em ID de paciente vindo do cliente isoladamente para autorização).

### 1.1 Convenção `instrument_code`

| Contexto | Formato | Exemplo |
|----------|---------|---------|
| API JSON, banco (`INSTRUMENT.code`, `Assessment.instrument_code`) | **MAIÚSCULAS** | `TUG`, `KATZ`, `MEEM` |
| Pastas de código, segmentos de URL REST | **minúsculas** | `tug`, `katz`, `meem` |

Valores canônicos no seed: `TUG`, `KATZ`, `BERG`, `TINETTI`, `MEEM`.

---

## 2. Diagrama ER (conceitual)

```mermaid
erDiagram
    THERAPIST ||--o{ PATIENT : owns
    THERAPIST ||--o{ ASSESSMENT : performs
    PATIENT ||--o{ ASSESSMENT : subject
    INSTRUMENT ||--o{ ASSESSMENT : type
    ASSESSMENT ||--|| ASSESSMENT_RESULT : summarizes

    THERAPIST {
        uuid id PK
        string email UK
        string full_name
        string password_hash
        timestamptz created_at
    }

    PATIENT {
        uuid id PK
        uuid therapist_id FK
        string full_name
        smallint age
        string gender
        string contact
        text schooling_band "opcional,recom MEEM Brucki"
        string avatar_url "nullable"
        timestamptz created_at
    }

    INSTRUMENT {
        string code PK "TUG|KATZ|BERG|TINETTI|MEEM"
        string display_name
        string authors_json
        int sort_hint
    }

    ASSESSMENT {
        uuid id PK
        uuid therapist_id FK
        uuid patient_id FK
        string instrument_code FK
        text status "DRAFT|FINALIZED"
        timestamptz started_at
        timestamptz finalized_at "nullable para rascunho"
        jsonb payload "respostas bruto por tipo"
        string schooling_band_used "MEEM apenas"
        text notes_observation "opcional texto livre"
    }

    ASSESSMENT_RESULT {
        uuid assessment_id FK
        numeric raw_value "ex.media TUG,max score Katz etc"
        string raw_label "texto resultado bruto exibível"
        string classification_label
        string classification_code
        jsonb classification_meta "cores, thresholds matched"
        timestamptz computed_at
    }

    PASSWORD_RESET_TOKEN {
        uuid id PK
        uuid therapist_id FK
        string token_hash UK
        timestamptz expires_at
        boolean consumed
    }

    PASSWORD_OTP_LOG {
        uuid id PK
        uuid therapist_id FK
        timestamptz created_at
        string channel "email"
    }

    THERAPIST ||--o{ PASSWORD_RESET_TOKEN : requests_reset
```

> **Notas de modelagem:**
>
> - `ASSESSMENT.payload` permite iterar rapidamente com **schemas Zod distintos** por `instrument_code`, sem criar de imediato cinco famílias de tabelas filhas; payloads **volumosos** podem migrar para linhas físicas quando analytics exigir.  
> - **`schooling_band_used`** na linha da avaliação atende RF004/RF010 sobre **valor efetivo usado nos cortes** daquela aplicação.  
> - Tabela OTP/log separada só se quiser auditoria fina RF003; senão, apenas `PASSWORD_RESET_TOKEN`.

---

## 3. Glossário rápido

| Conceito RN / PRD | Tabela / campo |
|------------------|----------------|
| Fisioterapeuta autenticado | `THERAPIST` |
| Paciente só do profissional | `PATIENT.therapist_id` |
| Sessão de avaliação (antes feedback) | `ASSESSMENT` `status`, `payload` até finalizar |
| Resultado número + texto + cor | `ASSESSMENT_RESULT` gerado apenas em `finalize` |
| Lista instrumentos ordenada alfabética RF007 | `INSTRUMENT` seedada via migration |
| Gráficos / histórico **RF012** | Agregações a partir de avaliações `FINALIZED` + resultado, ordenação cronológica |
| MEEM schooling track | campo em `ASSESSMENT` + resultado comparado aos thresholds Brucki em serviço de domínio |

---

## 4. Índices iniciais sugeridos (performance previsível)

- `Patient(therapist_id, lower(full_name))` — lista + buscas RF005.  
- `Assessment(therapist_id, patient_id, instrument_code, finalized_at DESC)` — série temporal RF012 e linhas cronológicas RF006.  
- `Assessment(status)` onde `DRAFT` — limpeza ou jobs futuros (ex.: remover rascunhos antigos opcionalmente, fora obrigatoriedade MVP).

---

## 5. Futuras extensões (não obrigatórias agora)

| Extensão | Motivo típico |
|----------|----------------|
| Tutorial versionado pelo servidor (**RF009**) | Migra texto dos Markdown de `docs/clinical-protocols/instruments/` para campos permitindo versionamento quando fechar navegações |
| objetos externos S3 relatórios pré-gerados | cache PDF idênticos |
| Auditoria PHI estendida | conformidade institucional adicional (LGPD / HIPAA-like) |

---

## Referências internas

- [repository-and-workflow.md](../../../senior-test-funcional/docs/engineering/repository-and-workflow.md)  
- [architecture.md](../../../senior-test-funcional/docs/engineering/architecture.md)  
- [privacy-and-lgpd.md](../../../senior-test-funcional/docs/product/privacy-and-lgpd.md)  
- Requisitos: [requirements.md](../../../senior-test-funcional/docs/product/requirements.md)  
