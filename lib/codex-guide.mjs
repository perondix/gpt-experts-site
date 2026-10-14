// Protected Codex tutorial: never place this module or its contents in dist/.
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const facts = (items) => `<dl class="fact-list">${items.map(([label, text]) => `<div><dt>${label}</dt><dd>${text}</dd></div>`).join('')}</dl>`;
const list = (items, ordered = false) => `<${ordered ? 'ol' : 'ul'}>${items.map((text) => `<li>${text}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
const flow = (items, label) => `<ol class="flow" aria-label="${label}">${items.map((text) => `<li>${text}</li>`).join('')}</ol>`;
const note = (text) => `<aside class="reading-note">${text}</aside>`;
const outcome = (text) => `<div class="outcome"><strong>Ao concluir esta etapa:</strong> ${text}</div>`;
const block = ({ id, title, where, adapt, result, text, open = false, chat = false }) => `<div class="copy-context"><p><strong>Onde usar:</strong> ${where}</p><p><strong>O que adaptar:</strong> ${adapt}</p><p><strong>Resultado esperado:</strong> ${result}</p></div><details class="copy-block"${open ? ' open' : ''}><summary>${title}</summary><div class="copy-actions"><button type="button" data-copy="${id}" aria-label="Copiar ${title}">Copiar</button>${chat ? '<a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Abrir ChatGPT ↗</a>' : ''}</div><pre id="copy-${id}">${escape(text)}</pre><span class="copy-status" id="status-${id}" role="status" aria-live="polite"></span></details>`;
const phases = [];
function phase(id, title, html) {
  const number = String(phases.length + 1).padStart(2, '0');
  phases.push({ id, title, number, html });
}

