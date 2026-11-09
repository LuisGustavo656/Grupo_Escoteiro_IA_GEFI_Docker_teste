# Grupo_Escoteiro + IA_GEFI — Docker de teste

Este pacote foi preparado usando os arquivos dos dois ZIPs enviados. NÃO contém senhas.

## O que foi encontrado
- `geAPI/src/server.js` usa `helmet` e `express-rate-limit`, mas faltavam em `package.json`. Foram adicionados.
- `geAPI/package-lock.json` anterior não incluía essas dependências e não foi distribuído. O Docker usa `npm install --package-lock=false`; após validar, gere e versione um lock atualizado para builds reproduzíveis.
- `main.py` do Python importa o SDK OpenAI durante a inicialização e requer `GEMINI_API_KEY` definida.
- A resposta de `/gerar-grupos` é `{fpc, grupos}`. O Node responde `{message, resultado: grupos}`.
- Corrigidos erros de diagnóstico de balanceamento e limitado o log HTML de RF08.
- Criada `/health` no Node para validar o processo sem consultar o banco.

## Publicar
1. Crie um repositório **privado** novo no GitHub, ex. `Grupo_Escoteiro_Docker_Teste`.
2. Descompacte e envie o CONTEÚDO deste pacote para a raiz do repo (Dockerfile na raiz).
3. Render > New > Web Service > conecte o novo repositório > runtime Docker, plano Free se estiver disponível.
4. Defina `Dockerfile Path` = `./Dockerfile` e porta HTTP pública = `10000` (se solicitado). `PORT=10000`.
5. Copie as variáveis existentes do Render para o serviço **de teste**: `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN` (origens web que já utiliza), `GEMINI_API_KEY`, `GEMINI_MODEL`, `ML_SERVICE_TOKEN`, `ML_INTERNAL_TOKEN`.
6. Defina `ML_BASE_URL=http://127.0.0.1:8001`; ambos os tokens internos devem ser iguais.
7. Inicie o deploy, observe os logs de instalação e inicialização. Python deve responder em localhost:8001 e Node deve iniciar na porta 10000.
8. Teste `https://NOVO-SERVICO.onrender.com/health` e `/test`; a primeira não acessa o banco, a segunda acessa.
9. Teste com JWT válido `POST /patrols/balancear` e `POST /activities/suggestions` apontando para o NOVO serviço. Não mude o mobile nem o Render atual antes de verificar.
10. Em caso de falha, mantenha os serviços antigos intactos e revise os logs.

## Observações e riscos
- Este Docker compartilha os 512 MB de memória do plano Free entre Node, Python, NumPy/Pandas/SciPy, dependências e sistema. Pode falhar por OOM; não há garantia de caber no Free.
- O FastAPI só escuta em 127.0.0.1:8001; ele não fica público diretamente.
- `ML_INTERNAL_TOKEN` é verificado apenas na rota RF08 original; `/gerar-grupos` não possui essa autenticação no código original, mas fica inacessível da internet neste arranjo.
- `GEMINI_MODEL` deve ser exatamente o modelo que funcionou na sua chave; use o valor do Render atual, sem presumir disponibilidade.
- O Render pode hibernar o serviço Free e uma partida fria exige carregar ambas as aplicações.
- O volume de builds e consumo de horas gratuitas por workspace deve ser considerado; seu serviço atual continua ativo.
- Repositório deve ser privado caso a aplicação tenha trechos proprietários. Não inclua o `.env` com segredos.
- Não foi possível testar o build completo sem acesso ao registro npm/PyPI/Docker; sintaxe dos fontes foi validada localmente.
