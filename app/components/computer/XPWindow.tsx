import type { ReactNode } from 'react';

type XPWindowProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export default function XPWindow({ title, icon, children, onClose, className = '' }: XPWindowProps) {
  return (
    <section className={`xp-window ${className}`} role="dialog" aria-label={title}>
      <header className="xp-titlebar">
        <div className="xp-titlebar-name">
          <span aria-hidden="true">{icon ?? '▣'}</span>
          <strong>{title}</strong>
        </div>
        <button className="xp-close" type="button" aria-label={`关闭 ${title}`} onClick={onClose}>×</button>
      </header>
      <div className="xp-window-body">{children}</div>
    </section>
  );
}

