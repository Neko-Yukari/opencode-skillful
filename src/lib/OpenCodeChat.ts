import type { PluginInput } from '@opencode-ai/plugin';

/** Model fields mirrored onto a synthetic prompt. */
type SessionModelFields = {
  model?: { providerID: string; modelID: string };
  variant?: string;
};

/** Session rows persist their model as `{ id, providerID, variant? }`. */
type StoredSessionModel = {
  id?: string;
  providerID?: string;
  variant?: string;
};

/**
 * Mirror the target session's current model onto the prompt.
 *
 * OpenCode resolves a prompt's model as `input.model ?? agent.model ?? session
 * model`, then persists the resolved pair onto the session whenever it differs
 * from the stored one. Without this, the silent skill injection would rewrite
 * the session's model to the agent's configured model, switching the model out
 * from under the user mid-conversation.
 */
async function resolveSessionModelFields(
  ctx: PluginInput,
  sessionId: string
): Promise<SessionModelFields> {
  try {
    const response = await ctx.client.session.get({ path: { id: sessionId } });
    const stored = (response.data as { model?: StoredSessionModel } | undefined)?.model;

    if (!stored?.id || !stored.providerID) {
      return {};
    }

    return {
      model: { providerID: stored.providerID, modelID: stored.id },
      // 'default' means "no variant"; sending it would itself count as a change.
      ...(stored.variant && stored.variant !== 'default' ? { variant: stored.variant } : {}),
    };
  } catch {
    return {};
  }
}

export function createInstructionInjector(ctx: PluginInput) {
  // Message 1: Skill loading header (silent insertion - no AI response)
  const sendPrompt = async (text: string, props: { sessionId: string; agent: string }) => {
    const body = {
      agent: props.agent,
      noReply: true,
      parts: [{ type: 'text' as const, text }],
      ...(await resolveSessionModelFields(ctx, props.sessionId)),
    };

    await ctx.client.session.prompt({
      path: { id: props.sessionId },
      body,
    });
  };
  return sendPrompt;
}
