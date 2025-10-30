'use server';

/**
 * @fileOverview This file defines a Genkit flow that suggests potential data transformations
 * based on the user's goals for a Google Sheet.
 *
 * - suggestDataTransformations - A function that suggests data transformations.
 * - SuggestDataTransformationsInput - The input type for the suggestDataTransformations function.
 * - SuggestDataTransformationsOutput - The return type for the suggestDataTransformations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDataTransformationsInputSchema = z.object({
  vtexDataDescription: z
    .string()
    .describe(
      'A description of the data extracted from Vtex, including field names and data types.'
    ),
  userGoals: z
    .string()
    .describe('The user goals for the Google Sheet, i.e., what insights they want to gain.'),
});
export type SuggestDataTransformationsInput = z.infer<
  typeof SuggestDataTransformationsInputSchema
>;

const SuggestDataTransformationsOutputSchema = z.object({
  suggestedTransformations: z
    .string()
    .describe(
      'A list of suggested data transformations, including combining fields, calculating new metrics, etc.'
    ),
});
export type SuggestDataTransformationsOutput = z.infer<
  typeof SuggestDataTransformationsOutputSchema
>;

export async function suggestDataTransformations(
  input: SuggestDataTransformationsInput
): Promise<SuggestDataTransformationsOutput> {
  return suggestDataTransformationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDataTransformationsPrompt',
  input: {schema: SuggestDataTransformationsInputSchema},
  output: {schema: SuggestDataTransformationsOutputSchema},
  prompt: `You are an expert data analyst. Based on the description of the VTEX data and the user's goals for the Google Sheet, suggest potential data transformations that would help the user gain better insights.

VTEX Data Description: {{{vtexDataDescription}}}

User Goals: {{{userGoals}}}

Suggested Transformations:`,
});

const suggestDataTransformationsFlow = ai.defineFlow(
  {
    name: 'suggestDataTransformationsFlow',
    inputSchema: SuggestDataTransformationsInputSchema,
    outputSchema: SuggestDataTransformationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
