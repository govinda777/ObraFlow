import { z } from "zod";

export const taskItemSchema = z.object({
  title: z.string().describe("Task description in the construction site, e.g., 'Alvenaria de vedação 14x19x39cm'"),
  laborCost: z.number().describe("Estimated labor cost in BRL"),
  estimatedDays: z.number().describe("Estimated duration in work days"),
  requiredMaterials: z.array(
    z.object({
      name: z.string().describe("Material name, e.g., 'Bloco cerâmico'"),
      quantity: z.number().describe("Quantity needed"),
      unit: z.string().describe("Unit of measurement, e.g., 'un', 'm2', 'sacos'"),
      estimatedUnitCost: z.number().describe("Unit cost in BRL"),
    })
  ),
});

export const epicSchema = z.object({
  title: z.string().describe("Macro-phase (Epic) name, e.g., 'Estrutura e Alvenaria', 'Instalações Hidráulicas'"),
  description: z.string().describe("Detailed scope description of this phase"),
  tasks: z.array(taskItemSchema),
});

export const eapDiagnosticSchema = z.object({
  projectName: z.string().describe("Extracted or derived project name"),
  totalAreaM2: z.number().optional().describe("Total construction area in square meters"),
  totalEstimatedCost: z.number().describe("Total sum of labor and materials in BRL"),
  epics: z.array(epicSchema).describe("List of all construction work breakdown phases"),
});

export type EAPDiagnostic = z.infer<typeof eapDiagnosticSchema>;
