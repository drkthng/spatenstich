// photoResizer unit tests — Phase 4 Plan 04-01 Task 02.
// Tests: resizeToMaxMp calls expo-image-manipulator with correct params.

const mockManipulateAsync = jest.fn();

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { resizeToMaxMp } from '../photoResizer';

describe('resizeToMaxMp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManipulateAsync.mockResolvedValue({
      uri: 'file:///resized/photo.jpg',
      width: 1092,
      height: 819,
    });
  });

  it('calls manipulateAsync with width 1092 and compress 0.85', async () => {
    await resizeToMaxMp('file:///original/photo.heic');

    expect(mockManipulateAsync).toHaveBeenCalledTimes(1);
    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///original/photo.heic',
      [{ resize: { width: 1092 } }],
      { compress: 0.85, format: 'jpeg' },
    );
  });

  it('returns the result.uri from manipulateAsync', async () => {
    const uri = await resizeToMaxMp('file:///original/photo.heic');

    expect(uri).toBe('file:///resized/photo.jpg');
  });
});
