import { describe, expect, it } from 'vitest';
import { buildFactGroundingContractBlock } from '../src/services/geminiService';

describe('buildFactGroundingContractBlock', () => {
  it('returns empty when no packets', () => {
    expect(buildFactGroundingContractBlock('ko', 'channel', false, false)).toBe('');
  });

  it('includes studio disclaimer when fact packet attached (ko)', () => {
    const s = buildFactGroundingContractBlock('ko', 'channel', true, true);
    expect(s).toContain('팩트 근거 계약');
    expect(s).toContain('스튜디오');
    expect(s).toContain('rva');
  });

  it('includes English contract and ANALYTICS keys for video', () => {
    const s = buildFactGroundingContractBlock('en', 'video', true, true);
    expect(s).toContain('FACT_GROUNDING_CONTRACT');
    expect(s).toContain('er, lr, cr, tg');
  });
});
