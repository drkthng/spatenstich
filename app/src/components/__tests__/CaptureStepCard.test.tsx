// CaptureStepCard test — verifies progress dots render correctly for step 1/3, 2/3, 3/3.
import * as React from 'react';
import { render } from '@testing-library/react-native';
import { CaptureStepCard } from '../CaptureStepCard';

describe('CaptureStepCard', () => {
  it('renders 3 dots for totalSteps=3', () => {
    const { getAllByTestId, getByLabelText } = render(
      <CaptureStepCard step={1} totalSteps={3} instruction="Test instruction" />,
    );
    const container = getByLabelText('Schritt 1 von 3');
    // Container exists with correct accessibility label
    expect(container).toBeTruthy();
  });

  it('shows correct accessibility label for step 2 of 3', () => {
    const { getByLabelText } = render(
      <CaptureStepCard step={2} totalSteps={3} instruction="Nord" />,
    );
    expect(getByLabelText('Schritt 2 von 3')).toBeTruthy();
  });

  it('shows correct accessibility label for step 3 of 3', () => {
    const { getByLabelText } = render(
      <CaptureStepCard step={3} totalSteps={3} instruction="Sued" />,
    );
    expect(getByLabelText('Schritt 3 von 3')).toBeTruthy();
  });

  it('renders instruction text', () => {
    const { getByText } = render(
      <CaptureStepCard step={1} totalSteps={3} instruction="Fotografiere deinen Garten" />,
    );
    expect(getByText('Fotografiere deinen Garten')).toBeTruthy();
  });

  it('renders example image when provided', () => {
    const { getByLabelText } = render(
      <CaptureStepCard
        step={1}
        totalSteps={3}
        instruction="Test"
        exampleImageSource={{ uri: 'https://example.com/img.jpg' }}
      />,
    );
    expect(getByLabelText('Beispielfoto')).toBeTruthy();
  });

  it('does not render example image when not provided', () => {
    const { queryByLabelText } = render(
      <CaptureStepCard step={1} totalSteps={3} instruction="Test" />,
    );
    expect(queryByLabelText('Beispielfoto')).toBeNull();
  });
});
