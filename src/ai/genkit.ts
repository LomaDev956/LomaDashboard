
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import type {Plugin} from 'genkit';

const plugins: Plugin[] = [];

// The API key should be provided via the GOOGLE_API_KEY environment variable.
// This is a more secure and standard practice than hardcoding keys.
const apiKey = process.env.GOOGLE_API_KEY;

if (apiKey && apiKey.trim() !== '') {
  plugins.push(googleAI({apiKey: apiKey}));
} else {
  // This is a warning for developers. The app will still run without AI features.
  console.log(
    'WARN: GOOGLE_API_KEY environment variable not set. Genkit AI features will be disabled.'
  );
}

export const ai = genkit({
  plugins,
  // By removing the global model definition, we let Genkit use its default
  // or allow individual flows to specify their own, avoiding startup errors
  // if a specific global model name is unavailable.
});
