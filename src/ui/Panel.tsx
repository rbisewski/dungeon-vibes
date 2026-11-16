import type { ComponentChildren } from 'preact';
import './pixel/frame';

/**
 * Every side panel (SPEC §10.8): one size and top edge, left or right column, a title plaque with a close button,
 * a body, and the key hints in a footer at the bottom.
 */
export function Panel({ id, side, title, close, closeKeys, foot, cls = '', children }: {
  id: string; side: 'left' | 'right'; title: ComponentChildren; close: () => void; closeKeys: string;
  foot?: ComponentChildren; cls?: string; children: ComponentChildren;
}) {
  return (
    <div id={id} class={`px panel frame side ${side} ${cls}`}>
      <div class="panelHead">
        <span class="title">{title}</span>
        <button class="btn close" onClick={close} title={`Close (${closeKeys})`}>X</button>
      </div>
      <div class="panelBody">{children}</div>
      {foot && <div class="panelFoot">{foot}</div>}
    </div>
  );
}

/** A label and its value in a recessed well. */
export function Field({ label, children, cls = '' }: { label: ComponentChildren; children: ComponentChildren; cls?: string }) {
  return (
    <div class={`field ${cls}`}>
      <span class="label">{label}</span>
      <span class="val well">{children}</span>
    </div>
  );
}
