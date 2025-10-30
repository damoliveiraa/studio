'use server';
/**
 * @fileOverview A flow that generates a data dictionary/schema based on a sample of data extracted from Vtex.
 *
 * - generateVtexDataDictionary - A function that generates the data dictionary.
 * - GenerateVtexDataDictionaryInput - The input type for the generateVtexDataDictionary function.
 * - GenerateVtexDataDictionaryOutput - The return type for the generateVtexDataDictionary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVtexDataDictionaryInputSchema = z.object({
  vtexDataSample: z
    .string()
    .describe('A sample of data extracted from Vtex in JSON format.'),
});
export type GenerateVtexDataDictionaryInput = z.infer<
  typeof GenerateVtexDataDictionaryInputSchema
>;

const GenerateVtexDataDictionaryOutputSchema = z.object({
  dataDictionary: z
    .string()
    .describe('A data dictionary/schema generated from the Vtex data sample.'),
});
export type GenerateVtexDataDictionaryOutput = z.infer<
  typeof GenerateVtexDataDictionaryOutputSchema
>;

export async function generateVtexDataDictionary(
  input: GenerateVtexDataDictionaryInput
): Promise<GenerateVtexDataDictionaryOutput> {
  return generateVtexDataDictionaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVtexDataDictionaryPrompt',
  input: {schema: GenerateVtexDataDictionaryInputSchema},
  output: {schema: GenerateVtexDataDictionaryOutputSchema},
  prompt: `You are a data analyst expert. Your task is to generate a clear and concise data dictionary/schema based on the provided sample of data extracted from Vtex.

  Here is the Vtex data sample:
  {{vtexDataSample}}

  Based on the data provided, define each field (column) of the dataset and determine its data type. Try to be accurate in your determination of data types. If you can't determine with certainty what the data type is, then use "string". Provide a brief description of each field.
  The data dictionary/schema must be in plain text format.
  `,
});

const generateVtexDataDictionaryFlow = ai.defineFlow(
  {
    name: 'generateVtexDataDictionaryFlow',
    inputSchema: GenerateVtexDataDictionaryInputSchema,
    outputSchema: GenerateVtexDataDictionaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
