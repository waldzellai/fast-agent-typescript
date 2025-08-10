import { runElicitationForm } from '../../../../src/mcp_agent_ts/humanInput/elicitation_form';
import { textField } from '../../../../src/mcp_agent_ts/humanInput/forms';
import { ElicitationForm, HumanInputCallback } from '../../../../src/mcp_agent_ts/humanInput/types';

describe('Elicitation form', () => {
  it('collects responses using provided callback', async () => {
    const form: ElicitationForm = {
      title: 'Test',
      fields: [textField('name', 'Name'), textField('age', 'Age')],
    };

    const callback: HumanInputCallback = async () => ({ name: 'Alice', age: '30' });

    const result = await runElicitationForm(form, callback);
    expect(result).toEqual({ name: 'Alice', age: '30' });
  });
});
