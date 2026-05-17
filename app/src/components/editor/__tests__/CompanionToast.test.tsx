// Phase 9 Plan 03: CompanionToast component tests (COMP-01-e/f/g/h).
import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CompanionToast } from '../CompanionToast';

describe('CompanionToast', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('renders error variant with testID and message', () => {
    const { getByTestId, getByText } = render(
      <CompanionToast
        variant="error"
        message="Konflikt: Tomate vertraegt sich nicht mit Kartoffel"
        onDismiss={jest.fn()}
        testID="companion-toast-error"
      />
    );
    expect(getByTestId('companion-toast-error')).toBeTruthy();
    expect(getByText(/Konflikt.*Tomate.*Kartoffel/)).toBeTruthy();
  });

  it('renders success variant with testID and message', () => {
    const { getByTestId, getByText } = render(
      <CompanionToast
        variant="success"
        message="Gute Nachbarschaft: Tomate + Basilikum"
        onDismiss={jest.fn()}
        testID="companion-toast-success"
      />
    );
    expect(getByTestId('companion-toast-success')).toBeTruthy();
    expect(getByText(/Gute Nachbarschaft.*Tomate.*Basilikum/)).toBeTruthy();
  });

  it('auto-dismisses after 4000ms by default', () => {
    const onDismiss = jest.fn();
    render(
      <CompanionToast variant="error" message="test" onDismiss={onDismiss} />
    );
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(4000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss X button fires onDismiss immediately', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <CompanionToast variant="error" message="test" onDismiss={onDismiss} />
    );
    fireEvent.press(getByLabelText('Hinweis schliessen'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('custom autoDismissMs fires at correct time', () => {
    const onDismiss = jest.fn();
    render(
      <CompanionToast variant="success" message="test" onDismiss={onDismiss} autoDismissMs={2000} />
    );
    act(() => { jest.advanceTimersByTime(1999); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
