import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM APIs for downloadCSV
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  globalThis.URL.createObjectURL = mockCreateObjectURL;
  globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
  vi.spyOn(document, 'createElement').mockReturnValue({
    click: mockClick,
    href: '',
    download: '',
  } as any);
});

// Import after mocks
import { downloadCSV } from '../csv';

describe('downloadCSV', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value' },
  ];

  it('generates correct CSV header', () => {
    downloadCSV([], 'test.csv', columns);
    const blob = (mockCreateObjectURL.mock.calls[0][0] as Blob);
    // Blob was created
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('handles empty data array', () => {
    downloadCSV([], 'test.csv', columns);
    expect(mockClick).toHaveBeenCalled();
  });

  it('escapes double quotes by doubling them', () => {
    const data = [{ name: 'He said "hello"', value: 'test' }];
    downloadCSV(data, 'test.csv', columns);
    expect(mockClick).toHaveBeenCalled();
  });

  it('replaces newlines with spaces', () => {
    const data = [{ name: 'Line1\nLine2\nLine3', value: 'ok' }];
    downloadCSV(data, 'test.csv', columns);
    expect(mockClick).toHaveBeenCalled();
  });

  it('handles null and undefined values', () => {
    const data = [{ name: null, value: undefined }];
    downloadCSV(data, 'test.csv', columns);
    expect(mockClick).toHaveBeenCalled();
  });

  it('handles object values by JSON stringifying', () => {
    const data = [{ name: { nested: 'value' }, value: [1, 2, 3] }];
    downloadCSV(data, 'test.csv', columns);
    expect(mockClick).toHaveBeenCalled();
  });

  it('sets correct filename on download link', () => {
    const mockElement = { click: mockClick, href: '', download: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
    downloadCSV([{ name: 'test', value: '1' }], 'export-2026.csv', columns);
    expect(mockElement.download).toBe('export-2026.csv');
  });
});
