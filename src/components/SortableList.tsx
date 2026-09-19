import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { tintOf } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { reorderStartFeedback } from '../utils/feedback';

/** 手指在长按激活前移动超过这个距离，就认为用户想滚列表，取消本次拖拽 */
const MOVE_TOLERANCE = 8;

/** 被「拿起来」的行放大一点点，让手感有实体的重量 */
const DRAGGING_SCALE = 1.02;

/** 拿起来之后的底色：强调色的一层淡淡的水，放下即还原 */
const DRAGGING_TINT_ALPHA = '2E';

interface SortableListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  /** 固定行高，用来把手指位移换算成「跨过了几行」 */
  rowHeight: number;
  /** 长按多久进入拖拽 */
  longPressDelay?: number;
  /** 拖拽中那一行的底色，默认取主题强调色 */
  draggingBackground?: string;
  onReorder: (from: number, to: number) => void;
  /** 拖拽状态变化。外层可以据此暂时关掉 ScrollView 的滚动，避免两个手势打架 */
  onDraggingChange?: (dragging: boolean) => void;
  renderItem: (item: T, index: number, dragging: boolean) => ReactNode;
  backgroundColor: string;
}

interface RowProps {
  itemKey: string;
  index: number;
  count: number;
  rowHeight: number;
  longPressDelay: number;
  draggingBackground: string;
  dragging: boolean;
  onDragStart: (key: string) => void;
  onDragEnd: () => void;
  onReorder: (from: number, to: number) => void;
  backgroundColor: string;
  children: ReactNode;
}

/**
 * 单个可拖拽行。
 *
 * 「跟手」靠两个位移相加：
 *   · dragY   —— 手指移动了多少
 *   · settleY —— 列表重排后，自己那个坑被挪走多少的补偿
 * 只靠 dragY 的话，行一换位就会瞬间跳一格。
 *
 * 两个关键点（也是之前闪 + 拖不动的原因）：
 *   1. 补偿量必须在 useLayoutEffect 里算 —— 用 useEffect 的话行已经先画在新
 *      位置上一帧了，下一帧才被拉回来，看起来就是「快速闪烁」。
 *   2. 所有会变的值都塞进 ref，让 PanResponder 只创建一次。之前它依赖了每次
 *      render 都变的内联 onReorder，重排一次就重建一次，正在进行的 responder
 *      当场失效，表现为「拖不动 / 松手后回到原位」。
 */
function SortableRow({
  itemKey,
  index,
  count,
  rowHeight,
  longPressDelay,
  draggingBackground,
  dragging,
  onDragStart,
  onDragEnd,
  onReorder,
  backgroundColor,
  children,
}: RowProps) {
  const settleY = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const isDragging = useRef(false);
  /** 本次拖拽从哪一行开始，用来算补偿量 */
  const startIndex = useRef(index);
  /** 当前真正渲染在第几行（跟着父组件传下来的 index 走） */
  const slotIndex = useRef(index);

  /** 每次 render 同步一份最新值，供 PanResponder 与定时器读取，避免闭包过期 */
  const live = useRef({ index, count, rowHeight, onReorder });
  live.current = { index, count, rowHeight, onReorder };

  const translateY = useMemo(() => Animated.add(settleY, dragY), [settleY, dragY]);

  useLayoutEffect(() => {
    if (slotIndex.current === index) return;
    const from = slotIndex.current;
    slotIndex.current = index;

    // 拖拽中：立刻抵消被挪走的距离，让行始终贴住手指
    if (isDragging.current) {
      settleY.setValue((startIndex.current - index) * rowHeight);
      return;
    }

    // 非拖拽引起的位置变化（增删条目等）：从旧位置滑过去
    settleY.setValue((from - index) * rowHeight);
    Animated.spring(settleY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  }, [index, rowHeight, settleY]);

  const endDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    slotIndex.current = live.current.index;
    startIndex.current = live.current.index;
    dragY.setValue(0);
    settleY.setValue(0);
    onDragEnd();
  }, [dragY, settleY, onDragEnd]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // 不主动抢手势，否则整个列表就没法滚了
        onStartShouldSetPanResponder: () => false,
        // 长按激活之后才接管
        onMoveShouldSetPanResponder: () => isDragging.current,
        onMoveShouldSetPanResponderCapture: () => isDragging.current,
        onPanResponderMove: (_event, gesture) => {
          if (!isDragging.current) return;
          dragY.setValue(gesture.dy);

          const { rowHeight: h, count: n, onReorder: reorder } = live.current;
          const offset = Math.round(gesture.dy / h);
          const target = Math.min(Math.max(startIndex.current + offset, 0), n - 1);
          if (target !== slotIndex.current) reorder(slotIndex.current, target);
        },
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [dragY, endDrag],
  );

  /* ---- 长按检测：用原生 touch 事件做定时器，比叠一层 Pressable 可靠 ---- */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef(0);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    if (isDragging.current) return;
    touchStartY.current = event.nativeEvent.pageY;
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      isDragging.current = true;
      startIndex.current = live.current.index;
      slotIndex.current = live.current.index;
      dragY.setValue(0);
      settleY.setValue(0);
      reorderStartFeedback();
      onDragStart(itemKey);
    }, longPressDelay);
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    if (!timer.current) return;
    if (Math.abs(event.nativeEvent.pageY - touchStartY.current) > MOVE_TOLERANCE) clearTimer();
  };

  /** 松手 / 手势被抢走：清掉定时器，并且如果已经在拖拽就收尾 */
  const handleTouchEnd = () => {
    clearTimer();
    endDrag();
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={[
        styles.row,
        { backgroundColor: dragging ? draggingBackground : backgroundColor },
        dragging && styles.dragging,
        {
          transform: [{ translateY }, { scale: dragging ? DRAGGING_SCALE : 1 }],
        },
      ]}
    >
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

export function SortableList<T>({
  items,
  keyExtractor,
  rowHeight,
  longPressDelay = 250,
  draggingBackground,
  onReorder,
  onDraggingChange,
  renderItem,
  backgroundColor,
}: SortableListProps<T>) {
  const { colors } = useTheme();
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const highlight = draggingBackground ?? tintOf(colors.accent, DRAGGING_TINT_ALPHA);

  /** 同样用 ref 兜住，保证下面两个 callback 恒等，不会连累 PanResponder */
  const changeRef = useRef(onDraggingChange);
  changeRef.current = onDraggingChange;

  const handleDragStart = useCallback((key: string) => {
    setDraggingKey(key);
    changeRef.current?.(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingKey(null);
    changeRef.current?.(false);
  }, []);

  return (
    <View>
      {items.map((item, index) => {
        const key = keyExtractor(item);
        const dragging = draggingKey === key;
        return (
          <SortableRow
            key={key}
            itemKey={key}
            index={index}
            count={items.length}
            rowHeight={rowHeight}
            longPressDelay={longPressDelay}
            draggingBackground={highlight}
            dragging={dragging}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onReorder={onReorder}
            backgroundColor={backgroundColor}
          >
            {renderItem(item, index, dragging)}
          </SortableRow>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { zIndex: 0 },
  content: { width: '100%' },
  dragging: {
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});
