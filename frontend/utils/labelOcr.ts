import { NativeModules } from 'react-native';
import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

/**
 * Whether on-device OCR is usable in the current runtime. The ML Kit native
 * module only exists in a dev/EAS build — in Expo Go it is absent, so we hide
 * the camera-scan affordance there and fall back to manual entry.
 */
export const isLabelOcrAvailable: boolean = !!NativeModules.TextRecognition;

/**
 * Pick the most likely "Name | Room | Roll" line out of an OCR result.
 *
 * A shipping label has lots of noise (courier name, barcode digits, address),
 * so we prefer the line that actually carries the pipe-delimited convention.
 * If none has a pipe (label not written to convention, or OCR dropped it), we
 * fall back to the longest line — usually the recipient block — and let the
 * guard correct it in the editable Smart-fill box before matching.
 */
export function extractLabelLine(result: TextRecognitionResult): string {
  const lines: string[] = [];
  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const text = line.text?.trim();
      if (text) lines.push(text);
    }
  }

  if (lines.length === 0) {
    return (result.text ?? '').trim();
  }

  const pipedLines = lines.filter((line) => line.includes('|'));
  if (pipedLines.length > 0) {
    // Most pipe segments == closest to the full "Name | Room | Roll" line.
    pipedLines.sort((a, b) => b.split('|').length - a.split('|').length);
    return pipedLines[0];
  }

  return lines.reduce((longest, line) => (line.length > longest.length ? line : longest), lines[0]);
}
