import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { FileText, Printer } from 'lucide-react';
import ActionMenu from '../src/components/ActionMenu';

function renderMenu(items, label) {
  return render(
    <MemoryRouter>
      <ActionMenu items={items} label={label} />
    </MemoryRouter>
  );
}

describe('ActionMenu', () => {
  it('renders nothing when there are no items', () => {
    const { container } = renderMenu([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the menu and shows the items on click', async () => {
    const user = userEvent.setup();
    renderMenu([{ key: 'a', label: 'Baixar comprovante', icon: FileText, onClick: () => {} }]);

    expect(screen.queryByText('Baixar comprovante')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mais ações/i }));

    expect(screen.getByText('Baixar comprovante')).toBeInTheDocument();
  });

  it('calls onClick and closes the menu when a button item is selected', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderMenu([{ key: 'a', label: 'Baixar comprovante', icon: FileText, onClick }]);

    await user.click(screen.getByRole('button', { name: /mais ações/i }));
    await user.click(screen.getByText('Baixar comprovante'));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText('Baixar comprovante')).not.toBeInTheDocument();
  });

  it('renders a link item as a route link instead of a button', async () => {
    const user = userEvent.setup();
    renderMenu([{ key: 'b', label: 'Imprimir etiqueta', icon: Printer, to: '/pedidos/1/etiqueta' }]);

    await user.click(screen.getByRole('button', { name: /mais ações/i }));

    const link = screen.getByRole('menuitem', { name: /imprimir etiqueta/i });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/pedidos/1/etiqueta');
  });

  it('closes the menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderMenu([{ key: 'a', label: 'Baixar comprovante', icon: FileText, onClick: () => {} }]);

    await user.click(screen.getByRole('button', { name: /mais ações/i }));
    expect(screen.getByText('Baixar comprovante')).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByText('Baixar comprovante')).not.toBeInTheDocument();
  });

  it('does not call onClick for a disabled item', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderMenu([{ key: 'a', label: 'Gerando...', icon: FileText, onClick, disabled: true }]);

    await user.click(screen.getByRole('button', { name: /mais ações/i }));
    await user.click(screen.getByText('Gerando...'));

    expect(onClick).not.toHaveBeenCalled();
  });
});
