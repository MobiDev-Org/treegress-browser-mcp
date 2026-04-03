/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect } from './fixtures';

test.use({
  mcpArgs: ['--snapshot-engine=dom']
});

function snapshotText(response: { content: Array<{ text?: string }> }) {
  return response.content.map(entry => entry.text ?? '').join('\n');
}

function refFromSnapshot(text: string, matcher: RegExp): string {
  const match = text.match(matcher);
  expect(match, `Expected snapshot to match ${matcher}`).toBeTruthy();
  return match![1];
}

function refFromSnapshotLine(text: string, contains: string): string {
  const line = text.split('\n').find(line => line.includes(contains));
  expect(line, `Expected snapshot to contain a line with ${contains}`).toBeTruthy();
  const match = line!.match(/\[ref=(e\d+)\]/);
  expect(match, `Expected line to contain a ref: ${line}`).toBeTruthy();
  return match![1];
}

test('browser_snapshot with dom engine returns element ids', async ({ client, server }) => {
  server.setContent('/', `
    <title>DOM Snapshot</title>
    <button id="submit-btn" data-testid="submit-btn">Submit</button>
    <input id="name-input" data-testid="name-input" aria-label="Name" />
    <select id="color-select" data-testid="color-select">
      <option value="red">Red</option>
      <option value="green">Green</option>
      <option value="blue">Blue</option>
    </select>
    <script>
      document.querySelector('#submit-btn').addEventListener('click', () => {
        window.__clicked = true;
      });
    </script>
  `, 'text/html');

  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  const text = snapshotText(response);
  expect(text).toContain('[custom-dom]');
  expect(text).toContain('button "Submit"');
  expect(text).toContain('textbox "Name"');
  expect(text).toMatch(/combobox(?: "[^"]+")? \[ref=e\d+\]:/);
});

test('browser_click works with dom element id', async ({ client, server }) => {
  server.setContent('/', `
    <title>DOM Click</title>
    <button id="submit-btn" data-testid="submit-btn">Submit</button>
    <script>
      window.__clicked = false;
      document.querySelector('#submit-btn').addEventListener('click', () => {
        window.__clicked = true;
      });
    </script>
  `, 'text/html');

  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  const buttonRef = refFromSnapshot(snapshotText(response), /button "Submit" \[ref=(e\d+)\]/);

  expect(await client.callTool({
    name: 'browser_click',
    arguments: {
      ref: buttonRef,
      element: 'Submit button',
    },
  })).toHaveResponse({
    code: expect.stringContaining("await page.getByTestId('submit-btn').click();"),
  });

  expect(await client.callTool({
    name: 'browser_evaluate',
    arguments: {
      function: '() => window.__clicked',
    },
  })).toHaveResponse({ result: 'true' });
});

test('browser_type works with dom element id', async ({ client, server }) => {
  server.setContent('/', `
    <title>DOM Type</title>
    <input id="name-input" data-testid="name-input" aria-label="Name" />
  `, 'text/html');

  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  const inputRef = refFromSnapshotLine(snapshotText(response), 'textbox');

  expect(await client.callTool({
    name: 'browser_type',
    arguments: {
      ref: inputRef,
      element: 'Name field',
      text: 'Alice',
    },
  })).toHaveResponse({ code: expect.stringContaining("await page.getByTestId('name-input').fill(") });

  expect(await client.callTool({
    name: 'browser_evaluate',
    arguments: {
      function: '() => document.getElementById("name-input").value',
    },
  })).toHaveResponse({ result: '"Alice"' });
});

test('browser_select_option works with dom element id', async ({ client, server }) => {
  server.setContent('/', `
    <title>DOM Select</title>
    <select id="color-select" data-testid="color-select">
      <option value="red">Red</option>
      <option value="green">Green</option>
      <option value="blue">Blue</option>
    </select>
  `, 'text/html');

  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  const selectRef = refFromSnapshot(snapshotText(response), /combobox(?: "[^"]+")? \[ref=(e\d+)\]:/);

  expect(await client.callTool({
    name: 'browser_select_option',
    arguments: {
      ref: selectRef,
      element: 'Color select',
      values: ['Green'],
    },
  })).toHaveResponse({ code: expect.stringContaining("await page.getByTestId('color-select').selectOption(") });

  expect(await client.callTool({
    name: 'browser_evaluate',
    arguments: {
      function: '() => document.getElementById("color-select").value',
    },
  })).toHaveResponse({ result: '"green"' });
});

test('stale iframe refs expose frame diagnostics', async ({ client, server }) => {
  server.setContent('/', `
    <iframe srcdoc="<button id='inside'>Inside Frame</button>"></iframe>
    <script>
      setTimeout(() => document.querySelector('iframe')?.remove(), 500);
    </script>
  `, 'text/html');

  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  const buttonRef = refFromSnapshot(snapshotText(response), /button "Inside Frame" \[ref=(e\d+)\]/);
  await new Promise(resolve => setTimeout(resolve, 700));

  const errorResponse = await client.callTool({
    name: 'browser_click',
    arguments: {
      ref: buttonRef,
      element: 'Inside Frame button',
    },
  });
  const text = snapshotText(errorResponse);
  expect(errorResponse.isError).toBeTruthy();
  expect(text).toContain('Custom DOM resolver diagnostics:');
  expect(text).toContain('- alias: found');
  expect(text).toContain('- locator plan: found');
  expect(text).toContain('- frame: stale');
  expect(text).toContain('- outcome: frame stale');
});

test('removed elements expose no-match diagnostics and candidate counts', async ({ client, server }) => {
  server.setContent('/', `
    <button id="remove-me">Remove Me</button>
    <script>
      setTimeout(() => document.getElementById('remove-me')?.remove(), 500);
    </script>
  `, 'text/html');

  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  const buttonRef = refFromSnapshot(snapshotText(response), /button "Remove Me" \[ref=(e\d+)\]/);
  await new Promise(resolve => setTimeout(resolve, 700));

  const errorResponse = await client.callTool({
    name: 'browser_click',
    arguments: {
      ref: buttonRef,
      element: 'Remove Me button',
    },
  });
  const text = snapshotText(errorResponse);
  expect(errorResponse.isError).toBeTruthy();
  expect(text).toContain('Custom DOM resolver diagnostics:');
  expect(text).toContain('- alias: found');
  expect(text).toContain('- locator plan: found');
  expect(text).toContain('- frame: resolved');
  expect(text).toMatch(/- candidate .*count=0/);
  expect(text).toContain('- outcome: no candidate matched any element');
});
