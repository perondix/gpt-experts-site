# GPT Experts

Landing page estática em `dist/`, publicada na Vercel. O formulário de interesse envia dados para a função `api/apply.mjs`, que cadastra a pessoa, cria um negócio quando a lista do Attio é de negócios, adiciona o registro à lista e registra a origem da visita em uma nota.

## Configuração na Vercel

Adicione as seguintes variáveis de ambiente ao projeto `gpt-experts-site` e faça um novo deploy:

- `ATTIO_API_KEY` (obrigatória): token de workspace do Attio. Nunca coloque o token no código ou em `dist/`.
- `ATTIO_LIST_ID` (opcional): ID da lista que receberá os cadastros. Se não for definida, a função procura pelo slug ou nome `gpt-experts-deals`.
- `ATTIO_LIST_NAME` (opcional): substitui o slug ou nome usado nessa procura.

O token precisa de permissão de leitura e escrita para registros de pessoas e negócios, entradas de lista e notas, além de leitura da configuração de objetos e listas: `record_permission:read-write`, `list_entry:read-write`, `note:read-write`, `object_configuration:read`, `list_configuration:read`.

O formulário só mostra confirmação após o registro, a entrada na lista e a nota no Attio serem concluídos. Se a integração falhar, o visitante vê uma mensagem de erro e pode tentar novamente.

## Lead magnet: primeiro agente de IA

`/agente-ai-gpt` apresenta um artigo em 12 fases sobre configurar um assistente no ChatGPT, usando reuniões como exemplo e lembrando o leitor de adaptar o método ao próprio processo. O cadastro mostra somente explicação, e-mail, botão e aviso de registro. O rodapé completo aparece após o acesso. Os dois tutoriais não têm header.

`POST /api/lead-magnet` cria ou atualiza uma pessoa no Attio pelo e-mail, preserva os demais atributos e registra uma nota com a origem do guia e UTMs. A interface envia `marketing_consent: false`; não há opção de novidades nem envio de mensagens. Não cria negócios nem insere o lead na lista de inscrições do curso.

O tutorial fica em `lib/agent-guide.mjs`, fora dos arquivos públicos de `dist/`. A API só devolve o conteúdo depois de confirmar o registro e a nota no CRM. Um cookie assinado, HttpOnly, SameSite=Lax e Secure em produção permite reabrir o artigo neste navegador por sete dias. `GET /api/lead-magnet` valida esse acesso. A assinatura usa a chave Attio com contexto específico para este guia; rotacionar a chave invalida os acessos existentes. Não há verificação da caixa de e-mail.

A integração reutiliza `ATTIO_API_KEY` e precisa de escrita em registros de pessoas e notas. A configuração da lista do formulário original não é necessária. As respostas da API usam `private, no-store`. A limitação de cinco tentativas por minuto é local à instância; não substitui um limite distribuído de tráfego.

A página oferece sumário, modelos expansíveis e cópia de instruções. Não coleta dados de reuniões nem acessa ferramentas Google do visitante. Não há formulário de briefing, progresso salvo ou automação executada pela página.

Verificação da captura, falhas do CRM, cookie, expiração e bloqueio do conteúdo:

```sh
node --test tests/lead-magnet.test.mjs
```