const ref = (url, title) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${title} ↗</a>`;
const figure = (file, alt, caption) => `<figure class="lab-figure"><a href="/app-web-codex/images/${file}.svg" target="_blank" rel="noopener noreferrer" aria-label="Ampliar ilustração: ${alt}"><img src="/app-web-codex/images/${file}.svg" alt="${alt}" width="360" height="${file === 'app' ? 730 : file === 'arquitetura' ? 650 : 590}" loading="lazy"></a><figcaption>${caption} Toque na imagem para ampliar.</figcaption></figure>`;
phase('escopo', 'Escolha um problema que cabe no dia', `
<p>O primeiro resultado deve ser um <strong>MVP</strong>: a menor versão que resolve um problema de ponta a ponta. Em vez de pedir “um aplicativo completo”, descreva usuário, entrada, ação e resultado esperado.</p>
<p>Nosso exemplo será o <strong>Meu Mês</strong>, um app para registrar e acompanhar gastos mensais no cartão. Você pode trocar o domínio por tarefas, estoque ou atendimento; o método continua sendo especificar, construir, testar e publicar.</p>
${facts([['Entra na versão 1', 'Cadastro e login por e-mail, cartões por apelido, gastos com valor e categoria, edição/exclusão e resumo por mês.'], ['Fica para depois', 'Conexão bancária, importação de faturas, parcelamento automático, fechamento de fatura, pagamentos e compartilhamento familiar.'], ['Regra do mês', 'O usuário escolhe o mês de referência de cada gasto. Este MVP não calcula o ciclo da fatura do banco.'], ['Critério de pronto', 'Uma pessoa entra, salva um gasto, recarrega e encontra o mesmo dado. Outra pessoa não consegue acessá-lo.']])}
${figure('app','Ilustração mobile do Meu Mês: resumo de R$ 1.600 e três gastos de exemplo','Referência de interface com dados fictícios; o tutorial não é um aplicativo financeiro em funcionamento.')}
${block({id:'briefing',title:'Briefing para iniciar no Codex',where:'na primeira conversa do projeto no Codex.',adapt:'nome, público e funcionalidades se escolher outro app. Preserve um escopo pequeno.',result:'documento de escopo e plano de implementação antes do código.',text:`Vamos construir o MVP Meu Mês, um app web mobile first para acompanhar gastos mensais no cartão.

Usuário: pessoa que registra seus próprios gastos manualmente.
Fluxo: criar conta → entrar → cadastrar um cartão por apelido → lançar gasto → consultar o mês.
Entrega: lista de gastos e total por mês, cartão e categoria.
Campos do gasto: descrição, valor em centavos, data da compra, mês de referência, categoria e cartão.
O mês é escolhido manualmente; não calcular fechamento de fatura.

Stack: Next.js com TypeScript, Supabase Auth + Postgres e publicação na Vercel.
Fora do escopo: integração bancária, número completo de cartão, CVV, parcelamento, pagamentos e recursos de IA dentro do app.

Primeiro, crie docs/escopo.md e docs/plano.md com etapas pequenas e critérios de aceite. Liste dúvidas que bloqueiam a construção. Ainda não altere serviços externos.`,open:true})}
${outcome('escopo registrado e uma definição objetiva de pronto.')}`);

phase('ambiente', 'Prepare o Codex e conecte o Supabase', `
<p><strong>Codex constrói o software.</strong> Ele lê e altera arquivos, executa comandos e testes e usa ferramentas conectadas. Você fornece contexto, revisa mudanças e valida o resultado. O app pronto não precisa manter Codex ou MCP rodando. Este exemplo também dispensa uma chave de API da OpenAI: a IA ajuda a construir, mas não é uma funcionalidade do produto.</p>
${facts([['Codex', 'Implementa interface, regras, integração e testes na pasta do projeto.'], ['Supabase', 'Guarda os registros em Postgres e autentica usuários. RLS controla quais linhas cada usuário acessa.'], ['MCP do Supabase', 'Permite ao Codex consultar o projeto e trabalhar com ferramentas de banco autorizadas durante o desenvolvimento.'], ['Vercel', 'Constrói e hospeda o Next.js, executa suas funções de servidor e oferece URLs de preview e produção.'], ['GitHub', 'Versiona o código e conecta mudanças aos deploys da Vercel.']])}
${figure('arquitetura','Arquitetura: Codex desenvolve, MCP administra o Supabase, GitHub envia código e Vercel serve o app','Separe construção e operação: os visitantes usam o app e o Supabase, não o MCP do desenvolvedor.')}
<h3>Abra um projeto local</h3>
${list(['Instale o aplicativo oficial indicado no '+ref('https://developers.openai.com/codex/quickstart','quickstart do Codex')+' e entre na sua conta.', 'Selecione <strong>Codex</strong> para desenvolvimento e abra uma pasta nova, como <code>meu-mes</code>. Use uma pasta própria, sem misturar o site ou outros apps.', 'Peça ao Codex para conferir Git, Node.js e o gerenciador de pacotes compatível com o Next.js atual. Instale dependências a partir das fontes oficiais quando necessário.', 'Crie ou conecte um repositório Git e mantenha o lockfile das dependências. Registre os combinados em <code>AGENTS.md</code>.'],true)}
<p>O <code>AGENTS.md</code> é uma instrução do repositório: peça para registrar stack, comandos de verificação, regra de não versionar segredos e obrigação de testar o isolamento dos usuários. Ele não substitui os documentos de escopo.</p>
<h3>Crie um projeto Supabase de desenvolvimento</h3>
${list(['No '+ref('https://supabase.com/dashboard','dashboard Supabase')+', crie um projeto exclusivo para o exercício. Guarde a senha do banco em local seguro.', 'Anote a referência do projeto, a URL da API e a chave <strong>publishable</strong>. São configurações diferentes; a senha do banco não é a chave da API.', 'No Codex, procure o plugin Supabase, quando disponível, e conclua a conexão. Confirme qual projeto será utilizado.', 'Se usar configuração manual de MCP, abra as configurações de MCP do Codex e use a URL com <code>project_ref</code>. A alternativa por arquivo está abaixo. Escolha uma forma de conexão, sem duplicar servidores.'],true)}
${block({id:'mcp',title:'Alternativa técnica — configuração MCP',where:'na configuração MCP do Codex, em ~/.codex/config.toml, se não usar o plugin.',adapt:'substitua SEU_PROJECT_REF pela referência do projeto de desenvolvimento.',result:'um servidor MCP restrito ao projeto escolhido; conclua a autenticação quando solicitada.',text:`[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref=SEU_PROJECT_REF"`})}
<p>Em clientes CLI compatíveis, <code>codex mcp login supabase</code> inicia o login OAuth e <code>codex mcp list</code> lista conexões. Na interface, use o controle de autenticação disponível. Não cole tokens, senhas ou chaves secretas na conversa.</p>
<p>Peça: <em>“Confirme a referência do projeto Supabase conectado e liste as tabelas existentes. Não altere nada.”</em> Confira a referência no dashboard. Não faça o exercício sobre um banco de produção com dados reais. Uma conexão com <code>read_only=true</code> consulta dados, mas não cria o schema.</p>
${outcome('pasta e repositório definidos, Codex pronto e projeto de desenvolvimento identificado.')}`);

phase('interface', 'Construa a interface antes de integrar', `
<p>Primeiro valide o caminho que a pessoa usará. Peça uma interface com dados fictícios, explicitamente marcada como demonstração. Ela ajuda a corrigir o produto antes de envolver autenticação e banco.</p>
${block({id:'interface',title:'Implementar a primeira versão visual',where:'na conversa Codex que já contém o briefing.',adapt:'nome e estilo do app, mantendo as telas e estados necessários.',result:'uma prévia local navegável e um primeiro commit revisável.',text:`Implemente a interface descrita em docs/escopo.md usando Next.js App Router e TypeScript.

Crie telas de entrar/cadastrar, painel mensal, cartões e formulário de gasto.
No celular, use uma coluna; formulário com rótulos, valores em BRL e botões fáceis de tocar.
Inclua estados vazio, carregando, erro e confirmação de exclusão.
Use dados fictícios identificados como demonstração. Ainda não apresente dados locais como salvos no Supabase.

Mostre mês selecionado, total, filtro por cartão, resumo por categoria e lista de gastos.
Inicie a prévia local, informe a URL e confira em 390 px. Corrija problemas antes de avançar.
Registre como executar em README.md. Faça um commit desta etapa sem arquivos de ambiente.`})}
<h3>Como trabalhar com o Codex</h3>
${list(['<strong>Uma entrega por vez:</strong> confirme a tela e seu comportamento antes de pedir banco e deploy.', '<strong>Mostre o problema:</strong> envie uma captura ou descreva “ao salvar X, aconteceu Y; esperava Z”.', '<strong>Confira o diff:</strong> revise os arquivos alterados e peça explicação das partes importantes.', '<strong>Use checkpoints:</strong> faça commits após interface, banco e integração. Peça correções na mesma conversa para preservar contexto.'])}
<p>No terminal do projeto, o script de desenvolvimento costuma ser <code>npm run dev</code>; use os comandos que o Codex registrou no README. Uma tela renderizada é progresso, mas persistência e acesso ainda serão testados.</p>
${outcome('fluxo visual conferido no celular, com estados e formulários claros.')}`);

phase('dados', 'Defina o mínimo de banco e autenticação', `
<p>Agora o Supabase dá memória ao app. <strong>Auth</strong> identifica a pessoa; <strong>Postgres</strong> guarda cartões e gastos; <strong>RLS</strong> impede que uma conta acesse linhas de outra. Esconder botões não protege dados.</p>
${figure('dados','Modelo de dados: usuário possui cartões e gastos; cada gasto pertence a um cartão do mesmo usuário','Modelo mínimo: duas tabelas da aplicação e os usuários do Supabase Auth.')}
${facts([['cards', 'id, user_id, name e created_at. Guarde um apelido, não dados de pagamento.'], ['expenses', 'id, user_id, card_id, description, amount_cents, purchase_date, reference_month, category e created_at.'], ['Dinheiro', 'Inteiro em centavos: R$ 89,90 é 8990. Valide valor positivo e converta só na interface.'], ['Mês', 'Data no primeiro dia do mês, como 2026-10-01. Filtre pela referência escolhida, não pelo mês atual do computador.'], ['Relacionamento', 'O cartão associado a um gasto precisa pertencer ao mesmo usuário. Valide também no banco, não só no formulário.']])}
${block({id:'banco',title:'Pedir schema, migração e RLS',where:'no Codex, com MCP conectado ao projeto de desenvolvimento confirmado.',adapt:'a referência real do projeto. Confira o plano antes de autorizar alterações.',result:'schema versionado e aplicado, com políticas de acesso verificadas.',text:`Prepare o banco do Meu Mês no projeto de desenvolvimento [PROJECT_REF].
Primeiro confirme o alvo e apresente o SQL e a estratégia de migração. Aplique somente depois da minha aprovação.

Crie cards e expenses conforme docs/escopo.md. Use UUID, user_id ligado a auth.users e índices para usuário e mês.
amount_cents deve ser inteiro positivo; reference_month deve representar o primeiro dia do mês.
Garanta por constraint que (card_id, user_id) em expenses referencia um cartão do mesmo usuário. Defina comportamento de exclusão sem apagar gastos silenciosamente.

Ative RLS nas duas tabelas. Crie políticas SELECT, INSERT, UPDATE e DELETE para o dono autenticado, usando auth.uid() = user_id. UPDATE precisa de USING e WITH CHECK, além de SELECT. Bloqueie acesso anônimo.
Verifique grants necessários da Data API; não confunda grants com RLS.

Registre o schema em uma migração no repositório. Use um único fluxo de aplicação e confira o histórico; não execute a mesma migração novamente pelo CLI e pelo MCP.
Verifique constraints, políticas e avisos de segurança. Não considere uma consulta como administrador prova de isolamento dos usuários.`})}
<p>No dashboard, habilite o método de e-mail em <strong>Authentication</strong>. Defina confirmação de e-mail e confira seus modelos e URLs. O código de cadastro deve tratar “conta criada, aguardando confirmação”; não assumir sessão imediata. Teste recebimento, login e recuperação de senha. Para uso real, confira limites e configuração de entrega de e-mail do seu projeto.</p>
${outcome('modelo e políticas coerentes, migração registrada e fluxo de autenticação definido.')}`);

phase('integracao', 'Ligue a interface aos dados reais', `
<p>O app acessa Supabase pelos SDKs e pela sessão do usuário. O MCP é uma ferramenta de desenvolvimento; sua URL e seu login não entram no código entregue ao visitante.</p>
${block({id:'env',title:'Modelo — .env.local',where:'na raiz do app local e, depois, nas variáveis do projeto Vercel.',adapt:'URL e chave publishable obtidas no seu projeto Supabase. Os valores abaixo são apenas marcadores.',result:'configuração lida pelo app sem versionar arquivos de ambiente.',text:`NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUBSTITUA_PELA_CHAVE_PUBLISHABLE`})}
<p>Variáveis <code>NEXT_PUBLIC_</code> ficam disponíveis no navegador. A chave publishable é adequada ao cliente com sessão, grants e RLS corretos. <strong>Nunca use secret key, service_role ou senha do banco nesses campos.</strong> Mantenha <code>.env.local</code> fora do Git e um <code>.env.example</code> sem valores reais.</p>
${block({id:'integrar',title:'Conectar login, gastos e resumo mensal',where:'no Codex, após preparar o ambiente local.',adapt:'apenas particularidades do fluxo já aprovado; evite ampliar o escopo.',result:'interface usando sessões e dados persistidos, sem depender de mocks.',text:`Integre o app ao Supabase com supabase-js e @supabase/ssr, seguindo a documentação atual do Next.js. Fixe versões e mantenha o lockfile.

Implemente cadastro, confirmação quando necessária, login, logout e recuperação de senha. Valide autenticação no servidor com o método atual recomendado; não confie apenas em dados de sessão não verificados.
Use a sessão do usuário e RLS, sem chave administrativa para o CRUD comum.

Substitua os mocks por consulta, criação, edição e exclusão reais de cartões e gastos. Valide entradas no servidor e no banco. Bloqueie reenvio enquanto salva e trate falhas sem mostrar sucesso falso.
Filtre os gastos por reference_month e cartão; calcule os totais em centavos e formate em BRL. Categorias precisam reconciliar com o total.
Não armazene cache de dados pessoais compartilhado entre usuários. Recarregue os dados após mudanças.

Confirme que salvar → recarregar → consultar recupera o mesmo registro do banco. Mantenha um modo de demonstração separado, se necessário, sem misturá-lo aos dados reais.`})}
<p>Reinicie a prévia após alterar variáveis. Se uma tabela parecer vazia, confira projeto, sessão, filtro de mês, grants e políticas. Peça ao Codex para diagnosticar a causa; não “resolver” removendo RLS ou colocando uma chave administrativa no navegador.</p>
${outcome('login e fluxo principal conectados ao banco, com estados de erro e sucesso reais.')}`);

phase('testes', 'Teste como usuário, não só como desenvolvedor', `
<p>Peça ao Codex para executar build, verificações de tipos e testes relevantes, usando os scripts do repositório. Depois confira o fluxo no navegador. Build aprovado não prova que login, dados e autorização funcionam.</p>
${facts([['Persistência', 'Entre com A, crie cartão e gasto, recarregue, saia e volte. O registro deve continuar no Supabase.'], ['Isolamento', 'Com B, tente consultar e alterar um ID criado por A pela API autenticada de B. O acesso deve ser negado ou retornar zero linhas, sem alterar dados.'], ['Totais', 'No mesmo mês, insira R$ 1.200,00 + R$ 89,90 + R$ 310,10: total R$ 1.600,00. Em outro mês, o valor não pode entrar nessa soma.'], ['Edição e exclusão', 'Altere um valor, confira resumo e persistência; exclua com confirmação e confira o novo total.'], ['Validação', 'Teste valor inválido, campo vazio, cartão de outro usuário, sessão expirada e falha de rede.'], ['Mobile', 'Confira 320, 390 e 430 px, teclado aberto, foco nos campos e ausência de rolagem horizontal da página.']])}
${block({id:'revisao',title:'Solicitar verificação completa',where:'no Codex, quando o fluxo estiver integrado.',adapt:'scripts e URLs, se o projeto usar nomes diferentes.',result:'evidências dos testes, falhas corrigidas e limites explícitos.',text:`Valide o Meu Mês de ponta a ponta antes do deploy.
Execute os scripts relevantes de build, tipos e testes. Teste no navegador o cadastro/login, CRUD e persistência após recarregar.
Verifique com duas contas de teste o isolamento RLS em cards e expenses, incluindo leitura e alteração direta de IDs de outro usuário pela API com o token da conta comum.
Não use service_role, SQL de administrador nem apenas ocultação de UI como evidência desse teste.
Confira totais em centavos, filtro de mês, estados de erro e layout mobile.

Corrija as falhas e repita somente as verificações afetadas. Relate o que passou, o que não foi testado e os bloqueios reais. Não publique enquanto houver falha de acesso entre usuários.`})}
<p>Use somente dados fictícios no piloto. Se faltar tempo, corte funcionalidades; preserve autenticação, isolamento e conferência do fluxo central.</p>
${outcome('um candidato a publicação testado, com evidências e sem bloqueios críticos conhecidos.')}`);

phase('publicacao', 'Publique na Vercel e valide a URL real', `
<p>A Vercel recebe o repositório, executa o build e entrega o app por HTTPS. Supabase continua sendo o banco e o serviço de autenticação; publicar o frontend não recria o banco automaticamente.</p>
${list(['Faça commit das mudanças e envie o código ao GitHub. Confirme que nenhum arquivo de ambiente ou credencial entrou no histórico.', 'Na Vercel, escolha <strong>Add New → Project</strong> e importe o repositório correto. Confira equipe, diretório raiz e detecção de Next.js.', 'Em <strong>Settings → Environment Variables</strong>, configure as duas variáveis Supabase. Use o projeto de desenvolvimento nas previews; para produção, escolha conscientemente o banco de destino.', 'Se separar um projeto Supabase de produção, aplique o schema/migrações e configure Auth nesse projeto antes do deploy. Não copie dados fictícios como dados reais.', 'Crie uma preview por branch/PR e confira build e logs. Uma URL protegida pela Vercel pode exigir login autorizado para o teste.', 'No Supabase, configure <strong>Authentication → URL Configuration</strong>: Site URL de produção e redirects específicos usados pelo app, incluindo a rota real de confirmação ou recuperação. Para testar preview, autorize apenas URLs de teste necessárias.', 'Publique a versão aprovada na branch de produção configurada ou promova o deployment correto. Confira se as variáveis pertencem ao ambiente de destino.', 'Na URL publicada, teste login/retorno de e-mail, criação, recarga, edição, exclusão e a segunda conta. Se alterar variáveis, faça um novo deployment.'],true)}
${note('<strong>Preview é versão do código, não isolamento automático do banco.</strong> Se Preview e Production apontarem para o mesmo Supabase, ambas acessam o mesmo banco. Use projetos ou branches de banco separados quando disponíveis e apropriados.')}
<p>Você também pode pedir ao Codex para orientar ou executar o deploy com a conexão Vercel disponível. Informe equipe, projeto, commit e ambiente; mantenha a confirmação do destino. Não é necessário instalar outro MCP para seguir o caminho manual pelo dashboard.</p>
<p>Se houver problema, entregue ao Codex o erro e o trecho relevante dos logs, sem segredos. Uma reversão do frontend não reverte migrações do banco: preserve compatibilidade e planeje recuperação dos dados separadamente. Confira limites, custos e configurações dos serviços antes de abrir o uso ao público.</p>
${outcome('uma URL funcional, verificada fora do localhost e ligada ao ambiente correto.')}`);

phase('entrega', 'Feche o dia com uma versão que você consegue manter', `
<p>Peça ao Codex um resumo de entrega com URL, versão/commit, funcionalidades, testes, limitações e próximos passos. O README precisa permitir voltar ao projeto sem depender da memória da conversa.</p>
${list(['Como instalar, iniciar e verificar o app.', 'Quais variáveis existem e onde configurá-las, sem valores secretos.', 'Como autenticação, tabelas, políticas e migrações estão organizadas.', 'Como criar uma preview, publicar e consultar logs.', 'Quais recursos ficaram fora e quais testes ainda precisam ser feitos.'])}
<p>Para outro aplicativo, troque <strong>cartões/gastos</strong> pelas entidades do seu domínio, <strong>resumo mensal</strong> pela entrega principal e os testes pelas regras correspondentes. Mantenha o percurso: escopo pequeno → interface → dados e acesso → integração → teste → publicação.</p>
<p>Uma boa evolução para o Meu Mês seria exportação CSV ou orçamento por categoria. Parcelamento e fechamento automático exigem novas regras e testes; trate cada um como uma entrega seguinte.</p>
${outcome('MVP documentado e uma próxima melhoria pequena, sem reabrir todo o escopo.')}`);

const slots = ['09h–09h30 · Escopo','09h30–10h30 · Ambiente','10h30–12h · Interface','13h–14h · Dados','14h–15h30 · Integração','15h30–16h30 · Testes','16h30–17h30 · Publicação','17h30–18h · Entrega'];
const checks = ['O escopo do MVP está explícito e cabe no piloto.','O MCP aponta para o projeto de desenvolvimento correto.','Não há senha do banco, secret key ou service_role no cliente ou no Git.','Schema e migrações estão versionados, sem aplicação duplicada.','RLS e constraints protegem cartões e gastos, inclusive na API.','Cadastro, confirmação, login, logout e recuperação foram testados.','Dados persistem após recarga e contas diferentes ficam isoladas.','Totais, mês de referência, edição e exclusão estão corretos.','Build e testes passaram; o fluxo funciona no celular.','Variáveis, Auth redirects e banco correspondem ao ambiente publicado.','A URL real foi testada e os limites do MVP estão documentados.'];
export const guideHtml = `
<p class="article-meta">GPT Experts · Laboratório de construção</p>
<h1 id="guide-title" tabindex="-1">Da ideia ao app web em um dia</h1>
<p class="article-intro">Codex para construir. Supabase para dados e login. Vercel para colocar no ar.</p>
<p>Um passo a passo para transformar uma ideia em um MVP funcional, usando um app de gastos mensais no cartão como exemplo. Você vai orientar o Codex, conferir as entregas e publicar com contexto do que está acontecendo.</p>
${note('<strong>A meta do dia é um MVP de ponta a ponta.</strong> Reserve oito horas, prepare as contas e mantenha o escopo pequeno. Ajuste o roteiro ao seu ritmo e aos acessos disponíveis.')}
<p>Acompanhe pelo celular; para desenvolver e testar o exemplo, use um computador.</p>
<section class="lab-roadmap" aria-labelledby="dia"><h2 id="dia">Seu roteiro de um dia</h2><p>Horários são uma referência de organização, com intervalo de almoço. Abra cada etapa para seguir o caminho.</p><ol>${phases.map((p,i)=>`<li><a href="#${p.id}"><span class="lab-slot">${slots[i]}</span><span>${p.title}</span></a></li>`).join('')}</ol></section>
<details class="article-index"><summary>Consultar etapas, checklist e referências</summary><nav aria-label="Etapas do laboratório"><ol>${phases.map(p=>`<li><a href="#${p.id}">${p.number}. ${p.title}</a></li>`).join('')}<li><a href="#checklist">Checklist de publicação</a></li><li><a href="#referencias">Documentação oficial</a></li></ol></nav></details>
${phases.map(p=>`<section class="guide-phase" id="${p.id}" aria-labelledby="title-${p.id}"><p class="phase-label">ETAPA ${p.number}</p><h2 id="title-${p.id}">${p.title}</h2>${p.html}</section>`).join('')}
<section class="article-end" id="checklist" aria-labelledby="title-checklist"><h2 id="title-checklist">Checklist antes de compartilhar</h2><p>Marque após verificar. As marcações não são salvas.</p><div class="guide-checklist">${checks.map((t,i)=>`<label for="check-${i}"><input id="check-${i}" type="checkbox"><span>${t}</span></label>`).join('')}</div><a href="#topo" class="back-top">Voltar ao início ↑</a></section>
<section class="guide-sources" id="referencias" aria-labelledby="title-referencias"><h2 id="title-referencias">Documentação oficial</h2><p>Referências consultadas em 14 de outubro de 2026. Interfaces, planos e permissões podem mudar.</p>${list([
ref('https://developers.openai.com/codex/quickstart','Começar no Codex'),
ref('https://developers.openai.com/codex/mcp','MCP no Codex'),
ref('https://developers.openai.com/codex/guides/agents-md','Instruções com AGENTS.md'),
ref('https://supabase.com/docs/guides/ai-tools/mcp','MCP do Supabase'),
ref('https://supabase.com/docs/guides/auth/server-side/nextjs','Supabase Auth com Next.js'),
ref('https://supabase.com/docs/guides/database/postgres/row-level-security','Row Level Security'),
ref('https://supabase.com/docs/guides/api/api-keys','Chaves de API do Supabase'),
ref('https://supabase.com/docs/guides/auth/redirect-urls','URLs de retorno da autenticação'),
ref('https://vercel.com/docs/git','Deploy com Git na Vercel'),
ref('https://vercel.com/docs/environment-variables','Variáveis de ambiente na Vercel')
])}</section>`;
