import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BlueprintPanel from '../components/dashboard/BlueprintPanel.js';

// Mock the api module
vi.mock('../api.js', () => ({
  api: {
    startDemoRun: vi.fn().mockResolvedValue({
      run: { id: 'demo-run-123' },
      message: 'Demo run started',
      blueprint: '# Test Blueprint',
    }),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BlueprintPanel', () => {
  test('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <BlueprintPanel />
      </MemoryRouter>
    );
    expect(container).toBeDefined();
  });

  test('shows Demo Blueprint heading', () => {
    render(
      <MemoryRouter>
        <BlueprintPanel />
      </MemoryRouter>
    );
    expect(screen.getByText('Demo Blueprint')).toBeDefined();
  });

  test('shows description text', () => {
    render(
      <MemoryRouter>
        <BlueprintPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Start a demo run/)).toBeDefined();
  });

  test('has a textarea for blueprint input', () => {
    render(
      <MemoryRouter>
        <BlueprintPanel />
      </MemoryRouter>
    );
    const textarea = screen.getByRole('textbox', { name: /blueprint/i });
    expect(textarea).toBeDefined();
    expect(textarea).toHaveProperty('placeholder');
  });

  test('shows demo mode warning', () => {
    render(
      <MemoryRouter>
        <BlueprintPanel />
      </MemoryRouter>
    );
    expect(screen.getByText(/Demo runs do not push/i)).toBeDefined();
  });

  test('has Load Mini Blueprint button', () => {
    render(
      <MemoryRouter>
        <BlueprintPanel />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Load Mini Blueprint/i })).toBeDefined();
  });

  test('has Start Demo Run button', () => {
    render(
      <MemoryRouter>
        <BlueprintPanel />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Start Demo Run/i })).toBeDefined();
  });
});
