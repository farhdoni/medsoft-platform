import { describe, expect, it } from 'vitest';
import { extForMime, pickRecorderMime, RECORDER_MIME_CANDIDATES } from '../useVoiceRecorder';

/** Builds an isTypeSupported stand-in that admits only the listed types. */
function supporting(...types: string[]) {
  return (t: string) => types.includes(t);
}

describe('pickRecorderMime', () => {
  it('prefers opus-in-webm when the browser offers everything', () => {
    expect(pickRecorderMime(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('falls back to plain webm when the codec-qualified type is refused', () => {
    expect(pickRecorderMime(supporting('audio/webm', 'audio/mp4'))).toBe('audio/webm');
  });

  it('picks mp4 on Safari, which supports no webm at all', () => {
    expect(pickRecorderMime(supporting('audio/mp4'))).toBe('audio/mp4');
  });

  it('returns undefined so MediaRecorder chooses when nothing matches', () => {
    expect(pickRecorderMime(() => false)).toBeUndefined();
  });

  it('treats a throwing isTypeSupported as an unsupported type, not a crash', () => {
    // Some WebViews expose MediaRecorder without the static probe.
    expect(pickRecorderMime(() => { throw new TypeError('not a function'); })).toBeUndefined();
  });

  it('asks about candidates in preference order and stops at the first hit', () => {
    const asked: string[] = [];
    pickRecorderMime((t) => { asked.push(t); return t === 'audio/webm'; });
    expect(asked).toEqual(['audio/webm;codecs=opus', 'audio/webm']);
  });

  it('only ever proposes types the recorder can name', () => {
    expect([...RECORDER_MIME_CANDIDATES]).toEqual([
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
    ]);
  });
});

describe('extForMime', () => {
  it('strips codec parameters before matching', () => {
    // The regression that made uploads land with no extension at all.
    expect(extForMime('audio/webm;codecs=opus')).toBe('webm');
  });

  it('maps the containers each engine actually produces', () => {
    expect(extForMime('audio/webm')).toBe('webm');
    expect(extForMime('audio/mp4')).toBe('m4a');
    expect(extForMime('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extForMime('audio/mpeg')).toBe('mp3');
    expect(extForMime('audio/wav')).toBe('wav');
  });

  it('ignores case and stray whitespace', () => {
    expect(extForMime('AUDIO/MP4 ; codecs=mp4a.40.2')).toBe('m4a');
  });

  it('falls back to webm rather than to no extension', () => {
    // An extensionless upload is served as application/octet-stream and will
    // not play, so guessing wrong beats guessing nothing.
    expect(extForMime('')).toBe('webm');
    expect(extForMime('application/octet-stream')).toBe('webm');
  });
});
