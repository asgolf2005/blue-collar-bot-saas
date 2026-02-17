export interface CompletionRequirement {
  id: string
  label: string
  description: string
  hardFail: boolean
}

export const COMPLETION_REQUIREMENTS: CompletionRequirement[] = [
  {
    id: 'problem-identified-before',
    label: 'Problem identified',
    description: 'Before evidence clearly shows the original issue or failure condition.',
    hardFail: true,
  },
  {
    id: 'problem-resolved-after',
    label: 'Problem resolved',
    description: 'After evidence indicates the original issue is no longer present.',
    hardFail: true,
  },
  {
    id: 'notes-align-with-visuals',
    label: 'Notes align with visuals',
    description: 'Latest job note summary does not contradict visual evidence.',
    hardFail: false,
  },
]

export function formatCompletionRequirementsForPrompt(): string {
  return COMPLETION_REQUIREMENTS.map(
    (item) =>
      `- ${item.id}: ${item.label}. ${item.description} (hardFail=${item.hardFail ? 'yes' : 'no'})`
  ).join('\n')
}
