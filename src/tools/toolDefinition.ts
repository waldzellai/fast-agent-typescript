export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, Omit<ToolParameter, 'name' | 'required'>>;
  required?: string[];
}

export interface ToolResponse {
  type: string;
  description?: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters?: ToolParameters;
  response?: ToolResponse;
}

export interface ToolDefinition extends ToolSchema {
  handler: (args: Record<string, any>, ctx?: any) => Promise<any> | any;
}
