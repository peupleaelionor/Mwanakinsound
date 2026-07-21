import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore, toast } from '@/hooks/use-toast';

describe('toast store', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  it('pushes a toast with a generated id', () => {
    toast({ title: 'Publié', variant: 'success' });
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.title).toBe('Publié');
    expect(toasts[0]?.variant).toBe('success');
    expect(toasts[0]?.id).toBeTruthy();
  });

  it('auto-dismisses after 4s', () => {
    toast({ title: 'Temporaire' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismisses a toast by id', () => {
    toast({ title: 'A' });
    const id = useToastStore.getState().toasts[0]!.id;
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
