import styles from './Skeleton.module.css';

interface Props {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}

export function Skeleton({ width, height = 14, radius = 6, className }: Props) {
  return (
    <span
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
      }}
      aria-hidden
    />
  );
}

export function SkeletonRow() {
  return (
    <div className={styles.row}>
      <Skeleton width="60%" height={16} />
      <Skeleton width="40%" height={12} />
      <Skeleton width="85%" height={12} />
      <div className={styles.bottom}>
        <Skeleton width={64} height={20} radius={999} />
        <Skeleton width={36} height={11} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
