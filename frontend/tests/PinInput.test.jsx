import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PinInput from '../src/components/PinInput';

// PinInput é controlado (o valor vem inteiramente da prop `value`) — um
// wrapper com estado real reproduz o uso de verdade, com re-render a cada
// dígito, igual à tela de confirmação de entrega.
function ControlledPinInput({ onChange }) {
  const [value, setValue] = useState('');
  return (
    <PinInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('PinInput', () => {
  it('fills each box in order and auto-advances focus while typing', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledPinInput onChange={onChange} />);

    const boxes = screen.getAllByLabelText(/Dígito \d do PIN/);
    expect(boxes).toHaveLength(6);

    await user.type(boxes[0], '123456');

    expect(onChange).toHaveBeenLastCalledWith('123456');
    boxes.forEach((box, i) => expect(box).toHaveValue(String(i + 1)));
  });

  it('backspace on a filled box only clears that box', async () => {
    const user = userEvent.setup();
    render(<ControlledPinInput />);
    const boxes = screen.getAllByLabelText(/Dígito \d do PIN/);

    await user.type(boxes[0], '123456');
    boxes[2].focus();
    fireEvent.keyDown(boxes[2], { key: 'Backspace' });

    expect(boxes[2]).toHaveValue('');
    expect(boxes[0]).toHaveValue('1');
    expect(boxes[5]).toHaveValue('6');
  });

  it('backspace on an empty box moves focus back and clears the previous digit', async () => {
    const user = userEvent.setup();
    render(<ControlledPinInput />);
    const boxes = screen.getAllByLabelText(/Dígito \d do PIN/);

    await user.type(boxes[0], '12');
    boxes[2].focus();
    await user.keyboard('{Backspace}');

    expect(boxes[1]).toHaveValue('');
    expect(boxes[1]).toHaveFocus();
  });

  it('pasting a full PIN fills every box at once', () => {
    const onChange = vi.fn();
    render(<ControlledPinInput onChange={onChange} />);
    const boxes = screen.getAllByLabelText(/Dígito \d do PIN/);

    fireEvent.paste(boxes[0], { clipboardData: { getData: () => '654321' } });

    expect(onChange).toHaveBeenCalledWith('654321');
    boxes.forEach((box, i) => expect(box).toHaveValue('654321'[i]));
  });

  it('ignores non-digit characters', async () => {
    const user = userEvent.setup();
    render(<ControlledPinInput />);
    const boxes = screen.getAllByLabelText(/Dígito \d do PIN/);

    await user.type(boxes[0], 'a1b2');

    expect(boxes[0]).toHaveValue('1');
    expect(boxes[1]).toHaveValue('2');
  });
});
