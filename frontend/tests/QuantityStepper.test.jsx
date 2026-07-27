import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuantityStepper from '../src/components/QuantityStepper';

describe('QuantityStepper', () => {
  it('calls onChange with value + 1 when incrementing', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={2} onChange={onChange} />);

    await user.click(screen.getByLabelText('Aumentar quantidade'));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with value - 1 when decrementing', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={2} onChange={onChange} />);

    await user.click(screen.getByLabelText('Diminuir quantidade'));

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('disables the decrement button at min and never calls onChange below it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={1} onChange={onChange} min={1} />);

    const decrementButton = screen.getByLabelText('Diminuir quantidade');
    expect(decrementButton).toBeDisabled();

    await user.click(decrementButton);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables the increment button at max', () => {
    render(<QuantityStepper value={5} onChange={() => {}} max={5} />);
    expect(screen.getByLabelText('Aumentar quantidade')).toBeDisabled();
  });
});
