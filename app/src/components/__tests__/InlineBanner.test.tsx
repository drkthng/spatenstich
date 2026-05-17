// Phase 9 Plan 01: InlineBanner error/success variants (COMP-01-i/j).
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InlineBanner } from '../InlineBanner';

describe('InlineBanner', () => {
  it('renders warning variant by default with testID', () => {
    const { getByTestId } = render(
      <InlineBanner message="Warnung" testID="banner-warn" />
    );
    expect(getByTestId('banner-warn')).toBeTruthy();
  });

  it('renders error variant with testID and message text', () => {
    const { getByTestId, getByText } = render(
      <InlineBanner variant="error" message="Fehler aufgetreten" testID="banner-error" />
    );
    expect(getByTestId('banner-error')).toBeTruthy();
    expect(getByText('Fehler aufgetreten')).toBeTruthy();
  });

  it('renders success variant with testID and message text', () => {
    const { getByTestId, getByText } = render(
      <InlineBanner variant="success" message="Alles gut" testID="banner-success" />
    );
    expect(getByTestId('banner-success')).toBeTruthy();
    expect(getByText('Alles gut')).toBeTruthy();
  });

  it('dismiss X button calls onDismiss and hides banner', () => {
    const onDismiss = jest.fn();
    const { getByLabelText, queryByTestId } = render(
      <InlineBanner variant="error" message="test" onDismiss={onDismiss} testID="banner-d" />
    );
    fireEvent.press(getByLabelText('Hinweis schließen'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(queryByTestId('banner-d')).toBeNull();
  });
});
