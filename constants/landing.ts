export const navigation = [
  { label: "Problema", href: "#problema" },
  { label: "Solução", href: "#solucao" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Fluxo", href: "#fluxo" },
  { label: "Roadmap", href: "#roadmap" },
] as const;

export const painPoints = [
  ["Prazos esquecidos", "Entregas importantes se perdem entre conversas e anotações."],
  ["Cobranças pendentes", "Valores a receber ficam sem acompanhamento ou follow-up."],
  ["Escopo confuso", "O combinado muda e ninguém sabe qual é a versão correta."],
  ["Materiais espalhados", "Links, arquivos e referências ficam difíceis de encontrar."],
  ["Aprovações perdidas", "Decisões importantes somem no histórico das mensagens."],
  ["Obrigações esquecidas", "Tarefas recorrentes, como o DAS MEI, passam do prazo."],
] as const;

export const features = [
  ["Gestão de clientes", "Mantenha dados, contatos, observações e histórico de cada cliente."],
  ["Projetos vinculados", "Organize cada trabalho com status, prazo, valor e progresso."],
  ["Escopo claro", "Registre o que foi combinado e acompanhe o que já foi entregue."],
  ["Orçamentos e aprovações", "Acompanhe propostas enviadas, aprovadas ou recusadas."],
  ["Materiais centralizados", "Salve links, arquivos, imagens, briefings e referências por projeto."],
  ["Lembretes inteligentes", "Acompanhe prazos, cobranças, follow-ups e obrigações como DAS MEI."],
] as const;

export const workflow = [
  ["Cliente", "Cadastre contatos e contexto"], ["Projeto", "Organize o trabalho"],
  ["Escopo", "Defina o combinado"], ["Orçamento", "Registre a proposta"],
  ["Aprovação", "Confirme a decisão"], ["Entrega", "Acompanhe o progresso"],
  ["Pagamento", "Feche o ciclo"],
] as const;
