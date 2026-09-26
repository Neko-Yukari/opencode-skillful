import { describe, expect, it } from 'vitest';
import type { PluginLogger } from '../types';
import {
  createSkillRegistry,
  stripTrailingPathSeparators,
  suggestSkillsDirectoryPath,
} from './SkillRegistry';

describe('stripTrailingPathSeparators', () => {
  it('removes trailing forward slashes', () => {
    expect(stripTrailingPathSeparators('/tmp/skill///')).toBe('/tmp/skill');
  });

  it('removes trailing backslashes', () => {
    expect(stripTrailingPathSeparators('C:\\tmp\\skill\\\\')).toBe('C:\\tmp\\skill');
  });

  it('keeps paths without trailing separators unchanged', () => {
    expect(stripTrailingPathSeparators('/tmp/skill')).toBe('/tmp/skill');
  });
});

describe('suggestSkillsDirectoryPath', () => {
  it('handles uppercase SKILL suffix case-insensitively', () => {
    const result = suggestSkillsDirectoryPath('/tmp/SKILL');
    expect(result).toBe('/tmp/skills');
  });

  it('returns "skills" when path is only "skill"', () => {
    expect(suggestSkillsDirectoryPath('skill')).toBe('skills');
  });

  it('returns "skills" when path is only "SKILL"', () => {
    expect(suggestSkillsDirectoryPath('SKILL')).toBe('skills');
  });

  it('supports trailing separators before checking suffix', () => {
    expect(suggestSkillsDirectoryPath('/tmp/skill/')).toBe('/tmp/skills');
    expect(suggestSkillsDirectoryPath('C:\\tmp\\skill\\')).toBe('C:\\tmp\\skills');
  });

  it('returns null when path does not end with skill', () => {
    expect(suggestSkillsDirectoryPath('/tmp/skills')).toBeNull();
    expect(suggestSkillsDirectoryPath('/tmp/project')).toBeNull();
  });

  it('returns null for empty path', () => {
    expect(suggestSkillsDirectoryPath('')).toBeNull();
  });
});

describe('duplicate skill registration', () => {
  it('warns with both paths and keeps the last skill', async () => {
    const warnings: unknown[][] = [];
    const logger: PluginLogger = {
      debug: () => {},
      error: () => {},
      log: () => {},
      warn: (...message) => warnings.push(message),
    };
    const registry = await createSkillRegistry(
      {
        basePaths: ['/skills'],
        debug: false,
        promptRenderer: 'xml',
        modelRenderers: {},
      },
      logger
    );
    const firstPath = '/skills/duplicate-skill/SKILL.md';
    const secondPath = '/skills/duplicate_skill/SKILL.md';

    await registry.register(firstPath, secondPath);

    expect(registry.controller.get('duplicate_skill')?.path).toBe(secondPath);
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0]?.[0])).toContain(firstPath);
    expect(String(warnings[0]?.[0])).toContain(secondPath);
  });
});
