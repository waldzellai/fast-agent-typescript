import { ElicitationForm, FormResponse, HumanInputCallback } from './types';
import { consoleInputCallback } from './handler';

export async function runElicitationForm(
  form: ElicitationForm,
  callback: HumanInputCallback = consoleInputCallback
): Promise<FormResponse> {
  const result = await callback(form);
  return typeof result === 'string' ? { value: result } : result;
}
