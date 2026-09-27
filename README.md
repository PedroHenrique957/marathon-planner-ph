# 🎬 Marathon Planner (Calculadora de Maratona)

Uma aplicação web moderna, responsiva e inteligente desenvolvida para ajudar cinéfilos e entusiastas de séries a planear, organizar e cronometrar as suas maratonas de conteúdo com base na sua rotina semanal.

![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Database-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)

---

## ✨ Funcionalidades Principais

* **📝 Adição Flexível de Conteúdos:**
  * **Modo Manual:** Insere o título do filme/série e a duração em minutos individualmente.
  * **Importação CSV:** Carrega listas inteiras de episódios de uma só vez. O sistema analisa inteligentemente os dados, detetando automaticamente o título, formatação de temporada/episódio (ex: `S01E01` ou `1x01`) e a duração.
* **⏰ Grade de Horários Semanal Customizável:**
  * Define os teus blocos de tempo livres para cada dia da semana (Domingo a Sábado).
  * O sistema calcula automaticamente o tempo livre diário e o total semanal.
* **💾 Gestão de Presets e Sincronização na Nuvem:**
  * Guarda diferentes rotinas de horários como "Presets" (ex: Rotina de Férias, Semanal Padrão).
  * Sincronização automática na nuvem através do **Supabase** ao fazer login.
  * Backup e restauro de presets via ficheiro JSON.
* **📅 Cronograma Cronológico Inteligente:**
  * Gera uma agenda detalhada passo a passo, distribuindo os episódios exatamente pelos teus horários livres disponíveis.
  * Ajuste automático para o próximo dia útil caso os horários de hoje já tenham passado.
* **📤 Exportação de Dados:**
  * Exporta a tua maratona completa e detalhada em formato **CSV** para acompanhar onde quiseres.
* **🔐 Autenticação Segura:**
  * Sistema de Login por E-mail e Palavra-passe integrado com Supabase e proteção por Row-Level Security (RLS).
  * Envio de e-mails otimizado via **Resend (SMTP)**.
* **📱 Design Totalmente Responsivo:**
  * Interface limpa, moderna e adaptada para computadores, tablets e telemóveis.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React, TypeScript, Tailwind CSS
* **Componentes & Ícones:** shadcn/ui (UI primitives), Lucide React
* **Backend & Base de Dados:** Supabase (Autenticação + PostgreSQL com RLS)
* **Envio de E-mails:** Resend SMTP Service
* **Deploy & Hospedagem:** Vercel

---

## 🚀 Como Executar o Projeto Localmente

Se quiseres clonar e executar o projeto na tua máquina, segue os passos abaixo:

1. **Clonar o repositório:**
   ```bash
   git clone [https://github.com/PedroHenrique957/marathon-planner-ph.git](https://github.com/PedroHenrique957/marathon-planner-ph.git)
   cd marathon-planner-ph