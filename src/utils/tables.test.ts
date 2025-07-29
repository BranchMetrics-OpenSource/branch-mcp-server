import { createTable } from './tables.js';

describe('createTable', () => {
  it('should create a markdown table from an object', () => {
    const data = {
      key1: 'value1',
      key2: 'value2'
    };
    const expectedTable = '| Name | Description |\n|---|---|\n| `key1` | value1 |\n| `key2` | value2 |';
    expect(createTable(data)).toBe(expectedTable);
  });

  it('should create a markdown table with custom headers', () => {
    const data = {
      param1: 'description1'
    };
    const headers = ['Parameter', 'Details'];
    const expectedTable = '| Parameter | Details |\n|---|---|\n| `param1` | description1 |';
    expect(createTable(data, headers)).toBe(expectedTable);
  });
});
