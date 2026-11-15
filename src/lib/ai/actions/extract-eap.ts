import { generateObject } from "ai";
import { geminiFlashModel } from "..";
import { eapDiagnosticSchema, type EAPDiagnostic } from "../schemas/eap.schema";

export interface ExtractEAPInput {
  documentText: string;
  projectContext?: string;
}

/**
 * Extracts a complete Work Breakdown Structure (EAP) from architectural/engineering texts.
 * Executes on the server using Google Gemini 2.5 Flash with strict Zod validation.
 */
export async function extractEAPFromDocument({
  documentText,
  projectContext = "",
}: ExtractEAPInput): Promise<EAPDiagnostic> {
  const { object: eap } = await generateObject({
    model: geminiFlashModel,
    prompt: `Você é um Engenheiro Orçamentista sênior especialista em normas ABNT e tabelas SINAPI/TCPO.
Analise as especificações do projeto abaixo e gere a EAP (Estrutura Analítica de Projeto) detalhada com macroetapas (Épicos), tarefas executivas, custos estimados de mão de obra e materiais necessários.

Contexto do Projeto:
${projectContext}

Especificações / Memorial Descritivo:
${documentText}`,
    schema: eapDiagnosticSchema,
  });

  return eap;
}
