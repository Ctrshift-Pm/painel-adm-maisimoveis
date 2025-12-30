# Painel Administrativo - Mais Imóveis

<div align="center">
  <img src="./logo_circular.png" alt="Logo Mais Imóveis" width="150"/>
  <br>
  <br>
  
  ![Svelte](https://img.shields.io/badge/svelte-%23f1413d.svg?style=for-the-badge&logo=svelte&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
</div>

<br>

## Sobre o Projeto

O **Painel Administrativo Mais Imóveis** é uma aplicação web desenvolvida para gerenciar as operações administrativas da imobiliária **Mais Imóveis**. O sistema oferece uma interface moderna e responsiva para controle de dados e visualização de métricas.

O projeto foi construído utilizando **Svelte** e **TypeScript** para garantir alta performance e tipagem segura, estilizado com **Tailwind CSS** para um design limpo e eficiente, e utiliza **Vite** para um ambiente de desenvolvimento ultra-rápido.

> **Acesse a versão online:** [painel-adm-maisimoveis.vercel.app](https://painel-adm-maisimoveis.vercel.app)

---

## Tecnologias Utilizadas

- **[Svelte](https://svelte.dev/):** Framework reativo para construção de interfaces web.
- **[TypeScript](https://www.typescriptlang.org/):** Superset do JavaScript que adiciona tipagem estática.
- **[Tailwind CSS](https://tailwindcss.com/):** Framework de utilitários CSS para estilização rápida.
- **[PostCSS](https://postcss.org/):** Ferramenta para transformar CSS com JavaScript.
- **[Vite](https://vitejs.dev/):** Build tool e servidor de desenvolvimento.
- **[Vercel](https://vercel.com/):** Plataforma utilizada para deploy e hospedagem.

---

## Funcionalidades

### Dashboard e Visão Geral
A página inicial do sistema oferece uma visão macro do negócio logo após o login.
- **Métricas e Indicadores:** Acompanhamento visual do estado atual do aplicativo e desempenho.
- **Central de Avisos:** Sistema integrado de notificações (Sino) para alertas importantes do sistema.

### Gestão Avançada de Imóveis
Controle total sobre o inventário da imobiliária via painel web.
- **Edição Completa de Mídia:** Revisão e edição de galerias de imagens e vídeos dos imóveis.
- **Controle de Informações:** Edição detalhada de todas as características e dados dos imóveis.
- **Aprovação de Solicitações:** Fluxo de revisão para imóveis submetidos pelos corretores antes da publicação.

### Gestão de Corretores e Usuários
Ferramentas para administrar a equipe e o acesso ao sistema.
- **Ranking e Organização:** Listagem de corretores com ordenação por produtividade (maior nº de imóveis) ou ordem alfabética.
- **Solicitações de Cadastro:** Visualização e aprovação de novos corretores que solicitam acesso à plataforma.

### Comunicação e Notificações
Ferramentas de engajamento direto pelo painel.
- **Push Notifications:** Envio de notificações personalizadas para grupos seletos de usuários ou via broadcast (para todos).

### Regras de Negócio e Financeiro
Configuração flexível de parâmetros financeiros.
- **Configuração de Taxas:** Definição de valores e percentuais de Condomínio e IPTU atribuídos ao imóvel para o corretor.

### Interface e Experiência (UX)
- **Temas:** Suporte nativo a **Dark Mode** (Tema Escuro) e Light Mode.
- **Design Responsivo:** Layout 100% adaptável para desktops, tablets e smartphones.
--- 

## Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (versão 16 ou superior)
* [NPM](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)

---

## Instalação e Execução

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Ctrshift-Pm/painel-adm-maisimoveis.git

2.  **Acesse a pasta do projeto:**

    ```bash
    cd painel-adm-maisimoveis
    ```

3.  **Instale as dependências:**

    ```bash
    npm install
    # ou
    yarn install
    ```

4.  **Inicie o servidor de desenvolvimento:**

    ```bash
    npm run dev
    # ou
    yarn dev
    ```

5.  O aplicativo estará rodando em `http://localhost:5173`.

-----
