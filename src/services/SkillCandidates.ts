import type { SkillCandidateSnapshot, SkillRegistry } from '../types.ts';

/** Read metadata from the existing registry without search-query filtering or loading content. */
export function createSkillCandidateSnapshot(provider: SkillRegistry) {
  return async (): Promise<SkillCandidateSnapshot> => {
    await provider.controller.ready.whenReady();

    return {
      skills: provider.controller.skills.map((skill) => ({
        id: skill.toolName,
        name: skill.name,
        description: skill.description,
      })),
    };
  };
}
