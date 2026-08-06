import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MedicationCombobox from '../src/components/MedicationCombobox';

const medications = [
  { id: '1', name: 'Dipirona', presentations: [{ id: 'p1', dosage: '500mg', unit: 'comprimido', active: true }] },
  { id: '2', name: 'Paracetamol', presentations: [{ id: 'p2', dosage: '750mg', unit: 'comprimido', active: true }] },
  { id: '3', name: 'Amoxicilina', presentations: [{ id: 'p3', dosage: '500mg', unit: 'cápsula', active: true }] },
];

describe('MedicationCombobox', () => {
  it('shows all medications when the input is focused with no query', async () => {
    const user = userEvent.setup();
    render(<MedicationCombobox medications={medications} value="" onChange={() => {}} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText(/Dipirona/)).toBeInTheDocument();
    expect(screen.getByText(/Paracetamol/)).toBeInTheDocument();
    expect(screen.getByText(/Amoxicilina/)).toBeInTheDocument();
  });

  it('filters the list as the user types part of the name', async () => {
    const user = userEvent.setup();
    render(<MedicationCombobox medications={medications} value="" onChange={() => {}} />);

    await user.type(screen.getByRole('combobox'), 'para');

    expect(screen.getByText(/Paracetamol/)).toBeInTheDocument();
    expect(screen.queryByText(/Dipirona/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Amoxicilina/)).not.toBeInTheDocument();
  });

  it('calls onChange with the medication id when an option is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MedicationCombobox medications={medications} value="" onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText(/Paracetamol/));

    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('displays the currently selected medication label when not being edited', () => {
    render(<MedicationCombobox medications={medications} value="3" onChange={() => {}} />);

    expect(screen.getByRole('combobox')).toHaveValue('Amoxicilina');
  });

  it('shows a message when no medication matches the query', async () => {
    const user = userEvent.setup();
    render(<MedicationCombobox medications={medications} value="" onChange={() => {}} />);

    await user.type(screen.getByRole('combobox'), 'inexistente');

    expect(screen.getByText('Nenhum medicamento encontrado')).toBeInTheDocument();
  });
});
