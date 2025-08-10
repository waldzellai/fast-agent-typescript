import { FormField } from './types';

export function textField(name: string, label: string, required = false): FormField {
  return { name, label, type: 'text', required };
}

export function textareaField(name: string, label: string, required = false): FormField {
  return { name, label, type: 'textarea', required };
}

export function selectField(
  name: string,
  label: string,
  options: string[],
  required = false
): FormField {
  return { name, label, type: 'select', options, required };
}
