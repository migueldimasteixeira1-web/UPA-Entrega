import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../src/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the Portuguese label for a known status', () => {
    render(<StatusBadge status="EM_ROTA" />);
    expect(screen.getByText('Em rota')).toBeInTheDocument();
  });

  it('falls back to the raw status string when it has no label', () => {
    render(<StatusBadge status="ALGO_DESCONHECIDO" />);
    expect(screen.getByText('ALGO_DESCONHECIDO')).toBeInTheDocument();
  });
});
