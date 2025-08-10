export type FieldType = 'text' | 'textarea' | 'select';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
}

export interface ElicitationForm {
  title?: string;
  fields: FormField[];
}

export type FormResponse = Record<string, string>;

export type HumanInputRequest = string | ElicitationForm;
export type HumanInputResponse = string | FormResponse;

export interface HumanInputCallback {
  (prompt: HumanInputRequest): Promise<HumanInputResponse>;
}
