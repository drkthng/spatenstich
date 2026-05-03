// Review screen unit test — verifies 1-photo warning shows InlineBanner when photos.length === 1.
// Phase 4 Plan 03 Task 2 verification requirement.
import * as React from 'react';
import { render } from '@testing-library/react-native';
import { useCaptureStore } from '../../stores/captureStore';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));
jest.mock('@/src/lib/photoResizer', () => ({
  resizeToMaxMp: jest.fn().mockResolvedValue('resized-uri'),
}));
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const stub = (name: string) => (props: any) => React.createElement(name, props);
  return {
    Plus: stub('Plus'),
    AlertCircle: stub('AlertCircle'),
    X: stub('X'),
    Camera: stub('Camera'),
    Check: stub('Check'),
    Square: stub('Square'),
  };
});

// Import after mocks
import ReviewScreen from '../../../app/(app)/capture/review';

describe('ReviewScreen', () => {
  beforeEach(() => {
    useCaptureStore.setState({ photos: [] });
  });

  it('shows single-photo warning when exactly 1 photo', () => {
    useCaptureStore.setState({ photos: ['file:///photo1.jpg'] });
    const { getByTestId } = render(<ReviewScreen />);
    expect(getByTestId('single-photo-warning')).toBeTruthy();
  });

  it('does not show warning when 3 photos', () => {
    useCaptureStore.setState({
      photos: ['file:///p1.jpg', 'file:///p2.jpg', 'file:///p3.jpg'],
    });
    const { queryByTestId } = render(<ReviewScreen />);
    expect(queryByTestId('single-photo-warning')).toBeNull();
  });

  it('does not show warning when 0 photos', () => {
    useCaptureStore.setState({ photos: [] });
    const { queryByTestId } = render(<ReviewScreen />);
    expect(queryByTestId('single-photo-warning')).toBeNull();
  });
});
