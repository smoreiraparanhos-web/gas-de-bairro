# Gás de Bairro

App web para pedir botijão de gás em Eldorado do Sul (RS) sem precisar ligar.
O cliente pede em poucos toques e acompanha o status. O depósito recebe e atualiza os pedidos num painel.

- `index.html`: app do cliente (pensado para celular)
- `painel.html`: painel do depósito (com login)
- `assets/config.js`: **tudo o que você ajusta** (Supabase, bairros, horário, telefone)
- `supabase/schema.sql`: banco de dados e regras de segurança

Não há pagamento online: o cliente escolhe dinheiro (com troco), Pix ou cartão na maquininha, e paga ao entregador.

## Como os pedidos chegam

O app tem três modos, escolhidos sozinho pelo que está preenchido em `assets/config.js`:

1. **WhatsApp** (`whatsappDeposito` preenchido): o cliente monta o pedido e ele abre pronto no WhatsApp do depósito
   (quantidade, troca, nome, endereço, bairro, localização GPS, pagamento e total). O cliente só toca em Enviar.
   Não precisa de banco de dados nem de cadastro. A confirmação e o acompanhamento seguem pela conversa.
2. **Painel com acompanhamento** (`supabaseUrl` e `supabaseAnonKey` preenchidos): o pedido cai no painel e o cliente acompanha o status na tela. Veja abaixo.
3. **Demonstração** (nada preenchido): dados só no navegador, com faixa de aviso.

**Preço:** enquanto `precoDeposito` estiver `null`, o app mostra a média do P13 no RS (ANP, out/2026: R$ 117,89)
com o selo "preço de referência · valor final confirmado na entrega". Coloque o preço do seu depósito em `precoDeposito`.

**Bairros:** a lista vem da Prefeitura de Eldorado do Sul, com a opção "Outro bairro". Remova os bairros onde não entrega.

## Testar no computador (modo demonstração)

Com `supabaseUrl` vazio no `config.js`, o app roda sozinho, guardando os dados só no navegador e mostrando uma faixa de aviso.
Num computador:

```bash
cd gas-de-bairro
```

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000` (cliente) e `http://localhost:8000/painel.html` (depósito) **no mesmo navegador**.
Faça um pedido, aceite no painel e veja a tela do cliente mudar sozinha.

## Colocar no ar com pedidos reais

### 1. Banco de dados (Supabase, grátis)
1. Crie uma conta em supabase.com e um projeto (região São Paulo).
2. Em **SQL Editor**, cole todo o `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication → Users → Add user**, crie o login do depósito (e-mail e senha).
4. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
5. Volte ao SQL Editor e libere esse login no painel:
   ```sql
   insert into public.equipe (user_id, nome)
   select id, 'Depósito' from auth.users where email = 'SEU-EMAIL@exemplo.com';
   ```
6. Em **Project Settings → API**, copie a *Project URL* e a *anon public key* para o `assets/config.js`.
   A anon key é pública por natureza; quem protege os dados são as regras do `schema.sql`.

Atenção: no plano gratuito, o Supabase pausa projetos sem nenhum acesso por 7 dias. Com pedidos chegando isso não acontece.
Se acontecer, é só reativar o projeto no painel do Supabase.

### 2. Hospedagem (GitHub Pages)
1. Crie um repositório no GitHub e envie os arquivos desta pasta.
2. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O app fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/` e o painel em `.../painel.html`.

Netlify ou Cloudflare Pages também servem: basta arrastar a pasta.

### 3. Primeiro uso do painel
- Ligue o botão **Aberto**. A loja começa fechada, e fechada não recebe pedidos.
- Informe o **preço do P13**. Sem preço, o cliente vê "Preço informado pelo depósito".
- Toque em **Ativar som** para ouvir o aviso de pedido novo. Os navegadores exigem um toque antes de liberar o som.
- Deixe o painel aberto num celular ou computador do depósito. Ele se atualiza a cada 8 segundos.

## Como funciona

```
Cliente (index.html) ──criar_pedido()──▶ Supabase (tabela pedidos) ◀──login── Painel (painel.html)
        ▲                                                                   │
        └────── ver_pedido(id), a cada 10 s ◀── status atualizado ◀─────────┘
```

Status: **enviado** → (Aceitar) **em preparação** → **saiu para entrega** → **entregue**.
O depósito também pode **recusar** com um motivo. O cliente pode **cancelar** enquanto o pedido não foi aceito.

Segurança:
- o cliente não lê a tabela de pedidos; só consulta o próprio pedido pelo código aleatório guardado no celular dele;
- só logins cadastrados em `equipe` veem e alteram pedidos, preço e abertura;
- o preço gravado no pedido vem do banco, não do navegador;
- há limite de 3 pedidos por telefone a cada 30 minutos.

## Decisões em aberto (edite `config.js` ou use o painel)
| Item | Onde | Hoje |
|---|---|---|
| Preço do P13 | Painel | sem preço |
| Vasilhame sem troca | Combinado na entrega | o app só avisa que é cobrado à parte |
| Taxa de entrega | não implementada | — |
| Bairros atendidos | `bairrosAtendidos` | qualquer bairro (texto livre) |
| Horário | `horarioTexto` + botão Aberto/Fechado | só o botão |
| Telefone do depósito | `telefoneDeposito` | não exibido |
| Máximo por pedido | `maxQuantidade` | 3 |
