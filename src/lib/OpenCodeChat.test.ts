import type { PluginInput } from '@opencode-ai/plugin';
import { describe, expect, it, vi } from 'vitest';
import { createInstructionInjector } from './OpenCodeChat';

type PromptPayload = {
  path: { id: string };
  body: {
    agent?: string;
    noReply?: boolean;
    model?: { providerID: string; modelID: string };
    variant?: string;
    parts: Array<{ type: string; text: string }>;
  };
};

type SessionModel = { id: string; providerID: string; variant?: string };

function createCtx(session: { data?: { model?: SessionModel } } | Error) {
  const promptMock = vi.fn<(...args: [PromptPayload]) => Promise<void>>(async () => undefined);
  const getMock = vi.fn(async () => {
    if (session instanceof Error) {
      throw session;
    }
    return session;
  });

  const ctx = {
    client: {
      session: {
        get: getMock,
        prompt: promptMock,
      },
    },
  } as unknown as PluginInput;

  return { ctx, promptMock, getMock };
}

describe('createInstructionInjector', () => {
  it('sends silent prompt using the original agent', async () => {
    const { ctx, promptMock } = createCtx({
      data: { model: { id: 'claude-sonnet-4', providerID: 'anthropic', variant: 'default' } },
    });

    const sendPrompt = createInstructionInjector(ctx);

    await sendPrompt('skill payload', {
      sessionId: 'session-123',
      agent: 'frontend-developer',
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(promptMock).toHaveBeenCalledWith({
      path: { id: 'session-123' },
      body: {
        agent: 'frontend-developer',
        noReply: true,
        model: { providerID: 'anthropic', modelID: 'claude-sonnet-4' },
        parts: [{ type: 'text', text: 'skill payload' }],
      },
    });
  });

  it('mirrors a non-default session variant', async () => {
    const { ctx, promptMock } = createCtx({
      data: { model: { id: 'gpt-5.6-sol', providerID: 'openai', variant: 'high' } },
    });

    const sendPrompt = createInstructionInjector(ctx);

    await sendPrompt('skill payload', { sessionId: 'session-123', agent: 'build' });

    expect(promptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          model: { providerID: 'openai', modelID: 'gpt-5.6-sol' },
          variant: 'high',
        }),
      })
    );
  });

  it('omits model fields when the session has no stored model', async () => {
    const { ctx, promptMock } = createCtx({ data: {} });

    const sendPrompt = createInstructionInjector(ctx);

    await sendPrompt('skill payload', { sessionId: 'session-123', agent: 'build' });

    expect(promptMock).toHaveBeenCalledWith({
      path: { id: 'session-123' },
      body: {
        agent: 'build',
        noReply: true,
        parts: [{ type: 'text', text: 'skill payload' }],
      },
    });
  });

  it('omits model fields when the session lookup fails', async () => {
    const { ctx, promptMock } = createCtx(new Error('session not found'));

    const sendPrompt = createInstructionInjector(ctx);

    await sendPrompt('skill payload', { sessionId: 'session-123', agent: 'build' });

    expect(promptMock).toHaveBeenCalledWith({
      path: { id: 'session-123' },
      body: {
        agent: 'build',
        noReply: true,
        parts: [{ type: 'text', text: 'skill payload' }],
      },
    });
  });
});
