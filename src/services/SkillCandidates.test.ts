import { describe, expect, it } from 'bun:test';
import { createMockRegistry, createMockSkill } from '../mocks.ts';
import { createSkillCandidateSnapshot } from './SkillCandidates.ts';

describe('skill candidate snapshot', () => {
  it('waits for discovery and returns detached metadata with loadable ids', async () => {
    const registry = await createMockRegistry();
    const snapshot = createSkillCandidateSnapshot(registry);
    let resolved = false;
    const pending = snapshot().then((result) => {
      resolved = true;
      return result;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    const skill = createMockSkill({
      name: 'writing',
      toolName: 'team_writing',
      description: 'Write and edit project documentation',
    });
    registry.controller.set(skill.toolName, skill);
    registry.controller.ready.setStatus('ready');

    const result = await pending;
    expect(result).toEqual({
      skills: [{ id: 'team_writing', name: 'writing', description: skill.description }],
    });
    result.skills[0].description = 'Changed by caller';
    expect(skill.description).toBe('Write and edit project documentation');

    registry.controller.clear();
    expect(await snapshot()).toEqual({ skills: [] });
  });
});
