import { useCallback, useEffect, useState } from 'react';

import { loadFeedbackLevel, saveFeedbackLevel } from '../storage';
import {
  FEEDBACK_LEVELS,
  setFeedbackLevel as applyFeedbackLevel,
  type FeedbackLevel,
} from '../utils/feedback';

function isLevel(value: unknown): value is FeedbackLevel {
  return typeof value === 'string' && (FEEDBACK_LEVELS as string[]).includes(value);
}

/** 管理全局震动档位：读取、持久化，并同步给 feedback 工具 */
export function useFeedbackLevel() {
  const [feedbackLevel, setLevel] = useState<FeedbackLevel>('standard');
  const [feedbackReady, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadFeedbackLevel().then((stored) => {
      if (!alive) return;
      const next = isLevel(stored) ? stored : 'standard';
      setLevel(next);
      applyFeedbackLevel(next);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const changeLevel = useCallback((next: FeedbackLevel) => {
    setLevel(next);
    applyFeedbackLevel(next);
    void saveFeedbackLevel(next);
  }, []);

  return { feedbackLevel, changeLevel, feedbackReady };
}
