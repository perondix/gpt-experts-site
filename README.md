# GPT Experts

Landing page estática em `dist/`, publicada na Vercel. O formulário de interesse envia dados para a função `api/apply.mjs`, que cadastra a pessoa, cria um negócio quando a lista do Attio é de negócios, adiciona o registro à lista e registra a origem da visita em uma nota.

## Configuração na Vercel

Adicione as seguintes variáveis de ambiente ao projeto `gpt-experts-site` e faça um novo deploy:

- `ATTIO_API_KEY` (obrigatória): token de workspace do Attio. Nunca coloque o token no código ou em `dist/`.
- `ATTIO_LIST_ID` (opcional): ID da lista que receberá os cadastros. Se não for definida, a função procura pelo slug ou nome `gpt-experts-deals`.
- `ATTIO_LIST_NAME` (opcional): substitui o slug ou nome usado nessa procura.

O token precisa de permissão de leitura e escrita para registros de pessoas e negócios, entradas de lista e notas, além de leitura da configuração de objetos e listas: `record_permission:read-write`, `list_entry:read-write`, `note:read-write`, `object_configuration:read`, `list_configuration:read`.

O formulário só mostra confirmação após o registro, a entrada na lista e a nota no Attio serem concluídos. Se a integração falhar, o visitante vê uma mensagem de erro e pode tentar novamente.
